import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { evaluatePreCanaryChecklist } from "@/lib/commission/payout/pre-canary";

/**
 * GET /api/admin/teacher-commissions/pre-canary
 * Checklist pra-canary + keputusan GO/NO-GO (founder-only).
 * Status diturunkan dari sistem — tidak ada PASS palsu; item provider
 * tanpa bukti = MANUAL_VERIFICATION_REQUIRED.
 */
export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await evaluatePreCanaryChecklist();
    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/pre-canary error:", error);
    return NextResponse.json({ error: "Gagal mengevaluasi kesiapan pra-canary" }, { status: 500 });
  }
}
