import {
  CEFR_LEVELS,
  CONFIDENCE,
  DIFFICULTIES,
  hasSkill,
  hasSubskill,
  METADATA_SOURCES,
  METADATA_STATUSES,
  METADATA_VERSION,
  PROVENANCE,
  QUESTION_TYPES,
  TAXONOMY_VERSION,
  type CefrLevel,
  type DifficultyId,
  type MetadataConfidence,
  type MetadataProvenance,
  type MetadataSource,
  type MetadataStatus,
  type QuestionTypeId,
  type SkillId,
} from "./taxonomy";

export interface QuestionMetadataInput {
  source: string;
  questionId: string;
  skill?: string | null;
  subskill?: string | null;
  difficulty?: string | null;
  level?: number | null;
  topic?: string | null;
  questionType: string;
  cefr?: string | null;
  provenance: string;
  confidence: string;
  status?: string;
  taxonomyVersion?: string;
  metadataVersion?: string;
}

export interface ValidatedQuestionMetadata extends Omit<QuestionMetadataInput, "source" | "skill" | "subskill" | "difficulty" | "questionType" | "cefr" | "provenance" | "confidence" | "status"> {
  source: MetadataSource;
  skill: SkillId | null;
  subskill: string | null;
  difficulty: DifficultyId | null;
  questionType: QuestionTypeId;
  cefr: CefrLevel | null;
  provenance: MetadataProvenance;
  confidence: MetadataConfidence;
  status: MetadataStatus;
  taxonomyVersion: string;
  metadataVersion: string;
}

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  value?: ValidatedQuestionMetadata;
}

export function validateQuestionMetadata(input: QuestionMetadataInput): MetadataValidationResult {
  const errors: string[] = [];
  const source = input.source as MetadataSource;
  const skill = input.skill || null;
  const subskill = input.subskill || null;
  const difficulty = input.difficulty || null;
  const cefr = input.cefr || null;
  const provenance = input.provenance as MetadataProvenance;
  const confidence = input.confidence as MetadataConfidence;
  const status = (input.status || "DRAFT") as MetadataStatus;
  const questionType = input.questionType as QuestionTypeId;
  const taxonomyVersion = input.taxonomyVersion || TAXONOMY_VERSION;
  const metadataVersion = input.metadataVersion || METADATA_VERSION;

  if (!METADATA_SOURCES.includes(source)) errors.push("source tidak didukung atau termasuk UKBI/TKA");
  if (!input.questionId || input.questionId.length > 200) errors.push("questionId wajib dan maksimal 200 karakter");
  if (skill !== null && !hasSkill(skill)) errors.push("skill tidak valid");
  if (subskill !== null && (!skill || !hasSkill(skill) || !hasSubskill(skill, subskill))) {
    errors.push("subskill tidak valid untuk parent skill");
  }
  if (difficulty !== null && !DIFFICULTIES.includes(difficulty as DifficultyId)) errors.push("difficulty tidak valid");
  if (input.level !== null && input.level !== undefined) {
    if (!Number.isInteger(input.level) || input.level < 1 || input.level > 12) errors.push("level harus integer 1..12");
    if (source !== "JALUR_CERDAS") errors.push("level Jalur hanya boleh diisi untuk JALUR_CERDAS");
  }
  if (input.topic !== null && input.topic !== undefined && (!input.topic.trim() || input.topic.length > 120)) {
    errors.push("topic kosong atau terlalu panjang");
  }
  if (!QUESTION_TYPES.includes(questionType)) errors.push("questionType tidak valid");
  if (cefr !== null && !CEFR_LEVELS.includes(cefr as CefrLevel)) errors.push("CEFR tidak valid");
  if (!PROVENANCE.includes(provenance)) errors.push("provenance tidak valid");
  if (!CONFIDENCE.includes(confidence)) errors.push("confidence tidak valid");
  if (!METADATA_STATUSES.includes(status)) errors.push("status tidak valid");
  if (taxonomyVersion !== TAXONOMY_VERSION) errors.push("taxonomyVersion tidak didukung");
  if (metadataVersion !== METADATA_VERSION) errors.push("metadataVersion tidak didukung");
  if (status === "APPROVED" && provenance !== "HUMAN_REVIEW" && provenance !== "EMPIRICAL") {
    errors.push("metadata APPROVED harus memiliki provenance HUMAN_REVIEW atau EMPIRICAL");
  }
  if (provenance === "AI_ASSISTED" && status === "APPROVED") {
    errors.push("AI_ASSISTED tidak boleh auto-publish sebagai APPROVED");
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    value: {
      source,
      questionId: input.questionId,
      skill: skill as SkillId | null,
      subskill,
      difficulty: difficulty as DifficultyId | null,
      level: input.level ?? null,
      topic: input.topic?.trim() || null,
      questionType,
      cefr: cefr as CefrLevel | null,
      provenance,
      confidence,
      status,
      taxonomyVersion,
      metadataVersion,
    },
  };
}

export function validateQuestionMetadataBatch(inputs: QuestionMetadataInput[]): MetadataValidationResult {
  const errors: string[] = [];
  for (const [index, input] of inputs.entries()) {
    const result = validateQuestionMetadata(input);
    if (!result.valid) errors.push(`items[${index}]: ${result.errors.join(", ")}`);
  }
  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors };
}
