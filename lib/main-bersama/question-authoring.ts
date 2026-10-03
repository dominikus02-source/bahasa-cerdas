import { z } from "zod";

export interface DraftQuestion {
  type?: "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";
  answerText?: string;
  prompt: string;
  options: string[];
  correctIndex: number | null;
  explanation: string;
}
export const packageDraftSchema = z.object({
  title: z.string().trim().min(1, "Isi judul paket.").max(120),
  kelas: z.string().trim().min(1, "Isi kelas.").max(30),
  reviewed: z.literal(true),
  questions: z
    .array(
      z
        .object({
          type: z
            .enum(["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"])
            .default("PILIHAN_GANDA"),
          answerText: z.string().trim().max(200).default(""),
          prompt: z.string().trim().min(1, "Isi pertanyaan.").max(6000),
          options: z.array(z.string().trim().max(2000)).min(0).max(5),
          correctIndex: z.number().int().min(0).max(4).nullable(),
          explanation: z.string().trim().max(6000).default(""),
        })
        .superRefine((q, ctx) => {
          if (q.type === "ISIAN_SINGKAT") {
            if (
              !q.answerText ||
              q.options.length !== 0 ||
              q.correctIndex !== null
            )
              ctx.addIssue({
                code: "custom",
                message:
                  "Isi kunci isian singkat; isian tidak memakai pilihan.",
              });
            return;
          }
          if (q.options.length < 2 || q.options.some((o) => !o))
            ctx.addIssue({
              code: "custom",
              message: "Isi minimal dua pilihan jawaban.",
            });
          if (
            q.type === "BENAR_SALAH" &&
            (q.options.length !== 2 ||
              q.options[0] !== "Benar" ||
              q.options[1] !== "Salah")
          )
            ctx.addIssue({
              code: "custom",
              message: "Benar/salah menggunakan dua pilihan tetap.",
            });
          if (q.correctIndex === null || q.correctIndex >= q.options.length)
            ctx.addIssue({
              code: "custom",
              message: "Pilih kunci jawaban yang tersedia.",
            });
          if (
            new Set(q.options.map((o) => o.toLowerCase())).size !==
            q.options.length
          )
            ctx.addIssue({
              code: "custom",
              message: "Pilihan jawaban tidak boleh sama.",
            });
        }),
    )
    .min(1, "Tambahkan minimal satu soal.")
    .max(50, "Maksimal 50 soal per paket."),
});
export const blankQuestion = (): DraftQuestion => ({
  type: "PILIHAN_GANDA",
  answerText: "",
  prompt: "",
  options: ["", "", "", ""],
  correctIndex: null,
  explanation: "",
});

/** Never invent answers. Unknown formatting remains visible as original source text. */
export function parseQuestionText(text: string): {
  questions: DraftQuestion[];
  warnings: string[];
} {
  if (text.length > 100000)
    throw new Error(
      "Teks terlalu panjang. Pisahkan dokumen menjadi beberapa paket.",
    );
  const questions: DraftQuestion[] = [];
  const sourceNumbers: number[] = [];
  let current: DraftQuestion | null = null;
  let optionIndex = -1;
  let inKey = false;
  const keys = new Map<number, number>();
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^kunci jawaban\s*:?$/i.test(line)) {
      inKey = true;
      continue;
    }
    if (inKey) {
      for (const match of line.matchAll(/(\d+)\s*[.):=\-]\s*([A-E])\b/gi))
        keys.set(Number(match[1]), match[2].toUpperCase().charCodeAt(0) - 65);
      continue;
    }
    const numbered = line.match(/^(\d+)\s*[.)]\s+(.+)$/);
    if (numbered) {
      current = {
        prompt: numbered[2],
        options: [],
        correctIndex: null,
        explanation: "",
      };
      sourceNumbers.push(Number(numbered[1]));
      questions.push(current);
      optionIndex = -1;
      continue;
    }
    if (!current) continue;
    const kind = line.match(
      /^jenis(?: soal)?\s*:\s*(pilihan ganda|benar[ /-]*salah|isian singkat)$/i,
    );
    if (kind) {
      current.type = /^isian/i.test(kind[1])
        ? "ISIAN_SINGKAT"
        : /^benar/i.test(kind[1])
          ? "BENAR_SALAH"
          : "PILIHAN_GANDA";
      current.options =
        current.type === "BENAR_SALAH" ? ["Benar", "Salah"] : [];
      continue;
    }
    const textKey = line.match(/^(?:kunci(?: jawaban)?|jawaban)\s*:\s*(.+)$/i);
    if (textKey && current.type === "ISIAN_SINGKAT") {
      current.answerText = textKey[1].trim();
      continue;
    }
    if (
      textKey &&
      current.type === "BENAR_SALAH" &&
      /^(benar|salah)$/i.test(textKey[1])
    ) {
      current.correctIndex = /^benar$/i.test(textKey[1]) ? 0 : 1;
      continue;
    }
    const answer = line.match(
      /^(?:kunci(?: jawaban)?|jawaban)\s*:\s*([A-E])\s*[.)]?\s*$/i,
    );
    if (answer) {
      current.correctIndex = answer[1].toUpperCase().charCodeAt(0) - 65;
      optionIndex = -1;
      continue;
    }
    const explanation = line.match(/^pembahasan\s*:\s*(.*)$/i);
    if (explanation) {
      current.explanation = explanation[1];
      optionIndex = -1;
      continue;
    }
    const option = line.match(/^([A-Ea-e])\s*[.)]\s+(.+)$/);
    if (option) {
      optionIndex = option[1].toUpperCase().charCodeAt(0) - 65;
      current.options[optionIndex] = option[2];
      continue;
    }
    if (current.explanation) current.explanation += "\n" + line;
    else if (optionIndex >= 0) current.options[optionIndex] += "\n" + line;
    else current.prompt += "\n" + line;
  }
  const warnings: string[] = [];
  questions.forEach((q, i) => {
    if (q.type === "ISIAN_SINGKAT") {
      q.options = [];
      if (!q.answerText)
        warnings.push(`Soal ${i + 1}: isi kunci isian singkat.`);
      return;
    }
    if (q.correctIndex === null)
      q.correctIndex = keys.get(sourceNumbers[i]) ?? null;
    q.options = Array.from(
      { length: Math.max(2, q.options.length) },
      (_, j) => q.options[j] ?? "",
    );
    if (q.correctIndex === null || q.correctIndex >= q.options.length) {
      q.correctIndex = null;
      warnings.push(`Soal ${i + 1}: pilih kunci jawaban.`);
    }
    if (q.options.some((o) => !o))
      warnings.push(`Soal ${i + 1}: lengkapi pilihan jawaban.`);
  });
  if (!questions.length)
    warnings.push(
      "Format soal belum dikenali. Rapikan teks sumber atau masukkan soal secara manual.",
    );
  if (questions.length > 50)
    throw new Error(
      "Dokumen berisi lebih dari 50 soal. Pisahkan dokumen terlebih dahulu.",
    );
  return { questions, warnings };
}
