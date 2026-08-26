import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  validatePayoutProductionConfig,
  getEvidenceRecord,
  recordEvidence,
  evaluateXenditProductionReadiness,
  evaluatePilotTeacherReadiness,
  buildMoneySafetySnapshot,
  getFounderConfirmation,
  recordFounderConfirmation,
  XENDIT_EVIDENCE_CATEGORIES,
} from "@/lib/commission/payout/xendit-readiness";

/**
 * GET/POST /api/admin/teacher-commissions/xendit-readiness
 * P8H — Xendit production readiness bridge (founder-only).
 * TIDAK pernah menampilkan nilai secret. Evidence tidak boleh mengandung
 * secret. TIDAK mengaktifkan real money.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");
    const withdrawalId = searchParams.get("withdrawalId");

    const [config, evidence, readiness, confirmation, pilotTeacher, snapshot] = await Promise.all([
      validatePayoutProductionConfig(),
      getEvidenceRecord(),
      evaluateXenditProductionReadiness(),
      getFounderConfirmation(),
      teacherId ? evaluatePilotTeacherReadiness(teacherId) : Promise.resolve(null),
      teacherId ? buildMoneySafetySnapshot({ teacherId, withdrawalId }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      config,
      evidence,
      readiness: { ready: readiness.ready, blocks: readiness.blocks },
      confirmation,
      pilotTeacher,
      snapshot,
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/xendit-readiness error:", error);
    return NextResponse.json({ error: "Gagal memuat readiness Xendit" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const founder = await getUser();
    if (!founder || !founder.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case "RECORD_EVIDENCE": {
        const category = body.category;
        const status = body.status;
        if (!XENDIT_EVIDENCE_CATEGORIES.includes(category)) {
          return NextResponse.json({ error: "category tidak valid" }, { status: 400 });
        }
        if (!["PENDING", "VERIFIED", "REJECTED"].includes(status)) {
          return NextResponse.json({ error: "status tidak valid" }, { status: 400 });
        }
        if (status === "VERIFIED" && !String(body.evidenceReference ?? "").trim()) {
          return NextResponse.json({ error: "Referensi bukti wajib untuk VERIFIED" }, { status: 400 });
        }
        const record = await recordEvidence({
          category,
          status,
          verifiedBy: founder.id,
          verifiedByEmail: founder.email ?? null,
          evidenceReference: String(body.evidenceReference ?? ""),
          notes: String(body.notes ?? ""),
        });
        return NextResponse.json({ ok: true, evidence: record });
      }

      case "CONFIRM": {
        const teacherId = typeof body.teacherId === "string" ? body.teacherId.trim() : "";
        const withdrawalId = typeof body.withdrawalId === "string" ? body.withdrawalId.trim() : "";
        const confirmationText = typeof body.confirmationText === "string" ? body.confirmationText : "";
        if (!teacherId || !withdrawalId) {
          return NextResponse.json({ error: "teacherId dan withdrawalId wajib" }, { status: 400 });
        }
        const snapshot = await buildMoneySafetySnapshot({ teacherId, withdrawalId });
        const confirmation = await recordFounderConfirmation({
          founderId: founder.id,
          founderEmail: founder.email ?? null,
          confirmationText,
          canaryTeacherId: teacherId,
          withdrawalId,
          amount: snapshot.withdrawal.amount,
        });
        return NextResponse.json({ ok: true, confirmation });
      }

      default:
        return NextResponse.json(
          { error: "action tidak dikenal: RECORD_EVIDENCE | CONFIRM" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/xendit-readiness error:", error);
    const message = error instanceof Error && error.message === "Confirmation text mismatch"
      ? "Teks konfirmasi tidak sesuai — salin persis teks yang ditampilkan."
      : "Gagal memproses aksi readiness";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
