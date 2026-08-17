export const AI_DIAGNOSTIC_SOURCE = "AI_DIAGNOSTIC" as const;
export const AI_DIAGNOSTIC_SELECTION_VERSION = "3.0" as const;
export const AI_DIAGNOSTIC_ALLOWED_SIZES = [6, 8, 10, 12, 15] as const;
export const AI_DIAGNOSTIC_DEFAULT_SIZE = 10 as const;
export const AI_DIAGNOSTIC_MIN_USEFUL = 6 as const;
export const AI_DIAGNOSTIC_SESSION_MINUTES = 30 as const;
export const AI_DIAGNOSTIC_SESSION_STATE_VERSION = 1 as const;
export const AI_DIAGNOSTIC_MAX_RETRIES = 2 as const;
export const AI_DIAGNOSTIC_MODEL = "openai/gpt-oss-120b";
export const AI_DIAGNOSTIC_TEMPERATURE = 0.3;
export const AI_DIAGNOSTIC_MAX_TOKENS = 2400;
export const AI_DIAGNOSTIC_TIMEOUT_MS = 40_000;
export const AI_DIAGNOSTIC_ANSWER_RATE_LIMIT = {
  maxRequests: 10,
  windowSeconds: 10 * 60,
  identifier: "bca-diagnostic-ai-answer",
} as const;

export const DIAGNOSTIC_COVERAGE_SKILLS = [
  "READING",
  "GRAMMAR",
  "VOCABULARY",
  "LITERATURE",
  "WRITING",
] as const;

export const AI_DIAGNOSTIC_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type AiDiagnosticDifficulty = (typeof AI_DIAGNOSTIC_DIFFICULTIES)[number];

export function aiDiagnosticEnabled(): boolean {
  return Boolean(
    process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY
  );
}

export function aiDiagnosticDifficultyForIndex(index: number, size: number): AiDiagnosticDifficulty {
  const easyShare = Math.round(size * 0.3);
  const mediumShare = Math.round(size * 0.4);
  if (index < easyShare) return "EASY";
  if (index < easyShare + mediumShare) return "MEDIUM";
  return "HARD";
}

export function aiDiagnosticSkillQueue(size: number): string[] {
  const queue: string[] = [];
  let cursor = 0;
  while (queue.length < size) {
    const skill = DIAGNOSTIC_COVERAGE_SKILLS[cursor % DIAGNOSTIC_COVERAGE_SKILLS.length];
    queue.push(skill);
    cursor += 1;
  }
  return queue;
}

export function pickAiDiagnosticSubskill(skill: string, used: string[], all: Record<string, Record<string, string>>): string | null {
  const options = all[skill] ? Object.keys(all[skill]) : [];
  if (options.length === 0) return null;
  for (const option of options) {
    if (!used.includes(option)) return option;
  }
  return options[0];
}