import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/billing/plans";
import { validasiKupon } from "@/lib/billing/kupon";
import { withTimeout } from "@/lib/db-timeout";
import {
  createMidtransSnapTransaction,
  validateMidtransConfig,
  MidtransError,
  mapMidtransError,
} from "@/lib/payments/midtrans-server";

type ErrorCode =
  | "CHECKOUT_AUTH_REQUIRED"
  | "CHECKOUT_FORBIDDEN_ROLE"
  | "CHECKOUT_INVALID_PLAN"
  | "CHECKOUT_INVALID_COUPON"
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

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 10);

  try {
    // Step 1 — Auth
    let user: any;
    try {
      user = await getUser();
    } catch {
      return err("CHECKOUT_AUTH_REQUIRED", "Silakan login terlebih dahulu.", 401);
    }

    if (!user) {
      return err("CHECKOUT_AUTH_REQUIRED", "Silakan login terlebih dahulu.", 401);
    }

    // Role gate: GURU/ADMIN/founder can buy GURU plans, MURID can buy MURID plans.
    const allowedRoles = ["GURU", "ADMIN", "MURID"];
    if (!allowedRoles.includes(user.role) && !user.isFounder) {
      return err("CHECKOUT_FORBIDDEN_ROLE", "Role anda tidak dapat membeli paket ini.", 403);
    }

    // Step 2 — Parse plan
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err("CHECKOUT_INVALID_PLAN", "Pilih paket terlebih dahulu.", 400);
    }

    const { planId, couponCode } = body;
    const plan = getPlan(planId);
    if (!plan) {
      return err("CHECKOUT_INVALID_PLAN", "Paket tidak tersedia.", 400);
    }

    // Validate plan targetRole matches user role (skip for founder/admin)
    if (!user.isFounder && user.role !== "ADMIN") {
      if (plan.targetRole === "GURU" && user.role !== "GURU") {
        return err("CHECKOUT_FORBIDDEN_ROLE", "Paket ini hanya untuk guru.", 403);
      }
      if (plan.targetRole === "MURID" && user.role !== "MURID") {
        return err("CHECKOUT_FORBIDDEN_ROLE", "Paket ini hanya untuk murid.", 403);
      }
    }

    // Step 2b — Validasi kupon (opsional). Harga yang ditagih = harga diskon.
    let kuponInfo: { id: string; kode: string } | null = null;
    let hargaAsli = plan.price;
    let hargaDiskon = plan.price;
    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      try {
        const valid = await validasiKupon(couponCode, user, { planId: plan.planId, price: plan.price });
        kuponInfo = { id: valid.kupon.id, kode: valid.kupon.kode };
        hargaDiskon = valid.hargaDiskon;
      } catch (e: any) {
        return err("CHECKOUT_INVALID_COUPON", e.message || "Kupon tidak valid.", 400);
      }
    }

    // Step 3 — Validate Midtrans config before doing anything
    try {
      validateMidtransConfig();
    } catch (e) {
      if (e instanceof MidtransError) {
        if (e.code === "MIDTRANS_CONFIG_MISSING") {
          return err("MIDTRANS_CONFIG_MISSING", "Konfigurasi pembayaran belum lengkap. Hubungi admin.", 500);
        }
        if (e.code === "MIDTRANS_MODE_MISMATCH") {
          return err("MIDTRANS_MODE_MISMATCH", "Mode pembayaran tidak konsisten. Hubungi admin.", 500);
        }
      }
      return err("MIDTRANS_CONFIG_MISSING", "Konfigurasi pembayaran belum lengkap. Hubungi admin.", 500);
    }

    // Step 4 — Founder/Admin bypass
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

    // Determine transaction type based on plan targetRole
    const transaksiType = plan.targetRole === "MURID" ? "MURID_PREMIUM" : "PREMIUM_UPGRADE";

    // Step 5 — Stale pending cleanup
    try {
      const stalePending = await db.transaksi.findFirst({
        where: {
          userId: user.id,
          type: transaksiType,
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

    // Step 6 — Create Midtrans Snap transaction
    let snapResult: { token: string; redirectUrl: string };
    try {
      snapResult = await createMidtransSnapTransaction({
        orderId,
        amount: hargaDiskon,
        fullName: user.fullName || user.email,
        email: user.email,
        items: [
          {
            id: plan.planId,
            name: kuponInfo ? `${plan.label} (Kupon ${kuponInfo.kode})` : plan.label,
            price: hargaDiskon,
            quantity: 1,
            category: "PREMIUM",
          },
        ],
      });
    } catch (midtransError: any) {
      if (midtransError instanceof MidtransError) {
        if (midtransError.code === "MIDTRANS_UNAUTHORIZED") {
          return err("MIDTRANS_UNAUTHORIZED", "Kredensial pembayaran belum sesuai. Silakan hubungi admin.", 400);
        }
        if (midtransError.code === "MIDTRANS_CREATE_FAILED") {
          return err("MIDTRANS_CREATE_FAILED", "Pembayaran belum bisa dibuat. Silakan coba lagi beberapa saat.", 400);
        }
      }
      const mapped = mapMidtransError(midtransError);
      return err(mapped.error as ErrorCode, mapped.message, mapped.httpStatus);
    }

    // Step 7 — Create local Transaksi record
    let transaksiId: string | null = null;
    try {
      const created = await withTimeout(
        db.transaksi.create({
          data: {
            userId: user.id,
            type: transaksiType,
            amount: hargaDiskon,
            status: "PENDING",
            reference: planId,
            orderId,
            metadata: {
              planId,
              durationDays: plan.durationDays,
              aiCreditsMonthly: plan.aiCreditsMonthly,
              requestId,
              ...(kuponInfo
                ? { kuponId: kuponInfo.id, kuponKode: kuponInfo.kode, hargaAsli, hargaDiskon }
                : {}),
            },
          },
          select: { id: true },
        })
      );
      transaksiId = created.id;
    } catch {
      console.warn(`[Checkout:${requestId}] DB write failed, continuing`);
    }

    // Step 7b — Catat pemakaian kupon (best-effort, setelah Transaksi dibuat)
    if (kuponInfo && transaksiId) {
      try {
        await db.$transaction([
          db.kuponPemakaian.create({
            data: {
              kuponId: kuponInfo.id,
              userId: user.id,
              transaksiId,
              hargaAsli,
              hargaDiskon,
            },
          }),
          db.kupon.update({
            where: { id: kuponInfo.id },
            data: { jumlahTerpakai: { increment: 1 } },
          }),
        ]);
      } catch {
        console.warn(`[Checkout:${requestId}] Kupon usage write failed, continuing`);
      }
    }

    return ok({
      transactionId: transaksiId,
      orderId,
      token: snapResult.token,
      redirectUrl: snapResult.redirectUrl,
      plan: {
        planId: plan.planId,
        label: plan.label,
        price: plan.price,
        hargaDiskon,
        durationDays: plan.durationDays,
      },
      ...(kuponInfo ? { kupon: { kode: kuponInfo.kode, hargaAsli, hargaDiskon } } : {}),
    });
  } catch (error: any) {
    console.error(`[Checkout:${requestId}] Unhandled crash`, {
      message: error?.message,
    });
    return err(
      "CHECKOUT_UNKNOWN_ERROR",
      "Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.",
      500
    );
  }
}
