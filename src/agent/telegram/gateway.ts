/**
 * BC Agent P8B — Telegram command gateway.
 *
 * The ONLY dispatch surface from Telegram to the canonical control plane.
 * Pipeline per command (P8A §4):
 *
 *   parse (adapter) → identity (identity.ts) → rate limit → dedupe
 *     → canonical control/commands.ts or persistence/queries.ts
 *     → bounded sanitized reply (render.ts)
 *
 * Hard boundaries (P8B Phase 0):
 *   - NO ToolExecutor import, NO worker internals, NO shell, NO OpenCode
 *   - the only Prisma writes in this module family are the dedupe ledger and
 *     the binding lastSeenAt touch — canonical business state is written
 *     exclusively by AgentTaskService / control commands
 *   - every failure path is fail-closed and uniformly opaque
 */

import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import {
  approveTask,
  cancelTask,
  rejectTask,
  resumeTask,
  retryTask,
  type FounderCommandContext,
  type FounderCommandResult,
} from "../control/commands";
import type { AgentTaskService } from "../persistence/service";
import {
  getAgentSummary,
  getTaskDetail,
  getWorkerHealthView,
  listPendingApprovals,
} from "../persistence/queries";
import { createTask } from "./create-task";
import {
  parseTelegramCommand,
  parseTelegramUpdate,
} from "./adapter";
import { resolveTelegramIdentity, touchBinding } from "./identity";
import { checkTelegramRateLimit, type TelegramRateLimitCounter, type TelegramRateLimitConfig } from "./rate-limit";
import {
  renderApprovals,
  renderCommandDenied,
  renderCommandOk,
  renderCreated,
  renderDenial,
  renderEvidence,
  renderHealth,
  renderHelp,
  renderInternalError,
  renderRateLimited,
  renderReport,
  renderStatus,
  renderTaskDetail,
  renderTaskNotFound,
} from "./render";
import type { TelegramCommand, TelegramUpdate } from "./types";
import { isReadCommand, type MutationTelegramCommand, type ReadTelegramCommand } from "./types";

/** Effective founder user id for telegram-created tasks. */
const TELEGRAM_ACTOR_PREFIX = "telegram:";

export interface TelegramGatewayDeps {
  readonly prisma: PrismaClient;
  readonly taskService: AgentTaskService;
  /** Rate-limit backing; null disables limiting EXCEPT mutations still deny (fail-closed). */
  readonly rateLimitCounter?: TelegramRateLimitCounter | null;
  readonly rateLimitConfig?: TelegramRateLimitConfig;
  /** Injectable clock for deterministic tests. */
  readonly now?: () => Date;
}

/** Result handed back to the transport layer (webhook route). */
export interface GatewayOutcome {
  readonly ok: boolean;
  readonly text: string;
  /** true when this update was a duplicate — transport may answer callback id differently. */
  readonly duplicate: boolean;
  /** callback id when the update was a callback_query (transport must answer it once). */
  readonly callbackId?: string;
}

// ─── Dedupe ledger (the ONLY gateway-owned persistence) ──────────────────

const DEDUPE_KEY_PREFIX = "tg:";

function dedupeKeyFor(update: TelegramUpdate, command: TelegramCommand): string {
  return `${DEDUPE_KEY_PREFIX}${update.updateId}:${command.kind}`;
}

/**
 * Dedupe check + record. Fail-closed: any DB error denies the command
 * (P8A F4 — never execute un-deduped). Returns the recorded original
 * result for a replayed key.
 */
async function claimDedupeKey(
  prisma: PrismaClient,
  key: string,
  command: string,
  telegramUpdateId: number,
  now: Date
): Promise<{ replayed: false } | { replayed: true; resultCode: string | null }> {
  try {
    await prisma.agentCommandDedupe.create({
      data: { id: randomUUID(), dedupeKey: key, command, telegramUpdateId, createdAt: now },
    });
    return { replayed: false };
  } catch (err) {
    // Unique violation = replay → return the recorded result.
    if (isUniqueViolation(err)) {
      const existing = await prisma.agentCommandDedupe.findUnique({
        where: { dedupeKey: key },
        select: { resultCode: true },
      });
      return { replayed: true, resultCode: existing?.resultCode ?? null };
    }
    // Any other DB error → fail closed.
    throw err;
  }
}

async function recordDedupeResult(prisma: PrismaClient, key: string, resultCode: string): Promise<void> {
  try {
    await prisma.agentCommandDedupe.update({ where: { dedupeKey: key }, data: { resultCode } });
  } catch {
    // Best-effort: a replay without a recorded code returns "outcome recorded
    // earlier" instead of re-executing — still safe.
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

// ─── Canonical command contexts ───────────────────────────────────────────

function canonicalContext(deps: TelegramGatewayDeps, access: { userId: string; isFounder: boolean }): FounderCommandContext {
  return {
    prisma: deps.prisma,
    taskService: deps.taskService,
    // Injected gate: identity was already resolved DB-side in identity.ts.
    // This closure re-asserts it — the canonical layer runs its gate FIRST
    // on every call, exactly as the web Control Center does.
    authorize: async () => ({ ok: true, userId: access.userId, isFounder: access.isFounder }),
  };
}

// ─── Read commands ────────────────────────────────────────────────────────

async function runReadCommand(
  deps: TelegramGatewayDeps,
  command: ReadTelegramCommand
): Promise<string> {
  switch (command.kind) {
    case "status": {
      const summary = await getAgentSummary(deps.prisma);
      return renderStatus({
        totalVisible: summary.totalVisible,
        running: summary.running,
        pending: summary.byStatus["PENDING"] ?? 0,
        pendingApprovals: summary.pendingApprovals,
        waitingIntelligence: summary.waitingIntelligence,
        recentCompleted: summary.recentCompleted,
        recentFailed: summary.recentFailed,
      });
    }
    case "health": {
      const view = await getWorkerHealthView(deps.prisma);
      return renderHealth(view);
    }
    case "task":
    case "report":
    case "evidence": {
      const detail = await getTaskDetail(deps.prisma, command.taskId);
      if (!detail) return renderTaskNotFound(command.taskId);
      if (command.kind === "task") return renderTaskDetail(detail);
      if (command.kind === "report") return renderReport(detail);
      return renderEvidence(detail);
    }
    case "approvals": {
      const pending = await listPendingApprovals(deps.prisma, { limit: 8 });
      return renderApprovals(pending);
    }
  }
}

// ─── Mutation commands (canonical delegation) ────────────────────────────

async function runMutationCommand(
  deps: TelegramGatewayDeps,
  command: MutationTelegramCommand,
  access: { userId: string; isFounder: boolean },
  telegramUpdateId: number
): Promise<{ text: string; resultCode: string }> {
  const ctx = canonicalContext(deps, access);

  if (command.kind === "create") {
    const result = await createTask(deps, access.userId, command.instruction, telegramUpdateId);
    return { text: result.text, resultCode: result.code };
  }

  switch (command.kind) {
    case "approve": {
      const result = await approveTask(ctx, command.taskId);
      return { text: formatCanonicalResult(result), resultCode: result.ok ? "OK" : result.code };
    }
    case "reject": {
      const result = await rejectTask(ctx, command.taskId);
      return { text: formatCanonicalResult(result), resultCode: result.ok ? "OK" : result.code };
    }
    case "retry": {
      const result = await retryTask(ctx, command.taskId);
      return { text: formatCanonicalResult(result), resultCode: result.ok ? "OK" : result.code };
    }
    case "resume": {
      const result = await resumeTask(ctx, command.taskId);
      return { text: formatCanonicalResult(result), resultCode: result.ok ? "OK" : result.code };
    }
    case "cancel": {
      const result = await cancelTask(ctx, command.taskId);
      return { text: formatCanonicalResult(result), resultCode: result.ok ? "OK" : result.code };
    }
  }
  // Exhaustive: MutationTelegramCommand = create | approve | reject | retry | resume | cancel.
  throw new Error("unreachable command kind");
}

function formatCanonicalResult(result: FounderCommandResult): string {
  return result.ok ? renderCommandOk(result.message, result.taskStatus) : renderCommandDenied(result.message);
}

// ─── Entry point ──────────────────────────────────────────────────────────

/**
 * Handle one validated Telegram update end-to-end. Never throws: every
 * failure becomes a bounded, sanitized outcome.
 */
export async function handleTelegramUpdate(
  deps: TelegramGatewayDeps,
  raw: unknown
): Promise<GatewayOutcome> {
  const now = deps.now?.() ?? new Date();

  // 1. Validate update shape (pre-DB).
  const parsed = parseTelegramUpdate(raw);
  if (!parsed.ok) {
    return { ok: false, text: parsed.text, duplicate: false };
  }
  const update = parsed.update;
  if (update.kind === "ignored") {
    return { ok: true, text: "", duplicate: false };
  }

  // 2. Resolve identity (fail-closed, opaque denials).
  const identity = await resolveTelegramIdentity(deps, update);
  if (!identity.ok || identity.ok !== true || !("access" in identity)) {
    return { ok: false, text: renderDenial(), duplicate: false };
  }
  const authCtx = identity;
  const access = authCtx.access;

  // 3. Parse command (strict vocabulary).
  const cmd = parseTelegramCommand(update);
  if (!cmd.ok) {
    return { ok: false, text: cmd.text, duplicate: false };
  }

  // Forwarded messages are DATA, never commands (P8A §7).
  if (update.isForwarded) {
    return { ok: false, text: "Pesan diteruskan tidak diproses sebagai perintah.", duplicate: false };
  }

  // 4. Rate limit (mutations fail-closed without a counter).
  const rl = await checkTelegramRateLimit(
    deps.rateLimitCounter ?? null,
    identity.telegramUserId,
    cmd.command,
    deps.rateLimitConfig
  );
  if (!rl.ok) {
    return { ok: false, text: renderRateLimited(), duplicate: false };
  }

  // 5. Dedupe (mutations + reads share the ledger; reads may replay safely).
  const key = dedupeKeyFor(update, cmd.command);
  let claimed: { replayed: false } | { replayed: true; resultCode: string | null };
  try {
    claimed = await claimDedupeKey(deps.prisma, key, cmd.command.kind, update.updateId, now);
  } catch {
    return { ok: false, text: renderInternalError(), duplicate: false };
  }
  if (claimed.replayed) {
    return {
      ok: true,
      text: claimed.resultCode
        ? `Perintah ini sudah dieksekusi sebelumnya (hasil: ${claimed.resultCode}).`
        : "Perintah ini sudah dieksekusi sebelumnya.",
      duplicate: true,
      callbackId: update.callbackId,
    };
  }

  // 6. Execute — canonical only.
  let text: string;
  let resultCode: string;
  try {
    if (isReadCommand(cmd.command)) {
      text = await runReadCommand(deps, cmd.command);
      resultCode = "OK";
    } else {
      const m = await runMutationCommand(deps, cmd.command, access, update.updateId);
      text = m.text;
      resultCode = m.resultCode;
    }
  } catch (err) {
    // Sanitized: never surface raw DB/stack details (Phase 11).
    resultCode = "COMMAND_FAILED";
    text = renderInternalError();
    void err;
  }

  // 7. Record outcome + touch binding (best-effort).
  await recordDedupeResult(deps.prisma, key, resultCode);
  await touchBinding(deps, authCtx.bindingId, new Date());

  return { ok: resultCode === "OK" || resultCode === "CREATED" || resultCode === "ALREADY_EXISTS", text, duplicate: false, callbackId: update.callbackId };
}

/** Exposed for tests — the canonical context construction. */
export function buildCanonicalContextForTest(
  deps: TelegramGatewayDeps,
  userId: string
): FounderCommandContext {
  return canonicalContext(deps, { userId, isFounder: true });
}

export type { TelegramUpdate };
