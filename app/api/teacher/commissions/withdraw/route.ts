import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";
import { requestWithdrawal } from "@/lib/commission/withdrawals";
import { teacherCommissionMinimumWithdrawal } from "@/lib/commission/config";
import { getPayoutProfileRaw } from "@/lib/commission/payout/profile";
import { submitPayoutForWithdrawal } from "@/lib/commission/payout/orchestrator";
import { evaluatePayoutGate, checkPayoutLimits } from "@/lib/commission/payout/safety";
import { evaluateWithdrawalVelocitySignal } from "@/lib/guru/risk/events";
import { isDestinationCooldownActive } from "@/lib/guru/risk/rules";
import { evaluateFirstPayoutGateForTeacher } from "@/lib/commission/payout/first-payout";

/**
 * POST /api/teacher/commissions/withdraw
 * Ajukan penarikan komisi dari TeacherWallet (bukan User.saldo).
 *
 * P7D: destinasi diambil dari TeacherPayoutProfile bila ada (fallback:
 * Profile bank lama), disnapshot ke withdrawal, lalu payout DI-ORKESTRASI
 * otomatis (best-effort — kegagalan orkestrasi TIDAK menggagalkan penarikan;
 * retry via cron/retry engine).
 *
 * Keamanan (§16/§20):
 * - Identitas guru dari SESI — `teacherId` klien diabaikan.
 * - `amount` divalidasi server-side: integer, > 0, ≥ minimum, ≤ saldo tersedia.
 * - Penguncian dana atomik di DB (updateMany bersyarat) — dua tab/request
 *   bersamaan tidak bisa menarik uang yang sama dua kali.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimitRoute(req, {
      maxRequests: 5,
      windowSeconds: 60,
      identifier: "teacher-commission-withdraw",
    });
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const amount = Math.floor(Number(body.amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Nominal penarikan tidak valid.", code: "INVALID_AMOUNT" }, { status: 400 });
    }
    const minimum = teacherCommissionMinimumWithdrawal();
    if (amount < minimum) {
      return NextResponse.json(
        { error: `Penarikan minimal Rp ${minimum.toLocaleString("id")}.` },
        { status: 400 }
      );
    }

    // ── P7E: pre-check safety gate + limits (umpan balik cepat; orchestrator
    // tetap otoritatif — tidak ada uang terkunci di sini) ──
    const gate = await evaluatePayoutGate({ teacherId: user.id });
    if (!gate.allowed) {
      const gateMessages: Record<string, string> = {
        PAYOUT_REAL_MONEY_DISABLED: "Payout uang asli belum diaktifkan.",
        PAYOUT_PROVIDER_DISABLED: "Provider payout production belum diaktifkan.",
        PAYOUT_KILL_SWITCH: "Penarikan sedang dihentikan sementara (kill switch).",
        PAYOUT_PILOT_BLOCKED: "Akun Anda belum termasuk pilot payout.",
      };
      return NextResponse.json(
        { error: gateMessages[gate.code] ?? gate.code, code: gate.code },
        { status: 400 }
      );
    }

    const limits = await checkPayoutLimits({ teacherId: user.id, amount });
    if (!limits.ok) {
      const limitMessages: Record<string, string> = {
        BELOW_MINIMUM: `Penarikan minimal Rp ${minimum.toLocaleString("id")}.`,
        ABOVE_MAXIMUM: limits.detail ?? "Nominal melebihi batas maksimum.",
        DAILY_LIMIT_REACHED: limits.detail ?? "Batas harian penarikan tercapai.",
        GLOBAL_DAILY_LIMIT_REACHED: limits.detail ?? "Batas harian global tercapai.",
        PILOT_LIMIT_REACHED: limits.detail ?? "Batas total pencairan pilot tercapai.",
      };
      return NextResponse.json({ error: limitMessages[limits.error] ?? "Batas penarikan terlampaui.", code: limits.error }, { status: 400 });
    }

    // ── P8C §9: cooldown destinasi — penarikan BARU ditahan selama periode ──
    const profileCheck = await db.teacherPayoutProfile.findUnique({
      where: { teacherId: user.id },
      select: { updatedAt: true },
    });
    if (profileCheck && isDestinationCooldownActive({ profileUpdatedAt: profileCheck.updatedAt })) {
      return NextResponse.json(
        {
          error: "Rekening pencairan baru saja diubah. Demi keamanan, penarikan baru dapat diajukan setelah masa tunggu singkat.",
          code: "DESTINATION_COOLDOWN",
        },
        { status: 400 }
      );
    }

    // ── P8E §8: FIRST PAYOUT PROTECTION — payout pertama butuh verifikasi ──
    const firstPayoutGate = await evaluateFirstPayoutGateForTeacher(user.id);
    if (!firstPayoutGate.allowed) {
      return NextResponse.json(
        { error: firstPayoutGate.reason, code: "FIRST_PAYOUT_BLOCKED" },
        { status: 400 }
      );
    }

    // ── P7D: destinasi payout. Profil payout diprioritaskan; fallback ke
    // rekening lama di Profile (snapshot saat submit — bukan dari body klien).
    const profil = await db.profile.findUnique({
      where: { userId: user.id },
      select: { bank: true, bankHolder: true, bankNumber: true },
    });
    const payoutProfile = await getPayoutProfileRaw(user.id);

    const bankName = payoutProfile?.bankName ?? profil?.bank ?? "";
    const accountNumber = payoutProfile?.accountNumber ?? profil?.bankNumber ?? "";
    const accountHolder = payoutProfile?.recipientName ?? profil?.bankHolder ?? "";

    if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      return NextResponse.json(
        { error: "Lengkapi destinasi payout (profil payout atau data rekening di Pengaturan) sebelum menarik komisi.", code: "NO_PROFILE" },
        { status: 400 }
      );
    }

    const result = await requestWithdrawal({
      teacherId: user.id,
      amount,
      bankName,
      accountNumber,
      accountHolder,
    });

    if (!result.ok) {
      switch (result.error) {
        case "BELOW_MINIMUM":
          return NextResponse.json({ error: `Penarikan minimal Rp ${minimum.toLocaleString("id")}.`, code: "BELOW_MINIMUM" }, { status: 400 });
        case "INSUFFICIENT_BALANCE":
          return NextResponse.json({ error: "Saldo komisi tidak mencukupi.", code: "INSUFFICIENT_BALANCE" }, { status: 400 });
        case "WALLET_NOT_ACTIVE":
          return NextResponse.json({ error: "Dompet komisi sedang tidak aktif.", code: "WALLET_NOT_ACTIVE" }, { status: 400 });
        default:
          return NextResponse.json({ error: "Penarikan tidak valid.", code: "INVALID_WITHDRAWAL" }, { status: 400 });
      }
    }

    // ── P8C: velocity signal (best-effort) — sebelum orkestrasi supaya gate
    // risk dapat menahan pengiriman bila case terbuka. ──
    evaluateWithdrawalVelocitySignal({ teacherId: user.id, latestAmount: amount }).catch(() => {});

    // ── P7D: orkestrasi payout otomatis (best-effort, tidak menggagalkan) ──
    let payout: { id: string; status: string } | null = null;
    try {
      const submitted = await submitPayoutForWithdrawal(result.withdrawal.id, { actor: "teacher" });
      if (submitted.ok || submitted.payoutId) {
        payout = {
          id: submitted.payoutId ?? "",
          status: submitted.ok ? submitted.status : "PENDING",
        };
      } else if (submitted.error === "RISK_REVIEW_REQUIRED" || submitted.error === "RISK_RESTRICTED") {
        // P8C: ditahan untuk tinjauan — dana tetap terkunci, status REVIEW.
        payout = { id: "", status: "REVIEW" };
      }
    } catch (err) {
      console.error("[payout] orkestrasi gagal (retry-safe):", err);
    }

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: result.withdrawal.id,
        amount: result.withdrawal.amount,
        status: result.withdrawal.status,
        createdAt: result.withdrawal.createdAt.toISOString(),
      },
      newAvailable: result.newAvailable,
      newLocked: result.newLocked,
      payout,
    });
  } catch (error) {
    console.error("POST /api/teacher/commissions/withdraw error:", error);
    return NextResponse.json({ error: "Gagal memproses penarikan" }, { status: 500 });
  }
}
