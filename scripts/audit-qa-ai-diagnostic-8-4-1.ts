/**
 * STEP 8.4.1 — Phase 5 QA Audit (read-only, no DB)
 *
 * Audits generated AI diagnostic sessions (data/qa/ai-diagnostic-8-4/sessions/*-1.json):
 *  1. Session-level integrity (loads, sizes, provider stats)
 *  2. Per-item engine validation via validateAiDiagnosticItem (R1–R13 single source of truth)
 *  3. Adaptivity replay: skill/difficulty per slot must equal nextPlanForSlot (deterministic)
 *  4. Cross-session uniqueness: no duplicate item ids, no duplicate stems
 *  5. Coverage matrix: archetype × skill × difficulty
 *  6. Security: no keys/URLs in stored items
 *
 * Usage: npx tsx scripts/audit-qa-ai-diagnostic-8-4-1.ts
 */
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { nextPlanForSlot } from "@/lib/diagnostic-ai/controller";
import { validateAiDiagnosticItem } from "@/lib/diagnostic-ai/validator";
import type { AiSessionState } from "@/lib/diagnostic-ai/types";

const SESSIONS_DIR = path.resolve(process.cwd(), "data/qa/ai-diagnostic-8-4/sessions");
const TARGET_PER_SESSION = 10;

interface AuditCounts {
  passed: number;
  failed: number;
}
const counts: AuditCounts = { passed: 0, failed: 0 };
const failures: string[] = [];

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    counts.passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    counts.failed += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

interface SessionRecord {
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
    questionType: string;
    correctAnswer: unknown;
    skill: string;
    subskill: string;
    difficulty: string;
    cognitiveTarget: string;
    topic: string;
    misconceptionMap: Record<string, string>;
    evidenceTarget: { skill: string; confidence: string };
    diagnosticRationale: string;
    explanation: string;
    provider: string | null;
    warnings: string[];
    answeredCorrect: boolean;
    selected: string;
  }>;
  profile: unknown;
  bankFallbackNeeded: boolean;
  anyGenerationFailed: boolean;
  slot0Warnings: string[];
}

function loadSessions(): SessionRecord[] {
  const records: SessionRecord[] = [];
  for (const file of readdirSync(SESSIONS_DIR).sort()) {
    if (!file.endsWith("-1.json")) continue;
    try {
      const raw = JSON.parse(readFileSync(path.join(SESSIONS_DIR, file), "utf-8"));
      if (Array.isArray(raw.items)) records.push(raw);
    } catch {
      check(`load: ${file}`, false, "JSON tidak bisa dibaca");
    }
  }
  return records;
}

function difficultyForArchetype(expected: string[]): Map<string, string> {
  // not used; adaptivity comes from nextPlanForSlot replay
  void expected;
  return new Map();
}

function main() {
  console.log("STEP 8.4.1 — Phase 5 QA Audit\n");
  void difficultyForArchetype;

  const sessions = loadSessions();
  check(`memuat file sesi (${sessions.length})`, sessions.length > 0);
  if (sessions.length === 0) {
    console.log(`\nTotal: ${counts.passed} ✅ / ${counts.failed} ❌`);
    process.exit(1);
  }

  const totalItems = sessions.reduce((sum, s) => sum + s.items.length, 0);
  check("total butir > 0", totalItems > 0, `total=${totalItems}`);

  const skillDistribution: Record<string, number> = {};
  const difficultyDistribution: Record<string, number> = {};
  const coverage = new Map<string, number>(); // archetype×skill×difficulty

  // ── 1. Per-session + 2. Per-item + 3. Adaptivity replay ──────────────
  for (const session of sessions) {
    const key = session.archetype || session.sessionId.slice(0, 8);
    console.log(`\n[${key}] ${session.items.length}/${session.targetSize ?? TARGET_PER_SESSION} butir, ${session.aiCalls ?? 0} AI call`);

    check(`[${key}] ukuran ≤ target`, session.items.length <= (session.targetSize ?? TARGET_PER_SESSION));

    if (session.items.length > 0) {
      const state = {
        targetSize: session.targetSize ?? TARGET_PER_SESSION,
        items: {},
        order: [],
        usedSubskills: [],
      } as unknown as AiSessionState;

      for (const item of session.items) {
        // slot-plan deterministik
        const plan = nextPlanForSlot(state, item.slot);
        const planMatch =
          item.skill === plan.skill && item.difficulty === plan.difficulty;
        check(`[${key}] slot ${item.slot} plan (${plan.skill}/${plan.difficulty})`, planMatch, `item=${item.skill}/${item.difficulty}`);

        // engine validator
        const result = validateAiDiagnosticItem(item, { avoidStems: [], avoidIds: [] });
        check(`[${key}] item ${item.id.slice(0, 8)} valid`, result.valid, result.issues.join("; "));

        // distribution bookkeeping
        skillDistribution[item.skill] = (skillDistribution[item.skill] ?? 0) + 1;
        difficultyDistribution[item.difficulty] = (difficultyDistribution[item.difficulty] ?? 0) + 1;
        const cell = `${key}×${item.skill}×${item.difficulty}`;
        coverage.set(cell, (coverage.get(cell) ?? 0) + 1);

        // security
        const blob = JSON.stringify(item);
        check(`[${key}] item ${item.id.slice(0, 8)} tanpa rahasia`, !/(sk-|gsk_|AIza|SERVICE_ROLE|eyJ[A-Za-z0-9_-]{20,})/.test(blob));
      }
    }
  }

  // ── 4. Cross-session uniqueness ───────────────────────────────────────
  const seenIds = new Set<string>();
  const seenStems = new Map<string, string>();
  const dupIds: string[] = [];
  const dupStems: string[] = [];
  for (const session of sessions) {
    for (const item of session.items) {
      if (seenIds.has(item.id)) dupIds.push(item.id);
      seenIds.add(item.id);
      const stemKey = item.text.replace(/\s+/g, " ").trim().toLowerCase();
      if (seenStems.has(stemKey)) dupStems.push(`${item.id.slice(0, 8)} ≈ ${seenStems.get(stemKey)}`);
      else seenStems.set(stemKey, item.id.slice(0, 8));
    }
  }
  console.log(`\n[Keunikan global]`);
  check(`id butir unik (${seenIds.size})`, dupIds.length === 0, dupIds.join(", "));
  check(`stem unik (${seenStems.size})`, dupStems.length === 0, dupStems.join(", "));

  // ── 5. Coverage matrix ────────────────────────────────────────────────
  console.log(`\n[Matriks cakupan]`);
  const skills = [...new Set(Object.keys(skillDistribution))].sort();
  const diffs = ["EASY", "MEDIUM", "HARD"];
  for (const skill of skills) {
    const cells = diffs.map((d) => `${skill}/${d}:${coverage.get(`${skill}×${skill}×${d}`) ?? 0}`).join(" ");
    void cells;
  }
  check("≥3 skill berbeda terisi", skills.length >= 3, skills.join(", "));
  const filledDiff = diffs.filter((d) => (difficultyDistribution[d] ?? 0) > 0);
  check("EASY/MEDIUM/HARD semuanya terisi", filledDiff.length === 3, filledDiff.join(",") || "kosong");

  console.log(`\nSebaran skill: ${Object.entries(skillDistribution).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`Sebaran difficulty: ${Object.entries(difficultyDistribution).map(([k, v]) => `${k}=${v}`).join(", ")}`);

  // ── 6. Coverage target (10 sesi) ──────────────────────────────────────
  const fullSessions = sessions.filter((s) => s.items.length === (s.targetSize ?? TARGET_PER_SESSION));
  check(`sesi lengkap 10/10 (${fullSessions.length}/10)`, fullSessions.length >= 10, fullSessions.map((s) => s.archetype).join(",") || "belum");

  console.log(`\nTotal: ${counts.passed} ✅ / ${counts.failed} ❌`);
  if (failures.length > 0) {
    console.log("\nRincian kegagalan:");
    for (const f of failures) console.log(`  • ${f}`);
  }
  process.exit(counts.failed === 0 ? 0 : 1);
}

main();
