"use client";

/**
 * JUMPA — ruang panggilan (dimuat lazy oleh JumpaApp; satu-satunya modul
 * yang menarik livekit-client).
 *
 * Fase 3 (performa): tanpa framer-motion; detak hitung mundur, toast, dan
 * reaksi terisolasi di komponen kecil; Stage & tile di-memo; grid
 * berhalaman (HP 4, desktop 16) dan strip dibatasi sehingga jumlah <video>
 * yang dirender tetap kecil; adaptiveStream menjeda video yang tak terlihat.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useParticipants,
  useSpeakingParticipants,
  useSwipe,
  useTracks,
} from "@livekit/components-react";
import { ConnectionQuality, ConnectionState, DisconnectReason, RoomEvent, Track } from "livekit-client";
import {
  AudioWaveform,
  Check,
  ChevronLeft,
  ChevronRight,
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
  Settings2,
  Share2,
  Sparkles,
  ThumbsUp,
  UserPlus,
  Users,
  Video,
  VideoOff,
  WifiOff,
  X,
} from "lucide-react";
import type { JumpaReaction } from "@/lib/jumpa/signals";
import { JUMPA_UPGRADE_PROMPT_BEFORE_END_MIN, type JumpaTierView } from "@/lib/jumpa/tiers";
import ParticipantTile from "./ParticipantTile";
import { fitGrid, gridColumns, parseParticipantMeta } from "./format";
import { detectDevice, publishPolicy, type DeviceClass } from "./media-policy";
import { writeMediaPrefs, type JumpaMediaPrefs } from "./media-prefs";
import { backgroundById, backgroundImageFor } from "./backgrounds";
import { BackgroundProcessor } from "@livekit/track-processors";
import { BACKGROUND_ASSET_PATHS } from "./media-assets";
import { buildRoomOptions, MediaProvider, useMedia } from "./media-controller";
import { JumpaRoomProvider, useJumpa, type EndedReason, type JumpaRoomInfo, type JumpaSelf } from "./room-controller";
import { ChatPanel, InvitePanel, PanelFrame, PeoplePanel, ReportPanel, type PanelName } from "./RoomPanels";
import SettingsPanel from "./SettingsPanel";
import ConfirmDialog from "./ConfirmDialog";
import ShareSheet, { type ShareTarget } from "./ShareSheet";
import { CountdownChip, TierBadge, TimeLimitWatcher } from "./TierUi";

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

const GRID_GAP_WIDE = 14;
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
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches);
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
  tier: JumpaTierView;
  onLeave: (reason: LeaveReason, ended?: EndedReason | null) => void;
}

export default function JumpaRoomView(props: ViewProps) {
  const [deviceNote, setDeviceNote] = useState<string | null>(null);
  const [endedRef, setEndedRef] = useState<{ current: EndedReason | null } | null>(null);
  // Sekali per sesi: identitas opsi harus stabil (LiveKitRoom membuat Room baru bila berubah).
  const [device] = useState<DeviceClass>(() => detectDevice());
  const [options] = useState(() => buildRoomOptions(props.prefs, device, props.tier));
  const camOn = props.prefs.camera && !props.prefs.audioOnly;
  return (
    <LiveKitRoom
      serverUrl={props.serverUrl}
      token={props.token}
      connect
      video={camOn && !(props.info.mode === "WEBINAR" && props.self.roomRole === "MEMBER")}
      audio={props.prefs.mic && !(props.info.mode === "WEBINAR" && props.self.roomRole === "MEMBER")}
      options={options}
      onDisconnected={(reason) => {
        const ended = endedRef?.current ?? null;
        if (reason === DisconnectReason.PARTICIPANT_REMOVED) props.onLeave("removed");
        else if (reason === DisconnectReason.ROOM_DELETED || ended) props.onLeave("ended", ended);
        else if (reason === DisconnectReason.DUPLICATE_IDENTITY) props.onLeave("duplicate");
        else props.onLeave("disconnected");
      }}
      onMediaDeviceFailure={() => setDeviceNote("Kamera atau mikrofon tidak bisa dipakai. Periksa izin browser.")}
      className="flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden relative"

    >
      <JumpaRoomProvider initial={props.info} self={props.self}>
        <MediaProvider initial={props.prefs} device={device} tier={props.tier}>
          <EndedBridge onRef={setEndedRef} />
          <RoomShell {...props} deviceNote={deviceNote} clearDeviceNote={() => setDeviceNote(null)} />
        </MediaProvider>
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

function HeaderBtn({ label, onClick, active, badge, children }: { label: string; onClick: () => void; active: boolean; badge?: number; children: ReactNode }) {
  return (
    <button type="button" className="jumpa-head-btn" data-active={active} aria-label={label} aria-pressed={active} onClick={onClick}>
      {children}
      {badge ? <span key={badge} className="jumpa-count jumpa-in-pop">{badge > 9 ? "9+" : badge}</span> : null}
    </button>
  );
}

const QUALITY_TEXT: Record<ConnectionQuality, string> = {
  [ConnectionQuality.Excellent]: "Koneksi sangat baik",
  [ConnectionQuality.Good]: "Koneksi baik",
  [ConnectionQuality.Poor]: "Koneksi lemah",
  [ConnectionQuality.Lost]: "Koneksi terputus",
  [ConnectionQuality.Unknown]: "Mengukur koneksi",
};

/** Indikator kualitas koneksi sendiri (3 batang). */
function ConnectionBars() {
  const { quality, degraded, prefs } = useMedia();
  const level = quality === ConnectionQuality.Excellent ? 3 : quality === ConnectionQuality.Good ? 2 : quality === ConnectionQuality.Poor ? 1 : quality === ConnectionQuality.Lost ? 0 : 3;
  const text = `${QUALITY_TEXT[quality]}${degraded ? " · kualitas diturunkan" : ""}${prefs.audioOnly ? " · audio saja" : prefs.quality === "hemat" ? " · hemat data" : ""}`;
  return (
    <span className="jumpa-signal" data-level={level} role="img" aria-label={text} title={text}>
      <span /><span /><span />
      {(prefs.audioOnly || prefs.quality === "hemat" || degraded) && <span className="jumpa-signal-dot" aria-hidden />}
    </span>
  );
}

/** Toast terisolasi: perubahan toast tidak me-render ulang ruang. */
function Toasts() {
  const { toasts } = useJumpa();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="jumpa-toast jumpa-in-down" data-tone={t.tone}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Jumlah peserta: hanya berubah saat orang masuk/keluar. */
const COUNT_EVENTS = [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.ConnectionStateChanged];
function useParticipantCount(): number {
  return useParticipants({ updateOnlyOn: COUNT_EVENTS }).length;
}

// Status jaringan perangkat: Wi-Fi/data putus langsung terlihat, tanpa menunggu
// LiveKit sadar (ping bisa butuh >20 detik).
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

function RoomShell(props: ViewProps & { deviceNote: string | null; clearDeviceNote: () => void }) {
  const wide = useIsWide();
  const [layoutChoice, setLayoutChoice] = useState<Layout | null>(null);
  const layout: Layout = layoutChoice ?? (wide ? "grid" : "speaker");
  const count = useParticipantCount();
  const state = useConnectionState();
  // Putus singkat biasanya hanya memicu SignalReconnecting (resume), bukan
  // Reconnecting penuh — keduanya harus menampilkan banner (uji go-live 18 Okt).
  const online = useOnline();
  const reconnecting = !online || state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting;
  const { info, unread, hands, setChatVisible, self } = useJumpa();
  const { recv, tier } = useMedia();
  const [panel, setPanel] = useState<PanelName | null>(null);
  const handsCount = self.roomRole !== "MEMBER" ? hands.size : 0;
  const { onLeave } = props;

  useEffect(() => setChatVisible(panel === "chat"), [panel, setChatVisible]);
  const toggle = (p: PanelName) => setPanel((cur) => (cur === p ? null : p));
  const closePanel = useCallback(() => setPanel(null), []);
  const showPeople = useCallback(() => setPanel("people"), []);
  const timeUp = useCallback(() => onLeave("ended", "TIME_LIMIT"), [onLeave]);

  return (
    <>
      <header className="jumpa-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="jumpa-mark" aria-hidden>J</span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-[var(--jp-accent)]">
              <span className="jumpa-live-dot" role="img" aria-label="Berlangsung" />
              JUMPA
              {info.mode === "WEBINAR" && (
                <span className="rounded-full border border-[var(--jp-accent)]/30 bg-[var(--jp-accent)]/10 px-2 py-0.5 text-[9px] font-extrabold tracking-[.12em] text-[var(--jp-accent)]">
                  WEBINAR INTERAKTIF
                </span>
              )}
              <span className="hidden font-semibold normal-case tracking-normal text-[var(--jp-text-3)] sm:inline">dari BahasaCerdas</span>
              {info.isLocked && <Lock size={12} aria-label="Ruang terkunci" className="text-[var(--clr-warning)]" />}
            </p>
            <h1 className="flex min-w-0 items-center gap-2 text-[15px] font-bold sm:text-lg">
              <span className="truncate">{props.title}</span>
              <span className="hidden sm:inline-flex"><TierBadge tier={tier} compact /></span>
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <CountdownChip endsAt={info.endsAt} />
          <ConnectionBars />
          <HeaderBtn label="Obrolan" onClick={() => toggle("chat")} active={panel === "chat"} badge={unread}>
            <MessageSquare size={18} />
          </HeaderBtn>
          <HeaderBtn label={`Peserta (${count})`} onClick={() => toggle("people")} active={panel === "people"} badge={handsCount}>
            <Users size={18} />
            <span className="text-sm font-semibold">{count}</span>
          </HeaderBtn>
        </div>
      </header>

      <Toasts />

      {(reconnecting || state === ConnectionState.Connecting) && (
        <div role="status" className="jumpa-status jumpa-in-down">
          {reconnecting ? <WifiOff size={16} className="text-[var(--clr-warning)]" /> : <Loader2 size={16} className="animate-spin" />}
          {reconnecting ? "Jaringan terputus, menyambung ulang…" : "Menyambungkan ke ruang…"}
        </div>
      )}
      {props.deviceNote && (
        <button type="button" onClick={props.clearDeviceNote} className="jumpa-status jumpa-in-down text-[var(--clr-warning)]">
          {props.deviceNote} <X size={14} />
        </button>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 gap-3 pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] sm:px-6 lg:gap-4 lg:px-8 lg:pt-1">
        <section className="relative min-h-0 min-w-0 flex-1" aria-label="Video peserta">
          <Stage layout={layout} wide={wide} pageSize={recv.pageSize} stripMax={recv.stripMax} onShowPeople={showPeople} />
          <ReactionsLayer />
        </section>
        {panel && wide && (
          <PanelFrame key={panel} name={panel} wide onClose={closePanel}>
            <PanelBody panel={panel} setPanel={setPanel} />
          </PanelFrame>
        )}
      </div>
      {panel && !wide && (
        <PanelFrame key={panel} name={panel} wide={false} onClose={closePanel}>
          <PanelBody panel={panel} setPanel={setPanel} />
        </PanelFrame>
      )}

      <ControlBar wide={wide} layout={layout} onLayout={setLayoutChoice} onLeave={() => onLeave("left")} openPanel={setPanel} panel={panel} />
      <TimeLimitWatcher endsAt={info.endsAt} tier={tier} promptBeforeMin={JUMPA_UPGRADE_PROMPT_BEFORE_END_MIN} onTimeUp={timeUp} />
    </>
  );
}

function RoomSettings() {
  const { prefs, update, tier, degraded } = useMedia();
  return <SettingsPanel prefs={prefs} onChange={update} tier={tier} degraded={degraded} />;
}

function PanelBody({ panel, setPanel }: { panel: PanelName; setPanel: (p: PanelName | null) => void }) {
  if (panel === "chat") return <ChatPanel />;
  if (panel === "people") return <PeoplePanel onInvite={() => setPanel("invite")} />;
  if (panel === "invite") return <InvitePanel />;
  if (panel === "settings") return <RoomSettings />;
  return <ReportPanel onDone={() => setPanel(null)} />;
}

function ReactionsLayer() {
  const { reactions } = useJumpa();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {reactions.map((r) => (
        <div key={r.id} className="jumpa-reaction absolute bottom-4 flex flex-col items-center gap-1" style={{ left: `${r.x}%` }}>
          <span className="jumpa-reaction-bubble" data-r={r.r}>{REACTION_ICONS[r.r].icon(26)}</span>
          <span className="jumpa-reaction-name">{r.name}</span>
        </div>
      ))}
    </div>
  );
}

type TrackList = ReturnType<typeof useTracks>;

/**
 * Urutan strip yang stabil: peserta lama tetap di tempatnya, yang baru di
 * belakang; pembicara di luar jendela terlihat menggantikan slot terakhir
 * yang sedang diam. (Pengganti useVisualStableUpdate, yang melempar error
 * saat daftar berubah karena fokus berpindah.)
 */
function useStableStrip(tracks: TrackList, max: number, speakingKey: string): TrackList {
  const order = useRef<string[]>([]);
  return useMemo(() => {
    const byId = new Map(tracks.map((t) => [t.participant.identity, t]));
    const next = order.current.filter((id) => byId.has(id));
    for (const t of tracks) if (!next.includes(t.participant.identity)) next.push(t.participant.identity);
    for (let i = max; i < next.length; i++) {
      if (!byId.get(next[i])?.participant.isSpeaking) continue;
      let slot = -1;
      for (let j = max - 1; j >= 0; j--) if (!byId.get(next[j])?.participant.isSpeaking) { slot = j; break; }
      if (slot < 0) break;
      [next[slot], next[i]] = [next[i], next[slot]];
    }
    order.current = next;
    return next.map((id) => byId.get(id)!).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speakingKey memicu urut ulang saat pembicara berganti
  }, [tracks, max, speakingKey]);
}

/**
 * Grid berhalaman: urutan stabil (useStableStrip) dipotong per halaman.
 * Pembicara dari halaman lain naik ke halaman 1, seperti Meet/Zoom.
 * Tile di luar halaman tidak di-attach → adaptiveStream menjeda videonya.
 */
function usePager(pageSize: number, tracks: TrackList, speakingKey: string) {
  const ordered = useStableStrip(tracks, pageSize, speakingKey);
  const total = Math.max(1, Math.ceil(ordered.length / pageSize));
  const [want, setWant] = useState(1);
  const current = Math.min(want, total);
  const start = (current - 1) * pageSize;
  const visible = useMemo(() => ordered.slice(start, start + pageSize), [ordered, start, pageSize]);
  const nextPage = useCallback(() => setWant((p) => Math.min(p + 1, total)), [total]);
  const prevPage = useCallback(() => setWant((p) => Math.max(1, Math.min(p, total) - 1)), [total]);
  return { tracks: visible, currentPage: current, totalPageCount: total, nextPage, prevPage };
}

/** Strip terbatas + chip "+N" (sisanya di panel Peserta). */
function Strip({ tracks, max, speakingKey, onPick, onMore }: { tracks: TrackList; max: number; speakingKey: string; onPick?: (id: string) => void; onMore: () => void }) {
  // Pembicara aktif naik ke depan tanpa membuat tile lain melompat.
  const stable = useStableStrip(tracks, max, speakingKey);
  const shown = stable.slice(0, max);
  const hidden = tracks.length - shown.length;
  return (
    <div className="jumpa-strip" role="list">
      {shown.map((t) =>
        onPick ? (
          <button type="button" role="listitem" key={t.participant.identity} onClick={() => onPick(t.participant.identity)} aria-label={`Fokus ke ${t.participant.name || "peserta"}`}>
            <ParticipantTile trackRef={t} compact />
          </button>
        ) : (
          <div role="listitem" key={t.participant.identity}>
            <ParticipantTile trackRef={t} compact />
          </div>
        ),
      )}
      {hidden > 0 && (
        <button type="button" className="jumpa-strip-more" onClick={onMore} aria-label={`${hidden} peserta lain, buka daftar peserta`}>
          +{hidden}
          <span>lainnya</span>
        </button>
      )}
    </div>
  );
}

const CAMERA_AND_SCREEN = [
  { source: Track.Source.Camera, withPlaceholder: true },
  { source: Track.Source.ScreenShare, withPlaceholder: false },
] as const;

/** Kartu "menunggu peserta" saat kamu masih sendirian di ruang. */
function AloneCard() {
  const { info, self } = useJumpa();
  const [open, setOpen] = useState(false);
  return (
    <div className="jumpa-alone jumpa-in-up" role="status">
      <span className="jumpa-empty-icon jumpa-alone-icon !mb-0" aria-hidden><Users size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Menunggu peserta lain</p>
        <p className="whitespace-nowrap text-xs text-[var(--jp-text-3)]">Kode <span className="font-mono font-semibold text-[var(--jp-text-2)]">{info.code}</span></p>
      </div>
      <button type="button" className="jumpa-alone-btn" onClick={() => setOpen(true)}>
        <Share2 size={16} /> Bagikan
      </button>
      {open && <ShareSheet target={shareTargetOf(info, self)} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Data bagikan dari ruang; tautan 24 jam hanya untuk pemandu ruang guru. */
function shareTargetOf(info: JumpaRoomInfo, self: JumpaSelf & { roomRole: "HOST" | "COHOST" | "MEMBER" }): ShareTarget {
  return { code: info.code, title: info.title, kind: info.kind, canLink: ((info.kind === "GURU" && self.bcRole === "GURU") || (info.kind === "UMUM" && self.bcRole === "UMUM")) && self.roomRole !== "MEMBER" };
}

const Stage = memo(function Stage({ layout, wide, pageSize, stripMax, onShowPeople }: { layout: Layout; wide: boolean; pageSize: number; stripMax: number; onShowPeople: () => void }) {
  const allTracks = useTracks([...CAMERA_AND_SCREEN], { onlySubscribed: false });
  // Layar yang dibagikan selalu jadi fokus (paling baru), kamera di strip.
  const screens = useMemo(() => allTracks.filter((t) => t.source === Track.Source.ScreenShare), [allTracks]);
  const tracks = useMemo(() => allTracks.filter((t) => t.source !== Track.Source.ScreenShare), [allTracks]);
  const speakers = useSpeakingParticipants();
  const speakingKey = speakers.map((p) => p.identity).join("|");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();

  // Pembicara terakhir (selain diri sendiri) menjadi fokus layout Pembicara.
  useEffect(() => {
    const remote = speakers.find((p) => !p.isLocal);
    if (remote) setFocusId((cur) => (cur === remote.identity ? cur : remote.identity));
  }, [speakers]);

  const focus = useMemo(() => {
    if (tracks.length === 0) return null;
    const byId = focusId ? tracks.find((t) => t.participant.identity === focusId) : undefined;
    if (byId) return byId;
    const host = tracks.find((t) => !t.participant.isLocal && parseParticipantMeta(t.participant.metadata).roomRole === "HOST");
    return host ?? tracks.find((t) => !t.participant.isLocal) ?? tracks[0];
  }, [tracks, focusId]);

  const others = useMemo(() => (focus ? tracks.filter((t) => t !== focus) : tracks), [tracks, focus]);
  const page = usePager(pageSize, tracks, speakingKey);
  const swipeRef = useRef<HTMLDivElement | null>(null);
  useSwipe(swipeRef, { onLeftSwipe: page.nextPage, onRightSwipe: page.prevPage });

  const alone = tracks.length > 0 && tracks.every((t) => t.participant.isLocal);
  const screen = screens[screens.length - 1];
  if (alone && !screen) {
    return (
      <div className="relative h-full min-w-0">
        <ParticipantTile trackRef={tracks[0]} />
        <AloneCard />
      </div>
    );
  }
  if (screen) {
    return (
      <div className="flex h-full min-w-0 flex-col gap-2">
        <div key={`screen-${screen.participant.identity}`} className="jumpa-in-fade min-h-0 min-w-0 flex-1">
          <ParticipantTile trackRef={screen} screen />
        </div>
        <Strip speakingKey={speakingKey} tracks={tracks} max={stripMax} onMore={onShowPeople} />
      </div>
    );
  }

  if (layout === "speaker" && focus) {
    return (
      <div className="flex h-full min-w-0 flex-col gap-2">
        <div key={focus.participant.identity} className="jumpa-in-fade min-h-0 min-w-0 flex-1">
          <ParticipantTile trackRef={focus} />
        </div>
        {others.length > 0 && <Strip speakingKey={speakingKey} tracks={others} max={stripMax} onPick={setFocusId} onMore={onShowPeople} />}
      </div>
    );
  }

  // Grid berhalaman: tile berasio tetap (16:9 desktop, 4:5 mobile) yang muat di area.
  const visible = page.tracks;
  const gap = wide ? GRID_GAP_WIDE : GRID_GAP_NARROW;
  const fit = fitGrid(visible.length, gridSize.w, gridSize.h, gap, wide ? 16 / 9 : 4 / 5, wide ? 6 : 2);
  const gridStyle: CSSProperties = fit
    ? { gap, gridTemplateColumns: `repeat(${fit.cols}, ${fit.tileW}px)`, gridAutoRows: `${fit.tileH}px` }
    : { gap, ["--jp-cols" as string]: gridColumns(visible.length, wide) };
  return (
    <div ref={swipeRef} className="relative flex h-full min-w-0 flex-col">
      <div ref={gridRef} className="jumpa-grid min-h-0 flex-1" data-fit={Boolean(fit)} style={gridStyle}>
        {visible.map((t) => (
          <div key={t.participant.identity} className="min-h-0">
            <ParticipantTile trackRef={t} />
          </div>
        ))}
      </div>
      {page.totalPageCount > 1 && (
        <nav className="jumpa-pager" aria-label="Halaman peserta">
          <button type="button" onClick={page.prevPage} disabled={page.currentPage <= 1} aria-label="Halaman sebelumnya">
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            {page.currentPage}/{page.totalPageCount}
          </span>
          <button type="button" onClick={page.nextPage} disabled={page.currentPage >= page.totalPageCount} aria-label="Halaman berikutnya">
            <ChevronRight size={18} />
          </button>
        </nav>
      )}
    </div>
  );
});

/** Tombol mikrofon: cincin hijau saat kamu bicara (komponen sendiri supaya bar tidak ikut render). */
function MicKey({ on, busy, onToggle }: { on: boolean; busy: boolean; onToggle: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const speaking = useIsSpeaking(localParticipant);
  return (
    <div className="jumpa-ctl">
      <button type="button" className="jumpa-key" data-off={!on} data-speaking={on && speaking} aria-pressed={on} aria-label={on ? "Matikan mikrofon" : "Nyalakan mikrofon"} onClick={onToggle} disabled={busy}>
        {on ? <Mic size={22} /> : <MicOff size={22} />}
      </button>
      <span className="jumpa-ctl-label">{on ? "Mik" : "Mik mati"}</span>
    </div>
  );
}

function ControlBar({
  wide,
  layout,
  onLayout,
  onLeave,
  openPanel,
  panel,
}: {
  wide: boolean;
  layout: Layout;
  onLayout: (l: Layout) => void;
  onLeave: () => void;
  openPanel: (p: PanelName | null) => void;
  panel: PanelName | null;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const permissions = useLocalParticipantPermissions();
  const { info, self, myHand, toggleHand, react, moderate, toast } = useJumpa();
  const { prefs, update, device, tier } = useMedia();
  const [busy, setBusy] = useState<"mic" | "camera" | "screen" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [endAsk, setEndAsk] = useState(false);
  const [ending, setEnding] = useState(false);
  const cancelEnd = useCallback(() => setEndAsk(false), []);
  const moreRef = useRef<HTMLButtonElement>(null);
  const endFocus = useCallback(() => moreRef.current, []);
  const confirmEnd = async () => {
    setEnding(true);
    const r = await moderate("END");
    setEnding(false);
    setEndAsk(false);
    if (r.ok) toast("Ruang diakhiri.", "ok");
  };
  const [screenSupported, setScreenSupported] = useState(false);
  useEffect(() => setScreenSupported(supportsScreenShare()), []);
  const canScreen = screenSupported && Boolean(permissions?.canPublishSources?.some((s) => Number(s) === PROTO_SCREEN_SHARE));
  const stageBlocked = info.mode === "WEBINAR" && self.roomRole === "MEMBER" && permissions?.canPublish !== true;
  // Pemandu dewasa: guru di ruang sekolah, atau akun UMUM di ruang UMUM. Guru/murid
  // yang ikut ruang UMUM lewat tautan = peserta biasa (server tetap menegakkan izin).
  const adult = info.kind === "UMUM" ? self.bcRole === "UMUM" : self.bcRole === "GURU";
  const isGuruHost = adult && self.roomRole !== "MEMBER";
  const canInvite = isGuruHost && info.kind !== "MURID";
  const canLock = (adult && self.roomRole !== "MEMBER") || (info.kind === "MURID" && self.roomRole === "HOST");
  const canEnd = (adult && self.roomRole === "HOST") || (info.kind === "MURID" && self.roomRole === "HOST");

  const toggleMic = async () => {
    setBusy("mic");
    try {
      const next = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      writeMediaPrefs({ mic: next });
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
      // Menyalakan kamera = keluar dari mode audio saja.
      if (next && prefs.audioOnly) update({ audioOnly: false });
      await localParticipant.setCameraEnabled(next);
      writeMediaPrefs({ camera: next });
    } catch {
      // idem
    } finally {
      setBusy(null);
    }
  };
  const toggleScreen = async () => {
    setBusy("screen");
    try {
      const s = publishPolicy(prefs.quality, device, tier.maxCameraHeight, tier.maxScreenHeight).screen;
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
        audio: true,
        selfBrowserSurface: "exclude",
        resolution: { width: s.width, height: s.height, frameRate: s.fps },
        contentHint: "detail",
      });
    } catch {
      // Pengguna membatalkan dialog pilih layar — bukan error.
    } finally {
      setBusy(null);
    }
  };
  const close = () => setMenuOpen(false);

  // Terapkan virtual background atau blur ke track kamera lokal.
  useEffect(() => {
    if (!isCameraEnabled) return;
    let processor: any = null;
    (async () => {
      try {
        const track = localParticipant.getTrackPublication("camera" as any)?.track;
        if (!track || track.kind !== "video") return;
        const bg = backgroundById(prefs.background);
        const imageUrl = prefs.background === "custom" ? prefs.customBackgroundUrl : backgroundImageFor(bg, window.innerWidth);
        if (prefs.background === "blur") {
          processor = BackgroundProcessor({ mode: "background-blur", blurRadius: 15, assetPaths: BACKGROUND_ASSET_PATHS });
        } else if (imageUrl) {
          processor = BackgroundProcessor({ mode: "virtual-background", imagePath: imageUrl, assetPaths: BACKGROUND_ASSET_PATHS });
        } else {
          processor = BackgroundProcessor({ mode: "disabled", assetPaths: BACKGROUND_ASSET_PATHS });
        }
        await track.setProcessor(processor);
      } catch (e) {
        console.warn("Background processor failed", e);
      }
    })();
    return () => { processor?.destroy?.(); };
  }, [prefs.background, prefs.customBackgroundUrl, isCameraEnabled, localParticipant]);

  return (
    <div className="jumpa-dock-wrap">
      {shareOpen && <ShareSheet target={shareTargetOf(info, self)} onClose={() => setShareOpen(false)} />}
      {endAsk && (
        <ConfirmDialog
          title="Akhiri ruang untuk semua?"
          body="Semua peserta akan keluar dari ruang."
          confirmLabel="Akhiri"
          icon={<PhoneOff size={22} />}
          busy={ending}
          onConfirm={() => void confirmEnd()}
          onCancel={cancelEnd}
          returnFocus={endFocus}
        />
      )}
      {menuOpen && (
        <>
          <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-20 cursor-default" onClick={close} />
          <div role="menu" aria-label="Menu lainnya" className="jumpa-menu jumpa-in-up">
            <div className="flex justify-between gap-1 px-2 pb-2 pt-1" role="group" aria-label="Kirim reaksi">
              {(Object.keys(REACTION_ICONS) as JumpaReaction[]).map((r) => (
                <button key={r} type="button" className="jumpa-react-btn" data-r={r} aria-label={`Reaksi ${REACTION_ICONS[r].label}`} onClick={() => react(r)}>
                  {REACTION_ICONS[r].icon(22)}
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-[var(--jp-line)]" />
            {!wide && (
              <button type="button" role="menuitem" className="jumpa-menu-item" onClick={() => { openPanel("settings"); close(); }}>
                <Settings2 size={20} /> Pengaturan
              </button>
            )}
            <button type="button" role="menuitemcheckbox" aria-checked={prefs.audioOnly} className="jumpa-menu-item" onClick={() => { update({ audioOnly: !prefs.audioOnly }); close(); }}>
              <AudioWaveform size={20} /> Mode audio saja
              {prefs.audioOnly && <Check size={18} className="ml-auto" />}
            </button>
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
            <button type="button" role="menuitem" className="jumpa-menu-item" onClick={() => { setShareOpen(true); close(); }}>
              <Share2 size={20} /> Bagikan ruang
            </button>
            {canLock && (
              <button type="button" role="menuitem" className="jumpa-menu-item" onClick={() => { void moderate(info.isLocked ? "UNLOCK" : "LOCK"); close(); }}>
                <Lock size={20} /> {info.isLocked ? "Buka kunci ruang" : "Kunci ruang"}
              </button>
            )}
            <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-text-3)]">Tata letak</p>
            <button type="button" role="menuitemradio" aria-checked={layout === "grid"} className="jumpa-menu-item" onClick={() => { onLayout("grid"); close(); }}>
              <LayoutGrid size={20} /> Grid, semua sama besar
              {layout === "grid" && <Check size={18} className="ml-auto" />}
            </button>
            <button type="button" role="menuitemradio" aria-checked={layout === "speaker"} className="jumpa-menu-item" onClick={() => { onLayout("speaker"); close(); }}>
              <Presentation size={20} /> Pembicara, fokus yang bicara
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
                onClick={() => {
                  close();
                  setEndAsk(true);
                }}
              >
                <PhoneOff size={20} /> Akhiri untuk semua
              </button>
            )}
          </div>
        </>
      )}

      {stageBlocked && (
        <p role="status" className="mx-auto mb-2 max-w-xl rounded-xl border border-[var(--jp-accent)]/30 bg-[var(--jp-accent)]/10 px-4 py-2 text-center text-xs font-semibold text-[var(--jp-text-2)]">
          Kamera dan mikrofon terkunci. Angkat tangan untuk meminta izin berbicara dari pemandu.
        </p>
      )}
      <nav aria-label="Kontrol ruang" className="jumpa-dock jumpa-in-up">
        <div className="jumpa-dock-group">
          <MicKey on={isMicrophoneEnabled} busy={busy === "mic" || stageBlocked} onToggle={toggleMic} />
          <div className="jumpa-ctl">
            <button type="button" className="jumpa-key" data-off={!isCameraEnabled} aria-pressed={isCameraEnabled} aria-label={isCameraEnabled ? "Matikan kamera" : "Nyalakan kamera"} onClick={toggleCamera} disabled={busy === "camera" || stageBlocked}>
              {isCameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
            <span className="jumpa-ctl-label">{isCameraEnabled ? "Kamera" : prefs.audioOnly ? "Audio saja" : "Kamera mati"}</span>
          </div>
        </div>
        {wide && <span className="jumpa-dock-sep" aria-hidden />}
        <div className="jumpa-dock-group">
          {canScreen && wide && (
            <div className="jumpa-ctl">
              <button type="button" className="jumpa-key" data-on={isScreenShareEnabled} aria-pressed={isScreenShareEnabled} aria-label={isScreenShareEnabled ? "Hentikan berbagi layar" : "Bagikan layar"} onClick={toggleScreen} disabled={busy === "screen"}>
                <MonitorUp size={22} />
              </button>
              <span className="jumpa-ctl-label">{isScreenShareEnabled ? "Berhenti" : "Layar"}</span>
            </div>
          )}
          <div className="jumpa-ctl">
            <button type="button" className="jumpa-key" data-on={myHand} data-tone="hand" aria-pressed={myHand} aria-label={myHand ? "Turunkan tangan" : "Angkat tangan"} onClick={toggleHand}>
              <span className="grid place-items-center" data-wave={myHand}>
                <Hand size={22} />
              </span>
            </button>
            <span className="jumpa-ctl-label">Tangan</span>
          </div>
          {wide && (
            <div className="jumpa-ctl">
              <button type="button" className="jumpa-key" data-on={panel === "settings"} aria-pressed={panel === "settings"} aria-label="Pengaturan" onClick={() => openPanel(panel === "settings" ? null : "settings")}>
                <Settings2 size={22} />
              </button>
              <span className="jumpa-ctl-label">Pengaturan</span>
            </div>
          )}
          <div className="jumpa-ctl">
            <button ref={moreRef} type="button" className="jumpa-key" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Lainnya" onClick={() => setMenuOpen((v) => !v)}>
              <MoreHorizontal size={22} />
            </button>
            <span className="jumpa-ctl-label">Lainnya</span>
          </div>
        </div>
        {wide && <span className="jumpa-dock-sep" aria-hidden />}
        <div className="jumpa-ctl jumpa-ctl-leave">
          {/* Di ponsel, "Akhiri untuk semua" ada di menu Lainnya agar dock muat 360px. */}
          {canEnd && wide && (
            <button
              type="button"
              className="jumpa-key"
              data-variant="leave"
              aria-label="Akhiri ruang untuk semua"
              onClick={() => setEndAsk(true)}
            >
              <PhoneOff size={22} />
              {wide && <span className="jumpa-leave-text">Akhiri</span>}
            </button>
          )}
          <button type="button" className="jumpa-key" data-variant="leave" aria-label="Keluar dari ruang" onClick={onLeave}>
            <PhoneOff size={22} />
            {wide && <span className="jumpa-leave-text">Keluar</span>}
          </button>
          <span className="jumpa-ctl-label">Keluar</span>
        </div>
      </nav>
    </div>
  );
}
