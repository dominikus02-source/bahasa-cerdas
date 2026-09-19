// ─── API: Submit Answer (Tahap 6 §15/§16) ───────────────────
// POST /api/main-bersama/student/answers
// credential → player → engine validate → persist → ACK.
// ACK TIDAK memuat isCorrect/answer key/explanation (AnswerSubmitResult).

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestratorDeps } from '@/src/main-bersama/infrastructure/orchestrator-composition';
import { submitAnswer } from '@/src/main-bersama/application/services/student-flows';
import { readCredentialFromRequest } from '@/src/main-bersama/infrastructure/repositories/player-credential';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';
import type { StudentErrorCode } from '@/src/main-bersama/application/services/student-flows';

const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;


/** Bungkus mapped error → NextResponse (mapper-nya framework-agnostic). */
function errorResponse(code: string, reason?: string) {
  const mapped = mapHttpError(code, reason);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export async function POST(req: NextRequest) {
  let body: {
    roundId?: unknown;
    submissionId?: unknown;
    selectedOptionId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse('MALFORMED_CREDENTIAL');
  }

  // Credential HANYA via header x-mb-credential (§11 hardening) —
  // tidak pernah di body/query. Query string ditolak eksplisit.
  const credential = readCredentialFromRequest(req.headers, req.nextUrl);
  if (!credential) return errorResponse('CREDENTIAL_INVALID');
  const roundId = typeof body.roundId === 'string' ? body.roundId : '';
  const submissionId =
    typeof body.submissionId === 'string' ? body.submissionId : '';
  const selectedOptionId =
    typeof body.selectedOptionId === 'string' ? body.selectedOptionId : '';

  if (!roundId || !SUBMISSION_ID_PATTERN.test(submissionId) || !selectedOptionId) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_OPTION', message: 'Payload jawaban tidak lengkap.' },
      { status: 400 },
    );
  }

  const deps = getOrchestratorDeps();
  const result = await submitAnswer(deps, {
    credential,
    roundId: roundId as never,
    submissionId: submissionId as never,
    selectedOptionId,
  });
  if (!result.ok) {
    return errorResponse(result.code as StudentErrorCode, result.reason);
  }

  // ACK — tanpa kebenaran jawaban (§15).
  return NextResponse.json({
    ok: true,
    status: result.value.status,
    submissionId: result.value.submissionId,
  });
}
