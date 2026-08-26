import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { startTtsSession } from "@/lib/game/tts/session-server";

/**
 * POST /api/game/tts/session — mulai sesi TTS (P8I).
 * Menutup sesi ACTIVE lama; anggaran petunjuk baru dihitung server.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const level = Math.floor(Number(body.level));
    const seed = Math.floor(Number(body.seed));
    const cellsTotal = Math.floor(Number(body.cellsTotal));

    if (!Number.isFinite(level) || level < 1 || level > 12) {
      return NextResponse.json({ error: "Level tidak valid" }, { status: 400 });
    }
    if (!Number.isFinite(cellsTotal) || cellsTotal <= 0 || cellsTotal > 500) {
      return NextResponse.json({ error: "cellsTotal tidak valid" }, { status: 400 });
    }

    const result = await startTtsSession({
      userId: user.id,
      level,
      seed: Number.isFinite(seed) ? seed : 0,
      cellsTotal,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/game/tts/session error:", error);
    return NextResponse.json({ error: "Gagal memulai sesi" }, { status: 500 });
  }
}
