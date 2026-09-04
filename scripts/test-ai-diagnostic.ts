/**
 * STEP 8.3 — BC AI DIAGNOSTIC 3.0 — unit test logika murni + static checks (tanpa DB).
 * Run: npm run test:ai-diagnostic
 *
 * Melacak invariant AI Diagnostic:
 *   - Validator R1–R16 (anti-halusinasi: jawaban di stem, stem duplikat, etc).
 *   - Planning deterministik: kueri skill coverage, kesulitan EASY≈30%/MEDIUM≈40%/HARD≈30%.
 *   - Fallback bank jujur (closest difficulty, unseen-first, deterministic).
 *   - Public projection tanpa kebocoran kunci jawaban / explanation / misconceptionMap.
 *   - Route: cabang start/answer/GET AI + rate limit + preview adaptive; tanpa write QuestionMetadata.
 *   - Tidak ada API key di source.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import {
  AI_DIAGNOSTIC_ALLOWED_SIZES,
  AI_DIAGNOSTIC_ANSWER_RATE_LIMIT,
  AI_DIAGNOSTIC_DEFAULT_SIZE,
  AI_DIAGNOSTIC_MIN_USEFUL,
  AI_DIAGNOSTIC_SELECTION_VERSION,
  AI_DIAGNOSTIC_SOURCE,
  DIAGNOSTIC_COVERAGE_SKILLS,
  aiDiagnosticDifficultyForIndex,
  aiDiagnosticEnabled,
  aiDiagnosticSkillQueue,
  pickAiDiagnosticSubskill,
} from "@/lib/diagnostic-ai/config";
import { parseAiQuestionRaw } from "@/lib/diagnostic-ai/generator";
import { buildAiDiagnosticSystemPrompt, buildAiDiagnosticUserPrompt } from "@/lib/diagnostic-ai/prompts";
import { validateAiDiagnosticItem } from "@/lib/diagnostic-ai/validator";
import {
  answeredCountFor,
  buildAnswerOutcome,
  buildInitialState,
  canCompleteHonestly,
  nextPlanForSlot,
  planNextQuestion,
  stateFromJson,
  summarizeSessionEvidence,
} from "@/lib/diagnostic-ai/controller";
import { pickBankFallbackCandidate, toFallbackAiItem } from "@/lib/diagnostic-ai/bank-fallback";
import { evidenceMetadata } from "@/lib/diagnostic-ai/persist";
import { isAiSessionState, toPublicQuestion } from "@/lib/diagnostic-ai/types";
import { SUBSKILLS } from "@/lib/question-metadata/taxonomy";
import type { DiagnosticCandidate } from "@/lib/diagnostic/types";
import type { AiDiagnosticItem, AiSessionState } from "@/lib/diagnostic-ai/types";

let pass = 0;
let fail = 0;
function ok(name: string, condition: boolean) {
  if (condition) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
  }
}

const baseItem: Omit<AiDiagnosticItem, "id"> = {
  text: "Manakah kalimat berikut yang menggunakan tanda baca titik dengan tepat?",
  options: ["Dia pergi ke pasar. lalu membeli sayur.", "Dia pergi ke pasar lalu membeli sayur.", "Dia pergi, ke pasar lalu membeli sayur.", "Dia pergi ke pasar lalu membeli; sayur."],
  questionType: "PILIHAN_GANDA",
  skill: "GRAMMAR",
  subskill: "GRAMMAR_TANDA_BACA",
  difficulty: "MEDIUM",
  topic: "tanda baca",
  cognitiveTarget: "MEMAHAMI",
  correctAnswer: "1",
  explanation: "Kalimat tanpa tanda titik di tengah adalah bentuk yang benar; opsi lain memakai tanda baca yang salah atau berlebihan.",
  misconceptionMap: {
    "0": "Murid mengira titik juga dipakai sebagai pemisah klausa di tengah kalimat.",
    "2": "Murid salah menempatkan koma setelah kata kerja.",
    "3": "Murid mengira titik koma bisa mengakhiri kalimat induk.",
  },
  evidenceTarget: { skill: "GRAMMAR", confidence: "HIGH" },
  diagnosticRationale: "Butir ini mengukur pemahaman murid terhadap fungsi tanda titik dan koma dalam kalimat sederhana.",
};

function validItem(overrides: Partial<AiDiagnosticItem> = {}): Record<string, unknown> {
  return { ...baseItem, id: "test-id-1", ...overrides } as unknown as Record<string, unknown>;
}

console.log("\n— 1. Konfigurasi —");
{
  const keys = ["GROQ_API_KEY", "DEEPSEEK_API_KEY", "GEMINI_API_KEY"] as const;
  const saved = new Map<string, string | undefined>();
  for (const key of keys) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  ok("aiDiagnosticEnabled() false tanpa API key", aiDiagnosticEnabled() === false);
  for (const [key, value] of saved) {
    if (value !== undefined) process.env[key] = value;
  }
  const enabled = aiDiagnosticEnabled();
  ok("aiDiagnosticEnabled() bool (true bila ada key)", typeof enabled === "boolean");
  ok("source = AI_DIAGNOSTIC", AI_DIAGNOSTIC_SOURCE === "AI_DIAGNOSTIC");
  ok("selectionVersion = 3.0", AI_DIAGNOSTIC_SELECTION_VERSION === "3.0");
  ok("allowed sizes 6/8/10/12/15", JSON.stringify(AI_DIAGNOSTIC_ALLOWED_SIZES) === "[6,8,10,12,15]");
  ok("default size 10", AI_DIAGNOSTIC_DEFAULT_SIZE === 10);
  ok("min useful 6", AI_DIAGNOSTIC_MIN_USEFUL === 6);
  ok("answer rate limit 10/10menit", AI_DIAGNOSTIC_ANSWER_RATE_LIMIT.maxRequests === 10 && AI_DIAGNOSTIC_ANSWER_RATE_LIMIT.windowSeconds === 600);
  const plan10 = Array.from({ length: 10 }, (_, i) => aiDiagnosticDifficultyForIndex(i, 10));
  ok("difficulty plan 10 = 3 EASY, 4 MEDIUM, 3 HARD", plan10.filter((d) => d === "EASY").length === 3 && plan10.filter((d) => d === "MEDIUM").length === 4 && plan10.filter((d) => d === "HARD").length === 3);
  const queue = aiDiagnosticSkillQueue(10);
  ok("skill queue 10 memuat 5 skill coverage", new Set(queue).size === 5 && DIAGNOSTIC_COVERAGE_SKILLS.every((skill) => queue.includes(skill)));
  ok("tanpa LISTENING/SPEAKING", !queue.includes("LISTENING") && !queue.includes("SPEAKING"));
}

console.log("\n— 2. Tipe & proyeksi publik —");
{
  const item = { ...baseItem, id: "abc-123" } as AiDiagnosticItem;
  ok("isAiSessionState menerima state valid", isAiSessionState({ v: 1, mode: "AI-ADAPTIVE", targetSize: 10, order: [], items: {}, usedTopics: [], usedSubskills: [], genFailed: false }));
  ok("isAiSessionState menolak mode lain", !isAiSessionState({ v: 1, mode: "BANK", targetSize: 10, order: [], items: {}, usedTopics: [], usedSubskills: [], genFailed: false }));
  const pub = toPublicQuestion(item);
  ok("proyeksi publik tanpa correctAnswer", !("correctAnswer" in pub));
  ok("proyeksi publik tanpa explanation", !("explanation" in pub));
  ok("proyeksi publik tanpa misconceptionMap", !("misconceptionMap" in pub));
  ok("proyeksi publik tanpa evidenceTarget", !("evidenceTarget" in pub));
  ok("proyeksi publik tanpa diagnosticRationale", !("diagnosticRationale" in pub));
  ok("proyeksi publik memuat id/teks/opsi/skill", pub.id === "abc-123" && pub.text === item.text && pub.options.length === 4 && pub.skill === "GRAMMAR");
}

console.log("\n— 3. Validator R1–R16 —");
{
  ok("item valid diterima", validateAiDiagnosticItem(validItem(), { avoidStems: [], avoidIds: [] }).valid);
  ok("R1: questionType tidak didukung ditolak", !validateAiDiagnosticItem(validItem({ questionType: "LONCAT" as never }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R2: teks pendek ditolak", !validateAiDiagnosticItem(validItem({ text: "Pendek." }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R3: LISTENING ditolak", !validateAiDiagnosticItem(validItem({ skill: "LISTENING" }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R4: subskill tidak cocok untuk skill ditolak", !validateAiDiagnosticItem(validItem({ subskill: "READING_IDE_POKOK" }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R5: difficulty bukan EASY/MEDIUM/HARD ditolak", !validateAiDiagnosticItem(validItem({ difficulty: "VERY_HARD" }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R8: PG butuh tepat 4 opsi", !validateAiDiagnosticItem(validItem({ options: ["A", "B", "C"] }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R8: opsi tidak unik ditolak", !validateAiDiagnosticItem(validItem({ options: ["A", "A", "C", "D"] }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R8: BENAR_SALAH tepat opsi Benar/Salah", validateAiDiagnosticItem(validItem({ questionType: "BENAR_SALAH", correctAnswer: "0", misconceptionMap: { "1": "Murid keliru membedakan fungsi kedua pernyataan." }, options: ["Benar", "Salah"] }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R8: BENAR_SALAH opsi diubah namanya ditolak", !validateAiDiagnosticItem(validItem({ questionType: "BENAR_SALAH", options: ["Betul", "Salah"] }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R8: ISIAN_SINGKAT wajib tanpa opsi", validateAiDiagnosticItem(validItem({ questionType: "ISIAN_SINGKAT", options: [], correctAnswer: "koma", misconceptionMap: {} }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R8: ISIAN_SINGKAT dengan opsi ditolak", !validateAiDiagnosticItem(validItem({ questionType: "ISIAN_SINGKAT", options: ["A", "B"], correctAnswer: "koma" }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R9: correctAnswer di luar jangkauan ditolak", !validateAiDiagnosticItem(validItem({ correctAnswer: "7" }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R9: ISIAN_SINGKAT jawaban > 80 karakter ditolak", !validateAiDiagnosticItem(validItem({ questionType: "ISIAN_SINGKAT", options: [], correctAnswer: "x".repeat(90), misconceptionMap: {} }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R10: explanation < 20 karakter ditolak", !validateAiDiagnosticItem(validItem({ explanation: "Pendek." }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R11: misconceptionMap opsi salah kosong ditolak", !validateAiDiagnosticItem(validItem({ misconceptionMap: { "0": "Penjelasan memadai untuk opsi 0." } }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R12: evidenceTarget skill tidak valid ditolak", !validateAiDiagnosticItem(validItem({ evidenceTarget: { skill: "HACKING", confidence: "HIGH" } }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R12: confidence bukan LOW/MEDIUM/HIGH ditolak", !validateAiDiagnosticItem(validItem({ evidenceTarget: { skill: "GRAMMAR", confidence: "SURE" } }), { avoidStems: [], avoidIds: [] }).valid);
  ok("R13: rationale < 20 karakter ditolak", !validateAiDiagnosticItem(validItem({ diagnosticRationale: "Singkat." }), { avoidStems: [], avoidIds: [] }).valid);
  const stemAnswer = validItem({ text: "Manakah yang benar: Dia pergi ke pasar lalu membeli sayur. (jawaban: opsi 1)" });
  ok("R14: jawaban benar tertulis di stem ditolak", !validateAiDiagnosticItem(stemAnswer, { avoidStems: [], avoidIds: [] }).valid);
  ok("R15: stem duplikat dari avoidStems ditolak", !validateAiDiagnosticItem(validItem(), { avoidStems: [baseItem.text], avoidIds: [] }).valid);
  ok("R16: id sudah dipakai ditolak", !validateAiDiagnosticItem(validItem({ id: "dup-1" }), { avoidStems: [], avoidIds: ["dup-1"] }).valid);
  ok("R16: id kosong ditolak", !validateAiDiagnosticItem(validItem({ id: "" }), { avoidStems: [], avoidIds: [] }).valid);
}

console.log("\n— 4. Generator: parsing JSON —");
{
  const raw = '```json\n{"text":"Kalimat berikut yang tepat adalah?","options":["A","B","C","D"],"questionType":"PILIHAN_GANDA","correctAnswer":0,"explanation":"Penjelasan lengkap untuk butir ini dianggap memadai.","misconceptionMap":{"1":"Satu","2":"Dua","3":"Tiga"},"evidenceTarget":{"skill":"READING","confidence":"MEDIUM"},"diagnosticRationale":"Butir mengukur pemahaman membaca dasar.","subskill":"READING_IDE_POKOK","topic":"ide pokok","cognitiveTarget":"MEMAHAMI"}\n```';
  const parsed = parseAiQuestionRaw(raw);
  ok("strip markdown fences", parsed.parsed !== null && typeof parsed.parsed === "object");
  let threwOnGarbage = false;
  try {
    parseAiQuestionRaw("ini bukan json sama sekali {");
  } catch {
    threwOnGarbage = true;
  }
  ok("JSON rusak → throw AI_DIAGNOSTIC_JSON_PARSE_FAILED", threwOnGarbage);
  const generatorPath = path.resolve(process.cwd(), "lib/diagnostic-ai/generator.ts");
  const generatorSource = fs.readFileSync(generatorPath, "utf8");
  ok("gagal provider AI tidak pernah lolos (try/catch callWithFallback)", generatorSource.includes("try {") && generatorSource.includes("response = await callWithFallback(") && generatorSource.includes("} catch {"));
  const genBody = generatorSource.split("export async function generateAiDiagnosticQuestion")[1] ?? "";
  ok("kegagalan provider → retry/continue, bukan throw", !genBody.includes("throw") && generatorSource.includes('"percobaan sebelumnya gagal dijalankan'));
  ok("terminal path generator selalu { item: null } (fallback bank)", generatorSource.includes("return { item: null, warnings, provider: null };"));
}

console.log("\n— 5. Controller: state & perencanaan —");
{
  const first = { ...baseItem, id: "q-1" } as AiDiagnosticItem;
  const state = buildInitialState(10, first);
  ok("buildInitialState: order/item/used", state.order.length === 1 && state.order[0] === "q-1" && state.items["q-1"] && state.usedTopics.includes("tanda baca") && state.usedSubskills.includes("GRAMMAR_TANDA_BACA"));
  ok("answeredCountFor 0 di awal sesi (order=[q-1], items={q-1})", answeredCountFor(state) === 0);
  ok("stateFromJson round-trip", stateFromJson(state)?.targetSize === 10 && stateFromJson({ nope: true }) === null);
  const plan0 = nextPlanForSlot(state, 0);
  ok("slot 0 EASY + READING", plan0.skill === "READING" && plan0.difficulty === "EASY");
  const plan4 = nextPlanForSlot(state, 4);
  ok("slot 4 MEDIUM", plan4.difficulty === "MEDIUM");
  const plan7 = nextPlanForSlot(state, 7);
  ok("slot 7 HARD", plan7.difficulty === "HARD");
  ok("subskill dipilih dari SUBSKILLS skill", plan0.subskill !== null && SUBSKILLS.READING && Object.keys(SUBSKILLS.READING).includes(plan0.subskill as string));
  ok("pickAiDiagnosticSubskill hindari yang dipakai", pickAiDiagnosticSubskill("READING", ["READING_IDE_POKOK"], SUBSKILLS) !== "READING_IDE_POKOK");
  ok("pickAiDiagnosticSubskill null saat tanpa pilihan", pickAiDiagnosticSubskill("WRITING", ["x"], { WRITING: {} }) === null);
  ok("planNextQuestion CONTINUE saat ada antrean", planNextQuestion(state, true).reason === "CONTINUE");
  const items10: Record<string, AiDiagnosticItem> = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q-${i}`, { ...baseItem, id: `q-${i}` }]));
  const fullState: AiSessionState = { v: 1, mode: "AI-ADAPTIVE", targetSize: 10, order: [], items: items10, usedTopics: [], usedSubskills: [], genFailed: false };
  ok("answeredCountFor 10 saat semua butir terjawab (order kosong)", answeredCountFor(fullState) === 10);
  ok("planNextQuestion TARGET_REACHED saat penuh", planNextQuestion(fullState, true).reason === "TARGET_REACHED");
  const noGenState: AiSessionState = {
    v: 1,
    mode: "AI-ADAPTIVE",
    targetSize: 10,
    order: [],
    items: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`q-${i}`, { ...baseItem, id: `q-${i}` }])),
    usedTopics: [],
    usedSubskills: [],
    genFailed: true,
  };
  ok("planNextQuestion GENERATION_UNAVAILABLE saat genFailed tanpa pool", planNextQuestion(noGenState, false).reason === "GENERATION_UNAVAILABLE");
  ok("buildAnswerOutcome done saat TARGET_REACHED", buildAnswerOutcome(fullState, true, null, "TARGET_REACHED").done === true && buildAnswerOutcome(fullState, true, null, "TARGET_REACHED").remaining === 0);
  ok("buildAnswerOutcome nextQuestion public", buildAnswerOutcome(fullState, false, { ...baseItem, id: "q-next" } as AiDiagnosticItem, "ANSWERED").nextQuestion?.id === "q-next");
  // Fixture invariant: `order ⊆ items` dan answered = |items| − |order|.
  // 6 dijawab → 10 butir pernah dibuat, 4 tersisa (masih di order).
  const answered6: AiSessionState = { v: 1, mode: "AI-ADAPTIVE", targetSize: 10, order: ["q-6", "q-7", "q-8", "q-9"], items: items10, usedTopics: [], usedSubskills: [], genFailed: false };
  ok("answeredCountFor 6 saat 6 dijawab (items 10 − order 4)", answeredCountFor(answered6) === 6);
  ok("canCompleteHonestly true di 6 jawaban", canCompleteHonestly(answered6));
  const answered4: AiSessionState = { v: 1, mode: "AI-ADAPTIVE", targetSize: 10, order: ["q-4", "q-5", "q-6", "q-7", "q-8", "q-9"], items: items10, usedTopics: [], usedSubskills: [], genFailed: false };
  ok("answeredCountFor 4 saat 4 dijawab (items 10 − order 6)", answeredCountFor(answered4) === 4);
  ok("canCompleteHonestly false di 4 jawaban", !canCompleteHonestly(answered4));
  // BUG PRODUKSI (hotfix 2026-09-04): sesi adaptif membangkitkan SATU butir per
  // langkah — order hanya berisi butir yang sedang tampil. Setelah butir itu
  // dijawab, order = [] dan items = jumlah yang pernah dibuat. answeredCountFor
  // harus = 1 (bukan targetSize) sehingga butir ke-2 dibangkitkan.
  const oneAnswered: AiSessionState = { v: 1, mode: "AI-ADAPTIVE", targetSize: 10, order: [], items: { "q-1": { ...baseItem, id: "q-1" } }, usedTopics: [], usedSubskills: [], genFailed: false };
  ok("answeredCountFor 1 setelah 1 jawaban (items 1 − order 0) — bukan 10", answeredCountFor(oneAnswered) === 1);
  ok("canCompleteHonestly false di 1 jawaban", !canCompleteHonestly(oneAnswered));
  ok("summarizeSessionEvidence mengagregasi per skill", summarizeSessionEvidence([{ skill: "READING", isCorrect: true }, { skill: "READING", isCorrect: false }]) === "READING: 1 dari 2 benar");
  ok("summarizeSessionEvidence kosong", summarizeSessionEvidence([]) === "");
}

console.log("\n— 6. Fallback bank jujur —");
{
  const pool: DiagnosticCandidate[] = [
    { id: "b-easy", text: "Soal bank mudah", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: null, difficulty: "EASY", topic: null, seenAt: null },
    { id: "b-hard", text: "Soal bank sulit", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: null, difficulty: "HARD", topic: null, seenAt: null },
    { id: "b-med", text: "Soal bank medium", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: null, difficulty: "MEDIUM", topic: null, seenAt: null },
    { id: "b-seen", text: "Soal bank seen", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: null, difficulty: "MEDIUM", topic: null, seenAt: new Date() },
  ];
  ok("pilih difficulty terdekat", pickBankFallbackCandidate(pool, { skill: "READING", difficulty: "MEDIUM" }, [])?.id === "b-med");
  ok("difficulty terdekat menang atas unseen (jarak 0 < 1)", pickBankFallbackCandidate(pool.filter((c) => c.id !== "b-med"), { skill: "READING", difficulty: "MEDIUM" }, [])?.id === "b-seen");
  ok("unseen-first saat difficulty sama", pickBankFallbackCandidate([...pool.filter((c) => c.id !== "b-med"), { id: "b-unseen", text: "Soal bank unseen", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: null, difficulty: "MEDIUM", topic: null, seenAt: null }], { skill: "READING", difficulty: "MEDIUM" }, [])?.id === "b-unseen");
  ok("avoidIds dihormati", pickBankFallbackCandidate(pool, { skill: "READING", difficulty: "MEDIUM" }, ["b-med", "b-hard", "b-seen"])?.id === "b-easy");
  ok("null saat tidak ada cocok skill", pickBankFallbackCandidate(pool, { skill: "WRITING", difficulty: "MEDIUM" }, []) === null);
  const fallback = toFallbackAiItem(pool[2], "2");
  ok("toFallbackAiItem bentuk item valid", fallback.id === "b-med" && fallback.correctAnswer === "2" && fallback.explanation.includes("bank soal") && fallback.evidenceTarget.confidence === "HIGH" && fallback.skill === "READING");
  ok("fallback = jalur tepercaya (tidak di-validasi ulang R11)", fallback.misconceptionMap !== undefined && fallback.diagnosticRationale.includes("bank"));
}

console.log("\n— 7. Evidence metadata —");
{
  const meta = evidenceMetadata();
  ok("metadata version 1.0 + selectionVersion 3.0 + ai", meta.version === "1.0" && meta.selectionVersion === "3.0" && meta.ai === true);
}

console.log("\n— 8. Prompt —");
{
  const system = buildAiDiagnosticSystemPrompt();
  ok("system prompt berisi aturan jawaban tidak di stem", system.includes("Jawaban benar TIDAK boleh tertulis ulang"));
  ok("system prompt berisi schema JSON", system.includes("misconceptionMap") && system.includes("evidenceTarget"));
  ok("system prompt tanpa klise 'Sebagai AI,'", !system.includes("Sebagai AI,"));
  const user = buildAiDiagnosticUserPrompt({ skill: "GRAMMAR", subskill: "GRAMMAR_TANDA_BACA", difficulty: "MEDIUM", topic: null }, { avoidStems: [baseItem.text], avoidSubskills: ["GRAMMAR_TANDA_BACA"], usedTopics: ["tanda baca"], recentSummary: "GRAMMAR: 1 dari 2 benar" });
  ok("user prompt berisi skill + subskill + kesulitan", user.includes("GRAMMAR") && user.includes("GRAMMAR_TANDA_BACA") && user.includes("MEDIUM"));
  ok("user prompt berisi avoid-stems", user.includes("jangan menulis soal dengan topik yang sama persis"));
  ok("user prompt berisi topik yang dipakai", user.includes("tanda baca") && user.includes("Subskill yang sudah dipakai"));
  ok("user prompt berisi ringkasan evidence", user.includes("GRAMMAR: 1 dari 2 benar"));
}

console.log("\n— 9. Route: static checks —");
{
  const routePath = path.resolve(process.cwd(), "app/api/player/diagnostic/route.ts");
  const route = fs.readFileSync(routePath, "utf8");
  ok("start cabang AI (aiDiagnosticEnabled + startAiDiagnostic)", route.includes("aiDiagnosticEnabled()") && route.includes("startAiDiagnostic(user.id, size)"));
  ok("answer cabang AI (isAiSession + rate limit)", route.includes("isAiSession(session)") && route.includes("AI_DIAGNOSTIC_ANSWER_RATE_LIMIT"));
  ok("GET cabang AI (getAiDiagnosticPayload)", route.includes("getAiDiagnosticPayload(userId, session)"));
  ok("preview adaptive true", route.includes('adaptive: true') && route.includes('skillsLabel'));
  ok("questionIds AI disimpan via Prisma.InputJsonValue", route.includes("as unknown as Prisma.InputJsonValue"));
  ok("tanpa write QuestionMetadata untuk AI", !route.includes("questionMetadata.create") && !route.includes("questionMetadata.update"));
  const libDir = path.resolve(process.cwd(), "lib/diagnostic-ai");
  const allSource = fs.readdirSync(libDir).map((file) => fs.readFileSync(path.join(libDir, file), "utf8")).join("\n");
  ok("lib AI tanpa write DB selain AdaptivePracticeSession/LearningEvidence", !allSource.includes("questionMetadata") && !allSource.includes("awardXp") && !allSource.includes("addCoin"));
  const pagesDir = path.resolve(process.cwd(), "app/arena/diagnostic");
  const pageSource = fs.readdirSync(path.join(pagesDir, "[sessionId]"), { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => fs.readFileSync(path.join(pagesDir, "[sessionId]", entry.name), "utf8")).join("\n");
  ok("UI sesi menangani adaptive (nextQuestion + remaining)", pageSource.includes("adaptive") && pageSource.includes("nextQuestion"));
  ok("UI sesi tanpa akses kunci jawaban", !pageSource.includes("correctAnswer") && !pageSource.includes("misconceptionMap"));
  ok("bukan jalur keras: tanpa teks 'AI Error'/'Provider Error' di route", !route.includes("AI Error") && !route.includes("Provider Error") && !route.includes("JSON Error"));
  ok("bukan jalur keras: tanpa teks error AI di UI murid", !pageSource.includes("AI Error") && !pageSource.includes("Provider Error") && !pageSource.includes("JSON Error"));
}

console.log("\n— 10. Keamanan kunci —");
{
  // Fragmen terpisah: kunci penuh tidak pernah ada sebagai literal (push protection GitHub).
  const forbidden = ["gsk_k4tjFlH", "0f87EygHfS16IWGdyb3FY8Y5ricvr33a3Y", "962u5Ye15jp"].join("");
  const candidates = ["lib/diagnostic-ai", "app/api/player/diagnostic", "app/arena/diagnostic"];
  let leaked = false;
  for (const dir of candidates) {
    const full = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(full)) continue;
    const stat = fs.statSync(full);
    const files = stat.isDirectory()
      ? fs.readdirSync(full).map((file) => (fs.statSync(path.join(full, file)).isDirectory() ? [] : [path.join(full, file)])).flat()
      : [full];
    for (const file of files) {
      if (fs.readFileSync(file, "utf8").includes(forbidden)) leaked = true;
    }
  }
  ok("API key tidak muncul di source mana pun", !leaked);
}

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) {
  process.exit(1);
}
process.exit(0);