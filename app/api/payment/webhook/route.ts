import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { getMidtransConfig } from "@/lib/payments/midtrans-server";

function verifyMidtransNotification(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  // Formula resmi Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey).
  // ServerKey HARUS di posisi terakhir. Bug sebelumnya menaruh serverKey di awal
  // sehingga hash tidak pernah cocok → 401 dan semua notifikasi gagal tersampaikan.
  const serverKey = getMidtransConfig().serverKey;
  const signature = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");
  return signature === signatureKey;
}

function getPlanFromAmount(grossAmount: number): { durationDays: number; aiCreditsMonthly: number; planId: string } | null {
  if (grossAmount >= 399000) {
    return { durationDays: 365, aiCreditsMonthly: 500, planId: "GURU_PRO_YEARLY" };
  }
  if (grossAmount >= 49000) {
    return { durationDays: 30, aiCreditsMonthly: 500, planId: "GURU_PRO_MONTHLY" };
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

async function deliverKaryaToEmail(buyerEmail: string, buyerName: string, karya: any) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BahasaCerdas <noreply@bahasacerdas.site>",
        to: buyerEmail,
        subject: `🎉 Karya "${karya.title}" berhasil diunduh - BahasaCerdas`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #1e3a8a); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0;">BahasaCerdas</h1>
            </div>
            <div style="padding: 24px;">
              <h2>Selamat, ${buyerName}! 🎉</h2>
              <p>Anda berhasil membeli karya berikut:</p>
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px;">${karya.title}</h3>
                <p style="margin: 0; color: #6b7280;">${karya.description}</p>
                <p style="margin: 8px 0 0; font-size: 20px; font-weight: bold; color: #dc2626;">
                  Rp ${karya.price.toLocaleString("id-ID")}
                </p>
              </div>
              <a href="${karya.fileUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Download Karya
              </a>
              <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
                Jika link tidak berfungsi, copy paste URL berikut:<br/>
                <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${karya.fileUrl}</code>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
              <p style="color: #6b7280; font-size: 12px;">
                Terima kasih telah berbelanja di BahasaCerdas.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send delivery email:", await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error("Email delivery error:", error);
    return false;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;
    const grossAmount = parseInt(gross_amount || "0");

    // Verify signature
    const isValid = verifyMidtransNotification(order_id, status_code, gross_amount, signature_key);
    if (!isValid) {
      // Log detail agar mudah didiagnosis jika tetap gagal setelah deploy
      const cfg = getMidtransConfig();
      const probe = crypto
        .createHash("sha512")
        .update(order_id + status_code + gross_amount + cfg.serverKey)
        .digest("hex");
      console.error("[Webhook] Signature mismatch", {
        order_id,
        status_code,
        gross_amount,
        mode: cfg.isProduction ? "production" : "sandbox",
        serverKeySet: Boolean(cfg.serverKey),
        serverKeyLength: cfg.serverKey.length,
        expected: signature_key?.slice(0, 16),
        computed: probe.slice(0, 16),
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const handler = getHandler(transaction_status);
    const newStatus = handler.status;
    const activatePremium = handler.activatePremium;

    const transaksi = await db.transaksi.findFirst({ where: { orderId: order_id } });

    // Unknown orderId — log and return ok (Midtrans requires 200)
    if (!transaksi) {
      console.warn("[Webhook] Unknown orderId:", order_id);
      return NextResponse.json({ ok: true, warning: "unknown_order" });
    }

    // Prevent downgrade: if already SUCCESS and new status is not SUCCESS, do nothing
    if (transaksi.status === "SUCCESS" && newStatus !== "SUCCESS") {
      return NextResponse.json({ ok: true, idempotent: true, note: "already_success_ignored" });
    }

    // Idempotent: if already SUCCESS and new is also SUCCESS, skip
    if (transaksi.status === "SUCCESS" && newStatus === "SUCCESS") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    if (transaksi.type === "PREMIUM_UPGRADE") {
      if (activatePremium) {
        // Determine plan details
        const meta = (transaksi.metadata || {}) as Record<string, any>;
        let durationDays = 30;
        let aiCreditsMonthly = 500;
        let planId = "GURU_PRO_MONTHLY";

        if (meta.planId === "GURU_PRO_YEARLY" || meta.durationDays === 365) {
          durationDays = 365;
          planId = "GURU_PRO_YEARLY";
        } else if (meta.durationDays && meta.durationDays > 30) {
          durationDays = meta.durationDays;
          planId = meta.planId || "GURU_PRO_YEARLY";
        }

        // Fallback: detect from amount
        if (!meta.planId) {
          const fallback = getPlanFromAmount(grossAmount);
          if (fallback) {
            durationDays = fallback.durationDays;
            aiCreditsMonthly = fallback.aiCreditsMonthly;
            planId = fallback.planId;
          }
        }

        // Calculate premiumUntil: stack on existing if active
        const user = await db.user.findUnique({
          where: { id: transaksi.userId },
          select: { premiumUntil: true },
        });

        const now = new Date();
        let premiumUntil: Date;

        if (user?.premiumUntil && user.premiumUntil > now) {
          // Extend from end of current period
          premiumUntil = new Date(user.premiumUntil.getTime() + durationDays * 24 * 60 * 60 * 1000);
        } else {
          // Fresh start
          premiumUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        }

        await db.$transaction([
          db.user.update({
            where: { id: transaksi.userId },
            data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
          }),
          db.transaksi.update({
            where: { id: transaksi.id },
            data: { status: newStatus, midtransId: body.transaction_id },
          }),
          db.notifikasi.create({
            data: {
              userId: transaksi.userId,
              title: "Pembayaran Berhasil!",
              body: "Akunmu telah diupgrade ke PRO. Selamat menikmati fitur premium!",
              type: "PREMIUM",
            },
          }),
        ]);

        // Sync credit ledger (non-blocking — errors are logged, not thrown)
        await syncPremiumCreditLedger(transaksi.userId, planId, aiCreditsMonthly);
      } else {
        // Non-success status, just update the transaction
        await db.transaksi.update({
          where: { id: transaksi.id },
          data: { status: newStatus, midtransId: body.transaction_id },
        });
      }
    }

    else if (transaksi.type === "KARYA_PURCHASE") {
      if (activatePremium) {
        const meta = (transaksi.metadata || {}) as any;
        const items: any[] = meta.items || [];
        const firstItem = items[0] || {};

        // Update all Pembelian for this order to PAID
        await db.pembelian.updateMany({
          where: { midtransOrderId: order_id },
          data: {
            status: "PAID",
            midtransPaymentType: body.payment_type,
            midtransStatus: "settlement",
            midtransPaymentAmount: grossAmount,
            midtransPaidAt: new Date(),
          },
        });

        // Process each item in the order
        for (const item of items) {
          const { karyaId, sellerId, subtotal: itemSubtotal } = item;
          if (!karyaId) continue;

          // Baca netAmount dari sellerEarning (pre-calculated with 85/15 split)
          // Supaya webhook tidak menghitung ulang fee dengan persentase berbeda
          const earning = await db.sellerEarning.findFirst({
            where: { sellerId, itemId: karyaId, status: "PENDING" },
            orderBy: { soldAt: "desc" },
            select: { netAmount: true },
          });

          const sellerEarning = earning?.netAmount ?? Math.round(itemSubtotal * 0.85);

          const karya = await db.karya.findUnique({
            where: { id: karyaId },
            select: { title: true, fileUrl: true },
          });

          await Promise.all([
            db.karya.update({ where: { id: karyaId }, data: { downloads: { increment: 1 } } }),
            db.user.update({ where: { id: sellerId }, data: { saldo: { increment: sellerEarning }, totalEarned: { increment: sellerEarning } } }),
            db.sellerEarning.updateMany({
              where: { sellerId, itemId: karyaId, status: "PENDING" },
              data: { status: "COMPLETED" },
            }),
            db.purchaseHistory.updateMany({
              where: { buyerId: transaksi.userId, itemId: karyaId },
              data: { fileUrl: karya?.fileUrl || "" },
            }),
          ]);
        }

        await db.transaksi.update({
          where: { id: transaksi.id },
          data: { status: "SUCCESS", midtransId: body.transaction_id },
        });

        // Send notification
        const firstKarya = items[0] ? await db.karya.findUnique({ where: { id: items[0].karyaId }, select: { title: true } }).catch(() => null) : null;
        const itemCount = items.length;
        await db.notifikasi.create({
          data: {
            userId: transaksi.userId,
            title: "Pembelian Berhasil! 🎉",
            body: itemCount > 1
              ? `${itemCount} karya berhasil dibeli. Cek di halaman pesanan untuk unduh.`
              : `Karya "${firstKarya?.title || 'Karya'}" telah masuk ke akunmu.`,
            type: "PURCHASE",
          },
        });
      } else {
        await db.transaksi.update({
          where: { id: transaksi.id },
          data: { status: newStatus, midtransId: body.transaction_id },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
