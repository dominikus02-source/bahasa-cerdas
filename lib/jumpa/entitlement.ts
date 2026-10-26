/**
 * JUMPA Fase 3 — paket JUMPA dari langganan BC yang SUDAH ADA.
 * Memakai resolvePlan() (lib/premium-economy/plans.ts) — sumber kebenaran
 * yang sama dengan fitur Pro lain: langganan Midtrans aktif, flag premium
 * legacy, trial guru (trialEndsAt), founder/admin. Tidak ada logika harga
 * atau langganan baru di sini.
 */
import type { PlanCode } from "@/lib/premium-economy/plans";
import { resolvePlan } from "@/lib/premium-economy/plans";
import type { JumpaKind } from "./caps";
import type { JumpaTier } from "./tiers";

/**
 * Tier ruang GURU/KELAS/webinar: PRO (termasuk trial guru), UMUM_PREMIUM
 * (bayar atau uji coba Umum) & FOUNDER → PREMIUM. Lainnya → FREE.
 * MURID_PREMIUM sengaja TIDAK membuka batas ruang guru (lihat tierForRoomKind).
 * Keputusan pendiri: JUMPA UMUM premium = batas guru premium. Ruang UMUM
 * memakai tabel tier sendiri (feat/jumpa-umum).
 */
export function tierForPlan(plan: PlanCode | null | undefined): JumpaTier {
  return plan === "PRO" || plan === "UMUM_PREMIUM" || plan === "FOUNDER" ? "PREMIUM" : "FREE";
}

/**
 * Tier per jenis ruang. Ruang MURID (belajar bareng): Murid Premium juga
 * PREMIUM (15 peserta), selain PRO/FOUNDER. Jenis lain = tierForPlan().
 * Webinar selalu memakai tierForPlan() (lihat createRoom).
 */
export function tierForRoomKind(plan: PlanCode | null | undefined, kind: JumpaKind): JumpaTier {
  if (kind === "MURID" && plan === "MURID_PREMIUM") return "PREMIUM";
  return tierForPlan(plan);
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
