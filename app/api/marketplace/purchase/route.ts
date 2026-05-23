import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createKaryaTransaction } from "@/lib/midtrans";
import { withTimeout } from "@/lib/db-timeout";

const PLATFORM_FEE_PERCENT = 15;

async function deliverKaryaToEmail(buyerEmail: string, karya: any, buyerName: string) {
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
                <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #dc2626;">
                  ${karya.price === 0 ? "GRATIS" : `Rp ${karya.price.toLocaleString("id-ID")}`}
                </p>
              </div>
              <p>Link download karya:</p>
              <a href="${karya.fileUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Download Karya
              </a>
              <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
                Jika link tidak berfungsi, copy paste URL berikut ke browser:<br/>
                <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${karya.fileUrl}</code>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
              <p style="color: #6b7280; font-size: 12px;">
                Terima kasih telah berbelanja di BahasaCerdas.<br/>
                Platform Edukasi Bahasa Indonesia.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send email via Resend:", await response.text());
    }

    return { success: true, deliveredAt: new Date() };
  } catch (error) {
    console.error("Email delivery error:", error);
    return { success: false, error: String(error) };
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await withTimeout(db.user.findUnique({ where: { supabaseId: user.id } }));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { karyaId } = body;

    if (!karyaId) {
      return NextResponse.json({ error: "karyaId required" }, { status: 400 });
    }

    const karya = await withTimeout(db.karya.findUnique({
      where: { id: karyaId },
      include: { seller: true },
    }));

    if (!karya) {
      return NextResponse.json({ error: "Karya not found" }, { status: 404 });
    }

    if (!karya.isPublished) {
      return NextResponse.json({ error: "Karya tidak tersedia" }, { status: 400 });
    }

    if (karya.sellerId === dbUser.id) {
      return NextResponse.json({ error: "Tidak bisa membeli karya sendiri" }, { status: 400 });
    }

    const existingPurchase = await withTimeout(db.pembelian.findFirst({
      where: { karyaId, buyerId: dbUser.id, status: "PAID" },
    }));

    if (existingPurchase) {
      return NextResponse.json({ error: "Anda sudah membeli karya ini", purchasedAt: existingPurchase.createdAt }, { status: 400 });
    }

    if (karya.price === 0) {
      const platformFee = 0;
      const sellerEarning = 0;

      await withTimeout(db.pembelian.create({
        data: {
          karyaId: karya.id,
          buyerId: dbUser.id,
          amount: 0,
          platformFee,
          sellerEarning,
          status: "PAID",
          midtransPaidAt: new Date(),
        },
      }));

      await withTimeout(db.karya.update({
        where: { id: karya.id },
        data: { downloads: { increment: 1 } },
      }));

      await withTimeout(db.purchaseHistory.create({
        data: {
          buyerId: dbUser.id,
          itemType: "KARYA",
          itemId: karya.id,
          itemTitle: karya.title,
          fileUrl: karya.fileUrl,
          fileKey: karya.fileKey,
          price: 0,
        },
      }));

      const emailResult = await deliverKaryaToEmail(dbUser.email, karya, dbUser.fullName);

      return NextResponse.json({
        success: true,
        message: "Karya gratis berhasil diunduh",
        fileUrl: karya.fileUrl,
        emailDelivered: emailResult.success,
      });
    }

    const platformFee = Math.round(karya.price * PLATFORM_FEE_PERCENT / 100);
    const sellerEarning = karya.price - platformFee;

    const transaction = await createKaryaTransaction({
      orderId: `KARYA-${karya.id}-${dbUser.id}-${Date.now()}`,
      amount: karya.price,
      email: dbUser.email,
      fullName: dbUser.fullName,
      itemId: karya.id,
      itemTitle: karya.title,
    });

    if (!transaction) {
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    try {
      await withTimeout(db.transaksi.create({
        data: {
          userId: dbUser.id,
          type: "KARYA_PURCHASE",
          amount: karya.price,
          status: "PENDING",
          reference: "MARKETPLACE",
          orderId: transaction.orderId,
          metadata: {
            karyaId: karya.id,
            karyaTitle: karya.title,
            sellerId: karya.sellerId,
            platformFee,
            sellerEarning,
          },
        },
      }));
    } catch {
      console.warn("DB write timeout for transaksi, continuing anyway");
    }

    return NextResponse.json({
      redirectUrl: transaction.redirectUrl,
      token: transaction.transactionToken,
      orderId: transaction.orderId,
    });

  } catch (error) {
    console.error("POST /api/marketplace/purchase error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}