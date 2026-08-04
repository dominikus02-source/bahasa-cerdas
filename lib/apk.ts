import { cookies } from "next/headers";

// Name of the marker cookie. Middleware sets it; `isApk()` below reads it.
// Kept as a shared constant so the two never drift apart.
export const APK_COOKIE = "bc_apk";

// True when the request comes from the Arena Android app (TWA), as opposed to a
// browser tab or an installed PWA.
//
// `(display-mode: standalone)` cannot make this distinction — an installed PWA
// reports standalone too — so the APK identifies itself instead: its startUrl
// carries `?src=apk`, which middleware promotes to a cookie on first launch so
// every later navigation still knows it is inside the app shell.
export async function isApk(): Promise<boolean> {
  return (await cookies()).get(APK_COOKIE)?.value === "1";
}
