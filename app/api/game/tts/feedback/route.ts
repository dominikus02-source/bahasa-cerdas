import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { recordTtsFeedback } from "@/lib/game/tts/session-server";

/**
 * POST /api/game/tts/feedback — persepsi kesulitan pemain (P8J Obj. 4).
 * EASY | PAS | HARD. Sekali isi per sesi (write-once), TIDAK memengaruhi
 * reward, hanya untuk sesi milik sendiri.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const feedback = body.feedback;

    if (!sessionId) return NextResponse.json({ error: "sessionId wajib" }, { status: 400 });
    if (!["EASY", "PAS", "HARD"].includes(feedback)) {
      return NextResponse.json({ error: "feedback tidak valid" }, { status: 400 });
    }

    const result = await recordTtsFeedback({
      userId: user.id,
      sessionId,
      feedback,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, alreadySet: true, message: "Feedback sudah pernah diberikan." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/game/tts/feedback error:", error);
    return NextResponse.json({ error: "Gagal menyimpan feedback" }, { status: 500 });
  }
}
