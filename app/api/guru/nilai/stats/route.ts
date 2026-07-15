import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
    }

    const groups = await db.group.findMany({
      where: { teacherId: dbUser.id, isActive: true },
      select: { id: true, name: true, grade: true },
      take: 50,
    });

    const stats: any[] = [];

    for (const g of groups) {
      const totalSiswa = await db.groupMember.count({ where: { groupId: g.id, role: "member" } });
      const kategoris = await db.nilaiKategori.findMany({ where: { groupId: g.id }, take: 50 });
      const totalNilai = await db.nilai.count({ where: { groupId: g.id } });

      const belumDinilai = Math.max(0, (totalSiswa * kategoris.length) - totalNilai);

      const rataKategoris: Record<string, number> = {};
      for (const k of kategoris) {
        const result = await db.nilai.aggregate({
          where: { groupId: g.id, kategoriId: k.id },
          _avg: { skor: true },
        });
        rataKategoris[k.nama] = Math.round(result._avg.skor || 0);
      }

      stats.push({
        id: g.id,
        name: g.name,
        grade: g.grade,
        totalSiswa,
        totalKategori: kategoris.length,
        totalNilai,
        belumDinilai,
        rataKategoris,
      });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("GET /api/guru/nilai/stats error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
