import type { AiAgentId, CostPolicyResult, CreditWeight } from "./gateway-types";

const KNOWN_AGENTS: Record<string, true> = {
  rpp: true,
  soal: true,
  review: true, "bc-assistant": true,
  eyd: true,
  feedback: true,
  grading: true, "text-analysis": true,
  rubric: true, "akm-literacy": true, "curriculum-align": true,
  mentor: true,
};

function getTextLength(input: Record<string, unknown>): number {
  const str = JSON.stringify(input);
  return str?.length ?? 0;
}

function getQuestionCount(input: Record<string, unknown>): number {
  const raw = input.questionCount ?? input.question_count ?? input["question-count"] ?? 0;
  return typeof raw === "number" ? raw : parseInt(String(raw), 10) || 0;
}

export function calculateAgentCost(
  agentId: string,
  input: Record<string, unknown> = {}
): CostPolicyResult {
  if (!KNOWN_AGENTS[agentId]) {
    return { credits: 2, weight: "medium", reason: "Unknown agent — default cost" };
  }

  switch (agentId as AiAgentId) {
    case "eyd":
      return { credits: 1, weight: "light", reason: "EYD correction — short, cheap" };

    case "bc-assistant":
      return { credits: 1, weight: "light", reason: "Chat assistant — typically short" };

    case "feedback":
      return { credits: 2, weight: "medium", reason: "Student feedback — medium cost" };

    case "grading":
      return { credits: 2, weight: "medium", reason: "Auto grading — medium cost" };

    case "review":
      return { credits: 2, weight: "medium", reason: "Material review — medium cost" };

    case "text-analysis": {
      const len = getTextLength(input);
      if (len > 5000) {
        return { credits: 4, weight: "medium", reason: "Text analysis — long input, 4 credits" };
      }
      return { credits: 2, weight: "medium", reason: "Text analysis — short input, 2 credits" };
    }

    case "soal": {
      const qCount = getQuestionCount(input);
      if (qCount > 10) {
        return { credits: 5, weight: "heavy", reason: `Soal generation — ${qCount} questions, 5 credits` };
      }
      return { credits: 3, weight: "medium", reason: `Soal generation — ${qCount} questions, 3 credits` };
    }

    case "rpp":
      return { credits: 5, weight: "heavy", reason: "RPP generation — long structured output, 5 credits" };

    case "mentor":
      return { credits: 1, weight: "light", reason: "Mentor explanation — short, cheap" };

    default:
      return { credits: 2, weight: "medium", reason: "Default cost for unlisted agent" };
  }
}

export function getExportCost(format: "docx" | "pdf"): CostPolicyResult {
  switch (format) {
    case "docx":
      return { credits: 0, weight: "light", reason: "DOCX export — free" };
    case "pdf":
      return { credits: 0, weight: "light", reason: "PDF export — free" };
  }
}
