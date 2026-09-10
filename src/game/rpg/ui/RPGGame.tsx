/**
 * RPGGame React component — composition layer for the RPG.
 *
 * This component:
 * - Creates the game engine on mount
 * - Manages keyboard input lifecycle
 * - Provides HUD overlay
 * - Cleans up on unmount
 *
 * IMPORTANT: React is NOT the per-frame game state.
 * React only manages:
 * - Engine creation/destruction
 * - HUD display (read-only from game state)
 * - Touch controls (future)
 *
 * The game loop runs independently of React renders.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createEngine, type RPGEngine } from "../core/game-engine";
import { createKeyboardInputSource } from "../core/keyboard-input";
import { RPGGameHUD } from "./RPGGameHUD";

interface RPGGameProps {
  /** Player ID from session. */
  playerId: string;
  /** Player display name. */
  playerName: string;
}

/** Extended engine type with input source setter. */
interface RPGEngineWithInput extends RPGEngine {
  _setInputSource: (source: ReturnType<typeof createKeyboardInputSource>) => void;
}

export function RPGGame({ playerId, playerName }: RPGGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RPGEngineWithInput | null>(null);
  const keyboardRef = useRef<ReturnType<typeof createKeyboardInputSource> | null>(null);

  // HUD state — updated periodically, NOT every frame
  const [hudState, setHudState] = useState<{
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    xp: number;
    xpToNext: number;
    mapName: string;
  } | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create engine
    const engine = createEngine({
      container,
      playerId,
      playerName,
    }) as RPGEngineWithInput;

    // Create and attach keyboard input
    const keyboard = createKeyboardInputSource(playerId);
    keyboard.attach();
    engine._setInputSource(keyboard);

    engineRef.current = engine;
    keyboardRef.current = keyboard;

    // Update HUD periodically (not every frame)
    const hudInterval = setInterval(() => {
      const state = engine.getState();
      setHudState({
        name: state.player.name,
        level: state.player.progression.level,
        hp: state.player.stats.hp,
        maxHp: state.player.stats.maxHp,
        xp: state.player.progression.xp,
        xpToNext: state.player.progression.xpToNextLevel,
        mapName: state.world.mapId,
      });
    }, 100); // 10 Hz HUD update

    // Cleanup on unmount
    return () => {
      clearInterval(hudInterval);
      keyboard.detach();
      engine.destroy();
      engineRef.current = null;
      keyboardRef.current = null;
    };
  }, [playerId, playerName]);

  return (
    <div className="relative w-full h-full">
      {/* Canvas container — fills parent */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: "none" }}
      />

      {/* HUD overlay — reads from game state, doesn't mutate */}
      {hudState && (
        <RPGGameHUD
          name={hudState.name}
          level={hudState.level}
          hp={hudState.hp}
          maxHp={hudState.maxHp}
          xp={hudState.xp}
          xpToNext={hudState.xpToNext}
          mapName={hudState.mapName}
        />
      )}

      {/* Mobile touch hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden">
        <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
          Gunakan tombol di layar untuk bergerak
        </div>
      </div>
    </div>
  );
}
