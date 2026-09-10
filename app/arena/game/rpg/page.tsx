/**
 * RPG Game Route — Pendekar Suryakerta: Legenda Nusantara
 *
 * Entry point for the RPG game. This page:
 * - Gets user session
 * - Renders the RPGGame component
 * - Provides fullscreen game environment
 *
 * Follows the same pattern as Kuis Tempur and other Arena games.
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RPGGame } from "@/src/game/rpg/ui/RPGGame";

/** Hardcoded for now — will come from session/auth later. */
const DEMO_PLAYER_ID = "player.local";
const DEMO_PLAYER_NAME = "Pendekar";

export default function RPGPage() {
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
      <RPGGame playerId={DEMO_PLAYER_ID} playerName={DEMO_PLAYER_NAME} />
    </div>
  );
}
