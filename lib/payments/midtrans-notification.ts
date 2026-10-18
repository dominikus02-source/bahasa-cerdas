import { db } from "@/lib/db";
import { createCommissionFromTransaction, reverseCommissionForTransaction } from "@/lib/commission/engine";
import { evaluateRapidPremiumSignal, evaluateRefundPatternSignal } from "@/lib/guru/risk/events";
import cache from "@/lib/redis";
import { parseMidtransAmount } from "@/lib/payments/midtrans-server";

/**
 * Canonical Midtrans -> entitlement processor.
 *
 * Shared by the HTTP notification webhook (after signature verification) and
 * by the server-side reconcile path (after fetching /v2/{order_id}/status
 * from Midtrans with the server key and verifying its signature). Callers
 * MUST verify authenticity before calling this; this function trusts `body`.
 *
 * Idempotent: SUCCESS is claimed atomically (status != SUCCESS -> SUCCESS)
 * in the same DB transaction as the entitlement update, so replays and a
 * concurrent webhook + reconcile activate at most once.
 */

export interface MidtransProcessResult {
  httpStatus: number;
  body: Record<string, unknown>;
}

function respond(body: Record<string, unknown>, init: { status?: number } = {}): MidtransProcessResult {
  return { httpStatus: init.status ?? 200, body };
}

function getPlanFromAmount(grossAmount: number): { durationDays: number; aiCreditsMonthly: number; planId: string } | null {
  // Check higher amounts first to avoid Murid thresholds shadowing Guru plans.
  // Guru Pro Yearly (399000) > Murid Yearly (180000) > Guru Pro Monthly (49000) > Murid Monthly (19000)
  if (grossAmount >= 399000) {
    return { durationDays: 365, aiCreditsMonthly: 500, planId: "GURU_PRO_YEARLY" };
  }
  if (grossAmount >= 180000) {
    return { durationDays: 365, aiCreditsMonthly: 0, planId: "MURID_PREMIUM_YEARLY" };
  }
  if (grossAmount >= 49000) {
    return { durationDays: 30, aiCreditsMonthly: 500, planId: "GURU_PRO_MONTHLY" };
  }
  if (grossAmount >= 19000) {
    return { durationDays: 30, aiCreditsMonthly: 0, planId: "MURID_PREMIUM_MONTHLY" };
  }
  return null;
}

function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

async function syncPremiumCreditLedger(userId: string, planId: string, aiCreditsMonthly: number) {
  const period = getCurrentPeriod();
  const plan = "GURU_PRO";
  const targetTotal = aiCreditsMonthly; // 500

  const now = new Date();
  const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  try {
    const existing = await db.aiCreditLedger.findUnique({
      where: { userId_period_plan: { userId, period, plan } },
    });

    if (existing) {
      // Only raise creditsTotal if current is less than target
      if (existing.creditsTotal < targetTotal) {
        await db.aiCreditLedger.update({
          where: { id: existing.id },
          data: { creditsTotal: targetTotal, source: "premium_payment" },
        });
      }
    } else {
      await db.aiCreditLedger.create({
        data: {
          userId,
          period,
          plan,
          creditsTotal: targetTotal,
          creditsUsed: 0,
          creditsReserved: 0,
          source: "premium_payment",
          startsAt: now,
          endsAt,
        },
      });
    }
  } catch (err) {
    console.error("[Webhook] Credit ledger sync error:", err);
  }
}


type TransaksiStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED";

const STATUS_MAP: Record<string, { status: TransaksiStatus; activatePremium: boolean }> = {
  settlement: { status: "SUCCESS", activatePremium: true },
  capture: { status: "SUCCESS", activatePremium: true },
  pending: { status: "PENDING", activatePremium: false },
  cancel: { status: "CANCELLED", activatePremium: false },
  expire: { status: "EXPIRED", activatePremium: false },
  deny: { status: "FAILED", activatePremium: false },
  failure: { status: "FAILED", activatePremium: false },
};

function getHandler(transactionStatus: string) {
  return STATUS_MAP[transactionStatus] || { status: "FAILED" as TransaksiStatus, activatePremium: false };
}

export async function processVerifiedMidtransNotification(
  body: Record<string, any>
): Promise<MidtransProcessResult> {
  const { order_id, transaction_status } = body;
  const grossAmount = parseMidtransAmount(body.gross_amount);

  try {
    // Card capture flagged "challenge" is awaiting merchant review and
    // "deny" is a fraud rejection: neither may grant access.
    const fraud = typeof body.fraud_status === "string" ? body.fraud_status : "";
    const handler =
      transaction_status === "capture" && fraud === "challenge"
        ? { status: "PENDING" as TransaksiStatus, activatePremium: false }
        : transaction_status === "capture" && fraud === "deny"
          ? { status: "FAILED" as TransaksiStatus, activatePremium: false }
          : getHandler(transaction_status);
    const newStatus = handler.status;
    const activatePremium = handler.activatePremium;

    const transaksi = await db.transaksi.findFirst({ where: { orderId: order_id } });

    // Unknown orderId — log and return ok (Midtrans requires 200)
    if (!transaksi) {
      console.warn("[Webhook] Unknown orderId:", order_id);
      return respond({ ok: true, warning: "unknown_order" });
    }

    // ── P7C: REFUND / CHARGEBACK — reversal komisi (additive) ──
    // Sebelumnya event ini diabaikan sama sekali (guard anti-downgrade).
    // Sekarang: klaim SUCCESS → REFUNDED (atomik, idempotent) lalu komisi
    // dibalik dengan entry negatif append-only. Kegagalan reversal TIDAK
    // menggagalkan webhook — payment tetap tercatat, retry aman.
    const REFUND_EVENTS = new Set(["refund", "partial_refund", "chargeback", "partial_chargeback"]);
    if (REFUND_EVENTS.has(transaction_status)) {
      if (transaksi.status !== "SUCCESS") {
        return respond({ ok: true, idempotent: true, note: "refund_ignored_not_success" });
      }
      try {
        const claimed = await db.transaksi.updateMany({
          where: { id: transaksi.id, status: "SUCCESS" },
          data: { status: "REFUNDED" },
        });
        if (claimed.count > 0) {
          try {
            await reverseCommissionForTransaction(transaksi.id, "REFUND");
            // ── P8C: signal pola refund abnormal (best-effort) ──
            await evaluateRefundPatternSignal(transaksi.id).catch(() => {});
          } catch (err) {
            console.error("[Webhook] Commission reversal failed (retry-safe):", err);
          }
        }
      } catch (error) {
        console.error("[Webhook] Refund processing error:", error);
      }
      return respond({ ok: true });
    }

    // ── P4.1 FIX: AMOUNT VALIDATION ──
    // Compare Midtrans gross_amount against the local Transaksi amount.
    // The local amount is canonical because coupons/discounts may change
    // the charged amount. If they don't match, do NOT activate Premium.
    if (grossAmount !== transaksi.amount) {
      console.error("[Webhook] Amount mismatch — rejecting activation", {
        order_id,
        midtransAmount: grossAmount,
        localAmount: transaksi.amount,
        transaksiType: transaksi.type,
      });
      return respond({ error: "Amount mismatch" }, { status: 400 });
    }

    // Prevent downgrade: if already SUCCESS and new status is not SUCCESS, do nothing
    if (transaksi.status === "SUCCESS" && newStatus !== "SUCCESS") {
      return respond({ ok: true, idempotent: true, note: "already_success_ignored" });
    }

    // ── NON-SUCCESS STATUS ─────────────────────────────────────────
    // IMPORTANT: pending/deny/expire/cancel must NEVER claim SUCCESS.
    // A previous bug wrote SUCCESS for a pending notification, which caused
    // the later settlement notification to be treated as duplicate and
    // skipped entitlement activation.
    if (!activatePremium) {
      await db.transaksi.updateMany({
        where: { id: transaksi.id, status: { not: "SUCCESS" } },
        data: {
          status: newStatus,
          ...(body.transaction_id ? { midtransId: body.transaction_id } : {}),
        },
      });
      return respond({ ok: true, status: newStatus });
    }

    // ── CLAIM-FIRST IDEMPOTENCY FOR SUCCESS ONLY ──────────────────
    // Only settlement/capture may atomically claim SUCCESS. The claim and
    // entitlement update are in the SAME DB transaction so failure rolls
    // both back and a Midtrans retry remains safe.
    try {
      const processed = await db.$transaction(async (tx) => {
        const claim = await tx.transaksi.updateMany({
          where: { id: transaksi.id, status: { not: "SUCCESS" } },
          data: { status: "SUCCESS", midtransId: body.transaction_id },
        });
        if (claim.count === 0) {
          console.log("[Webhook] duplicate — already processed", { order_id });
          return false;
        }

        // Handle both GURU PREMIUM_UPGRADE and MURID MURID_PREMIUM
        if (transaksi.type === "PREMIUM_UPGRADE" || transaksi.type === "MURID_PREMIUM") {
          const isMurid = transaksi.type === "MURID_PREMIUM";

          // Determine plan details
          const meta = (transaksi.metadata || {}) as Record<string, any>;
          let durationDays = isMurid ? 30 : 30;
          let aiCreditsMonthly = isMurid ? 0 : 500;
          let planId = isMurid ? "MURID_PREMIUM_MONTHLY" : "GURU_PRO_MONTHLY";

          if (meta.planId) {
            planId = meta.planId;
            durationDays = meta.durationDays || durationDays;
            aiCreditsMonthly = meta.aiCreditsMonthly ?? aiCreditsMonthly;
          } else {
            // Fallback: detect from amount
            const fallback = getPlanFromAmount(grossAmount);
            if (fallback) {
              durationDays = fallback.durationDays;
              aiCreditsMonthly = fallback.aiCreditsMonthly;
              planId = fallback.planId;
            }
          }

          // Calculate premiumUntil: stack on existing if active — baca DI DALAM
          // transaksi yang sama dengan klaim agar tidak double-extend saat race.
          const user = await tx.user.findUnique({
            where: { id: transaksi.userId },
            select: { premiumUntil: true, role: true },
          });

          const now = new Date();
          let premiumUntil: Date;

          if (user?.premiumUntil && user.premiumUntil > now) {
            premiumUntil = new Date(user.premiumUntil.getTime() + durationDays * 24 * 60 * 60 * 1000);
          } else {
            premiumUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
          }

          // Determine premiumPlan based on user role
          const premiumPlan = isMurid ? "PRO" : "PRO";

          await tx.user.update({
            where: { id: transaksi.userId },
            data: { isPremium: true, premiumPlan, premiumUntil },
          });
          await tx.notifikasi.create({
            data: {
              userId: transaksi.userId,
              title: "Pembayaran Berhasil!",
              body: isMurid
                ? "Premium aktif! Nikmati latihan personal dan mentor AI."
                : "Akunmu telah diupgrade ke PRO. Selamat menikmati fitur premium!",
              type: "PREMIUM",
            },
          });
          console.log("[premium.activated]", { userId: transaksi.userId, order_id, planId, durationDays, isMurid, premiumUntil: premiumUntil.toISOString() });
          return { planId, aiCreditsMonthly, isMurid };
        }

        if (transaksi.type === "KARYA_PURCHASE") {
          const meta = (transaksi.metadata || {}) as any;
          const items: any[] = meta.items || [];

          // Klaim Pembelian PAID secara atomik — jaminan efek finansial hanya
          // SEKALI walau webhook tiba dobel/concurrent.
          const fresh = await tx.pembelian.updateMany({
            where: { midtransOrderId: order_id, status: { not: "PAID" } },
            data: {
              status: "PAID",
              midtransPaymentType: body.payment_type,
              midtransStatus: "settlement",
              midtransPaymentAmount: grossAmount,
              midtransPaidAt: new Date(),
            },
          });

          if (fresh.count === 0) {
            console.log("[Webhook] karya purchase duplicate", { order_id });
            return true;
          }

          // Process each item in the order (hanya setelah klaim menang)
          for (const item of items) {
            const { karyaId, sellerId, subtotal: itemSubtotal } = item;
            if (!karyaId) continue;

            // Baca netAmount dari sellerEarning (pre-calculated dengan split 85/15)
            const earning = await tx.sellerEarning.findFirst({
              where: { sellerId, itemId: karyaId, status: "PENDING" },
              orderBy: { soldAt: "desc" },
              select: { netAmount: true },
            });

            const sellerEarning = earning?.netAmount ?? Math.round(itemSubtotal * 0.85);

            const karya = await tx.karya.findUnique({
              where: { id: karyaId },
              select: { title: true, fileUrl: true },
            });

            await tx.karya.update({ where: { id: karyaId }, data: { downloads: { increment: 1 } } });
            await tx.user.update({ where: { id: sellerId }, data: { saldo: { increment: sellerEarning }, totalEarned: { increment: sellerEarning } } });
            await tx.sellerEarning.updateMany({
              where: { sellerId, itemId: karyaId, status: "PENDING" },
              data: { status: "COMPLETED" },
            });
            await tx.purchaseHistory.updateMany({
              where: { buyerId: transaksi.userId, itemId: karyaId },
              data: { fileUrl: karya?.fileUrl || "" },
            });
          }

          // Send notification
          const firstKarya = items[0] ? await tx.karya.findUnique({ where: { id: items[0].karyaId }, select: { title: true } }).catch(() => null) : null;
          const itemCount = items.length;
          await tx.notifikasi.create({
            data: {
              userId: transaksi.userId,
              title: "Pembelian Berhasil! 🎉",
              body: itemCount > 1
                ? `${itemCount} karya berhasil dibeli. Cek di halaman pesanan untuk unduh.`
                : `Karya "${firstKarya?.title || 'Karya'}" telah masuk ke akunmu.`,
              type: "PURCHASE",
            },
          });
          return true;
        }

        // Tipe lain — klaim status saja
        return true;
      });

      // Entitlement sudah committed. Invalidate /api/user/me agar UI tidak
      // membaca profil FREE yang masih tersimpan di Redis.
      await cache.del(`user:me:id:${(await db.user.findUnique({ where: { id: transaksi.userId }, select: { supabaseId: true } }))?.supabaseId || ""}`).catch(() => {});

      // Ledger kredit AI (di luar transaksi klaim — best-effort, aman dobel
      // karena syncPremiumCreditLedger idempotent: hanya menaikkan ke target).
      // Only sync for GURU plans (Murid uses feature-tiered caps, not credits).
      if (
        processed && typeof processed === "object" &&
        "planId" in processed &&
        !processed.isMurid &&
        processed.aiCreditsMonthly > 0
      ) {
        await syncPremiumCreditLedger(transaksi.userId, processed.planId, processed.aiCreditsMonthly);
      }

      // ── P7C: COMMISSION ENGINE (Guru Cerdas Sejahtera) ──
      // Setelah klaim SUCCESS berhasil & premium murid aktif, evaluasi komisi
      // guru dari transaksi ini. NON-BLOCKING terhadap flow pembayaran:
      // gagal → payment tetap sukses, error di-log, event bisa di-retry
      // (idempotent via unique key + backfill tooling).
      if (
        processed && typeof processed === "object" &&
        "isMurid" in processed && processed.isMurid === true &&
        transaksi.type === "MURID_PREMIUM"
      ) {
        try {
          const commission = await createCommissionFromTransaction(transaksi.id);
          // ── P8B: notifikasi faktual ke guru (best-effort, tanpa nominal) ──
          if (commission.created && !commission.idempotent) {
            db.notifikasi
              .create({
                data: {
                  userId: commission.teacherId,
                  title: "Penghasilan baru tercatat",
                  body: "Penghasilan baru tercatat dari murid Premium kamu. Lihat detailnya di Penghasilan Saya.",
                  type: "KOMISI",
                  data: { commissionId: commission.id },
                },
              })
              .catch(() => {});
            // ── P8C: signal akun-baru-ke-Premium (best-effort, LOW) ──
            evaluateRapidPremiumSignal({
              teacherId: commission.teacherId,
              studentId: commission.studentId,
              transaksiId: transaksi.id,
            }).catch(() => {});
          }
        } catch (err) {
          console.error("[Webhook] Commission creation failed (retry-safe):", err);
        }
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
      return respond({ error: "Internal server error" }, { status: 500 });
    }

    return respond({ ok: true });
  } catch (error) {
    console.error("[Midtrans] processing error:", error);
    return respond({ error: "Internal server error" }, { status: 500 });
  }
}
