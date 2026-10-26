/** Shared subscription truth. AI credit exemptions never imply a paid badge. */
export type IdentityBadge = "founder" | "teacher" | "trial" | "student" | "umum";
/** trialPlan uji coba Premium Umum (POST /api/umum/trial). Tidak memberi kredit AI. */
export const UMUM_TRIAL_PLAN = "UMUM_PREMIUM_TRIAL";
export interface IdentitySource {
  role?: string | null;
  isFounder?: boolean;
  isPremium?: boolean;
  premiumPlan?: string;
  premiumUntil?: Date | string | null;
  trialEndsAt?: Date | string | null;
  trialPlan?: string | null;
  subscriptions?: { status?: string; currentPeriodStart?: Date | string; currentPeriodEnd: Date | string }[];
}
export const identitySelect = {
  role: true, isFounder: true, isPremium: true, premiumPlan: true, premiumUntil: true, trialEndsAt: true, trialPlan: true,
  subscriptions: { select: { status: true, currentPeriodStart: true, currentPeriodEnd: true } },
} as const;
export function resolveIdentity(user: IdentitySource, now = new Date()) {
  const role = user.role?.toUpperCase();
  const future = (value: Date | string | null | undefined) => Boolean(value && new Date(value).getTime() > now.getTime());
  const founder = user.isFounder === true;
  const subscription = user.subscriptions?.some(s => s.status === "ACTIVE" && future(s.currentPeriodEnd) && (!s.currentPeriodStart || new Date(s.currentPeriodStart) <= now));
  // A non-ACTIVE subscription whose period still covers "now" (cancelled /
  // refunded mid-period) revokes the legacy flag. Old subscription rows whose
  // period already ended must NOT hide a newer paid premiumUntil (Midtrans
  // one-off payments only write the user flags).
  const revoked = user.subscriptions?.some(s => s.status !== "ACTIVE" && future(s.currentPeriodEnd)) ?? false;
  const paid = (role === "GURU" || role === "MURID") && Boolean(subscription || (!revoked && user.isPremium && user.premiumPlan !== "FREE" && future(user.premiumUntil)));
  const trial = role === "GURU" && !paid && future(user.trialEndsAt);
  // Premium Umum: HANYA dari pembayaran sekali bayar (flag + premiumUntil) —
  // tidak dari Subscription legacy. Uji coba Umum hanya bila trialPlan cocok
  // (trial guru tidak pernah membuka Premium Umum, dan sebaliknya).
  const umumPaid = role === "UMUM" && !revoked && user.isPremium === true && user.premiumPlan !== "FREE" && future(user.premiumUntil);
  const umumTrial = role === "UMUM" && !umumPaid && user.trialPlan === UMUM_TRIAL_PLAN && future(user.trialEndsAt);
  const staff = founder || role === "ADMIN";
  const badgeKind: IdentityBadge | null = founder ? "founder" : paid ? role === "GURU" ? "teacher" : "student" : umumPaid ? "umum" : trial ? "trial" : null;
  const plan = staff ? "FOUNDER" : paid ? role === "MURID" ? "MURID_PREMIUM" : "PRO" : umumPaid || umumTrial ? "UMUM_PREMIUM" : trial ? "PRO" : "FREE";
  const subscriptionStatus = staff ? "FOUNDER" : paid || umumPaid ? "ACTIVE" : trial || umumTrial ? "TRIALING" : null;
  return { badgeKind, isPremium: paid || umumPaid, plan, subscriptionStatus } as const;
}

export function normalizedIdentity<T extends IdentitySource>(user: T) {
  const resolved = resolveIdentity(user);
  const active = user.subscriptions?.filter(s => s.status === "ACTIVE" && new Date(s.currentPeriodEnd) > new Date() && (!s.currentPeriodStart || new Date(s.currentPeriodStart) <= new Date())).sort((a,b) => new Date(b.currentPeriodEnd).getTime() - new Date(a.currentPeriodEnd).getTime())[0];
  return { ...user, ...resolved, premiumPlan: (resolved.isPremium ? "PRO" : "FREE") as "PRO" | "FREE", premiumUntil: active ? new Date(active.currentPeriodEnd) : user.premiumUntil ? new Date(user.premiumUntil) : null };
}
