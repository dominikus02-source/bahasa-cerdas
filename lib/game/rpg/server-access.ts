/** Server-only access boundary shared by non-public Pendekar preview routes. */

import { gameById } from "@/lib/arena/game-registry";
import {
  canUseRpgFounderPreview,
  currentRpgPreviewEnvironment,
} from "@/lib/arena/rpg-founder-preview";
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
