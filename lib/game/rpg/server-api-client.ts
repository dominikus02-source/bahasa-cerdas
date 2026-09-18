/**
 * Server API client for Pendekar Suryakerta (P2.6H).
 *
 * Typed fetch wrappers for the 7 authoritative server endpoints. All requests
 * carry auth cookies; all responses are typed. This module is the ONLY bridge
 * between the browser game engine and the server-authoritative pipeline.
 *
 * Design constraints:
 * - No RNG, damage, HP, or reward math here (server owns all of that).
 * - Every request carries a client-generated requestKey for idempotency.
 * - Error responses are typed as PendekarActionError.
 * - The client never sends player stats, HP, XP, gold, or damage values.
 */

import type {
  PendekarActionError,
  QuestMutationInput,
  QuestMutationResult,
  StartBattleInput,
  StartBattleResult,
  SubmitLearningAnswerInput,
  SubmitLearningAnswerResult,
  SubmitBattleActionInput,
  SubmitBattleActionResult,
  CreateBattleRewardReceiptInput,
  CreateBattleRewardReceiptResult,
  SettleBattleRewardInput,
  SettleBattleRewardResult,
  PendekarStateProjection,
} from "./server-contracts";
import type { RPGBattleState, RPGBattlePhase } from "@/src/game/rpg/combat/battle-state";
import {
  fetchWithTimeout,
  classifyError,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_POLICY,
  retryDelay,
  sleep,
  NetworkError,
  type ServerCallStatus,
  type RetryPolicy,
} from "./network-resilience";
import type { PendekarActionErrorCode } from "./server-contracts";

/* ---------- Error type ---------- */

export type ServerApiError = PendekarActionError & { status: number };

/* ---------- Generic fetch ---------- */

interface FetchResult<T> {
  ok: true;
  data: T;
}
interface FetchFail {
  ok: false;
  error: ServerApiError;
}

async function fetchServer<T>(
  path: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<FetchResult<T> | FetchFail> {
  let response: Response;
  try {
    response = await fetchWithTimeout(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    }, timeoutMs);
  } catch (err: unknown) {
    // NetworkError (TIMEOUT/NETWORK_ERROR) or fetch throws
    const msg = err instanceof Error ? err.message : "Network request failed";
    const code = err instanceof Error && "code" in err ? (err as { code: string }).code : "NETWORK_ERROR";
    return {
      ok: false,
      error: { code: code as PendekarActionErrorCode, message: msg, status: 0 },
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Invalid JSON response", status: response.status },
    };
  }

  if (!response.ok) {
    const err = body as { error?: PendekarActionError };
    return {
      ok: false,
      error: {
        code: err?.error?.code ?? "INTERNAL_ERROR",
        message: err?.error?.message ?? "Unknown server error",
        status: response.status,
      },
    };
  }

  return { ok: true, data: (body as { result?: T; state?: T })?.result ?? (body as { state?: T })?.state ?? body as T };
}

/* ---------- P2.6H.5: Retry-capable fetch ---------- */

/**
 * Fetch with timeout + bounded retry. The requestKey is NEVER changed
 * between retries (idempotency guarantee). Only retries on network
 * errors and timeout — not on server-rejected requests.
 *
 * P2.6H.5 Phase 1 (timeout) + Phase 2 (retry) + Phase 8 (error classification).
 */
export async function fetchServerWithRetry<T>(
  path: string,
  init: RequestInit,
  options?: { timeoutMs?: number; retryPolicy?: RetryPolicy },
): Promise<FetchResult<T> | FetchFail> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const policy = options?.retryPolicy ?? DEFAULT_RETRY_POLICY;
  const totalAttempts = 1 + policy.maxRetries;

  let lastFail: FetchFail | null = null;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const result = await fetchServer<T>(path, init, timeoutMs);

    if (result.ok) return result;

    // Classify the error
    const errorClass = classifyError(result.error.status, result.error.code);

    // PERMANENT errors: do not retry
    if (errorClass === "PERMANENT") return result;

    // Store as last failure
    lastFail = result;

    // Do not retry on last attempt
    if (attempt >= totalAttempts - 1) break;

    // RETRYABLE or UNKNOWN: wait and retry
    const delay = retryDelay(attempt, policy);
    await sleep(delay);
  }

  return lastFail!;
}

/* ---------- Request key generation ---------- */

export function generateRequestKey(): string {
  return `client-${crypto.randomUUID()}`;
}

/* ---------- 1. GET /api/rpg/state ---------- */

export async function fetchStateProjection(): Promise<FetchResult<PendekarStateProjection> | FetchFail> {
  return fetchServer<PendekarStateProjection>("/api/rpg/state", { method: "GET" });
}

/* ---------- 2. POST /api/rpg/battles/start ---------- */

export async function startServerBattle(
  encounterId: string,
  requestId?: string,
): Promise<FetchResult<StartBattleResult> | FetchFail> {
  const input: StartBattleInput = {
    encounterId,
    ...(requestId ? { requestId } : {}),
  };
  return fetchServer<StartBattleResult>("/api/rpg/battles/start", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ---------- 3. POST /api/rpg/battles/[battleId]/learning ---------- */

export async function startServerLearning(
  battleId: string,
): Promise<FetchResult<{ category: string; learning: StartBattleResult extends { battle: unknown } ? unknown : unknown }> | FetchFail> {
  return fetchServer(`/api/rpg/battles/${encodeURIComponent(battleId)}/learning`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/* ---------- 4. POST /api/rpg/battles/[battleId]/learning/answer ---------- */

export async function submitServerLearningAnswer(
  battleId: string,
  answer: string,
  requestKey: string,
): Promise<FetchResult<SubmitLearningAnswerResult> | FetchFail> {
  const input: SubmitLearningAnswerInput = { answer, requestKey };
  return fetchServer<SubmitLearningAnswerResult>(
    `/api/rpg/battles/${encodeURIComponent(battleId)}/learning/answer`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

/* ---------- 5. POST /api/rpg/battles/[battleId]/action ---------- */

export async function submitServerBattleAction(
  battleId: string,
  action: "basic_attack" | "mahapukul" | "skill" | "flee",
  requestKey: string,
  skillId?: string,
): Promise<FetchResult<SubmitBattleActionResult> | FetchFail> {
  const input: SubmitBattleActionInput = {
    action,
    ...(action === "skill" && skillId ? { skillId } : {}),
    requestKey,
  };
  return fetchServer<SubmitBattleActionResult>(
    `/api/rpg/battles/${encodeURIComponent(battleId)}/action`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

/* ---------- 6. POST /api/rpg/battles/[battleId]/reward ---------- */

export async function createServerRewardReceipt(
  battleId: string,
  requestKey: string,
): Promise<FetchResult<CreateBattleRewardReceiptResult> | FetchFail> {
  const input: CreateBattleRewardReceiptInput = { requestKey };
  return fetchServer<CreateBattleRewardReceiptResult>(
    `/api/rpg/battles/${encodeURIComponent(battleId)}/reward`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

/* ---------- 7. POST /api/rpg/battles/[battleId]/settle ---------- */

export async function settleServerReward(
  battleId: string,
  requestKey: string,
): Promise<FetchResult<SettleBattleRewardResult> | FetchFail> {
  const input: SettleBattleRewardInput = { requestKey };
  return fetchServer<SettleBattleRewardResult>(
    `/api/rpg/battles/${encodeURIComponent(battleId)}/settle`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

/* ---------- 8. POST /api/rpg/quest/mutate (P2.6I.2) ---------- */

export async function mutateQuestState(
  kind: QuestMutationInput["kind"],
  requestKey: string,
  options?: { to?: number; flagName?: string; chestId?: string; bossId?: string; geKey?: string },
): Promise<FetchResult<QuestMutationResult> | FetchFail> {
  const input: QuestMutationInput = {
    kind,
    requestKey,
    ...(options?.to !== undefined ? { to: options.to } : {}),
    ...(options?.flagName ? { flagName: options.flagName } : {}),
    ...(options?.chestId ? { chestId: options.chestId } : {}),
    ...(options?.bossId ? { bossId: options.bossId } : {}),
    ...(options?.geKey ? { geKey: options.geKey } : {}),
  };
  return fetchServer<QuestMutationResult>("/api/rpg/quest/mutate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ---------- Projection → RPGBattleState mapping ---------- */

/**
 * Convert a server PendekarBattleProjection into a client RPGBattleState
 * suitable for rendering. The projection contains enough actor data (HP, maxHP,
 * attack, defense, MP) to drive the battle UI; client-only fields (origin,
 * learning substate) are filled from the state projection.
 */
export function projectionToBattleState(
  projection: {
    id: string;
    encounterId: string;
    phase: string;
    turn: number;
    player: { id: string; name: string; hp: number; maxHp: number; mp?: number; maxMp?: number; attack: number; defense: number; level?: number };
    enemies: Array<{ id: string; name: string; hp: number; maxHp: number; attack: number; defense: number; boss?: boolean; level?: number; xp?: number; gold?: number; prototypeKey?: string }>;
  },
  origin: { mapId: string; x: number; y: number },
  learning?: { encounterId: string; challengeId: string; status: "PENDING" | "RESOLVED"; attemptId: string },
): RPGBattleState {
  const phase = projection.phase as RPGBattlePhase;
  return {
    battleId: projection.id,
    phase,
    player: {
      id: projection.player.id,
      name: projection.player.name,
      hp: projection.player.hp,
      maxHp: projection.player.maxHp,
      mp: projection.player.mp ?? 0,
      maxMp: projection.player.maxMp ?? 0,
      attack: projection.player.attack,
      defense: projection.player.defense,
      level: projection.player.level,
    },
    enemies: projection.enemies.map((e) => ({
      id: e.id,
      name: e.name,
      hp: e.hp,
      maxHp: e.maxHp,
      attack: e.attack,
      defense: e.defense,
      boss: e.boss,
      level: e.level,
      xp: e.xp,
      gold: e.gold,
      prototypeKey: e.prototypeKey,
    })),
    turn: projection.turn,
    origin,
    ...(learning ? { learning } : {}),
  };
}
