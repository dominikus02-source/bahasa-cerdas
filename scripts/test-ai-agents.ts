/**
 * AI Agent Layer — Test Script
 *
 * Usage:
 *   npx tsx scripts/test-ai-agents.ts
 *
 * Tests:
 *   1. Agent registry (list, get, count)
 *   2. Agent runner dry-run (validate + guardrails without calling provider)
 *   3. Full agent execution (requires API keys)
 *
 * Set SKIP_PROVIDER=1 to skip real AI calls (unit-test mode).
 */

import { getAgent, listAgents, isValidAgentId, agentCount } from "../src/ai/core/agent-registry";
import { runAgent } from "../src/ai/core/agent-runner";
import { callWithFallback } from "../src/ai/core/provider";
import { checkInput } from "../src/ai/core/guardrails";
import { cleanJSONOutput, tryFixJSON } from "../src/ai/core/output-validator";
import type { AgentRunContext } from "../src/ai/core/agent-types";

// Force agent imports to register them
import "../src/ai/agents/rpp-agent";
import "../src/ai/agents/soal-agent";
import "../src/ai/agents/ppt-agent";
import "../src/ai/agents/bc-assistant-agent";
import "../src/ai/agents/review-agent";

const SKIP_PROVIDER = process.env.SKIP_PROVIDER === "1";
let passed = 0;
let failed = 0;

async function main() {
function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Test 1: Agent Registry ──────────────────────────────────

console.log("\n📋 Test 1: Agent Registry");
console.log("─".repeat(50));

assert("agentCount() >= 5", agentCount() >= 5, `Found ${agentCount()}`);
assert("listAgents() returns array", Array.isArray(listAgents()));
assert("getAgent('rpp') exists", !!getAgent("rpp"));
assert("getAgent('soal') exists", !!getAgent("soal"));
assert("getAgent('ppt') exists", !!getAgent("ppt"));
assert("getAgent('bc-assistant') exists", !!getAgent("bc-assistant"));
assert("getAgent('review') exists", !!getAgent("review"));
assert("isValidAgentId('rpp') === true", isValidAgentId("rpp") === true);
assert("isValidAgentId('fake') === false", isValidAgentId("fake" as never) === false);
assert("getAgent('invalid') === undefined", getAgent("invalid" as never) === undefined);

// Check agent structure
const rppAgent = getAgent("rpp")!;
assert("RPP agent has id", !!rppAgent.id);
assert("RPP agent has name", !!rppAgent.name);
assert("RPP agent has systemPrompt", !!rppAgent.systemPrompt);
assert("RPP agent has inputSchema", !!rppAgent.inputSchema);
assert("RPP agent has outputSchema", !!rppAgent.outputSchema);
assert("RPP agent has qualityChecklist", Array.isArray(rppAgent.qualityChecklist));
assert("RPP agent has safetyRules", Array.isArray(rppAgent.safetyRules));
assert("RPP agent has examples", Array.isArray(rppAgent.examples));
assert("RPP agent has capabilities", Array.isArray(rppAgent.capabilities));

// ── Test 2: Guardrails ──────────────────────────────────────

console.log("\n🛡️  Test 2: Guardrails");
console.log("─".repeat(50));

const cleanResult = checkInput("Halo, selamat pagi!");
assert("Clean input passes", cleanResult.passed === true);
assert("Clean input has 0 warnings", cleanResult.warnings.length === 0);

const profaneResult = checkInput("Ini kontol banget");
assert("Profanity detected", profaneResult.passed === false);
assert("Profanity warnings present", profaneResult.warnings.length > 0);

const piiResult = checkInput("Email saya test@email.com dan HP 08123456789");
assert("PII warning for email", piiResult.warnings.some((w) => w.includes("email")));
assert("PII warning for phone", piiResult.warnings.some((w) => w.includes("phone")));

// ── Test 3: Output Validator ────────────────────────────────

console.log("\n🧹 Test 3: Output Validator");
console.log("─".repeat(50));

const cleanJson = cleanJSONOutput('{"test": "value"}');
assert("Clean JSON passes", cleanJson.cleaned === '{"test": "value"}');

const markdownJson = cleanJSONOutput('```json\n{"test": "value"}\n```');
assert("Markdown wrapping removed", markdownJson.cleaned === '{"test": "value"}');

const trailingComma = cleanJSONOutput('{"a": 1, "b": 2,}');
assert("Trailing comma removed", !trailingComma.cleaned.includes(",}"));

const fixed = tryFixJSON('{"a": 1, "b": 2,}');
assert("Auto-fix works", fixed.success === true);

// ── Test 4: Agent Runner Dry-Run (no provider) ─────────────

console.log("\n🏃 Test 4: Agent Runner (Dry Run)");
console.log("─".repeat(50));

if (SKIP_PROVIDER) {
  console.log("  ⏭️  SKIP_PROVIDER=1 — skipping full execution");
}

const context: AgentRunContext = {
  userId: "test-user-id",
  userRole: "guru",
  isPremium: true,
  requestId: "test-request",
  timestamp: new Date(),
  db: null,
};

// Test with bc-assistant
const assistantAgent = getAgent("bc-assistant")!;

if (!SKIP_PROVIDER) {
  try {
    const result = await runAgent({
      agent: assistantAgent,
      input: { message: "Halo, apa kabar?", mode: "murid" },
      context,
      outputFormat: "json",
    });
    assert("bc-assistant: success", result.success, result.error ?? "");
    assert("bc-assistant: has output", result.output !== null);
    assert("bc-assistant: has qualityScore", typeof result.qualityScore === "number");
    assert("bc-assistant: has text", typeof result.text === "string");
    assert("bc-assistant: has provider", typeof result.provider === "string");
    assert("bc-assistant: has latencyMs", typeof result.latencyMs === "number");
    assert("bc-assistant: has usage.totalTokens", result.usage.totalTokens > 0);
    console.log(`  💬 Reply: ${((result.output as any)?.reply ?? "").slice(0, 120)}...`);
    console.log(`  ⚡ ${result.provider}/${result.model} — ${result.latencyMs}ms — ${result.usage.totalTokens} tokens`);
  } catch (e) {
    assert("bc-assistant: execution", false, String(e));
  }
} else {
  console.log("  ⏭️  Skipped (SKIP_PROVIDER=1)");
}

// Test with review agent
if (!SKIP_PROVIDER) {
  const reviewAgent = getAgent("review")!;
  try {
    const result = await runAgent({
      agent: reviewAgent,
      input: {
        content: "Siswa menulis puisi tentang hujan dengan diksi yang indah namun rima belum konsisten. Struktur 3 bait, 4 baris per bait.",
        contentType: "artikel",
        title: "Puisi Hujan",
        grade: "10",
      },
      context,
      outputFormat: "json",
    });
    assert("review: success", result.success, result.error ?? "");
    assert("review: has score", typeof (result.output as any)?.score === "number");
    assert("review: has strengths", Array.isArray((result.output as any)?.strengths));
    assert("review: has issues", Array.isArray((result.output as any)?.issues));
    assert("review: has recommendations", Array.isArray((result.output as any)?.recommendations));
    assert("review: has readyToUse", typeof (result.output as any)?.readyToUse === "boolean");
    console.log(`  💬 Score: ${(result.output as any)?.score}/100 — Ready: ${(result.output as any)?.readyToUse}`);
  } catch (e) {
    assert("review: execution", false, String(e));
  }
} else {
  console.log("  ⏭️  Review skipped (SKIP_PROVIDER=1)");
}

// ── Test 5: Provider Fallback (short timeout) ──────────────

console.log("\n🔁 Test 5: Provider Health Check");
console.log("─".repeat(50));

if (!SKIP_PROVIDER) {
  try {
    const result = await callWithFallback({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Katakan 'OK' saja" }],
      temperature: 0,
      maxTokens: 10,
      timeoutMs: 5000,
    });
    assert("Provider fallback works", result.content.length > 0);
    console.log(`  ⚡ ${result.provider}/${result.model} — ${result.latencyMs}ms`);
  } catch (e) {
    assert("Provider fallback works", false, String(e));
  }
} else {
  console.log("  ⏭️  Skipped (SKIP_PROVIDER=1)");
}

// ── Summary ─────────────────────────────────────────────────

  console.log("\n" + "=".repeat(50));
  const total = passed + failed;
  console.log(`📊 Results: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ""}`);
  console.log("=".repeat(50));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
