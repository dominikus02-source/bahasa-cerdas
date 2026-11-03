"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import { parseParticipantMeta } from "./format";
import { drawCaptureLabels, normalizeCaptureColors } from "./capture-colors";
import { useMedia } from "./media-controller";
import { useJumpa } from "./room-controller";
import { downloadCapture, isRecordingNotice, RECORDING_TOPIC, startLocalRecording } from "./local-recording";
import { listRecordingCheckpoints, restoreRecordingCheckpoint } from "./recording-checkpoint";

export function useMeetingCapture(canRecord: boolean) {
  const enabled = process.env.NEXT_PUBLIC_JUMPA_CAPTURE_ENABLED === "1";
  const { setRecordingActive } = useMedia();
  const allowed = useRef(canRecord);
  allowed.current = canRecord && enabled;
  const room = useRoomContext();
  const { toast } = useJumpa();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const pendingFile = useRef<Blob | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const [remoteRecording, setRemoteRecording] = useState(false);
  const session = useRef<{ stop: () => void } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const photoPending = useRef(false);
  const mounted = useRef(true);
  const announce = useCallback(async (active: boolean) => {
    await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ recording: active })), { reliable: true, topic: RECORDING_TOPIC });
  }, [room]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;
    void (async () => {
      const sessions = (await listRecordingCheckpoints()).filter(item => item.ownerId === room.localParticipant.identity && !item.groupId);
      const last = sessions.sort((a, b) => b.createdAt - a.createdAt)[0];
      const blob = last ? await restoreRecordingCheckpoint(last.id) : null;
      if (!blob || !mounted.current || pendingFile.current) return;
      pendingFile.current = blob;
      setDownloadReady(true);
      toastRef.current("Rekaman sebelumnya ditemukan. Unduh dan periksa hasilnya.", "warn");
    })().catch(() => undefined);
    setSupported(Boolean(typeof navigator.mediaDevices?.getDisplayMedia === "function" && typeof MediaRecorder !== "undefined" && typeof AudioContext !== "undefined"));
    return () => { mounted.current = false; abort.current?.abort(); session.current?.stop(); };
  }, [enabled, room]);

  useEffect(() => {
    if (!enabled) return;
    const notices = new Map<string, number>();
    const refresh = () => {
      for (const [id, at] of notices) if (Date.now() - at > 35_000 || !room.remoteParticipants.has(id)) notices.delete(id);
      setRemoteRecording(notices.size > 0);
    };
    const receive = (payload: Uint8Array, participant: RemoteParticipant | undefined, _kind: unknown, topic?: string) => {
      if (topic !== RECORDING_TOPIC || !participant) return;
      const active = isRecordingNotice(payload, parseParticipantMeta(participant.metadata).roomRole);
      if (active === null) return;
      if (active) {
        if (!notices.has(participant.identity)) toast("Pemandu mulai merekam di perangkatnya.", "warn");
        notices.set(participant.identity, Date.now());
      } else notices.delete(participant.identity);
      refresh();
    };
    room.on(RoomEvent.DataReceived, receive);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    const timer = window.setInterval(refresh, 5000);
    return () => { window.clearInterval(timer); room.off(RoomEvent.DataReceived, receive); room.off(RoomEvent.ParticipantDisconnected, refresh); };
  }, [enabled, room, toast]);

  useEffect(() => {
    if (!recording) return;
    const notify = () => { void announce(true).catch(() => { session.current?.stop(); toast("Rekaman dihentikan karena koneksi terputus.", "warn"); }); };

    room.on(RoomEvent.ParticipantConnected, notify);
    room.on(RoomEvent.Reconnected, notify);
    const timer = window.setInterval(notify, 10_000);

    return () => { room.off(RoomEvent.ParticipantConnected, notify); room.off(RoomEvent.Reconnected, notify); window.clearInterval(timer); };
  }, [recording, room, announce, toast]);

  useEffect(() => { setRecordingActive(recording); return () => setRecordingActive(false); }, [recording, setRecordingActive]);
  useEffect(() => { if (!canRecord) { abort.current?.abort(); session.current?.stop(); } }, [canRecord]);

  useEffect(() => {
    if (!recording && !downloadReady) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recording, downloadReady]);
  const save = useCallback(() => {
    const blob = pendingFile.current;
    if (!blob) return;
    try { downloadCapture(blob, "JUMPA-rekaman"); pendingFile.current = null; setDownloadReady(false); toast("Unduhan rekaman dimulai.", "ok"); }
    catch { toast("Rekaman belum dapat diunduh. Coba lagi.", "warn"); }
  }, [toast]);
  const stop = useCallback(() => { session.current?.stop(); }, []);
  const start = useCallback(async () => {
    if (!allowed.current || pendingFile.current || pending.current || session.current) return;
    pending.current = true;
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const next = await startLocalRecording(room, controller.signal, {
        onComplete: (blob) => { if (mounted.current) { pendingFile.current = blob; setDownloadReady(true); toast("Rekaman siap diunduh.", "ok"); } },
        onLimit: () => { if (mounted.current) toast("Batas 250 MB tercapai. Rekaman siap diunduh.", "warn"); },
        onStorageLow: () => { if (mounted.current) toast("Penyimpanan hampir penuh. Rekaman dihentikan; unduh hasilnya.", "warn"); },
        onError: () => { if (mounted.current) toast("Rekaman terhenti. Unduh bagian yang tersedia.", "warn"); },
        onStopped: () => {
          session.current = null;
          void announce(false).catch(() => undefined);
          if (mounted.current) setRecording(false);
        },
      });
      if (!next.isActive()) return;
      session.current = next;
      if (controller.signal.aborted) { next.stop(); return; }
      // Fail closed: do not continue recording if participants cannot be notified.
      try { await announce(true); } catch { next.stop(); throw new Error("NOTICE_FAILED"); }
      if (mounted.current && session.current) setRecording(true);
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (mounted.current && name !== "AbortError" && name !== "NotAllowedError") toast("Rekaman belum dapat dimulai. Periksa dukungan browser dan izin layar.", "warn");
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }, [room, announce, toast]);

  const photo = useCallback(async () => {
    if (!enabled || photoPending.current) return;
    photoPending.current = true;
    setPhotoBusy(true);
    try {
      // Let the menu close before rendering the capture.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const element = document.querySelector<HTMLElement>('[aria-label="Video peserta"]');
      if (!element) throw new Error("CAPTURE_MISSING");
      const { default: html2canvas } = await import("html2canvas");
      const area = Math.max(1, element.clientWidth * element.clientHeight);
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: null, logging: false, onclone: normalizeCaptureColors, scale: Math.min(2, window.devicePixelRatio || 1, Math.sqrt(8_000_000 / area)) });
      drawCaptureLabels(canvas, element);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("CAPTURE_EMPTY")), "image/png"));
      downloadCapture(blob, "JUMPA-foto");
      if (mounted.current) toast("Foto tampilan siap disimpan.", "ok");
    } catch (error) { console.warn("JUMPA_CAPTURE_FAILED", error); if (mounted.current) toast("Foto belum dapat disimpan. Coba lagi setelah video tampil.", "warn"); }
    finally { photoPending.current = false; if (mounted.current) setPhotoBusy(false); }
  }, [enabled, toast]);
  return { enabled, recording, remoteRecording, busy, photoBusy, downloadReady, supported, start, stop, save, photo };
}
