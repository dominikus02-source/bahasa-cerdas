import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasAkuSastrawanAccess } from "@/lib/aku-sastrawan/access";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });

    const track = req.nextUrl.searchParams.get("track") || "cerpen";
    if (!["cerpen", "novel"].includes(track)) return NextResponse.json({ error: "Jalur tidak valid." }, { status: 400 });

    const progress = await prisma.curriculumProgress.findMany({
      where: { userId: user.id, track },
      orderBy: { stageIndex: "asc" },
    });

    return NextResponse.json({ progress, hasAccess: await hasAkuSastrawanAccess(user.id) });
  } catch (error) {
    console.error("PROGRESS_GET_FAILED", error);
    return NextResponse.json({ error: "Gagal memuat progres." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
    if (!await hasAkuSastrawanAccess(user.id)) return NextResponse.json({ error: "Fitur premium." }, { status: 403 });

    const body = await req.json();
    const track = body.track === "novel" ? "novel" : "cerpen";
    const stageIndex = typeof body.stageIndex === "number" ? body.stageIndex : -1;
    const completed = Boolean(body.completed);
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : undefined;

    if (stageIndex < 0 || stageIndex > 10) return NextResponse.json({ error: "Tahap tidak valid." }, { status: 400 });

    const progress = await prisma.curriculumProgress.upsert({
      where: { userId_track_stageIndex: { userId: user.id, track, stageIndex } },
      update: { completed, completedAt: completed ? new Date() : null, notes },
      create: { userId: user.id, track, stageIndex, completed, completedAt: completed ? new Date() : null, notes },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("PROGRESS_POST_FAILED", error);
    return NextResponse.json({ error: "Gagal menyimpan progres." }, { status: 500 });
  }
}
