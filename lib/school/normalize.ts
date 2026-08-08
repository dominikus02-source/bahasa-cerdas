/**
 * Normalisasi deterministik nama sekolah (P1-C — Phase 1).
 *
 * Satu-satunya helper normalisasi sekolah di repo. Dipakai UNTUK PERBANDINGAN
 * dan lookup kanonik, TIDAK pernah menimpa `Profile.school`.
 *
 * Aturan (SAFE ONLY — lihat docs/P1_C_SCHOOL_IDENTITY_AUDIT.md §7.3):
 *   ALLOW  : trim, kolaps spasi berulang, Unicode NFC, lowercase.
 *   DO NOT : hapus tipe ("SMP"/"SMA"/"Sekolah"), hapus lokasi/kota/provinsi,
 *            hapus penanda cabang, hilangkan tanda baca agresif, singkatan,
 *            terjemahan, inferensi, fuzzy-match, auto-merge.
 *
 * Contoh:
 *   normalizeSchoolName("  SMP   HARAPAN   BANGSA  ") === "smp harapan bangsa"
 *
 * Fungsi ini murni (pure) — tidak memutasi input, tidak menyentuh DB.
 */
export function normalizeSchoolName(input: string | null | undefined): string {
  if (!input) return "";
  return input.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}
