/** Shared subscription truth. AI credit exemptions never imply a paid badge. */
export type IdentityBadge = "founder" | "teacher" | "trial" | "student";
export interface IdentitySource {
  role?: string | null;
  isFounder?: boolean;
  isPremium?: boolean;
  premiumPlan?: string;
  premiumUntil?: Date | string | null;
  trialEndsAt?: Date | string | null;
  subscriptions?: { status?: string; currentPeriodStart?: Date | string; currentPeriodEnd: Date | string }[];
}
export const identitySelect = {
  role: true, isFounder: true, isPremium: true, premiumPlan: true, premiumUntil: true, trialEndsAt: true,
  subscriptions: { select: { status: true, currentPeriodStart: true, currentPeriodEnd: true } },
} as const;
export function resolveIdentity(user: IdentitySource, now = new Date()) {
  const role = user.role?.toUpperCase();
  const future = (value: Date | string | null | undefined) => Boolean(value && new Date(value).getTime() > now.getTime());
  const founder = user.isFounder === true;
  const subscription = user.subscriptions?.some(s => s.status === "ACTIVE" && future(s.currentPeriodEnd) && (!s.currentPeriodStart || new Date(s.currentPeriodStart) <= now));
  const paid = (role === "GURU" || role === "MURID") && Boolean(subscription || (!user.subscriptions?.length && user.isPremium && user.premiumPlan !== "FREE" && future(user.premiumUntil)));
  const trial = role === "GURU" && !paid && future(user.trialEndsAt);
  const badgeKind: IdentityBadge | null = founder ? "founder" : paid ? role === "GURU" ? "teacher" : "student" : trial ? "trial" : null;
  return { badgeKind, isPremium: paid, plan: founder || role === "ADMIN" ? "FOUNDER" : paid ? role === "MURID" ? "MURID_PREMIUM" : "PRO" : trial ? "PRO" : "FREE", subscriptionStatus: founder || role === "ADMIN" ? "FOUNDER" : paid ? "ACTIVE" : trial ? "TRIALING" : null } as const;
}

export function normalizedIdentity<T extends IdentitySource>(user: T) {
  const resolved = resolveIdentity(user);
  const active = user.subscriptions?.filter(s => s.status === "ACTIVE" && new Date(s.currentPeriodEnd) > new Date() && (!s.currentPeriodStart || new Date(s.currentPeriodStart) <= new Date())).sort((a,b) => new Date(b.currentPeriodEnd).getTime() - new Date(a.currentPeriodEnd).getTime())[0];
  return { ...user, ...resolved, premiumPlan: (resolved.isPremium ? "PRO" : "FREE") as "PRO" | "FREE", premiumUntil: active ? new Date(active.currentPeriodEnd) : user.premiumUntil ? new Date(user.premiumUntil) : null };
}
