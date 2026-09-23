// ─── Guard Mutasi Main Bersama (route layer) ────────────────
// SATU helper untuk SEMUA route yang mengubah state (Tahap 8A.4 §2).
// Route hanya perlu dua baris:
//
//   const blocked = mainBersamaMutationBlocked('teacher/commands');
//   if (blocked) return blocked;
//
// Kebijakan keputusannya ada di src/main-bersama/presentation/
// mutation-guard.ts (murni, teruji). Di sini hanya pembungkusan
// framework: respond 503 + pesan Bahasa Indonesia yang tidak
// membocorkan env/DB.

import { NextResponse } from 'next/server';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';
import {
  MUTATIONS_DISABLED_CODE,
  currentMutationPolicy,
  logMutationBlocked,
} from '@/src/main-bersama/presentation/mutation-guard';

/**
 * Null bila mutasi boleh dijalankan; NextResponse 503 bila diblokir.
 * `routeLabel` hanya untuk log server.
 */
export function mainBersamaMutationBlocked(
  routeLabel: string,
): NextResponse | null {
  const policy = currentMutationPolicy();
  if (policy.allowed) return null;

  logMutationBlocked(routeLabel);
  const mapped = mapHttpError(MUTATIONS_DISABLED_CODE);
  return NextResponse.json(mapped.body, { status: mapped.status });
}
