export type RobloxXpDecision =
  | { kind: "replay" }
  | { kind: "conflict" }
  | { kind: "award"; xp: number; reference: string };

/** XP dihitung server dari jumlah benar. Angka dari klien tidak dipakai. */
export function xpForRobloxRun(correct: number, total: number, baseXp: number): number {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || !Number.isFinite(baseXp)) return 0;
  const safeTotal = Math.floor(total);
  const safeBase = Math.floor(baseXp);
  if (safeTotal <= 0 || safeBase <= 0 || correct <= 0) return 0;
  const safeCorrect = Math.min(Math.floor(correct), safeTotal);
  return Math.round((safeBase * safeCorrect) / safeTotal);
}

/**
 * Satu sesi hanya boleh mencairkan XP sekali.
 * Referensi idempotensi adalah id sesi, bukan angka yang dikirim Roblox.
 * Kunci pemain yang sama pada sesi yang sudah selesai = ulang (tanpa XP baru).
 * Kunci berbeda = bentrok.
 */
export function decideRobloxXp(input: {
  sessionId: string;
  sessionConsumed: boolean;
  sessionKey: string | null;
  requestKey: string;
  correct: number;
  total: number;
  baseXp: number;
}): RobloxXpDecision {
  if (input.sessionConsumed) {
    if (input.sessionKey && input.sessionKey === input.requestKey) return { kind: "replay" };
    return { kind: "conflict" };
  }
  return {
    kind: "award",
    xp: xpForRobloxRun(input.correct, input.total, input.baseXp),
    reference: `roblox-session:${input.sessionId}`,
  };
}

const BADGE_CODE = /^roblox-[a-z0-9-]{1,48}$/;

export function sanitizeBadgeCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const accepted: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const code = item.trim().toLowerCase();
    if (!BADGE_CODE.test(code) || accepted.includes(code)) continue;
    accepted.push(code);
    if (accepted.length >= 5) break;
  }
  return accepted;
}
