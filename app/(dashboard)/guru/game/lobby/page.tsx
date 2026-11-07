"use client";

import Link from "next/link";
import GameLobby from "@/components/game/GameLobby";
import { MULTIPLAYER_ENABLED } from "@/lib/features";

/**
 * Legacy entrypoint. Never generate client-only room codes: they are not
 * registered with the game server and cannot be joined by other players.
 * The shared GameLobby uses the actual socket-backed room workflow.
 */
export default function GuruGameLobbyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/guru/game" className="text-sm font-semibold text-emerald-700 hover:underline">
          Kembali ke menu gim
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">Gim bersama murid</h1>
          <p className="mt-2 text-sm text-slate-600">
            Buat ruang permainan melalui layanan gim yang terhubung ke server.
          </p>
          <Link href="/guru/game/main-bersama" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
            Buka Main Bersama
          </Link>
        </div>
        {MULTIPLAYER_ENABLED && <GameLobby isHost role="GURU" />}
        {!MULTIPLAYER_ENABLED && (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Mode gim real-time belum diaktifkan. Gunakan Main Bersama untuk membuat sesi kelas.
          </p>
        )}
      </div>
    </main>
  );
}
