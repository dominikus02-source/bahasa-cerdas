import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

function verifyMidtransNotification(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const signature = crypto
    .createHash("sha512")
    .update(process.env.MIDTRANS_SERVER_KEY! + orderId + statusCode + grossAmount)
    .digest("hex");
  return signature === signatureKey;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;

    const isValid = verifyMidtransNotification(order_id, status_code, gross_amount, signature_key);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (transaction_status !== "settlement" && transaction_status !== "capture") {
      return NextResponse.json({ ok: true });
    }

    const parts = order_id?.split("-");
    const type = parts?.[0];
    const userId = parts?.[1];
    const metadata = parts?.[2];

    if (type === "PREMIUM") {
      const grossAmount = parseInt(gross_amount);
      const isYearly = grossAmount >= 399000;
      const daysToAdd = isYearly ? 365 : 30;

      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + daysToAdd);

      await db.user.update({
        where: { id: userId },
        data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
      });

      await db.transaksi.updateMany({
        where: { userId, type: "PREMIUM_UPGRADE", status: "PENDING", orderId: order_id },
        data: { status: "SUCCESS", midtransId: body.transaction_id },
      });

      await db.notifikasi.create({
        data: {
          userId,
          title: "Pembayaran Berhasil!",
          body: "Akunmu telah diupgrade ke PRO. Selamat menikmati fitur premium!",
          type: "PREMIUM",
        },
      });
    }

    else if (type === "KARYA") {
      const karyaId = metadata;

      const existingTransaction = await db.transaksi.findFirst({
        where: { orderId: order_id, status: { not: "SUCCESS" } },
      });

      if (!existingTransaction) {
        return NextResponse.json({ ok: true });
      }

      const meta = existingTransaction.metadata as any || {};
      const platformFee = meta.platformFee || 0;
      const sellerEarning = meta.sellerEarning || 0;
      const karyaTitle = meta.karyaTitle || "Karya";
      const sellerId = meta.sellerId;

      await db.pembelian.create({
        data: {
          karyaId,
          buyerId: userId,
          amount: parseInt(gross_amount),
          platformFee,
          sellerEarning,
          status: "PAID",
          midtransOrderId: order_id,
          midtransPaymentType: body.payment_type,
          midtransStatus: "settlement",
          midtransPaymentAmount: parseInt(gross_amount),
          midtransPaidAt: new Date(),
        },
      });

      await db.karya.update({
        where: { id: karyaId },
        data: { downloads: { increment: 1 } },
      });

      await db.user.update({
        where: { id: userId },
        data: { saldo: { increment: sellerEarning }, totalEarned: { increment: sellerEarning } },
      });

      await db.sellerEarning.create({
        data: {
          sellerId,
          itemType: "KARYA",
          itemId: karyaId,
          itemTitle: karyaTitle,
          grossAmount: parseInt(gross_amount),
          platformFee,
          netAmount: sellerEarning,
          status: "COMPLETED",
        },
      });

      await db.purchaseHistory.create({
        data: {
          buyerId: userId,
          itemType: "KARYA",
          itemId: karyaId,
          itemTitle: karyaTitle,
          fileUrl: "",
          price: parseInt(gross_amount),
        },
      });

      const [buyer, karya] = await Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } }),
        db.karya.findUnique({ where: { id: karyaId }, select: { title: true, description: true, fileUrl: true, price: true } }),
      ]);

      if (buyer && karya) {
        const emailOk = await deliverKaryaToEmail(buyer.email, buyer.fullName, karya);
        console.log("Email delivery:", emailOk ? "SUCCESS" : "FAILED");

        await db.notifikasi.create({
          data: {
            userId,
            title: "Pembelian Berhasil! 🎉",
            body: `Karya "${karyaTitle}" telah masuk ke akunmu. Link download sudah dikirim ke email.`,
            type: "PURCHASE",
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}