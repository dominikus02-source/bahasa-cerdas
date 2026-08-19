/**
 * STEP 8.4.1 — BC AI DIAGNOSTIC PEDAGOGICAL QA — PROVIDER-RESILIENT RUNNER
 * Run: npx tsx scripts/qa-ai-diagnostic-8-4-1.ts [--dry-run] [--sessions N]
 *
 * Provider strategy: Groq openai/gpt-oss-120b with 3s pacing (~20 RPM).
 * 10 archetypes × 1 session each = 10 sessions × 10 items = 100 items target.
 * Resume-capable: re-run safely, skips completed sessions.
 * Output: data/qa/ai-diagnostic-8-4/sessions/session-{ARCH}-1.json (shared with 8.4)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "crypto";

import { generateAiDiagnosticQuestion } from "@/lib/diagnostic-ai/generator";
import { buildInitialState, nextPlanForSlot, summarizeSessionEvidence } from "@/lib/diagnostic-ai/controller";
import { aiDiagnosticEnabled, DIAGNOSTIC_COVERAGE_SKILLS } from "@/lib/diagnostic-ai/config";
import type { AiDiagnosticItem, AiSessionState } from "@/lib/diagnostic-ai/types";
import { computeProfileFromEvidence, withUntestedSkills } from "@/lib/diagnostic/profile";
import type { DiagnosticEvidenceDetail } from "@/lib/diagnostic/types";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

export const QA_OUT_DIR = path.resolve(process.cwd(), "data/qa/ai-diagnostic-8-4");
const SESSIONS_DIR = path.join(QA_OUT_DIR, "sessions");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ── Pacing & Backoff ─────────────────────────────────────────────────────── */
const PACE_MS = 3_000;         // 3s between successful calls (~20 RPM)
const COOLDOWN_429_MS = 60_000; // 60s cooldown after 429 (Groq free tier token quota)
const MAX_429_RETRIES = 3;

/* ── Session Record ───────────────────────────────────────────────────────── */
export interface SessionRecord {
  sessionId: string;
  archetype: string;
  targetSize: number;
  startedAt: string;
  durationMs: number;
  aiCalls: number;
  providerStats: Record<string, number>;
  items: Array<{
    id: string;
    slot: number;
    text: string;
    options: string[];
    questionType: AiDiagnosticItem["questionType"];
    correctAnswer: string;
    skill: string;
    subskill: string | null;
    difficulty: string;
    cognitiveTarget: string | null;
    topic: string | null;
    misconceptionMap: Record<string, string>;
    evidenceTarget: { skill: string; confidence: string };
    diagnosticRationale: string;
    explanation: string;
    provider: string | null;
    warnings: string[];
    answeredCorrect: boolean;
    selected: string;
  }>;
  profile: ReturnType<typeof computeProfileFromEvidence> | null;
  bankFallbackNeeded: boolean;
  anyGenerationFailed: boolean;
  slot0Warnings: string[];
}

/* ── RNG (deterministic) ──────────────────────────────────────────────────── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Archetypes (10 total) ────────────────────────────────────────────────── *
 * Each archetype defines a DIFFERENT answer pattern for testing the adaptive  *
 * engine. Pseudorandom via seeded RNG for reproducibility.                   */
const P_BY_DIFF: Record<string, number> = { EASY: 0.3, MEDIUM: 0.18, HARD: 0.08 };
const P_BY_DIFF_STRONG: Record<string, number> = { EASY: 1.0, MEDIUM: 0.95, HARD: 0.9 };
const P_READING_STRONG: Record<string, number> = { READING: 0.9, WRITING: 0.65, VOCABULARY: 0.6, GRAMMAR: 0.3, LITERATURE: 0.65 };
const P_GRAMMAR_STRONG: Record<string, number> = { READING: 0.3, WRITING: 0.7, VOCABULARY: 0.6, GRAMMAR: 0.9, LITERATURE: 0.6 };
const P_VOCAB_STRONG: Record<string, number> = { READING: 0.5, WRITING: 0.5, VOCABULARY: 0.95, GRAMMAR: 0.4, LITERATURE: 0.5 };
const P_EASY_ONLY: Record<string, number> = { EASY: 0.9, MEDIUM: 0.15, HARD: 0.05 };

export type ArchetypeAnswer = (item: AiDiagnosticItem, slot: number, rng: () => number) => boolean;

export const ARCHETYPES: Record<string, { label: string; answer: ArchetypeAnswer }> = {
  /* A. Weak Overall */
  S1: {
    label: "S1 Pemula (banyak salah, EASY sekalipun)",
    answer: (item, _slot, rng) => rng() < (P_BY_DIFF[item.difficulty] ?? 0.2),
  },
  /* B. Strong Overall */
  S2: {
    label: "S2 Murid kuat (hampir semua benar)",
    answer: (item, _slot, rng) => rng() < (P_BY_DIFF_STRONG[item.difficulty] ?? 0.9),
  },
  /* C. Strong Reading / Weak Grammar */
  S3: {
    label: "S3 Membaca kuat / Tata Bahasa lemah",
    answer: (item, _slot, rng) => rng() < (P_READING_STRONG[item.skill] ?? 0.5),
  },
  /* D. Weak Reading / Strong Grammar */
  S4: {
    label: "S4 Membaca lemah / Tata Bahasa kuat",
    answer: (item, _slot, rng) => rng() < (P_GRAMMAR_STRONG[item.skill] ?? 0.5),
  },
  /* E. High Accuracy / Low Coverage (all correct, narrow skill) */
  S5: {
    label: "S5 Inkonsisten (benar-salah berselang)",
    answer: (_item, slot, _rng) => slot % 2 === 0,
  },
  /* F. Low Accuracy / Broad Coverage */
  S6: {
    label: "S6 Kosakata kuat / Sastra lemah",
    answer: (item, _slot, rng) => rng() < (P_VOCAB_STRONG[item.skill] ?? 0.5),
  },
  /* G. Contradictory Evidence (mixed signals per skill) */
  S7: {
    label: "S7 Contradictory (benar EASY, salah HARD, berulang)",
    answer: (item, slot, _rng) => {
      if (item.difficulty === "EASY") return slot % 3 !== 2;
      if (item.difficulty === "HARD") return slot % 3 === 0;
      return slot % 2 === 0;
    },
  },
  /* H. Easy-only */
  S8: {
    label: "S8 Easy-only (benar cuma EASY)",
    answer: (item, _slot, rng) => rng() < (P_EASY_ONLY[item.difficulty] ?? 0.1),
  },
  /* I. Hard-heavy (answers hard correctly, easy incorrectly — unusual) */
  S9: {
    label: "S9 Hard-heavy (HARD benar, EASY salah)",
    answer: (item, _slot, rng) => {
      if (item.difficulty === "HARD") return rng() < 0.85;
      if (item.difficulty === "EASY") return rng() < 0.15;
      return rng() < 0.5;
    },
  },
  /* J. One-subskill dominated */
  S10: {
    label: "S10 Satu kemampuan (READING kuat, lainnya lemah)",
    answer: (item, _slot, rng) => {
      if (item.skill === "READING") return rng() < 0.9;
      return rng() < 0.2;
    },
  },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
interface PendingItem {
  item: AiDiagnosticItem;
  provider: string | null;
  warnings: string[];
}

function wrongOptionIndex(item: AiDiagnosticItem): string {
  if (item.questionType === "ISIAN_SINGKAT") return "xxx";
  const wrong = item.options.findIndex((_, idx) => String(idx) !== String(item.correctAnswer));
  return String(wrong >= 0 ? wrong : 0);
}

interface EvidenceRow {
  skill: string;
  difficulty: string | null;
  isCorrect: boolean;
}

/* ── Generator with 429 backoff ───────────────────────────────────────────── */
async function generateWithBackoff(
  plan: ReturnType<typeof nextPlanForSlot>,
  ctx: { avoidStems: string[]; avoidSubskills: string[]; usedTopics: string[]; recentSummary: string },
  idSet: string[]
): Promise<{ pending: PendingItem | null; provider: string | null; warnings: string[]; backoffMs: number }> {
  let backoffMs = 0;

  for (let attempt = 0; attempt <= 3; attempt += 1) {
    const outcome = await generateAiDiagnosticQuestion(plan, ctx, idSet);
    if (outcome.item) {
      return { pending: { item: outcome.item, provider: outcome.provider, warnings: outcome.warnings }, provider: outcome.provider, warnings: outcome.warnings, backoffMs };
    }

    const is429 = outcome.warnings.some((w) => w.includes("429") || w.includes("rate") || w.includes("throttl"));
    if (is429 && attempt < 3) {
      console.log(`    ⏳ 429, cooldown ${COOLDOWN_429_MS / 1000}s (attempt ${attempt + 1}/3)`);
      await sleep(COOLDOWN_429_MS);
    }
  }

  return { pending: null, provider: null, warnings: [], backoffMs: 0 };
}

/* ── Single Session Runner ────────────────────────────────────────────────── */
async function runOneSession(
  archetypeKey: string,
  seed: number,
  resume?: SessionRecord
): Promise<SessionRecord> {
  const rng = mulberry32(seed);
  const targetSize = 10;
  const startedAt = resume?.startedAt ?? new Date().toISOString();
  const wallStart = Date.now();
  const evidence: EvidenceRow[] = resume
    ? resume.items.map((item) => ({ skill: item.skill, difficulty: item.difficulty, isCorrect: item.answeredCorrect }))
    : [];
  let anyGenerationFailed = resume?.anyGenerationFailed ?? false;
  let slot0Warnings = resume?.slot0Warnings ?? [];
  let aiCalls = resume?.aiCalls ?? 0;
  const providerStats: Record<string, number> = resume?.providerStats ?? {};
  const items: SessionRecord["items"] = resume ? [...resume.items] : [];

  let state: AiSessionState | null = resume ? stateFromRecord(resume) : null;

  for (let slot = items.length; slot < targetSize; slot += 1) {
    let pending: PendingItem | null = null;

    if (slot === 0) {
      const plan0 = nextPlanForSlot(
        { v: 1, mode: "AI-ADAPTIVE", targetSize, order: [], items: {}, usedTopics: [], usedSubskills: [], genFailed: false },
        0
      );
      const first = await generateWithBackoff(
        plan0,
        { avoidStems: [], avoidSubskills: [], usedTopics: [], recentSummary: "" },
        []
      );
      slot0Warnings = first.warnings;
      aiCalls += 1;
      if (first.provider) providerStats[first.provider] = (providerStats[first.provider] ?? 0) + 1;
      if (!first.pending) {
        return {
          sessionId: resume?.sessionId ?? randomUUID(),
          archetype: archetypeKey,
          targetSize,
          startedAt,
          durationMs: Date.now() - wallStart,
          aiCalls,
          providerStats,
          items,
          profile: null,
          bankFallbackNeeded: true,
          anyGenerationFailed: true,
          slot0Warnings,
        };
      }
      state = buildInitialState(targetSize, first.pending.item);
      pending = first.pending;
    } else {
      const plan = nextPlanForSlot(state as AiSessionState, slot);
      const ctx = {
        avoidStems: Object.values((state as AiSessionState).items).map((value) => value.text),
        avoidSubskills: (state as AiSessionState).usedSubskills,
        usedTopics: (state as AiSessionState).usedTopics,
        recentSummary: summarizeSessionEvidence(evidence),
      };
      let attemptsMade = 0;
      for (let g = 1; g <= 6; g += 1) {
        attemptsMade += 1;
        const nextGen = await generateWithBackoff(plan, ctx, Object.keys((state as AiSessionState).items));
        if (nextGen.provider) providerStats[nextGen.provider] = (providerStats[nextGen.provider] ?? 0) + 1;
        if (nextGen.pending) {
          pending = nextGen.pending;
          break;
        }
        await sleep(PACE_MS);
      }
      aiCalls += attemptsMade;
      if (!pending) {
        anyGenerationFailed = true;
        break;
      }
      (state as AiSessionState).items[pending.item.id] = pending.item;
      (state as AiSessionState).order = [pending.item.id];
      if (pending.item.topic) (state as AiSessionState).usedTopics.push(pending.item.topic);
      if (pending.item.subskill) (state as AiSessionState).usedSubskills.push(pending.item.subskill);
    }

    const current = pending;
    const item = current.item;

    const correct = ARCHETYPES[archetypeKey].answer(item, slot, rng);
    const selected = correct ? item.correctAnswer : wrongOptionIndex(item);
    evidence.push({ skill: item.skill, difficulty: item.difficulty, isCorrect: correct });

    items.push({
      id: item.id,
      slot,
      text: item.text,
      options: item.options,
      questionType: item.questionType,
      correctAnswer: item.correctAnswer,
      skill: item.skill,
      subskill: item.subskill ?? null,
      difficulty: item.difficulty,
      cognitiveTarget: item.cognitiveTarget ?? null,
      topic: item.topic ?? null,
      misconceptionMap: item.misconceptionMap,
      evidenceTarget: item.evidenceTarget,
      diagnosticRationale: item.diagnosticRationale,
      explanation: item.explanation,
      provider: current.provider,
      warnings: current.warnings,
      answeredCorrect: correct,
      selected,
    });

    await sleep(PACE_MS);
  }

  const details: DiagnosticEvidenceDetail[] = evidence.map((row) => ({
    skill: row.skill,
    difficulty: row.difficulty,
    isCorrect: row.isCorrect,
  }));
  let profile: SessionRecord["profile"] = null;
  if (details.length >= 8) {
    profile = withUntestedSkills(computeProfileFromEvidence(details), DIAGNOSTIC_COVERAGE_SKILLS);
  }

  return {
    sessionId: resume?.sessionId ?? randomUUID(),
    archetype: archetypeKey,
    targetSize,
    startedAt,
    durationMs: Date.now() - wallStart,
    aiCalls,
    providerStats,
    items,
    profile,
    bankFallbackNeeded: anyGenerationFailed && details.length < 8,
    anyGenerationFailed,
    slot0Warnings,
  };
}

function stateFromRecord(record: SessionRecord): AiSessionState {
  const engineItems = Object.fromEntries(
    record.items.map((row) => {
      const {
        id, text, options, questionType, correctAnswer, skill, subskill, difficulty,
        cognitiveTarget, topic, misconceptionMap, evidenceTarget, diagnosticRationale, explanation,
      } = row;
      const engineItem: AiDiagnosticItem = {
        id, text, options, questionType, correctAnswer, skill, subskill, difficulty,
        cognitiveTarget, topic, misconceptionMap, evidenceTarget, diagnosticRationale, explanation,
      };
      return [id, engineItem];
    })
  );
  return {
    v: 1,
    mode: "AI-ADAPTIVE",
    targetSize: record.targetSize,
    order: [],
    items: engineItems,
    usedTopics: record.items.filter((row) => row.topic).map((row) => row.topic as string),
    usedSubskills: record.items.filter((row) => row.subskill).map((row) => row.subskill as string),
    genFailed: false,
  };
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const sessionLimit = args.includes("--sessions")
    ? parseInt(args[args.indexOf("--sessions") + 1] ?? "10", 10)
    : 10;

  const archKeys = Object.keys(ARCHETYPES).slice(0, sessionLimit);

  if (dryRun) {
    console.log(`DRY-RUN: ${archKeys.length} archetype × 1 sesi = ${archKeys.length} sesi (${archKeys.length * 10} butir AI nyata).`);
    console.log(`Provider keys: ${aiDiagnosticEnabled() ? "YA" : "TIDAK"}`);
    console.log(`Pacing: ${PACE_MS}ms between calls, cooldown ${COOLDOWN_429_MS / 1000}s after 429.`);
    console.log(`Archetypes:`);
    for (const k of archKeys) console.log(`  ${k}: ${ARCHETYPES[k].label}`);
    process.exit(0);
  }

  if (!aiDiagnosticEnabled()) {
    console.error("QA dibatalkan: tidak ada API key provider.");
    process.exit(1);
  }

  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const records: SessionRecord[] = [];
  let totalItems = 0;
  const budgetMinutes = Number(process.env.QA_MAX_MINUTES || "25");
  const budgetStart = Date.now();
  const budgetExceeded = () => (Date.now() - budgetStart) / 60000 >= budgetMinutes;

  console.log(`\n🚀 STEP 8.4.1 QA Runner — ${archKeys.length} sessions, ${PACE_MS}ms pacing, ${budgetMinutes}min budget\n`);

  for (const key of archKeys) {
    if (budgetExceeded()) {
      console.log(`⏸️ Budget ${budgetMinutes}min tercapai.`);
      break;
    }

    const file = path.join(SESSIONS_DIR, `session-${key}-1.json`);
    let existing: SessionRecord | null = null;
    if (fs.existsSync(file)) {
      try {
        existing = JSON.parse(fs.readFileSync(file, "utf8")) as SessionRecord;
      } catch { existing = null; }
    }

    if (existing && existing.items.length >= (existing.targetSize ?? 10)) {
      console.log(`♻️ ${key}: sudah lengkap (${existing.items.length} butir) — dilewati`);
      records.push(existing);
      totalItems += existing.items.length;
      continue;
    }

    const seed = Object.keys(ARCHETYPES).indexOf(key) * 1000 + 42;
    let record: SessionRecord;
    if (existing && existing.items.length > 0) {
      console.log(`🔁 ${key}: resume dari ${existing.items.length} butir...`);
      record = await runOneSession(key, seed, existing);
    } else {
      record = await runOneSession(key, seed);
    }

    // Retry if completely empty (up to 2 retries)
    for (let attempt = 2; attempt <= 3 && record.items.length === 0; attempt += 1) {
      console.log(`  ⟳ ${key} percobaan ${attempt}: kosong — retry...`);
      await sleep(COOLDOWN_429_MS);
      record = await runOneSession(key, seed + attempt * 100);
    }

    records.push(record);
    totalItems += record.items.length;
    fs.writeFileSync(file, JSON.stringify(record, null, 2));

    const elapsed = ((Date.now() - budgetStart) / 1000).toFixed(0);
    const providers = Object.entries(record.providerStats).map(([p, c]) => `${p}:${c}`).join(",") || "none";
    console.log(
      `✅ ${key}: ${record.items.length} items, ${record.aiCalls} calls, ${(record.durationMs / 1000).toFixed(1)}s, [${providers}]` +
      `${record.anyGenerationFailed ? " ⚠️ FAIL" : ""} (${elapsed}s elapsed)`
    );
  }

  // Summary
  const allCalls = records.reduce((sum, r) => sum + r.aiCalls, 0);
  const allDur = records.reduce((sum, r) => sum + r.durationMs, 0);
  const mergedProviders: Record<string, number> = {};
  for (const r of records) {
    for (const [p, c] of Object.entries(r.providerStats)) {
      mergedProviders[p] = (mergedProviders[p] ?? 0) + c;
    }
  }
  const skillDist: Record<string, number> = {};
  const diffDist: Record<string, number> = {};
  for (const r of records) {
    for (const item of r.items) {
      skillDist[item.skill] = (skillDist[item.skill] ?? 0) + 1;
      diffDist[item.difficulty] = (diffDist[item.difficulty] ?? 0) + 1;
    }
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`Selesai: ${records.length} sesi, ${totalItems} butir nyata.`);
  console.log(`AI calls: ${allCalls} total, avg ${(allDur / records.length / 1000).toFixed(1)}s/sesi.`);
  console.log(`Provider breakdown: ${JSON.stringify(mergedProviders)}`);
  console.log(`Skill distribution: ${JSON.stringify(skillDist)}`);
  console.log(`Difficulty distribution: ${JSON.stringify(diffDist)}`);
  console.log(`Data: ${SESSIONS_DIR}`);
  console.log(`═══════════════════════════════════════════════\n`);

  // Write index
  const index = {
    step: "8.4.1",
    generatedAt: new Date().toISOString(),
    totalSessions: records.length,
    totalItems,
    providerStats: mergedProviders,
    skillDistribution: skillDist,
    difficultyDistribution: diffDist,
    archetypes: Object.fromEntries(Object.entries(ARCHETYPES).map(([k, v]) => [k, v.label])),
    outDir: "data/qa/ai-diagnostic-8-4/sessions",
  };
  fs.writeFileSync(path.join(QA_OUT_DIR, "index-8-4-1.json"), JSON.stringify(index, null, 2));

  process.exit(0);
}

const isMainModule = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
  } catch { return false; }
})();

if (isMainModule) {
  main().catch((error) => {
    console.error("QA runner gagal:", error);
    process.exit(1);
  });
}
