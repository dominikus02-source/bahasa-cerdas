/**
 * BC Agent P4 — typed tool-system errors.
 *
 * Machine-readable (code + instanceof), following the P1/P2/P3 convention.
 * ToolErrorCode doubles as the durable `errorCode` on ToolExecution rows.
 * Diagnostic detail is bounded — error messages never carry API tokens,
 * response bodies, or tool output content.
 */

import { AgentError } from "../core/errors";

export type ToolErrorCode =
  | "TOOL_NOT_FOUND"
  | "TOOL_DUPLICATE"
  | "TOOL_INPUT_INVALID"
  | "TOOL_OUTPUT_INVALID"
  | "TOOL_TIMEOUT"
  | "TOOL_FAILED"
  | "TOOL_UNAVAILABLE"
  | "TOOL_RATE_LIMITED"
  | "TOOL_PATH_DENIED"
  | "TOOL_SIZE_LIMIT"
  | "TOOL_EXECUTION_RECORD_FAILED"
  | "POLICY_DENIED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_INVALID";

export abstract class ToolSystemError extends AgentError {
  abstract readonly code: ToolErrorCode | (string & {});
  constructor(message: string) {
    super(message);
  }
}

export class ToolNotFoundError extends ToolSystemError {
  readonly code = "TOOL_NOT_FOUND";
  constructor(public readonly toolName: string) {
    super(`Unknown tool "${toolName}"`);
  }
}

export class ToolDuplicateError extends ToolSystemError {
  readonly code = "TOOL_DUPLICATE";
  constructor(toolName: string) {
    super(`Tool "${toolName}" is already registered`);
  }
}

export class ToolInputInvalidError extends ToolSystemError {
  readonly code = "TOOL_INPUT_INVALID";
  constructor(toolName: string, public readonly issues: readonly string[]) {
    super(`Invalid input for tool "${toolName}": ${issues.slice(0, 5).join("; ")}`);
  }
}

export class ToolOutputInvalidError extends ToolSystemError {
  readonly code = "TOOL_OUTPUT_INVALID";
  constructor(toolName: string, public readonly issues: readonly string[]) {
    super(`Tool "${toolName}" returned output violating its contract: ${issues.slice(0, 5).join("; ")}`);
  }
}

/** The tool ran (or its adapter made an external call) but failed. */
export class ToolFailedError extends ToolSystemError {
  readonly code = "TOOL_FAILED";
  constructor(toolName: string, reason: string) {
    // reason is bounded upstream (≤200 chars, sanitized).
    super(`Tool "${toolName}" failed: ${reason}`);
  }
}

/** The tool never ran — the executor refused before execution. */
export class ToolRejectedError extends ToolSystemError {
  readonly code: ToolErrorCode;
  constructor(
    code: Extract<ToolErrorCode, "POLICY_DENIED" | "APPROVAL_REQUIRED" | "APPROVAL_INVALID" | "TOOL_PATH_DENIED" | "TOOL_SIZE_LIMIT">,
    message: string,
    public readonly toolName: string
  ) {
    super(message);
    this.code = code;
  }
}

export class ToolExecutionRecordError extends ToolSystemError {
  readonly code = "TOOL_EXECUTION_RECORD_FAILED";
  constructor(operation: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`ToolExecution persistence failed during ${operation}: ${detail.slice(0, 200)}`);
    if (cause !== undefined) this.cause = cause;
  }
}

/** Typed timeout for tool execution (distinct from P3 intelligence timeout). */
export class ToolTimeoutError extends ToolSystemError {
  readonly code = "TOOL_TIMEOUT";
  constructor(toolName: string, timeoutMs: number) {
    super(`Tool "${toolName}" exceeded its ${timeoutMs}ms timeout`);
  }
}
