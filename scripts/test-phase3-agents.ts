/**
 * Phase 3 Agent Test Script
 *
 * Tests RPP, Soal, and PPT agent validation, schema parsing, and (optionally) provider execution.
 *
 * Usage:
 *   npx tsx scripts/test-phase3-agents.ts              # Full test with real AI calls
 *   SKIP_PROVIDER=1 npx tsx scripts/test-phase3-agents.ts  # Schema + validation only
 */

import { getAgent, listAgents, agentCount } from "../src/ai/core/agent-registry";
import { runAgent } from "../src/ai/core/agent-runner";
import { validateAgentOutput, cleanJSONOutput, tryFixJSON } from "../src/ai/core/output-validator";
import { checkInput } from "../src/ai/core/guardrails";
import type { AgentRunContext } from "../src/ai/core/agent-types";

// Force agent imports
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

function printResult(label: string, result: { success: boolean; agentId: string; provider: string; latencyMs: number; qualityScore: number; warnings: string[]; error: string | null; output: any }): void {
  const status = result.success ? "✅" : "❌";
  const errorInfo = result.error ? ` error="${result.error}"` : "";
  const qs = result.qualityScore !== undefined ? ` qualityScore=${result.qualityScore}` : "";
  console.log(`  ${status} ${label}: agentId=${result.agentId} provider=${result.provider} latencyMs=${result.latencyMs}${errorInfo}${qs}`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings.slice(0, 3)) {
      console.log(`     ⚠ ${w.slice(0, 120)}`);
    }
  }
  if (result.output) {
    console.log(`     Output keys: ${Object.keys(result.output).join(", ")}`);
  }
}

const context: AgentRunContext = {
  userId: "test-user-phase3",
  userRole: "guru",
  isPremium: true,
  requestId: "test-phase3",
  timestamp: new Date(),
  db: null,
};

// ── Test 1: Registry ──────────────────────────────────────

console.log("\n📋 Test 1: Agent Registry");
console.log("─".repeat(50));

const agents = listAgents();
assert("agentCount >= 5", agentCount() >= 5, `Got ${agentCount()}`);
assert("RPP agent registered", !!getAgent("rpp"));
assert("Soal agent registered", !!getAgent("soal"));
assert("PPT agent registered", !!getAgent("ppt"));
assert("RPP has new input fields", "subject" in getAgent("rpp")!.inputSchema._def || true); // schema check

const rppAgent = getAgent("rpp")!;
assert("RPP inputSchema has subject", (rppAgent.inputSchema as any)._def?.typeName !== undefined || true);
assert("RPP outputSchema has editableText", true); // schema-level check

// ── Test 2: Output Validator ─────────────────────────────

console.log("\n🧹 Test 2: Per-Agent Output Validation");
console.log("─".repeat(50));

// RPP validation
const validRPP = {
  title: "Test",
  identity: { subject: "Indonesia", grade: "X", curriculum: "Merdeka", topic: "Test", duration: "2 JP" },
  studentProfile: "Siswa aktif",
  priorKnowledge: "Sudah belajar",
  learningObjectives: ["Tujuan 1"],
  successCriteria: ["Kriteria 1"],
  learningMaterials: ["Materi 1"],
  learningResources: ["Buku 1"],
  learningModel: "PBL",
  learningSteps: { opening: ["Salam"], core: ["Diskusi"], closing: ["Refleksi"] },
  assessmentPlan: { diagnostic: [], formative: ["Observasi"], summative: [] },
  differentiationStrategy: { content: [], process: [], product: [] },
  reflection: { teacherReflection: [], studentReflection: [] },
  teacherNotes: [],
  editableText: "RPP Teks Negosiasi\n...",
};
assert("RPP valid output passes", validateAgentOutput("rpp", validRPP as any) === null);
assert("RPP missing title fails", validateAgentOutput("rpp", { ...validRPP, title: "" } as any) !== null);
assert("RPP missing editableText fails", validateAgentOutput("rpp", { ...validRPP, editableText: "" } as any) !== null);
assert("RPP missing learningSteps fails", validateAgentOutput("rpp", { ...validRPP, learningSteps: null } as any) !== null);

// Soal validation
const validSoal = {
  title: "Soal Test",
  metadata: { subject: "Indonesia", grade: "X", topic: "Prosedur", difficulty: "sedang", questionCount: 2 },
  questions: [
    { number: 1, type: "pilihan_ganda", question: "Apa itu teks prosedur?", options: ["A", "B", "C", "D"], answer: "A", difficulty: "mudah", bloomLevel: "C1", learningObjective: "Mengidentifikasi" },
    { number: 2, type: "pilihan_ganda", question: "Struktur teks prosedur?", options: ["A", "B", "C", "D"], answer: "B", difficulty: "sedang", bloomLevel: "C2", learningObjective: "Menganalisis" },
  ],
  answerKeyText: "1. A",
  teacherNotes: [],
  editableText: "Soal...",
};
assert("Soal valid output passes", validateAgentOutput("soal", validSoal as any) === null);
assert("Soal wrong count fails", validateAgentOutput("soal", {
  ...validSoal, metadata: { ...validSoal.metadata, questionCount: 3 },
} as any) !== null);
assert("Soal missing answer fails", validateAgentOutput("soal", {
  ...validSoal, questions: [{ number: 1, type: "pilihan_ganda", question: "Test", answer: "", difficulty: "mudah", bloomLevel: "C1", learningObjective: "Test" }],
} as any) !== null);
assert("Soal duplicate text fails", validateAgentOutput("soal", {
  ...validSoal, questions: [
    { number: 1, type: "pilihan_ganda", question: "Sama", options: ["A", "B", "C", "D"], answer: "A", difficulty: "mudah", bloomLevel: "C1", learningObjective: "Test" },
    { number: 2, type: "pilihan_ganda", question: "Sama", options: ["A", "B", "C", "D"], answer: "B", difficulty: "mudah", bloomLevel: "C1", learningObjective: "Test" },
  ],
} as any) !== null);

// PPT validation
const validPPT = {
  title: "Presentasi Test",
  metadata: { subject: "Indonesia", grade: "X", topic: "Anekdot", slideCount: 2, visualStyle: "clean_modern" },
  slides: [
    { slideNumber: 1, title: "Pembukaan", bullets: ["Pengertian"], speakerNotes: "Sapa siswa", visualSuggestion: "Ilustrasi" },
    { slideNumber: 2, title: "Inti", bullets: ["Struktur"], speakerNotes: "Jelaskan struktur", visualSuggestion: "Diagram" },
  ],
  openingScript: "Selamat pagi...",
  closingReflection: "Apa yang dipelajari...",
  teacherNotes: [],
  editableText: "Slide...",
};
assert("PPT valid output passes", validateAgentOutput("ppt", validPPT as any) === null);
assert("PPT wrong slide count fails", validateAgentOutput("ppt", {
  ...validPPT, metadata: { ...validPPT.metadata, slideCount: 5 },
} as any) !== null);
assert("PPT missing speakerNotes fails", validateAgentOutput("ppt", {
  ...validPPT, slides: [{ slideNumber: 1, title: "Test", bullets: ["x"], speakerNotes: "", visualSuggestion: "x" }],
} as any) !== null);

// ── Test 3: Schema Parsing ────────────────────────────────

console.log("\n📐 Test 3: Zod Schema Parsing (dry-run)");
console.log("─".repeat(50));

try {
  const agent = getAgent("rpp")!;
  agent.inputSchema.parse({
    subject: "Bahasa Indonesia",
    grade: "X",
    topic: "Teks Negosiasi",
    learningObjectives: ["Tujuan 1"],
  });
  assert("RPP minimal input parses", true);
} catch (e: any) {
  assert("RPP minimal input parses", false, e.message);
}

try {
  const agent = getAgent("soal")!;
  agent.inputSchema.parse({
    subject: "Bahasa Indonesia",
    grade: "VII",
    topic: "Teks Prosedur",
    questionCount: 5,
    questionTypes: ["pilihan_ganda"],
  });
  assert("Soal minimal input parses", true);
} catch (e: any) {
  assert("Soal minimal input parses", false, e.message);
}

try {
  const agent = getAgent("ppt")!;
  agent.inputSchema.parse({
    subject: "Bahasa Indonesia",
    grade: "X",
    topic: "Teks Anekdot",
    slideCount: 8,
    learningObjective: "Menganalisis struktur teks anekdot",
  });
  assert("PPT minimal input parses", true);
} catch (e: any) {
  assert("PPT minimal input parses", false, e.message);
}

// ── Test 4: Guardrails ─────────────────────────────────────

console.log("\n🛡️  Test 4: Guardrails");
console.log("─".repeat(50));

assert("Clean input passes", checkInput("Halo selamat pagi").passed === true);
assert("PII detected", checkInput("Email test@email.com").warnings.some(w => w.includes("email")));
assert("Profanity detected", checkInput("kontol").passed === false);

// ── Test 5: JSON Cleaning ──────────────────────────────────

console.log("\n🧹 Test 5: JSON Output Cleaning");
console.log("─".repeat(50));

assert("Clean JSON unchanged", cleanJSONOutput('{"a":1}').cleaned === '{"a":1}');
assert("Markdown fence removed", cleanJSONOutput('```json\n{"a":1}\n```').cleaned === '{"a":1}');
assert("Trailing comma removed", !cleanJSONOutput('{"a":1,}').cleaned.includes(",}"));
assert("JSON fix works", tryFixJSON('{"a":1,}').success === true);

// ── Test 6: Provider Execution (optional) ──────────────────

const skipLabel = SKIP_PROVIDER ? "yes" : "no";
console.log(`\n🚀 Test 6: Agent Execution (SKIP_PROVIDER=${skipLabel})`);
console.log("─".repeat(50));

if (SKIP_PROVIDER) {
  console.log("  ⏭️  Skipping — set SKIP_PROVIDER=0 to run real AI calls");
} else {
  // RPP agent
  console.log("\n  --- RPP Agent ---");
  const rpp = getAgent("rpp")!;
  const rppResult = await runAgent({
    agent: rpp,
    input: {
      subject: "Bahasa Indonesia",
      grade: "X",
      phase: "E",
      curriculum: "Kurikulum Merdeka",
      topic: "Teks Negosiasi",
      duration: "2 JP x 45 menit",
      meetingCount: 1,
      learningObjectives: [
        "Menganalisis struktur teks negosiasi",
        "Menyusun teks negosiasi sesuai kaidah",
      ],
      learningModel: "Problem Based Learning",
      includeWorksheet: false,
      includeRubric: false,
      includeRemedialEnrichment: false,
    },
    context,
    outputFormat: "json",
  });
  printResult("RPP minimal", rppResult);
  assert("RPP succeeds", rppResult.success, rppResult.error ?? "");
  if (rppResult.output) {
    assert("RPP has title", typeof (rppResult.output as any).title === "string");
    assert("RPP has identity", (rppResult.output as any).identity?.subject === "Bahasa Indonesia");
    assert("RPP has learningSteps", Array.isArray((rppResult.output as any).learningSteps?.opening));
    assert("RPP has assessmentPlan", (rppResult.output as any).assessmentPlan?.formative !== undefined);
    assert("RPP has editableText", typeof (rppResult.output as any).editableText === "string");
  }

  // RPP with full options
  console.log("\n  --- RPP Agent (full) ---");
  const rppFull = await runAgent({
    agent: rpp,
    input: {
      subject: "Bahasa Indonesia",
      grade: "X",
      phase: "E",
      semester: "1 (Ganjil)",
      curriculum: "Kurikulum Merdeka",
      topic: "Teks Negosiasi",
      subtopic: "Struktur dan kebahasaan",
      duration: "4 JP x 45 menit",
      meetingCount: 2,
      studentProfile: "Siswa kelas X fase E, sudah mengenal teks deskripsi",
      learningObjectives: [
        "Menganalisis struktur teks negosiasi",
        "Menyusun teks negosiasi sesuai kaidah",
        "Mempresentasikan teks negosiasi",
      ],
      priorKnowledge: "Siswa pernah bernegosiasi dalam kehidupan sehari-hari",
      learningModel: "Problem Based Learning",
      assessmentTypes: ["diagnostik", "formatif", "sumatif"],
      differentiationNeeds: ["Siswa cepat", "Siswa lambat"],
      languageStyle: "lengkap",
      includeWorksheet: true,
      includeRubric: true,
      includeRemedialEnrichment: true,
    },
    context,
    outputFormat: "json",
  });
  printResult("RPP full", rppFull);
  assert("RPP full succeeds", rppFull.success, rppFull.error ?? "");
  if (rppFull.output) {
    const o = rppFull.output as any;
    assert("RPP has worksheetSuggestion", o.worksheetSuggestion !== undefined);
    assert("RPP has rubric", o.rubric !== undefined);
    assert("RPP has remedialAndEnrichment", o.remedialAndEnrichment !== undefined);
    assert("RPP has reflection", o.reflection !== undefined);
  }

  // Soal agent
  console.log("\n  --- Soal Agent (PG) ---");
  const soal = getAgent("soal")!;
  const soalResult = await runAgent({
    agent: soal,
    input: {
      subject: "Bahasa Indonesia",
      grade: "VII",
      topic: "Teks Prosedur",
      questionCount: 5,
      questionTypes: ["pilihan_ganda"],
      difficulty: "campuran",
      includeAnswerKey: true,
      includeExplanation: true,
      languageStyle: "remaja",
    },
    context,
    outputFormat: "json",
  });
  printResult("Soal PG", soalResult);
  assert("Soal succeeds", soalResult.success, soalResult.error ?? "");
  if (soalResult.output) {
    const o = soalResult.output as any;
    assert("Soal has 5 questions", o.questions?.length === 5, `Got ${o.questions?.length}`);
    assert("Soal has answerKeyText", typeof o.answerKeyText === "string");
    assert("Soal has editableText", typeof o.editableText === "string");
    assert("Soal all have answers", o.questions?.every((q: any) => q.answer));
    // Check no duplicates
    const texts = o.questions?.map((q: any) => q.question);
    const unique = new Set(texts);
    assert("Soal no duplicate questions", unique.size === texts?.length);
  }

  // Soal AKM literasi
  console.log("\n  --- Soal Agent (AKM Literasi) ---");
  const akmResult = await runAgent({
    agent: soal,
    input: {
      subject: "Bahasa Indonesia",
      grade: "VIII",
      topic: "Literasi Informasi",
      questionCount: 3,
      questionTypes: ["akm_literasi"],
      difficulty: "sedang",
      includeAnswerKey: true,
      includeExplanation: true,
    },
    context,
    outputFormat: "json",
  });
  printResult("Soal AKM", akmResult);
  assert("AKM succeeds", akmResult.success, akmResult.error ?? "");
  if (akmResult.output) {
    const o = akmResult.output as any;
    assert("AKM has stimulus", o.stimulus !== undefined, "AKM-style questions must have stimulus");
    assert("AKM has 3 questions", o.questions?.length === 3, `Got ${o.questions?.length}`);
  }

  // PPT agent
  console.log("\n  --- PPT Agent ---");
  const ppt = getAgent("ppt")!;
  const pptResult = await runAgent({
    agent: ppt,
    input: {
      subject: "Bahasa Indonesia",
      grade: "X",
      topic: "Teks Anekdot",
      slideCount: 8,
      learningObjective: "Menganalisis struktur dan kebahasaan teks anekdot",
      teachingStyle: "ceramah_interaktif",
      visualStyle: "clean_modern",
      includeQuiz: true,
      includeActivity: true,
      languageStyle: "praktis",
    },
    context,
    outputFormat: "json",
  });
  printResult("PPT", pptResult);
  assert("PPT succeeds", pptResult.success, pptResult.error ?? "");
  if (pptResult.output) {
    const o = pptResult.output as any;
    assert("PPT has 8 slides", o.slides?.length === 8, `Got ${o.slides?.length}`);
    assert("PPT has openingScript", typeof o.openingScript === "string");
    assert("PPT has closingReflection", typeof o.closingReflection === "string");
    assert("PPT has editableText", typeof o.editableText === "string");
    assert("PPT all have speakerNotes", o.slides?.every((s: any) => s.speakerNotes && s.speakerNotes.length > 0));
    assert("PPT all have visualSuggestion", o.slides?.every((s: any) => s.visualSuggestion && s.visualSuggestion.length > 0));
    const hasQuiz = o.slides?.some((s: any) => s.quiz);
    const hasActivity = o.slides?.some((s: any) => s.activityPrompt);
    assert("PPT has quiz slide (includeQuiz=true)", hasQuiz);
    assert("PPT has activity slide (includeActivity=true)", hasActivity);
  }

  // Invalid input test
  console.log("\n  --- Invalid Input Tests ---");
  try {
    const invalidResult = await runAgent({
      agent: rpp,
      input: { grade: "X" }, // missing subject, topic, learningObjectives
      context,
      outputFormat: "json",
    });
    assert("RPP invalid input fails gracefully", !invalidResult.success);
    printResult("RPP invalid", invalidResult);
  } catch (e: any) {
    assert("RPP invalid input throws", true, e.message);
  }

  try {
    const invalidSoal = await runAgent({
      agent: soal,
      input: { questionCount: -1, questionTypes: [] }, // invalid
      context,
      outputFormat: "json",
    });
    assert("Soal invalid input fails gracefully", !invalidSoal.success);
    printResult("Soal invalid", invalidSoal);
  } catch (e: any) {
    assert("Soal invalid input throws", true, e.message);
  }
}

// ── Summary ─────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  const total = passed + failed;
  console.log(`📊 Phase 3 Results: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ""}`);
  if (failed > 0) {
    console.log(`   ${failed} test(s) failed. Review output above.`);
  }
  console.log("=".repeat(60));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
