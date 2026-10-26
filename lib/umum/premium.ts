/**
 * Premium Umum — satu titik baca hak premium untuk fitur Role UMUM.
 *
 * Sumber kebenaran tetap resolveIdentity() (lib/account/identity.ts):
 *   - bayar sekali (Midtrans Snap, UMUM_PREMIUM_*) → plan UMUM_PREMIUM, ACTIVE
 *   - uji coba Umum (trialPlan UMUM_PREMIUM_TRIAL) → plan UMUM_PREMIUM, TRIALING
 *   - founder/ADMIN → selalu boleh (staf)
 *
 * Dipakai untuk menggerbang TULIS (buat/terbitkan/jual), BUKAN baca:
 * setelah premium berakhir, karya/draf tetap bisa dibuka & diekspor.
 *
 *   import { hasUmumPremium, umumPremiumRequired } from "@/lib/umum/premium";
 *   if (!hasUmumPremium(user)) return umumPremiumRequired();
 *
 * Tidak bergantung pada flag ENABLE_UMUM_PREMIUM: hak yang sudah dibayar
 * tidak hilang karena flag dimatikan.
 */
import { NextResponse } from "next/server";
import { resolveIdentity, UMUM_TRIAL_PLAN, type IdentitySource } from "@/lib/account/identity";

export type UmumPremiumSource = "paid" | "trial" | "staff";

export interface UmumPremiumState {
  active: boolean;
  source: UmumPremiumSource | null;
  /** Akhir hak aktif (premiumUntil untuk bayar, trialEndsAt untuk uji coba). */
  until: Date | null;
}

export function umumPremiumState(user: IdentitySource | null | undefined, now = new Date()): UmumPremiumState {
  if (!user) return { active: false, source: null, until: null };
  const r = resolveIdentity(user, now);
  if (r.plan === "FOUNDER") return { active: true, source: "staff", until: null };
  if (r.plan !== "UMUM_PREMIUM") return { active: false, source: null, until: null };
  if (r.subscriptionStatus === "ACTIVE") {
    return { active: true, source: "paid", until: user.premiumUntil ? new Date(user.premiumUntil) : null };
  }
  return { active: true, source: "trial", until: user.trialEndsAt ? new Date(user.trialEndsAt) : null };
}

/** true bila user UMUM berbayar / uji coba Umum aktif, atau staf (founder/ADMIN). */
export function hasUmumPremium(user: IdentitySource | null | undefined, now = new Date()): boolean {
  return umumPremiumState(user, now).active;
}

/** Sisa uji coba Umum (ms) — dipakai webhook untuk menambahkan hari saat bayar. */
export function remainingUmumTrialMs(
  user: { trialPlan?: string | null; trialEndsAt?: Date | string | null },
  now = new Date()
): number {
  if (user.trialPlan !== UMUM_TRIAL_PLAN || !user.trialEndsAt) return 0;
  return Math.max(0, new Date(user.trialEndsAt).getTime() - now.getTime());
}

export const UMUM_PREMIUM_REQUIRED = "UMUM_PREMIUM_REQUIRED";

/** Respons 403 standar untuk aksi tulis yang butuh Premium Umum. */
export function umumPremiumRequired(message = "Fitur ini butuh Premium Umum.") {
  return NextResponse.json(
    { ok: false, error: UMUM_PREMIUM_REQUIRED, code: UMUM_PREMIUM_REQUIRED, message, upgradeUrl: "/umum/premium" },
    { status: 403 }
  );
}
