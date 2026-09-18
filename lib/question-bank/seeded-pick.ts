import { isMasterBankDeliverable, toDeliverySoal } from "@/lib/question-bank/delivery-gate";

export interface BankSoalCandidate {
  id: string;
  difficulty: string | null;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
  text?: unknown;
}

/** Normalisasi map UI → nilai `difficulty` di DB (MUDAH/SEDANG/SULIT). */
export function normalizeDifficulty(difficulty?: string | null): string | null {
  if (!difficulty) return null;
  const v = difficulty.trim().toUpperCase();
  return v === "MUDAH" || v === "SEDANG" || v === "SULIT" ? v : null;
}

/**
 * Deterministic Fisher-Yates seeded — urutan tertentu dari daftar kandidat
 * yang sama selalu menghasilkan set yang sama di preview dan send.
 * (Fisher-Yates: setiap permutasi sama-probable, bias uniform.)
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pilih question set CANONICAL untuk satu (tema, difficulty, jumlah, seed):
 * filter delivery-gate + difficulty dulu, lalu seeded-shuffle, lalu take jumlah.
 * Preview dan send memanggil fungsi INI — tidak ada randomize kedua.
 * Difficulty difilter di sini juga (bukan hanya di query DB) agar kontrak
 * "set yang sama" tetap terjamin siapa pun pemanggilnya.
 */
export function pickBankSoalSet<T extends BankSoalCandidate>(
  candidates: T[],
  opts: { jumlah: number; difficulty?: string | null; seed: string }
): { selected: T[]; deliverableTotal: number } {
  const difficulty = normalizeDifficulty(opts.difficulty);
  const deliverable = candidates.filter(
    (s) => isMasterBankDeliverable(toDeliverySoal(s as never)) && (!difficulty || s.difficulty === difficulty)
  );
  const shuffled = seededShuffle(deliverable, opts.seed);
  return {
    selected: shuffled.slice(0, opts.jumlah),
    deliverableTotal: deliverable.length,
  };
}
