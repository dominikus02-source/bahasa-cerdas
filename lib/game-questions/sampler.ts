/**
 * GAME QUESTION QUALITY — sampler (seeded + anti-repeat + balance).
 *
 * - `sampleQuestions(pool, count, opts)` memakai Fisher-Yates ber-seed (PRNG
 *   mulberry32 — deterministik untuk seed sama, cocok untuk sesi yang butuh
 *   replay consistency; tanpa seed = Math.random).
 * - Anti-repeat bertingkat: buang recentIds → bila kurang, izinkan → TIDAK
 *   pernah gagal (fallback full pool).
 * - Difficulty balance (default EASY 30% / MEDIUM 50% / HARD 20%) hanya bila
 *   soal punya difficulty; pool tanpa difficulty diacak biasa.
 * - Topic spread: round-robin per topik agar variasi merata.
 */

import type { GameQuestion, QuestionDifficulty } from "./types";

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededFisherYates<T>(items: T[], seed?: string): T[] {
  const arr = [...items];
  if (arr.length <= 1) return arr;
  const rng = seed
    ? mulberry32([...seed].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0))
    : Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface SampleOptions {
  seed?: string;
  /** ID soal yang baru dimainkan (diurutkan terbaru dulu) — dibuang dulu. */
  recentIds?: string[];
  /** Target persentase per difficulty (jumlah = 100). Default 30/50/20. */
  difficultyTargets?: Partial<Record<QuestionDifficulty, number>>;
  /** Sebar topik (round-robin) agar tidak didominasi satu topik. */
  topicSpread?: boolean;
}

const DEFAULT_TARGETS: Record<QuestionDifficulty, number> = { EASY: 30, MEDIUM: 50, HARD: 20 };

export function sampleQuestions(
  pool: GameQuestion[],
  count: number,
  opts: SampleOptions = {}
): GameQuestion[] {
  if (!Array.isArray(pool) || pool.length === 0 || count <= 0) return [];

  let candidates = pool;

  // Anti-repeat bertingkat: buang recent → bila sisa < count, pakai full pool.
  if (opts.recentIds && opts.recentIds.length > 0) {
    const recent = new Set(opts.recentIds);
    const fresh = candidates.filter((q) => !recent.has(q.id));
    if (fresh.length >= count || fresh.length === candidates.length) {
      candidates = fresh;
    }
  }

  if (candidates.length <= count) return seededFisherYates(candidates, opts.seed);

  // Topic spread: urutkan round-robin per topik lalu ambil.
  if (opts.topicSpread) {
    const byTopic = new Map<string, GameQuestion[]>();
    for (const q of seededFisherYates(candidates, opts.seed)) {
      const t = q.topic || "umum";
      const list = byTopic.get(t) || [];
      list.push(q);
      byTopic.set(t, list);
    }
    const buckets = [...byTopic.values()];
    const out: GameQuestion[] = [];
    let idx = 0;
    while (out.length < count && buckets.length > 0) {
      let added = false;
      for (const b of buckets) {
        if (idx < b.length && out.length < count) {
          out.push(b[idx]);
          added = true;
        }
      }
      if (!added) break;
      idx++;
    }
    if (out.length >= count) return out.slice(0, count);
    // fallback: isi sisa dari sisa pool
    const have = new Set(out.map((q) => q.id));
    out.push(...seededFisherYates(candidates, opts.seed).filter((q) => !have.has(q.id)));
    return out.slice(0, count);
  }

  // Difficulty balance (hanya bila ada data difficulty).
  const withDiff = candidates.filter((q) => q.difficulty);
  if (withDiff.length === candidates.length && withDiff.length > 0) {
    const targets = { ...DEFAULT_TARGETS, ...opts.difficultyTargets };
    const byDiff: Record<QuestionDifficulty, GameQuestion[]> = { EASY: [], MEDIUM: [], HARD: [] };
    for (const q of withDiff) byDiff[q.difficulty!].push(q);
    for (const d of Object.keys(byDiff) as QuestionDifficulty[]) byDiff[d] = seededFisherYates(byDiff[d], opts.seed);

    const per = {
      EASY: Math.round((count * targets.EASY) / 100),
      MEDIUM: Math.round((count * targets.MEDIUM) / 100),
      HARD: Math.round((count * targets.HARD) / 100),
    };
    const picked: GameQuestion[] = [];
    (Object.keys(byDiff) as QuestionDifficulty[]).forEach((d) => {
      picked.push(...byDiff[d].slice(0, per[d]));
    });
    if (picked.length < count) {
      const have = new Set(picked.map((q) => q.id));
      picked.push(
        ...seededFisherYates(candidates, opts.seed).filter((q) => !have.has(q.id)).slice(0, count - picked.length)
      );
    }
    return seededFisherYates(picked.slice(0, count), opts.seed);
  }

  return seededFisherYates(candidates, opts.seed).slice(0, count);
}
