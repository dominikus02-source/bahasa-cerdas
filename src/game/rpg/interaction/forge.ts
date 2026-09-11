/**
 * Forge domain — Pendekar Suryakerta (P1.5).
 *
 * Pure validation over the canonical Pak Empu forge rule (prototype
 * shopEmpu forge branch, verbatim): upgrade CURRENT weapon +1 for 100 gold
 * + 1 bijih, cap +5. No React, no DOM, no storage, no network, no RNG.
 *
 * Availability (gold, bijih counts, current plus) arrives as explicit params.
 * The engine currently supplies 0/empty (no spendable economy yet), so forge
 * deterministically yields INSUFFICIENT_* until the economy/inventory phase;
 * the intent pipeline is proven by tests with injected values.
 *
 * Output is an INTENT ({weaponId, plus}) — never a mutated equipment object.
 * Production equipment has no plus field yet; inventing plus-variants
 * (e.g. equip.pedang-baja+1) is forbidden, so application stays DEFERRED.
 */

export const FORGE_GOLD_COST = 100;
export const FORGE_BIJIH_COST = 1;
export const FORGE_MAX_PLUS = 5;

export type ForgeRejection =
  | "UNKNOWN_SMITH"
  | "INVALID_WEAPON"
  | "AT_MAX_PLUS"
  | "MISSING_MATERIAL"
  | "INSUFFICIENT_GOLD";

export interface ForgeIntent {
  npcId: string;
  weaponId: string;
  plus: number;
  goldCost: number;
  bijihCost: number;
}

export type ForgeResult =
  | { ok: true; intent: ForgeIntent }
  | { ok: false; reason: ForgeRejection };

/** Active forge session (engine-held, never persisted). */
export interface ForgeSession {
  kind: "FORGE";
  npcId: string;
}

const FORGE_SMITHS: Record<string, true> = { empu: true };

/**
 * Validate a forge request for the player's CURRENT weapon.
 * `currentPlus` is session-supplied (production has no persisted plus yet —
 * documented limitation; cap enforced against the supplied value).
 */
export function validateForge(args: {
  npcId: string;
  weaponId: string;
  currentPlus: number;
  bijihAvailable: number;
  goldAvailable: number;
}): ForgeResult {
  if (!FORGE_SMITHS[args.npcId]) return { ok: false, reason: "UNKNOWN_SMITH" };
  if (!args.weaponId) return { ok: false, reason: "INVALID_WEAPON" };
  if (args.currentPlus >= FORGE_MAX_PLUS) return { ok: false, reason: "AT_MAX_PLUS" };
  if (args.bijihAvailable < FORGE_BIJIH_COST) return { ok: false, reason: "MISSING_MATERIAL" };
  if (args.goldAvailable < FORGE_GOLD_COST) return { ok: false, reason: "INSUFFICIENT_GOLD" };
  return {
    ok: true,
    intent: {
      npcId: args.npcId,
      weaponId: args.weaponId,
      plus: args.currentPlus + 1,
      goldCost: FORGE_GOLD_COST,
      bijihCost: FORGE_BIJIH_COST,
    },
  };
}
