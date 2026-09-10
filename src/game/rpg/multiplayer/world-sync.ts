/**
 * World sync boundary.
 *
 * PHASE 0: defines how remote clients receive world entity deltas. Real
 * delta-compression arrives with the transport; the snapshot contract is
 * fixed now so rendering can build against it.
 */

import type { RPGWorldEntity } from "../world/world-state";

/** Full or delta snapshot of world entities. */
export interface RPGWorldSnapshot {
  /** Server tick or lamport clock when available. */
  revision: number;
  entities: RPGWorldEntity[];
}

export type RPGWorldSyncHandler = (snapshot: RPGWorldSnapshot) => void;
