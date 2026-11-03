/** Rekaman adalah hak eksklusif Premium, tetapi belum aktif sampai Egress siap. */
import type { JumpaTier } from "./tiers";

/** Rekaman membutuhkan bukti paket eksplisit, bukan fallback Premium ruang lama. */
export function recordingTierVerified(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).tier === "PREMIUM";
}

export function canManageRecording(tier: JumpaTier, isHost: boolean): boolean {
  return tier === "PREMIUM" && isHost;
}

/** Fail closed: jangan tampilkan tombol aktif tanpa layanan rekaman teruji. */
export function recordingEnabled(tier: JumpaTier, isHost: boolean, serviceReady: boolean): boolean {
  return canManageRecording(tier, isHost) && serviceReady;
}
