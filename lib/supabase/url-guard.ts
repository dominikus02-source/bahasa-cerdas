// Shared guard for Supabase URL env vars.
//
// Local development runs with masked placeholders (opencode secret-masking writes
// literal `[SENSITIVE]` into .env.local) or with env vars simply unset. Calling
// createServerClient/createBrowserClient with such values throws synchronously
// ("Invalid supabaseUrl") in middleware and in browser code, which turns plain
// local-render mistakes into hard 500s. All Supabase client constructors in this
// project should consult isValidSupabaseUrl() first and degrade gracefully.

export function isValidSupabaseUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" || url.protocol === "http:";
}