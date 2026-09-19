// ─── Kota Cahaya Target Finalization Policy (Tahap 6 §12) ───
// Prepared session Kota tanpa target eksplisit guru memakai
// PENDING_ROSTER (Tahap 5). Policy finalisasi baru boleh dijalankan
// saat START (roster sudah diketahui), dengan formula:
//
//   target = f(eligiblePlayersAtStart, totalRounds)
//          = ceil(eligiblePlayers × totalRounds × ratio)
//
//  - ratio = DEFAULT_KOTA_SUCCESS_RATIO (0.60): siswa kelas 4–6,
//    achievable tapi tidak otomatis — misi kolaboratif terasa
//    menantang tanpa menghukum kelas kecil (1 siswa pun tetap ada
//    target integer > 0).
//  - Hasil selalu integer, > 0, dan <= teoretis maksimum
//    (eligiblePlayers × totalRounds).
//  - DETERMINISTIK: input sama → target sama (tanpa random).
//  - Target FIXED setelah difinalisasi — tidak adaptif.

export const DEFAULT_KOTA_SUCCESS_RATIO = 0.6;

/**
 * Finalisasi target Kota Cahaya saat roster diketahui.
 * Input divalidasi ketat; return null bila roster 0 (caller WAJIB
 * menolak start dengan NO_ELIGIBLE_PLAYERS — jangan membuat target 0).
 */
export function finalizeKotaTarget(input: {
  eligiblePlayerCount: number;
  totalRounds: number;
  successRatio?: number;
}): number | null {
  const { eligiblePlayerCount, totalRounds } = input;
  if (
    !Number.isInteger(eligiblePlayerCount) ||
    eligiblePlayerCount <= 0 ||
    !Number.isInteger(totalRounds) ||
    totalRounds <= 0
  ) {
    return null;
  }
  const ratio =
    input.successRatio !== undefined ? input.successRatio : DEFAULT_KOTA_SUCCESS_RATIO;
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1) return null;
  return Math.ceil(eligiblePlayerCount * totalRounds * ratio);
}
