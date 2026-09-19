// ─── View Mappers (Security Boundary) ───────────────────────
// Runtime state → TIGA serialization berbeda per role. Field
// sensitif TIDAK PERNAH berada di view non-reveal — bukan
// "frontend sembunyikan sendiri". Mapping murni, tanpa I/O.
//
//  - Student: tanpa correctOptionId/isCorrect/explanation sebelum
//    discussion; tanpa teacherId/userId/reconnectToken.
//  - Projector: agregat publik; tanpa identitas individu & key.
//  - Teacher: visibilitas penuh operasional + answer key, TANPA
//    credential/token siapa pun.

import type { SessionEngine } from '../application/services/session-engine';
import type { RuntimePlayer } from '../domain/entities/session-runtime-state';
import type {
  MainQuestionSnapshot,
  PublicQuestionView,
} from '../domain/entities/question';
import type { GameMode, SessionPhase } from '../domain/types/session';
import type { PlayerId, RoundId, TeamId } from '../domain/types/ids';
import type { GameEngineState } from '../games/game-router';
import type { JelajahKataState } from '../games/jelajah-kata/jelajah-kata-engine';
import type { KotaCahayaState } from '../games/kota-cahaya/kota-cahaya-engine';

/** Ambil sub-state per mode dari union game state. */
export function jelajahOf(gs: GameEngineState | null): JelajahKataState | null {
  return gs?.gameMode === 'jelajah-kata' ? gs.jelajah : null;
}
export function kotaOf(gs: GameEngineState | null): KotaCahayaState | null {
  return gs?.gameMode === 'kota-cahaya' ? gs.kota : null;
}
import type { StudentSessionView } from '../contracts/views/student';
import type {
  TeacherAllowedActions,
  TeacherParticipantInfo,
  TeacherSessionView,
} from '../contracts/views/teacher';
import type { ProjectorSessionView } from '../contracts/views/projector';
import type { TeamPublicInfo } from '../contracts/views/common';
import { JELAJAH_DEFAULT_TEAMS } from '../domain/entities/team';

// ─── Shared helpers ─────────────────────────────────────────

/** Soal versi publik — answer key dihapus di level tipe. */
export function toPublicQuestionView(q: MainQuestionSnapshot): PublicQuestionView {
  const view: PublicQuestionView = {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options.map((o) => ({ ...o })),
  };
  if (q.passage) view.passage = { ...q.passage };
  return view;
}

function revisionOf(engine: SessionEngine): number {
  const answersCount = [...engine.state.answersByRound.values()].reduce(
    (n, m) => n + m.size,
    0,
  );
  return (
    engine.state.rounds.length * 1000 +
    engine.state.players.size * 100 +
    answersCount
  );
}

function teamsPublic(): TeamPublicInfo[] {
  return Object.values(JELAJAH_DEFAULT_TEAMS).map((t) => ({ ...t }));
}

/** Progress per regu dari game state jelajah (0..100). */
function jelajahTeamProgress(state: JelajahKataState | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(JELAJAH_DEFAULT_TEAMS)) {
    out[key] = state?.teams[key]?.progress ?? 0;
  }
  return out;
}

function kotaProgress(state: KotaCahayaState | null): {
  progressPercent: number;
  unlockedMilestones: string[];
} {
  return {
    progressPercent: state?.progressPercent ?? 0,
    unlockedMilestones: state?.unlockedMilestones ?? [],
  };
}

function optionCountsForRound(
  engine: SessionEngine,
  roundId: RoundId,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const answers = engine.state.answersByRound.get(roundId);
  if (!answers) return counts;
  for (const answer of answers.values()) {
    counts[answer.selectedOptionId] = (counts[answer.selectedOptionId] ?? 0) + 1;
  }
  return counts;
}

function eligibleCountForRound(engine: SessionEngine, roundId: RoundId): number {
  const round = engine.state.rounds.find((r) => r.id === roundId);
  return round ? round.eligiblePlayerIds.length : 0;
}

// ─── Student ────────────────────────────────────────────────

export type StudentViewResult =
  | { ok: true; view: StudentSessionView }
  | { ok: false; code: 'PLAYER_NOT_FOUND' };

/**
 * View siswa untuk SATU peserta. `own` menentukan status jawaban
 * miliknya; player lain tidak pernah bocor ke sini.
 */
export function buildStudentView(
  engine: SessionEngine,
  playerId: PlayerId,
  now: Date,
  gameState: GameEngineState | null = null,
): StudentViewResult {
  const player = engine.state.players.get(playerId);
  if (!player) return { ok: false, code: 'PLAYER_NOT_FOUND' };

  const session = engine.state.session;
  const base = {
    role: 'student' as const,
    sessionId: session.id,
    serverTime: now.toISOString(),
    revision: revisionOf(engine),
    gameMode: session.gameMode as GameMode,
    displayName: player.displayName,
    connectionStatus: (player.connected ? 'connected' : 'disconnected') as
      | 'connected'
      | 'disconnected',
  };

  const phase = session.phase;
  const jelajah = jelajahOf(gameState);
  const kota = kotaOf(gameState);

  // Pre-round: preparing/lobby/closed/paused.
  if (phase === 'preparing' || phase === 'lobby' || phase === 'closed' || phase === 'paused') {
    return {
      ok: true,
      view: {
        ...base,
        phase,
        participantCount: engine.state.players.size,
      },
    };
  }

  // Round aktif (question) — tanpa answer key apa pun.
  if (phase === 'question') {
    const round = engine.activeRound();
    if (!round) {
      return {
        ok: true,
        view: { ...base, phase: 'lobby', participantCount: engine.state.players.size },
      };
    }
    const own = engine.state.answersByRound.get(round.id)?.get(playerId);
    const team = player.teamId
      ? JELAJAH_DEFAULT_TEAMS[player.teamId as keyof typeof JELAJAH_DEFAULT_TEAMS]
      : undefined;
    return {
      ok: true,
      view: {
        ...base,
        phase: 'question',
        roundId: round.id,
        roundIndex: round.index,
        totalRounds: session.totalRounds,
        question: toPublicQuestionView(round.question),
        ownAnswerStatus: own ? 'saved' : 'not-submitted',
        closesAt: (round.closesAt ?? now).toISOString(),
        ...(team ? { team: { id: team.id, name: team.name, symbol: team.symbol } } : {}),
      },
    };
  }

  // Reveal: discussion/summary/ended — reveal round aktif/terakhir.
  const round = engine.activeRound() ?? engine.state.rounds[engine.state.rounds.length - 1] ?? null;
  if (!round) {
    // Tanpa round sama sekali (korup/teoretis) — kembali ke pre-round aman.
    return {
      ok: true,
      view: { ...base, phase: 'lobby', participantCount: engine.state.players.size },
    };
  }
  const own = engine.state.answersByRound.get(round.id)?.get(playerId);
  const teamProgress = session.gameMode === 'jelajah-kata' ? jelajahTeamProgress(jelajah) : undefined;
  return {
    ok: true,
    view: {
      ...base,
      phase: phase as 'discussion' | 'summary' | 'ended',
      roundIndex: round.index,
      totalRounds: session.totalRounds,
      revealedRound: {
        roundId: round.id,
        question: toPublicQuestionView(round.question),
        correctOptionId: round.question.correctOptionId,
        ...(round.question.explanation ? { explanation: round.question.explanation } : {}),
        optionCounts: optionCountsForRound(engine, round.id),
      },
      ownAnswerIsCorrect: own?.isCorrect ?? false,
      gameProgress: {
        teamProgress: teamProgress ?? {},
      },
    },
  };
}

// ─── Teacher ────────────────────────────────────────────────

function allowedActionsFor(phase: SessionPhase, totalRounds: number, currentRoundIndex: number | null): TeacherAllowedActions {
  const roundOpen = phase === 'question';
  const closed = phase === 'closed';
  const discussion = phase === 'discussion';
  const canGoNext = discussion && (currentRoundIndex ?? -1) + 1 < totalRounds;
  return {
    canStartSession: phase === 'lobby',
    canOpenNextRound: canGoNext,
    canCloseRound: roundOpen,
    canStartDiscussion: closed,
    canGoToNextRound: canGoNext,
    canPause: phase === 'lobby' || roundOpen || closed || discussion,
    canResume: phase === 'paused',
    canEndSession: phase !== 'ended',
  };
}

/** Daftar peserta untuk guru — identitas tampil, tanpa credential. */
function teacherParticipants(engine: SessionEngine): TeacherParticipantInfo[] {
  const activeRound = engine.activeRound();
  const answers = activeRound
    ? engine.state.answersByRound.get(activeRound.id)
    : undefined;
  const out: TeacherParticipantInfo[] = [];
  for (const player of engine.state.players.values()) {
    out.push({
      playerId: player.id,
      displayName: player.displayName,
      ...(player.teamId ? { teamId: player.teamId } : {}),
      ...(player.userId ? { userId: player.userId } : {}),
      connectionStatus: player.connected ? 'connected' : 'disconnected',
      participationStatus: player.participationStatus,
      joinedRoundIndex: player.eligibleFromRoundIndex,
      hasAnsweredCurrentRound: answers?.has(player.id) ?? false,
    });
  }
  return out;
}

export function buildTeacherView(
  engine: SessionEngine,
  now: Date,
  gameState: GameEngineState | null = null,
): TeacherSessionView {
  const session = engine.state.session;
  const phase = session.phase;
  const activeRound = engine.activeRound();
  const jelajah = jelajahOf(gameState);
  const kota = kotaOf(gameState);

  const answerSummary = activeRound
    ? {
        submittedCount: engine.state.answersByRound.get(activeRound.id)?.size ?? 0,
        eligibleCount: activeRound.eligiblePlayerIds.length,
        optionCounts:
          phase === 'closed' || phase === 'discussion' || phase === 'summary' || phase === 'ended'
            ? optionCountsForRound(engine, activeRound.id)
            : null,
      }
    : { submittedCount: 0, eligibleCount: 0, optionCounts: null };

  return {
    role: 'teacher',
    sessionId: session.id,
    serverTime: now.toISOString(),
    revision: revisionOf(engine),
    gameMode: session.gameMode as GameMode,
    phase,
    currentRoundIndex: session.currentRoundIndex,
    totalRounds: session.totalRounds,
    currentRoundId: activeRound?.id ?? null,
    currentRoundClosesAt: activeRound?.closesAt?.toISOString() ?? null,
    currentQuestion: activeRound ? { ...activeRound.question } : null,
    teams: teamsPublic(),
    participants: teacherParticipants(engine),
    answerSummary,
    gameState:
      jelajah
        ? {
            gameMode: 'jelajah-kata',
            jelajahKata: { teamProgress: jelajahTeamProgress(jelajah) },
          }
        : kota
          ? {
              gameMode: 'kota-cahaya',
              kotaCahaya: {
                correctContribution: kota.correctContribution,
                target: kota.target,
                progressPercent: kota.progressPercent,
                unlockedMilestones: [...kota.unlockedMilestones],
              },
            }
          : null,
    allowedActions: allowedActionsFor(phase, session.totalRounds, session.currentRoundIndex),
  };
}

// ─── Projector ──────────────────────────────────────────────

export function buildProjectorView(
  engine: SessionEngine,
  now: Date,
  gameState: GameEngineState | null = null,
): ProjectorSessionView {
  const session = engine.state.session;
  const phase = session.phase;
  const activeRound = engine.activeRound();
  const jelajah = jelajahOf(gameState);
  const kota = kotaOf(gameState);

  const lobby = phase === 'lobby' || phase === 'preparing' || phase === 'paused';
  const revealable = phase === 'discussion' || phase === 'summary' || phase === 'ended';

  let submittedCount = 0;
  for (const answers of engine.state.answersByRound.values()) submittedCount += answers.size;

  const finalResult = (() => {
    if (phase !== 'summary' && phase !== 'ended') return null;
    if (session.gameMode === 'jelajah-kata' && jelajah) {
      const ranking = Object.values(jelajah.teams)
        .map((t) => ({ teamId: t.teamId as TeamId, progress: t.progress }))
        .sort((a, b) => b.progress - a.progress);
      return { gameMode: 'jelajah-kata' as const, teamRanking: ranking };
    }
    if (kota) {
      return {
        gameMode: 'kota-cahaya' as const,
        missionAchieved: kota.missionCompleted,
        progressPercent: kota.progressPercent,
      };
    }
    return null;
  })();

  return {
    role: 'projector',
    sessionId: session.id,
    serverTime: now.toISOString(),
    revision: revisionOf(engine),
    gameMode: session.gameMode as GameMode,
    phase,
    joinInfo: lobby
      ? {
          pin: session.pin,
          joinUrlTemplate: '/main-bersama/join?pin={pin}',
          ...(session.className ? { className: session.className } : {}),
        }
      : null,
    ...(session.className ? { className: session.className } : {}),
    currentRoundIndex: session.currentRoundIndex,
    totalRounds: session.totalRounds,
    currentQuestion: activeRound ? toPublicQuestionView(activeRound.question) : null,
    participation: {
      playerCount: engine.state.players.size,
      eligibleCount: activeRound ? activeRound.eligiblePlayerIds.length : 0,
      submittedCount: activeRound
        ? engine.state.answersByRound.get(activeRound.id)?.size ?? 0
        : submittedCount,
    },
    teams: teamsPublic(),
    gameProgress:
      session.gameMode === 'jelajah-kata'
        ? { gameMode: 'jelajah-kata' as const, teamProgress: jelajahTeamProgress(jelajah) }
        : { gameMode: 'kota-cahaya' as const, ...kotaProgress(kota) },
    revealedRound: (() => {
      if (!revealable) return null;
      const round = activeRound ?? engine.state.rounds[engine.state.rounds.length - 1];
      if (!round) return null;
      return {
        roundId: round.id,
        question: toPublicQuestionView(round.question),
        correctOptionId: round.question.correctOptionId,
        ...(round.question.explanation ? { explanation: round.question.explanation } : {}),
        optionCounts: optionCountsForRound(engine, round.id),
      };
    })(),
    finalResult,
  };
}
