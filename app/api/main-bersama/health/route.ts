// ─── API: Diagnostic Kesiapan Main Bersama (Tahap 8A.4 §4) ───
// GET /api/main-bersama/health
//
// Tujuan terbatas: developer/operator dapat langsung tahu bahwa
// penyimpanan Main Bersama BELUM tersedia di database yang dipakai
// deployment ini (kasus yang membuat "Buka Ruang" gagal 500 tanpa
// petunjuk). Bukan health dashboard, bukan monitoring.
//
// Yang TIDAK pernah keluar dari endpoint ini:
// - nama tabel / detail skema;
// - pesan error Prisma;
// - DATABASE_URL / credential;
// - status autentikasi/identitas siapa pun.
//
// Hanya guru terautentikasi yang boleh memanggilnya (endpoint
// diagnostik internal, bukan permukaan publik).

import { NextResponse } from 'next/server';
import { resolveVerifiedTeacherActor } from '@/src/main-bersama/adapters/auth/teacher-actor';
import { checkMainBersamaStorage } from '@/src/main-bersama/infrastructure/persistence/storage-readiness';

export async function GET() {
  const actor = await resolveVerifiedTeacherActor();
  if (!actor) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: 'Anda tidak memiliki akses.' },
      { status: 401 },
    );
  }

  const { state } = await checkMainBersamaStorage();
  return NextResponse.json(
    {
      ok: true,
      /** `ready` | `unavailable` (skema belum diterapkan) | `unknown`. */
      storage: state,
      checkedAt: new Date().toISOString(),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
