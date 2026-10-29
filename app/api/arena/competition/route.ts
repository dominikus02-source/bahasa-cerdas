import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isUmum, UMUM_FORBIDDEN_MESSAGE } from "@/lib/auth/roles";
import { getWeeklyCompetition } from "@/lib/gamification/motivation";

/**
 * GET /arena/competition — payload "Kompetisi Minggu Ini" + Hall of Fame.
 * Role-gated: murid melihat kompetisinya sendiri; guru/founder membaca versi
 * tanpa `my` (kompetisi murid) untuk preview.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // UMUM punya progresi XP sendiri; papan peringkat murid tertutup baginya.
  if (isUmum(user.role)) return NextResponse.json({ error: UMUM_FORBIDDEN_MESSAGE }, { status: 403 });

  const payload = await getWeeklyCompetition(user.id);

  return NextResponse.json(payload);
}
