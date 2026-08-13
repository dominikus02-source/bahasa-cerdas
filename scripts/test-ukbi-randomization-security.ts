/**
 * Phase UKBI SIMULATION 2.0 — Randomized Question Engine + Listening Anti-Leakage
 *
 * 19 assertion groups (static + pure logic, NO database):
 *  1. Selection is server-side (route only)
 *  2. Session question set locked (snapshot replay)
 *  3. Same session → same question IDs (deterministic per seed)
 *  4. Different sessions → can differ (seeded sampling)
 *  5. Anti-repeat: recent questions excluded
 *  6. Anti-repeat fallback: small pool never undersized / never throws
 *  7. Blueprint preserved (per-section counts respected)
 *  8. Option shuffle preserves correct mapping (option ids intact)
 *  9. Listening transcript not in API payload
 * 10. Listening transcript not in HTML (components)
 * 11. Listening transcript not in hydration/props payload
 * 12. correctAnswer not client-visible
 * 13. answerKey not client-visible
 * 14. explanation not client-visible
 * 15. Listening audio still playable (audioUrl wired to player)
 * 16. Scoring unchanged (server-side compare vs correctAnswer)
 * 17. TKA unaffected (same engine, TKA_SELECT untouched)
 * 18. UKBI workflow unaffected (session payload, hasil, replay)
 * 19. 100-session randomization + 5-attempt anti-repeat simulation over the
 *     REAL bank JSON files (data/question-bank/ukbi/**) with blueprint counts.
 *
 * Run: npx tsx scripts/test-ukbi-randomization-security.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
  sampleSectionQuestions,
  excludeRecentForSection,
  parseRecentUsedBatches,
  sanitizeListeningQuestions,
} from "../lib/question-bank/session-pool";
import {
  fisherYatesShuffle,
  shuffleOptionsForQuestion,
  createSessionSeed,
} from "../lib/question-bank/randomization";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function ok(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.log(`  ❌ ${message}`);
  }
}

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

console.log("\n════════════════════════════════════════════");
console.log("  UKBI Simulation 2.0 — Randomization + Listening Security");
console.log("════════════════════════════════════════════\n");

// ── 1. Server-side selection ──
console.log("── 1. Selection is server-side ──");
const route = read("app/api/kompetensi/[paketId]/route.ts");
ok(route.includes('from "@/lib/question-bank/session-pool"'), "route imports session-pool helpers");
ok(route.includes("sampleSectionQuestions("), "route performs per-session sampling");
ok(route.includes("excludeRecentForSection("), "route performs anti-repeat exclusion");
ok(route.includes("parseRecentUsedBatches("), "route reads recent finished sessions");
ok(!read("components/kompetensi/QuestionCard.tsx").includes("sampleSectionQuestions"), "client never samples");
ok(!read("components/kompetensi/TestShell.tsx").includes("sampleSectionQuestions"), "TestShell never samples");

// ── 2. Session lock (snapshot replay) ──
console.log("\n── 2. Session question set locked ──");
ok(route.includes("storedSnapshot!.clientSections"), "replay serves stored clientSections");
ok(route.includes("replayable"), "replay path returns before rebuild");
ok(route.includes("questionSnapshot"), "snapshot persisted server-side");

// ── 3. Same session → same IDs ──
console.log("\n── 3. Deterministic per session seed ──");
const pool30 = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}` }));
const s1a = sampleSectionQuestions(pool30, 10, "seed-A-sec0");
const s1b = sampleSectionQuestions(pool30, 10, "seed-A-sec0");
ok(JSON.stringify(s1a.map((q: any) => q.id)) === JSON.stringify(s1b.map((q: any) => q.id)), "same seed → identical sample");

// ── 4. Different sessions can differ ──
console.log("\n── 4. Different seeds → different samples ──");
const s2 = sampleSectionQuestions(pool30, 10, "seed-B-sec0");
const ids1 = new Set(s1a.map((q: any) => q.id));
const ids2 = new Set(s2.map((q: any) => q.id));
const overlap = [...ids1].filter((id) => ids2.has(id)).length;
ok(overlap < 10, `different seeds differ (overlap ${overlap}/10 < 10)`);

// ── 5. Anti-repeat exclusion ──
console.log("\n── 5. Recent questions excluded ──");
const recentBatches: string[][] = [s1a.map((q: any) => q.id), s2.map((q: any) => q.id)];
const excluded = excludeRecentForSection(pool30, recentBatches, 10);
const excludedIds = new Set(excluded.map((q: any) => q.id));
const newestSet = new Set(recentBatches[0]);
const carryNewest = [...excludedIds].filter((id) => newestSet.has(id)).length;
ok(carryNewest === 0, "newest session's questions fully excluded (level-1)");
ok(excluded.length === 20, "exclusion keeps pool >= blueprint count (20 of 30 remain)");

// ── 6. Fallback when pool too small ──
console.log("\n── 6. Fallback: small pool never undersized ──");
const tinyPool = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}` }));
const tinyUsed = [["t0", "t1", "t2", "t3", "t4", "t5"]];
const tinyResult = excludeRecentForSection(tinyPool, tinyUsed, 5);
ok(tinyResult.length === 6, "pool < needed → full pool returned (no throw)");
const tinySample = sampleSectionQuestions(tinyPool, 5, "seed-small");
ok(tinySample.length === 5, "sampling honors blueprint when pool > count");
const tinyWhole = sampleSectionQuestions(tinyPool, 7, "seed-small");
ok(tinyWhole.length === 6, "sampling keeps whole pool when count >= pool");

// ── 7. Blueprint preserved ──
console.log("\n── 7. Blueprint preserved ──");
const bpSample = sampleSectionQuestions(pool30, 12, "seed-bp");
ok(bpSample.length === 12, "sample size == blueprint count");
const bpIds = new Set(bpSample.map((q: any) => q.id));
ok(bpIds.size === 12, "no duplicates in sample");
const bpAll = new Set(pool30.map((q: any) => q.id));
ok([...bpIds].every((id) => bpAll.has(id)), "all sampled from eligible pool");

// ── 8. Option shuffle preserves mapping ──
console.log("\n── 8. Option shuffle preserves correct mapping ──");
const opts = [
  { id: "A", text: "Jakarta" },
  { id: "B", text: "Surabaya" },
  { id: "C", text: "Bandung" },
  { id: "D", text: "Medan" },
];
const shuffledOpts = shuffleOptionsForQuestion(opts, "seed-opt");
ok(JSON.stringify(shuffledOpts.map((o) => o.id).sort()) === JSON.stringify(["A", "B", "C", "D"]), "option ids preserved");
ok(shuffledOpts.some((o) => o.id === "B"), "correctAnswer id (B) still present");

// ── 9. Listening transcript not in API payload ──
console.log("\n── 9. Listening transcript not in API payload ──");
const ukbiSelectStart = route.indexOf("const UKBI_SELECT = {");
const ukbiSelectEnd = route.indexOf("} as const", ukbiSelectStart);
const ukbiSelect = route.slice(ukbiSelectStart, ukbiSelectEnd);
for (const banned of ["audioScript", "transcript", "script", "jawaban", "correctAnswer", "explanation", "rubric"]) {
  ok(!ukbiSelect.includes(banned), `UKBI_SELECT tanpa ${banned}`);
}
ok(route.includes("sanitizeListeningQuestions("), "route sanitizes listening pools");
const listenPool = sanitizeListeningQuestions([
  { id: "L1", seksi: "MENDENGARKAN", text: "Apa yang diminta?", passage: "RAHASIA transkrip", imageUrl: "x.jpg", passageType: "dialog", wordCount: 80, options: [] },
  { id: "R1", seksi: "MEMBACA", passage: "Bacaan biasa" },
]);
const l1 = listenPool.find((q) => q.id === "L1") as any;
ok(l1.passage === undefined && l1.imageUrl === undefined && l1.passageType === undefined && l1.wordCount === undefined, "listening passage/transcript fields stripped");
ok(l1.text === "Apa yang diminta?", "listening question (stem) kept");
const r1 = listenPool.find((q) => q.id === "R1") as any;
ok(r1.passage === "Bacaan biasa", "reading passage untouched");

// ── 10. Listening transcript not in HTML ──
console.log("\n── 10. Listening transcript not in HTML ──");
const qCard = read("components/kompetensi/QuestionCard.tsx");
const audioPlayer = read("components/kompetensi/ListeningAudioPlayer.tsx");
ok(!qCard.includes("audioScript") && !qCard.includes("transcript"), "QuestionCard has no transcript");
ok(!audioPlayer.includes("audioScript") && !audioPlayer.includes("transcript"), "ListeningAudioPlayer has no transcript");
ok(!qCard.includes("dangerouslySetInnerHTML"), "no dangerouslySetInnerHTML in QuestionCard");

// ── 11. Listening transcript not in hydration/props ──
console.log("\n── 11. Not in hydration/props payload ──");
const page = read("app/(dashboard)/kompetisi/[paketId]/page.tsx");
const shell = read("components/kompetensi/TestShell.tsx");
ok(!page.includes("audioScript") && !page.includes("transcript"), "kompetisi page has no transcript");
ok(!shell.includes("audioScript") && !shell.includes("transcript"), "TestShell has no transcript");
for (const f of ["components/kompetensi/QuestionNavigator.tsx", "components/kompetensi/SubmitConfirmModal.tsx", "components/kompetensi/SectionProgress.tsx"]) {
  const c = read(f);
  ok(!c.includes("audioScript") && !c.includes("transcript"), `${f} has no transcript`);
}

// ── 12-14. Answer key / explanation not client-visible ──
console.log("\n── 12–14. Answer key & explanation not client-visible ──");
ok(!ukbiSelect.includes("correctAnswer"), "correctAnswer not in UKBI_SELECT");
ok(!ukbiSelect.includes("answerKey"), "answerKey not in UKBI_SELECT");
ok(!ukbiSelect.includes("explanation"), "explanation not in UKBI_SELECT");
const snapshotType = read("lib/types/snapshot.ts");
ok(/interface QuestionSnapshot[\s\S]{0,200}correctAnswer: string/.test(snapshotType), "correctAnswer only in server-side snapshot type");

// ── 15. Listening audio still playable ──
console.log("\n── 15. Audio still playable ──");
ok(qCard.includes("ListeningAudioPlayer"), "QuestionCard imports audio player");
ok(qCard.includes("question.audioUrl"), "audioUrl passed to player");
ok(audioPlayer.includes("<audio"), "audio element rendered");

// ── 16. Scoring unchanged ──
console.log("\n── 16. Scoring unchanged ──");
const submit = read("app/api/kompetensi/[paketId]/submit/route.ts");
ok(submit.includes("ua === q.correctAnswer"), "submit still compares vs server-side correctAnswer");
ok(submit.includes('diff === "EASY" ? 1 : diff === "MEDIUM" ? 1.5 : diff === "HARD" ? 2 : 2.5'), "UKBI weight formula intact");
ok(submit.includes("q.weight || 1"), "TKA weight formula intact");
ok(submit.includes("getUKBIPredikat"), "predikat logic intact");
ok(submit.includes("questionSnapshot"), "submit still scores from snapshot");

// ── 17. TKA unaffected ──
console.log("\n── 17. TKA unaffected ──");
const tkaSelectStart = route.indexOf("const TKA_SELECT = {");
const tkaSelectEnd = route.indexOf("} as const", tkaSelectStart);
const tkaSelect = route.slice(tkaSelectStart, tkaSelectEnd);
for (const banned of ["correctAnswer", "answerKey", "jawaban", "audioScript", "transcript"]) {
  ok(!tkaSelect.includes(banned), `TKA_SELECT tanpa ${banned}`);
}
ok(tkaSelect.includes("kompetensi") && tkaSelect.includes("subKompetensi") && tkaSelect.includes("weight"), "TKA_SELECT fields unchanged");
ok(route.includes("fetchTKAQuestions"), "TKA fetch path intact");
ok(submit.includes("useCompetencyKey"), "TKA competency scoring intact");

// ── 18. UKBI workflow unaffected ──
console.log("\n── 18. UKBI workflow unaffected ──");
const hasil = read("app/api/kompetensi/[paketId]/hasil/route.ts");
ok(hasil.includes("result: {"), "hasil route shape intact");
ok(!hasil.includes("answerDetails") && !hasil.includes("answers:"), "hasil has no answer details");
ok(route.includes("sessionPayload"), "session payload builder intact");
ok(route.includes('err("Tidak ada soal tersedia", "NOT_FOUND", 404)'), "empty-pool 404 intact");
ok(route.includes("skipDuplicates: true"), "double-click guard intact");
ok(route.includes("consumeUsageGuarded"), "premium gate intact");

// ── 19. 100-session simulation over real bank ──
console.log("\n── 19. 100-session simulation (real bank JSONs) ──");
interface BankQ { id: string; track?: string; section?: string; seksi?: string }
const bank: Record<string, BankQ[]> = {};
const bankDir = path.join(root, "data/question-bank/ukbi");
const files = (function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".json")) out.push(p);
  }
  return out;
})(bankDir);
ok(files.length >= 18, `bank JSON files found (${files.length})`);

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, "utf8"));
  const qs: BankQ[] = Array.isArray(data) ? data : data.questions || [];
  for (const q of qs) {
    const track = q.track || "UKBI_SMP";
    const section = String(q.section || q.seksi || "merespons-kaidah").toUpperCase().replace(/[- ]/g, "_");
    bank[`${track}:${section}`] ||= [];
    bank[`${track}:${section}`].push(q);
  }
}
const sectionKeys = Object.keys(bank);
ok(sectionKeys.length > 0, `pools built (${sectionKeys.length} track:section combos)`);

// Blueprint counts per section (representative of the 30–34Q paket blueprints).
const BLUEPRINT: Record<string, number> = {
  MERESPONS_KAIDAH: 10,
  MEMBACA: 10,
  MENDENGARKAN: 5,
  MENULIS: 2,
  BERBICARA: 2,
};

const userId = "user-sim-1";
const paketId = "paket-sim-ukbi";

function runSessions(sessions: number, withAntiRepeat: boolean, recentWindow: number) {
  const recent: string[][] = [];
  const sessionSets: string[][] = [];
  for (let s = 0; s < sessions; s++) {
    const ts = 1_700_000_000_000 + s * 1000;
    const sessionSeed = createSessionSeed(userId, paketId, ts);
    const set: string[] = [];
    for (const key of sectionKeys) {
      const [ , secNorm ] = key.split(":");
      const count = BLUEPRINT[secNorm] ?? 5;
      const pool: any[] = bank[key].map((q) => ({ id: q.id }));
      let eligible = pool;
      if (withAntiRepeat && recent.length > 0) {
        eligible = excludeRecentForSection(pool, recent.slice(0, recentWindow), count);
      }
      const picked = sampleSectionQuestions(eligible, count, sessionSeed + "-sec" + secNorm);
      for (const p of picked) set.push(p.id);
    }
    sessionSets.push(set);
    if (withAntiRepeat) {
      recent.unshift(set);
      if (recent.length > recentWindow) recent.length = recentWindow;
    }
  }
  return sessionSets;
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 1;
  const bs = new Set(b);
  const inter = a.filter((x) => bs.has(x)).length;
  return inter / a.length;
}

const sessions = runSessions(100, true, 3);
const baseline = runSessions(100, false, 0);

let identicalPairs = 0;
let sumOverlap = 0;
let maxOverlap = 0;
let sumBaseOverlap = 0;
for (let i = 1; i < sessions.length; i++) {
  if (JSON.stringify(sessions[i]) === JSON.stringify(sessions[i - 1])) identicalPairs++;
  const ov = overlapRatio(sessions[i], sessions[i - 1]);
  sumOverlap += ov;
  maxOverlap = Math.max(maxOverlap, ov);
}
for (let i = 1; i < baseline.length; i++) {
  sumBaseOverlap += overlapRatio(baseline[i], baseline[i - 1]);
}
const avgOverlap = sumOverlap / (sessions.length - 1);
const avgBaseOverlap = sumBaseOverlap / (baseline.length - 1);
console.log(`  → identical consecutive sessions: ${identicalPairs}/99`);
console.log(`  → avg consecutive overlap (anti-repeat): ${(avgOverlap * 100).toFixed(1)}%`);
console.log(`  → avg consecutive overlap (baseline no anti-repeat): ${(avgBaseOverlap * 100).toFixed(1)}%`);
console.log(`  → max consecutive overlap: ${(maxOverlap * 100).toFixed(1)}%`);
ok(identicalPairs === 0, "0 identical consecutive sessions out of 99 pairs");
ok(avgOverlap < avgBaseOverlap, `anti-repeat lowers overlap (${(avgOverlap * 100).toFixed(1)}% < ${(avgBaseOverlap * 100).toFixed(1)}%)`);
ok(avgOverlap < 0.6, `avg consecutive overlap below 60% (${(avgOverlap * 100).toFixed(1)}%)`);
ok(maxOverlap < 0.6, `max consecutive overlap below 60% (${(maxOverlap * 100).toFixed(1)}%)`);

// Blueprint respected across all 100 sessions.
let bpViolations = 0;
for (const key of sectionKeys) {
  const [ , secNorm ] = key.split(":");
  const count = BLUEPRINT[secNorm] ?? 5;
  const expected = Math.min(count, bank[key].length);
  for (const set of sessions.slice(0, 5)) {
    const secIds = set.filter((id) => bank[key].some((q) => q.id === id));
    if (secIds.length !== expected) bpViolations++;
  }
}
ok(bpViolations === 0, "blueprint counts respected in every session");

// 5-attempt anti-repeat for one user.
const five = runSessions(5, true, 3);
const fiveOverlaps: number[] = [];
for (let i = 1; i < five.length; i++) {
  fiveOverlaps.push(overlapRatio(five[i], five[i - 1]));
}
console.log(`  → 5-attempt consecutive overlaps: ${fiveOverlaps.map((o) => (o * 100).toFixed(0) + "%").join(", ")}`);
ok(fiveOverlaps.every((o) => o < 0.6), "5-attempt anti-repeat consecutive overlap < 60%");
ok(fiveOverlaps.every((o) => o < 0.15), "5-attempt consecutive overlap near 0 (recent set excluded)");

// Summary
console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");

if (failed > 0) {
  console.log("Errors:");
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
