/** Expire Supabase auth cookies with the same Domain the proxy sets in production. */

export const AUTH_COOKIE_PREFIXES = ["sb-", "supabase-"] as const;

export function isAuthCookieName(name: string): boolean {
  return AUTH_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function cookieSuffix(host: string, domain?: string): string {
  const parts = ["Max-Age=0", "Path=/", "SameSite=Lax"];
  if (domain) parts.push(`Domain=${domain}`);
  if (host.includes("bahasacerdas.com")) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Host-only plus Domain=.bahasacerdas.com (when on that site).
 * A host-only expiry cannot delete the domain cookie the proxy writes.
 */
export function authCookieExpireHeaders(names: string[], host: string): string[] {
  const unique = [...new Set(names.filter(isAuthCookieName))];
  const domain = host.includes("bahasacerdas.com") ? ".bahasacerdas.com" : undefined;
  const headers: string[] = [];
  for (const name of unique) {
    headers.push(`${name}=; ${cookieSuffix(host)}`);
    if (domain) headers.push(`${name}=; ${cookieSuffix(host, domain)}`);
  }
  return headers;
}

export function appendAuthCookieExpiry(headers: Headers, names: string[], host: string): void {
  for (const value of authCookieExpireHeaders(names, host)) {
    headers.append("Set-Cookie", value);
  }
}
