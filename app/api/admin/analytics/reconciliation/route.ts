import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { executeReconciliation } from "@/lib/premium-reconciliation";
import { withAdmin } from "@/lib/admin/guard";

// ════════════════════════════════════════════════════════════════════
// PREMIUM RECONCILIATION — API Endpoint
//
// GET  → dry-run (preview only, no writes)
// POST → execute reconciliation (requires ?execute=true)
//
// Founder-only. Reports scanned/matched/repaired/skipped/manualReview/errors.
// ════════════════════════════════════════════════════════════════════

async function adminGET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await executeReconciliation(true);
    return NextResponse.json({ dryRun: true, ...result });
  } catch (error) {
    console.error("[Reconciliation] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function adminPOST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const execute = searchParams.get("execute") === "true";

    if (!execute) {
      // Safety: POST without ?execute=true runs dry-run
      const result = await executeReconciliation(true);
      return NextResponse.json({ dryRun: true, ...result });
    }

    const result = await executeReconciliation(false, user.id);
    return NextResponse.json({ dryRun: false, ...result });
  } catch (error) {
    console.error("[Reconciliation] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withAdmin(adminGET, { route: "/api/admin/analytics/reconciliation", method: "GET" });
export const POST = withAdmin(adminPOST, { route: "/api/admin/analytics/reconciliation", method: "POST" });
