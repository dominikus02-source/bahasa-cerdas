/**
 * Entity asset resolver — Pendekar Suryakerta (P2.9B).
 *
 * Canonical bridge between entity data and the existing asset manifest/loader.
 * Entities carry an `asset` field (e.g., "house.village", "npc.ki-jaka") that
 * this resolver maps to manifest entries. The renderer checks the resolved status
 * before choosing between sprite rendering and procedural fallback.
 *
 * RULES:
 * - READY → may load and render as sprite.
 * - NEEDS_REVIEW → must NOT render as production sprite. Use procedural fallback.
 * - MISSING / NOT_REGISTERED → explicit procedural fallback + diagnostic.
 * - Never silently substitute unrelated assets.
 */

import { manifestLookup, type RpgAssetEntry, type RpgAssetStatus } from "./rpg-asset-manifest";

/** Resolution result for an entity asset. */
export type EntityAssetResolution =
  | { status: "READY"; entry: RpgAssetEntry; path: string }
  | { status: "NEEDS_REVIEW"; entry: RpgAssetEntry }
  | { status: "NOT_REGISTERED"; assetKey: string }
  | { status: "MISSING_MANIFEST"; assetKey: string };

/**
 * Canonical entity asset key mapping.
 * Maps entity `asset` field values to manifest entry IDs.
 * Keys are stable and must not change without migration.
 */
const ENTITY_ASSET_MAP: Record<string, string> = {
  // NPCs
  "npc.ki-jaka":          "npc_ki_jaka_idle",  // P2.9C: READY runtime sprite
  "npc.bu-ratmi":         "ref:npc-bu-ratmi",
  "npc.bu-sari":          "ref:npc-bu-sari",
  "npc.eyang-kartala":    "ref:npc-eyang-kartala",
  "npc.pak-empu":         "ref:npc-pak-empu",

  // Enemies
  "enemy.korog":          "ref:monster-korog",
  "enemy.korog-perang":   "ref:monster-korog-perang",
  "enemy.korog-bayangan": "ref:monster-korog-bayangan",
  "enemy.golem-batu":     "ref:monster-golem-batu",

  // Bosses
  "enemy.raja-korog":     "ref:boss-raja-korog",
  "enemy.golem-agung":    "ref:boss-golem-agung",
  "enemy.naga-abu":       "ref:boss-naga-abu",
  "enemy.penguasa-menara": "ref:boss-penguasa-menara",

  // Props — NO individual prop sprites exist on disk. These keys are registered
  // for future use when prop art is produced. Until then, NOT_REGISTERED → procedural fallback.
  // "house.village":     "ref:prop-house-village",   // no manifest entry
  // "tree.round":        "ref:prop-tree-round",       // no manifest entry
  // "rock.gray":         "ref:prop-rock-gray",        // no manifest entry
  // "fence.wood":        "ref:prop-fence-wood",       // no manifest entry
  // "bush.round":        "ref:prop-bush-round",       // no manifest entry
  // "flowers.wild":      "ref:prop-flowers-wild",     // no manifest entry
};

/**
 * Resolve an entity's asset field to a manifest entry.
 * Returns the resolution status — NEVER silently substitutes.
 */
export function resolveEntityAsset(assetKey: string | undefined): EntityAssetResolution {
  if (!assetKey) {
    return { status: "MISSING_MANIFEST", assetKey: "(empty)" };
  }

  const manifestId = ENTITY_ASSET_MAP[assetKey];
  if (!manifestId) {
    return { status: "NOT_REGISTERED", assetKey };
  }

  const entry = manifestLookup(manifestId);
  if (!entry) {
    return { status: "MISSING_MANIFEST", assetKey: manifestId };
  }

  if (entry.status === "READY") {
    return { status: "READY", entry, path: entry.path };
  }

  // NEEDS_REVIEW, REFERENCE_ONLY, MISSING — all fall back to procedural.
  return { status: "NEEDS_REVIEW", entry };
}

/**
 * Check if an entity asset resolution allows sprite rendering.
 * Only READY assets may be rendered as production sprites.
 */
export function isEntityAssetReady(resolution: EntityAssetResolution): resolution is
  Extract<EntityAssetResolution, { status: "READY" }> {
  return resolution.status === "READY";
}

/**
 * Get all registered entity asset keys (for testing/diagnostics).
 */
export function getRegisteredEntityAssetKeys(): string[] {
  return Object.keys(ENTITY_ASSET_MAP);
}

/**
 * Get the manifest ID for an entity asset key (for testing/diagnostics).
 */
export function getManifestIdForEntity(assetKey: string): string | undefined {
  return ENTITY_ASSET_MAP[assetKey];
}
