/** Canonical allowlist for the five named BahasaCerdas founders. */
export const FOUNDER_DASHBOARD_EMAILS: readonly string[] = [
  "dominikus.02@gmail.com",
  "alexsurya1968@gmail.com",
  "wwidharyanto@gmail.com",
  "srphysics04@gmail.com",
  "solehahmadnugraha@yahoo.com",
];

export function canUseFounderDashboardSwitcher(user: {
  email?: string | null;
  isFounder?: boolean | null;
} | null | undefined): boolean {
  if (!user || user.isFounder !== true || !user.email) return false;
  return FOUNDER_DASHBOARD_EMAILS.includes(user.email.trim().toLowerCase());
}
