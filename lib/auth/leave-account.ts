import { createClient } from "@/lib/supabase/client";

export const LOGGED_OUT_PARAM = "logged_out";

export function pathAfterLogout(to = "/login"): string {
  const path = to.startsWith("/") && !to.startsWith("//") ? to : "/login";
  const url = new URL(path, "https://bahasacerdas.com");
  url.searchParams.set(LOGGED_OUT_PARAM, "1");
  return `${url.pathname}${url.search}`;
}

export function clearBrowserAuthCookies(): void {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name.startsWith("sb-") || name.startsWith("supabase-"));
  const host = typeof location !== "undefined" ? location.hostname : "";
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.bahasacerdas.com`;
    if (host) document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}`;
  }
}

export async function leaveAccount(
  to = "/login",
  hooks?: {
    fetch?: typeof fetch;
    signOut?: () => Promise<unknown>;
    clearCookies?: () => void;
    navigate?: (path: string) => void;
  },
): Promise<void> {
  const doFetch = hooks?.fetch ?? fetch;
  try {
    await doFetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    // Still drop local cookies and leave the page.
  }
  try {
    if (hooks?.signOut) await hooks.signOut();
    else await createClient().auth.signOut({ scope: "local" });
  } catch {
    // Server Set-Cookie plus the explicit clear below still log the user out.
  }
  (hooks?.clearCookies ?? clearBrowserAuthCookies)();
  const destination = pathAfterLogout(to);
  if (hooks?.navigate) hooks.navigate(destination);
  else window.location.replace(destination);
}
