/**
 * Pesan kesalahan pembayaran per kode — satu sumber untuk semua halaman
 * transaksi. Pendek, Bahasa Indonesia, dan menyebut langkah berikutnya.
 */
export const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  CHECKOUT_AUTH_REQUIRED: "Sesi kamu habis. Masuk lagi untuk melanjutkan.",
  AUTH_REQUIRED: "Sesi kamu habis. Masuk lagi untuk melanjutkan.",
  CHECKOUT_FORBIDDEN_ROLE: "Paket ini bukan untuk jenis akunmu.",
  CHECKOUT_INVALID_PLAN: "Paket tidak tersedia. Pilih paket lain.",
  CHECKOUT_INVALID_COUPON: "Kode promo tidak bisa dipakai untuk paket ini.",
  CHECKOUT_DB_FAILED: "Pesanan belum tersimpan. Coba lagi sebentar.",
  CHECKOUT_UNKNOWN_ERROR: "Terjadi gangguan. Coba lagi sebentar.",
  MIDTRANS_CONFIG_MISSING: "Pembayaran sedang dalam perbaikan. Coba lagi nanti.",
  MIDTRANS_MODE_MISMATCH: "Pembayaran sedang dalam perbaikan. Coba lagi nanti.",
  MIDTRANS_UNAUTHORIZED: "Layanan pembayaran menolak permintaan. Coba lagi nanti.",
  MIDTRANS_CREATE_FAILED: "Halaman pembayaran belum bisa dibuka. Coba lagi sebentar.",
  CART_EMPTY: "Keranjangmu masih kosong.",
  INVALID_ITEM: "Ada karya yang tidak valid di keranjang.",
  ITEM_NOT_FOUND: "Ada karya yang sudah tidak tersedia.",
  ITEM_NOT_PURCHASABLE: "Ada karya yang tidak bisa dibeli.",
  NETWORK: "Tidak tersambung. Periksa internet lalu coba lagi.",
  SNAP_FAILED: "Pembayaran gagal. Coba lagi atau pilih metode lain.",
  SNAP_UNAVAILABLE: "Halaman pembayaran belum termuat. Muat ulang halaman ini.",
  UMUM_PREMIUM_REQUIRED: "Fitur ini khusus Premium Umum. Coba gratis 1 bulan atau pilih paket.",
  TRIAL_DISABLED: "Uji coba Premium Umum belum dibuka.",
  TRIAL_FORBIDDEN_ROLE: "Uji coba ini khusus akun Umum.",
  TRIAL_ALREADY_USED: "Uji coba gratis sudah pernah dipakai. Kamu tetap bisa pilih paket.",
  ALREADY_PREMIUM: "Premium Umum-mu sudah aktif.",
  NO_ACTIVE_TRIAL: "Tidak ada uji coba yang sedang berjalan.",
};

/** Kode yang sebaiknya disertai tautan bantuan (bukan kesalahan pengguna). */
export const PAYMENT_HELP_CODES = new Set([
  "MIDTRANS_CONFIG_MISSING",
  "MIDTRANS_MODE_MISMATCH",
  "MIDTRANS_UNAUTHORIZED",
  "MIDTRANS_CREATE_FAILED",
  "CHECKOUT_DB_FAILED",
  "CHECKOUT_UNKNOWN_ERROR",
]);

/** Kode yang pesan servernya lebih spesifik dan aman ditampilkan. */
const SERVER_DETAIL_CODES = new Set(["CHECKOUT_INVALID_COUPON", "INVALID_ITEM", "ITEM_NOT_PURCHASABLE"]);

export function paymentErrorMessage(code: string | null | undefined, serverMessage?: string | null): string {
  if (code && PAYMENT_ERROR_MESSAGES[code]) {
    // Pesan kupon/karya dari server lebih spesifik ("Kupon sudah kedaluwarsa.").
    if (SERVER_DETAIL_CODES.has(code) && serverMessage) return serverMessage;
    return PAYMENT_ERROR_MESSAGES[code];
  }
  return serverMessage || "Terjadi gangguan. Coba lagi sebentar.";
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Lunas",
  PENDING: "Menunggu bayar",
  REPLACED: "Diganti pesanan baru",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
  FAILED: "Gagal",
  REFUNDED: "Dikembalikan",
  NOT_FOUND: "Tidak ditemukan",
};
