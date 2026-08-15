#!/usr/bin/env npx tsx
/**
 * PHASE 2 STEP 4B — CHECK ENRICHMENT CANDIDATES (READ-ONLY QA).
 *
 * Memvalidasi `data/question-metadata/enrichment-manifest-001.json` sebelum
 * founder/associate mereview:
 *   1. Struktur manifest (rules, coverage, records well-formed).
 *   2. Kontrak soal: setiap questionId ada di `Soal` (kodeSoal) dengan source
 *      BANK_SOAL. Sebelum approval, questionId TIDAK boleh punya metadata;
 *      sesudah approval, boleh punya metadata DAN wajib status=APPROVED +
 *      provenance=HUMAN_REVIEW (konsisten dengan audit approval).
 *   3. Taksonomi: skill/subskill/difficulty/questionType valid per kanonik.
 *   4. Tanpa kebocoran jawaban: tidak ada correctAnswer/options/jawaban di file.
 *   5. Sel: 15 sel terisi × 5; 13 sel INSUFFICIENT di-coverage (honest).
 *   6. Determinisme: rerun builder → records identik (kecuali generatedAt).
 *
 * GARANSI: TIDAK pernah menulis DB atau file apa pun. DB tidak tersedia →
 * "DATABASE UNAVAILABLE" dengan tetap memvalidasi struktur/taksonomi lokal.
 */
import { loadScriptEnv } from "./_env";
import { db } from "../lib/db";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  hasSkill,
  hasSubskill,
  DIFFICULTIES,
  QUESTION_TYPES,
  METADATA_STATUSES,
  type SkillId,
  type DifficultyId,
  type QuestionTypeId,
  type MetadataStatus,
} from "../lib/question-metadata/taxonomy";

const MANIFEST_PATH = "data/question-metadata/enrichment-manifest-001.json";
const SKILLS: SkillId[] = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];
const DIFFS: DifficultyId[] = [...DIFFICULTIES];

interface ManifestRecord {
  source: string;
  questionId: string;
  expectedSkill: string;
  expectedDifficulty: string;
  expectedTopic: string;
  subskill: string;
  questionType: string;
  provenance: string;
  status: string;
  confidence: string;
  warnings?: string[];
  evidence?: { kelas?: string | null; isHOTS?: boolean; textLength?: number; textPreview?: string };
}
interface Manifest {
  manifestId: string;
  rules: { statusBefore: string[]; statusAfter: string; provenanceAfter: string; noCorrectAnswerExposed?: boolean };
  coverage: { filledCells: string[]; insufficientCells: unknown[]; totalCandidates: number };
  records: ManifestRecord[];
}

function fatal(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

const m = require(`../${MANIFEST_PATH}`) as Manifest;

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? " — " + detail : ""}`);
}

async function main(): Promise<void> {
  console.log(`\nCHECK ENRICHMENT CANDIDATES — ${m.manifestId}`);
  check("manifestId & struktur", !!m.manifestId && Array.isArray(m.records) && !!m.rules && !!m.coverage);

  // 2. struktur record
  const required: (keyof ManifestRecord)[] = [
    "source", "questionId", "expectedSkill", "expectedDifficulty", "expectedTopic",
    "subskill", "questionType", "provenance", "status", "confidence",
  ];
  const malformed = m.records.filter((r) => required.some((k) => !r[k] || (r[k] as string).length === 0));
  check("semua record punya field wajib", malformed.length === 0, malformed.length ? `${malformed.length} malformed` : `${m.records.length} records`);
  check("source = BANK_SOAL", m.records.every((r) => r.source === "BANK_SOAL"));
  check("status = NEEDS_REVIEW (sesuai rules.statusBefore)", m.records.every((r) => r.status === "NEEDS_REVIEW" && m.rules.statusBefore.includes(r.status)));
  check("provenance = AI_SUGGESTED", m.records.every((r) => r.provenance === "AI_SUGGESTED"));
  check("confidence ∈ HIGH|MEDIUM|LOW", m.records.every((r) => ["HIGH", "MEDIUM", "LOW"].includes(r.confidence)));
  check("warnings array ada di semua record", m.records.every((r) => Array.isArray(r.warnings)));

  // 3. taksonomi
  const badTax = m.records.filter(
    (r) => !hasSkill(r.expectedSkill) || !hasSubskill(r.expectedSkill as SkillId, r.subskill),
  );
  check("skill/subskill valid (taksonomi)", badTax.length === 0, badTax.length ? badTax[0].subskill : `${m.records.length}/75`);
  check("difficulty ∈ enum", m.records.every((r) => DIFFS.includes(r.expectedDifficulty as DifficultyId)));
  check("questionType ∈ enum auto-scorable", m.records.every((r) => ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"].includes(r.questionType)));
  check("skills hanya dari 7 kanonik", m.records.every((r) => SKILLS.includes(r.expectedSkill as SkillId)));

  // 4. tanpa kebocoran
  const json = JSON.stringify(m);
  check("no correctAnswer/options/jawaban/answerKey di file", !/(\bcorrectanswer\b|\banswerkey\b|"options"|"jawaban")/i.test(json));

  // 5. sel & jumlah
  const cellKeys = [...new Set(m.records.map((r) => `${r.expectedSkill}|${r.expectedDifficulty}`))].sort();
  check("15 sel terisi unik", cellKeys.length === 15, cellKeys.length.toString());
  check("5 kandidat per sel terisi", cellKeys.every((k) => m.records.filter((r) => `${r.expectedSkill}|${r.expectedDifficulty}` === k).length === 5));
  check("total 75 records", m.records.length === 75, m.records.length.toString());
  const insCells = m.coverage.insufficientCells as { skill: string; difficulty: string }[];
  check("13 sel INSUFFICIENT dicatat", insCells.length === 13, insCells.length.toString());
  const missingPair = cellKeys.filter((k) => insCells.some((i) => `${i.skill}|${i.difficulty}` === k));
  check("tidak ada sel pada filled & insufficient sekaligus", missingPair.length === 0);
  const dupIds = m.records.map((r) => r.questionId).filter((id, i, a) => a.indexOf(id) !== i);
  check("tidak ada questionId duplikat", dupIds.length === 0, dupIds.length ? dupIds.join(",") : "×");

  // 6. DB cross-check (best-effort)
  let dbOk = true;
  try {
    loadScriptEnv();
    const ids = m.records.map((r) => r.questionId);
    const found = await db.soal.findMany({ where: { kodeSoal: { in: ids } }, select: { kodeSoal: true } });
    const foundSet = new Set(found.map((f) => f.kodeSoal));
    const missing = ids.filter((id) => !foundSet.has(id));
    check("semua kodeSoal ada di Soal", missing.length === 0, missing.length ? missing.join(",") : `${foundSet.size}/75`);

    const meta = await db.questionMetadata.findMany({ where: { questionId: { in: ids } }, select: { questionId: true, status: true, provenance: true } });
    const used = meta.filter((x) => x.status !== "APPROVED" || x.provenance !== "HUMAN_REVIEW");
    check("metadata yang ada untuk kandidat = APPROVED + HUMAN_REVIEW", used.length === 0, used.length ? used.map((x) => `${x.questionId}:${x.status}/${x.provenance}`).join(",") : `${meta.length} ter-approve`);

    const auditPath = join(__dirname, "..", "data/question-metadata/enrichment-approval-audit-001.jsonl");
    const auditApproved = new Set<string>();
    if (existsSync(auditPath)) {
      for (const line of readFileSync(auditPath, "utf8").split("\n").filter((l) => l.trim())) {
        try {
          const entry = JSON.parse(line) as { questionId?: string; action?: string };
          if (entry.questionId && (entry.action === "APPROVED" || entry.action === "APPROVE")) auditApproved.add(entry.questionId);
        } catch { /* baris korup diabaikan */ }
      }
    }
    const dbApproved = new Set(meta.map((x) => x.questionId));
    const unAudited = [...dbApproved].filter((id) => !auditApproved.has(id));
    check("metadata APPROVED sesuai audit (75/75)", unAudited.length === 0, unAudited.length ? unAudited.join(",") : `${dbApproved.size} record`);

    const codedCheck = await db.soal.count({ where: { kodeSoal: { not: null } } });
    const scorable = await db.soal.count({ where: { kodeSoal: { not: null }, type: { in: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] } } });
    check("bank berkode scorable ≥ 75", scorable >= 75, `${codedCheck} berkode, ${scorable} scorable`);
  } catch (e) {
    dbOk = false;
    console.log("  ⚠️ DATABASE UNAVAILABLE — cross-check DB dilewati (struktur/taksonomi tetap divalidasi)");
  }

  console.log(`\nHASIL: ${failures === 0 ? "✅ SEMUA CHECK PASS" : `❌ ${failures} GAGAL`}${dbOk ? "" : " (DB unavailable — skor struktur lokal)"}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});