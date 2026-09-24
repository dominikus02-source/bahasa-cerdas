// ─── Tema Bank Soal → Soal Main Bersama (Read-Only) ─────────
// Membaca grup `Soal` (source=MASTER_BANK) per `topik` — sumber yang
// SAMA dengan halaman Bank Soal — lalu memilih sebagian dengan aturan
// pemilihan yang juga dipakai Latihan (`pickBankSoalSet`): gerbang
// pengiriman + tingkat kesulitan, seeded-shuffle, ambil sejumlah.
//
// Konsekuensi yang disengaja: set yang dipratinjau guru == set yang
// dimainkan. Tidak ada SoalSet/Soal baru yang dibuat (referensi
// sumber, bukan paket duplikat).
//
// Kelas ini hidup di infrastructure karena menyentuh Prisma + util
// Bank Soal BC; adapter Bank Soal hanya bergantung pada port
// aplikasi, dan komposisi nyata dilakukan di route (composition root).

import { db } from '@/lib/db';
import { normalizeDifficulty, pickBankSoalSet } from '@/lib/question-bank/seeded-pick';
import type {
  BankSoalSourceResult,
  BankThemeQuestionSource,
  BankThemeSelection,
} from '../../application/use-cases/ports';

export class PrismaBankThemeQuestionSource implements BankThemeQuestionSource {
  async load(ref: BankThemeSelection): Promise<BankSoalSourceResult> {
    const difficulty = normalizeDifficulty(ref.difficulty ?? null);
    const where: Record<string, unknown> = { source: 'MASTER_BANK', topik: ref.topic };
    // Tingkat kesulitan difilter di query DAN di picker (persis seperti
    // preview Bank Soal) agar kontrak "set yang sama" tidak bergantung
    // pada satu lapis saja.
    if (difficulty) where.difficulty = difficulty;

    const candidates = await db.soal.findMany({ where });
    if (candidates.length === 0) return { ok: false, code: 'PACKAGE_NOT_FOUND' };

    const { selected } = pickBankSoalSet(candidates, {
      jumlah: ref.count ?? candidates.length,
      difficulty,
      seed: ref.seed ?? '__none__',
    });

    return {
      ok: true,
      // Nama tema Bank Soal = `topik` yang dipilih guru → label konten sesi.
      contentTitle: ref.topic.trim(),
      questions: selected.map((s) => ({
        sourceQuestionId: s.id,
        type: s.type,
        prompt: s.text,
        options: s.options,
        correctAnswer: s.correctAnswer,
        explanation: s.explanation,
        passage: null, // model Soal tidak punya kolom stimulus
        passageTitle: null,
      })),
    };
  }
}
