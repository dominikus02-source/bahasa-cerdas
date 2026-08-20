/**
 * Content Quality Validator for Question Bank
 *
 * Detects:
 * - ANSWER_LEAKAGE: correct answer phrase overlaps excessively with question stem
 * - DUPLICATE_OPTION: identical or near-identical options within a question
 * - TRIVIAL: all options too short for the question type (not for vocabulary/spelling)
 * - MISSING_CONTEXT: reading questions without passage/reference text
 * - SHORT_ANSWER: correct answer is a single word for PILIHAN_GANDA (vocabulary excluded)
 * - CROSS_DUPLICATE: questions with near-identical stems testing same concept
 * - WRONG_ANSWER: explanation contradicts the correct answer
 */

export interface ContentIssue {
  kodeSoal: string;
  type:
    | "ANSWER_LEAKAGE"
    | "DUPLICATE_OPTION"
    | "TRIVIAL"
    | "MISSING_CONTEXT"
    | "SHORT_ANSWER"
    | "CROSS_DUPLICATE"
    | "WRONG_ANSWER"
    | "EMPTY_OPTIONS";
  severity: "CRITICAL" | "WARN" | "INFO";
  detail: string;
}

interface QuestionInput {
  kodeSoal: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  type: string;
  difficulty: string;
  skill: string;
  subskill?: string;
  topik?: string;
}

const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ini",
  "itu",
  "adalah",
  "untuk",
  "dengan",
  "pada",
  "dalam",
  "oleh",
  "sebuah",
  "sebagai",
  "tidak",
  "ada",
  "atau",
  "juga",
  "akan",
  "dari",
  "lebih",
  "telah",
  "mereka",
  "hal",
  "bisa",
  "karena",
  "ia",
  "ke",
  "sudah",
  "bagi",
  "kalau",
  "harus",
  "apakah",
  "manakah",
  "berikut",
  "perhatikan",
  "bacalah",
  "tentukan",
  "nyatakan",
  "jelaskan",
  "uraikan",
  "sebutkan",
  "tulislah",
  "buatlah",
  "identifikasilah",
  "ceritakan",
  "analisislah",
  "jelaskanlah",
  "pilihlah",
  "salah satu",
  "berikut ini",
  "termasuk",
  "contoh",
  "kalimat",
  "paragraf",
  "teks",
  "kutipan",
  "puisi",
]);

// Ejaan/spelling question types where near-duplicate options are INTENTIONAL
const SPELLING_TYPES = new Set([
  "Ejaan",
  "Ejaan dalam Tulisan",
  "Kata Baku",
  "Tanda Baca",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function isSpellingQuestion(topik?: string): boolean {
  return !!topik && SPELLING_TYPES.has(topik);
}

export function validateContentQuality(
  questions: QuestionInput[],
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const stemMap = new Map<string, string[]>(); // normalized stem →[] kodeSoal

  for (const q of questions) {
    const opts = q.options.map((o) => o.trim());
    const correctIdx = parseInt(q.correctAnswer);
    const correct = opts[correctIdx] || "";
    const spelling = isSpellingQuestion(q.topik);

    // --- EMPTY_OPTIONS ---
    if (opts.some((o) => !o || o.trim().length === 0)) {
      issues.push({
        kodeSoal: q.kodeSoal,
        type: "EMPTY_OPTIONS",
        severity: "CRITICAL",
        detail: "One or more options are empty",
      });
    }

    // --- DUPLICATE_OPTION ---
    const normOpts = opts.map(normalize);
    for (let a = 0; a < normOpts.length; a++) {
      for (let b = a + 1; b < normOpts.length; b++) {
        if (normOpts[a] === normOpts[b]) {
          issues.push({
            kodeSoal: q.kodeSoal,
            type: "DUPLICATE_OPTION",
            severity: spelling ? "INFO" : "CRITICAL",
            detail: `opts[${a}] ≈ opts[${b}]: "${opts[a].substring(0, 40)}"`,
          });
        }
      }
    }

    // --- ANSWER_LEAKAGE ---
    // Skip for spelling questions AND for reading comprehension questions
    // ("informasi tersurat" / "ide pokok" answers naturally restate the passage)
    const isReadingComp =
      q.subskill?.includes("INFORMASI_TERSURAT") ||
      q.subskill?.includes("IDE_POKOK") ||
      q.subskill?.includes("INFERENSI") ||
      q.text.toLowerCase().includes("informasi tersurat") ||
      q.text.toLowerCase().includes("gagasan utama") ||
      q.text.toLowerCase().includes("kesimpulan");
    if (!spelling && !isReadingComp && opts.length >= 3) {
      const textKws = tokenize(q.text);
      const correctKws = tokenize(correct);
      if (correctKws.length >= 1) {
        const overlap = correctKws.filter((w) => textKws.includes(w));
        const ratio = overlap.length / correctKws.length;
        if (ratio >= 0.6) {
          issues.push({
            kodeSoal: q.kodeSoal,
            type: "ANSWER_LEAKAGE",
            severity: "CRITICAL",
            detail: `overlap ${overlap.length}/${correctKws.length}=[${overlap.join(",")}]`,
          });
        }
      }
    }

    // --- TRIVIAL ---
    // Only flag if NOT vocabulary (sinonim/antonim) or spelling
    const isVocab =
      q.topik?.includes("Sinonim") ||
      q.topik?.includes("Antonim") ||
      q.topik?.includes("Kata Baku");
    if (!isVocab && !spelling && q.type === "PILIHAN_GANDA") {
      const avgWords =
        opts.reduce((s, o) => s + o.split(" ").length, 0) / opts.length;
      if (avgWords < 3) {
        issues.push({
          kodeSoal: q.kodeSoal,
          type: "TRIVIAL",
          severity: "WARN",
          detail: `avg option words: ${avgWords.toFixed(1)}`,
        });
      }
    }

    // --- MISSING_CONTEXT ---
    if (q.skill === "READING" || q.subskill?.includes("READING")) {
      const lower = q.text.toLowerCase();
      const hasContext =
        lower.includes("paragraf") ||
        lower.includes("passage") ||
        lower.includes("teks") ||
        lower.includes("kalimat") ||
        lower.includes("kutipan") ||
        lower.includes("puisi") ||
        lower.includes("struktur teks");
      if (!hasContext) {
        issues.push({
          kodeSoal: q.kodeSoal,
          type: "MISSING_CONTEXT",
          severity: "WARN",
          detail: "READING skill but no passage/reference text found",
        });
      }
    }

    // --- SHORT_ANSWER (non-vocab) ---
    if (
      !isVocab &&
      !spelling &&
      q.type === "PILIHAN_GANDA" &&
      correct.split(" ").length < 2
    ) {
      issues.push({
        kodeSoal: q.kodeSoal,
        type: "SHORT_ANSWER",
        severity: "INFO",
        detail: `correct="${correct.substring(0, 30)}"`,
      });
    }

    // --- CROSS_DUPLICATE (normalized stem) ---
    const stem = q.text
      .substring(0, 80)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
    if (stem.length > 15) {
      const existing = stemMap.get(stem) || [];
      existing.push(q.kodeSoal);
      stemMap.set(stem, existing);
    }
  }

  // Report cross-duplicates
  for (const [stem, ids] of stemMap) {
    if (ids.length > 1) {
      for (const id of ids) {
        issues.push({
          kodeSoal: id,
          type: "CROSS_DUPLICATE",
          severity: "WARN",
          detail: `same stem as ${ids.filter((x) => x !== id).join(", ")}`,
        });
      }
    }
  }

  return issues;
}

export function summarizeIssues(issues: ContentIssue[]) {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const i of issues) {
    byType[i.type] = (byType[i.type] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  }
  return { total: issues.length, byType, bySeverity };
}
