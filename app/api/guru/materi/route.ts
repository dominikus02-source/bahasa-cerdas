import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { uploadFileServer } from "@/lib/upload";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let dbUser: any = null

    // Try Supabase auth first
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
      }
    } catch {}

    // Fallback: supabaseId query param (for Next.js 16 Route Handler cookie bug)
    if (!dbUser) {
      const sid = searchParams.get("supabaseId")
      if (sid) {
        dbUser = await db.user.findUnique({ where: { supabaseId: sid } });
      }
    }

    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN" && !dbUser.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [materis, total] = await Promise.all([
      db.materi.findMany({
        where: { OR: [{ isPublished: true }, { uploaderId: dbUser.id }] },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.materi.count({ where: { OR: [{ isPublished: true }, { uploaderId: dbUser.id }] } }),
    ]);

    return NextResponse.json({ data: materis, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/guru/materi error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Materi POST request received");
    const formData = await req.formData();

    // Try Supabase auth first, then fallback to formData supabaseId
    let dbUser: any = null
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
      }
    } catch {}
    if (!dbUser) {
      const sid = formData.get("supabaseId") as string
      if (sid) dbUser = await db.user.findUnique({ where: { supabaseId: sid } })
    }
    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN" && !dbUser.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
      return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    }

    let fileUrl: string | null = null;
    let fileKey: string | null = null;
    let fileType: string | null = null;

    // Support both: direct file upload (server-side) and pre-uploaded client-side
    if (file && file.size > 0) {
      console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type);
      
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
      if (!["pdf", "docx", "pptx", "xlsx", "zip"].includes(fileExt)) {
        return NextResponse.json({ error: "File harus PDF, DOCX, PPTX, XLSX, atau ZIP" }, { status: 400 });
      }

      const maxSize = fileExt === "pptx" ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json({ error: `Ukuran file maksimal ${maxSize / (1024 * 1024)}MB` }, { status: 400 });
      }
      
      const fileName = `${dbUser.id}/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const uploadResult = await uploadFileServer(file, fileName, "documents", file.type);
      
      if ("error" in uploadResult) {
        console.error("Upload failed:", uploadResult.error);
        return NextResponse.json({ error: uploadResult.error }, { status: 400 });
      }

      fileUrl = uploadResult.url;
      fileKey = uploadResult.key;
      fileType = fileExt.toUpperCase();
    } else {
      // Client-side pre-uploaded — use provided metadata
      fileUrl = formData.get("fileUrl") as string | null;
      fileKey = formData.get("fileKey") as string | null;
      fileType = formData.get("fileType") as string | null;
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

    console.log("Materi created successfully:", materi.id);

    // Notify admin users about new materi upload
    try {
      const admins = await db.user.findMany({
        where: { OR: [{ role: "ADMIN" }, { isFounder: true }] },
        select: { id: true },
      });
      if (admins.length > 0) {
        await db.notifikasi.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: "Materi Ajar Baru",
            body: `Guru ${dbUser.fullName || dbUser.email} mengupload materi: "${title}"`,
            type: "INFO",
            data: { link: "/admin/materi" },
          })),
        });
      }
    } catch (notifErr) {
      console.error("Failed to send admin notification:", notifErr);
    }

    return NextResponse.json({ materi }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/materi error:", error);
    return NextResponse.json({ error: "Internal error: " + (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    let dbUser: any = null
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
    } catch {}
    if (!dbUser) {
      const sid = body.supabaseId as string | undefined
      if (sid) dbUser = await db.user.findUnique({ where: { supabaseId: sid } })
    }
    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN" && !dbUser.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let dbUser: any = null
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
    } catch {}
    if (!dbUser) {
      const sid = searchParams.get("supabaseId")
      if (sid) dbUser = await db.user.findUnique({ where: { supabaseId: sid } })
    }
    if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN" && !dbUser.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const existing = await db.materi.findUnique({ where: { id } });
    if (!existing || existing.uploaderId !== dbUser.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    if (existing.fileKey) {
      try {
        const sup = await createClient();
        const bucket = existing.fileKey.includes("/videos/") ? "videos" : "documents";
        await sup.storage.from(bucket).remove([existing.fileKey]).catch(() => {});
      } catch {}
    }

    await db.materi.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/materi error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
