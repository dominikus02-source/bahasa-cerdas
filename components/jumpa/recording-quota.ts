/**
 * Local-only quota policy. Never evict user recordings automatically.
 * Leave 32 MiB of headroom and refuse writes above 90% of the reported quota.
 */
export const MIN_RECORDING_HEADROOM = 32 * 1024 * 1024;
export const MAX_RECORDING_QUOTA_RATIO = 0.9;

export async function assertRecordingStorageAvailable(nextBytes: number): Promise<void> {
  if (!Number.isSafeInteger(nextBytes) || nextBytes < 0) throw new Error("RECORDING_INVALID_SIZE");
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    throw new Error("RECORDING_STORAGE_ESTIMATE_UNAVAILABLE");
  }
  const { usage, quota } = await navigator.storage.estimate();
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || !quota || usage === undefined) {
    throw new Error("RECORDING_STORAGE_ESTIMATE_UNAVAILABLE");
  }
  const limit = Math.min(quota * MAX_RECORDING_QUOTA_RATIO, quota - MIN_RECORDING_HEADROOM);
  if (usage + nextBytes > limit) throw new Error("RECORDING_STORAGE_QUOTA_LOW");
}
