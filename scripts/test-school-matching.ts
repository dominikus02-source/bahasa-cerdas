#!/usr/bin/env npx tsx
/**
 * P1-C Phase 2 — Unit test engine matching identitas sekolah.
 *
 * SEMUA tes MURNI (tanpa DB, tanpa network, tanpa write):
 *   * input data pengerasan di file ini; output dianalisis fungsi murni.
 *   * TIDAK ada panggilan Prisma/db sama sekali.
 *
 * Jalankan: npm run test:school-matching
 */
import * as fs from "fs";
import * as path from "path";
import {
  matchStudentSchool,
  resolveGroupEvidence,
  findPotentialDuplicateSchools,
  summarizeDecisions,
  classifyGroupEvidence,
  type SchoolRecord,
  type AliasRecord,
  type StudentEvidence,
} from "../lib/school/matching";
import { normalizeSchoolName } from "../lib/school/normalize";

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

function dec(input: StudentEvidence): ReturnType<typeof matchStudentSchool> {
  return matchStudentSchool(input, SCHOOLS, ALIASES);
}

// ---------------------------------------------------------------------------
section("TEST 1 — NORMALIZED EXACT unik → HIGH_CONFIDENCE, NORMALIZED_EXACT");
{
  const r = dec({
    studentId: "u1",
    legacySchool: "  SMP   Negeri   1 Harapan Bangsa  ",
    existingSchoolId: null,
    groups: [],
  });
  ok(r.decisionType === "NORMALIZED_EXACT", `decision=NORMALIZED_EXACT (${r.decisionType})`);
  ok(r.confidence === "HIGH_CONFIDENCE", `confidence=HIGH (${r.confidence})`);
  ok(r.evidenceLevel === 3, `evidenceLevel=3 (${r.evidenceLevel})`);
  ok(r.candidateSchoolId === A.id, `candidate=sch-a (${r.candidateSchoolId})`);
}

// ---------------------------------------------------------------------------
section("TEST 2 — VERIFIED ALIAS unik → HIGH_CONFIDENCE, ALIAS_MATCH");
{
  const r = dec({
    studentId: "u2",
    legacySchool: "SMPN 1 Harapan Bangsa",
    existingSchoolId: null,
    groups: [],
  });
  ok(r.decisionType === "ALIAS_MATCH", `decision=ALIAS_MATCH (${r.decisionType})`);
  ok(r.confidence === "HIGH_CONFIDENCE", `confidence=HIGH (${r.confidence})`);
  ok(r.evidenceLevel === 4, `evidenceLevel=4 (${r.evidenceLevel})`);
  ok(r.candidateSchoolId === A.id, `candidate=sch-a (${r.candidateSchoolId})`);
}

// ---------------------------------------------------------------------------
section("TEST 3 — Perbedaan formatting normalisasi → tetap cocok (candidate)");
{
  const r = dec({
    studentId: "u3",
    legacySchool: "  SMP   NEGERI 1   HARAPAN BANGSA ",
    existingSchoolId: null,
    groups: [],
  });
  ok(normalizeSchoolName(r.legacyNormalized) === normalizeSchoolName("SMP Negeri 1 Harapan Bangsa"), "normalisasi konsisten");
  ok(r.decisionType === "NORMALIZED_EXACT", `format beda tetap NORMALIZED_EXACT (${r.decisionType})`);
  ok(r.candidateSchoolId === A.id, "candidate sch-a");
}

// ---------------------------------------------------------------------------
section("TEST 4 — Grup aktif → sekolah guru sama → MEDIUM, CLASS/GROUP");
{
  const r = dec({
    studentId: "u4",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" },
      { groupId: "g2", isActive: true, teacherSchool: "SMA NEGERI 2 Cendekia Nusantara" },
    ],
  });
  ok(r.decisionType === "CANDIDATE_ONLY", `decision=CANDIDATE_ONLY (${r.decisionType})`);
  ok(r.confidence === "MEDIUM_CONFIDENCE", `confidence=MEDIUM (${r.confidence})`);
  ok(r.evidenceLevel === 2, `evidenceLevel=2 (${r.evidenceLevel})`);
  ok(r.candidateSchoolId === B.id, `candidate=sch-b (${r.candidateSchoolId})`);
  ok(r.groupEvidenceQuality === "MULTI_SAME_SCHOOL", `quality=MULTI_SAME_SCHOOL (${r.groupEvidenceQuality})`);
}

// ---------------------------------------------------------------------------
section("TEST 5 — Grup aktif → sekolah guru BEDA → AMBIGUOUS (NO AUTO MATCH)");
{
  const r = dec({
    studentId: "u5",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" },
      { groupId: "g2", isActive: true, teacherSchool: "SMP Negeri 1 Harapan Bangsa" },
    ],
  });
  ok(r.decisionType === "AMBIGUOUS_GROUP_EVIDENCE", `decision=AMBIGUOUS_GROUP_EVIDENCE (${r.decisionType})`);
  ok(r.confidence === "AMBIGUOUS", `confidence=AMBIGUOUS (${r.confidence})`);
  ok(r.candidateSchoolId === null, "candidate null (NO AUTO MATCH)");
  ok(r.groupEvidenceQuality === "MULTI_DIFFERENT_SCHOOL", `quality=MULTI_DIFFERENT_SCHOOL (${r.groupEvidenceQuality})`);
}

// ---------------------------------------------------------------------------
section("TEST 6 — school NULL + bukti grup → CANDIDATE_ONLY (case C)");
{
  const r = dec({
    studentId: "u6",
    legacySchool: null,
    existingSchoolId: null,
    groups: [{ groupId: "g1", isActive: true, teacherSchool: "SMP Negeri 1 Harapan Bangsa" }],
  });
  ok(r.decisionType === "CANDIDATE_ONLY", `decision=CANDIDATE_ONLY (${r.decisionType})`);
  ok(r.candidateSchoolId === A.id, `candidate=sch-a (${r.candidateSchoolId})`);
  ok(r.evidenceLevel === 2, "evidenceLevel 2");
}

// ---------------------------------------------------------------------------
section("TEST 7 — Tanpa grup + tanpa cocok → UNRESOLVED (level 0)");
{
  const r = dec({
    studentId: "u7",
    legacySchool: "Sekolah Tidak Dikenal",
    existingSchoolId: null,
    groups: [],
  });
  ok(r.decisionType === "UNRESOLVED", `decision=UNRESOLVED (${r.decisionType})`);
  ok(r.confidence === "UNRESOLVED", `confidence=UNRESOLVED (${r.confidence})`);
  ok(r.evidenceLevel === 0, "evidenceLevel 0");
  ok(r.candidateSchoolId === null, "candidate null");
  ok(r.groupEvidenceQuality === "NO_GROUP", "quality NO_GROUP");
}

// ---------------------------------------------------------------------------
section("TEST 8 — Guru tanpa sekolah → NO_FALSE_INFERENCE (jangan menebak)");
{
  const r = dec({
    studentId: "u8",
    legacySchool: null,
    existingSchoolId: null,
    groups: [{ groupId: "g1", isActive: true, teacherSchool: null }],
  });
  ok(r.decisionType === "NO_FALSE_INFERENCE", `decision=NO_FALSE_INFERENCE (${r.decisionType})`);
  ok(r.confidence === "UNRESOLVED", `confidence=UNRESOLVED (${r.confidence})`);
  ok(r.candidateSchoolId === null, "candidate null");
  ok(r.groupEvidenceQuality === "TEACHER_EMPTY", `quality=TEACHER_EMPTY (${r.groupEvidenceQuality})`);
}

// ---------------------------------------------------------------------------
section("TEST 9 — Grup inactive diabaikan → INACTIVE_ONLY, tanpa kandidat");
{
  const r = dec({
    studentId: "u9",
    legacySchool: null,
    existingSchoolId: null,
    groups: [
      { groupId: "g1", isActive: false, teacherSchool: "SMP Negeri 1 Harapan Bangsa" },
    ],
  });
  ok(r.decisionType === "UNRESOLVED", `decision=UNRESOLVED (${r.decisionType})`);
  ok(r.groupEvidenceQuality === "INACTIVE_ONLY", `quality=INACTIVE_ONLY (${r.groupEvidenceQuality})`);
  ok(r.candidateSchoolId === null, "candidate null");
}

// ---------------------------------------------------------------------------
section("TEST 10 — schoolId sudah ada → ALREADY_CANONICAL (L5)");
{
  const r = dec({
    studentId: "u10",
    legacySchool: "Nama Lama Sekolah",
    existingSchoolId: A.id,
    groups: [],
  });
  ok(r.decisionType === "ALREADY_CANONICAL", `decision=ALREADY_CANONICAL (${r.decisionType})`);
  ok(r.confidence === "ALREADY_CANONICAL", `confidence=ALREADY_CANONICAL (${r.confidence})`);
  ok(r.evidenceLevel === 5, "evidenceLevel 5");
  ok(r.candidateSchoolId === A.id, `candidate=sch-a (${r.candidateSchoolId})`);
}

// ---------------------------------------------------------------------------
section("TEST 11 — normalizedName duplikat → AMBIGUOUS_CANONICAL");
{
  const r = dec({
    studentId: "u11",
    legacySchool: "SDN Cemara 01",
    existingSchoolId: null,
    groups: [],
  });
  ok(r.decisionType === "AMBIGUOUS_CANONICAL", `decision=AMBIGUOUS_CANONICAL (${r.decisionType})`);
  ok(r.confidence === "AMBIGUOUS", `confidence=AMBIGUOUS (${r.confidence})`);
  ok(r.candidateSchoolId === null, "candidate null");
}

// ---------------------------------------------------------------------------
section("TEST 12 — Alias collides (duplikat normalizedAlias) → AMBIGUOUS_ALIAS");
{
  const collided: AliasRecord[] = [
    ...ALIASES,
    { id: "al-c1", schoolId: B.id, alias: "SMPN 1 Harapan Bangsa", normalizedAlias: "smpn 1 harapan bangsa" },
  ];
  const r = matchStudentSchool(
    {
      studentId: "u12",
      legacySchool: "SMPN 1 Harapan Bangsa",
      existingSchoolId: null,
      groups: [],
    },
    SCHOOLS,
    collided
  );
  ok(r.decisionType === "AMBIGUOUS_ALIAS", `decision=AMBIGUOUS_ALIAS (${r.decisionType})`);
  ok(r.confidence === "AMBIGUOUS", `confidence=AMBIGUOUS (${r.confidence})`);
  ok(r.candidateSchoolId === null, "candidate null");
}

// ---------------------------------------------------------------------------
section("TEST 13 — school ≠ authorization (schoolId tidak pernah dipakai untuk akses)");
{
  const engineSrc = fs.readFileSync(path.join(__dirname, "../lib/school/matching.ts"), "utf-8");
  ok(!/db\.|prisma|create\(|update\(|upsert|delete|deleteMany|updateMany/.test(engineSrc), "engine murni tanpa panggilan DB/tulis");
  ok(/normalizeSchoolName/.test(engineSrc), "memakai helper normalizeSchoolName (single helper)");
  const studentsSrc = fs.readFileSync(path.join(__dirname, "../lib/teacher/students.ts"), "utf-8");
  ok(!/schoolId|\.school\b/.test(studentsSrc.replace(/school\?: string;?/g, "")), "SSOT students.ts tidak memakai school/schoolId untuk akses");
}

// ---------------------------------------------------------------------------
section("TEST 14 — Agregat summary benar (candidate-only, tanpa write)");
{
  const results = [
    dec({ studentId: "a", legacySchool: "SMP Negeri 1 Harapan Bangsa", existingSchoolId: null, groups: [] }),
    dec({ studentId: "b", legacySchool: null, existingSchoolId: null, groups: [{ groupId: "g", isActive: true, teacherSchool: "SMA Negeri 2 Cendekia Nusantara" }] }),
    dec({ studentId: "c", legacySchool: "Sekolah Tidak Dikenal", existingSchoolId: null, groups: [] }),
  ];
  const s = summarizeDecisions(results);
  ok(s.total === 3, `total=3 (${s.total})`);
  ok(s.highConfidence === 1, `high=1 (${s.highConfidence})`);
  ok(s.mediumConfidence === 1, `medium=1 (${s.mediumConfidence})`);
  ok(s.unresolved === 1, `unresolved=1 (${s.unresolved})`);
  ok(s.groupEvidenceOnly === 1, `groupEvidenceOnly=1 (${s.groupEvidenceOnly})`);
  ok(s.normalizedExact === 1, `normalizedExact=1 (${s.normalizedExact})`);
  ok(findPotentialDuplicateSchools(SCHOOLS).length === 1, "deteksi duplikat normalizedName");
  ok(classifyGroupEvidence([]) === "NO_GROUP", "classify no group");
}

// ---------------------------------------------------------------------------
console.log(`\nHASIL: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
process.exit(0);
