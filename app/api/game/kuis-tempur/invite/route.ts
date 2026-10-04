import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const opponentId = String(body.opponentId || "");
    const roomCode = String(body.roomCode || "").toUpperCase();

    if (!opponentId || opponentId === user.id) {
      return NextResponse.json({ error: "Pilih teman yang mau ditantang." }, { status: 400 });
    }
    if (!ROOM_CODE.test(roomCode)) {
      return NextResponse.json({ error: "Kode arena tidak valid." }, { status: 400 });
    }

    const sharedClass = await db.group.findFirst({
      where: {
        members: { some: { userId: opponentId } },
        OR: [{ teacherId: user.id }, { members: { some: { userId: user.id } } }],
      },
      select: { id: true },
    });
    if (!sharedClass) {
      return NextResponse.json({ error: "Kamu hanya bisa menantang teman sekelasmu." }, { status: 403 });
    }

    const [me, opponent] = await Promise.all([
      db.user.findUnique({ where: { id: user.id }, select: { fullName: true } }),
      db.user.findUnique({
        where: { id: opponentId },
        select: { id: true, fullName: true, role: true },
      }),
    ]);

    if (!me || !opponent || opponent.role !== "MURID") {
      return NextResponse.json({ error: "Teman tidak ditemukan." }, { status: 404 });
    }

    const link = `/arena/game/kuis-tempur?join=${encodeURIComponent(roomCode)}`;
    await db.notifikasi.create({
      data: {
        userId: opponent.id,
        title: "⚔️ Tantangan Kuis Tempur!",
        body: `${me.fullName} menantangmu masuk arena. Siap bertarung?`,
        type: "TANTANGAN",
        data: {
          link,
          roomCode,
          game: "KUIS_TEMPUR",
          challengerName: me.fullName,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      roomCode,
      opponent: { id: opponent.id, fullName: opponent.fullName },
      message: `Tantangan terkirim ke ${opponent.fullName}!`,
    });
  } catch (error) {
    console.error("kuis-tempur/invite POST error:", error);
    return NextResponse.json({ error: "Gagal mengirim tantangan. Coba lagi." }, { status: 500 });
  }
}
