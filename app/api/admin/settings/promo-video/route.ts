import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getSetting, setSetting, extractYouTubeId, PROMO_VIDEO_KEY } from "@/lib/site-settings";

export async function GET() {
  try {
    const user = await getUser();
    if (!user || (!user.isFounder && user.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const videoId = await getSetting(PROMO_VIDEO_KEY);
    return NextResponse.json({ videoId });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (!user.isFounder && user.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { input } = await req.json();

    // String kosong = hapus video (kembali ke placeholder "segera hadir").
    if (!input || !input.trim()) {
      await setSetting(PROMO_VIDEO_KEY, null);
      return NextResponse.json({ videoId: null });
    }

    const videoId = extractYouTubeId(input);
    if (!videoId) {
      return NextResponse.json({ error: "Link atau ID video YouTube tidak valid" }, { status: 400 });
    }

    await setSetting(PROMO_VIDEO_KEY, videoId);
    return NextResponse.json({ videoId });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
