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
 * Phase 3: Validation now returns tiered outcomes (VALID/RECOVERABLE/INVALID)
 * instead of soft warnings.
 */

export interface ValidationResult {
  cleaned: string;
  warnings: string[];
}

/**
 * Tiered validation outcome.
 * - VALID: output passes all checks, safe to present
 * - RECOVERABLE: has issues worth retrying (e.g., wrong answer format) — retry once, then present with warnings
 * - INVALID: fundamental failure (no questions, empty editableText) — block output entirely, show error
 */
export type ValidationOutcomeStatus = "valid" | "recoverable" | "invalid";

export interface ValidationOutcome {
  status: ValidationOutcomeStatus;
  warnings: string[];
  issues: string[];
}

/** Convenience constructors */
export function validOutcome(warnings: string[] = []): ValidationOutcome {
  return { status: "valid", warnings, issues: [] };
}

export function recoverableOutcome(issues: string[], warnings: string[] = []): ValidationOutcome {
  return { status: "recoverable", warnings, issues };
}

export function invalidOutcome(issues: string[], warnings: string[] = []): ValidationOutcome {
  return { status: "invalid", warnings, issues };
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
 * Returns a ValidationOutcome instead of soft warnings.
 */
export function validateAgentOutput(
  agentId: string,
  parsed: Record<string, unknown>
): ValidationOutcome {
  switch (agentId) {
    case "rpp":
      return validateRPPOutput(parsed);
    case "soal":
      return validateSoalOutput(parsed);
    default:
      return validOutcome();
  }
}

/** Legacy wrapper — returns warnings string or null (for backward compat) */
export function validateAgentOutputLegacy(
  agentId: string,
  parsed: Record<string, unknown>
): string | null {
  const outcome = validateAgentOutput(agentId, parsed);
  if (outcome.status === "valid") return null;
  return outcome.issues.join("; ");
}

function validateRPPOutput(parsed: Record<string, unknown>): ValidationOutcome {
  const issues: string[] = [];
  const warnings: string[] = [];
  const editable = parsed.editableText as string | undefined;
  const identity = parsed.identity as Record<string, unknown> | undefined;

  // Primary check: editableText must exist and be print-ready
  if (typeof editable !== "string" || !editable || editable.trim().length < 1200) {
    issues.push("editableText harus minimal 1.200 karakter — pastikan konten print-ready lengkap");
  } else {
    // Print-ready content checks
    if (!editable.includes("RENCANA PEMBELAJARAN") && !editable.includes("MODUL AJAR") && !editable.includes("RENCANA PELAKSANAAN PEMBELAJARAN") && !editable.includes("RPP")) {
      issues.push("editableText belum memuat judul RENCANA PEMBELAJARAN");
    }
    if (!editable.includes("Identitas") && !editable.includes("A. Identitas")) {
      issues.push("editableText belum memuat bagian A. Identitas Dokumen");
    }
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

  if (!parsed.title || typeof parsed.title !== "string") issues.push("Field 'title' tidak terisi");
  if (!identity || typeof identity !== "object") issues.push("Field 'identity' tidak terisi");

  if (issues.length > 0) {
    // RPP with missing sections is recoverable — teacher can fill in
    return recoverableOutcome(issues, warnings);
  }
  return validOutcome(warnings);
}

const SUPPORTED_QUESTION_TYPES = [
  "pilihan_ganda",
  "pilihan_ganda_kompleks",
  "benar_salah",
  "menjodohkan",
  "isian_singkat",
  "uraian",
  "cloze",
  "akm_literasi",
  "pisa_style",
];

function validateSoalOutput(parsed: Record<string, unknown>): ValidationOutcome {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    return invalidOutcome(["Field 'questions' wajib berupa array"]);
  }

  const questions = parsed.questions as Record<string, unknown>[];
  if (questions.length === 0) {
    return invalidOutcome(["questions kosong — AI tidak menghasilkan soal apapun"]);
  }

  if (typeof parsed.editableText !== "string" || !parsed.editableText) {
    issues.push("Field 'editableText' tidak boleh kosong");
  }

  // Check for duplicate question text
  const texts = questions.map((q) => String(q.question ?? "")).filter(Boolean);
  const uniqueTexts = new Set(texts);
  if (uniqueTexts.size !== texts.length) {
    issues.push("Terdapat duplikasi teks pertanyaan");
  }

  // Check count mismatch: metadata.questionCount vs actual questions length
  const meta = parsed.metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta.questionCount === "number" && meta.questionCount !== questions.length) {
    issues.push(`Jumlah soal tidak cocok: metadata=${meta.questionCount}, aktual=${questions.length}`);
  }

  // Per-item validation — Phase 3 Step 4 (C3)
  let invalidCount = 0;

  for (const q of questions) {
    const qNum = q.number ?? "?";
    const qType = String(q.type ?? "");
    const qText = String(q.question ?? "");
    const qAnswer = q.answer;
    const qOptions = q.options as string[] | undefined;

    // 1. Question must have non-empty text
    if (!qText || qText.trim().length === 0) {
      issues.push(`Soal #${qNum}: teks pertanyaan kosong`);
      invalidCount++;
      continue; // can't validate further without question text
    }

    // 2. Type must be supported
    if (!SUPPORTED_QUESTION_TYPES.includes(qType)) {
      issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): tipe "${qType}" tidak didukung`);
      invalidCount++;
      continue;
    }

    // 3. Type-specific validation
    if (qType === "pilihan_ganda" || qType === "pilihan_ganda_kompleks") {
      if (!Array.isArray(qOptions) || qOptions.length < 2) {
        issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): pilihan_ganda butuh minimal 2 opsi`);
        invalidCount++;
        continue;
      }
      if (qOptions.some((o: string) => !o || o.trim().length === 0)) {
        issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): ada opsi kosong`);
        invalidCount++;
        continue;
      }
      // Check for duplicate option texts (normalized)
      const normalized = qOptions.map((o: string) => o.trim().toLowerCase());
      const uniqueNorm = new Set(normalized);
      if (uniqueNorm.size !== normalized.length) {
        issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): ada opsi duplikat`);
        invalidCount++;
        continue;
      }
      // Answer must be present
      if (qAnswer === undefined || qAnswer === null || (typeof qAnswer === "string" && qAnswer.trim().length === 0)) {
        issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): jawaban kosong`);
        invalidCount++;
        continue;
      }
    }

    if (qType === "benar_salah") {
      const ans = String(qAnswer ?? "").trim().toLowerCase();
      if (ans !== "benar" && ans !== "salah") {
        issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): jawaban harus "Benar" atau "Salah", dapat "${qAnswer}"`);
        invalidCount++;
        continue;
      }
    }

    if (qType === "isian_singkat") {
      if (qAnswer === undefined || qAnswer === null || String(qAnswer).trim().length === 0) {
        issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): jawaban isian kosong`);
        invalidCount++;
        continue;
      }
    }

    if (qType === "menjodohkan") {
      if (!q.pairs || !Array.isArray(q.pairs) || q.pairs.length < 2) {
        issues.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): menjodohkan butuh minimal 2 pasang`);
        invalidCount++;
        continue;
      }
    }

    // Check learningObjective exists
    if (!q.learningObjective || String(q.learningObjective).trim().length === 0) {
      warnings.push(`Soal #${qNum} ("${qText.slice(0, 30)}..."): learningObjective kosong`);
    }
  }

  // Classification: >50% invalid = INVALID, else RECOVERABLE
  if (invalidCount > questions.length / 2) {
    return invalidOutcome(
      issues,
      warnings
    );
  }
  if (issues.length > 0) {
    return recoverableOutcome(issues, warnings);
  }
  return validOutcome(warnings);
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
    case "rpp":
      return `${safeMessage}\nKesalahan: ${validationError}\nPastikan semua field Rencana Pembelajaran terisi lengkap dan editableText tidak kosong.`;
    default:
      return `${safeMessage}\nKesalahan: ${validationError}`;
  }
}
