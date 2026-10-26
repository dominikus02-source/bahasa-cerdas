/**
 * Canonical post-auth destination helpers.
 *
 * CLIENT-SAFE: no Node.js imports — usable from Server Components, Route
 * Handlers, AND client components (login page, landing redirect).
 *
 * PRODUCT RULES:
 * - Authenticated users never land on the public landing page ("/") after
 *   successful auth; they go to their canonical role dashboard.
 * - A safe, specific `next` is still honored (deep links preserved).
 * - `next="/"` resolves to the role dashboard (landing is not an
 *   authenticated destination).
 * - Open-redirect protection unchanged: only same-origin paths, never
 *   protocol-relative, never back into /login or /register.
 */

import { dashboardForRole } from "@/lib/auth/roles";

/** Role-based dashboard destination (canonical, do not invent new paths).
 * Implementasi tinggal di lib/auth/roles.ts (allowlist eksplisit: GURU,
 * MURID, ADMIN, UMUM; peran tak dikenal → halaman akses ditolak). Diekspor
 * ulang di sini agar import lama tetap berlaku (nama tidak diubah). */
export { dashboardForRole };

/** User-aware dashboard destination.
 *
 * Founder is a privileged teacher account: the working home is always the
 * Guru dashboard. Admin stays available as an explicit cross-context choice.
 */
export function dashboardForUser(role: string, isFounder: boolean): string {
  if (isFounder) return "/guru/beranda";
  return dashboardForRole(role);
}

/** Validate an internal `next` redirect (mirrors login/callback guards). */
export function isSafeNext(next: string | null | undefined): boolean {
  if (!next) return false;
  return (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/login") &&
    !next.startsWith("/register")
  );
}

/**
 * Single converged post-auth destination.
 * Safe specific `next` wins; "/" (or missing/unsafe `next`) falls back to the
 * canonical role dashboard — never the public landing page.
 */
export function resolvePostAuthDestination(role: string, next: unknown): string {
  if (typeof next === "string" && next !== "/" && isSafeNext(next)) return next;
  return dashboardForRole(role);
}

/** Founder-aware variant for all real user login flows. */
export function resolvePostAuthDestinationForUser(
  role: string,
  isFounder: boolean,
  next: unknown,
): string {
  if (typeof next === "string" && next !== "/" && isSafeNext(next)) return next;
  return dashboardForUser(role, isFounder);
}
