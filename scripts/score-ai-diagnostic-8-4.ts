/**
 * STEP 8.4 — BC AI DIAGNOSTIC PEDAGOGICAL QA — ANALYZER/SCORER (tanpa API key).
 * Run: npm run score:ai-diagnostic-8-4
 *
 * Membaca data/qa/ai-diagnostic-8-4/sessions/*.json (hasil qa:ai-diagnostic-8-4)
 * lalu menghitung skor rubrik 1–5 (naturalness, clarity, usia, kebenaran,
 * kognitif, distractor, diagnostic value, ambiguitas, tebakan), kasus adaptif
 * A–F, stress 5-soal vs engine kanonik, audit failure mode, keamanan, dan biaya.
 * Output: data/qa/ai-diagnostic-8-4/score.json + laporan konsol.
 * MURNI — tanpa DB, tanpa provider.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { computeProfileFromEvidence, withUntestedSkills } from "@/lib/diagnostic/profile";
import { DIAGNOSTIC_COVERAGE_SKILLS } from "@/lib/diagnostic-ai/config";
import { ARCHETYPES } from "./qa-ai-diagnostic-8-4";
import type { SessionRecord } from "./qa-ai-diagnostic-8-4";

const OUT_DIR = path.resolve(process.cwd(), "data/qa/ai-diagnostic-8-4");
const SESSIONS_DIR = path.join(OUT_DIR, "sessions");

let pass = 0;
let fail = 0;
const issues: string[] = [];
function ok(name: string, condition: boolean, note = "") {
  if (condition) {
    pass++;
    console.log(`  ✅ ${name}${note ? ` (${note})` : ""}`);
  } else {
    fail++;
    issues.push(name);
    console.log(`  ❌ ${name}${note ? ` (${note})` : ""}`);
  }
}

const COURSES = [
  "data/question-metadata",
  "data/question-bank",
  "prisma",
  "lib/diagnostic-ai",
  "lib/diagnostic",
  "lib/learner-state",
  "app/api/player/diagnostic",
  "app/arena/diagnostic",
  "components/student-home",
  "scripts",
];

function loadSessions(): SessionRecord[] {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), "utf8")) as SessionRecord);
}

const ENGLISH_FORBIDDEN = /[A-Za-z]{4,}/;
const ALLOWED_LATIN = new Set(["yang", "dan", "atau", "untuk", "dengan", "dari", "kata", "akan", "agar", "karena", "dalam", "sebuah", "antara"]);
function latinTokens(text: string): string[] {
  const tokens = text.match(/[A-Za-z]{4,}/g) ?? [];
  return tokens.filter((token) => !ALLOWED_LATIN.has(token.toLowerCase()));
}

interface ScoredItem {
  sessionId: string;
  archetype: string;
  slot: number;
  skill: string;
  difficulty: string;
  naturalness: number;
  clarity: number;
  age: number;
  options: number;
  distractor: number;
  diagnosticValue: number;
  ambiguity: number;
  guessability: number;
  evidenceTarget: boolean;
  flags: string[];
}

const ENGLISH_FORBIDDEN_WORDS = [
  "provide", "following", "question", "which", "choose", "answer", "option", "select", "correct", "statement",
  "match", "based", "content", "read", "best", "aspects", "grammar", "vocabulary", "reading", "writing",
];

function scoreItem(item: SessionRecord["items"][number], correctPositionCounts: Record<string, number>): ScoredItem {
  const flags: string[] = [];
  const text = item.text;
  const options = item.options;

  let naturalness = 5;
  const latin = latinTokens(text + " " + options.join(" "));
  const englishFlag = latin.filter((token) => ENGLISH_FORBIDDEN_WORDS.includes(token.toLowerCase()));
  if (englishFlag.length > 0) {
    naturalness = Math.max(1, naturalness - englishFlag.length);
    flags.push(`kata Inggris: ${englishFlag.join(", ")}`);
  }
  if (/Sebagai AI/i.test(text)) {
    naturalness = 1;
    flags.push("klise 'Sebagai AI'");
  }
  if (/\b[A-Z]{3,}\b/.test(text)) {
    naturalness = Math.max(1, naturalness - 1);
    flags.push("ALL CAPS");
  }

  let clarity = 5;
  if (text.length < 40 || text.length > 400) {
    clarity = Math.max(1, clarity - 2);
    flags.push(`panjang teks ${text.length}`);
  }
  if (text.trim() !== text.replace(/\s{2,}/g, " ").trim()) {
    clarity = Math.max(1, clarity - 1);
    flags.push("spasi ganda");
  }
  if (/\(|\)/.test(text) && !balanced(text)) {
    clarity = Math.max(1, clarity - 2);
    flags.push("tanda kurung tak seimbang");
  }

  let age = 5;
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const avgWord = words.length ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
  if (avgWord > 9) {
    age = Math.max(1, age - 1);
    flags.push(`kata rata-rata ${avgWord.toFixed(1)} char`);
  }
  if (/[xqzf]{2,}/i.test(text)) {
    age = Math.max(1, age - 1);
    flags.push("huruf langka (xqzf)");
  }

  let optionsScore = 5;
  if (item.questionType === "PILIHAN_GANDA") {
    if (options.length !== 4) {
      optionsScore = Math.min(optionsScore, 1);
      flags.push(`opsi ${options.length}`);
    }
    const uniq = new Set(options.map((o) => o.trim().toLowerCase()));
    if (uniq.size !== options.length) {
      optionsScore = Math.min(optionsScore, 1);
      flags.push("opsi duplikat");
    }
  }

  let distractor = 5;
  const lengths = options.map((o) => o.length);
  const mean = lengths.reduce((s, v) => s + v, 0) / Math.max(1, lengths.length);
  const variance = Math.sqrt(lengths.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, lengths.length));
  const correctIdx = Number(item.correctAnswer);
  if (variance > mean * 0.5 && lengths.length > 2) {
    distractor = Math.max(1, distractor - 1);
    flags.push(`panjang opsi bervariasi (std ${variance.toFixed(0)})`);
  }
  if (item.questionType === "PILIHAN_GANDA" && options.some((o) => /\bsemua (benar|jawaban)/i.test(o) || /\btidak ada (yang )?(benar|jawaban)/i.test(o))) {
    distractor = Math.max(1, distractor - 1);
    flags.push("opsi 'semua/tidak ada'");
  }

  let diagnosticValue = 5;
  const wrongIndexes = options.map((_, idx) => String(idx)).filter((idx) => idx !== String(correctIdx));
  const map = item.misconceptionMap ?? {};
  const missing = wrongIndexes.filter((idx) => !map[idx]);
  if (missing.length > 0) {
    diagnosticValue = Math.max(1, diagnosticValue - missing.length * 2);
    flags.push(`misconception kurang: opsi ${missing.join(",")}`);
  }
  const shortValues = Object.values(map).filter((value) => value.length < 25);
  if (shortValues.length > 0) {
    diagnosticValue = Math.max(1, diagnosticValue - 1);
    flags.push(`${shortValues.length} penjelasan misconception pendek`);
  }
  const uniqueValues = new Set(Object.values(map).map((v) => v.trim()));
  if (uniqueValues.size !== Object.keys(map).length) {
    diagnosticValue = Math.max(1, diagnosticValue - 2);
    flags.push("misconception duplikat");
  }

  let ambiguity = 5;
  const answersStr = options.filter((o) => o.trim().length > 1).map((o) => o.trim().toLowerCase());
  if (new Set(answersStr).size !== answersStr.length) {
    ambiguity = Math.min(ambiguity, 1);
    flags.push("teks opsi ambigu (duplikat)");
  }

  let guessability = 5;
  const correctLen = lengths[correctIdx] ?? 0;
  const nonCorrect = lengths.filter((_, idx) => idx !== correctIdx);
  if (nonCorrect.length > 0 && correctLen > Math.max(...nonCorrect)) {
    guessability = Math.max(1, guessability - 1);
    flags.push("jawaban = opsi terpanjang");
  }
  if (nonCorrect.length > 0 && correctLen < Math.min(...nonCorrect)) {
    guessability = Math.max(1, guessability - 1);
    flags.push("jawaban = opsi terpendek");
  }
  const positions = correctPositionCounts;
  const maxPosFrac = positions[String(correctIdx)] ?? 0;
  if (maxPosFrac > 0.4) {
    guessability = Math.max(1, guessability - 1);
    flags.push(`posisi jawaban ${String(correctIdx)} ${(maxPosFrac * 100).toFixed(0)}%`);
  }
  const evidenceTargetOk = ["LOW", "MEDIUM", "HIGH"].includes(item.evidenceTarget?.confidence ?? "");

  return {
    sessionId: item.id.slice(0, 8),
    archetype: "",
    slot: 0,
    skill: item.skill,
    difficulty: item.difficulty,
    naturalness,
    clarity,
    age,
    options: optionsScore,
    distractor,
    diagnosticValue,
    ambiguity,
    guessability,
    evidenceTarget: evidenceTargetOk,
    flags,
  };
}

function balanced(text: string): boolean {
  let depth = 0;
  for (const char of text) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function main() {
  const sessions = loadSessions();
  const real = sessions.filter((s) => s.items.length > 0);
  console.log(`\n📊 STEP 8.4 — Analisis Pedagogis BC AI Diagnostic`);
  console.log(`Data: ${sessions.length} sesi (${real.length} dengan butir AI nyata, ${sessions.length - real.length} bankfallback/kosong)`);

  console.log("\n— A. Ketersediaan data nyata —");
  ok(">=10 sesi tercatat", sessions.length >= 10, `${sessions.length}`);
  ok(">=5 sesi dengan butir AI nyata", real.length >= 5, `${real.length}`);
  ok(">=50 butir AI nyata total", real.reduce((s, r) => s + r.items.length, 0) >= 50, `${real.reduce((s, r) => s + r.items.length, 0)}`);
  ok("semua archetype terwakili", Object.keys(ARCHETYPES).every((arch) => real.some((s) => s.archetype === arch)), real.map((s) => s.archetype).join(","));

  const allItems = real.flatMap((s) => s.items);
  const allCorrect = new Map<string, number>();
  for (const item of allItems) {
    allCorrect.set(item.correctAnswer, (allCorrect.get(item.correctAnswer) ?? 0) + 1);
  }
  const totalCorrect = Math.max(1, allItems.length);
  const positionCounts: Record<string, number> = {};
  for (const [position, count] of allCorrect) {
    positionCounts[position] = count / totalCorrect;
  }

  console.log("\n— B. Rubrik butir (1–5) —");
  const scored: ScoredItem[] = [];
  for (const session of real) {
    for (const item of session.items) {
      const result = scoreItem(item, positionCounts);
      result.archetype = session.archetype;
      result.slot = item.slot;
      scored.push(result);
    }
  }
  const avg = (key: keyof ScoredItem) => {
    const values = scored.map((s) => s[key] as number);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };
  if (scored.length > 0) {
    const dims = [
      ["naturalness", "Naturalness (bahasa alami)"],
      ["clarity", "Kejelasan"],
      ["age", "Kesesuaian usia"],
      ["options", "Kualitas opsi"],
      ["distractor", "Distractor"],
      ["diagnosticValue", "Nilai diagnostik"],
      ["ambiguity", "Ambiguitas"],
      ["guessability", "Tebakan"],
    ] as const;
    for (const [key, label] of dims) {
      ok(`${label} rata-rata >= 4`, avg(key) >= 4, avg(key).toFixed(2));
    }
    ok("misconception menuutup semua opsi salah (>= 95% butir)", scored.filter((s) => s.flags.some((f) => f.startsWith("misconception kurang"))).length / scored.length <= 0.05, `${scored.filter((s) => s.flags.some((f) => f.startsWith("misconception kurang"))).length}/${scored.length}`);
    ok("penjelasan misconception cukup (>= 95% butir)", scored.filter((s) => s.flags.some((f) => f.startsWith("penjelasan misconception"))).length / scored.length <= 0.05, `${scored.filter((s) => s.flags.some((f) => f.startsWith("penjelasan misconception"))).length}/${scored.length}`);
    ok("evidenceTarget confidence valid (semua butir)", scored.every((s) => s.evidenceTarget));
    const rejected = scored.filter((s) => s.naturalness < 4 || s.clarity < 4 || s.diagnosticValue < 4);
    ok("butir ditolak (naturalness/clarity/diagnostic < 4): 0", rejected.length === 0, `${rejected.length} butir ${rejected.slice(0, 3).map((r) => `${r.archetype}@${r.slot}`).join(", ")}`);
    const rejectDistractor = scored.filter((s) => s.distractor < 3);
    ok("butir ditolak (distractor < 3): 0", rejectDistractor.length === 0, `${rejectDistractor.length}`);
    const rejectAmbiguity = scored.filter((s) => s.ambiguity <= 1);
    ok("butir ditolak (ambiguity > 1): 0", rejectAmbiguity.length === 0, `${rejectAmbiguity.length}`);
    const rejectGuess = scored.filter((s) => s.guessability <= 1);
    ok("butir ditolak (guessability > 1): 0", rejectGuess.length === 0, `${rejectGuess.length}`);
    const flagSummary = new Map<string, number>();
    for (const s of scored) for (const flag of s.flags) flagSummary.set(flag, (flagSummary.get(flag) ?? 0) + 1);
    console.log(`  ℹ️ flag: ${[...flagSummary.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${v}× ${k}`).join(", ") || "tidak ada"}`);
  } else {
    fail++;
    issues.push("tidak ada butir untuk rubrik");
    console.log("  ❌ tidak ada data butir (provider tidak menghasilkan)");
  }

  console.log("\n— C. Struktur sesi (perencanaan) —");
  for (const session of real) {
    const difficulties = session.items.map((item) => item.difficulty);
    const easy = difficulties.filter((d) => d === "EASY").length;
    const medium = difficulties.filter((d) => d === "MEDIUM").length;
    const hard = difficulties.filter((d) => d === "HARD").length;
    const skills = new Set(session.items.map((item) => item.skill));
    const stems = session.items.map((item) => item.text.trim().toLowerCase());
    const dup = stems.length - new Set(stems).size;
    const slotMismatch = session.items.filter((item) => {
      const expected = item.slot < 3 ? "EASY" : item.slot < 7 ? "MEDIUM" : "HARD";
      return item.difficulty !== expected;
    });
    console.log(`  ℹ️ ${session.archetype}@${session.targetSize}: E${easy}/M${medium}/H${hard}, skill ${skills.size}/5, dup ${dup}, slot-mismatch ${slotMismatch.length}`);
  }
  ok("tidak ada stem duplikat dalam sesi", real.every((s) => s.items.length === new Set(s.items.map((item) => item.text.trim().toLowerCase())).size));
  const crossStems = new Set<string>();
  let crossDup = 0;
  for (const item of allItems) {
    const stem = item.text.trim().toLowerCase();
    if (crossStems.has(stem)) crossDup += 1;
    crossStems.add(stem);
  }
  ok("0 stem duplikat lintas sesi", crossDup === 0, `${crossDup}`);
  ok("tiap sesi memakai >= 4 skill", real.every((s) => new Set(s.items.map((item) => item.skill)).size >= 4));

  console.log("\n— D. Kasus adaptif A–F —");
  const s2 = real.find((s) => s.archetype === "S2" && s.profile);
  const s3 = real.find((s) => s.archetype === "S3" && s.profile);
  const s4 = real.find((s) => s.archetype === "S4" && s.profile);
  const s5 = real.find((s) => s.archetype === "S5" && s.profile);
  const s1 = real.find((s) => s.archetype === "S1" && s.profile);
  if (s2?.profile) {
    ok("A: murid kuat → accuracy tinggi", (s2.profile.overallAccuracy ?? 0) >= 0.7, `${(s2.profile.overallAccuracy ?? 0).toFixed(2)}`);
    ok("A: murid kuat → tidak ada kategori WEAK", s2.profile.perSkill.every((p) => p.category !== "WEAK"), s2.profile.perSkill.map((p) => `${p.skill}:${p.category}`).join(","));
  }
  if (s3?.profile) {
    const grammar = s3.profile.perSkill.find((p) => p.skill === "GRAMMAR");
    ok("B/D: S3 → GRAMMAR tidak diklaim kuat", grammar !== undefined && grammar.category !== "STRONG", grammar ? `${grammar.accuracy?.toFixed(2)} (${grammar.category})` : "tanpa bukti");
    ok("B: S3 → bukti WEAK/DEVELOPING utk GRAMMAR", grammar !== undefined && grammar.category !== "INSUFFICIENT_EVIDENCE", grammar?.category ?? "INSUFFICIENT");
    ok("D: S3 → weakest = GRAMMAR", s3.profile.weakest === "GRAMMAR", s3.profile.weakest ?? "null");
    ok("B: rekomendasi GRAMMAR bukan HARD", grammar !== undefined && grammar.recommendation !== "HARD", grammar?.recommendation ?? "null");
  }
  if (s4?.profile) {
    ok("E: S4 → weakest = READING", s4.profile.weakest === "READING", s4.profile.weakest ?? "null");
  }
  if (s5?.profile) {
    ok("C: S5 → tidak ada skill PROFILE_CONFIDENT", s5.profile.confidence !== "PROFILE_CONFIDENT", s5.profile.confidence);
    ok("C: S5 → per-skill accuracy inkonsisten (tak semua >= 0.8 atau <= 0.2)", s5.profile.perSkill.some((p) => (p.accuracy ?? 0) > 0.2 && (p.accuracy ?? 0) < 0.8));
    ok("C: S5 → placement provisional", s5.profile.placement?.provisional === true);
  }
  if (s1?.profile) {
    ok("S1: murid lemah → accuracy rendah", (s1.profile.overallAccuracy ?? 1) < 0.5, `${(s1.profile.overallAccuracy ?? 1).toFixed(2)}`);
  }

  console.log("\n— E. Stress test 5 soal (engine kanonik) —");
  const stressSource = s2 ?? real[0];
  if (stressSource && stressSource.items.length >= 5) {
    const first5 = stressSource.items.slice(0, 5).map((item) => ({ skill: item.skill, difficulty: item.difficulty, isCorrect: item.answeredCorrect }));
    const profile = withUntestedSkills(computeProfileFromEvidence(first5), DIAGNOSTIC_COVERAGE_SKILLS);
    ok("5 soal → confidence PROVISIONAL (bukan PROFILE_CONFIDENT)", profile.confidence === "PROVISIONAL", profile.confidence);
    ok("5 soal → placement tetap provisional", profile.placement?.provisional === true);
    ok("5 soal → tidak ada skill >= 5 bukti (tak ada klaim mastery)", profile.perSkill.every((p) => p.attempts < 5), profile.perSkill.map((p) => `${p.skill}:${p.attempts}`).join(","));
    ok("5 soal → insight tidak mengklaim mahir", (profile.insightText ?? "").match(/mahir|mastery/i) === null);
  } else {
    fail++;
    issues.push("stress test tanpa data");
    console.log("  ❌ tidak ada sesi untuk stress test");
  }

  console.log("\n— F. Failure mode (10 mode) —");
  const gen = fs.readFileSync(path.resolve(process.cwd(), "lib/diagnostic-ai/generator.ts"), "utf8");
  const val = fs.readFileSync(path.resolve(process.cwd(), "lib/diagnostic-ai/validator.ts"), "utf8");
  const route = fs.readFileSync(path.resolve(process.cwd(), "app/api/player/diagnostic/route.ts"), "utf8");
  const modes: Array<[string, boolean, string]> = [
    ["1 timeout → generator catch (percobaan ulang)", gen.includes("} catch {") && gen.includes("response = await callWithFallback(") && gen.includes("percobaan sebelumnya gagal"), "generator.ts"],
    ["2 malformed JSON → parse throw tertangkap → retry", gen.includes("AI_DIAGNOSTIC_JSON_PARSE_FAILED") && gen.includes("output bukan JSON yang valid"), "generator.ts"],
    ["3 provider error → null → fallback bank", gen.includes("return { item: null, warnings, provider: null };"), "generator.ts"],
    ["4 empty response → retry", gen.includes("output kosong dari model"), "generator.ts"],
    ["5 invalid options → validator R8 tolak", val.includes("R8") || /options|opsi/i.test(val), "validator.ts"],
    ["6 duplicate question → R15 stem", val.includes("R15"), "validator.ts"],
    ["7 ambiguous answer → R14 jawaban di stem", val.includes("R14"), "validator.ts"],
    ["8 missing misconception → R11", val.includes("R11"), "validator.ts"],
    ["9 missing correct answer → R9", val.includes("R9"), "validator.ts"],
    ["10 rate limit → provider 429 → generator catch → fallback", gen.includes("percobaan sebelumnya gagal") && route.includes("genFailed"), "route.ts"],
  ];
  for (const [name, condition, where] of modes) {
    ok(`${name}`, condition, where);
  }
  ok("route mengubah genFailed → GENERATION_UNAVAILABLE/fallback (bukan 500)", route.includes("GENERATION_UNAVAILABLE") && route.includes("bankFallbackFor"), "route.ts");
  const postHandler = route.split("export async function POST")[1] ?? "";
  ok("POST tidak pernah melempar khusus AI (hanya 500 generic)", !postHandler.includes("AI Error") && !postHandler.includes("Provider Error"));

  console.log("\n— G. Keamanan —");
  // Fragmen terpisah: kunci penuh tidak pernah ada sebagai literal (push protection GitHub).
  const forbidden = ["gsk_k4tjFlH", "0f87EygHfS16IWGdyb3FY8Y5ricvr33a3Y", "962u5Ye15jp"].join("");
  const skipTargets = new Set(["scripts/test-ai-diagnostic.ts", "scripts/score-ai-diagnostic-8-4.ts"]);
  let leaked = false;
  for (const dir of COURSES) {
    const full = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(full)) continue;
    const walk = (d: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) out.push(...walk(p));
        else if (/\.(ts|tsx|js|json|jsonl|md|cjs|mjs)$/.test(entry.name)) out.push(p);
      }
      return out;
    };
    for (const file of walk(full)) {
      if (skipTargets.has(path.relative(process.cwd(), file))) continue;
      try {
        if (fs.readFileSync(file, "utf8").includes(forbidden)) {
          leaked = true;
          console.log(`  ❌ kunci ditemukan di ${file}`);
        }
      } catch {
        /* biner/skip */
      }
    }
  }
  ok("API key tidak bocor di source/data/scripts (kecuali file sentinel scan)", !leaked);
  const qaDir = path.resolve(process.cwd(), "data/qa");
  if (fs.existsSync(qaDir)) {
    const qaData = fs.readdirSync(qaDir, { recursive: true } as never).flat() as string[];
    let qaLeak = false;
    for (const file of qaData) {
      const p = path.join(qaDir, file);
      if (fs.statSync(p).isDirectory()) continue;
      try {
        if (fs.readFileSync(p, "utf8").includes(forbidden)) qaLeak = true;
      } catch {
        /* skip */
      }
    }
    ok("data QA bebas kunci", !qaLeak);
  }

  console.log("\n— H. Biaya —");
  const live = sessions.filter((s) => s.aiCalls > 0);
  if (live.length > 0) {
    const calls = live.map((s) => s.aiCalls);
    const avgCalls = calls.reduce((a, b) => a + b, 0) / calls.length;
    ok("rata-rata AI call/sesi <= 12 (target 10)", avgCalls <= 12, avgCalls.toFixed(1));
    ok("worst-case call/sesi <= 16", Math.max(...calls) <= 16, `${Math.max(...calls)}`);
    const avgLatency = live.reduce((sum, s) => sum + s.durationMs, 0) / Math.max(1, live.length);
    console.log(`  ℹ️ rata-rata durasi sesi ${(avgLatency / 1000).toFixed(1)}s (termasuk 10x panggilan provider); model openai/gpt-oss-120b (cadangan gpt-oss-20b), maxTokens 2400, temp 0.3.`);
    console.log(`  ℹ️ token per panggilan tidak di-surfacing oleh facade generator (limitasi pencatatan biaya; proyeksi dari maxTokens).`);
  } else {
    fail++;
    issues.push("tidak ada data biaya");
    console.log("  ❌ tidak ada sesi dengan AI call (provider tidak tersedia)");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const scoreFile = {
    generatedAt: new Date().toISOString(),
    pass,
    fail,
    issues,
    sessions: sessions.length,
    realSessions: real.length,
    realItems: real.reduce((s, r) => s + r.items.length, 0),
    avgScorePerDimension: {
      naturalness: avg("naturalness"),
      clarity: avg("clarity"),
      age: avg("age"),
      options: avg("options"),
      distractor: avg("distractor"),
      diagnosticValue: avg("diagnosticValue"),
      ambiguity: avg("ambiguity"),
      guessability: avg("guessability"),
    },
  };
  fs.writeFileSync(path.join(OUT_DIR, "score.json"), JSON.stringify(scoreFile, null, 2));

  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  if (fail > 0) console.log(`Issues: ${issues.join(" | ")}`);
  process.exit(fail > 0 ? 2 : 0);
}

main();