import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { abandonTtsSession } from "@/lib/game/tts/session-server";

/**
 * POST /api/game/tts/abandon — tandai sesi sendiri sebagai ditinggalkan
 * (P8J telemetry). Idempotent; hanya sesi ACTIVE milik sendiri.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) return NextResponse.json({ error: "sessionId wajib" }, { status: 400 });

    const abandoned = await abandonTtsSession({ userId: user.id, sessionId });
    return NextResponse.json({ ok: true, abandoned });
  } catch (error) {
    console.error("POST /api/game/tts/abandon error:", error);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
