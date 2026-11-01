import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/client";

/**
 * Storage has its own endpoint so a GoTrue-only Auth URL is never used for
 * object operations. In production, where no dedicated Storage URL is set,
 * the existing Supabase project URL/key remain the backwards-compatible path.
 */
export function getStorageUrl(): string | null {
  return (
    process.env.SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    null
  );
}

export function getStorageAdminConfig(): { url: string; serviceKey: string } | null {
  const dedicatedUrl =
    process.env.SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;
  const url = getStorageUrl();

  // If a dedicated Storage endpoint is configured, require its own service
  // credential. Never fall back to an Auth service key across project bounds.
  const serviceKey = dedicatedUrl
    ? process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SERVICE_ROLE_KEY;

  return url && serviceKey ? { url, serviceKey } : null;
}

/** Browser Storage client reuses the access token from the Auth-only client. */
export function createStorageClient(): SupabaseClient {
  const url = getStorageUrl();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase Storage is not configured");
  }

  const auth = createAuthClient();
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => {
      const { data, error } = await auth.auth.getSession();
      if (error) throw error;
      return data.session?.access_token ?? null;
    },
  });
}

/** Server-only elevated Storage client; never expose its key to the browser. */
export function createStorageAdminClient(): SupabaseClient {
  const config = getStorageAdminConfig();
  if (!config) {
    throw new Error("Supabase Storage admin credentials are not configured");
  }

  return createSupabaseClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
