import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  getDailyTeacherPayoutReport,
  getDailyTeacherPayoutReportByProvider,
} from "@/lib/commission/payout/finance-report";

/**
 * GET /api/admin/teacher-commissions/finance-report?date=YYYY-MM-DD
 * Laporan finansial payout harian (founder-only) — basis rekonsiliasi Finance
 * (P7E §15 + P8D §15: dimensi provider). Akuntansi terpisah: requested/
 * processing/paid/failed/retryable + provider fees + net payout.
 * Fee provider TIDAK mengurangi komisi guru.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    let date = new Date();
    if (dateParam) {
      // "YYYY-MM-DD" → tengah hari UTC (WIB-safe via startOfDayWIB internal).
      const parsed = new Date(`${dateParam}T00:00:00+07:00`);
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
      }
    }

    const [report, byProvider] = await Promise.all([
      getDailyTeacherPayoutReport(date),
      getDailyTeacherPayoutReportByProvider(date),
    ]);
    return NextResponse.json({ ...report, byProvider: byProvider.providers });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/finance-report error:", error);
    return NextResponse.json({ error: "Gagal membuat laporan finansial" }, { status: 500 });
  }
}
