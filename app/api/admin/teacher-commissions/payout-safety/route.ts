import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { auditCommission } from "@/lib/commission/audit";
import {
  getDbKillSwitch,
  isPayoutKillSwitchActive,
  setDbKillSwitch,
} from "@/lib/commission/payout/kill-switch";
import {
  isEnvKillSwitchActive,
  isPayoutPilotEnabled,
  isPayoutProviderEnabled,
  isRealMoneyPayoutEnabled,
  payoutDailyLimit,
  payoutGlobalDailyLimit,
  payoutMaximumAmount,
  payoutMinimumAmount,
  payoutProvider,
} from "@/lib/commission/payout/config";

/**
 * GET/POST /api/admin/teacher-commissions/payout-safety
 * P7E §19 — Emergency stop + status keamanan payout (founder-only).
 *
 * POST body: { action: "ENABLE_KILL_SWITCH" | "DISABLE_KILL_SWITCH" }
 * Hanya menghentikan pengiriman BARU — TIDAK menghapus withdrawal/wallet/ledger,
 * TIDAK menyembunyikan riwayat finansial.
 */
export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      provider: payoutProvider(),
      realMoneyEnabled: isRealMoneyPayoutEnabled(),
      providerEnabled: isPayoutProviderEnabled(),
      envKillSwitch: isEnvKillSwitchActive(),
      dbKillSwitch: await getDbKillSwitch(),
      killSwitchActive: await isPayoutKillSwitchActive(),
      pilotEnabled: isPayoutPilotEnabled(),
      limits: {
        minimumAmount: payoutMinimumAmount(),
        maximumAmount: payoutMaximumAmount(),
        dailyLimit: payoutDailyLimit(),
        globalDailyLimit: payoutGlobalDailyLimit(),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-commissions/payout-safety error:", error);
    return NextResponse.json({ error: "Gagal memuat status keamanan payout" }, { status: 500 });
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

    if (action !== "ENABLE_KILL_SWITCH" && action !== "DISABLE_KILL_SWITCH") {
      return NextResponse.json(
        { error: 'action wajib: "ENABLE_KILL_SWITCH" | "DISABLE_KILL_SWITCH"' },
        { status: 400 }
      );
    }

    const enable = action === "ENABLE_KILL_SWITCH";
    const previous = await isPayoutKillSwitchActive();
    await setDbKillSwitch(enable);

    await auditCommission({
      actorUserId: admin.id,
      action: enable ? "PAYOUT_KILL_SWITCH_ENABLED" : "PAYOUT_KILL_SWITCH_DISABLED",
      reason: `Admin ${enable ? "mengaktifkan" : "menonaktifkan"} kill switch payout.`,
      previousValue: { killSwitchActive: previous },
      newValue: { killSwitchActive: enable },
    });

    return NextResponse.json({
      ok: true,
      action,
      killSwitchActive: await isPayoutKillSwitchActive(),
    });
  } catch (error) {
    console.error("POST /api/admin/teacher-commissions/payout-safety error:", error);
    return NextResponse.json({ error: "Gagal mengubah kill switch" }, { status: 500 });
  }
}
