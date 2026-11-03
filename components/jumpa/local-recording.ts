import { RoomEvent, Track, type Room } from "livekit-client";
import { appendRecordingChunk, completeRecordingCheckpoint, createRecordingCheckpoint } from "./recording-checkpoint";
import { repairWebmDuration } from "../../lib/jumpa/webm-duration";
import { assertRecordingStorageAvailable } from "./recording-quota";

export const RECORDING_TOPIC = "jumpa.recording";
export const MAX_RECORDING_BYTES = 250 * 1024 * 1024;

export function recordingMimeType(): string | undefined {
  return ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((mime) => MediaRecorder.isTypeSupported(mime));
}

export function isRecordingNotice(payload: Uint8Array, role: string | null | undefined): boolean | null {
  if (payload.byteLength > 256 || (role !== "HOST" && role !== "COHOST")) return null;
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (!data || typeof data !== "object" || !("recording" in data) || typeof data.recording !== "boolean") return null;
    return data.recording;
  } catch { return null; }
}

export function downloadCapture(blob: Blob, prefix: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const extension = blob.type.includes("zip") ? "zip" : blob.type.includes("png") ? "png" : blob.type.includes("mp4") ? "mp4" : "webm";
  link.download = `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Only display/destination tracks belong to this recorder. Meeting tracks are never stopped. */
export async function startLocalRecording(room: Room, signal: AbortSignal, callbacks: {
  onComplete: (blob: Blob) => void;
  onLimit: () => void;
  onError: () => void;
  onStopped: () => void;
  onStorageLow?: () => void;
}): Promise<{ stop: () => void; isActive: () => boolean }> {
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 15, max: 20 }, width: { ideal: 1280 }, height: { ideal: 720 } },
    // Room audio is mixed below, avoiding duplicate system/meeting audio.
    audio: false,
  });
  let context: AudioContext | undefined;
  let destination: MediaStreamAudioDestinationNode | undefined;
  let recorder: MediaRecorder | undefined;
  let silence: ConstantSourceNode | undefined;
  let quotaTimer: ReturnType<typeof setInterval> | undefined;
  let stopping = false;
  const flush = () => { if (document.visibilityState === "hidden" && recorder?.state === "recording") recorder.requestData(); };
  const leavePage = (event: PageTransitionEvent) => { if (event.persisted) flush(); else stop(); };
  let stopped = false;
  const sources = new Map<string, MediaStreamAudioSourceNode>();
  const events = [RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.ParticipantDisconnected];
  const cleanup = () => {
    if (quotaTimer) clearInterval(quotaTimer);
    window.removeEventListener("pagehide", leavePage);
    document.removeEventListener("visibilitychange", flush);
    for (const event of events) room.off(event, syncAudio);
    signal.removeEventListener("abort", stop);
    for (const source of sources.values()) source.disconnect();
    sources.clear();
    display.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    silence?.stop();
    silence?.disconnect();
    destination?.stream.getTracks().forEach((track) => track.stop());
    void context?.close().catch(() => undefined);
  };
  const finish = () => {
    if (stopped) return;
    stopped = true;
    cleanup();
    callbacks.onStopped();
  };
  function stop() {
    if (stopped || stopping) return;
    stopping = true;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else if (!recorder) finish();
  }
  function syncAudio() {
    if (!context || !destination || stopped) return;
    const current = new Map<string, MediaStreamTrack>();
    for (const participant of [room.localParticipant, ...room.remoteParticipants.values()]) {
      for (const pub of participant.audioTrackPublications.values()) {
        const track = pub.track?.mediaStreamTrack;
        if (!pub.isMuted && track?.readyState === "live" && (pub.source === Track.Source.Microphone || pub.source === Track.Source.ScreenShareAudio)) current.set(track.id, track);
      }
    }
    for (const [id, source] of sources) if (!current.has(id)) { source.disconnect(); sources.delete(id); }
    for (const [id, track] of current) if (!sources.has(id)) {
      const source = context.createMediaStreamSource(new MediaStream([track]));
      source.connect(destination);
      sources.set(id, source);
    }
  }
  try {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    await assertRecordingStorageAvailable(2 * 1024 * 1024);
    context = new AudioContext();
    await context.resume();
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    destination = context.createMediaStreamDestination();
    // Keep audio time flowing even when everyone is muted.
    silence = context.createConstantSource();
    silence.offset.value = 0;
    silence.connect(destination);
    silence.start();
    syncAudio();
    for (const event of events) room.on(event, syncAudio);
    const stream = new MediaStream([...display.getVideoTracks(), ...destination.stream.getAudioTracks()]);
    const mimeType = recordingMimeType();
    recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 96_000 });
    const chunks: Blob[] = [];
    const checkpointId = await createRecordingCheckpoint(recorder.mimeType || mimeType || "video/webm", undefined, room.localParticipant.identity);
    let writes = Promise.resolve();
    let index = 0;
    let writeFailed = false;
    let bytes = 0;
    recorder.ondataavailable = ({ data }) => {
      if (!data.size) return;
      chunks.push(data);
      const currentIndex = index++;
      const isFinal = stopping;
      writes = writes.then(() => appendRecordingChunk(checkpointId, currentIndex, data, isFinal)).catch(() => {
        writeFailed = true;
        callbacks.onError();
        stop();
        // Keep the queue settled so the emergency final chunk can still be tried.
      });
      bytes += data.size;
      if (bytes >= MAX_RECORDING_BYTES && recorder?.state === "recording") { callbacks.onLimit(); stop(); }
    };
    recorder.onerror = () => { callbacks.onError(); stop(); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType || "video/webm" });
      void writes.then(async () => {
        if (!writeFailed) await completeRecordingCheckpoint(checkpointId, blob.type);
        if (blob.size) callbacks.onComplete(await repairWebmDuration(blob));
      }).catch(() => callbacks.onError()).finally(finish);
    };
    display.getVideoTracks().forEach((track) => { track.onended = stop; });
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted || display.getVideoTracks().every((track) => track.readyState === "ended")) throw new DOMException("Cancelled", "AbortError");
    window.addEventListener("pagehide", leavePage);
    document.addEventListener("visibilitychange", flush);
    quotaTimer = setInterval(() => {
      void assertRecordingStorageAvailable(2 * 1024 * 1024).catch(() => { (callbacks.onStorageLow ?? callbacks.onError)(); stop(); });
    }, 1000);
    recorder.start(5000);
    return { stop, isActive: () => recorder?.state === "recording" };
  } catch (error) { finish(); throw error; }
}
