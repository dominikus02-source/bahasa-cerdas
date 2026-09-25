/**
 * Combat-side enemy boundary.
 *
 * Enemy DEFINITIONS (content) live in `data/enemies.ts`; this module owns the
 * runtime bridge from definitions to battle actors — the seam where level
 * scaling and spawn composition will plug in.
 */

import type { RPGBattleActor } from "./battle-state";
import type { RPGEnemyDefinition } from "../data/enemies";
import type { RPGId } from "../core/constants";

/** Build a battle actor from a definition. Scaling logic lands in the combat phase. */
export function toBattleActor(def: RPGEnemyDefinition, id: RPGId): RPGBattleActor {
  return {
    id,
    name: def.name,
    asset: def.asset,
    hp: def.base.hp,
    maxHp: def.base.hp,
    attack: def.base.attack,
    defense: def.base.defense,
  };
}
