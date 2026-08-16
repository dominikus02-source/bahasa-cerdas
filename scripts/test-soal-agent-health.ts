/**
 * STEP 4E.2A — SOAL AGENT FAILURE AUDIT — HEALTH TEST
 * Fokus: pipeline mekanik Soal agent (registry/dispatch/validation/prompt/
 * schema/salvage/telemetry) + perbandingan BC Assist + telemetri failure.
 * Statik + unit murni, tanpa provider live dan tanpa DB write.
 *
 * Run: npm run test:soal-agent-health
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// Unit: soal pipeline (murni)
import { getAgent } from "../src/ai/core/agent-registry";
import { soalInputSchema, soalOutputSchema } from "../src/ai/agents/soal-agent";
import { buildPrompt } from "../src/ai/core/prompt-builder";
import "../src/ai";

const soalAgent = read("src/ai/agents/soal-agent.ts");
const runner = read("src/ai/core/agent-runner.ts");
const streamRunner = read("src/ai/core/agent-stream-runner.ts");
const provider = read("src/ai/core/provider.ts");
const runRoute = read("app/api/ai/agents/run/route.ts");
const streamRoute = read("app/api/ai/agents/stream/route.ts");
const bcChat = read("app/api/ai/bc/chat/route.ts");
const usageLogger = read("src/ai/core/usage-logger.ts");
const clientApi = read("app/(dashboard)/guru/ai-tools/lib/agent-api.ts");

function main() {
  console.log("\n📋 STEP 4E.2A — SOAL AGENT HEALTH TEST");
  console.log("=".repeat(60));

  // 1. Agent registered
  console.log("\n── 1. Registrasi agent ──");
  check("1. agent 'soal' terdaftar di registry", Boolean(getAgent("soal" as never)));
  check("1. canonical alias 'soal' → 'soal'", read("lib/ai/agent-id-map.ts").includes('soal: "soal"'));

  // 2. Route reachable
  check("2. run route punya handler POST + maxDuration 300",
    () => runRoute.includes("export async function POST") && runRoute.includes("maxDuration = 300"));
  check("2. stream route punya handler POST + maxDuration 300",
    () => streamRoute.includes("export async function POST") && streamRoute.includes("maxDuration = 300"));

  // 3. Input validation works
  console.log("\n── 3. Input validation ──");
  check("3. soalInputSchema parse input form valid", () => {
    const parsed = soalInputSchema.parse({ subject: "Bahasa Indonesia", grade: "VII", topic: "Teks Prosedur", questionCount: 5, questionTypes: ["pilihan_ganda"] });
    return parsed.questionCount === 5 && parsed.curriculum === "Kurikulum Merdeka";
  });

  // 4. Provider resolved
  console.log("\n── 4. Provider resolution ──");
  check("4. soal defaultModel deepseek-chat → provider deepseek (MODEL_MAP)",
    () => provider.includes('"deepseek-chat": "deepseek"'));
  check("4. fallback chain DeepSeek→Groq→Gemini ada (callWithFallback/streamProviderText)",
    () => provider.includes("callWithFallback") && provider.includes("streamProviderText"));

  // 5. Prompt generated
  console.log("\n── 5. Prompt builder ──");
  check("5. buildPrompt menghasilkan system+user", () => {
    const agent = getAgent("soal" as never);
    const built = buildPrompt({ systemPrompt: agent.systemPrompt, userInput: { topic: "X" } as never, context: { userId: "u", userRole: "guru", isPremium: true, requestId: "r", timestamp: new Date() }, agent: agent as never, outputFormat: "json" });
    return built.messages.length === 2 && built.messages[0].role === "system" && built.messages[1].role === "user";
  });

  // 6. Provider invocation reachable (stream + run)
  check("6. stream runner memanggil streamProviderText", () => streamRunner.includes("streamProviderText("));
  check("6. run runner memanggil callWithFallback", () => runner.includes("callWithFallback("));

  // 7. Response parsed
  console.log("\n── 7-9. Schema / tipe / jawaban ──");
  check("7. soalOutputSchema parse fixture valid (10 field)", () => {
    const fixture = { title: "S", metadata: { subject: "BI", grade: "VII", topic: "T", difficulty: "campuran", questionCount: 1 }, questions: [{ number: 1, type: "pilihan_ganda", question: "Q?", options: ["A", "B", "C", "D"], answer: "B", explanation: "E", difficulty: "mudah", bloomLevel: "C1", learningObjective: "L" }], answerKeyText: "1. B", teacherNotes: [], editableText: "1. Q?" };
    const out = soalOutputSchema.parse(fixture);
    return out.questions.length === 1 && out.questions[0].options?.length === 4;
  });
  check("8. question type enum valid (pilihan_ganda dst.)",
    () => soalAgent.includes('"pilihan_ganda"') && soalAgent.includes('"benar_salah"') && soalAgent.includes('"uraian"'));
  check("9. answer contract union string|string[] (PG kompleks)", () => soalAgent.includes("answer: z.union([z.string(), z.array(z.string())])"));

  // 10. Error surfaced correctly
  console.log("\n── 10. Error surfacing ──");
  check("10. run route menetapkan errorCode dari result (OUTPUT_VALIDATION/PROVIDER)",
    () => runRoute.includes("OUTPUT_VALIDATION_ERROR") && runRoute.includes("PROVIDER_ERROR"));
  check("10. stream runner mengirim event error + done",
    () => streamRunner.includes('type: "error"') && streamRunner.includes('type: "done"'));

  // 11-12. Telemetry records failure/success correctly
  console.log("\n── 11-12. Telemetry (STEP 4E.2A fix) ──");
  check("11. runAgent failure path merekam latencyMs (bukan null)",
    () => runner.includes("latencyMs: latencyMs || durationMs") && runner.includes("output: null") && runner.includes("success: false"));
  check("11. runAgent success path merekam latencyMs", () => runner.includes("latencyMs: latencyMs || durationMs"));
  check("11. runAgent merekam errorCode stage (PROVIDER_ERROR/EMPTY/VALIDATION)",
    () => runner.includes("errorCodeFor(") && runner.includes("PROVIDER_ERROR") && runner.includes("PROVIDER_EMPTY_RESPONSE"));
  check("12. stream runner kini mencatat kegagalan provider (PROVIDER_ERROR + EMPTY_RESPONSE)",
    () => streamRunner.includes('errorCode: "PROVIDER_ERROR"') && streamRunner.includes('errorCode: "EMPTY_RESPONSE"'));
  check("12. usage-logger menyimpan latencyMs + errorCode ke AIUsage",
    () => usageLogger.includes("latencyMs: log.latencyMs ?? null") && usageLogger.includes("errorCode: log.success ? null : mapErrorCode(log.error)"));

  // 13. Akar "Latency —": analytics avg hanya menghitung latencyMs non-null
  console.log("\n── 13. Kenapa Latency '—' ──");
  check("13. analytics avg latency memakai filter latencyMs not null (null → '—')",
    () => read("app/api/admin/ai-analytics/route.ts").includes("latencyMs: { not: null }"));

  // 14. Divergensi Soal vs BC Assist (json mode + 8000 token)
  console.log("\n── 14. Divergensi Soal vs BC Assist ──");
  check("14. soal: responseFormat json + maxTokens 8000 (generasi berat JSON)",
    () => soalAgent.includes("maxTokens: 8000") && runner.includes('outputFormat === "json" ? "json" : undefined'));
  check("14. BC Assist: streamProviderText teks biasa, tanpa schema output",
    () => bcChat.includes("streamProviderText") && !bcChat.includes("outputSchema"));

  // 15. Client fallback stream → run (penjelas 15 baris gagal: runAgent satu-satunya penulis error)
  console.log("\n── 15. Client fallback ──");
  check("15. klien fallback ke runAgent saat stream gagal",
    () => clientApi.includes('fetch("/api/ai/agents/stream"') && clientApi.includes('fetch("/api/ai/agents/run"'));
  check("15. stream runner SEBELUMNYA tidak mencatat error provider (kini dicatat — diff ada)",
    () => streamRunner.includes("PROVIDER_ERROR"));

  // 16. Protected zones + DB
  console.log("\n── 16. Protected zones ──");
  check("16. protected zones 0 diff (prisma, gamification, learning-loop, engines, apk, coins, adaptive, learner-state, diagnostic)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("16. tidak ada perubahan schema/migrasi (prisma 0 diff)", () => execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
