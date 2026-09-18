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
  | "BATTLE_SETTLEMENT_NOT_READY"
  | "BATTLE_SETTLEMENT_INVALID_STATE"
  | "QUEST_MUTATION_REPLAY_CONFLICT"
  | "QUEST_MUTATION_INVALID_TRANSITION"
  | "QUEST_MUTATION_INVALID_FLAG"
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

export type PendekarWorldState = {
  /** Quest flags (Record<string, boolean>). Absent = empty object. */
  flags: Record<string, boolean>;
  /** Opened chest IDs. Absent = empty array. */
  openedChests: string[];
  /** Defeated boss instance IDs. Absent = empty array. */
  deadBossIds: string[];
  /** Equipment slots. Absent = all null. weaponPlus = forge upgrade level (0-5). */
  equipment: { weaponId: string | null; armorId: string | null; accessoryId: string | null; weaponPlus: number };
  /** Quest line state (main/kills/flowers). Absent = zeros. */
  quest: { main: number; kills: number; flowers: number };
  /** Picked golden-flower tile keys. Absent = empty array. */
  pickedGe: string[];
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
  /** P2.6I.1: Server-authoritative world state. */
  worldState: PendekarWorldState;
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
  action: "basic_attack" | "mahapukul" | "skill" | "flee";
  /** Required when action === "skill". Server validates against canonical skill definitions. */
  skillId?: string;
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

/** The browser may only request settlement of the already-owned battle receipt. */
export type SettleBattleRewardInput = { requestKey: string };

export type PendekarBattleSettlementProjection = {
  receiptId: string;
  sourceBattleId: string;
  definitionVersion: string;
  status: "SETTLED";
  settlementReference: string;
  applied: { rpgXp: number; gold: number };
  settledAt: string;
};

export type SettleBattleRewardResult = {
  category: "SETTLED" | "REPLAYED";
  settlement: PendekarBattleSettlementProjection;
};

/* ---------- P2.6I.2 + P2.6I.3: Quest mutations ---------- */

export type QuestMutationKind =
  | "QUEST_ADVANCE"
  | "KILL"
  | "FLOWER_PICK"
  | "FLAG"
  | "CHEST_OPEN"
  | "BOSS_KILL"
  | "GE_PICK";

export type QuestMutationInput = {
  /** The mutation kind — client tells WHAT changed; server validates WHERE it lands. */
  kind: QuestMutationKind;
  /** Target quest main-line number (required when kind=QUEST_ADVANCE). */
  to?: number;
  /** Flag name to set true (required when kind=FLAG). */
  flagName?: string;
  /** Chest tile key (required when kind=CHEST_OPEN). Format: "mapId:x,y" or canonical chest ID. */
  chestId?: string;
  /** Boss instance ID (required when kind=BOSS_KILL). */
  bossId?: string;
  /** Golden-flower tile key (required when kind=GE_PICK). Format: "mapId:x,y". */
  geKey?: string;
  /** Client-generated idempotency/replay key. */
  requestKey: string;
};

export type PendekarQuestStateProjection = {
  main: number;
  kills: number;
  flowers: number;
};

export type QuestMutationResult = {
  /** Applied or deduplicated. */
  category: "APPLIED" | "REPLAYED";
  /** Authoritative quest state after the mutation. */
  quest: PendekarQuestStateProjection;
  /** Authoritative flags after the mutation. */
  flags: Record<string, boolean>;
  /** Authoritative opened-chest IDs after the mutation. */
  openedChests: string[];
  /** Authoritative dead-boss IDs after the mutation. */
  deadBossIds: string[];
  /** Authoritative picked golden-flower keys after the mutation. */
  pickedGe: string[];
  /** Which signal kinds were actually applied (empty on REPLAYED). */
  applied: string[];
  /** Server version counter after write. */
  version: number;
};

export type ParseQuestMutationInputResult =
  | { ok: true; value: QuestMutationInput }
  | { ok: false; error: PendekarActionError };

const questMutationKeys = new Set(["kind", "to", "flagName", "chestId", "bossId", "geKey", "requestKey"]);

export function parseQuestMutationInput(value: unknown): ParseQuestMutationInputResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Quest mutation body must be an object" } };
  }
  if (Object.keys(value).some((key) => !questMutationKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Quest mutation body contains unsupported fields" } };
  }
  if (
    value.kind !== "QUEST_ADVANCE" && value.kind !== "KILL" && value.kind !== "FLOWER_PICK" && value.kind !== "FLAG" &&
    value.kind !== "CHEST_OPEN" && value.kind !== "BOSS_KILL" && value.kind !== "GE_PICK"
  ) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "kind must be QUEST_ADVANCE, KILL, FLOWER_PICK, FLAG, CHEST_OPEN, BOSS_KILL, or GE_PICK" } };
  }
  if (value.kind === "QUEST_ADVANCE") {
    if (typeof value.to !== "number" || !Number.isInteger(value.to) || value.to < 0 || value.to > 7) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "to must be an integer 0..7" } };
    }
  }
  if (value.kind === "FLAG") {
    if (typeof value.flagName !== "string" || value.flagName.length === 0 || value.flagName.length > 64) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "flagName must be a non-empty string of at most 64 characters" } };
    }
  }
  if (value.kind === "CHEST_OPEN") {
    if (typeof value.chestId !== "string" || value.chestId.length === 0 || value.chestId.length > 128) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "chestId must be a non-empty string of at most 128 characters" } };
    }
  }
  if (value.kind === "BOSS_KILL") {
    if (typeof value.bossId !== "string" || value.bossId.length === 0 || value.bossId.length > 128) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "bossId must be a non-empty string of at most 128 characters" } };
    }
  }
  if (value.kind === "GE_PICK") {
    if (typeof value.geKey !== "string" || value.geKey.length === 0 || value.geKey.length > 128) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "geKey must be a non-empty string of at most 128 characters" } };
    }
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return { ok: true, value: value as QuestMutationInput };
}

/* ---------- P2.6I.5: Equipment mutations ---------- */

export type EquipmentMutationKind = "FORGE_UPGRADE" | "EQUIP" | "UNEQUIP";

export type EquipmentMutationInput = {
  kind: EquipmentMutationKind;
  /** Target equipment slot: "weapon", "armor", or "accessory". */
  slot: "weapon" | "armor" | "accessory";
  /** Equipment definition key (e.g. "wpn_bilah", "arm_arm"). Required for EQUIP/FORGE_UPGRADE. */
  equipmentKey?: string;
  /** weaponPlus level (0-5). Required for FORGE_UPGRADE. */
  weaponPlus?: number;
  /** Client-generated idempotency/replay key. */
  requestKey: string;
};

export type EquipmentMutationResult = {
  category: "APPLIED" | "REPLAYED";
  equipment: { weaponId: string | null; armorId: string | null; accessoryId: string | null; weaponPlus: number };
  applied: string[];
  version: number;
};

/* ---------- P2.6I.5: Inventory mutations ---------- */

export type InventoryMutationKind =
  | "SHOP_PURCHASE"
  | "CHEST_GRANT"
  | "BATTLE_DROP"
  | "CONSUME"
  | "FISH_SELL"
  | "FORGE_COST";

export type InventoryMutationInput = {
  kind: InventoryMutationKind;
  /** Item key (e.g. "ram", "teh", "bijih"). Required for all except FISH_SELL. */
  itemKey?: string;
  /** Quantity change. Positive = add, negative = remove. */
  quantityDelta: number;
  /** Client-generated idempotency/replay key. */
  requestKey: string;
};

export type InventoryMutationResult = {
  category: "APPLIED" | "REPLAYED";
  inventory: { itemKey: string; quantity: number }[];
  applied: string[];
  version: number;
};

export type ParseStartBattleInputResult =
  | { ok: true; value: StartBattleInput }
  | { ok: false; error: PendekarActionError };

const startBattleKeys = new Set(["encounterId", "requestId"]);
const submitLearningAnswerKeys = new Set(["answer", "requestKey"]);
const submitBattleActionKeys = new Set(["action", "skillId", "requestKey"]);
const createBattleRewardReceiptKeys = new Set(["requestKey"]);
const settleBattleRewardKeys = new Set(["requestKey"]);
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
 * Deliberately narrow action decoder. Target, player/battle state,
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
  if (value.action !== "basic_attack" && value.action !== "mahapukul" && value.action !== "skill") {
    return { ok: false, error: { code: "INVALID_INPUT", message: "action is not an allowed battle intent" } };
  }
  if (value.action === "skill") {
    if (typeof value.skillId !== "string" || value.skillId.length === 0 || value.skillId.length > 64) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "skillId must be a non-empty string of at most 64 characters" } };
    }
    if (!/^[a-z][a-z0-9._-]*$/.test(value.skillId)) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "skillId format is invalid" } };
    }
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return {
    ok: true,
    value: {
      action: value.action,
      ...(value.action === "skill" ? { skillId: value.skillId as string } : {}),
      requestKey: value.requestKey,
    },
  };
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

export type ParseSettleBattleRewardResult =
  | { ok: true; value: SettleBattleRewardInput }
  | { ok: false; error: PendekarActionError };

/** Settlement carries intent only; all reward, owner, and source fields stay server-owned. */
export function parseSettleBattleRewardInput(value: unknown): ParseSettleBattleRewardResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle settlement body must be an object" } };
  }
  if (Object.keys(value).some((key) => !settleBattleRewardKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Battle settlement body contains unsupported fields" } };
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return { ok: true, value: { requestKey: value.requestKey } };
}

/* ---------- P2.6I.5: Equipment mutation parser ---------- */

export type ParseEquipmentMutationInputResult =
  | { ok: true; value: EquipmentMutationInput }
  | { ok: false; error: PendekarActionError };

const equipmentMutationKeys = new Set(["kind", "slot", "equipmentKey", "weaponPlus", "requestKey"]);

export function parseEquipmentMutationInput(value: unknown): ParseEquipmentMutationInputResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Equipment mutation body must be an object" } };
  }
  if (Object.keys(value).some((key) => !equipmentMutationKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Equipment mutation body contains unsupported fields" } };
  }
  if (value.kind !== "FORGE_UPGRADE" && value.kind !== "EQUIP" && value.kind !== "UNEQUIP") {
    return { ok: false, error: { code: "INVALID_INPUT", message: "kind must be FORGE_UPGRADE, EQUIP, or UNEQUIP" } };
  }
  if (value.slot !== "weapon" && value.slot !== "armor" && value.slot !== "accessory") {
    return { ok: false, error: { code: "INVALID_INPUT", message: "slot must be weapon, armor, or accessory" } };
  }
  if (value.kind === "FORGE_UPGRADE" || value.kind === "EQUIP") {
    if (typeof value.equipmentKey !== "string" || value.equipmentKey.length === 0) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "equipmentKey is required for EQUIP and FORGE_UPGRADE" } };
    }
  }
  if (value.kind === "FORGE_UPGRADE") {
    if (typeof value.weaponPlus !== "number" || !Number.isInteger(value.weaponPlus) || value.weaponPlus < 0 || value.weaponPlus > 5) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "weaponPlus must be an integer 0..5" } };
    }
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return {
    ok: true,
    value: {
      kind: value.kind,
      slot: value.slot,
      requestKey: value.requestKey,
      ...(value.equipmentKey !== undefined ? { equipmentKey: value.equipmentKey as string } : {}),
      ...(value.weaponPlus !== undefined ? { weaponPlus: value.weaponPlus as number } : {}),
    },
  };
}

/* ---------- P2.6I.5: Inventory mutation parser ---------- */

export type ParseInventoryMutationInputResult =
  | { ok: true; value: InventoryMutationInput }
  | { ok: false; error: PendekarActionError };

const inventoryMutationKeys = new Set(["kind", "itemKey", "quantityDelta", "requestKey"]);

export function parseInventoryMutationInput(value: unknown): ParseInventoryMutationInputResult {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Inventory mutation body must be an object" } };
  }
  if (Object.keys(value).some((key) => !inventoryMutationKeys.has(key))) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "Inventory mutation body contains unsupported fields" } };
  }
  if (
    value.kind !== "SHOP_PURCHASE" && value.kind !== "CHEST_GRANT" && value.kind !== "BATTLE_DROP" &&
    value.kind !== "CONSUME" && value.kind !== "FISH_SELL" && value.kind !== "FORGE_COST"
  ) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "kind must be SHOP_PURCHASE, CHEST_GRANT, BATTLE_DROP, CONSUME, FISH_SELL, or FORGE_COST" } };
  }
  if (typeof value.quantityDelta !== "number" || !Number.isInteger(value.quantityDelta) || value.quantityDelta === 0) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "quantityDelta must be a non-zero integer" } };
  }
  if (value.kind !== "FISH_SELL") {
    if (typeof value.itemKey !== "string" || value.itemKey.length === 0) {
      return { ok: false, error: { code: "INVALID_INPUT", message: "itemKey is required for non-FISH_SELL mutations" } };
    }
  }
  if (typeof value.requestKey !== "string" || !requestIdPattern.test(value.requestKey)) {
    return { ok: false, error: { code: "INVALID_INPUT", message: "requestKey must be an opaque replay key" } };
  }
  return {
    ok: true,
    value: {
      kind: value.kind,
      quantityDelta: value.quantityDelta,
      requestKey: value.requestKey,
      ...(value.itemKey !== undefined ? { itemKey: value.itemKey as string } : {}),
    },
  };
}
