import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getAgentTaskService } from "@/src/agent/control/service";
import { handleTelegramUpdate } from "@/src/agent/telegram/gateway";
import { makeUpstashRateLimitCounter } from "@/src/agent/telegram/rate-limit-upstash";

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
 * executes business logic, or talks to Telegram's API. Sending replies is a
 * founder-commanded P8C concern (the canonical result is durable in the DB
 * regardless — P8A §18).
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

  // Always 2xx to Telegram after the secret check: retries are handled by
  // the durable dedupe ledger, and non-2xx acks would trigger webhook retry
  // storms against a failing DB (P8A §10).
  return NextResponse.json({ ok: outcome.ok, duplicate: outcome.duplicate }, { status: 200 });
}
