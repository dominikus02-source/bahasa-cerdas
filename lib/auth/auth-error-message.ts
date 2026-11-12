/**
 * Pesan error autentikasi dari query `?error=` (callback/aplikasi Android).
 * Hanya kode yang dikenal yang dipetakan; teks bebas dari URL TIDAK pernah
 * ditampilkan (mencegah pesan palsu/phishing lewat tautan).
 */
const MESSAGES: Record<string, string> = {
  auth: "Masuk dengan Google gagal atau sesinya kedaluwarsa. Silakan coba lagi.",
  google_cancelled: "Masuk dengan Google dibatalkan.",
  google_failed: "Masuk dengan Google gagal. Periksa koneksi lalu coba lagi.",
  google_expired: "Sesi masuk Google kedaluwarsa. Silakan coba lagi.",
  google_incomplete: "Masuk dengan Google belum selesai. Ketuk Masuk dengan Google untuk mencoba lagi.",
  google_offline: "Koneksi internet terputus saat masuk dengan Google. Periksa koneksi lalu coba lagi.",
  exchange_failed: "Tautan sudah kedaluwarsa atau pernah dipakai. Silakan coba lagi.",
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? "Terjadi kendala saat masuk. Silakan coba lagi.";
}
