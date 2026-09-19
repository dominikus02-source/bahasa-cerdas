// ─── Publish State Helper (role-safe, revision-gated) ───────
// Derive TIGA view role dari engine — digunakan route handlers untuk
// respons HTTP. FANOUT REALTIME TIDAK terjadi di sini: semua
// publish real-time memakai sinyal invalidation via port
// `deps.realtimeSignal` (Supabase Broadcast produksi; hardening §3),
// yang dipanggil di dalam application services SETELAH persist sukses.
//
// Model (§22/§5): client menerima sinyal "state berubah" → menarik
// state role-nya via GET authoritative (pull-on-notify). Serializer
// role-specific di view-mappers tetap SECURITY BOUNDARY (§23).

import type { SessionEngine } from '../application/services/session-engine';
import type { SessionOrchestratorDeps } from '../application/services/orchestrator-ports';
import type { GameEngineState } from '../games/game-router';
import {
  buildStudentView,
  buildTeacherView,
  buildProjectorView,
} from './view-mappers';

export type { StudentViewResult } from './view-mappers';

/** Revision state — dipakai informasional pada payload HTTP. */
export function revisionOfSession(engine: SessionEngine): number {
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

/**
 * Publish role views — versi test/QA: return ketiga view TANPA
 * side-effect realtime (sinyal dikirim application services).
 * Produksi memakai view langsung di route handlers.
 */
export function buildRoleViews(
  engine: SessionEngine,
  playerId: string | null,
  now: Date,
  gameState: GameEngineState | null,
): {
  student: ReturnType<typeof buildStudentView>;
  teacher: ReturnType<typeof buildTeacherView>;
  projector: ReturnType<typeof buildProjectorView>;
} {
  const student = playerId !== null
    ? buildStudentView(engine, playerId, now, gameState)
    : ({ ok: false, code: 'PLAYER_NOT_FOUND' } as const);
  return {
    student,
    teacher: buildTeacherView(engine, now, gameState),
    projector: buildProjectorView(engine, now, gameState),
  };
}

/** Kompatibel pemanggil lama: view siswa personal. */
export function studentViewOf(
  engine: SessionEngine,
  playerId: string,
  now: Date,
  gameState: GameDocument,
): ReturnType<typeof buildStudentView> {
  return buildStudentView(engine, playerId, now, gameState);
}

type GameDocument = GameEngineState | null;

/** Kompatibel pemanggil lama: view guru. */
export function teacherViewOf(
  engine: SessionEngine,
  now: Date,
  gameState: GameDocument,
): ReturnType<typeof buildTeacherView> {
  return buildTeacherView(engine, now, gameState);
}

/** Kompatibel pemanggil lama: view proyektor. */
export function projectorViewOf(
  engine: SessionEngine,
  now: Date,
  gameState: GameDocument,
): ReturnType<typeof buildProjectorView> {
  return buildProjectorView(engine, now, gameState);
}
