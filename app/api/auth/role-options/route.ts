import { NextResponse } from "next/server";
import { isRoleUmumEnabled } from "@/lib/auth/umum-flag";
import { KATEGORI_UMUM_LABEL, KATEGORI_UMUM_PILIHAN } from "@/lib/auth/kategori-umum";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/role-options — opsi peran yang boleh DITAMPILKAN di
 * /register dan /auth/pilih-peran.
 *
 * Satu-satunya cara klien mengetahui flag server ENABLE_ROLE_UMUM (tidak ada
 * NEXT_PUBLIC_*). Ini hanya untuk tampilan: server tetap memvalidasi ulang di
 * role-intent / complete-role / create-user. Kategori internal (INVESTOR,
 * TAMU) tidak pernah dikirim.
 */
export async function GET() {
  const umum = isRoleUmumEnabled();
  return NextResponse.json(
    {
      roles: umum ? ["GURU", "MURID", "UMUM"] : ["GURU", "MURID"],
      kategoriUmum: umum
        ? KATEGORI_UMUM_PILIHAN.map((value) => ({ value, label: KATEGORI_UMUM_LABEL[value] }))
        : [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
