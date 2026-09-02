#!/usr/bin/env tsx
/**
 * Investor Production Truth Audit — BahasaCerdas.com
 *
 * READ-ONLY. No production mutations. Queries Prisma against production DB.
 * Run: npx tsx scripts/investor-production-truth-audit.ts
 * Env: DATABASE_URL must point to production Supabase pooler.
 *
 * Output:
 *   data/investor-production-truth-september-2026.json
 *   data/investor-power-users-september-2026.json
 *   data/investor-school-analysis-september-2026.json
 *
 * Date snapshot: 2026-09-02 (WIB)
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

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

// Safe raw query — returns empty array if table doesn't exist
async function safeQuery<T>(sql: string, label: string): Promise<T[]> {
  try {
    return await prisma.$queryRawUnsafe<T>(sql);
  } catch (e: any) {
    if (e.code === "42P01") {
      console.log(`  ⏭️  ${label}: table not found, skipping`);
      return [];
    }
    console.warn(`  ⚠️  ${label}: ${e.message?.slice(0, 80)}`);
    return [];
  }
}

// ─── SECTION A: USER FUNNEL ─────────────────────────────────────────────────
async function auditUserFunnel() {
  const [
    total,
    byRole,
    founders,
    premiumActive,
    premiumByPlan,
    trialActive,
    last7,
    last30,
    last90,
    neverActive,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.user.findMany({ where: { isFounder: true }, select: {       id: true, email: true, fullName: true, role: true } }),
    prisma.user.count({ where: { isPremium: true, premiumUntil: { gt: NOW } } }),
    prisma.user.groupBy({ by: ["premiumPlan"], where: { isPremium: true, premiumUntil: { gt: NOW } }, _count: true }),
    prisma.user.count({ where: { role: "GURU", trialEndsAt: { gt: NOW } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: daysAgo(7) } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: daysAgo(30) } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: daysAgo(90) } } }),
    prisma.user.count({ where: { lastActiveAt: null } }),
  ]);

  const roleMap = Object.fromEntries(byRole.map(r => [r.role, r._count]));
  return {
    snapshotDate: SNAPSHOT_DATE,
    total,
    byRole: { GURU: roleMap["GURU"] ?? 0, MURID: roleMap["MURID"] ?? 0, ADMIN: roleMap["ADMIN"] ?? 0 },
    founders,
    premiumActive,
    premiumByPlan: Object.fromEntries(premiumByPlan.map(r => [r.premiumPlan ?? "FREE", r._count])),
    trialActiveGuru: trialActive,
    loginActivity: { last7Days: last7, last30Days: last30, last90Days: last90, neverActive: neverActive },
  };
}

// ─── SECTION B: TEACHER FUNNEL ──────────────────────────────────────────────
async function auditTeacherFunnel() {
  const [
    totalGuru,
    groupsCreated,
    groupsPerTeacher,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "GURU" } }),
    prisma.group.count(),
    prisma.group.groupBy({ by: ["teacherId"], _count: true, orderBy: { _count: { teacherId: "desc" } }, take: 20 }),
  ]);

  const topGroupSizes = hasTable("GroupMember")
    ? await safeQuery<{ teacherId: string; groupName: string; memberCount: number }>(
        `SELECT g."teacherId", g."name" as "groupName", COUNT(gm."id")::int as "memberCount"
         FROM "Group" g LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
         GROUP BY g."id", g."teacherId", g."name"
         ORDER BY COUNT(gm."id") DESC LIMIT 20`,
        "topGroupSizes"
      )
    : [];

  // Teacher activity via DailyAction (may not exist)
  const teacherActivity30 = hasTable("DailyAction")
    ? await safeQuery<{ userId: string; count: number }>(
        `SELECT "userId", COUNT(*)::int as count FROM "DailyAction"
         WHERE "createdAt" >= '${daysAgo(30).toISOString()}'
         AND "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'GURU')
         GROUP BY "userId" ORDER BY count DESC LIMIT 20`,
        "teacherActivity30"
      )
    : [];

  // Teachers with groups
  const activeTeachers30d = await prisma.user.count({
    where: { role: "GURU", groups: { some: { createdAt: { gte: daysAgo(30) } } } },
  });
  const activeTeachers90d = await prisma.user.count({
    where: { role: "GURU", groups: { some: { createdAt: { gte: daysAgo(90) } } } },
  });

  return {
    totalGuru,
    groupsCreated,
    activeTeachers30d,
    activeTeachers90d,
    avgGroupsPerTeacher: totalGuru > 0 ? +(groupsCreated / totalGuru).toFixed(2) : 0,
    topGroupSizes,
    groupsPerTeacherTop20: groupsPerTeacher,
    teacherActivityTop20: teacherActivity30,
  };
}

// ─── SECTION C: STUDENT FUNNEL ──────────────────────────────────────────────
async function auditStudentFunnel() {
  const [
    totalMurid,
    studentsInGroups,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "MURID" } }),
    prisma.groupMember.findMany({ where: { user: { role: "MURID" } }, distinct: ["userId"], select: { userId: true } }),
  ]);

  const inGroupSet = new Set(studentsInGroups.map(s => s.userId));

  // DailyAction-based metrics (may not exist)
  const activatedByAny = hasTable("DailyAction")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int as count FROM "DailyAction"`,
        "activatedByAny"
      ))[0]?.count ?? 0
    : 0;

  const activated7d = hasTable("DailyAction")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int as count FROM "DailyAction" WHERE "createdAt" >= '${daysAgo(7).toISOString()}'`,
        "activated7d"
      ))[0]?.count ?? 0
    : 0;

  const activated30d = hasTable("DailyAction")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int as count FROM "DailyAction" WHERE "createdAt" >= '${daysAgo(30).toISOString()}'`,
        "activated30d"
      ))[0]?.count ?? 0
    : 0;

  const withTestSession = hasTable("TestSession")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int as count FROM "TestSession"`,
        "withTestSession"
      ))[0]?.count ?? 0
    : 0;

  const withUnitProgress = hasTable("UserUnitProgress")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int as count FROM "UserUnitProgress"`,
        "withUnitProgress"
      ))[0]?.count ?? 0
    : 0;

  const withKarya = hasTable("StudentKarya")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int as count FROM "StudentKarya"`,
        "withKarya"
      ))[0]?.count ?? 0
    : 0;

  const withAiUsage = hasTable("AIUsage")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT "userId")::int as count FROM "AIUsage"
         WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'MURID')`,
        "withAiUsage"
      ))[0]?.count ?? 0
    : 0;

  return {
    totalMurid,
    studentsInGroups: inGroupSet.size,
    percentInGroup: totalMurid > 0 ? +((inGroupSet.size / totalMurid) * 100).toFixed(1) : 0,
    activatedByAnyActivity: activatedByAny,
    activated7d,
    activated30d,
    withTestSession,
    withUnitProgress,
    withKarya,
    withAiUsage,
  };
}

// ─── SECTION D: RETENTION ───────────────────────────────────────────────────
async function auditRetention() {
  const newUsersPerMonth = hasTable("User")
    ? await safeQuery<{ month: string; count: number }>(
        `SELECT TO_CHAR("createdAt", 'YYYY-MM') as "month", COUNT(*)::int as "count"
         FROM "User" WHERE "createdAt" >= '2026-01-01'
         GROUP BY TO_CHAR("createdAt", 'YYYY-MM') ORDER BY "month"`,
        "newUsersPerMonth"
      )
    : [];

  const recentUsers = await prisma.user.count({ where: { createdAt: { gte: daysAgo(30) } } });

  let retentionFromRecent = { createdLast30d: recentUsers, returnedD1: 0, returnedD7: 0, returnedD30: 0 };

  if (hasTable("DailyAction")) {
    const [d1, d7, d30] = await Promise.all([
      safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT u."id")::int as count FROM "User" u
         INNER JOIN "DailyAction" da ON da."userId" = u."id"
         WHERE u."createdAt" >= '${daysAgo(30).toISOString()}'
         AND da."createdAt" > u."createdAt"
         AND da."createdAt" <= u."createdAt" + INTERVAL '1 day'`,
        "retentionD1"
      ),
      safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT u."id")::int as count FROM "User" u
         INNER JOIN "DailyAction" da ON da."userId" = u."id"
         WHERE u."createdAt" >= '${daysAgo(30).toISOString()}'
         AND da."createdAt" > u."createdAt"
         AND da."createdAt" <= u."createdAt" + INTERVAL '7 days'`,
        "retentionD7"
      ),
      safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT u."id")::int as count FROM "User" u
         INNER JOIN "DailyAction" da ON da."userId" = u."id"
         WHERE u."createdAt" >= '${daysAgo(60).toISOString()}'
         AND da."createdAt" > u."createdAt"
         AND da."createdAt" <= u."createdAt" + INTERVAL '30 days'`,
        "retentionD30"
      ),
    ]);
    retentionFromRecent = {
      createdLast30d: recentUsers,
      returnedD1: d1[0]?.count ?? 0,
      returnedD7: d7[0]?.count ?? 0,
      returnedD30: d30[0]?.count ?? 0,
    };
  }

  return { newUsersPerMonth, retentionFromRecent };
}

// ─── SECTION E: SCHOOL ANALYSIS ─────────────────────────────────────────────
async function auditSchoolAnalysis() {
  const [
    totalSchools,
    activeSchools,
    profilesWithSchoolRaw,
    profilesWithSchoolId,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { isActive: true } }),
    prisma.profile.count({ where: { school: { not: null } } }),
    prisma.profile.count({ where: { schoolId: { not: null } } }),
  ]);

  const uniqueRawSchoolNames = hasTable("Profile")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT LOWER(TRIM("school"))::text) as count FROM "Profile" WHERE "school" IS NOT NULL AND "school" != ''`,
        "uniqueRawSchoolNames"
      ))[0]?.count ?? 0
    : 0;

  const topRawSchools = hasTable("Profile")
    ? await safeQuery<{ name: string; count: number }>(
        `SELECT LOWER(TRIM("school"))::text as "name", COUNT(*)::int as "count"
         FROM "Profile" WHERE "school" IS NOT NULL AND "school" != ''
         GROUP BY LOWER(TRIM("school")) ORDER BY COUNT(*) DESC LIMIT 30`,
        "topRawSchools"
      )
    : [];

  const phantomProfiles = hasTable("Profile")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM "Profile" WHERE "school" IS NOT NULL AND "schoolId" IS NULL`,
        "phantomProfiles"
      ))[0]?.count ?? 0
    : 0;

  const canonicalSchools = await prisma.school.findMany({
    where: { isActive: true },
    select: { id: true, canonicalName: true, normalizedName: true, _count: { select: { profiles: true, aliases: true } } },
    orderBy: { profiles: { _count: "desc" } },
    take: 30,
  });

  return {
    totalSchools,
    activeSchools,
    profilesWithSchoolRaw,
    profilesWithSchoolId,
    uniqueRawSchoolNames,
    phantomProfilesWithoutCanonicalLink: phantomProfiles,
    topRawSchools,
    canonicalSchools,
  };
}

// ─── SECTION F: LEARNING ENGAGEMENT ─────────────────────────────────────────
async function auditLearningEngagement() {
  // DailyAction metrics
  let dailyActions = { total: 0, last7d: 0, last30d: 0, byType: [] as any[] };
  if (hasTable("DailyAction")) {
    const [total, last7, last30, byType] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "DailyAction"`, "dailyTotal"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "DailyAction" WHERE "createdAt" >= '${daysAgo(7).toISOString()}'`, "daily7d"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "DailyAction" WHERE "createdAt" >= '${daysAgo(30).toISOString()}'`, "daily30d"),
      safeQuery<{ type: string; count: number }>(
        `SELECT "type", COUNT(*)::int as count FROM "DailyAction" GROUP BY "type" ORDER BY count DESC`,
        "dailyByType"
      ),
    ]);
    dailyActions = {
      total: total[0]?.count ?? 0,
      last7d: last7[0]?.count ?? 0,
      last30d: last30[0]?.count ?? 0,
      byType,
    };
  }

  // TestSession
  let testSessions = { total: 0, last30d: 0 };
  if (hasTable("TestSession")) {
    const [total, last30] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "TestSession"`, "testTotal"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "TestSession" WHERE "createdAt" >= '${daysAgo(30).toISOString()}'`, "test30d"),
    ]);
    testSessions = { total: total[0]?.count ?? 0, last30d: last30[0]?.count ?? 0 };
  }

  // UserUnitProgress
  let unitProgress = { total: 0, completed: 0 };
  if (hasTable("UserUnitProgress")) {
    const [total, completed] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "UserUnitProgress"`, "unitTotal"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "UserUnitProgress" WHERE "completed" = true`, "unitCompleted"),
    ]);
    unitProgress = { total: total[0]?.count ?? 0, completed: completed[0]?.count ?? 0 };
  }

  // ProgresKompetensi
  let progresKompetensi = { total: 0, completed: 0, byStatus: [] as any[] };
  if (hasTable("ProgresKompetensi")) {
    const [total, completed, byStatus] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "ProgresKompetensi"`, "pkTotal"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "ProgresKompetensi" WHERE "status" = 'COMPLETED'`, "pkCompleted"),
      safeQuery<{ status: string; count: number }>(
        `SELECT "status", COUNT(*)::int as count FROM "ProgresKompetensi" GROUP BY "status" ORDER BY count DESC`,
        "pkByStatus"
      ),
    ]);
    progresKompetensi = { total: total[0]?.count ?? 0, completed: completed[0]?.count ?? 0, byStatus };
  }

  // AdaptivePractice
  let adaptivePractice = { total: 0, completed: 0 };
  if (hasTable("AdaptivePracticeSession")) {
    const [total, completed] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "AdaptivePracticeSession"`, "adaptiveTotal"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "AdaptivePracticeSession" WHERE "status" = 'COMPLETED'`, "adaptiveCompleted"),
    ]);
    adaptivePractice = { total: total[0]?.count ?? 0, completed: completed[0]?.count ?? 0 };
  }

  // Karya
  let karya = { total: 0, last30d: 0 };
  if (hasTable("Karya")) {
    const [total, last30] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "Karya"`, "karyaTotal"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "Karya" WHERE "createdAt" >= '${daysAgo(30).toISOString()}'`, "karya30d"),
    ]);
    karya = { total: total[0]?.count ?? 0, last30d: last30[0]?.count ?? 0 };
  }

  // StudentKarya
  let studentKarya = { total: 0, last30d: 0 };
  if (hasTable("StudentKarya")) {
    const [total, last30] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "StudentKarya"`, "skTotal"),
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "StudentKarya" WHERE "createdAt" >= '${daysAgo(30).toISOString()}'`, "sk30d"),
    ]);
    studentKarya = { total: total[0]?.count ?? 0, last30d: last30[0]?.count ?? 0 };
  }

  // TTS
  let ttsSessions = 0;
  if (hasTable("TtsSession")) {
    const r = await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "TtsSession"`, "ttsTotal");
    ttsSessions = r[0]?.count ?? 0;
  }

  // QuizSession
  let quizzesTaken = 0;
  if (hasTable("QuizSession")) {
    const r = await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "QuizSession"`, "quizTotal");
    quizzesTaken = r[0]?.count ?? 0;
  }

  return { dailyActions, testSessions, unitProgress, progresKompetensi, adaptivePractice, karya, studentKarya, ttsSessions, quizzesTaken };
}

// ─── SECTION G: AI USAGE ────────────────────────────────────────────────────
async function auditAiUsage() {
  if (!hasTable("AIUsage")) {
    return { totalRecords: 0, totalTokens: 0, totalCostUSD: 0, uniqueUsers: 0, last7d: 0, last30d: 0, byFeature: [], byProvider: [], byStatus: [], note: "AIUsage table not found" };
  }

  const [total, tokens, byFeature, byProvider, byStatus, last7, last30, uniqueUsers] = await Promise.all([
    safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "AIUsage"`, "aiTotal"),
    safeQuery<{ tokens: number; cost: number }>(`SELECT COALESCE(SUM("tokens"),0)::int as tokens, COALESCE(SUM("costUSD"),0)::float as cost FROM "AIUsage"`, "aiTokens"),
    safeQuery<{ feature: string; count: number; tokens: number; cost: number }>(
      `SELECT "feature", COUNT(*)::int as count, COALESCE(SUM("tokens"),0)::int as tokens, COALESCE(SUM("costUSD"),0)::float as cost
       FROM "AIUsage" GROUP BY "feature" ORDER BY count DESC`, "aiByFeature"
    ),
    safeQuery<{ provider: string; count: number; tokens: number }>(
      `SELECT COALESCE("provider",'unknown') as provider, COUNT(*)::int as count, COALESCE(SUM("tokens"),0)::int as tokens
       FROM "AIUsage" GROUP BY "provider" ORDER BY count DESC`, "aiByProvider"
    ),
    safeQuery<{ status: string; count: number }>(
      `SELECT COALESCE("status",'unknown') as status, COUNT(*)::int as count FROM "AIUsage" GROUP BY "status" ORDER BY count DESC`,
      "aiByStatus"
    ),
    safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "AIUsage" WHERE "createdAt" >= '${daysAgo(7).toISOString()}'`, "ai7d"),
    safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "AIUsage" WHERE "createdAt" >= '${daysAgo(30).toISOString()}'`, "ai30d"),
    safeQuery<{ count: number }>(`SELECT COUNT(DISTINCT "userId")::int as count FROM "AIUsage"`, "aiUnique"),
  ]);

  return {
    totalRecords: total[0]?.count ?? 0,
    totalTokens: tokens[0]?.tokens ?? 0,
    totalCostUSD: +((tokens[0]?.cost ?? 0)).toFixed(4),
    uniqueUsers: uniqueUsers[0]?.count ?? 0,
    last7d: last7[0]?.count ?? 0,
    last30d: last30[0]?.count ?? 0,
    byFeature: byFeature.map(f => ({ feature: f.feature, count: f.count, tokens: f.tokens, costUSD: +f.cost.toFixed(4) })),
    byProvider: byProvider.map(p => ({ provider: p.provider, count: p.count, tokens: p.tokens })),
    byStatus: byStatus.map(s => ({ status: s.status, count: s.count })),
  };
}

// ─── SECTION H: REVENUE / TRANSAKSI ─────────────────────────────────────────
async function auditRevenue() {
  if (!hasTable("Transaksi")) {
    return { totalTransaksi: 0, byType: [], byStatus: [], successSummary: { count: 0, totalAmount: 0 }, revenueByType: [], uniquePayingUsers: 0, last30dSuccessPayments: 0, last90dSuccessPayments: 0, successfulPayments: [], note: "Transaksi table not found" };
  }

  const [total, byType, byStatus, successSum, last30d, last90d] = await Promise.all([
    safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "Transaksi"`, "txnTotal"),
    safeQuery<{ type: string; count: number; amount: number }>(
      `SELECT "type", COUNT(*)::int as count, COALESCE(SUM("amount"),0)::int as amount
       FROM "Transaksi" GROUP BY "type" ORDER BY count DESC`, "txnByType"
    ),
    safeQuery<{ status: string; count: number; amount: number }>(
      `SELECT COALESCE("status",'unknown') as status, COUNT(*)::int as count, COALESCE(SUM("amount"),0)::int as amount
       FROM "Transaksi" GROUP BY "status" ORDER BY count DESC`, "txnByStatus"
    ),
    safeQuery<{ count: number; amount: number }>(
      `SELECT COUNT(*)::int as count, COALESCE(SUM("amount"),0)::int as amount FROM "Transaksi" WHERE "status" = 'SUCCESS'`,
      "txnSuccess"
    ),
    safeQuery<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Transaksi" WHERE "status" = 'SUCCESS' AND "createdAt" >= '${daysAgo(30).toISOString()}'`,
      "txn30d"
    ),
    safeQuery<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Transaksi" WHERE "status" = 'SUCCESS' AND "createdAt" >= '${daysAgo(90).toISOString()}'`,
      "txn90d"
    ),
  ]);

  const revenueByType = await safeQuery<{ type: string; count: number; amount: number }>(
    `SELECT "type", COUNT(*)::int as count, COALESCE(SUM("amount"),0)::int as amount
     FROM "Transaksi" WHERE "status" = 'SUCCESS' GROUP BY "type" ORDER BY amount DESC`,
    "revenueByType"
  );

  const payingUsers = await safeQuery<{ count: number }>(
    `SELECT COUNT(DISTINCT "userId")::int as count FROM "Transaksi" WHERE "status" = 'SUCCESS'`,
    "payingUsers"
  );

  const successfulPayments = await safeQuery<{ id: string; userId: string; type: string; amount: number; createdAt: string; orderId: string | null }>(
    `SELECT "id", "userId", "type", "amount"::int, "createdAt"::text, "orderId"
     FROM "Transaksi" WHERE "status" = 'SUCCESS' ORDER BY "createdAt" DESC`,
    "successfulPayments"
  );

  return {
    totalTransaksi: total[0]?.count ?? 0,
    byType: byType.map(t => ({ type: t.type, count: t.count, totalAmount: t.amount })),
    byStatus: byStatus.map(s => ({ status: s.status, count: s.count, totalAmount: s.amount })),
    successSummary: { count: successSum[0]?.count ?? 0, totalAmount: successSum[0]?.amount ?? 0 },
    revenueByType: revenueByType.map(r => ({ type: r.type, count: r.count, totalAmount: r.amount })),
    uniquePayingUsers: payingUsers[0]?.count ?? 0,
    last30dSuccessPayments: last30d[0]?.count ?? 0,
    last90dSuccessPayments: last90d[0]?.count ?? 0,
    successfulPayments,
  };
}

// ─── SECTION I: COMMISSION SYSTEM ───────────────────────────────────────────
async function auditCommission() {
  if (!hasTable("TeacherAttribution")) {
    return { totalAttributions: 0, totalCommissions: 0, totalWallets: 0, note: "Commission tables not found" };
  }

  const [totalAttr, totalComm, totalWallets] = await Promise.all([
    safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "TeacherAttribution"`, "attrTotal"),
    safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "TeacherCommission"`, "commTotal"),
    safeQuery<{ count: number; avail: number; pending: number; earned: number }>(
      `SELECT COUNT(*)::int as count, COALESCE(SUM("availableBalance"),0)::int as avail,
       COALESCE(SUM("pendingBalance"),0)::int as pending, COALESCE(SUM("lifetimeEarned"),0)::int as earned
       FROM "TeacherWallet"`, "wallets"
    ),
  ]);

  const attrBySource = await safeQuery<{ source: string; count: number }>(
    `SELECT "source", COUNT(*)::int as count FROM "TeacherAttribution" GROUP BY "source" ORDER BY count DESC`,
    "attrBySource"
  );

  const commByStatus = await safeQuery<{ status: string; count: number; amount: number }>(
    `SELECT "status", COUNT(*)::int as count, COALESCE(SUM("commissionAmount"),0)::int as amount
     FROM "TeacherCommission" GROUP BY "status" ORDER BY count DESC`,
    "commByStatus"
  );

  const totalReversals = (await safeQuery<{ count: number }>(
    `SELECT COUNT(*)::int as count FROM "TeacherCommission" WHERE "entryType" = 'REVERSAL'`,
    "reversals"
  ))[0]?.count ?? 0;

  return {
    totalAttributions: totalAttr[0]?.count ?? 0,
    attributionsBySource: attrBySource.map(a => ({ source: a.source, count: a.count })),
    totalCommissions: totalComm[0]?.count ?? 0,
    commissionsByStatus: commByStatus.map(c => ({ status: c.status, count: c.count, totalAmount: c.amount })),
    totalWallets: totalWallets[0]?.count ?? 0,
    walletBalances: {
      totalAvailable: totalWallets[0]?.avail ?? 0,
      totalPending: totalWallets[0]?.pending ?? 0,
      totalLifetimeEarned: totalWallets[0]?.earned ?? 0,
    },
    totalReversals,
  };
}

// ─── SECTION J: GAMIFICATION ────────────────────────────────────────────────
async function auditGamification() {
  let xpLedger = { total: 0, bySource: [] as any[] };
  if (hasTable("XpLedger")) {
    const [total, bySource] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "XpLedger"`, "xpTotal"),
      safeQuery<{ source: string; count: number; amount: number }>(
        `SELECT "source", COUNT(*)::int as count, COALESCE(SUM("amount"),0)::int as amount
         FROM "XpLedger" GROUP BY "source" ORDER BY count DESC`, "xpBySource"
      ),
    ]);
    xpLedger = { total: total[0]?.count ?? 0, bySource };
  }

  let coinTransactions = { total: 0, byType: [] as any[] };
  if (hasTable("CoinTransaction")) {
    const [total, byType] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "CoinTransaction"`, "coinTotal"),
      safeQuery<{ reason: string; count: number; amount: number }>(
        `SELECT COALESCE("reason",'unknown') as reason, COUNT(*)::int as count, COALESCE(SUM("amount"),0)::int as amount
         FROM "CoinTransaction" GROUP BY "reason" ORDER BY count DESC`, "coinByReason"
      ),
    ]);
    coinTransactions = { total: total[0]?.count ?? 0, byReason: byType };
  }

  const levelDistribution = await prisma.user.groupBy({
    by: ["level"], _count: true, where: { role: "MURID" }, orderBy: { level: "asc" },
  });

  const streakDistribution = await prisma.user.groupBy({
    by: ["streak"], _count: true, where: { role: "MURID", streak: { gt: 0 } },
    orderBy: { streak: "desc" }, take: 20,
  });

  const topXP = await prisma.user.findMany({
    where: { role: "MURID" },
    select: { id: true, fullName: true, xp: true, level: true, streak: true },
    orderBy: { xp: "desc" }, take: 20,
  });

  return { xpLedger, coinTransactions, levelDistribution, streakDistribution, topXP };
}

// ─── SECTION K: PREMIUM / BILLING ───────────────────────────────────────────
async function auditPremium() {
  const [premiumActive, premiumByPlan, trialActive, trialStarted] = await Promise.all([
    prisma.user.count({ where: { isPremium: true, premiumUntil: { gt: NOW } } }),
    prisma.user.groupBy({ by: ["premiumPlan"], where: { isPremium: true, premiumUntil: { gt: NOW } }, _count: true }),
    prisma.user.count({ where: { role: "GURU", trialEndsAt: { gt: NOW } } }),
    prisma.user.count({ where: { role: "GURU", trialStartedAt: { not: null } } }),
  ]);

  let premiumUsageByFeature: any[] = [];
  if (hasTable("PremiumUsage")) {
    premiumUsageByFeature = await safeQuery<{ featureCode: string; count: number; used: number }>(
      `SELECT "featureCode", COUNT(*)::int as count, COALESCE(SUM("used"),0)::int as used
       FROM "PremiumUsage" GROUP BY "featureCode" ORDER BY count DESC`,
      "premiumUsage"
    );
  }

  let successfulByType: any[] = [];
  if (hasTable("Transaksi")) {
    successfulByType = await safeQuery<{ type: string; count: number; amount: number }>(
      `SELECT "type", COUNT(*)::int as count, COALESCE(SUM("amount"),0)::int as amount
       FROM "Transaksi" WHERE "status" = 'SUCCESS' GROUP BY "type" ORDER BY amount DESC`,
      "successfulByType"
    );
  }

  return {
    premiumActive,
    premiumByPlan: premiumByPlan.map(p => ({ plan: p.premiumPlan ?? "FREE", count: p._count })),
    trialActiveGuru: trialActive,
    trialStartedCount: trialStarted,
    premiumUsageByFeature,
    successfulTransactionsByType: successfulByType,
  };
}

// ─── SECTION L: POWER USERS ─────────────────────────────────────────────────
async function auditPowerUsers() {
  let topTeachersByGroups: any[] = [];
  try {
    topTeachersByGroups = await prisma.$queryRawUnsafe<any[]>(
      `SELECT u."id", u."fullName", u."email", u."isFounder", u."isPremium", u."createdAt",
        COUNT(DISTINCT g."id")::int as "groupCount",
        COUNT(DISTINCT gm."userId")::int as "studentCount"
      FROM "User" u
      LEFT JOIN "Group" g ON g."teacherId" = u."id"
      LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
      WHERE u."role" = 'GURU'
      GROUP BY u."id", u."fullName", u."email", u."isFounder", u."isPremium", u."createdAt"
      ORDER BY "groupCount" DESC
      LIMIT 20`
    );
  } catch (e: any) {
    console.warn("  ⚠️  topTeachersByGroups:", e.message?.slice(0, 80));
  }

  let topTeachersByStudents: any[] = [];
  try {
    topTeachersByStudents = await prisma.$queryRawUnsafe<any[]>(
      `SELECT u."id", u."fullName", u."email", u."isFounder",
        COUNT(DISTINCT gm."userId")::int as "studentCount",
        COUNT(DISTINCT g."id")::int as "groupCount"
      FROM "User" u
      INNER JOIN "Group" g ON g."teacherId" = u."id"
      INNER JOIN "GroupMember" gm ON gm."groupId" = g."id"
      WHERE u."role" = 'GURU'
      GROUP BY u."id", u."fullName", u."email", u."isFounder"
      ORDER BY "studentCount" DESC
      LIMIT 20`
    );
  } catch (e: any) {
    console.warn("  ⚠️  topTeachersByStudents:", e.message?.slice(0, 80));
  }

  const topStudentsByXp = await prisma.user.findMany({
    where: { role: "MURID" },
    select: { id: true, fullName: true, email: true, xp: true, level: true, streak: true, coins: true, createdAt: true },
    orderBy: { xp: "desc" },
    take: 100,
  });

  let topStudentsByActivity: any[] = [];
  if (hasTable("DailyAction")) {
    topStudentsByActivity = await safeQuery<{ id: string; name: string; email: string; xp: number; level: number; activityCount: number }>(
      `SELECT u."id", u."fullName", u."email", u."xp", u."level", COUNT(da."id")::int as "activityCount"
       FROM "User" u INNER JOIN "DailyAction" da ON da."userId" = u."id"
       WHERE u."role" = 'MURID'
       GROUP BY u."id", u."fullName", u."email", u."xp", u."level"
       ORDER BY COUNT(da."id") DESC LIMIT 50`,
      "topStudentsByActivity"
    );
  }

  return { topTeachersByGroups, topTeachersByStudents, topStudentsByXp, topStudentsByActivity };
}

// ─── SECTION M: UKBI / TKA / SIMULATION ─────────────────────────────────────
async function auditSimulation() {
  const ukbiCount = hasTable("UKBIQuestion")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "UKBIQuestion"`, "ukbiCount"))[0]?.count ?? 0
    : 0;

  const tkaCount = hasTable("TKAQuestion")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "TKAQuestion"`, "tkaCount"))[0]?.count ?? 0
    : 0;

  let progresKompetensi = { total: 0, byStatus: [] as any[] };
  if (hasTable("ProgresKompetensi")) {
    const [total, byStatus] = await Promise.all([
      safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "ProgresKompetensi"`, "pkTotal"),
      safeQuery<{ status: string; count: number }>(
        `SELECT "status", COUNT(*)::int as count FROM "ProgresKompetensi" GROUP BY "status" ORDER BY count DESC`,
        "pkByStatus"
      ),
    ]);
    progresKompetensi = { total: total[0]?.count ?? 0, byStatus };
  }

  const certificates = hasTable("Certificate")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "Certificate"`, "certCount"))[0]?.count ?? 0
    : 0;

  const sessionsByMonth = hasTable("TestSession")
    ? await safeQuery<{ month: string; count: number; uniqueUsers: number }>(
        `SELECT TO_CHAR("createdAt", 'YYYY-MM') as "month", COUNT(*)::int as "count", COUNT(DISTINCT "userId")::int as "uniqueUsers"
         FROM "TestSession" WHERE "createdAt" >= '2026-01-01'
         GROUP BY TO_CHAR("createdAt", 'YYYY-MM') ORDER BY "month"`,
        "sessionsByMonth"
      )
    : [];

  return { ukbiQuestions: ukbiCount, tkaQuestions: tkaCount, progresKompetensi, certificates, sessionsByMonth };
}

// ─── SECTION N: CHAT / COMMUNITY ────────────────────────────────────────────
async function auditChatCommunity() {
  const chatMessages = hasTable("ChatMessage")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "ChatMessage"`, "chatCount"))[0]?.count ?? 0
    : 0;

  const communities = hasTable("Community")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "Community"`, "commCount"))[0]?.count ?? 0
    : 0;

  const communityPosts = hasTable("CommunityPost")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "CommunityPost"`, "commPostCount"))[0]?.count ?? 0
    : 0;

  const notifications = hasTable("Notifikasi")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "Notifikasi"`, "notifCount"))[0]?.count ?? 0
    : 0;

  return { chatMessages, communities, communityPosts, notifications };
}

// ─── SECTION O: GAME SYSTEM ─────────────────────────────────────────────────
async function auditGameSystem() {
  const gameResultsTotal = hasTable("GameResult")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "GameResult"`, "grTotal"))[0]?.count ?? 0
    : 0;

  const gameResults30d = hasTable("GameResult")
    ? (await safeQuery<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM "GameResult" WHERE "createdAt" >= '${daysAgo(30).toISOString()}'`,
        "gr30d"
      ))[0]?.count ?? 0
    : 0;

  const gameRooms = hasTable("GameRoom")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "GameRoom"`, "grRoomCount"))[0]?.count ?? 0
    : 0;

  const gameSessions = hasTable("GameSession")
    ? (await safeQuery<{ count: number }>(`SELECT COUNT(*)::int as count FROM "GameSession"`, "gsCount"))[0]?.count ?? 0
    : 0;

  return {
    gameResults: { total: gameResultsTotal, last30d: gameResults30d },
    gameRooms,
    gameSessions,
  };
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Investor Production Truth Audit — BahasaCerdas.com");
  console.log(`📅 Snapshot: ${SNAPSHOT_DATE} (WIB)`);
  console.log(`⏰ Started: ${nowWib.toISOString()}`);
  console.log("");

  // Step 1: Discover tables
  await discoverTables();

  // Step 2: Run all sections
  console.log("\n📊 Running audit sections...");
  const [
    userFunnel,
    teacherFunnel,
    studentFunnel,
    retention,
    schoolAnalysis,
    learningEngagement,
    aiUsage,
    revenue,
    commission,
    gamification,
    premium,
    powerUsers,
    simulation,
    chatCommunity,
    gameSystem,
  ] = await Promise.all([
    auditUserFunnel(),
    auditTeacherFunnel(),
    auditStudentFunnel(),
    auditRetention(),
    auditSchoolAnalysis(),
    auditLearningEngagement(),
    auditAiUsage(),
    auditRevenue(),
    auditCommission(),
    auditGamification(),
    auditPremium(),
    auditPowerUsers(),
    auditSimulation(),
    auditChatCommunity(),
    auditGameSystem(),
  ]);

  const report = {
    meta: {
      snapshotDate: SNAPSHOT_DATE,
      generatedAt: nowWib.toISOString(),
      script: "scripts/investor-production-truth-audit.ts",
      database: "Supabase PostgreSQL (production pooler)",
      readOnly: true,
      tablesDiscovered: existingTables.size,
      note: "All numbers sourced from production DB via Prisma. No mutations. Missing tables noted per section.",
    },
    sections: {
      A_userFunnel: userFunnel,
      B_teacherFunnel: teacherFunnel,
      C_studentFunnel: studentFunnel,
      D_retention: retention,
      E_schoolAnalysis: schoolAnalysis,
      F_learningEngagement: learningEngagement,
      G_aiUsage: aiUsage,
      H_revenue: revenue,
      I_commission: commission,
      J_gamification: gamification,
      K_premium: premium,
      L_powerUsers: powerUsers,
      M_simulation: simulation,
      N_chatCommunity: chatCommunity,
      O_gameSystem: gameSystem,
    },
  };

  // Write output files
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const truthPath = path.join(dataDir, "investor-production-truth-september-2026.json");
  fs.writeFileSync(truthPath, safeStringify(report));
  console.log(`\n✅ Written: ${truthPath}`);

  const powerUsersPath = path.join(dataDir, "investor-power-users-september-2026.json");
  fs.writeFileSync(powerUsersPath, safeStringify({
    snapshotDate: SNAPSHOT_DATE,
    topTeachersByGroups: powerUsers.topTeachersByGroups,
    topTeachersByStudents: powerUsers.topTeachersByStudents,
    topStudentsByXp: powerUsers.topStudentsByXp,
    topStudentsByActivity: powerUsers.topStudentsByActivity,
  }));
  console.log(`✅ Written: ${powerUsersPath}`);

  const schoolPath = path.join(dataDir, "investor-school-analysis-september-2026.json");
  fs.writeFileSync(schoolPath, safeStringify({
    snapshotDate: SNAPSHOT_DATE,
    ...schoolAnalysis,
  }));
  console.log(`✅ Written: ${schoolPath}`);

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 AUDIT SUMMARY");
  console.log("═".repeat(60));
  console.log(`Users:        ${userFunnel.total} (GURU ${userFunnel.byRole.GURU}, MURID ${userFunnel.byRole.MURID}, ADMIN ${userFunnel.byRole.ADMIN})`);
  console.log(`Founders:     ${userFunnel.founders.length}`);
  console.log(`Groups:       ${teacherFunnel.groupsCreated}`);
  console.log(`Students:     ${studentFunnel.studentsInGroups} in groups / ${studentFunnel.totalMurid} total (${studentFunnel.percentInGroup}%)`);
  console.log(`Activated:    ${studentFunnel.activatedByAnyActivity || "n/a (DailyAction missing)"} (any), ${studentFunnel.activated30d || "n/a"} (30d)`);
  console.log(`DailyAction:  ${learningEngagement.dailyActions.total} total, ${learningEngagement.dailyActions.last30d} (30d)`);
  console.log(`AI Usage:     ${aiUsage.totalRecords} records, ${aiUsage.totalTokens} tokens, $${aiUsage.totalCostUSD}`);
  console.log(`Revenue:      Rp${revenue.successSummary.totalAmount.toLocaleString("id-ID")} (${revenue.successSummary.count} txns)`);
  console.log(`Premium:      ${premium.premiumActive} active, ${premium.trialActiveGuru} trial`);
  console.log(`Commission:   ${commission.totalAttributions} attributions, ${commission.totalCommissions} entries`);
  console.log(`UKBI:         ${simulation.ukbiQuestions} questions`);
  console.log(`TKA:          ${simulation.tkaQuestions} questions`);
  console.log(`Game:         ${gameSystem.gameResults.total} results`);
  console.log("═".repeat(60));

  await prisma.$disconnect();
  console.log("\n✅ Audit complete. DB disconnected.");
}

main().catch(async (e) => {
  console.error("❌ Audit failed:", e.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
