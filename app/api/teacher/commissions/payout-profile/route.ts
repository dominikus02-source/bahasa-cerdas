import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  getMaskedPayoutProfile,
  savePayoutProfile,
} from "@/lib/commission/payout/profile";
import { evaluateDestinationChangeSignal } from "@/lib/guru/risk/events";
import type { DestinationType } from "@prisma/client";

/**
 * GET/PUT /api/teacher/commissions/payout-profile
 * Profil destinasi payout milik sendiri (spec §5/§6).
 * - Hanya owner yang melihat/mengelola; teacherId dari SESI
 * - Nomor rekening SELALU masked di response
 * - Perubahan di-audit (AdminPaymentAuditLog)
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getMaskedPayoutProfile(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/teacher/commissions/payout-profile error:", error);
    return NextResponse.json({ error: "Gagal memuat profil payout" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const destinationType: DestinationType =
      body.destinationType === "EWALLET" ? "EWALLET" : "BANK";

    const result = await savePayoutProfile(user.id, {
      recipientName: String(body.recipientName ?? ""),
      destinationType,
      bankName: String(body.bankName ?? ""),
      accountNumber: String(body.accountNumber ?? ""),
    });

    if (!result.ok) {
      const messages: Record<string, string> = {
        INVALID_ACCOUNT: "Nomor rekening harus 6–20 digit angka.",
        INVALID_NAME: "Nama penerima wajib diisi (maks 80 karakter).",
        INVALID_DESTINATION_TYPE: "Jenis tujuan tidak valid.",
        INVALID_BANK: "Nama bank/e-wallet wajib diisi.",
      };
      return NextResponse.json(
        { error: messages[result.error] ?? "Profil tidak valid." },
        { status: 400 }
      );
    }

    // ── P8C: signal perubahan destinasi (best-effort — TIDAK menggagalkan) ──
    evaluateDestinationChangeSignal(user.id).catch(() => {});

    return NextResponse.json({
      ok: true,
      profileId: result.profileId,
      maskedAccount: result.maskedAccount,
    });
  } catch (error) {
    console.error("PUT /api/teacher/commissions/payout-profile error:", error);
    return NextResponse.json({ error: "Gagal menyimpan profil payout" }, { status: 500 });
  }
}
