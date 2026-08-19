import { randomUUID } from "crypto";
import { callWithFallback } from "@/src/ai/core/provider";
import { cleanJSONOutput, tryFixJSON } from "@/src/ai/core/output-validator";
import { shuffleOptions } from "@/lib/game/shuffle-options";
import {
  AI_DIAGNOSTIC_MAX_RETRIES,
  AI_DIAGNOSTIC_MAX_TOKENS,
  AI_DIAGNOSTIC_MODEL,
  AI_DIAGNOSTIC_TEMPERATURE,
  AI_DIAGNOSTIC_TIMEOUT_MS,
} from "./config";
import { buildAiDiagnosticSystemPrompt, buildAiDiagnosticUserPrompt, type AiPromptContext } from "./prompts";
import { validateAiDiagnosticItem } from "./validator";
import type { AiDiagnosticItem, AiNextPlan } from "./types";

export interface GenerationOutcome {
  item: AiDiagnosticItem | null;
  warnings: string[];
  provider: string | null;
}

export function parseAiQuestionRaw(raw: string): { parsed: unknown; warnings: string[] } {
  const warnings: string[] = [];
  const cleaned = cleanJSONOutput(raw);
  if (cleaned.warnings.length > 0) warnings.push(...cleaned.warnings);
  let jsonText = cleaned.cleaned;
  let success = false;
  try {
    return { parsed: JSON.parse(jsonText), warnings };
  } catch {
    const fixed = tryFixJSON(jsonText);
    if (fixed.success) {
      jsonText = fixed.fixed;
      if (fixed.warnings.length > 0) warnings.push(...fixed.warnings);
      success = true;
    }
  }
  if (!success) {
    throw new Error("AI_DIAGNOSTIC_JSON_PARSE_FAILED");
  }
  return { parsed: JSON.parse(jsonText), warnings };
}

function shuffleItem(item: AiDiagnosticItem): AiDiagnosticItem {
  if (item.questionType === "ISIAN_SINGKAT" || item.options.length < 2) return item;
  const parsed = Number(item.correctAnswer);
  if (!Number.isInteger(parsed)) return item;
  const shuffled = shuffleOptions(item.options, parsed);
  const idxToNew = new Map<string, number>();
  item.options.forEach((option, i) => idxToNew.set(option, shuffled.opsi.indexOf(option)));
  const misconceptionMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(item.misconceptionMap ?? {})) {
    const newIndex = idxToNew.get(item.options[Number(key)] ?? "");
    if (newIndex !== undefined && newIndex >= 0) misconceptionMap[String(newIndex)] = value;
  }
  return {
    ...item,
    options: shuffled.opsi,
    correctAnswer: String(shuffled.jawaban),
    misconceptionMap,
  };
}

export async function generateAiDiagnosticQuestion(
  plan: AiNextPlan,
  ctx: AiPromptContext,
  existingIds: string[]
): Promise<GenerationOutcome> {
  const warnings: string[] = [];

  let lastIssues: string[] = [];
  for (let attempt = 0; attempt <= AI_DIAGNOSTIC_MAX_RETRIES; attempt += 1) {
    let userContent = buildAiDiagnosticUserPrompt(plan, ctx);
    if (lastIssues.length > 0) {
      userContent += `\n\nValidasi pada percobaan sebelumnya menolak output. Perbaiki masalah berikut: ${lastIssues.join(" ")}`;
    }
    let response: Awaited<ReturnType<typeof callWithFallback>>;
    try {
      response = await callWithFallback({
        model: AI_DIAGNOSTIC_MODEL,
        messages: [{ role: "system", content: buildAiDiagnosticSystemPrompt() }, { role: "user", content: userContent }],
        temperature: AI_DIAGNOSTIC_TEMPERATURE,
        maxTokens: AI_DIAGNOSTIC_MAX_TOKENS,
        timeoutMs: AI_DIAGNOSTIC_TIMEOUT_MS,
        responseFormat: "text",
      });
    } catch {
      lastIssues = ["percobaan sebelumnya gagal dijalankan — coba ulang"];
      if (attempt < AI_DIAGNOSTIC_MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
      continue;
    }
    if (!response.content.trim()) {
      lastIssues = ["output kosong dari model"];
      if (attempt < AI_DIAGNOSTIC_MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
      continue;
    }
    let parsed: unknown;
    try {
      parsed = parseAiQuestionRaw(response.content).parsed;
    } catch {
      lastIssues = ["output bukan JSON yang valid"];
      continue;
    }
    const raw = typeof parsed === "object" && parsed !== null ? { ...(parsed as Record<string, unknown>), id: randomUUID() } : null;
    if (!raw) {
      lastIssues = ["output bukan objek JSON"];
      continue;
    }
    const validation = validateAiDiagnosticItem(raw, {
      avoidStems: ctx.avoidStems,
      avoidIds: existingIds,
    });
    if (validation.valid && validation.item) {
      const item = shuffleItem(validation.item);
      warnings.push(...validation.issues);
      return { item, warnings, provider: response.provider };
    }
    lastIssues = validation.issues.length > 0 ? validation.issues : ["gagal validasi"];
    warnings.push(...validation.issues);
  }
  return { item: null, warnings, provider: null };
}