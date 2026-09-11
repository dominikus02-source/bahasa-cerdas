/**
 * RPG deterministic challenge selector — Pendekar Suryakerta (P1.8B).
 *
 * ONE selector for all RPG contexts (BATTLE/QUEST/NPC/EXPLORATION/BOSS):
 * context influences POLICY, never duplicates infrastructure.
 *
 * Pipeline (all canonical, all reused — nothing reinvented):
 *   SelectionContext
 *   → resolveLearningDifficulty (explicit policy fn)
 *   → filter chain with OBSERVABLE fallback trace
 *   → GameQuestion projection → validateQuestion gate (isEligibleForGameplay)
 *   → sampleQuestions (seeded, recentIds anti-repeat)
 *   → adaptSoalToChallenge → ResolvedChallenge + client-safe projection
 *
 * Guarantees:
 * - Deterministic: same pool + same context + same seed = same question.
 * - No answer-key leak: only the client projection leaves the boundary.
 * - No valid candidate → NO_ELIGIBLE_CHALLENGE (explicit, never fabricated,
 *   never silently substituted across domains).
 * - Anti-repeat rides the canonical sampler's recentIds (caller-supplied,
 *   e.g. session-seen ids) — NO second history database in this phase.
 *   Persistent attempt history is a documented boundary (see below), not code.
 *
 * Pure + deterministic. No React/DOM/storage/network/renderer/RNG.
 * (Math.random appears NOWHERE here — the sampler is always seeded.)
 */

/*
 * PERSISTENCE BOUNDARY (defined, not built — §8):
 * A future LearningAttempt record {challengeId, attemptId, playerId,
 * resolvedAt} would feed recentIds across sessions. Until then, recentIds
 * are session-scoped and caller-supplied. No storage system is created here.
 */

import type { GameQuestion, QuestionDifficulty } from "@/lib/game-questions/types";
import { isEligibleForGameplay } from "@/lib/game-questions/quality";
import { sampleQuestions } from "@/lib/game-questions/sampler";
import type { LearningContext, LearningDifficulty, SoalLike } from "./rpg-challenge";
import { adaptSoalToChallenge, toClientChallenge, difficultyFor } from "./rpg-challenge";
import type { ResolvedChallenge, LearningChallenge } from "./rpg-challenge";

/** What the RPG asks for. Only encounterId+context+seed are required. */
export interface SelectionContext {
  /** Stable encounter identity (battleId, tile key, npcId, quest objective…). */
  encounterId: string;
  context: LearningContext;
  /** Player level drives the difficulty band when no override is given. */
  level?: number;
  /** Explicit difficulty wins over the level band. */
  difficulty?: LearningDifficulty;
  /** Canonical domain filter (P1.8A LearningDomain serialized form). */
  domain?: string;
  /** Topic filter (Soal.topik exact match). */
  topic?: string;
  /** Curriculum filters (Soal.kelas / Soal.KD exact match). */
  kelas?: string;
  kd?: string;
  /** Quest linkage (preserved metadata, quest engine stays authoritative). */
  questId?: string;
  /** Enemy/boss linkage (preserved metadata, no separate engine). */
  enemyId?: string;
  /** Caller-supplied recent ids (session anti-repeat, canonical sampler). */
  recentIds?: string[];
  /** Deterministic seed; derived from encounterId when omitted. */
  seed?: string;
}

/** One explicit policy function (§6) — no giant tables. */
export function resolveLearningDifficulty(args: {
  level?: number;
  override?: LearningDifficulty;
}): LearningDifficulty {
  if (args.override) return args.override;
  const level = args.level ?? 1;
  if (level <= 2) return "EASY";
  if (level <= 5) return "MEDIUM";
  return "HARD";
}

/** Observable fallback step (§11): every decision is traceable + testable. */
export interface FallbackStep {
  step: string;
  candidates: number;
}

export type SelectionOutcome =
  | {
      outcome: "SELECTED";
      resolved: ResolvedChallenge;
      client: LearningChallenge;
      difficulty: LearningDifficulty;
      trace: FallbackStep[];
    }
  | { outcome: "NO_ELIGIBLE_CHALLENGE"; difficulty: LearningDifficulty; trace: FallbackStep[] };

/** Project a Soal row to the canonical GameQuestion runtime shape. */
export function soalToGameQuestion(soal: SoalLike): GameQuestion {
  const diff = difficultyFor(soal.difficulty);
  return {
    id: soal.kodeSoal || soal.id,
    question: (soal.text ?? "").trim(),
    options: [...(soal.options ?? [])],
    correctAnswer: (soal.correctAnswer ?? "").trim(),
    explanation: soal.explanation ?? undefined,
    difficulty: diff as QuestionDifficulty,
    topic: soal.topik ?? undefined,
    skill: soal.skillTag ?? undefined,
    source: "soal",
  };
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Select one challenge from canonical Soal candidates.
 * `pool` is caller-provided (DB/service layer owns fetching; this phase
 * defines selection, not storage access).
 */
export function selectChallenge(
  pool: SoalLike[],
  ctx: SelectionContext,
): SelectionOutcome {
  const difficulty = resolveLearningDifficulty({ level: ctx.level, override: ctx.difficulty });
  const seed = ctx.seed ?? `${ctx.encounterId}:${ctx.context.toLowerCase()}:${difficulty.toLowerCase()}`;
  const trace: FallbackStep[] = [];
  const no = (): SelectionOutcome => ({ outcome: "NO_ELIGIBLE_CHALLENGE", difficulty, trace });

  if (!Array.isArray(pool) || pool.length === 0) {
    trace.push({ step: "empty-pool", candidates: 0 });
    return no();
  }

  // Controlled fallback sequence (§11): exact → domain → curriculum → general.
  // Domain compares against the candidate skillTag/topik (raw canonical forms).
  const domain = ctx.domain ? norm(ctx.domain) : "";
  const matchDomain = (s: SoalLike): boolean => {
    if (!domain) return true;
    return norm(s.skillTag) === domain || norm(s.topik) === domain;
  };
  const matchDiff = (s: SoalLike): boolean => difficultyFor(s.difficulty) === difficulty;
  const matchTopic = (s: SoalLike): boolean => {
    if (!ctx.topic) return true;
    return norm(s.topik) === norm(ctx.topic);
  };
  const matchCurriculum = (s: SoalLike): boolean => {
    if (ctx.kelas && norm(s.kelas) !== norm(ctx.kelas)) return false;
    if (ctx.kd && norm(s.KD) !== norm(ctx.kd)) return false;
    return true;
  };

  const stages: Array<{ step: string; filter: (s: SoalLike) => boolean }> = [
    { step: "exact(topic+domain+difficulty)", filter: (s) => matchTopic(s) && matchDomain(s) && matchDiff(s) },
    { step: "domain+difficulty", filter: (s) => matchDomain(s) && matchDiff(s) },
    { step: "curriculum+domain", filter: (s) => matchCurriculum(s) && matchDomain(s) },
    { step: "domain", filter: matchDomain },
    { step: "general-pool", filter: () => true },
  ];

  for (const stage of stages) {
    const filtered = pool.filter(stage.filter);
    trace.push({ step: stage.step, candidates: filtered.length });
    if (filtered.length === 0) continue;
    // Canonical quality gate (§9): reject invalid, never fix, never invent.
    const eligible = filtered.filter((s) => isEligibleForGameplay(soalToGameQuestion(s)));
    if (eligible.length === 0) continue;
    const picked = sampleQuestions(
      eligible.map(soalToGameQuestion),
      1,
      { seed, recentIds: ctx.recentIds },
    );
    if (picked.length === 0) continue;
    const source = eligible.find((s) => (s.kodeSoal || s.id) === picked[0].id);
    if (!source) continue;
    const resolved = adaptSoalToChallenge(source, ctx.context);
    if (!resolved) continue;
    return { outcome: "SELECTED", resolved, client: toClientChallenge(resolved), difficulty, trace };
  }
  return no();
}
