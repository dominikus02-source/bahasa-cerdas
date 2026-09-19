// ─── API: Teacher State (Tahap 6 §3/§26) ────────────────────
// GET /api/main-bersama/teacher/state?sessionId=...
// View operasional penuh untuk guru: phase, answer key, participants,
// aggregates, allowedActions. Ownership: query scoped teacherId (§4).
// Tanpa credential/token siswa apa pun.

import { NextRequest, NextResponse } from 'next/server';
import { resolveVerifiedTeacherActor } from '@/src/main-bersama/adapters/auth/teacher-actor';
import { getOrchestratorDeps } from '@/src/main-bersama/infrastructure/orchestrator-composition';
import {
  loadEngineWithGameState,
} from '@/src/main-bersama/application/services/session-commands';
import { buildTeacherView } from '@/src/main-bersama/presentation/view-mappers';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';


/** Bungkus mapped error → NextResponse (mapper-nya framework-agnostic). */
function errorResponse(code: string, reason?: string) {
  const mapped = mapHttpError(code, reason);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export async function GET(req: NextRequest) {
  const actor = await resolveVerifiedTeacherActor();
  if (!actor) return errorResponse('UNAUTHORIZED');

  const sessionId = req.nextUrl.searchParams.get('sessionId') ?? '';
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, code: 'SESSION_NOT_FOUND', message: 'sessionId wajib.' },
      { status: 400 },
    );
  }

  const deps = getOrchestratorDeps();
  // Ownership ditegakkan di sini juga — teacher B tidak melihat state A.
  const owned = await deps.sessions.findOwnedBy(
    sessionId as never,
    actor.userId,
  );
  if (!owned) return errorResponse('SESSION_NOT_FOUND');

  const loaded = await loadEngineWithGameState(deps, sessionId as never);
  if (!loaded) return errorResponse('SESSION_NOT_FOUND');

  const view = buildTeacherView(loaded.engine, deps.clock.now(), loaded.gameState);
  return NextResponse.json({ ok: true, view });
}
