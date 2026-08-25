/**
 * AI Mentor Agent — Contextual learning mentor for MURID_PREMIUM.
 *
 * Provides personalized explanations based on student's learning evidence.
 * NOT a chatbot — single contextual explanation per request.
 */

import { z } from "zod";
import { registerAgent } from "@/src/ai/core/agent-registry";
import { callWithFallback } from "@/src/ai/core/provider";
import {
  buildMentorSystemPrompt,
  buildMentorUserPrompt,
  buildDeterministicFallback,
  type MentorContext,
} from "@/lib/ai-gateway/mentor-context";
import type {
  AgentDefinition,
  AgentRunContext,
  AgentRunResult,
} from "@/src/ai/core/agent-types";

// Input schema — minimal, no client context allowed
const MentorInputSchema = z.object({
  action: z.literal("explain").optional(),
});

// Output schema — structured response
const MentorOutputSchema = z.object({
  headline: z.string(),
  diagnosis: z.string(),
  reason: z.string(),
  action: z.string(),
  encouragement: z.string(),
});

type MentorInput = z.infer<typeof MentorInputSchema>;
type MentorOutput = z.infer<typeof MentorOutputSchema>;

/**
 * AI Mentor Agent Definition.
 */
const mentorAgent: AgentDefinition<MentorInput, MentorOutput> = {
  id: "mentor",
  name: "Mentor Bahasa Cerdas",
  description: "Mentor belajar Bahasa Indonesia berbasis data siswa",
  role: "Mentor pribadi yang membantu siswa memahami kondisi belajar mereka",
  targetUser: "murid",
  capabilities: [
    {
      id: "contextual-explanation",
      label: "Penjelasan Personal",
      description: "Memberikan penjelasan berdasarkan data belajar siswa",
    },
  ],
  limitations: [
    "Hanya memberikan satu penjelasan per request",
    "Tidak bisa menjawab pertanyaan umum di luar konteks belajar",
    "Tidak bisa mengubah data belajar",
    "Tidak bisa memberikan diagnosis medis/psikologis",
  ],
  systemPrompt: "", // Will be built dynamically with context
  inputSchema: MentorInputSchema,
  outputSchema: MentorOutputSchema,
  defaultModel: "openai/gpt-oss-120b",
  temperature: 0.7,
  maxTokens: 500,
  workflowSteps: [
    {
      id: "build-context",
      name: "Build Context",
      description: "Build context from student's learning data",
      order: 1,
    },
    {
      id: "generate-explanation",
      name: "Generate Explanation",
      description: "Generate personalized explanation",
      order: 2,
    },
  ],
  qualityChecklist: [
    {
      id: "grounded-in-data",
      label: "Data-grounded",
      description: "Response must be grounded in provided context",
      severity: "error",
    },
    {
      id: "appropriate-length",
      label: "Appropriate length",
      description: "Response should be concise (180-220 words max)",
      severity: "warning",
    },
  ],
  safetyRules: [
    {
      id: "no-fabrication",
      rule: "Jangan mengarang data atau statistik",
      category: "pedagogy",
    },
    {
      id: "no-diagnosis",
      rule: "Jangan membuat diagnosis medis/psikologis",
      category: "pedagogy",
    },
    {
      id: "privacy",
      rule: "Jangan meminta data pribadi atau password",
      category: "privacy",
    },
  ],
  examples: [
    {
      name: "Weak skill detected",
      input: { action: "explain" },
      output: {
        headline: "Fokuskan dulu pada Tata Bahasa",
        diagnosis:
          "Jawabanmu menunjukkan bahwa pola kalimat masih menjadi bagian yang paling sering keliru.",
        reason:
          "Kamu sudah cukup kuat dalam memahami isi bacaan, tetapi ketelitian menyusun kalimat masih perlu diperkuat.",
        action: "Coba latihan Tata Bahasa dan perhatikan hubungan subjek, predikat, objek, dan keterangan.",
        encouragement: "Sedikit latihan terarah bisa membuatnya jauh lebih kuat!",
      },
      description: "Example when student has weak grammar skill",
    },
  ],

  async run(input: MentorInput, context: AgentRunContext): Promise<AgentRunResult> {
    // Context will be injected by the API route
    // This is called by the agent runner, but we need context from the route
    // For now, return a placeholder — actual implementation is in the API route
    return {
      success: true,
      agentId: "mentor",
      output: null,
      text: null,
      error: null,
      warnings: [],
      qualityScore: 100,
      qualityChecks: [],
      provider: "none",
      model: "none",
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        provider: "none",
        model: "none",
        durationMs: 0,
      },
      latencyMs: 0,
      metadata: {
        requestId: context.requestId,
        timestamp: context.timestamp,
        userId: context.userId,
      },
    };
  },
};

// Register the agent
registerAgent(mentorAgent);

export { mentorAgent };
