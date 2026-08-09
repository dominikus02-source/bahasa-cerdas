import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/upload";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [rppList, total] = await Promise.all([
      db.rPP.findMany({
        where: { uploaderId: dbUser.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.rPP.count({ where: { uploaderId: dbUser.id } }),
    ]);

    return NextResponse.json({ data: rppList, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/guru/rpp error:", error);
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
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const kelas = formData.get("kelas") as string;
    const semester = parseInt(formData.get("semester") as string) || 1;
    const tahunAjaran = formData.get("tahunAjaran") as string;
    const fase = formData.get("fase") as string | null;
    const week = formData.get("week") ? parseInt(formData.get("week") as string) : null;
    const theme = formData.get("theme") as string | null;
    const subTheme = formData.get("subTheme") as string | null;
    const isPublished = formData.get("isPublished") === "true";
    const isPremium = formData.get("isPremium") === "true";
    const price = parseInt(formData.get("price") as string) || 0;

    if (!title || !kelas || !tahunAjaran || !file) {
      return NextResponse.json({ error: "title, kelas, tahunAjaran, and file are required" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
    if (!["pdf", "docx", "pptx"].includes(fileExt)) {
      return NextResponse.json({ error: "File harus PDF, DOCX, atau PPTX" }, { status: 400 });
    }

    const uploadResult = await uploadFile(file, "rpp", dbUser.id);

    if ("error" in uploadResult) {
      return NextResponse.json({ error: uploadResult.error }, { status: 400 });
    }

    const fileType = fileExt === "pdf" ? "PDF" : fileExt === "docx" ? "DOCX" : "PPTX";

    const rpp = await db.rPP.create({
      data: {
        title,
        description,
        kelas,
        semester,
        tahunAjaran,
        fase,
        week,
        theme,
        subTheme,
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileType: fileType as any,
        isPublished,
        isPremium,
        price,
        uploaderId: dbUser.id,
        subject: "Bahasa Indonesia",
      },
    });

    return NextResponse.json({ rpp }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/rpp error:", error);
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
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const existing = await db.rPP.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    const rpp = await db.rPP.update({
      where: { id },
      data,
    });

    return NextResponse.json({ rpp });
  } catch (error) {
    console.error("PUT /api/guru/rpp error:", error);
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
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const existing = await db.rPP.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    if (existing.fileKey) {
      await deleteFile(existing.fileKey);
    }

    await db.rPP.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/rpp error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}