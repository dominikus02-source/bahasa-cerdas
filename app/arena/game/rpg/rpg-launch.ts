/**
 * P2.8 — Kontrak aset launch Pendekar Suryakerta (Premium Early Access).
 *
 * TIDAK ada artwork final yang dibuat di sini. Setiap path di bawah adalah
 * KONTRAK: bila file belum ada (404), shell memakai fallback gradient+ikon
 * (pola sama seperti GameCard) dan game tetap berfungsi penuh.
 *
 * Founder cukup menaruh file pada path ini — tanpa ubah kode — untuk
 * mengganti placeholder dengan artwork final.
 */

/** Poster kartu Game Hub. Fallback: gradient amber + ikon Shield. */
export const RPG_POSTER_PATH = "/images/GIM%20Card/RPG-card.png";

/** Latar splash full-screen. Fallback: gradient navy + emblem. */
export const RPG_SPLASH_BG_PATH = "/images/rpg/splash-bg.png";

/** Ikon game (opsional). Fallback: ikon Shield registry. */
export const RPG_ICON_PATH = "/images/rpg/icon.png";

/**
 * Audio: TIDAK ada file soundtrack — BGM disintesis runtime via
 * `lib/game/sound.ts` (startBGM/stopBGM, Web Audio, CSP-safe, fail-open).
 * Bila Founder menyediakan file kelak, path cadangannya:
 */
export const RPG_AUDIO_PATH: string | null = null;
// export const RPG_AUDIO_PATH = "/audio/rpg/world-theme.mp3";

export const RPG_TAGLINE = "Petualangan Bahasa Nusantara — khusus Murid Premium.";
