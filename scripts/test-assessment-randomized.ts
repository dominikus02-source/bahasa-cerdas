/**
 * BC ASSESSMENT ENGINE 2.2 — MONTE CARLO / RANDOM SIMULATION.
 * Unit murni, tanpa DB. Run: npm run test:assessment-randomized
 *
 * Generate 1.000 set evidence acak (variasi skill, difficulty, subskill,
 * accuracy, jumlah bukti), lalu cari:
 *   - NaN / Infinity / division by zero
 *   - nilai di luar rentang
 *   - confidence anomali (HIGH tanpa bukti, LOW dengan bukti banyak)
 *   - mastery anomali (PROFICIENT tanpa bukti)
 *   - placement mustahil
 *   - distribusi output
 *   - performa (avg ms per profile)
 */
import { computeAbilityProfile } from "../lib/diagnostic/ability";
import { SKILL_SUBSKILLS, type Difficulty } from "./fixtures/assessment-archetypes";
import type { AbilityEvidenceItem } from "../lib/diagnostic/ability";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\nBC ASSESSMENT ENGINE 2.2 — RANDOMIZED (MONTE CARLO)\n");

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD", "VERY_HARD"];
const SKILLS = Object.keys(SKILL_SUBSKILLS);
const ROUNDS = 1000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

/** Bangun satu set evidence acak yang deterministik (seed = iterasi). */
function randomEvidenceSet(seed: number): AbilityEvidenceItem[] {
  const rng = mulberry32(seed * 7919 + 13);
  const skillCount = 1 + Math.floor(rng() * 7);
  const chosenSkills = [...SKILLS].sort(() => rng() - 0.5).slice(0, skillCount);
  const items: AbilityEvidenceItem[] = [];
  for (const skill of chosenSkills) {
    const n = 1 + Math.floor(rng() * 40);
    const accuracy = rng();
    const subs = SKILL_SUBSKILLS[skill] ?? [];
    for (let i = 0; i < n; i++) {
      const diff = DIFFICULTIES[Math.floor(rng() * DIFFICULTIES.length)];
      const subskill = subs.length > 0 && rng() > 0.3 ? subs[Math.floor(rng() * subs.length)] : null;
      items.push({ skill, subskill, difficulty: diff, isCorrect: rng() < accuracy });
    }
  }
  return items;
}

// ── Generate + validasi ──
const profiles = [];
const started = performance.now();
let maxMs = 0;
let minMs = Infinity;
for (let i = 0; i < ROUNDS; i++) {
  const t0 = performance.now();
  const profile = computeAbilityProfile(randomEvidenceSet(i));
  const elapsed = performance.now() - t0;
  maxMs = Math.max(maxMs, elapsed);
  minMs = Math.min(minMs, elapsed);
  profiles.push(profile);
}
const totalMs = performance.now() - started;
const avgMs = totalMs / ROUNDS;

check(`1.000 set diproses tanpa error`, profiles.length === ROUNDS);

// ── NaN / Infinity / range ──
let nanCount = 0;
let rangeViolations = 0;
for (const profile of profiles) {
  const json = JSON.stringify(profile);
  if (json.includes("NaN") || json.includes("Infinity") || json.includes("-Infinity")) nanCount++;
  for (const skill of profile.skills) {
    if (skill.accuracy !== null && (skill.accuracy < 0 || skill.accuracy > 1)) rangeViolations++;
    if (skill.weightedAccuracy !== null && (skill.weightedAccuracy < 0 || skill.weightedAccuracy > 1)) rangeViolations++;
    if (skill.subskillCoverage < 0 || skill.subskillCoverage > 1) rangeViolations++;
    if (skill.difficultyCoverage < 0 || skill.difficultyCoverage > 4) rangeViolations++;
  }
  if (profile.coverage.skills < 0 || profile.coverage.skills > 1) rangeViolations++;
  if (profile.coverage.subskills < 0 || profile.coverage.subskills > 1) rangeViolations++;
  if (profile.coverage.difficulties < 0 || profile.coverage.difficulties > 1) rangeViolations++;
}
check("Tidak ada NaN/Infinity di 1.000 profil", nanCount === 0);
check("Tidak ada nilai di luar rentang", rangeViolations === 0);

// ── Confidence anomalies ──
let confidenceAnomaly = 0;
for (const profile of profiles) {
  const totalEvidence = profile.skills.reduce((s, k) => s + k.attempts, 0);
  if (profile.overallConfidence === "HIGH" && totalEvidence < 15) confidenceAnomaly++;
  if (profile.overallConfidence === "NO_DATA" && totalEvidence > 0) confidenceAnomaly++;
}
check("Tidak ada HIGH tanpa bukti cukup (totalEvidence ≥ 15)", confidenceAnomaly === 0);

// ── Mastery anomalies ──
let masteryAnomaly = 0;
for (const profile of profiles) {
  for (const skill of profile.skills) {
    if (skill.masteryState === "PROFICIENT") {
      if (skill.attempts < 10) masteryAnomaly++;
      if (skill.difficultyCoverage < 2) masteryAnomaly++;
      if (skill.subskillCoverage < 0.4) masteryAnomaly++;
    }
  }
}
check("Tidak ada PROFICIENT tanpa bukti/coverage cukup", masteryAnomaly === 0);

// ── Placement impossibility ──
let placementAnomaly = 0;
for (const profile of profiles) {
  if (profile.placement) {
    if (!["DASAR", "MENENGAH", "TINGGI"].includes(profile.placement.band)) placementAnomaly++;
    if (profile.placement.minLevel < 1 || profile.placement.maxLevel > 12) placementAnomaly++;
    if (profile.placement.minLevel > profile.placement.maxLevel) placementAnomaly++;
  }
}
check("Placement selalu valid (band + level range)", placementAnomaly === 0);

// ── Distribution ──
console.log("\n── Distribusi output (1.000 profil) ──");
const confDist = { NO_DATA: 0, LOW: 0, MEDIUM: 0, HIGH: 0 } as Record<string, number>;
const bandDist: Record<string, number> = { DASAR: 0, MENENGAH: 0, TINGGI: 0, "(null)": 0 };
const signalDist: Record<string, number> = {};
for (const profile of profiles) {
  confDist[profile.overallConfidence] = (confDist[profile.overallConfidence] ?? 0) + 1;
  bandDist[profile.placement?.band ?? "(null)"] = (bandDist[profile.placement?.band ?? "(null)"] ?? 0) + 1;
  signalDist[profile.reassessmentSignal] = (signalDist[profile.reassessmentSignal] ?? 0) + 1;
}
console.log(`  Confidence: ${JSON.stringify(confDist)}`);
console.log(`  Placement : ${JSON.stringify(bandDist)}`);
console.log(`  Signal    : ${JSON.stringify(signalDist)}`);
check("Distribusi confidence bervariasi (tidak semua satu nilai)",
  confDist.LOW > 0 && (confDist.MEDIUM > 0 || confDist.HIGH > 0));
check("Semua profil random (dengan bukti) punya placement",
  (bandDist["(null)"] ?? 0) === 0);

// Edge case eksplisit: evidence kosong.
const emptyProfile = computeAbilityProfile([]);
check("Evidence kosong → placement null", emptyProfile.placement === null);
check("Evidence kosong → overallConfidence NO_DATA", emptyProfile.overallConfidence === "NO_DATA");
check("Evidence kosong → signal INSUFFICIENT", emptyProfile.reassessmentSignal === "INSUFFICIENT");
check("Evidence kosong → seluruh skill insufficient", emptyProfile.insufficient.length === 7);

// ── Performance ──
console.log("\n── Performance ──");
console.log(`  avg: ${avgMs.toFixed(3)} ms/profile · min: ${minMs.toFixed(3)} ms · max: ${maxMs.toFixed(3)} ms · total: ${totalMs.toFixed(1)} ms`);
check(`avg < 10ms (target) — aktual ${avgMs.toFixed(3)}ms`, avgMs < 10);

// ── Determinism under repeated runs ──
const setA = randomEvidenceSet(7);
const runA1 = computeAbilityProfile(setA);
const runA2 = computeAbilityProfile(setA);
check("Deterministik: run ulang dengan seed sama → output identik",
  JSON.stringify(runA1) === JSON.stringify(runA2));

console.log(`\n${"=".repeat(50)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
