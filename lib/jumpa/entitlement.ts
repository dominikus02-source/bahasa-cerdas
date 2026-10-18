/**
 * JUMPA Fase 3 — paket JUMPA dari langganan BC yang SUDAH ADA.
 * Memakai resolvePlan() (lib/premium-economy/plans.ts) — sumber kebenaran
 * yang sama dengan fitur Pro lain: langganan Midtrans aktif, flag premium
 * legacy, trial guru (trialEndsAt), founder/admin. Tidak ada logika harga
 * atau langganan baru di sini.
 */
import type { PlanCode } from "@/lib/premium-economy/plans";
import { resolvePlan } from "@/lib/premium-economy/plans";
import type { JumpaTier } from "./tiers";

/** PRO (termasuk trial guru) & FOUNDER → PREMIUM. Lainnya → FREE. */
export function tierForPlan(plan: PlanCode | null | undefined): JumpaTier {
  return plan === "PRO" || plan === "FOUNDER" ? "PREMIUM" : "FREE";
}

/** Paket JUMPA milik user. Gagal baca DB → FREE (fail-closed untuk batas). */
export async function resolveJumpaTier(userId: string): Promise<{ tier: JumpaTier; plan: PlanCode; trialing: boolean }> {
  try {
    const r = await resolvePlan(userId);
    return { tier: tierForPlan(r.plan), plan: r.plan, trialing: r.subscriptionStatus === "TRIALING" };
  } catch {
    return { tier: "FREE", plan: "FREE", trialing: false };
  }
}
