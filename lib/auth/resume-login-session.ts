import { resolvePostAuthDestinationForUser } from "@/lib/auth/redirect";

/** Resume only a server-verified existing session, never local JWT/role metadata.
 * The native shell cold-starts at /login even when WebView cookies still exist.
 * /api/user/me?fresh=1 verifies/refreshes those cookies through the normal SSR path.
 * No session, logout, network failure or explicit OAuth/recovery feedback => stay on login.
 */
export async function resumeLoginSession({
  search, arenaEntry, signal, fetcher = fetch,
}: {
  search: string;
  arenaEntry: boolean;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<string | null> {
  const params = new URLSearchParams(search);
  if (["error", "reset", "code", "token_hash", "type", "logged_out"].some((key) => params.has(key))) return null;
  try {
    const response = await fetcher("/api/user/me?fresh=1", {
      credentials: "same-origin", cache: "no-store", signal,
    });
    if (!response.ok || signal.aborted) return null;
    const payload = await response.json();
    const user = payload?.user;
    if (signal.aborted || payload?.success !== true || !user ||
      typeof user.isFounder !== "boolean" ||
      !["MURID", "GURU", "UMUM", "ADMIN"].includes(user.role)) return null;
    // Same role gate as password login on /arena/login; never route a regular teacher into Arena.
    if (arenaEntry && !user.isFounder && !["MURID", "UMUM"].includes(user.role)) return null;
    const next = params.get("next") || (arenaEntry && user.role !== "UMUM" ? "/arena" : "");
    // Avoid resuming back to an auth entry (including Arena's aliases).
    const safeNext = /^\/(?:arena\/|auth\/)?(?:login|register|arena-login)(?:[/?#]|$)/.test(next) ? "" : next;
    return resolvePostAuthDestinationForUser(user.role, user.isFounder, safeNext);
  } catch {
    // A failed probe must not erase cookies, sign out, or turn into a redirect loop.
    return null;
  }
}
