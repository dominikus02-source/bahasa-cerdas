import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { isPublished: true };
    if (category) where.category = category;

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy: { views: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { creator: { select: { id: true, fullName: true, avatar: true } } },
      }),
      db.video.count({ where }),
    ]);

    return NextResponse.json({ videos, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/video error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, videoUrl, thumbnailUrl, duration, source, category, grade, tags, isPublished, isPremium, price } = body;

    if (!title || !videoUrl) {
      return NextResponse.json({ error: "Title and videoUrl required" }, { status: 400 });
    }

    let embedUrl = videoUrl;
    if (source === "YOUTUBE") {
      const ytId = extractYoutubeId(videoUrl);
      if (!ytId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      embedUrl = `https://www.youtube.com/embed/${ytId}`;
    } else if (source === "VIMEO") {
      const vimeoId = extractVimeoId(videoUrl);
      if (!vimeoId) return NextResponse.json({ error: "Invalid Vimeo URL" }, { status: 400 });
      embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
    }

    const video = await db.video.create({
      data: {
        title,
        description,
        videoUrl: embedUrl,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration || null,
        source: source || "YOUTUBE",
        category: category || "PEMBELAJARAN",
        grade: grade || null,
        tags: tags || [],
        isPublished: isPublished ?? false,
        isPremium: isPremium ?? false,
        price: price || 0,
        creatorId: dbUser.id,
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    console.error("POST /api/video error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Video ID required" }, { status: 400 });
    }

    const video = await db.video.update({
      where: { id },
      data,
    });

    return NextResponse.json({ video });
  } catch (error) {
    console.error("PUT /api/video error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Video ID required" }, { status: 400 });
    }

    await db.video.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/video error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}