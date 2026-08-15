import { DIFFICULTIES, type DifficultyId } from "@/lib/question-metadata/taxonomy";
import {
  DIAGNOSTIC_DEFAULT_SIZE,
  DIAGNOSTIC_DIFFICULTY_CYCLE,
  DIAGNOSTIC_MIN_ITEMS,
  DIAGNOSTIC_QUESTION_TYPES,
  DIAGNOSTIC_SKILL_LABELS,
  DIAGNOSTIC_SKILL_PRIORITY,
  diagnosticCompositionQueue,
  difficultyPlanForSize,
} from "./config";
import type {
  DiagnosticCandidate,
  DiagnosticComposition,
  DiagnosticDeliveredSkill,
  DiagnosticFallbackEntry,
  DiagnosticQuestionType,
  DiagnosticRequestedSkill,
  DiagnosticSelection,
} from "./types";

function seenRank(candidate: DiagnosticCandidate, now: Date): number {
  if (!candidate.seenAt) return 0;
  const ageDays = (now.getTime() - candidate.seenAt.getTime()) / (24 * 60 * 60 * 1000);
  return ageDays >= 14 ? 1 : 2;
}

function priorityOf(skill: string): number {
  const index = DIAGNOSTIC_SKILL_PRIORITY.indexOf(skill as (typeof DIAGNOSTIC_SKILL_PRIORITY)[number]);
  return index === -1 ? DIAGNOSTIC_SKILL_PRIORITY.length + 1 : index;
}

function difficultyIndex(difficulty: DifficultyId | null): number {
  if (!difficulty) return 1;
  const index = DIFFICULTIES.indexOf(difficulty);
  return index === -1 ? 1 : index;
}

function labelOf(skill: string): string {
  return DIAGNOSTIC_SKILL_LABELS[skill] ?? skill;
}

/**
 * Ringkas komposisi dari daftar yang terantarkan (dipakai ulang oleh start
 * dan GET payload — sumber kebenaran komposisi). MURNI.
 */
export function summarizeComposition(
  size: number,
  delivered: { skill: string; questionType: DiagnosticQuestionType }[]
): DiagnosticComposition {
  const requestedSkills = new Map<string, number>();
  for (const skill of diagnosticCompositionQueue(size)) {
    requestedSkills.set(skill, (requestedSkills.get(skill) ?? 0) + 1);
  }

  const deliveredBySkill = new Map<string, { count: number; types: Set<DiagnosticQuestionType> }>();
  for (const item of delivered) {
    const entry = deliveredBySkill.get(item.skill) ?? { count: 0, types: new Set<DiagnosticQuestionType>() };
    entry.count += 1;
    entry.types.add(item.questionType);
    deliveredBySkill.set(item.skill, entry);
  }

  const requested: DiagnosticRequestedSkill[] = [...requestedSkills.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([skill, count]) => ({ skill, label: labelOf(skill), count }));

  const deliveredList: DiagnosticDeliveredSkill[] = [...deliveredBySkill.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([skill, entry]) => ({
      skill,
      label: labelOf(skill),
      count: entry.count,
      questionTypes: DIAGNOSTIC_QUESTION_TYPES.filter((type) => entry.types.has(type)),
    }));

  const fallback: DiagnosticFallbackEntry[] = [];
  for (const [skill, requestedCount] of [...requestedSkills.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const deliveredCount = deliveredBySkill.get(skill)?.count ?? 0;
    if (deliveredCount < requestedCount) {
      fallback.push({
        skill,
        label: labelOf(skill),
        requested: requestedCount,
        delivered: deliveredCount,
        reason: deliveredCount === 0 ? "MISSING_CORPUS" : "SEE_AGAIN",
        note:
          deliveredCount === 0
            ? `Belum ada butir ${labelOf(skill).toLowerCase()} ber-standar produksi; slot digantikan butir kemampuan lain (tanpa fabrikasi).`
            : `Hanya ${deliveredCount} dari ${requestedCount} butir ${labelOf(skill).toLowerCase()} tersedia dalam sesi ini.`,
      });
    }
  }

  return {
    requested,
    delivered: deliveredList,
    fallback,
    totalRequested: delivered.length,
    totalDelivered: delivered.length,
    difficultyPlan: difficultyPlanForSize(size),
  };
}

interface PickContext {
  now: Date;
  selected: DiagnosticCandidate[];
  usedTopics: Map<string, number>;
  usedSubskills: Map<string, number>;
}

function pickBest(
  pool: DiagnosticCandidate[],
  slotSkill: string,
  wantedDifficulty: "EASY" | "MEDIUM" | "HARD",
  context: PickContext
): DiagnosticCandidate | null {
  let best: DiagnosticCandidate | null = null;
  let bestScore = -Infinity;
  const usedTypeBySkill = new Map<string, Set<DiagnosticQuestionType>>();
  for (const item of context.selected) {
    const set = usedTypeBySkill.get(item.skill) ?? new Set<DiagnosticQuestionType>();
    set.add(item.questionType);
    usedTypeBySkill.set(item.skill, set);
  }

  for (const candidate of pool) {
    const seen = seenRank(candidate, context.now);
    if (candidate.seenAt && seen === 2) continue;
    if (context.selected.some((item) => item.id === candidate.id)) continue;

    const difficulty = candidate.difficulty ?? "MEDIUM";
    const diffScore =
      difficulty === wantedDifficulty ? 60 : Math.max(0, 45 - Math.abs(difficultyIndex(difficulty) - difficultyIndex(wantedDifficulty)) * 15);
    const novelty = (3 - seen) * 10;
    const type = candidate.questionType;
    const typePriority = DIAGNOSTIC_QUESTION_TYPES.indexOf(type);
    const typeUsed = usedTypeBySkill.get(candidate.skill)?.has(type) ?? false;
    const typeScore = typePriority === -1 ? 0 : typeUsed ? 0 : (3 - typePriority) * 8;
    const isSlotSkill = candidate.skill === slotSkill ? 24 : 0;
    const topicSpread = (context.usedTopics.get(candidate.topic ?? "") ?? 0) * 2;
    const subskillSpread = (context.usedSubskills.get(candidate.subskill ?? "") ?? 0) * 2;

    const score = isSlotSkill + diffScore + novelty + typeScore - topicSpread - subskillSpread - priorityOf(candidate.skill);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * Seleksi diagnostik (Part B/C/G): komposisi target per skill, kesulitan per
 * slot (Q1–Q3 EASY, Q4–Q7 MEDIUM, Q8–Q10 HARD), variasi tipe soal, anti-
 * duplikasi + novelty, deterministik, MURNI (tanpa DB/LLM).
 *
 * Fallback jujur: skill yang tidak punya kandidat sah (mis. LISTENING tanpa
 * korpus) DI-SKIP dan digantikan butir skill lain — dicatat di
 * `composition.fallback` dengan alasan eksplisit (Part Q). Bila total butir
 * sah < DIAGNOSTIC_MIN_ITEMS → null (caller memilih mode fallback jujur).
 */
export function selectDiagnosticQuestions(
  candidates: DiagnosticCandidate[],
  size: number = DIAGNOSTIC_DEFAULT_SIZE,
  now: Date = new Date()
): DiagnosticSelection | null {
  if (candidates.length === 0 || candidates.length < DIAGNOSTIC_MIN_ITEMS) return null;
  if (size < DIAGNOSTIC_MIN_ITEMS) return null;
  const targetSize = Math.min(size, Math.max(DIAGNOSTIC_MIN_ITEMS, candidates.length));

  const bySkill = new Map<string, DiagnosticCandidate[]>();
  for (const candidate of candidates) {
    const list = bySkill.get(candidate.skill) ?? [];
    list.push(candidate);
    bySkill.set(candidate.skill, list);
  }
  const presentSkills = [...bySkill.keys()].filter((skill) => (bySkill.get(skill) ?? []).length > 0);
  if (presentSkills.length === 0) return null;

  const plan = difficultyPlanForSize(targetSize);
  const queue = diagnosticCompositionQueue(targetSize);
  const context: PickContext = { now, selected: [], usedTopics: new Map(), usedSubskills: new Map() };
  const fallbackEntries = new Map<string, DiagnosticFallbackEntry>();

  const recordFallback = (skill: string, reason: DiagnosticFallbackEntry["reason"], note: string) => {
    const existing = fallbackEntries.get(skill);
    if (existing) {
      existing.requested += 1;
      existing.note = note;
      fallbackEntries.set(skill, existing);
      return;
    }
    fallbackEntries.set(skill, { skill, label: labelOf(skill), requested: 1, delivered: 0, reason, note });
  };

  for (let slot = 0; slot < queue.length; slot++) {
    const slotSkill = queue[slot];
    const wantedDifficulty = plan[slot] ?? DIAGNOSTIC_DIFFICULTY_CYCLE[slot % DIAGNOSTIC_DIFFICULTY_CYCLE.length];

    let best = pickBest(bySkill.get(slotSkill) ?? [], slotSkill, wantedDifficulty, context);
    if (!best) {
      recordFallback(
        slotSkill,
        "MISSING_CORPUS",
        `Tidak ada butir ${labelOf(slotSkill).toLowerCase()} yang sah/terlihat baru; slot digantikan kemampuan lain.`
      );
      for (const skill of presentSkills) {
        if (skill === slotSkill) continue;
        const candidate = pickBest(bySkill.get(skill) ?? [], skill, wantedDifficulty, context);
        if (candidate && (!best || candidate.id.localeCompare(best.id) < 0)) best = candidate;
      }
    } else if ((best.difficulty ?? "MEDIUM") !== wantedDifficulty) {
      recordFallback(
        slotSkill,
        "DIFFICULTY_UNAVAILABLE",
        `Kesulitan ${labelOf(slotSkill).toLowerCase()} disesuaikan (target ${wantedDifficulty}) karena sel kosong.`
      );
    }

    if (!best) break;
    context.selected.push(best);
    context.usedTopics.set(best.topic ?? "", (context.usedTopics.get(best.topic ?? "") ?? 0) + 1);
    context.usedSubskills.set(best.subskill ?? "", (context.usedSubskills.get(best.subskill ?? "") ?? 0) + 1);
    bySkill.set(best.skill, (bySkill.get(best.skill) ?? []).filter((item) => item.id !== best.id));
  }

  for (let slot = context.selected.length; slot < targetSize; slot++) {
    let best: DiagnosticCandidate | null = null;
    for (const skill of presentSkills) {
      const candidate = pickBest(bySkill.get(skill) ?? [], skill, plan[slot] ?? "MEDIUM", context);
      if (candidate && (!best || candidate.id.localeCompare(best.id) < 0)) best = candidate;
    }
    if (!best) break;
    context.selected.push(best);
    context.usedTopics.set(best.topic ?? "", (context.usedTopics.get(best.topic ?? "") ?? 0) + 1);
    context.usedSubskills.set(best.subskill ?? "", (context.usedSubskills.get(best.subskill ?? "") ?? 0) + 1);
    bySkill.set(best.skill, (bySkill.get(best.skill) ?? []).filter((item) => item.id !== best.id));
  }

  if (context.selected.length < DIAGNOSTIC_MIN_ITEMS) return null;

  const selected = context.selected;
  const composition = summarizeComposition(
    selected.length,
    selected.map((candidate) => ({ skill: candidate.skill, questionType: candidate.questionType }))
  );
  composition.fallback = [...fallbackEntries.values()].sort((a, b) => a.skill.localeCompare(b.skill));

  const skillsCovered = [...new Set(selected.map((candidate) => candidate.skill))].filter(Boolean);
  const difficultiesUsed = [...new Set(selected.map((candidate) => candidate.difficulty ?? "MEDIUM"))];
  const fallback = selected.length < targetSize;
  return {
    questions: selected,
    size: selected.length,
    skillsCovered,
    difficultiesUsed,
    composition,
    fallback,
    fallbackReason: fallback
      ? `Pool menyediakan ${selected.length} butir sah (kurang dari ${targetSize}); sesi tetap valid karena ≥ ${DIAGNOSTIC_MIN_ITEMS} butir.`
      : null,
  };
}