/**
 * Quest definition contract.
 *
 * `quest-engine.ts` owns runtime state; this file defines the SHAPE of quest
 * content so data-driven quests can be authored and validated. Concrete quest
 * data arrives in a later phase (extracted from the prototype or authored).
 */

import type { RPGId } from "../core/constants";
import type { RPGQuestStatus } from "./quest-engine";

export interface RPGQuestDefinition {
  id: RPGId;
  title: string;
  description: string;
  /** First status a quest can reach. */
  initialStatus: Extract<RPGQuestStatus, "LOCKED" | "AVAILABLE">;
  /** Progress value that marks the quest COMPLETED. */
  completionThreshold: number;
  /** Learning challenge ids that advance this quest, if any. */
  linkedChallengeIds?: RPGId[];
}

/** Validate quest content before it enters the runtime. */
export function validateQuestDefinition(def: RPGQuestDefinition): string[] {
  const errors: string[] = [];
  if (def.completionThreshold <= 0) {
    errors.push(`quest ${def.id}: completionThreshold must be > 0`);
  }
  return errors;
}
