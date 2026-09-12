/**
 * BC Agent P2 — persistence + task engine tests.
 *
 * Runs against a LOCAL PostgreSQL database only (bahasacerdas_staging on
 * localhost). SAFETY: the script overrides DATABASE_URL to the local staging
 * DB and REFUSES any non-localhost host — production Supabase can never be
 * touched by this suite, even if env vars are misconfigured.
 *
 * Coverage: task create/read/transition, attempt lifecycle + retry isolation,
 * append-only events, approval binding/expiry/single-use, ATOMIC concurrent
 * claim, ATOMIC concurrent approval consumption, idempotent creation,
 * crash-recovery heartbeat primitives, and DB-level sequence uniqueness.
 *
 * Run: npm run test:bc-agent-p2-persistence
 */

import { PrismaClient, Prisma } from "@prisma/client";

// ─── DB safety gate ─────────────────────────────────────────────────────

const LOCAL_USER = process.env.USER || process.env.USERNAME || "postgres";
const LOCAL_URL = `postgresql://${LOCAL_USER}@localhost:5432/bahasacerdas_staging`;

function parseLocalUrl(): URL {
  try {
    const url = new URL(LOCAL_URL);
    if (!/^localhost$|^127\.0\.0\.1$/.test(url.hostname)) {
      console.error(`FATAL: refusing to run against non-localhost host "${url.hostname}"`);
      process.exit(1);
    }
    return url;
  } catch {
    console.error("FATAL: could not parse local DB URL");
    process.exit(1);
  }
}
const parsed = parseLocalUrl();
process.env.DATABASE_URL = LOCAL_URL;

const prisma = new PrismaClient({ log: ["error"] });
const NOW_ISO = () => new Date().toISOString();
let seqCounter = 0;
const newId = () => `p2test_${Date.now()}_${(seqCounter++).toString(36)}`;

// ─── Harness ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(cond: boolean, label: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}`);
  }
}

function eq<T>(actual: T, expected: T, label: string): void {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  ok(match, match ? label : `${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

async function throws(fn: () => Promise<unknown>, ctor: abstract new (...a: never[]) => Error, label: string): Promise<void> {
  try {
    await fn();
    ok(false, `${label} (expected ${ctor.name}, no error thrown)`);
  } catch (e) {
    ok(e instanceof ctor, e instanceof ctor ? label : `${label} (got ${String(e)})`);
  }
}

// ─── Fixtures ───────────────────────────────────────────────────────────

import { AgentTaskService } from "../src/agent/persistence/service";
import { AgentClaimConflictError, AgentNotFoundError, AgentConcurrentModificationError } from "../src/agent/persistence/errors";
import {
  ApprovalConsumedError,
  ApprovalExpiredError,
  ApprovalMismatchError,
  InvalidAttemptError,
  InvalidTaskTransitionError,
} from "../src/agent/core/errors";
import { hashCanonicalInput } from "../src/agent/core/hash";

function makeService(): AgentTaskService {
  return new AgentTaskService(prisma, NOW_ISO, newId);
}

async function seedTask(svcOrInstruction?: AgentTaskService | string, instruction = "audit repo health"): Promise<string> {
  const svc = typeof svcOrInstruction === "string" ? makeService() : (svcOrInstruction ?? makeService());
  const instr = typeof svcOrInstruction === "string" ? svcOrInstruction : instruction;
  const t = await svc.createTask({
    id: newId(),
    instruction: instr,
    intentType: "ANALYZE_REPO",
    channel: "WEB",
    createdBy: "founder",
  });
  return t.id;
}

// ─── Suites ─────────────────────────────────────────────────────────────

async function testTaskCrudAndTransitions(): Promise<void> {
  console.log("\n▶ Task: create / read / transition");
  const svc = makeService();
  const id = await seedTask(svc);

  const fresh = await svc.getTask(id);
  eq(fresh.status, "PENDING", "created task starts PENDING");
  eq(fresh.attemptCount, 0, "created task has zero attempts");

  // Idempotent creation: same id → same task, no duplicate
  const again = await svc.createTask({
    id,
    instruction: "audit repo health",
    intentType: "ANALYZE_REPO",
    channel: "WEB",
    createdBy: "founder",
  });
  eq(again.status, "PENDING", "createTask is idempotent on id");
  const all = await prisma.agentTask.findMany({ where: { id } });
  eq(all.length, 1, "no duplicate row created");

  // Illegal transition on PENDING
  await throws(
    () => svc.transitionTask(id, { type: "WORK_COMPLETED" }),
    InvalidTaskTransitionError,
    "PENDING → WORK_COMPLETED is rejected with typed error"
  );

  // Legal path: claim (via claimTask), complete, verify
  const { task, attempt } = await svc.claimTask(id, "worker-1");
  eq(task.status, "RUNNING", "claim flips task to RUNNING");
  eq(attempt.sequence, 1, "first attempt has sequence 1");
  eq(task.attemptCount, 1, "attemptCount incremented");

  await throws(
    () => svc.transitionTask(id, { type: "VERIFICATION_PASSED" }),
    InvalidTaskTransitionError,
    "RUNNING → VERIFICATION_PASSED is rejected (must verify via VERIFYING)"
  );

  const verifying = await svc.transitionTask(id, { type: "WORK_COMPLETED" }, { actor: "worker-1", attemptId: attempt.id });
  eq(verifying.status, "VERIFYING", "WORK_COMPLETED → VERIFYING");

  const completed = await svc.transitionTask(id, { type: "VERIFICATION_PASSED" }, { actor: "worker-1" });
  eq(completed.status, "COMPLETED", "VERIFICATION_PASSED → COMPLETED");

  // Terminal: nothing leaves COMPLETED
  await throws(
    () => svc.transitionTask(id, { type: "CANCEL" }),
    InvalidTaskTransitionError,
    "COMPLETED is terminal (CANCEL rejected)"
  );
  await throws(
    () => svc.retryTask(id, "founder"),
    InvalidTaskTransitionError,
    "retryTask refuses non-FAILED task"
  );
}

async function testClaimConflict(): Promise<void> {
  console.log("\n▶ Task: claim eligibility");
  const svc = makeService();
  const id = await seedTask();
  await svc.claimTask(id, "worker-1");
  await throws(
    () => svc.claimTask(id, "worker-2"),
    AgentClaimConflictError,
    "second claim on RUNNING task → AgentClaimConflictError"
  );
  await throws(
    () => svc.claimTask("p2test_does_not_exist", "worker-1"),
    AgentClaimConflictError,
    "claim of missing task → AgentClaimConflictError (status MISSING)"
  );
}

async function testAttemptAndRetryIsolation(): Promise<void> {
  console.log("\n▶ Attempt: lifecycle + retry isolation");
  const svc = makeService();
  const id = await seedTask("write weekly report");
  const { attempt: a1 } = await svc.claimTask(id, "worker-1");

  // Pollute attempt-scoped state
  await svc.recordDecision(a1.id, { toolName: "repo.audit", outcome: "ALLOWED", at: NOW_ISO() });
  await svc.finishAttempt(a1.id, "FAILED", "provider outage");

  // Task-side failure transition
  await svc.transitionTask(id, { type: "FAILURE", reason: "provider outage" });
  const failed = await svc.getTask(id);
  eq(failed.status, "FAILED", "task FAILED after FAILURE event");

  // Retry → brand-new attempt
  const { task, attempt: a2 } = await svc.retryTask(id, "founder");
  eq(task.status, "RUNNING", "retryTask returns task to RUNNING");
  eq(a2.sequence, 2, "retry attempt has sequence 2");
  eq(a2.decisions.length, 0, "retry attempt has NO inherited decisions");
  eq(a2.verification.status, "NOT_REQUIRED", "retry attempt has NO inherited verification");
  eq(a2.evidenceIds.length, 0, "retry attempt has NO inherited evidence");
  eq(a2.toolExecutionIds.length, 0, "retry attempt has NO inherited tool executions");
  eq(a2.error, null, "retry attempt has NO inherited error");
  ok(a2.id !== a1.id, "retry created a distinct attempt id");

  // History preserved
  const attempts = await svc.listAttempts(id);
  eq(attempts.length, 2, "both attempts preserved in history");
  const a1After = attempts.find((a) => a.id === a1.id);
  eq(a1After?.decisions.length, 1, "previous attempt's decisions untouched");
  eq(a1After?.error, "provider outage", "previous attempt's error preserved");

  // Stale approval from attempt 1 must NOT authorize attempt 2 (binding check at DB level)
  await svc.createApproval({
    approvalId: newId(),
    taskId: id,
    attemptId: a1.id,
    toolName: "repo.edit",
    inputHash: "bc1:1:aaaa",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    approvedBy: "founder",
  });
  await throws(
    () =>
      svc.consumeApproval(
        { taskId: id, attemptId: a2.id, toolName: "repo.edit", inputHash: "bc1:1:aaaa" },
        "exec-1"
      ),
    AgentNotFoundError,
    "approval bound to attempt 1 does not authorize attempt 2"
  );
}

async function testSequenceUniqueness(): Promise<void> {
  console.log("\n▶ Attempt: DB-level (taskId, sequence) uniqueness");
  const svc = makeService();
  const id = await seedTask();
  const { attempt } = await svc.claimTask(id, "worker-1");
  let p2002 = false;
  try {
    await prisma.taskAttempt.create({
      data: { id: newId(), taskId: id, sequence: attempt.sequence, status: "ACTIVE" },
    });
  } catch (e) {
    p2002 = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
  }
  ok(p2002, "duplicate (taskId, sequence) rejected by DB constraint (P2002)");
}

async function testEvents(): Promise<void> {
  console.log("\n▶ Events: append-only, ordered, atomic with state");
  const svc = makeService();
  const id = await seedTask();
  const { attempt } = await svc.claimTask(id, "worker-1");
  await svc.transitionTask(id, { type: "WORK_COMPLETED" }, { attemptId: attempt.id });
  await svc.transitionTask(id, { type: "VERIFICATION_PASSED" });

  const events = await svc.listEvents(id);
  eq(events.map((e) => e.eventType), ["CLAIM", "WORK_COMPLETED", "VERIFICATION_PASSED"], "events recorded in order");
  eq(events.map((e) => e.seq), [1, 2, 3], "event seq is gap-free");
  eq(events[0].previousStatus, "PENDING", "first event records previous status");
  eq(events[2].newStatus, "COMPLETED", "last event records new status");
  ok(
    events.every((e) => e.taskId === id),
    "every event bound to its task"
  );

  // State/event atomicity: terminal task has exactly the events its transitions wrote
  const task = await svc.getTask(id);
  eq(task.status, "COMPLETED", "task state matches event log tail");
  const rawCount = await prisma.taskEvent.count({ where: { taskId: id } });
  eq(rawCount, 3, "no orphan events, no missing events");
}

async function testApprovals(): Promise<void> {
  console.log("\n▶ Approvals: binding, expiry, single-use");
  const svc = makeService();
  const id = await seedTask();
  const { attempt } = await svc.claimTask(id, "worker-1");
  const inputHash = hashCanonicalInput({ file: "README.md", mode: "append" });

  const approval = await svc.createApproval({
    approvalId: newId(),
    taskId: id,
    attemptId: attempt.id,
    toolName: "repo.edit",
    inputHash,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    approvedBy: "founder",
  });

  // Wrong every-dimension mismatches
  await throws(
    () => svc.consumeApproval({ taskId: "other-task", attemptId: attempt.id, toolName: "repo.edit", inputHash }, "e"),
    AgentNotFoundError,
    "wrong taskId → no consumable approval"
  );
  await throws(
    () => svc.consumeApproval({ taskId: id, attemptId: attempt.id, toolName: "db.migrate", inputHash }, "e"),
    AgentNotFoundError,
    "wrong toolName → no consumable approval"
  );
  await throws(
    () => svc.consumeApproval({ taskId: id, attemptId: attempt.id, toolName: "repo.edit", inputHash: "bc1:1:zzzz" }, "e"),
    AgentNotFoundError,
    "wrong inputHash → no consumable approval"
  );

  // Valid consume
  const consumed = await svc.consumeApproval({ taskId: id, attemptId: attempt.id, toolName: "repo.edit", inputHash }, "exec-42");
  eq(consumed.status, "CONSUMED", "valid approval consumed");
  eq(consumedBy(consumed), "exec-42", "consumedBy records execution id");

  // Double-consume → typed
  await throws(
    () => svc.consumeApproval({ taskId: id, attemptId: attempt.id, toolName: "repo.edit", inputHash }, "exec-43"),
    ApprovalConsumedError,
    "second consume of same approval → ApprovalConsumedError"
  );

  // Expiry at consume time: approval is created valid, then the clock moves
  // past its expiresAt (injected now() — service-level creation refuses
  // past-dated approvals, so time-travel is the honest way to test this).
  const futureExpiry = new Date(Date.now() + 60_000).toISOString();
  const expiring = await svc.createApproval({
    approvalId: newId(),
    taskId: id,
    attemptId: attempt.id,
    toolName: "vercel.deploy",
    inputHash,
    expiresAt: futureExpiry,
    approvedBy: "founder",
  });
  const futureSvc = new AgentTaskService(
    prisma,
    () => new Date(Date.now() + 120_000).toISOString(), // now is 2 minutes later
    newId
  );
  await throws(
    () => futureSvc.consumeApproval({ taskId: id, attemptId: attempt.id, toolName: "vercel.deploy", inputHash }, "e"),
    ApprovalExpiredError,
    "approval consumed after expiresAt → ApprovalExpiredError"
  );
  const expiringAfter = await svc.getApproval(expiring.approvalId);
  eq(expiringAfter.status, "PENDING", "expired approval row retains PENDING (expiry enforced at consume)");

  // Creation guard: past-dated approvals are rejected outright
  await throws(
    () =>
      svc.createApproval({
        approvalId: newId(),
        taskId: id,
        attemptId: attempt.id,
        toolName: "db.migrate",
        inputHash,
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
        approvedBy: "founder",
      }),
    Error,
    "createApproval refuses past-dated approval"
  );

  // Binding integrity: attempt must belong to task
  await throws(
    () =>
      svc.createApproval({
        approvalId: newId(),
        taskId: "p2test_other_task",
        attemptId: attempt.id,
        toolName: "repo.edit",
        inputHash,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        approvedBy: "founder",
      }),
    Error,
    "approval creation refuses cross-task attempt binding"
  );
}

function consumedBy(a: { consumedBy?: string | null }): string | null {
  return a.consumedBy ?? null;
}

async function testAtomicApprovalConsumption(): Promise<void> {
  console.log("\n▶ Atomic approval: N concurrent consumers, exactly ONE wins");
  const svc = makeService();
  const id = await seedTask();
  const { attempt } = await svc.claimTask(id, "worker-1");
  const inputHash = hashCanonicalInput({ target: "prod", action: "deploy" });
  await svc.createApproval({
    approvalId: newId(),
    taskId: id,
    attemptId: attempt.id,
    toolName: "vercel.deploy",
    inputHash,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    approvedBy: "founder",
  });

  const CONSUMERS = 5;
  const expected = { taskId: id, attemptId: attempt.id, toolName: "vercel.deploy", inputHash };
  const results = await Promise.allSettled(
    Array.from({ length: CONSUMERS }, (_, i) => svc.consumeApproval(expected, `exec-${i}`))
  );
  const winners = results.filter((r) => r.status === "fulfilled");
  const losers = results.filter((r) => r.status === "rejected");
  eq(winners.length, 1, `exactly 1 of ${CONSUMERS} concurrent consumers succeeded`);
  eq(losers.length, CONSUMERS - 1, "all other consumers rejected");
  ok(
    losers.every((r) => (r as PromiseRejectedResult).reason instanceof ApprovalConsumedError),
    "every loser received ApprovalConsumedError"
  );
  const row = await prisma.agentApproval.findFirst({ where: { taskId: id, toolName: "vercel.deploy" } });
  ok(row?.status === "CONSUMED" && row.usedAt !== null, "DB row consumed exactly once with usedAt set");
}

async function testAtomicClaim(): Promise<void> {
  console.log("\n▶ Atomic claim: N concurrent claimers, exactly ONE wins");
  const svc = makeService();
  const id = await seedTask("contested task");

  const CLAIMERS = 5;
  const results = await Promise.allSettled(
    Array.from({ length: CLAIMERS }, (_, i) => svc.claimTask(id, `worker-${i}`))
  );
  const winners = results.filter((r) => r.status === "fulfilled");
  const losers = results.filter((r) => r.status === "rejected");
  eq(winners.length, 1, `exactly 1 of ${CLAIMERS} concurrent claimers succeeded`);
  ok(
    losers.every((r) => (r as PromiseRejectedResult).reason instanceof AgentClaimConflictError),
    "every loser received AgentClaimConflictError"
  );

  const task = await svc.getTask(id);
  eq(task.status, "RUNNING", "task is RUNNING after contested claim");
  eq(task.attemptCount, 1, "exactly one attempt created");
  const attemptRows = await prisma.taskAttempt.count({ where: { taskId: id } });
  eq(attemptRows, 1, "no duplicate attempt rows");
  const eventRows = await prisma.taskEvent.count({ where: { taskId: id, eventType: "CLAIM" } });
  eq(eventRows, 1, "exactly one CLAIM event");
}

async function testIdempotency(): Promise<void> {
  console.log("\n▶ Idempotency: duplicate-safe operations");
  const svc = makeService();
  const id = await seedTask("idempotency probe");

  // createTask twice (already covered) — here: transition guarded by optimistic check
  const { attempt } = await svc.claimTask(id, "worker-1");
  await svc.finishAttempt(attempt.id, "FAILED", "boom");
  // Double-finish hits the pure core's already-finished guard first (stronger,
  // earlier typed failure than the DB-level optimistic check below it).
  await throws(
    () => svc.finishAttempt(attempt.id, "FAILED", "boom again"),
    InvalidAttemptError,
    "double finishAttempt → InvalidAttemptError (already finished)"
  );
}

async function testCrashRecovery(): Promise<void> {
  console.log("\n▶ Crash recovery: heartbeat + stale detection");
  const svc = makeService();
  const id = await seedTask("long-running task");
  const { attempt } = await svc.claimTask(id, "worker-1");

  // Simulate a worker that died 20 minutes ago
  const staleTs = new Date(Date.now() - 20 * 60 * 1000);
  await prisma.taskAttempt.update({ where: { id: attempt.id }, data: { heartbeatAt: staleTs } });

  let stale = await svc.findStaleActiveAttempts();
  ok(stale.some((s) => s.attemptId === attempt.id), "stale RUNNING attempt detected after heartbeat lapse");

  // Worker recovers: heartbeat refreshes → no longer stale
  await svc.heartbeat(attempt.id);
  stale = await svc.findStaleActiveAttempts();
  ok(!stale.some((s) => s.attemptId === attempt.id), "heartbeat refresh clears staleness");
}

// ─── Runner ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`BC Agent P2 — persistence tests`);
  console.log(`DB: ${parsed.host}:${parsed.port}/${parsed.pathname.slice(1)} (localhost guard passed)`);

  // Fresh namespace: cascade deletes attempts/events/approvals too
  const wiped = await prisma.agentTask.deleteMany({ where: { id: { startsWith: "p2test_" } } });
  console.log(`(cleared ${wiped.count} prior test tasks)`);

  await testTaskCrudAndTransitions();
  await testClaimConflict();
  await testAttemptAndRetryIsolation();
  await testSequenceUniqueness();
  await testEvents();
  await testApprovals();
  await testAtomicApprovalConsumption();
  await testAtomicClaim();
  await testIdempotency();
  await testCrashRecovery();

  console.log("\n════════════════════════════════");
  console.log(`P2 persistence: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("Failures:");
    for (const f of failures) console.log(`  - ${f}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await prisma.$disconnect();
  process.exit(1);
});
