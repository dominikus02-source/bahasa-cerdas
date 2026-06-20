import { z } from "zod";

export const RPPInputSchema = z.object({
  subject: z.string().min(1, "Mata pelajaran wajib diisi"),
  grade: z.string().min(1, "Kelas wajib diisi"),
  phase: z.string().optional(),
  semester: z.string().optional(),
  curriculum: z.enum(["Kurikulum Merdeka", "K13", "Custom"]).default("Kurikulum Merdeka"),
  topic: z.string().min(1, "Topik wajib diisi"),
  subtopic: z.string().optional(),
  duration: z.string().default("2 JP x 45 menit"),
  meetingCount: z.number().min(1).max(20).default(1),
  studentProfile: z.string().optional(),
  learningObjectives: z.array(z.string()).min(1, "Setidaknya satu tujuan pembelajaran diperlukan"),
  priorKnowledge: z.string().optional(),
  learningModel: z.string().optional(),
  assessmentTypes: z.array(z.enum(["diagnostik", "formatif", "sumatif"])).optional(),
  differentiationNeeds: z.array(z.string()).optional(),
  languageStyle: z.enum(["formal", "praktis", "ringkas", "lengkap"]).default("formal"),
  includeWorksheet: z.boolean().default(false),
  includeRubric: z.boolean().default(false),
  includeRemedialEnrichment: z.boolean().default(false),
});

export const RPPIdentitySchema = z.object({
  subject: z.string(),
  grade: z.string(),
  phase: z.string().optional(),
  semester: z.string().optional(),
  curriculum: z.string(),
  topic: z.string(),
  duration: z.string(),
  meetingCount: z.number().optional(),
});

export const RPPCriteriaSchema = z.object({
  name: z.string(),
  excellent: z.string(),
  good: z.string(),
  needsImprovement: z.string(),
});

export const RPPRubricSchema = z.object({
  criteria: z.array(RPPCriteriaSchema),
});

export const RPPWorksheetSchema = z.object({
  title: z.string(),
  instructions: z.array(z.string()),
  activities: z.array(z.string()),
});

export const RPPLearningStepsSchema = z.object({
  opening: z.array(z.string()),
  core: z.array(z.string()),
  closing: z.array(z.string()),
});

export const RPPAssessmentPlanSchema = z.object({
  diagnostic: z.array(z.string()),
  formative: z.array(z.string()),
  summative: z.array(z.string()),
});

export const RPPDifferentiationSchema = z.object({
  content: z.array(z.string()),
  process: z.array(z.string()),
  product: z.array(z.string()),
});

export const RPPReflectionSchema = z.object({
  teacherReflection: z.array(z.string()),
  studentReflection: z.array(z.string()),
});

export const RPPRemedialEnrichmentSchema = z.object({
  remedial: z.array(z.string()),
  enrichment: z.array(z.string()),
});

export const RPPOutputSchema = z.object({
  title: z.string(),
  identity: RPPIdentitySchema,
  studentProfile: z.string(),
  priorKnowledge: z.string(),
  learningObjectives: z.array(z.string()),
  successCriteria: z.array(z.string()),
  learningMaterials: z.array(z.string()),
  learningResources: z.array(z.string()),
  learningModel: z.string(),
  learningSteps: RPPLearningStepsSchema,
  assessmentPlan: RPPAssessmentPlanSchema,
  differentiationStrategy: RPPDifferentiationSchema,
  worksheetSuggestion: RPPWorksheetSchema.optional(),
  rubric: RPPRubricSchema.optional(),
  remedialAndEnrichment: RPPRemedialEnrichmentSchema.optional(),
  reflection: RPPReflectionSchema,
  teacherNotes: z.array(z.string()),
  editableText: z.string().min(1),
});
