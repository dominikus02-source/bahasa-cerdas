/**
 * BC Agent P3 — intelligence public surface.
 *
 * The Agent Core (and everything above it) imports ONLY from here:
 *
 *   IntelligenceProvider  ← the port (types.ts)
 *   BcAiIntelligenceAdapter ← production implementation over existing BC AI
 *   IntelligenceError / categories ← normalized failure contract
 *   waiting.ts helpers ← WAITING_INTELLIGENCE mapping over the P2 engine
 *
 * No provider SDK, model name, or key handling is exported. Model selection
 * lives in BC AI configuration (AI_FAST_MODEL / AI_DEFAULT_MODEL /
 * AI_PROVIDER_PRIORITY), exactly as the P0 blueprint prescribes.
 */

// Contract
export type {
  IntelligenceProvider,
  IntelligenceRequest,
  IntelligenceResult,
  IntelligenceUsage,
  IntelligenceLogEntry,
  UntrustedContent,
  MemorySnippet,
} from "./types";
export {
  INTELLIGENCE_DEFAULT_TIMEOUT_MS,
  INTELLIGENCE_DEFAULT_MAX_TOKENS,
  INTELLIGENCE_DEFAULT_TEMPERATURE,
  INTELLIGENCE_MAX_PROMPT_CHARS,
  INTELLIGENCE_MAX_RESPONSE_CHARS,
  INTELLIGENCE_DEFAULT_PROVIDER_RETRIES,
  INTELLIGENCE_RETRY_BACKOFF_MS,
  INTELLIGENCE_CORRECTION_MAX_CHARS,
} from "./types";

// Typed errors
export {
  IntelligenceError,
  InvalidIntelligenceRequestError,
  INTELLIGENCE_ERROR_CATEGORIES,
  RECOVERABLE_CATEGORIES,
  categoryForHttpStatus,
  isRecoverableIntelligenceError,
  isTimeoutLikeMessage,
} from "./errors";
export type { IntelligenceErrorCategory } from "./errors";

// Trust-boundary prompt assembly
export { assemblePrompt } from "./prompt";
export type { AssembledPrompt } from "./prompt";

// Structured output (bounded)
export { parseStructured, correctionAddendum } from "./structured";

// Single overall timeout boundary
export { withOverallTimeout, sleep, OverallTimeoutError } from "./timeout";

// Production adapter over existing BC AI
export { BcAiIntelligenceAdapter } from "./bc-ai-adapter";
export type { BcAiAdapterOptions, BcAiCall } from "./bc-ai-adapter";

// WAITING_INTELLIGENCE mapping (durably, over the P2 engine)
export {
  classifyIntelligenceFailure,
  handleIntelligenceFailure,
  resumeIntelligenceWait,
} from "./waiting";
export type { IntelligenceFailureDisposition, IntelligenceFailureOutcome } from "./waiting";
