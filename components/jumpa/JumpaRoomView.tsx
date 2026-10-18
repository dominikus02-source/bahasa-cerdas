"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useSpeakingParticipants,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track, VideoPresets, type RoomOptions } from "livekit-client";
import { Check, LayoutGrid, Link2, Loader2, Mic, MicOff, MoreHorizontal, PhoneOff, Presentation, Users, Video, VideoOff, WifiOff, X } from "lucide-react";
import ParticipantTile from "./ParticipantTile";
import { gridColumns, parseParticipantMeta } from "./format";
import { writeMediaPrefs, type JumpaMediaPrefs } from "./media-prefs";

type Layout = "grid" | "speaker";

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  publishDefaults: { simulcast: true },
};

const EASE = [0.22, 0.8, 0.24, 1] as const;

function useIsWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

interface ViewProps {
  serverUrl: string;
  token: string;
  title: string;
  code: string;
  prefs: JumpaMediaPrefs;
  onLeave: (reason: "left" | "disconnected") => void;
}

export default function JumpaRoomView(props: ViewProps) {
  const [deviceNote, setDeviceNote] = useState<string | null>(null);
  return (
    <LiveKitRoom
      serverUrl={props.serverUrl}
      token={props.token}
      connect
      video={props.prefs.camera}
      audio={props.prefs.mic}
      options={ROOM_OPTIONS}
      onDisconnected={() => props.onLeave("disconnected")}
      onMediaDeviceFailure={() => setDeviceNote("Kamera atau mikrofon tidak bisa dipakai. Periksa izin browser.")}
      className="flex h-[100dvh] flex-col"
    >
      <RoomShell {...props} deviceNote={deviceNote} clearDeviceNote={() => setDeviceNote(null)} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function RoomShell(props: ViewProps & { deviceNote: string | null; clearDeviceNote: () => void }) {
  const wide = useIsWide();
  const [layoutChoice, setLayoutChoice] = useState<Layout | null>(null);
  const layout: Layout = layoutChoice ?? (wide ? "grid" : "speaker");
  const participants = useParticipants();
  const state = useConnectionState();

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-accent)]">JUMPA</p>
          <h1 className="truncate text-base font-bold sm:text-lg">{props.title}</h1>
        </div>
        <span className="jumpa-glass inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" aria-label={`${participants.length} peserta`}>
          <Users size={16} /> {participants.length}
        </span>
      </header>

      <AnimatePresence>
        {(state === ConnectionState.Reconnecting || state === ConnectionState.Connecting) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="jumpa-glass mx-auto mb-2 inline-flex items-center gap-2 self-center rounded-full px-4 py-2 text-sm"
          >
            {state === ConnectionState.Reconnecting ? <WifiOff size={16} className="text-[var(--clr-warning)]" /> : <Loader2 size={16} className="animate-spin" />}
            {state === ConnectionState.Reconnecting ? "Jaringan terputus — menyambung ulang…" : "Menyambungkan ke ruang…"}
          </motion.div>
        )}
        {props.deviceNote && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={props.clearDeviceNote}
            className="jumpa-glass mx-auto mb-2 inline-flex items-center gap-2 self-center rounded-full px-4 py-2 text-sm text-[var(--clr-warning)]"
          >
            {props.deviceNote} <X size={14} />
          </motion.button>
        )}
      </AnimatePresence>

      <section className="relative min-h-0 flex-1 px-3 sm:px-6" aria-label="Video peserta">
        <Stage layout={layout} wide={wide} />
      </section>

      <ControlBar code={props.code} layout={layout} onLayout={setLayoutChoice} onLeave={() => props.onLeave("left")} />
    </>
  );
}

function Stage({ layout, wide }: { layout: Layout; wide: boolean }) {
  const reduceMotion = useReducedMotion();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const speakers = useSpeakingParticipants();
  const [focusId, setFocusId] = useState<string | null>(null);

  // Pembicara terakhir (selain diri sendiri) menjadi fokus layout Pembicara.
  useEffect(() => {
    const remote = speakers.find((p) => !p.isLocal);
    if (remote) setFocusId(remote.identity);
  }, [speakers]);

  const focus = useMemo(() => {
    if (tracks.length === 0) return null;
    const byId = focusId ? tracks.find((t) => t.participant.identity === focusId) : undefined;
    if (byId) return byId;
    const host = tracks.find((t) => !t.participant.isLocal && parseParticipantMeta(t.participant.metadata).roomRole === "HOST");
    return host ?? tracks.find((t) => !t.participant.isLocal) ?? tracks[0];
  }, [tracks, focusId]);

  const motionProps = reduceMotion
    ? {}
    : {
        layout: true as const,
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.22, ease: EASE },
      };

  if (layout === "speaker" && focus) {
    const others = tracks.filter((t) => t !== focus);
    return (
      <div className="flex h-full flex-col gap-2">
        <motion.div key={focus.participant.identity} className="min-h-0 flex-1" {...motionProps}>
          <ParticipantTile trackRef={focus} />
        </motion.div>
        {others.length > 0 && (
          <div className="jumpa-strip">
            <AnimatePresence initial={false}>
              {others.map((t) => (
                <motion.button
                  type="button"
                  key={t.participant.identity}
                  onClick={() => setFocusId(t.participant.identity)}
                  aria-label={`Fokus ke ${t.participant.name || "peserta"}`}
                  {...motionProps}
                >
                  <ParticipantTile trackRef={t} compact />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  const cols = gridColumns(tracks.length, wide);
  return (
    <div className="jumpa-grid" style={{ ["--jp-cols" as string]: cols }}>
      <AnimatePresence initial={false}>
        {tracks.map((t) => (
          <motion.div key={t.participant.identity} className="min-h-0" {...motionProps}>
            <ParticipantTile trackRef={t} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ControlBar({ code, layout, onLayout, onLeave }: { code: string; layout: Layout; onLayout: (l: Layout) => void; onLeave: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [busy, setBusy] = useState<"mic" | "camera" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();

  const toggleMic = async () => {
    setBusy("mic");
    try {
      const next = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      writeMediaPrefs({ mic: next, camera: isCameraEnabled });
    } catch {
      // Error perangkat ditangani onMediaDeviceFailure di LiveKitRoom.
    } finally {
      setBusy(null);
    }
  };
  const toggleCamera = async () => {
    setBusy("camera");
    try {
      const next = !isCameraEnabled;
      await localParticipant.setCameraEnabled(next);
      writeMediaPrefs({ mic: isMicrophoneEnabled, camera: next });
    } catch {
      // idem
    } finally {
      setBusy(null);
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jumpa/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  // Unmount LiveKitRoom (di JumpaApp) memutus koneksi & melepas kamera/mic.
  const leave = () => onLeave();

  return (
    <div className="relative px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Tutup menu"
              className="fixed inset-0 z-20 cursor-default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              role="menu"
              aria-label="Menu lainnya"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="jumpa-glass absolute inset-x-3 bottom-full z-30 mb-2 rounded-3xl p-2 sm:left-auto sm:right-6 sm:w-80"
            >
              <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-text-3)]">Tata letak</p>
              <button type="button" role="menuitemradio" aria-checked={layout === "grid"} className="jumpa-menu-item" onClick={() => { onLayout("grid"); setMenuOpen(false); }}>
                <LayoutGrid size={20} /> Grid — semua sama besar
                {layout === "grid" && <Check size={18} className="ml-auto" />}
              </button>
              <button type="button" role="menuitemradio" aria-checked={layout === "speaker"} className="jumpa-menu-item" onClick={() => { onLayout("speaker"); setMenuOpen(false); }}>
                <Presentation size={20} /> Pembicara — fokus yang bicara
                {layout === "speaker" && <Check size={18} className="ml-auto" />}
              </button>
              <div className="my-1 h-px bg-[var(--jp-line)]" />
              <button type="button" role="menuitem" className="jumpa-menu-item" onClick={copyLink}>
                {copied ? <Check size={20} className="text-[var(--jp-accent)]" /> : <Link2 size={20} />}
                {copied ? "Tautan tersalin" : "Salin tautan undangan"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.nav
        aria-label="Kontrol ruang"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="jumpa-glass mx-auto flex w-full max-w-md items-start justify-around gap-1 rounded-[28px] px-2 py-3"
      >
        <div className="jumpa-ctl">
          <button type="button" className="jumpa-round" data-off={!isMicrophoneEnabled} aria-pressed={isMicrophoneEnabled} aria-label={isMicrophoneEnabled ? "Matikan mikrofon" : "Nyalakan mikrofon"} onClick={toggleMic} disabled={busy === "mic"}>
            {isMicrophoneEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <span className="jumpa-ctl-label">Mikrofon</span>
        </div>
        <div className="jumpa-ctl">
          <button type="button" className="jumpa-round" data-off={!isCameraEnabled} aria-pressed={isCameraEnabled} aria-label={isCameraEnabled ? "Matikan kamera" : "Nyalakan kamera"} onClick={toggleCamera} disabled={busy === "camera"}>
            {isCameraEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
          <span className="jumpa-ctl-label">Kamera</span>
        </div>
        <div className="jumpa-ctl">
          <button type="button" className="jumpa-round" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Lainnya" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal size={24} />
          </button>
          <span className="jumpa-ctl-label">Lainnya</span>
        </div>
        <div className="jumpa-ctl">
          <button type="button" className="jumpa-round" data-variant="leave" aria-label="Keluar dari ruang" onClick={leave}>
            <PhoneOff size={24} />
          </button>
          <span className="jumpa-ctl-label">Keluar</span>
        </div>
      </motion.nav>
    </div>
  );
}
