/**
 * RPG Play Client — Pendekar Suryakerta: Legenda Nusantara (UNPUBLISHED).
 *
 * Client murni hasil pindahan verbatim dari page.tsx. TIDAK ada logika
 * akses di sini — akses dijaga di page.tsx (server). File ini hanya
 * dirender bila guard server mengizinkan.
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RPGGame } from "@/src/game/rpg/ui/RPGGame";

interface RpgClientProps {
  /** Server-resolved Prisma user identity; never supplied by browser storage. */
  playerId: string;
  playerName: string;
}

export default function RpgClient({ playerId, playerName }: RpgClientProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.push("/arena/game");
  }, [router]);

  return (
    <div className="game-env game-env-rpg game-fullscreen relative">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="game-back-btn fixed top-3 left-3 z-[70]"
        aria-label="Kembali ke Game Hub"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* RPG Game Canvas */}
      <RPGGame playerId={playerId} playerName={playerName} />
    </div>
  );
}
