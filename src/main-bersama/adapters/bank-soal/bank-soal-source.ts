// ─── Bank Soal Adapter: Sumber Soal Existing ────────────────
// Membaca Bank Soal BahasaCerdas existing (READ-ONLY) dan
// menormalkannya ke bentuk netral BankSoalQuestionInput.
// TIDAK menyalin/mengubah data soal; TIDAK membuat bank baru.
//
// Dua sumber v1 (keduanya sudah dipakai repo):
//  - SoalSet → relasi `questions` (model Soal, PostgreSQL);
//  - MASTER_THEME → data/question-bank/master/<theme>.json
//    (bank master statis repo; kodeSoal = identity stabil).
//
// Semantik kunci jawaban Soal/master: `correctAnswer` = INDEX
// opsi berbasis 0 dalam bentuk string (lihat lib/question-factory/
// security.ts & distractor-quality.ts yang memakai parseInt).
// Konversi ke option id snapshot dilakukan adapt-question.ts.

import { db } from '@/lib/db';
import { readFileSync } from 'fs';
import path from 'path';
import type {
  BankSoalPackageRef,
  BankSoalQuestionInput,
  BankSoalQuestionSource,
  BankSoalSourceResult,
  BankThemeQuestionSource,
} from '../../application/use-cases/ports';
import { normalizePackageRef } from './package-ref';

/** Baca satu tema dari bank master statis repo (read-only). */
function loadMasterTheme(theme: string): BankSoalSourceResult {
  // Guard path: theme hanya [a-z0-9-] — cegah traversal.
  if (!/^[a-z0-9-]+$/.test(theme)) {
    return { ok: false, code: 'PACKAGE_NOT_FOUND' };
  }
  const file = path.join(process.cwd(), 'data', 'question-bank', 'master', `${theme}.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return { ok: false, code: 'PACKAGE_NOT_FOUND' };
  }
  if (!Array.isArray(raw)) return { ok: false, code: 'PACKAGE_NOT_FOUND' };

  const questions: BankSoalQuestionInput[] = [];
  // Label tampilan tema master: diambil dari field `tema` soal pertama
  // (data master selalu membawanya); fallback = slug yang dirapikan.
  let themeLabel: string | null = null;
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const q = item as Record<string, unknown>;
    if (typeof q.kodeSoal !== 'string' || typeof q.type !== 'string' || typeof q.text !== 'string') {
      continue; // baris rusak diabaikan sebagai "tidak ada" — bukan soal valid
    }
    if (!themeLabel && typeof q.tema === 'string' && q.tema.trim() !== '') {
      themeLabel = q.tema.trim();
    }
    const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string') : [];
    questions.push({
      sourceQuestionId: q.kodeSoal,
      type: q.type,
      prompt: q.text,
      options,
      correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : '',
      explanation: typeof q.explanation === 'string' ? q.explanation : null,
      passage: null,
      passageTitle: null,
    });
  }
  return { ok: true, questions, contentTitle: themeLabel ?? titleFromSlug(theme) };
}

/** Slug tema master → label tampilan (mis. `gaya-bahasa` → `Gaya Bahasa`). */
function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part !== '')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export class PrismaBankSoalQuestionSource implements BankSoalQuestionSource {
  /**
   * `bankTheme` = port tema Bank Soal (implementasi infrastructure,
   * diinjeksi route). Opsional supaya pemakai lama (SOAL_SET /
   * MASTER_THEME) tetap bisa membuat instance tanpa dependensi ini.
   */
  constructor(private readonly bankTheme?: BankThemeQuestionSource) {}

  async loadQuestions(rawRef: BankSoalPackageRef): Promise<BankSoalSourceResult> {
    // Ref dari request selalu dinormalisasi di boundary yang sama
    // dengan compatibility route — DUA pintu masuk tidak boleh berbeda.
    const ref = normalizePackageRef(rawRef);
    if (!ref) return { ok: false, code: 'PACKAGE_NOT_FOUND' };

    if (ref.kind === 'MASTER_THEME') {
      return loadMasterTheme(ref.theme);
    }
    if (ref.kind === 'BANK_THEME') {
      if (!this.bankTheme) return { ok: false, code: 'PACKAGE_NOT_FOUND' };
      return this.bankTheme.load({
        topic: ref.topic,
        ...(ref.count !== undefined ? { count: ref.count } : {}),
        difficulty: ref.difficulty ?? null,
        ...(ref.seed !== undefined ? { seed: ref.seed } : {}),
      });
    }

    // SoalSet existing — soal milik paket, urutan stabil by createdAt+id.
    const soalSet = await db.soalSet.findUnique({
      where: { id: ref.soalSetId },
      select: {
        id: true,
        // `title` = identitas tampilan paket; ikut jadi snapshot sesi.
        title: true,
        questions: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!soalSet) return { ok: false, code: 'PACKAGE_NOT_FOUND' };

    const questions: BankSoalQuestionInput[] = soalSet.questions.map((s) => ({
      sourceQuestionId: s.id,
      type: s.type,
      prompt: s.text,
      options: s.options,
      correctAnswer: s.correctAnswer,
      explanation: s.explanation,
      passage: null, // model Soal tidak punya kolom stimulus
      passageTitle: null,
    }));
    return { ok: true, questions, contentTitle: soalSet.title };
  }
}
