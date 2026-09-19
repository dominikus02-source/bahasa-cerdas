/**
 * GAME QUESTION QUALITY — validator.
 *
 * Memvalidasi GameQuestion terhadap kontrak kanonik. Deteksi:
 * A. Structural: id/question/options invalid, opsi kosong/duplikat.
 * B. Answer integrity: correctAnswer kosong, tidak ada di options (MCQ).
 * C. Content integrity: terlalu pendek, placeholder/debug text, noise.
 * D. Educational: distractor tidak relevan (heuristik), stem generik.
 *
 * Skor 0–100 (directive §5):
 *   ≥75 ACTIVE · 60–74 REVIEW · <60 QUARANTINED.
 * Error struktural/answer = skor dibatasi ≤59 + alasan karantina.
 */

import type {
  GameQuestion,
  QuestionIssue,
  QuarantineReason,
  ValidationResult,
} from "./types";

const MIN_QUESTION_LEN = 12;
const PLACEHOLDER_PATTERNS = [
  /\bundefined\b/i,
  /\bnull\b/i,
  /\blorem\b/i,
  /\bTODO\b/,
  /\bFIXME\b/,
  /contoh soal/i,
  /\.{5,}/,
  /xxx+/i,
  /\{\{.*?\}\}/,
];
const REPEAT_CHAR = /(.)\1{6,}/;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
/** Untuk deteksi opsi duplikat — CASE-SENSITIVE (soal ejaan/kapital legit). */
const normDup = (s: string) => s.trim().replace(/\s+/g, " ");

export function validateQuestion(q: GameQuestion): ValidationResult {
  const issues: QuestionIssue[] = [];
  const errors: QuestionIssue[] = [];
  const err = (code: string, message: string) => {
    const issue = { code, severity: "error" as const, message };
    issues.push(issue);
    errors.push(issue);
  };
  const warn = (code: string, message: string) => {
    issues.push({ code, severity: "warning", message });
  };

  const question = norm(q.question);
  const options = (q.options || []).map(norm).filter(Boolean);
  const answer = norm(q.correctAnswer);

  // ── A. Structural ──
  if (!q.id || !q.id.trim()) err("MISSING_ID", "Soal tanpa id unik");
  if (!question) err("MISSING_QUESTION", "Teks pertanyaan kosong");
  else if (question.length < MIN_QUESTION_LEN) warn("QUESTION_TOO_SHORT", `Pertanyaan terlalu pendek (${question.length} char)`);
  if (!Array.isArray(q.options)) err("INVALID_OPTIONS", "options bukan array");
  else {
    if (!q.freeText && options.length < 2) err("INVALID_OPTIONS", `Opsi kurang dari 2 (${options.length})`);
    else if (!q.freeText && options.length < 4) warn("OPTIONS_LT4", `MCQ hanya ${options.length} opsi (disarankan 4)`);
    // Duplikat deteksi case-SENSITIVE: perbedaan kapitalisasi adalah pembeda
    // sah pada soal ejaan (mis. "Bandung" vs "bandung").
    const dup = new Set(q.options.map(normDup).filter(Boolean));
    if (dup.size !== q.options.map(normDup).filter(Boolean).length) err("INVALID_OPTIONS", "Opsi duplikat setelah normalisasi");
  }

  // ── B. Answer integrity ──
  if (!answer) err("NO_CORRECT_ANSWER", "correctAnswer kosong");
  else if (!q.freeText && options.length > 0 && !options.includes(answer)) {
    err("NO_CORRECT_ANSWER", `correctAnswer "${q.correctAnswer}" tidak ada di options`);
  }

  // ── C. Content integrity ──
  if (question) {
    for (const p of PLACEHOLDER_PATTERNS) {
      if (p.test(question)) {
        err("MALFORMED", `Teks mengandung placeholder/debug: ${p}`);
        break;
      }
    }
    if (REPEAT_CHAR.test(q.question.trim())) err("MALFORMED", "Teks mengandung pengulangan karakter noise");
  }

  // ── D. Educational (heuristik → warning, bukan karantina) ──
  if (question && !/[?？]|\b(apa|manakah|bagaimana|mengapa|kapan|siapa|pilih|tentukan|arti|lawan|bersinonim|antomin|makna|berikan|sebutkan|susunlah|isilah|cocokkan|pilihlah|tebak|huruf|suku)\b/i.test(q.question)) {
    warn("AMBIGUOUS", "Stem tidak mengandung sinyal pertanyaan/instruksi yang jelas");
  }
  if (options.length > 0) {
    const shortest = Math.min(...options.map((o) => o.length));
    const longest = Math.max(...options.map((o) => o.length));
    if (!q.freeText && shortest >= 1 && longest > shortest * 3) {
      warn("DISTRACTOR_IMBALANCE", "Panjang distractor sangat timpang (mudah ditebak)");
    }
  }

  // ── Skor ──
  let score = 100;
  if (errors.length > 0) {
    score = Math.max(0, 100 - errors.length * 40 - 20);
    score = Math.min(score, 59);
  } else {
    score = Math.max(60, 100 - issues.length * 5);
  }

  let status: ValidationResult["status"] = "ACTIVE";
  let quarantineReason: QuarantineReason | undefined;
  if (score < 60) {
    status = "QUARANTINED";
    quarantineReason = pickReason(errors);
  } else if (score < 75) {
    status = "REVIEW";
  }

  return { id: q.id, status, issues, qualityScore: score, quarantineReason };
}

function pickReason(errors: QuestionIssue[]): QuarantineReason {
  const codes = errors.map((e) => e.code);
  if (codes.includes("NO_CORRECT_ANSWER")) return "NO_CORRECT_ANSWER";
  if (codes.includes("INVALID_OPTIONS")) return "INVALID_OPTIONS";
  if (codes.includes("MALFORMED")) return "MALFORMED";
  if (codes.includes("DUPLICATE")) return "DUPLICATE";
  if (codes.includes("MISSING_QUESTION") || codes.includes("MISSING_ID")) return "MALFORMED";
  return "UNKNOWN";
}

export function validateAll(questions: GameQuestion[]): ValidationResult[] {
  return questions.map(validateQuestion);
}
