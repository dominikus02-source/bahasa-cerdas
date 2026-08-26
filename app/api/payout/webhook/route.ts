import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayoutProvider } from "@/lib/commission/payout/provider";
import { payoutProvider } from "@/lib/commission/payout/config";
import {
  applyPayoutPaid,
  applyPayoutFailed,
  applyPayoutRetryable,
  markPayoutReconciliationRequired,
} from "@/lib/commission/payout/orchestrator";
import { auditCommission } from "@/lib/commission/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/payout/webhook
 * Webhook provider payout (spec §12/§13).
 *
 * - Verify signature (adapter) → reject 401 bila tidak cocok
 * - Parse event, resolve payout by providerReference
 * - VERIFIKASI amount bila ada di event (§15)
 * - Idempotensi event via TeacherPayoutEvent.providerEventId @unique —
 *   webhook berulang TIDAK membayar dua kali / unlock dua kali
 * - Transisi invalid → TIDAK di-mutasi, hanya log + audit (§13)
 */
export async function POST(req: NextRequest) {
  const provider = getPayoutProvider(payoutProvider());
  if (!provider) {
    return NextResponse.json({ error: "Provider tidak terdaftar" }, { status: 503 });
  }

  const rawBody = await req.text();
  const headers: Record<string, string | null> = {};
  for (const name of ["x-payout-signature", "x-payout-provider"]) {
    headers[name] = req.headers.get(name);
  }

  const verified = await provider.verifyWebhook(headers, rawBody);
  if (!verified.ok) {
    console.warn("[payout][webhook] verifikasi gagal:", verified.reason);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = verified.event;

  // ── Resolve payout by provider reference ──
  const payout = await db.teacherPayout.findUnique({
    where: { providerReference: event.providerReference },
    select: { id: true, amount: true, teacherId: true, status: true, provider: true, withdrawalId: true },
  });
  if (!payout) {
    console.warn("[payout][webhook] providerReference tidak dikenal:", event.providerReference);
    return NextResponse.json({ ok: true, warning: "unknown_reference" });
  }

  // ── Verify amount (§15) ──
  if (typeof event.amount === "number" && event.amount !== payout.amount) {
    await auditCommission({
      action: "PAYOUT_WEBHOOK",
      targetUserId: payout.teacherId,
      reason: `Webhook amount mismatch: event=${event.amount} internal=${payout.amount}`,
      metadata: { payoutId: payout.id, withdrawalId: payout.withdrawalId, providerEventId: event.id },
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // ── Event idempotency (§12) — event identity unique ──
  try {
    await db.teacherPayoutEvent.create({
      data: {
        payoutId: payout.id,
        providerEventId: event.id,
        eventType: event.type,
        raw: { reference: event.providerReference, type: event.type } as never,
      },
    });
  } catch {
    // Duplicate event — sudah diproses. Aman no-op.
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // ── Apply transition (§13) ──
  if (payout.status === "PAID" || payout.status === "FAILED") {
    await auditCommission({
      action: "PAYOUT_WEBHOOK",
      targetUserId: payout.teacherId,
      reason: `Webhook ${event.type} pada payout terminal ${payout.status} — diabaikan.`,
      metadata: { payoutId: payout.id, withdrawalId: payout.withdrawalId, providerEventId: event.id },
    });
    return NextResponse.json({ ok: true, ignored: "terminal_state" });
  }

  switch (event.type) {
    case "PAYOUT.PAID":
      await applyPayoutPaid(payout.id);
      break;
    case "PAYOUT.FAILED":
      await applyPayoutFailed(payout.id, "PROVIDER_FAILED", "Provider menyatakan payout gagal via webhook.");
      break;
    case "PAYOUT.RETRYABLE_FAILED":
      await applyPayoutRetryable(payout.id, "PROVIDER_RETRYABLE", "Provider menyatakan kegagalan sementara via webhook.");
      break;
    case "PAYOUT.UNKNOWN":
      await markPayoutReconciliationRequired(payout.id, "Provider menyatakan state tidak diketahui via webhook.");
      break;
    default:
      await auditCommission({
        action: "PAYOUT_WEBHOOK",
        targetUserId: payout.teacherId,
        reason: `Event type tidak dikenali: ${event.type} — diabaikan tanpa mutasi.`,
        metadata: { payoutId: payout.id, providerEventId: event.id },
      });
      return NextResponse.json({ ok: true, ignored: "unknown_event_type" });
  }

  return NextResponse.json({ ok: true });
}
