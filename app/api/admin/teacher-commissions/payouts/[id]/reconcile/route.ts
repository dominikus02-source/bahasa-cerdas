import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { reconcileTeacherPayout } from "@/lib/commission/payout/orchestrator";
import { withAdmin } from "@/lib/admin/guard";

/**
 * POST /api/admin/teacher-commissions/payouts/[id]/reconcile
 * Rekonsiliasi paksa satu payout (founder-only, audited).
 * Read-only terhadap wallet kecuali outcome sah dari provider.
 */
async function adminPOST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const result = await reconcileTeacherPayout(id, { actor: "admin", adminUserId: admin.id });

    return NextResponse.json({ ok: true, payoutId: id, result });
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/payouts/[id]/reconcile error:", error);
    return NextResponse.json({ error: "Gagal merekonsiliasi payout" }, { status: 500 });
  }
}

export const POST = withAdmin(adminPOST, { route: "/api/admin/teacher-commissions/payouts/[id]/reconcile", method: "POST" });
