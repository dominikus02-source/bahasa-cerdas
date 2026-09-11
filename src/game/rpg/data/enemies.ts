/**
 * Enemy data — data-driven enemy definitions.
 *
 * Combat numbers are data so tuning never requires code changes. Asset keys
 * are resolved by the renderer.
 */

export interface RPGEnemyDefinition {
  id: string;
  name: string;
  /** Base combat values before level scaling. */
  base: { hp: number; attack: number; defense: number };
  /** Asset key resolved by the renderer (omitted until the art phase). */
  asset?: string;
  /** Learning skill tags this enemy's challenges draw from (unknown → []). */
  skillTags?: string[];
  /** XP awarded on victory (canonical prototype EDEF values). */
  xp?: number;
  /** Gold intent on victory (canonical; application is a later phase). */
  gold?: number;
  /** Bosses cannot be fled from and may use specials. */
  boss?: boolean;
  /** Prototype spawn-type key (g/w/b/gl/sh/ga/na/tw) — lookup aid. */
  prototypeKey?: string;
}

export const ENEMIES: RPGEnemyDefinition[] = [
  {
    id: "enemy.tuyul-malas",
    name: "Tuyul Malas",
    base: { hp: 30, attack: 6, defense: 2 },
    asset: "enemy.tuyul",
    skillTags: ["sinonim"],
  },
  {
    id: "enemy.butabuta",
    name: "Buta-Buta",
    base: { hp: 45, attack: 9, defense: 4 },
    asset: "enemy.buta",
    skillTags: ["ejaan"],
  },
];

/**
 * Canonical prototype enemies — VERBATIM transcription of prototype EDEF
 * (legacy lines 438-447). Ids follow the existing kebab convention;
 * `prototypeKey` matches world-maps.ts spawn types. Spawn coordinates and
 * patrol radii are NOT duplicated here (owned by data/world-maps.ts).
 */
export const CANONICAL_ENEMIES: RPGEnemyDefinition[] = [
  { id: "enemy.korog", name: "Korog", base: { hp: 25, attack: 6, defense: 1 }, xp: 20, gold: 12, prototypeKey: "g" },
  { id: "enemy.korog-perang", name: "Korog Perang", base: { hp: 45, attack: 10, defense: 3 }, xp: 45, gold: 30, prototypeKey: "w" },
  { id: "enemy.raja-korog", name: "RAJA KOROG", base: { hp: 160, attack: 14, defense: 5 }, xp: 200, gold: 0, boss: true, prototypeKey: "b" },
  { id: "enemy.golem-batu", name: "Golem Batu", base: { hp: 90, attack: 13, defense: 7 }, xp: 80, gold: 45, prototypeKey: "gl" },
  { id: "enemy.korog-bayangan", name: "Korog Bayangan", base: { hp: 60, attack: 16, defense: 2 }, xp: 75, gold: 40, prototypeKey: "sh" },
  { id: "enemy.golem-agung", name: "GOLEM AGUNG", base: { hp: 200, attack: 18, defense: 8 }, xp: 220, gold: 150, boss: true, prototypeKey: "ga" },
  { id: "enemy.naga-abu", name: "NAGA ABU", base: { hp: 420, attack: 22, defense: 9 }, xp: 800, gold: 400, boss: true, prototypeKey: "na" },
  { id: "enemy.penguasa-menara", name: "PENGUASA MENARA", base: { hp: 380, attack: 24, defense: 10 }, xp: 600, gold: 300, boss: true, prototypeKey: "tw" },
];

/** Look up a canonical enemy by prototype spawn-type key. */
export function canonicalEnemyByPrototypeKey(key: string): RPGEnemyDefinition | undefined {
  return CANONICAL_ENEMIES.find((e) => e.prototypeKey === key);
}
