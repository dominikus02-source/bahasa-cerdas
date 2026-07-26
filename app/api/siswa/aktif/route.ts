import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/nickname";

// Murid yang aktif dalam 15 menit terakhir — dipakai kartu "Aktif Sekarang"
// di beranda supaya kehadiran teman sekelas jadi social proof yang memicu
// murid lain untuk ikut aktif.
export async function GET() {
  try {
    const user = await getUser().catch(() => null);
    const since = new Date(Date.now() - 15 * 60 * 1000);

    const [count, users] = await Promise.all([
      db.user.count({ where: { role: "MURID", lastActiveAt: { gte: since } } }),
      db.user.findMany({
        where: { role: "MURID", lastActiveAt: { gte: since }, ...(user ? { id: { not: user.id } } : {}) },
        orderBy: { lastActiveAt: "desc" },
        take: 12,
        select: { id: true, fullName: true, nickname: true, avatar: true, lastActiveAt: true },
      }),
    ]);

    const withDisplay = users.map((u) => ({
      id: u.id,
      displayName: getDisplayName(u, "peer"),
      avatar: u.avatar,
      lastActiveAt: u.lastActiveAt,
    }));

    return NextResponse.json({ count, users: withDisplay });
  } catch (error) {
    console.error("GET /api/siswa/aktif error:", error);
    return NextResponse.json({ error: "Gagal memuat murid aktif" }, { status: 500 });
  }
}
