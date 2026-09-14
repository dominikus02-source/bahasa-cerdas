/**
 * BC Agent P6 — founder authorization boundary.
 *
 * Server-side only. The control center treats "Founder" as the canonical
 * identity predicate already used by the repo (`User.isFounder === true`,
 * with `role === "ADMIN"` accepted by the same legacy gate the admin panel
 * uses — see lib/supabase/server.ts requireFounder). Identity always comes
 * from the Supabase session verified server-side; nothing about the caller
 * is ever accepted from the request body (no client userId/role/founderId).
 *
 * The web layer (pages, server actions, API routes) calls these helpers and
 * maps denials to typed results — never silently proceeds on a missing user.
 */

import { getUser } from "@/lib/supabase/server";

export type FounderAccessDeniedReason = "UNAUTHENTICATED" | "NOT_FOUNDER";

export type FounderAccess =
  | { ok: true; userId: string; isFounder: boolean }
  | { ok: false; reason: FounderAccessDeniedReason };

/**
 * Authorize the current session for Agent control data.
 * Resolves identity server-side from the Supabase session (verified JWT)
 * joined to the Prisma User row. The client cannot influence either.
 */
export async function authorizeFounder(): Promise<FounderAccess> {
  const user = await getUser();
  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };
  if (!user.isFounder && user.role !== "ADMIN") return { ok: false, reason: "NOT_FOUNDER" };
  return { ok: true, userId: user.id, isFounder: user.isFounder };
}
