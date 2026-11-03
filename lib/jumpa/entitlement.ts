/**
 * JUMPA Fase 3 — paket JUMPA dari langganan BC yang SUDAH ADA.
 * Memakai resolvePlan() (lib/premium-economy/plans.ts) — sumber kebenaran
 * yang sama dengan fitur Pro lain: langganan Midtrans aktif, flag premium
 * legacy, trial guru (trialEndsAt), founder/admin. Tidak ada logika harga
 * atau langganan baru di sini.
 */
import type { PlanCode } from "@/lib/premium-economy/plans";
import type { JumpaKind } from "./caps";
import type { JumpaTier } from "./tiers";

/** Pemetaan langganan BC ke paket JUMPA. */
export function tierForPlan(plan: PlanCode | null | undefined): JumpaTier {
  return plan === "PRO" || plan === "UMUM_PREMIUM" || plan === "FOUNDER" ? "PREMIUM" : "FREE";
}

/** Semua jenis ruang memakai entitlement yang sama, termasuk Premium murid. */
export function tierForRoomKind(plan: PlanCode | null | undefined, kind: JumpaKind): JumpaTier {
  void kind;
  if (plan === "MURID_PREMIUM") return "PREMIUM";
  return tierForPlan(plan);
}

/** Paket JUMPA dari sumber langganan kanonik; kegagalan DB diteruskan ke handler. */
export async function resolveJumpaTier(userId: string): Promise<{ tier: JumpaTier; plan: PlanCode; trialing: boolean }> {
  const { resolvePlan } = await import("@/lib/premium-economy/plans");
  const resolved = await resolvePlan(userId);
  return { tier: tierForRoomKind(resolved.plan, "GURU"), plan: resolved.plan, trialing: resolved.subscriptionStatus === "TRIALING" };
}
