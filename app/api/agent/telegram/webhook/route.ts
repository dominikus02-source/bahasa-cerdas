import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

import { db } from "@/lib/db";
import { getAgentTaskService } from "@/src/agent/control/service";
import { handleTelegramUpdate } from "@/src/agent/telegram/gateway";
import { makeUpstashRateLimitCounter } from "@/src/agent/telegram/rate-limit-upstash";
import { answerTelegramCallback } from "@/src/agent/telegram/transport";
import { safeDeliverReply } from "@/src/agent/telegram/delivery";
import { renderCallbackAnswer } from "@/src/agent/telegram/render";

export const dynamic = "force-dynamic";

/**
 * BC Agent P8B — Telegram webhook (DORMANT transport endpoint).
 *
 * Dormancy contract (P8A §30, sweeper precedent):
 *   - without BC_AGENT_TELEGRAM_WEBHOOK_SECRET the route returns 404 and
 *     does NOTHING else (no parsing, no DB, no Telegram API);
 *   - with the secret, only requests carrying the matching
 *     `X-Telegram-Bot-Api-Secret-Token` header are processed (constant-time
 *     compare); everything else gets 401 pre-parse.
 *
 * This file is TRANSPORT ONLY: it never parses commands, resolves identity,
 * or executes business logic. P8C adds the OUTBOUND leg — reply delivery —
 * as an `after()` task: the canonical result is durable BEFORE the ack, and
 * the Telegram sendMessage happens AFTER the ack (choice B, P8C Phase 9).
 * Telegram API latency therefore never blocks command execution, and a
 * Telegram API failure can never alter the 2xx ack or the canonical state
 * (delivery outcomes are typed and swallowed into telemetry).
 *
 * Telegram outage cannot affect the worker: this route shares no state with
 * the worker loop, and its failures are confined to HTTP responses (P8B
 * Phase 12).
 */

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.BC_AGENT_TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    // Dormant: feature flag off (sweeper-route pattern).
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const header = req.headers.get(TELEGRAM_SECRET_HEADER) ?? "";
  if (!timingSafeEqual(header, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  // Best-effort pre-identity abuse absorber: counts raw webhook posts per
  // source. Unavailable backing → reads proceed, mutations still fail closed
  // inside the gateway (see rate-limit.ts).
  const limiter = makeUpstashRateLimitCounter();
  void limiter;

  const outcome = await handleTelegramUpdate(
    { prisma: db, taskService: getAgentTaskService(), rateLimitCounter: makeUpstashRateLimitCounter() },
    body
  );

  // P8C outbound leg — scheduled AFTER the ack (Phase 9 decision B).
  //
  // Security rule (Phase 11): replies are delivered ONLY to the chat bound
  // to the AUTHENTICATED ACTIVE binding that initiated the command
  // (outcome.bindingId). Outcomes without a bindingId (unauthenticated,
  // malformed, senderless) are NEVER answered — an attacker gets no channel
  // verification, no oracle, no reply of any kind.
  //
  // Both delivery calls are typed, never throw, and are DORMANT without
  // BC_AGENT_TELEGRAM_BOT_TOKEN (zero network I/O). Their results can never
  // influence this response or any canonical state.
  if (outcome.callbackId) {
    const cbId = outcome.callbackId;
    const cbText = renderCallbackAnswer(outcome.ok ? "Diproses." : "Ditolak.");
    after(() => answerTelegramCallback(cbId, cbText));
  }
  if (outcome.text && outcome.bindingId) {
    const bindingId = outcome.bindingId;
    const text = outcome.text;
    after(() => safeDeliverReply(db, bindingId, text));
  }

  // Always 2xx to Telegram after the secret check: retries are handled by
  // the durable dedupe ledger, and non-2xx acks would trigger webhook retry
  // storms against a failing DB (P8A §10).
  return NextResponse.json({ ok: outcome.ok, duplicate: outcome.duplicate }, { status: 200 });
}
