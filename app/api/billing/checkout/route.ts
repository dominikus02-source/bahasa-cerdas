import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/billing/plans";
import { withTimeout } from "@/lib/db-timeout";

const Midtrans = require("midtrans-client");

function getIsProduction(): boolean {
  return process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.bahasacerdas.com";
}

function generateOrderId(userId: string): string {
  const ts = Date.now().toString(36).slice(-6).toUpperCase();
  const shortId = userId.slice(0, 8);
  return `PM-${ts}-${shortId}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["GURU", "ADMIN"].includes(user.role) && !user.isFounder) {
      return NextResponse.json({ error: "Hanya guru yang dapat mengakses" }, { status: 403 });
    }

    const body = await req.json();
    const { planId } = body;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ error: "planId wajib diisi" }, { status: 400 });
    }

    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 });
    }

    // Founder/Admin bypass — no payment needed
    if (user.isFounder || user.role === "ADMIN") {
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + plan.durationDays);

      await db.user.update({
        where: { id: user.id },
        data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
      });

      return NextResponse.json({
        bypass: true,
        message: "Akun Founder/Admin — premium diaktifkan tanpa pembayaran",
        premiumUntil,
      });
    }

    // Prevent duplicate pending checkout within 5 minutes
    const recentPending = await db.transaksi.findFirst({
      where: {
        userId: user.id,
        type: "PREMIUM_UPGRADE",
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentPending) {
      return NextResponse.json({
        error: "Masih ada transaksi pending. Selesaikan atau tunggu 5 menit.",
        existingOrderId: recentPending.orderId,
      }, { status: 409 });
    }

    const orderId = generateOrderId(user.id);

    const midtransClient = new Midtrans.Snap({
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
      isProduction: getIsProduction(),
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: plan.price,
      },
      customer_details: {
        first_name: user.fullName,
        email: user.email,
      },
      item_details: [
        {
          id: plan.planId,
          name: plan.label,
          price: plan.price,
          quantity: 1,
        },
      ],
    };

    const transaction = await midtransClient.createTransaction(parameter);
    let transaksiId: string | null = null;

    try {
      const created = await withTimeout(
        db.transaksi.create({
          data: {
            userId: user.id,
            type: "PREMIUM_UPGRADE",
            amount: plan.price,
            status: "PENDING",
            reference: planId,
            orderId,
            metadata: { planId, durationDays: plan.durationDays, aiCreditsMonthly: plan.aiCreditsMonthly },
          },
          select: { id: true },
        })
      );
      transaksiId = created.id;
    } catch {
      console.warn("[Billing/Checkout] DB write timeout for transaksi, continuing anyway");
    }

    return NextResponse.json({
      transactionId: transaksiId,
      orderId,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      plan: {
        planId: plan.planId,
        label: plan.label,
        price: plan.price,
        durationDays: plan.durationDays,
      },
    });
  } catch (error) {
    console.error("[Billing/Checkout] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses checkout" },
      { status: 500 }
    );
  }
}
