import { createBrowserClient } from "@supabase/ssr";
import { isValidSupabaseUrl } from "@/lib/supabase/url-guard";

// Supabase browser client. Keep the return type non-null: ~100 call sites
// across the app destructure `createClient()` directly, so a null-able
// signature would push the masking problem into every caller.
//
// Local development (and CI) often runs with masked placeholder env — opencode
// secret-masking writes literal `[SENSITIVE]` values into .env.local, and
// createBrowserClient() throws synchronously ("Invalid supabaseUrl") on such
// values. Instead of crashing the browser during boot, fall back to a local
// client: every auth call made against it fails to connect and resolves to a
// null session/error, which the existing anonymous-user paths of the app
// already handle (see hooks/useUser.ts, lib/supabase/server.ts).
//
// This fallback can never run in production — real env vars are always present
// there. It exists so local-first development and demos keep rendering.
const FALLBACK_URL = "http://localhost:3000";
const FALLBACK_ANON_KEY = "local-dev-anon-key";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const usable = isValidSupabaseUrl(url) && !!key;
  return createBrowserClient(
    usable ? url! : FALLBACK_URL,
    usable ? key! : FALLBACK_ANON_KEY
  );
}