import { db } from "@/lib/db";

interface UserTrialInfo {
  id: string;
  role: string;
  isFounder: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
}

/**
 * Check if a Guru user is eligible to start a trial.
 */
export function shouldStartGuruTrial(user: UserTrialInfo): boolean {
  // Founder/Admin — no trial needed
  if (user.isFounder) return false;

  // Only Guru users get trials
  if (user.role !== "GURU") return false;

  // Already premium — no trial
  if (user.isPremium && user.premiumUntil && user.premiumUntil > new Date()) return false;

  // Already has a trial (even if expired — no restart)
  if (user.trialStartedAt !== null) return false;
  if (user.trialEndsAt !== null) return false;

  return true;
}

/**
 * Start a 30-day Guru Pro Trial for eligible users.
 * Idempotent: if trial already exists or user is ineligible, does nothing.
 */
export async function startGuruTrialIfEligible(
  userId: string
): Promise<{ started: boolean; trialEndsAt?: Date; reason: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isFounder: true,
        isPremium: true,
        premiumUntil: true,
        trialStartedAt: true,
        trialEndsAt: true,
      },
    });

    if (!user) {
      return { started: false, reason: "User not found" };
    }

    if (!shouldStartGuruTrial(user)) {
      if (user.role !== "GURU") return { started: false, reason: "Only Guru users are eligible for trial" };
      if (user.isFounder) return { started: false, reason: "Founder has unlimited access — no trial needed" };
      if (user.isPremium && user.premiumUntil && user.premiumUntil > new Date()) {
        return { started: false, reason: "Active premium subscription exists — no trial needed" };
      }
      if (user.trialStartedAt !== null) {
        return { started: false, reason: "Trial was already started previously" };
      }
      return { started: false, reason: "Not eligible for trial" };
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Use transaction to atomically start trial and create ledger
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          trialStartedAt: now,
          trialEndsAt,
          trialPlan: "GURU_PRO_TRIAL",
          trialCreditsTotal: 200,
        },
      }),
      db.aiCreditLedger.create({
        data: {
          userId,
          period: "trial",
          plan: "GURU_PRO_TRIAL",
          creditsTotal: 200,
          creditsUsed: 0,
          creditsReserved: 0,
          source: "trial",
          startsAt: now,
          endsAt: trialEndsAt,
        },
      }),
    ]);

    console.log(`[Trial] Started Guru Pro Trial for user ${userId}, ends ${trialEndsAt.toISOString()}`);

    return {
      started: true,
      trialEndsAt,
      reason: `Guru Pro Trial started — 30 days, 200 credits`,
    };
  } catch (error) {
    console.error("[Trial] Error starting trial:", error);
    return { started: false, reason: "Failed to start trial due to internal error" };
  }
}

/**
 * Get trial status for display purposes.
 */
export function getTrialStatus(user: {
  trialEndsAt: Date | null;
  trialStartedAt: Date | null;
  trialPlan: string | null;
  isPremium: boolean;
  isFounder: boolean;
}): {
  isTrialActive: boolean;
  daysRemaining: number;
  trialEndsAt: Date | null;
  trialPlan: string | null;
} {
  const now = new Date();

  if (!user.trialEndsAt || !user.trialStartedAt) {
    return { isTrialActive: false, daysRemaining: 0, trialEndsAt: null, trialPlan: null };
  }

  if (user.isPremium || user.isFounder) {
    return { isTrialActive: false, daysRemaining: 0, trialEndsAt: user.trialEndsAt, trialPlan: user.trialPlan };
  }

  const isActive = user.trialEndsAt > now;
  const daysRemaining = isActive
    ? Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isTrialActive: isActive,
    daysRemaining,
    trialEndsAt: user.trialEndsAt,
    trialPlan: user.trialPlan,
  };
}
