import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    let video = await db.video.findUnique({
      where: { id, isPublished: true },
      select: {
        id: true, title: true, description: true, videoUrl: true,
        thumbnailUrl: true, duration: true, source: true, category: true,
        grade: true, tags: true, views: true, isPublished: true, isPremium: true, createdAt: true,
        creator: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    if (!video) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
        if (dbUser) {
          video = await db.video.findUnique({
            where: { id, creatorId: dbUser.id },
            select: {
              id: true, title: true, description: true, videoUrl: true,
              thumbnailUrl: true, duration: true, source: true, category: true,
              grade: true, tags: true, views: true, isPublished: true, isPremium: true, createdAt: true,
              creator: { select: { id: true, fullName: true, avatar: true } },
            },
          });
        }
      }
    }

    if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (video.isPublished) {
      await db.video.update({ where: { id: video.id }, data: { views: { increment: 1 } } }).catch(() => {});
    }

    return NextResponse.json({ video });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
