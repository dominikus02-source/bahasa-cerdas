import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

export function getStorageAdminConfig(): { url: string; serviceKey: string } | null {
  const dedicatedUrl =
    process.env.SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;
  const url =
    dedicatedUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    null;

  // Dedicated Storage endpoints must have their own elevated credential.
  // Never reuse an Auth service key across separate project boundaries.
  const serviceKey = dedicatedUrl
    ? process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SERVICE_ROLE_KEY;

  return url && serviceKey ? { url, serviceKey } : null;
}

export function createStorageAdminClient(): SupabaseClient {
  const config = getStorageAdminConfig();
  if (!config) throw new Error("Supabase Storage admin credentials are not configured");

  return createSupabaseClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
