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
  "npc.ki-jaka":          "npc_ki_jaka_v2",  // verified READY runtime idle sprite
  "npc.bu-ratmi":         "npc_bu_ratmi_v2",
  "npc.bu-sari":          "npc_bu_sari_v2",
  "npc.eyang-kartala":    "npc_eyang_kartala_v2",
  "npc.pak-empu":         "npc_pak_empu_v2",
  "npc.bagas":            "npc_bagas_v2",
  "npc.pak-warsa":        "npc_tani_v2",
  "npc.tani":            "npc_tani",
  "npc.pendaki":          "npc_pendaki_v2",

  // Enemies
  "enemy.korog":          "enemy_korog_v2",
  "enemy.korog-perang":   "enemy_korog_perang_v2",
  "enemy.korog-bayangan": "enemy_korog_bayangan_v2",
  "enemy.golem-batu":     "enemy_golem_batu_v2",

  // Bosses
  "enemy.raja-korog":     "boss_raja_korog_v2",
  "enemy.golem-agung":    "boss_golem_agung_v2",
  "enemy.naga-abu":       "boss_naga_abu_v2",
  "enemy.penguasa-menara": "boss_penguasa_menara_v2",

  // P2.11: production prop crops from the canonical visual reference sheet.
  "house.village": "prop_house_village",
  "tree.round": "prop_tree_round",
  "well.stone": "prop_well",
  "bamboo.grove": "prop_bamboo_grove",
  "shrine.gate": "prop_shrine_gate",
  "lantern.stone": "prop_lantern",
  "bridge.wood": "prop_wooden_bridge",
  "banner.village": "prop_banner",
  "bush": "prop_bush_01",
  "rock": "prop_rock_01",
  "flowers": "prop_flower_patch",
  "fence": "prop_fence_01",
  "grass.clump": "prop_grass_clump",
  "grass.tall": "prop_grass_tall",
  "stump": "prop_stump",
  "village.sign": "prop_village_sign",
  "bench": "prop_bench",
  "lantern.small": "prop_lantern_small",
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
