import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { retryPayout } from "@/lib/commission/payout/orchestrator";

/**
 * POST /api/admin/teacher-commissions/payouts/[id]/retry
 * Retry manual payout (founder-only, audited).
 * Aman: lookup state provider dulu — tidak pernah mengirim dua kali bila
 * provider sudah PAID. Bounded attempt (payoutMaxAttempts).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const result = await retryPayout(id, { actor: "admin", adminUserId: admin.id });

    return NextResponse.json({ ok: true, payoutId: id, result });
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/payouts/[id]/retry error:", error);
    return NextResponse.json({ error: "Gagal melakukan retry payout" }, { status: 500 });
  }
}
