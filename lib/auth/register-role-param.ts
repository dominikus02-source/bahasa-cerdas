/**
 * UI-only parser for /register?role=umum|murid|guru.
 *
 * This MUST NOT be used to provision accounts or seal a Google role-intent
 * cookie. Query params are not a trusted source of role (see role-intent.ts).
 * The register wizard only uses this to preselect the role card; the user can
 * still change it, and Google signup still goes through /api/auth/role-intent
 * after an explicit choice.
 */
export type RegisterRoleParam = "GURU" | "MURID" | "UMUM";

export function parseRegisterRoleParam(
  raw: string | null | undefined,
): RegisterRoleParam | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "guru") return "GURU";
  if (value === "murid") return "MURID";
  if (value === "umum") return "UMUM";
  return null;
}
