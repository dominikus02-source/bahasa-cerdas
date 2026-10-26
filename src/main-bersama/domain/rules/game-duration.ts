// ─── Durasi Permainan (Main Bersama) ────────────────────────
// Guru memilih total durasi permainan saat menyiapkan sesi. Server
// menyimpan pilihan ini dan menghitung batas waktu sendiri — client
// hanya menampilkan sisa waktu dari `gameEndsAt` milik server.

/** Pilihan durasi yang diizinkan (menit). Urutan = urutan tampil. */
export const GAME_DURATION_MINUTES = [10, 15, 25, 30, 45] as const;

export type GameDurationMinutes = (typeof GAME_DURATION_MINUTES)[number];

/** Default = durasi bawaan sebelumnya (10 menit) — termasuk pilihan resmi. */
export const DEFAULT_GAME_DURATION_MINUTES: GameDurationMinutes = 10;

export const MINUTE_MS = 60_000;

export const ALLOWED_GAME_DURATION_MS: readonly number[] = GAME_DURATION_MINUTES.map(
  (m) => m * MINUTE_MS,
);

export const DEFAULT_GAME_DURATION_MS = DEFAULT_GAME_DURATION_MINUTES * MINUTE_MS;

export function isAllowedGameDurationMs(value: unknown): value is number {
  return typeof value === 'number' && ALLOWED_GAME_DURATION_MS.includes(value);
}

/** Batas waktu permainan dihitung dari saat permainan dimulai. */
export function computeGameEndsAt(startedAt: Date, gameDurationMs: number): Date {
  return new Date(startedAt.getTime() + gameDurationMs);
}

/** Jeda menghentikan jam permainan: batas digeser sebesar lama jeda. */
export function extendGameEndsAtAfterPause(
  gameEndsAt: Date,
  pausedAt: Date,
  resumedAt: Date,
): Date {
  const pausedFor = Math.max(0, resumedAt.getTime() - pausedAt.getTime());
  return new Date(gameEndsAt.getTime() + pausedFor);
}

/** Fase yang dihitung jam permainan (bukan lobby/jeda/akhir). */
const RUNNING_PHASES = new Set(['question', 'closed', 'discussion']);

export function isGameClockRunning(phase: string): boolean {
  return RUNNING_PHASES.has(phase);
}

/** True bila waktu permainan habis dan sesi masih berjalan. */
export function isGameTimeUp(input: {
  phase: string;
  gameEndsAt?: Date | null;
  now: Date;
}): boolean {
  if (!input.gameEndsAt || !isGameClockRunning(input.phase)) return false;
  return input.now.getTime() >= input.gameEndsAt.getTime();
}
