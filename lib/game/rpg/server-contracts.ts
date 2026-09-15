/**
 * Client-safe contracts for the controlled Pendekar founder preview.
 *
 * These types deliberately exclude a User id, a PendekarPlayer id, RNG state,
 * answer fingerprints, reward receipts, and write authority. They are the
 * only shape that the state projection and battle-start routes return.
 */

export type PendekarActionErrorCode =
  | "INVALID_INPUT"
  | "INVALID_ENCOUNTER"
  | "INVALID_PLAYER_STATE"
  | "ACTIVE_BATTLE_EXISTS"
  | "NO_ELIGIBLE_QUESTION"
  | "LEARNING_NOT_ACTIVE"
  | "LEARNING_EXPIRED"
  | "LEARNING_ALREADY_COMPLETED"
  | "ANSWER_REPLAY_CONFLICT"
  | "QUESTION_NOT_ELIGIBLE"
  | "QUESTION_VERSION_STALE"
  | "BATTLE_NOT_ACTIVE"
  | "BATTLE_EXPIRED"
  | "BATTLE_TERMINAL"
  | "LEARNING_RESULT_REQUIRED"
  | "LEARNING_RESULT_NOT_AUTHORITATIVE"
  | "LEARNING_ALREADY_CONSUMED"
  | "BATTLE_ACTION_REPLAY_CONFLICT"
  | "BATTLE_ACTION_INVALID_STATE"
  | "BATTLE_ACTION_RESOLUTION_FAILED"
  | "BATTLE_REWARD_NOT_ELIGIBLE"
  | "BATTLE_REWARD_INVALID_STATE"
  | "BATTLE_REWARD_REPLAY_CONFLICT"
  | "UNAUTHENTICATED"
  | "PREVIEW_DENIED"
  | "INTERNAL_ERROR";

export type PendekarActionError = {
  code: PendekarActionErrorCode;
  message: string;
};

export type PendekarBattleActorProjection = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  attack: number;
  defense: number;
  level?: number;
  boss?: boolean;
};

export type PendekarBattleProjection = {
  id: string;
  encounterId: string;
  status: string;
  phase: string;
  turn: number;
  actionRevision: number;
  expiresAt: string;
  player: PendekarBattleActorProjection;
  enemies: PendekarBattleActorProjection[];
};

export type PendekarLearningProjection = {
  id: string;
  questionId: string;
  status: string;
  expiresAt: string;
};

export type PendekarStateProjection = {
  stateSchemaVersion: number;
  version: number;
  player: {
    mapKey: string;
    position: { x: number; y: number };
    facing: string;
    stats: {
      hp: number;
      maxHp: number;
      mp: number;
      maxMp: number;
      attack: number;
      defense: number;
      speed: number;
    };
    progression: { level: number; xp: number };
    wallet: { goldBalance: number };
  };
  inventory: Array<{ itemKey: string; quantity: number }>;
  quests: Array<{
    questKey: string;
    status: string;
    progress: number;
    target: number;
    definitionVersion: string;
    version: number;
  }>;
  activeBattle: PendekarBattleProjection | null;
  activeLearning: PendekarLearningProjection | null;
};

/** The browser may name a static encounter and supply a replay key—nothing else. */
export type StartBattleInput = {
  encounterId: string;
  requestId?: string;
};

export type StartBattleResult = {
  category: "STARTED" | "REPLAYED";
  battle: PendekarBattleProjection;
};

/** Server-selected, client-safe challenge. It intentionally has no answer key. */
export type PendekarLearningChallengeProjection = {
  challengeId: string;
  prompt: string;
  options: string[];
  freeText: boolean;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  domain: string;
  curriculum: { topik?: string | null; kompetensi?: string | null; kd?: string | null; kelas?: string | null };
};

export type StartLearningResult = {
  category: "STARTED" | "EXISTING";
  learning: {
    status: string;
    expiresAt: string;
    challenge: PendekarLearningChallengeProjection;
  };
};

/** The browser submits only its answer and a replay key. */
export type SubmitLearningAnswerInput = {
  answer: string;
  requestKey: string;
};

export type SubmitLearningAnswerResult = {
  category: "EVALUATED" | "REPLAYED";
  learning: { status: string; answeredAt: string };
  evaluation: { correct: boolean; score: 0 | 1 };
};

/** A browser selects a fixed, whitelisted intent; all target/state values are server-derived. */
export type SubmitBattleActionInput = {
  action: "basic_attack" | "mahapukul";
  requestKey: string;
};

export type SubmitBattleActionResult = {
  category: "RESOLVED" | "REPLAYED";
  battle: PendekarBattleProjection;
};

/** The browser can only supply an opaque receipt replay key. */
export type CreateBattleRewardReceiptInput = { requestKey: string };

export type PendekarRewardReceiptProjection = {
  id: string;
  source: "BATTLE";
  sourceBattleId: string;
  definitionVersion: string;
  status: string;
  entitlement: { rpgXp: number; gold: number };
  createdAt: string;
};

export type CreateBattleRewardReceiptResult = {
  category: "CREATED" | "REPLAYED" | "EXISTING";
  receipt: PendekarRewardReceiptProjection;
};

export type ParseStartBattleInputResult =
  | { ok: true; value: StartBattleInput }
  | { ok: false; error: PendekarActionError };

const startBattleKeys = new Set(["encounterId", "requestId"]);
const submitLearningAnswerKeys = new Set(["answer", "requestKey"]);
const submitBattleActionKeys = new Set(["action", "requestKey"]);
const createBattleRewardReceiptKeys = new Set(["requestKey"]);
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strictly decode the HTTP body. In particular, player ids, HP, damage, XP,
 * gold, rewards, state snapshots, or unknown future write fields are rejected
 * rather than silently ignored.
 */
export function parseStartBattleInput(value: unknown): ParseStartBattleInputResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle start body must be an object" } };
  }
  if (Object.keys(value).some((key) => !startBattleKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle start body contains unsupported fields" } };
  }
  if (typeof value.encounterId !== "string" || !/^[a-z0-9-]{1,64}$/.test(value.encounterId)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "encounterId must be a static encounter key" } };
  }
  if (value.requestId !== undefined && (typeof value.requestId !== "string" || !requestIdPattern.test(value.requestId))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestId must be an opaque replay key" } };
  }
  return {
    ok: true,
    value: value.requestId === undefined
      ? { encounterId: value.encounterId }
      : { encounterId: value.encounterId, requestId: value.requestId },
  };
}

export type ParseSubmitLearningAnswerResult =
  | { ok: true; value: SubmitLearningAnswerInput }
  | { ok: false; error: PendekarActionError };

/** Reject all client supplied authority, including question/session identifiers. */
export function parseSubmitLearningAnswerInput(value: unknown): ParseSubmitLearningAnswerResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Learning answer body must be an object" } };
  }
  if (Object.keys(value).some((key) => !submitLearningAnswerKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Learning answer body contains unsupported fields" } };
  }
  if (typeof value.answer !== "string" || value.answer.trim().length === 0 || value.answer.length > 500) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "answer must be a non-empty string of at most 500 characters" } };
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return { ok: true, value: { answer: value.answer, requestKey: value.requestKey } };
}

export type ParseSubmitBattleActionResult =
  | { ok: true; value: SubmitBattleActionInput }
  | { ok: false; error: PendekarActionError };

/**
 * Deliberately narrow action decoder. Target, skill ids, player/battle state,
 * damage, HP, crit, RNG, learning outcome, and all reward fields are not a
 * browser authority surface.
 */
export function parseSubmitBattleActionInput(value: unknown): ParseSubmitBattleActionResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle action body must be an object" } };
  }
  if (Object.keys(value).some((key) => !submitBattleActionKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle action body contains unsupported fields" } };
  }
  if (value.action !== "basic_attack" && value.action !== "mahapukul") {
    return { ok: false, error: { code: "INVALID_INPUT", message: "action is not an allowed battle intent" } };
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return { ok: true, value: { action: value.action, requestKey: value.requestKey } };
}

export type ParseCreateBattleRewardReceiptResult =
  | { ok: true; value: CreateBattleRewardReceiptInput }
  | { ok: false; error: PendekarActionError };

/** No victory, player, amount, XP, rarity, or reward fields are client input. */
export function parseCreateBattleRewardReceiptInput(value: unknown): ParseCreateBattleRewardReceiptResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle reward body must be an object" } };
  }
  if (Object.keys(value).some((key) => !createBattleRewardReceiptKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle reward body contains unsupported fields" } };
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return { ok: true, value: { requestKey: value.requestKey } };
}
