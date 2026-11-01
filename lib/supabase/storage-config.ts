/**
 * Split endpoint resolution.
 * If Auth has been separated, Storage MUST also have explicit staging
 * endpoints and credentials. Never fall back to the legacy shared URL/key in
 * that mode, because it may still point at production.
 */
const hasDedicatedAuth = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL);

export function getStorageUrl(): string | null {
  const dedicated =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL ||
    process.env.SUPABASE_STORAGE_URL;
  if (dedicated) return dedicated;
  if (hasDedicatedAuth()) return null;
  return process.env.NEXT_PUBLIC_SUPABASE_URL || null;
}

export function getStorageAnonKey(): string | null {
  const dedicated = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ANON_KEY;
  if (dedicated) return dedicated;
  if (hasDedicatedAuth()) return null;
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    null;
}

export function getStorageAdminConfig(): { url: string; serviceKey: string } | null {
  const dedicatedUrl =
    process.env.SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;
  const url = getStorageUrl();
  const serviceKey = dedicatedUrl
    ? process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY
    : hasDedicatedAuth()
      ? undefined
      : process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}
