// ─── Kota Cahaya Engine ─────────────────────────────────────
// Misi SATU kelas — tidak ada ranking regu, tidak ada pemenang
// antar pemain. Setiap jawaban BENAR dari participant eligible
// berkontribusi +1 ke target bersama. Salah/unanswered = +0.
// Tidak ada penalti negatif.
//
// Target = config eksplisit sebelum permainan; TIDAK berubah
// karena disconnect/late join/salah jawab/reload.
//
// Contribution faktual TIDAK dihapus setelah target tercapai;
// progressPercent di-cap 100 dan missionCompleted tetap true.

import type { GameEngineResult } from '../../domain/types/game-engine-result';
import type { RoundId } from '../../domain/types/ids';
import type { GameRoundFacts } from '../../contracts/GameRoundFacts';
import { validateRoundFacts } from '../../contracts/GameRoundFacts';

export interface KotaCahayaConfig {
  /** Jumlah jawaban benar yang menjadi target misi. Integer > 0. */
  targetCorrectAnswers: number;
}

/** Milestone domain stabil (code EN, UI Indonesia nanti). */
export type KotaCahayaMilestone =
  | 'garden'
  | 'library'
  | 'homes'
  | 'town-center';

/** Threshold persen milestone — 25/50/75/100. */
export const KOTA_MILESTONE_THRESHOLDS: Record<KotaCahayaMilestone, number> = {
  garden: 25,
  library: 50,
  homes: 75,
  'town-center': 100,
};

export interface KotaCahayaState {
  config: KotaCahayaConfig;
  /** Jumlah faktual jawaban benar yang sudah diaplikasikan. */
  correctContribution: number;
  target: number;
  /** 0..100, capped. */
  progressPercent: number;
  unlockedMilestones: KotaCahayaMilestone[];
  missionCompleted: boolean;
  appliedRoundIds: RoundId[];
  nextRoundIndex: number;
}

export interface KotaCahayaApplyOutcome {
  roundId: RoundId;
  /** Jawaban benar round ini. */
  correctThisRound: number;
  /** Threshold yang BARU tercapai round ini (bukan duplikat). */
  newlyUnlockedMilestones: KotaCahayaMilestone[];
  progressPercent: number;
  missionCompleted: boolean;
}

// ─── Config Validation ──────────────────────────────────────

export function validateKotaCahayaConfig(
  config: KotaCahayaConfig,
): GameEngineResult<{ valid: true }> {
  if (
    !Number.isInteger(config.targetCorrectAnswers) ||
    config.targetCorrectAnswers <= 0
  ) {
    return { ok: false, code: 'INVALID_GAME_CONFIG' };
  }
  return { ok: true, value: { valid: true } };
}

// ─── State ──────────────────────────────────────────────────

export function createKotaCahayaState(
  config: KotaCahayaConfig,
): GameEngineResult<KotaCahayaState> {
  const check = validateKotaCahayaConfig(config);
  if (!check.ok) return check;
  return {
    ok: true,
    value: {
      config: { ...config },
      correctContribution: 0,
      target: config.targetCorrectAnswers,
      progressPercent: 0,
      unlockedMilestones: [],
      missionCompleted: false,
      appliedRoundIds: [],
      nextRoundIndex: 0,
    },
  };
}

// ─── Milestone Derivation (murni dari progress) ─────────────

export function milestonesForProgress(
  progressPercent: number,
): KotaCahayaMilestone[] {
  const unlocked: KotaCahayaMilestone[] = [];
  for (const [milestone, threshold] of Object.entries(KOTA_MILESTONE_THRESHOLDS) as [
    KotaCahayaMilestone,
    number,
  ][]) {
    if (progressPercent + 1e-9 >= threshold) unlocked.push(milestone);
  }
  // Urutkan sesuai threshold agar deterministik.
  return unlocked.sort(
    (a, b) => KOTA_MILESTONE_THRESHOLDS[a] - KOTA_MILESTONE_THRESHOLDS[b],
  );
}

// ─── Apply Round ────────────────────────────────────────────

export type KotaCahayaApplyResult = GameEngineResult<KotaCahayaApplyOutcome>;

export function applyKotaCahayaRound(
  state: KotaCahayaState,
  facts: GameRoundFacts,
): KotaCahayaApplyResult {
  if (state.appliedRoundIds.includes(facts.roundId)) {
    return { ok: false, code: 'ROUND_ALREADY_APPLIED' };
  }
  if (facts.roundIndex !== state.nextRoundIndex) {
    return { ok: false, code: 'ROUND_OUT_OF_ORDER' };
  }
  const validation = validateRoundFacts(facts);
  if (!validation.valid) {
    return { ok: false, code: 'INVALID_ROUND_FACTS' };
  }

  const eligibleIds = new Set(facts.eligiblePlayers.map((p) => p.playerId));
  let correctThisRound = 0;
  for (const answer of facts.answers) {
    if (!eligibleIds.has(answer.playerId)) continue;
    if (answer.isCorrect) correctThisRound += 1;
  }

  // Contribution faktual TIDAK dihapus setelah target tercapai.
  state.correctContribution += correctThisRound;
  state.progressPercent = Math.min(
    100,
    (state.correctContribution / state.target) * 100,
  );
  state.missionCompleted = state.correctContribution >= state.target;

  // Milestone hanya derivasi progress — duplikat tidak di-emit ulang.
  const nowUnlocked = milestonesForProgress(state.progressPercent);
  const previouslyUnlocked = new Set(state.unlockedMilestones);
  const newlyUnlocked = nowUnlocked.filter((m) => !previouslyUnlocked.has(m));
  state.unlockedMilestones = nowUnlocked;

  state.appliedRoundIds.push(facts.roundId);
  state.nextRoundIndex = facts.roundIndex + 1;

  return {
    ok: true,
    value: {
      roundId: facts.roundId,
      correctThisRound,
      newlyUnlockedMilestones: newlyUnlocked,
      progressPercent: state.progressPercent,
      missionCompleted: state.missionCompleted,
    },
  };
}
