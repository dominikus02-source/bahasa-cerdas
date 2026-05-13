import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const video = await db.video.findUnique({
      where: { id, isPublished: true },
      select: {
        id: true, title: true, description: true, videoUrl: true,
        thumbnailUrl: true, duration: true, source: true, category: true,
        grade: true, tags: true, views: true, isPremium: true, createdAt: true,
        creator: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.video.update({ where: { id: video.id }, data: { views: { increment: 1 } } });

    return NextResponse.json({ video });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
