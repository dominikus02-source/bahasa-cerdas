/**
 * Pembulatan angka social proof untuk halaman beranda.
 *
 * Aturan (wajib konsisten dengan test di scripts/test-social-proof.ts):
 * - SELALU membulatkan ke bawah (floor) — tidak pernah melebih-lebihkan.
 * - Rentang 0–9        → angka asli
 * - Rentang 10–999     → kelipatan 10 ke bawah   (99 → "90+", 286 → "280+")
 * - Rentang 1.000–9.999 → kelipatan 100 ke bawah (1.163 → "1.100+", 2.486 → "2.400+")
 * - Rentang 10.000–99.999 → kelipatan 1.000 ke bawah (10.000 → "10.000+")
 * - 100.000+           → kelipatan 10.000 ke bawah
 * - Format angka pakai pemisah ribuan gaya Indonesia (titik): 1.100, 9.800.
 * - Tidak ada desimal. Tanda "+" selalu di belakang (kecuali angka 0).
 */

export function formatSocialProofNumber(value: number): string {
  const n = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (n <= 0) return "0";

  const step =
    n < 10 ? 1 :
    n < 1000 ? 10 :
    n < 10000 ? 100 :
    n < 100000 ? 1000 : 10000;

  const rounded = Math.floor(n / step) * step;
  const suffix = n < 10 ? "" : "+";
  return `${rounded.toLocaleString("id-ID")}${suffix}`;
}