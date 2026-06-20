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
import { streamProviderText, estimateCost, ProviderChainFailedError } from "./provider";
import { checkInput } from "./guardrails";
import { cleanJSONOutput, validateAgentOutput } from "./output-validator";
import { checkEducationQuality } from "../evaluators/education-quality-checker";
import { logUsage } from "./usage-logger";

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

    try {
      const streamResult = await streamProviderText(
        {
          model: agent.defaultModel,
          messages: built.messages,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          timeoutMs: 30000,
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
      const msg = e instanceof ProviderChainFailedError
        ? "Layanan AI sedang sibuk. Silakan coba lagi."
        : "Gagal terhubung ke layanan AI. Silakan coba lagi.";
      onEvent({ type: "error", code: "PROVIDER_UNAVAILABLE", message: msg });
      onEvent({ type: "done" });
      return;
    }

    if (!fullText.trim()) {
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

      try {
        const parsed = JSON.parse(cleaned);
        finalOutput = agent.outputSchema.parse(parsed) as unknown as AgentOutput;

        // Post-processing validation
        const postError = validateAgentOutput(agent.id, parsed);
        if (postError) {
          warn.push(postError);
          finalOutput = null;
          finalError = `Gagal memvalidasi output: ${postError}`;
        }
      } catch {
        finalOutput = null;
        finalError = "Gagal memvalidasi output. Silakan coba dengan input yang lebih spesifik.";
      }
    } else {
      finalOutput = { text: fullText } as unknown as AgentOutput;
    }

    // ── Step 9: Quality check ──────────────────────────────
    const qualityChecks: { passed: boolean; checkId: string; message: string }[] = [];
    if (finalOutput && qualityCheck) {
      const outputText = JSON.stringify(finalOutput);
      const eduCheck = checkEducationQuality(outputText, "");

      for (const check of agent.qualityChecklist) {
        qualityChecks.push({
          passed: true,
          checkId: check.id,
          message: `${check.label}: passed`,
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
      errorCode: finalError
        ? finalError.includes("Layanan AI") ? "PROVIDER_UNAVAILABLE"
        : finalError.includes("Gagal memvalidasi") ? "OUTPUT_VALIDATION_FAILED"
        : "UNKNOWN_ERROR"
        : null,
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
      text: fullText,
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
