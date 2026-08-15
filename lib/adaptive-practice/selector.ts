import { SKILLS, hasSkill, type DifficultyId } from "@/lib/question-metadata/taxonomy";
import { ADAPTIVE_COOLDOWN_DAYS, ADAPTIVE_SELECTION_VERSION, DIFFICULTY_ORDER } from "./config";
import type { AdaptiveCandidate, AdaptiveSelection, AdaptiveSelectorInput, CandidateSeenState, SelectionReasonCode } from "./types";
import type { LearnerSkillState } from "@/lib/learner-state/types";

function seenState(seenAt: Date | null, now: Date): CandidateSeenState {
  if (!seenAt) return "UNSEEN";
  const age = now.getTime() - seenAt.getTime();
  return age >= ADAPTIVE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 ? "OLD" : "RECENT";
}

function targetDifficulty(state: LearnerSkillState | undefined): DifficultyId {
  if (!state || state.attemptCount < 5) return "EASY";
  if (state.masteryState === "PROFICIENT") return state.accuracy !== null && state.accuracy >= 0.9 ? "VERY_HARD" : "HARD";
  return "MEDIUM";
}

function stableIndex(value: string, length: number): number {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % length;
}

function chooseTarget(input: AdaptiveSelectorInput): { skill: string; reasonCode: SelectionReasonCode } | null {
  const { states, candidates } = input;
  const availableSkills = [...new Set(candidates.map((candidate) => candidate.skill).filter(hasSkill))];
  if (availableSkills.length === 0) return null;
  const stateBySkill = new Map(states.map((state) => [state.skill, state]));
  const evidenced = availableSkills
    .map((skill) => stateBySkill.get(skill))
    .filter((state): state is NonNullable<typeof state> => Boolean(state && state.attemptCount >= 5))
    .sort((a, b) => {
      const accuracyA = a.accuracy ?? 1;
      const accuracyB = b.accuracy ?? 1;
      return accuracyA - accuracyB || (a.lastPracticedAt ?? "").localeCompare(b.lastPracticedAt ?? "") || a.skill.localeCompare(b.skill);
    });
  if (evidenced[0]) {
    return {
      skill: evidenced[0].skill,
      reasonCode: evidenced[0].trend === "IMPROVING" ? "PROGRESSION" : "WEAK_SKILL",
    };
  }

  const withHistory = availableSkills
    .map((skill) => stateBySkill.get(skill))
    .filter((state): state is NonNullable<typeof state> => Boolean(state && state.attemptCount > 0))
    .sort((a, b) => (a.lastPracticedAt ?? "").localeCompare(b.lastPracticedAt ?? "") || a.skill.localeCompare(b.skill));
  if (withHistory[0]) return { skill: withHistory[0].skill, reasonCode: "PRACTICE_GAP" };

  const sortedSkills = [...availableSkills].sort();
  const index = input.rotationKey ? stableIndex(input.rotationKey, sortedSkills.length) : 0;
  return { skill: sortedSkills[index], reasonCode: "NO_DATA" };
}

function difficultyScore(candidate: AdaptiveCandidate, target: DifficultyId): number {
  if (!candidate.difficulty) return 8;
  if (candidate.difficulty === target) return 40;
  const distance = Math.abs(DIFFICULTY_ORDER.indexOf(candidate.difficulty) - DIFFICULTY_ORDER.indexOf(target));
  return Math.max(10, 30 - distance * 10);
}

function noveltyScore(candidate: AdaptiveCandidate, now: Date): number {
  const state = seenState(candidate.seenAt, now);
  // Novelty is the highest-priority factor. A recent question must not beat an
  // unseen question merely because it happens to match the target skill.
  if (state === "UNSEEN") return 300;
  if (state === "OLD") return 150;
  return 0;
}

function candidateScore(
  candidate: AdaptiveCandidate,
  targetSkill: string,
  targetSubskill: string | null,
  targetDifficulty: DifficultyId,
  selected: AdaptiveCandidate[],
  now: Date
): number {
  const skillMatch = candidate.skill === targetSkill ? 100 : 0;
  const subskillMatch = targetSubskill && candidate.subskill === targetSubskill ? 15 : 0;
  const topicCount = selected.filter((item) => item.topic && item.topic === candidate.topic).length;
  const typeCount = selected.filter((item) => item.questionType === candidate.questionType).length;
  const diversityBonus = topicCount === 0 ? 8 : typeCount === 0 ? 4 : 0;
  const diversityPenalty = topicCount >= 3 ? 15 : 0;
  return skillMatch + subskillMatch + difficultyScore(candidate, targetDifficulty) + noveltyScore(candidate, now) + diversityBonus - diversityPenalty;
}

function reasonText(code: SelectionReasonCode, skill: string, subskill: string | null): string {
  const label = SKILLS[skill as keyof typeof SKILLS] || skill;
  const focus = subskill ? ` pada ${subskill}` : "";
  if (code === "WEAK_SKILL") return `Dipilih untuk memperkuat ${label}${focus} berdasarkan bukti belajar yang cukup.`;
  if (code === "PRACTICE_GAP") return `Dipilih untuk melatih kembali ${label}${focus} yang sudah lama tidak dipraktikkan.`;
  if (code === "PROGRESSION") return `Dipilih sebagai tantangan lanjutan untuk ${label}${focus}.`;
  return `Belum cukup data kemampuan; latihan ini menjadi langkah awal untuk membangun profil ${label}.`;
}

export function selectAdaptivePractice(input: AdaptiveSelectorInput, now = new Date()): AdaptiveSelection | null {
  if (input.size <= 0 || input.candidates.length === 0) return null;
  if (input.candidates.length < input.size) return null;
  const target = chooseTarget(input);
  if (!target) return null;
  const state = input.states.find((item) => item.skill === target.skill);
  const targetDifficultyValue = targetDifficulty(state);
  const targetSubskill = input.candidates
    .filter((candidate) => candidate.skill === target.skill && candidate.subskill)
    .sort((a, b) => a.id.localeCompare(b.id))[0]?.subskill ?? null;

  const remaining = [...input.candidates];
  const selected: AdaptiveCandidate[] = [];
  while (selected.length < input.size && remaining.length > 0) {
    remaining.sort((a, b) => {
      const scoreA = candidateScore(a, target.skill, targetSubskill, targetDifficultyValue, selected, now);
      const scoreB = candidateScore(b, target.skill, targetSubskill, targetDifficultyValue, selected, now);
      return scoreB - scoreA || a.id.localeCompare(b.id);
    });
    selected.push(remaining.shift()!);
  }

  const reasonCode = target.reasonCode === "WEAK_SKILL" && state?.masteryState === "PROFICIENT" ? "PROGRESSION" : target.reasonCode;
  return {
    targetSkill: target.skill,
    targetSubskill,
    targetDifficulty: targetDifficultyValue,
    reasonCode,
    reasonText: reasonText(reasonCode, target.skill, targetSubskill),
    questions: selected,
    selectionVersion: ADAPTIVE_SELECTION_VERSION,
  };
}

export { seenState };
