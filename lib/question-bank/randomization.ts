/**
 * Server-side question & option randomization for UKBI/TKA test-taking.
 *
 * Design:
 * - Questions within each section are shuffled to prevent memorization.
 * - Options within each question are shuffled (MCQ) while keeping option `id` intact.
 * - Since `correctAnswer` is an option id (e.g. "A") and options have fixed ids,
 *   no mapping storage is needed — the server compares selected option id directly
 *   against the stored correctAnswer id.
 * - Seeded shuffle enables reproducible results if needed for debugging.
 */

/**
 * Simple seeded PRNG (Mulberry32).
 * Given the same seed, produces the same sequence of numbers.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic seeded Fisher-Yates shuffle.
 * Same seed → same order.
 * No seed → uses Math.random (non-deterministic).
 */
export function fisherYatesShuffle<T>(items: T[], seed?: string): T[] {
  const arr = [...items];
  if (arr.length <= 1) return arr;

  let rng: () => number;
  if (seed !== undefined) {
    let numericSeed = 0;
    for (let i = 0; i < seed.length; i++) {
      numericSeed = ((numericSeed << 5) - numericSeed + seed.charCodeAt(i)) | 0;
    }
    rng = mulberry32(numericSeed);
  } else {
    rng = Math.random;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffle questions within a section.
 * Each question object must have an `id` field.
 */
export function shuffleQuestions<T extends { id: string }>(
  questions: T[],
  seed?: string
): T[] {
  return fisherYatesShuffle(questions, seed);
}

/**
 * Shuffle options for a single question.
 * Options are expected as `{ id: string, text: string }[]`.
 * The `id` field is preserved (not affected by position change).
 */
export function shuffleOptionsForQuestion(
  options: { id: string; text: string }[],
  seed?: string
): { id: string; text: string }[] {
  return fisherYatesShuffle(options, seed);
}

/**
 * Shuffle options for all questions in an array.
 */
export function shuffleOptionsForQuestions(
  questions: { options?: { id: string; text: string }[] }[],
  seed?: string
): void {
  for (let i = 0; i < questions.length; i++) {
    if (questions[i].options && questions[i].options!.length > 0) {
      questions[i].options = shuffleOptionsForQuestion(questions[i].options!, seed ? `${seed}-q${i}` : undefined);
    }
  }
}

/**
 * Create a deterministic session seed from userId + testId + timestamp.
 * Used to make question order reproducible for a given session.
 */
export function createSessionSeed(userId: string, testId: string, timestamp?: number): string {
  return `${userId}-${testId}-${timestamp ?? Date.now()}`;
}

/**
 * Safe hash for seed generation. Not cryptographic — just for shuffle determinism.
 */
export function safeHashSeed(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
