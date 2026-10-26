/**
 * Flag server ENABLE_UMUM_PREMIUM (default MATI).
 *
 * SERVER-ONLY (bukan NEXT_PUBLIC_*). Saat MATI:
 * - checkout paket UMUM_PREMIUM_* → 403 sebelum menyentuh DB/Midtrans;
 * - POST /api/umum/trial → 403 (uji coba tidak bisa diklaim);
 * - /umum/premium menampilkan "segera hadir", tawaran di /umum disembunyikan.
 *
 * Flag TIDAK diperiksa webhook Midtrans: pembayaran yang sudah dibuat saat
 * flag hidup tetap diaktifkan bila lunas setelah flag dimatikan. Hak premium
 * yang sudah berjalan (bayar/uji coba) juga tidak dicabut oleh flag.
 */
export function isUmumPremiumEnabled(): boolean {
  const v = (process.env.ENABLE_UMUM_PREMIUM || "").trim().toLowerCase();
  return v === "true" || v === "1";
}
