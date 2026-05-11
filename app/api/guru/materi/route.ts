import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/upload";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [materis, total] = await Promise.all([
      db.materi.findMany({
        where: { uploaderId: dbUser.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.materi.count({ where: { uploaderId: dbUser.id } }),
    ]);

    return NextResponse.json({ data: materis, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/guru/materi error:", error);
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
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const content = formData.get("content") as string | null;
    const grade = formData.get("grade") as string | null;
    const semester = formData.get("semester") ? parseInt(formData.get("semester") as string) : null;
    const tahunAjaran = formData.get("tahunAjaran") as string | null;
    const tema = formData.get("tema") as string | null;
    const subtema = formData.get("subtema") as string | null;
    const isPublished = formData.get("isPublished") === "true";
    const isPremium = formData.get("isPremium") === "true";
    const price = parseInt(formData.get("price") as string) || 0;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let fileUrl: string | null = null;
    let fileKey: string | null = null;
    let fileType: string | null = null;

    if (file) {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
      if (!["pdf", "docx", "pptx", "xlsx", "zip"].includes(fileExt)) {
        return NextResponse.json({ error: "File harus PDF, DOCX, PPTX, XLSX, atau ZIP" }, { status: 400 });
      }

      const uploadResult = await uploadFile(file, "materi", dbUser.id);
      if ("error" in uploadResult) {
        return NextResponse.json({ error: uploadResult.error }, { status: 400 });
      }

      fileUrl = uploadResult.url;
      fileKey = uploadResult.key;
      fileType = fileExt.toUpperCase();
    }

    const materi = await db.materi.create({
      data: {
        title,
        description,
        content: content || "",
        fileUrl,
        fileKey,
        fileType: fileType as any || null,
        grade,
        semester,
        tahunAjaran,
        tema,
        subtema,
        isPublished,
        isPremium,
        price,
        uploaderId: dbUser.id,
      },
    });

    return NextResponse.json({ materi }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/materi error:", error);
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
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const existing = await db.materi.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    const materi = await db.materi.update({ where: { id }, data });
    return NextResponse.json({ materi });
  } catch (error) {
    console.error("PUT /api/guru/materi error:", error);
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
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const existing = await db.materi.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    if (existing.fileKey) await deleteFile(existing.fileKey);

    await db.materi.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/materi error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}