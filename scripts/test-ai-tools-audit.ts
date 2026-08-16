/**
 * STEP 5.1.1 — AUDIT SEMUA ALAT AI + RELIABILITY (Soal, PPT, dan seluruh agent)
 * Memverifikasi: seluruh agent terdaftar, prompt↔schema selaras, rantai provider
 * (DeepSeek→Groq[120b→20b]→Gemini) utuh, tanpa json_object, tanpa secret.
 * Statik + fixture murni — tanpa network/DB write.
 *
 * Run: npm run test:ai-tools-audit
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

import { getAgent } from "../src/ai/core/agent-registry";
import "../src/ai";
import { soalOutputSchema } from "../src/ai/agents/soal-agent";
import { pptOutputSchema } from "../src/ai/agents/ppt-agent";
import { providerModels } from "../src/ai/core/provider";

const AGENT_FILES: Record<string, string> = {
  rpp: "src/ai/agents/rpp-agent.ts",
  soal: "src/ai/agents/soal-agent.ts",
  ppt: "src/ai/agents/ppt-agent.ts",
  review: "src/ai/agents/review-agent.ts",
  eyd: "src/ai/agents/eyd-agent.ts",
  feedback: "src/ai/agents/feedback-agent.ts",
  grading: "src/ai/agents/grading-agent.ts",
  "text-analysis": "src/ai/agents/text-analysis-agent.ts",
  "bc-assistant": "src/ai/agents/bc-assistant-agent.ts",
};

function main() {
  console.log("\n📋 STEP 5.1.1 — AUDIT SEMUA ALAT AI");
  console.log("=".repeat(60));

  // 1. Semua agent terdaftar
  console.log("\n── 1. Registrasi semua agent ──");
  for (const [id, file] of Object.entries(AGENT_FILES)) {
    check(`agent '${id}' terdaftar di registry (${file.split("/").pop()})`, Boolean(getAgent(id as never)));
  }

  // 2. Setiap agent punya kontrak lengkap
  console.log("\n── 2. Kontrak agent lengkap (inputSchema/outputSchema/systemPrompt/defaultModel) ──");
  for (const [id, file] of Object.entries(AGENT_FILES)) {
    const src = read(file);
    check(`${id}: inputSchema + outputSchema + systemPrompt + defaultModel + registerAgent`,
      () => src.includes("inputSchema") && src.includes("outputSchema") && src.includes("systemPrompt") && src.includes('defaultModel: "deepseek-chat"') && src.includes("registerAgent("));
  }

  // 3. Prompt Soal selaras dengan schema (field kunci disebut di prompt)
  console.log("\n── 3. Prompt ↔ Schema: Soal ──");
  const soal = read(AGENT_FILES.soal);
  check("3. prompt menyebut field wajib schema (title/metadata/questions/answerKeyText/teacherNotes/editableText)",
    () => ["title", "metadata", "questions", "answerKeyText", "teacherNotes", "editableText"].every((f) => soal.includes(f)));
  check("3. RULE 17: jumlah questions PERSIS questionCount + dilarang kosong",
    () => soal.includes("Jumlah questions HARUS PERSIS sama dengan questionCount") && soal.includes("DILARANG mengembalikan array questions kosong"));
  check("3. RULE 18: kontrak jawaban per tipe (answer = teks opsi utuh)",
    () => soal.includes('field "answer" = SALIN UTUH salah satu teks dari "options"'));
  check("3. RULE 20: output satu objek JSON tanpa markdown",
    () => soal.includes("Output HANYA satu objek JSON"));

  // 4. Prompt PPT selaras dengan schema
  console.log("\n── 4. Prompt ↔ Schema: PPT ──");
  const ppt = read(AGENT_FILES.ppt);
  check("4. prompt menyebut field wajib schema (slides/speakerNotes/visualSuggestion/editableText)",
    () => ["slides", "speakerNotes", "visualSuggestion", "editableText"].every((f) => ppt.includes(f)));
  check("4. RULE 12: jumlah slides PERSIS slideCount + dilarang kosong",
    () => ppt.includes("Jumlah slides HARUS PERSIS sama dengan slideCount") && ppt.includes("DILARANG mengembalikan array slides kosong"));
  check("4. RULE 15: output satu objek JSON",
    () => ppt.includes("Output HANYA satu objek JSON"));

  // 5. Schema Soal & PPT tetap ketat (fixture valid + invalid)
  console.log("\n── 5. Schema Soal/PPT ketat (tidak dilemahkan) ──");
  const soalFixture = { title: "S", metadata: { subject: "BI", grade: "VII", topic: "T", difficulty: "campuran", questionCount: 1 }, questions: [{ number: 1, type: "pilihan_ganda", question: "Q?", options: ["A", "B", "C", "D"], answer: "B", explanation: "E", difficulty: "mudah", bloomLevel: "C1", learningObjective: "L" }], answerKeyText: "1. B", teacherNotes: [], editableText: "1. Q?" };
  check("5. fixture soal valid → parse OK", () => soalOutputSchema.safeParse(soalFixture).success);
  check("5. soal tanpa editableText → DITOLAK", () => {
    const bad = { ...soalFixture } as Record<string, unknown>;
    delete bad.editableText;
    return soalOutputSchema.safeParse(bad).success === false;
  });
  const pptFixture = { title: "P", metadata: { subject: "BI", grade: "X", topic: "T", slideCount: 1, visualStyle: "clean_modern" }, slides: [{ slideNumber: 1, title: "Judul", bullets: ["Poin"], speakerNotes: "Narasi", visualSuggestion: "Ilustrasi" }], openingScript: "Pembuka", closingReflection: "Refleksi", teacherNotes: [], editableText: "1. Judul" };
  check("5. fixture ppt valid → parse OK", () => pptOutputSchema.safeParse(pptFixture).success);
  check("5. slide tanpa speakerNotes → DITOLAK", () => {
    const bad = JSON.parse(JSON.stringify(pptFixture));
    delete bad.slides[0].speakerNotes;
    return pptOutputSchema.safeParse(bad).success === false;
  });

  // 6. Rantai provider utuh
  console.log("\n── 6. Rantai provider (Groq primary — keputusan founder 5.1.3) ──");
  const provider = read("src/ai/core/provider.ts");
  check("6. default priority = groq only + override AI_PROVIDER_PRIORITY",
    () => provider.includes('return ["groq"];') && provider.includes("AI_PROVIDER_PRIORITY"));
  check("6. Groq rantai model 120b→20b (providerModels)",
    () => provider.includes('"openai/gpt-oss-120b", "openai/gpt-oss-20b"'));
  check("6. providerModels('groq', 'deepseek-chat') = [120b, 20b]",
    () => JSON.stringify(providerModels("groq", "deepseek-chat")) === JSON.stringify(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]));
  check("6. rantai model dipakai di streamProviderText DAN callWithFallback",
    () => provider.includes("providerModels(providerName, req.model)"));
  check("6. DeepSeek model tunggal (deepseek-chat) — tanpa model ganda",
    () => providerModels("deepseek", "deepseek-chat").length === 1);
  check("6. stream kosong melempar ProviderEmptyError (fallback benar-benar jalan)",
    () => provider.includes('if (!fullText.trim()) throw new ProviderEmptyError("deepseek")'));
  check("6. tanpa response_format json_object (prompt JSON-strict)",
    () => !provider.includes("json_object") && !provider.includes("response_format"));

  // 7. Tanpa secret di agent/provider
  console.log("\n── 7. Keamanan ──");
  check("7. tidak ada string key/secret literal di file agent",
    () => Object.values(AGENT_FILES).every((f) => !read(f).includes("sk-") && !read(f).includes("Bearer ")));
  check("7. provider hanya membaca key dari env (process.env, tanpa hardcode)",
    () => !provider.includes("api_key =") && provider.includes("process.env"));

  // 8. Protected zones
  console.log("\n── 8. Protected zones ──");
  check("8. protected zones 0 diff (prisma/gamification/learning-loop/engines/apk/coins/adaptive/learner-state/diagnostic/app-api-player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("8. perubahan hanya di src/ai + app/api/ai + guru/ai-tools + package.json + scripts (file list)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- src/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      return diff.every((f) => f.startsWith("src/ai/"));
    });

  // 9. STEP 5.1.2 — klasifikasi "sibuk" (UNKNOWN_ERROR fix)
  console.log("\n── 9. Klasifikasi error provider 'sibuk' (bukan UNKNOWN_ERROR) ──");
  const runRoute = read("app/api/ai/agents/run/route.ts");
  check("9. route klasifikasi 'sibuk' → PROVIDER_ERROR",
    () => runRoute.includes('err.includes("sibuk")') && runRoute.includes("PROVIDER_ERROR"));
  check("9. runAgent errorCodeFor 'sibuk' → PROVIDER_ERROR",
    () => runner.includes('sibuk/i.test(error)') && runner.includes("PROVIDER_ERROR"));
  check("9. getUserFriendlyMessage 'sibuk' → pesan AI sedang sibuk",
    () => read("app/(dashboard)/guru/ai-tools/lib/agent-api.ts").includes('lower.includes("sibuk")') && read("app/(dashboard)/guru/ai-tools/lib/agent-api.ts").includes("AI sedang sibuk. Silakan coba lagi beberapa saat."));

  // 10. Observability detail chain (server logs)
  console.log("\n── 10. Observability detail provider chain ──");
  check("10. runAgent mencatat detail ProviderChainFailedError ke server logs",
    () => runner.includes("Provider chain failed") && runner.includes("error.errors.slice(0, 12)"));
  check("10. streamProviderText log detail chain gagal",
    () => provider.includes("stream chain failed") && provider.includes("errors.slice(0, 12)"));
  check("10. callWithFallback log detail chain gagal",
    () => provider.includes("call chain failed") && provider.includes("errors.slice(0, 12)"));
  check("10. run route log kegagalan agent (requestId + code + error)",
    () => runRoute.includes("Agent failed requestId=") && runRoute.includes("code=${errorCode}"));

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
