import { NextResponse } from "next/server";
import { getSocialProofSnapshot } from "@/lib/social-proof";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/social-proof
 *
 * Endpoint publik (tanpa auth) untuk angka social proof landing page.
 * Data berasal dari query Prisma (lihat lib/social-proof.ts) dan di-cache
 * Redis 5 menit + CDN (s-maxage). Saat database tidak dapat diakses,
 * endpoint tetap 200 dengan semua nilai null — pemanggil menampilkan label
 * tanpa angka, tidak ada angka karangan.
 */
export async function GET() {
  const snapshot = await getSocialProofSnapshot();

  const body = {
    users: snapshot?.users ?? null,
    students: snapshot?.students ?? null,
    teachers: snapshot?.teachers ?? null,
    works: snapshot?.works ?? null,
    updatedAt: snapshot?.updatedAt ?? null,
  };

  const response = NextResponse.json(body);
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );
  return response;
}