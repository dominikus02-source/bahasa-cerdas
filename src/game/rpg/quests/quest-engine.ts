/**
 * Quest state boundary + line-state domain (P1.7).
 *
 * Quest DEFINITIONS live in `quests/quest-data.ts` / eventually `data/`;
 * the runtime progress types below are unchanged. ADDED (P1.7): the
 * prototype-faithful main-line state {main, kills} with a pure validator +
 * applier. This is THE authoritative quest state; RPGQuestState remains for
 * the future quest-log UI and is not written by this phase.
 *
 * Canonical transitions (prototype verbatim; dead state 5 has no path):
 * - 0→1 Ki intro (+30G) · 1→2 report kills≥3 (+60G)
 * - 2→3 RAJA victory (+bossDead) · 3→4 Ki kiAfter (+100G)
 * - 4→6 Eyang towerIntro (<6 only) · <7→7 tower victory (+towerDone)
 * - nagaDead branches change NO quest number (verified lines 1197-1205).
 */

import type { RPGId } from "../core/constants";

export type RPGQuestStatus = "LOCKED" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "TURNED_IN";

export interface RPGQuestProgress {
  questId: RPGId;
  status: RPGQuestStatus;
  /** 0..1 or a step counter, semantics defined by the quest definition. */
  progress: number;
}

export interface RPGQuestState {
  active: RPGQuestProgress[];
  completed: RPGQuestProgress[];
}

/** Pure engine contract — implemented fully in a later phase. */
export interface RPGQuestEngine {
  startQuest(state: RPGQuestState, questId: RPGId): RPGQuestState;
  advance(state: RPGQuestState, questId: RPGId, progressDelta: number): RPGQuestState;
}

/** Authoritative main-line quest state (prototype G.quest + G.kills + G.flowers). */
export interface QuestLineState {
  /** Main quest 0..7 (5 is dead — validator never admits it). */
  main: number;
  /** Non-boss overworld kills (quest-1 objective: 3 Korog). */
  kills: number;
  /** Golden flowers picked (Bunga Emas side quest: 3 for charm). */
  flowers: number;
}

export function createQuestLineState(): QuestLineState {
  return { main: 0, kills: 0, flowers: 0 };
}

export interface QuestSignalContext {
  quest: number;
  kills: number;
  flags: Record<string, boolean>;
}

/**
 * Validate a QUEST signal amount against the canonical transition table.
 * Returns true iff the transition may apply. Dead state 5 is rejected in
 * both directions, always.
 */
export function isValidQuestTransition(
  from: number,
  to: number,
  ctx: QuestSignalContext,
): boolean {
  if (to === 5 || from === 5) return false;
  if (!Number.isInteger(to) || to < 0 || to > 7) return false;
  switch (to) {
    case 1:
      return from === 0;
    case 2:
      return from === 1 && ctx.kills >= 3;
    case 3:
      return from === 2;
    case 4:
      return from === 3 && ctx.flags.bossDead === true;
    case 6:
      return from < 6;
    case 7:
      return from < 7;
    case 0:
      return false;
    default:
      return false;
  }
}

/** Quest side of a validated signal set: the new main state, if any. */
export function applyQuestNumber(
  quest: QuestLineState,
  to: number,
  ctx: QuestSignalContext,
): QuestLineState {
  if (!isValidQuestTransition(quest.main, to, ctx)) return quest;
  return { ...quest, main: to };
}
