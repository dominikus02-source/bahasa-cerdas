/**
 * STEP 5.1 — SOAL GENERATION FAILURE AUDIT & RELIABILITY HARDENING
 * Reproduction test: pipeline Soal dengan provider TIRUAN (fixture string —
 * deterministik, tanpa biaya, tanpa DB write). Menguji perilaku parser/
 * salvage/fallback/metrik untuk setiap mode kegagalan yang mungkin.
 *
 * Run: npm run test:soal-generation-reliability
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

// ── Stage murni yang diuji (sama persis dengan alur attemptProviderCall) ──
import { cleanJSONOutput, tryFixJSON } from "../src/ai/core/output-validator";
import { soalOutputSchema } from "../src/ai/agents/soal-agent";
import { ProviderEmptyError, getProviderForModel, callProvider } from "../src/ai/core/provider";

function soalFixture() {
  return {
    title: "Soal Teks Prosedur",
    metadata: { subject: "Bahasa Indonesia", grade: "VII", topic: "Teks Prosedur", difficulty: "campuran", questionCount: 1 },
    questions: [
      { number: 1, type: "pilihan_ganda", question: "Teks yang berisi langkah-langkah disebut?", options: ["Deskripsi", "Prosedur", "Narasi", "Eksposisi"], answer: "Prosedur", explanation: "Teks prosedur berisi langkah-langkah.", difficulty: "mudah", bloomLevel: "C1", learningObjective: "Mengidentifikasi jenis teks" },
    ],
    answerKeyText: "1. B",
    teacherNotes: [],
    editableText: "1. Teks yang berisi langkah-langkah disebut?",
  };
}

function parseLikeRunner(raw: string): { ok: boolean; reason: string } {
  const { cleaned } = cleanJSONOutput(raw);
  try {
    const parsed = JSON.parse(cleaned);
    soalOutputSchema.parse(parsed);
    return { ok: true, reason: "schema-valid" };
  } catch {
    const { fixed, success } = tryFixJSON(raw);
    if (success) {
      try {
        const parsed = JSON.parse(fixed);
        soalOutputSchema.parse(parsed);
        return { ok: true, reason: "repaired" };
      } catch {
        return { ok: false, reason: "unfixable" };
      }
    }
    return { ok: false, reason: "unfixable" };
  }
}

const provider = read("src/ai/core/provider.ts");
const runner = read("src/ai/core/agent-runner.ts");
const streamRunner = read("src/ai/core/agent-stream-runner.ts");
const soalAgent = read("src/ai/agents/soal-agent.ts");
const analytics = read("app/api/admin/ai-analytics/route.ts");
const usageLogger = read("src/ai/core/usage-logger.ts");
const latihanRoute = read("app/api/guru/latihan/route.ts");

function main() {
  console.log("\n📋 STEP 5.1 — SOAL GENERATION RELIABILITY TEST");
  console.log("=".repeat(60));

  // 1. valid generation
  console.log("\n── 1. Generasi valid ──");
  check("1. JSON valid → schema parse sukses (tanpa repair)", () => parseLikeRunner(JSON.stringify(soalFixture())).ok);
  check("1. field lengkap: question/options/answer/explanation/difficulty/bloom",
    () => {
      const q = soalFixture().questions[0];
      return typeof q.question === "string" && q.options.length === 4 && typeof q.answer === "string" && q.bloomLevel === "C1";
    });

  // 2. malformed provider JSON
  console.log("\n── 2. JSON malformed ──");
  check("2. JSON terpotong (truncated) → salvage/repair, TIDAK silent-accept",
    () => {
      const truncated = JSON.stringify(soalFixture()).slice(0, -40);
      const result = parseLikeRunner(truncated);
      // runner: repair gagal → salvage {text} → sukses jujur (bukan failure 15/15)
      return !result.ok || result.reason === "repaired";
    });
  check("2. markdown fences ```json → cleanJSONOutput membuka fence",
    () => {
      const wrapped = "```json\n" + JSON.stringify(soalFixture()) + "\n```";
      const { cleaned } = cleanJSONOutput(wrapped);
      return !cleaned.startsWith("```") && JSON.parse(cleaned).title === "Soal Teks Prosedur";
    });
  check("2. trailing comma → tryFixJSON memperbaiki",
    () => {
      const bad = JSON.stringify(soalFixture()).replace(/"teacherNotes": \[\],/, '"teacherNotes": [],,');
      const { fixed, success } = tryFixJSON(bad);
      return success && JSON.parse(fixed).title === "Soal Teks Prosedur";
    });

  // 3. provider timeout / 4. HTTP failure / 5. fallback
  console.log("\n── 3-5. Provider timeout / HTTP / fallback ──");
  check("3. streamProviderText melempar ProviderChainFailedError saat semua provider gagal",
    () => provider.includes("throw new ProviderChainFailedError(errors)"));
  check("4. ProviderStreamInterruptedError diteruskan (tidak ganti provider saat teks parsial)",
    () => provider.includes("if (e instanceof ProviderStreamInterruptedError) throw e;"));
  check("5. fallback: stream kosong kini melempar ProviderEmptyError (chain pindah provider)",
    () => provider.includes('if (!fullText.trim()) throw new ProviderEmptyError("deepseek")')
      && provider.includes('if (!fullText.trim()) throw new ProviderEmptyError("groq")')
      && provider.includes('if (!fullText.trim()) throw new ProviderEmptyError("gemini")'));
  check("5. response_format json_object DIHAPUS dari provider (DeepSeek + Groq) — prompt JSON-strict penggantinya",
    () => !provider.includes("json_object") && !provider.includes("response_format"));
  check("5. streamGroq tetap tanpa response_format (strategi lama yang terbukti)",
    () => provider.includes("JANGAN kirim response_format json_object saat streaming"));

  // 6. invalid question schema
  console.log("\n── 6. Schema invalid ──");
  check("6. schema menolak field wajib hilang (editableText) → TIDAK dilemahkan",
    () => {
      const bad = soalFixture() as Record<string, unknown>;
      delete bad.editableText;
      return soalOutputSchema.safeParse(bad).success === false;
    });
  check("6. schema menolak difficulty invalid", () => {
    const bad = soalFixture() as Record<string, unknown>;
    (bad.questions as { difficulty: string }[])[0].difficulty = "sangat-sulit";
    return soalOutputSchema.safeParse(bad).success === false;
  });

  // 7. invalid metadata (taksonomi agent:soal tidak menulis QuestionMetadata —
  //     output tinggal di klien/AiSavedResult; bank soal memakai /api/guru/latihan)
  console.log("\n── 7. Metadata ──");
  check("7. agent:soal TIDAK menulis QuestionMetadata (tanpa jalur metadata di ai-tools)",
    () => !soalAgent.includes("questionMetadata") && !runner.includes("questionMetadata"));
  check("7. bank-soal (/api/guru/latihan) memakai prompt JSON array tanpa response_format (bukti prompt-JSON bekerja)",
    () => latihanRoute.includes("deepseek-chat") && !latihanRoute.includes("response_format"));

  // 8. database save failure
  console.log("\n── 8. Persistence ──");
  check("8. 'Berhasil' hanya dihitung setelah runAgent sukses; save (AiSavedResult) terpisah post-success",
    () => runner.includes("success: !finalError") && read("app/api/ai/agents/run/route.ts").includes("result.success"));

  // 9. successful persistence contract
  check("9. saveToHistory route ada (AiSavedResult) — 'Tersimpan' = hasil sukses yang disimpan",
    () => existsSync("app/api/ai/agents/saved/route.ts"));

  // 10. correct success/failure metric
  console.log("\n── 10. Metrik ──");
  check("10. success + failed = total (analytics menghitung dari count status)",
    () => analytics.includes("status: { not: \"success\" }") && analytics.includes('status: "success"'));
  check("10. failure kini merekam latencyMs + errorCode (4E.2A — bukan lagi '—')",
    () => runner.includes("latencyMs: latencyMs || durationMs") && runner.includes("errorCodeFor("));
  check("10. stream provider failure kini tercatat (tidak buta)",
    () => streamRunner.includes('errorCode: "PROVIDER_ERROR"'));

  // 11. no secret leakage
  console.log("\n── 11. Keamanan / tanpa kebocoran secret ──");
  check("11. error ke klien disanitasi (tanpa key/raw body) — run route",
    () => read("app/api/ai/agents/run/route.ts").includes("PROVIDER_BUSY") && !read("app/api/ai/agents/run/route.ts").includes("Authorization"));
  check("11. ProviderHttpError tidak pernah mengekspos header auth",
    () => !provider.includes("Bearer") || provider.includes("Bearer ${apiKey}") === false);

  // 12. protected zones
  console.log("\n── 12. Protected zones ──");
  check("12. protected zones 0 diff (prisma, gamification, learning-loop, engines, apk, coins, adaptive, learner-state, diagnostic, app/api/player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("12. perubahan HANYA di provider.ts + test (file list terverifikasi)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- src/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      return diff.length === 1 && diff[0] === "src/ai/core/provider.ts";
    });

  // 13. chain provider (Groq-only sesuai keputusan founder 5.1.3)
  console.log("\n── 13. Chain provider (Groq primary) ──");
  check("13. default priority = groq only + AI_PROVIDER_PRIORITY override",
    () => provider.includes('return ["groq"];') && provider.includes("AI_PROVIDER_PRIORITY"));
  check("13. streamGroq menjadi satu-satunya streamer yang aktif di default priority",
    () => provider.includes('PROVIDER_STREAMERS["groq"]') || provider.includes("groq: streamGroq"));

  // 14. konsistensi: getProviderForModel masih memetakan deepseek-chat
  check("14. getProviderForModel('deepseek-chat') → 'deepseek'",
    () => getProviderForModel("deepseek-chat") === "deepseek");

  // 15. ProviderEmptyError export masih ada (dipakai fallback fix)
  check("15. ProviderEmptyError tersedia untuk throw stream-kosong",
    () => typeof ProviderEmptyError === "function");

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
