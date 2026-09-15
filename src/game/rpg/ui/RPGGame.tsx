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
import type { DialogueSession } from "../interaction/dialogue";
import type { QuestLineState } from "../quests/quest-engine";
import { DESA_VERTICAL_SLICE } from "../data/vertical-slice";
import { RPGQuestPanel } from "./RPGQuestPanel";
import { RPGDialogue } from "./RPGDialogue";

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

export function RPGGame({ playerId, playerName, mapId = DESA_VERTICAL_SLICE.mapId }: RPGGameProps) {
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
  const [quest, setQuest] = useState<QuestLineState>({ main: 0, kills: 0, flowers: 0 });
  const [gold, setGold] = useState(0);
  const [nearInteractable, setNearInteractable] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueSession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [learningReady, setLearningReady] = useState(false);
  const previousSliceRef = useRef<{ gold: number; xp: number; level: number; quest: QuestLineState; battle: boolean } | null>(null);

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
      setLearningReady(pool.length > 0);

      // A preview save is reusable only on its originating requested map.
      // Never let a save from a broader legacy RPG session expand this
      // controlled one-map slice into another canonical map.
      const sliceSave = saved && saved.world.mapId === mapId && getCanonicalMap(mapId)
        ? saved
        : null;
      const bootMapId = mapId;
      const isDesaSlice = bootMapId === DESA_VERTICAL_SLICE.mapId;

      // Create engine
      const engine = createEngine({
        container: host,
        playerId,
        playerName,
        mapId: bootMapId,
        initialPlayer: sliceSave
          ? {
              stats: sliceSave.player.stats,
              progression: sliceSave.player.progression,
              inventory: sliceSave.player.inventory,
              equipment: sliceSave.player.equipment,
              position: sliceSave.player.position,
              facing: sliceSave.player.facing,
            }
          : undefined,
        flags: sliceSave?.flags,
        openedChests: sliceSave?.openedChests,
        deadBossIds: sliceSave?.deadBossIds,
        gold: sliceSave?.gold,
        goldLedger: sliceSave?.goldLedger,
        equipmentIntents: sliceSave?.equipmentIntents,
        quest: sliceSave?.quest,
        pickedGe: sliceSave?.pickedGe,
        allowedEncounterIds: isDesaSlice ? DESA_VERTICAL_SLICE.encounterIds : undefined,
        allowedNpcIds: isDesaSlice ? [DESA_VERTICAL_SLICE.questGiverId] : undefined,
        learning: pool.length > 0 ? { pool } : undefined,
      }) as RPGEngineWithInput;

      // Create and attach keyboard input
      const keyboard = createKeyboardInputSource(playerId);
      keyboard.attach();
      engine._setInputSource(keyboard);

      engineRef.current = engine;
      keyboardRef.current = keyboard;

      // Persist on every battle close (authoritative snapshot boundary).
      const saveCheckpoint = () => window.setTimeout(() => engine.saveGame(persist), 0);
      const offBattleEnd = engine.on("BATTLE_END", saveCheckpoint);
      const offDialogueEnd = engine.on("DIALOGUE_END", saveCheckpoint);

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
        const nextQuest = engine.getQuest();
        const nextGold = engine.getGold();
        const nextBattle = battle !== null;
        const nextSession = engine.getSession();
        setQuest(nextQuest);
        setGold(nextGold);
        setNearInteractable(engine.isNearInteractable());
        setDialogue(nextSession?.kind === "DIALOGUE" ? nextSession : null);

        const previous = previousSliceRef.current;
        if (previous && previous.battle && !nextBattle) {
          const xpDelta = state.player.progression.xp - previous.xp;
          const goldDelta = nextGold - previous.gold;
          if (goldDelta > 0 || xpDelta > 0 || state.player.progression.level > previous.level) {
            const levelText = state.player.progression.level > previous.level ? ` Level ${state.player.progression.level}!` : "";
            setNotice(`Korog dikalahkan! +${Math.max(0, xpDelta)} XP, +${Math.max(0, goldDelta)} G.${levelText}`);
          }
        }
        if (previous && previous.quest.main === 0 && nextQuest.main === 1) {
          setNotice("Misi diterima: kalahkan 3 Korog di hutan timur.");
        }
        if (previous && previous.quest.main === 1 && nextQuest.main === 2) {
          setNotice("Ki Jaka menerima laporanmu. Hadiah 60 G telah dicatat.");
        }
        previousSliceRef.current = {
          gold: nextGold,
          xp: state.player.progression.xp,
          level: state.player.progression.level,
          quest: nextQuest,
          battle: nextBattle,
        };
      }, 100); // 10 Hz HUD update

      // Cleanup on unmount
      cleanupRef.current = () => {
        clearInterval(hudInterval);
        offBattleEnd();
        offDialogueEnd();
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

      <RPGQuestPanel
        quest={quest}
        gold={gold}
        nearInteractable={nearInteractable}
        notice={notice}
        learningReady={learningReady}
        onInteract={() => engineRef.current?.interact()}
      />

      <RPGDialogue
        session={dialogue}
        quest={quest}
        onAdvance={() => engineRef.current?.advanceActiveDialogue()}
        onEnd={() => engineRef.current?.endActiveDialogue()}
      />

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
      <div className="absolute bottom-4 left-1/2 z-[5] -translate-x-1/2 md:hidden">
        <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
          Gunakan WASD/panah untuk bergerak · E untuk interaksi
        </div>
      </div>
    </div>
  );
}
