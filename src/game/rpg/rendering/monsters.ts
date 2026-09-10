/**
 * Monster rendering boundary.
 *
 * PHASE 0: maps battle/world enemy data to render descriptors. Visual asset
 * keys come from data (data/enemies.ts); this module never hardcodes art.
 */

import type { RPGId } from "../core/constants";
import type { RPGBattleActor } from "../combat/battle-state";

export interface RPGMonsterRenderDescriptor {
  id: RPGId;
  /** Resolved by renderer → asset registry; swap data without touching this file. */
  assetKey: string;
  hp: number;
  maxHp: number;
}

export function toMonsterDescriptor(actor: RPGBattleActor, assetKey: string): RPGMonsterRenderDescriptor {
  return { id: actor.id, assetKey, hp: actor.hp, maxHp: actor.maxHp };
}
