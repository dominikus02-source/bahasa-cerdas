import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/upload";

const ALLOWED_TYPES: Record<string, { ext: string; fileType: "PDF" | "DOCX" | "PPTX" | "XLSX" | "MP4" | "ZIP" }> = {
  "application/pdf": { ext: "pdf", fileType: "PDF" },
  "application/epub+zip": { ext: "epub", fileType: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", fileType: "DOCX" },
  "application/msword": { ext: "doc", fileType: "DOCX" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: "pptx", fileType: "PPTX" },
  "application/vnd.ms-powerpoint": { ext: "ppt", fileType: "PPTX" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", fileType: "XLSX" },
  "application/vnd.ms-excel": { ext: "xls", fileType: "XLSX" },
  "video/mp4": { ext: "mp4", fileType: "MP4" },
  "application/zip": { ext: "zip", fileType: "ZIP" },
  "application/x-zip-compressed": { ext: "zip", fileType: "ZIP" },
};

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

    const [karyaList, total] = await Promise.all([
      db.karya.findMany({
        where: { sellerId: dbUser.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { purchases: true } } },
      }),
      db.karya.count({ where: { sellerId: dbUser.id } }),
    ]);

    const publishedCount = await db.karya.count({
      where: { sellerId: dbUser.id, isPublished: true },
    });

    return NextResponse.json({
      data: karyaList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      publishedCount,
      canPublishMore: dbUser.isPremium || publishedCount < 3,
    });
  } catch (error) {
    console.error("GET /api/marketplace error:", error);
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

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const grade = formData.get("grade") as string | null;
    const subject = formData.get("subject") as string | null;
    const week = formData.get("week") ? parseInt(formData.get("week") as string) : null;
    const isPublished = formData.get("isPublished") === "true";
    const isPremium = formData.get("isPremium") === "true";
    const price = parseInt(formData.get("price") as string) || 0;

    if (title.length < 3) return NextResponse.json({ error: "Judul minimal 3 karakter" }, { status: 400 });

    const file = formData.get("file") as File | null;
    let fileUrl = "";
    let fileKey = "";
    let fileType: "PDF" | "DOCX" | "PPTX" | "XLSX" | "MP4" | "ZIP" | undefined;

    if (file && file.size > 0) {
      const info = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];
      if (!info) return NextResponse.json({ error: "Tipe file tidak didukung. Gunakan PDF, EPUB, DOCX, PPTX, XLSX, ZIP, atau MP4" }, { status: 400 });
      if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "File maksimal 100MB" }, { status: 400 });

      const fileName = `karya/${dbUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${info.ext}`;
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) return NextResponse.json({ error: `Upload gagal: ${uploadError.message}` }, { status: 500 });

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
      fileKey = fileName;
      fileType = info.fileType;
    }

    const images = formData.get("images") as string || "[]";

    const karya = await db.karya.create({
      data: {
        title,
        description,
        type: type as any,
        fileUrl,
        fileKey,
        fileType,
        price,
        isPublished,
        isPremium,
        grade,
        subject,
        week,
        images,
        sellerId: dbUser.id,
      },
    });

    return NextResponse.json({ karya }, { status: 201 });
  } catch (error) {
    console.error("POST /api/marketplace error:", error);
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

    const existing = await db.karya.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    if (data.isPublished && !dbUser.isPremium) {
      const publishedCount = await db.karya.count({
        where: { sellerId: dbUser.id, isPublished: true, id: { not: id } },
      });
      if (publishedCount >= 3) {
        return NextResponse.json({
          error: "Batas 3 karya gratis sudah tercapai. Upgrade ke Premium untuk upload unlimited.",
          upgradeUrl: "/guru/pengaturan/premium",
        }, { status: 403 });
      }
    }

    const karya = await db.karya.update({ where: { id }, data });
    return NextResponse.json({ karya });
  } catch (error) {
    console.error("PUT /api/marketplace error:", error);
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

    const existing = await db.karya.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    if (existing.fileKey) await deleteFile(existing.fileKey);

    await db.karya.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/marketplace error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}