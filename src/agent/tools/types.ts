/**
 * BC Agent P4 — tool system types.
 *
 * The tool layer is a security boundary, not a convenience layer. The
 * executor (executor.ts) is the ONLY path from a proposal to a running
 * tool; it resolves, validates, classifies, enforces policy/approval,
 * records persistence, executes, validates output, and produces evidence —
 * in that order. Nothing else in src/agent/** executes tools.
 *
 * Read-only guarantee (§11): every P4 tool is READ risk, and capability is
 * constrained by the IMPLEMENTATION (no write code exists to call), not by
 * metadata alone — the "coherently lying tool metadata" P1 limitation is
 * closed by construction: a read-only adapter has no mutation code path.
 *
 * ToolOutput contract (§21 result boundaries): every tool result is
 * explicitly bounded (bytes, items, truncated flags) and carries its own
 * provenance so the executor can reject unbounded shapes.
 */

import type { z } from "zod";
import type { ToolDefinition, ToolContext } from "../core/tool";

// ─── Bounded tool output (§21) ───────────────────────────────────────────

/**
 * Every tool output MUST be a BoundedToolOutput: an explicit envelope with
 * hard limits. Raw payloads beyond maxBytes are truncated and flagged —
 * the executor validates the envelope, not just the payload.
 */
export interface ToolOutputEnvelope<T = unknown> {
  /** Bounded payload — the tool's data. */
  readonly data: T;
  /** Actual payload byte size (UTF-8 of the serialized data). */
  readonly bytes: number;
  /** Hard cap the tool enforced (bytes). */
  readonly maxBytes: number;
  /** Number of logical items returned (rows, files, deployments…). */
  readonly items: number;
  readonly truncated: boolean;
  /** Provenance label for downstream untrusted-content fencing, e.g. "repo:src/app/page.tsx". */
  readonly source: string;
}

/** Capabilities every read-only tool shares. */
export interface ReadOnlyTool<I, O> extends ToolDefinition {
  /** Zod input schema — validated BEFORE policy/execution. */
  readonly input: z.ZodType<I>;
  /** Zod output schema — the output contract (§7). */
  readonly output: z.ZodType<O>;
  /**
   * The implementation. Receives only validated input + a scoped context.
   * For P4 read-only tools there is no code path that mutates anything —
   * capability is constrained by this function's body, not by metadata.
   */
  readonly run: (input: I, ctx: ToolContext) => Promise<ToolOutputEnvelope<O>>;
}

/** Union of every P4 tool's concrete output data (for the executor's typing). */
export type AnyToolOutput = ToolOutputEnvelope<unknown>;

// ─── Executor outcome ────────────────────────────────────────────────────

export type ToolExecutionStatus = "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

/**
 * What the executor returns to the caller (agent loop). `output` is present
 * only on SUCCEEDED. Rejections carry the typed error that describes them.
 */
export interface ToolExecutionOutcome {
  readonly executionId: string;
  readonly status: ToolExecutionStatus;
  readonly toolName: string;
  readonly inputHash: string;
  readonly durationMs: number;
  readonly output?: AnyToolOutput;
  readonly errorCode?: string;
  readonly error?: string;
  /** Evidence id when FACT evidence was generated (success path only). */
  readonly evidenceId?: string;
  /** Approval consumed by this execution, where applicable. */
  readonly approvalId?: string;
}

// ─── Evidence (§8/§9) ────────────────────────────────────────────────────

export const EVIDENCE_KINDS = ["FACT", "OBSERVATION", "INFERENCE", "RECOMMENDATION", "UNKNOWN"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type EvidenceConfidence = (typeof CONFIDENCE_LEVELS)[number];

/**
 * A durable evidence record. Invariants (enforced by makeEvidence + the DB
 * CHECK constraint):
 * - FACT always carries executionId provenance and a non-agent source.
 * - Non-FACT kinds never carry executionId (never upgraded to tool truth).
 * - claim is bounded (≤500 chars) and operational — never raw content.
 */
export interface EvidenceRecord {
  readonly evidenceId: string;
  readonly taskId: string;
  readonly attemptId: string;
  readonly executionId: string | null;
  readonly kind: EvidenceKind;
  readonly claim: string;
  readonly source: string;
  readonly confidence: EvidenceConfidence;
  readonly createdAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
