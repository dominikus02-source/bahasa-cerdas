/**
 * Konfigurasi integrasi Roblox.
 *
 * Nilai bawaan adalah pengalaman publik "BahasaCerdas Kota Aksara".
 * Semua bisa ditimpa lewat env tanpa mengubah kode. Gerbang usia hanya
 * dibaca dari sini — jangan menyalin angka 16 ke komponen lain.
 */

export const ROBLOX_EXPERIENCE_NAME_DEFAULT = "BahasaCerdas Kota Aksara";
export const ROBLOX_PLACE_ID_DEFAULT = "83804286143888";
export const ROBLOX_UNIVERSE_ID_DEFAULT = "10778759021";
export const ROBLOX_EXPERIENCE_URL_DEFAULT = "https://www.roblox.com/games/83804286143888";

export const ROBLOX_XP_SOURCE = "ROBLOX";

function envOr(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  return raw.replace(/^["']|["']$/g, "");
}

export function robloxExperienceName(): string {
  return envOr("ROBLOX_EXPERIENCE_NAME", ROBLOX_EXPERIENCE_NAME_DEFAULT);
}

export function robloxPlaceId(): string {
  return envOr("ROBLOX_PLACE_ID", ROBLOX_PLACE_ID_DEFAULT);
}

export function robloxUniverseId(): string {
  return envOr("ROBLOX_UNIVERSE_ID", ROBLOX_UNIVERSE_ID_DEFAULT);
}

/** URL tombol "Buka di Roblox". ROBLOX_EXPERIENCE_URL menang; kalau kosong, dirakit dari place id. */
export function robloxExperienceUrl(): string {
  const explicit = process.env.ROBLOX_EXPERIENCE_URL?.trim().replace(/^["']|["']$/g, "");
  if (explicit) return explicit;
  const placeId = robloxPlaceId();
  if (/^\d{5,20}$/.test(placeId)) return `https://www.roblox.com/games/${placeId}`;
  return ROBLOX_EXPERIENCE_URL_DEFAULT;
}

export type RobloxAgeGate = { enabled: boolean; minAge: number };

/**
 * Gerbang usia.
 * - ROBLOX_AGE_GATE_ENABLED=false → semua usia.
 * - ROBLOX_MIN_AGE=0 → semua usia.
 * - selain itu batasnya ROBLOX_MIN_AGE (bawaan 16).
 */
export function robloxAgeGate(): RobloxAgeGate {
  if (process.env.ROBLOX_AGE_GATE_ENABLED === "false") return { enabled: false, minAge: 0 };
  const raw = Number(process.env.ROBLOX_MIN_AGE ?? "16");
  if (!Number.isFinite(raw) || raw <= 0) return { enabled: false, minAge: 0 };
  return { enabled: true, minAge: Math.min(120, Math.floor(raw)) };
}

export function linkCodeTtlMs(): number {
  const raw = Number(process.env.ROBLOX_LINK_CODE_TTL_SECONDS ?? "600");
  const seconds = Number.isFinite(raw) && raw >= 60 && raw <= 3600 ? Math.floor(raw) : 600;
  return seconds * 1000;
}

export function questionSessionTtlMs(): number {
  const raw = Number(process.env.ROBLOX_QUESTION_TTL_SECONDS ?? "2700");
  const seconds = Number.isFinite(raw) && raw >= 60 && raw <= 7200 ? Math.floor(raw) : 2700;
  return seconds * 1000;
}

/** Selisih jam yang diterima. Bawaan 5 menit. ROBLOX_HMAC_SKEW_MS tetap dibaca sebagai alias. */
export function timestampSkewMs(): number {
  const raw = Number(process.env.ROBLOX_TIMESTAMP_SKEW_MS ?? process.env.ROBLOX_HMAC_SKEW_MS ?? "300000");
  return Number.isFinite(raw) && raw >= 5_000 && raw <= 300_000 ? Math.floor(raw) : 300_000;
}

export function hmacSkewMs(): number {
  return timestampSkewMs();
}
