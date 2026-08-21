import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { uploadFileServer } from "@/lib/upload";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { awardGuruXp } from "@/lib/gamification/teacher-xp";

// Folder guru: PPT / PDF — dikelompokkan dari fileType.
const FOLDER_TYPES: Record<string, string[]> = {
  PPT: ["PPTX"],
  PDF: ["PDF"],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const q = (searchParams.get("q") || "").trim();
    const grade = (searchParams.get("grade") || "").trim();
    const subject = (searchParams.get("subject") || "").trim();
    const tema = (searchParams.get("tema") || "").trim();
    const sort = searchParams.get("sort") || "recent"; // "recent" | "popular"
    const folder = (searchParams.get("folder") || "").trim().toUpperCase(); // "PPT" | "PDF"

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

    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Basis: materi yang dipublikasikan (bank bersama) atau milik sendiri.
    // Ditambah filter pencarian tema/kata kunci/kelas/mapel (AND).
    const and: any[] = [];
    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { tema: { contains: q, mode: "insensitive" } },
          { subtema: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (grade) and.push({ grade });
    if (subject) and.push({ subject });
    if (tema) and.push({ tema: { contains: tema, mode: "insensitive" } });
    // Jenjang (SD/SMP/SMA) — nilai grade tersimpan seperti "SMP Kelas 7".
    const level = (searchParams.get("level") || "").trim();
    if (level) and.push({ grade: { startsWith: level } });

    // Hitung jumlah per folder (jenjang/kelas/pencarian saja, tanpa filter folder) — untuk badge di UI.
    const countsWhere: any = { OR: [{ isPublished: true }, { uploaderId: dbUser.id }] };
    if (and.length) countsWhere.AND = [...and];

    // Folder guru: PPT / PDF (dari fileType). Selalu filter hanya tipe ini.
    if (folder && FOLDER_TYPES[folder]) {
      and.push({ fileType: { in: FOLDER_TYPES[folder] } });
    } else {
      // Tanpa filter folder spesifik: hanya tampilkan PPT + PDF.
      and.push({ fileType: { in: ["PPTX", "PDF"] } });
    }

    const where: any = { OR: [{ isPublished: true }, { uploaderId: dbUser.id }] };
    if (and.length) where.AND = and;

    const orderBy = sort === "popular"
      ? [{ downloads: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

    const [materis, total, downloadsUsed, pptCount, pdfCount] = await Promise.all([
      db.materi.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      db.materi.count({ where }),
      db.materiDownload.count({ where: { userId: dbUser.id } }),
      db.materi.count({ where: { ...countsWhere, AND: [...(countsWhere.AND || []), { fileType: { in: FOLDER_TYPES.PPT } }] } }),
      db.materi.count({ where: { ...countsWhere, AND: [...(countsWhere.AND || []), { fileType: { in: FOLDER_TYPES.PDF } }] } }),
    ]);
    const folderCounts = { PPT: pptCount, PDF: pdfCount };

    // Kuota unduh: gratis 10 modul, premium/founder/admin tak terbatas.
    const unlimited = dbUser.isPremium || dbUser.isFounder || dbUser.role === "ADMIN";
    const quota = { used: downloadsUsed, limit: unlimited ? null : 10, unlimited };

    return NextResponse.json({ data: materis, total, page, totalPages: Math.ceil(total / limit), quota, folderCounts });
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
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
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
    const subject = (formData.get("subject") as string | null) || "Bahasa Indonesia";
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
      if (!["pdf", "pptx"].includes(fileExt)) {
        return NextResponse.json({ error: "File harus PDF atau PPTX" }, { status: 400 });
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
        subject,
        isPublished,
        isPremium,
        price,
        uploaderId: dbUser.id,
      },
    });

    console.log("Materi created successfully:", materi.id);

    // XP Guru saat materi terbit (pertama kali) — best-effort, idempotent.
    if (isPublished) {
      try {
        await awardGuruXp({
          guruId: dbUser.id,
          sumber: "GURU_MATERI",
          reference: `materi-publish-${materi.id}`,
          metadata: { materiId: materi.id, judul: title },
        });
      } catch (err) {
        console.error("GURU_MATERI XP error:", err);
      }
    }

    // Notify admin users about new materi upload
    try {
      const admins = await db.user.findMany({
        where: { OR: [{ role: "ADMIN" }, { isFounder: true }] },
        select: { id: true },
        take: 50,
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
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
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
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
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

// Increment penghitung unduhan (fire-and-forget dari kartu modul).
export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
    await db.materi.update({ where: { id }, data: { downloads: { increment: 1 } } });
    return NextResponse.json({ ok: true });
  } catch {
    // Jangan ganggu UX unduhan jika penghitung gagal.
    return NextResponse.json({ ok: false });
  }
}
