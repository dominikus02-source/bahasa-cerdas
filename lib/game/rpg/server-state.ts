/**
 * Pendekar Suryakerta server-state foundation.
 *
 * This module is deliberately a domain service, not a route handler. A future
 * authenticated route must derive `userId` from its verified server session
 * and pass only server-derived encounter/question/reward data here. It has no
 * generic save operation and accepts no client-reported victory, correctness,
 * XP, gold balance, or quest progress.
 */

import { Prisma, PrismaClient, type PendekarPlayer } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { BASIC_ATTACK_SKILL_ID, enemyAct, escapeBattle, playerAct, startBattle, toBattleResult } from "@/src/game/rpg/combat/battle-core";
import type { BattleRng } from "@/src/game/rpg/combat/battle-rng";
import type { RPGBattleState } from "@/src/game/rpg/combat/battle-state";
import { EQUIPMENT } from "@/src/game/rpg/data/equipment";
import { canonicalEnemyByPrototypeKey } from "@/src/game/rpg/data/enemies";
import { skillById } from "@/src/game/rpg/data/skills";
import { getCanonicalMap } from "@/src/game/rpg/data/world-maps";
import type { RPGFacing } from "@/src/game/rpg/core/constants";
import type { RPGPlayerState } from "@/src/game/rpg/player/player-state";
import { grantXp, xpForLevel } from "@/src/game/rpg/player/progression";
import { isEligibleForGameplay } from "@/lib/game-questions/quality";
import { selectChallenge, soalToGameQuestion } from "@/src/game/rpg/learning/rpg-challenge-selector";
import { adaptSoalToChallenge, toClientChallenge, type ResolvedChallenge, type SoalLike } from "@/src/game/rpg/learning/rpg-challenge";
import { evaluateAnswer, normalizeAnswer } from "@/src/game/rpg/learning/rpg-evaluator";
import type {
  PendekarBattleActorProjection,
  PendekarBattleProjection,
  PendekarBattleSettlementProjection,
  PendekarLearningChallengeProjection,
  PendekarRewardReceiptProjection,
  PendekarStateProjection,
  PendekarWorldState,
  QuestMutationInput,
  QuestMutationResult,
  CreateBattleRewardReceiptInput,
  CreateBattleRewardReceiptResult,
  SettleBattleRewardInput,
  SettleBattleRewardResult,
  StartLearningResult,
  StartBattleInput,
  StartBattleResult,
  SubmitBattleActionInput,
  SubmitBattleActionResult,
  SubmitLearningAnswerInput,
  SubmitLearningAnswerResult,
} from "./server-contracts";
import { isValidQuestTransition } from "@/src/game/rpg/quests/quest-engine";
import { QUEST_FLAG_NAMES } from "@/src/game/rpg/quests/flags";

const DEFAULT_QUEST = {
  key: "jejak-korog",
  target: 3,
  definitionVersion: "p2.6c",
} as const;

const ALLOWED_SLICE_ENCOUNTERS = new Set(["e1", "e2", "e3"]);
const CONTROLLED_SLICE_MAP_KEY = "map.desa";
const BATTLE_START_TTL_MS = 10 * 60 * 1000;
const LEARNING_SESSION_TTL_MS = 5 * 60 * 1000;
const PENDEKAR_LEARNING_EVIDENCE_SOURCE = "PENDEKAR_SURYA_KERTA_BATTLE";
const PENDEKAR_BATTLE_REWARD_DEFINITION_VERSION = "p1.4b-canonical-battle-core-intent-v1";

type TransactionClient = Prisma.TransactionClient;

const canonicalSoalSelect = {
  id: true,
  text: true,
  type: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  difficulty: true,
  topik: true,
  KD: true,
  kelas: true,
  updatedAt: true,
} satisfies Prisma.SoalSelect;

type CanonicalSoal = Prisma.SoalGetPayload<{ select: typeof canonicalSoalSelect }>;

export class PendekarStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class PendekarOwnershipError extends PendekarStateError {}
export class PendekarConflictError extends PendekarStateError {}
export class PendekarInvariantError extends PendekarStateError {}
export class PendekarBattleStartError extends PendekarStateError {
  constructor(
    readonly code: "INVALID_ENCOUNTER" | "INVALID_PLAYER_STATE" | "ACTIVE_BATTLE_EXISTS",
    message: string,
  ) {
    super(message);
  }
}
export class PendekarLearningError extends PendekarStateError {
  constructor(
    readonly code:
      | "NO_ELIGIBLE_QUESTION"
      | "LEARNING_NOT_ACTIVE"
      | "LEARNING_EXPIRED"
      | "LEARNING_ALREADY_COMPLETED"
      | "ANSWER_REPLAY_CONFLICT"
      | "QUESTION_NOT_ELIGIBLE"
      | "QUESTION_VERSION_STALE",
    message: string,
  ) {
    super(message);
  }
}
export class PendekarBattleActionError extends PendekarStateError {
  constructor(
    readonly code:
      | "BATTLE_NOT_ACTIVE"
      | "BATTLE_EXPIRED"
      | "BATTLE_TERMINAL"
      | "LEARNING_RESULT_REQUIRED"
      | "LEARNING_RESULT_NOT_AUTHORITATIVE"
      | "LEARNING_ALREADY_CONSUMED"
      | "BATTLE_ACTION_REPLAY_CONFLICT"
      | "BATTLE_ACTION_INVALID_STATE"
      | "BATTLE_ACTION_RESOLUTION_FAILED"
      | "BATTLE_ACTION_INVALID_SKILL"
      | "BATTLE_ACTION_SKILL_LOCKED",
    message: string,
  ) {
    super(message);
  }
}
export class PendekarBattleRewardError extends PendekarStateError {
  constructor(
    readonly code:
      | "BATTLE_REWARD_NOT_ELIGIBLE"
      | "BATTLE_REWARD_INVALID_STATE"
      | "BATTLE_REWARD_REPLAY_CONFLICT",
    message: string,
  ) {
    super(message);
  }
}
export class PendekarBattleSettlementError extends PendekarStateError {
  constructor(
    readonly code: "BATTLE_SETTLEMENT_NOT_READY" | "BATTLE_SETTLEMENT_INVALID_STATE",
    message: string,
  ) {
    super(message);
  }
}
export class PendekarQuestMutationError extends PendekarStateError {
  constructor(
    readonly code:
      | "QUEST_MUTATION_REPLAY_CONFLICT"
      | "QUEST_MUTATION_INVALID_TRANSITION"
      | "QUEST_MUTATION_INVALID_FLAG",
    message: string,
  ) {
    super(message);
  }
}

export type ServerBattleSeed = {
  /** Derived from a static server encounter definition, never a browser body. */
  encounterKey: string;
  encounterDefinitionVersion: string;
  /** Validated server battle aggregate, not a persisted player save. */
  battleState: Prisma.InputJsonValue;
  /** Server-generated deterministic state/seed. */
  rngState: string;
  origin: { mapKey: string; x: number; y: number };
  /** Opaque request key used only for replay handling. */
  startRequestId: string;
  expiresAt: Date;
};

export type ServerLearningSeed = {
  /** Existing canonical Soal id selected by the server. */
  soalId: string;
  attemptId: string;
  expiresAt: Date;
};

export type ServerRewardPlan = {
  sourceType: "BATTLE" | "QUEST";
  sourceId: string;
  idempotencyKey: string;
  /** In-world combat XP only. */
  rpgXp: number;
  /** Must remain zero until a founder explicitly enables platform XP. */
  globalXp?: 0;
  /** Pendekar-only G; never maps to PlayerProfile.coin or User.coins. */
  goldDelta: number;
  /** Bounded, server-derived item instructions for a later inventory service. */
  itemPlan?: Prisma.InputJsonValue;
};

export type CreateResult<T> = { value: T; created: boolean };

function nonBlank(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new PendekarInvariantError(`${label} is required`);
  return trimmed;
}

function finitePosition(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new PendekarInvariantError(`${label} must be a normalized coordinate`);
  }
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new PendekarInvariantError(`${label} must be a non-negative integer`);
  }
  return value;
}

/**
 * Safely extract a JSON world-state column from a Prisma row.
 * Returns `fallback` if the value is null or not the expected type.
 */
function safeJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/**
 * A minimal transactional service for the additive persistence foundation.
 * It exposes server-only primitives; no API routes are created in P2.6F.
 */
/**
 * Sliding-window replay guard for quest mutations.
 * Keyed by `${userId}:${requestKey}`. Bounded per-player to 256 entries.
 */
const replayGuard = new Set<string>();

export class PendekarStateService {
  constructor(private readonly prisma: PrismaClient) {}

  private async serializable<T>(operation: (tx: TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        // A unique collision can be the normal outcome of two requests racing
        // for the same idempotent key. Restart the whole transaction so its
        // first read sees the committed winner; never query after a Postgres
        // unique violation inside the aborted transaction.
        if ((isKnownPrismaError(error, "P2034") || isKnownPrismaError(error, "P2002")) && attempt < 2) continue;
        throw error;
      }
    }
    throw new PendekarConflictError("Serializable transaction retry limit reached");
  }

  private async playerForUser(tx: TransactionClient, userId: string) {
    return tx.pendekarPlayer.upsert({
      where: { userId: nonBlank(userId, "userId") },
      update: {},
      create: { userId },
    });
  }

  /** Race-safe because `PendekarPlayer.userId` is database-unique. */
  async getOrCreatePendekarPlayer(userId: string) {
    return this.serializable((tx) => this.playerForUser(tx, userId));
  }

  async getOwnedPendekarPlayer(userId: string) {
    return this.prisma.pendekarPlayer.findUnique({
      where: { userId: nonBlank(userId, "userId") },
    });
  }

  /**
   * Read the caller's safe client view. A missing player may be initialized by
   * the existing race-safe player contract, but this read creates no quest,
   * reward, wallet, XP, or platform-economy record.
   */
  async getStateProjection(userId: string): Promise<PendekarStateProjection> {
    await this.getOrCreatePendekarPlayer(userId);
    const player = await this.prisma.pendekarPlayer.findUniqueOrThrow({
      where: { userId: nonBlank(userId, "userId") },
      include: {
        inventoryItems: { orderBy: { itemKey: "asc" } },
        questProgresses: { orderBy: { questKey: "asc" } },
        battleSessions: {
          where: { status: "ACTIVE" },
          orderBy: { startedAt: "desc" },
          take: 1,
          include: { learningSession: true },
        },
      },
    });
    const active = player.battleSessions[0] ?? null;

    // P2.6I.1: Parse world-state columns. Nullable = clean defaults.
    const worldState: PendekarWorldState = {
      flags: safeJson<Record<string, boolean>>(player.flags, {}),
      openedChests: safeJson<string[]>(player.openedChests, []),
      deadBossIds: safeJson<string[]>(player.deadBossIds, []),
      equipment: safeJson<PendekarWorldState["equipment"]>(player.equipment, {
        weaponId: null, armorId: null, accessoryId: null,
      }),
      quest: safeJson<PendekarWorldState["quest"]>(player.questState, {
        main: 0, kills: 0, flowers: 0,
      }),
      pickedGe: safeJson<string[]>(player.pickedGe, []),
    };

    return {
      stateSchemaVersion: player.stateSchemaVersion,
      version: player.version,
      player: {
        mapKey: player.mapKey,
        position: { x: player.positionX, y: player.positionY },
        facing: player.facing,
        stats: {
          hp: player.hp,
          maxHp: player.maxHp,
          mp: player.mp,
          maxMp: player.maxMp,
          attack: player.attack,
          defense: player.defense,
          speed: player.speed,
        },
        progression: { level: player.rpgLevel, xp: player.rpgXp },
        wallet: { goldBalance: player.goldBalance },
      },
      inventory: player.inventoryItems.map((item) => ({ itemKey: item.itemKey, quantity: item.quantity })),
      quests: player.questProgresses.map((quest) => ({
        questKey: quest.questKey,
        status: quest.status,
        progress: quest.progress,
        target: quest.target,
        definitionVersion: quest.definitionVersion,
        version: quest.version,
      })),
      worldState,
      activeBattle: active ? projectBattle(active) : null,
      activeLearning: active?.learningSession
        ? {
            id: active.learningSession.id,
            questionId: active.learningSession.soalId,
            status: active.learningSession.status,
            expiresAt: active.learningSession.expiresAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Create a battle only from the caller's persisted Pendekar row and static
   * controlled-slice definitions. The browser can neither submit a player
   * state nor select rewards, RNG, damage, XP, gold, or an arbitrary map.
   */
  async startAuthoritativeBattle(userId: string, input: StartBattleInput): Promise<StartBattleResult> {
    const player = await this.getOrCreatePendekarPlayer(userId);
    const encounter = this.resolveControlledSliceEncounter(player.mapKey, input.encounterId);
    const playerState = playerToBattleState(player);
    const requestId = input.requestId ?? randomUUID();
    const started = startBattle({
      battleId: randomUUID(),
      player: playerState,
      equipmentTable: EQUIPMENT,
      enemies: [{ def: encounter.enemy, instanceId: encounter.id }],
      origin: { mapId: player.mapKey, x: player.positionX, y: player.positionY },
      seed: randomBytes(4).readInt32BE(0),
    });

    try {
      const created = await this.createBattleSession(userId, {
        encounterKey: encounter.id,
        encounterDefinitionVersion: "p2.6g.1",
        battleState: JSON.parse(JSON.stringify(started.state)) as Prisma.InputJsonValue,
        rngState: JSON.stringify(started.rng),
        origin: { mapKey: player.mapKey, x: player.positionX, y: player.positionY },
        startRequestId: requestId,
        expiresAt: new Date(Date.now() + BATTLE_START_TTL_MS),
      });
      if (!created.value) throw new PendekarInvariantError("Battle creation returned no persisted session");
      return {
        category: created.created ? "STARTED" : "REPLAYED",
        battle: projectBattle(created.value),
      };
    } catch (error) {
      if (error instanceof PendekarConflictError) {
        throw new PendekarBattleStartError("ACTIVE_BATTLE_EXISTS", "The player already has an active battle");
      }
      throw error;
    }
  }

  /**
   * Bind exactly one server-selected, quality-gated learning challenge to an
   * owned active battle. There is no browser question id, answer key, or
   * selection input in this operation.
   */
  async startAuthoritativeLearningSession(userId: string, battleId: string): Promise<StartLearningResult> {
    return this.serializable(async (tx) => {
      const battle = await tx.pendekarBattleSession.findFirst({
        where: { id: nonBlank(battleId, "battleId"), player: { userId: nonBlank(userId, "userId") } },
        include: { player: true, learningSession: true },
      });
      if (!battle) throw new PendekarOwnershipError("Battle is not owned by this user");
      this.assertActiveBattle(battle);

      if (battle.learningSession) {
        const resolved = await this.resolveLearningQuestion(tx, battle.learningSession.soalId, battle.learningSession.questionVersion);
        return {
          category: "EXISTING",
          learning: {
            status: battle.learningSession.status,
            expiresAt: battle.learningSession.expiresAt.toISOString(),
            challenge: projectLearningChallenge(resolved),
          },
        };
      }

      const candidates = await tx.soal.findMany({
        where: { source: { not: "MASTER_BANK" } },
        select: canonicalSoalSelect,
        orderBy: { id: "asc" },
        take: 200,
      });
      const selection = selectChallenge(candidates.map(soalToSoalLike), {
        encounterId: battle.id,
        context: "BATTLE",
        level: battle.player.rpgLevel,
        seed: `pendekar:${battle.id}`,
      });
      if (selection.outcome !== "SELECTED") {
        throw new PendekarLearningError("NO_ELIGIBLE_QUESTION", "No eligible canonical question is available");
      }
      const question = candidates.find((candidate) => candidate.id === selection.resolved.source.soalId);
      if (!question) throw new PendekarLearningError("QUESTION_NOT_ELIGIBLE", "Selected question is unavailable");

      const expiresAt = new Date(Math.min(battle.expiresAt.getTime(), Date.now() + LEARNING_SESSION_TTL_MS));
      if (expiresAt <= new Date()) throw new PendekarLearningError("LEARNING_EXPIRED", "Learning session would already be expired");
      const learning = await tx.pendekarLearningSession.create({
        data: {
          battleSessionId: battle.id,
          soalId: question.id,
          questionVersion: question.updatedAt.toISOString(),
          answerFingerprint: answerFingerprint(question.correctAnswer),
          attemptId: `learning:${battle.id}:${randomUUID()}`,
          expiresAt,
        },
      });
      return {
        category: "STARTED",
        learning: {
          status: learning.status,
          expiresAt: learning.expiresAt.toISOString(),
          challenge: projectLearningChallenge(selection.resolved),
        },
      };
    });
  }

  /**
   * Evaluate one answer only after resolving the owned battle, its bound
   * learning session, and its current canonical question on the server.
   * This writes evidence but never battle damage, XP, rewards, wallet, coins,
   * or quest state.
   */
  async submitAuthoritativeLearningAnswer(
    userId: string,
    battleId: string,
    input: SubmitLearningAnswerInput,
  ): Promise<SubmitLearningAnswerResult> {
    const normalizedAnswer = normalizeAnswer(input.answer);
    if (!normalizedAnswer) throw new PendekarInvariantError("Answer must not be empty");

    return this.serializable(async (tx) => {
      const battle = await tx.pendekarBattleSession.findFirst({
        where: { id: nonBlank(battleId, "battleId"), player: { userId: nonBlank(userId, "userId") } },
        include: { player: true, learningSession: true },
      });
      if (!battle) throw new PendekarOwnershipError("Battle is not owned by this user");
      this.assertActiveBattle(battle);
      const learning = battle.learningSession;
      if (!learning) throw new PendekarLearningError("LEARNING_NOT_ACTIVE", "Battle has no learning session");

      const byRequest = await tx.pendekarLearningSession.findUnique({ where: { answerRequestId: input.requestKey } });
      if (byRequest) {
        if (byRequest.id !== learning.id || byRequest.submittedAnswer !== normalizedAnswer || byRequest.isCorrect === null) {
          throw new PendekarLearningError("ANSWER_REPLAY_CONFLICT", "Answer replay key conflicts with an existing submission");
        }
        return replayedLearningAnswer(byRequest);
      }
      if (learning.status === "ANSWERED") {
        throw new PendekarLearningError("LEARNING_ALREADY_COMPLETED", "Learning session has already been completed");
      }
      if (learning.status !== "PENDING") {
        throw new PendekarLearningError("LEARNING_NOT_ACTIVE", "Learning session is not pending");
      }
      if (learning.expiresAt <= new Date()) {
        throw new PendekarLearningError("LEARNING_EXPIRED", "Learning session has expired");
      }

      const resolved = await this.resolveLearningQuestion(tx, learning.soalId, learning.questionVersion);
      const evaluation = evaluateAnswer(resolved, input.answer);
      // Empty answers are rejected by the transport contract. The canonical
      // evaluator still handles the normal incorrect-answer path here.
      if (evaluation.invalid) throw new PendekarInvariantError("Answer must not be empty");
      const answeredAt = new Date();
      const isCorrect = evaluation.signal === "CORRECT";
      const updated = await tx.pendekarLearningSession.update({
        where: { id: learning.id },
        data: {
          status: "ANSWERED",
          submittedAnswer: evaluation.normalizedAnswer,
          isCorrect,
          answerRequestId: input.requestKey,
          answeredAt,
        },
      });
      await tx.learningEvidence.upsert({
        where: {
          userId_source_activityId_questionId: {
            userId: userId,
            source: PENDEKAR_LEARNING_EVIDENCE_SOURCE,
            activityId: battle.id,
            questionId: learning.soalId,
          },
        },
        update: {
          selectedAnswer: evaluation.normalizedAnswer,
          isCorrect,
          score: evaluation.score,
          answeredAt,
          metadata: learningEvidenceMetadata(learning.id, learning.attemptId, input.requestKey, learning.questionVersion),
        },
        create: {
          userId,
          source: PENDEKAR_LEARNING_EVIDENCE_SOURCE,
          activityId: battle.id,
          questionId: learning.soalId,
          selectedAnswer: evaluation.normalizedAnswer,
          isCorrect,
          score: evaluation.score,
          answeredAt,
          metadata: learningEvidenceMetadata(learning.id, learning.attemptId, input.requestKey, learning.questionVersion),
        },
      });
      return {
        category: "EVALUATED",
        learning: { status: updated.status, answeredAt: answeredAt.toISOString() },
        evaluation: { correct: isCorrect, score: evaluation.score },
      };
    });
  }

  /**
   * Resolve one approved combat intent from the persisted battle aggregate.
   * The browser supplies no target, actor, stats, HP, RNG, learning outcome,
   * damage, or reward values. The canonical pure battle core remains the only
   * place where damage and terminal state are calculated.
   */
  async submitAuthoritativeBattleAction(
    userId: string,
    battleId: string,
    input: SubmitBattleActionInput,
  ): Promise<SubmitBattleActionResult> {
    const fingerprint = battleActionFingerprint(input);
    return this.serializable(async (tx) => {
      // This global key check happens before ownership lookup so another user
      // cannot reuse a key to learn anything about the original battle.
      const byRequest = await tx.pendekarBattleAction.findUnique({ where: { requestKey: input.requestKey } });
      if (byRequest) {
        if (byRequest.requestFingerprint !== fingerprint) {
          throw new PendekarBattleActionError("BATTLE_ACTION_REPLAY_CONFLICT", "Battle action replay key conflicts with an existing action");
        }
        const owned = await tx.pendekarBattleSession.findFirst({
          where: { id: byRequest.battleSessionId, player: { userId: nonBlank(userId, "userId") } },
          select: { id: true },
        });
        if (!owned) throw new PendekarOwnershipError("Battle is not owned by this user");
        return { category: "REPLAYED", battle: projectStoredBattleProjection(byRequest.resultProjection) };
      }

      const battle = await tx.pendekarBattleSession.findFirst({
        where: { id: nonBlank(battleId, "battleId"), player: { userId: nonBlank(userId, "userId") } },
        include: { player: true, learningSession: true },
      });
      if (!battle) throw new PendekarOwnershipError("Battle is not owned by this user");
      this.assertActionableBattle(battle);

      // ── Flee action: bypasses learning requirement ────────────────────────
      // Flee is a server-recognized terminal transition. The browser cannot
      // supply probability, boss restriction, or RNG values; only an opaque
      // request key. Learning is NOT consumed by a flee action.
      if (input.action === "flee") {
        const state = parsePersistedBattleState(battle.battleState);
        if (state.turn !== battle.turn || state.result !== undefined || state.phase !== "CHALLENGE") {
          throw new PendekarBattleActionError("BATTLE_ACTION_INVALID_STATE", "Persisted battle state is not actionable");
        }
        const rng = parsePersistedBattleRng(battle.rngState);
        const outcome = escapeBattle(state, { battleId: state.battleId, turn: state.turn, actorId: state.player.id }, rng);
        if (!outcome.ok) {
          throw new PendekarBattleActionError("BATTLE_ACTION_RESOLUTION_FAILED", `Canonical flee resolution was rejected: ${outcome.reason ?? "unknown"}`);
        }

        const terminal = outcome.state.result;
        // FLED → status "FLED", failure → remains "ACTIVE" (turn consumed, enemy responds)
        const status = terminal === "FLED" ? "FLED" : "ACTIVE";
        const nextRevision = battle.actionRevision + 1;
        const nextState = serializedBattleState(outcome.state);
        const projection = projectBattle({
          id: battle.id,
          encounterKey: battle.encounterKey,
          status,
          turn: outcome.state.turn,
          actionRevision: nextRevision,
          expiresAt: battle.expiresAt,
          battleState: nextState,
        });

        await tx.pendekarBattleSession.update({
          where: { id: battle.id },
          data: {
            status,
            result: terminal ?? null,
            battleState: nextState,
            rngState: JSON.stringify(outcome.rng),
            turn: outcome.state.turn,
            actionRevision: { increment: 1 },
            ...(terminal === undefined ? {} : { endedAt: new Date() }),
          },
        });
        await tx.pendekarBattleAction.create({
          data: {
            battleSessionId: battle.id,
            learningSessionId: "", // flee does not consume learning
            requestKey: input.requestKey,
            requestFingerprint: fingerprint,
            actionKind: "flee",
            turnBefore: state.turn,
            turnAfter: outcome.state.turn,
            resultProjection: asInputJson(projection),
          },
        });
        return { category: "RESOLVED", battle: projection };
      }
      // ── End flee ──────────────────────────────────────────────────────────

      const learning = battle.learningSession;
      if (!learning || learning.status !== "ANSWERED" || learning.isCorrect === null || !learning.answerRequestId || !learning.answeredAt) {
        throw new PendekarBattleActionError("LEARNING_RESULT_REQUIRED", "Battle action requires a completed authoritative learning result");
      }
      const evidence = await tx.learningEvidence.findUnique({
        where: {
          userId_source_activityId_questionId: {
            userId,
            source: PENDEKAR_LEARNING_EVIDENCE_SOURCE,
            activityId: battle.id,
            questionId: learning.soalId,
          },
        },
      });
      if (!evidence || evidence.isCorrect !== learning.isCorrect || evidence.score !== (learning.isCorrect ? 1 : 0)) {
        throw new PendekarBattleActionError("LEARNING_RESULT_NOT_AUTHORITATIVE", "Battle learning result cannot be verified");
      }
      const consumed = await tx.pendekarBattleAction.findUnique({ where: { learningSessionId: learning.id } });
      if (consumed) {
        throw new PendekarBattleActionError("LEARNING_ALREADY_CONSUMED", "Learning result has already been consumed by a battle action");
      }

      const state = parsePersistedBattleState(battle.battleState);
      // The original battle-start boundary intentionally generates a separate
      // opaque core battle id before the database session receives its CUID.
      // Ownership and persistence authority therefore bind to `battle.id`;
      // the core id is validated only by the canonical resolver commands.
      if (state.turn !== battle.turn || state.result !== undefined || state.phase !== "CHALLENGE") {
        throw new PendekarBattleActionError("BATTLE_ACTION_INVALID_STATE", "Persisted battle state is not actionable");
      }
      const rng = parsePersistedBattleRng(battle.rngState);
      const target = state.enemies.find((enemy) => enemy.hp > 0);
      if (!target) throw new PendekarBattleActionError("BATTLE_ACTION_INVALID_STATE", "Battle has no living enemy");

      // Resolve skillId: basic_attack → BASIC_ATTACK_SKILL_ID, mahapukul → canonical, skill → validated skillId.
      let resolvedSkillId: string;
      if (input.action === "basic_attack") {
        resolvedSkillId = BASIC_ATTACK_SKILL_ID;
      } else if (input.action === "skill") {
        // Validate skillId against canonical definitions (server-owned).
        const skill = skillById(input.skillId!);
        if (!skill) {
          throw new PendekarBattleActionError("BATTLE_ACTION_INVALID_SKILL", `Unknown skill: ${input.skillId}`);
        }
        const playerLevel = state.player.level ?? 1;
        if ((skill.unlockLevel ?? 1) > playerLevel) {
          throw new PendekarBattleActionError("BATTLE_ACTION_SKILL_LOCKED", `Skill ${input.skillId} is locked for level ${playerLevel}`);
        }
        resolvedSkillId = input.skillId!;
      } else {
        resolvedSkillId = "skill.mahapukul";
      }

      const playerOutcome = playerAct(
        state,
        {
          battleId: state.battleId,
          turn: state.turn,
          actorId: state.player.id,
          targetId: target.id,
          skillId: resolvedSkillId,
          learningCorrect: learning.isCorrect,
          charm: false,
        },
        rng,
      );
      if (!playerOutcome.ok) {
        throw new PendekarBattleActionError("BATTLE_ACTION_RESOLUTION_FAILED", `Canonical player action was rejected: ${playerOutcome.reason ?? "unknown"}`);
      }

      // Preserve the canonical prototype order: a surviving enemy answers in
      // the same authoritative action. The browser cannot suppress this turn.
      let resolved = playerOutcome;
      if (resolved.state.result === undefined) {
        const enemy = resolved.state.enemies.find((candidate) => candidate.hp > 0);
        if (!enemy) throw new PendekarBattleActionError("BATTLE_ACTION_INVALID_STATE", "Battle has no eligible enemy response");
        const enemyOutcome = enemyAct(
          resolved.state,
          {
            battleId: resolved.state.battleId,
            turn: resolved.state.turn,
            actorId: enemy.id,
            enemyId: enemy.id,
            charm: false,
          },
          resolved.rng,
        );
        if (!enemyOutcome.ok) {
          throw new PendekarBattleActionError("BATTLE_ACTION_RESOLUTION_FAILED", `Canonical enemy action was rejected: ${enemyOutcome.reason ?? "unknown"}`);
        }
        resolved = enemyOutcome;
      }

      const terminal = resolved.state.result;
      const status = terminal === "WIN" ? "WON" : terminal === "LOSE" ? "LOST" : "ACTIVE";
      const nextRevision = battle.actionRevision + 1;
      const nextState = serializedBattleState(resolved.state);
      const projection = projectBattle({
        id: battle.id,
        encounterKey: battle.encounterKey,
        status,
        turn: resolved.state.turn,
        actionRevision: nextRevision,
        expiresAt: battle.expiresAt,
        battleState: nextState,
      });

      await tx.pendekarBattleSession.update({
        where: { id: battle.id },
        data: {
          status,
          result: terminal ?? null,
          battleState: nextState,
          rngState: JSON.stringify(resolved.rng),
          turn: resolved.state.turn,
          actionRevision: { increment: 1 },
          ...(terminal === undefined ? {} : { endedAt: new Date() }),
        },
      });
      await tx.pendekarBattleAction.create({
        data: {
          battleSessionId: battle.id,
          learningSessionId: learning.id,
          requestKey: input.requestKey,
          requestFingerprint: fingerprint,
          actionKind: input.action,
          turnBefore: state.turn,
          turnAfter: resolved.state.turn,
          resultProjection: asInputJson(projection),
        },
      });
      return { category: "RESOLVED", battle: projection };
    });
  }

  /**
   * Create a pending entitlement only after an owned, engine-authenticated
   * victory. This deliberately does not settle XP, gold, wallet, inventory,
   * quests, or any platform economy state.
   */
  async createAuthoritativeBattleRewardReceipt(
    userId: string,
    battleId: string,
    input: CreateBattleRewardReceiptInput,
  ): Promise<CreateBattleRewardReceiptResult> {
    return this.serializable(async (tx) => {
      const battle = await tx.pendekarBattleSession.findFirst({
        where: { id: nonBlank(battleId, "battleId"), player: { userId: nonBlank(userId, "userId") } },
        include: {
          learningSession: true,
          battleActions: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!battle) throw new PendekarOwnershipError("Battle is not owned by this user");

      const byRequest = await tx.pendekarRewardReceipt.findUnique({ where: { idempotencyKey: input.requestKey } });
      if (byRequest) {
        if (byRequest.playerId !== battle.playerId || byRequest.sourceType !== "BATTLE" || byRequest.sourceId !== battle.id) {
          throw new PendekarBattleRewardError("BATTLE_REWARD_REPLAY_CONFLICT", "Reward replay key conflicts with another battle entitlement");
        }
        return { category: "REPLAYED", receipt: projectBattleRewardReceipt(byRequest) };
      }

      const reward = this.assertAuthoritativeBattleRewardEligibility(battle);
      const learning = battle.learningSession;
      if (!learning) throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Victory learning state is missing");
      const evidence = await tx.learningEvidence.findUnique({
        where: {
          userId_source_activityId_questionId: {
            userId,
            source: PENDEKAR_LEARNING_EVIDENCE_SOURCE,
            activityId: battle.id,
            questionId: learning.soalId,
          },
        },
      });
      if (!evidence || evidence.isCorrect !== learning.isCorrect || evidence.score !== (learning.isCorrect ? 1 : 0)) {
        throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Victory learning evidence cannot be verified");
      }
      const bySource = await tx.pendekarRewardReceipt.findUnique({
        where: { playerId_sourceType_sourceId: { playerId: battle.playerId, sourceType: "BATTLE", sourceId: battle.id } },
      });
      if (bySource) {
        this.assertBattleReceiptMatches(bySource, battle.playerId, battle.id, reward);
        return { category: "EXISTING", receipt: projectBattleRewardReceipt(bySource) };
      }

      const receipt = await tx.pendekarRewardReceipt.create({
        data: {
          playerId: battle.playerId,
          sourceType: "BATTLE",
          sourceId: battle.id,
          definitionVersion: PENDEKAR_BATTLE_REWARD_DEFINITION_VERSION,
          idempotencyKey: input.requestKey,
          status: "PENDING",
          rpgXp: reward.rpgXp,
          globalXp: 0,
          goldDelta: reward.goldDelta,
        },
      });
      return { category: "CREATED", receipt: projectBattleRewardReceipt(receipt) };
    });
  }

  /**
   * Settle one already-created battle entitlement atomically. The caller can
   * express intent with a replay key only; receipt values, owner, battle, XP,
   * gold, and settlement reference remain server-derived.
   */
  async settleAuthoritativeBattleReward(
    userId: string,
    battleId: string,
    input: SettleBattleRewardInput,
  ): Promise<SettleBattleRewardResult> {
    nonBlank(input.requestKey, "requestKey");
    return this.serializable(async (tx) => {
      const battle = await tx.pendekarBattleSession.findFirst({
        where: { id: nonBlank(battleId, "battleId"), player: { userId: nonBlank(userId, "userId") } },
        include: {
          learningSession: true,
          battleActions: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!battle) throw new PendekarOwnershipError("Battle is not owned by this user");

      const reward = this.assertAuthoritativeBattleRewardEligibility(battle);
      await this.assertBattleLearningEvidence(tx, userId, battle);
      const receipt = await tx.pendekarRewardReceipt.findUnique({
        where: { playerId_sourceType_sourceId: { playerId: battle.playerId, sourceType: "BATTLE", sourceId: battle.id } },
      });
      if (!receipt) {
        throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_NOT_READY", "Battle has no authoritative reward receipt");
      }
      this.assertBattleReceiptMatches(receipt, battle.playerId, battle.id, reward);
      this.assertSettleableBattleReceipt(receipt);

      const player = await tx.pendekarPlayer.findUnique({ where: { id: battle.playerId } });
      if (!player || player.userId !== userId) throw new PendekarOwnershipError("Pendekar player is not owned by this user");
      const [xpEntry, walletEntry] = await Promise.all([
        tx.pendekarRpgXpEntry.findUnique({ where: { receiptId: receipt.id } }),
        tx.pendekarWalletEntry.findUnique({ where: { receiptId: receipt.id } }),
      ]);
      const reference = settlementReference(receipt.id);
      const walletReason = settlementWalletReason(battle.id, receipt.id);

      if (receipt.status === "SETTLED") {
        this.assertSettledBattleEffects({ receipt, xpEntry, walletEntry, reference, walletReason });
        return {
          category: "REPLAYED",
          settlement: projectBattleSettlement(receipt, reference),
        };
      }
      if (xpEntry || walletEntry) {
        throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Pending receipt has unexpected settlement effects");
      }

      const progression = grantXp({
        level: player.rpgLevel,
        xp: player.rpgXp,
        xpToNextLevel: xpForLevel(player.rpgLevel),
      }, receipt.rpgXp);
      const balanceAfter = player.goldBalance + receipt.goldDelta;
      if (balanceAfter < 0) {
        throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Reward would create a negative Pendekar balance");
      }

      await tx.pendekarRpgXpEntry.create({
        data: {
          playerId: player.id,
          receiptId: receipt.id,
          delta: receipt.rpgXp,
          levelBefore: player.rpgLevel,
          levelAfter: progression.level,
          xpBefore: player.rpgXp,
          xpAfter: progression.xp,
          reference,
        },
      });
      await tx.pendekarWalletEntry.create({
        data: {
          playerId: player.id,
          receiptId: receipt.id,
          delta: receipt.goldDelta,
          balanceAfter,
          reason: walletReason,
        },
      });
      await tx.pendekarPlayer.update({
        where: { id: player.id },
        data: {
          rpgLevel: progression.level,
          rpgXp: progression.xp,
          goldBalance: balanceAfter,
          version: { increment: 1 },
        },
      });
      const settledAt = new Date();
      const settledReceipt = await tx.pendekarRewardReceipt.update({
        where: { id: receipt.id },
        data: { status: "SETTLED", settledAt, failureCode: null },
      });
      return {
        category: "SETTLED",
        settlement: projectBattleSettlement(settledReceipt, reference),
      };
    });
  }

  async getQuestProgress(userId: string, questKey = DEFAULT_QUEST.key) {
    const player = await this.getOwnedPendekarPlayer(userId);
    if (!player) return null;
    return this.prisma.pendekarQuestProgress.findUnique({
      where: { playerId_questKey: { playerId: player.id, questKey: this.assertQuestKey(questKey) } },
    });
  }

  /** Only static application keys can create a mutable player quest row. */
  async getOrCreateQuestProgress(userId: string, questKey = DEFAULT_QUEST.key) {
    const staticQuestKey = this.assertQuestKey(questKey);
    return this.serializable(async (tx) => {
      const player = await this.playerForUser(tx, userId);
      return tx.pendekarQuestProgress.upsert({
        where: { playerId_questKey: { playerId: player.id, questKey: staticQuestKey } },
        update: {},
        create: {
          playerId: player.id,
          questKey: staticQuestKey,
          target: DEFAULT_QUEST.target,
          definitionVersion: DEFAULT_QUEST.definitionVersion,
        },
      });
    });
  }

  /**
   * Terminal quest transition for a server-verified target. The caller supplies
   * only a server-derived reward amount; source identity is derived from the
   * persisted quest row and cannot be chosen by a client.
   */
  async completeQuestWithServerReward(
    userId: string,
    input: { questKey?: string; idempotencyKey: string; rpgXp: number; goldDelta: number },
  ) {
    const questKey = this.assertQuestKey(input.questKey ?? DEFAULT_QUEST.key);
    const planBase = {
      rpgXp: input.rpgXp,
      goldDelta: input.goldDelta,
      idempotencyKey: input.idempotencyKey,
    };
    this.assertRewardPlan({ sourceType: "QUEST", sourceId: "pending", ...planBase });
    return this.serializable(async (tx) => {
      const player = await this.playerForUser(tx, userId);
      const quest = await tx.pendekarQuestProgress.findUnique({
        where: { playerId_questKey: { playerId: player.id, questKey } },
      });
      if (!quest) throw new PendekarConflictError("Quest has not been created");
      const sourceId = `quest:${quest.id}:turn-in`;
      const plan: ServerRewardPlan = { sourceType: "QUEST", sourceId, ...planBase, globalXp: 0 };
      const existing = await tx.pendekarRewardReceipt.findUnique({
        where: { playerId_sourceType_sourceId: { playerId: player.id, sourceType: "QUEST", sourceId } },
      });
      if (existing) {
        this.assertSameReceipt(existing, player.id, plan);
        return { quest, receipt: existing, completed: false };
      }
      const changed = await tx.pendekarQuestProgress.updateMany({
        where: {
          id: quest.id,
          playerId: player.id,
          status: { in: ["ACTIVE", "COMPLETED"] },
          progress: { gte: quest.target },
        },
        data: { status: "TURNED_IN", turnedInAt: new Date(), version: { increment: 1 } },
      });
      if (changed.count !== 1) throw new PendekarConflictError("Quest is not ready to turn in");
      const receipt = await this.createReceiptForPlayer(tx, player.id, plan);
      const completedQuest = await tx.pendekarQuestProgress.findUniqueOrThrow({ where: { id: quest.id } });
      return { quest: completedQuest, receipt: receipt.value, completed: receipt.created };
    });
  }

  /**
   * P2.6I.2: Server-authoritative quest state mutation.
   *
   * The client reports WHAT changed (kind + optional to/flagName); the server
   * validates against canonical transitions and the 16-flag vocabulary, then
   * persists to the PendekarPlayer.questState JSONB column. Replay protection
   * via requestKey deduplication within a sliding window.
   *
   * The server never trusts the client's quest.main/kills/flowers values.
   * It reads the current state, validates the transition, applies it, and
   * writes the authoritative result.
   */
  async mutateQuestState(
    userId: string,
    input: QuestMutationInput,
  ): Promise<QuestMutationResult> {
    const player = await this.getOwnedPendekarPlayer(userId);
    if (!player) {
      throw new PendekarOwnershipError("Player not found");
    }

    return this.serializable(async (tx) => {
      // Re-fetch under serializable to avoid phantom reads.
      const p = await tx.pendekarPlayer.findUniqueOrThrow({
        where: { id: player.id },
        select: {
          id: true, questState: true, flags: true, version: true,
          openedChests: true, deadBossIds: true, pickedGe: true,
        },
      });

      const currentQuest = safeJson<{ main: number; kills: number; flowers: number }>(
        p.questState,
        { main: 0, kills: 0, flowers: 0 },
      );
      const currentFlags = safeJson<Record<string, boolean>>(p.flags, {});
      const currentOpenedChests = safeJson<string[]>(p.openedChests, []);
      const currentDeadBossIds = safeJson<string[]>(p.deadBossIds, []);
      const currentPickedGe = safeJson<string[]>(p.pickedGe, []);

      // ── Replay dedup ─────────────────────────────────────
      // Detect replays within the same server instance via an in-memory
      // Set keyed by `${userId}:${requestKey}`.  The sliding window is
      // bounded to 256 entries per player to prevent memory leaks.
      const dedupKey = `${userId}:${input.requestKey}`;
      if (!replayGuard.has(dedupKey)) {
        replayGuard.add(dedupKey);
        // Prune per-player guard if it exceeds the window.
        const playerPrefix = `${userId}:`;
        let count = 0;
        for (const k of replayGuard) {
          if (k.startsWith(playerPrefix)) {
            count++;
            if (count > 256) replayGuard.delete(k);
          }
        }
      } else {
        // Replay detected — return current state without mutation.
        return {
          category: "REPLAYED" as const,
          quest: currentQuest,
          flags: currentFlags,
          openedChests: currentOpenedChests,
          deadBossIds: currentDeadBossIds,
          pickedGe: currentPickedGe,
          applied: [],
          version: p.version,
        };
      }

      const applied: string[] = [];
      let newQuest = { ...currentQuest };
      let newFlags = { ...currentFlags };
      let newOpenedChests = [...currentOpenedChests];
      let newDeadBossIds = [...currentDeadBossIds];
      let newPickedGe = [...currentPickedGe];

      // ── Validate + apply ──────────────────────────────────
      if (input.kind === "QUEST_ADVANCE") {
        if (typeof input.to !== "number") {
          throw new PendekarQuestMutationError(
            "QUEST_MUTATION_INVALID_TRANSITION",
            "to is required for QUEST_ADVANCE",
          );
        }
        const ctx = { quest: newQuest.main, kills: newQuest.kills, flags: newFlags };
        if (!isValidQuestTransition(newQuest.main, input.to, ctx)) {
          throw new PendekarQuestMutationError(
            "QUEST_MUTATION_INVALID_TRANSITION",
            `Invalid quest transition ${newQuest.main}→${input.to}`,
          );
        }
        newQuest = { ...newQuest, main: input.to };
        applied.push("QUEST");
      } else if (input.kind === "KILL") {
        newQuest = { ...newQuest, kills: newQuest.kills + 1 };
        applied.push("KILL");
      } else if (input.kind === "FLOWER_PICK") {
        newQuest = { ...newQuest, flowers: newQuest.flowers + 1 };
        applied.push("FLOWER");
      } else if (input.kind === "FLAG") {
        if (!input.flagName || !QUEST_FLAG_NAMES.includes(input.flagName)) {
          throw new PendekarQuestMutationError(
            "QUEST_MUTATION_INVALID_FLAG",
            `Invalid flag name: ${input.flagName ?? "(empty)"}`,
          );
        }
        newFlags = { ...newFlags, [input.flagName]: true };
        applied.push("FLAG");
      } else if (input.kind === "CHEST_OPEN") {
        if (!input.chestId) {
          throw new PendekarQuestMutationError(
            "QUEST_MUTATION_INVALID_TRANSITION",
            "chestId is required for CHEST_OPEN",
          );
        }
        // Idempotent: skip if already opened.
        if (!newOpenedChests.includes(input.chestId)) {
          newOpenedChests = [...newOpenedChests, input.chestId];
          applied.push("CHEST_OPEN");
        }
      } else if (input.kind === "BOSS_KILL") {
        if (!input.bossId) {
          throw new PendekarQuestMutationError(
            "QUEST_MUTATION_INVALID_TRANSITION",
            "bossId is required for BOSS_KILL",
          );
        }
        // Idempotent: skip if already recorded.
        if (!newDeadBossIds.includes(input.bossId)) {
          newDeadBossIds = [...newDeadBossIds, input.bossId];
          applied.push("BOSS_KILL");
        }
      } else if (input.kind === "GE_PICK") {
        if (!input.geKey) {
          throw new PendekarQuestMutationError(
            "QUEST_MUTATION_INVALID_TRANSITION",
            "geKey is required for GE_PICK",
          );
        }
        // Idempotent: skip if already picked.
        if (!newPickedGe.includes(input.geKey)) {
          newPickedGe = [...newPickedGe, input.geKey];
          applied.push("GE_PICK");
        }
      }

      // ── Persist ───────────────────────────────────────────
      await tx.pendekarPlayer.update({
        where: { id: p.id },
        data: {
          questState: JSON.parse(JSON.stringify(newQuest)) as Prisma.InputJsonValue,
          flags: JSON.parse(JSON.stringify(newFlags)) as Prisma.InputJsonValue,
          openedChests: JSON.parse(JSON.stringify(newOpenedChests)) as Prisma.InputJsonValue,
          deadBossIds: JSON.parse(JSON.stringify(newDeadBossIds)) as Prisma.InputJsonValue,
          pickedGe: JSON.parse(JSON.stringify(newPickedGe)) as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });

      return {
        category: "APPLIED",
        quest: newQuest,
        flags: newFlags,
        openedChests: newOpenedChests,
        deadBossIds: newDeadBossIds,
        pickedGe: newPickedGe,
        applied,
        version: p.version + 1,
      };
    });
  }

  async createBattleSession(userId: string, seed: ServerBattleSeed): Promise<CreateResult<Awaited<ReturnType<typeof this.getOwnedBattleSession>>>> {
    this.assertBattleSeed(seed);
    try {
      return await this.serializable(async (tx) => {
        const player = await this.playerForUser(tx, userId);
        // A stale session is terminal and has no reward side effect. Retiring it
        // here lets a later start proceed without a generic client save action.
        await tx.pendekarBattleSession.updateMany({
          where: { playerId: player.id, status: "ACTIVE", expiresAt: { lte: new Date() } },
          data: { status: "EXPIRED", endedAt: new Date(), actionRevision: { increment: 1 } },
        });
        const existing = await tx.pendekarBattleSession.findUnique({
          where: { playerId_startRequestId: { playerId: player.id, startRequestId: seed.startRequestId } },
        });
        if (existing) return { value: existing, created: false };
        const battle = await tx.pendekarBattleSession.create({
          data: {
            playerId: player.id,
            encounterKey: seed.encounterKey,
            encounterDefinitionVersion: seed.encounterDefinitionVersion,
            battleState: seed.battleState,
            rngState: seed.rngState,
            originMapKey: seed.origin.mapKey,
            originX: seed.origin.x,
            originY: seed.origin.y,
            startRequestId: seed.startRequestId,
            expiresAt: seed.expiresAt,
          },
        });
        return { value: battle, created: true };
      });
    } catch (error) {
      if (!isKnownPrismaError(error, "P2002")) throw error;
      const player = await this.getOwnedPendekarPlayer(userId);
      if (!player) throw new PendekarOwnershipError("Pendekar player not found");
      const replay = await this.prisma.pendekarBattleSession.findUnique({
        where: { playerId_startRequestId: { playerId: player.id, startRequestId: seed.startRequestId } },
      });
      if (replay) return { value: replay, created: false };
      throw new PendekarConflictError("Player already has an active battle");
    }
  }

  async getOwnedBattleSession(userId: string, battleId: string) {
    return this.prisma.pendekarBattleSession.findFirst({
      where: { id: nonBlank(battleId, "battleId"), player: { userId: nonBlank(userId, "userId") } },
    });
  }

  async createLearningSession(userId: string, battleId: string, seed: ServerLearningSeed): Promise<CreateResult<Awaited<ReturnType<typeof this.getOwnedLearningSession>>>> {
    this.assertLearningSeed(seed);
    try {
      return await this.serializable(async (tx) => {
      const battle = await tx.pendekarBattleSession.findFirst({
        where: { id: nonBlank(battleId, "battleId"), player: { userId: nonBlank(userId, "userId") } },
      });
      if (!battle) throw new PendekarOwnershipError("Battle is not owned by this user");
      if (battle.status !== "ACTIVE" || battle.expiresAt <= new Date()) {
        throw new PendekarConflictError("Battle is not active");
      }

      const existing = await tx.pendekarLearningSession.findUnique({ where: { battleSessionId: battle.id } });
      if (existing) return { value: existing, created: false };
      const question = await tx.soal.findUnique({
        where: { id: seed.soalId },
        select: canonicalSoalSelect,
      });
      if (!question) throw new PendekarInvariantError("Learning question does not exist in the canonical Soal bank");
      if (!isEligibleForGameplay(soalToGameQuestion(soalToSoalLike(question)))) {
        throw new PendekarLearningError("QUESTION_NOT_ELIGIBLE", "Learning question does not satisfy the canonical quality gate");
      }
      const learning = await tx.pendekarLearningSession.create({
        data: {
          battleSessionId: battle.id,
          soalId: question.id,
          questionVersion: question.updatedAt.toISOString(),
          answerFingerprint: answerFingerprint(question.correctAnswer),
          attemptId: seed.attemptId,
          expiresAt: seed.expiresAt,
        },
      });
      return { value: learning, created: true };
    });
    } catch (error) {
      if (!isKnownPrismaError(error, "P2002")) throw error;
      const battle = await this.getOwnedBattleSession(userId, battleId);
      if (!battle) throw new PendekarOwnershipError("Battle is not owned by this user");
      const replay = await this.prisma.pendekarLearningSession.findUnique({ where: { battleSessionId: battle.id } });
      if (replay) return { value: replay, created: false };
      throw error;
    }
  }

  async getOwnedLearningSession(userId: string, learningId: string) {
    return this.prisma.pendekarLearningSession.findFirst({
      where: {
        id: nonBlank(learningId, "learningId"),
        battleSession: { player: { userId: nonBlank(userId, "userId") } },
      },
    });
  }

  async createRewardReceipt(userId: string, plan: ServerRewardPlan): Promise<CreateResult<Awaited<ReturnType<typeof this.getOwnedRewardReceipt>>>> {
    this.assertRewardPlan(plan);
    return this.serializable(async (tx) => {
      const player = await this.playerForUser(tx, userId);
      return this.createReceiptForPlayer(tx, player.id, plan);
    });
  }

  async getOwnedRewardReceipt(userId: string, receiptId: string) {
    return this.prisma.pendekarRewardReceipt.findFirst({
      where: { id: nonBlank(receiptId, "receiptId"), player: { userId: nonBlank(userId, "userId") } },
    });
  }

  /**
   * Atomically settles one receipt into the isolated Pendekar wallet. Global
   * XP is intentionally rejected here until the founder changes the policy.
   */
  async settleRewardToWallet(userId: string, receiptId: string) {
    return this.serializable(async (tx) => {
      const player = await tx.pendekarPlayer.findUnique({ where: { userId: nonBlank(userId, "userId") } });
      if (!player) throw new PendekarOwnershipError("Pendekar player not found");
      const receipt = await tx.pendekarRewardReceipt.findFirst({
        where: { id: nonBlank(receiptId, "receiptId"), playerId: player.id },
      });
      if (!receipt) throw new PendekarOwnershipError("Reward receipt is not owned by this user");
      if (receipt.globalXp !== 0) throw new PendekarInvariantError("Global XP is disabled for Pendekar");
      if (receipt.status === "VOID") throw new PendekarConflictError("Void receipt cannot be settled");

      const existing = await tx.pendekarWalletEntry.findUnique({ where: { receiptId: receipt.id } });
      if (existing) {
        if (receipt.status !== "SETTLED") {
          await tx.pendekarRewardReceipt.update({
            where: { id: receipt.id },
            data: { status: "SETTLED", settledAt: receipt.settledAt ?? new Date() },
          });
        }
        return { entry: existing, settled: false };
      }

      if (receipt.status === "SETTLED") {
        throw new PendekarInvariantError("Settled receipt is missing its wallet entry");
      }
      const balanceAfter = player.goldBalance + receipt.goldDelta;
      if (balanceAfter < 0) throw new PendekarInvariantError("Reward would create a negative Pendekar balance");

      if (receipt.goldDelta === 0) {
        await tx.pendekarRewardReceipt.update({
          where: { id: receipt.id },
          data: { status: "SETTLED", settledAt: new Date() },
        });
        return { entry: null, settled: true };
      }

      const entry = await tx.pendekarWalletEntry.create({
        data: {
          playerId: player.id,
          receiptId: receipt.id,
          delta: receipt.goldDelta,
          balanceAfter,
          reason: `${receipt.sourceType}:${receipt.sourceId}`,
        },
      });
      await tx.pendekarPlayer.update({
        where: { id: player.id },
        data: { goldBalance: balanceAfter, version: { increment: 1 } },
      });
      await tx.pendekarRewardReceipt.update({
        where: { id: receipt.id },
        data: { status: "SETTLED", settledAt: new Date() },
      });
      return { entry, settled: true };
    });
  }

  /** Marks a stale active battle expired; no reward can be produced by this action. */
  async expireOwnedBattle(userId: string, battleId: string, now = new Date()): Promise<boolean> {
    const expired = await this.prisma.pendekarBattleSession.updateMany({
      where: {
        id: nonBlank(battleId, "battleId"),
        player: { userId: nonBlank(userId, "userId") },
        status: "ACTIVE",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED", endedAt: now, actionRevision: { increment: 1 } },
    });
    return expired.count === 1;
  }

  private async createReceiptForPlayer(tx: TransactionClient, playerId: string, plan: ServerRewardPlan) {
    const byKey = await tx.pendekarRewardReceipt.findUnique({ where: { idempotencyKey: plan.idempotencyKey } });
    if (byKey) {
      this.assertSameReceipt(byKey, playerId, plan);
      return { value: byKey, created: false };
    }
    const bySource = await tx.pendekarRewardReceipt.findUnique({
      where: { playerId_sourceType_sourceId: { playerId, sourceType: plan.sourceType, sourceId: plan.sourceId } },
    });
    if (bySource) {
      this.assertSameReceipt(bySource, playerId, plan);
      return { value: bySource, created: false };
    }
    const receipt = await tx.pendekarRewardReceipt.create({ data: { playerId, ...plan, globalXp: 0 } });
    return { value: receipt, created: true };
  }

  private assertSameReceipt(
    receipt: { playerId: string; sourceType: string; sourceId: string; idempotencyKey: string; rpgXp: number; globalXp: number; goldDelta: number },
    playerId: string,
    plan: ServerRewardPlan,
  ): void {
    if (
      receipt.playerId !== playerId ||
      receipt.sourceType !== plan.sourceType ||
      receipt.sourceId !== plan.sourceId ||
      receipt.idempotencyKey !== plan.idempotencyKey ||
      receipt.rpgXp !== plan.rpgXp ||
      receipt.globalXp !== 0 ||
      receipt.goldDelta !== plan.goldDelta
    ) {
      throw new PendekarConflictError("Idempotency key or reward source conflicts with an existing receipt");
    }
  }

  private assertQuestKey(questKey: string): string {
    if (questKey !== DEFAULT_QUEST.key) {
      throw new PendekarInvariantError("Quest key is not an approved static definition");
    }
    return questKey;
  }

  private assertActiveBattle(battle: { status: string; expiresAt: Date }): void {
    if (battle.status !== "ACTIVE") {
      throw new PendekarLearningError("LEARNING_NOT_ACTIVE", "Battle is not active");
    }
    if (battle.expiresAt <= new Date()) {
      throw new PendekarLearningError("LEARNING_EXPIRED", "Battle has expired");
    }
  }

  private assertActionableBattle(battle: { status: string; result: string | null; expiresAt: Date }): void {
    if (battle.status === "EXPIRED" || battle.expiresAt <= new Date()) {
      throw new PendekarBattleActionError("BATTLE_EXPIRED", "Battle has expired");
    }
    if (battle.status === "WON" || battle.status === "LOST" || battle.status === "FLED" || battle.result !== null) {
      throw new PendekarBattleActionError("BATTLE_TERMINAL", "Battle is already terminal");
    }
    if (battle.status !== "ACTIVE") {
      throw new PendekarBattleActionError("BATTLE_NOT_ACTIVE", "Battle is not active");
    }
  }

  private assertAuthoritativeBattleRewardEligibility(
    battle: {
      id: string;
      playerId: string;
      status: string;
      result: string | null;
      endedAt: Date | null;
      turn: number;
      battleState: Prisma.JsonValue;
      learningSession: { id: string; soalId: string; status: string; isCorrect: boolean | null; answerRequestId: string | null; answeredAt: Date | null } | null;
      battleActions: Array<{ turnAfter: number; resultProjection: Prisma.JsonValue }>;
    },
  ): { rpgXp: number; goldDelta: number } {
    if (battle.status !== "WON" || battle.result !== "WIN" || !battle.endedAt) {
      throw new PendekarBattleRewardError("BATTLE_REWARD_NOT_ELIGIBLE", "Only an authoritative player victory is reward eligible");
    }
    const state = parsePersistedBattleState(battle.battleState);
    const result = toBattleResult(state);
    if (!result || result.outcome !== "WIN" || state.phase !== "VICTORY" || state.result !== "WIN") {
      throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Persisted battle victory state is invalid");
    }
    const action = battle.battleActions.find((candidate) => candidate.turnAfter === battle.turn);
    if (!action) {
      throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Victory has no authoritative action receipt");
    }
    const actionProjection = projectStoredBattleProjection(action.resultProjection);
    if (actionProjection.id !== battle.id || actionProjection.status !== "WON" || actionProjection.phase !== "VICTORY") {
      throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Victory action receipt does not match the battle");
    }
    const learning = battle.learningSession;
    if (!learning || learning.status !== "ANSWERED" || learning.isCorrect === null || !learning.answerRequestId || !learning.answeredAt) {
      throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Victory has no completed authoritative learning result");
    }
    return { rpgXp: result.xp, goldDelta: result.goldIntent };
  }

  private assertBattleReceiptMatches(
    receipt: { playerId: string; sourceType: string; sourceId: string; definitionVersion: string | null; rpgXp: number; globalXp: number; goldDelta: number },
    playerId: string,
    battleId: string,
    reward: { rpgXp: number; goldDelta: number },
  ): void {
    if (
      receipt.playerId !== playerId
      || receipt.sourceType !== "BATTLE"
      || receipt.sourceId !== battleId
      || receipt.definitionVersion !== PENDEKAR_BATTLE_REWARD_DEFINITION_VERSION
      || receipt.rpgXp !== reward.rpgXp
      || receipt.globalXp !== 0
      || receipt.goldDelta !== reward.goldDelta
    ) {
      throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Existing battle receipt does not match canonical reward eligibility");
    }
  }

  private async assertBattleLearningEvidence(
    tx: TransactionClient,
    userId: string,
    battle: { id: string; learningSession: { soalId: string; isCorrect: boolean | null } | null },
  ): Promise<void> {
    const learning = battle.learningSession;
    if (!learning) {
      throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Battle learning state is missing");
    }
    const evidence = await tx.learningEvidence.findUnique({
      where: {
        userId_source_activityId_questionId: {
          userId,
          source: PENDEKAR_LEARNING_EVIDENCE_SOURCE,
          activityId: battle.id,
          questionId: learning.soalId,
        },
      },
    });
    if (!evidence || evidence.isCorrect !== learning.isCorrect || evidence.score !== (learning.isCorrect ? 1 : 0)) {
      throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Battle learning evidence cannot be verified");
    }
  }

  private assertSettleableBattleReceipt(receipt: {
    status: string;
    definitionVersion: string | null;
    rpgXp: number;
    globalXp: number;
    goldDelta: number;
    itemPlan: Prisma.JsonValue | null;
  }): void {
    if (receipt.status !== "PENDING" && receipt.status !== "SETTLED") {
      throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Receipt is not settleable");
    }
    if (
      receipt.definitionVersion !== PENDEKAR_BATTLE_REWARD_DEFINITION_VERSION
      || receipt.globalXp !== 0
      || receipt.itemPlan !== null
      || !Number.isInteger(receipt.rpgXp) || receipt.rpgXp < 0
      || !Number.isInteger(receipt.goldDelta) || receipt.goldDelta < 0
    ) {
      throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Receipt contains unsupported settlement effects");
    }
  }

  private assertSettledBattleEffects(args: {
    receipt: { id: string; playerId: string; rpgXp: number; goldDelta: number; settledAt: Date | null };
    xpEntry: { playerId: string; receiptId: string; delta: number; reference: string } | null;
    walletEntry: { playerId: string; receiptId: string; delta: number; reason: string } | null;
    reference: string;
    walletReason: string;
  }): void {
    const { receipt, xpEntry, walletEntry, reference, walletReason } = args;
    if (
      !receipt.settledAt
      || !xpEntry
      || xpEntry.playerId !== receipt.playerId
      || xpEntry.receiptId !== receipt.id
      || xpEntry.delta !== receipt.rpgXp
      || xpEntry.reference !== reference
      || !walletEntry
      || walletEntry.playerId !== receipt.playerId
      || walletEntry.receiptId !== receipt.id
      || walletEntry.delta !== receipt.goldDelta
      || walletEntry.reason !== walletReason
    ) {
      throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Settled receipt has incomplete settlement effects");
    }
  }

  private async resolveLearningQuestion(
    tx: TransactionClient,
    soalId: string,
    expectedVersion: string,
  ): Promise<ResolvedChallenge> {
    const question = await tx.soal.findUnique({
      where: { id: nonBlank(soalId, "soalId") },
      select: canonicalSoalSelect,
    });
    if (!question) {
      throw new PendekarLearningError("QUESTION_NOT_ELIGIBLE", "Learning question is unavailable");
    }
    if (question.updatedAt.toISOString() !== expectedVersion) {
      throw new PendekarLearningError("QUESTION_VERSION_STALE", "Learning question changed after session creation");
    }
    const asSoal = soalToSoalLike(question);
    if (!isEligibleForGameplay(soalToGameQuestion(asSoal))) {
      throw new PendekarLearningError("QUESTION_NOT_ELIGIBLE", "Learning question does not satisfy the canonical quality gate");
    }
    const resolved = adaptSoalToChallenge(asSoal, "BATTLE");
    if (!resolved) {
      throw new PendekarLearningError("QUESTION_NOT_ELIGIBLE", "Learning question cannot form a canonical challenge");
    }
    return resolved;
  }

  private resolveControlledSliceEncounter(mapKey: string, encounterId: string) {
    if (mapKey !== CONTROLLED_SLICE_MAP_KEY) {
      throw new PendekarBattleStartError("INVALID_PLAYER_STATE", "Battle start is only enabled on the controlled slice map");
    }
    if (!ALLOWED_SLICE_ENCOUNTERS.has(encounterId)) {
      throw new PendekarBattleStartError("INVALID_ENCOUNTER", "Encounter is not enabled for the controlled slice");
    }
    const map = getCanonicalMap(CONTROLLED_SLICE_MAP_KEY);
    const spawn = map?.enemySpawns.find((candidate) => candidate.id === encounterId);
    const enemy = spawn ? canonicalEnemyByPrototypeKey(spawn.type) : undefined;
    if (!spawn || !enemy) {
      throw new PendekarBattleStartError("INVALID_ENCOUNTER", "Encounter has no canonical controlled-slice definition");
    }
    return { id: spawn.id, enemy };
  }

  private assertBattleSeed(seed: ServerBattleSeed): void {
    if (!ALLOWED_SLICE_ENCOUNTERS.has(seed.encounterKey)) {
      throw new PendekarInvariantError("Encounter key is not approved for the controlled slice");
    }
    nonBlank(seed.encounterDefinitionVersion, "encounterDefinitionVersion");
    nonBlank(seed.rngState, "rngState");
    nonBlank(seed.startRequestId, "startRequestId");
    nonBlank(seed.origin.mapKey, "origin.mapKey");
    finitePosition(seed.origin.x, "origin.x");
    finitePosition(seed.origin.y, "origin.y");
    if (!(seed.expiresAt instanceof Date) || Number.isNaN(seed.expiresAt.getTime()) || seed.expiresAt <= new Date()) {
      throw new PendekarInvariantError("expiresAt must be in the future");
    }
  }

  private assertLearningSeed(seed: ServerLearningSeed): void {
    nonBlank(seed.soalId, "soalId");
    nonBlank(seed.attemptId, "attemptId");
    if (!(seed.expiresAt instanceof Date) || Number.isNaN(seed.expiresAt.getTime()) || seed.expiresAt <= new Date()) {
      throw new PendekarInvariantError("expiresAt must be in the future");
    }
  }

  private assertRewardPlan(plan: ServerRewardPlan): void {
    nonBlank(plan.sourceId, "sourceId");
    nonBlank(plan.idempotencyKey, "idempotencyKey");
    nonNegativeInteger(plan.rpgXp, "rpgXp");
    if (plan.globalXp !== undefined && plan.globalXp !== 0) {
      throw new PendekarInvariantError("Global XP is disabled for Pendekar");
    }
    if (!Number.isInteger(plan.goldDelta)) {
      throw new PendekarInvariantError("goldDelta must be an integer");
    }
  }
}

function answerFingerprint(answer: string): string {
  return createHash("sha256").update(answer.trim().normalize("NFC")).digest("hex");
}

function playerToBattleState(player: PendekarPlayer): RPGPlayerState {
  if (!isFacing(player.facing)) {
    throw new PendekarBattleStartError("INVALID_PLAYER_STATE", "Player facing is not a valid world direction");
  }
  assertNormalized(player.positionX, "player.positionX");
  assertNormalized(player.positionY, "player.positionY");
  for (const [label, value] of Object.entries({
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    attack: player.attack,
    defense: player.defense,
    level: player.rpgLevel,
    xp: player.rpgXp,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new PendekarBattleStartError("INVALID_PLAYER_STATE", `${label} is invalid`);
    }
  }
  if (player.maxHp <= 0 || player.maxMp <= 0 || player.rpgLevel < 1 || player.hp > player.maxHp || player.mp > player.maxMp) {
    throw new PendekarBattleStartError("INVALID_PLAYER_STATE", "Player combat state is inconsistent");
  }
  return {
    id: player.id,
    name: "Pendekar",
    position: { x: player.positionX, y: player.positionY },
    facing: player.facing,
    stats: {
      hp: player.hp,
      maxHp: player.maxHp,
      mp: player.mp,
      maxMp: player.maxMp,
      attack: player.attack,
      defense: player.defense,
      speed: player.speed,
    },
    progression: { level: player.rpgLevel, xp: player.rpgXp, xpToNextLevel: 100 },
    inventory: { items: [] },
    equipment: { weaponId: null, armorId: null, accessoryId: null, weaponPlus: 0 },
  };
}

function isFacing(value: string): value is RPGFacing {
  return value === "up" || value === "down" || value === "left" || value === "right";
}

function assertNormalized(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new PendekarBattleStartError("INVALID_PLAYER_STATE", `${label} is not a normalized coordinate`);
  }
}

type BattleProjectionSource = {
  id: string;
  encounterKey: string;
  status: string;
  turn: number;
  actionRevision: number;
  expiresAt: Date;
  battleState: Prisma.JsonValue;
};

function projectBattle(battle: BattleProjectionSource): PendekarBattleProjection {
  const state = asJsonRecord(battle.battleState, "battleState");
  const player = projectBattleActor(state.player, "battleState.player");
  const enemyValue = state.enemies;
  if (!Array.isArray(enemyValue)) throw new PendekarInvariantError("battleState.enemies is invalid");
  return {
    id: battle.id,
    encounterId: battle.encounterKey,
    status: battle.status,
    phase: jsonString(state.phase, "battleState.phase"),
    turn: battle.turn,
    actionRevision: battle.actionRevision,
    expiresAt: battle.expiresAt.toISOString(),
    player,
    enemies: enemyValue.map((enemy, index) => projectBattleActor(enemy, `battleState.enemies[${index}]`)),
  };
}

function projectBattleActor(value: Prisma.JsonValue | undefined, label: string): PendekarBattleActorProjection {
  const actor = asJsonRecord(value, label);
  const mp = optionalJsonNumber(actor.mp, `${label}.mp`);
  const maxMp = optionalJsonNumber(actor.maxMp, `${label}.maxMp`);
  const level = optionalJsonNumber(actor.level, `${label}.level`);
  const boss = actor.boss === undefined ? undefined : jsonBoolean(actor.boss, `${label}.boss`);
  return {
    id: jsonString(actor.id, `${label}.id`),
    name: jsonString(actor.name, `${label}.name`),
    hp: jsonNumber(actor.hp, `${label}.hp`),
    maxHp: jsonNumber(actor.maxHp, `${label}.maxHp`),
    ...(mp === undefined ? {} : { mp }),
    ...(maxMp === undefined ? {} : { maxMp }),
    attack: jsonNumber(actor.attack, `${label}.attack`),
    defense: jsonNumber(actor.defense, `${label}.defense`),
    ...(level === undefined ? {} : { level }),
    ...(boss === undefined ? {} : { boss }),
  };
}

function asJsonRecord(value: Prisma.JsonValue | undefined, label: string): Record<string, Prisma.JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PendekarInvariantError(`${label} is not an object`);
  }
  return value as Record<string, Prisma.JsonValue>;
}

function jsonString(value: Prisma.JsonValue | undefined, label: string): string {
  if (typeof value !== "string") throw new PendekarInvariantError(`${label} is not a string`);
  return value;
}

function jsonNumber(value: Prisma.JsonValue | undefined, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PendekarInvariantError(`${label} is not a finite number`);
  }
  return value;
}

function optionalJsonNumber(value: Prisma.JsonValue | undefined, label: string): number | undefined {
  return value === undefined ? undefined : jsonNumber(value, label);
}

function jsonBoolean(value: Prisma.JsonValue, label: string): boolean {
  if (typeof value !== "boolean") throw new PendekarInvariantError(`${label} is not a boolean`);
  return value;
}

function battleActionFingerprint(input: SubmitBattleActionInput): string {
  return createHash("sha256").update(JSON.stringify({ action: input.action })).digest("hex");
}

function serializedBattleState(state: RPGBattleState): Prisma.JsonObject {
  return JSON.parse(JSON.stringify(state)) as Prisma.JsonObject;
}

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parsePersistedBattleState(value: Prisma.JsonValue): RPGBattleState {
  const state = asJsonRecord(value, "battleState");
  jsonString(state.battleId, "battleState.battleId");
  const phase = jsonString(state.phase, "battleState.phase");
  if (!["INTRO", "CHALLENGE", "RESOLVE", "VICTORY", "DEFEAT"].includes(phase)) {
    throw new PendekarInvariantError("battleState.phase is invalid");
  }
  const turn = jsonNumber(state.turn, "battleState.turn");
  if (!Number.isInteger(turn) || turn < 0) throw new PendekarInvariantError("battleState.turn is invalid");
  projectBattleActor(state.player, "battleState.player");
  if (!Array.isArray(state.enemies) || state.enemies.length === 0) {
    throw new PendekarInvariantError("battleState.enemies is invalid");
  }
  state.enemies.forEach((enemy, index) => projectBattleActor(enemy, `battleState.enemies[${index}]`));
  const origin = asJsonRecord(state.origin, "battleState.origin");
  jsonString(origin.mapId, "battleState.origin.mapId");
  jsonNumber(origin.x, "battleState.origin.x");
  jsonNumber(origin.y, "battleState.origin.y");
  if (state.result !== undefined && state.result !== "WIN" && state.result !== "LOSE" && state.result !== "FLED") {
    throw new PendekarInvariantError("battleState.result is invalid");
  }
  return JSON.parse(JSON.stringify(state)) as RPGBattleState;
}

function parsePersistedBattleRng(value: string): BattleRng {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new PendekarInvariantError("Persisted battle RNG is invalid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new PendekarInvariantError("Persisted battle RNG is invalid");
  }
  const record = parsed as Record<string, unknown>;
  const seed = record.seed;
  const state = record.state;
  const count = record.count;
  if (
    typeof seed !== "number" || !Number.isInteger(seed)
    || typeof state !== "number" || !Number.isInteger(state)
    || typeof count !== "number" || !Number.isInteger(count) || count < 0
  ) {
    throw new PendekarInvariantError("Persisted battle RNG shape is invalid");
  }
  return { seed, state, count };
}

function projectStoredBattleProjection(value: Prisma.JsonValue): PendekarBattleProjection {
  const projection = asJsonRecord(value, "battle action projection");
  const enemies = projection.enemies;
  if (!Array.isArray(enemies)) throw new PendekarInvariantError("battle action projection enemies are invalid");
  const turn = jsonNumber(projection.turn, "battle action projection.turn");
  const actionRevision = jsonNumber(projection.actionRevision, "battle action projection.actionRevision");
  if (!Number.isInteger(turn) || turn < 0 || !Number.isInteger(actionRevision) || actionRevision < 0) {
    throw new PendekarInvariantError("battle action projection revision is invalid");
  }
  return {
    id: jsonString(projection.id, "battle action projection.id"),
    encounterId: jsonString(projection.encounterId, "battle action projection.encounterId"),
    status: jsonString(projection.status, "battle action projection.status"),
    phase: jsonString(projection.phase, "battle action projection.phase"),
    turn,
    actionRevision,
    expiresAt: jsonString(projection.expiresAt, "battle action projection.expiresAt"),
    player: projectBattleActor(projection.player, "battle action projection.player"),
    enemies: enemies.map((enemy, index) => projectBattleActor(enemy, `battle action projection.enemies[${index}]`)),
  };
}

function projectBattleRewardReceipt(receipt: {
  id: string;
  sourceType: string;
  sourceId: string;
  definitionVersion: string | null;
  status: string;
  rpgXp: number;
  goldDelta: number;
  createdAt: Date;
}): PendekarRewardReceiptProjection {
  if (receipt.sourceType !== "BATTLE" || !receipt.definitionVersion) {
    throw new PendekarBattleRewardError("BATTLE_REWARD_INVALID_STATE", "Battle reward receipt is malformed");
  }
  return {
    id: receipt.id,
    source: "BATTLE",
    sourceBattleId: receipt.sourceId,
    definitionVersion: receipt.definitionVersion,
    status: receipt.status,
    entitlement: { rpgXp: receipt.rpgXp, gold: receipt.goldDelta },
    createdAt: receipt.createdAt.toISOString(),
  };
}

function settlementReference(receiptId: string): string {
  return `pendekar:reward:${receiptId}:rpg-xp`;
}

function settlementWalletReason(battleId: string, receiptId: string): string {
  return `BATTLE:${battleId}:REWARD:${receiptId}`;
}

function projectBattleSettlement(receipt: {
  id: string;
  sourceType: string;
  sourceId: string;
  definitionVersion: string | null;
  status: string;
  rpgXp: number;
  goldDelta: number;
  settledAt: Date | null;
}, reference: string): PendekarBattleSettlementProjection {
  if (
    receipt.sourceType !== "BATTLE"
    || receipt.status !== "SETTLED"
    || !receipt.definitionVersion
    || !receipt.settledAt
  ) {
    throw new PendekarBattleSettlementError("BATTLE_SETTLEMENT_INVALID_STATE", "Battle settlement is malformed");
  }
  return {
    receiptId: receipt.id,
    sourceBattleId: receipt.sourceId,
    definitionVersion: receipt.definitionVersion,
    status: "SETTLED",
    settlementReference: reference,
    applied: { rpgXp: receipt.rpgXp, gold: receipt.goldDelta },
    settledAt: receipt.settledAt.toISOString(),
  };
}

function soalToSoalLike(soal: CanonicalSoal): SoalLike {
  return {
    id: soal.id,
    text: soal.text,
    type: soal.type,
    options: soal.options,
    correctAnswer: soal.correctAnswer,
    explanation: soal.explanation,
    difficulty: soal.difficulty,
    topik: soal.topik,
    KD: soal.KD,
    kelas: soal.kelas,
  };
}

function projectLearningChallenge(resolved: ResolvedChallenge): PendekarLearningChallengeProjection {
  const client = toClientChallenge(resolved);
  const domain = typeof client.domain === "string" ? client.domain : client.domain.other;
  return {
    challengeId: client.challengeId,
    prompt: client.prompt,
    options: client.options,
    freeText: client.freeText,
    difficulty: client.difficulty,
    domain,
    curriculum: client.curriculum,
  };
}

function replayedLearningAnswer(learning: {
  status: string;
  isCorrect: boolean | null;
  answeredAt: Date | null;
}): SubmitLearningAnswerResult {
  if (learning.status !== "ANSWERED" || learning.isCorrect === null || !learning.answeredAt) {
    throw new PendekarLearningError("ANSWER_REPLAY_CONFLICT", "Answer replay key is not bound to a completed learning session");
  }
  return {
    category: "REPLAYED",
    learning: { status: learning.status, answeredAt: learning.answeredAt.toISOString() },
    evaluation: { correct: learning.isCorrect, score: learning.isCorrect ? 1 : 0 },
  };
}

function learningEvidenceMetadata(
  learningSessionId: string,
  attemptId: string,
  requestKey: string,
  questionVersion: string,
): Prisma.InputJsonObject {
  return {
    schemaVersion: "p2.6g.2",
    learningSessionId,
    attemptId,
    requestKey,
    questionVersion,
  };
}
