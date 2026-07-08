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
 * Tiered post-processing validation.
 * Returns null if valid, or a warning message string if issues found.
 * Uses soft validation — warns instead of blocking.
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
  const issues: string[] = [];
  const editable = parsed.editableText as string | undefined;
  const identity = parsed.identity as Record<string, unknown> | undefined;

  // Primary check: editableText must exist and be print-ready
  if (typeof editable !== "string" || !editable || editable.trim().length < 1200) {
    issues.push("editableText harus minimal 1.200 karakter — pastikan konten print-ready lengkap");
  } else {
    // Print-ready content checks
    if (!editable.includes("MODUL AJAR") && !editable.includes("RENCANA PELAKSANAAN PEMBELAJARAN") && !editable.includes("RPP")) {
      issues.push("editableText belum memuat judul MODUL AJAR / RPP");
    }
    if (!editable.includes("Identitas") && !editable.includes("A. Identitas")) {
      issues.push("editableText belum memuat bagian A. Identitas Dokumen");
    }
    // Table-based identitas check
    if (!editable.includes("|")) {
      issues.push("editableText belum menggunakan tabel untuk Identitas Dokumen");
    }
    if (!editable.includes("Informasi Umum") && !editable.includes("B. Informasi")) {
      issues.push("editableText belum memuat bagian B. Informasi Umum");
    }
    if (!editable.includes("Komponen Inti") && !editable.includes("C. Komponen")) {
      issues.push("editableText belum memuat bagian C. Komponen Inti");
    }
    if (!editable.includes("Tujuan Pembelajaran") && !editable.includes("tujuan pembelajaran")) {
      issues.push("editableText belum memuat Tujuan Pembelajaran");
    }
    if (!editable.includes("Kegiatan") && !editable.includes("Langkah")) {
      issues.push("editableText belum memuat Kegiatan Pembelajaran");
    }
    if (!editable.includes("Asesmen") && !editable.includes("asesmen") && !editable.includes("Penilaian")) {
      issues.push("editableText belum memuat Asesmen");
    }
    if (!editable.includes("Lampiran") && !editable.includes("D. Lampiran")) {
      issues.push("editableText belum memuat bagian D. Lampiran");
    }
    if (!editable.includes("Lembar Pengesahan") && !editable.includes("E. Lembar")) {
      issues.push("editableText belum memuat bagian E. Lembar Pengesahan");
    }
    if (!editable.includes("BahasaCerdas.com") && !editable.includes("bahasacerdas.com")) {
      issues.push("editableText belum memuat footer BahasaCerdas.com");
    }
    // Check if teacher/school/principal names from input appear in document
    if (identity) {
      const schoolName = identity.schoolName as string | undefined;
      if (schoolName && !editable.includes(schoolName)) {
        issues.push(`Nama Sekolah "${schoolName}" belum muncul di dokumen`);
      }
      const teacherName = identity.teacherName as string | undefined;
      if (teacherName && !editable.includes(teacherName)) {
        issues.push(`Nama Guru "${teacherName}" belum muncul di dokumen`);
      }
    }
  }

  // Secondary checks on structured fields (informational only)
  if (!parsed.title || typeof parsed.title !== "string") issues.push("Field 'title' tidak terisi");
  if (!identity || typeof identity !== "object") issues.push("Field 'identity' tidak terisi");

  return issues.length > 0 ? issues.join("; ") : null;
}

function validateSoalOutput(parsed: Record<string, unknown>): string | null {
  const issues: string[] = [];
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    issues.push("Field 'questions' wajib berupa array");
  } else {
    const questions = parsed.questions as Record<string, unknown>[];
    const texts = questions.map((q) => String(q.question ?? "")).filter(Boolean);
    const unique = new Set(texts);
    if (unique.size !== texts.length) {
      issues.push("Terdapat duplikasi teks pertanyaan");
    }
  }
  if (typeof parsed.editableText !== "string" || !parsed.editableText) {
    issues.push("Field 'editableText' tidak boleh kosong");
  }
  return issues.length > 0 ? issues.join("; ") : null;
}

function validatePPTOutput(parsed: Record<string, unknown>): string | null {
  const issues: string[] = [];
  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    issues.push("Field 'slides' wajib berupa array");
  } else {
    const slides = parsed.slides as Record<string, unknown>[];
    for (const slide of slides) {
      if (!slide.title || typeof slide.title !== "string") {
        issues.push(`Slide ${slide.slideNumber ?? "?"} tidak memiliki title`);
        break;
      }
      if (!slide.bullets || !Array.isArray(slide.bullets)) {
        issues.push(`Slide ${slide.slideNumber ?? "?"} tidak memiliki bullets array`);
        break;
      }
      if (!slide.speakerNotes || typeof slide.speakerNotes !== "string") {
        issues.push(`Slide ${slide.slideNumber ?? "?"} tidak memiliki speakerNotes`);
        break;
      }
      if (!slide.visualSuggestion || typeof slide.visualSuggestion !== "string") {
        issues.push(`Slide ${slide.slideNumber ?? "?"} tidak memiliki visualSuggestion`);
        break;
      }
    }
  }
  if (typeof parsed.editableText !== "string" || !parsed.editableText) {
    issues.push("Field 'editableText' tidak boleh kosong");
  }
  return issues.length > 0 ? issues.join("; ") : null;
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
