/**
 * Canonical UserLike — minimal subset of Prisma User fields
 * shared by billing, premium-economy, and ai-gateway modules.
 *
 * This is the INTERSECTION of fields needed by all consumers.
 * Functions that need `id` should extend this type locally:
 *
 *   interface UserLikeWithId extends UserLike { id: string }
 */
export interface UserLike {
  role: string;
  isFounder: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  trialEndsAt: Date | null;
  trialStartedAt?: Date | null;
  premiumPlan?: string;
}
