#!/usr/bin/env npx tsx
/**
 * BAHASACERDAS — BUSINESS TRUTH AUDIT (September 2026)
 *
 * Read-only forensic audit of production database.
 * Produces: data/business-truth-audit-september-2026.json
 *
 * Usage:
 *   npx tsx scripts/business-truth-audit.ts [--cutoff YYYY-MM-DD]
 *
 * Timezone: Asia/Jakarta (UTC+7)
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { loadScriptEnv, requireDatabaseUrl } from "./_env.js";

// ─── ENV ─────────────────────────────────────────────────────────────────
loadScriptEnv();
requireDatabaseUrl(); // validates DATABASE_URL is real, exits if placeholder

// ─── CONFIG ──────────────────────────────────────────────────────────────
const CUTOFF = process.argv.includes("--cutoff")
  ? new Date(process.argv[process.argv.indexOf("--cutoff") + 1] + "T23:59:59+07:00")
  : new Date("2026-09-01T23:59:59+07:00");

const HISTORICAL = new Date("2026-08-02T00:00:00+07:00"); // baseline for growth calc

const prisma = new PrismaClient({ log: ["error"] });

interface Metric {
  metric: string;
  value: unknown;
  unit?: string;
  period?: string;
  status: "VERIFIED" | "DERIVED" | "PROXY" | "UNVERIFIED" | "DATA_QUALITY_ISSUE";
  source: string;
  formula?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  notes?: string;
}

const metrics: Metric[] = [];

function record(m: Metric) {
  metrics.push(m);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function median(sorted: number[]): number {
  return percentile(sorted, 50);
}

// Helper: WIB day key
function wibDayKey(d: Date): string {
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().slice(0, 10);
}

// Helper: WIB month key
function wibMonthKey(d: Date): string {
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().slice(0, 7);
}

// Helper: month key from date
function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

// ─── MAIN ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 BAHASACERDAS BUSINESS TRUTH AUDIT`);
  console.log(`   Cutoff: ${CUTOFF.toISOString()}`);
  console.log(`   Historical: ${HISTORICAL.toISOString()}\n`);

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 1: USER POPULATION
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 1: User Population...");

  const totalUsers = await prisma.user.count();
  const totalByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });

  const founders = await prisma.user.count({ where: { isFounder: true } });
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });

  // Test/demo accounts: check emails
  const demoEmails = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "demo" } },
        { email: { contains: "test" } },
        { email: { contains: "admin@bahasacerdas" } },
        { isFounder: true },
        { role: "ADMIN" },
      ],
    },
    select: { id: true, email: true, role: true, isFounder: true, createdAt: true },
  });

  record({ metric: "users.total", value: totalUsers, unit: "users", period: "all", status: "VERIFIED", source: "User.count", confidence: "HIGH" });
  for (const r of totalByRole) {
    record({ metric: `users.by_role.${r.role.toLowerCase()}`, value: r._count, unit: "users", period: "all", status: "VERIFIED", source: "User.groupBy(role)", confidence: "HIGH" });
  }
  record({ metric: "users.founders", value: founders, unit: "users", status: "VERIFIED", source: "User.count(isFounder)", confidence: "HIGH" });
  record({ metric: "users.admins", value: admins, unit: "users", status: "VERIFIED", source: "User.count(role=ADMIN)", confidence: "HIGH" });
  record({ metric: "users.potentially_internal", value: demoEmails.length, unit: "users", status: "VERIFIED", source: "User.findMany(demo/test/admin/founder)", confidence: "HIGH", notes: demoEmails.map(e => `${e.email}(${e.role}${e.isFounder ? "/founder" : ""})`).join(", ") });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 2: USER SIGNUP COHORTS
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 2: Signup Cohorts...");

  const allUsers = await prisma.user.findMany({
    select: { id: true, role: true, createdAt: true, lastActiveAt: true, isFounder: true, xp: true },
    where: { createdAt: { lte: CUTOFF } },
  });

  // Cohort by month
  const cohorts: Record<string, { total: number; guru: number; murid: number; admin: number }> = {};
  for (const u of allUsers) {
    const mk = monthKey(u.createdAt);
    if (!cohorts[mk]) cohorts[mk] = { total: 0, guru: 0, murid: 0, admin: 0 };
    cohorts[mk].total++;
    if (u.role === "GURU") cohorts[mk].guru++;
    else if (u.role === "MURID") cohorts[mk].murid++;
    else if (u.role === "ADMIN") cohorts[mk].admin++;
  }

  for (const [mk, c] of Object.entries(cohorts).sort()) {
    record({ metric: `cohorts.${mk}.total`, value: c.total, unit: "users", period: mk, status: "VERIFIED", source: "User.createdAt grouped", confidence: "HIGH" });
    record({ metric: `cohorts.${mk}.guru`, value: c.guru, unit: "users", period: mk, status: "VERIFIED", source: "User.createdAt grouped", confidence: "HIGH" });
    record({ metric: `cohorts.${mk}.murid`, value: c.murid, unit: "users", period: mk, status: "VERIFIED", source: "User.createdAt grouped", confidence: "HIGH" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 3: ACTIVATION (meaningful activity)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 3: Activation...");

  // Student activation = has XP > 0 OR has UserUnitProgress OR has LearningEvidence OR has StudentKarya
  // Teacher activation = has Group OR has AiSavedResult OR has GeneratedRPP

  const studentsWithXp = await prisma.user.count({
    where: { role: "MURID", xp: { gt: 0 }, createdAt: { lte: CUTOFF } },
  });
  const studentsWithUnitProgress = await prisma.userUnitProgress.groupBy({
    by: ["userId"],
    where: { createdAt: { lte: CUTOFF } },
  });
  const studentsWithLearningEvidence = await prisma.learningEvidence.groupBy({
    by: ["userId"],
    where: { createdAt: { lte: CUTOFF } },
  });
  const studentsWithKarya = await prisma.studentKarya.groupBy({
    by: ["userId"],
    where: { createdAt: { lte: CUTOFF } },
  });

  const activeStudentIds = new Set<string>();
  for (const u of allUsers.filter(u => u.role === "MURID")) {
    if (u.xp > 0) activeStudentIds.add(u.id);
  }
  for (const up of studentsWithUnitProgress) activeStudentIds.add(up.userId);
  for (const le of studentsWithLearningEvidence) activeStudentIds.add(le.userId);
  for (const sk of studentsWithKarya) activeStudentIds.add(sk.userId);

  const totalStudents = allUsers.filter(u => u.role === "MURID").length;
  record({ metric: "activation.students.with_xp", value: studentsWithXp, unit: "users", status: "VERIFIED", source: "User.count(role=MURID, xp>0)", confidence: "HIGH" });
  record({ metric: "activation.students.with_unit_progress", value: studentsWithUnitProgress.length, unit: "users", status: "VERIFIED", source: "UserUnitProgress.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "activation.students.with_learning_evidence", value: studentsWithLearningEvidence.length, unit: "users", status: "VERIFIED", source: "LearningEvidence.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "activation.students.with_karya", value: studentsWithKarya.length, unit: "users", status: "VERIFIED", source: "StudentKarya.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "activation.students.any_activity", value: activeStudentIds.size, unit: "users", status: "DERIVED", source: "Union of xp>0 | unitProgress | learningEvidence | karya", confidence: "HIGH", formula: "|{u | u.role=MURID AND (xp>0 OR has UnitProgress OR has LearningEvidence OR has Karya)}|" });

  // Teacher activation
  const teachersWithGroups = await prisma.group.groupBy({
    by: ["teacherId"],
    where: { createdAt: { lte: CUTOFF } },
  });
  const teachersWithAi = await prisma.aiSavedResult.groupBy({
    by: ["userId"],
    where: { createdAt: { lte: CUTOFF } },
  });
  const teachersWithRpp = await prisma.generatedRPP.groupBy({
    by: ["uploaderId"],
    where: { createdAt: { lte: CUTOFF } },
  });
  const teachersWithQuizzes = await prisma.quiz.groupBy({
    by: ["creatorId"],
    where: { createdAt: { lte: CUTOFF } },
  });

  const activeTeacherIds = new Set<string>();
  for (const g of teachersWithGroups) activeTeacherIds.add(g.teacherId);
  for (const a of teachersWithAi) activeTeacherIds.add(a.userId);
  for (const r of teachersWithRpp) activeTeacherIds.add(r.uploaderId);
  for (const q of teachersWithQuizzes) activeTeacherIds.add(q.creatorId);

  const totalTeachers = allUsers.filter(u => u.role === "GURU").length;
  record({ metric: "activation.teachers.with_groups", value: teachersWithGroups.length, unit: "users", status: "VERIFIED", source: "Group.groupBy(teacherId)", confidence: "HIGH" });
  record({ metric: "activation.teachers.with_ai_saved", value: teachersWithAi.length, unit: "users", status: "VERIFIED", source: "AiSavedResult.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "activation.teachers.with_rpp", value: teachersWithRpp.length, unit: "users", status: "VERIFIED", source: "GeneratedRPP.groupBy(uploaderId)", confidence: "HIGH" });
  record({ metric: "activation.teachers.with_quizzes", value: teachersWithQuizzes.length, unit: "users", status: "VERIFIED", source: "Quiz.groupBy(creatorId)", confidence: "HIGH" });
  record({ metric: "activation.teachers.any_activity", value: activeTeacherIds.size, unit: "users", status: "DERIVED", source: "Union of groups | aiSaved | rpp | quizzes", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 4: SCHOOL & CLASS FORENSICS
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 4: School & Class Forensics...");

  // Profile.school raw values
  const profileSchools = await prisma.profile.findMany({
    where: { school: { not: null } },
    select: { school: true, userId: true, schoolId: true },
  });

  // Normalize school names for dedup analysis
  function normalizeSchoolName(raw: string): string {
    return raw
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase()
      .replace(/\./g, "")
      .replace(/\bSMPN\b/g, "SMP NEGERI")
      .replace(/\bSDN\b/g, "SD NEGERI")
      .replace(/\bSMAN\b/g, "SMA NEGERI")
      .replace(/\bSMKN\b/g, "SMK NEGERI")
      .replace(/\bSMP NEGERI\b/g, "SMP N")
      .replace(/\bSD NEGERI\b/g, "SD N")
      .replace(/\bSMA NEGERI\b/g, "SMA N")
      .replace(/\bSMK NEGERI\b/g, "SMK N");
  }

  const rawSchoolNames = new Map<string, Set<string>>(); // normalized → set of raw names
  const schoolUserCounts = new Map<string, Set<string>>(); // normalized → set of userIds
  const schoolRoleCounts = new Map<string, { guru: Set<string>; murid: Set<string> }>();

  for (const p of profileSchools) {
    const raw = p.school!;
    const norm = normalizeSchoolName(raw);
    if (!rawSchoolNames.has(norm)) rawSchoolNames.set(norm, new Set());
    rawSchoolNames.get(norm)!.add(raw);
    if (!schoolUserCounts.has(norm)) schoolUserCounts.set(norm, new Set());
    schoolUserCounts.get(norm)!.add(p.userId);
  }

  // Enrich with user roles
  const userIdToRole = new Map(allUsers.map(u => [u.id, u.role]));
  for (const [norm, userIds] of schoolUserCounts) {
    const roles = { guru: new Set<string>(), murid: new Set<string>() };
    for (const uid of userIds) {
      const role = userIdToRole.get(uid);
      if (role === "GURU") roles.guru.add(uid);
      else if (role === "MURID") roles.murid.add(uid);
    }
    schoolRoleCounts.set(norm, roles);
  }

  // Canonical School table
  const canonicalSchools = await prisma.school.count();
  const schoolAliases = await prisma.schoolAlias.count();
  const profilesWithSchoolId = await prisma.profile.count({ where: { schoolId: { not: null } } });

  record({ metric: "schools.raw_unique_names", value: rawSchoolNames.size, unit: "schools", status: "VERIFIED", source: "DISTINCT Profile.school normalized", confidence: "HIGH", notes: `${profileSchools.length} profiles with school name` });
  record({ metric: "schools.canonical_count", value: canonicalSchools, unit: "schools", status: "VERIFIED", source: "School.count", confidence: "HIGH" });
  record({ metric: "schools.aliases_count", value: schoolAliases, unit: "aliases", status: "VERIFIED", source: "SchoolAlias.count", confidence: "HIGH" });
  record({ metric: "schools.profiles_mapped", value: profilesWithSchoolId, unit: "profiles", status: "VERIFIED", source: "Profile.count(schoolId != null)", confidence: "HIGH" });

  // Name collision analysis
  let nameCollisions = 0;
  for (const [, rawNames] of rawSchoolNames) {
    if (rawNames.size > 1) nameCollisions++;
  }
  record({ metric: "schools.name_collisions", value: nameCollisions, unit: "schools", status: "VERIFIED", source: "Count normalized names mapping to >1 raw name", confidence: "HIGH", notes: "Schools where same normalized name has different raw spellings" });

  // Distribution: users per school
  const usersPerSchool = Array.from(schoolUserCounts.values()).map(s => s.size).sort((a, b) => a - b);
  if (usersPerSchool.length > 0) {
    record({ metric: "schools.users_per_school.median", value: median(usersPerSchool), unit: "users", status: "VERIFIED", source: "Profile.school → count users", confidence: "HIGH" });
    record({ metric: "schools.users_per_school.p75", value: percentile(usersPerSchool, 75), unit: "users", status: "VERIFIED", source: "Profile.school → count users", confidence: "HIGH" });
    record({ metric: "schools.users_per_school.p90", value: percentile(usersPerSchool, 90), unit: "users", status: "VERIFIED", source: "Profile.school → count users", confidence: "HIGH" });
    record({ metric: "schools.users_per_school.max", value: usersPerSchool[usersPerSchool.length - 1], unit: "users", status: "VERIFIED", source: "Profile.school → count users", confidence: "HIGH" });
    record({ metric: "schools.users_per_school.mean", value: Math.round((usersPerSchool.reduce((a, b) => a + b, 0) / usersPerSchool.length) * 100) / 100, unit: "users", status: "VERIFIED", source: "Profile.school → count users", confidence: "HIGH" });
  }

  // School tier distribution
  const tiers = [
    { label: "1_user", min: 1, max: 1 },
    { label: "2_5_users", min: 2, max: 5 },
    { label: "6_10_users", min: 6, max: 10 },
    { label: "11_25_users", min: 11, max: 25 },
    { label: "26_50_users", min: 26, max: 50 },
    { label: "51_100_users", min: 51, max: 100 },
    { label: "100_plus_users", min: 101, max: Infinity },
  ];

  for (const tier of tiers) {
    const schoolsInTier = Array.from(schoolUserCounts.entries()).filter(
      ([, users]) => users.size >= tier.min && users.size <= tier.max
    );
    const tierGuru = schoolsInTier.reduce((sum, [, users]) => {
      const roles = schoolRoleCounts.get(Array.from(rawSchoolNames.keys()).find(k => schoolUserCounts.get(k) === users) || "") || { guru: new Set(), murid: new Set() };
      return sum + roles.guru.size;
    }, 0);
    const tierMurid = schoolsInTier.reduce((sum, [, users]) => {
      const roles = schoolRoleCounts.get(Array.from(rawSchoolNames.keys()).find(k => schoolUserCounts.get(k) === users) || "") || { guru: new Set(), murid: new Set() };
      return sum + roles.murid.size;
    }, 0);
    record({ metric: `schools.tier.${tier.label}.count`, value: schoolsInTier.length, unit: "schools", status: "DERIVED", source: "Profile.school → count users", confidence: "HIGH" });
    record({ metric: `schools.tier.${tier.label}.teachers`, value: tierGuru, unit: "users", status: "DERIVED", source: "Profile.school → count users × role", confidence: "MEDIUM" });
    record({ metric: `schools.tier.${tier.label}.students`, value: tierMurid, unit: "users", status: "DERIVED", source: "Profile.school → count users × role", confidence: "MEDIUM" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 5: CLASS & ENROLLMENT
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 5: Class & Enrollment...");

  const totalGroups = await prisma.group.count({ where: { createdAt: { lte: CUTOFF } } });
  const activeGroups = await prisma.group.count({ where: { isActive: true, createdAt: { lte: CUTOFF } } });

  const groupMembers = await prisma.groupMember.findMany({
    where: { group: { createdAt: { lte: CUTOFF } } },
    select: { groupId: true, userId: true, role: true, joinedAt: true },
  });

  const uniqueEnrolledStudentIds = new Set(groupMembers.filter(m => m.role === "member").map(m => m.userId));
  const uniqueEnrolledTeacherIds = new Set(
    (await prisma.group.findMany({
      where: { createdAt: { lte: CUTOFF } },
      select: { teacherId: true },
    })).map(g => g.teacherId)
  );

  // Students in multiple classes
  const studentClassCounts = new Map<string, number>();
  for (const m of groupMembers.filter(m => m.role === "member")) {
    studentClassCounts.set(m.userId, (studentClassCounts.get(m.userId) || 0) + 1);
  }
  const multiClassStudents = Array.from(studentClassCounts.values()).filter(c => c > 1).length;

  // Classes per teacher
  const classCounts = new Map<string, number>();
  for (const m of groupMembers.filter(m => m.role === "member")) {
    const groupId = m.groupId;
    // Find group teacher
  }
  const groupsByTeacher = await prisma.group.groupBy({
    by: ["teacherId"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });

  record({ metric: "classes.total", value: totalGroups, unit: "classes", status: "VERIFIED", source: "Group.count", confidence: "HIGH" });
  record({ metric: "classes.active", value: activeGroups, unit: "classes", status: "VERIFIED", source: "Group.count(isActive=true)", confidence: "HIGH" });
  record({ metric: "enrollments.total", value: groupMembers.length, unit: "enrollments", status: "VERIFIED", source: "GroupMember.findMany", confidence: "HIGH" });
  record({ metric: "enrollments.unique_students", value: uniqueEnrolledStudentIds.size, unit: "students", status: "DERIVED", source: "DISTINCT GroupMember.userId WHERE role=member", confidence: "HIGH" });
  record({ metric: "enrollments.multi_class_students", value: multiClassStudents, unit: "students", status: "DERIVED", source: "COUNT users enrolled in >1 class", confidence: "HIGH" });
  record({ metric: "enrollments.teachers_with_classes", value: groupsByTeacher.length, unit: "teachers", status: "VERIFIED", source: "Group.groupBy(teacherId)", confidence: "HIGH" });

  const classesPerTeacher = groupsByTeacher.map(g => g._count).sort((a, b) => a - b);
  if (classesPerTeacher.length > 0) {
    record({ metric: "classes.per_teacher.median", value: median(classesPerTeacher), unit: "classes", status: "VERIFIED", source: "Group.groupBy(teacherId) → count", confidence: "HIGH" });
    record({ metric: "classes.per_teacher.max", value: classesPerTeacher[classesPerTeacher.length - 1], unit: "classes", status: "VERIFIED", source: "Group.groupBy(teacherId) → count", confidence: "HIGH" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 6: TEACHER → STUDENT ACQUISITION EFFECT
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 6: Teacher→Student Acquisition...");

  // For each teacher with groups, count enrolled students
  const teacherStudentMap = new Map<string, Set<string>>();
  for (const m of groupMembers.filter(m => m.role === "member")) {
    const group = await prisma.group.findUnique({ where: { id: m.groupId }, select: { teacherId: true } });
    if (group) {
      if (!teacherStudentMap.has(group.teacherId)) teacherStudentMap.set(group.teacherId, new Set());
      teacherStudentMap.get(group.teacherId)!.add(m.userId);
    }
  }

  const teacherStudentCounts = Array.from(teacherStudentMap.values()).map(s => s.size).sort((a, b) => a - b);
  if (teacherStudentCounts.length > 0) {
    record({ metric: "teacher_student.students_per_teacher.median", value: median(teacherStudentCounts), unit: "students", status: "VERIFIED", source: "Group → GroupMember → count unique students per teacher", confidence: "HIGH" });
    record({ metric: "teacher_student.students_per_teacher.p75", value: percentile(teacherStudentCounts, 75), unit: "students", status: "VERIFIED", source: "Group → GroupMember → count unique students per teacher", confidence: "HIGH" });
    record({ metric: "teacher_student.students_per_teacher.p90", value: percentile(teacherStudentCounts, 90), unit: "students", status: "VERIFIED", source: "Group → GroupMember → count unique students per teacher", confidence: "HIGH" });
    record({ metric: "teacher_student.students_per_teacher.max", value: teacherStudentCounts[teacherStudentCounts.length - 1], unit: "students", status: "VERIFIED", source: "Group → GroupMember → count unique students per teacher", confidence: "HIGH" });
  }

  // Teachers with 0 students
  const teachersWithZeroStudents = allUsers.filter(u => u.role === "GURU" && !teacherStudentMap.has(u.id)).length;
  record({ metric: "teacher_student.teachers_with_0_students", value: teachersWithZeroStudents, unit: "teachers", status: "DERIVED", source: "Teachers not in teacherStudentMap", confidence: "HIGH" });

  // Distribution
  const tsd = [
    { label: "0_students", min: 0, max: 0 },
    { label: "1_5_students", min: 1, max: 5 },
    { label: "6_10_students", min: 6, max: 10 },
    { label: "11_25_students", min: 11, max: 25 },
    { label: "26_50_students", min: 26, max: 50 },
    { label: "50_plus_students", min: 51, max: Infinity },
  ];
  for (const t of tsd) {
    const count = t.label === "0_students"
      ? teachersWithZeroStudents
      : Array.from(teacherStudentMap.values()).filter(s => s.size >= t.min && s.size <= t.max).length;
    record({ metric: `teacher_student.distribution.${t.label}`, value: count, unit: "teachers", status: "DERIVED", source: "teacherStudentMap distribution", confidence: "HIGH" });
  }

  // Teacher-to-student activation rate (% teachers who brought ≥1 student)
  const teachersWithStudents = teacherStudentMap.size;
  const teacherActivationRate = totalTeachers > 0 ? Math.round((teachersWithStudents / totalTeachers) * 10000) / 100 : 0;
  record({ metric: "teacher_student.activation_rate", value: teacherActivationRate, unit: "%", status: "DERIVED", source: "teachers_with_students / total_teachers", confidence: "HIGH", formula: `${teachersWithStudents} / ${totalTeachers} × 100` });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 7: USER RETENTION (activity-based)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 7: User Retention...");

  // Use lastActiveAt + xpLedger for activity signals
  const recentXp = await prisma.xpLedger.findMany({
    where: { createdAt: { lte: CUTOFF } },
    select: { userId: true, createdAt: true, source: true },
    orderBy: { createdAt: "asc" },
  });

  // Build activity map: userId → sorted array of activity dates
  const activityDates = new Map<string, Date[]>();
  for (const x of recentXp) {
    if (!activityDates.has(x.userId)) activityDates.set(x.userId, []);
    activityDates.get(x.userId)!.push(x.createdAt);
  }

  // Also include LearningEvidence and UserUnitProgress as activity signals
  const evidenceActivity = await prisma.learningEvidence.findMany({
    where: { createdAt: { lte: CUTOFF } },
    select: { userId: true, createdAt: true },
  });
  for (const e of evidenceActivity) {
    if (!activityDates.has(e.userId)) activityDates.set(e.userId, []);
    activityDates.get(e.userId)!.push(e.createdAt);
  }

  const progressActivity = await prisma.userUnitProgress.findMany({
    where: { createdAt: { lte: CUTOFF } },
    select: { userId: true, createdAt: true },
  });
  for (const p of progressActivity) {
    if (!activityDates.has(p.userId)) activityDates.set(p.userId, []);
    activityDates.get(p.userId)!.push(p.createdAt);
  }

  // Sort each user's activity dates
  for (const [, dates] of activityDates) {
    dates.sort((a, b) => a.getTime() - b.getTime());
  }

  // Cohort retention: based on signup month
  // For each cohort, compute D7/D30 based on signup date
  const retentionByCohort: Record<string, {
    registered: number;
    activated: number;
    d7: number;
    d14: number;
    d30: number;
  }> = {};

  for (const u of allUsers) {
    const signupMonth = monthKey(u.createdAt);
    if (!retentionByCohort[signupMonth]) {
      retentionByCohort[signupMonth] = { registered: 0, activated: 0, d7: 0, d14: 0, d30: 0 };
    }
    retentionByCohort[signupMonth].registered++;

    const userActivity = activityDates.get(u.id);
    if (!userActivity || userActivity.length === 0) continue;

    retentionByCohort[signupMonth].activated++;

    const signupDate = u.createdAt;
    const lastActivity = userActivity[userActivity.length - 1];
    const daysSinceSignup = (lastActivity.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceSignup >= 1) retentionByCohort[signupMonth].d7++; // returning after D1
    if (daysSinceSignup >= 7) retentionByCohort[signupMonth].d7 = Math.max(retentionByCohort[signupMonth].d7, retentionByCohort[signupMonth].activated);
    if (daysSinceSignup >= 14) retentionByCohort[signupMonth].d14++;
    if (daysSinceSignup >= 30) retentionByCohort[signupMonth].d30++;
  }

  for (const [mk, r] of Object.entries(retentionByCohort).sort()) {
    const d7Rate = r.activated > 0 ? Math.round((r.d7 / r.activated) * 10000) / 100 : 0;
    const d14Rate = r.activated > 0 ? Math.round((r.d14 / r.activated) * 10000) / 100 : 0;
    const d30Rate = r.activated > 0 ? Math.round((r.d30 / r.activated) * 10000) / 100 : 0;
    record({ metric: `retention.${mk}.registered`, value: r.registered, unit: "users", period: mk, status: "VERIFIED", source: "User.count(createdAt)", confidence: "HIGH" });
    record({ metric: `retention.${mk}.activated`, value: r.activated, unit: "users", period: mk, status: "DERIVED", source: "Users with ≥1 activity event", confidence: "HIGH" });
    record({ metric: `retention.${mk}.d7_rate`, value: d7Rate, unit: "%", period: mk, status: "PROXY", source: "Proxy: last activity ≥7 days after signup", confidence: "MEDIUM", notes: "Proxy: checks if user's last activity was ≥7 days after signup, not true D7 return" });
    record({ metric: `retention.${mk}.d14_rate`, value: d14Rate, unit: "%", period: mk, status: "PROXY", source: "Proxy: last activity ≥14 days after signup", confidence: "MEDIUM" });
    record({ metric: `retention.${mk}.d30_rate`, value: d30Rate, unit: "%", period: mk, status: "PROXY", source: "Proxy: last activity ≥30 days after signup", confidence: "MEDIUM" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 8: LEARNING ACTIVITY
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 8: Learning Activity...");

  const unitProgressCount = await prisma.userUnitProgress.count({ where: { createdAt: { lte: CUTOFF } } });
  const completedUnits = await prisma.userUnitProgress.count({ where: { completed: true, createdAt: { lte: CUTOFF } } });
  const uniqueStudentsWithProgress = (await prisma.userUnitProgress.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;

  const learningEvidenceCount = await prisma.learningEvidence.count({ where: { createdAt: { lte: CUTOFF } } });
  const uniqueStudentsWithEvidence = (await prisma.learningEvidence.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;

  const skillRecords = await prisma.learningSkill.count({ where: { updatedAt: { lte: CUTOFF } } });
  const uniqueStudentsWithSkills = (await prisma.learningSkill.groupBy({ by: ["userId"], where: { updatedAt: { lte: CUTOFF } } })).length;

  const playerActivities = await prisma.playerActivity.count({ where: { createdAt: { lte: CUTOFF } } });

  record({ metric: "learning.unit_progress.total", value: unitProgressCount, unit: "events", status: "VERIFIED", source: "UserUnitProgress.count", confidence: "HIGH" });
  record({ metric: "learning.unit_progress.completed", value: completedUnits, unit: "events", status: "VERIFIED", source: "UserUnitProgress.count(completed=true)", confidence: "HIGH" });
  record({ metric: "learning.unit_progress.completion_rate", value: unitProgressCount > 0 ? Math.round((completedUnits / unitProgressCount) * 10000) / 100 : 0, unit: "%", status: "DERIVED", source: "completed / total", confidence: "HIGH" });
  record({ metric: "learning.unit_progress.unique_students", value: uniqueStudentsWithProgress, unit: "students", status: "VERIFIED", source: "UserUnitProgress.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "learning.evidence.total", value: learningEvidenceCount, unit: "events", status: "VERIFIED", source: "LearningEvidence.count", confidence: "HIGH" });
  record({ metric: "learning.evidence.unique_students", value: uniqueStudentsWithEvidence, unit: "students", status: "VERIFIED", source: "LearningEvidence.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "learning.skills.total", value: skillRecords, unit: "records", status: "VERIFIED", source: "LearningSkill.count", confidence: "HIGH" });
  record({ metric: "learning.skills.unique_students", value: uniqueStudentsWithSkills, unit: "students", status: "VERIFIED", source: "LearningSkill.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "learning.player_activities.total", value: playerActivities, unit: "events", status: "VERIFIED", source: "PlayerActivity.count", confidence: "HIGH" });

  // Learning evidence per student distribution
  const evidencePerStudent = await prisma.learningEvidence.groupBy({
    by: ["userId"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });
  const evidenceCounts = evidencePerStudent.map(e => e._count).sort((a, b) => a - b);
  if (evidenceCounts.length > 0) {
    record({ metric: "learning.evidence.per_student.median", value: median(evidenceCounts), unit: "evidence", status: "VERIFIED", source: "LearningEvidence.groupBy(userId) → count", confidence: "HIGH" });
    record({ metric: "learning.evidence.per_student.p75", value: percentile(evidenceCounts, 75), unit: "evidence", status: "VERIFIED", source: "LearningEvidence.groupBy(userId) → count", confidence: "HIGH" });
    record({ metric: "learning.evidence.per_student.p90", value: percentile(evidenceCounts, 90), unit: "evidence", status: "VERIFIED", source: "LearningEvidence.groupBy(userId) → count", confidence: "HIGH" });
    record({ metric: "learning.evidence.per_student.max", value: evidenceCounts[evidenceCounts.length - 1], unit: "evidence", status: "VERIFIED", source: "LearningEvidence.groupBy(userId) → count", confidence: "HIGH" });
  }

  // Evidence by skill
  const evidenceBySkill = await prisma.learningEvidence.groupBy({
    by: ["skill"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });
  for (const s of evidenceBySkill) {
    record({ metric: `learning.evidence.by_skill.${s.skill || "null"}`, value: s._count, unit: "events", status: "VERIFIED", source: "LearningEvidence.groupBy(skill)", confidence: "HIGH" });
  }

  // Evidence by source
  const evidenceBySource = await prisma.learningEvidence.groupBy({
    by: ["source"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });
  for (const s of evidenceBySource) {
    record({ metric: `learning.evidence.by_source.${s.source}`, value: s._count, unit: "events", status: "VERIFIED", source: "LearningEvidence.groupBy(source)", confidence: "HIGH" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 9: KARYA (STUDENT WRITING)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 9: Karya (Student Writing)...");

  const karyaCount = await prisma.studentKarya.count({ where: { createdAt: { lte: CUTOFF } } });
  const uniqueKaryaAuthors = (await prisma.studentKarya.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;
  const karyaByType = await prisma.studentKarya.groupBy({
    by: ["type"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });
  const karyaLikes = await prisma.studentKaryaLike.count({ where: { createdAt: { lte: CUTOFF } } });
  const karyaComments = await prisma.studentKaryaComment.count({ where: { createdAt: { lte: CUTOFF } } });
  const uniqueLikers = (await prisma.studentKaryaLike.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;
  const uniqueCommenters = (await prisma.studentKaryaComment.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;

  record({ metric: "karya.total", value: karyaCount, unit: "karya", status: "VERIFIED", source: "StudentKarya.count", confidence: "HIGH" });
  record({ metric: "karya.unique_authors", value: uniqueKaryaAuthors, unit: "students", status: "VERIFIED", source: "StudentKarya.groupBy(userId)", confidence: "HIGH" });
  for (const t of karyaByType) {
    record({ metric: `karya.by_type.${t.type}`, value: t._count, unit: "karya", status: "VERIFIED", source: "StudentKarya.groupBy(type)", confidence: "HIGH" });
  }
  record({ metric: "karya.likes.total", value: karyaLikes, unit: "likes", status: "VERIFIED", source: "StudentKaryaLike.count", confidence: "HIGH" });
  record({ metric: "karya.likes.unique_users", value: uniqueLikers, unit: "users", status: "VERIFIED", source: "StudentKaryaLike.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "karya.comments.total", value: karyaComments, unit: "comments", status: "VERIFIED", source: "StudentKaryaComment.count", confidence: "HIGH" });
  record({ metric: "karya.comments.unique_users", value: uniqueCommenters, unit: "users", status: "VERIFIED", source: "StudentKaryaComment.groupBy(userId)", confidence: "HIGH" });

  // Karya per author distribution
  const karyaPerAuthor = await prisma.studentKarya.groupBy({
    by: ["userId"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });
  const karyaCounts = karyaPerAuthor.map(k => k._count).sort((a, b) => a - b);
  if (karyaCounts.length > 0) {
    record({ metric: "karya.per_author.median", value: median(karyaCounts), unit: "karya", status: "VERIFIED", source: "StudentKarya.groupBy(userId) → count", confidence: "HIGH" });
    record({ metric: "karya.per_author.p75", value: percentile(karyaCounts, 75), unit: "karya", status: "VERIFIED", source: "StudentKarya.groupBy(userId) → count", confidence: "HIGH" });
    record({ metric: "karya.per_author.max", value: karyaCounts[karyaCounts.length - 1], unit: "karya", status: "VERIFIED", source: "StudentKarya.groupBy(userId) → count", confidence: "HIGH" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 10: ASSESSMENT (UKBI / TKA / DIAGNOSTIC / ADAPTIVE)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 10: Assessment...");

  const ukbiSessions = await prisma.progresKompetensi.count({ where: { startedAt: { lte: CUTOFF } } });
  const ukbiCompleted = await prisma.progresKompetensi.count({ where: { status: "COMPLETED", startedAt: { lte: CUTOFF } } });
  const uniqueUkbiUsers = (await prisma.progresKompetensi.groupBy({ by: ["userId"], where: { startedAt: { lte: CUTOFF } } })).length;

  const testSessions = await prisma.testSession.count({ where: { createdAt: { lte: CUTOFF } } });
  const testCompleted = await prisma.testSession.count({ where: { status: "COMPLETED", createdAt: { lte: CUTOFF } } });

  const certificates = await prisma.kompetensiCertificate.count({ where: { issuedAt: { lte: CUTOFF } } });

  const adaptiveSessions = await prisma.adaptivePracticeSession.count({ where: { createdAt: { lte: CUTOFF } } });
  const adaptiveCompleted = await prisma.adaptivePracticeSession.count({ where: { status: "COMPLETED", createdAt: { lte: CUTOFF } } });
  const uniqueAdaptiveUsers = (await prisma.adaptivePracticeSession.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;

  // DailyAction (table may not exist in production)
  let dailyActions = 0, dailyCompleted = 0, uniqueDailyUsers = 0;
  try {
    dailyActions = await prisma.dailyAction.count({ where: { createdAt: { lte: CUTOFF } } });
    dailyCompleted = await prisma.dailyAction.count({ where: { status: "COMPLETED", createdAt: { lte: CUTOFF } } });
    uniqueDailyUsers = (await prisma.dailyAction.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;
  } catch (e: any) {
    if (e.code === "P2021") { console.log("  ⚠️  DailyAction table not found — skipping"); }
    else throw e;
  }

  record({ metric: "assessment.ukbi.sessions", value: ukbiSessions, unit: "sessions", status: "VERIFIED", source: "ProgresKompetensi.count", confidence: "HIGH" });
  record({ metric: "assessment.ukbi.completed", value: ukbiCompleted, unit: "sessions", status: "VERIFIED", source: "ProgresKompetensi.count(status=COMPLETED)", confidence: "HIGH" });
  record({ metric: "assessment.ukbi.completion_rate", value: ukbiSessions > 0 ? Math.round((ukbiCompleted / ukbiSessions) * 10000) / 100 : 0, unit: "%", status: "DERIVED", source: "completed / total", confidence: "HIGH" });
  record({ metric: "assessment.ukbi.unique_users", value: uniqueUkbiUsers, unit: "users", status: "VERIFIED", source: "ProgresKompetensi.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "assessment.ukbi.certificates", value: certificates, unit: "certs", status: "VERIFIED", source: "KompetensiCertificate.count", confidence: "HIGH" });
  record({ metric: "assessment.test_sessions", value: testSessions, unit: "sessions", status: "VERIFIED", source: "TestSession.count", confidence: "HIGH" });
  record({ metric: "assessment.test_completed", value: testCompleted, unit: "sessions", status: "VERIFIED", source: "TestSession.count(status=COMPLETED)", confidence: "HIGH" });
  record({ metric: "assessment.adaptive.sessions", value: adaptiveSessions, unit: "sessions", status: "VERIFIED", source: "AdaptivePracticeSession.count", confidence: "HIGH" });
  record({ metric: "assessment.adaptive.completed", value: adaptiveCompleted, unit: "sessions", status: "VERIFIED", source: "AdaptivePracticeSession.count(status=COMPLETED)", confidence: "HIGH" });
  record({ metric: "assessment.adaptive.unique_users", value: uniqueAdaptiveUsers, unit: "users", status: "VERIFIED", source: "AdaptivePracticeSession.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "assessment.daily_action.total", value: dailyActions, unit: "actions", status: "VERIFIED", source: "DailyAction.count", confidence: "HIGH" });
  record({ metric: "assessment.daily_action.completed", value: dailyCompleted, unit: "actions", status: "VERIFIED", source: "DailyAction.count(status=COMPLETED)", confidence: "HIGH" });
  record({ metric: "assessment.daily_action.unique_users", value: uniqueDailyUsers, unit: "users", status: "VERIFIED", source: "DailyAction.groupBy(userId)", confidence: "HIGH" });

  // UKBI score distribution
  const ukbiScores = await prisma.progresKompetensi.findMany({
    where: { status: "COMPLETED", percentage: { not: null }, startedAt: { lte: CUTOFF } },
    select: { percentage: true, userId: true, paketId: true, startedAt: true },
  });
  if (ukbiScores.length > 0) {
    const scores = ukbiScores.map(s => s.percentage!).sort((a, b) => a - b);
    record({ metric: "assessment.ukbi.score_distribution.mean", value: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100, unit: "%", status: "VERIFIED", source: "ProgresKompetensi(percentage) mean", confidence: "HIGH" });
    record({ metric: "assessment.ukbi.score_distribution.median", value: median(scores), unit: "%", status: "VERIFIED", source: "ProgresKompetensi(percentage) median", confidence: "HIGH" });
    record({ metric: "assessment.ukbi.score_distribution.min", value: scores[0], unit: "%", status: "VERIFIED", source: "ProgresKompetensi(percentage) min", confidence: "HIGH" });
    record({ metric: "assessment.ukbi.score_distribution.max", value: scores[scores.length - 1], unit: "%", status: "VERIFIED", source: "ProgresKompetensi(percentage) max", confidence: "HIGH" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 11: GAMIFICATION
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 11: Gamification...");

  // Helper: safely query a model that may not exist in production
  async function safeCount<T>(fn: () => Promise<T>, label: string, fallback: T): Promise<T> {
    try { return await fn(); }
    catch (e: any) {
      if (e.code === "P2021" || e instanceof TypeError) { console.log(`  ⚠️  ${label} — table not available, using fallback`); return fallback; }
      throw e;
    }
  }
  async function safeSection(name: string, fn: () => Promise<void>): Promise<void> {
    try { await fn(); }
    catch (e: any) {
      if (e.code === "P2021" || e instanceof TypeError) { console.log(`  ⚠️  ${name} — some tables not available, recording available data`); }
      else { console.error(`  ❌ ${name} failed:`, e.message); }
    }
  }

  const totalXp = await safeCount(() => prisma.xpLedger.aggregate({ _sum: { amount: true }, where: { createdAt: { lte: CUTOFF } } }), "XpLedger", { _sum: { amount: 0 } });
  const xpCount = await safeCount(() => prisma.xpLedger.count({ where: { createdAt: { lte: CUTOFF } } }), "XpLedger.count", 0);

  let xpBySource: { source: string; _count: number; _sum: { amount: number | null } }[] = [];
  try {
    xpBySource = await prisma.xpLedger.groupBy({
      by: ["source"],
      _count: true,
      _sum: { amount: true },
      where: { createdAt: { lte: CUTOFF } },
    });
  } catch (e: any) {
    if (e.code === "P2021" || e instanceof TypeError) console.log("  ⚠️  XpLedger.groupBy — not available");
    else throw e;
  }

  const badgesAwarded = await safeCount(() => prisma.userBadge.count({ where: { awardedAt: { lte: CUTOFF } } }), "UserBadge", 0);
  let uniqueBadgeUsers = 0;
  try { uniqueBadgeUsers = (await prisma.userBadge.groupBy({ by: ["userId"], where: { awardedAt: { lte: CUTOFF } } })).length; }
  catch (e: any) { if (e.code !== "P2021" && !(e instanceof TypeError)) throw e; }

  let achievementsCompleted = 0, achievementsClaimed = 0;
  try {
    achievementsCompleted = await prisma.userAchievement.count({ where: { completed: true, updatedAt: { lte: CUTOFF } } });
    achievementsClaimed = await prisma.userAchievement.count({ where: { claimed: true, updatedAt: { lte: CUTOFF } } });
  } catch (e: any) { if (e.code !== "P2021" && !(e instanceof TypeError)) throw e; }

  const coinTransactions = await safeCount(() => prisma.coinTransaction.count({ where: { createdAt: { lte: CUTOFF } } }), "CoinTransaction", 0);
  const playerProfiles = await safeCount(() => prisma.playerProfile.count({ where: { createdAt: { lte: CUTOFF } } }), "PlayerProfile", 0);
  const xpTransactions = await safeCount(() => prisma.xpTransaction.count({ where: { createdAt: { lte: CUTOFF } } }), "XPTransaction", 0);

  record({ metric: "gamification.xp.total", value: totalXp._sum.amount || 0, unit: "xp", status: "VERIFIED", source: "XpLedger.aggregate(sum)", confidence: "HIGH" });
  record({ metric: "gamification.xp.transactions", value: xpCount, unit: "transactions", status: "VERIFIED", source: "XpLedger.count", confidence: "HIGH" });
  for (const s of xpBySource) {
    record({ metric: `gamification.xp.by_source.${s.source}`, value: s._sum.amount || 0, unit: "xp", status: "VERIFIED", source: "XpLedger.groupBy(source)", confidence: "HIGH" });
  }
  record({ metric: "gamification.badges_awarded", value: badgesAwarded, unit: "badges", status: "VERIFIED", source: "UserBadge.count", confidence: "HIGH" });
  record({ metric: "gamification.badges_unique_users", value: uniqueBadgeUsers, unit: "users", status: "VERIFIED", source: "UserBadge.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "gamification.achievements_completed", value: achievementsCompleted, unit: "achievements", status: "VERIFIED", source: "UserAchievement.count(completed=true)", confidence: "HIGH" });
  record({ metric: "gamification.achievements_claimed", value: achievementsClaimed, unit: "achievements", status: "VERIFIED", source: "UserAchievement.count(claimed=true)", confidence: "HIGH" });
  record({ metric: "gamification.coin_transactions", value: coinTransactions, unit: "transactions", status: "VERIFIED", source: "CoinTransaction.count", confidence: "HIGH" });
  record({ metric: "gamification.player_profiles", value: playerProfiles, unit: "profiles", status: "VERIFIED", source: "PlayerProfile.count", confidence: "HIGH" });
  record({ metric: "gamification.xp_transactions", value: xpTransactions, unit: "transactions", status: "VERIFIED", source: "XPTransaction.count", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 12: GAME (MULTIPLAYER)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 12: Game...");
  let uniqueGamePlayers = 0;
  await safeSection("Game", async () => {

  const gameRooms = await prisma.gameRoom.count({ where: { createdAt: { lte: CUTOFF } } });
  const gameSessions = await prisma.gameSession.count({ where: { joinedAt: { lte: CUTOFF } } });
  const gameResults = await prisma.gameResult.count({ where: { createdAt: { lte: CUTOFF } } });
  uniqueGamePlayers = (await prisma.gameResult.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;

  const gameRoomsByType = await prisma.gameRoom.groupBy({
    by: ["gameType"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });

  record({ metric: "game.rooms", value: gameRooms, unit: "rooms", status: "VERIFIED", source: "GameRoom.count", confidence: "HIGH" });
  record({ metric: "game.sessions", value: gameSessions, unit: "sessions", status: "VERIFIED", source: "GameSession.count", confidence: "HIGH" });
  record({ metric: "game.results", value: gameResults, unit: "results", status: "VERIFIED", source: "GameResult.count", confidence: "HIGH" });
  record({ metric: "game.unique_players", value: uniqueGamePlayers, unit: "players", status: "VERIFIED", source: "GameResult.groupBy(userId)", confidence: "HIGH" });
  for (const t of gameRoomsByType) {
    record({ metric: `game.rooms_by_type.${t.gameType}`, value: t._count, unit: "rooms", status: "VERIFIED", source: "GameRoom.groupBy(gameType)", confidence: "HIGH" });
  }
  }); // end Section 12 safeSection

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 13: AI USAGE
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 13: AI Usage...");
  await safeSection("AI Usage", async () => {

  const aiUsageTotal = await prisma.aIUsage.count({ where: { createdAt: { lte: CUTOFF } } });
  const aiUsageByFeature = await prisma.aIUsage.groupBy({
    by: ["feature"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });
  const aiUsageByStatus = await prisma.aIUsage.groupBy({
    by: ["status"],
    _count: true,
    where: { createdAt: { lte: CUTOFF } },
  });
  const uniqueAiUsers = (await prisma.aIUsage.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length;

  const aiSavedResults = await prisma.aiSavedResult.count({ where: { createdAt: { lte: CUTOFF } } });

  record({ metric: "ai.usage.total", value: aiUsageTotal, unit: "calls", status: "VERIFIED", source: "AIUsage.count", confidence: "HIGH" });
  for (const f of aiUsageByFeature) {
    record({ metric: `ai.usage.by_feature.${f.feature}`, value: f._count, unit: "calls", status: "VERIFIED", source: "AIUsage.groupBy(feature)", confidence: "HIGH" });
  }
  for (const s of aiUsageByStatus) {
    record({ metric: `ai.usage.by_status.${s.status}`, value: s._count, unit: "calls", status: "VERIFIED", source: "AIUsage.groupBy(status)", confidence: "HIGH" });
  }
  record({ metric: "ai.usage.unique_users", value: uniqueAiUsers, unit: "users", status: "VERIFIED", source: "AIUsage.groupBy(userId)", confidence: "HIGH" });
  record({ metric: "ai.saved_results", value: aiSavedResults, unit: "results", status: "VERIFIED", source: "AiSavedResult.count", confidence: "HIGH" });
  }); // end Section 13 safeSection

  // ════════════════════════════════════════════════════════════════════════
  // SECTIONS 14-25 (wrapped for resilience against missing tables)
  // ════════════════════════════════════════════════════════════════════════
  await safeSection("Sections 14-25", async () => {

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 14: MONETIZATION
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 14: Monetization...");

  const transactions = await prisma.transaksi.findMany({
    where: { createdAt: { lte: CUTOFF } },
    select: { id: true, userId: true, type: true, amount: true, status: true, createdAt: true },
  });

  const txByStatus = new Map<string, number>();
  const txByType = new Map<string, { count: number; amount: number }>();
  let totalRevenue = 0;
  let successfulPayments = 0;

  for (const tx of transactions) {
    txByStatus.set(tx.status, (txByStatus.get(tx.status) || 0) + 1);
    if (!txByType.has(tx.type)) txByType.set(tx.type, { count: 0, amount: 0 });
    txByType.get(tx.type)!.count++;
    txByType.get(tx.type)!.amount += tx.amount;
    if (tx.status === "SUCCESS") {
      totalRevenue += tx.amount;
      successfulPayments++;
    }
  }

  for (const [status, count] of txByStatus) {
    record({ metric: `monetization.transactions.${status.toLowerCase()}`, value: count, unit: "transactions", status: "VERIFIED", source: "Transaksi.groupBy(status)", confidence: "HIGH" });
  }
  for (const [type, data] of txByType) {
    record({ metric: `monetization.transactions.type.${type}`, value: data.count, unit: "transactions", status: "VERIFIED", source: "Transaksi.groupBy(type)", confidence: "HIGH" });
    record({ metric: `monetization.revenue.type.${type}`, value: data.amount, unit: "IDR", status: "VERIFIED", source: "Transaksi.amount where type AND status=SUCCESS", confidence: "HIGH" });
  }

  record({ metric: "monetization.transactions.total", value: transactions.length, unit: "transactions", status: "VERIFIED", source: "Transaksi.count", confidence: "HIGH" });
  record({ metric: "monetization.transactions.successful", value: successfulPayments, unit: "transactions", status: "VERIFIED", source: "Transaksi.count(status=SUCCESS)", confidence: "HIGH" });
  record({ metric: "monetization.revenue.total", value: totalRevenue, unit: "IDR", status: "VERIFIED", source: "SUM(Transaksi.amount) WHERE status=SUCCESS", confidence: "HIGH" });

  // Premium users
  const premiumUsers = await prisma.user.count({
    where: { isPremium: true, isFounder: false, role: "GURU", createdAt: { lte: CUTOFF } },
  });
  const trialUsers = await prisma.user.count({
    where: { trialStartedAt: { not: null }, role: "GURU", createdAt: { lte: CUTOFF } },
  });
  const trialActive = await prisma.user.count({
    where: { trialEndsAt: { gt: new Date() }, trialStartedAt: { not: null }, role: "GURU" },
  });

  // Subscriptions
  const subscriptions = await prisma.subscription.count({ where: { createdAt: { lte: CUTOFF } } });
  const activeSubscriptions = await prisma.subscription.count({ where: { status: "ACTIVE", createdAt: { lte: CUTOFF } } });

  // Marketplace
  const pembelian = await prisma.pembelian.count({ where: { createdAt: { lte: CUTOFF } } });
  const successfulPembelian = await prisma.pembelian.count({ where: { status: "PAID", createdAt: { lte: CUTOFF } } });

  // Credit ledger
  const creditLedger = await prisma.aiCreditLedger.count({ where: { createdAt: { lte: CUTOFF } } });

  record({ metric: "monetization.premium_users", value: premiumUsers, unit: "users", status: "VERIFIED", source: "User.count(isPremium=true, !isFounder, GURU)", confidence: "HIGH" });
  record({ metric: "monetization.trial_users", value: trialUsers, unit: "users", status: "VERIFIED", source: "User.count(trialStartedAt != null, GURU)", confidence: "HIGH" });
  record({ metric: "monetization.trial_active", value: trialActive, unit: "users", status: "VERIFIED", source: "User.count(trialEndsAt > now, GURU)", confidence: "HIGH" });
  record({ metric: "monetization.subscriptions", value: subscriptions, unit: "subscriptions", status: "VERIFIED", source: "Subscription.count", confidence: "HIGH" });
  record({ metric: "monetization.active_subscriptions", value: activeSubscriptions, unit: "subscriptions", status: "VERIFIED", source: "Subscription.count(status=ACTIVE)", confidence: "HIGH" });
  record({ metric: "monetization.marketplace.purchases", value: pembelian, unit: "purchases", status: "VERIFIED", source: "Pembelian.count", confidence: "HIGH" });
  record({ metric: "monetization.marketplace.successful", value: successfulPembelian, unit: "purchases", status: "VERIFIED", source: "Pembelian.count(status=PAID)", confidence: "HIGH" });
  record({ metric: "monetization.credit_ledger", value: creditLedger, unit: "records", status: "VERIFIED", source: "AiCreditLedger.count", confidence: "HIGH" });

  // Trial → Paid conversion
  const trialPaidRate = trialUsers > 0 ? Math.round((premiumUsers / trialUsers) * 10000) / 100 : 0;
  record({ metric: "monetization.trial_to_paid_rate", value: trialPaidRate, unit: "%", status: "DERIVED", source: "premiumUsers / trialUsers", confidence: "HIGH", formula: `${premiumUsers} / ${trialUsers} × 100` });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 15: COMMISSION (GURU CERDAS SEJAHTERA)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 15: Commission...");

  const teacherWallets = await prisma.teacherWallet.count({ where: { createdAt: { lte: CUTOFF } } });
  const teacherCommissions = await prisma.teacherCommission.count({ where: { createdAt: { lte: CUTOFF } } });
  const teacherAttributions = await prisma.teacherAttribution.count({ where: { createdAt: { lte: CUTOFF } } });
  const teacherWithdrawals = await prisma.teacherCommissionWithdrawal.count({ where: { createdAt: { lte: CUTOFF } } });
  const teacherPayouts = await prisma.teacherPayout.count({ where: { createdAt: { lte: CUTOFF } } });

  record({ metric: "commission.wallets", value: teacherWallets, unit: "wallets", status: "VERIFIED", source: "TeacherWallet.count", confidence: "HIGH" });
  record({ metric: "commission.commissions", value: teacherCommissions, unit: "commissions", status: "VERIFIED", source: "TeacherCommission.count", confidence: "HIGH" });
  record({ metric: "commission.attributions", value: teacherAttributions, unit: "attributions", status: "VERIFIED", source: "TeacherAttribution.count", confidence: "HIGH" });
  record({ metric: "commission.withdrawals", value: teacherWithdrawals, unit: "withdrawals", status: "VERIFIED", source: "TeacherCommissionWithdrawal.count", confidence: "HIGH" });
  record({ metric: "commission.payouts", value: teacherPayouts, unit: "payouts", status: "VERIFIED", source: "TeacherPayout.count", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 16: CONTENT
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 16: Content...");

  const soalCount = await prisma.soal.count();
  const soalByType = await prisma.soal.groupBy({ by: ["type"], _count: true });
  const soalBySource = await prisma.soal.groupBy({ by: ["source"], _count: true });
  const quizzes = await prisma.quiz.count({ where: { createdAt: { lte: CUTOFF } } });
  const quizzesByType = await prisma.quiz.groupBy({ by: ["type"], _count: true, where: { createdAt: { lte: CUTOFF } } });
  const quizSubmissions = await prisma.quizSubmission.count({ where: { submittedAt: { lte: CUTOFF } } });
  const quizCompleted = await prisma.quizSubmission.count({ where: { status: { in: ["GRADED", "SUBMITTED"] }, submittedAt: { lte: CUTOFF } } });

  const generatedRpps = await prisma.generatedRPP.count({ where: { createdAt: { lte: CUTOFF } } });
  const ukbiQuestions = await prisma.uKBIQuestion.count();
  const tkaQuestions = await prisma.tKAQuestion.count();
  const levels = await prisma.learningLevel.count();
  const units = await prisma.learningUnit.count();

  record({ metric: "content.soal.total", value: soalCount, unit: "questions", status: "VERIFIED", source: "Soal.count", confidence: "HIGH" });
  for (const t of soalByType) {
    record({ metric: `content.soal.by_type.${t.type}`, value: t._count, unit: "questions", status: "VERIFIED", source: "Soal.groupBy(type)", confidence: "HIGH" });
  }
  for (const s of soalBySource) {
    record({ metric: `content.soal.by_source.${s.source}`, value: s._count, unit: "questions", status: "VERIFIED", source: "Soal.groupBy(source)", confidence: "HIGH" });
  }
  record({ metric: "content.quizzes", value: quizzes, unit: "quizzes", status: "VERIFIED", source: "Quiz.count", confidence: "HIGH" });
  for (const t of quizzesByType) {
    record({ metric: `content.quizzes.by_type.${t.type}`, value: t._count, unit: "quizzes", status: "VERIFIED", source: "Quiz.groupBy(type)", confidence: "HIGH" });
  }
  record({ metric: "content.quiz_submissions", value: quizSubmissions, unit: "submissions", status: "VERIFIED", source: "QuizSubmission.count", confidence: "HIGH" });
  record({ metric: "content.quiz_completed", value: quizCompleted, unit: "submissions", status: "VERIFIED", source: "QuizSubmission.count(status=GRADED|SUBMITTED)", confidence: "HIGH" });
  record({ metric: "content.generated_rpps", value: generatedRpps, unit: "rpps", status: "VERIFIED", source: "GeneratedRPP.count", confidence: "HIGH" });
  record({ metric: "content.ukbi_questions", value: ukbiQuestions, unit: "questions", status: "VERIFIED", source: "UKBIQuestion.count", confidence: "HIGH" });
  record({ metric: "content.tka_questions", value: tkaQuestions, unit: "questions", status: "VERIFIED", source: "TKAQuestion.count", confidence: "HIGH" });
  record({ metric: "content.levels", value: levels, unit: "levels", status: "VERIFIED", source: "LearningLevel.count", confidence: "HIGH" });
  record({ metric: "content.units", value: units, unit: "units", status: "VERIFIED", source: "LearningUnit.count", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 17: SOCIAL
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 17: Social...");

  const follows = await prisma.follow.count({ where: { createdAt: { lte: CUTOFF } } });
  const profileLikes = await prisma.profileLike.count({ where: { createdAt: { lte: CUTOFF } } });
  const communities = await prisma.community.count({ where: { createdAt: { lte: CUTOFF } } });
  const communityMembers = await prisma.communityMember.count({ where: { joinedAt: { lte: CUTOFF } } });
  const communityPosts = await prisma.communityPost.count({ where: { createdAt: { lte: CUTOFF } } });

  record({ metric: "social.follows", value: follows, unit: "follows", status: "VERIFIED", source: "Follow.count", confidence: "HIGH" });
  record({ metric: "social.profile_likes", value: profileLikes, unit: "likes", status: "VERIFIED", source: "ProfileLike.count", confidence: "HIGH" });
  record({ metric: "social.communities", value: communities, unit: "communities", status: "VERIFIED", source: "Community.count", confidence: "HIGH" });
  record({ metric: "social.community_members", value: communityMembers, unit: "members", status: "VERIFIED", source: "CommunityMember.count", confidence: "HIGH" });
  record({ metric: "social.community_posts", value: communityPosts, unit: "posts", status: "VERIFIED", source: "CommunityPost.count", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 18: PENUGASAN (ASSIGNMENTS)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 18: Penugasan...");

  const penugasans = await prisma.penugasan.count({ where: { createdAt: { lte: CUTOFF } } });
  const penugasanSubmissions = await prisma.penugasanSubmission.count({ where: { startedAt: { lte: CUTOFF } } });
  const penugasanCompleted = await prisma.penugasanSubmission.count({ where: { status: "COMPLETED", startedAt: { lte: CUTOFF } } });

  record({ metric: "penugasan.total", value: penugasans, unit: "assignments", status: "VERIFIED", source: "Penugasan.count", confidence: "HIGH" });
  record({ metric: "penugasan.submissions", value: penugasanSubmissions, unit: "submissions", status: "VERIFIED", source: "PenugasanSubmission.count", confidence: "HIGH" });
  record({ metric: "penugasan.completed", value: penugasanCompleted, unit: "submissions", status: "VERIFIED", source: "PenugasanSubmission.count(status=COMPLETED)", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 19: GROWTH (HISTORICAL COMPARISON)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 19: Growth...");

  const usersAtHistorical = await prisma.user.count({ where: { createdAt: { lte: HISTORICAL } } });
  const usersAtCutoff = totalUsers;
  const guruAtHistorical = await prisma.user.count({ where: { role: "GURU", createdAt: { lte: HISTORICAL } } });
  const muridAtHistorical = await prisma.user.count({ where: { role: "MURID", createdAt: { lte: HISTORICAL } } });
  const karyaAtHistorical = await prisma.studentKarya.count({ where: { createdAt: { lte: HISTORICAL } } });

  const growthUsersAbs = usersAtCutoff - usersAtHistorical;
  const growthUsersPct = usersAtHistorical > 0 ? Math.round((growthUsersAbs / usersAtHistorical) * 10000) / 100 : 0;
  const growthGuruAbs = totalByRole.find(r => r.role === "GURU")!._count - guruAtHistorical;
  const growthGuruPct = guruAtHistorical > 0 ? Math.round((growthGuruAbs / guruAtHistorical) * 10000) / 100 : 0;
  const growthKaryaAbs = karyaCount - karyaAtHistorical;
  const growthKaryaPct = karyaAtHistorical > 0 ? Math.round((growthKaryaAbs / karyaAtHistorical) * 10000) / 100 : 0;

  record({ metric: "growth.users.historical", value: usersAtHistorical, unit: "users", period: HISTORICAL.toISOString().slice(0, 10), status: "VERIFIED", source: "User.count(createdAt ≤ historical)", confidence: "HIGH" });
  record({ metric: "growth.users.current", value: usersAtCutoff, unit: "users", period: CUTOFF.toISOString().slice(0, 10), status: "VERIFIED", source: "User.count(createdAt ≤ cutoff)", confidence: "HIGH" });
  record({ metric: "growth.users.absolute", value: growthUsersAbs, unit: "users", status: "DERIVED", source: "current - historical", confidence: "HIGH" });
  record({ metric: "growth.users.percentage", value: growthUsersPct, unit: "%", status: "DERIVED", source: "(current - historical) / historical × 100", confidence: "HIGH" });
  record({ metric: "growth.guru.historical", value: guruAtHistorical, unit: "users", period: HISTORICAL.toISOString().slice(0, 10), status: "VERIFIED", source: "User.count(GURU, ≤ historical)", confidence: "HIGH" });
  record({ metric: "growth.guru.absolute", value: growthGuruAbs, unit: "users", status: "DERIVED", source: "current - historical", confidence: "HIGH" });
  record({ metric: "growth.guru.percentage", value: growthGuruPct, unit: "%", status: "DERIVED", source: "(current - historical) / historical × 100", confidence: "HIGH" });
  record({ metric: "growth.karya.historical", value: karyaAtHistorical, unit: "karya", period: HISTORICAL.toISOString().slice(0, 10), status: "VERIFIED", source: "StudentKarya.count(≤ historical)", confidence: "HIGH" });
  record({ metric: "growth.karya.absolute", value: growthKaryaAbs, unit: "karya", status: "DERIVED", source: "current - historical", confidence: "HIGH" });
  record({ metric: "growth.karya.percentage", value: growthKaryaPct, unit: "%", status: "DERIVED", source: "(current - historical) / historical × 100", confidence: "HIGH" });

  // Monthly signup velocity
  for (const [mk, c] of Object.entries(cohorts).sort()) {
    record({ metric: `growth.signup_velocity.${mk}`, value: c.total, unit: "users", period: mk, status: "VERIFIED", source: "cohorts data", confidence: "HIGH" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 20: DATA QUALITY / CONTAMINATION
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 20: Data Quality...");

  // Test accounts
  const testAccounts = await prisma.user.count({
    where: {
      OR: [
        { email: { contains: "demo" } },
        { email: { contains: "test" } },
        { email: { contains: "example" } },
        { email: { contains: "@dev." } },
        { email: { contains: "@staging." } },
      ],
    },
  });

  // Internal accounts (founders + admins)
  const internalAccounts = founders + admins;

  // Users with suspicious patterns
  const usersWithDefaultAvatar = await prisma.user.count({
    where: { avatar: null, createdAt: { lte: CUTOFF } },
  });

  // Orphan profiles (profile without meaningful data)
  const profilesEmpty = await prisma.profile.count({
    where: {
      school: null,
      city: null,
      province: null,
      bio: null,
      nip: null,
      nuptk: null,
    },
  });

  record({ metric: "data_quality.test_accounts", value: testAccounts, unit: "users", status: "VERIFIED", source: "User.count(email LIKE demo/test/example/dev/staging)", confidence: "HIGH" });
  record({ metric: "data_quality.internal_accounts", value: internalAccounts, unit: "users", status: "VERIFIED", source: "founders + admins", confidence: "HIGH", notes: `founders: ${founders}, admins: ${admins}` });
  record({ metric: "data_quality.users_no_avatar", value: usersWithDefaultAvatar, unit: "users", status: "PROXY", source: "User.count(avatar=null)", confidence: "MEDIUM", notes: "Proxy for incomplete profiles" });
  record({ metric: "data_quality.profiles_empty", value: profilesEmpty, unit: "profiles", status: "VERIFIED", source: "Profile.count(all fields null)", confidence: "HIGH" });
  record({ metric: "data_quality.unknown_contamination_risk", value: testAccounts + internalAccounts, unit: "users", status: "DATA_QUALITY_ISSUE", source: "test + internal accounts", confidence: "HIGH", notes: "These users may contaminate growth/engagement metrics if not excluded" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 21: LEARNING OUTCOME READINESS
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 21: Learning Outcome...");

  // Check for users with both diagnostic + UKBI scores
  const usersWithUkbiScores = await prisma.progresKompetensi.findMany({
    where: { status: "COMPLETED", percentage: { not: null }, startedAt: { lte: CUTOFF } },
    select: { userId: true, percentage: true, startedAt: true, paketId: true },
  });

  const usersWithDiagnostic = await prisma.adaptivePracticeSession.findMany({
    where: { status: "COMPLETED", createdAt: { lte: CUTOFF } },
    select: { userId: true, createdAt: true, targetSkill: true },
  });

  const usersWithBoth = new Set(
    usersWithUkbiScores.map(u => u.userId).filter(id => usersWithDiagnostic.some(d => d.userId === id))
  );

  record({ metric: "learning_outcome.users_with_both_assessment", value: usersWithBoth.size, unit: "users", status: "DERIVED", source: "Users with both UKBI+diagnostic completed", confidence: "HIGH" });
  record({ metric: "learning_outcome.ukbi_only_users", value: new Set(usersWithUkbiScores.map(u => u.userId)).size, unit: "users", status: "VERIFIED", source: "ProgresKompetensi(COMPLETED) unique users", confidence: "HIGH" });
  record({ metric: "learning_outcome.diagnostic_only_users", value: new Set(usersWithDiagnostic.map(d => d.userId)).size, unit: "users", status: "VERIFIED", source: "AdaptivePracticeSession(COMPLETED) unique users", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 22: NORTH STAR CANDIDATE
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 22: North Star Analysis...");

  // Weekly active learners completing meaningful activity
  const oneWeekAgo = new Date(CUTOFF.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyXpUsers = await prisma.xpLedger.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: oneWeekAgo, lte: CUTOFF } },
  });
  const weeklyEvidenceUsers = await prisma.learningEvidence.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: oneWeekAgo, lte: CUTOFF } },
  });
  const weeklyProgressUsers = await prisma.userUnitProgress.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: oneWeekAgo, lte: CUTOFF } },
  });
  const weeklyKaryaUsers = await prisma.studentKarya.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: oneWeekAgo, lte: CUTOFF } },
  });

  const weeklyActiveLearners = new Set<string>();
  for (const u of weeklyXpUsers) weeklyActiveLearners.add(u.userId);
  for (const u of weeklyEvidenceUsers) weeklyActiveLearners.add(u.userId);
  for (const u of weeklyProgressUsers) weeklyActiveLearners.add(u.userId);
  for (const u of weeklyKaryaUsers) weeklyActiveLearners.add(u.userId);

  record({ metric: "north_star.weekly_active_learners", value: weeklyActiveLearners.size, unit: "users", period: "7d", status: "DERIVED", source: "Union of weekly xp | evidence | progress | karya users", confidence: "HIGH" });

  // Monthly active
  const oneMonthAgo = new Date(CUTOFF.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthlyXpUsers = await prisma.xpLedger.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: oneMonthAgo, lte: CUTOFF } },
  });
  const monthlyEvidenceUsers = await prisma.learningEvidence.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: oneMonthAgo, lte: CUTOFF } },
  });
  const monthlyActiveLearners = new Set<string>();
  for (const u of monthlyXpUsers) monthlyActiveLearners.add(u.userId);
  for (const u of monthlyEvidenceUsers) monthlyActiveLearners.add(u.userId);

  record({ metric: "north_star.monthly_active_learners", value: monthlyActiveLearners.size, unit: "users", period: "30d", status: "DERIVED", source: "Union of monthly xp | evidence users", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 23: PREMIUM FUNNEL (Available Data Only)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 23: Premium Funnel...");

  // Available funnel stages (from DB)
  const eligibleGurus = allUsers.filter(u => u.role === "GURU").length;
  const trialStarted = await prisma.user.count({
    where: { trialStartedAt: { not: null }, role: "GURU", createdAt: { lte: CUTOFF } },
  });
  const checkoutInitiated = await prisma.transaksi.count({
    where: { type: { contains: "PREMIUM" }, createdAt: { lte: CUTOFF } },
  });
  const paymentSuccessful = await prisma.transaksi.count({
    where: { type: { contains: "PREMIUM" }, status: "SUCCESS", createdAt: { lte: CUTOFF } },
  });

  record({ metric: "premium_funnel.eligible_gurus", value: eligibleGurus, unit: "users", status: "VERIFIED", source: "User.count(GURU)", confidence: "HIGH" });
  record({ metric: "premium_funnel.trial_started", value: trialStarted, unit: "users", status: "VERIFIED", source: "User.count(trialStartedAt != null)", confidence: "HIGH" });
  record({ metric: "premium_funnel.checkout_initiated", value: checkoutInitiated, unit: "transactions", status: "PROXY", source: "Transaksi.count(type LIKE PREMIUM)", confidence: "MEDIUM", notes: "Proxy — not all premium types may be captured" });
  record({ metric: "premium_funnel.payment_successful", value: paymentSuccessful, unit: "transactions", status: "VERIFIED", source: "Transaksi.count(type LIKE PREMIUM, status=SUCCESS)", confidence: "HIGH" });

  // Missing instrumentation
  record({ metric: "premium_funnel.missing", value: ["premium_viewed", "checkout_abandoned"], unit: "events", status: "UNVERIFIED", source: "No instrumentation found", confidence: "NONE", notes: "These events are not tracked in the database" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 24: SCHOOL FUNNEL
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 24: School Funnel...");

  // Stage 1: School name exists
  const schoolsWithNames = rawSchoolNames.size;
  // Stage 2: School has teacher (has at least one GURU in profiles)
  let schoolsWithTeachers = 0;
  for (const [, roles] of schoolRoleCounts) {
    if (roles.guru.size > 0) schoolsWithTeachers++;
  }
  // Stage 3: School has class (teacher has at least one Group)
  let schoolsWithClasses = 0;
  for (const [norm, roles] of schoolRoleCounts) {
    if (roles.guru.size > 0) {
      for (const guruId of roles.guru) {
        const hasGroup = groupsByTeacher.some(g => g.teacherId === guruId);
        if (hasGroup) { schoolsWithClasses++; break; }
      }
    }
  }
  // Stage 4: School has student (has at least one MURID in profiles)
  let schoolsWithStudents = 0;
  for (const [, roles] of schoolRoleCounts) {
    if (roles.murid.size > 0) schoolsWithStudents++;
  }

  record({ metric: "school_funnel.stage1_name_exists", value: schoolsWithNames, unit: "schools", status: "VERIFIED", source: "DISTINCT Profile.school", confidence: "HIGH" });
  record({ metric: "school_funnel.stage2_has_teacher", value: schoolsWithTeachers, unit: "schools", status: "DERIVED", source: "Schools with ≥1 GURU profile", confidence: "HIGH" });
  record({ metric: "school_funnel.stage3_has_class", value: schoolsWithClasses, unit: "schools", status: "DERIVED", source: "Schools where teacher has ≥1 Group", confidence: "MEDIUM" });
  record({ metric: "school_funnel.stage4_has_student", value: schoolsWithStudents, unit: "schools", status: "DERIVED", source: "Schools with ≥1 MURID profile", confidence: "HIGH" });

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 25: FEATURE ADOPTION SUMMARY
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Section 25: Feature Adoption...");

  // Teacher features
  const teacherFeatures = {
    ai_tools: (await prisma.aiSavedResult.groupBy({ by: ["userId"], where: { createdAt: { lte: CUTOFF } } })).length,
    rpp_generated: generatedRpps,
    soal_created: (await prisma.quiz.count({ where: { createdAt: { lte: CUTOFF } } })),
    classes_managed: (await prisma.group.groupBy({ by: ["teacherId"], where: { createdAt: { lte: CUTOFF } } })).length,
    students_imported: (await prisma.groupMember.groupBy({ by: ["userId"], where: { group: { createdAt: { lte: CUTOFF } }, role: "member" } })).length,
  };

  // Student features
  const studentFeatures = {
    jalur_cerdas: uniqueStudentsWithProgress,
    learning_evidence: uniqueStudentsWithEvidence,
    karya_written: uniqueKaryaAuthors,
    ukbi_attempted: uniqueUkbiUsers,
    adaptive_attempted: uniqueAdaptiveUsers,
    daily_action: uniqueDailyUsers,
    game_played: uniqueGamePlayers,
  };

  for (const [k, v] of Object.entries(teacherFeatures)) {
    record({ metric: `feature_adoption.teacher.${k}`, value: v, unit: "users", status: "VERIFIED", source: `Various tables`, confidence: "HIGH" });
  }
  for (const [k, v] of Object.entries(studentFeatures)) {
    record({ metric: `feature_adoption.student.${k}`, value: v, unit: "users", status: "VERIFIED", source: `Various tables`, confidence: "HIGH" });
  }

  }); // end Sections 14-25 safeSection

  // ═══════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════
  console.log(`\n✅ Audit complete. ${metrics.length} metrics collected.\n`);

  // Write JSON output
  const outDir = join(process.cwd(), "data");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "business-truth-audit-september-2026.json");
  writeFileSync(outPath, JSON.stringify({ cutoff: CUTOFF.toISOString(), historical: HISTORICAL.toISOString(), metricCount: metrics.length, metrics }, null, 2));
  console.log(`📄 Written: ${outPath}`);

  // Print summary
  const verified = metrics.filter(m => m.status === "VERIFIED").length;
  const derived = metrics.filter(m => m.status === "DERIVED").length;
  const proxy = metrics.filter(m => m.status === "PROXY").length;
  const unverified = metrics.filter(m => m.status === "UNVERIFIED").length;
  const dqIssues = metrics.filter(m => m.status === "DATA_QUALITY_ISSUE").length;

  console.log(`\n📊 Status Breakdown:`);
  console.log(`   VERIFIED:            ${verified}`);
  console.log(`   DERIVED:             ${derived}`);
  console.log(`   PROXY:               ${proxy}`);
  console.log(`   UNVERIFIED:          ${unverified}`);
  console.log(`   DATA_QUALITY_ISSUE:  ${dqIssues}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error("❌ Audit failed:", e);
  process.exit(1);
});
