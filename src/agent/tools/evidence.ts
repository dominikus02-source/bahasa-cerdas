/**
 * BC Agent P4 — evidence factory (§8/§9 evidence boundary).
 *
 * Evidence kinds and their strict semantics:
 *
 *   FACT            directly supported by validated TOOL output; always
 *                   carries executionId provenance; claim is operational,
 *                   never quoted content.
 *   OBSERVATION     agent-noted detail without a tool behind it.
 *   INFERENCE       AI interpretation — NEVER silently upgraded to FACT.
 *   RECOMMENDATION  proposed action, no truth claim.
 *   UNKNOWN         explicitly unknown (an honest gap, not a guess).
 *
 * The DB CHECK constraint (ToolEvidence_fact_provenance_check) enforces the
 * same boundary at rest: FACT requires executionId and a non-agent source;
 * non-FACT must not carry executionId.
 */

import type { ToolDefinition } from "../core/tool";
import type { AnyToolOutput, EvidenceConfidence, EvidenceKind, EvidenceRecord } from "./types";

const CLAIM_MAX_CHARS = 500;
const AGENT_SOURCES = new Set(["agent", "founder"]);

export interface EvidenceSeed {
  readonly evidenceId: string;
  readonly taskId: string;
  readonly attemptId: string;
  readonly executionId?: string;
  readonly createdAt: string;
}

/**
 * Construct an evidence record, enforcing the kind/provenance boundary
 * deterministically. Non-FACT kinds have executionId stripped; FACT with an
 * agent/founder source is downgraded to OBSERVATION (never forged
 * provenance). Throws only on programming errors (missing ids).
 */
export function makeEvidence(input: {
  kind: EvidenceKind;
  claim: string;
  source: string;
  confidence?: EvidenceConfidence;
  executionId?: string | null;
  metadata?: Record<string, unknown>;
} & EvidenceSeed): EvidenceRecord {
  if (!input.evidenceId) throw new Error("evidenceId is required");
  if (!input.taskId || !input.attemptId) throw new Error("taskId/attemptId are required");

  let kind = input.kind;
  let executionId = input.executionId ?? null;
  let source = input.source;

  if (kind === "FACT") {
    if (!executionId || AGENT_SOURCES.has(source)) {
      // A "FACT" without tool provenance is not a fact — downgrade, never fake.
      kind = "OBSERVATION";
      executionId = null;
      source = "agent";
    }
  } else {
    // Non-FACT kinds never carry tool provenance.
    executionId = null;
  }

  return {
    evidenceId: input.evidenceId,
    taskId: input.taskId,
    attemptId: input.attemptId,
    executionId,
    kind,
    claim: input.claim.slice(0, CLAIM_MAX_CHARS),
    source,
    confidence: input.confidence ?? "HIGH",
    createdAt: input.createdAt,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

/**
 * FACT from a validated tool output — the ONLY path that produces tool-
 * supported facts. The claim is derived from the tool's identity and the
 * bounded output envelope, never from raw content and never from AI
 * interpretation.
 */
export function factFromToolOutput(
  tool: ToolDefinition,
  output: AnyToolOutput,
  seed: EvidenceSeed & { executionId: string }
): EvidenceRecord {
  const claim =
    `${tool.name} succeeded: ${output.items} item(s), ${output.bytes} bytes` +
    `${output.truncated ? " (truncated)" : ""} from ${output.source}`;
  return makeEvidence({
    ...seed,
    kind: "FACT",
    claim,
    source: tool.name,
    confidence: "HIGH",
    executionId: seed.executionId,
    metadata: { bytes: output.bytes, items: output.items, truncated: output.truncated },
  });
}

/** Convenience constructors for the non-tool kinds (used by the agent loop). */
export function inference(claim: string, seed: EvidenceSeed, confidence: EvidenceConfidence = "MEDIUM"): EvidenceRecord {
  return makeEvidence({ ...seed, kind: "INFERENCE", claim, source: "agent", confidence });
}

export function recommendation(claim: string, seed: EvidenceSeed): EvidenceRecord {
  return makeEvidence({ ...seed, kind: "RECOMMENDATION", claim, source: "agent" });
}

export function unknownEvidence(claim: string, seed: EvidenceSeed): EvidenceRecord {
  return makeEvidence({ ...seed, kind: "UNKNOWN", claim, source: "agent", confidence: "LOW" });
}
