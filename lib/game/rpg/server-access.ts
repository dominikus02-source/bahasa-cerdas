/** Server-only access boundary shared by non-public Pendekar preview routes. */

import { gameById } from "@/lib/arena/game-registry";
import {
  canUseRpgFounderPreview,
  currentRpgPreviewEnvironment,
} from "@/lib/arena/rpg-founder-preview";
import { resolvePlan } from "@/lib/premium-economy/plans";
import { getUser } from "@/lib/supabase/server";
import type { PendekarActionError } from "./server-contracts";

export type RpgPreviewApiAccess =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 404; error: PendekarActionError };

/**
 * Keep API exposure identical to the hidden founder-preview page: a verified
 * user, explicit non-production preview opt-in, founder/admin or allowlist,
 * and an RPG registry entry that is still unpublished.
 */
export async function requireRpgFounderPreviewApiAccess(): Promise<RpgPreviewApiAccess> {
  const user = await getUser();
  if (!user) {
    return { ok: false, status: 401, error: { code: "UNAUTHENTICATED", message: "Authentication is required" } };
  }

  const decision = canUseRpgFounderPreview(user, currentRpgPreviewEnvironment());
  if (!decision.allowed) {
    return { ok: false, status: 403, error: { code: "PREVIEW_DENIED", message: "RPG founder preview is not available" } };
  }

  const game = gameById("rpg");
  if (!game || !game.unpublished) {
    return { ok: false, status: 404, error: { code: "PREVIEW_DENIED", message: "RPG preview is unavailable" } };
  }
  return { ok: true, userId: user.id };
}

/**
 * P2.8 — server-authoritative play gate for published Pendekar Suryakerta
 * (Premium Early Access).
 *
 * Allow:
 * - founder-preview path (non-prod allowlist; preserves manual preview), OR
 * - published game + canonical premium plan (MURID_PREMIUM / PRO / FOUNDER
 *   via `resolvePlan` — no duplicated entitlement logic).
 *
 * Deny (fail closed): unauthenticated → 401; unpublished game → 404;
 * published but FREE plan → 403 PREMIUM_REQUIRED.
 *
 * userId always derives from the verified server session — never from
 * client input. All gameplay API routes must use this gate.
 */
export async function requireRpgPlayAccess(): Promise<RpgPreviewApiAccess> {
  const user = await getUser();
  if (!user) {
    return { ok: false, status: 401, error: { code: "UNAUTHENTICATED", message: "Authentication is required" } };
  }

  const preview = canUseRpgFounderPreview(user, currentRpgPreviewEnvironment());
  if (preview.allowed) {
    return { ok: true, userId: user.id };
  }

  const game = gameById("rpg");
  if (!game || game.unpublished) {
    return { ok: false, status: 404, error: { code: "PREVIEW_DENIED", message: "RPG is unavailable" } };
  }

  const { plan } = await resolvePlan(user.id);
  if (plan === "MURID_PREMIUM" || plan === "PRO" || plan === "FOUNDER") {
    return { ok: true, userId: user.id };
  }
  return { ok: false, status: 403, error: { code: "PREMIUM_REQUIRED", message: "Pendekar Suryakerta tersedia khusus untuk Murid Premium." } };
}
