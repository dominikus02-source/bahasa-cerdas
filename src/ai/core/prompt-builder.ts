/**
 * Prompt builder — assembles structured prompts from templates + dynamic data.
 * All agents use this to build their final prompt before sending to the provider.
 *
 * Phase 3F: Enhanced with output schema summary, quality checklist,
 * forbidden behaviors, and strict JSON-only instruction.
 */

import type { AgentDefinition, AgentInput, AgentRunContext } from "./agent-types";

export interface PromptBuildOptions {
  systemPrompt: string;
  userInput: AgentInput;
  context: AgentRunContext;
  agent: AgentDefinition<any, any>;
  examples?: { name: string; input: Record<string, unknown>; output: Record<string, unknown> }[];
  outputFormat?: "json" | "text";
  isRetry?: boolean;
  retryMessage?: string;
}

export interface BuiltPrompt {
  system: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  rawPrompt: string;
}

/**
 * Build a fully assembled prompt for an agent.
 *
 * Steps:
 * 1. Inject context into system prompt (user role, premium status, etc.)
 * 2. Serialize user input
 * 3. Append examples if provided
 * 4. Append output JSON schema summary (from agent.outputSchema descriptions)
 * 5. Append quality checklist
 * 6. Append forbidden behaviors
 * 7. Append strict JSON output instruction
 */
export function buildPrompt(opts: PromptBuildOptions): BuiltPrompt {
  const contextBlock = [
    `## Run Context`,
    `- User Role: ${opts.context.userRole}`,
    `- Plan: ${opts.context.isPremium ? "Premium" : "Free"}`,
    `- Timestamp: ${opts.context.timestamp.toISOString()}`,
  ].join("\n");

  const systemWithContext = `${opts.systemPrompt}\n\n${contextBlock}`;

  const parts: string[] = [];

  parts.push(`## Task\n${opts.agent.description}`);
  parts.push(`\n## Input\n${JSON.stringify(opts.userInput, null, 2)}`);

  if (opts.examples && opts.examples.length > 0) {
    parts.push(`\n## Examples`);
    for (const ex of opts.examples) {
      parts.push(`\n### ${ex.name}`);
      parts.push(`Input:\n${JSON.stringify(ex.input, null, 2)}`);
      parts.push(`Output:\n${JSON.stringify(ex.output, null, 2)}`);
    }
  }

  if (opts.outputFormat === "json") {
    // Add output schema summary — describe fields from quality checklist
    parts.push(`\n## Required Output Fields`);
    parts.push(`Produksi JSON dengan field-field berikut:`);
    parts.push(`- success: boolean — true jika berhasil`);
    parts.push(`- error: string | null — null jika berhasil`);
    for (const check of opts.agent.qualityChecklist) {
      parts.push(`- "${check.id}": ${check.description}`);
    }

    // Add quality checklist
    parts.push(`\n## Quality Checklist`);
    parts.push(`Pastikan output memenuhi berikut:`);
    for (const check of opts.agent.qualityChecklist) {
      parts.push(`- [${check.severity === "error" ? "WAJIB" : "SEBAIKNYA"}] ${check.description}`);
    }

    // Add forbidden behaviors
    parts.push(`\n## Forbidden`);
    for (const rule of opts.agent.safetyRules) {
      parts.push(`- ${rule.rule}`);
    }
    parts.push("- Jangan gunakan markdown fences (```json).");
    parts.push(`- Jangan tambahkan teks penjelasan di luar JSON.`);
    parts.push(`- Jangan gunakan nama sekolah atau guru palsu.`);
    parts.push(`- Jangan gunakan teks berhak cipta panjang.`);

    // Final instruction
    parts.push(`\n## Output Format`);
    parts.push(`Return valid JSON only. No markdown fences. No explanations outside the JSON object.`);
  }

  // If retry, append correction message
  if (opts.isRetry && opts.retryMessage) {
    parts.push(`\n## Correction Required`);
    parts.push(opts.retryMessage);
  }

  const rawPrompt = parts.join("\n");

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemWithContext },
    { role: "user", content: rawPrompt },
  ];

  return {
    system: systemWithContext,
    messages,
    rawPrompt,
  };
}
