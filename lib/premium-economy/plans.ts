import { resolveIdentity } from "@/lib/account/identity";
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
import type { UserLike } from "@/lib/types/user";

export type PlanCode = "FREE" | "PRO" | "MURID_PREMIUM" | "UMUM_PREMIUM" | "FOUNDER" | (string & {});

export type SubscriptionStatusLabel = "ACTIVE" | "TRIALING" | "FOUNDER" | null;

export type { UserLike };

/**
 * Resolusi plan murni dari flag user (tanpa DB).
 *
 * Urutan prioritas:
 *   ADMIN/founder      → FOUNDER
 *   subscription aktif → PRO / MURID_PREMIUM  (Midtrans — ditangani resolvePlan DB)
 *   isPremium aktif    → PRO / MURID_PREMIUM  (legacy flag, premiumUntil > now)
 *   trial berjalan     → PRO        (trial = akses PRO sementara)
 *   lainnya            → FREE       (default — user existing tidak pernah di-exclude)
 *
 * Role-based:
 *   MURID + isPremium  → MURID_PREMIUM (feature-tiered, NOT credit-based)
 *   GURU + isPremium   → PRO (credit-based via AI Gateway)
 *   UMUM + isPremium / uji coba Umum → UMUM_PREMIUM (tanpa kredit AI)
 */
export function resolvePlanForUser(user: UserLike): {
  plan: PlanCode;
  subscriptionStatus: SubscriptionStatusLabel;
} {
  const { plan, subscriptionStatus } = resolveIdentity(user);
  return { plan, subscriptionStatus };
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
        premiumPlan: true,
        premiumUntil: true,
        trialEndsAt: true,
        trialPlan: true,
        subscriptions: {
          orderBy: { currentPeriodEnd: "desc" },
          select: { id: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
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

    const activeSub = user.subscriptions?.find(s => s.status === "ACTIVE" && s.currentPeriodStart <= new Date() && s.currentPeriodEnd > new Date());
    // Allowlist eksplisit: hanya MURID/GURU yang bisa punya plan berbayar
    // (selaras resolveIdentity). UMUM tidak memakai Subscription — Premium
    // Umum dibaca resolveIdentity dari flag sekali-bayar / uji coba Umum.
    if ((user.role === "MURID" || user.role === "GURU") && activeSub && activeSub.currentPeriodEnd && activeSub.currentPeriodEnd > new Date()) {
      return {
        plan: user.role === "MURID" ? "MURID_PREMIUM" : "PRO",
        subscriptionStatus: "ACTIVE",
        subscriptionId: activeSub.id,
        subscriptionEndsAt: activeSub.currentPeriodEnd,
      };
    }

    const { plan, subscriptionStatus } = resolveIdentity(user);
    const fallback = { plan, subscriptionStatus };
    return { ...fallback, subscriptionId: null, subscriptionEndsAt: null };
  })();

  planMemo.set(userId, { expires: now + PLAN_MEMO_TTL_MS, promise });
  return promise;
}
