import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { awardGuruXp } from "@/lib/gamification/teacher-xp";

// GET /api/guru/pengumuman?groupId=xxx
// Daftar pengumuman guru untuk satu kelas + jumlah murid & yang sudah kumpul.
export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json({ error: "Pilih kelas terlebih dahulu" }, { status: 400 });
    }

    const group = await db.group.findFirst({
      where: { id: groupId, teacherId: user.id },
      include: {
        _count: { select: { members: true } },
        pengumumans: {
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
          include: { _count: { select: { submissions: true } } },
        },
      },
    });
    if (!group) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("GET /api/guru/pengumuman error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/guru/pengumuman — buat pengumuman baru lalu beri tahu murid kelas.
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // STEP 6.0 — dukung groupIds[] (multi-kelas) SELAIN groupId (backward
    // compatible). Satu pengumuman → beberapa kelas tanpa duplikasi konten.
    const rawGroupIds = Array.isArray(body.groupIds) ? body.groupIds.filter((g: unknown): g is string => typeof g === "string") : [];
    const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
    const groupIds = rawGroupIds.length > 0 ? rawGroupIds.map((g: string) => g.trim()).filter(Boolean) : groupId ? [groupId] : [];
    const judul = typeof body.judul === "string" ? body.judul.trim() : "";
    const deskripsi = typeof body.deskripsi === "string" ? body.deskripsi.trim() : "";
    const lampiran = typeof body.lampiran === "string" ? body.lampiran.trim() : "";
    const lampiranNama = typeof body.lampiranNama === "string" ? body.lampiranNama.trim() : "";
    const tenggat = typeof body.tenggat === "string" && body.tenggat ? new Date(body.tenggat) : null;

    if (groupIds.length === 0) return NextResponse.json({ error: "Pilih minimal satu kelas" }, { status: 400 });
    if (!judul) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    if (tenggat && Number.isNaN(tenggat.getTime())) {
      return NextResponse.json({ error: "Tanggal tenggat tidak valid" }, { status: 400 });
    }

    // Semua kelas wajib milik guru ini (authorization — jangan percaya klien).
    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, teacherId: user.id },
      include: { members: { select: { userId: true } } },
    });
    if (groups.length !== groupIds.length) {
      return NextResponse.json({ error: "Ada kelas yang tidak ditemukan atau bukan milik Anda" }, { status: 404 });
    }

    const pengumuman = await db.pengumuman.createMany({
      data: groups.map((group) => ({
        groupId: group.id,
        teacherId: user.id,
        judul,
        deskripsi: deskripsi || null,
        tenggat,
        lampiran: lampiran || null,
        lampiranNama: lampiranNama || null,
      })),
    });

    const memberIds = [...new Set(groups.flatMap((group) => group.members.map((m) => m.userId)))];
    if (memberIds.length > 0) {
      await db.notifikasi.createMany({
        data: memberIds.map((userId) => ({
          userId,
          title: "Pengumuman Baru",
          body: `Guru mengirim pengumuman: "${judul}"`,
          type: "INFO",
          data: { link: "/murid/pengumuman", judul },
        })),
      });
    }

    // Guru XP: membuat pengumuman kelas (sekali per pengumuman — reference
    // memakai timestamp agar aman untuk multi-kelas).
    const created = await db.pengumuman.findMany({
      where: { teacherId: user.id, judul, createdAt: { gte: new Date(Date.now() - 5000) } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    if (created[0]) {
      awardGuruXp({
        guruId: user.id,
        sumber: "GURU_PENGUMUMAN",
        reference: `pengumuman-${created[0].id}`,
        metadata: { groupIds, pengumumanId: created[0].id },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, count: pengumuman.count, murid: memberIds.length });
  } catch (error) {
    console.error("POST /api/guru/pengumuman error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
