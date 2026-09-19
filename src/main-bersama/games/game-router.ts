// ─── Game Router (Tipis) ────────────────────────────────────
// Resolver sederhana untuk dua mode. Bukan plugin framework —
// jangan tambah mode ketiga tanpa keputusan domain.

import type { GameMode } from '../domain/types/session';
import type { GameEngineResult } from '../domain/types/game-engine-result';
import type { GameRoundFacts } from '../contracts/GameRoundFacts';
import type { RoundId } from '../domain/types/ids';
import {
  createJelajahKataState,
  applyJelajahKataRound,
  summarizeJelajahKata,
  type JelajahKataState,
  type JelajahKataSummary,
} from './jelajah-kata/jelajah-kata-engine';
import {
  createKotaCahayaState,
  applyKotaCahayaRound,
  type KotaCahayaState,
  type KotaCahayaConfig,
} from './kota-cahaya/kota-cahaya-engine';

/** Konfigurasi per mode (jelajah tidak butuh config saat ini). */
export type GameModeConfig =
  | { gameMode: 'jelajah-kata'; totalRounds: number }
  | { gameMode: 'kota-cahaya'; kota: KotaCahayaConfig };

export type GameEngineState =
  | { gameMode: 'jelajah-kata'; jelajah: JelajahKataState }
  | { gameMode: 'kota-cahaya'; kota: KotaCahayaState };

export function createGameState(config: GameModeConfig): GameEngineResult<GameEngineState> {
  if (config.gameMode === 'jelajah-kata') {
    if (!Number.isInteger(config.totalRounds) || config.totalRounds <= 0) {
      return { ok: false, code: 'INVALID_GAME_CONFIG' };
    }
    return {
      ok: true,
      value: {
        gameMode: 'jelajah-kata',
        jelajah: createJelajahKataState(config.totalRounds),
      },
    };
  }
  const state = createKotaCahayaState(config.kota);
  if (!state.ok) return state;
  return { ok: true, value: { gameMode: 'kota-cahaya', kota: state.value } };
}

export function applyGameRound(
  state: GameEngineState,
  facts: GameRoundFacts,
): GameEngineResult<{ roundId: RoundId }> {
  if (state.gameMode === 'jelajah-kata') {
    const result = applyJelajahKataRound(state.jelajah, facts);
    if (!result.ok) return result;
    return { ok: true, value: { roundId: result.value.roundId } };
  }
  const result = applyKotaCahayaRound(state.kota, facts);
  if (!result.ok) return result;
  return { ok: true, value: { roundId: result.value.roundId } };
}

export function summarizeGame(state: GameEngineState): JelajahKataSummary | null {
  if (state.gameMode === 'jelajah-kata') return summarizeJelajahKata(state.jelajah);
  return null; // Kota Cahaya tidak punya ranking — misi kolaboratif.
}
