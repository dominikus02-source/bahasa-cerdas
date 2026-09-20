// ─── Package Ref Normalizer (Boundary Validation) ────────────
// Satu-satunya tempat menerjemahkan `packageRef` mentah dari request
// menjadi bentuk bertipe. Dipakai compatibility route DAN sumber soal
// (create-session) — validasi tidak boleh berbeda antar pintu masuk.
//
// Prinsip: tolak dengan `null` (bukan menebak/memperbaiki), batasi
// panjang string, dan TIDAK PERNAH menerima isi soal dari client —
// hanya identitas sumber + parameter pemilihan.

import type { BankSoalPackageRef } from '../../application/use-cases/ports';

/** Batas pilihan soal per sesi Main Bersama (samakan dengan Bank Soal). */
export const MAX_BANK_THEME_COUNT = 30;

const MAX_TOPIC_LENGTH = 120;
const MAX_SEED_LENGTH = 64;
const SEED_PATTERN = /^[A-Za-z0-9_-]+$/;
const DIFFICULTIES = ['MUDAH', 'SEDANG', 'SULIT'] as const;

function normalizeDifficulty(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') return undefined; // invalid
  const v = raw.trim().toUpperCase();
  return (DIFFICULTIES as readonly string[]).includes(v) ? v : undefined;
}

/**
 * Normalisasi `packageRef` mentah. `null` = ditolak (caller memetakan
 * ke PACKAGE_NOT_FOUND). Idempoten: ref yang sudah tertipe lolos apa
 * adanya.
 */
export function normalizePackageRef(raw: unknown): BankSoalPackageRef | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const ref = raw as Record<string, unknown>;

  if (ref.kind === 'SOAL_SET') {
    const id = ref.soalSetId;
    if (typeof id !== 'string' || id.length === 0 || id.length > 64) return null;
    return { kind: 'SOAL_SET', soalSetId: id };
  }

  if (ref.kind === 'MASTER_THEME') {
    const theme = ref.theme;
    if (typeof theme !== 'string' || theme.length === 0 || theme.length > MAX_TOPIC_LENGTH) return null;
    // Tema master = slug file [a-z0-9-] (lihat loadMasterTheme).
    if (!/^[a-z0-9-]+$/.test(theme)) return null;
    return { kind: 'MASTER_THEME', theme };
  }

  if (ref.kind === 'BANK_THEME') {
    const topic = ref.topic;
    if (typeof topic !== 'string') return null;
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length === 0 || trimmedTopic.length > MAX_TOPIC_LENGTH) return null;

    const difficulty = normalizeDifficulty(ref.difficulty);
    if (difficulty === undefined) return null;

    let count: number | undefined;
    if (ref.count !== undefined && ref.count !== null && ref.count !== '') {
      const n = Number(ref.count);
      if (!Number.isInteger(n) || n < 1 || n > MAX_BANK_THEME_COUNT) return null;
      count = n;
    }

    let seed: string | undefined;
    if (ref.seed !== undefined && ref.seed !== null && ref.seed !== '') {
      if (typeof ref.seed !== 'string') return null;
      const trimmedSeed = ref.seed.trim();
      if (trimmedSeed.length === 0 || trimmedSeed.length > MAX_SEED_LENGTH) return null;
      if (!SEED_PATTERN.test(trimmedSeed)) return null;
      seed = trimmedSeed;
    }

    return {
      kind: 'BANK_THEME',
      topic: trimmedTopic,
      ...(count !== undefined ? { count } : {}),
      difficulty: difficulty ?? null,
      ...(seed !== undefined ? { seed } : {}),
    };
  }

  return null;
}
