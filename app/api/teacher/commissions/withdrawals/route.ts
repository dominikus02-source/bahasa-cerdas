import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { listWithdrawals } from "@/lib/commission/withdrawals";
import { teacherCommissionMinimumWithdrawal } from "@/lib/commission/config";

/**
 * GET /api/teacher/commissions/withdrawals
 * Riwayat penarikan komisi milik sendiri (paginated) + kebijakan minimum.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

    const result = await listWithdrawals(user.id, { limit, offset });

    return NextResponse.json({
      items: result.items.map((w) => ({
        id: w.id,
        amount: w.amount,
        status: w.status,
        notes: w.notes,
        processedAt: w.processedAt,
        createdAt: w.createdAt,
        bankName: w.bankName,
        // Nomor rekening hanya versi tersamarkan — milik sendiri, tetapi
        // tetap tidak di-echo utuh ke klien yang tidak membutuhkannya.
        accountNumber: maskAccount(w.accountNumber),
        accountHolder: w.accountHolder,
        payout: w.payout
          ? {
              id: w.payout.id,
              status: w.payout.status,
              submittedAt: w.payout.submittedAt,
              completedAt: w.payout.completedAt,
              failedAt: w.payout.failedAt,
            }
          : null,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      minimumWithdrawal: teacherCommissionMinimumWithdrawal(),
    });
  } catch (error) {
    console.error("GET /api/teacher/commissions/withdrawals error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat penarikan" }, { status: 500 });
  }
}

function maskAccount(account: string): string {
  if (account.length <= 4) return "••••";
  return `${"•".repeat(Math.max(4, account.length - 4))}${account.slice(-4)}`;
}
