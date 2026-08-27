/**
 * Agent Stream Runner — streams agent output progressively.
 *
 * Flow:
 * 1. Validate agentId via registry
 * 2. Validate input with inputSchema
 * 3. Apply guardrails
 * 4. Build prompt
 * 5. Call provider.streamProviderText()
 * 6. Stream text deltas via controller
 * 7. Accumulate full text server-side
 * 8. After stream ends:
 *    - Attempt JSON extraction and outputSchema validation
 *    - Run quality checker
 *    - Log usage
 *    - Send final structured result event
 *
 * Designed for POST /api/ai/agents/stream which wraps this in SSE.
 * This module emits structured events for the SSE writer to serialize.
 */

import type { AgentDefinition, AgentInput, AgentOutput, AgentRunContext, AgentRunResult } from "./agent-types";
import { getAgent } from "./agent-registry";
import { buildPrompt, type PromptBuildOptions } from "./prompt-builder";
import { streamProviderText, estimateCost, ProviderChainFailedError, ProviderStreamInterruptedError } from "./provider";
import { checkInput } from "./guardrails";
import { cleanJSONOutput, tryFixJSON, validateAgentOutput, type ValidationOutcome } from "./output-validator";
import { checkEducationQuality } from "../evaluators/education-quality-checker";
import { logUsage } from "./usage-logger";
import { generateRPPFallback } from "./rpp-fallback-template";
import { normalizeRppResult, pickTextDeep } from "./rpp-normalizer";

export type StreamEvent =
  | { type: "start"; agentId: string }
  | { type: "text_delta"; text: string }
  | { type: "progress"; message: string }
  | { type: "final_result"; result: AgentRunResult }
  | { type: "error"; code: string; message: string }
  | { type: "done" }
  | { type: "provider"; provider: string; model: string }
  | { type: "quota"; plan: string; creditsRequired: number; remainingCredits: number; mode: string; wouldBlock: boolean }
  | { type: "quota_error"; error: string; message: string; quota?: Record<string, unknown> };

export interface StreamAgentOptions {
  agentId: string;
  input: AgentInput;
  context: AgentRunContext;
  outputFormat?: "json" | "text";
  qualityCheck?: boolean;
}

/**
 * Run an agent with streaming output.
 * Calls onEvent for each stream event.
 */
export async function runAgentStream(
  opts: StreamAgentOptions,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const { agentId, input, context, outputFormat = "json", qualityCheck = true } = opts;
  const startTime = Date.now();
  const warn: string[] = [];

  try {
    // ── Step 1: Resolve agent ──────────────────────────────
    const agent = getAgent(agentId as never);
    if (!agent) {
      onEvent({ type: "error", code: "AGENT_NOT_FOUND", message: `Agent '${agentId}' tidak ditemukan.` });
      onEvent({ type: "done" });
      return;
    }

    onEvent({ type: "start", agentId });

    // ── Step 2: Validate input ─────────────────────────────
    let parsedInput: AgentInput;
    try {
      parsedInput = agent.inputSchema.parse(input);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Input tidak valid";
      onEvent({ type: "error", code: "INVALID_INPUT", message: msg });
      onEvent({ type: "done" });
      return;
    }

    // ── Step 3: Guardrails on input ────────────────────────
    const serializedInput = JSON.stringify(parsedInput);
    const guardrailResult = checkInput(serializedInput);
    for (const w of guardrailResult.warnings) warn.push(w);

    // ── Step 4: Build prompt ────────────────────────────────
    const buildOpts: PromptBuildOptions = {
      systemPrompt: agent.systemPrompt,
      userInput: parsedInput,
      context,
      agent,
      examples: agent.examples.length > 0 ? agent.examples : undefined,
      outputFormat,
    };

    const built = buildPrompt(buildOpts);

    // ── Step 5-6: Stream from provider ─────────────────────
    let fullText = "";
    let streamProvider = "";
    let streamModel = agent.defaultModel;

    // Kirim hasil final sukses (dipakai jalur fallback template RPP)
    const emitFinal = (docText: string, opts?: { fallbackUsed?: boolean }) => {
      const durationMs = Date.now() - startTime;
      const provider = opts?.fallbackUsed ? "fallback-template" : (streamProvider || "none");
      const finalOutput = { text: docText, editableText: docText, displayText: docText } as unknown as AgentOutput;
      logUsage({
        userId: context.userId,
        agentId: agent.id as never,
        input,
        output: finalOutput,
        success: true,
        error: null,
        errorCode: null,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        provider,
        model: streamModel,
        latencyMs: durationMs,
        durationMs,
        createdAt: new Date(),
      }).catch(() => {});
      const result: AgentRunResult = {
        success: true,
        agentId: agent.id as never,
        output: finalOutput,
        text: docText,
        error: null,
        warnings: warn,
        qualityScore: opts?.fallbackUsed ? 60 : 100,
        qualityChecks: [],
        provider,
        model: streamModel,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUSD: 0,
          provider,
          model: streamModel,
          durationMs,
        },
        latencyMs: durationMs,
        metadata: { requestId: context.requestId, timestamp: context.timestamp, userId: context.userId },
      };
      onEvent({ type: "final_result", result });
      onEvent({ type: "done" });
    };

    try {
      const streamResult = await streamProviderText(
        {
          model: agent.defaultModel,
          messages: built.messages,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          // Selaras dengan agent-runner: generasi panjang butuh >30s
          timeoutMs: 120000,
          responseFormat: outputFormat === "json" ? "json" : undefined,
        },
        (delta) => {
          fullText += delta;
          onEvent({ type: "text_delta", text: delta });
        }
      );

      streamProvider = streamResult.provider;
      streamModel = streamResult.model;

      onEvent({ type: "provider", provider: streamProvider, model: streamModel });
      onEvent({ type: "progress", message: "AI sedang menulis..." });
    } catch (e) {
      if (e instanceof ProviderStreamInterruptedError) {
        // Stream terputus di tengah — teks parsial diselamatkan, lanjut ke
        // normalisasi (JANGAN gagal, jangan ganti provider).
        if (e.partialText.length > fullText.length) fullText = e.partialText;
        streamProvider = e.provider;
        streamModel = e.model;
        warn.push("Koneksi AI terputus di tengah — hasil parsial diselamatkan dan dirapikan");
        onEvent({ type: "provider", provider: streamProvider, model: streamModel });
      } else if (agentId === "rpp") {
        // Provider gagal total — untuk RPP jangan menyerah: pakai template
        // fallback yang tetap layak diedit guru.
        try {
          const fallbackText = generateRPPFallback(input as never);
          warn.push("Generator AI utama gagal, sistem menampilkan template Rencana Pembelajaran fallback yang dapat diedit guru.");
          emitFinal(fallbackText, { fallbackUsed: true });
          return;
        } catch {
          // template pun gagal — jatuh ke error di bawah
        }
        const msg = e instanceof ProviderChainFailedError
          ? "Layanan AI sedang sibuk. Silakan coba lagi."
          : "Gagal terhubung ke layanan AI. Silakan coba lagi.";
        onEvent({ type: "error", code: "PROVIDER_UNAVAILABLE", message: msg });
        onEvent({ type: "done" });
        return;
      } else {
        const msg = e instanceof ProviderChainFailedError
          ? "Layanan AI sedang sibuk. Silakan coba lagi."
          : "Gagal terhubung ke layanan AI. Silakan coba lagi.";
        // STEP 4E.2A — kegagalan provider streaming DICATAT (sebelumnya tidak
        // tercatat sama sekali → dashboard buta). Logging layer only.
        logUsage({
          userId: context.userId,
          agentId: agent.id as never,
          input,
          output: null,
          success: false,
          error: msg,
          errorCode: "PROVIDER_ERROR",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUSD: 0,
          provider: streamProvider || "none",
          model: streamModel,
          latencyMs: Date.now() - startTime,
          durationMs: Date.now() - startTime,
          createdAt: new Date(),
        }).catch(() => {});
        onEvent({ type: "error", code: "PROVIDER_UNAVAILABLE", message: msg });
        onEvent({ type: "done" });
        return;
      }
    }

    if (!fullText.trim()) {
      if (agentId === "rpp") {
        try {
          const fallbackText = generateRPPFallback(input as never);
          warn.push("Generator AI utama gagal, sistem menampilkan template Rencana Pembelajaran fallback yang dapat diedit guru.");
          emitFinal(fallbackText, { fallbackUsed: true });
          return;
        } catch {
          // jatuh ke error di bawah
        }
      }
      // STEP 4E.2A — response kosong dicatat agar dashboard bisa membedakan
      // EMPTY_RESPONSE dari kegagalan lain (logging layer only).
      logUsage({
        userId: context.userId,
        agentId: agent.id as never,
        input,
        output: null,
        success: false,
        error: "AI tidak menghasilkan output. Silakan coba lagi.",
        errorCode: "EMPTY_RESPONSE",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        provider: streamProvider || "none",
        model: streamModel,
        latencyMs: Date.now() - startTime,
        durationMs: Date.now() - startTime,
        createdAt: new Date(),
      }).catch(() => {});
      onEvent({ type: "error", code: "EMPTY_RESPONSE", message: "AI tidak menghasilkan output. Silakan coba lagi." });
      onEvent({ type: "done" });
      return;
    }

    onEvent({ type: "progress", message: "Memvalidasi hasil akhir..." });

    // ── Step 7-8: Parse and validate output ────────────────
    let finalOutput: AgentOutput | null = null;
    let finalError: string | null = null;

    if (outputFormat === "json") {
      const { cleaned, warnings: cleanWarn } = cleanJSONOutput(fullText);
      warn.push(...cleanWarn);

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Will try to fix below
      }

      // If parsed is an array with a single element, unwrap it
      if (Array.isArray(parsed) && parsed.length === 1) {
        parsed = parsed[0];
        warn.push("Output JSON dibungkus array — dibuka secara otomatis");
      }

      // Try Zod validation on the parsed result
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        try {
          finalOutput = agent.outputSchema.parse(parsed) as unknown as AgentOutput;
          const validationOutcome = validateAgentOutput(agent.id, parsed as Record<string, unknown>);
          if (validationOutcome.status === "invalid") {
            finalOutput = null; // block invalid output
          }
          if (validationOutcome.issues.length > 0) {
            warn.push(validationOutcome.issues.join("; "));
          }
        } catch {
          // Schema validation failed — will try salvage
        }
      }

      // If first parse/validate failed, try tryFixJSON + array unwrap
      if (!finalOutput) {
        try {
          const { fixed, success: fixOk, warnings: fixWarn } = tryFixJSON(fullText);
          warn.push(...fixWarn);
          if (fixOk) {
            let fixedParsed: unknown = JSON.parse(fixed);
            if (Array.isArray(fixedParsed) && fixedParsed.length === 1) {
              fixedParsed = fixedParsed[0];
            }
            if (fixedParsed && typeof fixedParsed === "object" && !Array.isArray(fixedParsed)) {
              finalOutput = agent.outputSchema.parse(fixedParsed) as unknown as AgentOutput;
              const validationOutcome = validateAgentOutput(agent.id, fixedParsed as Record<string, unknown>);
              if (validationOutcome.status === "invalid") {
                finalOutput = null;
              }
              if (validationOutcome.issues.length > 0) {
                warn.push(validationOutcome.issues.join("; "));
              }
            }
          }
        } catch {
          // Both attempts failed
        }
      }

      // Salvage: ambil teks dari bentuk apa pun (string/objek/nested)
      if (!finalOutput) {
        const displayText = pickTextDeep(parsed ?? fullText);
        if (displayText) {
          warn.push("Output tidak sesuai format yang diharapkan — konten ditampilkan apa adanya");
          finalOutput = { text: displayText } as unknown as AgentOutput;
        } else if (parsed && typeof parsed === "object") {
          // Objek tanpa field teks — simpan untuk dirender tahap normalisasi
          finalOutput = parsed as unknown as AgentOutput;
          warn.push("Output berbentuk data terstruktur — dirender menjadi dokumen");
        } else {
          warn.push("AI tidak menghasilkan output yang valid");
          finalOutput = { text: "" } as unknown as AgentOutput;
        }
      }
    } else {
      finalOutput = { text: fullText } as unknown as AgentOutput;
    }

    // ── Normalisasi RPP: UI harus menerima DOKUMEN, bukan JSON mentah ──
    let resultText = fullText;
    if (agent.id === "rpp") {
      const normalized =
        normalizeRppResult(finalOutput ?? fullText, input as never) ??
        normalizeRppResult(fullText, input as never);
      if (normalized) {
        warn.push(...normalized.warnings);
        resultText = normalized.doc;
      } else {
        try {
          resultText = generateRPPFallback(input as never);
          warn.push("Generator AI utama gagal, sistem menampilkan template Rencana Pembelajaran fallback yang dapat diedit guru.");
        } catch {
          resultText = fullText;
        }
      }
      const base = finalOutput && typeof finalOutput === "object" ? finalOutput : {};
      finalOutput = {
        ...(base as Record<string, unknown>),
        text: resultText,
        editableText: resultText,
        displayText: resultText,
      } as unknown as AgentOutput;
    } else if (finalOutput && typeof (finalOutput as Record<string, unknown>).text === "string") {
      resultText = (finalOutput as Record<string, unknown>).text as string;
    }

    // ── Step 9: Quality check ──────────────────────────────
    const qualityChecks: { passed: boolean; checkId: string; message: string }[] = [];
    if (finalOutput && qualityCheck) {
      const outputText = JSON.stringify(finalOutput);
      const eduCheck = checkEducationQuality(outputText, "");

      for (const check of agent.qualityChecklist) {
        let passed = true;
        let message = `${check.label}: passed`;

        if (agent.id === "soal") {
          const outputObj = finalOutput as Record<string, unknown>;
          const questions = Array.isArray(outputObj.questions)
            ? (outputObj.questions as Record<string, unknown>[])
            : [];
          const metadata = outputObj.metadata as Record<string, unknown> | undefined;

          switch (check.id) {
            case "q-count": {
              const requested = typeof metadata?.questionCount === "number" ? metadata.questionCount : 0;
              passed = questions.length > 0 && (requested === 0 || questions.length === requested);
              message = `${check.label}: ${passed ? "passed" : `expected ${requested}, got ${questions.length}`}`;
              break;
            }
            case "q-answer-key": {
              passed = questions.every(
                (q) =>
                  q.answer !== undefined &&
                  q.answer !== null &&
                  (typeof q.answer === "string" ? q.answer.trim().length > 0 : Array.isArray(q.answer) && q.answer.length > 0)
              );
              message = `${check.label}: ${passed ? "passed" : "some questions missing answers"}`;
              break;
            }
            case "q-unique": {
              const texts = questions.map((q) => String(q.question ?? "")).filter(Boolean);
              passed = new Set(texts).size === texts.length;
              message = `${check.label}: ${passed ? "passed" : `${texts.length - new Set(texts).size} duplicate(s)`}`;
              break;
            }
            default:
              passed = true;
          }
        }

        qualityChecks.push({
          passed,
          checkId: check.id,
          message,
        });
      }

      if (eduCheck.score < 50) {
        warn.push("Skor kualitas pendidikan di bawah 50 — konten mungkin perlu ditinjau");
      }
    }

    // ── Step 10: Log usage ─────────────────────────────────
    const durationMs = Date.now() - startTime;
    logUsage({
      userId: context.userId,
      agentId: agent.id as never,
      input,
      output: finalOutput,
      success: !finalError,
      error: finalError,
      errorCode: null,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUSD: estimateCost(streamProvider as never, 0),
      provider: streamProvider,
      model: streamModel,
      latencyMs: durationMs,
      durationMs,
      createdAt: new Date(),
    }).catch(() => {});

    // ── Step 11: Send final result ─────────────────────────
    const qualityScore = qualityChecks.length > 0
      ? Math.round((qualityChecks.filter((c) => c.passed).length / qualityChecks.length) * 100)
      : 100;

    const result: AgentRunResult = {
      success: !finalError,
      agentId: agent.id as never,
      output: finalOutput,
      text: resultText,
      error: finalError,
      warnings: warn,
      qualityScore,
      qualityChecks,
      provider: streamProvider,
      model: streamModel,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUSD: estimateCost(streamProvider as never, 0),
        provider: streamProvider,
        model: streamModel,
        durationMs,
      },
      latencyMs: durationMs,
      metadata: { requestId: context.requestId, timestamp: context.timestamp, userId: context.userId },
    };

    onEvent({ type: "final_result", result });
    onEvent({ type: "done" });

  } catch {
    onEvent({ type: "error", code: "INTERNAL_ERROR", message: "Terjadi kesalahan internal server. Silakan coba lagi." });
    onEvent({ type: "done" });
  }
}

