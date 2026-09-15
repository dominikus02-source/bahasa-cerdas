/**
 * BC Agent P8C — Reply delivery orchestrator (security boundary for OUTBOUND).
 *
 * Composes: canonical result (already durable) → renderer (bounded, redacted)
 * → transport (single Telegram API boundary). Enforces the Phase 11 critical
 * rule: a response may ONLY be sent to the `telegramChatId` recorded on the
 * AUTHENTICATED ACTIVE binding that initiated the command. Chat ids are never
 * accepted from task text, command arguments, or any other Telegram-supplied
 * content.
 *
 * Semantics (Phase 6):
 *   - This module NEVER throws and NEVER alters canonical state. A delivery
 *     failure after a successful canonical command leaves the command
 *     successful; the founder simply re-asks via /status or /task.
 *   - It never calls the command layer back, never creates tasks, and never
 *     processes bot-own messages (feedback loop prevention, Phase 10 — the
 *     adapter already rejects senderless updates; the gateway only ever runs
 *     on founder-initiated updates).
 *   - Dormant config ⇒ DORMANT result with zero network I/O.
 */

import type { PrismaClient } from "@prisma/client";

import type { DeliveryResult } from "./transport";
import { sendTelegramMessage } from "./transport";

export interface DeliveryOutcome {
  /** Canonical operation outcome — UNCHANGED by delivery. */
  readonly canonicalOk: boolean;
  readonly delivery: DeliveryResult;
}

/**
 * Deliver a rendered reply to the chat bound to `bindingId`.
 *
 * The chatId is re-read server-side from the binding row at delivery time —
 * this also covers a binding revoked BETWEEN command execution and delivery:
 * a revoked row fails the active check and delivery is refused (revoked-
 * binding protection on the outbound leg).
 */
export interface DeliverReplyOptions {
  /**
   * Test/staging-only transport overrides (mock Telegram API + fake token).
   * Production callers pass nothing — token comes from config, fetch from
   * the global. Never persisted, never logged.
   */
  readonly tokenOverride?: string;
  readonly fetchImpl?: typeof fetch;
}

export async function deliverReply(
  prisma: PrismaClient,
  bindingId: string,
  renderedText: string,
  options?: DeliverReplyOptions
): Promise<DeliveryOutcome> {
  let chatId: string | null = null;
  try {
    const row = await prisma.agentTelegramBinding.findUnique({
      where: { id: bindingId },
      select: { telegramChatId: true, revokedAt: true },
    });
    // Revoked-or-missing binding ⇒ refuse delivery (fail-closed).
    if (row && row.revokedAt === null) chatId = row.telegramChatId;
  } catch {
    // DB unavailable on the outbound leg: canonical result is unaffected;
    // delivery is refused rather than guessed.
    chatId = null;
  }

  if (chatId === null) {
    // Typed refusal without touching Telegram at all.
    return {
      canonicalOk: true,
      delivery: {
        status: "FAILED",
        httpStatus: null,
        category: "FORBIDDEN",
        attempts: 0,
        latencyMs: 0,
        error: "delivery_refused_no_active_binding",
      },
    };
  }

  const delivery = await sendTelegramMessage(chatId, renderedText, {
    tokenOverride: options?.tokenOverride,
    fetchImpl: options?.fetchImpl,
  });
  return { canonicalOk: true, delivery };
}

/**
 * Fire-and-forget wrapper for the webhook route: awaits the delivery but
 * converts ANY unexpected throw into a typed failed outcome (belt and
 * braces — transport itself never throws). Suitable for `after()` tasks.
 */
export async function safeDeliverReply(
  prisma: PrismaClient,
  bindingId: string,
  renderedText: string,
  options?: DeliverReplyOptions
): Promise<DeliveryOutcome> {
  try {
    return await deliverReply(prisma, bindingId, renderedText, options);
  } catch {
    return {
      canonicalOk: true,
      delivery: {
        status: "FAILED",
        httpStatus: null,
        category: "NETWORK",
        attempts: 0,
        latencyMs: 0,
        error: "delivery_unexpected_error",
      },
    };
  }
}
