import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getStorageAdminConfig } from "@/lib/supabase/storage-config";

export function createStorageAdminClient(): SupabaseClient {
  const config = getStorageAdminConfig();
  if (!config) throw new Error("Supabase Storage admin credentials are not configured");

  return createSupabaseClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
