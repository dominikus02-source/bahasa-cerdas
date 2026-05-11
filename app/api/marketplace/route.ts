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
    const file = formData.get("file") as File | null;

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const grade = formData.get("grade") as string | null;
    const subject = formData.get("subject") as string | null;
    const week = formData.get("week") ? parseInt(formData.get("week") as string) : null;
    const isPublished = formData.get("isPublished") === "true";
    const isPremium = formData.get("isPremium") === "true";
    const price = parseInt(formData.get("price") as string) || 0;

    if (!title || !description || !type || !file) {
      return NextResponse.json({ error: "title, description, type, and file are required" }, { status: 400 });
    }

    if (isPublished && !dbUser.isPremium) {
      const publishedCount = await db.karya.count({
        where: { sellerId: dbUser.id, isPublished: true },
      });
      if (publishedCount >= 3) {
        return NextResponse.json({
          error: "Batas 3 karya gratis sudah tercapai. Upgrade ke Premium untuk upload unlimited.",
          upgradeUrl: "/guru/pengaturan/premium",
        }, { status: 403 });
      }
    }

    const allowedTypes = ["RPP", "MODUL", "PPT", "SOAL", "VIDEO", "EBOOK", "ADMINISTRASI", "LAINNYA"];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Tipe karya tidak valid" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const allowedExts = ["pdf", "docx", "pptx", "xlsx", "zip", "mp4"];
    if (!allowedExts.includes(fileExt)) {
      return NextResponse.json({ error: "File harus PDF, DOCX, PPTX, XLSX, ZIP, atau MP4" }, { status: 400 });
    }

    const uploadResult = await uploadFile(file, "karya", dbUser.id);
    if ("error" in uploadResult) {
      return NextResponse.json({ error: uploadResult.error }, { status: 400 });
    }

    const fileTypeMap: Record<string, "PDF" | "DOCX" | "PPTX" | "XLSX" | "MP4" | "ZIP"> = {
      pdf: "PDF", docx: "DOCX", pptx: "PPTX", xlsx: "XLSX", mp4: "MP4", zip: "ZIP",
    };

    const karya = await db.karya.create({
      data: {
        title,
        description,
        type: type as any,
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileType: fileTypeMap[fileExt] || "PDF",
        price,
        isPublished,
        isPremium,
        grade,
        subject,
        week,
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