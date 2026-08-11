/**
 * BC Premium Economy — definisi plan.
 *
 * Sumber kebenaran plan: FREE / PRO / FOUNDER (internal).
 * Masa depan: PRO_PLUS, SCHOOL, INSTITUTION — tambahkan di sini + matrix,
 * tanpa menyentuh feature route (engine membaca dari DB `Entitlement`,
 * fallback `DEFAULT_ENTITLEMENT_MATRIX`).
 *
 * PENTING: Subscription (Midtrans) yang sudah ada TIDAK diganti — engine ini
 * membacanya. Semua user existing tanpa subscription aktif → FREE otomatis.
 */

import { db } from "@/lib/db";

export type PlanCode = "FREE" | "PRO" | "FOUNDER" | (string & {});

export type SubscriptionStatusLabel = "ACTIVE" | "TRIALING" | "FOUNDER" | null;

export interface UserLike {
  role: string;
  isFounder: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  trialEndsAt: Date | null;
}

/**
 * Resolusi plan murni dari flag user (tanpa DB).
 *
 * Urutan prioritas:
 *   ADMIN/founder      → FOUNDER
 *   subscription aktif → PRO        (Midtrans — ditangani resolvePlan DB)
 *   isPremium aktif    → PRO        (legacy flag, premiumUntil > now)
 *   trial berjalan     → PRO        (trial = akses PRO sementara)
 *   lainnya            → FREE       (default — user existing tidak pernah di-exclude)
 */
export function resolvePlanForUser(user: UserLike): {
  plan: PlanCode;
  subscriptionStatus: SubscriptionStatusLabel;
} {
  if (user.role === "ADMIN" || user.isFounder) {
    return { plan: "FOUNDER", subscriptionStatus: "FOUNDER" };
  }
  if (user.isPremium && user.premiumUntil && user.premiumUntil > new Date()) {
    return { plan: "PRO", subscriptionStatus: "ACTIVE" };
  }
  if (user.trialEndsAt && user.trialEndsAt > new Date()) {
    return { plan: "PRO", subscriptionStatus: "TRIALING" };
  }
  return { plan: "FREE", subscriptionStatus: null };
}

export interface ResolvedPlan {
  plan: PlanCode;
  subscriptionStatus: SubscriptionStatusLabel;
  subscriptionId: string | null;
  subscriptionEndsAt: Date | null;
}

/**
 * Resolusi plan dari DB: cek subscription Midtrans ACTIVE (currentPeriodEnd
 * masih berlaku) dulu — itu sumber kanonik — lalu fallback flag legacy/trial.
 *
 * Memoization: Map userId→{expires,promise} dengan TTL 10s. Satu request yang
 * memanggil resolvePlan beberapa kali hanya membaca DB sekali. (Tidak memakai
 * React `cache` — project ini masih React 18 di mana `cache` tidak ada
 * saat runtime di luar Next, mis. script tsx.)
 */
const planMemo = new Map<string, { expires: number; promise: Promise<ResolvedPlan> }>();
const PLAN_MEMO_TTL_MS = 10_000;

export function resolvePlan(userId: string): Promise<ResolvedPlan> {
  const now = Date.now();
  const hit = planMemo.get(userId);
  if (hit && hit.expires > now) return hit.promise;

  const promise: Promise<ResolvedPlan> = (async (): Promise<ResolvedPlan> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isFounder: true,
        isPremium: true,
        premiumUntil: true,
        trialEndsAt: true,
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { currentPeriodEnd: "desc" },
          take: 1,
          select: { id: true, currentPeriodEnd: true },
        },
      },
    });

    if (!user) return { plan: "FREE", subscriptionStatus: null, subscriptionId: null, subscriptionEndsAt: null };

    // Precedence kanonik: FOUNDER > PRO > TRIAL > FREE.
    // Founder/admin dicek SEBELUM subscription aktif — founder dengan
    // subscription tetap FOUNDER (unlimited), bukan PRO terbatas.
    if (user.role === "ADMIN" || user.isFounder) {
      return {
        plan: "FOUNDER",
        subscriptionStatus: "FOUNDER",
        subscriptionId: null,
        subscriptionEndsAt: null,
      };
    }

    const activeSub = user.subscriptions?.[0];
    if (activeSub && activeSub.currentPeriodEnd && activeSub.currentPeriodEnd > new Date()) {
      return {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        subscriptionId: activeSub.id,
        subscriptionEndsAt: activeSub.currentPeriodEnd,
      };
    }

    const fallback = resolvePlanForUser(user);
    return { ...fallback, subscriptionId: null, subscriptionEndsAt: null };
  })();

  planMemo.set(userId, { expires: now + PLAN_MEMO_TTL_MS, promise });
  return promise;
}
