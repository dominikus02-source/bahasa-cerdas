// ─── Game Engine Result ─────────────────────────────────────
// Typed result untuk error game engine yang diharapkan — TIDAK
// throw. Programming invariant mustahil tetap boleh throw.

export type GameEngineErrorCode =
  | 'INVALID_GAME_CONFIG'
  | 'INVALID_ROUND_FACTS'
  | 'ROUND_ALREADY_APPLIED'
  | 'ROUND_OUT_OF_ORDER'
  | 'INVALID_TEAM'
  | 'UNKNOWN_GAME_MODE';

export type GameEngineResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: GameEngineErrorCode };
