export type AiQuestionType = "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";

export type AiCognitiveTarget =
  | "MENGINGAT"
  | "MEMAHAMI"
  | "MENERAPKAN"
  | "MENGANALISIS"
  | "MENGEVALUASI"
  | "MENCIPTAKAN";

export interface AiDiagnosticItem {
  id: string;
  text: string;
  options: string[];
  questionType: AiQuestionType;
  skill: string;
  subskill: string | null;
  difficulty: string;
  topic: string | null;
  cognitiveTarget: AiCognitiveTarget | null;
  correctAnswer: string;
  explanation: string;
  misconceptionMap: Record<string, string>;
  evidenceTarget: { skill: string; confidence: "LOW" | "MEDIUM" | "HIGH" };
  diagnosticRationale: string;
}

export interface AiDiagnosticQuestionPublic {
  id: string;
  text: string;
  options: string[];
  questionType: AiQuestionType;
  skill: string;
  subskill: string | null;
  difficulty: string;
  topic: string | null;
}

export interface AiNextPlan {
  skill: string;
  subskill: string | null;
  difficulty: string;
  topic: string | null;
}

export interface AiAnswerOutcome {
  ok: boolean;
  correct: boolean;
  nextQuestion: AiDiagnosticQuestionPublic | null;
  remaining: number;
  done: boolean;
  reasonCode: "ANSWERED" | "GENERATION_UNAVAILABLE" | "TARGET_REACHED";
}

export interface AiSessionState {
  v: number;
  mode: "AI-ADAPTIVE";
  targetSize: number;
  order: string[];
  items: Record<string, AiDiagnosticItem>;
  usedTopics: string[];
  usedSubskills: string[];
  genFailed: boolean;
}

export function isAiSessionState(value: unknown): value is AiSessionState {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.v === 1 &&
    record.mode === "AI-ADAPTIVE" &&
    typeof record.targetSize === "number" &&
    Array.isArray(record.order) &&
    typeof record.items === "object" &&
    record.items !== null &&
    Array.isArray(record.usedTopics) &&
    Array.isArray(record.usedSubskills) &&
    typeof record.genFailed === "boolean"
  );
}

export function toPublicQuestion(item: AiDiagnosticItem): AiDiagnosticQuestionPublic {
  return {
    id: item.id,
    text: item.text,
    options: item.options,
    questionType: item.questionType,
    skill: item.skill,
    subskill: item.subskill,
    difficulty: item.difficulty,
    topic: item.topic,
  };
}