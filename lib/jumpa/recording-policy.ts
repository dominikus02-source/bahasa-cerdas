/** Rekaman adalah hak eksklusif Premium, tetapi belum aktif sampai Egress siap. */
import type { JumpaTier } from "./tiers";

export function canManageRecording(tier: JumpaTier, isHost: boolean): boolean {
  return tier === "PREMIUM" && isHost;
}

/** Fail closed: jangan tampilkan tombol aktif tanpa layanan rekaman teruji. */
export function recordingEnabled(tier: JumpaTier, isHost: boolean, serviceReady: boolean): boolean {
  return canManageRecording(tier, isHost) && serviceReady;
}
