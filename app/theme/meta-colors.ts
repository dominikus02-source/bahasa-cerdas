/**
 * Warna meta browser (theme-color / manifest). Harus literal hex karena dibaca
 * browser sebelum CSS dimuat. Nilai = salinan token di app/theme/tokens.css:
 *   terang = --clr-primary (#047857, teal), gelap = --clr-bg (#0f1117).
 * Keputusan CEO 2026-10-19: primary teal, bukan merah. Ubah bersama tokens.css.
 */
export const META_THEME_COLOR_LIGHT = "#047857";
export const META_THEME_COLOR_DARK = "#0f1117";
