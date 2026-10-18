"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, RotateCcw } from "lucide-react";
import type { EndedReason, JumpaRoomInfo, JumpaSelf } from "./room-controller";
import type { LeaveReason } from "./JumpaRoomView";
import JumpaLobby from "./JumpaLobby";
import type { JumpaMediaPrefs } from "./media-prefs";

// LiveKit hanya jalan di browser; jangan ikut SSR.
const JumpaRoomView = dynamic(() => import("./JumpaRoomView"), {
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
  dashboardHref: string;
  /** Token tautan undangan guru (?u=), diteruskan ke API token. */
  inviteToken?: string | null;
}

const ENDED_TEXT: Record<EndedReason, string> = {
  HOST: "Host mengakhiri ruang ini.",
  TIME_LIMIT: "Waktu ruang sudah habis.",
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
  | { name: "room"; token: string; serverUrl: string; prefs: JumpaMediaPrefs; info: JumpaRoomInfo; self: JumpaSelf }
  | { name: "left"; reason: LeaveReason; ended?: EndedReason | null };

export default function JumpaApp(props: JumpaAppProps) {
  const [phase, setPhase] = useState<Phase>({ name: "lobby" });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const phaseRef = useRef<Phase["name"]>("lobby");

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
        } | null;
        if (!res.ok || !body?.token || !body.serverUrl || !body.self || !body.room) {
          setJoinError(body?.error ?? "Gagal masuk ke ruang. Coba lagi.");
          return;
        }
        phaseRef.current = "room";
        setPhase({ name: "room", token: body.token, serverUrl: body.serverUrl, prefs, info: body.room, self: body.self });
      } catch {
        setJoinError("Koneksi bermasalah. Periksa internet lalu coba lagi.");
      } finally {
        setJoining(false);
      }
    },
    [props.code, props.inviteToken],
  );

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
        onLeave={handleLeave}
      />
    );
  }

  if (phase.name === "left") {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="jumpa-glass w-full max-w-sm rounded-3xl p-6 text-center"
        >
          <h1 className="text-xl font-extrabold">{LEFT_TITLE[phase.reason]}</h1>
          <p className="mt-2 text-sm text-[var(--jp-text-2)]">
            {phase.reason === "ended" ? ENDED_TEXT[phase.ended ?? "HOST"] : phase.reason === "removed" ? "Host mengeluarkanmu dari ruang ini." : props.title}
          </p>
          <div className="mt-6 flex flex-col gap-3">
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
        </motion.div>
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
      joining={joining}
      joinError={joinError}
      onJoin={join}
    />
  );
}
