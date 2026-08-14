/**
 * GAME QUESTION QUALITY — dedupe.
 *
 * Exact → normalized → near-duplicate (token Jaccard). Hasil TIDAK pernah
 * menghapus otomatis: near-duplicate hanya DITANDAI untuk review.
 */

import type { GameQuestion } from "./types";

export function normalizeQuestionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\w\s]|_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(key: string): Set<string> {
  return new Set(key.split(" ").filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface DuplicateGroup {
  /** Similarity tertinggi pasangan dalam grup. */
  similarity: number;
  /** "exact" (teks sama) | "normalized" (sama setelah normalisasi) | "near" (Jaccard ≥ threshold). */
  kind: "exact" | "normalized" | "near";
  questions: GameQuestion[];
}

export function findDuplicates(
  questions: GameQuestion[],
  nearThreshold = 0.85
): DuplicateGroup[] {
  const byKey = new Map<string, GameQuestion[]>();
  for (const q of questions) {
    const key = normalizeQuestionKey(q.question);
    if (!key) continue;
    const list = byKey.get(key) || [];
    list.push(q);
    byKey.set(key, list);
  }

  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (const [key, list] of byKey) {
    if (list.length > 1) {
      groups.push({ similarity: 1, kind: "normalized", questions: list });
      list.forEach((q) => seen.add(q.id));
    }
  }

  // Near-duplicate: bandingkan antar kelompok unik (bukan semua pasangan).
  const uniqueKeys = [...byKey.keys()];
  const tokenMap = new Map(uniqueKeys.map((k) => [k, tokens(k)]));
  for (let i = 0; i < uniqueKeys.length; i++) {
    for (let j = i + 1; j < uniqueKeys.length; j++) {
      const sim = jaccard(tokenMap.get(uniqueKeys[i])!, tokenMap.get(uniqueKeys[j])!);
      if (sim >= nearThreshold) {
        const a = byKey.get(uniqueKeys[i])!;
        const b = byKey.get(uniqueKeys[j])!;
        if (a[0].id === b[0].id) continue;
        groups.push({ similarity: Number(sim.toFixed(3)), kind: "near", questions: [...a, ...b] });
      }
    }
  }

  return groups;
}

export function findExactDuplicates(questions: GameQuestion[]): DuplicateGroup[] {
  // Duplikat PERSIS = pertanyaan + jawaban + opsi identik (tuple lengkap) —
  // instruksi berulang dengan jawaban berbeda (mis. katastra 'Huruf apa ini?')
  // BUKAN duplikat.
  const byTuple = new Map<string, GameQuestion[]>();
  for (const q of questions) {
    const k = [
      normalizeQuestionKey(q.question),
      normalizeQuestionKey(q.correctAnswer),
      ...q.options.map((o) => normalizeQuestionKey(o)),
    ].join("|");
    const list = byTuple.get(k) || [];
    list.push(q);
    byTuple.set(k, list);
  }
  return [...byTuple.values()].filter((l) => l.length > 1).map((questions) => ({
    similarity: 1,
    kind: "exact",
    questions,
  }));
}
