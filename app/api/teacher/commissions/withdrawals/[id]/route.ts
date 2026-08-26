import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { maskAccount } from "@/lib/commission/payout/profile";

/**
 * GET /api/teacher/commissions/withdrawals/[id]
 * Detail withdrawal milik sendiri + status payout terkait (spec §22).
 * Destinasi masked — tidak pernah mengirim rekening penuh ke UI.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const withdrawal = await db.teacherCommissionWithdrawal.findFirst({
      where: { id, teacherId: user.id },
      select: {
        id: true,
        amount: true,
        status: true,
        notes: true,
        processedAt: true,
        createdAt: true,
        bankName: true,
        accountNumber: true,
        accountHolder: true,
        payout: {
          select: {
            id: true,
            status: true,
            providerStatus: true,
            attemptCount: true,
            submittedAt: true,
            completedAt: true,
            failedAt: true,
            failureCode: true,
            failureReason: true,
          },
        },
      },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Penarikan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      id: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      notes: withdrawal.notes,
      processedAt: withdrawal.processedAt,
      createdAt: withdrawal.createdAt,
      destination: {
        bankName: withdrawal.bankName,
        accountHolder: withdrawal.accountHolder,
        maskedAccount: maskAccount(withdrawal.accountNumber),
      },
      payout: withdrawal.payout
        ? {
            id: withdrawal.payout.id,
            status: withdrawal.payout.status,
            providerStatus: withdrawal.payout.providerStatus,
            attemptCount: withdrawal.payout.attemptCount,
            submittedAt: withdrawal.payout.submittedAt,
            completedAt: withdrawal.payout.completedAt,
            failedAt: withdrawal.payout.failedAt,
            failureCode: withdrawal.payout.failureCode,
            failureReason: withdrawal.payout.failureReason,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/teacher/commissions/withdrawals/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat penarikan" }, { status: 500 });
  }
}
