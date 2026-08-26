import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { listAllWithdrawals } from "@/lib/commission/withdrawals";

/**
 * GET /api/admin/teacher-commissions/withdrawals
 * Semua penarikan komisi guru (founder-only) untuk diproses admin.
 * Nomor rekening ditampilkan utuh HANYA ke founder (dibutuhkan untuk transfer).
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

    const result = await listAllWithdrawals({ status, limit, offset });

    return NextResponse.json({
      items: result.items.map((w) => ({
        id: w.id,
        teacherId: w.teacherId,
        teacherName: w.teacher.fullName,
        teacherEmail: w.teacher.email,
        amount: w.amount,
        status: w.status,
        notes: w.notes,
        processedAt: w.processedAt,
        createdAt: w.createdAt,
        bankName: w.bankName,
        accountNumber: w.accountNumber,
        accountHolder: w.accountHolder,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/withdrawals error:", error);
    return NextResponse.json({ error: "Gagal memuat penarikan" }, { status: 500 });
  }
}
