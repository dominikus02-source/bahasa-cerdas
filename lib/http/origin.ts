import type { NextRequest } from "next/server";

/**
 * Public origins of the production site. Browsers on these pages are the only
 * ones allowed to call cookie-authenticated account mutations in production.
 */
export const PRODUCTION_ORIGINS = ["https://www.bahasacerdas.com", "https://bahasacerdas.com"] as const;

const CONFIGURED_ORIGIN_ENV = ["NEXT_PUBLIC_APP_URL", "APP_URL", "NEXT_PUBLIC_SITE_URL"] as const;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

type Env = Record<string, string | undefined>;
type OriginRequest = Pick<NextRequest, "headers" | "nextUrl">;

function isProduction(env: Env) { return env.NODE_ENV === "production"; }

/** Normalizes a URL-ish value to its origin; rejects credentials, opaque and non-http(s) values. */
export function normalizeOrigin(value: string | null | undefined, allowHttp = true): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return null;
    if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) return null;
    return url.origin;
  } catch { return null; }
}

function firstHeaderValue(value: string | null) {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

/**
 * Origin the browser addressed, reconstructed from the reverse proxy headers.
 * A standalone server bound to HOSTNAME=0.0.0.0 reports `https://0.0.0.0:3000`
 * as `req.nextUrl.origin`, so that value is only a last resort.
 */
export function forwardedOrigin(req: OriginRequest): string | null {
  const proto = firstHeaderValue(req.headers.get("x-forwarded-proto"))?.replace(/:$/, "").toLowerCase() ?? req.nextUrl.protocol.replace(/:$/, "");
  const host = firstHeaderValue(req.headers.get("x-forwarded-host")) ?? firstHeaderValue(req.headers.get("host"));
  if (!host || (proto !== "http" && proto !== "https") || /[/\\@?#\s]/.test(host)) return null;
  return normalizeOrigin(`${proto}://${host}`);
}

/** Origins from deployment settings plus the production domains. */
export function configuredOrigins(env: Env = process.env): string[] {
  const production = isProduction(env);
  const origins = new Set<string>(PRODUCTION_ORIGINS);
  for (const key of CONFIGURED_ORIGIN_ENV) {
    const origin = normalizeOrigin(env[key], true);
    // Plain http is accepted in production only for a loopback app URL (local standalone QA).
    if (origin && (!production || origin.startsWith("https://") || LOOPBACK_HOSTS.has(new URL(origin).hostname))) origins.add(origin);
  }
  return [...origins];
}

function isLoopbackOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try { return LOOPBACK_HOSTS.has(new URL(origin).hostname); } catch { return false; }
}

/**
 * Exact-match allowlist for the request. Request-derived origins (Host or
 * forwarded headers) never extend it in production; in development the
 * server's own loopback origin is allowed so `next dev` keeps working.
 */
export function allowedOrigins(req: OriginRequest, env: Env = process.env): Set<string> {
  const allowed = new Set(configuredOrigins(env));
  if (!isProduction(env)) {
    allowed.add(req.nextUrl.origin);
    const forwarded = forwardedOrigin(req);
    if (isLoopbackOrigin(forwarded)) allowed.add(forwarded);
  }
  return allowed;
}

/** True only when the Origin header exactly matches an allowlisted origin. */
export function isAllowedOrigin(req: OriginRequest, env: Env = process.env): boolean {
  const raw = req.headers.get("origin");
  const origin = normalizeOrigin(raw);
  // Reject "null", paths, credentials and anything that is not already a bare origin.
  if (!origin || origin !== raw) return false;
  return allowedOrigins(req, env).has(origin);
}

/**
 * Public origin for absolute links (e.g. email redirect URLs). Never returns the
 * server's bind address in production.
 */
export function publicOrigin(req: OriginRequest, env: Env = process.env): string {
  for (const key of CONFIGURED_ORIGIN_ENV) {
    const origin = normalizeOrigin(env[key], !isProduction(env));
    if (origin) return origin;
  }
  const allowed = allowedOrigins(req, env);
  const forwarded = forwardedOrigin(req);
  if (forwarded && allowed.has(forwarded)) return forwarded;
  return isProduction(env) ? PRODUCTION_ORIGINS[0] : req.nextUrl.origin;
}
