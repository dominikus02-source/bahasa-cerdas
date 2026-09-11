/**
 * Battle Core — Snapshot-Isolated Turn Core (P1E.4B... P1.4B).
 *
 * Pure deterministic resolver over RPGBattleState. Rules transcribed from the
 * prototype battle loop (legacy lines 1330-1530); nothing invented:
 *
 * - Damage: max(1, base + atk − def), variance x(0.85 + v*0.3), crit gated
 *   by charm (0.20) else 0.10, crit x1.5 — all draws from an explicit
 *   BattleRng cursor (no Math.random, no Date, no hidden state).
 * - Basic attack = skillBase 0 (prototype uses pAtk() directly).
 * - Skill = prototype mult on attack (2.2/2.8/3.8), MP cost, level unlock.
 * - Enemy: same formula; boss special 32% x1.4 on attack (pre-defense).
 * - Escape: forbidden vs alive boss; 60% success; failure = enemy responds.
 * - Victory: XP/gold/drop/flag intents only — NEVER writes inventory.
 * - Defeat respawn rule verbatim: menara origin -> gunung(20,4),
 *   otherwise desa(11,19); HP restore is a world-apply concern, not core.
 * - nagaDead is NEVER set here (Founder-locked); NAGA ABU victory yields
 *   xp/gold only, plus a proposal note in code (see FLAG_INTENT_NAGA_NOTE).
 *
 * Idempotency: every command carries {battleId, turn, actor}; the resolver
 * requires cmd.turn === state.turn exactly, so a resubmitted
 * (battleId+turn+actorId) is deterministically rejected with STALE_TURN.
 * Failed validations consume NO rng draws and mutate NOTHING.
 *
 * Boundary: imports types only from data/player modules (no world tiles,
 * portals, chests, React, DOM, canvas). Emits event OBJECTS (caller buses).
 */

import type {
  RPGBattleState,
  RPGBattleActor,
  RPGBattleResult,
} from "./battle-state";
import { transitionPhase } from "./battle-engine";
import { defaultLearningEffectMapper } from "./battle-engine";
import { applyDamage } from "./battle-engine";
import type { RPGEvent } from "../multiplayer/events";
import type { RPGPlayerState } from "../player/player-state";
import type { RPGEquipmentDefinition } from "../data/equipment";
import type { RPGEnemyDefinition } from "../data/enemies";
import { skillById } from "../data/skills";
import type { BattleRng } from "./battle-rng";
import { createBattleRng, rngNext } from "./battle-rng";

/* ---------- Canonical combat constants (prototype verbatim) ---------- */

export const VARIANCE_MIN = 0.85;
export const VARIANCE_SPAN = 0.3;
export const CRIT_CHANCE_BASE = 0.1;
export const CRIT_CHANCE_CHARM = 0.2;
export const CRIT_MULT = 1.5;
export const FLEE_CHANCE = 0.6;
export const BOSS_SPECIAL_CHANCE = 0.32;
export const BOSS_SPECIAL_MULT = 1.4;
export const GOLEM_DROP_CHANCE = 0.55;
/** Pseudo-skill id for the default SERANG action (skillBase 0). */
export const BASIC_ATTACK_SKILL_ID = "basic";
/** NAGA ABU victory deliberately yields no progression flag (Founder-locked).
 *  P1.4C/world-integration proposal: introduce `naDead` ONLY on Founder approval. */
export const FLAG_INTENT_NAGA_NOTE = "PROPOSAL-ONLY:naDead_requires_founder_approval";

/* ---------- Equipment stat snapshot (minimal resolver) ---------- */

/**
 * Resolve combat attack/defense = base + equipped modifiers.
 * Unknown equipment ids are ignored (never invented). Pure.
 */
export function resolveCombatStats(
  base: { attack: number; defense: number },
  equipment: { weaponId: string | null; armorId: string | null; accessoryId: string | null },
  table: RPGEquipmentDefinition[],
): { attack: number; defense: number } {
  let attack = base.attack;
  let defense = base.defense;
  for (const id of [equipment.weaponId, equipment.armorId, equipment.accessoryId]) {
    if (!id) continue;
    const def = table.find((e) => e.id === id);
    if (!def) continue;
    attack += def.modifiers.attack ?? 0;
    defense += def.modifiers.defense ?? 0;
  }
  return { attack, defense };
}

/** Snapshot a player into a battle actor (HP/MP/level ride along). */
export function snapshotPlayer(
  player: RPGPlayerState,
  table: RPGEquipmentDefinition[],
): RPGBattleActor {
  const { attack, defense } = resolveCombatStats(
    { attack: player.stats.attack, defense: player.stats.defense },
    player.equipment,
    table,
  );
  return {
    id: player.id,
    name: player.name,
    hp: player.stats.hp,
    maxHp: player.stats.maxHp,
    mp: player.stats.mp,
    maxMp: player.stats.maxMp,
    level: player.progression.level,
    attack,
    defense,
  };
}

/* ---------- Battle start ---------- */

export interface StartBattleArgs {
  battleId?: string;
  player: RPGPlayerState;
  equipmentTable: RPGEquipmentDefinition[];
  enemies: Array<{ def: RPGEnemyDefinition; instanceId: string }>;
  origin: { mapId: string; x: number; y: number };
  seed?: number;
}

/** Deterministic fallback seed from battleId (FNV-1a, pure). */
export function hashBattleId(battleId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < battleId.length; i++) {
    h ^= battleId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function startBattle(args: StartBattleArgs): {
  state: RPGBattleState;
  rng: BattleRng;
  events: RPGEvent[];
} {
  const battleId = args.battleId ?? crypto.randomUUID();
  const player = snapshotPlayer(args.player, args.equipmentTable);
  const enemies: RPGBattleActor[] = args.enemies.map((e) => ({
    id: e.instanceId,
    name: e.def.name,
    hp: e.def.base.hp,
    maxHp: e.def.base.hp,
    attack: e.def.base.attack,
    defense: e.def.base.defense,
    xp: e.def.xp,
    gold: e.def.gold,
    boss: e.def.boss,
    prototypeKey: e.def.prototypeKey,
  }));
  const state: RPGBattleState = transitionPhase(
    {
      battleId,
      phase: "INTRO",
      player,
      enemies,
      turn: 0,
      origin: { ...args.origin },
    },
    "CHALLENGE",
  );
  const rng = createBattleRng(args.seed ?? hashBattleId(battleId));
  return {
    state,
    rng,
    events: [
      {
        type: "BATTLE_START",
        battleId,
        participantIds: [player.id, ...enemies.map((e) => e.id)],
      },
    ],
  };
}

/* ---------- Shared command validation ---------- */

export interface BattleCommandBase {
  battleId: string;
  turn: number;
  actorId: string;
}

function checkCommand(
  state: RPGBattleState,
  cmd: BattleCommandBase,
): { ok: true } | { ok: false; reason: string } {
  if (cmd.battleId !== state.battleId) return { ok: false, reason: "BAD_BATTLE_ID" };
  if (state.result !== undefined) return { ok: false, reason: "PHASE_CLOSED" };
  if (state.phase !== "CHALLENGE") return { ok: false, reason: "PHASE_CLOSED" };
  if (cmd.turn !== state.turn) return { ok: false, reason: "STALE_TURN" };
  return { ok: true };
}

export interface CoreOutcome {
  ok: boolean;
  reason?: string;
  state: RPGBattleState;
  rng: BattleRng;
  events: RPGEvent[];
}

/* ---------- Damage (prototype calcDmg, seeded) ---------- */

function rollDamage(
  atk: number,
  def: number,
  baseDamage: number,
  learningMult: number,
  charm: boolean,
  rng: BattleRng,
): { damage: number; crit: boolean; rng: BattleRng } {
  const raw = Math.max(1, baseDamage + atk - def) * learningMult;
  const v = rngNext(rng);
  const scaled = Math.round(raw * (VARIANCE_MIN + v.value * VARIANCE_SPAN));
  const c = rngNext(v.rng);
  const crit = c.value < (charm ? CRIT_CHANCE_CHARM : CRIT_CHANCE_BASE);
  return { damage: crit ? Math.round(scaled * CRIT_MULT) : scaled, crit, rng: c.rng };
}

/* ---------- Player action ---------- */

export interface PlayerActCommand extends BattleCommandBase {
  targetId: string;
  skillId: string;
  learningCorrect?: boolean;
  charm?: boolean;
}

export function playerAct(
  state: RPGBattleState,
  cmd: PlayerActCommand,
  rng: BattleRng,
): CoreOutcome {
  const chk = checkCommand(state, cmd);
  if (!chk.ok) return { ...chk, state, rng, events: [] };
  if (cmd.actorId !== state.player.id) {
    return { ok: false, reason: "WRONG_ACTOR", state, rng, events: [] };
  }
  const target = state.enemies.find((e) => e.id === cmd.targetId);
  if (!target) return { ok: false, reason: "TARGET_MISSING", state, rng, events: [] };
  if (target.hp <= 0) return { ok: false, reason: "TARGET_DEAD", state, rng, events: [] };

  // Skill resolution (basic attack = skillBase 0, always available).
  let baseDamage = 0;
  let atkMult = 1;
  let mpCost = 0;
  if (cmd.skillId !== BASIC_ATTACK_SKILL_ID) {
    const skill = skillById(cmd.skillId);
    if (!skill) return { ok: false, reason: "SKILL_MISSING", state, rng, events: [] };
    const level = state.player.level ?? 1;
    if ((skill.unlockLevel ?? 1) > level) {
      return { ok: false, reason: "SKILL_LOCKED", state, rng, events: [] };
    }
    mpCost = skill.mpCost ?? skill.cost ?? 0;
    if ((state.player.mp ?? 0) < mpCost) {
      return { ok: false, reason: "INSUFFICIENT_MP", state, rng, events: [] };
    }
    baseDamage = skill.baseDamage;
    atkMult = skill.multiplier ?? 1;
  }
  const learnMult =
    cmd.skillId !== BASIC_ATTACK_SKILL_ID && cmd.learningCorrect === true
      ? defaultLearningEffectMapper({
          challengeId: "",
          playerId: state.player.id,
          correct: true,
          timeMs: 0,
        }).multiplier
      : 1;

  const atk = Math.round(state.player.attack * atkMult);
  const { damage, crit, rng: rng2 } = rollDamage(
    atk,
    target.defense,
    baseDamage,
    learnMult,
    cmd.charm === true,
    rng,
  );

  const enemies = state.enemies.map((e) =>
    e.id === target.id ? applyDamage(e, damage) : e,
  );
  const player = { ...state.player, mp: (state.player.mp ?? 0) - mpCost };
  const turn = state.turn + 1;
  const events: RPGEvent[] = [
    {
      type: "BATTLE_ACTION_RESOLVED",
      battleId: state.battleId,
      turn,
      actorId: cmd.actorId,
      targetId: target.id,
      damage,
      crit,
    },
  ];

  // Golem drop intent resolved at kill time (deterministic draw order).
  let rngAfter = rng2;
  let enemiesFinal = enemies;
  const killed = enemies.find((e) => e.id === target.id);
  if (killed && killed.hp <= 0 && (killed.prototypeKey === "gl" || killed.prototypeKey === "ga")) {
    const d = rngNext(rng2);
    rngAfter = d.rng;
    if (d.value < GOLEM_DROP_CHANCE) {
      enemiesFinal = enemies.map((e) =>
        e.id === killed.id ? { ...e, dropIntent: "bijih" } : e,
      );
    }
  }
  const next: RPGBattleState = { ...state, player, enemies: enemiesFinal, turn };
  if (enemiesFinal.every((e) => e.hp <= 0)) {
    return finishVictory(next, rngAfter, events);
  }
  return { ok: true, state: next, rng: rngAfter, events };
}

function finishKill(
  state: RPGBattleState,
  rng: BattleRng,
  events: RPGEvent[],
): CoreOutcome {
  if (state.enemies.every((e) => e.hp <= 0)) {
    return finishVictory(state, rng, events);
  }
  return { ok: true, state, rng, events };
}

function flagIntentsFor(enemies: RPGBattleActor[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const e of enemies) {
    if (e.hp > 0) continue;
    if (e.prototypeKey === "b") out.bossDead = true;
    if (e.prototypeKey === "tw") out.towerDone = true;
    // nagaDead ("na") deliberately absent — Founder-locked (FLAG_INTENT_NAGA_NOTE).
  }
  return out;
}

function finishVictory(
  state: RPGBattleState,
  rng: BattleRng,
  events: RPGEvent[],
): CoreOutcome {
  const done: RPGBattleState = {
    ...transitionPhase(state, "VICTORY"),
    result: "WIN",
  };
  return {
    ok: true,
    state: done,
    rng,
    events: [
      ...events,
      {
        type: "BATTLE_VICTORY",
        battleId: state.battleId,
        xp: state.enemies.reduce((s, e) => s + (e.xp ?? 0), 0),
        deadEnemyIds: state.enemies.map((e) => e.id),
      },
    ],
  };
}

/* ---------- Enemy action ---------- */

export interface EnemyActCommand extends BattleCommandBase {
  enemyId: string;
  charm?: boolean;
}

export function enemyAct(
  state: RPGBattleState,
  cmd: EnemyActCommand,
  rng: BattleRng,
): CoreOutcome {
  const chk = checkCommand(state, cmd);
  if (!chk.ok) return { ...chk, state, rng, events: [] };
  const enemy = state.enemies.find((e) => e.id === cmd.enemyId);
  if (!enemy) return { ok: false, reason: "TARGET_MISSING", state, rng, events: [] };
  if (enemy.hp <= 0) return { ok: false, reason: "ACTOR_DEAD", state, rng, events: [] };
  if (state.player.hp <= 0) return { ok: false, reason: "TARGET_DEAD", state, rng, events: [] };
  if (cmd.actorId !== enemy.id) {
    return { ok: false, reason: "WRONG_ACTOR", state, rng, events: [] };
  }

  let effAtk = enemy.attack;
  let r = rng;
  if (enemy.boss === true) {
    const s = rngNext(r);
    r = s.rng;
    if (s.value < BOSS_SPECIAL_CHANCE) {
      effAtk = Math.round(enemy.attack * BOSS_SPECIAL_MULT);
    }
  }
  const { damage, crit, rng: r2 } = rollDamage(
    effAtk,
    state.player.defense,
    0,
    1,
    cmd.charm === true,
    r,
  );
  const player = applyDamage(state.player, damage);
  const turn = state.turn + 1;
  const events: RPGEvent[] = [
    {
      type: "BATTLE_ACTION_RESOLVED",
      battleId: state.battleId,
      turn,
      actorId: enemy.id,
      targetId: player.id,
      damage,
      crit,
    },
  ];
  if (player.hp <= 0) {
    // Defeat respawn rule verbatim (prototype battleDefeat).
    const respawn =
      state.origin.mapId === "map.menara"
        ? { mapId: "map.gunung", x: 20, y: 4 }
        : { mapId: "map.desa", x: 11, y: 19 };
    const done: RPGBattleState = {
      ...transitionPhase({ ...state, player, turn }, "DEFEAT"),
      result: "LOSE",
    };
    return {
      ok: true,
      state: done,
      rng: r2,
      events: [
        ...events,
        { type: "BATTLE_DEFEAT", battleId: state.battleId, respawn },
      ],
    };
  }
  return { ok: true, state: { ...state, player, turn }, rng: r2, events };
}

/* ---------- Escape ---------- */

export interface EscapeCommand extends BattleCommandBase {}

export function escapeBattle(
  state: RPGBattleState,
  cmd: EscapeCommand,
  rng: BattleRng,
): CoreOutcome {
  const chk = checkCommand(state, cmd);
  if (!chk.ok) return { ...chk, state, rng, events: [] };
  if (cmd.actorId !== state.player.id) {
    return { ok: false, reason: "WRONG_ACTOR", state, rng, events: [] };
  }
  if (state.enemies.some((e) => e.hp > 0 && e.boss === true)) {
    return { ok: false, reason: "FLEE_FORBIDDEN_BOSS", state, rng, events: [] };
  }
  const f = rngNext(rng);
  if (f.value < FLEE_CHANCE) {
    const done: RPGBattleState = {
      ...transitionPhase(state, "RESOLVE"),
      result: "FLED",
      turn: state.turn + 1,
    };
    return { ok: true, state: done, rng: f.rng, events: [] };
  }
  // Failed flee consumes the turn; the enemy responds next.
  const failed: RPGBattleState = { ...state, turn: state.turn + 1 };
  return {
    ok: true,
    state: failed,
    rng: f.rng,
    events: [
      {
        type: "BATTLE_ACTION_RESOLVED",
        battleId: state.battleId,
        turn: failed.turn,
        actorId: cmd.actorId,
        targetId: state.enemies.find((e) => e.hp > 0)?.id ?? "",
        damage: 0,
        crit: false,
      },
    ],
  };
}

/* ---------- Result assembly (intent only — never writes inventory) ---------- */

export interface BattleResultData {
  battleId: string;
  outcome: RPGBattleResult;
  xp: number;
  goldIntent: number;
  dropIntents: Array<{ kind: string }>;
  flagIntents: Record<string, boolean>;
  deadEnemyIds: string[];
  respawn?: { mapId: string; x: number; y: number };
}

export function toBattleResult(state: RPGBattleState): BattleResultData | null {
  if (state.result === undefined) return null;
  const dead = state.enemies.filter((e) => e.hp <= 0);
  const drops: Array<{ kind: string }> = [];
  for (const e of dead) {
    if (e.dropIntent === "bijih") drops.push({ kind: "bijih" });
  }
  const defeat = state.phase === "DEFEAT";
  return {
    battleId: state.battleId,
    outcome: state.result,
    xp: state.result === "WIN" ? state.enemies.reduce((s, e) => s + (e.xp ?? 0), 0) : 0,
    goldIntent: state.result === "WIN" ? state.enemies.reduce((s, e) => s + (e.gold ?? 0), 0) : 0,
    dropIntents: state.result === "WIN" ? drops : [],
    flagIntents: state.result === "WIN" ? flagIntentsFor(state.enemies) : {},
    deadEnemyIds: dead.map((e) => e.id),
    respawn: defeat
      ? state.origin.mapId === "map.menara"
        ? { mapId: "map.gunung", x: 20, y: 4 }
        : { mapId: "map.desa", x: 11, y: 19 }
      : undefined,
  };
}
