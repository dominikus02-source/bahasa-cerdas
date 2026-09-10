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
  /** Asset key resolved by the renderer. */
  asset: string;
  /** Learning skill tags this enemy's challenges draw from. */
  skillTags: string[];
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
