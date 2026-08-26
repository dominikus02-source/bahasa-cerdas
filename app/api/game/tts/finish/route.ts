import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { finishTtsSession } from "@/lib/game/tts/session-server";

/**
 * POST /api/game/tts/finish — selesaikan sesi TTS (P8I).
 * Hadiah dihitung SERVER-side dari data sesi: akurasi × dasar level ×
 * multiplier tier kesulitan − penalti petunjuk (hitungan DB). Nilai klien
 * tidak dipercaya. Panggilan ulang = tanpa hadiah kedua.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const cellsCorrect = Math.floor(Number(body.cellsCorrect));

    if (!sessionId || !Number.isFinite(cellsCorrect) || cellsCorrect < 0) {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    const result = await finishTtsSession({
      userId: user.id,
      sessionId,
      cellsCorrect,
    });

    // Sesi sudah FINISHED (double submit) → jawab sukses tanpa hadiah baru.
    if (!result) {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/game/tts/finish error:", error);
    return NextResponse.json({ error: "Gagal menyelesaikan sesi" }, { status: 500 });
  }
}
