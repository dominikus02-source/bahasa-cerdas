import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { uploadFileServer, extractYoutubeId, extractVimeoId } from "@/lib/upload";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "GURU")) {
      return NextResponse.json({ error: "Hanya guru dan admin yang dapat mengakses" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: any = {
      OR: [
        { isPublished: true },
        { creatorId: dbUser.id },
      ],
    };
    if (category) where.category = category;

    const videos = await db.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { id: true, fullName: true, avatar: true } } },
    });

    return NextResponse.json({ videos, total: videos.length });
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
    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "GURU")) {
      return NextResponse.json({ error: "Hanya guru dan admin yang dapat mengupload" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");

    let title = "";
    let description = "";
    let videoUrl = "";
    let thumbnailUrl = "";
    let duration: number | null = null;
    let source = "YOUTUBE";
    let category = "PEMBELAJARAN";
    let grade = "";
    let tags: string[] = [];
    let isPublished = false;
    let isPremium = false;
    let price = 0;

    if (isFormData) {
      const form = await req.formData();
      title = (form.get("title") as string) || "";
      description = (form.get("description") as string) || "";
      videoUrl = (form.get("videoUrl") as string) || "";
      category = (form.get("category") as string) || "PEMBELAJARAN";
      grade = (form.get("grade") as string) || "";
      const file = form.get("file") as File | null;
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `${dbUser.id}/videos/${timestamp}-${randomStr}.${ext}`;

        const result = await uploadFileServer(file, fileName, "videos", file.type);
        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        videoUrl = result.url;
        source = "UPLOAD";
      } else if (videoUrl) {
        const ytId = extractYoutubeId(videoUrl);
        if (ytId) {
          source = "YOUTUBE";
          videoUrl = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
          thumbnailUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
        } else if (extractVimeoId(videoUrl)) {
          source = "VIMEO";
          videoUrl = `https://player.vimeo.com/video/${extractVimeoId(videoUrl)}`;
        }
      }
    } else {
      const body = await req.json();
      title = body.title || "";
      description = body.description || "";
      videoUrl = body.videoUrl || "";
      thumbnailUrl = body.thumbnailUrl || "";
      duration = body.duration || null;
      source = body.source || "YOUTUBE";
      category = body.category || "PEMBELAJARAN";
      grade = body.grade || "";
      tags = body.tags || [];
      isPublished = body.isPublished ?? false;
      isPremium = body.isPremium ?? false;
      price = body.price || 0;

      let embedUrl = videoUrl;
      if (source === "YOUTUBE") {
        const ytId = extractYoutubeId(videoUrl);
        if (!ytId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        embedUrl = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
        if (!thumbnailUrl) thumbnailUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      } else if (source === "VIMEO") {
        const vimeoId = extractVimeoId(videoUrl);
        if (!vimeoId) return NextResponse.json({ error: "Invalid Vimeo URL" }, { status: 400 });
        embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
      }
      videoUrl = embedUrl;
    }

    if (!title || !videoUrl) {
      return NextResponse.json({ error: "Title dan video URL/file diperlukan" }, { status: 400 });
    }

    const video = await db.video.create({
      data: {
        title,
        description: description || null,
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration || null,
        source: source as any,
        category: category as any,
        grade: grade || null,
        tags,
        isPublished,
        isPremium,
        price,
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
    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "GURU")) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Video ID required" }, { status: 400 });
    }

    if (dbUser.role === "GURU") {
      const existing = await db.video.findUnique({ where: { id } });
      if (!existing || existing.creatorId !== dbUser.id) {
        return NextResponse.json({ error: "Anda hanya bisa mengedit video sendiri" }, { status: 403 });
      }
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
    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "GURU")) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Video ID required" }, { status: 400 });
    }

    if (dbUser.role === "GURU") {
      const existing = await db.video.findUnique({ where: { id } });
      if (!existing || existing.creatorId !== dbUser.id) {
        return NextResponse.json({ error: "Anda hanya bisa menghapus video sendiri" }, { status: 403 });
      }
    }

    await db.video.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/video error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

