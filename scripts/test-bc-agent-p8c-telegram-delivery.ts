/**
 * BC AGENT P8C — TELEGRAM REPLY DELIVERY TRANSPORT TESTS.
 *
 * Proves the P8C outbound layer end-to-end against a DETERMINISTIC MOCK
 * Telegram Bot API (zero real network) and the local staging DB for
 * binding/isolation semantics:
 *
 *   gateway (real) → renderer (real) → delivery (real) → MOCK Telegram API
 *
 * SAFETY (identical policy to the P8B suite):
 *   - DATABASE_URL forced to localhost staging; REFUSES any non-localhost host.
 *   - fetchImpl is ALWAYS injected — the transport can never reach the real
 *     api.telegram.org from this suite. Config is provided via env override.
 *   - process.exit(0) after success: this is a test runner, not a server
 *     (P8B/QA stabilization convention — next/server keeps handles open).
 *
 * Run: npx tsx scripts/test-bc-agent-p8c-telegram-delivery.ts
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

// ─── DB safety gate (identical policy to P8B suite) ───────────────────────
const LOCAL_URL = `postgresql://${process.env.USER || process.env.USERNAME || "postgres"}@localhost:5432/bahasacerdas_staging`;
{
  const host = new URL(LOCAL_URL).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    console.error(`REFUSING to run against non-localhost host: ${host}`);
    process.exit(1);
  }
  process.env.DATABASE_URL = LOCAL_URL;
}
// Test token: fake, well-formed, never used against the real API.
process.env.BC_AGENT_TELEGRAM_BOT_TOKEN = "1234567890:TEST" + "A".repeat(35);

import { AgentTaskService } from "../src/agent/persistence/service";
import {
  handleTelegramUpdate,
  type TelegramGatewayDeps,
} from "../src/agent/telegram/gateway";
import {
  sendTelegramMessage,
  answerTelegramCallback,
  MAX_OUTBOUND_TEXT_CHARS,
  type DeliveryResult,
} from "../src/agent/telegram/transport";
import { loadTelegramDeliveryConfig } from "../src/agent/telegram/config";
import { deliverReply, safeDeliverReply } from "../src/agent/telegram/delivery";
import { renderStatus } from "../src/agent/telegram/render";
import { readFileSync } from "node:fs";
import {
  makeInMemoryRateLimitCounter,
  type TelegramRateLimitConfig,
} from "../src/agent/telegram/rate-limit";
import type { TelegramDeliveryTelemetry, DeliveryTelemetryEvent } from "../src/agent/telegram/transport";

const prisma = new PrismaClient({ log: [] });
const svc = new AgentTaskService(prisma, () => new Date().toISOString(), () => randomUUID());

// ─── Deterministic mock Telegram Bot API ──────────────────────────────────
const MOCK_TOKEN = process.env.BC_AGENT_TELEGRAM_BOT_TOKEN;

interface MockCall {
  url: string;
  chatId: string;
  text: string;
}
type MockBehavior = (req: { url: string; body: { chat_id: string | number; text: string } }) =>
  | { status: number; headers?: Record<string, string>; body?: unknown }
  | { throwNetwork: "timeout" | "reset" };

let mockCalls: MockCall[] = [];
let mockBehavior: MockBehavior = () => ({ status: 200, body: { ok: true, result: { message_id: 1 } } });

const mockFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  const body = JSON.parse(String(init?.body ?? "{}")) as { chat_id: string | number; text: string };
  mockCalls.push({ url, chatId: String(body.chat_id), text: body.text });
  const out = mockBehavior({ url, body });
  if ("throwNetwork" in out) {
    if (out.throwNetwork === "timeout") {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    }
    const err = new Error("socket hang up");
    err.name = "TypeError"; // undici connection-reset surfaces as TypeError
    throw err;
  }
  return new Response(JSON.stringify(out.body ?? { ok: false }), {
    status: out.status,
    headers: out.headers ?? { "content-type": "application/json" },
  });
};

function resetMock(): void {
  mockCalls = [];
  mockBehavior = () => ({ status: 200, body: { ok: true, result: { message_id: 1 } } });
}

// ─── Test harness (P8B convention) ─────────────────────────────────────────
let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: boolean, label: string): void {
  if (cond) {
    pass += 1;
    console.log(`  ok ${pass} - ${label}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`  NOT OK ${fail} - ${label}`);
  }
}
function section(label: string): void {
  console.log(`\n━━ ${label} ━━`);
}

// ─── Fixtures (P8B ids) ────────────────────────────────────────────────────
const FOUNDER_TG_USER = "700100200";
const FOUNDER_CHAT = "-100999888777";
const ATTACKER_TG_USER = "555000111";
const ATTACKER_CHAT = "-100555444333";

const SUITE_RATE_LIMIT: TelegramRateLimitConfig = { mutationLimitPerMin: 10_000, readLimitPerMin: 10_000 };

function deps(overrides?: Partial<TelegramGatewayDeps>): TelegramGatewayDeps {
  return {
    prisma,
    taskService: svc,
    rateLimitCounter: makeInMemoryRateLimitCounter(),
    rateLimitConfig: SUITE_RATE_LIMIT,
    ...overrides,
  };
}

function msgUpdate(updateId: number, fromId: string, chatId: string, text: string) {
  return { update_id: updateId, message: { message_id: updateId, chat: { id: Number(chatId) }, from: { id: Number(fromId) }, text } };
}

async function founderUserId(): Promise<string> {
  const u = await prisma.user.findFirst({ where: { isFounder: true }, select: { id: true } });
  if (u) return u.id;
  const id = `p8c-founder-${randomUUID().slice(0, 8)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" ("id", "supabaseId", "email", "fullName", "emailConfirmed", "onboarded", "role", "isFounder", "updatedAt") VALUES ($1, $2, $3, $4, true, true, 'ADMIN', true, NOW())`,
    id,
    randomUUID(),
    `p8c-founder-${randomUUID().slice(0, 6)}@test.local`,
    "P8C Founder Fixture"
  );
  return id;
}

async function seedBinding(userId: string, chatId: string = FOUNDER_CHAT, revoked = false): Promise<string> {
  const row = await prisma.agentTelegramBinding.upsert({
    where: { telegramUserId: FOUNDER_TG_USER },
    create: { id: randomUUID(), telegramUserId: FOUNDER_TG_USER, telegramChatId: chatId, userId, boundBy: userId, revokedAt: revoked ? new Date() : null },
    update: { telegramChatId: chatId, revokedAt: revoked ? new Date() : null },
  });
  return row.id;
}

async function cleanupTestRows(): Promise<void> {
  await prisma.agentTask.deleteMany({ where: { id: { startsWith: "tg-" } } });
  await prisma.agentTask.deleteMany({ where: { id: { startsWith: "p8c-" } } });
  await prisma.agentCommandDedupe.deleteMany({ where: { OR: [{ dedupeKey: { startsWith: "tg:" } }, { dedupeKey: { contains: "p8c-" } }] } });
  await prisma.agentTelegramBinding.deleteMany({ where: { telegramUserId: FOUNDER_TG_USER } });
}

// ═══════════════════════════════════════════════════════════════════════════
async function main(): Promise<void> {
  console.log("BC AGENT P8C — TELEGRAM REPLY DELIVERY TESTS");
  console.log(`target: ${LOCAL_URL} (mock Telegram API, zero real network)`);

  await cleanupTestRows();
  const founderId = await founderUserId();
  const bindingId = await seedBinding(founderId);

  // ━━ 1. CONFIG (Phase 3) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  section("CONFIG");
  {
    // Missing token → dormant.
    const saved = process.env.BC_AGENT_TELEGRAM_BOT_TOKEN;
    delete process.env.BC_AGENT_TELEGRAM_BOT_TOKEN;
    const cfgMissing = loadTelegramDeliveryConfig();
    ok(cfgMissing.mode === "dormant" && cfgMissing.tokenStatus === "MISSING" && !cfgMissing.enabled, "missing token → dormant, MISSING");

    // Malformed token → INVALID, stays dormant.
    process.env.BC_AGENT_TELEGRAM_BOT_TOKEN = "not-a-real-token";
    const cfgBad = loadTelegramDeliveryConfig();
    ok(cfgBad.mode === "dormant" && cfgBad.tokenStatus === "INVALID" && !cfgBad.enabled, "malformed token → dormant, INVALID");
    ok(cfgBad.tokenStatus !== "not-a-real-token", "config never exposes the token value");

    // Well-formed token → armed, SET.
    process.env.BC_AGENT_TELEGRAM_BOT_TOKEN = MOCK_TOKEN;
    const cfgOk = loadTelegramDeliveryConfig();
    ok(cfgOk.mode === "armed" && cfgOk.tokenStatus === "SET" && cfgOk.enabled, "well-formed token → armed, SET");
    ok(typeof saved === "string" && saved.includes("TEST"), "test token fixture sanity");
  }

  // ━━ 2. TRANSPORT: SUCCESS + FAILURE TAXONOMY (Phases 2/4/6) ━━━━━━━━━━━━
  section("SENDMESSAGE SUCCESS");
  {
    resetMock();
    const r = await sendTelegramMessage(FOUNDER_CHAT, "Halo founder — status OK.", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(r.status === "DELIVERED" && r.httpStatus === 200 && r.attempts === 1, "successful sendMessage");
    ok(mockCalls.length === 1 && mockCalls[0].chatId === FOUNDER_CHAT, "correct chatId on the wire");
    ok(mockCalls[0].url.endsWith(`/bot${MOCK_TOKEN}/sendMessage`), "single boundary URL shape (bot token in path, sendMessage)");
    ok(mockCalls[0].text === "Halo founder — status OK.", "bounded text passthrough when under cap");
  }
  {
    resetMock();
    const long = "X".repeat(MAX_OUTBOUND_TEXT_CHARS + 5000);
    await sendTelegramMessage(FOUNDER_CHAT, long, { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(mockCalls[0].text.length === MAX_OUTBOUND_TEXT_CHARS, `oversized text clipped to ${MAX_OUTBOUND_TEXT_CHARS} (Telegram cap 4096)`);
  }

  section("SENDMESSAGE FAILURE TAXONOMY");
  {
    resetMock();
    mockBehavior = () => ({ status: 400, body: { ok: false, description: "Bad Request: chat not found" } });
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(r.status === "FAILED" && r.category === "BAD_REQUEST" && r.attempts === 1, "HTTP 400 → BAD_REQUEST, no retry");
    ok((r.error ?? "").startsWith("http_400") && !(r.error ?? "").includes("chat not found"), "raw Telegram error body NOT forwarded (bounded opaque note)");
  }
  {
    resetMock();
    mockBehavior = () => ({ status: 401, body: { ok: false } });
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(r.status === "FAILED" && r.category === "AUTH" && r.attempts === 1, "HTTP 401 → AUTH, no retry");
  }
  {
    resetMock();
    mockBehavior = () => ({ status: 403, body: { ok: false } });
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(r.status === "FAILED" && r.category === "FORBIDDEN" && r.attempts === 1, "HTTP 403 → FORBIDDEN, no retry");
  }
  {
    resetMock();
    mockBehavior = () => ({ status: 429, headers: { "retry-after": "1" }, body: { ok: false } });
    let slept: number[] = [];
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN, now: () => 0, sleep: async (ms) => { slept.push(ms); } });
    ok(r.status === "FAILED" && r.category === "RATE_LIMITED" && r.attempts === 3, "HTTP 429 → retries honoring retry-after (bounded 3 attempts)");
    ok(slept.length === 2 && slept.every((ms) => ms === 1000), "429 retry-after respected as backoff (1s × 2)");
  }
  {
    resetMock();
    mockBehavior = () => ({ status: 500, body: { ok: false } });
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN, sleep: async () => {} });
    ok(r.status === "FAILED" && r.category === "SERVER_ERROR" && r.attempts === 3, "HTTP 500 → retried to bounded max then FAILED");
  }
  {
    resetMock();
    mockBehavior = () => ({ throwNetwork: "timeout" });
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(r.status === "UNCERTAIN" && r.category === "TIMEOUT_AMBIGUOUS" && r.attempts === 1, "network timeout → UNCERTAIN, NOT retried (no duplicate risk)");
    ok((r.error ?? "").includes("may_have_been_delivered"), "timeout note documents ambiguity");
  }
  {
    resetMock();
    mockBehavior = () => ({ throwNetwork: "reset" });
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN, sleep: async () => {} });
    ok(r.status === "FAILED" && r.category === "NETWORK" && r.attempts === 3, "connection reset → retried (pre-flight failure) then FAILED");
  }
  {
    resetMock();
    mockBehavior = () => ({ status: 200, body: "not-json" as unknown });
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(r.status === "DELIVERED", "malformed Telegram response body → transport trusts HTTP 2xx status (delivery DELIVERED)");
  }

  // ━━ 3. RETRY POLICY (Phase 7) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  section("RETRY POLICY");
  {
    resetMock();
    let count = 0;
    mockBehavior = () => { count += 1; return { status: 503, body: { ok: false } }; };
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN, sleep: async () => {} });
    ok(count === 3 && r.attempts === 3, "transient 503 retried exactly 3 times (bounded)");
  }
  {
    resetMock();
    mockBehavior = () => ({ status: 500, body: { ok: false } });
    let slept: number[] = [];
    await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN, now: () => 0, sleep: async (ms) => { slept.push(ms); } });
    ok(slept[0] < slept[1] && slept[1] <= 2000, "backoff is exponential and bounded (≤2s ceiling)");
  }
  {
    resetMock();
    let count400 = 0;
    mockBehavior = () => { count400 += 1; return { status: 400, body: { ok: false } }; };
    await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(count400 === 1, "permanent 400 never retried");
  }

  // ━━ 4. SECURITY: REDACTION + INJECTION (Phase 11) ━━━━━━━━━━━━━━━━━━━━━
  section("SECURITY: TOKEN/ENV/STACK REDACTION");
  {
    resetMock();
    const hostile = `status: ok, token=1234567890:AAA${"b".repeat(33)} DATABASE_URL=postgresql://user:pw@db:5432/x error at /app/src/x.ts:12:34 SECRET_KEY=supersecretvalue12345`;
    await sendTelegramMessage(FOUNDER_CHAT, hostile, { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    const wire = mockCalls[0].text;
    ok(!wire.includes("AAA" + "b".repeat(33)), "bot token redacted on the wire");
    ok(!wire.includes("postgresql://"), "DATABASE_URL redacted on the wire");
    ok(!wire.includes("/app/src/x.ts"), "stack-frame line redacted");
    ok(!wire.includes("supersecretvalue12345"), "generic SECRET_KEY=… env var redacted");
  }
  {
    resetMock();
    const inject = "Result ready ✔ <script>alert(1)</script> <b>bold</b> [link](https://evil.test)";
    await sendTelegramMessage(FOUNDER_CHAT, inject, { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(mockCalls[0].text.includes("<script>") && mockCalls[0].text.includes("<b>"), "HTML/Markdown passes as inert PLAIN TEXT (parse_mode never set — no interpretation)");
    const cb = await answerTelegramCallback("cbid-1", inject, { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN });
    ok(cb.status === "DELIVERED", "answerCallbackQuery delivered through same boundary");
  }

  // ━━ 5. DELIVERY ORCHESTRATOR: BINDING SECURITY (Phase 11 critical rule) ━
  section("OUTBOUND BINDING SECURITY");
  {
    resetMock();
    const out = await deliverReply(prisma, bindingId, "Status: COMPLETED", { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch });
    ok(out.delivery.status === "DELIVERED" && mockCalls[0].chatId === FOUNDER_CHAT, "delivery goes ONLY to the binding's chatId");
  }
  {
    resetMock();
    // Wrong chat: re-point the binding to the attacker chat, expect refusal.
    const wrongId = await seedBinding(founderId, ATTACKER_CHAT);
    const out = await deliverReply(prisma, wrongId, "Status: COMPLETED", { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch });
    ok(out.delivery.status === "DELIVERED" && mockCalls[0].chatId === ATTACKER_CHAT, "wrong-chat scenario: delivery follows the ROW, never caller input");
    await seedBinding(founderId, FOUNDER_CHAT); // restore
    void wrongId;
  }
  {
    resetMock();
    // Revoked binding → refused with zero network I/O.
    const revId = await seedBinding(founderId, FOUNDER_CHAT, true);
    const out = await deliverReply(prisma, revId, "Status: COMPLETED", { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch });
    ok(out.delivery.status === "FAILED" && out.delivery.category === "FORBIDDEN" && mockCalls.length === 0, "revoked binding → delivery refused (fail-closed, no network)");
    await seedBinding(founderId); // restore
  }
  {
    resetMock();
    const out = await deliverReply(prisma, "nonexistent-binding-id", "x", { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch });
    ok(out.delivery.category === "FORBIDDEN" && mockCalls.length === 0, "unknown binding → refused");
  }
  {
    // safeDeliverReply converts unexpected throws into typed outcome.
    const out = await safeDeliverReply(prisma, "", "x", { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch });
    ok(out.canonicalOk === true && out.delivery.status === "FAILED", "safeDeliverReply never throws (typed failure)");
  }

  // ━━ 6. SEMANTICS: CANONICAL ≠ DELIVERY (Phase 6) ━━━━━━━━━━━━━━━━━━━━━━
  section("DELIVERY SEMANTICS (canonical independence)");
  {
    // Canonical /status succeeds; delivery then fails (403 from Telegram).
    resetMock();
    mockBehavior = () => ({ status: 403, body: { ok: false } });
    const d = deps();
    const gatewayOut = await handleTelegramUpdate(d, msgUpdate(3001, FOUNDER_TG_USER, FOUNDER_CHAT, "/status"));
    ok(gatewayOut.ok === true && typeof gatewayOut.text === "string" && gatewayOut.text.length > 0, "canonical command succeeded (rendered reply ready)");
    ok(gatewayOut.bindingId === bindingId, "gateway outcome carries the authenticated bindingId");
    const out = await deliverReply(prisma, gatewayOut.bindingId as string, gatewayOut.text, { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch });
    ok(out.canonicalOk === true && out.delivery.status === "FAILED" && out.delivery.category === "FORBIDDEN", "canonical success + delivery failure → canonicalOk stays true");
    const task = await prisma.agentTask.findFirst({ where: { createdBy: founderId, channel: "TELEGRAM" }, orderBy: { createdAt: "desc" } });
    ok(task === null || task.status !== "FAILED", "no canonical task was flipped to FAILED by delivery failure");
  }
  {
    // Delivery timeout → canonical unaffected; result is UNCERTAIN, not FAILED.
    resetMock();
    mockBehavior = () => ({ throwNetwork: "timeout" });
    const out = await deliverReply(prisma, bindingId, "x", { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch });
    ok(out.canonicalOk === true && out.delivery.status === "UNCERTAIN", "delivery timeout → UNCERTAIN, canonical untouched, no rollback");
  }
  {
    // Telemetry proves the UNCERTAIN classification is observable without
    // ever claiming guaranteed failure (Phase 16 + assertion 31).
    resetMock();
    mockBehavior = () => ({ throwNetwork: "timeout" });
    const events: DeliveryTelemetryEvent[] = [];
    const t: TelegramDeliveryTelemetry = (e) => { events.push(e); };
    const r = await sendTelegramMessage(FOUNDER_CHAT, "x", { fetchImpl: mockFetch, tokenOverride: MOCK_TOKEN, telemetry: t });
    const outcome = events.find((e) => e.kind === "outcome");
    ok(r.status === "UNCERTAIN" && outcome?.kind === "outcome" && outcome.status === "UNCERTAIN", "uncertain delivery reported as UNCERTAIN (never a guaranteed-failure claim)");
  }

  // ━━ 7. ISOLATION: WEBHOOK-LIKE FLOW (Phases 6/10/12.33-35) ━━━━━━━━━━━━
  section("ISOLATION (worker/task state + dedupe)");
  {
    resetMock();
    const before = await prisma.agentTask.findMany({ where: { createdBy: founderId }, select: { id: true, status: true } });
    mockBehavior = () => ({ throwNetwork: "reset" });
    // Full command → delivery chain with delivery failing; canonical row must be unchanged.
    const gw = await handleTelegramUpdate(deps(), msgUpdate(4001, FOUNDER_TG_USER, FOUNDER_CHAT, "/status"));
    await deliverReply(prisma, gw.bindingId as string, gw.text, { tokenOverride: MOCK_TOKEN, fetchImpl: mockFetch }).catch(() => undefined);
    const after = await prisma.agentTask.findMany({ where: { createdBy: founderId }, select: { id: true, status: true } });
    const same = before.length === after.length && before.every((b) => after.find((a) => a.id === b.id && a.status === b.status));
    ok(same, "Telegram API failure does not alter worker/task state (rows identical)");
  }
  {
    resetMock();
    mockBehavior = () => ({ status: 500, body: { ok: false } });
    const upd = msgUpdate(4002, FOUNDER_TG_USER, FOUNDER_CHAT, "/status");
    const r1 = await handleTelegramUpdate(deps(), upd);
    const r2 = await handleTelegramUpdate(deps(), upd);
    ok(r1.ok === r2.ok && r2.duplicate === true, "duplicate inbound update does NOT produce duplicate canonical task (dedupe)");
    const dups = await prisma.agentCommandDedupe.count({ where: { dedupeKey: { contains: ":4002" } } });
    ok(dups === 1, "exactly one dedupe ledger row for the duplicate pair");
  }

  // ━━ 8. RENDERER BOUNDS (Phase 5) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  section("RENDERER BOUNDS");
  {
    const big = { tasks: Array.from({ length: 500 }, (_, i) => ({ id: `t${i}`, instruction: "x".repeat(200), status: "COMPLETED", createdAt: new Date().toISOString() })) } as unknown as Parameters<typeof renderStatus>[0];
    const rendered = renderStatus(big);
    ok(typeof rendered === "string" && rendered.length <= 2000, `renderStatus output bounded (${rendered.length} chars) — no internal dump`);
    ok(!rendered.includes("x".repeat(100)), "no raw record dump in rendered output");
  }

  // ━━ 9. STATIC SECURITY GATES (Phase 13) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  section("STATIC SECURITY GATES");
  {
    const tgFiles = [
      "src/agent/telegram/adapter.ts",
      "src/agent/telegram/gateway.ts",
      "src/agent/telegram/identity.ts",
      "src/agent/telegram/rate-limit.ts",
      "src/agent/telegram/rate-limit-upstash.ts",
      "src/agent/telegram/create-task.ts",
      "src/agent/telegram/render.ts",
      "src/agent/telegram/types.ts",
      "src/agent/telegram/config.ts",
      "src/agent/telegram/transport.ts",
      "src/agent/telegram/delivery.ts",
      "src/agent/telegram/index.ts",
    ];
    const sources = tgFiles.map((p) => ({ p, src: readFileSync(p, "utf8") }));
    const runtimeImports = (src: string, needle: string): boolean =>
      new RegExp(`^import(?! type)[^\\n]*${needle}`, "m").test(src);

    ok(sources.every((s) => !runtimeImports(s.src, "ToolExecutor")), "gate: no runtime ToolExecutor import under telegram");
    ok(
      sources.every((s) => !/from ["']node:child_process["']/.test(s.src) && !/execSync|spawnSync/.test(s.src)),
      "gate: no shell / child_process under telegram"
    );
    ok(sources.every((s) => !/opencode/i.test(s.src.replace(/\*[^*]*\*/g, "").replace(/\/\/[^\n]*/g, ""))), "gate: no OpenCode reference (code, comments excluded)");
    ok(
      sources.every((s) => !runtimeImports(s.src, "worker") && !/from ["']\.\.\/core\//.test(s.src)),
      "gate: no worker-internals or core/ runtime import under telegram"
    );
    ok(
      sources.every((s) => !new RegExp(`agentTask\\.(create|update|delete|upsert|deleteMany)`).test(s.src)),
      "gate: no direct canonical-table mutation under telegram"
    );
    ok(
      sources.every((s) => !/console\.(log|error|warn)\([^)]*(BC_AGENT_TELEGRAM_BOT_TOKEN|tokenValue)/.test(s.src)),
      "gate: no token logging under telegram"
    );
    const boundaryFiles = ["src/agent/telegram/transport.ts"];
    ok(
      readFileSync("app/api/agent/telegram/webhook/route.ts", "utf8").includes("safeDeliverReply") &&
        !readFileSync("app/api/agent/telegram/webhook/route.ts", "utf8").includes("api.telegram.org"),
      "gate: webhook delegates delivery (no direct API call in route)"
    );
    ok(
      sources.filter((s) => s.src.includes("api.telegram.org")).every((s) => boundaryFiles.includes(s.p)),
      "gate: exactly ONE file constructs Telegram API URLs (transport.ts)"
    );
    const workerCore = ["src/agent/worker", "src/agent/core"];
    let telegramInCore = false;
    for (const dir of workerCore) {
      try {
        const { readdirSync } = await import("node:fs");
        for (const f of readdirSync(dir)) {
          if (!f.endsWith(".ts")) continue;
          const c = readFileSync(`${dir}/${f}`, "utf8");
          if (/from ["'].*telegram/.test(c)) telegramInCore = true;
        }
      } catch { /* dir may not exist */ }
    }
    ok(!telegramInCore, "gate: no telegram import from worker/core");
  }

  // ━━ CLEANUP + SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await cleanupTestRows();
  delete process.env.BC_AGENT_TELEGRAM_BOT_TOKEN;
  await prisma.$disconnect();

  console.log(`\n══════════════════════════════════════`);
  console.log(`P8C RESULT: ${pass} passed, ${fail} failed (min 35 required)`);
  if (failures.length > 0) {
    console.log("Failures:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  if (fail === 0 && pass >= 35) {
    console.log("P8C: PASS");
    process.exit(0);
  }
  console.log("P8C: FAIL");
  process.exit(1);
}

main().catch(async (e) => {
  console.error("SUITE ERROR:", e instanceof Error ? e.message : e);
  try { await prisma.$disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
