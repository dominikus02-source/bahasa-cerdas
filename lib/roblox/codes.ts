import { randomInt } from "crypto";

/** Tanpa I, O, 0, 1 supaya tidak tertukar saat diketik di Roblox. */
export const ROBLOX_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROBLOX_CODE_LENGTH = 8;

export type LinkCodeState = "missing" | "expired" | "used" | "valid";

export function generateLinkCode(nextInt: (max: number) => number = (max) => randomInt(max)): string {
  let code = "";
  for (let i = 0; i < ROBLOX_CODE_LENGTH; i += 1) {
    code += ROBLOX_CODE_ALPHABET[nextInt(ROBLOX_CODE_ALPHABET.length)];
  }
  return code;
}

export function formatLinkCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Menerima kode dengan atau tanpa tanda hubung, huruf kecil, dan spasi. */
export function normalizeLinkCode(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== ROBLOX_CODE_LENGTH) return null;
  for (const char of compact) {
    if (!ROBLOX_CODE_ALPHABET.includes(char)) return null;
  }
  return compact;
}

export function assessLinkCode(
  code: { expiresAt: Date; usedAt: Date | null } | null,
  now: Date,
): LinkCodeState {
  if (!code) return "missing";
  if (code.usedAt) return "used";
  if (code.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

export function isRobloxUserId(value: unknown): value is string {
  return typeof value === "string" && /^\d{1,20}$/.test(value);
}

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_:-]{8,80}$/.test(value);
}
