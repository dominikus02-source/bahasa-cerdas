import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getJourney } from "@/lib/learning-loop/journey";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/player/journey?limit=20 — timeline "Perjalanan Belajar" user
 * (terbaru dulu). `limit` default 20, dibatasi maksimal 100.
 * Mengembalikan `{ entries }`.
 */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );

  const entries = await getJourney(user.id, limit);
  return NextResponse.json({ entries });
}
