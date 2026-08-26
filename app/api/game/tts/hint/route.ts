import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { revealHint } from "@/lib/game/tts/session-server";

/**
 * POST /api/game/tts/hint — klaim satu pengungkapan petunjuk (P8I).
 * Atomik + terbatas 3 per puzzle. Race/refresh/tab ganda tidak bisa
 * menghasilkan petunjuk ke-4.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId wajib" }, { status: 400 });
    }

    const result = await revealHint({ userId: user.id, sessionId });

    if (!result.ok) {
      if (result.error === "HINT_LIMIT_REACHED") {
        return NextResponse.json(
          { error: "Petunjuk habis untuk puzzle ini.", code: "HINT_LIMIT_REACHED" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, hintsRemaining: result.hintsRemaining });
  } catch (error) {
    console.error("POST /api/game/tts/hint error:", error);
    return NextResponse.json({ error: "Gagal memproses petunjuk" }, { status: 500 });
  }
}
