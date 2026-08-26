import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  getCanaryRun,
  prepareCanaryRun,
  startCanaryExecution,
  markAwaitingReceipt,
  recordReceipt,
  completeCanaryRun,
  stopCanaryRun,
  evaluateCanaryPreFlight,
} from "@/lib/commission/payout/canary";

/**
 * GET/POST /api/admin/teacher-commissions/canary
 * P8G — Canary execution (founder-only, semua transisi teraudit).
 * Run TIDAK menciptakan uang — hanya mereferensikan withdrawal existing.
 */
export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const run = await getCanaryRun();
    let preflight = null;
    if (run.selectedTeacherId && run.selectedWithdrawalId) {
      preflight = await evaluateCanaryPreFlight(run.selectedTeacherId, run.selectedWithdrawalId);
    }

    return NextResponse.json({ run, preflight });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/canary error:", error);
    return NextResponse.json({ error: "Gagal memuat canary run" }, { status: 500 });
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
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    switch (action) {
      case "PREPARE": {
        const teacherId = typeof body.teacherId === "string" ? body.teacherId.trim() : "";
        const withdrawalId = typeof body.withdrawalId === "string" ? body.withdrawalId.trim() : "";
        const evidence = typeof body.providerReadinessEvidence === "string" ? body.providerReadinessEvidence.trim() : "";
        if (!teacherId || !withdrawalId) {
          return NextResponse.json({ error: "teacherId dan withdrawalId wajib" }, { status: 400 });
        }
        if (!evidence) {
          return NextResponse.json({ error: "Bukti kesiapan provider wajib dicatat" }, { status: 400 });
        }
        const res = await prepareCanaryRun({
          teacherId,
          withdrawalId,
          providerReadinessEvidence: evidence,
          actorUserId: founder.id,
          actorEmail: founder.email ?? null,
        });
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ ok: true, run: res.run, preflight: res.preflight });
      }

      case "START": {
        if (!notes) return NextResponse.json({ error: "Catatan wajib" }, { status: 400 });
        const res = await startCanaryExecution({ actorUserId: founder.id, notes });
        if (!res.ok) {
          return NextResponse.json(
            { error: res.error === "PREFLIGHT_BLOCKED" ? "Pre-flight gagal — canary tidak dapat dimulai." : "Transisi tidak valid." },
            { status: 409 }
          );
        }
        return NextResponse.json({ ok: true, run: res.run });
      }

      case "MARK_AWAITING_RECEIPT": {
        const res = await markAwaitingReceipt({ actorUserId: founder.id, notes });
        if (!res.ok) return NextResponse.json({ error: "Transisi tidak valid." }, { status: 409 });
        return NextResponse.json({ ok: true, run: res.run });
      }

      case "CONFIRM_RECEIPT": {
        const receiptStatus = body.receiptStatus;
        if (!["CONFIRMED_RECEIVED", "NOT_YET_RECEIVED", "UNABLE_TO_CONFIRM"].includes(receiptStatus)) {
          return NextResponse.json({ error: "receiptStatus tidak valid" }, { status: 400 });
        }
        const res = await recordReceipt({ actorUserId: founder.id, receiptStatus, notes });
        if (!res.ok) return NextResponse.json({ error: "Transisi tidak valid." }, { status: 409 });
        return NextResponse.json({ ok: true, run: res.run });
      }

      case "COMPLETE": {
        const result = body.result;
        if (result !== "SUCCESS" && result !== "FAILED") {
          return NextResponse.json({ error: "result wajib SUCCESS/FAILED" }, { status: 400 });
        }
        const res = await completeCanaryRun({ actorUserId: founder.id, result, reviewNotes: notes });
        if (!res.ok) return NextResponse.json({ error: "Transisi tidak valid (SUCCESS butuh CONFIRMED_RECEIVED)." }, { status: 409 });
        return NextResponse.json({ ok: true, run: res.run });
      }

      case "STOP": {
        if (!notes) return NextResponse.json({ error: "Alasan stop wajib" }, { status: 400 });
        const res = await stopCanaryRun({ actorUserId: founder.id, reason: notes });
        if (!res.ok) return NextResponse.json({ error: "Transisi tidak valid." }, { status: 409 });
        return NextResponse.json({ ok: true, run: res.run });
      }

      default:
        return NextResponse.json(
          { error: "action tidak dikenal: PREPARE | START | MARK_AWAITING_RECEIPT | CONFIRM_RECEIPT | COMPLETE | STOP" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/canary error:", error);
    return NextResponse.json({ error: "Gagal memproses aksi canary" }, { status: 500 });
  }
}
