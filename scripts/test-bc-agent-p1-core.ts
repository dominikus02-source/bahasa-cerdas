/**
 * BC Agent P1 — Core Foundation Tests
 *
 * Covers: task lifecycle, attempt isolation, policy engine, tool contract,
 * approval binding, canonical hashing, immutability, and the core
 * integration chain (tool → policy → approval → transition).
 *
 * Zero I/O. Follows the repo convention: npx tsx scripts/test-bc-agent-p1-core.ts
 */

import {
  TASK_STATUSES,
  TERMINAL_STATUSES,
  TaskEvent,
  AgentTask,
  transitionTask,
  isTransitionLegal,
  createTask,
  createAttempt,
  createRetryAttempt,
  finishAttempt,
  withVerification,
  withDecision,
  withoutCurrentAttempt,
  validateApproval,
  consumeApproval,
  rejectApproval,
  revokeApproval,
  expireApproval,
  Approval,
  defineTool,
  validateToolDefinition,
  ToolDefinition,
  evaluatePolicy,
  decideWithApproval,
  hashCanonicalInput,
  canonicalize,
  InvalidTaskTransitionError,
  PolicyDeniedError,
  ApprovalRequiredError,
  ApprovalExpiredError,
  ApprovalConsumedError,
  ApprovalMismatchError,
  ApprovalInvalidError,
  InvalidToolDefinitionError,
  InvalidTaskError,
  InvalidAttemptError,
  isTerminal,
} from "../src/agent/core";

// ── Test Helpers ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, message: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
  }
}

function assertThrows<T extends Error>(
  fn: () => unknown,
  errorClass: new (...args: never[]) => T,
  message: string
) {
  total++;
  try {
    fn();
    failed++;
    console.log(`  ❌ ${message} (no error thrown)`);
  } catch (e) {
    if (e instanceof errorClass) {
      passed++;
      console.log(`  ✅ ${message}`);
    } else {
      failed++;
      console.log(`  ❌ ${message} (wrong error: ${e instanceof Error ? e.constructor.name : String(e)})`);
    }
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────

const TM1 = "2026-09-10T23:00:00.000Z"; // before T0
const T0 = "2026-09-11T00:00:00.000Z";
const T1 = "2026-09-11T01:00:00.000Z";
const T2 = "2026-09-11T02:00:00.000Z";

let taskSeq = 0;
function makeTask(status: AgentTask["status"] = "PENDING"): AgentTask {
  taskSeq++;
  let task = createTask({
    id: `task-${taskSeq}`,
    instruction: "audit the repo and report",
    intentType: "ANALYZE_REPO",
    channel: "WEB",
    createdBy: "founder",
    createdAt: T0,
  });
  if (status === "PENDING") return task;

  const steps: TaskEvent[] =
    status === "RUNNING"
      ? [{ type: "CLAIM" }]
      : status === "CANCELLED"
      ? [{ type: "CANCEL" }]
      : status === "COMPLETED"
      ? [{ type: "CLAIM" }, { type: "WORK_COMPLETED" }, { type: "VERIFICATION_PASSED" }]
      : status === "FAILED"
      ? [{ type: "CLAIM" }, { type: "FAILURE" }]
      : [{ type: "CLAIM" }, eventToReach(status)];

  for (const step of steps) {
    const r = transitionTask(task, step, T0);
    if (!r.ok) throw new Error(`fixture transition ${step.type} → ${status} failed: ${r.error.message}`);
    task = r.task;
  }
  return task;
}

function eventToReach(status: AgentTask["status"]): TaskEvent {
  switch (status) {
    case "RUNNING":
      return { type: "CLAIM" };
    case "WAITING_APPROVAL":
      return { type: "APPROVAL_REQUIRED" };
    case "WAITING_INTELLIGENCE":
      return { type: "INTELLIGENCE_WAIT" };
    case "VERIFYING":
      return { type: "WORK_COMPLETED" };
    default:
      throw new Error(`no single event reaches ${status}`);
  }
}

const READ_TOOL: ToolDefinition = defineTool({
  name: "github.read",
  description: "Read public repo metadata",
  risk: "READ",
  reversible: true,
  requiresApproval: false,
  autonomyLevel: "L0",
  inputSchema: "github.read.input",
  outputSchema: "github.read.output",
  timeoutMs: 30000,
  productionImpact: "NONE",
  category: "OBSERVE",
  idempotent: true,
});

const WRITE_TOOL: ToolDefinition = defineTool({
  name: "github.create_pr",
  description: "Create a pull request from an agent branch",
  risk: "WRITE",
  reversible: true,
  requiresApproval: true,
  autonomyLevel: "L2",
  inputSchema: "github.create_pr.input",
  outputSchema: "github.create_pr.output",
  timeoutMs: 60000,
  productionImpact: "PREVIEW",
  category: "WRITE",
  idempotent: false,
});

const HIGH_RISK_TOOL: ToolDefinition = defineTool({
  name: "production.deploy",
  description: "Deploy to production",
  risk: "HIGH_RISK",
  reversible: false,
  requiresApproval: true,
  autonomyLevel: "L3",
  inputSchema: "production.deploy.input",
  outputSchema: "production.deploy.output",
  timeoutMs: 300000,
  productionImpact: "PRODUCTION",
  category: "WRITE",
  idempotent: false,
});

const DESTRUCTIVE_TOOL: ToolDefinition = defineTool({
  name: "database.destructive",
  description: "Destructive database operation",
  risk: "HIGH_RISK",
  reversible: false,
  requiresApproval: true,
  autonomyLevel: "L3",
  inputSchema: "database.destructive.input",
  outputSchema: "database.destructive.output",
  timeoutMs: 60000,
  productionImpact: "PRODUCTION",
  category: "DESTRUCTIVE",
  idempotent: false,
});

function makeApproval(overrides: Partial<Approval> = {}): Approval {
  return {
    approvalId: "apr-1",
    taskId: "task-1",
    attemptId: "att-1",
    toolName: "github.create_pr",
    inputHash: "bc1:123:deadbeefdeadbeef",
    issuedAt: T0,
    expiresAt: T2,
    approvedBy: "founder",
    usedAt: null,
    status: "PENDING",
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════
// 1. TASK LIFECYCLE
// ══════════════════════════════════════════════════════════════════════

console.log("\n📋 Task Lifecycle — canonical 8-state resolution");
{
  assert(
    JSON.stringify(TASK_STATUSES) ===
      JSON.stringify([
        "PENDING",
        "RUNNING",
        "WAITING_APPROVAL",
        "WAITING_INTELLIGENCE",
        "VERIFYING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ]),
    "Lifecycle is the P0 'Final 8' (PLANNING/READY collapsed into RUNNING)"
  );
  assert(
    JSON.stringify(TERMINAL_STATUSES) === JSON.stringify(["COMPLETED", "FAILED", "CANCELLED"]),
    "Terminal states are COMPLETED/FAILED/CANCELLED"
  );
}

console.log("\n📋 Task — legal transitions");
{
  const cases: Array<[AgentTask["status"], TaskEvent, AgentTask["status"]]> = [
    ["PENDING", { type: "CLAIM" }, "RUNNING"],
    ["PENDING", { type: "CANCEL" }, "CANCELLED"],
    ["RUNNING", { type: "APPROVAL_REQUIRED" }, "WAITING_APPROVAL"],
    ["RUNNING", { type: "INTELLIGENCE_WAIT" }, "WAITING_INTELLIGENCE"],
    ["RUNNING", { type: "WORK_COMPLETED" }, "VERIFYING"],
    ["RUNNING", { type: "FAILURE" }, "FAILED"],
    ["RUNNING", { type: "CANCEL" }, "CANCELLED"],
    ["WAITING_APPROVAL", { type: "APPROVAL_GRANTED" }, "RUNNING"],
    ["WAITING_APPROVAL", { type: "APPROVAL_REJECTED" }, "FAILED"],
    ["WAITING_APPROVAL", { type: "APPROVAL_EXPIRED" }, "FAILED"],
    ["WAITING_INTELLIGENCE", { type: "INTELLIGENCE_RECOVERED" }, "RUNNING"],
    ["VERIFYING", { type: "VERIFICATION_PASSED" }, "COMPLETED"],
    ["VERIFYING", { type: "VERIFICATION_FAILED" }, "FAILED"],
    ["VERIFYING", { type: "REWORK" }, "RUNNING"],
  ];
  for (const [from, event, to] of cases) {
    const task = makeTask(from);
    const result = transitionTask(task, event, T1);
    assert(result.ok && result.task.status === to, `${from} --${event.type}--> ${to}`);
    if (result.ok) {
      assert(result.task.updatedAt === T1, `${from} --${event.type}--> updates timestamp`);
    }
  }
}

console.log("\n📋 Task — illegal transitions (typed failure, no coercion)");
{
  const cases: Array<[AgentTask["status"], TaskEvent]> = [
    ["PENDING", { type: "WORK_COMPLETED" }],
    ["PENDING", { type: "APPROVAL_GRANTED" }],
    ["RUNNING", { type: "CLAIM" }],
    ["RUNNING", { type: "VERIFICATION_PASSED" }],
    ["WAITING_APPROVAL", { type: "WORK_COMPLETED" }],
    ["WAITING_APPROVAL", { type: "INTELLIGENCE_WAIT" }],
    ["WAITING_INTELLIGENCE", { type: "APPROVAL_REQUIRED" }],
    ["VERIFYING", { type: "CLAIM" }],
    ["VERIFYING", { type: "APPROVAL_REQUIRED" }],
    ["COMPLETED", { type: "CLAIM" }],
    ["COMPLETED", { type: "CANCEL" }],
    ["FAILED", { type: "CLAIM" }],
    ["FAILED", { type: "CANCEL" }],
    ["CANCELLED", { type: "CLAIM" }],
    ["CANCELLED", { type: "CANCEL" }],
  ];
  for (const [from, event] of cases) {
    const task = makeTask(from);
    const result = transitionTask(task, event, T1);
    assert(!result.ok && result.error instanceof InvalidTaskTransitionError, `${from} ✗--${event.type} (typed rejection)`);
    if (!result.ok) {
      assert(result.error.code === "INVALID_TASK_TRANSITION", `${from} ✗--${event.type} error code machine-readable`);
    }
  }
}

console.log("\n📋 Task — repeated transitions on terminal states are stable failures");
{
  for (const terminal of TERMINAL_STATUSES) {
    const task = makeTask("PENDING");
    let t = transitionTask(task, terminal === "CANCELLED" ? { type: "CANCEL" } : { type: "CLAIM" }, T0);
    // Drive COMPLETED and FAILED through their legal paths for completeness.
    if (terminal === "COMPLETED") {
      t = transitionTask(t.ok ? t.task : task, { type: "WORK_COMPLETED" }, T0);
      t = transitionTask(t.ok ? t.task : task, { type: "VERIFICATION_PASSED" }, T0);
    }
    if (terminal === "FAILED") {
      t = transitionTask(t.ok ? t.task : task, { type: "FAILURE" }, T0);
    }
    const after = t.ok ? t.task : task;
    assert(isTerminal(after.status), `${terminal} is terminal`);
    const again = transitionTask(after, { type: "CLAIM" }, T1);
    assert(!again.ok, `${terminal} rejects further events`);
  }
}

console.log("\n📋 Task — factory validation & cancellation");
{
  assertThrows(
    () => createTask({ id: "", instruction: "x", intentType: "OTHER", channel: "WEB", createdBy: "f", createdAt: T0 }),
    InvalidTaskError,
    "createTask rejects empty id"
  );
  assertThrows(
    () => createTask({ id: "x", instruction: "   ", intentType: "OTHER", channel: "WEB", createdBy: "f", createdAt: T0 }),
    InvalidTaskError,
    "createTask rejects blank instruction"
  );
  const task = makeTask("RUNNING");
  const cancelled = transitionTask(task, { type: "CANCEL", by: "founder" }, T1);
  assert(cancelled.ok && cancelled.task.status === "CANCELLED", "RUNNING → CANCELLED works");
  assert(cancelled.ok && cancelled.task.resolvedBy === "founder", "cancellation records resolver identity");
}

// ══════════════════════════════════════════════════════════════════════
// 2. ATTEMPT ISOLATION
// ══════════════════════════════════════════════════════════════════════

console.log("\n🧪 Attempt — fresh attempt & sequencing");
{
  const task = makeTask("RUNNING");
  const att1 = createAttempt({ id: "att-1", task, startedAt: T0 });
  assert(att1.sequence === 1 && att1.status === "ACTIVE", "first attempt is sequence 1, ACTIVE");
  assert(att1.plan.length === 0 && att1.decisions.length === 0 && att1.evidenceIds.length === 0, "fresh attempt is blank slate");
  assert(att1.verification.status === "NOT_REQUIRED", "fresh attempt verification is NOT_REQUIRED");
  assertThrows(
    () => createAttempt({ id: "att-2", task: { ...task, currentAttemptId: "att-1" }, startedAt: T0 }),
    InvalidAttemptError,
    "cannot create a second attempt while one is active on the task"
  );

  // Simulate task with attempt attached (attemptCount=1, currentAttemptId set),
  // then finish that attempt and detach it — the proper pre-retry lifecycle.
  const withAtt1 = { ...task, currentAttemptId: "att-1", attemptCount: 1 };
  const finishedAtt1 = finishAttempt(
    withVerification(
      withDecision(att1, { toolName: "github.read", outcome: "ALLOWED", at: T0 }),
      { status: "FAILED" }
    ),
    "FAILED",
    T1,
    "provider down"
  );
  const detachedTask = withoutCurrentAttempt(withAtt1, T1);
  const retry = createRetryAttempt({ id: "att-2", task: detachedTask, previousAttempt: finishedAtt1, startedAt: T1 });
  assert(retry.attempt.sequence === 2, "retry attempt increments sequence to 2");
  assert(retry.attempt.plan.length === 0, "retry does NOT inherit plan");
  assert(retry.attempt.decisions.length === 0, "retry does NOT inherit policy decisions");
  assert(retry.attempt.verification.status === "NOT_REQUIRED", "retry does NOT inherit verification result");
  assert(retry.attempt.evidenceIds.length === 0, "retry does NOT inherit evidence");
  assert(retry.attempt.toolExecutionIds.length === 0, "retry does NOT inherit tool outputs");
  assert(retry.attempt.error === null, "retry does NOT inherit error");
  assert(Object.keys(retry.attempt.metadata).length === 0, "retry does NOT inherit execution metadata");
  assert(retry.task.status === "RUNNING" && retry.task.currentAttemptId === "att-2", "retry task is RUNNING on new attempt");
  assert(retry.task.attemptCount === 2, "retry task attemptCount incremented");

  assertThrows(
    () =>
      createRetryAttempt({
        id: "att-x",
        task: withAtt1,
        previousAttempt: { ...att1, taskId: "other-task" },
        startedAt: T0,
      }),
    InvalidAttemptError,
    "retry refuses a previous attempt from a different task"
  );
}

// ══════════════════════════════════════════════════════════════════════
// 3. POLICY ENGINE
// ══════════════════════════════════════════════════════════════════════

console.log("\n🛡️ Policy — autonomy levels & risk classes");
{
  const read = evaluatePolicy(READ_TOOL);
  assert(read.decision === "ALLOW" && read.reason === "OBSERVE_ALLOWED", "L0 READ → ALLOW (OBSERVE_ALLOWED)");

  const analyzeTool = defineTool({ ...READ_TOOL, name: "repo.audit", risk: "ANALYZE", autonomyLevel: "L1", category: "ANALYZE" });
  assert(evaluatePolicy(analyzeTool).decision === "ALLOW", "L1 ANALYZE → ALLOW");

  assert(evaluatePolicy(WRITE_TOOL).decision === "REQUIRE_APPROVAL", "L2 WRITE → REQUIRE_APPROVAL");
  assert(evaluatePolicy(WRITE_TOOL).suggestedTtlMs === 3600000, "WRITE suggested TTL 60 min");

  assert(evaluatePolicy(HIGH_RISK_TOOL).decision === "REQUIRE_APPROVAL", "L3 HIGH_RISK → REQUIRE_APPROVAL");
  assert(evaluatePolicy(HIGH_RISK_TOOL).suggestedTtlMs === 900000, "HIGH_RISK suggested TTL 15 min");

  assert(evaluatePolicy(DESTRUCTIVE_TOOL).decision === "DENY", "DESTRUCTIVE → outright DENY");
}

console.log("\n🛡️ Policy — ambiguity & default deny");
{
  const corrupt = { ...READ_TOOL, risk: "SUPER_SAFE" } as unknown as ToolDefinition;
  assert(evaluatePolicy(corrupt).decision === "DENY", "unknown risk enum → DENY (default deny)");
  const corrupt2 = { ...READ_TOOL, category: "TELEPORT" } as unknown as ToolDefinition;
  assert(evaluatePolicy(corrupt2).decision === "DENY", "unknown category → DENY");
  const corrupt3 = { ...READ_TOOL, reversible: "yes" } as unknown as ToolDefinition;
  assert(evaluatePolicy(corrupt3).decision === "DENY", "non-boolean reversible → DENY (ambiguous)");
}

console.log("\n🛡️ Policy + approval interaction");
{
  const task = makeTask("RUNNING");
  const input = { title: "PR", branch: "agent/fix" };

  // L0: no approval needed even if one is offered.
  assert(decideWithApproval(READ_TOOL, input, { taskId: task.id, attemptId: "att-1", now: T1 }).decision === "ALLOW", "L0 allows without approval");

  // L2 without approval → typed ApprovalRequiredError.
  assertThrows(
    () => decideWithApproval(WRITE_TOOL, input, { taskId: task.id, attemptId: "att-1", now: T1 }),
    ApprovalRequiredError,
    "L2 without approval → ApprovalRequiredError"
  );

  // L2 with a valid approval → ALLOW.
  const goodHash = hashCanonicalInput(input);
  const valid = makeApproval({ taskId: task.id, attemptId: "att-1", inputHash: goodHash });
  const result = decideWithApproval(
    WRITE_TOOL,
    input,
    { taskId: task.id, attemptId: "att-1", now: T1 },
    { approval: valid, input }
  );
  assert(result.decision === "ALLOW" && result.reason === "APPROVAL_VALID", "L2 with valid bound approval → ALLOW");

  // CRITICAL: approval cannot flip an outright policy denial.
  assertThrows(
    () =>
      decideWithApproval(
        DESTRUCTIVE_TOOL,
        input,
        { taskId: task.id, attemptId: "att-1", now: T1 },
        { approval: makeApproval({ taskId: task.id, attemptId: "att-1", toolName: "database.destructive", inputHash: goodHash }), input }
      ),
    PolicyDeniedError,
    "valid approval does NOT turn DENIED_DESTRUCTIVE into ALLOW"
  );

  // AI cannot bypass policy: tools are committed CODE, not runtime data —
  // a model can never inject a definition. Validation enforces internal
  // consistency (an incoherent relabel is rejected); it cannot read intent.
  // The incoherent lie IS caught:
  assertThrows(
    () => validateToolDefinition({ ...WRITE_TOOL, risk: "READ" } as unknown as ToolDefinition),
    InvalidToolDefinitionError,
    "WRITE tool relabeled READ but keeping requiresApproval=false contradiction is rejected"
  );
  // The coherent lie (a "read tool" that looks exactly like a read tool)
  // passes structural validation — documented limitation; the runtime
  // boundary is P4 capability-scoped credentials (a lying READ tool still
  // never receives write credentials).
  const coherentLie = { ...WRITE_TOOL, risk: "READ", requiresApproval: false, autonomyLevel: "L0", category: "OBSERVE" } as unknown as ToolDefinition;
  assert(validateToolDefinition(coherentLie) === undefined, "coherent-but-lying metadata passes structural validation (limitation documented → P4 credential scoping)");
}

// ══════════════════════════════════════════════════════════════════════
// 4. TOOL CONTRACT
// ══════════════════════════════════════════════════════════════════════

console.log("\n🔧 Tool — valid metadata accepted");
{
  const t = defineTool({ ...READ_TOOL, name: "vercel.read" });
  assert(t.name === "vercel.read", "valid READ tool registers");
  const w = defineTool({ ...WRITE_TOOL, name: "vercel.deploy.preview" });
  assert(w.risk === "WRITE", "valid WRITE tool registers");
}

console.log("\n🔧 Tool — invalid metadata rejected");
{
  const base = { ...READ_TOOL };
  assertThrows(() => defineTool({ ...base, name: "" }), InvalidToolDefinitionError, "empty name rejected");
  assertThrows(() => defineTool({ ...base, name: "  " }), InvalidToolDefinitionError, "whitespace name rejected");
  assertThrows(() => defineTool({ ...base, description: "" }), InvalidToolDefinitionError, "empty description rejected");
  assertThrows(() => defineTool({ ...base, risk: "EXTREME" as never }), InvalidToolDefinitionError, "unknown risk rejected");
  assertThrows(() => defineTool({ ...base, autonomyLevel: "L9" as never }), InvalidToolDefinitionError, "unknown autonomy level rejected");
  assertThrows(() => defineTool({ ...base, reversible: 1 as never }), InvalidToolDefinitionError, "non-boolean reversible rejected");
  assertThrows(() => defineTool({ ...base, timeoutMs: 0 }), InvalidToolDefinitionError, "zero timeout rejected");
  assertThrows(() => defineTool({ ...base, timeoutMs: 1.5 }), InvalidToolDefinitionError, "non-integer timeout rejected");
  assertThrows(() => defineTool({ ...base, inputSchema: "" }), InvalidToolDefinitionError, "empty inputSchema rejected");
  assertThrows(() => defineTool({ ...base, productionImpact: "MOON" as never }), InvalidToolDefinitionError, "unknown productionImpact rejected");
  assertThrows(() => validateToolDefinition(null as never), InvalidToolDefinitionError, "null definition rejected");
  // Contradictory metadata
  assertThrows(
    () => defineTool({ ...WRITE_TOOL, requiresApproval: false }),
    InvalidToolDefinitionError,
    "WRITE with requiresApproval=false rejected (contradiction)"
  );
  assertThrows(
    () => defineTool({ ...READ_TOOL, requiresApproval: true }),
    InvalidToolDefinitionError,
    "READ with requiresApproval=true rejected (contradiction)"
  );
  assertThrows(
    () => defineTool({ ...HIGH_RISK_TOOL, reversible: true }),
    InvalidToolDefinitionError,
    "HIGH_RISK declared reversible rejected (contradiction)"
  );
  assertThrows(
    () => defineTool({ ...DESTRUCTIVE_TOOL, reversible: true }),
    InvalidToolDefinitionError,
    "DESTRUCTIVE declared reversible rejected (contradiction)"
  );
  assertThrows(
    () => defineTool({ ...WRITE_TOOL, autonomyLevel: "L3" }),
    InvalidToolDefinitionError,
    "WRITE at wrong autonomy level rejected"
  );
}

// ══════════════════════════════════════════════════════════════════════
// 5. APPROVAL
// ══════════════════════════════════════════════════════════════════════

console.log("\n🔑 Approval — valid case");
{
  const approval = makeApproval();
  const result = validateApproval(
    approval,
    { taskId: "task-1", attemptId: "att-1", toolName: "github.create_pr", inputHash: approval.inputHash },
    T1
  );
  assert(result.ok, "valid approval passes all bindings");
}

console.log("\n🔑 Approval — mismatch cases");
{
  const expected = { taskId: "task-1", attemptId: "att-1", toolName: "github.create_pr", inputHash: "bc1:123:deadbeefdeadbeef" };
  const wrongTask = validateApproval(makeApproval({ taskId: "task-OTHER" }), expected, T1);
  assert(!wrongTask.ok && wrongTask.error instanceof ApprovalMismatchError && wrongTask.error.field === "taskId", "wrong task rejected (field=taskId)");
  const wrongAttempt = validateApproval(makeApproval({ attemptId: "att-OTHER" }), expected, T1);
  assert(!wrongAttempt.ok && wrongAttempt.error instanceof ApprovalMismatchError && wrongAttempt.error.field === "attemptId", "wrong attempt rejected (field=attemptId)");
  const wrongTool = validateApproval(makeApproval({ toolName: "production.deploy" }), expected, T1);
  assert(!wrongTool.ok && wrongTool.error instanceof ApprovalMismatchError && wrongTool.error.field === "toolName", "wrong tool rejected (field=toolName)");
  const wrongHash = validateApproval(makeApproval({ inputHash: "bc1:1:aaaa" }), expected, T1);
  assert(!wrongHash.ok && wrongHash.error instanceof ApprovalMismatchError && wrongHash.error.field === "inputHash", "wrong input hash rejected (field=inputHash)");
}

console.log("\n🔑 Approval — expiry, consumption, status");
{
  const expected = { taskId: "task-1", attemptId: "att-1", toolName: "github.create_pr", inputHash: "bc1:123:deadbeefdeadbeef" };
  // Issued before T0, window closed at T0, checked at T1 → genuinely expired
  // (not malformed: expiresAt > issuedAt holds).
  const expired = validateApproval(makeApproval({ issuedAt: TM1, expiresAt: T0 }), expected, T1);
  assert(!expired.ok && expired.error instanceof ApprovalExpiredError, "expired approval rejected");
  // P1-audit closure: expiresAt is the LAST valid instant — now == expiresAt
  // must be expired (previously untested; a flip of > to >= would have passed CI).
  const atBoundary = validateApproval(makeApproval({ issuedAt: TM1, expiresAt: T1 }), expected, T1);
  assert(!atBoundary.ok && atBoundary.error instanceof ApprovalExpiredError, "now == expiresAt is EXPIRED (exact-boundary policy)");
  const justBeforeBoundary = validateApproval(makeApproval({ issuedAt: TM1, expiresAt: T2 }), expected, T1);
  assert(justBeforeBoundary.ok, "now < expiresAt is still valid (boundary is exclusive)");

  const consumed = validateApproval(makeApproval({ status: "CONSUMED", usedAt: T0 }), expected, T1);
  assert(!consumed.ok && consumed.error instanceof ApprovalConsumedError, "consumed approval rejected (single-use)");

  const revoked = validateApproval(makeApproval({ status: "REVOKED" }), expected, T1);
  assert(!revoked.ok && revoked.error instanceof ApprovalInvalidError, "revoked approval rejected");

  const rejected = validateApproval(makeApproval({ status: "REJECTED" }), expected, T1);
  assert(!rejected.ok && rejected.error instanceof ApprovalInvalidError, "rejected approval rejected");

  // P1-audit closure (F2): usedAt is only coherent on a CONSUMED approval.
  const staleUsedAt = validateApproval(makeApproval({ status: "PENDING", usedAt: T0 }), expected, T1);
  assert(!staleUsedAt.ok && staleUsedAt.error instanceof ApprovalInvalidError, "PENDING approval with usedAt is malformed (F2)");
  const malformedUsedAt = validateApproval(makeApproval({ status: "PENDING", usedAt: "not-a-date" }), expected, T1);
  assert(!malformedUsedAt.ok && malformedUsedAt.error instanceof ApprovalInvalidError, "malformed usedAt is rejected (F1)");

  // P1-audit closure (F1): malformed / non-ISO timestamps are rejected.
  const badIssued = validateApproval(makeApproval({ issuedAt: "not-a-date" }), expected, T1);
  assert(!badIssued.ok && badIssued.error instanceof ApprovalInvalidError, "non-ISO issuedAt is malformed (F1)");
  const badExpiry = validateApproval(makeApproval({ expiresAt: "09/11/2026" }), expected, T1);
  assert(!badExpiry.ok && badExpiry.error instanceof ApprovalInvalidError, "non-ISO expiresAt is malformed (F1)");
  assert(!validateApproval(makeApproval({ expiresAt: T2.replace("Z", "+00:00") }), expected, T1).ok, "non-UTC-offset expiry rejected (F1)");

  assertThrows(() => consumeApproval(makeApproval({ status: "CONSUMED", usedAt: T0 }), T1, "exec-1"), ApprovalInvalidError, "cannot consume an already-consumed approval");

  const toConsume = makeApproval();
  const used = consumeApproval(toConsume, T1, "exec-42");
  assert(used.status === "CONSUMED" && used.usedAt === T1 && used.consumedBy === "exec-42", "consume marks CONSUMED with execution id");
  assert(toConsume.status === "PENDING", "consumeApproval does not mutate the original");
  assert(rejectApproval(toConsume).status === "REJECTED", "rejectApproval works immutably");
  assert(revokeApproval(toConsume).status === "REVOKED", "revokeApproval works immutably");
  assertThrows(() => expireApproval(makeApproval(), T1), ApprovalInvalidError, "cannot expire an approval whose window has not passed");
  assert(expireApproval(makeApproval(), T2 + "X").status === "EXPIRED", "expireApproval marks EXPIRED after window");
}

// ══════════════════════════════════════════════════════════════════════
// 6. HASHING
// ══════════════════════════════════════════════════════════════════════

console.log("\n#️⃣ Hash — deterministic canonicalization");
{
  assert(hashCanonicalInput({ a: 1, b: 2 }) === hashCanonicalInput({ b: 2, a: 1 }), "{a:1,b:2} ≡ {b:2,a:1} (key order ignored)");
  assert(hashCanonicalInput({ a: 1, b: { c: 3, d: [1, 2] } }) === hashCanonicalInput({ b: { d: [1, 2], c: 3 }, a: 1 }), "nested objects canonicalize order-insensitively");
  assert(hashCanonicalInput({ a: [1, 2] }) !== hashCanonicalInput({ a: [2, 1] }), "array order is significant");
  assert(hashCanonicalInput({ a: null }) !== hashCanonicalInput({ a: "" }), "null ≠ empty string");
  assert(hashCanonicalInput({ a: null }) !== hashCanonicalInput({}), "null ≠ absent");
  assert(hashCanonicalInput(1) === hashCanonicalInput(1.0), "1 ≡ 1.0");
  assert(hashCanonicalInput("1") !== hashCanonicalInput(1), "string ≠ number");
  assert(hashCanonicalInput(true) !== hashCanonicalInput("true"), "boolean ≠ string");
  assert(hashCanonicalInput({ a: 1 }) !== hashCanonicalInput({ a: 2 }), "different values → different hashes");
  assert(hashCanonicalInput({ a: undefined, b: 1 }) === hashCanonicalInput({ b: 1 }), "undefined values dropped like JSON");
  assert(canonicalize({ b: 2, a: 1 }) === '{"a":1,"b":2}', "canonical text is sorted-key JSON");
  assert(hashCanonicalInput([]) === hashCanonicalInput([]), "empty arrays equal");
  assert(hashCanonicalInput({}) === hashCanonicalInput({}), "empty objects equal");

  // P1-audit closure (F-hash): the digest is TRUE FNV-1a-64. These vectors
  // come from the published algorithm (basis 0xcbf29ce484222325, prime
  // 0x100000001b3) over the CANONICAL FORM of each input (string inputs are
  // hashed as JSON literals — quotes included; the empty string's canonical
  // form is "" WITH quotes, not the empty byte string, so the basis vector
  // appears via canonicalize's exact text instead).
  assert(canonicalize("foobar") === '"foobar"', "canonicalize('foobar') is the JSON string literal");
  assert(hashCanonicalInput("foobar") === "bc1:8:6477f76a9c2fba7e", "FNV-1a-64 KAT: canonical('foobar') → bc1:8:6477f76a9c2fba7e");
  assert(hashCanonicalInput("") === "bc1:2:07cc7607b4949e25", "FNV-1a-64 KAT: canonical('') → bc1:2:07cc7607b4949e25");
  assert(hashCanonicalInput("a") === "bc1:3:d4272417d7c77eea", "FNV-1a-64 KAT: canonical('a') → bc1:3:d4272417d7c77eea");
  assert(hashCanonicalInput([1, 2]) === "bc1:5:6a12f12d4705a9b6", "FNV-1a-64 KAT: [1,2] → bc1:5:6a12f12d4705a9b6");
  const nullProto = Object.create(null);
  nullProto.a = 1; // deliberate acceptance, documented in hash.ts
  assert(hashCanonicalInput(nullProto) === hashCanonicalInput({ a: 1 }), "null-prototype objects accepted as plain (documented)");
  assertThrows(() => hashCanonicalInput(NaN), TypeError, "NaN refused");
  assertThrows(() => hashCanonicalInput(Infinity), TypeError, "Infinity refused");
  assertThrows(() => hashCanonicalInput(undefined), TypeError, "top-level undefined refused");
  assertThrows(() => hashCanonicalInput(() => 1), TypeError, "functions refused");
  assertThrows(() => hashCanonicalInput(new Date()), TypeError, "non-plain objects (Date) refused");
  assertThrows(() => hashCanonicalInput({ d: new Date() }), TypeError, "nested non-plain objects refused");
}

// ══════════════════════════════════════════════════════════════════════
// 7. IMMUTABILITY
// ══════════════════════════════════════════════════════════════════════

console.log("\n🧊 Immutability — inputs never mutated");
{
  const task = makeTask("RUNNING");
  const before = structuredClone(task);
  transitionTask(task, { type: "WORK_COMPLETED" }, T1);
  assert(JSON.stringify(task) === JSON.stringify(before), "transitionTask does not mutate task");

  const approval = makeApproval();
  const approvalBefore = structuredClone(approval);
  validateApproval(approval, { taskId: "task-1", attemptId: "att-1", toolName: "github.create_pr", inputHash: approval.inputHash }, T1);
  consumeApproval(approval, T1, "exec-1");
  rejectApproval(approval);
  assert(JSON.stringify(approval) === JSON.stringify(approvalBefore), "approval functions do not mutate approval");

  const task2 = makeTask("RUNNING");
  const att = createAttempt({ id: "att-9", task: task2, startedAt: T0 });
  const attBefore = structuredClone(att);
  withVerification(att, { status: "PASSED" });
  withDecision(att, { toolName: "github.read", outcome: "ALLOWED", at: T0 });
  finishAttempt(att, "COMPLETED", T1);
  assert(JSON.stringify(att) === JSON.stringify(attBefore), "attempt functions do not mutate attempt");

  const tool = { ...READ_TOOL };
  const toolBefore = structuredClone(tool);
  evaluatePolicy(tool);
  assert(JSON.stringify(tool) === JSON.stringify(toolBefore), "policy evaluation does not mutate tool");
}

// ══════════════════════════════════════════════════════════════════════
// 8. INTEGRATION — tool → policy → approval → transition
// ══════════════════════════════════════════════════════════════════════

console.log("\n🔗 Integration — full core chain without I/O");
{
  // Happy path: task claimed → write requires approval → approval granted →
  // policy allows → work completes → verification passes → COMPLETED.
  let task = makeTask("PENDING");
  const claim = transitionTask(task, { type: "CLAIM" }, T0);
  assert(claim.ok, "step 1: PENDING → RUNNING (claim)");
  task = claim.ok ? claim.task : task;

  const att = createAttempt({ id: "att-int-1", task, startedAt: T0 });
  const taskWithAttempt = { ...task, currentAttemptId: att.id, attemptCount: 1 };

  const input = { title: "Fix docs", branch: "agent/docs" };
  const blocked = (() => {
    try {
      decideWithApproval(WRITE_TOOL, input, { taskId: taskWithAttempt.id, attemptId: att.id, now: T0 });
      return null;
    } catch (e) {
      return e;
    }
  })();
  assert(blocked instanceof ApprovalRequiredError, "step 2: policy blocks WRITE pending approval");

  const wait = transitionTask(taskWithAttempt, { type: "APPROVAL_REQUIRED" }, T0);
  assert(wait.ok && wait.task.status === "WAITING_APPROVAL", "step 3: task waits for approval");

  const inputHash = hashCanonicalInput(input);
  const approval = makeApproval({
    taskId: taskWithAttempt.id,
    attemptId: att.id,
    toolName: WRITE_TOOL.name,
    inputHash,
  });
  const grant = transitionTask(wait.ok ? wait.task : taskWithAttempt, { type: "APPROVAL_GRANTED" }, T0);
  assert(grant.ok && grant.task.status === "RUNNING", "step 4: approval granted → RUNNING");

  const allowed = decideWithApproval(
    WRITE_TOOL,
    input,
    { taskId: taskWithAttempt.id, attemptId: att.id, now: T0 },
    { approval, input }
  );
  assert(allowed.decision === "ALLOW", "step 5: policy+approval → ALLOW");

  const consumed = consumeApproval(approval, T0, "exec-1");
  assert(consumed.status === "CONSUMED", "step 6: approval consumed (single-use)");

  assertThrows(
    () =>
      decideWithApproval(
        WRITE_TOOL,
        input,
        { taskId: taskWithAttempt.id, attemptId: att.id, now: T0 },
        { approval: consumed, input }
      ),
    ApprovalConsumedError,
    "step 6c: consumed approval cannot authorize again"
  );

  const done = transitionTask(grant.ok ? grant.task : taskWithAttempt, { type: "WORK_COMPLETED" }, T0);
  assert(done.ok && done.task.status === "VERIFYING", "step 7: work completed → VERIFYING");
  const passed = transitionTask(done.ok ? done.task : taskWithAttempt, { type: "VERIFICATION_PASSED" }, T0);
  assert(passed.ok && passed.task.status === "COMPLETED", "step 8: verification passed → COMPLETED");

  // Expiry path: WAITING_INTELLIGENCE recovery then approval expiry fails task.
  let t2 = makeTask("RUNNING");
  const wi = transitionTask(t2, { type: "INTELLIGENCE_WAIT" }, T0);
  assert(wi.ok && wi.task.status === "WAITING_INTELLIGENCE", "step 9: intelligence outage → WAITING_INTELLIGENCE (not crash)");
  const rec = transitionTask(wi.ok ? wi.task : t2, { type: "INTELLIGENCE_RECOVERED" }, T1);
  assert(rec.ok && rec.task.status === "RUNNING", "step 10: recovered → RUNNING (resume)");

  // Approval expiry fails the task.
  let t3 = makeTask("WAITING_APPROVAL");
  const exp = transitionTask(t3, { type: "APPROVAL_EXPIRED" }, T2);
  assert(exp.ok && exp.task.status === "FAILED", "step 11: approval expiry → FAILED");
}

// ── Summary ───────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`BC AGENT P1 CORE: ${passed}/${total} passed, ${failed} failed`);
console.log(`${"═".repeat(60)}`);

if (failed > 0) {
  process.exit(1);
}
process.exit(0);
