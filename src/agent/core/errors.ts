/**
 * BC Agent Core — typed domain errors.
 *
 * Machine-readable: callers branch on instanceof / `code`, never on message
 * strings. Deterministic: same input → same error type + code.
 */

/** All BC Agent domain errors extend this; `code` is the stable identifier. */
export abstract class AgentError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidTaskTransitionError extends AgentError {
  readonly code = "INVALID_TASK_TRANSITION";
  constructor(
    public readonly from: string,
    public readonly event: string,
    public readonly taskId?: string
  ) {
    super(
      `Invalid task transition: event "${event}" is not legal from status "${from}"` +
        (taskId ? ` (task ${taskId})` : "")
    );
  }
}

export class PolicyDeniedError extends AgentError {
  readonly code = "POLICY_DENIED";
  constructor(
    public readonly toolName: string,
    public readonly reason: string
  ) {
    super(`Policy denied tool "${toolName}": ${reason}`);
  }
}

export class ApprovalRequiredError extends AgentError {
  readonly code = "APPROVAL_REQUIRED";
  constructor(
    public readonly toolName: string,
    public readonly risk: string
  ) {
    super(`Approval required for tool "${toolName}" (risk ${risk})`);
  }
}

export class ApprovalInvalidError extends AgentError {
  readonly code = "APPROVAL_INVALID";
  constructor(
    public readonly reason: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`Invalid approval: ${reason}`);
  }
}

export class ApprovalExpiredError extends AgentError {
  readonly code = "APPROVAL_EXPIRED";
  constructor(
    public readonly approvalId: string,
    public readonly expiredAt: string
  ) {
    super(`Approval ${approvalId} expired at ${expiredAt}`);
  }
}

export class ApprovalConsumedError extends AgentError {
  readonly code = "APPROVAL_CONSUMED";
  constructor(
    public readonly approvalId: string,
    public readonly usedAt: string
  ) {
    super(`Approval ${approvalId} already consumed at ${usedAt}`);
  }
}

export class ApprovalMismatchError extends AgentError {
  readonly code = "APPROVAL_MISMATCH";
  constructor(
    public readonly field: "taskId" | "attemptId" | "toolName" | "inputHash",
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(`Approval mismatch on ${field}: expected "${expected}", got "${actual}"`);
  }
}

export class InvalidToolDefinitionError extends AgentError {
  readonly code = "INVALID_TOOL_DEFINITION";
  constructor(
    public readonly toolName: string,
    public readonly reason: string
  ) {
    super(`Invalid tool definition "${toolName}": ${reason}`);
  }
}

export class InvalidTaskError extends AgentError {
  readonly code = "INVALID_TASK";
  constructor(public readonly reason: string, public readonly details?: Record<string, unknown>) {
    super(`Invalid task: ${reason}`);
  }
}

export class InvalidAttemptError extends AgentError {
  readonly code = "INVALID_ATTEMPT";
  constructor(public readonly reason: string) {
    super(`Invalid attempt: ${reason}`);
  }
}
