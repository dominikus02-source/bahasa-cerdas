import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { recordProductEvent, dayKeyWIB } from "@/lib/analytics/product-event-store";

/**
 * POST /api/analytics/product-event
 * Product events ringan (P8A §31). Allowlist nama event; TIDAK menyimpan
 * data finansial sensitif sebagai properti. Log terstruktur console —
 * infrastruktur analitik penuh belum ada (jangan menebak).
 *
 * P0 #7 (additive): setelah console-log, event juga ditulis idempotent ke tabel
 * `ProductEvent` (best-effort; tabel mungkin belum ada di prod sebelum migrasi
 * manual diterapkan — kegagalan tidak menggagalkan respons). Console-logging,
 * rate-limit, dan allowlist TIDAK berubah.
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
  // P0 #7 — Operational Teacher Experiment funnel stages (F4 + F8)
  "class_code_shared",
  "class_first_join",
  "teacher_session",
  // Q1.1 — classroom activation deep-link telemetry
  "class_invite_shared",
  "class_invite_opened",
  // P2.8 — Pendekar Suryakerta launch funnel (Premium Early Access)
  "rpg_launch_clicked",
  "rpg_premium_blocked",
  "rpg_launch_authorized",
  "rpg_splash_started",
  "rpg_runtime_started",
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

    // P0 #7 — persist idempotent (additive, best-effort). logicalKey default
    // sekali-per-hari per (user,event,entity) sehingga duplikat klien dalam sehari
    // tidak membuat baris ganda, namun aktivitas lintas hari tetap terukur.
    const entityType = typeof body.entityType === "string" ? body.entityType : "ANON";
    const entityId = typeof body.entityId === "string" ? body.entityId : (props.entityId as string | undefined) ?? "";
    const logicalKey =
      typeof body.logicalKey === "string"
        ? body.logicalKey
        : `route-${name}-${dayKeyWIB()}`;
    void recordProductEvent({
      actorId: user.id,
      event: name,
      entityType,
      entityId,
      logicalKey,
      props: props as Record<string, string | number | boolean | null>,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/analytics/product-event error:", error);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
