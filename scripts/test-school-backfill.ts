#!/usr/bin/env npx tsx
/**
 * P1-C Phase 3 — Unit test backfill identitas sekolah.
 *
 * SEMUA tes MURNI (tanpa DB, tanpa network, tanpa write):
 *   * input data di-hardcode; output dianalisis fungsi murni.
 *   * TIDAK ada panggilan Prisma/db sama sekali di jalur logika.
 *
 * Jalankan: npm run test:school-backfill
 */
import * as fs from "fs";
import * as path from "path";
import {
  decideBackfill,
  summarizeBackfill,
  type BackfillDecision,
} from "../lib/school/backfill";
import type { SchoolRecord, AliasRecord, StudentEvidence } from "../lib/school/matching";

let passed = 0;
let failed = 0;

function ok(cond: boolean, name: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const A: SchoolRecord = {
  id: "sch-a",
  canonicalName: "SMP Negeri 1 Harapan Bangsa",
  normalizedName: "smp negeri 1 harapan bangsa",
  isActive: true,
};
const B: SchoolRecord = {
  id: "sch-b",
  canonicalName: "SMA Negeri 2 Cendekia Nusantara",
  normalizedName: "sma negeri 2 cendekia nusantara",
  isActive: true,
};
const C: SchoolRecord = {
  id: "sch-c",
  canonicalName: "SMA Negeri 1 Harapan Bangsa",
  normalizedName: "sma negeri 1 harapan bangsa",
  isActive: true,
};
const DUP1: SchoolRecord = {
  id: "sch-d1",
  canonicalName: "SDN Cemara 01",
  normalizedName: "sdn cemara 01",
  isActive: true,
};
const DUP2: SchoolRecord = {
  id: "sch-d2",
  canonicalName: "SD NEGERI CEMARA 01",
  normalizedName: "sdn cemara 01",
  isActive: true,
};

const SCHOOLS = [A, B, C, DUP1, DUP2];

const ALIASES: AliasRecord[] = [
  { id: "al-a1", schoolId: A.id, alias: "SMPN 1 Harapan Bangsa", normalizedAlias: "smpn 1 harapan bangsa" },
  { id: "al-a2", schoolId: A.id, alias: "SMP Harapan Bangsa", normalizedAlias: "smp harapan bangsa" },
];

function bf(input: StudentEvidence): BackfillDecision {
  return decideBackfill(input, SCHOOLS, ALIASES);
}

// ---------------------------------------------------------------------------
section("TEST 1 — existing schoolId tidak pernah ditimpa (ALREADY_CANONICAL)");
{
  const r = bf({
    studentId: "u1",
    legacySchool: "SMP Negeri 1 Harapan Bangsa",
    existingSchoolId: A.id,
    groups: [],
  });
  ok(r.decision === "ALREADY_CANONICAL", `decision=ALREADY_CANONICAL (${r.decision})`);
  ok(r.case === "CASE_E_EXISTING_SCHOOL_ID", `case=CASE_E (${r.case})`);
  ok(r.proposedSchoolId === A.id, "proposed=existing (tidak diganti)");
  ok(r.safeToApply === false, "safeToApply=false (tidak diubah)");
}

// ---------------------------------------------------------------------------
section("TEST 2 — Profile.school (legacy) tidak pernah diubah engine");
{
  const engineSrc = fs.readFileSync(path.join(__dirname, "../lib/school/backfill.ts"), "utf-8");
  ok(!/\.school\s*=/.test(engineSrc), "tidak ada assignment ke field .school");
  ok(!/\.create\(|\.update\(|\.updateMany\(|\.upsert\(|\.delete/.test(engineSrc), "engine murni tanpa method tulis");
  ok(!/from "@prisma\/client"/.test(engineSrc), "engine tanpa import Prisma");
  ok(!/\.school\b/.test(engineSrc.replace(/Profile\.school/g, "PROFILE_LEGACY")), "field legacy tidak ditulis engine");
}

// ---------------------------------------------------------------------------
section("TEST 3 — NORMALIZED EXACT unik → CASE B, HIGH, safeToApply");
{
  const r = bf({
    studentId: "u3",
    legacySchool: "SMP Negeri 1 Harapan Bangsa",
    existingSchoolId: null,
    groups: [],
  });
  ok(r.decision === "NORMALIZED_EXACT", `decision (${r.decision})`);
  ok(r.case === "CASE_B_NORMALIZED_EXACT", `case=CASE_B (${r.case})`);
  ok(r.confidence === "HIGH_CONFIDENCE", `confidence (${r.confidence})`);
  ok(r.proposedSchoolId === A.id, "proposed=sch-a");
  ok(r.safeToApply === true, "safeToApply=true");
  ok(r.source === "STUDENT_SCHOOL", "source=STUDENT_SCHOOL");
}

// ---------------------------------------------------------------------------
section("TEST 4 — VERIFIED ALIAS unik → CASE A, HIGH, safeToApply");
{
  const r = bf({
    studentId: "u4",
    legacySchool: "SMPN 1 Harapan Bangsa",
    existingSchoolId: null,
    groups: [],
  });
  ok(r.decision === "ALIAS_MATCH", `decision (${r.decision})`);
  ok(r.case === "CASE_A_VERIFIED_ALIAS", `case=CASE_A (${r.case})`);
  ok(r.confidence === "HIGH_CONFIDENCE", `confidence (${r.confidence})`);
  ok(r.proposedSchoolId === A.id, "proposed=sch-a");
  ok(r.safeToApply === true, "safeToApply=true");
}

// ---------------------------------------------------------------------------
section("TEST 5 — GROUP evidence konsisten → CASE C, MEDIUM, safeToApply");
{
  const r = bf({
    studentId: "u5",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" },
      { groupId: "g2", isActive: true, teacherSchool: "SMA NEGERI 2 Cendekia Nusantara" },
    ],
  });
  ok(r.decision === "GROUP_EVIDENCE_BACKFILL", `decision (${r.decision})`);
  ok(r.case === "CASE_C_GROUP_EVIDENCE", `case=CASE_C (${r.case})`);
  ok(r.confidence === "MEDIUM_CONFIDENCE", `confidence (${r.confidence})`);
  ok(r.proposedSchoolId === B.id, "proposed=sch-b");
  ok(r.safeToApply === true, "safeToApply=true");
  ok(r.source === "GROUP_EVIDENCE", "source=GROUP_EVIDENCE");
}

// ---------------------------------------------------------------------------
section("TEST 6 — GROUP evidence konflik → AMBIGUOUS_GROUP_EVIDENCE, NULL");
{
  const r = bf({
    studentId: "u6",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" },
      { groupId: "g2", isActive: true, teacherSchool: "SMP Negeri 1 Harapan Bangsa" },
    ],
  });
  ok(r.decision === "AMBIGUOUS_GROUP_EVIDENCE", `decision (${r.decision})`);
  ok(r.case === "CASE_D_CONFLICT_AMBIGUOUS", `case=CASE_D (${r.case})`);
  ok(r.proposedSchoolId === null, "proposed=null (tidak ditebak)");
  ok(r.safeToApply === false, "safeToApply=false");
  ok(r.conflicting === true, "conflicting=true");
}

// ---------------------------------------------------------------------------
section("TEST 7 — grup inactive diabaikan → UNRESOLVED");
{
  const r = bf({
    studentId: "u7",
    legacySchool: null,
    existingSchoolId: null,
    groups: [{ groupId: "g1", isActive: false, teacherSchool: "SMP Negeri 1 Harapan Bangsa" }],
  });
  ok(r.decision === "UNRESOLVED", `decision (${r.decision})`);
  ok(r.case === "CASE_F_NO_EVIDENCE", "case=CASE_F");
  ok(r.proposedSchoolId === null, "proposed=null");
  ok(r.safeToApply === false, "safeToApply=false");
}

// ---------------------------------------------------------------------------
section("TEST 8 — SEMUA grup aktif dievaluasi (bukan hanya grup pertama)");
{
  // 3 grup berbeda semuanya → A: tetap resolve A.
  const manySame = bf({
    studentId: "u8a",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: true, teacherSchool: "SMP Negeri 1 Harapan Bangsa" },
      { groupId: "g2", isActive: true, teacherSchool: "SMP NEGERI 1 HARAPAN BANGSA" },
      { groupId: "g3", isActive: true, teacherSchool: "smp negeri 1 harapan bangsa" },
    ],
  });
  ok(manySame.proposedSchoolId === A.id, "3 grup sama → sch-a");
  ok(manySame.safeToApply === true, "safe");
  ok(manySame.groupEvidenceQuality === "MULTI_SAME_SCHOOL", "quality=MULTI_SAME_SCHOOL");

  // grup pertama → A, grup kedua → B: ambiguitas (tidak bias ke grup pertama).
  const conflict = bf({
    studentId: "u8b",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: true, teacherSchool: "SMP Negeri 1 Harapan Bangsa" },
      { groupId: "g2", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" },
    ],
  });
  ok(conflict.decision === "AMBIGUOUS_GROUP_EVIDENCE", "konflik tidak bias ke grup pertama");
  ok(conflict.proposedSchoolId === null, "proposed=null pada konflik");
}

// ---------------------------------------------------------------------------
section("TEST 9 — anti first-group bias (tidak ada groups[0]/take:1) di CLI + engine");
{
  const engineSrc = fs.readFileSync(path.join(__dirname, "../lib/school/matching.ts"), "utf-8");
  const cliSrc = fs.readFileSync(path.join(__dirname, "../scripts/school-backfill.ts"), "utf-8");
  ok(!/groups\[0\]|take:\s*1/.test(engineSrc), "engine tanpa groups[0]/take:1");
  ok(!/groups\[0\]|take:\s*1/.test(cliSrc), "CLI tanpa groups[0]/take:1");
}

// ---------------------------------------------------------------------------
section("TEST 10 — normalizedName duplikat → AMBIGUOUS_CANONICAL, tidak aman");
{
  const r = bf({
    studentId: "u10",
    legacySchool: "SDN Cemara 01",
    existingSchoolId: null,
    groups: [],
  });
  ok(r.decision === "AMBIGUOUS_CANONICAL", `decision (${r.decision})`);
  ok(r.case === "CASE_D_CONFLICT_AMBIGUOUS", "case=CASE_D");
  ok(r.proposedSchoolId === null, "proposed=null");
  ok(r.safeToApply === false, "safeToApply=false");
}

// ---------------------------------------------------------------------------
section("TEST 11 — alias collides → AMBIGUOUS_ALIAS, tidak aman");
{
  const collided: AliasRecord[] = [
    ...ALIASES,
    { id: "al-c1", schoolId: B.id, alias: "SMPN 1 Harapan Bangsa", normalizedAlias: "smpn 1 harapan bangsa" },
  ];
  const r = decideBackfill(
    {
      studentId: "u11",
      legacySchool: "SMPN 1 Harapan Bangsa",
      existingSchoolId: null,
      groups: [],
    },
    SCHOOLS,
    collided
  );
  ok(r.decision === "AMBIGUOUS_ALIAS", `decision (${r.decision})`);
  ok(r.proposedSchoolId === null, "proposed=null");
  ok(r.safeToApply === false, "safeToApply=false");
}

// ---------------------------------------------------------------------------
section("TEST 12 — tidak ada auto-create/merge School/SchoolAlias");
{
  // Hanya engine + CLI diperiksa (bukan file tes ini, yang memuat pola regex).
  const files = ["../lib/school/backfill.ts", "../lib/school/matching.ts", "../scripts/school-backfill.ts"];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, f), "utf-8");
    ok(!/\.create\(/.test(src), `${f} tanpa .create(`);
    ok(!/\.upsert\(/.test(src), `${f} tanpa .upsert(`);
    ok(!/\.delete/.test(src), `${f} tanpa .delete`);
    if (!f.includes("school-backfill.ts")) {
      ok(!/\.updateMany\(/.test(src), `${f} tanpa .updateMany(`);
    }
  }
}

// ---------------------------------------------------------------------------
section("TEST 13 — tidak ada fuzzy / AI / LLM di jalur backfill");
{
  const engineSrc = fs.readFileSync(path.join(__dirname, "../lib/school/backfill.ts"), "utf-8");
  ok(!/leven|fuzzy|similarity|cosine|openai|anthropic|gemini|groq|deepseek|llm|embedding|fetch\(/i.test(engineSrc), "engine tanpa fuzzy/AI/LLM");
}

// ---------------------------------------------------------------------------
section("TEST 14 — schoolId TIDAK pernah dipakai sebagai authorization");
{
  const studentsSrc = fs.readFileSync(path.join(__dirname, "../lib/teacher/students.ts"), "utf-8");
  ok(!/schoolId/.test(studentsSrc), "SSOT students.ts tanpa schoolId");
}

// ---------------------------------------------------------------------------
section("TEST 15 — apply concurrency-safe (WHERE schoolId IS NULL)");
{
  const cliSrc = fs.readFileSync(path.join(__dirname, "../scripts/school-backfill.ts"), "utf-8");
  ok(/schoolId:\s*null/.test(cliSrc), "predicate `schoolId: null` dipakai update");
  ok(/where:\s*\{\s*id:\s*d\.profileId,\s*schoolId:\s*null\s*\}/.test(cliSrc), "update per-profil dengan predicate id + schoolId IS NULL");
}

// ---------------------------------------------------------------------------
section("TEST 16 — dry-run default = zero writes (update hanya di cabang --apply)");
{
  const cliSrc = fs.readFileSync(path.join(__dirname, "../scripts/school-backfill.ts"), "utf-8");
  const applyIdx = cliSrc.indexOf("if (apply)");
  const updateIdx = cliSrc.indexOf("updateMany");
  ok(applyIdx !== -1, "ada cabang `if (apply)`");
  ok(updateIdx > applyIdx, "updateMany HANYA setelah `if (apply)` (di luar dry-run)");
  ok(/data:\s*\{\s*schoolId:/.test(cliSrc), "hanya schoolId yang ditulis (bukan Profile.school)");
  ok(!/data:\s*\{\s*school\b/.test(cliSrc), "data tidak berisi field school (legacy)");
}

// ---------------------------------------------------------------------------
section("TEST 17 — CONFLICTING_EVIDENCE: existing schoolId vs evidence grup beda");
{
  const r = bf({
    studentId: "u17",
    legacySchool: null,
    existingSchoolId: A.id,
    groups: [{ groupId: "g1", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" }],
  });
  ok(r.decision === "CONFLICTING_EVIDENCE", `decision (${r.decision})`);
  ok(r.proposedSchoolId === A.id, "proposed tetap existing (tidak di-overwrite)");
  ok(r.safeToApply === false, "safeToApply=false");
  ok(r.conflicting === true, "conflicting=true");
}

// ---------------------------------------------------------------------------
section("TEST 18 — konteks multi-sekolah guru: campur ter-resolve + tak ter-resolve");
{
  // Satu grup → sekolah guru ter-resolve ke A; satu grup → nama tak dikenal.
  // Semua grup aktif dievaluasi; yang tak ter-resolve tidak menggagalkan resolve A.
  const r = bf({
    studentId: "u18",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: true, teacherSchool: "SMP Negeri 1 Harapan Bangsa" },
      { groupId: "g2", isActive: true, teacherSchool: "Sekolah Tidak Dikenal XYZ" },
    ],
  });
  ok(r.proposedSchoolId === A.id, "resolve A tetap valid walau ada guru tanpa kanonik");
  ok(r.safeToApply === true, "safeToApply=true");
}

// ---------------------------------------------------------------------------
section("TEST 19 — NULL / empty / whitespace school + tanpa grup → UNRESOLVED");
{
  for (const legacy of [null, "", "   "]) {
    const r = bf({
      studentId: "u19",
      legacySchool: legacy,
      existingSchoolId: null,
      groups: [],
    });
    ok(r.decision === "UNRESOLVED", `legacy=${JSON.stringify(legacy)} → UNRESOLVED`);
    ok(r.proposedSchoolId === null && r.safeToApply === false, "tidak aman, null");
  }
}

// ---------------------------------------------------------------------------
section("TEST 20 — NFC + summary backfill benar (per-school breakdown)");
{
  // NFC: 'é' ditulis ter-dekomposisi (e + U+0301) → normalizeSchoolName NFC-compose.
  const NFC_SCHOOL: SchoolRecord = {
    id: "sch-nfc",
    canonicalName: "SMP Nusantara Melatié",
    normalizedName: "smp nusantara melati\u00e9",
    isActive: true,
  };
  const NFC_SCHOOLS = [...SCHOOLS, NFC_SCHOOL];
  const nfc = decideBackfill(
    {
      studentId: "u20",
      legacySchool: "SMP Nusantara Melatie\u0301",
      existingSchoolId: null,
      groups: [],
    },
    NFC_SCHOOLS,
    ALIASES
  );
  ok(nfc.decision === "NORMALIZED_EXACT", `NFC dekomposisi → NORMALIZED_EXACT (${nfc.decision})`);
  ok(nfc.proposedSchoolId === NFC_SCHOOL.id, "NFC → sch-nfc");

  const decisions = [
    bf({ studentId: "d1", legacySchool: "SMP Negeri 1 Harapan Bangsa", existingSchoolId: null, groups: [] }),
    bf({ studentId: "d2", legacySchool: null, existingSchoolId: null, groups: [{ groupId: "g", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" }] }),
    bf({ studentId: "d3", legacySchool: "SMPN 1 Harapan Bangsa", existingSchoolId: null, groups: [] }),
    bf({ studentId: "d4", legacySchool: "SDN Cemara 01", existingSchoolId: null, groups: [] }),
    bf({ studentId: "d5", legacySchool: null, existingSchoolId: null, groups: [{ groupId: "g", isActive: true, teacherSchool: null }] }),
  ];
  const s = summarizeBackfill(decisions, SCHOOLS);
  ok(s.totalProfiles === 5, `total=5 (${s.totalProfiles})`);
  ok(s.normalizedExact === 1, `normalizedExact=1 (${s.normalizedExact})`);
  ok(s.aliasMatch === 1, `aliasMatch=1 (${s.aliasMatch})`);
  ok(s.groupEvidence === 1, `groupEvidence=1 (${s.groupEvidence})`);
  ok(s.ambiguous === 1, `ambiguous=1 (${s.ambiguous})`);
  ok(s.unresolved === 1, `unresolved=1 (${s.unresolved})`);
  ok(s.safeToBackfill === 3, `safeToBackfill=3 (${s.safeToBackfill})`);
  ok(s.remainingUnresolved === 1, `remainingUnresolved=1 (${s.remainingUnresolved})`);
  ok(s.catalogConflicts === 1, `catalogConflicts=1 (${s.catalogConflicts})`);
  ok(s.perSchool[A.id]?.normalizedExact === 1, "per-school A normalized=1");
  ok(s.perSchool[A.id]?.alias === 1, "per-school A alias=1");
  ok(s.perSchool[B.id]?.groupEvidence === 1, "per-school B group=1");
}

// ---------------------------------------------------------------------------
console.log(`\nHASIL: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
process.exit(0);
