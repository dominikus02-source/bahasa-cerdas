import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/billing/plans";
import { withTimeout } from "@/lib/db-timeout";
import { getIsProduction } from "@/lib/midtrans";

const Midtrans = require("midtrans-client");

type ErrorCode = "AUTH_REQUIRED" | "ROLE_NOT_ALLOWED" | "INVALID_PLAN" | "MIDTRANS_CONFIG_MISSING" | "MIDTRANS_MODE_MISMATCH" | "MIDTRANS_API_ERROR" | "DB_ERROR" | "UNEXPECTED_ERROR";

function err(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
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
      return err("AUTH_REQUIRED", "Silakan login terlebih dahulu.", 401);
    }

    if (!["GURU", "ADMIN"].includes(user.role) && !user.isFounder) {
      return err("ROLE_NOT_ALLOWED", "Hanya guru yang dapat membeli paket Guru Pro.", 403);
    }

    const body = await req.json();
    const { planId } = body;

    if (!planId || typeof planId !== "string") {
      return err("INVALID_PLAN", "Pilih paket terlebih dahulu.", 400);
    }

    const plan = getPlan(planId);
    if (!plan) {
      return err("INVALID_PLAN", "Paket tidak tersedia.", 400);
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

    if (!serverKey || !clientKey) {
      console.error("[Billing/Checkout] Missing env vars");
      return err(
        "MIDTRANS_CONFIG_MISSING",
        "Konfigurasi pembayaran belum lengkap. Hubungi admin.",
        500
      );
    }

    const isProduction = getIsProduction();
    const serverEnvProd = process.env.MIDTRANS_IS_PRODUCTION;
    const clientEnvProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION;

    // Mode mismatch warning (non-blocking, but logged)
    if (serverEnvProd != null && clientEnvProd != null && serverEnvProd !== clientEnvProd) {
      console.warn("[Billing/Checkout] Mode mismatch:", {
        serverProd: serverEnvProd,
        clientProd: clientEnvProd,
        effective: isProduction,
      });
    }

    // Founder/Admin bypass
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

    // Auto-cancel stale pending
    const stalePending = await db.transaksi.findFirst({
      where: {
        userId: user.id,
        type: "PREMIUM_UPGRADE",
        status: "PENDING",
        createdAt: { lt: new Date(Date.now() - 2 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (stalePending) {
      await db.transaksi.update({
        where: { id: stalePending.id },
        data: { status: "EXPIRED" },
      });
    }

    const orderId = generateOrderId(user.id);

    console.log("[Billing/Checkout] Creating transaction:", {
      orderId,
      planId,
      isProduction,
    });

    const midtransClient = new Midtrans.Snap({
      serverKey,
      clientKey,
      isProduction,
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
    };

    let transactionToken: string;
    let redirectUrl: string;

    try {
      const transaction = await midtransClient.createTransaction(parameter);
      transactionToken = transaction.token;
      redirectUrl = transaction.redirect_url;
    } catch (midtransError: any) {
      const apiMsg = midtransError?.ApiResponse?.error_messages?.join?.(", ") || midtransError?.message || "unknown";
      console.error("[Billing/Checkout] Midtrans API error:", {
        status: midtransError?.httpStatusCode,
        apiMessage: apiMsg,
        isProduction,
      });
      return err(
        "MIDTRANS_API_ERROR",
        "Pembayaran belum bisa dibuat. Silakan coba lagi beberapa saat.",
        502
      );
    }

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
      console.warn("[Billing/Checkout] DB write timeout, continuing");
    }

    return NextResponse.json({
      transactionId: transaksiId,
      orderId,
      token: transactionToken,
      redirectUrl,
      plan: {
        planId: plan.planId,
        label: plan.label,
        price: plan.price,
        durationDays: plan.durationDays,
      },
    });
  } catch (error) {
    console.error("[Billing/Checkout] Unexpected:", error);
    return err(
      "UNEXPECTED_ERROR",
      "Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.",
      500
    );
  }
}
