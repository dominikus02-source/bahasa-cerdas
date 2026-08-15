import type { DifficultyId, QuestionTypeId } from "@/lib/question-metadata/taxonomy";
import type { LearnerSkillState } from "@/lib/learner-state/types";

export type CandidateSeenState = "UNSEEN" | "OLD" | "RECENT";
export type SelectionReasonCode = "NO_DATA" | "WEAK_SKILL" | "PRACTICE_GAP" | "PROGRESSION";

export interface AdaptiveCandidate {
  id: string;
  text: string;
  options: string[];
  questionType: QuestionTypeId;
  skill: string;
  subskill: string | null;
  difficulty: DifficultyId | null;
  topic: string | null;
  seenAt: Date | null;
}

export interface AdaptiveSelection {
  targetSkill: string;
  targetSubskill: string | null;
  targetDifficulty: DifficultyId;
  reasonCode: SelectionReasonCode;
  reasonText: string;
  questions: AdaptiveCandidate[];
  selectionVersion: string;
}

export interface AdaptiveSelectorInput {
  states: LearnerSkillState[];
  candidates: AdaptiveCandidate[];
  size: number;
}
