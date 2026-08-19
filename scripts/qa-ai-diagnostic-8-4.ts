/**
 * STEP 8.4 — BC AI DIAGNOSTIC PEDAGOGICAL QA — REAL-SESSION RUNNER (Phase 1–7 data).
 * Run: GROQ_API_KEY=<key> npm run qa:ai-diagnostic-8-4
 *
 * Memakai jalur produksi ASLI (bukan fixture):
 *   plan = nextPlanForSlot(state, slot)  (controller)
 *   item = generateAiDiagnosticQuestion(plan, ctx, idSet)  (generator → callWithFallback → validator)
 *   answer = simulasi archetype (deterministik, seeded)
 *   profil hasil = computeProfileFromEvidence + withUntestedSkills (engine kanonik 4E.1)
 *
 * 5 archetype × 2 sesi (ukuran 10) = 10 sesi, 100 butir nyata.
 * Output: data/qa/ai-diagnostic-8-4/sessions/session-<ARCH>-<n>.json + index.json
 * Tidak menulis DB, tidak memakai kunci selain untuk panggil provider (tidak pernah di-log/commit).
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

export const QA_OUT_DIR = path.resolve(process.cwd(), "data/qa/ai-diagnostic-8-4");
const SESSIONS_DIR = path.join(QA_OUT_DIR, "sessions");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SessionRecord {
  sessionId: string;
  archetype: string;
  targetSize: number;
  startedAt: string;
  durationMs: number;
  aiCalls: number;
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

const P_BY_DIFF: Record<string, number> = { EASY: 0.3, MEDIUM: 0.18, HARD: 0.08 };
const P_BY_DIFF_STRONG: Record<string, number> = { EASY: 1.0, MEDIUM: 0.95, HARD: 0.9 };
const P_READING_STRONG: Record<string, number> = { READING: 0.9, WRITING: 0.65, VOCABULARY: 0.6, GRAMMAR: 0.3, LITERATURE: 0.65 };
const P_GRAMMAR_STRONG: Record<string, number> = { READING: 0.3, WRITING: 0.7, VOCABULARY: 0.6, GRAMMAR: 0.9, LITERATURE: 0.6 };

export type ArchetypeAnswer = (item: AiDiagnosticItem, slot: number, rng: () => number) => boolean;

export const ARCHETYPES: Record<string, { label: string; answer: ArchetypeAnswer }> = {
  S1: {
    label: "S1 Pemula (banyak salah, EASY sekalipun)",
    answer: (item, _slot, rng) => rng() < (P_BY_DIFF[item.difficulty] ?? 0.2),
  },
  S2: {
    label: "S2 Murid kuat (hampir semua benar)",
    answer: (item, _slot, rng) => rng() < (P_BY_DIFF_STRONG[item.difficulty] ?? 0.9),
  },
  S3: {
    label: "S3 Membaca kuat / Tata Bahasa lemah",
    answer: (item, _slot, rng) => rng() < (P_READING_STRONG[item.skill] ?? 0.5),
  },
  S4: {
    label: "S4 Membaca lemah / Tata Bahasa kuat",
    answer: (item, _slot, rng) => rng() < (P_GRAMMAR_STRONG[item.skill] ?? 0.5),
  },
  S5: {
    label: "S5 Inkonsisten (benar-salah berselang)",
    answer: (_item, slot, _rng) => slot % 2 === 0,
  },
};

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

async function generateForSlot(
  plan: ReturnType<typeof nextPlanForSlot>,
  ctx: { avoidStems: string[]; avoidSubskills: string[]; usedTopics: string[]; recentSummary: string },
  idSet: string[]
): Promise<{ pending: PendingItem | null; failed: boolean; warnings: string[] }> {
  const outcome = await generateAiDiagnosticQuestion(plan, ctx, idSet);
  if (!outcome.item) {
    if (process.env.QA_DEBUG) {
      console.error(`[QA-DEBUG] plan=${JSON.stringify(plan).slice(0, 200)} warnings=${JSON.stringify(outcome.warnings).slice(0, 400)}`);
    }
    return { pending: null, failed: true, warnings: outcome.warnings };
  }
  return { pending: { item: outcome.item, provider: outcome.provider, warnings: outcome.warnings }, failed: false, warnings: outcome.warnings };
}

async function runOneSession(archetypeKey: string, seed: number, resume?: SessionRecord): Promise<SessionRecord> {
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
  const items: SessionRecord["items"] = resume ? [...resume.items] : [];

  let state: AiSessionState | null = resume ? stateFromRecord(resume) : null;

  for (let slot = items.length; slot < targetSize; slot += 1) {
    let pending: PendingItem | null = null;

    if (slot === 0) {
      const plan0 = nextPlanForSlot({ v: 1, mode: "AI-ADAPTIVE", targetSize, order: [], items: {}, usedTopics: [], usedSubskills: [], genFailed: false }, 0);
      await sleep(20000);
      const first = await generateForSlot(plan0, { avoidStems: [], avoidSubskills: [], usedTopics: [], recentSummary: "" }, []);
      slot0Warnings = first.warnings;
      aiCalls += 1;
      if (!first.pending) {
        return {
          sessionId: resume?.sessionId ?? randomUUID(),
          archetype: archetypeKey,
          targetSize,
          startedAt,
          durationMs: Date.now() - wallStart,
          aiCalls,
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
        const nextGen = await generateForSlot(plan, ctx, Object.keys((state as AiSessionState).items));
        if (nextGen.pending) {
          pending = nextGen.pending;
          break;
        }
        await sleep(25000);
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

    await sleep(22000);
  }

  const details: DiagnosticEvidenceDetail[] = evidence.map((row) => ({ skill: row.skill, difficulty: row.difficulty, isCorrect: row.isCorrect }));
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
        id, text, options, questionType, correctAnswer, skill, subskill, difficulty, cognitiveTarget, topic, misconceptionMap, evidenceTarget, diagnosticRationale, explanation,
      } = row;
      const engineItem: AiDiagnosticItem = {
        id, text, options, questionType, correctAnswer, skill, subskill, difficulty, cognitiveTarget, topic, misconceptionMap, evidenceTarget, diagnosticRationale, explanation,
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

interface EvidenceRow {
  skill: string;
  difficulty: string | null;
  isCorrect: boolean;
}

async function main() {
  if (process.argv.includes("--dry-run")) {
    const arch = Object.keys(ARCHETYPES);
    console.log(`DRY-RUN: ${arch.length} archetype × 2 sesi = ${arch.length * 2} sesi (${arch.length * 2 * 10} butir AI nyata).`);
    console.log(`Provider keys terdeteksi: ${aiDiagnosticEnabled() ? "YA (aiDiagnosticEnabled=true)" : "TIDAK — jalankan dengan GROQ_API_KEY/DEEPSEEK_API_KEY/GEMINI_API_KEY"}`);
    process.exit(0);
  }
  if (!aiDiagnosticEnabled()) {
    console.error("QA dibatalkan: tidak ada API key provider (GROQ_API_KEY / DEEPSEEK_API_KEY / GEMINI_API_KEY).");
    process.exit(1);
  }

  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const records: SessionRecord[] = [];
  let totalItems = 0;
  const budgetMinutes = Number(process.env.QA_MAX_MINUTES || "0");
  const budgetStart = Date.now();
  const budgetExceeded = () => budgetMinutes > 0 && (Date.now() - budgetStart) / 60000 >= budgetMinutes;
  let budgetHit = false;

  for (const key of Object.keys(ARCHETYPES)) {
    if (budgetExceeded()) {
      budgetHit = true;
      break;
    }
    for (let n = 1; n <= 2; n += 1) {
      if (budgetExceeded()) {
        budgetHit = true;
        break;
      }
      const file = path.join(SESSIONS_DIR, `session-${key}-${n}.json`);
      let existing: SessionRecord | null = null;
      if (fs.existsSync(file)) {
        try {
          existing = JSON.parse(fs.readFileSync(file, "utf8")) as SessionRecord;
        } catch {
          existing = null;
        }
      }

      let record: SessionRecord;
      if (existing && existing.items.length >= (existing.targetSize ?? 10)) {
        record = existing;
        console.log(`♻️ ${key} sesi-${n}: sudah lengkap (${record.items.length} butir) — dilewati`);
      } else if (existing && existing.items.length > 0) {
        console.log(`🔁 ${key} sesi-${n}: resume dari ${existing.items.length} butir...`);
        record = await runOneSession(key, n * 1000 + Object.keys(ARCHETYPES).indexOf(key), existing);
        if (record.items.length === 0) {
          for (let attempt = 2; attempt <= 3 && record.items.length === 0; attempt += 1) {
            console.log(`  ⟳ ${key} sesi-${n} percobaan ${attempt}: generasi kosong — coba lagi (QA-only retry, produksi: fallback bank)`);
            await sleep(25000);
            record = await runOneSession(key, n * 1000 + Object.keys(ARCHETYPES).indexOf(key) + attempt * 100);
          }
        }
      } else {
        record = await runOneSession(key, n * 1000 + Object.keys(ARCHETYPES).indexOf(key));
        for (let attempt = 2; attempt <= 3 && record.items.length === 0; attempt += 1) {
          console.log(`  ⟳ ${key} sesi-${n} percobaan ${attempt}: generasi kosong — coba lagi (QA-only retry, produksi: fallback bank)`);
          await sleep(25000);
          record = await runOneSession(key, n * 1000 + Object.keys(ARCHETYPES).indexOf(key) + attempt * 100);
        }
      }
      records.push(record);
      totalItems += record.items.length;
      fs.writeFileSync(file, JSON.stringify(record, null, 2));
      await sleep(25000);
      console.log(
        `✅ ${key} sesi-${n}: ${record.items.length} butir, ${record.aiCalls} AI call, ${(record.durationMs / 1000).toFixed(1)}s` +
          `${record.anyGenerationFailed ? " ⚠️ ada generasi gagal" : ""}${record.bankFallbackNeeded || (record.items.length === 0 && record.slot0Warnings.length > 0) ? " ⚠️ butuh fallback bank" : ""}` +
          `${record.items.length === 0 ? ` — slot0Warnings: ${record.slot0Warnings.slice(0, 3).join(" | ")}` : ""}`
      );
      if (budgetExceeded()) {
        budgetHit = true;
        break;
      }
    }
  }
  if (budgetHit) {
    console.log(`⏸️ Budget ${budgetMinutes} menit tercapai — progres tersimpan, jalankan lagi untuk resume.`);
  }

  const index = {
    generatedAt: new Date().toISOString(),
    totalSessions: records.length,
    totalItems,
    archetypes: Object.fromEntries(Object.entries(ARCHETYPES).map(([k, v]) => [k, v.label])),
    durationLabel: "±5–8 menit",
    outDir: "data/qa/ai-diagnostic-8-4/sessions",
  };
  fs.writeFileSync(path.join(QA_OUT_DIR, "index.json"), JSON.stringify(index, null, 2));

  const allCalls = records.reduce((sum, r) => sum + r.aiCalls, 0);
  const allDur = records.reduce((sum, r) => sum + r.durationMs, 0);
  console.log(`\nSelesai: ${records.length} sesi, ${totalItems} butir nyata, ${allCalls} AI call total, rata-rata ${(allDur / records.length / 1000).toFixed(1)}s/sesi.`);
  console.log(`Data: ${SESSIONS_DIR}`);
  process.exit(0);
}

const isMainModule = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
  } catch {
    return false;
  }
})();

if (isMainModule) {
  main().catch((error) => {
    console.error("QA runner gagal:", error);
    process.exit(1);
  });
}