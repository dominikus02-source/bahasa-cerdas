import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPlan, transactionTypeForPlan } from "@/lib/billing/plans";
import { isUmumPremiumEnabled } from "@/lib/umum/premium-flag";
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

/** Pesanan UMUM yang masih menunggu dalam jendela ini dilanjutkan (bukan dibuat baru). */
const UMUM_RESUME_WINDOW_MS = 15 * 60 * 1000;

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

    // Role gate: GURU/ADMIN/founder can buy GURU plans, MURID can buy MURID
    // plans, UMUM can buy UMUM plans (dicek per paket di bawah).
    const allowedRoles = ["GURU", "ADMIN", "MURID", "UMUM"];
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

    // Tipe transaksi dari allowlist eksplisit — targetRole asing ditolak.
    const transaksiType = transactionTypeForPlan(plan);
    if (!transaksiType) {
      return err("CHECKOUT_FORBIDDEN_ROLE", "Paket ini tidak tersedia untuk akunmu.", 403);
    }

    // Premium Umum di balik flag ENABLE_UMUM_PREMIUM (default mati). Dicek
    // sebelum bypass founder dan sebelum DB/Midtrans disentuh.
    if (plan.targetRole === "UMUM" && !isUmumPremiumEnabled()) {
      return err("CHECKOUT_FORBIDDEN_ROLE", "Premium Umum belum dibuka.", 403);
    }

    // Validate plan targetRole matches user role (skip for founder/admin)
    if (!user.isFounder && user.role !== "ADMIN") {
      if (plan.targetRole === "GURU" && user.role !== "GURU") {
        return err("CHECKOUT_FORBIDDEN_ROLE", "Paket ini hanya untuk guru.", 403);
      }
      if (plan.targetRole === "MURID" && user.role !== "MURID") {
        return err("CHECKOUT_FORBIDDEN_ROLE", "Paket ini hanya untuk murid.", 403);
      }
      if (plan.targetRole === "UMUM" && user.role !== "UMUM") {
        return err("CHECKOUT_FORBIDDEN_ROLE", "Paket ini hanya untuk akun Umum.", 403);
      }
      // Pengaman: peran apa pun yang tidak cocok persis dengan targetRole ditolak.
      if (plan.targetRole !== user.role) {
        return err("CHECKOUT_FORBIDDEN_ROLE", "Paket ini bukan untuk jenis akunmu.", 403);
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

    // Step 4 — Founder/Admin bypass (akun uji internal; tanpa pembayaran).
    if (user.isFounder || user.role === "ADMIN") {
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + plan.durationDays);
      try {
        await db.user.update({
          where: { id: user.id },
          data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
        });
      } catch (bypassError: any) {
        console.error(`[Checkout:${requestId}] Founder/admin bypass update failed`, {
          userId: user.id,
          message: bypassError?.message,
        });
        return err("CHECKOUT_DB_FAILED", "Gagal mengaktifkan akun uji. Coba lagi.", 500);
      }
      return ok({
        bypass: true,
        message: "Akun pendiri/admin — Premium aktif tanpa pembayaran.",
        premiumUntil: premiumUntil.toISOString(),
      });
    }

    // Determine transaction type: sudah ditetapkan di atas lewat allowlist
    // transactionTypeForPlan (GURU→PREMIUM_UPGRADE, MURID→MURID_PREMIUM,
    // UMUM→UMUM_PREMIUM).

    // Step 4b — Premium Umum: lanjutkan pesanan yang masih menunggu (≤ 15
    // menit, paket + nominal + kupon sama) agar klik ganda / kembali dari
    // Snap tidak membuat pesanan baru. Guru/murid tidak berubah.
    if (transaksiType === "UMUM_PREMIUM") {
      try {
        const pending = await db.transaksi.findFirst({
          where: {
            userId: user.id,
            type: "UMUM_PREMIUM",
            status: "PENDING",
            reference: plan.planId,
            amount: hargaDiskon,
            createdAt: { gt: new Date(Date.now() - UMUM_RESUME_WINDOW_MS) },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, orderId: true, metadata: true },
        });
        const meta = (pending?.metadata || {}) as Record<string, unknown>;
        const sameCoupon = (meta.kuponKode ?? null) === (kuponInfo?.kode ?? null);
        if (pending?.orderId && sameCoupon && typeof meta.snapToken === "string" && typeof meta.redirectUrl === "string") {
          return ok({
            resumed: true,
            transactionId: pending.id,
            orderId: pending.orderId,
            token: meta.snapToken,
            redirectUrl: meta.redirectUrl,
            plan: { planId: plan.planId, label: plan.label, price: plan.price, hargaDiskon, durationDays: plan.durationDays },
            ...(kuponInfo ? { kupon: { kode: kuponInfo.kode, hargaAsli, hargaDiskon } } : {}),
          });
        }
      } catch (resumeError: any) {
        console.warn(`[Checkout:${requestId}] UMUM resume lookup failed`, { message: resumeError?.message });
      }
    }

    const orderId = generateOrderId(user.id);

    // Step 5 — Pesanan lama yang masih menunggu diganti pesanan baru.
    // Statusnya "REPLACED" (bukan "EXPIRED") agar riwayat menampilkan
    // "Diganti pesanan baru". Jika pesanan lama ternyata tetap dibayar,
    // webhook/reconcile masih mengaktifkan (klaim hanya menolak SUCCESS).
    try {
      const stalePending = await db.transaksi.findMany({
        where: {
          userId: user.id,
          type: transaksiType,
          status: "PENDING",
          createdAt: { lt: new Date(Date.now() - 2 * 60 * 1000) },
        },
        select: { id: true, metadata: true },
        take: 10,
      });
      for (const stale of stalePending) {
        await db.transaksi.updateMany({
          where: { id: stale.id, status: "PENDING" },
          data: {
            status: "REPLACED",
            metadata: { ...((stale.metadata as Record<string, unknown>) || {}), replacedByOrderId: orderId },
          },
        });
      }
    } catch (cleanupError: any) {
      console.warn(`[Checkout:${requestId}] Stale pending cleanup failed`, { message: cleanupError?.message });
    }

    // ────────────────────────────────────────────────────────────────
    // Step 6 — Create local Transaksi record FIRST (payment-critical)
    //
    // P4.1 FIX: The local transaction MUST exist before Midtrans Snap
    // is called. If this DB write fails, checkout MUST return an error
    // and no payment session may be created.
    // ────────────────────────────────────────────────────────────────
    let transaksiId: string;
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
    } catch (dbError: any) {
      // PAYMENT-CRITICAL: hard-fail. No Midtrans call, no payment session.
      console.error(`[Checkout:${requestId}] DB write failed — payment-critical`, {
        userId: user.id,
        orderId,
        message: dbError?.message,
      });
      return err("CHECKOUT_DB_FAILED", "Gagal menyimpan data transaksi. Silakan coba lagi.", 500);
    }

    // Step 6b — Pemakaian kupon dicatat saat pembayaran LUNAS (settlement),
    // bukan di sini: lihat lib/payments/midtrans-notification.ts. Checkout
    // yang batal tidak lagi menghabiskan kuota kupon.

    // ────────────────────────────────────────────────────────────────
    // Step 7 — Create Midtrans Snap transaction (AFTER local record)
    //
    // P4.1 FIX: Now that a local Transaksi exists, we can safely call
    // Midtrans. If Midtrans fails, we mark the local record as FAILED
    // so it does not stay in an ambiguous PENDING state.
    // ────────────────────────────────────────────────────────────────
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
      // Midtrans failed AFTER local Transaksi was created.
      // Mark the local record as FAILED so it does not stay ambiguous PENDING.
      try {
        await db.transaksi.update({
          where: { id: transaksiId },
          data: { status: "FAILED" },
        });
      } catch (cleanupErr: any) {
        console.error(`[Checkout:${requestId}] Failed to mark Transaksi as FAILED after Midtrans error`, {
          transaksiId,
          message: cleanupErr?.message,
        });
      }

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

    if (transaksiType === "UMUM_PREMIUM") {
      // Simpan token Snap agar pesanan bisa dilanjutkan (Step 4b).
      await db.transaksi
        .update({
          where: { id: transaksiId },
          data: {
            metadata: {
              planId,
              durationDays: plan.durationDays,
              aiCreditsMonthly: plan.aiCreditsMonthly,
              requestId,
              ...(kuponInfo ? { kuponId: kuponInfo.id, kuponKode: kuponInfo.kode, hargaAsli, hargaDiskon } : {}),
              snapToken: snapResult.token,
              redirectUrl: snapResult.redirectUrl,
            },
          },
        })
        .catch((e: any) => console.warn(`[Checkout:${requestId}] snap token save failed`, { message: e?.message }));
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
