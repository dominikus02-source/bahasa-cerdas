import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getStorageUrl } from "@/lib/supabase/storage-config";
import { createClient as createAuthClient } from "@/lib/supabase/client";

/** Browser Storage client uses a separate endpoint and Auth-owned access token. */
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
