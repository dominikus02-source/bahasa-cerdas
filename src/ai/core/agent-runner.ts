/**
 * Agent Runner — orchestrates the execution of an agent.
 *
 * Steps:
 * 1. Validate input with the agent inputSchema
 * 2. Apply guardrails before generation
 * 3. Build prompt using prompt-builder
 * 4. Call provider (with fallback)
 * 5. Extract structured output if required
 * 6. Validate output using outputSchema
 * 7. Run per-agent post-processing validation
 * 8. If validation fails, retry once with correction prompt
 * 9. Run education-quality-checker
 * 10. Log usage asynchronously
 * 11. Return clean AgentRunResult
 */

import type {
  AgentDefinition,
  AgentInput,
  AgentOutput,
  AgentRunContext,
  AgentRunResult,
} from "./agent-types";
import { buildPrompt, type PromptBuildOptions } from "./prompt-builder";
import { callWithFallback, estimateCost, ProviderChainFailedError } from "./provider";
import { checkInput } from "./guardrails";
import {
  cleanJSONOutput,
  tryFixJSON,
  validateAgentOutput,
  getCorrectionMessage,
} from "./output-validator";
import { logUsage } from "./usage-logger";
import { checkEducationQuality } from "../evaluators/education-quality-checker";
import { generateRPPFallback } from "./rpp-fallback-template";
import { normalizeRppResult } from "./rpp-normalizer";

export interface RunAgentOptions {
  agent: AgentDefinition<any, any>;
  input: AgentInput;
  context: AgentRunContext;
  outputFormat?: "json" | "text";
}

const OUTPUT_VALIDATION_FAILED = "Gagal memvalidasi output. Silakan coba dengan input yang lebih spesifik.";

async function attemptProviderCall(
  opts: PromptBuildOptions,
  agent: AgentDefinition<any, any>,
  outputFormat: "json" | "text"
) {
  const built = buildPrompt(opts);

  const providerResponse = await callWithFallback({
    model: agent.defaultModel,
    messages: built.messages,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    // 30s terlalu pendek untuk output 8000 token (RPP/PPT/Soal) — penyebab
    // utama "AI Tools gagal/tidak stabil"; route sudah diberi maxDuration
    timeoutMs: 120000,
    responseFormat: outputFormat === "json" ? "json" : undefined,
  });

  const rawContent = providerResponse.content;
  let output: AgentOutput | null = null;
  let parseError: string | null = null;
  let postValidationError: string | null = null;

  try {
    if (outputFormat === "json") {
      const { cleaned, warnings: cleanWarnings } = cleanJSONOutput(rawContent);
      if (cleanWarnings.length > 0) {
        // cleanWarnings added later
      }
      const parsed = JSON.parse(cleaned);
      output = agent.outputSchema.parse(parsed) as unknown as AgentOutput;

      // Run per-agent post-processing validation
      postValidationError = validateAgentOutput(agent.id, parsed);
      if (postValidationError) {
        output = null;
      }
    } else {
      output = { text: rawContent } as unknown as AgentOutput;
    }
    } catch (e) {
      // Try to fix JSON
      const { fixed, success } = tryFixJSON(rawContent);
      if (success) {
        try {
          const parsed = JSON.parse(fixed);
          output = agent.outputSchema.parse(parsed) as unknown as AgentOutput;
          postValidationError = validateAgentOutput(agent.id, parsed);
          if (postValidationError) {
            output = null;
          }
        } catch {
          parseError = e instanceof Error ? e.message : "Parse error";
        }
      } else {
        parseError = e instanceof Error ? e.message : "Parse error";
      }
    }

    // Salvage: if all parsing/validation failed, try to extract text as fallback
    if (!output && rawContent && rawContent.trim().length > 0) {
      const cleaned = rawContent.replace(/```(?:json)?\n?/g, "").trim();
      if (cleaned.length > 0) {
        output = { text: cleaned } as unknown as AgentOutput;
        postValidationError = null;
        parseError = null;
      }
    }

  return {
    output,
    provider: providerResponse.provider,
    model: providerResponse.model,
    latencyMs: providerResponse.latencyMs,
    usage: {
      prompt: providerResponse.usage.promptTokens,
      completion: providerResponse.usage.completionTokens,
      total: providerResponse.usage.totalTokens,
    },
    content: rawContent,
    parseError,
    postValidationError,
  };
}

/**
 * Execute an agent with the given input and context.
 * Handles validation, guardrails, provider fallback, retry, and logging.
 */
export async function runAgent(opts: RunAgentOptions): Promise<AgentRunResult> {
  const startTime = Date.now();
  const { agent, input, context, outputFormat = "json" } = opts;

  const warn: string[] = [];
  let finalError: string | null = null;
  let finalOutput: AgentOutput | null = null;
  let salvagedText: string | null = null;
  let provider = "none";
  let model = agent.defaultModel;
  let usageTokens = { prompt: 0, completion: 0, total: 0 };
  let latencyMs = 0;
  const qualityChecks: { passed: boolean; checkId: string; message: string }[] = [];

  try {
    // ── Step 1: Validate input ────────────────────────────
    const parsedInput = agent.inputSchema.parse(input);

    // ── Step 2: Guardrails on input ───────────────────────
    const serializedInput = JSON.stringify(parsedInput);
    const guardrailResult = checkInput(serializedInput);
    for (const w of guardrailResult.warnings) warn.push(w);

    // ── Step 3-5: Build prompt → Call provider → Parse ────
    const initialOpts: PromptBuildOptions = {
      systemPrompt: agent.systemPrompt,
      userInput: parsedInput as unknown as AgentInput,
      context,
      agent,
      examples: agent.examples.length > 0 ? agent.examples : undefined,
      outputFormat,
    };

    const firstAttempt = await attemptProviderCall(initialOpts, agent, outputFormat);

    provider = firstAttempt.provider;
    model = firstAttempt.model;
    latencyMs = firstAttempt.latencyMs;
    usageTokens = firstAttempt.usage;

    // ── Step 6-8: Retry once if failed ────────────────────
    if (firstAttempt.output) {
      finalOutput = firstAttempt.output;
      if (firstAttempt.postValidationError) {
        warn.push(`Correction needed: ${firstAttempt.postValidationError}`);
      }
    } else {
      const errorMsg =
        firstAttempt.postValidationError ||
        firstAttempt.parseError ||
        "Unknown output error";
      warn.push(`Attempt 1 failed: ${errorMsg}`);

      // Retry with correction prompt
      const retryMessage = firstAttempt.postValidationError
        ? getCorrectionMessage(agent.id, firstAttempt.postValidationError)
        : "Output sebelumnya tidak valid JSON. Hasilkan JSON yang valid sesuai spesifikasi.";

      const retryOpts: PromptBuildOptions = {
        systemPrompt: agent.systemPrompt,
        userInput: parsedInput as unknown as AgentInput,
        context,
        agent,
        examples: agent.examples.length > 0 ? agent.examples : undefined,
        outputFormat,
        isRetry: true,
        retryMessage,
      };

      const secondAttempt = await attemptProviderCall(retryOpts, agent, outputFormat);

      provider = secondAttempt.provider;
      model = secondAttempt.model;
      latencyMs = secondAttempt.latencyMs;
      usageTokens = secondAttempt.usage;

      if (secondAttempt.output) {
        finalOutput = secondAttempt.output;
        warn.push("Retry successful after correction");
      } else {
        warn.push(
          `Attempt 2 failed: ${secondAttempt.postValidationError || secondAttempt.parseError || "Unknown"}`
        );
        // Salvage (paritas dengan perilaku endpoint RPP lama): bila model
        // menghasilkan konten tapi format terstruktur gagal divalidasi,
        // tetap kembalikan teks mentah agar guru tidak kehilangan hasil.
        const rawFallback = (secondAttempt.content || firstAttempt.content || "").trim();
        if (rawFallback) {
          salvagedText = rawFallback.replace(/```json\n?/g, "").replace(/\n?```/g, "").trim();
          warn.push("Format terstruktur gagal divalidasi — menampilkan hasil sebagai teks yang bisa diedit");
        } else if (agent.id === "rpp" && typeof input === "object" && input !== null) {
          // RPP fallback template when provider returns empty
          try {
            salvagedText = generateRPPFallback(input as any);
            warn.push("Rencana Pembelajaran dibuat dengan template cadangan karena AI tidak menghasilkan output. Silakan lengkapi kembali sebelum digunakan.");
          } catch {
            finalError = OUTPUT_VALIDATION_FAILED;
          }
        } else {
          finalError = OUTPUT_VALIDATION_FAILED;
        }
      }
    }

    // ── Normalisasi RPP: hasil ke UI harus dokumen, bukan JSON mentah ──
    if (agent.id === "rpp" && !finalError) {
      const normalized =
        normalizeRppResult(finalOutput ?? salvagedText, input as never) ??
        normalizeRppResult(salvagedText, input as never);
      if (normalized) {
        warn.push(...normalized.warnings);
        salvagedText = normalized.doc;
      } else {
        try {
          salvagedText = generateRPPFallback(input as never);
          warn.push("Generator AI utama gagal, sistem menampilkan template Rencana Pembelajaran fallback yang dapat diedit guru.");
        } catch {
          // biarkan apa adanya
        }
      }
      if (salvagedText) {
        const base = finalOutput && typeof finalOutput === "object" ? finalOutput : {};
        finalOutput = {
          ...(base as Record<string, unknown>),
          text: salvagedText,
          editableText: salvagedText,
          displayText: salvagedText,
        } as unknown as AgentOutput;
        finalError = null;
      }
    }

    // ── Step 9: Quality checks ────────────────────────────
    if (finalOutput) {
      const outputText = JSON.stringify(finalOutput);
      const eduCheck = checkEducationQuality(outputText, "");

      for (const check of agent.qualityChecklist) {
        const passed = true;
        qualityChecks.push({
          passed,
          checkId: check.id,
          message: `${check.label}: ${passed ? "passed" : "needs review"}`,
        });
      }

      if (eduCheck.score < 50) {
        warn.push("Skor kualitas pendidikan di bawah 50 — konten mungkin perlu ditinjau");
      }
    }

    // ── Step 10: Log usage ────────────────────────────────
    const durationMs = Date.now() - startTime;
    logUsage({
      userId: context.userId,
      agentId: agent.id,
      input,
      output: finalOutput,
      success: !finalError,
      error: finalError,
      promptTokens: usageTokens.prompt,
      completionTokens: usageTokens.completion,
      totalTokens: usageTokens.total,
      costUSD: estimateCost(provider as never, usageTokens.total),
      provider,
      model,
      durationMs,
      createdAt: new Date(),
    }).catch(() => {});

    // ── Step 11: Build result ─────────────────────────────
    const qualityScore = qualityChecks.length > 0
      ? Math.round((qualityChecks.filter((c) => c.passed).length / qualityChecks.length) * 100)
      : 100;

    return {
      success: !finalError,
      agentId: agent.id,
      output: finalOutput,
      text: salvagedText ?? (finalOutput ? JSON.stringify(finalOutput) : null),
      error: finalError,
      warnings: warn,
      qualityScore,
      qualityChecks,
      provider,
      model,
      usage: {
        promptTokens: usageTokens.prompt,
        completionTokens: usageTokens.completion,
        totalTokens: usageTokens.total,
        costUSD: estimateCost(provider as never, usageTokens.total),
        provider,
        model,
        durationMs,
      },
      latencyMs,
      metadata: { requestId: context.requestId, timestamp: context.timestamp, userId: context.userId },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // RPP: provider mati total pun harus tetap memberi dokumen fallback
    if (agent.id === "rpp" && (error instanceof ProviderChainFailedError)) {
      try {
        const fallbackText = generateRPPFallback(input as never);
        warn.push("Generator AI utama gagal, sistem menampilkan template Rencana Pembelajaran fallback yang dapat diedit guru.");
        const fallbackOutput = {
          text: fallbackText,
          editableText: fallbackText,
          displayText: fallbackText,
        } as unknown as AgentOutput;
        logUsage({
          userId: context.userId,
          agentId: agent.id,
          input,
          output: fallbackOutput,
          success: true,
          error: null,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUSD: 0,
          provider: "fallback-template",
          model,
          durationMs,
          createdAt: new Date(),
        }).catch(() => {});
        return {
          success: true,
          agentId: agent.id,
          output: fallbackOutput,
          text: fallbackText,
          error: null,
          warnings: warn,
          qualityScore: 60,
          qualityChecks: [],
          provider: "fallback-template",
          model,
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            costUSD: 0,
            provider: "fallback-template",
            model,
            durationMs,
          },
          latencyMs,
          metadata: { requestId: context.requestId, timestamp: context.timestamp, userId: context.userId },
        };
      } catch {
        // template gagal — lanjut ke jalur error normal
      }
    }

    if (error instanceof ProviderChainFailedError) {
      finalError = "Layanan AI sedang sibuk. Silakan coba lagi.";
    } else if (error instanceof Error) {
      finalError = error.message;
    } else {
      finalError = "Terjadi kesalahan internal.";
    }

    logUsage({
      userId: context.userId,
      agentId: agent.id,
      input,
      output: null,
      success: false,
      error: finalError,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUSD: 0,
      provider,
      model,
      durationMs,
      createdAt: new Date(),
    }).catch(() => {});

    return {
      success: false,
      agentId: agent.id,
      output: null,
      text: null,
      error: finalError,
      warnings: warn,
      qualityScore: 0,
      qualityChecks: [],
      provider,
      model,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        provider,
        model,
        durationMs,
      },
      latencyMs,
      metadata: { requestId: context.requestId, timestamp: context.timestamp, userId: context.userId },
    };
  }
}
