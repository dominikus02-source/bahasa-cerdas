// ─── API: Student State (Tahap 6 §15/§24 + Hardening §11) ───
// GET /api/main-bersama/student/state
// Student-safe view personal — TANPA answer key sebelum discussion.
// Credential HANYA via header x-mb-credential (§11): URL query
// DITOLAK — bocor ke log/Referer/history. Reconnect = state GET
// dengan credential yang sama (pull-on-notify dari sinyal broadcast).
// Bukan cookie: subdomain future ayo.* beda registrable domain, dan
// cookie lintas subdomain tidak berlaku di sana; header aman & eksplisit.

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestratorDeps } from '@/src/main-bersama/infrastructure/orchestrator-composition';
import { reconnectPlayer } from '@/src/main-bersama/application/services/student-flows';
import { readCredentialFromRequest } from '@/src/main-bersama/infrastructure/repositories/player-credential';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';

/** Bungkus mapped error → NextResponse (mapper-nya framework-agnostic). */
function errorResponse(code: string, reason?: string) {
  const mapped = mapHttpError(code, reason);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export async function GET(req: NextRequest) {
  const credential = readCredentialFromRequest(req.headers, req.nextUrl);
  if (!credential) {
    return errorResponse('CREDENTIAL_INVALID');
  }

  const deps = getOrchestratorDeps();
  const result = await reconnectPlayer(deps, { credential });
  if (!result.ok) {
    return errorResponse(result.code, result.reason);
  }

  const { buildStudentView } = await import(
    '@/src/main-bersama/presentation/view-mappers'
  );
  const view = buildStudentView(
    result.value.engine,
    result.value.playerId,
    deps.clock.now(),
    result.value.gameState,
  );
  if (!view.ok) return errorResponse('PLAYER_NOT_FOUND');

  return NextResponse.json({ ok: true, view: view.view });
}
