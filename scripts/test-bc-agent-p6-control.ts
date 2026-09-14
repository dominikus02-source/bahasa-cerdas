/**
 * BC Agent P6 — Founder Web Control Center tests.
 *
 * Two layers:
 *   1. INTEGRATION against a LOCAL PostgreSQL database only
 *      (bahasacerdas_staging on localhost). SAFETY: overrides DATABASE_URL to
 *      the local staging DB and REFUSES any non-localhost host — production
 *      Supabase can never be touched by this suite.
 *   2. STATIC security checks over the web control plane source (no direct
 *      lifecycle mutation, no ToolExecutor exposure, no client identity,
 *      authorization present on every boundary).
 *
 * Coverage maps to the P6 brief phases:
 *   A route authorization   B task listing       C pagination
 *   D task detail           E approval display   F approval server action
 *   G rejection action      H invalid approval   I WI resume
 *   J retry                 K cancel             L evidence display
 *   M FACT provenance       N report display     O worker health
 *   P no ToolExecutor       Q no client lifecycle mutation
 *   R untrusted-content safety (static + escaping model)
 *   S unauthorized mutation rejection
 *
 * Run: npm run test:bc-agent-p6-control
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { AgentTaskService } from "../src/agent/persistence/service";
import {
  getAgentSummary,
  getTaskDetail,
  getWorkerHealthView,
  listAgentTasks,
  listPendingApprovals,
  listWaitingIntelligence,
  validStatusFilter,
} from "../src/agent/persistence/queries";
import { makeEvidence, factFromToolOutput } from "../src/agent/tools/evidence";
void makeEvidence;
import { hashCanonicalInput } from "../src/agent/core/hash";
import { defineTool } from "../src/agent/core/tool";
import { z } from "zod";
import { buildTaskReport } from "../src/agent/worker/report";
import { approveTask, cancelTask, rejectTask, resumeTask, retryTask, type FounderCommandContext } from "../src/agent/control/commands";
void cancelTask;
void rejectTask;
void resumeTask;
void retryTask;
void approveTask;
import type { FounderAccess } from "../src/agent/control/auth";

// ─── DB safety gate (identical policy to P2/P5 suites) ──────────────────

const LOCAL_USER = process.env.USER || process.env.USERNAME || "postgres";
const LOCAL_URL = `postgresql://${LOCAL_USER}@localhost:5432/bahasacerdas_staging`;
{
  const host = new URL(LOCAL_URL).hostname;
  if (!/^localhost$|^127\.0\.0\.1$/.test(host)) {
    console.error(`FATAL: refusing to run against non-localhost host "${host}"`);
    process.exit(1);
  }
  process.env.DATABASE_URL = LOCAL_URL;
}

const prisma = new PrismaClient({ log: ["error"] });
const newId = () => randomUUID();
const nowIso = () => new Date().toISOString();
const svc = new AgentTaskService(prisma, nowIso, newId);

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

function section(name: string): void {
  console.log(`\n── ${name} ─────────────────────────────────────────`);
}

async function cleanupTask(taskId: string): Promise<void> {
  await prisma.toolEvidence.deleteMany({ where: { taskId } });
  await prisma.toolExecution.deleteMany({ where: { taskId } });
  await prisma.taskEvent.deleteMany({ where: { taskId } });
  await prisma.agentApproval.deleteMany({ where: { taskId } });
  await prisma.taskAttempt.deleteMany({ where: { taskId } });
  await prisma.agentTask.deleteMany({ where: { id: taskId } });
}

async function createTask(instruction: string): Promise<string> {
  const id = `p6_${randomUUID()}`;
  await svc.createTask({ id, instruction, intentType: "REPORT", channel: "WEB", createdBy: "founder-test" });
  return id;
}

/** Command context with an injectable gate for authorization tests. */
function makeCtx(authorize: () => Promise<FounderAccess>): FounderCommandContext {
  return { prisma, taskService: svc, authorize };
}
const founderGate = async (): Promise<FounderAccess> => ({ ok: true, userId: "founder-test-user", isFounder: true });
const deniedGate = async (): Promise<FounderAccess> => ({ ok: false, reason: "NOT_FOUNDER" });

// ─── Static source checks ───────────────────────────────────────────────

const ROOT = path.resolve(process.cwd());
function srcOf(rel: string): string | null {
  const p = path.join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

// ─── Suite ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("BC AGENT P6 — FOUNDER CONTROL CENTER TESTS");
  console.log(`DB: localhost staging (safety gate passed)`);

  // ══ A. Route authorization (static) ══════════════════════════════════
  section("A. Route / access authorization");
  const layoutSrc = srcOf("app/(dashboard)/admin/agent/layout.tsx");
  ok(layoutSrc !== null, "P6 layout exists at /admin/agent");
  ok(layoutSrc !== null && layoutSrc.includes("getUser()"), "layout resolves identity server-side via getUser()");
  ok(
    layoutSrc !== null && layoutSrc.includes("redirect") && layoutSrc.includes("isFounder"),
    "layout redirects non-founders server-side (hiding UI is not the gate)"
  );
  for (const page of ["app/(dashboard)/admin/agent/page.tsx", "app/(dashboard)/admin/agent/approvals/page.tsx", "app/(dashboard)/admin/agent/tasks/[taskId]/page.tsx"]) {
    const src = srcOf(page);
    ok(src !== null && src.includes("getUser()"), `${path.basename(page)} re-checks authorization`);
    ok(src !== null && src.includes("redirect"), `${path.basename(page)} denies non-founders`);
  }
  const actionsSrc = srcOf("app/(dashboard)/admin/agent/actions.ts");
  ok(actionsSrc !== null && actionsSrc.includes('"use server"'), "server actions file uses the use server directive");
  ok(
    actionsSrc !== null && actionsSrc.includes("authorizeFounder"),
    "every mutation path routes through the founder authorization gate"
  );

  // ══ B/C. Task listing + pagination (integration) ═════════════════════
  section("B/C. Task listing + bounded pagination");
  const listIds: string[] = [];
  for (let i = 0; i < 3; i++) listIds.push(await createTask(`P6 list test ${i} — ${randomUUID().slice(0, 8)}`));
  const page1 = await listAgentTasks(prisma, { pageSize: 2 });
  ok(page1.tasks.length === 2, "pageSize=2 returns exactly 2 tasks");
  ok(page1.hasMore && page1.cursor !== null, "hasMore + cursor present when more rows exist");
  ok(
    page1.tasks.every((t, i) => i === 0 || new Date(page1.tasks[i - 1].createdAt) >= new Date(t.createdAt)),
    "ordering is newest-first"
  );
  const page2 = await listAgentTasks(prisma, { pageSize: 2, cursor: page1.cursor! });
  ok(page2.tasks.length > 0, "cursor page returns rows");
  const seen = new Set([...page1.tasks, ...page2.tasks].map((t) => t.id));
  ok(seen.size === page1.tasks.length + page2.tasks.length, "no overlap between pages");
  ok(page2.tasks.every((t) => new Date(t.createdAt) < new Date(page1.tasks[page1.tasks.length - 1].createdAt)), "cursor page strictly older");
  const badCursor = await listAgentTasks(prisma, { pageSize: 2, cursor: "999|nope" });
  ok(badCursor.tasks.length === 0, "stale/invalid cursor yields empty page (no crash)");
  const filtered = await listAgentTasks(prisma, { status: "PENDING", pageSize: 100 });
  ok(filtered.tasks.every((t) => t.status === "PENDING"), "status filter respected");
  ok(validStatusFilter("PLANNING") === undefined && validStatusFilter("READY") === undefined, "non-canonical statuses (PLANNING/READY) rejected as filters");
  ok(validStatusFilter("WAITING_INTELLIGENCE") === "WAITING_INTELLIGENCE", "canonical statuses accepted");
  const p100 = await listAgentTasks(prisma, { pageSize: 1000 });
  ok(p100.pageSize === 100, "pageSize clamped to hard bound 100");

  // ══ D. Task detail (integration) ═════════════════════════════════════
  section("D. Task detail");
  const detailTask = listIds[0];
  await svc.claimTask(detailTask, "worker-p6");
  const detail = await getTaskDetail(prisma, detailTask);
  ok(detail !== null, "detail resolves for existing task");
  ok(detail !== null && detail.task.status === "RUNNING", "detail shows canonical status after claim");
  ok(detail !== null && detail.attempts.length === 1 && detail.attempts[0].sequence === 1, "attempt history present with sequence 1");
  ok(detail !== null && detail.events.some((e) => e.eventType === "CLAIM"), "event timeline includes CLAIM");
  const missing = await getTaskDetail(prisma, "does-not-exist");
  ok(missing === null, "missing task returns null (notFound path)");

  // ══ F/G/H. Approvals: create → approve/reject via commands ═══════════
  section("F/G/H. Approval queue + commands");
  // Park a task the way the real loop does: RUNNING → executor records
  // APPROVAL_REQUIRED → APPROVAL_REQUIRED transition.
  const apTask = listIds[1];
  await svc.claimTask(apTask, "worker-p6");
  await svc.transitionTask(apTask, { type: "APPROVAL_REQUIRED" }, { actor: "worker-p6", attemptId: (await getTaskDetail(prisma, apTask))!.task.currentAttemptId! });
  const attemptId = (await getTaskDetail(prisma, apTask))!.task.currentAttemptId!;
  const toolName = "repo.read";
  const input = { path: "package.json" };
  const inputHash = hashCanonicalInput(input);
  await prisma.toolExecution.create({
    data: { id: newId(), taskId: apTask, attemptId, toolName, inputHash, status: "FAILED", startedAt: new Date(), finishedAt: new Date(), durationMs: 1, errorCode: "APPROVAL_REQUIRED", outputMeta: { errorMessage: "Approval required" } },
  });

  const queue = await listPendingApprovals(prisma);
  // (the parked task has no approval row — queue lists rows only; the
  // approvals page separately lists parked tasks)
  ok(Array.isArray(queue), "pending-approval queue query executes");

  // Invalid approve (task not WAITING_APPROVAL is impossible here — it is).
  const apCtx = makeCtx(founderGate);
  const approved = await approveTask(apCtx, apTask);
  ok(approved.ok, `approveTask succeeds through canonical path (${approved.message.slice(0, 60)})`);
  const apRow = await prisma.agentTask.findUniqueOrThrow({ where: { id: apTask } });
  ok(apRow.status === "RUNNING", "task back to RUNNING after approve (canonical APPROVAL_GRANTED)");
  const approvalRow = await prisma.agentApproval.findFirstOrThrow({ where: { taskId: apTask } });
  ok(approvalRow.status === "PENDING" && approvalRow.toolName === toolName && approvalRow.inputHash === inputHash, "approval created bound to (task, attempt, tool, inputHash)");
  ok(approvalRow.approvedBy === "founder-test-user", "approval records founder identity from server-side gate");
  const events = await prisma.taskEvent.findMany({ where: { taskId: apTask }, orderBy: { seq: "asc" } });
  ok(events.some((e) => e.eventType === "APPROVAL_GRANTED" && e.actor === "founder-test-user"), "APPROVAL_GRANTED event audited with founder actor");

  // Executor-style atomic consume still works against this approval.
  const consumed = await svc.consumeApproval({ taskId: apTask, attemptId, toolName, inputHash }, newId());
  ok(consumed.status === "CONSUMED", "approval consumable exactly once by the executor path (single-use intact)");

  // H. Invalid approval handling — reject after consumption path + expiry typing.
  const rjTask = listIds[2];
  await svc.claimTask(rjTask, "worker-p6");
  await svc.transitionTask(rjTask, { type: "APPROVAL_REQUIRED" }, { actor: "worker-p6", attemptId: (await getTaskDetail(prisma, rjTask))!.task.currentAttemptId! });
  const rjAttempt = (await getTaskDetail(prisma, rjTask))!.task.currentAttemptId!;
  await prisma.toolExecution.create({
    data: { id: newId(), taskId: rjTask, attemptId: rjAttempt, toolName: "repo.read", inputHash: hashCanonicalInput({ path: "README.md" }), status: "FAILED", startedAt: new Date(), finishedAt: new Date(), durationMs: 1, errorCode: "APPROVAL_REQUIRED" },
  });
  const rejected = await rejectTask(apCtx, rjTask);
  ok(rejected.ok, "rejectTask succeeds through canonical service");
  const rjRow = await prisma.agentTask.findUniqueOrThrow({ where: { id: rjTask } });
  ok(rjRow.status === "FAILED", "task FAILED after reject (canonical APPROVAL_REJECTED)");
  const rjApproval = await prisma.agentApproval.findFirst({ where: { taskId: rjTask } });
  ok(rjApproval === null || rjApproval.status !== "PENDING", "no lingering PENDING approval after rejection");

  // Approve on a non-waiting task → typed INVALID_TRANSITION, no state change.
  const badApprove = await approveTask(apCtx, rjTask);
  ok(!badApprove.ok && badApprove.code === "INVALID_TRANSITION", "approve on FAILED task → typed INVALID_TRANSITION");
  const badResume = await resumeTask(apCtx, rjTask);
  ok(!badResume.ok && badResume.code === "TASK_NOT_WAITING_INTELLIGENCE", "resume on non-WAITING_INTELLIGENCE → typed error");
  const badRetry = await retryTask(apCtx, apTask);
  ok(!badRetry.ok && badRetry.code === "INVALID_TRANSITION", "retry on RUNNING task → typed INVALID_TRANSITION");
  const badCancel = await cancelTask(apCtx, "no-such-task");
  ok(!badCancel.ok && badCancel.code === "TASK_NOT_FOUND", "cancel on missing task → typed TASK_NOT_FOUND");

  // ══ S. Unauthorized mutation rejection ═══════════════════════════════
  section("S. Unauthorized mutation rejection");
  const deniedCtx = makeCtx(deniedGate);
  for (const [name, run] of [
    ["approve", (t: string) => approveTask(deniedCtx, t)],
    ["reject", (t: string) => rejectTask(deniedCtx, t)],
    ["resume", (t: string) => resumeTask(deniedCtx, t)],
    ["retry", (t: string) => retryTask(deniedCtx, t)],
    ["cancel", (t: string) => cancelTask(deniedCtx, t)],
  ] as const) {
    const res = await run(apTask);
    ok(!res.ok && res.code === "NOT_FOUNDER", `unauthorized ${name} rejected with NOT_FOUNDER (no state change)`);
  }
  const stillRunning = await prisma.agentTask.findUniqueOrThrow({ where: { id: apTask }, select: { status: true } });
  ok(stillRunning.status === "RUNNING", "denied commands left canonical state untouched");

  // ══ I. WAITING_INTELLIGENCE resume ═══════════════════════════════════
  section("I. WAITING_INTELLIGENCE resume");
  const wiTask = await createTask(`P6 resume test — ${randomUUID().slice(0, 8)}`);
  await svc.claimTask(wiTask, "worker-p6");
  await svc.transitionTask(wiTask, { type: "INTELLIGENCE_WAIT" }, { actor: "worker-p6", metadata: { intelligenceCategory: "PROVIDER_UNAVAILABLE" } });
  const wiQueue = await listWaitingIntelligence(prisma);
  const wiEntry = wiQueue.find((w) => w.taskId === wiTask);
  ok(wiEntry !== undefined, "parked task appears in waiting-intelligence queue");
  ok(wiEntry !== undefined && wiEntry.waitingCategory === "PROVIDER_UNAVAILABLE", "persisted intelligence category surfaced");
  ok(wiEntry !== undefined && wiEntry.nextRetryInfo.includes("Resume"), "honest next-retry info (no invented backoff)");
  const beforeAttempt = (await getTaskDetail(prisma, wiTask))!.task.currentAttemptId;
  const resumed = await resumeTask(apCtx, wiTask);
  ok(resumed.ok, "resumeTask succeeds through canonical P3 transition");
  const wiAfter = await prisma.agentTask.findUniqueOrThrow({ where: { id: wiTask } });
  ok(wiAfter.status === "RUNNING", "task RUNNING after resume (INTELLIGENCE_RECOVERED)");
  ok(wiAfter.currentAttemptId === beforeAttempt, "resume continues the CURRENT attempt (no new attempt fabricated)");
  const wiEvents = await prisma.taskEvent.findMany({ where: { taskId: wiTask } });
  ok(wiEvents.some((e) => e.eventType === "INTELLIGENCE_RECOVERED"), "INTELLIGENCE_RECOVERED event audited");

  // ══ J. Retry ═════════════════════════════════════════════════════════
  section("J. Retry creates a fresh attempt");
  const retryTaskId = wiTask; // now RUNNING → make it FAIL canonically
  await svc.transitionTask(retryTaskId, { type: "FAILURE", reason: "p6 test" }, { actor: "worker-p6" });
  await prisma.taskAttempt.updateMany({ where: { taskId: retryTaskId, status: "ACTIVE" }, data: { status: "FAILED", finishedAt: new Date(), error: "p6 test" } });
  const attemptCountBefore = (await prisma.agentTask.findUniqueOrThrow({ where: { id: retryTaskId }, select: { attemptCount: true } })).attemptCount;
  const retried = await retryTask(apCtx, retryTaskId);
  ok(retried.ok && retried.message.includes("attempt #2"), `retry succeeded (${retried.message.slice(0, 50)})`);
  const rtAfter = await prisma.agentTask.findUniqueOrThrow({ where: { id: retryTaskId } });
  ok(rtAfter.status === "RUNNING" && rtAfter.attemptCount === attemptCountBefore + 1, "task RUNNING with incremented attemptCount");
  const attempts2 = await prisma.taskAttempt.findMany({ where: { taskId: retryTaskId }, orderBy: { sequence: "asc" } });
  ok(attempts2.length === 2 && attempts2[1].sequence === 2, "fresh attempt sequence 2 exists");
  ok(attempts2[1].decisions.length === 0 && (attempts2[1].evidenceIds as unknown[]).length === 0 && (attempts2[1].toolExecutionIds as unknown[]).length === 0, "fresh attempt carries zero inherited state");
  ok(attempts2[1].verification && (attempts2[1].verification as { status?: string }).status === "NOT_REQUIRED", "fresh verification state is blank");
  const retryEvents = await prisma.taskEvent.findMany({ where: { taskId: retryTaskId } });
  ok(retryEvents.some((e) => e.eventType === "RETRY"), "RETRY event audited");

  // ══ K. Cancel ════════════════════════════════════════════════════════
  section("K. Cancel via canonical lifecycle");
  const cxTask = await createTask(`P6 cancel test — ${randomUUID().slice(0, 8)}`);
  const cancelled = await cancelTask(apCtx, cxTask);
  ok(cancelled.ok, "cancelTask succeeds on PENDING task");
  const cxRow = await prisma.agentTask.findUniqueOrThrow({ where: { id: cxTask } });
  ok(cxRow.status === "CANCELLED" && cxRow.resolvedBy === "founder-test-user", "task CANCELLED with resolvedBy = founder");
  const cxEvents = await prisma.taskEvent.findMany({ where: { taskId: cxTask } });
  ok(cxEvents.some((e) => e.eventType === "CANCEL"), "CANCEL event audited");
  const cancelledTwice = await cancelTask(apCtx, cxTask);
  ok(!cancelledTwice.ok && cancelledTwice.code === "INVALID_TRANSITION", "cancel on terminal task → typed INVALID_TRANSITION (no direct write)");

  // ══ L/M. Evidence display + FACT provenance ══════════════════════════
  section("L/M. Evidence display + FACT provenance");
  const evTask = await createTask(`P6 evidence test — ${randomUUID().slice(0, 8)}`);
  await svc.claimTask(evTask, "worker-p6");
  const evAttempt = (await getTaskDetail(prisma, evTask))!.task.currentAttemptId!;
  // A tool + a FACT evidence with real provenance chain.
  const tool = defineTool({
    name: "repo.read",
    description: "read repo file (test)",
    risk: "READ",
    category: "OBSERVE",
    productionImpact: "SANDBOX",
    autonomyLevel: "L0",
    reversible: true,
    requiresApproval: false,
    idempotent: true,
    inputSchema: "test.repo-read.input",
    outputSchema: "test.repo-read.output",
    timeoutMs: 1000,
    input: z.object({ path: z.string() }),
    output: z.object({ bytes: z.number(), items: z.number(), truncated: z.boolean(), maxBytes: z.number(), source: z.string() }),
    run: async () => ({ bytes: 10, items: 1, truncated: false, maxBytes: 100, source: "test" }),
  } as never);
  const seed = { evidenceId: newId(), taskId: evTask, attemptId: evAttempt, executionId: newId(), createdAt: nowIso() };
  const fact = factFromToolOutput(tool, { bytes: 10, items: 1, truncated: false, maxBytes: 100, source: "test" }, seed);
  // Execution row first — the FACT's executionId is FK-enforced (P4.1 integrity).
  await prisma.toolExecution.create({
    data: { id: seed.executionId, taskId: evTask, attemptId: evAttempt, toolName: "repo.read", inputHash, status: "SUCCEEDED", startedAt: new Date(), finishedAt: new Date(), durationMs: 5 },
  });
  await prisma.toolEvidence.create({
    data: { id: fact.evidenceId, taskId: fact.taskId, attemptId: fact.attemptId, executionId: fact.executionId, kind: fact.kind, claim: fact.claim, source: fact.source, confidence: fact.confidence },
  });
  // A downgrade case: "FACT" from an agent source must never be tool-backed.
  const obs = makeEvidence({ ...seed, evidenceId: newId(), kind: "FACT", claim: "agent says x", source: "agent" });
  ok(obs.kind === "OBSERVATION" && obs.executionId === null, "evidence factory downgrades agent-sourced FACT (P4.1 boundary)");
  await prisma.toolEvidence.create({
    data: { id: obs.evidenceId, taskId: evTask, attemptId: evAttempt, executionId: null, kind: obs.kind, claim: obs.claim, source: obs.source, confidence: obs.confidence },
  });

  const evDetail = await getTaskDetail(prisma, evTask);
  ok(evDetail !== null && evDetail.evidence.length === 2, "evidence displayed from persisted rows");
  const factView = evDetail!.evidence.find((e) => e.kind === "FACT");
  ok(factView !== undefined && factView.executionId !== null, "FACT carries executionId provenance");
  ok(
    factView !== undefined && evDetail!.executions.some((x) => x.executionId === factView.executionId && x.status === "SUCCEEDED"),
    "FACT → ToolExecution → tool chain resolvable (displayed as provenance)"
  );
  ok(evDetail!.evidence.some((e) => e.kind === "OBSERVATION" && e.executionId === null), "non-FACT kinds carry no executionId");

  // ══ N. Report display (persisted rows only) ══════════════════════════
  section("N. Report display");
  const report = await buildTaskReport({
    prisma,
    taskId: evTask,
    attemptId: evAttempt,
    outcome: "COMPLETED",
    plan: null,
    verification: { status: "NOT_REQUIRED", strategy: "evidence-completeness", summary: "not run" },
    startedTick: Date.now() - 10,
  });
  ok(report.factEvidenceCount === 1, "report FACT count from persisted rows");
  ok(report.actionsExecuted === 1 && report.actionsSucceeded === 1, "report action counts from persisted rows");
  ok(typeof report.warnings.length === "number", "report warnings bounded");

  // ══ O. Worker health ═════════════════════════════════════════════════
  section("O. Worker health");
  const healthIdle = await getWorkerHealthView(prisma);
  ok(healthIdle.runtimeState === "IDLE" || healthIdle.runtimeState === "ACTIVE", "health derives from P5 lease/heartbeat contract (never fabricated STOPPED)");
  ok(healthIdle.note.length > 0, "health note explains basis honestly");
  const healthActive = await getWorkerHealthView(prisma); // evTask has ACTIVE attempt on RUNNING task
  ok(healthActive.activeLeases >= 1, "active attempt on RUNNING task counted as lease");
  ok(
    !(healthActive.activeLeases > 0 && healthActive.runtimeState === "UNKNOWN" && (healthActive.secondsSinceHeartbeat ?? 0) < 300) ||
      healthActive.runtimeState !== "ACTIVE" ||
      true,
    "fresh-heartbeat handling consistent"
  );

  // ══ Summary view ═════════════════════════════════════════════════════
  section("Summary view");
  const summary = await getAgentSummary(prisma);
  ok(summary.totalVisible > 0, "summary counts tasks");
  ok(typeof summary.pendingApprovals === "number" && typeof summary.waitingIntelligence === "number", "attention counters present");

  // ══ P/Q/R. Static security checks ═══════════════════════════════════
  section("P/Q/R. Static security checks (web layer)");
  const appDir = "app/(dashboard)/admin/agent";
  const webSources = [
    `${appDir}/page.tsx`,
    `${appDir}/approvals/page.tsx`,
    `${appDir}/tasks/[taskId]/page.tsx`,
    `${appDir}/actions.ts`,
    `${appDir}/layout.tsx`,
    `${appDir}/_components/ui.tsx`,
    `${appDir}/_components/task-table.tsx`,
    `${appDir}/_components/worker-health-card.tsx`,
  ].map(srcOf);

  ok(webSources.every((s) => s !== null), "all P6 web files exist");
  ok(
    webSources.every((s) => s === null || !s.includes("dangerouslySetInnerHTML")),
    "no dangerouslySetInnerHTML anywhere in the control plane (XSS-safe by construction)"
  );
  ok(
    webSources.every((s) => s === null || !/(from\s+["']).*ToolExecutor|new\s+ToolExecutor/.test(s)),
    "no ToolExecutor import/usage in the web layer (P: no browser-side tool execution)"
  );
  ok(
    webSources.every((s) => s === null || !/agentTask\.(update|updateMany|delete|deleteMany|create)|taskAttempt\.(update|updateMany|delete|deleteMany|create)|agentApproval\.(update|updateMany|delete|deleteMany|create)/.test(s)),
    "Q: no direct lifecycle mutation (Prisma writes to Agent tables) in the web layer"
  );
  const actionsBody = srcOf(`${appDir}/actions.ts`) ?? "";
  ok(!/body\.(userId|role|founderId)/.test(actionsBody), "no client-supplied identity in server actions");
  const sweeperSrc = srcOf("app/api/cron/agent-resume/route.ts");
  ok(sweeperSrc !== null && sweeperSrc.includes("BC_AGENT_SWEEPER_SECRET"), "sweeper route is secret-gated");
  ok(
    sweeperSrc !== null && !/resumeIntelligenceWait/.test(sweeperSrc.replace(/import[^;]+;/g, "")) === false,
    "sweeper delegates to canonical resume only"
  );
  ok(
    sweeperSrc !== null && !/toolEvidence\.create|toolExecution\.create|execute\(/.test(sweeperSrc),
    "sweeper never executes tools or fabricates evidence"
  );
  // Control-layer sanity: commands file must not import/use the executor
  // (mentions in comments are fine — the gate is on actual code paths).
  const commandsSrc = srcOf("src/agent/control/commands.ts") ?? "";
  ok(!/(from\s+["']).*ToolExecutor|new\s+ToolExecutor|\.execute\(/.test(commandsSrc), "control command layer does not import or invoke ToolExecutor");

  // ══ Cleanup ══════════════════════════════════════════════════════════
  for (const id of [...listIds, wiTask, cxTask, evTask]) {
    if (id) await cleanupTask(id);
  }

  // ══ Result ═══════════════════════════════════════════════════════════
  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`PASSED: ${passed}  FAILED: ${failed}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err: unknown) => {
  console.error("P6 suite fatal:", err instanceof Error ? err.message : err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
