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
import { createLocalStoragePersistence } from "../core/persistence";
import { RPGGameHUD } from "./RPGGameHUD";
import { RPGBattleLearning } from "./RPGBattleLearning";
import { RPGBattle } from "./RPGBattle";
import { resolveBattleView, type BattleViewModel } from "./battle-view";
import { getCanonicalMap } from "../data/world-maps";
import type { LearningChallenge } from "../learning/rpg-challenge";
import type { SoalLike } from "../learning/rpg-challenge";

interface RPGGameProps {
  /** Player ID from session. */
  playerId: string;
  /** Player display name. */
  playerName: string;
  /** Canonical start map (P1.9C slice defaults to Desa Suryakerta). */
  mapId?: string;
}

/** Extended engine type with input source setter. */
interface RPGEngineWithInput extends RPGEngine {
  _setInputSource: (source: ReturnType<typeof createKeyboardInputSource>) => void;
}

export function RPGGame({ playerId, playerName, mapId = "map.desa" }: RPGGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RPGEngineWithInput | null>(null);
  const keyboardRef = useRef<ReturnType<typeof createKeyboardInputSource> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  // P1.9A learning slice — read-only snapshots from the engine (same poll).
  // Challenge is client-safe (answer stripped server-side); feedback is the
  // retained {correct} flag. No battle truth duplicated here.
  const [learning, setLearning] = useState<{
    inBattle: boolean;
    status?: "PENDING" | "RESOLVED";
    challenge: LearningChallenge | null;
    feedback: { correct: boolean } | null;
  }>({ inBattle: false, challenge: null, feedback: null });

  const [battleView, setBattleView] = useState<BattleViewModel | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // P1.9C slice wiring (all read-only until the engine validates):
    // - restore authoritative slices from the persistence boundary,
    // - fetch the canonical question pool for learning encounters,
    // - save on every battle close (victory/defeat/flee).
    const persist = createLocalStoragePersistence(playerId);
    const saved = persist.load();

    let pool: SoalLike[] = [];
    let cancelled = false;

    async function boot() {
      const host = containerRef.current;
      if (!host || cancelled) return;
      try {
        const res = await fetch("/api/rpg/pool?count=20");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.questions)) pool = data.questions;
        }
      } catch {
        pool = [];
      }
      if (cancelled || !containerRef.current) return;

      // Create engine
      const engine = createEngine({
        container: host,
        playerId,
        playerName,
        mapId: saved && getCanonicalMap(saved.world.mapId) ? saved.world.mapId : mapId,
        initialPlayer: saved
          ? {
              stats: saved.player.stats,
              progression: saved.player.progression,
              inventory: saved.player.inventory,
              equipment: saved.player.equipment,
              position: saved.player.position,
              facing: saved.player.facing,
            }
          : undefined,
        flags: saved?.flags,
        openedChests: saved?.openedChests,
        deadBossIds: saved?.deadBossIds,
        gold: saved?.gold,
        goldLedger: saved?.goldLedger,
        equipmentIntents: saved?.equipmentIntents,
        quest: saved?.quest,
        pickedGe: saved?.pickedGe,
        learning: pool.length > 0 ? { pool } : undefined,
      }) as RPGEngineWithInput;

      // Create and attach keyboard input
      const keyboard = createKeyboardInputSource(playerId);
      keyboard.attach();
      engine._setInputSource(keyboard);

      engineRef.current = engine;
      keyboardRef.current = keyboard;

      // Persist on every battle close (authoritative snapshot boundary).
      const offBattleEnd = engine.on("BATTLE_END", () => {
        engine.saveGame(persist);
      });

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
        const battle = engine.getBattle();
        setLearning({
          inBattle: battle !== null,
          status: battle?.learning?.status,
          challenge: engine.getLearningChallenge(),
          feedback: engine.getLearningFeedback(),
        });
        setBattleView(
          resolveBattleView({
            battle,
            playerLevel: state.player.progression.level,
            inventory: state.player.inventory.items,
          }),
        );
      }, 100); // 10 Hz HUD update

      // Cleanup on unmount
      cleanupRef.current = () => {
        clearInterval(hudInterval);
        offBattleEnd();
        keyboard.detach();
        engine.destroy();
        engineRef.current = null;
        keyboardRef.current = null;
      };
    }

    void boot();

    // Cleanup on unmount
    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [playerId, playerName, mapId]);

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

      {/* P1.9C battle panel — snapshot display + intent callbacks.
          Mounted only during battle; the world canvas stays behind it. */}
      {battleView ? (
        <RPGBattle
          battle={battleView}
          onAttack={(skillId) => {
            const e = engineRef.current;
            if (!e) return;
            if (skillId === "basic") e.attackBasic();
            else e.attackWithSkill(skillId);
          }}
          onUseItem={(itemId) => engineRef.current?.useItem(itemId)}
          onFlee={() => engineRef.current?.fleeBattle()}
        />
      ) : null}

      {/* P1.9A battle learning slice — overlay over the live battle canvas.
          Handlers go through engine pipeline entries (same validation as
          input commands); presentation only here. */}
      <RPGBattleLearning
        inBattle={learning.inBattle}
        learningStatus={learning.status}
        challenge={learning.challenge}
        feedback={learning.feedback}
        onAnswer={(answer) => engineRef.current?.submitLearningAnswer(answer)}
        onAttack={() => engineRef.current?.attackBasic()}
      />

      {/* Mobile touch hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden">
        <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
          Gunakan tombol di layar untuk bergerak
        </div>
      </div>
    </div>
  );
}
