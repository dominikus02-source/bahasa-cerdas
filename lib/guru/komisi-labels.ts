/**
 * P8A — Product language mapping (UI, bukan backend).
 *
 * Backend status P7C/P7D/P7E → bahasa natural Bahasa Indonesia.
 * TIDAK ada kalkulasi finansial di sini — hanya label. Angka SELALU dari API.
 */

/** Format rupiah tanpa desimal. */
export function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

/** Status komisi (TeacherCommission) → label UI. */
export function commissionStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
    case "ELIGIBLE":
      return "Sedang menunggu";
    case "AVAILABLE":
      return "Siap diperoleh";
    case "PROCESSING":
      return "Sedang diproses";
    case "PAID":
      return "Sudah dibayarkan";
    case "REVERSED":
      return "Dikembalikan";
    default:
      return "Sedang menunggu";
  }
}

/** Status withdrawal → label UI. */
export function withdrawalStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Menunggu";
    case "APPROVED":
      return "Sedang diproses";
    case "TRANSFERRED":
      return "Berhasil";
    case "REJECTED":
      return "Gagal";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return "Menunggu";
  }
}

/** Status payout → label UI. */
export function payoutStatusLabel(status: string): string {
  switch (status) {
    case "REQUESTED":
    case "VALIDATING":
    case "SUBMITTING":
    case "PROCESSING":
      return "Sedang diproses";
    case "PAID":
      return "Berhasil";
    case "FAILED":
      return "Gagal";
    case "RETRYABLE_FAILURE":
      return "Sedang diproses";
    case "RECONCILIATION_REQUIRED":
      return "Perlu pemeriksaan";
    default:
      return "Sedang diproses";
  }
}

/** Tone chip per status (bg/text) memakai primitif global bc-badge / token. */
export function withdrawalTone(status: string): "success" | "warning" | "danger" | "violet" | "neutral" {
  switch (status) {
    case "TRANSFERRED":
    case "PAID":
      return "success";
    case "APPROVED":
    case "PENDING":
    case "PROCESSING":
      return "violet";
    case "REJECTED":
    case "FAILED":
      return "danger";
    case "CANCELLED":
      return "neutral";
    case "RECONCILIATION_REQUIRED":
      return "warning";
    default:
      return "neutral";
  }
}

/**
 * Error teknis backend → pesan manusia (spec §28).
 * TIDAK menampilkan error code provider / internal ke guru.
 */
export function humanizeWithdrawalError(raw: string): string {
  const code = (raw ?? "").toUpperCase();
  switch (code) {
    case "INSUFFICIENT_BALANCE":
      return "Saldo yang tersedia belum mencukupi untuk pencairan ini.";
    case "BELOW_MINIMUM":
    case "LIMIT_BELOW_MINIMUM":
      return "Saldo belum mencapai minimum pencairan.";
    case "LIMIT_ABOVE_MAXIMUM":
      return "Jumlah melebihi batas pencairan maksimum.";
    case "LIMIT_DAILY":
      return "Batas pencairan harian telah tercapai. Coba lagi besok.";
    case "LIMIT_GLOBAL":
      return "Batas pencairan harian tercapai. Coba lagi besok.";
    case "PAYOUT_PILOT_BLOCKED":
      return "Fitur pencairan sedang dalam tahap peluncuran terbatas.";
    case "PAYOUT_REAL_MONEY_DISABLED":
    case "PAYOUT_PROVIDER_DISABLED":
      return "Pencairan sedang dipersiapkan. Kamu akan bisa mencairkan segera.";
    case "PAYOUT_KILL_SWITCH":
      return "Pencairan sedang dihentikan sementara. Coba lagi nanti.";
    case "RISK_REVIEW_REQUIRED":
    case "RISK_RESTRICTED":
      return "Pencairan Anda sedang ditinjau untuk memastikan keamanan transaksi.";
    case "DESTINATION_COOLDOWN":
      return "Rekening pencairan baru saja diubah. Penarikan baru dapat diajukan setelah masa tunggu singkat.";
    case "NO_PROFILE":
      return "Lengkapi rekening pencairan terlebih dahulu.";
    case "WALLET_NOT_ACTIVE":
      return "Dompet penghasilan sedang tidak aktif.";
    case "INSUFFICIENT_AVAILABLE_BALANCE":
      return "Saldo yang tersedia belum mencukupi untuk pencairan ini.";
    default:
      return raw && raw.length > 0 && raw.length < 120
        ? raw
        : "Pencairan belum berhasil. Coba lagi nanti.";
  }
}
