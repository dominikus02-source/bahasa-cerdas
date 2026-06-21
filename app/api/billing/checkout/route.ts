import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/billing/plans";
import { withTimeout } from "@/lib/db-timeout";

type ErrorCode =
  | "AUTH_REQUIRED"
  | "ROLE_NOT_ALLOWED"
  | "INVALID_PLAN"
  | "MIDTRANS_CONFIG_MISSING"
  | "MIDTRANS_MODE_MISMATCH"
  | "MIDTRANS_UNAUTHORIZED"
  | "MIDTRANS_CREATE_FAILED"
  | "CHECKOUT_DB_FAILED"
  | "CHECKOUT_UNKNOWN_ERROR";

function err(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ ok: false, error: code, message }, { status });
}

function ok(data: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...data });
}

function generateOrderId(userId: string): string {
  const ts = Date.now().toString(36).slice(-6).toUpperCase();
  const shortId = userId.slice(0, 8);
  return `PM-${ts}-${shortId}`;
}

function getIsProduction(): boolean {
  const s = process.env.MIDTRANS_IS_PRODUCTION;
  const c = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION;
  return s === "true" || c === "true";
}

function getMidtransApiBase(): string {
  return getIsProduction()
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

async function createSnapTransaction(params: {
  orderId: string;
  amount: number;
  fullName: string;
  email: string;
}): Promise<MidtransSnapResponse> {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  const baseUrl = getMidtransApiBase();
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const body = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.fullName,
      email: params.email,
    },
  };

  const res = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    const errMsg = Array.isArray(json?.error_messages)
      ? json.error_messages.join(", ")
      : json?.error_messages || `HTTP ${res.status}`;

    const error: any = new Error(errMsg);
    error.httpStatusCode = res.status;
    error.apiResponse = json;
    throw error;
  }

  return { token: json.token, redirect_url: json.redirect_url };
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 10);

  try {
    // Step 1 — auth
    let user: any;
    try {
      user = await getUser();
    } catch {
      return err("AUTH_REQUIRED", "Silakan login terlebih dahulu.", 401);
    }

    if (!user) {
      return err("AUTH_REQUIRED", "Silakan login terlebih dahulu.", 401);
    }

    if (!["GURU", "ADMIN"].includes(user.role) && !user.isFounder) {
      return err("ROLE_NOT_ALLOWED", "Hanya guru yang dapat membeli paket Guru Pro.", 403);
    }

    // Step 2 — plan
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err("INVALID_PLAN", "Pilih paket terlebih dahulu.", 400);
    }

    const { planId } = body;
    const plan = getPlan(planId);
    if (!plan) {
      return err("INVALID_PLAN", "Paket tidak tersedia.", 400);
    }

    // Step 3 — env validation
    const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
    const clientKey = (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim();
    const isProduction = getIsProduction();

    if (!serverKey || !clientKey) {
      console.error(`[Checkout:${requestId}] Missing env vars`);
      return err(
        "MIDTRANS_CONFIG_MISSING",
        "Konfigurasi pembayaran belum lengkap. Hubungi admin.",
        500
      );
    }

    // Step 4 — Founder bypass
    if (user.isFounder || user.role === "ADMIN") {
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + plan.durationDays);
      try {
        await db.user.update({
          where: { id: user.id },
          data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
        });
      } catch {}
      return ok({
        bypass: true,
        message: "Akun Founder/Admin — premium diaktifkan tanpa pembayaran",
        premiumUntil: premiumUntil.toISOString(),
      });
    }

    // Step 5 — stale pending cleanup
    try {
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
    } catch {}

    const orderId = generateOrderId(user.id);

    console.log(`[Checkout:${requestId}] Creating transaction`, {
      orderId,
      planId,
      mode: isProduction ? "production" : "sandbox",
    });

    // Step 6 — create Midtrans Snap transaction
    let snapResult: MidtransSnapResponse;
    try {
      snapResult = await createSnapTransaction({
        orderId,
        amount: plan.price,
        fullName: user.fullName,
        email: user.email,
      });
    } catch (midtransError: any) {
      const status = midtransError?.httpStatusCode;
      const apiMsg = midtransError?.message || "unknown";

      console.error(`[Checkout:${requestId}] Midtrans failed`, {
        httpStatus: status,
        apiMessage: apiMsg,
        mode: isProduction ? "production" : "sandbox",
      });

      if (status === 401) {
        return err(
          "MIDTRANS_UNAUTHORIZED",
          "Kredensial pembayaran belum sesuai. Periksa Server Key dan mode Production/Sandbox di dashboard Midtrans.",
          502
        );
      }

      return err(
        "MIDTRANS_CREATE_FAILED",
        "Pembayaran belum bisa dibuat. Silakan coba lagi beberapa saat.",
        502
      );
    }

    // Step 7 — create local Transaksi record
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
            metadata: {
              planId,
              durationDays: plan.durationDays,
              aiCreditsMonthly: plan.aiCreditsMonthly,
              requestId,
              mode: isProduction ? "production" : "sandbox",
            },
          },
          select: { id: true },
        })
      );
      transaksiId = created.id;
    } catch {
      console.warn(`[Checkout:${requestId}] DB write failed, continuing`);
    }

    console.log(`[Checkout:${requestId}] Success`, { orderId, transaksiId });

    return ok({
      transactionId: transaksiId,
      orderId,
      token: snapResult.token,
      redirectUrl: snapResult.redirect_url,
      plan: {
        planId: plan.planId,
        label: plan.label,
        price: plan.price,
        durationDays: plan.durationDays,
      },
    });
  } catch (error: any) {
    console.error(`[Checkout:${requestId}] Unhandled crash`, {
      message: error?.message,
      stack: error?.stack?.slice(0, 300),
    });
    return err(
      "CHECKOUT_UNKNOWN_ERROR",
      "Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.",
      500
    );
  }
}
