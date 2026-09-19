// ─── API: Projector State (Tahap 6 §3/§25) ──────────────────
// GET /api/main-bersama/projector/state?pin=... (atau sessionId)
// Public-safe view read-only — TANPA userId individual, jawaban
// individual, teacher credential, dan answer key sebelum reveal.
// Projector TIDAK punya command endpoint gameplay.

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestratorDeps } from '@/src/main-bersama/infrastructure/orchestrator-composition';
import {
  loadEngineWithGameState,
} from '@/src/main-bersama/application/services/session-commands';
import { buildProjectorView } from '@/src/main-bersama/presentation/view-mappers';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';


/** Bungkus mapped error → NextResponse (mapper-nya framework-agnostic). */
function errorResponse(code: string, reason?: string) {
  const mapped = mapHttpError(code, reason);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export async function GET(req: NextRequest) {
  const deps = getOrchestratorDeps();

  // Resolusi via PIN (lobby) atau sessionId (reconnect layar).
  const pin = req.nextUrl.searchParams.get('pin');
  const sessionIdParam = req.nextUrl.searchParams.get('sessionId');

  let sessionId = sessionIdParam ?? '';
  if (!sessionId && pin && /^\d{6}$/.test(pin)) {
    const session = await deps.sessions.findByPin(pin);
    if (!session) return errorResponse('SESSION_NOT_FOUND');
    sessionId = session.id;
  }
  if (!sessionId) return errorResponse('SESSION_NOT_FOUND');

  const loaded = await loadEngineWithGameState(deps, sessionId as never);
  if (!loaded) return errorResponse('SESSION_NOT_FOUND');

  const view = buildProjectorView(loaded.engine, deps.clock.now(), loaded.gameState);
  return NextResponse.json({ ok: true, view });
}
