/**
 * Per-session question sampling & anti-repeat for UKBI/TKA simulations.
 *
 * Phase UKBI SIMULATION 2.0 — Randomized Question Engine:
 * - `sampleSectionQuestions` picks a seeded, blueprint-sized sample from a
 *   section's ELIGIBLE pool. The pool itself is cached (answer-free, same for
 *   every session); the sample is what varies per session, so consecutive
 *   attempts no longer see the same question set.
 * - `excludeRecentForSection` implements anti-repeat with tiered fallback:
 *   level 1 excludes the newest finished session's questions, level 2 widens
 *   to the last N sessions, level 3 falls back to the full eligible pool.
 *   It NEVER fails and NEVER returns an undersized selection.
 * - `sanitizeListeningQuestions` is the client-data-contract guard for
 *   MENDENGARKAN: even if a DB row ever carried transcript-like content in
 *   passage/imageUrl/wordCount, it is stripped before anything is cached or
 *   shipped to the client. Scoring is unaffected (snapshot keeps
 *   correctAnswer server-side).
 *
 * Pure module — no imports of next/server/prisma/redis so it can be unit
 * tested by plain tsx scripts.
 */

import { fisherYatesShuffle } from "./randomization";

/**
 * Parse question IDs used by a user's recent finished sessions.
 * Each session's snapshot JSON carries `questions[].id` (server-side).
 * Returns newest-first batches of id lists (only sessions that actually have
 * a snapshot contribute; malformed/empty snapshots are skipped).
 */
export interface RecentSessionLike {
  questionSnapshot?: unknown;
}

export function parseRecentUsedBatches(
  recentSessions: RecentSessionLike[]
): string[][] {
  const batches: string[][] = [];
  for (const s of recentSessions) {
    if (!s || !s.questionSnapshot) continue;
    const snap = s.questionSnapshot as { questions?: Array<{ id?: string }> };
    const ids = Array.isArray(snap?.questions)
      ? snap.questions
          .map((q) => q?.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    if (ids.length > 0) batches.push(ids);
  }
  return batches;
}

/**
 * Exclude recently used question IDs from the eligible pool, with tiered
 * fallback so the section never ends up undersized:
 *   1. exclude only the newest finished session's questions
 *   2. exclude questions from the last `usedBatches` sessions
 *   3. full pool (anti-repeat gives up before shrinking the test)
 */
export function excludeRecentForSection<T extends { id: string }>(
  eligible: T[],
  usedBatches: string[][],
  neededCount: number
): T[] {
  if (!usedBatches.length || !eligible.length) return eligible;
  if (neededCount <= 0) return eligible;
  if (neededCount >= eligible.length) return eligible; // no room to exclude

  const filteredFor = (excluded: Set<string>): T[] => {
    if (excluded.size === 0) return eligible;
    const remaining = eligible.filter((q) => !excluded.has(q.id));
    return remaining.length >= neededCount ? remaining : [];
  };

  // Level 1: newest session only.
  const newest = new Set(usedBatches[0]);
  const level1 = filteredFor(newest);
  if (level1.length > 0) return level1;

  // Level 2: all recent batches.
  if (usedBatches.length > 1) {
    const all = new Set(usedBatches.flat());
    const level2 = filteredFor(all);
    if (level2.length > 0) return level2;
  }

  // Level 3: full eligible pool.
  return eligible;
}

/**
 * Per-session seeded sample honoring the blueprint count. Deterministic for a
 * given seed (same session → same set); different sessions (different seeds)
 * produce different samples when the pool allows it.
 * - count == null/<=0 → keep the whole pool (shuffled).
 * - pool.length <= count → keep the whole pool (shuffled).
 */
export function sampleSectionQuestions<T>(
  pool: T[],
  count: number | null,
  seed: string
): T[] {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  if (!count || count <= 0 || pool.length <= count) {
    return fisherYatesShuffle(pool, seed);
  }
  return fisherYatesShuffle(pool, seed).slice(0, count);
}

/**
 * Strip everything a MENDENGARKAN question does not need client-side.
 * Client contract for listening: { id, text, options, audioUrl, type, seksi,
 * difficulty }. Everything else (passage, imageUrl, passageType, wordCount)
 * is dropped — transcript-like content can never reach the browser even if a
 * future track stored it in those columns. Mutates and returns the pool.
 */
export function sanitizeListeningQuestions<T extends Record<string, unknown>>(
  pool: T[]
): T[] {
  for (const q of pool) {
    if (q?.seksi !== "MENDENGARKAN") continue;
    delete q.passage;
    delete q.imageUrl;
    delete q.passageType;
    delete q.wordCount;
    delete q.audioScript;
    delete q.transcript;
  }
  return pool;
}
