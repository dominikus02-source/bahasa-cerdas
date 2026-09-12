/**
 * BC Agent P4 — tool executor: THE security boundary.
 *
 * The only path from "AI proposed a tool action" to "tool ran". The
 * sequence is fixed and nothing bypasses a step:
 *
 *   1. resolve tool            (registry, typed NOT_FOUND)
 *   2. validate input          (tool's zod schema — AI input is untrusted)
 *   3. classify + policy       (P1 evaluatePolicy / decideWithApproval)
 *   4. approval enforcement    (P2 ATOMIC validate-and-consume, never trusted
 *                              from the caller; read-only tools skip this)
 *   5. record START            (ToolExecution row, status RUNNING)
 *   6. execute                 (tool.run with ONE overall deadline)
 *   7. validate output         (tool's zod output contract — §7)
 *   8. record RESULT           (SUCCEEDED/FAILED, bounded outputMeta)
 *   9. produce evidence        (FACT only from validated tool output)
 *
 * Invariants:
 * - The caller (AI/Telegram/Web) is NEVER trusted: policy is re-evaluated
 *   here on every execution, approvals are consumed atomically through the
 *   P2 service (single-use enforced by row lock), and input hashes are
 *   recomputed from the actual input (never taken from the proposal).
 * - Unknown/duplicate tools, invalid input, policy denials and approval
 *   failures leave a durable FAILED ToolExecution row — rejections are
 *   auditable, never silent.
 * - A tool that succeeds but persists nothing (persistence outage) returns
 *   an explicit TOOL_EXECUTION_RECORD_FAILED ambiguity rather than lying.
 */

import type { z } from "zod";
import type { ToolContext } from "../core/tool";
import { evaluatePolicy, decideWithApproval } from "../core/policy";
import { hashCanonicalInput } from "../core/hash";
import type { Approval } from "../core/approval";
import type { AgentTaskService } from "../persistence/service";
import { AgentNotFoundError } from "../persistence/errors";
import type { ToolRegistry } from "./registry";
import type { AnyToolOutput, ReadOnlyTool, ToolExecutionOutcome, ToolExecutionStatus } from "./types";
import type { EvidenceRecord } from "./types";
import { makeEvidence, factFromToolOutput } from "./evidence";
import { withDeadline } from "./timeout";
import { redactMeta } from "./sanitize";
import {
  ToolInputInvalidError,
  ToolOutputInvalidError,
  ToolRejectedError,
  ToolExecutionRecordError,
  ToolSystemError,
  type ToolErrorCode,
} from "./errors";

/** Proposal coming from the agent loop (AI output is untrusted input). */
export interface ToolProposal {
  readonly taskId: string;
  readonly attemptId: string;
  readonly toolName: string;
  readonly input: unknown;
  /** Approval id to consume atomically — read-only tools never need one. */
  readonly approvalId?: string;
}

/** Deps injected so tests can substitute fakes without touching the boundary. */
export interface ToolExecutorDeps {
  readonly registry: ToolRegistry;
  readonly taskService: Pick<AgentTaskService, "consumeApproval" | "recordDecision">;
  readonly recordExecution: (
    row: {
      executionId: string;
      taskId: string;
      attemptId: string;
      toolName: string;
      inputHash: string;
      status: ToolExecutionStatus;
      startedAt: string;
      finishedAt: string | null;
      durationMs: number | null;
      errorCode: string | null;
      outputMeta: Record<string, unknown> | null;
      approvalId: string | null;
    }
  ) => Promise<void>;
  /** Persist an evidence record; returns the stored record. */
  readonly recordEvidence: (evidence: EvidenceRecord) => Promise<EvidenceRecord>;
  readonly now: () => string;
  readonly newId: () => string;
}

export class ToolExecutor {
  constructor(private readonly deps: ToolExecutorDeps) {}

  /**
   * Execute a proposed tool action through the full boundary. Never throws
   * for tool-level failures — they come back as FAILED outcomes (with typed
   * error codes). Throws only when the executor itself is misconfigured.
   */
  async execute(proposal: ToolProposal): Promise<ToolExecutionOutcome> {
    const startedAt = this.deps.now();
    const startMs = Date.now();
    const executionId = this.deps.newId();

    // 1. Resolve — unknown tools are auditable rejections, not crashes.
    let tool: ReadOnlyTool<unknown, unknown>;
    try {
      tool = this.deps.registry.get(proposal.toolName) as ReadOnlyTool<unknown, unknown>;
    } catch (err) {
      return this.reject(executionId, proposal, startedAt, startMs, "TOOL_NOT_FOUND", err);
    }

    // 2. Input validation — AI-provided input is untrusted (§6).
    const parsedInput = tool.input.safeParse(proposal.input);
    if (!parsedInput.success) {
      const issues = parsedInput.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message.slice(0, 80)}`
      );
      return this.reject(executionId, proposal, startedAt, startMs, "TOOL_INPUT_INVALID", new ToolInputInvalidError(tool.name, issues));
    }
    const input = parsedInput.data;
    const inputHash = hashCanonicalInput(input); // recomputed HERE — never from the proposal

    // 3+4. Policy + approval — evaluated independently of any caller claim (§10).
    let consumedApprovalId: string | null = null;
    try {
      const stage1 = evaluatePolicy(tool);
      if (stage1.decision === "DENY") {
        throw new ToolRejectedError("POLICY_DENIED", `Policy denied tool "${tool.name}": ${stage1.reason}`, tool.name);
      }
      if (stage1.decision === "REQUIRE_APPROVAL") {
        // Approval consumption goes through the P2 service's ATOMIC
        // validate-and-consume — the executor never trusts a caller-side
        // "already approved" claim. Read-only P4 tools never reach this.
        if (!proposal.approvalId) {
          throw new ToolRejectedError("APPROVAL_REQUIRED", `Approval required for tool "${tool.name}" (risk ${tool.risk})`, tool.name);
        }
        const approval = await this.deps.taskService.consumeApproval(
          {
            taskId: proposal.taskId,
            attemptId: proposal.attemptId,
            toolName: tool.name,
            inputHash,
          },
          executionId
        );
        consumedApprovalId = approval.approvalId;
      }
    } catch (err) {
      return this.reject(executionId, proposal, startedAt, startMs, errorCodeOf(err), err);
    }

    // 5. START record. Persistence failure here is an explicit ambiguity.
    try {
      await this.deps.recordExecution({
        executionId,
        taskId: proposal.taskId,
        attemptId: proposal.attemptId,
        toolName: tool.name,
        inputHash,
        status: "RUNNING",
        startedAt,
        finishedAt: null,
        durationMs: null,
        errorCode: null,
        outputMeta: null,
        approvalId: consumedApprovalId,
      });
    } catch (err) {
      throw new ToolExecutionRecordError("START", err);
    }

    // 6+7. Execute under ONE overall deadline, then validate output (§7).
    const startedTick = Date.now();
    const result = await withDeadline(
      tool.run(input as never, {
        taskId: proposal.taskId,
        attemptId: proposal.attemptId,
        executionId,
      }),
      tool.timeoutMs,
      `tool:${tool.name}`
    );
    const durationMs = Date.now() - startedTick;

    if (!result.ok) {
      const err = result.error;
      const code: ToolErrorCode = err instanceof ToolSystemError ? (err.code as ToolErrorCode) : "TOOL_FAILED";
      const finishedAt = this.deps.now();
      const outcome: ToolExecutionOutcome = {
        executionId,
        status: "FAILED",
        toolName: tool.name,
        inputHash,
        durationMs,
        errorCode: code,
        error: (err instanceof Error ? err.message : String(err)).slice(0, 300),
      };
      try {
        await this.deps.recordExecution({
          executionId,
          taskId: proposal.taskId,
          attemptId: proposal.attemptId,
          toolName: tool.name,
          inputHash,
          status: "FAILED",
          startedAt,
          finishedAt,
          durationMs,
          errorCode: code,
          outputMeta: redactMeta({ errorMessage: outcome.error }),
          approvalId: consumedApprovalId,
        });
      } catch (recordErr) {
        throw new ToolExecutionRecordError("RESULT", recordErr);
      }
      return outcome;
    }

    // Output contract validation — malformed output is never trusted (§7).
    const parsedOutput = (tool.output as z.ZodType<unknown>).safeParse(result.value);
    if (!parsedOutput.success) {
      const issues = parsedOutput.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message.slice(0, 80)}`);
      const finishedAt = this.deps.now();
      try {
        await this.deps.recordExecution({
          executionId,
          taskId: proposal.taskId,
          attemptId: proposal.attemptId,
          toolName: tool.name,
          inputHash,
          status: "FAILED",
          startedAt,
          finishedAt,
          durationMs,
          errorCode: "TOOL_OUTPUT_INVALID",
          outputMeta: redactMeta({ issues: issues.slice(0, 5) }),
          approvalId: consumedApprovalId,
        });
      } catch (recordErr) {
        throw new ToolExecutionRecordError("RESULT", recordErr);
      }
      const outcome: ToolExecutionOutcome = {
        executionId,
        status: "FAILED",
        toolName: tool.name,
        inputHash,
        durationMs,
        errorCode: "TOOL_OUTPUT_INVALID",
        error: new ToolOutputInvalidError(tool.name, issues).message,
      };
      return outcome;
    }

    // 8. SUCCESS record with bounded metadata only (never raw output).
    const finishedAt = this.deps.now();
    try {
      await this.deps.recordExecution({
        executionId,
        taskId: proposal.taskId,
        attemptId: proposal.attemptId,
        toolName: tool.name,
        inputHash,
        status: "SUCCEEDED",
        startedAt,
        finishedAt,
        durationMs,
        errorCode: null,
        outputMeta: redactMeta(summaryMeta(parsedOutput.data as AnyToolOutput)),
        approvalId: consumedApprovalId,
      });
    } catch (recordErr) {
      throw new ToolExecutionRecordError("RESULT", recordErr);
    }

    // 9. Evidence: FACT directly supported by the validated tool output (§8).
    const fact = factFromToolOutput(tool, parsedOutput.data as AnyToolOutput, {
      evidenceId: this.deps.newId(),
      taskId: proposal.taskId,
      attemptId: proposal.attemptId,
      executionId,
      createdAt: finishedAt,
    } as const);
    const stored = await this.deps.recordEvidence(fact);

    return {
      executionId,
      status: "SUCCEEDED",
      toolName: tool.name,
      inputHash,
      durationMs,
      output: parsedOutput.data as AnyToolOutput,
      evidenceId: stored.evidenceId,
      ...(consumedApprovalId ? { approvalId: consumedApprovalId } : {}),
    };
  }

  /** Record an auditable rejection (no execution ran) and return its outcome. */
  private async reject(
    executionId: string,
    proposal: ToolProposal,
    startedAt: string,
    startMs: number,
    code: ToolErrorCode,
    err: unknown
  ): Promise<ToolExecutionOutcome> {
    const finishedAt = this.deps.now();
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startMs;
    const outcome: ToolExecutionOutcome = {
      executionId,
      status: "FAILED",
      toolName: proposal.toolName,
      inputHash: hashCanonicalInput(proposal.input),
      durationMs,
      errorCode: code,
      error: message.slice(0, 300),
    };
    // The rejection row needs a real attempt to reference. If the attempt
    // itself is unknown, persistence is skipped — the typed error already
    // carries everything the caller needs.
    try {
      await this.deps.recordExecution({
        executionId,
        taskId: proposal.taskId,
        attemptId: proposal.attemptId,
        toolName: proposal.toolName,
        inputHash: outcome.inputHash,
        status: "FAILED",
        startedAt,
        finishedAt,
        durationMs,
        errorCode: code,
        outputMeta: redactMeta({ errorMessage: message.slice(0, 200) }),
        approvalId: null,
      });
    } catch {
      // Rejection recording is best-effort: never mask the typed error.
    }
    return outcome;
  }
}

/** Bounded operational summary of a successful output (metadata only). */
function summaryMeta(output: AnyToolOutput): Record<string, unknown> {
  return {
    bytes: output.bytes,
    items: output.items,
    truncated: output.truncated,
    maxBytes: output.maxBytes,
    source: output.source.slice(0, 200),
  };
}

function errorCodeOf(err: unknown): ToolErrorCode {
  if (err instanceof ToolRejectedError) return err.code;
  if (err instanceof ToolSystemError) return err.code as ToolErrorCode;
  // P1 core policy errors have their own stable codes — preserve them.
  if (err instanceof Error && "code" in err && typeof (err as { code: unknown }).code === "string") {
    const c = (err as { code: string }).code;
    if (c === "POLICY_DENIED" || c === "APPROVAL_REQUIRED" || c === "APPROVAL_INVALID") return c;
    if (c === "APPROVAL_EXPIRED" || c === "APPROVAL_CONSUMED" || c === "APPROVAL_MISMATCH") return "APPROVAL_INVALID";
  }
  // P2 service errors: an approval lookup that comes back empty during the
  // REQUIRE_APPROVAL path means "no approval for this binding" — a caller
  // problem, classified precisely instead of falling through to POLICY_DENIED
  // (P4 audit finding A3).
  if (err instanceof AgentNotFoundError) return "APPROVAL_INVALID";
  return "POLICY_DENIED";
}
