"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Crown, Loader2, RotateCcw } from "lucide-react";
import { JUMPA_TIERS, type JumpaTierView } from "@/lib/jumpa/tiers";
import type { EndedReason, JumpaRoomInfo, JumpaSelf } from "./room-controller";
import type { LeaveReason } from "./JumpaRoomView";
import JumpaLobby from "./JumpaLobby";
import type { ShareTarget } from "./ShareSheet";
import PostMeeting from "./MeetingSummary";
import { DEFAULT_MEDIA_PREFS, type JumpaMediaPrefs } from "./media-prefs";

// LiveKit hanya jalan di browser; jangan ikut SSR. Chunk ini (~170 KB gzip)
// TIDAK ikut halaman lain: hanya diunduh di /jumpa/[code], dan dipanaskan
// saat lobby sudah tenang (requestIdleCallback) supaya "Gabung" instan.
const loadRoomView = () => import("./JumpaRoomView");
const JumpaRoomView = dynamic(loadRoomView, {
  ssr: false,
  loading: () => (
    <div className="grid h-[100dvh] place-items-center">
      <Loader2 className="animate-spin text-[var(--jp-accent)]" size={36} aria-label="Memuat ruang" />
    </div>
  ),
});

export interface JumpaAppProps {
  code: string;
  title: string;
  subtitle: string | null;
  displayName: string;
  bcRole: "GURU" | "MURID";
  canJoin: boolean;
  denyMessage: string | null;
  denyCode?: string | null;
  scheduledAt?: string | null;
  share?: ShareTarget | null;
  dashboardHref: string;
  /** Token tautan undangan guru (?u=), diteruskan ke API token. */
  inviteToken?: string | null;
  /** Fase 3: paket ruang (dihitung server). */
  tier: JumpaTierView;
}

const ENDED_TEXT: Record<EndedReason, string> = {
  HOST: "Pemandu mengakhiri ruang ini.",
  TIME_LIMIT: "Batas waktu ruang tercapai.",
  EMPTY: "Ruang ditutup karena kosong.",
  STALE: "Ruang ditutup otomatis.",
};

const LEFT_TITLE: Record<LeaveReason, string> = {
  left: "Kamu sudah keluar",
  disconnected: "Koneksi ke ruang terputus",
  removed: "Kamu dikeluarkan dari ruang",
  ended: "Ruang sudah berakhir",
  duplicate: "Kamu bergabung dari perangkat lain",
};

type Phase =
  | { name: "lobby" }
  | { name: "room"; token: string; serverUrl: string; prefs: JumpaMediaPrefs; info: JumpaRoomInfo; self: JumpaSelf; tier: JumpaTierView }
  | { name: "left"; reason: LeaveReason; ended?: EndedReason | null };

export default function JumpaApp(props: JumpaAppProps) {
  const [phase, setPhase] = useState<Phase>({ name: "lobby" });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const phaseRef = useRef<Phase["name"]>("lobby");

  // Panaskan chunk ruang setelah lobby tampil (tidak menghambat render awal).
  useEffect(() => {
    if (!props.canJoin) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => void loadRoomView().catch(() => undefined), { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => void loadRoomView().catch(() => undefined), 2500);
    return () => clearTimeout(t);
  }, [props.canJoin]);

  const join = useCallback(
    async (prefs: JumpaMediaPrefs) => {
      setJoining(true);
      setJoinError(null);
      try {
        const res = await fetch(`/api/jumpa/rooms/${encodeURIComponent(props.code)}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(props.inviteToken ? { invite: props.inviteToken } : {}),
        });
        const body = (await res.json().catch(() => null)) as {
          token?: string;
          serverUrl?: string;
          error?: string;
          self?: JumpaSelf;
          room?: JumpaRoomInfo;
          tier?: JumpaTierView;
        } | null;
        if (!res.ok || !body?.token || !body.serverUrl || !body.self || !body.room) {
          setJoinError(body?.error ?? "Gagal masuk ke ruang. Coba lagi.");
          return;
        }
        phaseRef.current = "room";
        setPhase({ name: "room", token: body.token, serverUrl: body.serverUrl, prefs, info: body.room, self: body.self, tier: body.tier ?? props.tier });
      } catch {
        setJoinError("Koneksi bermasalah. Periksa internet lalu coba lagi.");
      } finally {
        setJoining(false);
      }
    },
    [props.code, props.inviteToken, props.tier],
  );

  // Auto-join jika datang dari tautan undangan — sekali saja. Bila gagal
  // (mis. ruang penuh), pesan galat tampil di lobi; jangan mengulang terus.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (autoJoined.current) return;
    if (props.inviteToken && props.canJoin && phase.name === "lobby" && !joining) {
      autoJoined.current = true;
      void join(DEFAULT_MEDIA_PREFS);
    }
  }, [props.inviteToken, props.canJoin, phase.name, joining, join]);

  const handleLeave = useCallback((reason: LeaveReason, ended?: EndedReason | null) => {
    // Keluar manual meng-unmount room → onDisconnected bisa menyusul; abaikan.
    if (phaseRef.current !== "room") return;
    phaseRef.current = "left";
    setPhase({ name: "left", reason, ended });
  }, []);

  if (phase.name === "room") {
    return (
      <JumpaRoomView
        serverUrl={phase.serverUrl}
        token={phase.token}
        title={props.title}
        code={props.code}
        prefs={phase.prefs}
        info={phase.info}
        self={phase.self}
        tier={phase.tier}
        onLeave={handleLeave}
      />
    );
  }

  if (phase.name === "left" && (phase.reason === "left" || phase.reason === "ended")) {
    const timeUp = phase.reason === "ended" && phase.ended === "TIME_LIMIT";
    const upsell = timeUp && props.tier.canUpgrade && props.tier.upgradeUrl;
    return (
      <main className="mx-auto grid min-h-[100dvh] w-full max-w-md place-items-center px-4 py-8">
        <PostMeeting
          code={props.code}
          heading={phase.reason === "ended" ? "JUMPA selesai" : "Kamu sudah keluar"}
          note={phase.reason === "ended" ? ENDED_TEXT[phase.ended ?? "HOST"].replace(/\.$/, "") : null}
          fallbackHref={props.dashboardHref}
          extra={
            <>
              {upsell && (
                <a href={props.tier.upgradeUrl!} className="jumpa-primary jumpa-primary-premium w-full">
                  <Crown size={18} /> Premium: {JUMPA_TIERS.PREMIUM.rooms.KELAS.maxDurationMin} menit
                </a>
              )}
              {phase.reason === "left" && (
                <button type="button" className="jumpa-ghost w-full" onClick={() => { phaseRef.current = "lobby"; setPhase({ name: "lobby" }); }}>
                  <RotateCcw size={16} /> Gabung lagi
                </button>
              )}
            </>
          }
        />
      </main>
    );
  }

  if (phase.name === "left") {
    const timeUp = phase.reason === "ended" && phase.ended === "TIME_LIMIT";
    const upsell = timeUp && props.tier.canUpgrade && props.tier.upgradeUrl;
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4">
        <div className="jumpa-card jumpa-in-up w-full max-w-sm p-6 text-center">
          <span className="jumpa-mark mx-auto mb-4" aria-hidden>J</span>
          <h1 className="text-xl font-extrabold">{LEFT_TITLE[phase.reason]}</h1>
          <p className="mt-2 text-sm text-[var(--jp-text-2)]">
            {phase.reason === "ended" ? ENDED_TEXT[phase.ended ?? "HOST"] : props.title}
          </p>
          {upsell && (
            <div className="jumpa-plan-card mt-4 text-left">
              <p className="text-sm">Premium: kelas {JUMPA_TIERS.PREMIUM.rooms.KELAS.maxDurationMin} menit · {JUMPA_TIERS.PREMIUM.rooms.KELAS.maxParticipants} peserta.</p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3">
            {upsell && (
              <a href={props.tier.upgradeUrl!} className="jumpa-primary jumpa-primary-premium">
                <Crown size={18} /> Lihat Premium
              </a>
            )}
            {phase.reason !== "removed" && phase.reason !== "ended" && (
              <button
                type="button"
                className="jumpa-primary"
                onClick={() => {
                  phaseRef.current = "lobby";
                  setPhase({ name: "lobby" });
                }}
              >
                <RotateCcw size={18} /> Gabung lagi
              </button>
            )}
            <Link href={props.dashboardHref} className="jumpa-ghost">Kembali ke dasbor</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <JumpaLobby
      title={props.title}
      subtitle={props.subtitle}
      displayName={props.displayName}
      roleLabel={props.bcRole}
      canJoin={props.canJoin}
      denyMessage={props.denyMessage}
      denyCode={props.denyCode}
      scheduledAt={props.scheduledAt}
      share={props.share}
      joining={joining}
      joinError={joinError}
      onJoin={join}
      tier={props.tier}
    />
  );
}
