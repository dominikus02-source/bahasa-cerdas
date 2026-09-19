// ─── Player Repository Contract ─────────────────────────────
// Interface minimum persistence peserta.

import type { PlayerId } from '../../domain/types/ids';
import type { MainPlayer } from '../../domain/entities/player';
import type { PlayerQueryFilter } from './types';

export interface PlayerRepository {
  findById(id: PlayerId): Promise<MainPlayer | null>;
  findBySession(filter: PlayerQueryFilter): Promise<MainPlayer[]>;
  save(player: MainPlayer): Promise<void>;
}
