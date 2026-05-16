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

    const [soals, total] = await Promise.all([
      db.bankSoal.findMany({
        where: { uploaderId: dbUser.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bankSoal.count({ where: { uploaderId: dbUser.id } }),
    ]);

    return NextResponse.json({ data: soals, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/guru/soal error:", error);
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

    const contentType = req.headers.get("content-type") || "";

    // Handle JSON body (individual question save)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { text, type, difficulty, options, correctAnswer, explanation, isHOTS, kelas, kd, subject } = body;

      if (!text || !kelas) {
        return NextResponse.json({ error: "Pertanyaan dan kelas diperlukan" }, { status: 400 });
      }

      const soal = await db.bankSoal.create({
        data: {
          title: text.slice(0, 100),
          text,
          type: type || "PILIHAN_GANDA",
          difficulty: difficulty || "MEDIUM",
          options: options || [],
          correctAnswer: String(correctAnswer || ""),
          explanation: explanation || "",
          isHOTS: isHOTS || false,
          kelas,
          KD: kd || null,
          subject: subject || "Bahasa Indonesia",
          isPublished: true,
          uploaderId: dbUser.id,
        },
      });

      return NextResponse.json({ success: true, soal }, { status: 201 });
    }

    // Handle FormData (file upload)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const type = formData.get("type") as string || "PILIHAN_GANDA";
    const difficulty = formData.get("difficulty") as string || "MEDIUM";
    const kelas = formData.get("kelas") as string;
    const semester = formData.get("semester") ? parseInt(formData.get("semester") as string) : null;
    const tahunAjaran = formData.get("tahunAjaran") as string | null;
    const KD = formData.get("KD") as string | null;
    const isHOTS = formData.get("isHOTS") === "true";
    const jumlahSoal = parseInt(formData.get("jumlahSoal") as string) || 10;
    const isPublished = formData.get("isPublished") === "true";
    const isPremium = formData.get("isPremium") === "true";
    const price = parseInt(formData.get("price") as string) || 0;

    if (!title || !kelas || !file) {
      return NextResponse.json({ error: "title, kelas, and file are required" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
    if (!["pdf", "docx", "pptx", "xlsx"].includes(fileExt)) {
      return NextResponse.json({ error: "File harus PDF, DOCX, PPTX, atau XLSX" }, { status: 400 });
    }

    const uploadResult = await uploadFile(file, "banksoal", dbUser.id);

    if ("error" in uploadResult) {
      return NextResponse.json({ error: uploadResult.error }, { status: 400 });
    }

    const fileTypeMap: Record<string, "PDF" | "DOCX" | "PPTX" | "XLSX"> = {
      pdf: "PDF", docx: "DOCX", pptx: "PPTX", xlsx: "XLSX",
    };

    const soal = await db.bankSoal.create({
      data: {
        title,
        description,
        type: type as any,
        difficulty: difficulty as any,
        kelas,
        semester,
        tahunAjaran,
        KD,
        isHOTS,
        jumlahSoal,
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileType: fileTypeMap[fileExt] || "PDF",
        isPublished,
        isPremium,
        price,
        uploaderId: dbUser.id,
        subject: "Bahasa Indonesia",
      },
    });

    return NextResponse.json({ soal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/soal error:", error);
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

    const existing = await db.bankSoal.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    const soal = await db.bankSoal.update({ where: { id }, data });
    return NextResponse.json({ soal });
  } catch (error) {
    console.error("PUT /api/guru/soal error:", error);
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

    const existing = await db.bankSoal.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    if (existing.fileKey) await deleteFile(existing.fileKey);

    await db.bankSoal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/soal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}