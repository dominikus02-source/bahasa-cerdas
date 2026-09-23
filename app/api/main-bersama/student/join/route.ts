// ─── API: Student Join (Tahap 6 §5/§6) ──────────────────────
// POST /api/main-bersama/student/join
// PIN → sesi aktif → player + credential + student-safe view.
// Authenticated student (jika login) ter-link userId; guest null.
// PIN bukan authorization secret — tidak ada data guru di respons.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/src/main-bersama/adapters/auth/teacher-actor';
import { getOrchestratorDeps } from '@/src/main-bersama/infrastructure/orchestrator-composition';
import { joinSession } from '@/src/main-bersama/application/services/student-flows';
import { buildStudentView } from '@/src/main-bersama/presentation/view-mappers';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';
import type { StudentErrorCode } from '@/src/main-bersama/application/services/student-flows';
import type { StudentSessionView } from '@/src/main-bersama/contracts/views/student';
import { mainBersamaMutationBlocked } from '@/lib/main-bersama/mutation-guard';


/** Bungkus mapped error → NextResponse (mapper-nya framework-agnostic). */
function errorResponse(code: string, reason?: string) {
  const mapped = mapHttpError(code, reason);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export async function POST(req: NextRequest) {
  // Safety mutasi (Tahap 8A.4 §1): join MEMBUAT player baru. Tamu tidak
  // punya auth, jadi guard jalan paling awal — sebelum body/DB disentuh.
  const blocked = mainBersamaMutationBlocked('student/join');
  if (blocked) return blocked;

  let body: { pin?: unknown; displayName?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse('MALFORMED_CREDENTIAL');
  }

  const pin = typeof body.pin === 'string' ? body.pin : '';
  if (!/^\d{6}$/.test(pin)) {
    return errorResponse('SESSION_NOT_FOUND');
  }

  // Authenticated student opsional — guest didukung penuh (§6).
  const user = await getAuthenticatedUser();


  const deps = getOrchestratorDeps();
  const result = await joinSession(deps, {
    pin,
    ...(body.displayName !== undefined ? { displayName: body.displayName as string } : {}),
    ...(user ? { userId: user.id } : {}),
  });
  if (!result.ok) {
    return errorResponse(result.code as StudentErrorCode, result.reason);
  }

  // Student-safe view untuk fase saat join (joinable = bukan summary/ended).
  const loaded = await deps.resolver.resolve(result.value.sessionId);
  let viewValue: StudentSessionView | null = null;
  if (loaded.ok) {
    const view = buildStudentView(loaded.engine, result.value.playerId, new Date(), null);
    if (view.ok) viewValue = view.view;
  }
  if (!viewValue) return errorResponse('SESSION_NOT_FOUND');

  // Sinyal lobby dikirim DI DALAM joinSession (application service —
  // setelah persist sukses) via deps.realtimeSignal — bukan di route.

  return NextResponse.json({
    ok: true,
    session: {
      id: result.value.sessionId,
      ...(result.value.teamId !== undefined ? { teamId: result.value.teamId } : {}),
    },
    player: {
      id: result.value.playerId,
      displayName: result.value.displayName,
      eligibleFromRoundIndex: result.value.eligibleFromRoundIndex,
      lateJoin: result.value.lateJoin,
      rejoin: result.value.rejoin,
    },
    /** Credential opaque — HANYA di sini; tidak pernah ke teacher/projector. */
    credential: result.value.credential,
    view: viewValue,
  });
}
