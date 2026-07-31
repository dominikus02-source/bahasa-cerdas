import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

function isKaryaUrl(value: string): { ok: boolean; error?: string } {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "Tautan tidak valid. Tempel URL karya kamu yang lengkap." };
  }

  const host = url.hostname;
  const allowed = [
    "bahasacerdas.com",
    "www.bahasacerdas.com",
    "localhost",
  ];
  if (!allowed.includes(host)) {
    return { ok: false, error: "Tautan harus dari bahasacerdas.com (link karya kamu)." };
  }
  if (!url.pathname.includes("/karya/")) {
    return { ok: false, error: "Tautan harus mengarah ke halaman karya (berisi /karya/)." };
  }
  return { ok: true };
}

// POST /api/murid/pengumuman/[id]/submit — kumpulkan tautan karya ke pengumuman.
export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "MURID" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const pengumuman = await db.pengumuman.findUnique({
      where: { id },
      include: { group: { select: { teacherId: true } } },
    });
    if (!pengumuman) {
      return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });
    }

    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: pengumuman.groupId, userId: user.id } },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Kamu bukan anggota kelas ini" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const karyaUrl = typeof body.karyaUrl === "string" ? body.karyaUrl.trim() : "";
    const catatan = typeof body.catatan === "string" ? body.catatan.trim() : "";

    if (!karyaUrl) {
      return NextResponse.json({ error: "Tempel tautan karya kamu dulu" }, { status: 400 });
    }
    const check = isKaryaUrl(karyaUrl);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    if (catatan.length > 500) {
      return NextResponse.json({ error: "Catatan maksimal 500 karakter" }, { status: 400 });
    }

    const submission = await db.pengumumanSubmission.upsert({
      where: { pengumumanId_userId: { pengumumanId: id, userId: user.id } },
      update: { karyaUrl, catatan: catatan || null, submittedAt: new Date() },
      create: { pengumumanId: id, userId: user.id, karyaUrl, catatan: catatan || null },
    });

    // Beri tahu guru kelas bahwa ada murid yang mengumpulkan.
    await db.notifikasi.create({
      data: {
        userId: pengumuman.group.teacherId,
        title: "Tugas Terkumpul",
        body: `${user.fullName} mengumpulkan "${pengumuman.judul}"`,
        type: "INFO",
        data: { link: "/guru/feed-karya", pengumumanId: id },
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("POST /api/murid/pengumuman/[id]/submit error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
