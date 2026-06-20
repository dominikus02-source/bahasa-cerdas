/**
 * Output validator — cleans and validates raw AI output before parsing.
 *
 * Handles common issues:
 * - Markdown code block wrapping (```json ... ```)
 * - Trailing commas
 * - Extraneous text before/after JSON
 * - Partial JSON recovery
 *
 * Phase 3E: Added per-agent post-processing validation.
 */

export interface ValidationResult {
  cleaned: string;
  warnings: string[];
}

/**
 * Clean raw AI output for JSON parsing.
 */
export function cleanJSONOutput(raw: string): ValidationResult {
  const warnings: string[] = [];
  let cleaned = raw.trim();

  // Remove markdown code block fences
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      cleaned = match[1].trim();
      warnings.push("Markdown code block removed");
    }
  }

  // Extract first { ... } or [ ... ] if text wraps JSON
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      warnings.push("Extraneous text before/after JSON removed");
    } else {
      const arrStart = cleaned.indexOf("[");
      const arrEnd = cleaned.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
        cleaned = cleaned.substring(arrStart, arrEnd + 1);
        warnings.push("Extraneous text before/after JSON array removed");
      }
    }
  }

  // Remove trailing commas
  cleaned = cleaned.replace(/,\s*}/g, "}");
  cleaned = cleaned.replace(/,\s*\]/g, "]");

  // Remove comments
  cleaned = cleaned.replace(/\/\/.*$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  return { cleaned, warnings };
}

/**
 * Attempt to fix common JSON issues after cleaning.
 */
export function tryFixJSON(raw: string): { fixed: string; success: boolean; warnings: string[] } {
  const { cleaned, warnings } = cleanJSONOutput(raw);

  try {
    JSON.parse(cleaned);
    return { fixed: cleaned, success: true, warnings };
  } catch {
    const unescaped = cleaned.replace(/\\(?=["'])/g, "");
    try {
      JSON.parse(unescaped);
      warnings.push("Unescaped quotes fixed");
      return { fixed: unescaped, success: true, warnings };
    } catch {
      return { fixed: cleaned, success: false, warnings: [...warnings, "Unable to fix JSON"] };
    }
  }
}

/**
 * Per-agent post-processing validation.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateAgentOutput(
  agentId: string,
  parsed: Record<string, unknown>
): string | null {
  switch (agentId) {
    case "rpp":
      return validateRPPOutput(parsed);
    case "soal":
      return validateSoalOutput(parsed);
    case "ppt":
      return validatePPTOutput(parsed);
    default:
      return null;
  }
}

function validateRPPOutput(parsed: Record<string, unknown>): string | null {
  if (!parsed.title || typeof parsed.title !== "string") return "Field 'title' wajib diisi";
  if (!parsed.identity || typeof parsed.identity !== "object") return "Field 'identity' wajib diisi";
  if (!parsed.learningObjectives || !Array.isArray(parsed.learningObjectives) || parsed.learningObjectives.length < 1) {
    return "Minimal 1 learningObjective diperlukan";
  }
  if (!parsed.learningSteps || typeof parsed.learningSteps !== "object") return "Field 'learningSteps' wajib diisi";
  const steps = parsed.learningSteps as Record<string, unknown>;
  if (!Array.isArray(steps.opening) || !Array.isArray(steps.core) || !Array.isArray(steps.closing)) {
    return "learningSteps harus memiliki opening, core, dan closing array";
  }
  if (!parsed.assessmentPlan || typeof parsed.assessmentPlan !== "object") return "Field 'assessmentPlan' wajib diisi";
  const assessment = parsed.assessmentPlan as Record<string, unknown>;
  if (!Array.isArray(assessment.formative)) return "assessmentPlan.formative wajib diisi";
  if (typeof parsed.editableText !== "string" || !parsed.editableText) {
    return "Field 'editableText' tidak boleh kosong";
  }
  return null;
}

function validateSoalOutput(parsed: Record<string, unknown>): string | null {
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    return "Field 'questions' wajib berupa array";
  }
  const questions = parsed.questions as Record<string, unknown>[];
  const requestedCount = parsed.metadata
    ? (parsed.metadata as Record<string, unknown>).questionCount ?? questions.length
    : questions.length;
  if (questions.length !== requestedCount) {
    return `Jumlah soal (${questions.length}) tidak sesuai permintaan (${requestedCount})`;
  }

  // Check no duplicate question text
  const texts = questions.map((q) => String(q.question ?? "")).filter(Boolean);
  const unique = new Set(texts);
  if (unique.size !== texts.length) {
    return "Terdapat duplikasi teks pertanyaan";
  }

  // Check each question has answer
  for (const q of questions) {
    if (!q.answer || (Array.isArray(q.answer) && q.answer.length === 0)) {
      return `Soal nomor ${q.number ?? "?"} tidak memiliki kunci jawaban`;
    }
  }

  if (typeof parsed.editableText !== "string" || !parsed.editableText) {
    return "Field 'editableText' tidak boleh kosong";
  }
  return null;
}

function validatePPTOutput(parsed: Record<string, unknown>): string | null {
  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    return "Field 'slides' wajib berupa array";
  }
  const slides = parsed.slides as Record<string, unknown>[];
  const expectedCount = parsed.metadata
    ? (parsed.metadata as Record<string, unknown>).slideCount ?? slides.length
    : slides.length;
  if (slides.length !== expectedCount) {
    return `Jumlah slide (${slides.length}) tidak sesuai permintaan (${expectedCount})`;
  }

  for (const slide of slides) {
    if (!slide.title || typeof slide.title !== "string") {
      return `Slide ${slide.slideNumber ?? "?"} tidak memiliki title`;
    }
    if (!slide.bullets || !Array.isArray(slide.bullets)) {
      return `Slide ${slide.slideNumber ?? "?"} tidak memiliki bullets array`;
    }
    if (!slide.speakerNotes || typeof slide.speakerNotes !== "string") {
      return `Slide ${slide.slideNumber ?? "?"} tidak memiliki speakerNotes`;
    }
    if (!slide.visualSuggestion || typeof slide.visualSuggestion !== "string") {
      return `Slide ${slide.slideNumber ?? "?"} tidak memiliki visualSuggestion`;
    }
  }

  if (typeof parsed.editableText !== "string" || !parsed.editableText) {
    return "Field 'editableText' tidak boleh kosong";
  }
  return null;
}

/**
 * Generate correction prompt message for retry.
 */
export function getCorrectionMessage(
  agentId: string,
  validationError: string
): string {
  const safeMessage = "Output sebelumnya tidak valid. Perbaiki dan kirim ulang JSON yang benar.";
  switch (agentId) {
    case "soal":
      return `${safeMessage}\nKesalahan: ${validationError}\nPastikan jumlah soal tepat, semua soal punya kunci jawaban, dan tidak ada duplikasi teks.`;
    case "ppt":
      return `${safeMessage}\nKesalahan: ${validationError}\nPastikan jumlah slide tepat, setiap slide punya title/bullets/speakerNotes/visualSuggestion.`;
    case "rpp":
      return `${safeMessage}\nKesalahan: ${validationError}\nPastikan semua field RPP terisi lengkap dan editableText tidak kosong.`;
    default:
      return `${safeMessage}\nKesalahan: ${validationError}`;
  }
}
