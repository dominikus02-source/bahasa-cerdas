import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { maskAccount } from "@/lib/commission/payout/profile";

/**
 * GET /api/admin/teacher-commissions/payouts
 * Semua payout komisi guru (founder-only) — inspeksi penuh (spec §21).
 * Nomor rekening masked; aksi admin lain di audit terpisah.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.teacherPayout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          withdrawalId: true,
          teacherId: true,
          provider: true,
          providerReference: true,
          idempotencyKey: true,
          amount: true,
          currency: true,
          destinationType: true,
          bankName: true,
          accountNumber: true,
          accountHolder: true,
          status: true,
          providerStatus: true,
          attemptCount: true,
          nextRetryAt: true,
          lastErrorCode: true,
          lastErrorAt: true,
          requestedAt: true,
          submittedAt: true,
          completedAt: true,
          failedAt: true,
          failureCode: true,
          failureReason: true,
          teacher: { select: { fullName: true, email: true } },
          withdrawal: { select: { status: true } },
        },
      }),
      db.teacherPayout.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((p) => ({
        id: p.id,
        withdrawalId: p.withdrawalId,
        withdrawalStatus: p.withdrawal.status,
        teacherId: p.teacherId,
        teacherName: p.teacher.fullName,
        teacherEmail: p.teacher.email,
        provider: p.provider,
        providerReference: p.providerReference,
        idempotencyKey: p.idempotencyKey,
        amount: p.amount,
        currency: p.currency,
        destinationType: p.destinationType,
        bankName: p.bankName,
        accountHolder: p.accountHolder,
        maskedAccount: maskAccount(p.accountNumber),
        status: p.status,
        providerStatus: p.providerStatus,
        attemptCount: p.attemptCount,
        nextRetryAt: p.nextRetryAt,
        lastErrorCode: p.lastErrorCode,
        lastErrorAt: p.lastErrorAt,
        requestedAt: p.requestedAt,
        submittedAt: p.submittedAt,
        completedAt: p.completedAt,
        failedAt: p.failedAt,
        failureCode: p.failureCode,
        failureReason: p.failureReason,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/payouts error:", error);
    return NextResponse.json({ error: "Gagal memuat payout" }, { status: 500 });
  }
}
