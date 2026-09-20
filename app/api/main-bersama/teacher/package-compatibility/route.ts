// ─── API: Package Compatibility (Tahap 7 §3/§6) ─────────────
// POST /api/main-bersama/teacher/package-compatibility
// Read-only evaluasi paket: berapa soal didukung Main Bersama v1.
// Sumber logika = adapter Tahap 5 (evaluatePackageCompatibility) —
// TIDAK ada duplikasi aturan. TANPA membaca isi soal ke client:
// respons hanya angka (total/supported/unsupported).
//
// Package ref dinormalisasi lewat adapter yang SAMA dengan create-
// session (SoalSet, MASTER_THEME, dan tema Bank Soal BANK_THEME),
// sehingga angka yang dilihat guru == yang dipakai saat membuat sesi.

import { NextRequest, NextResponse } from 'next/server';
import { resolveVerifiedTeacherActor } from '@/src/main-bersama/adapters/auth/teacher-actor';
import { PrismaBankSoalQuestionSource } from '@/src/main-bersama/adapters/bank-soal/bank-soal-source';
import { PrismaBankThemeQuestionSource } from '@/src/main-bersama/infrastructure/repositories/prisma-bank-theme-source';
import { evaluatePackageCompatibility } from '@/src/main-bersama/adapters/bank-soal/compatibility';
import { normalizePackageRef } from '@/src/main-bersama/adapters/bank-soal/package-ref';
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
  const packageRef = normalizePackageRef(body.packageRef);
  if (!packageRef) return errorResponse('PACKAGE_NOT_FOUND');

  // Komposisi di edge (composition root): adapter Bank Soal tetap tidak
  // mengimpor util Bank Soal BC — implementasi tema diinjeksi di sini.
  const source = await new PrismaBankSoalQuestionSource(
    new PrismaBankThemeQuestionSource(),
  ).loadQuestions(packageRef);
  if (!source.ok) return errorResponse('PACKAGE_NOT_FOUND');

  const compat = evaluatePackageCompatibility(source.questions);
  // `requested` = jumlah soal yang diminta guru (tema Bank Soal). Bila
  // sumber hanya menyediakan lebih sedikit (mis. 10 diminta, 7 lolos
  // verifikasi kualitas), guru melihat angka permintaan — bukan hanya
  // apa yang kebetulan tersedia — supaya tidak ada pemotongan senyap.
  const requested = packageRef.kind === 'BANK_THEME' ? packageRef.count ?? null : null;
  return NextResponse.json({
    ok: true,
    total: compat.total,
    supported: compat.supported,
    unsupported: compat.unsupported,
    fullyCompatible: compat.fullyCompatible,
    requested,
  });
}
