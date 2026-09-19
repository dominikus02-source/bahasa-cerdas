// ─── API: Package Compatibility (Tahap 7 §3/§6) ─────────────
// POST /api/main-bersama/teacher/package-compatibility
// Read-only evaluasi paket: berapa soal didukung Main Bersama v1.
// Sumber logika = adapter Tahap 5 (evaluatePackageCompatibility) —
// TIDAK ada duplikasi aturan. TANPA membaca isi soal ke client:
// respons hanya angka (total/supported/unsupported).

import { NextRequest, NextResponse } from 'next/server';
import { resolveVerifiedTeacherActor } from '@/src/main-bersama/adapters/auth/teacher-actor';
import { PrismaBankSoalQuestionSource } from '@/src/main-bersama/adapters/bank-soal/bank-soal-source';
import { evaluatePackageCompatibility } from '@/src/main-bersama/adapters/bank-soal/compatibility';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';

/** Bungkus mapped error → NextResponse (mapper-nya framework-agnostic). */
function errorResponse(code: string, reason?: string) {
  const mapped = mapHttpError(code, reason);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export async function POST(req: NextRequest) {
  const actor = await resolveVerifiedTeacherActor();
  if (!actor) return errorResponse('UNAUTHORIZED');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('PACKAGE_NOT_FOUND');
  }
  const packageRef = body.packageRef;
  if (
    !packageRef ||
    typeof packageRef !== 'object' ||
    typeof (packageRef as { soalSetId?: unknown }).soalSetId !== 'string'
  ) {
    return errorResponse('PACKAGE_NOT_FOUND');
  }

  const source = await new PrismaBankSoalQuestionSource().loadQuestions(
    packageRef as { kind: 'SOAL_SET'; soalSetId: string },
  );
  if (!source.ok) return errorResponse('PACKAGE_NOT_FOUND');

  const compat = evaluatePackageCompatibility(source.questions);
  return NextResponse.json({
    ok: true,
    total: compat.total,
    supported: compat.supported,
    unsupported: compat.unsupported,
    fullyCompatible: compat.fullyCompatible,
  });
}
