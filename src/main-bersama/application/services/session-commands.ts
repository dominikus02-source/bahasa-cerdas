// ─── Orchestrator: Teacher Commands (Tahap 6 §11/§14/§17-§21) ──
// Orkestrasi persistence → Session Engine → Game Engine →
// persistence → view mapper. Prinsip (§1): client hanya mengirim
// command; server yang menentukan phase/correctness/deadline dsb.
//
// Identitas guru SUDAH diverifikasi Auth adapter (VerifiedTeacherActor)
// — orchestrator TIDAK menerima teacherId dari request (§4).
//
// Error gameplay = typed result; unexpected = throw (programming bug).

import { isIndependentJelajah } from './independent-jelajah';
import type { RoundId, SessionId } from '../../domain/types/ids';
import type { SessionEngine } from './session-engine';
import type { GameEngineState } from '../../games/game-router';
import { createGameState, applyGameRound, summarizeGame } from '../../games/game-router';
import type { KotaCahayaState } from '../../games/kota-cahaya/kota-cahaya-engine';
import type {
  SessionOrchestratorDeps,
  SessionStore,
} from './orchestrator-ports';
import { buildRoundFacts } from './round-facts-projection';
import { finalizeKotaTarget } from './kota-target-policy';
import type { VerifiedTeacherActor } from '../use-cases/create-main-session';

// ─── Typed error codes (mapped ke HTTP oleh route handler) ───

export type TeacherCommandErrorCode =
  | 'UNAUTHORIZED'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_PHASE'
  | 'ROUND_NOT_OPEN'
  | 'NO_ELIGIBLE_PLAYERS'
  | 'INVALID_GAME_CONFIG'
  | 'ROUND_ALREADY_APPLIED'
  | 'SESSION_ENDED'
  | 'INTERNAL';

export type TeacherCommandResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: TeacherCommandErrorCode; reason?: string };

// ─── Engine + game state loader ─────────────────────────────

/**
 * Muat engine + game state persisted untuk sesi ini.
 * Null bila sesi tidak ditemukan. Game state Kota PENDING_ROSTER
 * belum ada — null aman (dibuat saat start).
 */
export async function loadEngineWithGameState(
  deps: SessionOrchestratorDeps,
  sessionId: SessionId,
): Promise<{ engine: SessionEngine; gameState: GameEngineState | null } | null> {
  const resolved = await deps.resolver.resolve(sessionId);
  if (!resolved.ok) return null;
  const persisted = await deps.gameStates.loadGameState(sessionId);
  // Persisted store = source kebenaran game state setelah restart;
  // engine runtime tidak memegang game state.
  return {
    engine: resolved.engine,
    gameState: persisted ? (persisted.state as GameEngineState) : null,
  };
}

// ─── Ownership (§4) ─────────────────────────────────────────

/** Ownership + engine untuk command guru. Null → NOT_FOUND/FORBIDDEN. */
async function requireOwnedEngine(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<
  | { ok: true; engine: SessionEngine; gameState: GameEngineState | null }
  | { ok: false; code: TeacherCommandErrorCode }
> {
  if (!actor || (actor.role !== 'GURU' && actor.role !== 'ADMIN')) {
    return { ok: false, code: 'UNAUTHORIZED' };
  }
  // Sesi WAJIB milik guru ini — Teacher B tidak pernah bisa
  // mengontrol sesi Teacher A (query scoped teacherId).
  const owned = await deps.sessions.findOwnedBy(sessionId, actor.userId);
  if (!owned) {
    // Jangan bocorkan keberadaan sesi orang lain.
    const exists = await deps.sessions.findById(sessionId);
    return exists ? { ok: false, code: 'UNAUTHORIZED' } : { ok: false, code: 'SESSION_NOT_FOUND' };
  }
  // Command guru harus membaca roster/phase authoritative. Pada Vercel,
  // instance guru bisa memegang cache sebelum siswa join di instance lain.
  // Buang cache sebelum command agar Start/Tutup/Bahas tidak memakai roster
  // atau phase yang basi.
  deps.resolver.discard?.(sessionId);
  const loaded = await loadEngineWithGameState(deps, sessionId);
  if (!loaded) return { ok: false, code: 'SESSION_NOT_FOUND' };
  return { ok: true, ...loaded };
}

/**
 * Persist sesi + pause durability (phase + kolom pause).
 * Setelah mutasi state, kirim sinyal invalidation (best-effort —
 * kegagalan sinyal tidak pernah mengubah hasil command, §5).
 */
async function persistSession(
  deps: SessionOrchestratorDeps,
  engine: SessionEngine,
): Promise<void> {
  await deps.sessions.save(engine.state.session);
  const pause = engine.state.pause;
  if (pause) {
    await deps.sessions.savePauseState(
      engine.sessionId,
      {
        fromPhase: pause.fromPhase,
        ...(pause.fromPhase === 'question'
          ? { roundId: pause.roundId, remainingMs: pause.remainingMs }
          : {}),
      } as Parameters<SessionStore['savePauseState']>[1],
      deps.clock.now(),
    );
  } else {
    await deps.sessions.savePauseState(engine.sessionId, null, deps.clock.now());
  }
  await deps.realtimeSignal.sendSessionUpdate(engine.sessionId);
}

// ─── Open Lobby ─────────────────────────────────────────────

export async function openLobby(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<TeacherCommandResult<{ phase: 'lobby' }>> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;

  const result = guard.engine.openLobby();
  if (!result.ok) {
    return {
      ok: false,
      code: result.code === 'SESSION_ENDED' ? 'SESSION_ENDED' : 'INVALID_PHASE',
    };
  }
  await deps.sessions.saveSessionProgress(sessionId, 'lobby', null);
  await deps.realtimeSignal.sendSessionUpdate(sessionId);
  return { ok: true, value: { phase: 'lobby' } };
}

// ─── Start Session (§11 — finalisasi Kota) ──────────────────

export interface StartSessionOutcome {
  phase: 'question';
  roundIndex: number;
  roundId: string;
  closesAt: string;
  /** Target Kota hasil finalisasi (bila mode kota-cahaya). */
  kotaTarget?: number;
}

/**
 * Start: lobby → round pertama. Untuk Kota PENDING_ROSTER:
 * finalisasi target SEBELUM round dibuka (§11) — roster eligible
 * round 0 diketahui dari engine state saat ini.
 */
export async function startSession(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<TeacherCommandResult<StartSessionOutcome>> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;
  const { engine, gameState } = guard;
  const session = engine.state.session;

  if (session.phase !== 'lobby') {
    return { ok: false, code: 'INVALID_PHASE', reason: 'start hanya dari lobby' };
  }

  // Eligible roster round pertama — peserta yang sudah join di lobby.
  const rosterPlayerIds = [...engine.state.players.values()]
    .filter((p) => p.eligibleFromRoundIndex === 0)
    .map((p) => p.id);
  if (rosterPlayerIds.length === 0) {
    return { ok: false, code: 'NO_ELIGIBLE_PLAYERS' };
  }

  if (session.gameMode === 'jelajah-kata' && deps.rounds.startIndependentJelajah) {
    const opened = await deps.rounds.startIndependentJelajah(sessionId, deps.clock.now());
    deps.resolver.discard?.(sessionId);
    try { await deps.realtimeSignal.sendSessionUpdate(sessionId); } catch { /* Durable start remains successful; clients also poll. */ }
    return { ok: true, value: { phase: 'question', roundIndex: 0, roundId: opened.roundId, closesAt: '' } };
  }

  // Kota PENDING_ROSTER: finalisasi target SEKARANG (§11/§12),
  // SEBELUM round pertama dibuka. Setelah ini target FIXED.
  let finalizedKotaTarget: number | undefined;
  if (session.gameMode === 'kota-cahaya' && gameState === null) {
    const target = finalizeKotaTarget({
      eligiblePlayerCount: rosterPlayerIds.length,
      totalRounds: session.totalRounds,
    });
    if (target === null) return { ok: false, code: 'INVALID_GAME_CONFIG' };
    const created = createGameState({
      gameMode: 'kota-cahaya',
      kota: { targetCorrectAnswers: target },
    });
    if (!created.ok) return { ok: false, code: 'INVALID_GAME_CONFIG' };
    await deps.kotaTarget.saveKotaTarget(sessionId, target);
    await deps.gameStates.saveGameState({
      sessionId,
      gameMode: 'kota-cahaya',
      state: created.value,
      final: false,
    });
    finalizedKotaTarget = target;
  }

  // Buka round pertama (transaksional di repository).
  const opened = await openRoundPersisted(deps, engine);
  if (!opened.ok) return opened;
  if (opened.value.summary) return { ok: false, code: 'INTERNAL' };
  await deps.realtimeSignal.sendSessionUpdate(sessionId);
  return {
    ok: true,
    value: {
      phase: 'question',
      roundIndex: opened.value.roundIndex,
      roundId: opened.value.roundId,
      closesAt: opened.value.closesAt,
      ...(finalizedKotaTarget !== undefined ? { kotaTarget: finalizedKotaTarget } : {}),
    },
  };
}

// ─── Round lifecycle (§14/§17/§18/§19) ──────────────────────

/** Buka round berikutnya + persist round/eligible/phase atomic. */
async function openRoundPersisted(
  deps: SessionOrchestratorDeps,
  engine: SessionEngine,
): Promise<
  | {
      ok: true;
      value: { roundIndex: number; roundId: string; closesAt: string; summary: boolean };
    }
  | { ok: false; code: TeacherCommandErrorCode; reason?: string }
> {
  const result = engine.openRound();
  if (!result.ok) {
    return {
      ok: false,
      code: result.code === 'SESSION_ENDED' ? 'SESSION_ENDED' : 'INVALID_PHASE',
    };
  }
  if (result.value.outcome === 'summary') {
    await deps.sessions.saveSessionProgress(engine.sessionId, 'summary', null);
    await deps.realtimeSignal.sendSessionUpdate(engine.sessionId);
    return { ok: true, value: { roundIndex: -1, roundId: '', closesAt: '', summary: true } };
  }
  const round = engine.activeRound();
  if (!round) return { ok: false, code: 'INTERNAL' };
  await deps.rounds.save({
    id: round.id,
    sessionId: round.sessionId,
    index: round.index,
    question: round.question,
    eligiblePlayerIds: [...round.eligiblePlayerIds],
    eligibleTeamIds: round.eligibleTeamIds ?? {},
    phase: round.phase,
    openedAt: round.openedAt,
    closesAt: round.closesAt,
  });
  await deps.sessions.saveSessionProgress(engine.sessionId, 'question', round.index);
  await deps.realtimeSignal.sendSessionUpdate(engine.sessionId);
  return {
    ok: true,
    value: {
      roundIndex: round.index,
      roundId: round.id,
      closesAt: (round.closesAt as Date).toISOString(),
      summary: false,
    },
  };
}

/** Simple command shape engine (union semua method mutator). */
type EngineMutation =
  | { ok: true; value: { phase: string; [key: string]: unknown } }
  | { ok: false; code: string };

export async function closeRound(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<
  TeacherCommandResult<{ roundId: string; closedAt: string; alreadyClosed: boolean }>
> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;
  if (isIndependentJelajah(guard.engine.state)) return { ok: false, code: 'INVALID_PHASE', reason: 'Jelajah Kata berjalan otomatis per regu.' };
  const { engine, gameState } = guard;

  const result = engine.closeRound();
  if (!result.ok) {
    return {
      ok: false,
      code: result.code === 'SESSION_ENDED' ? 'SESSION_ENDED' : 'INVALID_PHASE',
    };
  }
  const { roundId, closedAt, alreadyClosed } = result.value;
  const round = engine.activeRound();
  await deps.rounds.save({
    id: roundId,
    sessionId: engine.sessionId,
    index: round?.index ?? 0,
    question: round?.question ?? ({ id: '', sourceQuestionId: '', type: 'single-choice', prompt: '', options: [], correctOptionId: '' } as never),
    eligiblePlayerIds: [...(round?.eligiblePlayerIds ?? [])],
    eligibleTeamIds: round?.eligibleTeamIds ?? {},
    phase: 'closed',
    closedAt,
  });
  await deps.sessions.saveSessionProgress(
    sessionId,
    'closed',
    engine.state.session.currentRoundIndex,
  );

  // Game engine apply — HANYA sekali per round (idempotent durable):
  // per-round result insert unik; ROUND_ALREADY_APPLIED = retry aman,
  // tidak double score, aman setelah restart (§17/§40).
  //
  // Cache-coherence: status durable round/sesi sudah 'closed' di atas,
  // tetapi cache engine in-process bisa BASI terhadap MainAnswer yang
  // dipersist instance lain. Buang cache lalu hydrate ulang dari DB
  // (source of truth accepted answers) SEBELUM buildRoundFacts, supaya
  // setiap jawaban yang benar-benar accepted berkontribusi TEPAT sekali.
  deps.resolver.discard?.(sessionId);
  const reloaded = await deps.resolver.resolve(sessionId);
  const engineForFacts = reloaded.ok ? reloaded.engine : engine;
  if (gameState) {
    const facts = buildRoundFacts(engineForFacts, roundId);
    if (facts) {
      const applied = applyGameRound(gameState, facts);
      if (!applied.ok) {
        if (applied.code === 'ROUND_ALREADY_APPLIED') {
          return {
            ok: true,
            value: { roundId, closedAt: closedAt.toISOString(), alreadyClosed: true },
          };
        }
        return { ok: false, code: 'INTERNAL', reason: applied.code };
      }
      const saved = await deps.gameStates.saveGameRoundResult({
        sessionId,
        gameMode: gameState.gameMode,
        roundId,
        result: applied.value,
      });
      if (!saved.ok && saved.code === 'ROUND_ALREADY_APPLIED') {
        return {
          ok: true,
          value: { roundId, closedAt: closedAt.toISOString(), alreadyClosed: true },
        };
      }
      await deps.gameStates.saveGameState({
        sessionId,
        gameMode: gameState.gameMode,
        state: gameState,
        final: false,
      });
    }
  }
  await deps.realtimeSignal.sendSessionUpdate(sessionId);
  return { ok: true, value: { roundId, closedAt: closedAt.toISOString(), alreadyClosed } };
}

export async function startDiscussion(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<TeacherCommandResult<{ phase: 'discussion' }>> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;
  if (isIndependentJelajah(guard.engine.state)) return { ok: false, code: 'INVALID_PHASE', reason: 'Jelajah Kata berjalan otomatis per regu.' };
  const result = guard.engine.startDiscussion();
  if (!result.ok) {
    return {
      ok: false,
      code: result.code === 'SESSION_ENDED' ? 'SESSION_ENDED' : 'INVALID_PHASE',
    };
  }
  await deps.sessions.saveSessionProgress(
    sessionId,
    'discussion',
    guard.engine.state.session.currentRoundIndex,
  );
  await deps.realtimeSignal.sendSessionUpdate(sessionId);
  return { ok: true, value: { phase: 'discussion' } };
}

export async function nextRound(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<
  TeacherCommandResult<{
    phase: 'question' | 'summary';
    roundIndex: number;
    roundId: string | null;
    closesAt: string | null;
  }>
> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;
  if (isIndependentJelajah(guard.engine.state)) return { ok: false, code: 'INVALID_PHASE', reason: 'Jelajah Kata berjalan otomatis per regu.' };
  const opened = await openRoundPersisted(deps, guard.engine);
  if (!opened.ok) return opened;
  return {
    ok: true,
    value: opened.value.summary
      ? { phase: 'summary', roundIndex: -1, roundId: null, closesAt: null }
      : {
          phase: 'question',
          roundIndex: opened.value.roundIndex,
          roundId: opened.value.roundId,
          closesAt: opened.value.closesAt,
        },
  };
}

/**
 * Jelajah Kata tidak menunggu guru bila semua peserta pada snapshot round
 * sudah menjawab: claim durable → hitung progres → buka soal berikutnya.
 *
 * Dipanggil setelah setiap jawaban yang berhasil tersimpan. Claim memakai
 * compare-and-set pada MainRound OPEN, jadi walau jawaban terakhir masuk
 * hampir bersamaan dari beberapa perangkat, tepat satu request yang boleh
 * menjalankan transisi ini. Kota Cahaya tetap memakai kontrol guru biasa.
 */
export async function autoAdvanceJelajahIfRoundComplete(
  deps: SessionOrchestratorDeps,
  sessionId: SessionId,
  roundId: RoundId,
): Promise<void> {
  if (!deps.rounds.claimAutoAdvance) return;

  // Muat ulang setelah jawaban durable agar hitungan memakai semua respons
  // yang benar-benar diterima lintas instance/serverless.
  deps.resolver.discard?.(sessionId);
  const initial = await loadEngineWithGameState(deps, sessionId);
  if (!initial || initial.engine.state.session.gameMode !== 'jelajah-kata') return;
  if (initial.engine.state.session.phase !== 'question') return;

  const activeRound = initial.engine.activeRound();
  if (!activeRound || activeRound.id !== roundId) return;
  const facts = initial.engine.getRoundFacts(roundId);
  if (!facts || facts.eligiblePlayerIds.length === 0 || facts.submittedCount < facts.eligiblePlayerIds.length) {
    return;
  }

  const claimed = await deps.rounds.claimAutoAdvance({
    sessionId,
    roundId,
    roundIndex: activeRound.index,
    closedAt: deps.clock.now(),
  });
  if (!claimed) return;

  // Claim sudah memindahkan sesi ke discussion dan menutup round secara
  // atomik. Rehydrate sekali lagi sebelum skor agar fakta hasil selalu
  // authoritative, kemudian langsung buka soal berikutnya tanpa layar
  // pembahasan manual.
  deps.resolver.discard?.(sessionId);
  const claimedState = await loadEngineWithGameState(deps, sessionId);
  if (!claimedState || claimedState.engine.state.session.gameMode !== 'jelajah-kata') return;

  const claimedRound = claimedState.engine.activeRound();
  const claimedFacts = claimedRound ? buildRoundFacts(claimedState.engine, claimedRound.id) : null;
  if (
    !claimedRound ||
    !claimedFacts ||
    !claimedState.gameState ||
    claimedState.gameState.gameMode !== 'jelajah-kata'
  ) {
    return;
  }

  const applied = applyGameRound(claimedState.gameState, claimedFacts);
  if (applied.ok) {
    const saved = await deps.gameStates.saveGameRoundResult({
      sessionId,
      gameMode: claimedState.gameState.gameMode,
      roundId: claimedRound.id,
      result: applied.value,
    });
    if (saved.ok) {
      await deps.gameStates.saveGameState({
        sessionId,
        gameMode: claimedState.gameState.gameMode,
        state: claimedState.gameState,
        final: false,
      });
    } else if (saved.code !== 'ROUND_ALREADY_APPLIED') {
      return;
    }
  } else if (applied.code !== 'ROUND_ALREADY_APPLIED') {
    return;
  }

  await openRoundPersisted(deps, claimedState.engine);
}

function mapMutationCode(code: string): TeacherCommandErrorCode {
  return code === 'SESSION_ENDED' ? 'SESSION_ENDED' : 'INVALID_PHASE';
}

export async function pauseSession(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<TeacherCommandResult<{ phase: 'paused' }>> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;
  if (isIndependentJelajah(guard.engine.state)) return { ok: false, code: 'INVALID_PHASE', reason: 'Jelajah Kata berjalan otomatis per regu.' };
  const result: EngineMutation = guard.engine.pause();
  if (!result.ok) return { ok: false, code: mapMutationCode(result.code) };
  await persistSession(deps, guard.engine);
  return { ok: true, value: { phase: 'paused' } };
}

export async function resumeSession(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<TeacherCommandResult<{ phase: string }>> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;
  if (isIndependentJelajah(guard.engine.state)) return { ok: false, code: 'INVALID_PHASE', reason: 'Jelajah Kata berjalan otomatis per regu.' };
  const result: EngineMutation = guard.engine.resume();
  if (!result.ok) return { ok: false, code: mapMutationCode(result.code) };
  await persistSession(deps, guard.engine);
  return { ok: true, value: { phase: result.value.phase } };
}

export async function endSession(
  deps: SessionOrchestratorDeps,
  actor: VerifiedTeacherActor,
  sessionId: SessionId,
): Promise<TeacherCommandResult<{ phase: 'ended' }>> {
  const guard = await requireOwnedEngine(deps, actor, sessionId);
  if (!guard.ok) return guard;
  if (isIndependentJelajah(guard.engine.state) && !['summary', 'ended'].includes(guard.engine.state.session.phase)) return { ok: false, code: 'INVALID_PHASE', reason: 'Tunggu semua regu menyelesaikan permainan.' };
  const { engine, gameState } = guard;
  const result = engine.endSession();
  if (!result.ok) {
    return {
      ok: false,
      code: result.code === 'SESSION_ENDED' ? 'SESSION_ENDED' : 'INVALID_PHASE',
    };
  }
  await persistSession(deps, engine);
  // Final summary game state (jelajah ranking / kota mission) —
  // satu row 'summary' per sesi untuk report/audit (§20).
  if (gameState) {
    const summary = summarizeGame(gameState);
    await deps.gameStates.saveGameState({
      sessionId,
      gameMode: gameState.gameMode,
      state: gameState,
      final: true,
    });
    if (summary) {
      const saved = await deps.gameStates.saveGameRoundResult({
        sessionId,
        gameMode: gameState.gameMode,
        roundId: 'summary' as RoundId,
        result: summary,
      });
      // Row summary sudah ada (double end) → idempotent, abaikan.
      if (!saved.ok && saved.code !== 'ROUND_ALREADY_APPLIED') {
        return { ok: false, code: 'INTERNAL' };
      }
    }
  }
  await deps.realtimeSignal.sendSessionUpdate(sessionId);
  return { ok: true, value: { phase: 'ended' } };
}
