import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { listCommissions, commissionSummary } from "@/lib/commission/wallet";

/**
 * GET /api/teacher/commissions/history
 * Riwayat ledger komisi milik sendiri (paginated). Read-only.
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
    const status = searchParams.get("status") || undefined;

    const [result, summary] = await Promise.all([
      listCommissions(user.id, { limit, offset, status }),
      commissionSummary(user.id),
    ]);

    return NextResponse.json({
      items: result.items.map((c) => ({
        id: c.id,
        entryType: c.entryType,
        grossAmount: c.grossAmount,
        commissionRate: c.commissionRate,
        commissionAmount: c.commissionAmount,
        status: c.status,
        source: c.attributionSource,
        eligibleFrom: c.eligibleFrom,
        holdingEndsAt: c.holdingEndsAt,
        availableAt: c.availableAt,
        reversedAt: c.reversedAt,
        reversedReason: c.reversedReason,
        createdAt: c.createdAt,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      summary,
    });
  } catch (error) {
    console.error("GET /api/teacher/commissions/history error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat komisi" }, { status: 500 });
  }
}
