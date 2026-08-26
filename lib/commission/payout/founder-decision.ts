/**
 * P8F §STEP 7 — Founder Decision Record (auditable).
 *
 * State: NOT_APPROVED | APPROVED_FOR_CANARY | CANARY_COMPLETED | CANARY_FAILED
 * Disimpan di SiteSetting (JSON) + SELALU diaudit ke AdminPaymentAuditLog.
 * HANYA founder yang boleh mengubah (ditegakkan di route). Sistem TIDAK
 * pernah menginfer approval dari build/test — hanya record ini.
 */

import { db } from "@/lib/db";
import { auditCommission } from "../audit";

const DECISION_KEY = "payout_founder_decision";

export type FounderDecisionState =
  | "NOT_APPROVED"
  | "APPROVED_FOR_CANARY"
  | "CANARY_COMPLETED"
  | "CANARY_FAILED";

export interface FounderDecision {
  state: FounderDecisionState;
  approverUserId: string | null;
  approverEmail: string | null;
  decidedAt: string | null;
  notes: string | null;
}

const DEFAULT_DECISION: FounderDecision = {
  state: "NOT_APPROVED",
  approverUserId: null,
  approverEmail: null,
  decidedAt: null,
  notes: null,
};

export async function getFounderDecision(): Promise<FounderDecision> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: DECISION_KEY } });
    if (!setting?.value) return { ...DEFAULT_DECISION };
    const parsed = JSON.parse(setting.value) as Partial<FounderDecision>;
    return {
      state: parsed.state ?? "NOT_APPROVED",
      approverUserId: parsed.approverUserId ?? null,
      approverEmail: parsed.approverEmail ?? null,
      decidedAt: parsed.decidedAt ?? null,
      notes: parsed.notes ?? null,
    };
  } catch (err) {
    console.error("[payout][founder-decision] gagal membaca record:", err);
    return { ...DEFAULT_DECISION };
  }
}

/**
 * Catat keputusan Founder (mutasi append-only pada record + audit).
 * Dipanggil dari route founder-only — fungsi ini sendiri tidak memeriksa
 * role; route adalah satu-satunya entry point.
 */
export async function recordFounderDecision(input: {
  state: FounderDecisionState;
  approverUserId: string;
  approverEmail: string | null;
  notes: string;
}): Promise<FounderDecision> {
  const decision: FounderDecision = {
    state: input.state,
    approverUserId: input.approverUserId,
    approverEmail: input.approverEmail,
    decidedAt: new Date().toISOString(),
    notes: input.notes.slice(0, 1000),
  };

  await db.siteSetting.upsert({
    where: { key: DECISION_KEY },
    create: { key: DECISION_KEY, value: JSON.stringify(decision) },
    update: { value: JSON.stringify(decision) },
  });

  await auditCommission({
    actorUserId: input.approverUserId,
    action: `PAYOUT_FOUNDER_DECISION_${input.state}`,
    reason: input.notes.slice(0, 500),
    metadata: { state: input.state, decidedAt: decision.decidedAt },
  });

  return decision;
}
