// ─── Bank Soal Adapter (Read-Only, Murni) ───────────────────
// Mengubah soal BahasaCerdas (bentuk netral BankSoalQuestionInput)
// menjadi MainQuestionSnapshot domain Main Bersama.
//
// Prinsip (Tahap 5):
// - TIDAK mengubah Bank Soal, TIDAK menduplikasi data soal ke
//   folder Main Bersama; adapter yang menyesuaikan.
// - Tidak ada silent drop: soal tidak didukung menghasilkan result
//   gagal dengan kode + alasan eksplisit.
// - Identity opsi: source dengan opsi {id,text} (UKBI/TKA) memakai
//   id aslinya; source opsi string[] (Soal/master) mendapat id
//   deterministik a/b/c/d... — BUKAN teks, BUKAN posisi runtime.
// - correctOptionId divalidasi menunjuk opsi yang benar-benar ada.
// - Murni: source object tidak termutasi, snapshot independen
//   (string/options disalin, bukan direferensikan).

import type { MainQuestionSnapshot } from '../../domain/entities/question';
import type { BankSoalQuestionInput } from '../../application/use-cases/ports';

/** ID opsi deterministik: a, b, c, ... (maks 26 opsi). */
export const OPTION_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz' as const;

export type QuestionAdaptResult =
  | { ok: true; question: MainQuestionSnapshot }
  | {
      ok: false;
      code: 'UNSUPPORTED_QUESTION_TYPE' | 'INVALID_QUESTION';
      reason?: string;
    };

/** Tipe soal sumber yang didukung Main Bersama v1. */
const SUPPORTED_SOURCE_TYPES = new Set([
  'PILIHAN_GANDA', // Soal DB + master JSON
  'pilihan_ganda', // UKBI/TKA JSON
  'BENAR_SALAH', // master JSON (opsi Benar/Salah)
]);

/**
 * Validasi bentuk data untuk source type BENAR_SALAH: wajib tepat 2
 * opsi bermakna benar/salah (bisa dua arah). BENTUK BUKAN authority —
 * source type yang menentukan; bentuk hanya divalidasi.
 */
function validateTrueFalseShape(options: ReadonlyArray<{ id: string; text: string }>): boolean {
  if (options.length !== 2) return false;
  const norm = (s: string) => s.trim().toLowerCase();
  const [a, b] = options;
  return (
    (norm(a.text) === 'benar' && norm(b.text) === 'salah') ||
    (norm(a.text) === 'salah' && norm(b.text) === 'benar') ||
    (norm(a.text) === 'true' && norm(b.text) === 'false') ||
    (norm(a.text) === 'false' && norm(b.text) === 'true')
  );
}

/**
 * Petakan kunci jawaban sumber ke option id snapshot.
 * Menerima: index "0", huruf "B"/"b", atau id opsi langsung ("a"/"A").
 */
function resolveCorrectOptionId(
  correctAnswer: string,
  options: ReadonlyArray<{ id: string; text: string }>,
): string | null {
  const raw = correctAnswer.trim();
  if (raw.length === 0) return null;

  // 1) Kunci = id opsi langsung (UKBI/TKA "A", snapshot "a").
  const byExactId = options.find((o) => o.id === raw);
  if (byExactId) return byExactId.id;

  // 2) Kunci = index berbasis 0 ("0", "1", ...) — konvensi Soal/master.
  if (/^\d+$/.test(raw)) {
    const idx = Number(raw);
    if (Number.isInteger(idx) && idx >= 0 && idx < options.length) {
      return options[idx]!.id;
    }
    return null;
  }

  // 3) Kunci = huruf berbasis 1 ("A" → opsi pertama).
  if (/^[a-zA-Z]$/.test(raw)) {
    const idx = OPTION_ID_ALPHABET.indexOf(raw.toLowerCase());
    if (idx >= 0 && idx < options.length) return options[idx]!.id;
    return null;
  }

  return null;
}

/** Prompt wajib non-kosong; passage hanya untuk passage type. */
function buildPromptAndPassage(input: BankSoalQuestionInput):
  | { ok: true; prompt: string; passage?: { title?: string; content: string } }
  | { ok: false; reason: string } {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (prompt.length === 0) {
    return { ok: false, reason: 'prompt kosong' };
  }
  const passageContent =
    typeof input.passage === 'string' ? input.passage : input.passage === undefined ? null : input.passage;
  const hasPassage = passageContent !== null && passageContent.trim().length > 0;
  if (hasPassage) {
    const passage: { title?: string; content: string } = { content: passageContent! };
    const title = input.passageTitle ?? null;
    if (title !== null && title.trim().length > 0) passage.title = title.trim();
    return { ok: true, prompt, passage };
  }
  return { ok: true, prompt };
}

/** Adaptasi satu soal Bank Soal → MainQuestionSnapshot. */
export function adaptQuestion(input: BankSoalQuestionInput): QuestionAdaptResult {
  if (!SUPPORTED_SOURCE_TYPES.has(input.type)) {
    return {
      ok: false,
      code: 'UNSUPPORTED_QUESTION_TYPE',
      reason: `Tipe soal "${input.type}" belum didukung Main Bersama v1 (hanya single-choice / true-false)`,
    };
  }

  // Normalisasi opsi — TIDAK memutasi array source.
  const sourceOptionsRaw = input.options;
  const sourceOptions: ReadonlyArray<string | { id?: unknown; text?: unknown }> =
    Array.isArray(sourceOptionsRaw) ? sourceOptionsRaw : [];
  const options: Array<{ id: string; text: string }> = [];
  if (Array.isArray(sourceOptionsRaw) && sourceOptionsRaw.length >= 2) {
    for (let i = 0; i < sourceOptions.length; i++) {
      const opt = sourceOptions[i]!;
      if (typeof opt === 'string') {
        const text = opt.trim();
        if (text.length === 0) {
          return { ok: false, code: 'INVALID_QUESTION', reason: `opsi[${i}] kosong` };
        }
        options.push({ id: OPTION_ID_ALPHABET[i] ?? `opt${i + 1}`, text });
      } else if (typeof opt === 'object' && opt !== null) {
        const rec = opt as { id?: unknown; text?: unknown };
        const id = typeof rec.id === 'string' ? rec.id.trim() : '';
        const text = typeof rec.text === 'string' ? rec.text.trim() : '';
        if (id.length === 0 || text.length === 0) {
          return { ok: false, code: 'INVALID_QUESTION', reason: `opsi[${i}] id/text kosong` };
        }
        options.push({ id, text });
      } else {
        return { ok: false, code: 'INVALID_QUESTION', reason: `opsi[${i}] bukan string/objek` };
      }
    }
  } else {
    return {
      ok: false,
      code: 'INVALID_QUESTION',
      reason: 'opsi wajib array minimal 2 elemen',
    };
  }

  // Duplicate id → invalid (identity opsi harus unik).
  const ids = new Set(options.map((o) => o.id));
  if (ids.size !== options.length) {
    return { ok: false, code: 'INVALID_QUESTION', reason: 'id opsi duplikat' };
  }

  // Kunci jawaban wajib menunjuk opsi yang ada (Tahap 5 §9).
  const correctOptionId = resolveCorrectOptionId(input.correctAnswer, options);
  if (correctOptionId === null) {
    return {
      ok: false,
      code: 'INVALID_QUESTION',
      reason: `correctAnswer "${input.correctAnswer}" tidak menunjuk opsi yang valid`,
    };
  }

  const shaped = buildPromptAndPassage(input);
  if (!shaped.ok) {
    return { ok: false, code: 'INVALID_QUESTION', reason: shaped.reason };
  }

  const explanation =
    typeof input.explanation === 'string' && input.explanation.trim().length > 0
      ? input.explanation
      : undefined;
  // Penentuan tipe domain — SOURCE TYPE adalah authority (fix review
  // Tahap 5): BUKAN bentuk data. Dua opsi pada pilihan ganda TETAP
  // single-choice, bukan true-false.
  //   BENAR_SALAH                    → true-false (bentuknya divalidasi)
  //   pilihan ganda + passage        → passage-single-choice
  //   pilihan ganda tanpa passage    → single-choice
  const isBenarSalah = input.type === 'BENAR_SALAH';
  if (isBenarSalah && !validateTrueFalseShape(options)) {
    return {
      ok: false,
      code: 'INVALID_QUESTION',
      reason: 'BENAR_SALAH wajib tepat 2 opsi Benar/Salah (bisa dua arah)',
    };
  }
  const type = isBenarSalah
    ? 'true-false'
    : shaped.passage
      ? 'passage-single-choice'
      : 'single-choice';

  const snapshot: MainQuestionSnapshot = {
    id: '', // diisi caller/use-case (deterministik via IdGenerator)
    sourceQuestionId: input.sourceQuestionId,
    type,
    prompt: shaped.prompt,
    // Salin array — snapshot bebas dari mutasi source berikutnya.
    options: options.map((o) => ({ id: o.id, text: o.text })),
    correctOptionId,
    ...(explanation !== undefined ? { explanation } : {}),
    ...(shaped.passage ? { passage: shaped.passage } : {}),
  };
  return { ok: true, question: snapshot };
}
