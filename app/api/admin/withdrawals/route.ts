import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

/**
 * Daftar pengajuan penarikan saldo guru untuk ditinjau admin.
 *
 * Tanpa antarmuka ini, /api/guru/withdraw hanya memindahkan uang guru dari
 * kolom `saldo` ke baris Withdrawal berstatus PENDING dan berhenti di situ —
 * saldonya berkurang tapi tidak pernah ada yang mentransfer.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status && status !== "SEMUA" ? { status: status as any } : {};

    const [items, jumlahTertunda, nominalTertunda] = await Promise.all([
      db.withdrawal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: { select: { id: true, fullName: true, email: true, saldo: true } },
        },
      }),
      db.withdrawal.count({ where: { status: "PENDING" } }),
      db.withdrawal.aggregate({ _sum: { amount: true }, where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      items: items.map((w) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        processedAt: w.processedAt?.toISOString() ?? null,
      })),
      ringkasan: {
        jumlahTertunda,
        nominalTertunda: nominalTertunda._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error("Admin withdrawals list error:", error);
    return NextResponse.json({ error: "Gagal memuat data penarikan" }, { status: 500 });
  }
}
