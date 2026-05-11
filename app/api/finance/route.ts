import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

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

    const [withdrawals, earnings, stats] = await Promise.all([
      db.withdrawal.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.sellerEarning.findMany({
        where: { sellerId: dbUser.id },
        orderBy: { soldAt: "desc" },
        take: 20,
      }),
      db.sellerEarning.aggregate({
        where: { sellerId: dbUser.id, status: "COMPLETED" },
        _sum: { netAmount: true, grossAmount: true, platformFee: true },
      }),
    ]);

    return NextResponse.json({
      balance: dbUser.saldo,
      totalEarned: dbUser.totalEarned,
      stats: stats._sum,
      withdrawals,
      earnings,
    });
  } catch (error) {
    console.error("GET /api/finance error:", error);
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

    const body = await req.json();
    const { amount, bankName, accountNumber, accountHolder } = body;

    if (!amount || !bankName || !accountNumber || !accountHolder) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const minWithdraw = 50000;
    if (amount < minWithdraw) {
      return NextResponse.json({ error: `Minimal penarikan Rp ${minWithdraw.toLocaleString("id-ID")}` }, { status: 400 });
    }

    if (dbUser.saldo < amount) {
      return NextResponse.json({ error: "Saldo tidak mencukupi" }, { status: 400 });
    }

    const withdrawal = await db.withdrawal.create({
      data: {
        userId: dbUser.id,
        amount,
        bankName,
        accountNumber,
        accountHolder,
        status: "PENDING",
      },
    });

    await db.user.update({
      where: { id: dbUser.id },
      data: { saldo: { decrement: amount } },
    });

    await db.notifikasi.create({
      data: {
        userId: dbUser.id,
        title: "Permintaan Penarikan Diproses",
        body: `Permintaan penarikan Rp ${amount.toLocaleString("id-ID")} sedang diproses.`,
        type: "WITHDRAWAL",
      },
    });

    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/finance error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}