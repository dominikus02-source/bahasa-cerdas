/**
 * Business Truth Validation — Phase 2.5: Entity & Journey Forensic Audit
 *
 * READ-ONLY production audit. Does NOT modify any data.
 * Cut-off: September 1, 2026, Asia/Jakarta.
 *
 * Validates the four red flags from Phase 2:
 *   1. 96.9% teachers have zero students
 *   2. Trial → Paid conversion 0.8%
 *   3. 37.2% AI error rate
 *   4. 80.9% schools are single-user
 *
 * Determines whether these are real business problems or data/instrumentation issues.
 */

import { PrismaClient, Role, Prisma } from "@prisma/client";
import { loadScriptEnv, requireDatabaseUrl } from "./_env.js";
import * as fs from "fs";
import * as path from "path";

// BigInt-safe JSON serializer (raw SQL returns BigInt for COUNT/SUM)
function safeJson(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? Number(value) : value, 2
  );
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(path.resolve(filePath), safeJson(data));
}

loadScriptEnv();
requireDatabaseUrl();

const prisma = new PrismaClient({ log: ["error"], datasources: { db: { url: process.env.DATABASE_URL } } });

const CUT_OFF = new Date("2026-09-01T23:59:59+07:00");
const WIB_OFFSET = 7 * 60 * 60 * 1000;

type MetricStatus = "VERIFIED" | "DERIVED" | "PROXY" | "UNVERIFIED" | "DATA_QUALITY_ISSUE";

interface Metric {
  metric: string;
  value: unknown;
  unit?: string;
  period?: string;
  status: MetricStatus;
  source: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
}

interface TeacherForensic {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isFounder: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
  schoolRaw: string | null;
  schoolId: string | null;
  groupCount: number;
  totalStudents: number;
  groups: { id: string; name: string; memberCount: number }[];
  aiUsageCount: number;
  quizCount: number;
  rppCount: number;
  premiumPlan: string;
  isPremium: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  hasActivity: boolean;
}

interface SchoolForensic {
  rawName: string;
  normalized: string;
  teacherCount: number;
  studentCount: number;
  classCount: number;
  totalUsers: number;
  learningEvents: number;
  karyaCount: number;
  assessmentCount: number;
  lastActivity: Date | null;
  users: { userId: string; role: string; createdAt: Date }[];
}

interface StudentJourney {
  userId: string;
  email: string;
  fullName: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  schoolRaw: string | null;
  schoolId: string | null;
  groupIds: string[];
  xpTotal: number;
  karyaCount: number;
  unitProgressCount: number;
  completedUnits: number;
  learningEvidenceCount: number;
  diagnosticSessions: number;
  adaptiveSessions: number;
  ukbiSessions: number;
  ukbiCertificates: number;
  badgeCount: number;
  dailyActionCount: number;
  gameResultCount: number;
}

const metrics: Metric[] = [];

function record(metric: string, value: unknown, opts: { unit?: string; period?: string; status?: MetricStatus; source: string; confidence?: "HIGH" | "MEDIUM" | "LOW"; notes?: string } = { source: "business-truth-validation" }) {
  metrics.push({
    metric,
    value,
    unit: opts.unit,
    period: opts.period,
    status: opts.status || "VERIFIED",
    source: opts.source,
    confidence: opts.confidence || "HIGH",
    notes: opts.notes,
  });
}

function pct(n: number, d: number): string {
  return d === 0 ? "0%" : ((n / d) * 100).toFixed(1) + "%";
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function safeSection<T>(name: string, fn: () => T): T | null {
  try {
    const result = fn();
    console.log(`  ✅ ${name}`);
    return result;
  } catch (e: any) {
    console.log(`  ⚠️  ${name}: ${e.message?.slice(0, 100)}`);
    record(`error.${name}`, e.message?.slice(0, 200), { status: "UNVERIFIED", source: name, confidence: "LOW" });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: TEACHER FORENSIC SAMPLE
// ═══════════════════════════════════════════════════════════════════════════════
async function section1_TeacherForensicSample() {
  console.log("\n📋 Section 1: Teacher Forensic Sample");

  const allGurus = await prisma.user.findMany({
    where: { role: "GURU" },
    select: {
      id: true, email: true, fullName: true, role: true, isFounder: true,
      createdAt: true, lastActiveAt: true, isPremium: true, premiumPlan: true,
      trialStartedAt: true, trialEndsAt: true,
      profile: { select: { school: true, schoolId: true } },
      groups: { select: { id: true, name: true, members: { select: { id: true, userId: true } } } },
      aiUsage: { select: { id: true, feature: true, status: true } },
      quizzes: { select: { id: true } },
      generatedRPPs: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Categorize teachers
  const withStudents: TeacherForensic[] = [];
  const withoutStudents: TeacherForensic[] = [];
  const withAi: TeacherForensic[] = [];
  const withClasses: TeacherForensic[] = [];

  for (const g of allGurus) {
    const totalStudents = g.groups.reduce((sum, grp) => sum + grp.members.length, 0);
    const t: TeacherForensic = {
      userId: g.id,
      email: g.email,
      fullName: g.fullName,
      role: g.role,
      isFounder: g.isFounder,
      createdAt: g.createdAt,
      lastActiveAt: g.lastActiveAt,
      schoolRaw: g.profile?.school ?? null,
      schoolId: g.profile?.schoolId ?? null,
      groupCount: g.groups.length,
      totalStudents,
      groups: g.groups.map(grp => ({ id: grp.id, name: grp.name, memberCount: grp.members.length })),
      aiUsageCount: g.aiUsage.length,
      quizCount: g.quizzes.length,
      rppCount: g.generatedRPPs.length,
      premiumPlan: g.premiumPlan,
      isPremium: g.isPremium,
      trialStartedAt: g.trialStartedAt,
      trialEndsAt: g.trialEndsAt,
      hasActivity: totalStudents > 0 || g.aiUsage.length > 0 || g.quizzes.length > 0 || g.generatedRPPs.length > 0,
    };

    if (totalStudents > 0) withStudents.push(t);
    else withoutStudents.push(t);
    if (g.aiUsage.length > 0) withAi.push(t);
    if (g.groups.length > 0) withClasses.push(t);
  }

  // Sample: 20 active (has students), 20 inactive (no students, no activity), 20 AI users, 20 with classes, 20 zero-student
  const sampleActive = withStudents.slice(0, 20);
  const sampleInactive = withoutStudents.filter(t => !t.hasActivity).slice(0, 20);
  const sampleAi = withAi.slice(0, 20);
  const sampleClasses = withClasses.slice(0, 20);
  const sampleZero = withoutStudents.slice(0, 20);

  const samples = {
    activeWithStudents: sampleActive,
    inactiveNoActivity: sampleInactive,
    aiUsers: sampleAi,
    withClasses: sampleClasses,
    zeroStudents: sampleZero,
  };

  record("teacher.forensic.total", allGurus.length, { source: "section1" });
  record("teacher.forensic.withStudents", withStudents.length, { source: "section1" });
  record("teacher.forensic.withoutStudents", withoutStudents.length, { source: "section1" });
  record("teacher.forensic.withAi", withAi.length, { source: "section1" });
  record("teacher.forensic.withClasses", withClasses.length, { source: "section1" });
  record("teacher.forensic.withoutStudents_noActivity", withoutStudents.filter(t => !t.hasActivity).length, { source: "section1" });

  // Save forensic samples
  const sampleDir = path.resolve("data");
  fs.mkdirSync(sampleDir, { recursive: true });
  writeJson(
    path.join(sampleDir, "teacher-forensic-samples-september-2026.json"),
    samples
  );

  return { allGurus, withStudents, withoutStudents, withAi, withClasses, samples };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: TEACHER → CLASS → STUDENT RELATIONSHIP
// ═══════════════════════════════════════════════════════════════════════════════
async function section2_RelationshipMatrix(allGurus: any[]) {
  console.log("\n📋 Section 2: Teacher → Class → Student Relationship Matrix");

  // Get all groups with members
  const groups = await prisma.group.findMany({
    select: {
      id: true, name: true, teacherId: true,
      members: { select: { id: true, userId: true } },
    },
  });

  // Get all enrollments (GroupMember)
  const allMembers = await prisma.groupMember.findMany({
    select: { groupId: true, userId: true },
  });

  // Build teacher → class → students map
  const teacherClassMap = new Map<string, { groups: string[]; students: Set<string> }>();
  for (const g of allGurus) {
    teacherClassMap.set(g.id, { groups: [], students: new Set() });
  }
  for (const grp of groups) {
    const entry = teacherClassMap.get(grp.teacherId);
    if (entry) {
      entry.groups.push(grp.id);
      for (const m of grp.members) {
        entry.students.add(m.userId);
      }
    }
  }

  // Matrix
  let noClass = 0, classNoStudents = 0, classWithStudents = 0, studentsAttributionMissing = 0;

  for (const g of allGurus) {
    const entry = teacherClassMap.get(g.id);
    if (!entry) { noClass++; continue; }
    if (entry.groups.length === 0) { noClass++; continue; }
    if (entry.students.size === 0) { classNoStudents++; continue; }
    classWithStudents++;
  }

  // Students without any group membership
  const allStudentIds = (await prisma.user.findMany({ where: { role: "MURID" }, select: { id: true } })).map(u => u.id);
  const memberUserIds = new Set(allMembers.map(m => m.userId));
  const studentsWithoutGroup = allStudentIds.filter(id => !memberUserIds.has(id));

  record("relationship.total_teachers", allGurus.length, { source: "section2" });
  record("relationship.noClass", noClass, { source: "section2", notes: "Teachers who never created any group" });
  record("relationship.classNoStudents", classNoStudents, { source: "section2", notes: "Teachers with groups but zero members" });
  record("relationship.classWithStudents", classWithStudents, { source: "section2", notes: "Teachers with groups AND at least 1 member" });
  record("relationship.totalGroups", groups.length, { source: "section2" });
  record("relationship.totalEnrollments", allMembers.length, { source: "section2" });
  record("relationship.uniqueStudentsInGroups", memberUserIds.size, { source: "section2" });
  record("relationship.studentsWithoutGroup", studentsWithoutGroup.length, { source: "section2", notes: "MURID users with no GroupMember record" });

  console.log(`  No class: ${noClass}, Class no students: ${classNoStudents}, Class with students: ${classWithStudents}`);
  console.log(`  Students in groups: ${memberUserIds.size}, Students without group: ${studentsWithoutGroup.length}`);

  return { teacherClassMap, groups, allMembers, studentsWithoutGroup, noClass, classNoStudents, classWithStudents };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: ZERO-STUDENT TEACHER ROOT CAUSE
// ═══════════════════════════════════════════════════════════════════════════════
async function section3_ZeroStudentRootCause(allGurus: any[], teacherClassMap: Map<string, any>) {
  console.log("\n📋 Section 3: Zero-Student Teacher Root Cause");

  const rootCauses: Record<string, number> = {
    "A_neverCreatedClass": 0,
    "B_classCreated_noStudentsJoined": 0,
    "C_studentsJoined_attributionMissing": 0,
    "D_studentsUnderSchool_notTeacher": 0,
    "E_legacyMigration": 0,
    "F_testDemoAccount": 0,
    "G_other": 0,
  };

  const testEmailPatterns = /demo|test|example|dev|staging|qa|admin@|founder/i;
  const internalEmails = /@bahasacerdas\.com|@internal/i;

  // Get all school names for teachers without students
  const teachersWithoutStudents = allGurus.filter(g => {
    const entry = teacherClassMap.get(g.id);
    return !entry || entry.students.size === 0;
  });

  for (const teacher of teachersWithoutStudents) {
    const entry = teacherClassMap.get(teacher.id);
    const email = teacher.email || "";

    // F: Test/demo account
    if (testEmailPatterns.test(email) || internalEmails.test(email)) {
      rootCauses["F_testDemoAccount"]++;
      continue;
    }

    // A: Never created a class
    if (!entry || entry.groups.length === 0) {
      rootCauses["A_neverCreatedClass"]++;
      continue;
    }

    // B: Class created but no students joined
    if (entry.students.size === 0) {
      rootCauses["B_classCreated_noStudentsJoined"]++;
      continue;
    }

    // Should not reach here but handle gracefully
    rootCauses["G_other"]++;
  }

  // Check: students under same school but not teacher's class
  const teachersWithSchool = await prisma.user.findMany({
    where: { role: "GURU", profile: { school: { not: null } } },
    select: { id: true, profile: { select: { school: true } } },
  });

  const studentsWithSchool = await prisma.user.findMany({
    where: { role: "MURID", profile: { school: { not: null } } },
    select: { id: true, profile: { select: { school: true } } },
  });

  // Group students by school name
  const studentsBySchool = new Map<string, string[]>();
  for (const s of studentsWithSchool) {
    const school = s.profile?.school?.trim().toLowerCase();
    if (school) {
      const arr = studentsBySchool.get(school) || [];
      arr.push(s.id);
      studentsBySchool.set(school, arr);
    }
  }

  // Count D: students under same school name but not in teacher's class
  let countD = 0;
  for (const teacher of teachersWithoutStudents) {
    const entry = teacherClassMap.get(teacher.id);
    if (!entry || entry.groups.length === 0) continue;
    const school = teacher.profile?.school?.trim().toLowerCase();
    if (!school) continue;
    const studentsInSchool = studentsBySchool.get(school) || [];
    const studentSet = entry.students;
    const orphanStudents = studentsInSchool.filter(s => !studentSet.has(s));
    if (orphanStudents.length > 0) {
      countD += orphanStudents.length;
    }
  }

  // E: Legacy migration - teachers created before groups existed
  const legacyTeachers = teachersWithoutStudents.filter(t => {
    return !testEmailPatterns.test(t.email) && t.createdAt < new Date("2026-06-01");
  });

  record("zeroStudent.rootCause.A_neverCreatedClass", rootCauses["A_neverCreatedClass"], { source: "section3" });
  record("zeroStudent.rootCause.B_classNoStudents", rootCauses["B_classCreated_noStudentsJoined"], { source: "section3" });
  record("zeroStudent.rootCause.F_testDemo", rootCauses["F_testDemoAccount"], { source: "section3" });
  record("zeroStudent.rootCause.G_other", rootCauses["G_other"], { source: "section3" });
  record("zeroStudent.rootCause.D_studentsUnderSchool_notTeacher", countD, { source: "section3", notes: "Students sharing teacher's school name but not in their class" });
  record("zeroStudent.rootCause.E_legacyMigration", legacyTeachers.length, { source: "section3", notes: "Teachers created before June 2026 with no classes" });
  record("zeroStudent.total", teachersWithoutStudents.length, { source: "section3" });

  console.log(`  Root causes:`, rootCauses);
  console.log(`  D (students under school not teacher): ${countD}`);

  return rootCauses;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4-6: SCHOOL IDENTITY, DUPLICATION, ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════════
async function section4_SchoolForensics() {
  console.log("\n📋 Section 4-6: School Identity, Duplication & Activity");

  // Use raw SQL for batched per-school aggregation — avoids N+1 Prisma queries
  const schoolAggRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      p.school as raw_name,
      COUNT(DISTINCT CASE WHEN u.role = 'GURU' THEN u.id END) as teacher_count,
      COUNT(DISTINCT CASE WHEN u.role = 'MURID' THEN u.id END) as student_count,
      COUNT(DISTINCT u.id) as total_users,
      MIN(u."createdAt") as earliest_signup,
      MAX(u."lastActiveAt") as last_active
    FROM "Profile" p
    JOIN "User" u ON p."userId" = u.id
    WHERE p.school IS NOT NULL AND p.school != ''
    GROUP BY p.school
    ORDER BY total_users DESC
  `);

  // Get per-school class counts (teacher's groups)
  const classCounts = await prisma.$queryRawUnsafe<any[]>(`
    SELECT p.school as raw_name, COUNT(DISTINCT g.id) as class_count
    FROM "Profile" p
    JOIN "User" u ON p."userId" = u.id
    JOIN "Group" g ON g."teacherId" = u.id
    WHERE p.school IS NOT NULL AND u.role = 'GURU'
    GROUP BY p.school
  `);

  const classCountMap = new Map<string, number>(classCounts.map((r: any) => [r.raw_name, Number(r.class_count)]));

  // Get per-school learning events
  const learningCounts = await prisma.$queryRawUnsafe<any[]>(`
    SELECT p.school as raw_name, COUNT(DISTINCT uup.id) as learning_events
    FROM "Profile" p
    JOIN "User" u ON p."userId" = u.id
    JOIN "UserUnitProgress" uup ON uup."userId" = u.id
    WHERE p.school IS NOT NULL
    GROUP BY p.school
  `);

  const learningMap = new Map<string, number>(learningCounts.map((r: any) => [r.raw_name, Number(r.learning_events)]));

  // Get per-school karya counts
  const karyaCounts = await prisma.$queryRawUnsafe<any[]>(`
    SELECT p.school as raw_name, COUNT(DISTINCT sk.id) as karya_count
    FROM "Profile" p
    JOIN "User" u ON p."userId" = u.id
    JOIN "StudentKarya" sk ON sk."userId" = u.id
    WHERE p.school IS NOT NULL
    GROUP BY p.school
  `);

  const karyaMap = new Map<string, number>(karyaCounts.map((r: any) => [r.raw_name, Number(r.karya_count)]));

  // Get per-school assessment counts
  const assessmentCounts = await prisma.$queryRawUnsafe<any[]>(`
    SELECT p.school as raw_name, COUNT(DISTINCT pk.id) as assessment_count
    FROM "Profile" p
    JOIN "User" u ON p."userId" = u.id
    JOIN "ProgresKompetensi" pk ON pk."userId" = u.id
    WHERE p.school IS NOT NULL
    GROUP BY p.school
  `);

  const assessmentMap = new Map<string, number>(assessmentCounts.map((r: any) => [r.raw_name, Number(r.assessment_count)]));

  // Normalization function
  function normalize(s: string): string {
    return s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  }

  // Group by normalized name
  const byNormalized = new Map<string, { rawNames: Set<string>; teacherCount: number; studentCount: number; totalUsers: number }>();
  for (const row of schoolAggRows) {
    const norm = normalize(row.raw_name);
    const entry = byNormalized.get(norm) || { rawNames: new Set(), teacherCount: 0, studentCount: 0, totalUsers: 0 };
    entry.rawNames.add(row.raw_name);
    entry.teacherCount += Number(row.teacher_count);
    entry.studentCount += Number(row.student_count);
    entry.totalUsers += Number(row.total_users);
    byNormalized.set(norm, entry);
  }

  // Detect duplications
  const duplicates: { normalized: string; rawNames: string[]; count: number }[] = [];
  for (const [norm, data] of byNormalized) {
    if (data.rawNames.size > 1) {
      duplicates.push({ normalized: norm, rawNames: Array.from(data.rawNames), count: data.rawNames.size });
    }
  }
  duplicates.sort((a, b) => b.count - a.count);

  // Build school forensics
  const schoolForensics: SchoolForensic[] = schoolAggRows.map((row: any) => ({
    rawName: row.raw_name,
    normalized: normalize(row.raw_name),
    teacherCount: Number(row.teacher_count),
    studentCount: Number(row.student_count),
    classCount: classCountMap.get(row.raw_name) || 0,
    totalUsers: Number(row.total_users),
    learningEvents: learningMap.get(row.raw_name) || 0,
    karyaCount: karyaMap.get(row.raw_name) || 0,
    assessmentCount: assessmentMap.get(row.raw_name) || 0,
    lastActivity: row.last_active ? new Date(row.last_active) : null,
    users: [], // not needed for classification
  }));

  // Classification
  const classifications = { phantom: 0, singleUser: 0, emerging: 0, cluster: 0, strongCluster: 0 };
  for (const s of schoolForensics) {
    const meaningfulUsers = s.teacherCount + s.studentCount;
    const hasActivity = s.learningEvents > 0 || s.karyaCount > 0 || s.assessmentCount > 0;
    if (!hasActivity) classifications.phantom++;
    else if (meaningfulUsers === 1) classifications.singleUser++;
    else if (meaningfulUsers >= 2 && meaningfulUsers <= 4) classifications.emerging++;
    else if (meaningfulUsers >= 5 && meaningfulUsers <= 19) classifications.cluster++;
    else if (meaningfulUsers >= 20) classifications.strongCluster++;
  }

  record("school.rawUniqueNames", schoolAggRows.length, { source: "section4" });
  record("school.normalizedNames", byNormalized.size, { source: "section4" });
  record("school.nameCollisions", duplicates.length, { source: "section5" });
  record("school.phantom", classifications.phantom, { source: "section6", notes: "No meaningful activity" });
  record("school.singleUser", classifications.singleUser, { source: "section6" });
  record("school.emerging", classifications.emerging, { source: "section6", notes: "2-4 users" });
  record("school.cluster", classifications.cluster, { source: "section6", notes: "5-19 users" });
  record("school.strongCluster", classifications.strongCluster, { source: "section6", notes: "20+ users" });

  writeJson(
    path.resolve("data", "school-duplications-september-2026.json"),
    { duplicates, totalRaw: schoolAggRows.length, totalNormalized: byNormalized.size }
  );

  console.log(`  Raw names: ${schoolAggRows.length}, Normalized: ${byNormalized.size}`);
  console.log(`  Duplicates: ${duplicates.length}`);
  console.log(`  Phantom: ${classifications.phantom}, Single: ${classifications.singleUser}, Emerging: ${classifications.emerging}, Cluster: ${classifications.cluster}, Strong: ${classifications.strongCluster}`);

  return { schoolsByName: new Map(schoolAggRows.map((r: any) => [r.raw_name, { profiles: [] }])), byNormalized, duplicates, schoolForensics, classifications };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: SCHOOL CLUSTER ANALYSIS (TOP 50)
// ═══════════════════════════════════════════════════════════════════════════════
async function section7_SchoolClusters(schoolForensics: SchoolForensic[]) {
  console.log("\n📋 Section 7: School Cluster Analysis (Top 50)");

  // Sort by total users descending
  const sorted = [...schoolForensics].sort((a, b) => b.totalUsers - a.totalUsers);
  const top50 = sorted.slice(0, 50);

  record("school.cluster.top50_totalUsers", top50[0]?.totalUsers ?? 0, { source: "section7", notes: "Largest school" });
  record("school.cluster.top50_count", top50.length, { source: "section7" });
  record("school.cluster.top50_hasClass", top50.filter(s => s.classCount > 0).length, { source: "section7", notes: "Top 50 schools with classes" });
  record("school.cluster.top50_hasActivity", top50.filter(s => s.learningEvents > 0 || s.karyaCount > 0).length, { source: "section7" });

  writeJson(
    path.resolve("data", "school-cluster-top50-september-2026.json"),
    top50.map(s => ({
      rawName: s.rawName, normalized: s.normalized,
      teachers: s.teacherCount, students: s.studentCount,
      classes: s.classCount, learningEvents: s.learningEvents,
      karya: s.karyaCount, assessment: s.assessmentCount,
      lastActivity: s.lastActivity,
    }))
  );

  console.log(`  Top school: ${top50[0]?.rawName} (${top50[0]?.totalUsers} users)`);
  return top50;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: SCHOOL COHORT
// ═══════════════════════════════════════════════════════════════════════════════
async function section8_SchoolCohort(schoolForensics: SchoolForensic[]) {
  console.log("\n📋 Section 8: School Cohort by Month");

  const cohorts = new Map<string, {
    newSchools: number; activeSchools: number;
    multiUserSchools: number; clusterSchools: number;
  }>();

  for (const school of schoolForensics) {
    // Find earliest user signup for this school
    const earliestUser = school.users.reduce((min, u) =>
      u.createdAt < min ? u.createdAt : min, school.users[0]?.createdAt ?? new Date()
    );
    const monthKey = `${earliestUser.getFullYear()}-${String(earliestUser.getMonth() + 1).padStart(2, "0")}`;

    const entry = cohorts.get(monthKey) || { newSchools: 0, activeSchools: 0, multiUserSchools: 0, clusterSchools: 0 };
    entry.newSchools++;

    const meaningfulUsers = school.teacherCount + school.studentCount;
    const hasActivity = school.learningEvents > 0 || school.karyaCount > 0;
    if (hasActivity) entry.activeSchools++;
    if (meaningfulUsers > 1) entry.multiUserSchools++;
    if (meaningfulUsers >= 5) entry.clusterSchools++;

    cohorts.set(monthKey, entry);
  }

  // Sort by month
  const sorted = Array.from(cohorts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [month, data] of sorted) {
    record(`school.cohort.${month}.newSchools`, data.newSchools, { source: "section8" });
    record(`school.cohort.${month}.active`, data.activeSchools, { source: "section8" });
    record(`school.cohort.${month}.multiUser`, data.multiUserSchools, { source: "section8" });
    record(`school.cohort.${month}.cluster`, data.clusterSchools, { source: "section8" });
  }

  console.log(`  Cohorts: ${sorted.map(([m, d]) => `${m}(${d.newSchools})`).join(", ")}`);
  return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: TEACHER-LED DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════
async function section9_TeacherLedDistribution(allGurus: any[], teacherClassMap: Map<string, any>) {
  console.log("\n📋 Section 9: Teacher-Led Distribution");

  const studentsPerTeacher: number[] = [];
  const teachersWithStudents = allGurus.filter(g => {
    const entry = teacherClassMap.get(g.id);
    return entry && entry.students.size > 0;
  });

  for (const g of teachersWithStudents) {
    const entry = teacherClassMap.get(g.id)!;
    studentsPerTeacher.push(entry.students.size);
  }

  studentsPerTeacher.sort((a, b) => a - b);

  const median = studentsPerTeacher.length > 0
    ? studentsPerTeacher[Math.floor(studentsPerTeacher.length / 2)]
    : 0;

  // Time to first student (for teachers who have students)
  const timeToFirstStudent: number[] = [];
  for (const g of teachersWithStudents) {
    const entry = teacherClassMap.get(g.id)!;
    // Find earliest group creation
    const groups = await prisma.group.findMany({
      where: { teacherId: g.id },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (groups.length > 0) {
      const firstGroup = groups[0];
      // Find earliest student in any group
      const earliestMember = await prisma.groupMember.findFirst({
        where: { groupId: { in: groups.map(grp => grp.id) } },
        orderBy: { joinedAt: "asc" },
        select: { joinedAt: true },
      });
      if (earliestMember) {
        const days = daysBetween(firstGroup.createdAt, earliestMember.joinedAt);
        timeToFirstStudent.push(days);
      }
    }
  }

  timeToFirstStudent.sort((a, b) => a - b);
  const medianTimeToFirstStudent = timeToFirstStudent.length > 0
    ? timeToFirstStudent[Math.floor(timeToFirstStudent.length / 2)]
    : null;

  const buckets = {
    zeroStudents: allGurus.length - teachersWithStudents.length,
    oneToFive: studentsPerTeacher.filter(n => n >= 1 && n <= 5).length,
    sixToTen: studentsPerTeacher.filter(n => n >= 6 && n <= 10).length,
    elevenToTwentyFive: studentsPerTeacher.filter(n => n >= 11 && n <= 25).length,
    twentySixToFifty: studentsPerTeacher.filter(n => n >= 26 && n <= 50).length,
    fiftyPlus: studentsPerTeacher.filter(n => n >= 51).length,
  };

  record("teacherDistribution.medianStudentsPerTeacher", median, { source: "section9" });
  record("teacherDistribution.medianTimeToFirstStudentDays", medianTimeToFirstStudent, { source: "section9" });
  record("teacherDistribution.teachersWith1Plus", teachersWithStudents.length, { source: "section9" });
  record("teacherDistribution.teachersWith5Plus", studentsPerTeacher.filter(n => n >= 5).length, { source: "section9" });
  record("teacherDistribution.teachersWith10Plus", studentsPerTeacher.filter(n => n >= 10).length, { source: "section9" });
  record("teacherDistribution.teachersWith25Plus", studentsPerTeacher.filter(n => n >= 25).length, { source: "section9" });
  record("teacherDistribution.zeroStudents", buckets.zeroStudents, { source: "section9" });
  record("teacherDistribution.oneToFive", buckets.oneToFive, { source: "section9" });
  record("teacherDistribution.sixToTen", buckets.sixToTen, { source: "section9" });
  record("teacherDistribution.elevenTo25", buckets.elevenToTwentyFive, { source: "section9" });
  record("teacherDistribution.twentySixTo50", buckets.twentySixToFifty, { source: "section9" });
  record("teacherDistribution.fiftyPlus", buckets.fiftyPlus, { source: "section9" });

  console.log(`  Median students/teacher: ${median}`);
  console.log(`  Median time to first student: ${medianTimeToFirstStudent} days`);
  console.log(`  Teachers with 5+: ${buckets.oneToFive + buckets.sixToTen + buckets.elevenToTwentyFive + buckets.twentySixToFifty + buckets.fiftyPlus}`);

  return { studentsPerTeacher, median, timeToFirstStudent, medianTimeToFirstStudent, buckets };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: STUDENT ORIGIN
// ═══════════════════════════════════════════════════════════════════════════════
async function section10_StudentOrigin() {
  console.log("\n📋 Section 10: Student Origin");

  const totalStudents = await prisma.user.count({ where: { role: "MURID" } });
  const members = await prisma.groupMember.findMany({ select: { userId: true } });
  const studentsInGroups = new Set(members.map(m => m.userId));

  const attributions = await prisma.teacherAttribution.findMany({
    select: { studentId: true, source: true },
  });

  const attributedStudents = new Set(attributions.map(a => a.studentId));

  // Students who joined via class (have GroupMember)
  const viaClass = studentsInGroups.size;

  // Students who have attribution (any source)
  const viaAttribution = attributedStudents.size;

  // Attribution sources breakdown
  const sourceBreakdown = new Map<string, number>();
  for (const a of attributions) {
    sourceBreakdown.set(a.source, (sourceBreakdown.get(a.source) || 0) + 1);
  }

  const viaClassOnly = [...studentsInGroups].filter(id => !attributedStudents.has(id)).length;
  const viaAttributionOnly = [...attributedStudents].filter(id => !studentsInGroups.has(id)).length;
  const viaBoth = [...studentsInGroups].filter(id => attributedStudents.has(id)).length;
  const viaNeither = totalStudents - viaClassOnly - viaAttributionOnly - viaBoth;

  record("studentOrigin.total", totalStudents, { source: "section10" });
  record("studentOrigin.viaClass", viaClass, { source: "section10" });
  record("studentOrigin.viaAttribution", viaAttribution, { source: "section10" });
  record("studentOrigin.viaBoth", viaBoth, { source: "section10" });
  record("studentOrigin.viaNeither", viaNeither, { source: "section10", notes: "Students without class membership OR attribution" });
  record("studentOrigin.instrumented", viaClass + viaAttribution - viaBoth, { source: "section10", notes: "Students with at least one tracking mechanism" });

  for (const [source, count] of sourceBreakdown) {
    record(`studentOrigin.attribution.${source}`, count, { source: "section10" });
  }

  console.log(`  Via class: ${viaClass}, Via attribution: ${viaAttribution}, Neither: ${viaNeither}`);
  console.log(`  Sources:`, Object.fromEntries(sourceBreakdown));

  return { totalStudents, viaClass, viaAttribution, viaNeither, sourceBreakdown };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: STUDENT JOURNEY FORENSICS
// ═══════════════════════════════════════════════════════════════════════════════
async function section11_StudentJourneyForensics() {
  console.log("\n📋 Section 11: Student Journey Forensics");

  // Use SQL to classify students without loading full objects
  const studentStats = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      u.id, u.email, u."fullName", u."createdAt", u."lastActiveAt", u.xp,
      p.school as school_raw, p."schoolId",
      (SELECT COUNT(*) FROM "GroupMember" gm WHERE gm."userId" = u.id) as group_count,
      (SELECT COUNT(*) FROM "StudentKarya" sk WHERE sk."userId" = u.id) as karya_count,
      (SELECT COUNT(*) FROM "UserUnitProgress" uup WHERE uup."userId" = u.id) as unit_progress_count,
      (SELECT COUNT(*) FROM "UserUnitProgress" uup WHERE uup."userId" = u.id AND uup."completed" = true) as completed_units,
      (SELECT COUNT(*) FROM "LearningEvidence" le WHERE le."userId" = u.id) as evidence_count,
      (SELECT COUNT(*) FROM "AdaptivePracticeSession" aps WHERE aps."userId" = u.id) as adaptive_count,
      (SELECT COUNT(*) FROM "ProgresKompetensi" pk WHERE pk."userId" = u.id) as ukbi_count,
      (SELECT COUNT(*) FROM "GameResult" gr WHERE gr."userId" = u.id) as game_count,
      (SELECT COALESCE(SUM(xl.amount), 0) FROM "XpLedger" xl WHERE xl."userId" = u.id) as xp_total
    FROM "User" u
    LEFT JOIN "Profile" p ON p."userId" = u.id
    WHERE u.role = 'MURID'
    ORDER BY u.xp DESC
  `);

  const highlyActive = studentStats.filter(s => Number(s.xp_total) >= 500 || Number(s.karya_count) >= 3 || Number(s.unit_progress_count) >= 10);
  const moderatelyActive = studentStats.filter(s => {
    const xp = Number(s.xp_total);
    const karya = Number(s.karya_count);
    return (xp >= 100 && xp < 500) || (karya >= 1 && karya < 3);
  });
  const inactive = studentStats.filter(s => Number(s.xp_total) === 0 && Number(s.karya_count) === 0 && Number(s.unit_progress_count) === 0);

  record("studentJourney.total", studentStats.length, { source: "section11" });
  record("studentJourney.highlyActive", highlyActive.length, { source: "section11" });
  record("studentJourney.moderatelyActive", moderatelyActive.length, { source: "section11" });
  record("studentJourney.inactive", inactive.length, { source: "section11" });

  // Save samples (top 20 of each)
  writeJson(
    path.resolve("data", "student-journey-samples-september-2026.json"),
    {
      highlyActive: highlyActive.slice(0, 20),
      moderatelyActive: moderatelyActive.slice(0, 20),
      inactive: inactive.slice(0, 20),
    }
  );

  console.log(`  Highly active: ${highlyActive.length}, Moderate: ${moderatelyActive.length}, Inactive: ${inactive.length}`);
  return { studentStats, highlyActive, moderatelyActive, inactive };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: STUDENT RETENTION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════
async function section12_RetentionValidation() {
  console.log("\n📋 Section 12: Student Retention Validation");

  // Use raw SQL for cohort retention — avoid loading all students into memory
  const cohortStats = await prisma.$queryRawUnsafe<any[]>(`
    WITH student_cohort AS (
      SELECT
        u.id,
        DATE_TRUNC('month', u."createdAt" AT TIME ZONE 'Asia/Jakarta') as cohort_month,
        u."createdAt" as signup,
        EXISTS(
          SELECT 1 FROM "XpLedger" xl WHERE xl."userId" = u.id
          UNION SELECT 1 FROM "UserUnitProgress" uup WHERE uup."userId" = u.id
          UNION SELECT 1 FROM "StudentKarya" sk WHERE sk."userId" = u.id
          UNION SELECT 1 FROM "LearningEvidence" le WHERE le."userId" = u.id
        ) as has_activity,
        EXISTS(
          SELECT 1 FROM "XpLedger" xl WHERE xl."userId" = u.id AND xl."createdAt" > u."createdAt" + INTERVAL '7 days' AND xl."createdAt" <= u."createdAt" + INTERVAL '14 days'
          UNION SELECT 1 FROM "UserUnitProgress" uup WHERE uup."userId" = u.id AND uup."createdAt" > u."createdAt" + INTERVAL '7 days' AND uup."createdAt" <= u."createdAt" + INTERVAL '14 days'
          UNION SELECT 1 FROM "StudentKarya" sk WHERE sk."userId" = u.id AND sk."createdAt" > u."createdAt" + INTERVAL '7 days' AND sk."createdAt" <= u."createdAt" + INTERVAL '14 days'
        ) as has_d14,
        EXISTS(
          SELECT 1 FROM "XpLedger" xl WHERE xl."userId" = u.id AND xl."createdAt" > u."createdAt" + INTERVAL '14 days' AND xl."createdAt" <= u."createdAt" + INTERVAL '30 days'
          UNION SELECT 1 FROM "UserUnitProgress" uup WHERE uup."userId" = u.id AND uup."createdAt" > u."createdAt" + INTERVAL '14 days' AND uup."createdAt" <= u."createdAt" + INTERVAL '30 days'
          UNION SELECT 1 FROM "StudentKarya" sk WHERE sk."userId" = u.id AND sk."createdAt" > u."createdAt" + INTERVAL '14 days' AND sk."createdAt" <= u."createdAt" + INTERVAL '30 days'
        ) as has_d30,
        EXISTS(
          SELECT 1 FROM "Profile" p WHERE p."userId" = u.id AND p.school IS NOT NULL AND p.school != ''
        ) as has_school
      FROM "User" u
      WHERE u.role = 'MURID'
    )
    SELECT
      TO_CHAR(cohort_month, 'YYYY-MM') as cohort,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE has_activity) as activated,
      COUNT(*) FILTER (WHERE has_activity AND has_d14) as d14,
      COUNT(*) FILTER (WHERE has_activity AND has_d30) as d30,
      COUNT(*) FILTER (WHERE has_activity AND has_school AND has_d30) as school_d30,
      COUNT(*) FILTER (WHERE has_activity AND NOT has_school AND has_d30) as nonschool_d30
    FROM student_cohort
    GROUP BY cohort_month
    ORDER BY cohort_month
  `);

  for (const row of cohortStats) {
    const cohort = row.cohort;
    record(`retention.${cohort}.total`, Number(row.total), { source: "section12" });
    record(`retention.${cohort}.activated`, Number(row.activated), { source: "section12" });
    record(`retention.${cohort}.d14`, Number(row.d14), { source: "section12", notes: `${pct(Number(row.d14), Number(row.activated))} of activated` });
    record(`retention.${cohort}.d30`, Number(row.d30), { source: "section12", notes: `${pct(Number(row.d30), Number(row.activated))} of activated` });
    record(`retention.${cohort}.schoolLinked.d30`, Number(row.school_d30), { source: "section12" });
    record(`retention.${cohort}.nonSchoolLinked.d30`, Number(row.nonschool_d30), { source: "section12" });

    console.log(`  ${cohort}: total=${row.total}, activated=${row.activated}, D14=${pct(Number(row.d14), Number(row.activated))}, D30=${pct(Number(row.d30), Number(row.activated))}`);
  }

  return { cohortStats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: RETENTION BY PRODUCT BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════
async function section13_RetentionByBehavior() {
  console.log("\n📋 Section 13: Retention by Product Behavior");

  // For each behavior type, count users and check D30 retention
  const behaviors = [
    { name: "diagnostic", query: { adaptivePracticeSessions: { some: { status: "COMPLETED" } } } },
    { name: "jalurCerdas", query: { unitProgress: { some: {} } } },
    { name: "karya", query: { studentKarya: { some: {} } } },
    { name: "ukbi", query: { competencyResults: { some: { status: "COMPLETED" } } } },
    { name: "game", query: { gameResults: { some: {} } } },
    { name: "anyXp", query: { xp: { gt: 0 } } },
  ];

  for (const behavior of behaviors) {
    const users = await prisma.user.findMany({
      where: { role: "MURID", ...behavior.query } as any,
      select: {
        id: true, createdAt: true,
        xpLedger: { select: { createdAt: true } },
        unitProgress: { select: { createdAt: true } },
        studentKarya: { select: { createdAt: true } },
        learningEvidences: { select: { createdAt: true } },
      },
    });

    const activated = users.filter(u => {
      const allDates = [
        ...u.xpLedger.map(e => e.createdAt),
        ...u.unitProgress.map(e => e.createdAt),
        ...u.studentKarya.map(e => e.createdAt),
        ...u.learningEvidences.map(e => e.createdAt),
      ];
      return allDates.length > 0;
    });

    const d30 = activated.filter(u => {
      const allDates = [
        ...u.xpLedger.map(e => e.createdAt),
        ...u.unitProgress.map(e => e.createdAt),
        ...u.studentKarya.map(e => e.createdAt),
        ...u.learningEvidences.map(e => e.createdAt),
      ];
      return allDates.some(d => daysBetween(u.createdAt, d) >= 15 && daysBetween(u.createdAt, d) <= 30);
    });

    record(`retentionByBehavior.${behavior.name}.users`, users.length, { source: "section13" });
    record(`retentionByBehavior.${behavior.name}.activated`, activated.length, { source: "section13" });
    record(`retentionByBehavior.${behavior.name}.d30`, d30.length, { source: "section13", notes: `${pct(d30.length, activated.length)} of activated` });

    console.log(`  ${behavior.name}: ${users.length} users, ${activated.length} activated, D30: ${pct(d30.length, activated.length)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14-15: AI ERROR RATE FORENSIC
// ═══════════════════════════════════════════════════════════════════════════════
async function section14_AIErrorForensic() {
  console.log("\n📋 Section 14-15: AI Error Rate & Quality by Feature");

  const aiCalls = await prisma.aIUsage.findMany({
    select: {
      id: true, userId: true, feature: true, provider: true, model: true,
      status: true, errorCode: true, tokens: true, costUSD: true, latencyMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Classify each call
  const classifications = {
    total: aiCalls.length,
    success: 0,
    error: 0,
    null: 0,
    providerError: 0,
    timeout: 0,
    validationFailure: 0,
    malformedOutput: 0,
    quotaRateLimit: 0,
    userCancellation: 0,
    applicationError: 0,
    fallbackSuccess: 0,
    fallbackFailure: 0,
    hardFailure: 0,
  };

  // Feature breakdown
  const byFeature = new Map<string, {
    total: number; success: number; error: number;
    primaryFailures: number; fallbackSuccess: number; userVisibleFailures: number;
  }>();

  for (const call of aiCalls) {
    if (call.status === "SUCCESS") {
      classifications.success++;
    } else if (call.status === "ERROR" || call.status === "error") {
      classifications.error++;

      // Classify error type
      const code = (call.errorCode || "").toLowerCase();
      if (code.includes("timeout") || code.includes("abort")) classifications.timeout++;
      else if (code.includes("rate") || code.includes("quota") || code.includes("429")) classifications.quotaRateLimit++;
      else if (code.includes("validation") || code.includes("parse")) classifications.validationFailure++;
      else if (code.includes("provider") || code.includes("500") || code.includes("502") || code.includes("503")) classifications.providerError++;
      else if (code.includes("cancel")) classifications.userCancellation++;
      else classifications.applicationError++;

      classifications.hardFailure++;
    } else {
      classifications.null++;
    }

    // Feature breakdown
    const feat = call.feature || "unknown";
    const entry = byFeature.get(feat) || { total: 0, success: 0, error: 0, primaryFailures: 0, fallbackSuccess: 0, userVisibleFailures: 0 };
    entry.total++;
    if (call.status === "SUCCESS") entry.success++;
    else if (call.status === "ERROR" || call.status === "error") {
      entry.error++;
      entry.primaryFailures++;
      entry.userVisibleFailures++; // All errors are user-visible unless fallback succeeded
    }
    byFeature.set(feat, entry);
  }

  // Provider breakdown
  const byProvider = new Map<string, { total: number; success: number; error: number }>();
  for (const call of aiCalls) {
    const prov = call.provider || "unknown";
    const entry = byProvider.get(prov) || { total: 0, success: 0, error: 0 };
    entry.total++;
    if (call.status === "SUCCESS") entry.success++;
    else if (call.status === "ERROR") entry.error++;
    byProvider.set(prov, entry);
  }

  record("ai.total", classifications.total, { source: "section14" });
  record("ai.success", classifications.success, { source: "section14" });
  record("ai.error", classifications.error, { source: "section14" });
  record("ai.null", classifications.null, { source: "section14" });
  record("ai.rawErrorRate", classifications.error > 0 ? (classifications.error / classifications.total * 100).toFixed(1) + "%" : "0%", { source: "section14" });
  record("ai.userVisibleFailures", classifications.hardFailure, { source: "section14", notes: "All errors are user-visible (no fallback tracking in AIUsage)" });
  record("ai.providerError", classifications.providerError, { source: "section14" });
  record("ai.timeout", classifications.timeout, { source: "section14" });
  record("ai.quotaRateLimit", classifications.quotaRateLimit, { source: "section14" });
  record("ai.validationFailure", classifications.validationFailure, { source: "section14" });

  // Feature breakdown
  for (const [feat, data] of byFeature) {
    record(`ai.feature.${feat}.total`, data.total, { source: "section15" });
    record(`ai.feature.${feat}.success`, data.success, { source: "section15" });
    record(`ai.feature.${feat}.errorRate`, data.total > 0 ? (data.error / data.total * 100).toFixed(1) + "%" : "0%", { source: "section15" });
  }

  // Provider breakdown
  for (const [prov, data] of byProvider) {
    record(`ai.provider.${prov}.total`, data.total, { source: "section14" });
    record(`ai.provider.${prov}.success`, data.success, { source: "section14" });
    record(`ai.provider.${prov}.errorRate`, data.total > 0 ? (data.error / data.total * 100).toFixed(1) + "%" : "0%", { source: "section14" });
  }

  writeJson(
    path.resolve("data", "ai-usage-forensic-september-2026.json"),
    {
      classifications,
      byFeature: Object.fromEntries(byFeature),
      byProvider: Object.fromEntries(byProvider),
    }
  );

  console.log(`  Total: ${classifications.total}, Success: ${classifications.success}, Error: ${classifications.error}`);
  console.log(`  Error rate: ${(classifications.error / classifications.total * 100).toFixed(1)}%`);
  console.log(`  By feature:`, Object.fromEntries(byFeature));
  console.log(`  By provider:`, Object.fromEntries(byProvider));

  return { classifications, byFeature, byProvider };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 16-17: TRIAL → PAID & PAYMENT RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════════════
async function section16_TrialPaidForensic() {
  console.log("\n📋 Section 16-17: Trial → Paid & Payment Reconciliation");

  // Get all trial users
  const trialUsers = await prisma.user.findMany({
    where: { trialStartedAt: { not: null } },
    select: {
      id: true, email: true, fullName: true, role: true, isFounder: true,
      isPremium: true, premiumPlan: true, premiumUntil: true,
      trialStartedAt: true, trialEndsAt: true, trialPlan: true, trialCreditsTotal: true,
      transaksi: { select: { id: true, type: true, amount: true, status: true, createdAt: true } },
      aiUsage: { select: { id: true, feature: true, status: true } },
      premiumUsage: { select: { id: true, featureCode: true, used: true } },
      groupMemberships: { select: { id: true } },
      quizzes: { select: { id: true } },
    },
    orderBy: { trialStartedAt: "asc" },
  });

  const trialUsersNonFounder = trialUsers.filter(u => !u.isFounder);

  // Payment records
  const allPayments = await prisma.transaksi.findMany({
    select: {
      id: true, userId: true, type: true, amount: true, status: true,
      reference: true, orderId: true, midtransId: true,
      createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const successfulPayments = allPayments.filter(p => p.status === "SUCCESS");
  const failedPayments = allPayments.filter(p => p.status === "FAILED" || p.status === "CANCELLED");
  const pendingPayments = allPayments.filter(p => p.status === "PENDING");

  // Revenue
  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

  // Premium users (non-founder)
  const premiumUsers = await prisma.user.findMany({
    where: { isPremium: true, isFounder: false },
    select: { id: true, email: true, premiumPlan: true, premiumUntil: true },
  });

  // PremiumUsage stats
  const premiumUsageRecords = await prisma.premiumUsage.findMany({
    select: { userId: true, featureCode: true, used: true, periodKey: true },
  });

  // Active trials (trialEndsAt > now)
  const now = new Date();
  const activeTrials = trialUsersNonFounder.filter(u => u.trialEndsAt && u.trialEndsAt > now);

  // Trial conversion funnel
  const trialConverted = trialUsersNonFounder.filter(u =>
    u.transaksi.some(t => t.type === "PREMIUM_UPGRADE" && t.status === "SUCCESS")
  );

  // Checkout initiated
  const trialCheckout = trialUsersNonFounder.filter(u =>
    u.transaksi.some(t => t.type === "PREMIUM_UPGRADE")
  );

  record("trial.totalTrialUsers", trialUsers.length, { source: "section16" });
  record("trial.nonFounderTrials", trialUsersNonFounder.length, { source: "section16" });
  record("trial.activeTrials", activeTrials.length, { source: "section16" });
  record("trial.checkoutInitiated", trialCheckout.length, { source: "section16" });
  record("trial.converted", trialConverted.length, { source: "section16" });
  record("trial.conversionRate", trialUsersNonFounder.length > 0 ? (trialConverted.length / trialUsersNonFounder.length * 100).toFixed(1) + "%" : "0%", { source: "section16" });

  record("payment.totalTransactions", allPayments.length, { source: "section17" });
  record("payment.successful", successfulPayments.length, { source: "section17" });
  record("payment.failed", failedPayments.length, { source: "section17" });
  record("payment.pending", pendingPayments.length, { source: "section17" });
  record("payment.totalRevenue", totalRevenue, { unit: "IDR", source: "section17" });
  record("payment.premiumUsers", premiumUsers.length, { source: "section17" });
  record("payment.avgTransactionValue", successfulPayments.length > 0 ? Math.round(totalRevenue / successfulPayments.length) : 0, { unit: "IDR", source: "section17" });
  record("payment.premiumUsageRecords", premiumUsageRecords.length, { source: "section17" });

  writeJson(
    path.resolve("data", "trial-payment-forensic-september-2026.json"),
    {
      trialUsers: trialUsersNonFounder.map(u => ({
        userId: u.id, email: u.email, fullName: u.fullName,
        trialStartedAt: u.trialStartedAt, trialEndsAt: u.trialEndsAt,
        isPremium: u.isPremium, premiumPlan: u.premiumPlan,
        transactionCount: u.transaksi.length,
        successfulPayments: u.transaksi.filter(t => t.status === "SUCCESS").length,
        aiUsageCount: u.aiUsage.length,
        groupCount: u.groupMemberships.length,
        quizCount: u.quizzes.length,
      })),
      payments: allPayments,
      premiumUsers,
    }
  );

  console.log(`  Trial users (non-founder): ${trialUsersNonFounder.length}`);
  console.log(`  Converted: ${trialConverted.length} (${pct(trialConverted.length, trialUsersNonFounder.length)})`);
  console.log(`  Revenue: Rp ${totalRevenue.toLocaleString()}`);
  console.log(`  Premium users: ${premiumUsers.length}`);

  return { trialUsersNonFounder, allPayments, successfulPayments, premiumUsers };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 18: PREMIUM VALUE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
async function section18_PremiumValueAnalysis(premiumUsers: any[]) {
  console.log("\n📋 Section 18: Premium Value Analysis");

  const premiumIds = premiumUsers.map(u => u.id);

  // Premium users activity
  const premiumActivity = await prisma.user.findMany({
    where: { id: { in: premiumIds } },
    select: {
      id: true, email: true, isPremium: true, premiumPlan: true,
      xp: true, coins: true,
      aiUsage: { select: { id: true, feature: true } },
      quizzes: { select: { id: true } },
      studentKarya: { select: { id: true } },
      groupMemberships: { select: { id: true } },
    },
  });

  // Free active users (XP > 0, no premium)
  const freeActive = await prisma.user.findMany({
    where: { isPremium: false, isFounder: false, role: "GURU", xp: { gt: 0 } },
    take: 50,
    select: {
      id: true, email: true, xp: true,
      aiUsage: { select: { id: true, feature: true } },
      quizzes: { select: { id: true } },
      studentKarya: { select: { id: true } },
      groupMemberships: { select: { id: true } },
    },
  });

  const premiumStats = premiumActivity.map(u => ({
    email: u.email,
    plan: u.premiumPlan,
    xp: u.xp,
    aiCalls: u.aiUsage.length,
    aiFeatures: [...new Set(u.aiUsage.map(a => a.feature))],
    quizzes: u.quizzes.length,
    karya: u.studentKarya.length,
    groups: u.groupMemberships.length,
  }));

  const freeStats = freeActive.map(u => ({
    xp: u.xp,
    aiCalls: u.aiUsage.length,
    quizzes: u.quizzes.length,
    karya: u.studentKarya.length,
    groups: u.groupMemberships.length,
  }));

  record("premium.avgAiCalls", premiumStats.length > 0 ? Math.round(premiumStats.reduce((s, u) => s + u.aiCalls, 0) / premiumStats.length) : 0, { source: "section18" });
  record("premium.avgQuizzes", premiumStats.length > 0 ? Math.round(premiumStats.reduce((s, u) => s + u.quizzes, 0) / premiumStats.length) : 0, { source: "section18" });
  record("free.active.avgAiCalls", freeStats.length > 0 ? Math.round(freeStats.reduce((s, u) => s + u.aiCalls, 0) / freeStats.length) : 0, { source: "section18" });
  record("free.active.avgQuizzes", freeStats.length > 0 ? Math.round(freeStats.reduce((s, u) => s + u.quizzes, 0) / freeStats.length) : 0, { source: "section18" });

  console.log(`  Premium users: ${premiumStats.length}`);
  console.log(`  Free active users: ${freeStats.length}`);
  console.log(`  Premium avg AI calls: ${premiumStats.reduce((s, u) => s + u.aiCalls, 0) / Math.max(premiumStats.length, 1)}`);
  console.log(`  Free avg AI calls: ${freeStats.reduce((s, u) => s + u.aiCalls, 0) / Math.max(freeStats.length, 1)}`);

  return { premiumStats, freeStats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 20: USER DATA QUALITY
// ═══════════════════════════════════════════════════════════════════════════════
async function section20_DataQuality() {
  console.log("\n📋 Section 20: User Data Quality");

  const testPatterns = /demo|test|example|dev|staging|qa|loadtest|k6/i;
  const internalPatterns = /@bahasacerdas\.com|admin@|founder@/i;

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, isFounder: true, createdAt: true },
  });

  const testAccounts = users.filter(u => testPatterns.test(u.email));
  const internalAccounts = users.filter(u => internalPatterns.test(u.email));
  const founderAccounts = users.filter(u => u.isFounder);

  // Users with no profile
  const profiles = await prisma.profile.findMany({ select: { userId: true } });
  const profileUserIds = new Set(profiles.map(p => p.userId));
  const noProfile = users.filter(u => !profileUserIds.has(u.id));

  // Users with no avatar
  const usersWithAvatar = await prisma.user.findMany({
    where: { avatar: null },
    select: { id: true },
  });

  record("dataQuality.totalUsers", users.length, { source: "section20" });
  record("dataQuality.testAccounts", testAccounts.length, { source: "section20", notes: testAccounts.map(u => u.email).join(", ") });
  record("dataQuality.internalAccounts", internalAccounts.length, { source: "section20" });
  record("dataQuality.founders", founderAccounts.length, { source: "section20" });
  record("dataQuality.noProfile", noProfile.length, { source: "section20" });
  record("dataQuality.noAvatar", usersWithAvatar.length, { source: "section20" });

  console.log(`  Test accounts: ${testAccounts.length}`);
  console.log(`  Internal accounts: ${internalAccounts.length}`);
  console.log(`  No profile: ${noProfile.length}`);
  console.log(`  No avatar: ${usersWithAvatar.length}`);

  return { testAccounts, internalAccounts, founderAccounts, noProfile };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 21: ENTITY CONSISTENCY
// ═══════════════════════════════════════════════════════════════════════════════
async function section21_EntityConsistency() {
  console.log("\n📋 Section 21: Entity Consistency");

  // Check orphan records
  const checks = [
    {
      name: "groupMembers_withoutUser",
      query: async () => {
        const members = await prisma.groupMember.findMany({ select: { userId: true } });
        const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
        return members.filter(m => !userIds.has(m.userId)).length;
      },
    },
    {
      name: "groupMembers_withoutGroup",
      query: async () => {
        const members = await prisma.groupMember.findMany({ select: { groupId: true } });
        const groupIds = new Set((await prisma.group.findMany({ select: { id: true } })).map(g => g.id));
        return members.filter(m => !groupIds.has(m.groupId)).length;
      },
    },
    {
      name: "groups_withoutTeacher",
      query: async () => {
        const groups = await prisma.group.findMany({ select: { teacherId: true } });
        const teacherIds = new Set((await prisma.user.findMany({ where: { role: "GURU" }, select: { id: true } })).map(u => u.id));
        return groups.filter(g => !teacherIds.has(g.teacherId)).length;
      },
    },
    {
      name: "xpLedger_withoutUser",
      query: async () => {
        const ledger = await prisma.xpLedger.findMany({ select: { userId: true } });
        const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
        return ledger.filter(l => !userIds.has(l.userId)).length;
      },
    },
    {
      name: "quizSubmissions_withoutUser",
      query: async () => {
        const subs = await prisma.quizSubmission.findMany({ select: { userId: true } });
        const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
        return subs.filter(s => !userIds.has(s.userId)).length;
      },
    },
    {
      name: "aiUsage_withoutUser",
      query: async () => {
        const usage = await prisma.aIUsage.findMany({ select: { userId: true } });
        const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
        return usage.filter(u => !userIds.has(u.userId)).length;
      },
    },
    {
      name: "studentKarya_withoutUser",
      query: async () => {
        const karya = await prisma.studentKarya.findMany({ select: { userId: true } });
        const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
        return karya.filter(k => !userIds.has(k.userId)).length;
      },
    },
    {
      name: "transaksi_withoutUser",
      query: async () => {
        const tx = await prisma.transaksi.findMany({ select: { userId: true } });
        const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
        return tx.filter(t => !userIds.has(t.userId)).length;
      },
    },
  ];

  for (const check of checks) {
    const orphanCount = await check.query();
    record(`entityConsistency.${check.name}`, orphanCount, {
      source: "section21",
      status: orphanCount > 0 ? "DATA_QUALITY_ISSUE" : "VERIFIED",
    });
    console.log(`  ${check.name}: ${orphanCount} orphans`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 23: RECONCILE PHASE 1 + PHASE 2 + PHASE 2.5
// ═══════════════════════════════════════════════════════════════════════════════
async function section23_ReconcilePhases() {
  console.log("\n📋 Section 23: Reconcile Phase 1 + Phase 2 + Phase 2.5");

  // Load Phase 1 and Phase 2 data if available
  let phase1: any = {};
  let phase2: any = {};

  try {
    phase1 = JSON.parse(fs.readFileSync(path.resolve("data/production-truth-audit.json"), "utf-8"));
  } catch { console.log("  ⚠️  Phase 1 data not found"); }

  try {
    phase2 = JSON.parse(fs.readFileSync(path.resolve("data/business-truth-audit-september-2026.json"), "utf-8"));
  } catch { console.log("  ⚠️  Phase 2 data not found"); }

  // Get Phase 2.5 values
  const p25 = {
    users: await prisma.user.count(),
    teachers: await prisma.user.count({ where: { role: "GURU" } }),
    students: await prisma.user.count({ where: { role: "MURID" } }),
    groups: await prisma.group.count(),
    groupMembers: await prisma.groupMember.count(),
    schools: (await prisma.profile.findMany({ where: { school: { not: null } }, select: { school: true } })).length,
  };

  const reconciliation = {
    users: { phase1: phase1?.metrics?.find((m: any) => m.metric === "user.total")?.value, phase2: phase2?.metrics?.find((m: any) => m.metric === "user.total")?.value, phase25: p25.users },
    teachers: { phase1: phase1?.metrics?.find((m: any) => m.metric === "user.guru")?.value, phase2: phase2?.metrics?.find((m: any) => m.metric === "user.guru")?.value, phase25: p25.teachers },
    students: { phase1: phase1?.metrics?.find((m: any) => m.metric === "user.murid")?.value, phase2: phase2?.metrics?.find((m: any) => m.metric === "user.murid")?.value, phase25: p25.students },
    groups: { phase2: phase2?.metrics?.find((m: any) => m.metric === "class.total")?.value, phase25: p25.groups },
    enrollments: { phase2: phase2?.metrics?.find((m: any) => m.metric === "class.enrollments")?.value, phase25: p25.groupMembers },
  };

  record("reconciliation.users", reconciliation.users, { source: "section23", confidence: "HIGH" });
  record("reconciliation.teachers", reconciliation.teachers, { source: "section23" });
  record("reconciliation.students", reconciliation.students, { source: "section23" });

  console.log(`  Reconciliation:`, JSON.stringify(reconciliation, null, 2));

  return reconciliation;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  BUSINESS TRUTH VALIDATION — PHASE 2.5");
  console.log("  Entity & Journey Forensic Audit");
  console.log("  Cut-off: September 1, 2026, Asia/Jakarta");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Section 1: Teacher Forensic Sample
    const s1 = await safeSection("Section 1: Teacher Forensic Sample", () => section1_TeacherForensicSample());

    // Section 2: Relationship Matrix
    const s2 = await safeSection("Section 2: Relationship Matrix", () => section2_RelationshipMatrix(s1?.allGurus || []));

    // Section 3: Zero-Student Root Cause
    await safeSection("Section 3: Zero-Student Root Cause", () => section3_ZeroStudentRootCause(s1?.allGurus || [], s2?.teacherClassMap || new Map()));

    // Section 4-6: School Identity, Duplication, Activity
    const s46 = await safeSection("Section 4-6: School Forensics", () => section4_SchoolForensics());

    // Section 7: School Cluster Analysis
    if (s46) {
      await safeSection("Section 7: School Clusters", () => section7_SchoolClusters(s46.schoolForensics));
    }

    // Section 8: School Cohort
    if (s46) {
      await safeSection("Section 8: School Cohorts", () => section8_SchoolCohort(s46.schoolForensics));
    }

    // Section 9: Teacher-Led Distribution
    await safeSection("Section 9: Teacher-Led Distribution", () => section9_TeacherLedDistribution(s1?.allGurus || [], s2?.teacherClassMap || new Map()));

    // Section 10: Student Origin
    await safeSection("Section 10: Student Origin", () => section10_StudentOrigin());

    // Section 11: Student Journey Forensics
    await safeSection("Section 11: Student Journey", () => section11_StudentJourneyForensics());

    // Section 12: Retention Validation
    await safeSection("Section 12: Retention Validation", () => section12_RetentionValidation());

    // Section 13: Retention by Behavior
    await safeSection("Section 13: Retention by Behavior", () => section13_RetentionByBehavior());

    // Section 14-15: AI Error Forensic
    await safeSection("Section 14-15: AI Error Forensic", () => section14_AIErrorForensic());

    // Section 16-17: Trial → Paid & Payment
    const s16 = await safeSection("Section 16-17: Trial & Payment", () => section16_TrialPaidForensic());

    // Section 18: Premium Value
    if (s16) {
      await safeSection("Section 18: Premium Value", () => section18_PremiumValueAnalysis(s16.premiumUsers));
    }

    // Section 20: Data Quality
    await safeSection("Section 20: Data Quality", () => section20_DataQuality());

    // Section 21: Entity Consistency
    await safeSection("Section 21: Entity Consistency", () => section21_EntityConsistency());

    // Section 23: Reconcile Phases
    await safeSection("Section 23: Reconcile Phases", () => section23_ReconcilePhases());

    // Save all metrics
    const outputPath = path.resolve("data", "business-truth-validation-september-2026.json");
    writeJson(outputPath, { metrics, generatedAt: new Date().toISOString() });
    console.log(`\n✅ Saved ${metrics.length} metrics to ${outputPath}`);

    // Print summary
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  SUMMARY");
    console.log("═══════════════════════════════════════════════════════════════");
    const verified = metrics.filter(m => m.status === "VERIFIED").length;
    const derived = metrics.filter(m => m.status === "DERIVED").length;
    const proxy = metrics.filter(m => m.status === "PROXY").length;
    const unverified = metrics.filter(m => m.status === "UNVERIFIED").length;
    const issues = metrics.filter(m => m.status === "DATA_QUALITY_ISSUE").length;
    console.log(`  VERIFIED: ${verified}`);
    console.log(`  DERIVED: ${derived}`);
    console.log(`  PROXY: ${proxy}`);
    console.log(`  UNVERIFIED: ${unverified}`);
    console.log(`  DATA_QUALITY_ISSUE: ${issues}`);
    console.log(`  TOTAL: ${metrics.length}`);

  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
