"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, RotateCcw } from "lucide-react";
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
}

type Phase =
  | { name: "lobby" }
  | { name: "room"; token: string; serverUrl: string; prefs: JumpaMediaPrefs }
  | { name: "left"; reason: "left" | "disconnected" };

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
        const res = await fetch(`/api/jumpa/rooms/${encodeURIComponent(props.code)}/token`, { method: "POST" });
        const body = (await res.json().catch(() => null)) as { token?: string; serverUrl?: string; error?: string } | null;
        if (!res.ok || !body?.token || !body.serverUrl) {
          setJoinError(body?.error ?? "Gagal masuk ke ruang. Coba lagi.");
          return;
        }
        phaseRef.current = "room";
        setPhase({ name: "room", token: body.token, serverUrl: body.serverUrl, prefs });
      } catch {
        setJoinError("Koneksi bermasalah. Periksa internet lalu coba lagi.");
      } finally {
        setJoining(false);
      }
    },
    [props.code],
  );

  const handleLeave = useCallback((reason: "left" | "disconnected") => {
    // Keluar manual meng-unmount room → onDisconnected bisa menyusul; abaikan.
    if (phaseRef.current !== "room") return;
    phaseRef.current = "left";
    setPhase({ name: "left", reason });
  }, []);

  if (phase.name === "room") {
    return (
      <JumpaRoomView
        serverUrl={phase.serverUrl}
        token={phase.token}
        title={props.title}
        code={props.code}
        prefs={phase.prefs}
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
          <h1 className="text-xl font-extrabold">{phase.reason === "left" ? "Kamu sudah keluar" : "Koneksi ke ruang terputus"}</h1>
          <p className="mt-2 text-sm text-[var(--jp-text-2)]">{props.title}</p>
          <div className="mt-6 flex flex-col gap-3">
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
