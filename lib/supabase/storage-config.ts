/**
 * Shared environment resolution for the split Auth/Storage topology.
 * Call getStorageAdminConfig only from server-side code.
 */
export function getStorageUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL ||
    process.env.SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    null;
}

export function getStorageAdminConfig(): { url: string; serviceKey: string } | null {
  const dedicatedUrl = process.env.SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;
  const url = dedicatedUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const serviceKey = dedicatedUrl
    ? process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}
