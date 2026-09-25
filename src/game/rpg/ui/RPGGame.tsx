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
 * - Touch controls (same command pipeline as keyboard)
 *
 * The game loop runs independently of React renders.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createEngine, type RPGEngine } from "../core/game-engine";
import { createKeyboardInputSource } from "../core/keyboard-input";
import { createTouchInputSource, type RPGTouchInputSource } from "../core/touch-input";
import { createCompositeInputSource, type RPGInputSource } from "../core/input";
import {
  createLocalStoragePersistence,
  readServerSnapshotCache,
  writeServerSnapshotCache,
  clearLegacySave,
  type ServerSnapshotCache,
} from "../core/persistence";
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
import { xpForLevel } from "../player/progression";
import { RPGQuestPanel } from "./RPGQuestPanel";
import { RPGDialogue } from "./RPGDialogue";
import { RPGMenuPanel, type RPGMenuTab } from "./RPGMenuPanel";

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
  _setInputSource: (source: RPGInputSource) => void;
}

export function RPGGame({ playerId, playerName, mapId = DESA_VERTICAL_SLICE.mapId }: RPGGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RPGEngineWithInput | null>(null);
  const keyboardRef = useRef<ReturnType<typeof createKeyboardInputSource> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const touchJoystickRef = useRef<HTMLDivElement>(null);
  const touchJoystickThumbRef = useRef<HTMLDivElement>(null);
  const touchActionRef = useRef<HTMLButtonElement>(null);

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
  const [menuTab, setMenuTab] = useState<RPGMenuTab | null>(null);
  const [menuInventory, setMenuInventory] = useState<Array<{ itemId: string; quantity: number }>>([]);
  const [menuEquipment, setMenuEquipment] = useState<{ weaponId: string | null; armorId: string | null; accessoryId: string | null }>({ weaponId: null, armorId: null, accessoryId: null });
  const previousSliceRef = useRef<{ gold: number; xp: number; level: number; quest: QuestLineState; battle: boolean } | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // P1.9C slice wiring (all read-only until the engine validates):
    // - restore authoritative slices from the persistence boundary,
    // - fetch the canonical question pool for learning encounters,
    // - save on every battle close (victory/defeat/flee).
    // P2.6I.1: localStorage is now a cache; server snapshot is authoritative.
    const persist = createLocalStoragePersistence(playerId);

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

      // P2.6I.1: Hydration priority — server snapshot > cache > legacy localStorage.
      // Server snapshot is fetched live; cache is the offline-resume fallback;
      // legacy localStorage is the migration path for pre-server saves.
      let serverSnapshot: ServerSnapshotCache | null = null;

      // 1. Try live server fetch
      try {
        const stateRes = await fetch("/api/rpg/state");
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          const state = stateData?.state;
          if (state && typeof state.version === "number" && typeof state.stateSchemaVersion === "number") {
            serverSnapshot = {
              version: 1, // RPG_STATE_CACHE_VERSION
              cachedAt: Date.now(),
              playerId,
              serverVersion: state.version,
              stateSchemaVersion: state.stateSchemaVersion,
              player: state.player,
              inventory: state.inventory,
              quests: state.quests,
              worldState: state.worldState ?? {
                flags: {}, openedChests: [], deadBossIds: [],
                equipment: { weaponId: null, armorId: null, accessoryId: null },
                quest: { main: 0, kills: 0, flowers: 0 }, pickedGe: [],
              },
              activeBattle: state.activeBattle ?? null,
              activeLearning: state.activeLearning ?? null,
            };
            writeServerSnapshotCache(playerId, serverSnapshot);
            // Clear legacy save after successful server hydration
            clearLegacySave(playerId);
          }
        }
      } catch {
        // Server unreachable — fall through to cache.
      }

      // 2. Fallback to cached snapshot if live fetch failed
      if (!serverSnapshot) {
        serverSnapshot = readServerSnapshotCache(playerId);
      }

      // 3. Legacy localStorage (pre-P2.6I.1 migration path)
      const legacySave = persist.load();

      // Determine engine config from the best available source.
      // Server snapshot > legacy save > fresh defaults.
      const engineConfig = (() => {
        // Server snapshot with matching mapId — canonical source
        if (serverSnapshot && serverSnapshot.player.mapKey === mapId && getCanonicalMap(mapId)) {
          return {
            initialPlayer: {
              stats: serverSnapshot.player.stats,
              progression: { ...serverSnapshot.player.progression, xpToNextLevel: xpForLevel(serverSnapshot.player.progression.level) },
              inventory: { items: serverSnapshot.inventory.map((i) => ({ itemId: i.itemKey, quantity: i.quantity })) },
              equipment: serverSnapshot.worldState.equipment,
              position: serverSnapshot.player.position,
              facing: serverSnapshot.player.facing as "up" | "down" | "left" | "right",
            },
            flags: serverSnapshot.worldState.flags,
            openedChests: serverSnapshot.worldState.openedChests,
            deadBossIds: serverSnapshot.worldState.deadBossIds,
            quest: serverSnapshot.worldState.quest,
            pickedGe: serverSnapshot.worldState.pickedGe,
            gold: serverSnapshot.player.wallet.goldBalance,
          };
        }
        // Legacy save migration path
        if (legacySave && legacySave.world.mapId === mapId && getCanonicalMap(mapId)) {
          return {
            initialPlayer: legacySave.player,
            flags: legacySave.flags,
            openedChests: legacySave.openedChests,
            deadBossIds: legacySave.deadBossIds,
            gold: legacySave.gold,
            goldLedger: legacySave.goldLedger,
            equipmentIntents: legacySave.equipmentIntents,
            quest: legacySave.quest,
            pickedGe: legacySave.pickedGe,
          };
        }
        return {};
      })();
      const bootMapId = mapId;
      // Create engine
      const engine = createEngine({
        container: host,
        playerId,
        playerName,
        mapId: bootMapId,
        ...engineConfig,
        // Founder Lab runs the full authored map; quest/combat rules remain authoritative in the engine.
        allowedEncounterIds: undefined,
        allowedNpcIds: undefined,
        learning: pool.length > 0 ? { pool } : undefined,
      }) as RPGEngineWithInput;

      // Create and attach keyboard input
      const keyboard = createKeyboardInputSource(playerId);
      keyboard.attach();
      let touchSource: RPGTouchInputSource | null = null;
      if (touchJoystickRef.current && touchActionRef.current) {
        touchSource = createTouchInputSource(playerId, {
          joystick: touchJoystickRef.current,
          action: touchActionRef.current,
          thumb: touchJoystickThumbRef.current ?? undefined,
        });
        touchSource.attach();
      }

      engine._setInputSource(createCompositeInputSource(keyboard, ...(touchSource ? [touchSource] : [])));

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
        setMenuInventory(state.player.inventory.items.map((item) => ({ itemId: item.itemId, quantity: item.quantity })));
        setMenuEquipment(state.player.equipment ?? { weaponId: null, armorId: null, accessoryId: null });
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
        if (touchSource) touchSource.detach();
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

      <div className="absolute right-3 top-[7.2rem] z-20 flex gap-2 md:top-[7.8rem]" aria-label="Menu RPG">
        {([["map","Peta"],["bag","Tas"],["quest","Quest"]] as const).map(([tab, label]) => (
          <button key={tab} type="button" onClick={() => setMenuTab(tab)} className="rounded-xl border border-white/15 bg-stone-950/75 px-3 py-2 text-xs font-black text-white shadow-lg backdrop-blur hover:bg-stone-900">{label}</button>
        ))}
      </div>

      {menuTab ? (
        <RPGMenuPanel tab={menuTab} mapId={hudState?.mapName ?? mapId} quest={quest} gold={gold} inventory={menuInventory} equipment={menuEquipment} onClose={() => setMenuTab(null)} />
      ) : null}

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

      {/* Mobile touch controls — only during free exploration. Dialogue and battle
          have their own focused controls, so the world joystick never competes
          with the active interaction mode. */}
      {!battleView && !dialogue && (
        <div className="absolute inset-0">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[30] flex items-end justify-between px-5 pb-5 md:hidden" aria-label="Kontrol sentuh RPG">
            <div ref={touchJoystickRef} className="pointer-events-auto relative h-28 w-28 touch-none rounded-full border border-white/15 bg-black/25 shadow-2xl backdrop-blur-sm" aria-label="Joystick gerak">
              <div className="pointer-events-none absolute inset-2 rounded-full border border-white/10" />
              <div
                ref={touchJoystickThumbRef}
                className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-white/25 bg-white/20 shadow-lg backdrop-blur-sm"
                style={{ transform: "translate(-50%, -50%)", opacity: 0.78 }}
              />
            </div>
            <button ref={touchActionRef} type="button" className="pointer-events-auto flex h-20 w-20 touch-none items-center justify-center rounded-full border border-amber-200/30 bg-amber-400/85 text-2xl font-black text-amber-950 shadow-2xl active:scale-95" aria-label="Interaksi">
              E
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-36 left-1/2 z-[5] -translate-x-1/2 md:hidden">
            <div className="rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
              Gerakkan joystick · E untuk interaksi
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
