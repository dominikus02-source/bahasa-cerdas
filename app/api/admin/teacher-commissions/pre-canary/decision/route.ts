import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { recordFounderDecision } from "@/lib/commission/payout/founder-decision";
import type { FounderDecisionState } from "@/lib/commission/payout/founder-decision";

/**
 * POST /api/admin/teacher-commissions/pre-canary/decision
 * Catat keputusan Founder (P8F STEP 7). HANYA founder — admin biasa ditolak.
 * Keputusan teraudit (AdminPaymentAuditLog). Sistem TIDAK pernah menginfer
 * approval dari build/test — hanya record ini.
 */
export async function POST(req: NextRequest) {
  try {
    const founder = await getUser();
    if (!founder || !founder.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const state = body.state;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    const valid: FounderDecisionState[] = [
      "NOT_APPROVED",
      "APPROVED_FOR_CANARY",
      "CANARY_COMPLETED",
      "CANARY_FAILED",
    ];
    if (!valid.includes(state)) {
      return NextResponse.json({ error: "state tidak valid" }, { status: 400 });
    }
    if (!notes) {
      return NextResponse.json({ error: "Catatan/alasan wajib diisi" }, { status: 400 });
    }

    const decision = await recordFounderDecision({
      state,
      approverUserId: founder.id,
      approverEmail: founder.email ?? null,
      notes,
    });

    return NextResponse.json({ ok: true, decision });
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/pre-canary/decision error:", error);
    return NextResponse.json({ error: "Gagal mencatat keputusan" }, { status: 500 });
  }
}
