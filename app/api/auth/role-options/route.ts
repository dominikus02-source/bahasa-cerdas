import { NextResponse } from "next/server";
import { isRoleUmumEnabled } from "@/lib/auth/umum-flag";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/role-options — opsi peran yang boleh DITAMPILKAN di
 * /register dan /auth/pilih-peran.
 *
 * Satu-satunya cara klien mengetahui flag server ENABLE_ROLE_UMUM (tidak ada
 * NEXT_PUBLIC_*). Ini hanya untuk tampilan: server tetap memvalidasi ulang di
 * role-intent / complete-role / create-user. Kategori Umum tidak lagi
 * ditanyakan di UI (server menyimpan UMUM), jadi tidak dikirim di sini.
 */
export async function GET() {
  const umum = isRoleUmumEnabled();
  return NextResponse.json(
    { roles: umum ? ["GURU", "MURID", "UMUM"] : ["GURU", "MURID"] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
