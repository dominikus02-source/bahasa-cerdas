"use client";

/**
 * JUMPA Fase 3 — pengendali media di dalam <LiveKitRoom>:
 *  - menerapkan Pengaturan (perangkat, kualitas, audio saja, peredam bising)
 *    ke ruang yang sedang berjalan;
 *  - membatasi kualitas langganan video peserta lain (Hemat Data / koneksi
 *    lemah) dan berhenti berlangganan video kamera di mode audio saja;
 *  - memantau kualitas koneksi sendiri: Buruk ≥ 6 dtk di mode Otomatis →
 *    turunkan kualitas terima & jumlah video; pulih setelah Baik ≥ 20 dtk.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConnectionQualityIndicator, useRoomContext } from "@livekit/components-react";
import {
  AudioPresets,
  ConnectionQuality,
  RoomEvent,
  Track,
  VideoPreset,
  VideoQuality,
  type RemoteTrack,
  type RemoteTrackPublication,
  type Room,
  type RoomOptions,
  type TrackPublishDefaults,
  type VideoCaptureOptions,
} from "livekit-client";
import type { JumpaTierView } from "@/lib/jumpa/tiers";
import { publishPolicy, receivePolicy, type DeviceClass, type PublishPolicy, type ReceivePolicy } from "./media-policy";
import { writeMediaPrefs, type JumpaMediaPrefs } from "./media-prefs";
import { useJumpa } from "./room-controller";

export function captureOptions(pub: PublishPolicy, prefs: JumpaMediaPrefs): VideoCaptureOptions {
  return {
    resolution: { width: pub.capture.width, height: pub.capture.height, frameRate: pub.capture.fps },
    deviceId: prefs.devices.videoinput,
    facingMode: "user",
  };
}

export function publishDefaults(pub: PublishPolicy): TrackPublishDefaults {
  return {
    simulcast: true,
    videoCodec: pub.codec,
    videoEncoding: { maxBitrate: pub.capture.maxBitrate, maxFramerate: pub.capture.fps },
    videoSimulcastLayers: pub.layers.map((l) => new VideoPreset(l.width, l.height, l.maxBitrate, l.fps)),
    screenShareEncoding: { maxBitrate: pub.screen.maxBitrate, maxFramerate: pub.screen.fps },
    audioPreset: pub.audio === "speech" ? AudioPresets.speech : AudioPresets.music,
    dtx: true,
    red: true,
  };
}

/** Opsi ruang awal dari pilihan pengguna + perangkat + paket ruang. */
export function buildRoomOptions(prefs: JumpaMediaPrefs, device: DeviceClass, tier: JumpaTierView): RoomOptions {
  const pub = publishPolicy(prefs.quality, device, tier.maxCameraHeight, tier.maxScreenHeight);
  const recv = receivePolicy(prefs.quality, device);
  return {
    adaptiveStream: { pixelDensity: recv.pixelDensity },
    dynacast: true,
    disconnectOnPageLeave: true,
    videoCaptureDefaults: captureOptions(pub, prefs),
    audioCaptureDefaults: {
      deviceId: prefs.devices.audioinput,
      echoCancellation: true,
      noiseSuppression: prefs.noiseSuppression,
      autoGainControl: true,
    },
    audioOutput: prefs.devices.audiooutput ? { deviceId: prefs.devices.audiooutput } : undefined,
    publishDefaults: publishDefaults(pub),
  };
}

interface MediaCtl {
  prefs: JumpaMediaPrefs;
  update: (patch: Partial<JumpaMediaPrefs>) => void;
  device: DeviceClass;
  recv: ReceivePolicy;
  degraded: boolean;
  quality: ConnectionQuality;
  tier: JumpaTierView;
}

const MediaCtx = createContext<MediaCtl | null>(null);

export function useMedia(): MediaCtl {
  const v = useContext(MediaCtx);
  if (!v) throw new Error("useMedia di luar MediaProvider");
  return v;
}

const REMOTE_Q = { low: VideoQuality.LOW, medium: VideoQuality.MEDIUM } as const;

function applyRemote(pub: RemoteTrackPublication, audioOnly: boolean, q: ReceivePolicy["remoteQuality"]) {
  if (pub.kind !== Track.Kind.Video) return;
  if (pub.source === Track.Source.ScreenShare) {
    if (!pub.isSubscribed) pub.setSubscribed(true);
    return;
  }
  if (audioOnly) {
    if (pub.isSubscribed) pub.setSubscribed(false);
    return;
  }
  if (!pub.isSubscribed) pub.setSubscribed(true);
  pub.setVideoQuality(q ? REMOTE_Q[q] : VideoQuality.HIGH);
}

async function republishCamera(room: Room, prefs: JumpaMediaPrefs, pub: PublishPolicy) {
  // Opsi ruang dipakai bersama LocalParticipant (objek yang sama).
  Object.assign(room.options.publishDefaults ?? {}, publishDefaults(pub));
  Object.assign(room.options.videoCaptureDefaults ?? {}, captureOptions(pub, prefs));
  const lp = room.localParticipant;
  const wasOn = lp.isCameraEnabled;
  const cam = lp.getTrackPublication(Track.Source.Camera);
  if (cam?.track) await lp.unpublishTrack(cam.track, true);
  if (wasOn) await lp.setCameraEnabled(true);
}

export function MediaProvider({ initial, device, tier, children }: { initial: JumpaMediaPrefs; device: DeviceClass; tier: JumpaTierView; children: ReactNode }) {
  const room = useRoomContext();
  const { toast } = useJumpa();
  const [prefs, setPrefs] = useState(initial);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const cameraBeforeAudioOnly = useRef(false);
  const { quality } = useConnectionQualityIndicator({ participant: room.localParticipant });
  const [degraded, setDegraded] = useState(false);

  // Koneksi lemah di mode Otomatis → turunkan kualitas terima sementara.
  useEffect(() => {
    if (prefs.quality !== "auto") {
      setDegraded(false);
      return;
    }
    const poor = quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;
    const good = quality === ConnectionQuality.Good || quality === ConnectionQuality.Excellent;
    if (poor && !degraded) {
      const t = setTimeout(() => {
        setDegraded(true);
        toast("Koneksi lemah, kualitas video diturunkan.", "warn");
      }, 6000);
      return () => clearTimeout(t);
    }
    if (good && degraded) {
      const t = setTimeout(() => {
        setDegraded(false);
        toast("Koneksi pulih, kualitas video normal.", "ok");
      }, 20000);
      return () => clearTimeout(t);
    }
  }, [quality, degraded, prefs.quality, toast]);

  const recv = useMemo(() => receivePolicy(prefs.quality, device, degraded), [prefs.quality, device, degraded]);

  // Kebijakan langganan video peserta lain.
  useEffect(() => {
    const run = () => {
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.trackPublications.values()) applyRemote(pub, prefs.audioOnly, recv.remoteQuality);
      }
    };
    run();
    const onPublished = (pub: RemoteTrackPublication) => applyRemote(pub, prefs.audioOnly, recv.remoteQuality);
    const onSubscribed = (_t: RemoteTrack, pub: RemoteTrackPublication) => applyRemote(pub, prefs.audioOnly, recv.remoteQuality);
    room.on(RoomEvent.TrackPublished, onPublished);
    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    return () => {
      room.off(RoomEvent.TrackPublished, onPublished);
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
    };
  }, [room, prefs.audioOnly, recv.remoteQuality]);

  const update = useCallback(
    (patch: Partial<JumpaMediaPrefs>) => {
      const prev = prefsRef.current;
      const next = { ...prev, ...patch, devices: { ...prev.devices, ...(patch.devices ?? {}) } };
      prefsRef.current = next;
      setPrefs(next);
      writeMediaPrefs(patch);
      const lp = room.localParticipant;
      void (async () => {
        try {
          for (const kind of ["videoinput", "audioinput", "audiooutput"] as const) {
            const id = next.devices[kind];
            if (id && id !== prev.devices[kind]) await room.switchActiveDevice(kind, id);
          }
          if (patch.noiseSuppression !== undefined && patch.noiseSuppression !== prev.noiseSuppression) {
            const mic = lp.getTrackPublication(Track.Source.Microphone)?.track;
            if (mic && "restartTrack" in mic) {
              await mic.restartTrack({ deviceId: next.devices.audioinput, echoCancellation: true, autoGainControl: true, noiseSuppression: next.noiseSuppression });
            }
          }
          if (patch.audioOnly !== undefined && patch.audioOnly !== prev.audioOnly) {
            if (next.audioOnly) {
              cameraBeforeAudioOnly.current = lp.isCameraEnabled;
              if (lp.isCameraEnabled) await lp.setCameraEnabled(false);
              toast("Mode audio saja aktif.", "ok");
            } else if (cameraBeforeAudioOnly.current) {
              await lp.setCameraEnabled(true);
            }
          }
          if (patch.quality !== undefined && patch.quality !== prev.quality) {
            await republishCamera(room, next, publishPolicy(next.quality, device, tier.maxCameraHeight, tier.maxScreenHeight));
          }
        } catch {
          toast("Gagal menerapkan pengaturan. Coba lagi.", "warn");
        }
      })();
    },
    [room, device, tier.maxCameraHeight, tier.maxScreenHeight, toast],
  );

  const value = useMemo<MediaCtl>(() => ({ prefs, update, device, recv, degraded, quality, tier }), [prefs, update, device, recv, degraded, quality, tier]);
  return <MediaCtx.Provider value={value}>{children}</MediaCtx.Provider>;
}
