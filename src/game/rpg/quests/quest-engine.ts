/**
 * Quest state boundary.
 *
 * Quest DEFINITIONS live in `quests/quest-data.ts` / eventually `data/`;
 * this file owns the runtime progress state and the engine contract that
 * mutates it. Progress is authoritative (server-owned in multiplayer).
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
