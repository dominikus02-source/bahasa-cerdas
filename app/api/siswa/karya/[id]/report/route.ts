import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

// POST /api/siswa/karya/[id]/report
// Laporkan karya (additive — hanya membuat Notifikasi untuk founder/admin).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const alasan = typeof body.alasan === "string" ? body.alasan.trim().slice(0, 500) : "";

    const karya = await db.studentKarya.findUnique({
      where: { id },
      select: { id: true, title: true, userId: true },
    });
    if (!karya) return NextResponse.json({ error: "Karya tidak ditemukan" }, { status: 404 });

    const founders = await db.user.findMany({
      where: { OR: [{ role: "ADMIN" }, { isFounder: true }] },
      select: { id: true },
      take: 10,
    });

    if (founders.length > 0) {
      await db.notifikasi.createMany({
        data: founders.map((f) => ({
          userId: f.id,
          title: "Laporan Karya",
          body: `${user.fullName ?? "Pengguna"} melaporkan karya "${karya.title}"${alasan ? ` — ${alasan}` : ""}. Karya ID: ${karya.id}`,
          type: "LAPORAN_KARYA",
          data: { karyaId: karya.id, reporterId: user.id, alasan },
        })),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/siswa/karya/[id]/report error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
