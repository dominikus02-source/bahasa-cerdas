import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/client";

/**
 * Browser Storage client. Its endpoint is independent from the Auth endpoint;
 * access tokens are obtained from the Auth client so cookies/session ownership
 * remains with the Auth-only client.
 */
export function getStorageUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    null
  );
}

export function createStorageClient(): SupabaseClient {
  const url = getStorageUrl();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("Supabase Storage is not configured");

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
