import { appendRecordingChunk, completeRecordingCheckpoint, createRecordingCheckpoint } from "./recording-checkpoint";
export { listRecordingCheckpoints, restoreRecordingCheckpoint, restoreLatestSafetyArchive, deleteRecordingCheckpoint } from "./recording-checkpoint";

/**
 * Recovery track: each completed WebM segment has its own container metadata.
 * An abrupt process termination can only recover segments finalized before it.
 * This is a safety copy, not a guarantee of the last in-progress seconds.
 */
export function startRecordingSafetySegments(
  stream: MediaStream,
  onFailure: (error: unknown) => void,
  segmentMs = 750,
): { stop: () => void } {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let recorder: MediaRecorder | undefined;
  let totalBytes = 0;
  const groupId = crypto.randomUUID();
  const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    .find((type) => MediaRecorder.isTypeSupported(type));

  const next = () => {
    if (stopped) return;
    const current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder = current;
    const parts: Blob[] = [];
    current.ondataavailable = (event) => { if (event.data.size) parts.push(event.data); };
    current.onerror = (event) => { stopped = true; onFailure(event); };
    current.onstop = () => {
      if (timer) clearTimeout(timer);
      const blob = new Blob(parts, { type: current.mimeType || mimeType || "video/webm" });
      if (!blob.size) { if (!stopped) next(); return; }
      totalBytes += blob.size;
      if (totalBytes > 250 * 1024 * 1024) {
        stopped = true;
        onFailure(new Error("RECOVERY_QUOTA_LIMIT"));
        return;
      }
      void createRecordingCheckpoint(blob.type, groupId)
        .then(async (id) => {
          await appendRecordingChunk(id, 0, blob);
          await completeRecordingCheckpoint(id, blob.type);
        })
        .then(() => { if (!stopped) next(); })
        .catch((error) => { stopped = true; onFailure(error); });
    };
    current.start();
    timer = setTimeout(() => { if (current.state === "recording") current.stop(); }, segmentMs);
  };
  next();
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (recorder?.state === "recording") recorder.stop();
    },
  };
}
