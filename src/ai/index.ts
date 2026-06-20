/**
 * AI Agent Layer — Central Export
 *
 * Public API for the entire AI agent system.
 * Usage:
 *   import { getAgent, runAgent, listAgents } from "@/src/ai";
 *   const agent = getAgent("rpp");
 *   const result = await agent.run(input, context);
 */

export { registerAgent, getAgent, listAgents, isValidAgentId, getAgentsForUser, agentCount } from "./core/agent-registry";
export { runAgent } from "./core/agent-runner";
export { runAgentStream } from "./core/agent-stream-runner";
export type { StreamEvent } from "./core/agent-stream-runner";
export { buildPrompt } from "./core/prompt-builder";
export { callProvider, callWithFallback, estimateCost } from "./core/provider";
export { checkInput, checkOutput } from "./core/guardrails";
export { cleanJSONOutput, tryFixJSON } from "./core/output-validator";
export { logUsage, getUserUsage } from "./core/usage-logger";
export { getAgentRateLimit } from "./core/rate-limit";
export { checkEducationQuality } from "./evaluators/education-quality-checker";
export { checkCurriculumAlignment } from "./evaluators/curriculum-checker";
export { checkHallucination } from "./evaluators/hallucination-checker";
export { getBloomLevel, getVerbsForLevel, suggestBloomLevelForGrade } from "./tools/bloom-taxonomy";
export { getAllRules, searchRules, getRulesByCategory } from "./tools/indonesian-language-rules";
export { getPhaseForGrade, getBloomTargetForPhase } from "./tools/curriculum-map";

// Agent definitions (auto-register on import)
import "./agents/rpp-agent";
import "./agents/soal-agent";
import "./agents/ppt-agent";
import "./agents/bc-assistant-agent";
import "./agents/review-agent";
import "./agents/eyd-agent";
import "./agents/feedback-agent";
import "./agents/grading-agent";
import "./agents/text-analysis-agent";

export type {
  AgentId,
  AgentDefinition,
  AgentInput,
  AgentOutput,
  AgentRunContext,
  AgentRunResult,
  AgentCapability,
  AgentQualityCheck,
  AgentProviderConfig,
  AgentUsageLog,
} from "./core/agent-types";
