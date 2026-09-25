/**
 * P8I — Sesi TTS sisi server: anggaran petunjuk terbatas + hadiah otoritatif.
 *
 * Aturan:
 * - SATU sesi ACTIVE per user (mulai baru = tutup yang lama sebagai FINISHED).
 * - Petunjuk: maks 3 pengungkapan huruf/puzzle; klaim ATOMIK via
 *   `updateMany WHERE hintsRevealed < 3` — refresh/tab ganda/race tidak
 *   bisa menghasilkan petunjuk ke-4.
 * - Hadiah dihitung di sini (server): dasar level × akurasi − penalti
 *   petunjuk, dikali multiplier tier kesulitan. Nilai dari klien tidak
 *   dipercaya; combo/streak bonus tidak masuk perhitungan server.
 */

import { db } from "@/lib/db";
import { awardXp } from "@/lib/award-xp";
import { calculateGameReward } from "@/lib/game/tts/economy";
import { buildPuzzle } from "@/lib/game/tts/generator";

export const TTS_HINT_LIMIT = 3;

export interface TtsStartResult {
  sessionId: string;
  hintsRemaining: number;
}

/** Mulai sesi baru: tutup sesi ACTIVE lama, buat sesi baru. */
export async function startTtsSession(input: {
  userId: string;
  level: number;
  seed: number;
  cellsTotal: number;
}): Promise<TtsStartResult> {
  const soals = await db.soal.findMany({ where: { source: "MASTER_BANK", type: { in: ["PILIHAN_GANDA", "ISIAN_SINGKAT"] } }, select: { id: true, text: true, difficulty: true, correctAnswer: true, options: true, topik: true, kelas: true }, orderBy: { updatedAt: "desc" }, take: 1200 });
  const normalize = (value: unknown) => String(value ?? "").normalize("NFKD").replace(/[^A-Za-z]/g, "").toUpperCase();
  const cleanClue = (value: string) => value.replace(/\s+/g, " ").replace(/^\s*(soal|pertanyaan)\s*:\s*/i, "").trim();
  const words: Array<{ id: string; answer: string; clue: string; tier: 1 | 2 | 3; source: "MASTER_BANK"; topik: string | null; kelas: string | null }> = [];
  const seen = new Set<string>();
  for (const soal of soals) {
    const raw = soal.correctAnswer?.trim() ?? ""; let answer = raw;
    if (/^[A-D]$/i.test(raw)) answer = soal.options?.[raw.toUpperCase().charCodeAt(0) - 65] ?? "";
    else if (/^\d+$/.test(raw)) answer = soal.options?.[Number(raw)] ?? raw;
    answer = normalize(answer); const clue = cleanClue(soal.text);
    if (answer.length < 3 || answer.length > 14 || clue.length < 8 || normalize(clue).includes(answer) || seen.has(answer)) continue;
    const d = (soal.difficulty ?? "").toUpperCase(); const tier = d === "EASY" || d === "MUDAH" ? 1 : d === "HARD" || d === "SULIT" ? 3 : 2;
    seen.add(answer); words.push({ id: soal.id, answer, clue, tier, source: "MASTER_BANK", topik: soal.topik, kelas: soal.kelas });
  }
  const puzzle = buildPuzzle({ level: input.level, seed: input.seed, wordPool: words });
  const actualCells = new Set<string>();
  for (const word of puzzle.words) for (let i = 0; i < word.answer.length; i++) actualCells.add(word.dir === "A" ? String(word.row) + "," + String(word.col + i) : String(word.row + i) + "," + String(word.col));

  await db.ttsSession.updateMany({
    where: { userId: input.userId, status: "ACTIVE" },
    data: { status: "FINISHED", finishedAt: new Date() },
  });

  const session = await db.ttsSession.create({
    data: {
      userId: input.userId,
      level: Math.max(1, Math.min(12, Math.floor(input.level))),
      seed: Math.floor(input.seed) || 0,
      cellsTotal: actualCells.size,
      cellsCorrect: 0,
      puzzle: JSON.parse(JSON.stringify(puzzle.words)),
    },
    select: { id: true, hintsRevealed: true },
  });

  return {
    sessionId: session.id,
    hintsRemaining: TTS_HINT_LIMIT - session.hintsRevealed,
  };
}

export type RevealResult =
  | { ok: true; hintsRemaining: number }
  | { ok: false; error: "SESSION_NOT_FOUND" | "HINT_LIMIT_REACHED" };

/**
 * Klaim satu pengungkapan petunjuk — atomik, idempoten terhadap race:
 * hanya permintaan yang berhasil `updateMany` (count=1) yang boleh
 * mengungkap huruf.
 */
export async function revealHint(input: {
  userId: string;
  sessionId: string;
}): Promise<RevealResult> {
  const session = await db.ttsSession.findFirst({
    where: { id: input.sessionId, userId: input.userId },
    select: { id: true, status: true },
  });
  if (!session || session.status !== "ACTIVE") {
    return { ok: false, error: "SESSION_NOT_FOUND" };
  }

  const claim = await db.ttsSession.updateMany({
    where: {
      id: input.sessionId,
      userId: input.userId,
      status: "ACTIVE",
      hintsRevealed: { lt: TTS_HINT_LIMIT },
    },
    data: { hintsRevealed: { increment: 1 } },
  });

  if (claim.count === 0) {
    return { ok: false, error: "HINT_LIMIT_REACHED" };
  }

  const fresh = await db.ttsSession.findUnique({
    where: { id: input.sessionId },
    select: { hintsRevealed: true },
  });

  return { ok: true, hintsRemaining: TTS_HINT_LIMIT - (fresh?.hintsRevealed ?? TTS_HINT_LIMIT) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HADIAH OTORITATIF (P8I §6 — kesulitan memengaruhi hadiah, sisi server)
// ═══════════════════════════════════════════════════════════════════════════════

/** Multiplier tier kesulitan: DASAR ×1.0 · MENENGAH ×1.25 · LANJUT ×1.5. */
export function ttsTierMultiplier(level: number): number {
  if (level <= 3) return 1.0;
  if (level <= 6) return 1.25;
  return 1.5;
}

export function starsFor(pct: number, hintsUsed: number): number {
  if (pct >= 100 && hintsUsed === 0) return 3;
  if (pct >= 100) return 2;
  if (pct >= 70) return 1;
  return 0;
}

export interface TtsFinishResult {
  pct: number;
  stars: number;
  hints: number;
  xp: number;
  coins: number;
}

/**
 * Selesaikan sesi: validasi angka, hitung hadiah server-side, berikan XP
 * lewat awardXp (idempoten/guard existing), tandai FINISHED.
 * Panggilan ulang dengan sessionId sama → status sudah FINISHED → tanpa
 * hadiah kedua (anti-duplikasi reward).
 */
export async function finishTtsSession(input: {
  userId: string;
  sessionId: string;
  cellsCorrect?: number;
  grid?: Record<string, string>;
  wrongAttempts?: number;
  unresolvedClues?: Array<{ answer: string; clue: string }>;
}): Promise<TtsFinishResult | null> {
  const session = await db.ttsSession.findFirst({
    where: { id: input.sessionId, userId: input.userId },
    select: {
      id: true,
      level: true,
      hintsRevealed: true,
      cellsTotal: true,
      status: true,
      puzzle: true,
    },
  });
  if (!session || session.status !== "ACTIVE") return null;

  const cellsTotal = Math.max(1, session.cellsTotal);
  const submittedGrid = input.grid && typeof input.grid === "object" ? input.grid : {};
  const puzzleWords = Array.isArray(session.puzzle) ? session.puzzle as Array<{ answer: string; dir: "A" | "D"; row: number; col: number }> : [];
  const expected = new Map<string, string>();
  for (const word of puzzleWords) for (let i = 0; i < word.answer.length; i++) expected.set(word.dir === "A" ? String(word.row) + "," + String(word.col + i) : String(word.row + i) + "," + String(word.col), word.answer[i]);
  let cellsCorrect = 0;
  for (const [key, letter] of Object.entries(submittedGrid)) if (expected.get(key) === String(letter).toUpperCase()) cellsCorrect++;
  cellsCorrect = Math.min(cellsTotal, cellsCorrect);
  const pct = Math.round((cellsCorrect / cellsTotal) * 100);
  const hints = session.hintsRevealed;
  const stars = starsFor(pct, hints);

  // ── Hadiah server-side: Game Reward Economy v1 ──
  // XP = progres belajar; koin = aktivitas dengan bonus performa kecil.
  const reward = calculateGameReward({
    baseXp: session.level * 12,
    baseCoins: 5,
    accuracyPct: pct,
    difficultyMultiplier: ttsTierMultiplier(session.level),
    xpPenalty: hints * 5,
  });
  const finalXp = Math.min(Math.round(session.level * 20 * ttsTierMultiplier(session.level)), reward.xp);
  const coins = reward.coins;

  // Telemetry opsional (P8J): salah cek + clue yang tak terjawol.
  // Dilaporkan klien, TIDAK memengaruhi hadiah. Dibatasi ukurannya.
  const wrongAttempts = Math.max(
    0,
    Math.min(999, Math.floor(Number(input.wrongAttempts ?? 0)) || 0)
  );
  const unresolvedClues = Array.isArray(input.unresolvedClues)
    ? input.unresolvedClues.slice(0, 20).map((c) => ({
        answer: String(c?.answer ?? "").slice(0, 20),
        clue: String(c?.clue ?? "").slice(0, 200),
      }))
    : undefined;

  // Klaim sesi + payout koin harus satu transaksi. Sebelumnya sesi bisa
  // berhasil FINISHED lalu penulisan koin gagal, sehingga hadiah hilang
  // permanen karena retry berikutnya ditolak oleh status FINISHED.
  const claim = await db.$transaction(async (tx) => {
    const claimed = await tx.ttsSession.updateMany({
      where: { id: session.id, userId: input.userId, status: "ACTIVE" },
      data: {
        status: "FINISHED",
        finishedAt: new Date(),
        cellsCorrect,
        xpAwarded: finalXp,
        wrongAttempts,
        ...(unresolvedClues ? { unresolvedClues } : {}),
      },
    });
    if (claimed.count === 0) return false;

    if (coins > 0 && finalXp > 0) {
      await tx.coinTransaction.create({
        data: { userId: input.userId, amount: coins, reason: "MAIN_GAME", reference: `tts-${session.id}` },
      });
      await tx.user.update({
        where: { id: input.userId },
        data: { coins: { increment: coins } },
      });
    }
    return true;
  });
  if (!claim) return null; // sudah dinilai oleh permintaan lain

  if (finalXp > 0) {
    // Guard kuota/batas existing tetap berlaku (awardXp).
    await awardXp(input.userId, "GAME", finalXp, `tts-${session.id}`).catch(() => {});
  }

  return { pct, stars, hints, xp: finalXp, coins };
}

// ═══════════════════════════════════════════════════════════════════════════════
// P8J — ABANDON & FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tandai sesi sebagai ditinggalkan (pemain keluar di tengah main).
 * Idempotent: hanya sesi ACTIVE milik sendiri yang bisa ditandai.
 */
export async function abandonTtsSession(input: {
  userId: string;
  sessionId: string;
}): Promise<boolean> {
  const claim = await db.ttsSession.updateMany({
    where: { id: input.sessionId, userId: input.userId, status: "ACTIVE" },
    data: { status: "ABANDONED", finishedAt: new Date() },
  });
  return claim.count > 0;
}

/**
 * Persepsi kesulitan pemain (EASY/PAS/HARD) — sekali isi (write-once via
 * `feedback IS NULL`), TIDAK pernah memengaruhi reward.
 */
export async function recordTtsFeedback(input: {
  userId: string;
  sessionId: string;
  feedback: "EASY" | "PAS" | "HARD";
}): Promise<{ ok: boolean; alreadySet: boolean }> {
  const claim = await db.ttsSession.updateMany({
    where: {
      id: input.sessionId,
      userId: input.userId,
      status: { in: ["FINISHED", "ABANDONED"] },
      feedback: null,
    },
    data: { feedback: input.feedback },
  });
  if (claim.count === 0) {
    // Sudah terisi ATAU bukan miliknya/salah status — keduanya ditolak halus.
    return { ok: false, alreadySet: true };
  }
  return { ok: true, alreadySet: false };
}
