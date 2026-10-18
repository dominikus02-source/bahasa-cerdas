"use client";

/**
 * Lobby JUMPA ("ruang tunggu"): pratinjau kamera, mik, pengaturan, paket.
 * Fase 3: tanpa framer-motion & tanpa LiveKit (bundle awal kecil);
 * pratinjau memakai resolusi kebijakan perangkat (HP lebih ringan).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Settings2, ShieldCheck, Users, Video, VideoOff, X } from "lucide-react";
import type { JumpaTierView } from "@/lib/jumpa/tiers";
import { readMediaPrefs, writeMediaPrefs, type JumpaMediaPrefs } from "./media-prefs";
import { detectDevice, publishPolicy, QUALITY_LABEL } from "./media-policy";
import { initials } from "./format";
import SettingsPanel from "./SettingsPanel";
import { TierBadge, tierLimitsText } from "./TierUi";

interface Props {
  title: string;
  subtitle: string | null;
  displayName: string;
  roleLabel: "GURU" | "MURID";
  canJoin: boolean;
  denyMessage: string | null;
  joining: boolean;
  joinError: string | null;
  onJoin: (prefs: JumpaMediaPrefs) => void;
  tier: JumpaTierView;
}

type PermissionNote = null | "camera" | "mic" | "both";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function permissionMessage(note: PermissionNote): string | null {
  if (note === "camera") return "Kamera belum diizinkan. Ketuk ikon gembok di bilah alamat untuk mengizinkan.";
  if (note === "mic") return "Mikrofon belum diizinkan. Ketuk ikon gembok di bilah alamat untuk mengizinkan.";
  if (note === "both") return "Kamera dan mikrofon belum diizinkan. Ketuk ikon gembok di bilah alamat.";
  return null;
}

/** Bar level mikrofon sederhana (5 batang), ~15 fps supaya ringan. */
function useMicLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const id = setInterval(() => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      setLevel(Math.min(1, sum / data.length / 90));
    }, 66);
    return () => {
      clearInterval(id);
      source.disconnect();
      void ctx.close();
    };
  }, [stream]);
  return level;
}

export default function JumpaLobby(props: Props) {
  const [prefs, setPrefs] = useState<JumpaMediaPrefs | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [note, setNote] = useState<PermissionNote>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deviceRefresh, setDeviceRefresh] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamsRef = useRef<{ v: MediaStream | null; a: MediaStream | null; vId?: string; aKey?: string }>({ v: null, a: null });
  const micLevel = useMicLevel(audioStream);

  // Baca pilihan terakhir setelah mount (localStorage hanya ada di browser).
  useEffect(() => {
    setPrefs(readMediaPrefs());
  }, []);

  const camWanted = Boolean(prefs?.camera && !prefs.audioOnly);
  const camDevice = prefs?.devices.videoinput;
  const quality = prefs?.quality ?? "auto";

  // Pratinjau kamera mengikuti toggle + perangkat + kualitas.
  useEffect(() => {
    if (!prefs) return;
    let cancelled = false;
    const key = `${camDevice ?? ""}|${quality}`;
    if (!camWanted) {
      stopStream(streamsRef.current.v);
      streamsRef.current.v = null;
      setVideoStream(null);
      return;
    }
    if (streamsRef.current.v && streamsRef.current.vId === key) return;
    stopStream(streamsRef.current.v);
    streamsRef.current.v = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNote("camera");
      return;
    }
    const cap = publishPolicy(quality, detectDevice(), props.tier.maxCameraHeight).capture;
    setStarting(true);
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: cap.width },
          height: { ideal: cap.height },
          frameRate: { ideal: cap.fps },
          ...(camDevice ? { deviceId: { exact: camDevice } } : { facingMode: "user" }),
        },
      })
      .then((stream) => {
        if (cancelled) return stopStream(stream);
        streamsRef.current.v = stream;
        streamsRef.current.vId = key;
        setVideoStream(stream);
        setDeviceRefresh((n) => n + 1);
        setNote((n) => (n === "camera" ? null : n === "both" ? "mic" : n));
      })
      .catch(() => {
        if (cancelled) return;
        setNote((n) => (n === "mic" || n === "both" ? "both" : "camera"));
        setPrefs((p) => (p ? { ...p, camera: false } : p));
      })
      .finally(() => !cancelled && setStarting(false));
    return () => {
      cancelled = true;
    };
  }, [prefs, camWanted, camDevice, quality, props.tier.maxCameraHeight]);

  const micWanted = Boolean(prefs?.mic);
  const micDevice = prefs?.devices.audioinput;
  const ns = prefs?.noiseSuppression ?? true;

  // Mikrofon (untuk meter level) mengikuti toggle + perangkat.
  useEffect(() => {
    if (!prefs) return;
    let cancelled = false;
    const key = `${micDevice ?? ""}|${ns}`;
    if (!micWanted) {
      stopStream(streamsRef.current.a);
      streamsRef.current.a = null;
      setAudioStream(null);
      return;
    }
    if (streamsRef.current.a && streamsRef.current.aKey === key) return;
    stopStream(streamsRef.current.a);
    streamsRef.current.a = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNote("mic");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: ns, ...(micDevice ? { deviceId: { exact: micDevice } } : {}) } })
      .then((stream) => {
        if (cancelled) return stopStream(stream);
        streamsRef.current.a = stream;
        streamsRef.current.aKey = key;
        setAudioStream(stream);
        setDeviceRefresh((n) => n + 1);
        setNote((n) => (n === "mic" ? null : n === "both" ? "camera" : n));
      })
      .catch(() => {
        if (cancelled) return;
        setNote((n) => (n === "camera" || n === "both" ? "both" : "mic"));
        setPrefs((p) => (p ? { ...p, mic: false } : p));
      });
    return () => {
      cancelled = true;
    };
  }, [prefs, micWanted, micDevice, ns]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = videoStream;
  }, [videoStream]);

  // Lepas kamera/mic saat lobby ditutup.
  useEffect(() => {
    const streams = streamsRef.current;
    return () => {
      stopStream(streams.v);
      stopStream(streams.a);
    };
  }, []);

  const change = useCallback((patch: Partial<JumpaMediaPrefs>) => {
    setPrefs((p) => {
      if (!p) return p;
      const next = { ...p, ...patch, devices: { ...p.devices, ...(patch.devices ?? {}) } };
      writeMediaPrefs(next);
      return next;
    });
  }, []);

  const toggle = (key: "camera" | "mic") => {
    if (!prefs) return;
    if (key === "camera" && prefs.audioOnly) return change({ audioOnly: false, camera: true });
    change({ [key]: !prefs[key] });
  };

  const handleJoin = () => {
    if (!prefs || !props.canJoin || props.joining) return;
    writeMediaPrefs(prefs);
    stopStream(streamsRef.current.v);
    stopStream(streamsRef.current.a);
    streamsRef.current = { v: null, a: null };
    props.onJoin(prefs);
  };

  const camOn = camWanted;
  const micOn = micWanted;
  const bars = [0.35, 0.6, 1, 0.6, 0.35];

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col justify-center gap-6 px-4 py-6 sm:px-6 md:flex-row md:items-center md:gap-10">
      <section className="jumpa-in-up w-full md:flex-[1.4]">
        <div className="jumpa-preview">
          {camOn && videoStream ? (
            <video ref={videoRef} autoPlay playsInline muted aria-label="Pratinjau kamera kamu" />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              {starting ? (
                <Loader2 className="animate-spin text-[var(--jp-text-3)]" size={32} aria-label="Menyalakan kamera" />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="jumpa-avatar h-24 w-24 text-3xl">{initials(props.displayName)}</span>
                  <span className="text-sm text-[var(--jp-text-2)]">{prefs?.audioOnly ? "Mode audio saja" : "Kamera mati"}</span>
                </div>
              )}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <span className="jumpa-nameplate !static">{props.displayName}</span>
            {micOn && (
              <span className="jumpa-nameplate jumpa-meter !static" aria-hidden>
                {bars.map((w, i) => (
                  <span key={i} style={{ height: `${Math.max(3, micLevel * w * 18)}px` }} />
                ))}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-start justify-center gap-4">
          <div className="jumpa-ctl">
            <button type="button" className="jumpa-key" data-off={!micOn} aria-pressed={micOn} aria-label={micOn ? "Matikan mikrofon" : "Nyalakan mikrofon"} onClick={() => toggle("mic")} disabled={!prefs}>
              {micOn ? <Mic size={22} /> : <MicOff size={22} />}
            </button>
            <span className="jumpa-ctl-label">{micOn ? "Mik" : "Mik mati"}</span>
          </div>
          <div className="jumpa-ctl">
            <button type="button" className="jumpa-key" data-off={!camOn} aria-pressed={camOn} aria-label={camOn ? "Matikan kamera" : "Nyalakan kamera"} onClick={() => toggle("camera")} disabled={!prefs}>
              {camOn ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
            <span className="jumpa-ctl-label">{camOn ? "Kamera" : "Kamera mati"}</span>
          </div>
          <div className="jumpa-ctl">
            <button type="button" className="jumpa-key" data-on={settingsOpen} aria-haspopup="dialog" aria-expanded={settingsOpen} aria-label="Pengaturan" onClick={() => setSettingsOpen(true)} disabled={!prefs}>
              <Settings2 size={22} />
            </button>
            <span className="jumpa-ctl-label">{prefs ? QUALITY_LABEL[prefs.quality].title : "Pengaturan"}</span>
          </div>
        </div>
        {permissionMessage(note) && (
          <p role="status" className="mt-3 text-center text-sm text-[var(--clr-warning)]">{permissionMessage(note)}</p>
        )}
      </section>

      <section className="jumpa-in-up flex w-full flex-col items-center gap-5 text-center [animation-delay:60ms] md:flex-1 md:items-start md:text-left">
        <span className="jumpa-brand">
          <span className="jumpa-mark jumpa-mark-sm" aria-hidden>J</span>
          JUMPA <span className="jumpa-brand-by">by BahasaCerdas</span>
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{props.title}</h1>
          {props.subtitle && (
            <p className="mt-2 flex items-center justify-center gap-2 text-[var(--jp-text-2)] md:justify-start">
              <Users size={16} /> {props.subtitle}
            </p>
          )}
          <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--jp-text-3)] md:justify-start">
            <TierBadge tier={props.tier} /> {tierLimitsText(props.tier)}
          </p>
        </div>

        {props.canJoin ? (
          <>
            <button type="button" className="jumpa-primary w-full sm:w-auto" onClick={handleJoin} disabled={!prefs || props.joining}>
              {props.joining ? <Loader2 className="animate-spin" size={20} /> : null}
              {props.joining ? "Menyambungkan…" : "Gabung sekarang"}
            </button>
            {props.joinError && <p role="alert" className="text-sm text-[var(--jp-danger)]">{props.joinError}</p>}
            <p className="flex items-center gap-2 text-xs text-[var(--jp-text-3)]">
              <ShieldCheck size={14} /> Hanya akun BahasaCerdas yang terdaftar di kelas ini yang bisa masuk.
            </p>
          </>
        ) : (
          <div role="alert" className="jumpa-card w-full p-4 text-sm text-[var(--jp-text-2)]">
            {props.denyMessage ?? "Kamu belum bisa masuk ke ruang ini."}
          </div>
        )}
        <span className="jumpa-badge" data-role={props.roleLabel}>Masuk sebagai {props.roleLabel === "GURU" ? "Guru" : "Murid"}</span>
      </section>

      {settingsOpen && prefs && (
        <>
          <button type="button" aria-label="Tutup pengaturan" className="jumpa-scrim jumpa-in-fade fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Pengaturan" className="jumpa-sheet jumpa-in-sheet jumpa-lobby-sheet">
            <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
              <h2 className="text-base font-bold">Pengaturan</h2>
              <button type="button" className="jumpa-icon-btn" aria-label="Tutup pengaturan" onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <SettingsPanel prefs={prefs} onChange={change} tier={props.tier} refreshKey={deviceRefresh} />
          </div>
        </>
      )}
    </main>
  );
}
