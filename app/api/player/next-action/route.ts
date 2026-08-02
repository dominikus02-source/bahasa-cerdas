import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getNextAction } from "@/lib/learning-loop/next-action";

/**
 * GET /api/player/next-action — ambil "Aksi Berikutnya" terbaik untuk user.
 * Mengembalikan `{ nextAction }` (null bila belum pernah dibuat).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nextAction = await getNextAction(user.id);
  return NextResponse.json({ nextAction });
}
