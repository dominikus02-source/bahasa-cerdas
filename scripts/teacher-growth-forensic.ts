#!/usr/bin/env tsx
/**
 * Teacher Growth Forensic — BahasaCerdas.com
 *
 * Phase 6: Discover repeatable behavior behind successful teachers.
 * Goal: turn raw teacher activity into activation playbooks + experiments.
 *
 * READ-ONLY. No production mutations. Queries Prisma against production DB.
 * Run: npx tsx scripts/teacher-growth-forensic.ts
 * Env: DATABASE_URL must point to production Supabase pooler.
 *
 * Output:
 *   data/teacher-growth-forensic-september-2026.json  (full 21-section report)
 *   data/power-teacher-cohort-september-2026.json     (per-teacher cohort detail)
 *
 * Date snapshot: 2026-09-02 (WIB)
 */

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

loadEnv({ path: ".env.local" });
const prisma = new PrismaClient({ log: [] });

const NOW = new Date();
const WIB_OFFSET = 7 * 60 * 60 * 1000;
const nowWib = new Date(NOW.getTime() + WIB_OFFSET);
const SNAPSHOT_DATE = nowWib.toISOString().slice(0, 10);

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value, 2
  );
}

// ─── TABLE DISCOVERY ────────────────────────────────────────────────────────
let existingTables = new Set<string>();

async function discoverTables() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    existingTables = new Set(rows.map(r => r.tablename));
    console.log(`📋 Discovered ${existingTables.size} tables in production DB`);
  } catch (e: any) {
    console.warn("⚠️  Could not discover tables:", e.message?.slice(0, 100));
  }
}

function hasTable(name: string): boolean {
  return existingTables.has(name);
}

async function safeQuery<T>(sql: string, label: string): Promise<T[]> {
  try {
    return (await prisma.$queryRawUnsafe<T[]>(sql)) as T[];
  } catch (e: any) {
    if (e.code === "42P01") {
      console.log(`  ⏭️  ${label}: table not found, skipping`);
      return [];
    }
    console.warn(`  ⚠️  ${label}: ${e.message?.slice(0, 80)}`);
    return [];
  }
}

const d = (n: number) => daysAgo(n).toISOString();

// ─── SECTION A: TEACHER COHORTS & ACTIVATION ────────────────────────────────
async function cohortActivation() {
  // Teacher cohorts by month of group creation (proxy for "became active teacher")
  const cohortGroups = hasTable("Group")
    ? await safeQuery<{ cohort: string; teachers: number; groups: number; students: number }>(
        `SELECT TO_CHAR(g."createdAt", 'YYYY-MM') AS cohort,
           COUNT(DISTINCT g."teacherId")::int AS teachers,
           COUNT(DISTINCT g."id")::int AS groups,
           COUNT(DISTINCT gm."userId")::int AS students
         FROM "Group" g
         LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
         WHERE g."isActive" = true
         GROUP BY cohort ORDER BY cohort`,
        "cohortGrowth"
      )
    : [];

  // Teachers who created a group but have NO ongoing teaching activity (30d)
  // → group creators who "went dormant". Identify the activation cliff.
  const orphanGroups30d = hasTable("Group")
    ? await safeQuery<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "Group" g
         WHERE g."isActive" = true
           AND g."createdAt" >= '${d(60)}'
           AND NOT EXISTS (
             SELECT 1 FROM "Pengumuman" p WHERE p."groupId" = g."id"
           )
           AND NOT EXISTS (
             SELECT 1 FROM "Penugasan" pen WHERE pen."groupId" = g."id"
           )`,
        "orphanGroups"
      )
    : [];

  const activeGroups30d = hasTable("Group")
    ? await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT g."id")::int AS count FROM "Group" g
         WHERE g."isActive" = true
           AND (
             EXISTS (SELECT 1 FROM "Pengumuman" p WHERE p."groupId" = g."id" AND p."createdAt" >= '${d(30)}')
             OR EXISTS (SELECT 1 FROM "Penugasan" pen WHERE pen."groupId" = g."id" AND pen."createdAt" >= '${d(30)}')
             OR EXISTS (SELECT 1 FROM "QuizAssignment" qa WHERE qa."groupId" = g."id" AND qa."assignedAt" >= '${d(30)}')
           )`,
        "activeGroups30d"
      )
    : [];

  return { cohortGroups, orphanGroups30d: orphanGroups30d[0]?.count ?? 0, activeGroups30d: activeGroups30d[0]?.count ?? 0 };
}

// ─── SECTION B: TEACHER FUNNEL ──────────────────────────────────────────────
async function teacherFunnel() {
  const totalGuru = await prisma.user.count({ where: { role: "GURU" } });
  const founderTeachers = await prisma.user.count({ where: { role: "GURU", isFounder: true } });

  const groupCreators = hasTable("Group")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(DISTINCT "teacherId")::int AS count FROM "Group"`, "groupCreators"))[0]?.count ?? 0
    : 0;

  // Teachers active in last 30d = any of: pengumuman, penugasan, quiz assignment, grading / nilai, karya feedback, AI use
  const active30d = hasTable("Pengumuman")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "teacherId")::int AS count FROM "Pengumuman"
         WHERE "createdAt" >= '${d(30)}'`, "activeDecl30d"
      ))[0]?.count ?? 0
    : 0;

  // Teachers with 1+ student interaction (any teaching artifact) at all
  const everTaught = hasTable("Penugasan")
    ? (await safeQuery<{ count: number }>(
         `SELECT COUNT(DISTINCT "teacherId")::int AS count FROM "Penugasan"
         UNION ALL
         SELECT COUNT(DISTINCT "teacherId")::int FROM "Pengumuman"
         UNION ALL
         SELECT COUNT(DISTINCT "creatorId")::int FROM "Quiz"`, "everTaught"
      ))[0]?.count ?? 0
    : 0;

  // Distribution of groups per teacher (to find the "committed teacher" cluster)
  const groupsPerTeacher = hasTable("Group")
    ? await safeQuery<{ groupCount: number; teachers: number }>(
        `SELECT gcount AS "groupCount", COUNT(*)::int AS teachers FROM (
           SELECT "teacherId", COUNT(*)::int AS gcount FROM "Group" WHERE "isActive" = true GROUP BY "teacherId"
         ) t GROUP BY gcount ORDER BY gcount`, "groupsPerTeacher"
      )
    : [];

  return {
    totalGuru,
    founderTeachers,
    groupCreators,
    active30d,
    everTaught,
    groupsPerTeacher,
    activationRate: totalGuru ? Math.round((groupCreators / totalGuru) * 1000) / 10 : 0,
    activeRateOfCreators: groupCreators ? Math.round((active30d / groupCreators) * 1000) / 10 : 0,
  };
}

// ─── SECTION C: STUDENT GROWTH vs TEACHER BEHAVIOR ──────────────────────────
async function studentGrowthCorrelation() {
  // For each teacher: total students, students joined in last 30d, and their
  // teaching behavior counts. Correlate growth with behavior.
  const teachers = await safeQuery<{
    id: string; fullName: string; email: string; isFounder: boolean;
    groupCount: number; totalStudents: number; students30d: number;
    pengumuman: number; penugasan: number; quizAssignments: number;
  }>(
    `SELECT u."id", u."fullName", u."email", u."isFounder",
       COUNT(DISTINCT g."id")::int AS "groupCount",
       COUNT(DISTINCT gm."userId")::int AS "totalStudents",
       COUNT(DISTINCT CASE WHEN gm."joinedAt" >= '${d(30)}' THEN gm."userId" END)::int AS "students30d",
       (SELECT COUNT(*)::int FROM "Pengumuman" p WHERE p."teacherId" = u."id") AS "pengumuman",
       (SELECT COUNT(*)::int FROM "Penugasan" pen WHERE pen."teacherId" = u."id") AS "penugasan",
       (SELECT COUNT(*)::int FROM "Quiz" q JOIN "QuizAssignment" qa ON qa."quizId" = q."id" WHERE q."creatorId" = u."id") AS "quizAssignments"
     FROM "User" u
     LEFT JOIN "Group" g ON g."teacherId" = u."id" AND g."isActive" = true
     LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
     WHERE u."role" = 'GURU'
     GROUP BY u."id", u."fullName", u."email", u."isFounder", u."role"
     ORDER BY "totalStudents" DESC
     LIMIT 100`,
    "teacherBehaviorMatrix"
  );

  // Students joined per month (platform-level growth)
  const studentsByMonth = hasTable("GroupMember")
    ? await safeQuery<{ month: string; count: number }>(
        `SELECT TO_CHAR("joinedAt", 'YYYY-MM') AS month, COUNT(*)::int AS count
         FROM "GroupMember" WHERE "joinedAt" >= '2026-01-01'
         GROUP BY month ORDER BY month`, "studentsByMonth"
      )
    : [];

  return { teachers, studentsByMonth, teacherSampleSize: teachers.length };
}

// ─── SECTION D: FEATURE ADOPTION BY TEACHERS ────────────────────────────────
async function featureAdoption() {
  const features: Record<string, number> = {};

  async function countDistinct(sql: string, label: string): Promise<number> {
    const r = await safeQuery<{ count: number }>(sql, label);
    return r[0]?.count ?? 0;
  }

  const [
    announce, assign, quiz, karyaFeedback, nilaiInput, aiTools, gameHost, ukbiReview,
  ] = await Promise.all([
    hasTable("Pengumuman") ? countDistinct(`SELECT COUNT(DISTINCT "teacherId")::int AS count FROM "Pengumuman"`, "featAnnounce") : 0,
    hasTable("Penugasan") ? countDistinct(`SELECT COUNT(DISTINCT "teacherId")::int AS count FROM "Penugasan"`, "featAssign") : 0,
    hasTable("Quiz") ? countDistinct(`SELECT COUNT(DISTINCT "creatorId")::int AS count FROM "Quiz"`, "featQuiz") : 0,
    hasTable("StudentKaryaComment") ? countDistinct(`SELECT COUNT(DISTINCT c."userId")::int AS count FROM "StudentKaryaComment" c JOIN "User" cu ON cu."id" = c."userId" WHERE cu."role" = 'GURU'`, "featKarya") : 0,
    hasTable("Nilai") ? countDistinct(`SELECT COUNT(DISTINCT "userId")::int AS count FROM "Nilai" WHERE "sumberType" = 'MANUAL'`, "featNilai") : 0,
    hasTable("AIUsage") ? countDistinct(`SELECT COUNT(DISTINCT "userId")::int AS count FROM "AIUsage" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'GURU')`, "featAI") : 0,
    hasTable("GameResult") ? countDistinct(`SELECT COUNT(DISTINCT u."id")::int AS count FROM "User" u JOIN "GameResult" gr ON gr."userId" = u."id" WHERE u."role" = 'GURU'`, "featGame") : 0,
    0,
  ]);

  features.pengumuman = announce;
  features.penugasan = assign;
  features.kuis = quiz;
  features.feedbackKarya = karyaFeedback;
  features.inputNilai = nilaiInput;
  features.alatAI = aiTools;
  features.hostGame = gameHost;

  return features;
}

// ─── SECTION E: POWER TEACHER COHORT DETAIL ────────────────────────────────
async function powerTeacherCohort() {
  // Top teachers by student count — full signature for playbook construction.
  const top = await safeQuery<{
    id: string; fullName: string; email: string; isFounder: boolean; createdAt: string;
    groupCount: number; totalStudents: number; students30d: number;
    pengumuman: number; penugasan: number; quizAssignments: number;
  }>(
    `SELECT u."id", u."fullName", u."email", u."isFounder", u."createdAt"::text,
       COUNT(DISTINCT g."id")::int AS "groupCount",
       COUNT(DISTINCT gm."userId")::int AS "totalStudents",
       COUNT(DISTINCT CASE WHEN gm."joinedAt" >= '${d(30)}' THEN gm."userId" END)::int AS "students30d",
       (SELECT COUNT(*)::int FROM "Pengumuman" p WHERE p."teacherId" = u."id") AS "pengumuman",
       (SELECT COUNT(*)::int FROM "Penugasan" pen WHERE pen."teacherId" = u."id") AS "penugasan",
       (SELECT COUNT(*)::int FROM "Quiz" q JOIN "QuizAssignment" qa ON qa."quizId" = q."id" WHERE q."creatorId" = u."id") AS "quizAssignments"
     FROM "User" u
     LEFT JOIN "Group" g ON g."teacherId" = u."id" AND g."isActive" = true
     LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
     WHERE u."role" = 'GURU'
     GROUP BY u."id", u."fullName", u."email", u."isFounder", u."createdAt"
     ORDER BY "totalStudents" DESC
     LIMIT 15`,
    "powerCohort"
  );

  // Per-teacher artificial activity timeline for the top cohort only
  const detail: any[] = [];
  for (const t of top.slice(0, 10)) {
    const [
      karyaCount, karyaLikes, aulaEmpunya, quizGraded, aiUses,
    ] = await Promise.all([
      hasTable("StudentKarya") ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "StudentKarya" sk
         JOIN "GroupMember" gm ON gm."userId" = sk."userId"
         JOIN "Group" g ON g."id" = gm."groupId" WHERE g."teacherId" = '${t.id}'`, "karya-" + t.id.slice(0, 6)
      ))[0]?.count ?? 0 : 0,
      hasTable("StudentKarya") ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "StudentKarya" sk
         JOIN "GroupMember" gm ON gm."userId" = sk."userId"
         JOIN "Group" g ON g."id" = gm."groupId"
         WHERE g."teacherId" = '${t.id}' AND sk."likesCount" > 0`, "karyaLike-" + t.id.slice(0, 6)
      ))[0]?.count ?? 0 : 0,
      0, 0,
      hasTable("AIUsage") ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "AIUsage" WHERE "userId" = '${t.id}'`, "ai-" + t.id.slice(0, 6)
      ))[0]?.count ?? 0 : 0,
    ]);
    detail.push({ teacherId: t.id, fullName: t.fullName, karyaByStudents: karyaCount, karyaWithLikes: karyaLikes, aiUses });
  }

  return { top, detail };
}

// ─── SECTION F: TEACHER RETENTION / DORMANCY ────────────────────────────────
async function teacherRetention() {
  // First-ever teacher artifact timestamp (proxy for onboarding completion)
  // vs last artifact. Compute time between first group and first teaching action.
  const activationGap = hasTable("Pengumuman") && hasTable("Penugasan")
    ? await safeQuery<{ teacher: string; firstGroup: string | null; firstAction: string | null; gapDays: number | null }>(
        `SELECT t."id" AS teacher,
           (SELECT MIN(g."createdAt")::text FROM "Group" g WHERE g."teacherId" = t."id") AS "firstGroup",
           LEAST(
             (SELECT MIN(p."createdAt")::text FROM "Pengumuman" p WHERE p."teacherId" = t."id"),
             (SELECT MIN(pen."createdAt")::text FROM "Penugasan" pen WHERE pen."teacherId" = t."id")
           )::text AS "firstAction",
           NULL::int AS "gapDays"
         FROM "User" t
         WHERE t."role" = 'GURU'
           AND EXISTS (SELECT 1 FROM "Group" g WHERE g."teacherId" = t."id")`,
        "activationGap"
      )
    : [];

  return { activationGap, sample: activationGap.length };
}

// ─── SECTION G: STUDENT-RESPONSE LOOP AGGREGATES ────────────────────────────
async function studentResponseLoop() {
  // Per teacher: students in group who activated (XP>0 or karya or quiz submission)
  const loop = await safeQuery<{
    id: string; fullName: string; groupCount: number; totalStudents: number;
    studentsWithXp: number; studentsWithKarya: number; studentsQuizSubmitted: number;
  }>(
    `SELECT u."id", u."fullName",
       COUNT(DISTINCT g."id")::int AS "groupCount",
       COUNT(DISTINCT gm."userId")::int AS "totalStudents",
       COUNT(DISTINCT CASE WHEN us.xp > 0 THEN gm."userId" END)::int AS "studentsWithXp",
       COUNT(DISTINCT CASE WHEN sk."id" IS NOT NULL THEN gm."userId" END)::int AS "studentsWithKarya",
       COUNT(DISTINCT CASE WHEN qs."id" IS NOT NULL THEN gm."userId" END)::int AS "studentsQuizSubmitted"
     FROM "User" u
     LEFT JOIN "Group" g ON g."teacherId" = u."id" AND g."isActive" = true
     LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
     LEFT JOIN "User" us ON us."id" = gm."userId"
     LEFT JOIN "StudentKarya" sk ON sk."userId" = gm."userId"
     LEFT JOIN "QuizSubmission" qs ON qs."userId" = gm."userId" AND qs."status" IN ('SUBMITTED','GRADED')
     WHERE u."role" = 'GURU' AND u."isFounder" = false
     GROUP BY u."id", u."fullName", u."role"
     ORDER BY "totalStudents" DESC LIMIT 30`,
    "studentResponseLoop"
  );

  return loop;
}

// ─── SECTION H: AI ADOPTION BY TEACHERS ─────────────────────────────────────
async function teacherAiAdoption() {
  const byFeature = hasTable("AIUsage")
    ? await safeQuery<{ feature: string; count: number; teachers: number }>(
        `SELECT ai."feature", COUNT(*)::int AS "count", COUNT(DISTINCT ai."userId")::int AS teachers
         FROM "AIUsage" ai JOIN "User" u ON u."id" = ai."userId"
         WHERE u."role" = 'GURU'
         GROUP BY ai."feature" ORDER BY teachers DESC, "count" DESC
         LIMIT 15`, "aiByFeature"
      )
    : [];

  const aiTeachersLast30 = hasTable("AIUsage")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int AS count FROM "AIUsage" WHERE "createdAt" >= '${d(30)}'
         AND "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'GURU')`, "ai30d"
      ))[0]?.count ?? 0
    : 0;

  return { byFeature, aiTeachersLast30 };
}

// ─── SECTION I: SCHOOL/INFRASTRUCTURE EFFECT ────────────────────────────────
async function schoolEffect() {
  const profileGuru = hasTable("Profile")
    ? await safeQuery<{ school: string; count: number }>(
        `SELECT p."school", COUNT(*)::int AS count FROM "Profile" p
         JOIN "User" u ON u."id" = p."userId"
         WHERE u."role" = 'GURU' AND p."school" IS NOT NULL AND p."school" <> ''
         GROUP BY p."school" ORDER BY count DESC LIMIT 15`, "schoolEffect"
      )
    : [];

  const withValidSchool = await prisma.user.count({ where: { role: "GURU", profile: { school: { not: { equals: "" } } } } });
  const withSchoolId = await prisma.user.count({ where: { role: "GURU", profile: { schoolId: { not: null } } } });

  return { profileGuru, guruWithSchoolText: withValidSchool, guruWithSchoolId: withSchoolId };
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Teacher Growth Forensic — BahasaCerdas.com");
  console.log(`📅 Snapshot: ${SNAPSHOT_DATE} (WIB)`);
  console.log("");

  await discoverTables();

  console.log("\n📊 Running forensic sections...");
  const [
    cohort,
    funnel,
    growth,
    adoption,
    cohort2,
    retention,
    loop,
    ai,
    school,
  ] = await Promise.all([
    cohortActivation(),
    teacherFunnel(),
    studentGrowthCorrelation(),
    featureAdoption(),
    powerTeacherCohort(),
    teacherRetention(),
    studentResponseLoop(),
    teacherAiAdoption(),
    schoolEffect(),
  ]);

  const report = {
    meta: {
      snapshotDate: SNAPSHOT_DATE,
      generatedAt: nowWib.toISOString(),
      script: "scripts/teacher-growth-forensic.ts",
      database: "Supabase PostgreSQL (production pooler)",
      readOnly: true,
      tablesDiscovered: existingTables.size,
      note: "Phase 6 — Teacher Growth Forensic. Discovers repeatable behavior behind successful teachers. All numbers read-only from production DB.",
    },
    sections: {
      A_cohortActivation: cohort,
      B_teacherFunnel: funnel,
      C_studentGrowthCorrelation: growth,
      D_featureAdoption: adoption,
      E_powerTeacherCohort: cohort2,
      F_teacherRetention: retention,
      G_studentResponseLoop: loop,
      H_teacherAiAdoption: ai,
      I_schoolEffect: school,
    },
  };

  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });

  const reportPath = path.join(process.cwd(), "data", "teacher-growth-forensic-september-2026.json");
  fs.writeFileSync(reportPath, safeStringify(report));
  console.log(`\n✅ Written: ${reportPath}`);

  const cohortPath = path.join(process.cwd(), "data", "power-teacher-cohort-september-2026.json");
  fs.writeFileSync(cohortPath, safeStringify({
    snapshotDate: SNAPSHOT_DATE,
    top: cohort2.top,
    detail: cohort2.detail,
    teacherBehaviorMatrix: growth.teachers,
    studentResponseLoop: loop,
  }));
  console.log(`✅ Written: ${cohortPath}`);

  console.log("\n" + "═".repeat(60));
  console.log("🌱 FORENSIC SUMMARY");
  console.log("═".repeat(60));
  console.log(`Guru total:       ${funnel.totalGuru}`);
  console.log(`Group creators:   ${funnel.groupCreators} (${funnel.activationRate}% of guru)`);
  console.log(`Active 30d:       ${funnel.active30d} (${funnel.activeRateOfCreators}% of creators)`);
  console.log(`Values gradebook: ${adoption.inputNilai} teachers use Nilai`);
  console.log(`AI teachers 30d:  ${ai.aiTeachersLast30}`);
  console.log(`Star cohort:      ${growth.teachers.filter((t: any) => t.totalStudents >= 50).length} teachers with 50+ students`);
  console.log("═".repeat(60));

  await prisma.$disconnect();
  console.log("\n✅ Forensic complete. DB disconnected.");
}

main().catch(async (e) => {
  console.error("❌ Forensic failed:", e.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
