import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [karyaCount, siswaCount, kuisCount, purchases, earnings, rppCount, soalCount] = await Promise.all([
      db.karya.count({ where: { sellerId: user.id } }),
      db.groupMember.count({ where: { group: { teacherId: user.id } } }),
      db.gameRoom.count({ where: { hostId: user.id } }),
      db.pembelian.aggregate({ where: { karya: { sellerId: user.id }, status: "PAID" }, _count: true }),
      db.sellerEarning.aggregate({ where: { sellerId: user.id }, _sum: { netAmount: true } }),
      db.rPP.count({ where: { uploaderId: user.id } }),
      db.bankSoal.count({ where: { uploaderId: user.id } }),
    ]);

    const bulanIni = new Date().toISOString().slice(0, 7);
    const bulanLalu = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0, 7);
    const [salesBulanIni, aiUsage] = await Promise.all([
      db.pembelian.count({ where: { karya: { sellerId: user.id }, status: "PAID", createdAt: { gte: new Date(bulanIni) } } }),
      db.aIUsage.findMany({ where: { userId: user.id, bulan: { in: [bulanIni, bulanLalu] } }, select: { feature: true, bulan: true } }),
    ]);

    const aiThisMonth = { rpp: 0, soal: 0 };
    for (const u of aiUsage.filter(a => a.bulan === bulanIni)) {
      if (u.feature === "rpp_generator") aiThisMonth.rpp++;
      if (u.feature === "soal_generator") aiThisMonth.soal++;
    }
    const aiLastMonth = { rpp: 0, soal: 0 };
    for (const u of aiUsage.filter(a => a.bulan === bulanLalu)) {
      if (u.feature === "rpp_generator") aiLastMonth.rpp++;
      if (u.feature === "soal_generator") aiLastMonth.soal++;
    }

    return NextResponse.json({
      totalKarya: karyaCount,
      totalSiswa: siswaCount,
      totalKuis: kuisCount,
      totalTerjual: purchases._count || 0,
      terjualBulanIni: salesBulanIni,
      saldo: earnings._sum?.netAmount || 0,
      aiUsage: aiThisMonth,
      aiUsageBulanLalu: aiLastMonth,
      rppCount,
      soalCount,
    });
  } catch { return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}
