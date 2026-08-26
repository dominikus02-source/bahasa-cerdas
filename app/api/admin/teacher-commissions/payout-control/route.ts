import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getPayoutRuntimeConfig, getMoneySafetyState } from "@/lib/commission/payout/runtime-config";
import { evaluateFounderGate } from "@/lib/commission/payout/founder-gate";
import { evaluateAlertConditions } from "@/lib/commission/payout/alerts";
import {
  getEffectivePilotTeacherIds,
  setPilotPaused,
  setPilotTeacherIds,
  pilotDailyPayoutTotal,
} from "@/lib/commission/payout/pilot";
import { globalDailyPayoutTotal } from "@/lib/commission/payout/safety";
import { auditCommission } from "@/lib/commission/audit";

/**
 * GET/POST /api/admin/teacher-commissions/payout-control
 * P8E §17 — Admin Control Center (founder-only, semua aksi teraudit).
 *
 * GET : state keamanan + config + exposure + pilot + founder gate + alerts.
 * POST: PILOT_PAUSE | PILOT_RESUME | PILOT_ADD_TEACHER {teacherId} |
 *       PILOT_REMOVE_TEACHER {teacherId} — WAJIB alasan, audited.
 */
export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [config, safety, gate, alerts, pilotIds, pilotTotal, globalTotal] = await Promise.all([
      getPayoutRuntimeConfig(),
      getMoneySafetyState(),
      evaluateFounderGate(),
      evaluateAlertConditions(),
      getEffectivePilotTeacherIds(),
      pilotDailyPayoutTotal(),
      globalDailyPayoutTotal(),
    ]);

    return NextResponse.json({
      safetyState: safety.state,
      safetyDetail: safety.detail,
      config,
      exposure: {
        pilotDailyTotal: pilotTotal,
        globalDailyTotal: globalTotal,
        pilotGlobalLimit: config.pilotGlobalLimit,
        globalDailyLimit: config.globalDailyLimit,
      },
      pilot: {
        teacherIds: [...pilotIds],
        paused: config.pilotPaused,
      },
      founderGate: {
        autoChecksPassed: gate.autoChecksPassed,
        autoPass: gate.autoPass,
        autoFail: gate.autoFail,
        manualRequired: gate.manualRequired,
        items: gate.items,
      },
      alerts,
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/payout-control error:", error);
    return NextResponse.json({ error: "Gagal memuat control center" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return NextResponse.json({ error: "Alasan wajib diisi" }, { status: 400 });
    }

    switch (action) {
      case "PILOT_PAUSE":
      case "PILOT_RESUME": {
        await setPilotPaused(action === "PILOT_PAUSE");
        await auditCommission({
          actorUserId: admin.id,
          action: action === "PILOT_PAUSE" ? "PAYOUT_PILOT_PAUSED" : "PAYOUT_PILOT_RESUMED",
          reason,
        });
        return NextResponse.json({ ok: true, action });
      }

      case "PILOT_ADD_TEACHER":
      case "PILOT_REMOVE_TEACHER": {
        const teacherId = typeof body.teacherId === "string" ? body.teacherId.trim() : "";
        if (!teacherId) {
          return NextResponse.json({ error: "teacherId wajib" }, { status: 400 });
        }
        const ids = await getEffectivePilotTeacherIds();
        if (action === "PILOT_ADD_TEACHER") ids.add(teacherId);
        else ids.delete(teacherId);
        await setPilotTeacherIds([...ids]);
        await auditCommission({
          actorUserId: admin.id,
          action: action === "PILOT_ADD_TEACHER" ? "PAYOUT_PILOT_ADD_TEACHER" : "PAYOUT_PILOT_REMOVE_TEACHER",
          targetUserId: teacherId,
          reason,
          metadata: { teacherId },
        });
        return NextResponse.json({ ok: true, action, teacherId, count: ids.size });
      }

      default:
        return NextResponse.json(
          { error: "action tidak dikenal: PILOT_PAUSE | PILOT_RESUME | PILOT_ADD_TEACHER | PILOT_REMOVE_TEACHER" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/payout-control error:", error);
    return NextResponse.json({ error: "Gagal memproses aksi" }, { status: 500 });
  }
}
