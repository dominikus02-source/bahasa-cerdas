"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Mic, MicOff, ShieldCheck, Users, Video, VideoOff } from "lucide-react";
import { readMediaPrefs, writeMediaPrefs, type JumpaMediaPrefs } from "./media-prefs";
import { initials } from "./format";

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

/** Bar level mikrofon sederhana (5 batang). */
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
    let raf = 0;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      setLevel(Math.min(1, sum / data.length / 90));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void ctx.close();
    };
  }, [stream]);
  return level;
}

export default function JumpaLobby(props: Props) {
  const reduceMotion = useReducedMotion();
  const [prefs, setPrefs] = useState<JumpaMediaPrefs | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [note, setNote] = useState<PermissionNote>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamsRef = useRef<{ v: MediaStream | null; a: MediaStream | null }>({ v: null, a: null });
  const micLevel = useMicLevel(audioStream);

  // Baca pilihan terakhir setelah mount (localStorage hanya ada di browser).
  useEffect(() => {
    setPrefs(readMediaPrefs());
  }, []);

  // Preview kamera mengikuti toggle.
  useEffect(() => {
    if (!prefs) return;
    let cancelled = false;
    if (!prefs.camera) {
      stopStream(streamsRef.current.v);
      streamsRef.current.v = null;
      setVideoStream(null);
      return;
    }
    if (streamsRef.current.v) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNote("camera");
      return;
    }
    setStarting(true);
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } })
      .then((stream) => {
        if (cancelled) return stopStream(stream);
        streamsRef.current.v = stream;
        setVideoStream(stream);
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
  }, [prefs]);

  // Mikrofon (untuk meter level) mengikuti toggle.
  useEffect(() => {
    if (!prefs) return;
    let cancelled = false;
    if (!prefs.mic) {
      stopStream(streamsRef.current.a);
      streamsRef.current.a = null;
      setAudioStream(null);
      return;
    }
    if (streamsRef.current.a) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNote("mic");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        if (cancelled) return stopStream(stream);
        streamsRef.current.a = stream;
        setAudioStream(stream);
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
  }, [prefs]);

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

  const toggle = useCallback((key: keyof JumpaMediaPrefs) => {
    setPrefs((p) => {
      if (!p) return p;
      const next = { ...p, [key]: !p[key] };
      writeMediaPrefs(next);
      return next;
    });
  }, []);

  const handleJoin = () => {
    if (!prefs || !props.canJoin || props.joining) return;
    writeMediaPrefs(prefs);
    stopStream(streamsRef.current.v);
    stopStream(streamsRef.current.a);
    streamsRef.current = { v: null, a: null };
    props.onJoin(prefs);
  };

  const camOn = Boolean(prefs?.camera);
  const micOn = Boolean(prefs?.mic);
  const bars = [0.35, 0.6, 1, 0.6, 0.35];

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col justify-center gap-6 px-4 py-6 sm:px-6 md:flex-row md:items-center md:gap-10">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 0.8, 0.24, 1] }}
        className="w-full md:flex-[1.4]"
      >
        <div className="jumpa-preview jumpa-glass">
          {camOn && videoStream ? (
            <video ref={videoRef} autoPlay playsInline muted aria-label="Pratinjau kamera kamu" />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              {starting ? (
                <Loader2 className="animate-spin text-[var(--jp-text-3)]" size={32} aria-label="Menyalakan kamera" />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="jumpa-avatar h-24 w-24 text-3xl">{initials(props.displayName)}</span>
                  <span className="text-sm text-[var(--jp-text-2)]">Kamera mati</span>
                </div>
              )}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <span className="jumpa-glass rounded-full px-3 py-1.5 text-sm font-semibold">{props.displayName}</span>
            {micOn && (
              <span className="jumpa-glass jumpa-meter rounded-full px-3 py-2" aria-hidden>
                {bars.map((w, i) => (
                  <span key={i} style={{ height: `${Math.max(3, micLevel * w * 18)}px` }} />
                ))}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-5">
          <div className="jumpa-ctl">
            <button
              type="button"
              className="jumpa-round"
              data-off={!micOn}
              aria-pressed={micOn}
              aria-label={micOn ? "Matikan mikrofon" : "Nyalakan mikrofon"}
              onClick={() => toggle("mic")}
              disabled={!prefs}
            >
              {micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            <span className="jumpa-ctl-label">{micOn ? "Mikrofon" : "Mik mati"}</span>
          </div>
          <div className="jumpa-ctl">
            <button
              type="button"
              className="jumpa-round"
              data-off={!camOn}
              aria-pressed={camOn}
              aria-label={camOn ? "Matikan kamera" : "Nyalakan kamera"}
              onClick={() => toggle("camera")}
              disabled={!prefs}
            >
              {camOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            <span className="jumpa-ctl-label">{camOn ? "Kamera" : "Kamera mati"}</span>
          </div>
        </div>
        {permissionMessage(note) && (
          <p role="status" className="mt-3 text-center text-sm text-[var(--clr-warning)]">{permissionMessage(note)}</p>
        )}
      </motion.section>

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 0.8, 0.24, 1] }}
        className="flex w-full flex-col items-center gap-5 text-center md:flex-1 md:items-start md:text-left"
      >
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-[var(--jp-accent)] jumpa-glass">
          JUMPA · BahasaCerdas
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{props.title}</h1>
          {props.subtitle && (
            <p className="mt-2 flex items-center justify-center gap-2 text-[var(--jp-text-2)] md:justify-start">
              <Users size={16} /> {props.subtitle}
            </p>
          )}
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
          <div role="alert" className="jumpa-glass w-full rounded-2xl p-4 text-sm text-[var(--jp-text-2)]">
            {props.denyMessage ?? "Kamu belum bisa masuk ke ruang ini."}
          </div>
        )}
        <span className="jumpa-badge" data-role={props.roleLabel}>Masuk sebagai {props.roleLabel === "GURU" ? "Guru" : "Murid"}</span>
      </motion.section>
    </main>
  );
}
