import { hasSkill, SUBSKILLS } from "@/lib/question-metadata/taxonomy";
import {
  aiDiagnosticDifficultyForIndex,
  aiDiagnosticSkillQueue,
  AI_DIAGNOSTIC_MIN_USEFUL,
  pickAiDiagnosticSubskill,
} from "./config";
import { isAiSessionState, toPublicQuestion, type AiAnswerOutcome, type AiDiagnosticItem, type AiNextPlan, type AiSessionState } from "./types";

export interface AiPlanOutcome {
  plan: AiNextPlan | null;
  reason: "CONTINUE" | "TARGET_REACHED" | "GENERATION_UNAVAILABLE";
}

export function buildInitialState(size: number, firstItem: AiDiagnosticItem): AiSessionState {
  return {
    v: 1,
    mode: "AI-ADAPTIVE",
    targetSize: size,
    order: [firstItem.id],
    items: { [firstItem.id]: firstItem },
    usedTopics: firstItem.topic ? [firstItem.topic] : [],
    usedSubskills: firstItem.subskill ? [firstItem.subskill] : [],
    genFailed: false,
  };
}

export function nextPlanForSlot(state: AiSessionState, slotIndex: number): AiNextPlan {
  const queue = aiDiagnosticSkillQueue(state.targetSize);
  const skill = queue[slotIndex % queue.length] ?? "READING";
  const subskill = pickAiDiagnosticSubskill(skill, state.usedSubskills, SUBSKILLS);
  return {
    skill,
    subskill,
    difficulty: aiDiagnosticDifficultyForIndex(slotIndex, state.targetSize),
    topic: null,
  };
}

export function planNextQuestion(
  state: AiSessionState,
  poolAvailable: boolean
): AiPlanOutcome {
  const answeredCount = state.targetSize - state.order.length;
  if (state.order.length > 0) {
    return { plan: null, reason: "CONTINUE" };
  }
  const slotIndex = Object.keys(state.items).length;
  if (slotIndex >= state.targetSize) {
    return { plan: null, reason: "TARGET_REACHED" };
  }
  if (state.genFailed && !poolAvailable) {
    return { plan: null, reason: "GENERATION_UNAVAILABLE" };
  }
  return { plan: nextPlanForSlot(state, slotIndex), reason: "CONTINUE" };
}

export function summarizeSessionEvidence(
  rows: { skill: string | null; isCorrect: boolean | null }[]
): string {
  const bySkill = new Map<string, { correct: number; total: number }>();
  for (const row of rows) {
    if (!row.skill || row.isCorrect === null) continue;
    const entry = bySkill.get(row.skill) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (row.isCorrect) entry.correct += 1;
    bySkill.set(row.skill, entry);
  }
  if (bySkill.size === 0) return "";
  const parts: string[] = [];
  for (const [skill, entry] of bySkill) {
    parts.push(`${skill}: ${entry.correct} dari ${entry.total} benar`);
  }
  return parts.join("; ");
}

export function buildAnswerOutcome(
  state: AiSessionState,
  correct: boolean,
  next: AiDiagnosticItem | null,
  reason: AiAnswerOutcome["reasonCode"]
): AiAnswerOutcome {
  const answeredCount = state.targetSize - state.order.length;
  const done = reason !== "ANSWERED" || (state.order.length === 0 && answeredCount >= state.targetSize);
  return {
    ok: true,
    correct,
    nextQuestion: next ? toPublicQuestion(next) : null,
    remaining: state.order.length,
    done,
    reasonCode: reason,
  };
}

export function canCompleteHonestly(state: AiSessionState): boolean {
  const answeredCount = state.targetSize - state.order.length;
  return answeredCount >= AI_DIAGNOSTIC_MIN_USEFUL;
}

export function stateFromJson(value: unknown): AiSessionState | null {
  if (isAiSessionState(value)) return value;
  return null;
}

export function hasSkillInTaxonomy(skill: string): boolean {
  return hasSkill(skill);
}