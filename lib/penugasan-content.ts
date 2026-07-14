// Shared helpers for the "Kirim ke Kelas" student workflow.
// A Penugasan sends a PANDUAN unit; students receive ONLY Belajar (materi),
// Latihan (no answer keys), and Praktik. Kuis and Panduan Guru are excluded —
// kuis is given separately as an ulangan harian.

export type LatihanTipe = "PG" | "BENAR_SALAH" | "ISIAN";

// Server-internal question shape (includes the correct answer).
export interface GradeQuestion {
  id: string;
  question: string;
  options: string[]; // empty for ISIAN
  tipe: LatihanTipe;
  correct: number | string; // option index for PG/BENAR_SALAH, text for ISIAN
}

// Client-facing question (answer key stripped).
export interface StudentQuestion {
  id: string;
  question: string;
  options: string[];
  tipe: LatihanTipe;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Build the gradeable Latihan list from a unit's content JSON. */
export function buildLatihan(content: any): GradeQuestion[] {
  const out: GradeQuestion[] = [];

  for (const [i, s] of asArray<any>(content?.latihan).entries()) {
    const tipe: LatihanTipe = s?.tipe === "BENAR_SALAH" ? "BENAR_SALAH" : s?.tipe === "ISIAN" ? "ISIAN" : "PG";
    out.push({
      id: `l${i}`,
      question: String(s?.soal ?? ""),
      options: tipe === "ISIAN" ? [] : asArray<string>(s?.opsi),
      tipe,
      correct: s?.jawaban,
    });
  }

  // Some units carry extra reading-practice questions instead of `latihan`.
  for (const [i, q] of asArray<any>(content?.readingPractice?.questions).entries()) {
    const isMC = q?.type === "pilihan_ganda" && Array.isArray(q?.options);
    const opts = isMC ? asArray<string>(q.options) : [];
    out.push({
      id: `rp${i}`,
      question: String(q?.questionText ?? ""),
      options: opts,
      tipe: isMC ? "PG" : "ISIAN",
      correct: isMC ? opts.indexOf(String(q?.correctAnswer)) : String(q?.correctAnswer ?? ""),
    });
  }

  return out.filter((q) => q.question.trim().length > 0);
}

/** Strip answer keys before sending questions to the student. */
export function toStudentQuestions(qs: GradeQuestion[]): StudentQuestion[] {
  return qs.map(({ id, question, options, tipe }) => ({ id, question, options, tipe }));
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Grade student answers server-side. Returns correct count + total. */
export function gradeLatihan(
  qs: GradeQuestion[],
  answers: Record<string, string | number>,
): { correct: number; total: number; score: number } {
  let correct = 0;
  for (const q of qs) {
    const a = answers[q.id];
    if (a === undefined || a === null || a === "") continue;
    if (q.tipe === "ISIAN") {
      if (norm(a) === norm(q.correct)) correct++;
    } else {
      // PG / BENAR_SALAH: compare option index (accept string or number).
      if (Number(a) === Number(q.correct)) correct++;
    }
  }
  const total = qs.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 100;
  return { correct, total, score };
}

/** Resolve the Praktik block (explicit or derived from guide.worksheet). */
export function resolvePraktik(content: any): { petunjuk: string; tips: string[]; contoh?: string } | null {
  const p = content?.praktik;
  if (p && (p.petunjuk || (p.tips?.length ?? 0) > 0 || p.contoh)) {
    return { petunjuk: String(p.petunjuk ?? ""), tips: asArray<string>(p.tips), contoh: p.contoh || undefined };
  }
  const ws = content?.guide?.worksheet;
  if (ws && (ws.purpose || ws.title || (ws.instructions?.length ?? 0) > 0)) {
    return {
      petunjuk: [ws.title, ws.purpose].filter(Boolean).join("\n\n"),
      tips: asArray<string>(ws.instructions),
      contoh: ws.studentOutput || undefined,
    };
  }
  return null;
}

/** Belajar (materi) block, safely shaped. */
export function resolveBelajar(content: any): {
  tujuan: string[];
  materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[];
  rangkuman: string[];
} {
  const b = content?.belajar ?? {};
  return {
    tujuan: asArray<string>(b.tujuan),
    materi: asArray<any>(b.materi).map((m) => ({
      judul: String(m?.judul ?? ""),
      isi: asArray<string>(m?.isi),
      contoh: asArray<string>(m?.contoh),
      catatan: m?.catatan || undefined,
    })),
    rangkuman: asArray<string>(b.rangkuman),
  };
}
