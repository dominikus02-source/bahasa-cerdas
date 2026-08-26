import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  getWallet,
  activePremiumStudents,
  currentMonthCommission,
  listCommissions,
} from "@/lib/commission/wallet";
import { listWithdrawals } from "@/lib/commission/withdrawals";
import { getTeacherRiskState } from "@/lib/guru/risk/signals";

/**
 * GET /api/teacher/commissions
 * Ringkasan dompet komisi guru — data untuk dashboard "Guru Cerdas Sejahtera".
 *
 * Identitas guru DIAMBIL DARI SESI (§16) — `teacherId` dari klien tidak pernah
 * dipercaya. Tidak mengekspos detail provider pembayaran / data finansial
 * sensitif milik pihak lain.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Guru menerima komisi HANYA bila memenuhi syarat; founder/ADMIN selalu
    // dikecualikan dari penerimaan komisi (tetap boleh melihat halaman kosong).
    const teacherId = user.id;

    const [wallet, students, month, recent, withdrawals, riskStatus] = await Promise.all([
      getWallet(teacherId),
      activePremiumStudents(teacherId),
      currentMonthCommission(teacherId),
      listCommissions(teacherId, { limit: 10 }),
      listWithdrawals(teacherId, { limit: 5 }),
      getTeacherRiskState(teacherId),
    ]);

    const balances = wallet ?? {
      teacherId,
      availableBalance: 0,
      pendingBalance: 0,
      lockedBalance: 0,
      lifetimeEarned: 0,
      lifetimeWithdrawn: 0,
      totalReversed: 0,
      status: "ACTIVE" as const,
    };

    return NextResponse.json({
      availableBalance: balances.availableBalance,
      pendingBalance: balances.pendingBalance,
      lockedBalance: balances.lockedBalance,
      lifetimeEarned: balances.lifetimeEarned,
      lifetimeWithdrawn: balances.lifetimeWithdrawn,
      totalReversed: balances.totalReversed,
      walletStatus: balances.status,
      // P8C §14: status risiko yang RELEVAN bagi guru — tanpa bukti internal.
      riskStatus,
      activePremiumStudents: students,
      currentMonthCommission: month,
      recentCommissionHistory: recent.items.map((c) => ({
        id: c.id,
        entryType: c.entryType,
        grossAmount: c.grossAmount,
        commissionAmount: c.commissionAmount,
        status: c.status,
        source: c.attributionSource,
        eligibleFrom: c.eligibleFrom,
        holdingEndsAt: c.holdingEndsAt,
        availableAt: c.availableAt,
        reversedAt: c.reversedAt,
        createdAt: c.createdAt,
      })),
      withdrawalHistory: withdrawals.items.map((w) => ({
        id: w.id,
        amount: w.amount,
        status: w.status,
        notes: w.notes,
        processedAt: w.processedAt,
        createdAt: w.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/teacher/commissions error:", error);
    return NextResponse.json({ error: "Gagal memuat data komisi" }, { status: 500 });
  }
}
