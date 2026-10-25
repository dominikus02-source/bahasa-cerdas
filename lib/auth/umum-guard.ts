import { NextResponse } from "next/server";

/**
 * Guard API untuk alat AI guru (penilaian, EYD, umpan balik, analisis teks,
 * RPP, soal, ilustrasi, agen + ekspor). Pengguna UMUM mendapat 403
 * "fitur khusus guru" — BUKAN 402/kuota — supaya UI tidak menawarkan
 * upgrade paket untuk fitur yang memang bukan untuk perannya.
 *
 * Hanya menyasar role UMUM (non-founder). Perilaku GURU/MURID/ADMIN tidak
 * berubah. NARA (/api/ai/bc, persona netral) TIDAK memakai guard ini.
 */
export const UMUM_GURU_TOOL_MESSAGE = "Fitur khusus guru.";

export function isUmumBlockedFromGuruTools(user: { role?: string | null; isFounder?: boolean | null } | null | undefined): boolean {
  return !!user && user.role === "UMUM" && user.isFounder !== true;
}

export function umumGuruToolForbidden(
  user: { role?: string | null; isFounder?: boolean | null } | null | undefined,
): NextResponse | null {
  if (!isUmumBlockedFromGuruTools(user)) return null;
  return NextResponse.json(
    { error: UMUM_GURU_TOOL_MESSAGE, code: "FORBIDDEN_ROLE", message: UMUM_GURU_TOOL_MESSAGE },
    { status: 403 },
  );
}
