// ─── Jelajah Kata Engine ────────────────────────────────────
// 4 regu, semua bermain sampai akhir. Tidak ada serangan,
// power-up, inventory, atau speed bonus. Accuracy = dasar progress.
// Denominator = eligible snapshot yang DIKUNCI Session Engine —
// unanswered & disconnected tetap dalam denominator.
//
// Rumus per round (fairness utama — ukuran regu tidak memengaruhi
// delta):
//   teamEligible = jumlah eligible player regu tsb
//   teamCorrect  = jumlah answer BENAR dari eligible player regu tsb
//   accuracy     = teamEligible > 0 ? teamCorrect / teamEligible : 0
//   roundDelta   = accuracy × (100 / totalRounds)
//   teamProgress = clamp(teamProgress + roundDelta, 0, 100)
//
// Progress logical 0..100 (bukan pixel/koordinat). Nilai TIDAK
// dibulatkan per round (hindari drift); pembulatan hanya untuk
// display di presentation. Final di-clamp 100.
//
// Tie: comparison eksplisit dengan epsilon 1e-9 (bukan strict
// float equality). Ranking pakai competition ranking (1,1,3):
// tidak ada tie breaker speed/join order/random/abjad.

import type { GameEngineResult } from '../../domain/types/game-engine-result';
import type { RoundId, TeamId } from '../../domain/types/ids';
import type { GameRoundFacts } from '../../contracts/GameRoundFacts';
import { validateRoundFacts } from '../../contracts/GameRoundFacts';
import {
  JELAJAH_TEAM_KEYS,
  JELAJAH_DEFAULT_TEAMS,
} from '../../domain/entities/team';
import type { MainTeam } from '../../domain/entities/team';

/** Epsilon perbandingan numerik — didokumentasikan & diuji. */
export const PROGRESS_EPSILON = 1e-9;

export interface JelajahKataState {
  teams: Record<TeamId, JelajahTeamProgress>;
  /** Round yang sudah diaplikasikan — idempotency. */
  appliedRoundIds: RoundId[];
  /** Index round berikutnya yang boleh diaplikasikan (urutan ketat). */
  nextRoundIndex: number;
  totalRounds: number;
}

export interface JelajahTeamProgress {
  teamId: TeamId;
  name: string;
  symbol: string;
  /** Progress logical 0..100 (tidak dibulatkan per round). */
  progress: number;
}

export interface JelajahRoundResultEntry {
  teamId: TeamId;
  eligibleCount: number;
  answeredCount: number;
  correctCount: number;
  /** 0..1 — teamCorrect / teamEligible (0 bila tanpa eligible). */
  accuracy: number;
  /** Kontribusi round ini (accuracy × 100/totalRounds). */
  delta: number;
  progressAfter: number;
}

export interface JelajahKataRankEntry {
  teamId: TeamId;
  progress: number;
  /** Competition ranking: seri = rank sama, berikutnya melompat. */
  rank: number;
}

export interface JelajahKataSummary {
  ranking: JelajahKataRankEntry[];
  /** Team dengan rank 1 — bisa lebih dari satu (juara bersama). */
  winners: TeamId[];
}

// ─── State ──────────────────────────────────────────────────

export function createJelajahKataState(totalRounds: number): JelajahKataState {
  const teams: Record<TeamId, JelajahTeamProgress> = {};
  for (const key of JELAJAH_TEAM_KEYS) {
    const team: MainTeam = JELAJAH_DEFAULT_TEAMS[key];
    teams[team.id] = {
      teamId: team.id,
      name: team.name,
      symbol: team.symbol,
      progress: 0,
    };
  }
  return { teams, appliedRoundIds: [], nextRoundIndex: 0, totalRounds };
}

// ─── Apply Round ────────────────────────────────────────────

export type JelajahApplyResult = GameEngineResult<{
  roundId: RoundId;
  /** Semua regu tetap ada — entry per regu utk projector/report. */
  roundResults: JelajahRoundResultEntry[];
}>;

export function applyJelajahKataRound(
  state: JelajahKataState,
  facts: GameRoundFacts,
): JelajahApplyResult {
  // Invariant & idempotency & urutan.
  if (state.appliedRoundIds.includes(facts.roundId)) {
    return { ok: false, code: 'ROUND_ALREADY_APPLIED' };
  }
  if (facts.roundIndex !== state.nextRoundIndex) {
    return { ok: false, code: 'ROUND_OUT_OF_ORDER' };
  }
  const validation = validateRoundFacts(facts, {
    requireTeamForAll: true,
    validTeamIds: JELAJAH_TEAM_KEYS,
  });
  if (!validation.valid) {
    return { ok: false, code: 'INVALID_ROUND_FACTS' };
  }

  const roundWeight = 100 / state.totalRounds;

  // Akumulasi per regu (unanswered tetap di denominator — cukup
  // menghitung correct; eligible snapshot menentukan pembagi).
  const eligibleCount = new Map<TeamId, number>();
  const correctCount = new Map<TeamId, number>();
  for (const player of facts.eligiblePlayers) {
    const teamId = player.teamId as TeamId;
    eligibleCount.set(teamId, (eligibleCount.get(teamId) ?? 0) + 1);
  }
  const eligibleIds = new Set(facts.eligiblePlayers.map((p) => p.playerId));
  for (const answer of facts.answers) {
    // Guard eksplisit: hanya answer dari eligible dihitung.
    if (!eligibleIds.has(answer.playerId)) continue;
    if (!answer.isCorrect) continue;
    const player = facts.eligiblePlayers.find((p) => p.playerId === answer.playerId);
    const teamId = player!.teamId as TeamId;
    correctCount.set(teamId, (correctCount.get(teamId) ?? 0) + 1);
  }

  const roundResults: JelajahRoundResultEntry[] = [];
  for (const key of JELAJAH_TEAM_KEYS) {
    const teamId = key as TeamId;
    const team = state.teams[teamId];
    const teamEligible = eligibleCount.get(teamId) ?? 0;
    const teamCorrect = correctCount.get(teamId) ?? 0;
    const answeredCount = countTeamAnswers(facts, teamId);
    const accuracy = teamEligible > 0 ? teamCorrect / teamEligible : 0;
    const delta = accuracy * roundWeight;
    // Clamp untuk keamanan numerik; tidak dibulatkan (anti-drift).
    team.progress = Math.min(100, Math.max(0, team.progress + delta));

    roundResults.push({
      teamId,
      eligibleCount: teamEligible,
      answeredCount,
      correctCount: teamCorrect,
      accuracy,
      delta,
      progressAfter: team.progress,
    });
  }

  state.appliedRoundIds.push(facts.roundId);
  state.nextRoundIndex = facts.roundIndex + 1;

  return { ok: true, value: { roundId: facts.roundId, roundResults } };
}

function countTeamAnswers(facts: GameRoundFacts, teamId: TeamId): number {
  const teamPlayerIds = new Set(
    facts.eligiblePlayers.filter((p) => p.teamId === teamId).map((p) => p.playerId),
  );
  return facts.answers.filter((a) => teamPlayerIds.has(a.playerId)).length;
}

// ─── Ranking (competition ranking, tie-friendly) ───────────

export function summarizeJelajahKata(
  state: JelajahKataState,
): JelajahKataSummary {
  const sorted = Object.values(state.teams).sort((a, b) => b.progress - a.progress);
  const ranking: JelajahKataRankEntry[] = [];
  let lastProgress: number | null = null;
  let lastRank = 0;
  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    const tied =
      lastProgress !== null &&
      Math.abs(team.progress - lastProgress) < PROGRESS_EPSILON;
    const rank = tied ? lastRank : i + 1;
    ranking.push({ teamId: team.teamId, progress: team.progress, rank });
    lastProgress = team.progress;
    lastRank = rank;
  }
  const winners = ranking.filter((r) => r.rank === 1).map((r) => r.teamId);
  return { ranking, winners };
}

/** Seri secara matematis bila selisih < epsilon (eksplisit, terdokumentasi). */
export function isProgressTie(a: number, b: number): boolean {
  return Math.abs(a - b) < PROGRESS_EPSILON;
}
