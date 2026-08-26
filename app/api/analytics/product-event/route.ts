import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";

/**
 * POST /api/analytics/product-event
 * Product events ringan (P8A §31). Allowlist nama event; TIDAK menyimpan
 * data finansial sensitif sebagai properti. Log terstruktur console —
 * infrastruktur analitik penuh belum ada (jangan menebak).
 */
const ALLOWED_EVENTS = new Set([
  "guru_commission_viewed",
  "guru_earnings_viewed",
  "guru_students_viewed",
  "guru_withdrawal_started",
  "guru_withdrawal_submitted",
  "guru_withdrawal_completed",
  "guru_referral_link_copied",
  "guru_referral_shared",
  "guru_payout_profile_updated",
  // P8B — Guru Cerdas Sejahtera (distribution)
  "gcs_program_viewed",
  "gcs_share_opened",
  "gcs_code_copied",
  "gcs_link_copied",
  "gcs_native_share",
  "gcs_student_joined",
  "gcs_earnings_generated",
  "gcs_withdrawal_ready",
  // P8C — user-facing actions only (deteksi internal = audit, bukan analytics)
  "teacher_risk_status_viewed",
  "teacher_withdrawal_review_viewed",
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = await rateLimitRoute(req, {
      maxRequests: 30,
      windowSeconds: 60,
      identifier: "product-event",
    });
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name : "";

    if (!ALLOWED_EVENTS.has(name)) {
      return NextResponse.json({ error: "Event tidak dikenal" }, { status: 400 });
    }

    // Proper-properti dipangkas: TIDAK ada nominal saldo/transaksi lengkap.
    const props: Record<string, unknown> = {};
    if (body.props && typeof body.props === "object") {
      for (const [k, v] of Object.entries(body.props as Record<string, unknown>)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          if (String(v).length <= 120) props[k] = v;
        }
      }
    }

    console.log(
      "[product-event]",
      JSON.stringify({ name, role: user.role, userId: user.id, props, at: new Date().toISOString() })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/analytics/product-event error:", error);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
