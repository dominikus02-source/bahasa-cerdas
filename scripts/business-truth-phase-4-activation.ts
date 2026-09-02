#!/usr/bin/env npx tsx
/**
 * BUSINESS TRUTH AUDIT — PHASE 4: Activation Playbook & Growth Loop
 * BahasaCerdas — September 2026
 *
 * READ-ONLY audit. Derives activation metrics, teacher journeys,
 * funnel analysis, and growth loop data from production DB.
 *
 * Usage: npx tsx scripts/business-truth-phase-4-activation.ts
 * Output: data/business-truth-phase-4-activation-september-2026.json
 */

import { PrismaClient } from "@prisma/client";
import { loadScriptEnv, requireDatabaseUrl } from "./_env.js";
import * as fs from "fs";
import * as path from "path";

// ─── Helpers ────────────────────────────────────────────────────────
function safeJson(obj: unknown): string {
  return JSON.stringify(
    obj,
    (_key, value) => (typeof value === "bigint" ? Number(value) : value),
    2
  );
}

function writeJson(filePath: string, data: unknown) {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, safeJson(data));
  console.log(`  → ${filePath}`);
}

function log(section: string, title: string) {
  console.log(`\n━━━ SECTION ${section}: ${title} ━━━`);
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Env ────────────────────────────────────────────────────────────
loadScriptEnv();

// Use DIRECT_URL (port 5432 direct connection) — pooler port 6543 may be unreachable from local
const directUrl = process.env.DIRECT_URL?.trim();
const poolerUrl = process.env.DATABASE_URL?.trim();
let dbUrl = directUrl || poolerUrl;

if (!dbUrl || !dbUrl.startsWith("postgres")) {
  console.error("No valid DATABASE_URL or DIRECT_URL found in env");
  process.exit(1);
}

// Add sslmode=require if missing (Supabase requires SSL)
const u = new URL(dbUrl);
if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
dbUrl = u.toString();

console.log(`  DB URL: ${u.hostname}:${u.port}`);

const prisma = new PrismaClient({
  log: ["error"],
  datasources: { db: { url: dbUrl } },
});

const CUT_OFF = new Date("2026-09-01T23:59:59+07:00");

async function main() {
  console.log("=== PHASE 4: Activation Playbook & Growth Loop ===");
  console.log(`Cut-off: ${CUT_OFF.toISOString()}\n`);

  // ──────────────────────────────────────────────────────────
  // §1. TEACHER ACTIVATION FUNNEL
  // ──────────────────────────────────────────────────────────
  log("1", "TEACHER ACTIVATION FUNNEL");

  const totalTeachers = await prisma.user.count({ where: { role: "GURU" } });
  console.log(`  Total teachers: ${totalTeachers}`);

  // Classify teachers by their class/student status
  const neverCreatedClass = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT u."id", u."email", u."createdAt", p."school", u."fullName"
     FROM "User" u
     LEFT JOIN "Profile" p ON p."userId" = u."id"
     WHERE u."role" = 'GURU'
       AND u."createdAt" <= $1
       AND NOT EXISTS (SELECT 1 FROM "Group" g WHERE g."teacherId" = u."id")`,
    CUT_OFF
  );
  console.log(`  Never created class: ${neverCreatedClass.length}`);

  const createdClassNoStudents = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT u."id", u."email", u."createdAt" AS "signupDate",
            g."id" AS "classId", g."createdAt" AS "classCreatedAt", g."name" AS "className"
     FROM "User" u
     JOIN "Group" g ON g."teacherId" = u."id"
     WHERE u."role" = 'GURU'
       AND g."createdAt" <= $1
       AND NOT EXISTS (SELECT 1 FROM "GroupMember" gm WHERE gm."groupId" = g."id")`,
    CUT_OFF
  );
  console.log(`  Created class, 0 students: ${createdClassNoStudents.length}`);

  const createdClassWithStudents = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT u."id", u."email", u."createdAt" AS "signupDate",
            g."id" AS "classId", g."createdAt" AS "classCreatedAt", g."name" AS "className",
            (SELECT COUNT(*)::int FROM "GroupMember" gm WHERE gm."groupId" = g."id") AS "studentCount"
     FROM "User" u
     JOIN "Group" g ON g."teacherId" = u."id"
     WHERE u."role" = 'GURU'
       AND g."createdAt" <= $1
       AND EXISTS (SELECT 1 FROM "GroupMember" gm WHERE gm."groupId" = g."id")`,
    CUT_OFF
  );
  console.log(`  Created class, has students: ${createdClassWithStudents.length}`);

  const funnel = {
    total: totalTeachers,
    neverCreatedClass: neverCreatedClass.length,
    createdClassNoStudents: createdClassNoStudents.length,
    createdClassWithStudents: createdClassWithStudents.length,
    neverCreatedClassPct: totalTeachers > 0 ? (neverCreatedClass.length / totalTeachers * 100).toFixed(1) : "0",
    createdClassNoStudentsPct: totalTeachers > 0 ? (createdClassNoStudents.length / totalTeachers * 100).toFixed(1) : "0",
    createdClassWithStudentsPct: totalTeachers > 0 ? (createdClassWithStudents.length / totalTeachers * 100).toFixed(1) : "0",
  };

  console.log(`\n  Funnel summary:`);
  console.log(`    Never created class: ${funnel.neverCreatedClass} (${funnel.neverCreatedClassPct}%)`);
  console.log(`    Class, no students: ${funnel.createdClassNoStudents} (${funnel.createdClassNoStudentsPct}%)`);
  console.log(`    Class, has students: ${funnel.createdClassWithStudents} (${funnel.createdClassWithStudentsPct}%)`);

  // ──────────────────────────────────────────────────────────
  // §2. ACTIVATION THRESHOLDS
  // ──────────────────────────────────────────────────────────
  log("2", "ACTIVATION THRESHOLDS");

  const thresholds = [
    { label: "created_class", sql: `SELECT COUNT(DISTINCT u."id")::int AS cnt FROM "User" u JOIN "Group" g ON g."teacherId" = u."id" WHERE u."role" = 'GURU' AND g."createdAt" <= $1` },
    { label: "1_student", sql: `SELECT COUNT(DISTINCT g."teacherId")::int AS cnt FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."teacherId" HAVING COUNT(gm."id") >= 1` },
    { label: "3_students", sql: `SELECT COUNT(*)::int AS cnt FROM (SELECT g."teacherId" FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."teacherId" HAVING COUNT(gm."id") >= 3) sub` },
    { label: "5_students", sql: `SELECT COUNT(*)::int AS cnt FROM (SELECT g."teacherId" FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."teacherId" HAVING COUNT(gm."id") >= 5) sub` },
    { label: "10_students", sql: `SELECT COUNT(*)::int AS cnt FROM (SELECT g."teacherId" FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."teacherId" HAVING COUNT(gm."id") >= 10) sub` },
    { label: "25_students", sql: `SELECT COUNT(*)::int AS cnt FROM (SELECT g."teacherId" FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."teacherId" HAVING COUNT(gm."id") >= 25) sub` },
    { label: "50_students", sql: `SELECT COUNT(*)::int AS cnt FROM (SELECT g."teacherId" FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."teacherId" HAVING COUNT(gm."id") >= 50) sub` },
  ];

  const thresholdResults: { label: string; count: number }[] = [];
  for (const t of thresholds) {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(t.sql, CUT_OFF);
    const count = rows && rows.length > 0 ? num((rows[0] as Record<string, unknown>).cnt) : 0;
    thresholdResults.push({ label: t.label, count });
    console.log(`  ${t.label}: ${count}`);
  }

  // ──────────────────────────────────────────────────────────
  // §3. TEACHER JOURNEY TIMING
  // ──────────────────────────────────────────────────────────
  log("3", "TEACHER JOURNEY TIMING");

  // Top 20 teachers by composite score (activation + engagement + impact)
  const topTeachers = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH teacher_classes AS (
       SELECT g."teacherId",
              COUNT(DISTINCT g."id")::int AS "classCount",
              COUNT(gm."id")::int AS "studentCount",
              MIN(g."createdAt") AS "firstClassAt"
       FROM "Group" g
       LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
       WHERE g."createdAt" <= $1
       GROUP BY g."teacherId"
     ),
     teacher_students AS (
       SELECT DISTINCT g."teacherId", gm."userId" AS "studentId"
       FROM "Group" g
       JOIN "GroupMember" gm ON gm."groupId" = g."id"
       WHERE g."createdAt" <= $1
     ),
     teacher_learning AS (
       SELECT ts."teacherId",
              COUNT(uup."id")::int AS "learningEvents",
              COUNT(DISTINCT uup."userId")::int AS "activeStudents",
              MIN(uup."createdAt") AS "firstLearningAt"
       FROM teacher_students ts
       JOIN "UserUnitProgress" uup ON uup."userId" = ts."studentId"
       WHERE uup."createdAt" <= $1
       GROUP BY ts."teacherId"
     ),
     teacher_ai AS (
       SELECT au."userId" AS "teacherId", COUNT(au."id")::int AS "aiUsage"
       FROM "AIUsage" au
       WHERE au."createdAt" <= $1
       GROUP BY au."userId"
     )
     SELECT u."id", u."email", u."fullName", p."school", u."createdAt" AS "signupDate",
            tc."classCount", tc."studentCount", tc."firstClassAt",
            COALESCE(tl."learningEvents", 0) AS "learningEvents",
            COALESCE(tl."activeStudents", 0) AS "activeStudents",
            tl."firstLearningAt",
            COALESCE(ta."aiUsage", 0) AS "aiUsage",
            -- Composite score: activation(40%) + engagement(30%) + impact(30%)
            (
              (CASE WHEN tc."classCount" > 0 THEN 20 ELSE 0 END)
              + (tc."studentCount" * 3)
              + (COALESCE(tl."activeStudents", 0) * 5)
              + (COALESCE(ta."aiUsage", 0) * 2)
              + (COALESCE(tl."learningEvents", 0) * 2)
            )::int AS "score"
     FROM "User" u
     LEFT JOIN teacher_classes tc ON tc."teacherId" = u."id"
     LEFT JOIN teacher_learning tl ON tl."teacherId" = u."id"
     LEFT JOIN teacher_ai ta ON ta."teacherId" = u."id"
     LEFT JOIN "Profile" p ON p."userId" = u."id"
     WHERE u."role" = 'GURU'
       AND u."createdAt" <= $1
       AND tc."studentCount" > 0
     ORDER BY "score" DESC
     LIMIT 20`,
    CUT_OFF
  );

  console.log(`  Top 20 teachers traced:`);
  for (const t of topTeachers) {
    const daysToClass = (t.signupDate && t.firstClassAt)
      ? daysBetween(t.signupDate as Date, t.firstClassAt as Date) : null;
    console.log(`    ${t.email}: score=${t.score}, students=${t.studentCount}, classes=${t.classCount}, learning=${t.learningEvents}, AI=${t.aiUsage}, daysToClass=${daysToClass}`);
  }

  // ──────────────────────────────────────────────────────────
  // §4. TIMING: SIGNUP → CLASS → FIRST STUDENT → FIRST LEARNING
  // ──────────────────────────────────────────────────────────
  log("4", "TIME TO MILESTONE");

  const timingMilestones = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH teacher_firsts AS (
       SELECT u."id" AS "teacherId",
              u."createdAt" AS "signupAt",
              (SELECT MIN(g."createdAt") FROM "Group" g WHERE g."teacherId" = u."id" AND g."createdAt" <= $1) AS "firstClassAt",
              (SELECT MIN(gm."joinedAt") FROM "GroupMember" gm JOIN "Group" g ON g."id" = gm."groupId" WHERE g."teacherId" = u."id" AND gm."joinedAt" <= $1) AS "firstStudentAt",
              (SELECT MIN(uup."createdAt") FROM "UserUnitProgress" uup JOIN "GroupMember" gm2 ON gm2."userId" = uup."userId" JOIN "Group" g2 ON g2."id" = gm2."groupId" WHERE g2."teacherId" = u."id" AND uup."createdAt" <= $1) AS "firstLearningAt"
       FROM "User" u
       WHERE u."role" = 'GURU' AND u."createdAt" <= $1
     )
     SELECT
       COUNT(CASE WHEN "firstClassAt" IS NOT NULL THEN 1 END)::int AS "reachedClass",
       COUNT(CASE WHEN "firstStudentAt" IS NOT NULL THEN 1 END)::int AS "reachedStudent",
       COUNT(CASE WHEN "firstLearningAt" IS NOT NULL THEN 1 END)::int AS "reachedLearning",
       AVG(CASE WHEN "firstClassAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("firstClassAt" - "signupAt")) / 86400 END) AS "avgDaysSignupToClass",
       AVG(CASE WHEN "firstStudentAt" IS NOT NULL AND "firstClassAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("firstStudentAt" - "firstClassAt")) / 86400 END) AS "avgDaysClassToStudent",
       AVG(CASE WHEN "firstLearningAt" IS NOT NULL AND "firstStudentAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("firstLearningAt" - "firstStudentAt")) / 86400 END) AS "avgDaysStudentToLearn",
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("firstClassAt" - "signupAt")) / 86400) FILTER (WHERE "firstClassAt" IS NOT NULL) AS "medianDaysSignupToClass",
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("firstStudentAt" - "firstClassAt")) / 86400) FILTER (WHERE "firstStudentAt" IS NOT NULL AND "firstClassAt" IS NOT NULL) AS "medianDaysClassToStudent",
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("firstLearningAt" - "firstStudentAt")) / 86400) FILTER (WHERE "firstLearningAt" IS NOT NULL AND "firstStudentAt" IS NOT NULL) AS "medianDaysStudentToLearn"
     FROM teacher_firsts`,
    CUT_OFF
  );

  const timing = timingMilestones[0] ?? {};
  console.log(`  Reached class: ${timing.reachedClass}`);
  console.log(`  Reached student: ${timing.reachedStudent}`);
  console.log(`  Reached learning: ${timing.reachedLearning}`);
  console.log(`  Avg days: signup→class=${num(timing.avgDaysSignupToClass).toFixed(1)}, class→student=${num(timing.avgDaysClassToStudent).toFixed(1)}, student→learn=${num(timing.avgDaysStudentToLearn).toFixed(1)}`);
  console.log(`  Median days: signup→class=${num(timing.medianDaysSignupToClass).toFixed(1)}, class→student=${num(timing.medianDaysClassToStudent).toFixed(1)}, student→learn=${num(timing.medianDaysStudentToLearn).toFixed(1)}`);

  // ──────────────────────────────────────────────────────────
  // §5. THE 3-STUDENT THRESHOLD
  // ──────────────────────────────────────────────────────────
  log("5", "THE 3-STUDENT THRESHOLD");

  const teacherRetentionByThreshold = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH teacher_students AS (
       SELECT g."teacherId", COUNT(gm."id")::int AS "totalStudents"
       FROM "Group" g
       JOIN "GroupMember" gm ON gm."groupId" = g."id"
       WHERE g."createdAt" <= $1
       GROUP BY g."teacherId"
     ),
     teacher_active_7d AS (
       SELECT DISTINCT "id" FROM "User"
       WHERE "role" = 'GURU' AND "lastActiveAt" >= ($1::timestamp - INTERVAL '7 days')
     ),
     bucketed AS (
       SELECT ts."teacherId",
              CASE
                WHEN ts."totalStudents" BETWEEN 1 AND 2 THEN '1-2'
                WHEN ts."totalStudents" BETWEEN 3 AND 5 THEN '3-5'
                WHEN ts."totalStudents" BETWEEN 6 AND 10 THEN '6-10'
                WHEN ts."totalStudents" BETWEEN 11 AND 25 THEN '11-25'
                WHEN ts."totalStudents" BETWEEN 26 AND 50 THEN '26-50'
                WHEN ts."totalStudents" > 50 THEN '50+'
                ELSE '0'
              END AS "bucket"
       FROM teacher_students ts
     )
     SELECT b."bucket",
            COUNT(*)::int AS "teachers",
            COUNT(CASE WHEN EXISTS (SELECT 1 FROM teacher_active_7d a WHERE a."id" = b."teacherId") THEN 1 END)::int AS "active7d"
     FROM bucketed b
     GROUP BY b."bucket"
     ORDER BY
       CASE b."bucket"
         WHEN '0' THEN 0 WHEN '1-2' THEN 1 WHEN '3-5' THEN 2
         WHEN '6-10' THEN 3 WHEN '11-25' THEN 4 WHEN '26-50' THEN 5 ELSE 6
       END`,
    CUT_OFF
  );

  console.log(`  Teacher retention by student count:`);
  for (const row of teacherRetentionByThreshold) {
    const active7d = num(row.active7d);
    const teachers = num(row.teachers);
    const rate = teachers > 0 ? (active7d / teachers * 100).toFixed(1) : "0";
    console.log(`    ${row.bucket} students: ${teachers} teachers, ${active7d} active 7d (${rate}%)`);
  }

  // ──────────────────────────────────────────────────────────
  // §6. STUDENT RETENTION BY SOURCE
  // ──────────────────────────────────────────────────────────
  log("6", "STUDENT RETENTION BY SOURCE");

  const retentionBySource = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH student_source AS (
       SELECT u."id" AS "studentId",
              CASE WHEN EXISTS (SELECT 1 FROM "GroupMember" gm JOIN "Group" g ON g."id" = gm."groupId" WHERE gm."userId" = u."id") THEN 'school-linked' ELSE 'self-registered' END AS "source"
       FROM "User" u
       WHERE u."role" = 'MURID' AND u."createdAt" <= $1
     ),
     student_d30 AS (
       SELECT DISTINCT uup."userId"
       FROM "UserUnitProgress" uup
       WHERE uup."createdAt" >= ($1::timestamp - INTERVAL '30 days')
     )
     SELECT ss."source",
            COUNT(*)::int AS "total",
            COUNT(CASE WHEN EXISTS (SELECT 1 FROM student_d30 sd WHERE sd."userId" = ss."studentId") THEN 1 END)::int AS "activeD30"
     FROM student_source ss
     GROUP BY ss."source"`,
    CUT_OFF
  );

  console.log(`  Student retention by source:`);
  for (const row of retentionBySource) {
    const total = num(row.total);
    const active = num(row.activeD30);
    const rate = total > 0 ? (active / total * 100).toFixed(1) : "0";
    console.log(`    ${row.source}: ${active}/${total} = ${rate}%`);
  }

  // ──────────────────────────────────────────────────────────
  // §7. AHA MOMENT CANDIDATES
  // ──────────────────────────────────────────────────────────
  log("7", "AHA MOMENT CANDIDATES");

  // Teachers who created a class in first 7 days
  const firstWeekClass = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COUNT(*)::int AS cnt FROM (
       SELECT u."id",
               (SELECT MIN(g."createdAt") FROM "Group" g WHERE g."teacherId" = u."id") AS "firstClassAt"
       FROM "User" u
       WHERE u."role" = 'GURU' AND u."createdAt" <= $1
     ) sub
     WHERE sub."firstClassAt" IS NOT NULL
       AND EXTRACT(EPOCH FROM (sub."firstClassAt" - (SELECT "createdAt" FROM "User" WHERE "id" = sub."id")) / 86400) <= 7`,
    CUT_OFF
  );
  console.log(`  Teachers who created class in first 7 days: ${num(firstWeekClass[0]?.cnt)}`);

  // Teachers who got 1+ student in first 14 days
  const firstWeekStudent = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COUNT(*)::int AS cnt FROM (
       SELECT u."id",
               (SELECT MIN(gm."joinedAt") FROM "GroupMember" gm JOIN "Group" g ON g."id" = gm."groupId" WHERE g."teacherId" = u."id") AS "firstStudentAt"
       FROM "User" u
       WHERE u."role" = 'GURU' AND u."createdAt" <= $1
     ) sub
     WHERE sub."firstStudentAt" IS NOT NULL
       AND EXTRACT(EPOCH FROM (sub."firstStudentAt" - (SELECT "createdAt" FROM "User" WHERE "id" = sub."id")) / 86400) <= 14`,
    CUT_OFF
  );
  console.log(`  Teachers who got 1+ student in first 14 days: ${num(firstWeekStudent[0]?.cnt)}`);

  // Retention: first-week-class teachers vs never-class teachers
  const retentionComparison = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH teacher_first_class AS (
       SELECT u."id" AS "teacherId", u."createdAt" AS "signupAt",
              (SELECT MIN(g."createdAt") FROM "Group" g WHERE g."teacherId" = u."id") AS "firstClassAt"
       FROM "User" u
       WHERE u."role" = 'GURU' AND u."createdAt" <= $1
     ),
     teacher_active_30d AS (
       SELECT DISTINCT "id" FROM "User"
       WHERE "role" = 'GURU' AND "lastActiveAt" >= ($1::timestamp - INTERVAL '30 days')
     )
     SELECT
       CASE
         WHEN "firstClassAt" IS NULL THEN 'never_class'
         WHEN EXTRACT(EPOCH FROM ("firstClassAt" - "signupAt") / 86400) <= 7 THEN 'first_week_class'
         ELSE 'later_class'
       END AS "cohort",
       COUNT(*)::int AS "teachers",
       COUNT(CASE WHEN EXISTS (SELECT 1 FROM teacher_active_30d a WHERE a."id" = t."teacherId") THEN 1 END)::int AS "active30d"
     FROM teacher_first_class t
     GROUP BY "cohort"`,
    CUT_OFF
  );

  console.log(`  Retention comparison (30d):`);
  for (const row of retentionComparison) {
    const teachers = num(row.teachers);
    const active = num(row.active30d);
    const rate = teachers > 0 ? (active / teachers * 100).toFixed(1) : "0";
    console.log(`    ${row.cohort}: ${teachers} teachers, ${active} active 30d (${rate}%)`);
  }

  // ──────────────────────────────────────────────────────────
  // §8. CLASS SIZE DISTRIBUTION
  // ──────────────────────────────────────────────────────────
  log("8", "CLASS SIZE DISTRIBUTION");

  const classSizeData = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT
       COUNT(*)::int AS "total",
       (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub."cnt") FROM (SELECT COUNT(gm."id")::int AS cnt FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."id") sub) AS "median",
       (SELECT AVG(sub."cnt") FROM (SELECT COUNT(gm."id")::int AS cnt FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."id") sub) AS "mean",
       (SELECT MIN(sub."cnt") FROM (SELECT COUNT(gm."id")::int AS cnt FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."id") sub) AS "min",
       (SELECT MAX(sub."cnt") FROM (SELECT COUNT(gm."id")::int AS cnt FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."id") sub) AS "max"
     FROM "Group" g WHERE g."createdAt" <= $1`,
    CUT_OFF
  );

  const classSizeHistogram = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT
       COUNT(CASE WHEN sub."cnt" = 0 THEN 1 END)::int AS "0",
       COUNT(CASE WHEN sub."cnt" BETWEEN 1 AND 5 THEN 1 END)::int AS "1-5",
       COUNT(CASE WHEN sub."cnt" BETWEEN 6 AND 10 THEN 1 END)::int AS "6-10",
       COUNT(CASE WHEN sub."cnt" BETWEEN 11 AND 25 THEN 1 END)::int AS "11-25",
       COUNT(CASE WHEN sub."cnt" BETWEEN 26 AND 50 THEN 1 END)::int AS "26-50",
       COUNT(CASE WHEN sub."cnt" BETWEEN 51 AND 100 THEN 1 END)::int AS "51-100",
       COUNT(CASE WHEN sub."cnt" > 100 THEN 1 END)::int AS "100+"
     FROM (SELECT COUNT(gm."id")::int AS cnt FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g."id" WHERE g."createdAt" <= $1 GROUP BY g."id") sub`,
    CUT_OFF
  );

  console.log(`  Classes total: ${num(classSizeData[0]?.total)}`);
  console.log(`  Class size: median=${num(classSizeData[0]?.median)}, mean=${num(classSizeData[0]?.mean).toFixed(1)}, min=${num(classSizeData[0]?.min)}, max=${num(classSizeData[0]?.max)}`);
  console.log(`  Histogram:`, classSizeHistogram[0] ?? {});

  // ──────────────────────────────────────────────────────────
  // §9. SCHOOL ACTIVATION
  // ──────────────────────────────────────────────────────────
  log("9", "SCHOOL ACTIVATION");

  const schoolClusters = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH school_teachers AS (
       SELECT LOWER(TRIM(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''))) AS "schoolKey",
              u."id" AS "teacherId"
       FROM "User" u
       JOIN "Profile" p ON p."userId" = u."id"
       WHERE u."role" = 'GURU' AND p."school" IS NOT NULL AND p."school" != '' AND u."createdAt" <= $1
     ),
     school_students AS (
       SELECT LOWER(TRIM(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''))) AS "schoolKey",
              u."id" AS "studentId"
       FROM "User" u
       JOIN "Profile" p ON p."userId" = u."id"
       WHERE u."role" = 'MURID' AND p."school" IS NOT NULL AND p."school" != '' AND u."createdAt" <= $1
     )
     SELECT COALESCE(st."schoolKey", ss."schoolKey") AS "schoolKey",
            COUNT(DISTINCT st."teacherId")::int AS "teachers",
            COUNT(DISTINCT ss."studentId")::int AS "students"
     FROM school_teachers st
     FULL OUTER JOIN school_students ss ON ss."schoolKey" = st."schoolKey"
     WHERE COALESCE(st."schoolKey", ss."schoolKey") IS NOT NULL
       AND COALESCE(st."schoolKey", ss."schoolKey") != ''
     GROUP BY COALESCE(st."schoolKey", ss."schoolKey")
     HAVING COUNT(DISTINCT st."teacherId") + COUNT(DISTINCT ss."studentId") >= 2
     ORDER BY (COUNT(DISTINCT st."teacherId") + COUNT(DISTINCT ss."studentId")) DESC
     LIMIT 20`,
    CUT_OFF
  );

  const totalSchoolsWith2Plus = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COUNT(*)::int AS cnt FROM (
       SELECT LOWER(TRIM(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''))) AS "schoolKey"
       FROM "User" u
       JOIN "Profile" p ON p."userId" = u."id"
       WHERE (u."role" = 'GURU' OR u."role" = 'MURID')
         AND p."school" IS NOT NULL AND p."school" != ''
         AND u."createdAt" <= $1
       GROUP BY "schoolKey"
       HAVING COUNT(*)::int >= 2
     ) sub`,
    CUT_OFF
  );

  const totalSchoolsWith5Plus = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COUNT(*)::int AS cnt FROM (
       SELECT LOWER(TRIM(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''))) AS "schoolKey"
       FROM "User" u
       JOIN "Profile" p ON p."userId" = u."id"
       WHERE (u."role" = 'GURU' OR u."role" = 'MURID')
         AND p."school" IS NOT NULL AND p."school" != ''
         AND u."createdAt" <= $1
       GROUP BY "schoolKey"
       HAVING COUNT(*)::int >= 5
     ) sub`,
    CUT_OFF
  );

  const totalSchoolsWith10Plus = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COUNT(*)::int AS cnt FROM (
       SELECT LOWER(TRIM(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''))) AS "schoolKey"
       FROM "User" u
       JOIN "Profile" p ON p."userId" = u."id"
       WHERE (u."role" = 'GURU' OR u."role" = 'MURID')
         AND p."school" IS NOT NULL AND p."school" != ''
         AND u."createdAt" <= $1
       GROUP BY "schoolKey"
       HAVING COUNT(*)::int >= 10
     ) sub`,
    CUT_OFF
  );

  console.log(`  Schools (2+ users): ${num(totalSchoolsWith2Plus[0]?.cnt)}`);
  console.log(`  Schools (5+ users): ${num(totalSchoolsWith5Plus[0]?.cnt)}`);
  console.log(`  Schools (10+ users): ${num(totalSchoolsWith10Plus[0]?.cnt)}`);
  console.log(`  Top 20 school clusters:`);
  for (const s of schoolClusters.slice(0, 10)) {
    console.log(`    ${s.schoolKey}: ${s.teachers} teachers, ${s.students} students`);
  }

  // ──────────────────────────────────────────────────────────
  // §10. GROWTH LOOP METRICS
  // ──────────────────────────────────────────────────────────
  log("10", "GROWTH LOOP METRICS");

  const last7d = new Date(CUT_OFF.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(CUT_OFF.getTime() - 30 * 24 * 60 * 60 * 1000);

  const teacherActive7d = await prisma.user.count({ where: { role: "GURU", lastActiveAt: { gte: last7d } } });
  const teacherActive30d = await prisma.user.count({ where: { role: "GURU", lastActiveAt: { gte: last30d } } });

  // Teacher → student invitation chain
  const teacherInviteChain = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT
       COUNT(DISTINCT g."teacherId")::int AS "teachersWhoInvited",
       COUNT(DISTINCT gm."userId")::int AS "studentsInvited",
       AVG(sub."studentCount")::int AS "avgStudentsPerTeacher"
     FROM "Group" g
     JOIN "GroupMember" gm ON gm."groupId" = g."id"
     JOIN (
       SELECT g2."teacherId", COUNT(gm2."id")::int AS "studentCount"
       FROM "Group" g2
       JOIN "GroupMember" gm2 ON gm2."groupId" = g2."id"
       WHERE g2."createdAt" <= $1
       GROUP BY g2."teacherId"
     ) sub ON sub."teacherId" = g."teacherId"
     WHERE g."createdAt" <= $1`,
    CUT_OFF
  );

  const invite = teacherInviteChain[0] ?? {};
  console.log(`  Teachers who invited students: ${num(invite.teachersWhoInvited)}`);
  console.log(`  Students invited: ${num(invite.studentsInvited)}`);
  console.log(`  Avg students per teacher: ${num(invite.avgStudentsPerTeacher)}`);
  console.log(`  Teachers active 7d: ${teacherActive7d} (${(teacherActive7d / totalTeachers * 100).toFixed(1)}%)`);
  console.log(`  Teachers active 30d: ${teacherActive30d} (${(teacherActive30d / totalTeachers * 100).toFixed(1)}%)`);

  // ──────────────────────────────────────────────────────────
  // §11. ONBOARDING GAP
  // ──────────────────────────────────────────────────────────
  log("11", "ONBOARDING GAP");

  const teachersNeverActive = await prisma.user.count({ where: { role: "GURU", lastActiveAt: null } });
  const teachersActiveButNoClass = createdClassNoStudents.length;
  const teachersWithLearning = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COUNT(DISTINCT g."teacherId")::int AS cnt
     FROM "Group" g
     JOIN "GroupMember" gm ON gm."groupId" = g."id"
     JOIN "UserUnitProgress" uup ON uup."userId" = gm."userId"
     WHERE g."createdAt" <= $1 AND uup."createdAt" <= $1`,
    CUT_OFF
  );

  const teachersWithAI = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COUNT(DISTINCT au."userId")::int AS cnt
     FROM "AIUsage" au
     JOIN "User" u ON u."id" = au."userId"
     WHERE u."role" = 'GURU' AND au."createdAt" <= $1`,
    CUT_OFF
  );

  const onboardingGap = {
    teachersNeverActive,
    teachersActiveButNoClass,
    teachersWithStudents: createdClassWithStudents.length,
    teachersWithLearning: num(teachersWithLearning[0]?.cnt),
    teachersWithAI: num(teachersWithAI[0]?.cnt),
  };

  console.log(`  Never active: ${onboardingGap.teachersNeverActive}`);
  console.log(`  Active but no class: ${onboardingGap.teachersActiveButNoClass}`);
  console.log(`  Has students: ${onboardingGap.teachersWithStudents}`);
  console.log(`  Has learning: ${onboardingGap.teachersWithLearning}`);
  console.log(`  Has AI usage: ${onboardingGap.teachersWithAI}`);

  // ──────────────────────────────────────────────────────────
  // §12. STUDENT FIRST-ACTION PATHS
  // ──────────────────────────────────────────────────────────
  log("12", "STUDENT FIRST-ACTION PATHS");

  const studentFirstAction = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH student_firsts AS (
       SELECT u."id" AS "studentId", u."createdAt",
              (SELECT MIN(uup."createdAt") FROM "UserUnitProgress" uup WHERE uup."userId" = u."id") AS "firstLearning",
              (SELECT MIN(sk."createdAt") FROM "StudentKarya" sk WHERE sk."userId" = u."id") AS "firstKarya",
              (SELECT MIN(au."createdAt") FROM "AIUsage" au WHERE au."userId" = u."id") AS "firstAI"
       FROM "User" u
       WHERE u."role" = 'MURID' AND u."createdAt" <= $1
     )
     SELECT
       CASE
         WHEN "firstLearning" IS NULL AND "firstKarya" IS NULL AND "firstAI" IS NULL THEN 'never_active'
         WHEN "firstLearning" IS NOT NULL AND ("firstKarya" IS NULL OR "firstLearning" <= "firstKarya") AND ("firstAI" IS NULL OR "firstLearning" <= "firstAI") THEN 'learn_first'
         WHEN "firstKarya" IS NOT NULL AND ("firstLearning" IS NULL OR "firstKarya" < "firstLearning") THEN 'karya_first'
         WHEN "firstAI" IS NOT NULL AND ("firstLearning" IS NULL OR "firstAI" < "firstLearning") AND ("firstKarya" IS NULL OR "firstAI" < "firstKarya") THEN 'ai_first'
         ELSE 'mixed'
       END AS "firstAction",
       COUNT(*)::int AS "students"
     FROM student_firsts
     GROUP BY "firstAction"`,
    CUT_OFF
  );

  console.log(`  Student first-action paths:`);
  for (const row of studentFirstAction) {
    console.log(`    ${row.firstAction}: ${row.students}`);
  }

  // ──────────────────────────────────────────────────────────
  // §13. POWER TEACHER COMPARISON
  // ──────────────────────────────────────────────────────────
  log("13", "POWER TEACHER vs FAILED TEACHER");

  const powerVsFailed = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH teacher_metrics AS (
       SELECT u."id", u."email", u."createdAt",
              (SELECT COUNT(DISTINCT g."id")::int FROM "Group" g WHERE g."teacherId" = u."id" AND g."createdAt" <= $1) AS "classes",
              (SELECT COUNT(gm."id")::int FROM "GroupMember" gm JOIN "Group" g ON g."id" = gm."groupId" WHERE g."teacherId" = u."id" AND g."createdAt" <= $1) AS "students",
              (SELECT COUNT(uup."id")::int FROM "UserUnitProgress" uup JOIN "GroupMember" gm ON gm."userId" = uup."userId" JOIN "Group" g ON g."id" = gm."groupId" WHERE g."teacherId" = u."id" AND uup."createdAt" <= $1) AS "studentLearning",
              (SELECT COUNT(au."id")::int FROM "AIUsage" au WHERE au."userId" = u."id" AND au."createdAt" <= $1) AS "aiUsage"
       FROM "User" u WHERE u."role" = 'GURU' AND u."createdAt" <= $1
     )
     SELECT
       CASE WHEN "students" >= 10 THEN 'power' WHEN "students" = 0 AND "classes" = 0 THEN 'never_started' WHEN "students" = 0 THEN 'class_no_students' ELSE 'other' END AS "tier",
       COUNT(*)::int AS "teachers",
       AVG("classes")::int AS "avgClasses",
       AVG("students")::int AS "avgStudents",
       AVG("studentLearning")::int AS "avgStudentLearning",
       AVG("aiUsage")::int AS "avgAIUsage"
     FROM teacher_metrics
     GROUP BY "tier"
     ORDER BY "avgStudents" DESC`,
    CUT_OFF
  );

  console.log(`  Power vs Failed teacher tiers:`);
  for (const row of powerVsFailed) {
    console.log(`    ${row.tier}: ${row.teachers} teachers, avg classes=${row.avgClasses}, avg students=${row.avgStudents}, avg learning=${row.avgStudentLearning}, avg AI=${row.avgAIUsage}`);
  }

  // ──────────────────────────────────────────────────────────
  // §14. WEEKLY SIGNUP TREND
  // ──────────────────────────────────────────────────────────
  log("14", "WEEKLY SIGNUP TREND");

  const weeklySignups = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT TO_CHAR(DATE_TRUNC('week', u."createdAt" AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS "week",
            COUNT(*)::int AS "total",
            COUNT(CASE WHEN u."role" = 'GURU' THEN 1 END)::int AS "teachers",
            COUNT(CASE WHEN u."role" = 'MURID' THEN 1 END)::int AS "students"
     FROM "User" u
     WHERE u."createdAt" >= ($1::timestamp - INTERVAL '90 days') AND u."createdAt" <= $1
     GROUP BY DATE_TRUNC('week', u."createdAt" AT TIME ZONE 'Asia/Jakarta')
     ORDER BY "week" DESC`,
    CUT_OFF
  );

  console.log(`  Weekly signup trend (last 12 weeks):`);
  for (const w of weeklySignups.slice(0, 12)) {
    console.log(`    ${w.week}: ${w.total} total (${w.teachers} teachers, ${w.students} students)`);
  }

  // ──────────────────────────────────────────────────────────
  // §15. FREE → PAID CONVERSION
  // ──────────────────────────────────────────────────────────
  log("15", "FREE → PAID CONVERSION");

  const premiumTeachers = await prisma.user.findMany({
    where: { role: "GURU", isPremium: true },
    select: {
      id: true, email: true, isPremium: true, premiumPlan: true,
      premiumUntil: true, createdAt: true,
      _count: { select: { groups: true } },
    },
  });

  console.log(`  Premium teachers: ${premiumTeachers.length}`);
  for (const t of premiumTeachers) {
    console.log(`    ${t.email}: plan=${t.premiumPlan}, until=${t.premiumUntil}, classes=${t._count.groups}`);
  }

  // ──────────────────────────────────────────────────────────
  // §16. STUDENT ENGAGEMENT DEPTH
  // ──────────────────────────────────────────────────────────
  log("16", "STUDENT ENGAGEMENT DEPTH");

  const studentEngagement = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH student_metrics AS (
       SELECT u."id",
              COUNT(DISTINCT uup."unitId")::int AS "unitsCompleted",
              COUNT(uup."id")::int AS "totalProgress",
              MAX(uup."createdAt") AS "lastActivity"
       FROM "User" u
       LEFT JOIN "UserUnitProgress" uup ON uup."userId" = u."id"
       WHERE u."role" = 'MURID' AND u."createdAt" <= $1
       GROUP BY u."id"
     ),
     bucketed AS (
       SELECT sm."id", sm."lastActivity",
              CASE
                WHEN sm."unitsCompleted" BETWEEN 1 AND 3 THEN '1-3_units'
                WHEN sm."unitsCompleted" BETWEEN 4 AND 10 THEN '4-10_units'
                WHEN sm."unitsCompleted" BETWEEN 11 AND 25 THEN '11-25_units'
                WHEN sm."unitsCompleted" > 25 THEN '25+_units'
                ELSE '0_units'
              END AS "bucket"
       FROM student_metrics sm
     )
     SELECT b."bucket",
            COUNT(*)::int AS "students",
            COUNT(CASE WHEN b."lastActivity" >= ($1::timestamp - INTERVAL '30 days') THEN 1 END)::int AS "activeD30"
     FROM bucketed b
     GROUP BY b."bucket"
     ORDER BY
       CASE b."bucket"
         WHEN '0_units' THEN 0 WHEN '1-3_units' THEN 1 WHEN '4-10_units' THEN 2
         WHEN '11-25_units' THEN 3 ELSE 4
       END`,
    CUT_OFF
  );

  console.log(`  Student engagement depth:`);
  for (const row of studentEngagement) {
    const total = num(row.students);
    const active = num(row.activeD30);
    const rate = total > 0 ? (active / total * 100).toFixed(1) : "0";
    console.log(`    ${row.bucket}: ${total} students, ${active} active D30 (${rate}%)`);
  }

  // ──────────────────────────────────────────────────────────
  // ASSEMBLE OUTPUT
  // ──────────────────────────────────────────────────────────
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      cutOff: CUT_OFF.toISOString(),
      method: "READ-ONLY production audit via raw SQL",
      totalTeachers,
      totalStudents: num(await prisma.$queryRawUnsafe<unknown[]>(
        `SELECT COUNT(*)::int AS cnt FROM "User" WHERE "role" = 'MURID' AND "createdAt" <= $1`, CUT_OFF
      ).then(r => (r[0] as Record<string,unknown>).cnt)),
    },
    funnel,
    activationThresholds: thresholdResults,
    topTeachers: topTeachers.map(t => ({
      email: t.email, fullName: t.fullName, school: t.school,
      classCount: num(t.classCount), studentCount: num(t.studentCount),
      learningEvents: num(t.learningEvents), activeStudents: num(t.activeStudents),
      aiUsage: num(t.aiUsage), score: num(t.score),
      daysSignupToClass: (t.signupDate && t.firstClassAt) ? daysBetween(t.signupDate as Date, t.firstClassAt as Date) : null,
    })),
    timing: {
      reachedClass: num(timing.reachedClass),
      reachedStudent: num(timing.reachedStudent),
      reachedLearning: num(timing.reachedLearning),
      avgDaysSignupToClass: num(timing.avgDaysSignupToClass).toFixed(1),
      avgDaysClassToStudent: num(timing.avgDaysClassToStudent).toFixed(1),
      avgDaysStudentToLearn: num(timing.avgDaysStudentToLearn).toFixed(1),
      medianDaysSignupToClass: num(timing.medianDaysSignupToClass).toFixed(1),
      medianDaysClassToStudent: num(timing.medianDaysClassToStudent).toFixed(1),
      medianDaysStudentToLearn: num(timing.medianDaysStudentToLearn).toFixed(1),
    },
    teacherRetentionByThreshold,
    retentionBySource,
    ahaMoment: {
      firstWeekClass: num(firstWeekClass[0]?.cnt),
      firstWeekStudent: num(firstWeekStudent[0]?.cnt),
      retentionComparison,
    },
    classSizeDistribution: {
      summary: classSizeData[0] ?? {},
      histogram: classSizeHistogram[0] ?? {},
    },
    schoolActivation: {
      with2Plus: num(totalSchoolsWith2Plus[0]?.cnt),
      with5Plus: num(totalSchoolsWith5Plus[0]?.cnt),
      with10Plus: num(totalSchoolsWith10Plus[0]?.cnt),
      top20: schoolClusters.map(s => ({ schoolKey: s.schoolKey, teachers: num(s.teachers), students: num(s.students) })),
    },
    growthLoop: {
      teacherActive7d,
      teacherActive30d,
      teacherRetention7dRate: (teacherActive7d / totalTeachers * 100).toFixed(1),
      teacherRetention30dRate: (teacherActive30d / totalTeachers * 100).toFixed(1),
      teachersWhoInvited: num(invite.teachersWhoInvited),
      studentsInvited: num(invite.studentsInvited),
      avgStudentsPerTeacher: num(invite.avgStudentsPerTeacher),
    },
    onboardingGap,
    studentFirstAction,
    powerVsFailed,
    weeklySignups: weeklySignups.map(w => ({
      week: w.week, total: num(w.total), teachers: num(w.teachers), students: num(w.students),
    })),
    premiumTeachers: premiumTeachers.map(t => ({
      email: t.email, plan: t.premiumPlan, until: t.premiumUntil, classes: t._count.groups,
    })),
    studentEngagement,
  };

  writeJson("data/business-truth-phase-4-activation-september-2026.json", output);

  console.log("\n=== PHASE 4 COMPLETE ===");
  console.log("Output: data/business-truth-phase-4-activation-september-2026.json");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
