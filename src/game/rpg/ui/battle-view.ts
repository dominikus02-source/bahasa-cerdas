/**
 * Battle view model — Pendekar Suryakerta (P1.9C).
 *
 * Pure projection of authoritative battle snapshots into render data.
 * No HP/damage/XP math here (battle-core owns it); no React/DOM.
 * Directly unit-tested; the component renders whatever this returns.
 */

import type { RPGBattleState } from "../combat/battle-state";
import { SKILLS, CANONICAL_SKILLS, isSkillUnlocked } from "../data/skills";
import { canonicalItemById } from "../data/items";

export interface BattleSkillView {
  id: string;
  name: string;
  mpCost: number;
  unlocked: boolean;
  affordable: boolean;
}

export interface BattleItemView {
  id: string;
  name: string;
  quantity: number;
}

export interface BattleViewModel {
  inBattle: boolean;
  phase: string;
  turn: number;
  enemyName: string;
  enemyAsset: string | null;
  enemyHp: number;
  enemyMaxHp: number;
  isBoss: boolean;
  enemiesAlive: number;
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  canFlee: boolean;
  skills: BattleSkillView[];
  items: BattleItemView[];
}

/** Canonical battle consumables for the BARANG menu (prototype verbatim). */
const BATTLE_CONSUMABLES = ["ram", "teh", "elix"] as const;

export function resolveBattleView(args: {
  battle: RPGBattleState | null;
  playerLevel: number;
  inventory: Array<{ itemId: string; quantity: number }>;
}): BattleViewModel | null {
  const { battle } = args;
  if (!battle) return null;
  const foe = battle.enemies.find((e) => e.hp > 0) ?? battle.enemies[0];
  const skills: BattleSkillView[] = [...SKILLS, ...CANONICAL_SKILLS].map((s) => ({
    id: s.id,
    name: s.name,
    mpCost: s.mpCost ?? s.cost ?? 0,
    unlocked: isSkillUnlocked(s, args.playerLevel),
    affordable: (battle.player.mp ?? 0) >= (s.mpCost ?? s.cost ?? 0),
  }));
  const items: BattleItemView[] = BATTLE_CONSUMABLES.flatMap((id) => {
    const qty = args.inventory.find((i) => i.itemId === id)?.quantity ?? 0;
    if (qty <= 0) return [];
    const def = canonicalItemById(id);
    return [{ id, name: def?.name ?? id, quantity: qty }];
  });
  return {
    inBattle: true,
    phase: battle.phase,
    turn: battle.turn,
    enemyName: foe?.name ?? "-",
    enemyAsset: foe?.asset ?? null,
    enemyHp: foe?.hp ?? 0,
    enemyMaxHp: foe?.maxHp ?? 0,
    isBoss: foe?.boss === true,
    enemiesAlive: battle.enemies.filter((e) => e.hp > 0).length,
    playerHp: battle.player.hp,
    playerMaxHp: battle.player.maxHp,
    playerMp: battle.player.mp ?? 0,
    playerMaxMp: battle.player.maxMp ?? 0,
    canFlee: !battle.enemies.some((e) => e.hp > 0 && e.boss === true),
    skills,
    items,
  };
}
