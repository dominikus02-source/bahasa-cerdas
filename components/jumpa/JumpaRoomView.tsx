"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useParticipants,
  useSpeakingParticipants,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, DisconnectReason, Track, VideoPresets, type RoomOptions } from "livekit-client";
import {
  Check,
  Flag,
  Hand,
  Heart,
  LayoutGrid,
  Laugh,
  Lightbulb,
  Link2,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PartyPopper,
  PhoneOff,
  Presentation,
  Sparkles,
  ThumbsUp,
  Timer,
  UserPlus,
  Users,
  Video,
  VideoOff,
  WifiOff,
  X,
} from "lucide-react";
import type { JumpaReaction } from "@/lib/jumpa/signals";
import ParticipantTile from "./ParticipantTile";
import { fitGrid, gridColumns, parseParticipantMeta } from "./format";
import { writeMediaPrefs, type JumpaMediaPrefs } from "./media-prefs";
import { JumpaRoomProvider, useJumpa, type EndedReason, type JumpaRoomInfo, type JumpaSelf } from "./room-controller";
import { ChatPanel, InvitePanel, PanelFrame, PeoplePanel, ReportPanel, type PanelName } from "./RoomPanels";

export const REACTION_ICONS: Record<JumpaReaction, { icon: (size: number) => ReactNode; label: string }> = {
  like: { icon: (n) => <ThumbsUp size={n} />, label: "Suka" },
  love: { icon: (n) => <Heart size={n} />, label: "Sayang" },
  clap: { icon: (n) => <PartyPopper size={n} />, label: "Hore" },
  laugh: { icon: (n) => <Laugh size={n} />, label: "Lucu" },
  wow: { icon: (n) => <Sparkles size={n} />, label: "Keren" },
  idea: { icon: (n) => <Lightbulb size={n} />, label: "Ide" },
};

/** TrackSource.SCREEN_SHARE di protokol LiveKit (izin dari server). */
const PROTO_SCREEN_SHARE = 3;

function supportsScreenShare(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices);
}

type Layout = "grid" | "speaker";

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  publishDefaults: { simulcast: true },
};

const EASE = [0.22, 0.8, 0.24, 1] as const;

const GRID_GAP_WIDE = 16;
const GRID_GAP_NARROW = 8;

/** Ukuran elemen (ResizeObserver) untuk menghitung grid yang pas. */
function useElementSize<T extends HTMLElement>(): [(el: T | null) => void, { w: number; h: number }] {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const obs = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    obs.current?.disconnect();
    obs.current = null;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((cur) => (Math.abs(cur.w - width) < 1 && Math.abs(cur.h - height) < 1 ? cur : { w: Math.floor(width), h: Math.floor(height) }));
    });
    ro.observe(el);
    obs.current = ro;
  }, []);
  useEffect(() => () => obs.current?.disconnect(), []);
  return [ref, size];
}

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

export type LeaveReason = "left" | "disconnected" | "removed" | "ended" | "duplicate";

interface ViewProps {
  serverUrl: string;
  token: string;
  title: string;
  code: string;
  prefs: JumpaMediaPrefs;
  info: JumpaRoomInfo;
  self: JumpaSelf;
  onLeave: (reason: LeaveReason, ended?: EndedReason | null) => void;
}

export default function JumpaRoomView(props: ViewProps) {
  const [deviceNote, setDeviceNote] = useState<string | null>(null);
  const [endedRef, setEndedRef] = useState<{ current: EndedReason | null } | null>(null);
  return (
    <LiveKitRoom
      serverUrl={props.serverUrl}
      token={props.token}
      connect
      video={props.prefs.camera}
      audio={props.prefs.mic}
      options={ROOM_OPTIONS}
      onDisconnected={(reason) => {
        const ended = endedRef?.current ?? null;
        if (reason === DisconnectReason.PARTICIPANT_REMOVED) props.onLeave("removed");
        else if (reason === DisconnectReason.ROOM_DELETED || ended) props.onLeave("ended", ended);
        else if (reason === DisconnectReason.DUPLICATE_IDENTITY) props.onLeave("duplicate");
        else props.onLeave("disconnected");
      }}
      onMediaDeviceFailure={() => setDeviceNote("Kamera atau mikrofon tidak bisa dipakai. Periksa izin browser.")}
      className="flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden"
    >
      <JumpaRoomProvider initial={props.info} self={props.self}>
        <EndedBridge onRef={setEndedRef} />
        <RoomShell {...props} deviceNote={deviceNote} clearDeviceNote={() => setDeviceNote(null)} />
      </JumpaRoomProvider>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

/** Teruskan alasan "ruang berakhir" (dari sinyal server) ke onDisconnected. */
function EndedBridge({ onRef }: { onRef: (r: { current: EndedReason | null }) => void }) {
  const { endedReasonRef } = useJumpa();
  useEffect(() => onRef(endedReasonRef), [endedReasonRef, onRef]);
  return null;
}

function useCountdown(endsAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
}

function HeaderBtn({ label, onClick, active, badge, children }: { label: string; onClick: () => void; active: boolean; badge?: number; children: ReactNode }) {
  return (
    <button type="button" className="jumpa-head-btn jumpa-glass" data-active={active} aria-label={label} aria-pressed={active} onClick={onClick}>
      {children}
      <AnimatePresence>
        {badge ? (
          <motion.span key={badge} className="jumpa-count" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
            {badge > 9 ? "9+" : badge}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}

function RoomShell(props: ViewProps & { deviceNote: string | null; clearDeviceNote: () => void }) {
  const wide = useIsWide();
  const [layoutChoice, setLayoutChoice] = useState<Layout | null>(null);
  const layout: Layout = layoutChoice ?? (wide ? "grid" : "speaker");
  const participants = useParticipants();
  const state = useConnectionState();
  const { info, unread, hands, setChatVisible, toasts, self } = useJumpa();
  const [panel, setPanel] = useState<PanelName | null>(null);
  const remaining = useCountdown(info.endsAt);
  const showCountdown = remaining !== null && remaining <= 10 * 60;
  const handsCount = self.roomRole !== "MEMBER" ? hands.size : 0;

  useEffect(() => setChatVisible(panel === "chat"), [panel, setChatVisible]);
  const toggle = (p: PanelName) => setPanel((cur) => (cur === p ? null : p));

  return (
    <>
      <header className="flex min-w-0 items-center justify-between gap-3 pb-2 pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[max(12px,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-accent)]">
            JUMPA
            {info.isLocked && <Lock size={12} aria-label="Ruang terkunci" className="text-[var(--clr-warning)]" />}
          </p>
          <h1 className="truncate text-base font-bold sm:text-lg">{props.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showCountdown && (
            <span className="jumpa-glass jumpa-countdown inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold" role="timer" aria-label="Sisa waktu ruang">
              <Timer size={15} /> {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </span>
          )}
          <HeaderBtn label="Obrolan" onClick={() => toggle("chat")} active={panel === "chat"} badge={unread}>
            <MessageSquare size={18} />
          </HeaderBtn>
          <HeaderBtn label={`Peserta (${participants.length})`} onClick={() => toggle("people")} active={panel === "people"} badge={handsCount}>
            <Users size={18} />
            <span className="text-sm font-semibold">{participants.length}</span>
          </HeaderBtn>
        </div>
      </header>

      <div className="pointer-events-none fixed inset-x-0 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="jumpa-glass jumpa-toast rounded-full px-4 py-2 text-sm font-semibold"
              data-tone={t.tone}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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

      <div className="flex min-h-0 min-w-0 flex-1 gap-3 pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] sm:px-6 lg:gap-4 lg:px-8 lg:pt-1">
        <section className="relative min-h-0 min-w-0 flex-1" aria-label="Video peserta">
          <Stage layout={layout} wide={wide} />
          <ReactionsLayer />
        </section>
        <AnimatePresence>
          {panel && wide && (
            <PanelFrame key={panel} name={panel} wide onClose={() => setPanel(null)}>
              <PanelBody panel={panel} setPanel={setPanel} />
            </PanelFrame>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {panel && !wide && (
          <PanelFrame key={panel} name={panel} wide={false} onClose={() => setPanel(null)}>
            <PanelBody panel={panel} setPanel={setPanel} />
          </PanelFrame>
        )}
      </AnimatePresence>

      <ControlBar wide={wide} layout={layout} onLayout={setLayoutChoice} onLeave={() => props.onLeave("left")} openPanel={setPanel} />
    </>
  );
}

function PanelBody({ panel, setPanel }: { panel: PanelName; setPanel: (p: PanelName | null) => void }) {
  if (panel === "chat") return <ChatPanel />;
  if (panel === "people") return <PeoplePanel onInvite={() => setPanel("invite")} />;
  if (panel === "invite") return <InvitePanel />;
  return <ReportPanel onDone={() => setPanel(null)} />;
}

function ReactionsLayer() {
  const { reactions } = useJumpa();
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            className="jumpa-reaction absolute bottom-4 flex flex-col items-center gap-1"
            style={{ left: `${r.x}%` }}
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={reduce ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 1, 0], y: -220, scale: [0.6, 1.15, 1, 0.9], x: [0, 10, -8, 4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, ease: "easeOut" }}
          >
            <span className="jumpa-reaction-bubble" data-r={r.r}>{REACTION_ICONS[r.r].icon(26)}</span>
            <span className="jumpa-glass rounded-full px-2 py-0.5 text-[11px] font-semibold">{r.name}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Stage({ layout, wide }: { layout: Layout; wide: boolean }) {
  const reduceMotion = useReducedMotion();
  const allTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  // Layar yang dibagikan selalu jadi fokus (paling baru), kamera di strip.
  const screens = allTracks.filter((t) => t.source === Track.Source.ScreenShare);
  const tracks = allTracks.filter((t) => t.source !== Track.Source.ScreenShare);
  const speakers = useSpeakingParticipants();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();

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

  const screen = screens[screens.length - 1];
  if (screen) {
    return (
      <div className="flex h-full min-w-0 flex-col gap-2">
        <motion.div key={`screen-${screen.participant.identity}`} className="min-h-0 min-w-0 flex-1" {...motionProps}>
          <ParticipantTile trackRef={screen} screen />
        </motion.div>
        <div className="jumpa-strip">
          {tracks.map((t) => (
            <div key={t.participant.identity}>
              <ParticipantTile trackRef={t} compact />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "speaker" && focus) {
    const others = tracks.filter((t) => t !== focus);
    return (
      <div className="flex h-full min-w-0 flex-col gap-2">
        <motion.div key={focus.participant.identity} className="min-h-0 min-w-0 flex-1" {...motionProps}>
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

  // Grid: tile berasio tetap (16:9 desktop, 4:5 mobile) yang muat di area.
  const gap = wide ? GRID_GAP_WIDE : GRID_GAP_NARROW;
  const fit = fitGrid(tracks.length, gridSize.w, gridSize.h, gap, wide ? 16 / 9 : 4 / 5, wide ? 6 : 2);
  const gridStyle: CSSProperties = fit
    ? { gap, gridTemplateColumns: `repeat(${fit.cols}, ${fit.tileW}px)`, gridAutoRows: `${fit.tileH}px` }
    : { gap, ["--jp-cols" as string]: gridColumns(tracks.length, wide) };
  return (
    <div ref={gridRef} className="jumpa-grid" data-fit={Boolean(fit)} style={gridStyle}>
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

function ControlBar({
  wide,
  layout,
  onLayout,
  onLeave,
  openPanel,
}: {
  wide: boolean;
  layout: Layout;
  onLayout: (l: Layout) => void;
  onLeave: () => void;
  openPanel: (p: PanelName) => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const permissions = useLocalParticipantPermissions();
  const { info, self, myHand, toggleHand, react, moderate, toast } = useJumpa();
  const [busy, setBusy] = useState<"mic" | "camera" | "screen" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  const [screenSupported, setScreenSupported] = useState(false);
  useEffect(() => setScreenSupported(supportsScreenShare()), []);
  const canScreen = screenSupported && Boolean(permissions?.canPublishSources?.some((s) => Number(s) === PROTO_SCREEN_SHARE));
  const isGuruHost = self.bcRole === "GURU" && self.roomRole !== "MEMBER";
  const canInvite = isGuruHost && info.kind !== "MURID";
  const canLock = (self.bcRole === "GURU" && self.roomRole !== "MEMBER") || (info.kind === "MURID" && self.roomRole === "HOST");
  const canEnd = (self.bcRole === "GURU" && self.roomRole === "HOST") || (info.kind === "MURID" && self.roomRole === "HOST");

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
  const toggleScreen = async () => {
    setBusy("screen");
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { audio: true, selfBrowserSurface: "exclude" });
    } catch {
      // Pengguna membatalkan dialog pilih layar — bukan error.
    } finally {
      setBusy(null);
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jumpa/${info.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const close = () => setMenuOpen(false);
  // Unmount LiveKitRoom (di JumpaApp) memutus koneksi & melepas kamera/mic.
  const leave = () => onLeave();

  return (
    <div className="relative pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pt-3 sm:px-6">
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
              onClick={close}
            />
            <motion.div
              role="menu"
              aria-label="Menu lainnya"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="jumpa-glass absolute inset-x-3 bottom-full z-30 mb-2 max-h-[70dvh] overflow-y-auto rounded-3xl p-2 sm:left-auto sm:right-6 sm:w-80"
            >
              <div className="flex justify-between gap-1 px-2 pb-2 pt-1" role="group" aria-label="Kirim reaksi">
                {(Object.keys(REACTION_ICONS) as JumpaReaction[]).map((r) => (
                  <button key={r} type="button" className="jumpa-react-btn" data-r={r} aria-label={`Reaksi ${REACTION_ICONS[r].label}`} onClick={() => react(r)}>
                    {REACTION_ICONS[r].icon(22)}
                  </button>
                ))}
              </div>
              <div className="my-1 h-px bg-[var(--jp-line)]" />
              {canScreen && !wide && (
                <button type="button" role="menuitem" className="jumpa-menu-item" disabled={busy === "screen"} onClick={() => { close(); void toggleScreen(); }}>
                  <MonitorUp size={20} className={isScreenShareEnabled ? "text-[var(--jp-accent)]" : undefined} />
                  {isScreenShareEnabled ? "Hentikan berbagi layar" : "Bagikan layar"}
                </button>
              )}
              {canInvite && (
                <button type="button" role="menuitem" className="jumpa-menu-item" onClick={() => { openPanel("invite"); close(); }}>
                  <UserPlus size={20} /> Undang peserta
                </button>
              )}
              <button type="button" role="menuitem" className="jumpa-menu-item" onClick={copyLink}>
                {copied ? <Check size={20} className="text-[var(--jp-accent)]" /> : <Link2 size={20} />}
                {copied ? "Tautan tersalin" : "Salin tautan ruang"}
              </button>
              {canLock && (
                <button
                  type="button"
                  role="menuitem"
                  className="jumpa-menu-item"
                  onClick={() => {
                    void moderate(info.isLocked ? "UNLOCK" : "LOCK");
                    close();
                  }}
                >
                  <Lock size={20} /> {info.isLocked ? "Buka kunci ruang" : "Kunci ruang"}
                </button>
              )}
              <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-text-3)]">Tata letak</p>
              <button type="button" role="menuitemradio" aria-checked={layout === "grid"} className="jumpa-menu-item" onClick={() => { onLayout("grid"); close(); }}>
                <LayoutGrid size={20} /> Grid — semua sama besar
                {layout === "grid" && <Check size={18} className="ml-auto" />}
              </button>
              <button type="button" role="menuitemradio" aria-checked={layout === "speaker"} className="jumpa-menu-item" onClick={() => { onLayout("speaker"); close(); }}>
                <Presentation size={20} /> Pembicara — fokus yang bicara
                {layout === "speaker" && <Check size={18} className="ml-auto" />}
              </button>
              <div className="my-1 h-px bg-[var(--jp-line)]" />
              <button type="button" role="menuitem" className="jumpa-menu-item" onClick={() => { openPanel("report"); close(); }}>
                <Flag size={20} /> Laporkan masalah
              </button>
              {canEnd && (
                <button
                  type="button"
                  role="menuitem"
                  className="jumpa-menu-item"
                  data-danger="true"
                  onClick={async () => {
                    close();
                    if (!window.confirm("Akhiri ruang untuk semua peserta?")) return;
                    const r = await moderate("END");
                    if (r.ok) toast("Ruang diakhiri.", "ok");
                  }}
                >
                  <PhoneOff size={20} /> Akhiri untuk semua
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.nav
        aria-label="Kontrol ruang"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="jumpa-glass jumpa-bar mx-auto flex w-full min-w-0 max-w-lg items-start justify-around rounded-[28px] px-1.5 py-2.5 sm:py-3"
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
        {canScreen && wide && (
          <div className="jumpa-ctl">
            <button type="button" className="jumpa-round" data-on={isScreenShareEnabled} aria-pressed={isScreenShareEnabled} aria-label={isScreenShareEnabled ? "Hentikan berbagi layar" : "Bagikan layar"} onClick={toggleScreen} disabled={busy === "screen"}>
              <MonitorUp size={24} />
            </button>
            <span className="jumpa-ctl-label">{isScreenShareEnabled ? "Berhenti" : "Layar"}</span>
          </div>
        )}
        <div className="jumpa-ctl">
          <button type="button" className="jumpa-round" data-on={myHand} data-tone="hand" aria-pressed={myHand} aria-label={myHand ? "Turunkan tangan" : "Angkat tangan"} onClick={toggleHand}>
            <motion.span animate={myHand && !reduceMotion ? { rotate: [0, -14, 10, -6, 0] } : { rotate: 0 }} transition={{ duration: 0.6 }} className="grid place-items-center">
              <Hand size={24} />
            </motion.span>
          </button>
          <span className="jumpa-ctl-label">Tangan</span>
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
