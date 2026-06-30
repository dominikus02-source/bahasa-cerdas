import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { withTimeout } from "@/lib/db-timeout";
import {
  createMidtransSnapTransaction,
  validateMidtransConfig,
  MidtransError,
  mapMidtransError,
} from "@/lib/payments/midtrans-server";

const PLATFORM_FEE_PERCENT = 15;

type ErrorCode =
  | "AUTH_REQUIRED"
  | "CART_EMPTY"
  | "INVALID_ITEM"
  | "ITEM_NOT_FOUND"
  | "ITEM_NOT_PURCHASABLE"
  | "MIDTRANS_CONFIG_MISSING"
  | "MIDTRANS_MODE_MISMATCH"
  | "MIDTRANS_UNAUTHORIZED"
  | "MIDTRANS_CREATE_FAILED"
  | "CHECKOUT_DB_FAILED"
  | "CHECKOUT_UNKNOWN_ERROR";

function err(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ ok: false, error: code, message }, { status });
}

function generateOrderId(userId: string): string {
  const ts = Date.now().toString(36).slice(-6).toUpperCase();
  const shortId = userId.slice(0, 8);
  return `MK-${ts}-${shortId}`;
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 10);

  try {
    // Step 1 — Auth
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return err("AUTH_REQUIRED", "Silakan login terlebih dahulu.", 401);
    }

    const dbUser = await withTimeout(db.user.findUnique({ where: { supabaseId: authUser.id } }));
    if (!dbUser) {
      return err("AUTH_REQUIRED", "Pengguna tidak ditemukan.", 404);
    }

    // Step 2 — Parse items
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err("INVALID_ITEM", "Format request tidak valid.", 400);
    }

    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return err("CART_EMPTY", "Keranjang Anda masih kosong.", 400);
    }

    // Step 3 — Validate items
    for (const item of items) {
      if (!item.karyaId || typeof item.karyaId !== "string") {
        return err("INVALID_ITEM", "Item tidak valid.", 400);
      }
      const qty = item.quantity || 1;
      if (!Number.isInteger(qty) || qty < 1) {
        return err("INVALID_ITEM", "Quantity harus minimal 1.", 400);
      }
    }

    // Step 4 — Fetch all products from DB, recalculate prices server-side
    const karyaIds = items.map((i: any) => i.karyaId);
    const karyas = await withTimeout(
      db.karya.findMany({
        where: { id: { in: karyaIds } },
        include: { seller: { select: { id: true, fullName: true } } },
      })
    );

    if (karyas.length !== karyaIds.length) {
      return err(
        "ITEM_NOT_FOUND",
        "Beberapa item tidak ditemukan di database.",
        400
      );
    }

    // Build order items with server-side price
    const orderItems: Array<{
      karyaId: string;
      karya: any;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    let serverTotal = 0;

    for (const item of items) {
      const karya = karyas.find((k: any) => k.id === item.karyaId);
      if (!karya) {
        return err("ITEM_NOT_FOUND", `Item ${item.karyaId} tidak ditemukan.`, 400);
      }
      if (!karya.isPublished) {
        return err("ITEM_NOT_PURCHASABLE", `"${karya.title}" tidak tersedia.`, 400);
      }
      if (!karya.fileKey || karya.fileUrl?.includes("example.com")) {
        return err("ITEM_NOT_PURCHASABLE", `"${karya.title}" belum tersedia untuk dibeli.`, 400);
      }
      if (karya.sellerId === dbUser.id) {
        return err("INVALID_ITEM", `Tidak bisa membeli "${karya.title}" — itu karya Anda sendiri.`, 400);
      }
      if (karya.price === 0) {
        return err("INVALID_ITEM", `"${karya.title}" gratis — gunakan tombol unduh gratis.`, 400);
      }

      const qty = item.quantity || 1;
      const subtotal = karya.price * qty;
      serverTotal += subtotal;

      orderItems.push({ karyaId: karya.id, karya, quantity: qty, unitPrice: karya.price, subtotal });
    }

    if (serverTotal <= 0) {
      return err("INVALID_ITEM", "Total pembayaran harus lebih dari 0.", 400);
    }

    // Step 5 — Validate Midtrans config
    try {
      validateMidtransConfig();
    } catch (e) {
      if (e instanceof MidtransError) {
        const code = e.code === "MIDTRANS_CONFIG_MISSING" ? "MIDTRANS_CONFIG_MISSING" as ErrorCode : "MIDTRANS_MODE_MISMATCH" as ErrorCode;
        return err(code, e.code === "MIDTRANS_CONFIG_MISSING" ? "Konfigurasi pembayaran belum lengkap." : "Mode pembayaran tidak konsisten.", 500);
      }
      return err("MIDTRANS_CONFIG_MISSING", "Konfigurasi pembayaran belum lengkap.", 500);
    }

    const orderId = generateOrderId(dbUser.id);

    // Step 6 — Create Midtrans Snap transaction with item_details
    let snapResult: { token: string; redirectUrl: string };
    try {
      snapResult = await createMidtransSnapTransaction({
        orderId,
        amount: serverTotal,
        fullName: dbUser.fullName || dbUser.email,
        email: dbUser.email,
        items: orderItems.map((oi) => ({
          id: oi.karyaId,
          name: oi.karya.title.slice(0, 50),
          price: oi.unitPrice,
          quantity: oi.quantity,
          category: oi.karya.type || "KARYA",
        })),
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

    // Step 7 — Create local records in transaction
    try {
      await db.$transaction(
        orderItems.flatMap((oi) => {
          const platformFee = Math.round(oi.unitPrice * oi.quantity * PLATFORM_FEE_PERCENT / 100);
          const sellerEarning = oi.subtotal - platformFee;

          return [
            db.pembelian.create({
              data: {
                karyaId: oi.karyaId,
                buyerId: dbUser.id,
                amount: oi.subtotal,
                platformFee,
                sellerEarning,
                status: "PENDING",
                midtransOrderId: orderId,
              },
            }),
            db.purchaseHistory.create({
              data: {
                buyerId: dbUser.id,
                itemType: "KARYA",
                itemId: oi.karyaId,
                itemTitle: oi.karya.title,
                fileUrl: oi.karya.fileUrl,
                fileKey: oi.karya.fileKey,
                price: oi.subtotal,
              },
            }),
            db.sellerEarning.create({
              data: {
                sellerId: oi.karya.sellerId,
                itemType: "KARYA",
                itemId: oi.karyaId,
                itemTitle: oi.karya.title,
                grossAmount: oi.subtotal,
                platformFee,
                netAmount: sellerEarning,
                status: "PENDING",
              },
            }),
          ];
        })
      );

      // Single Transaksi for the whole order
      await db.transaksi.create({
        data: {
          userId: dbUser.id,
          type: "KARYA_PURCHASE",
          amount: serverTotal,
          status: "PENDING",
          reference: "MARKETPLACE",
          orderId,
          metadata: {
            items: orderItems.map((oi) => ({
              karyaId: oi.karyaId,
              karyaTitle: oi.karya.title,
              quantity: oi.quantity,
              unitPrice: oi.unitPrice,
              subtotal: oi.subtotal,
              sellerId: oi.karya.sellerId,
            })),
            requestId,
          },
        },
      });
    } catch (dbError) {
      console.error(`[MarketplacePurchase:${requestId}] DB transaction failed`, dbError);
      return err("CHECKOUT_DB_FAILED", "Gagal menyimpan pesanan. Silakan coba lagi.", 500);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      token: snapResult.token,
      redirectUrl: snapResult.redirectUrl,
      total: serverTotal,
    });
  } catch (error: any) {
    console.error(`[MarketplacePurchase:${requestId}] Error`, error?.message);
    return err("CHECKOUT_UNKNOWN_ERROR", "Terjadi kesalahan sistem. Silakan coba lagi.", 500);
  }
}
