/**
 * Server-side authorization contract for the unpublished RPG founder preview.
 *
 * This module intentionally accepts only a server-resolved Prisma user and
 * server environment. It never reads query parameters, request headers, or
 * browser storage, and must never be imported by a client component.
 */

export interface RpgPreviewUser {
  id: string;
  role: string;
  isFounder: boolean;
}

export interface RpgPreviewEnvironment {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  RPG_FOUNDER_PREVIEW_ENABLED?: string;
  RPG_FOUNDER_PREVIEW_USER_IDS?: string;
}

export type RpgPreviewDeniedReason =
  | "UNAUTHENTICATED"
  | "PREVIEW_DISABLED"
  | "PRODUCTION"
  | "UNKNOWN_ENVIRONMENT"
  | "NOT_AUTHORIZED";

export type RpgPreviewDecision =
  | { allowed: true }
  | { allowed: false; reason: RpgPreviewDeniedReason };

function allowlistedUserIds(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/**
 * Only an explicit opt-in can enable the preview. Vercel preview deployments
 * are allowed; local development is allowed only when VERCEL_ENV is absent.
 * Any other deployment signal fails closed.
 */
export function isAllowedRpgPreviewEnvironment(env: RpgPreviewEnvironment):
  | { allowed: true }
  | { allowed: false; reason: "PREVIEW_DISABLED" | "PRODUCTION" | "UNKNOWN_ENVIRONMENT" } {
  if (env.RPG_FOUNDER_PREVIEW_ENABLED !== "true") {
    return { allowed: false, reason: "PREVIEW_DISABLED" };
  }

  if (env.VERCEL_ENV === "production") {
    return { allowed: false, reason: "PRODUCTION" };
  }

  if (env.VERCEL_ENV === "preview") {
    return { allowed: true };
  }

  if (!env.VERCEL_ENV && env.NODE_ENV === "development") {
    return { allowed: true };
  }

  return { allowed: false, reason: "UNKNOWN_ENVIRONMENT" };
}

/**
 * Founder/admin is the existing stable authorization primitive. A deployment
 * may additionally grant a named internal developer by listing that Prisma
 * User.id in the server-only comma-separated allowlist.
 */
export function canUseRpgFounderPreview(
  user: RpgPreviewUser | null,
  env: RpgPreviewEnvironment,
): RpgPreviewDecision {
  if (!user) return { allowed: false, reason: "UNAUTHENTICATED" };

  const environment = isAllowedRpgPreviewEnvironment(env);
  if (!environment.allowed) return environment;

  const isFounderOrAdmin = user.isFounder || user.role === "ADMIN";
  const isAllowlisted = allowlistedUserIds(env.RPG_FOUNDER_PREVIEW_USER_IDS).has(user.id);
  if (!isFounderOrAdmin && !isAllowlisted) {
    return { allowed: false, reason: "NOT_AUTHORIZED" };
  }

  return { allowed: true };
}

/** Read only non-public environment variables at the server route boundary. */
export function currentRpgPreviewEnvironment(): RpgPreviewEnvironment {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    RPG_FOUNDER_PREVIEW_ENABLED: process.env.RPG_FOUNDER_PREVIEW_ENABLED,
    RPG_FOUNDER_PREVIEW_USER_IDS: process.env.RPG_FOUNDER_PREVIEW_USER_IDS,
  };
}
