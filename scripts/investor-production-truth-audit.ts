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

function dayKeyWib(d: Date): string {
  const wib = new Date(d.getTime() + WIB_OFFSET);
  return wib.toISOString().slice(0, 10);
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
    prisma.user.findMany({ where: { isFounder: true }, select: { id: true, email: true, name: true, role: true } }),
    prisma.user.count({ where: { isPremium: true, premiumUntil: { gt: NOW } } }),
    prisma.user.groupBy({ by: ["premiumPlan"], where: { isPremium: true, premiumUntil: { gt: NOW } }, _count: true }),
    prisma.user.count({ where: { role: "GURU", trialEndsAt: { gt: NOW } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: daysAgo(7) } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: daysAgo(30) } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: daysAgo(90) } } }),
    prisma.user.count({ where: { lastLoginAt: null } }),
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
    loginActivity: { last7Days: last7, last30Days: last30, last90Days: last90, neverLoggedIn: neverActive },
  };
}

// ─── SECTION B: TEACHER FUNNEL ──────────────────────────────────────────────
async function auditTeacherFunnel() {
  const [
    totalGuru,
    groupsCreated,
    activeTeachers30d,
    activeTeachers90d,
    groupsPerTeacher,
    topGroupSizes,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "GURU" } }),
    prisma.group.count(),
    prisma.user.count({ where: { role: "GURU", groups: { some: {} }, createdAt: { gte: daysAgo(30) } } }),
    prisma.user.count({ where: { role: "GURU", groups: { some: {} }, createdAt: { gte: daysAgo(90) } } }),
    prisma.group.groupBy({ by: ["teacherId"], _count: true, orderBy: { _count: { teacherId: "desc" } }, take: 20 }),
    prisma.$queryRaw`
      SELECT g."teacherId", g."name" as "groupName", COUNT(gm."id")::int as "memberCount"
      FROM "Group" g
      LEFT JOIN "GroupMember" gm ON gm."groupId" = g."id"
      GROUP BY g."id", g."teacherId", g."name"
      ORDER BY COUNT(gm."id") DESC
      LIMIT 20
    ` as Promise<{ teacherId: string; groupName: string; memberCount: number }[]>,
  ]);

  // Teacher activity via DailyAction
  const teacherActivity30 = await prisma.dailyAction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: daysAgo(30) }, user: { role: "GURU" } },
    _count: true,
    orderBy: { _count: { userId: "desc" } },
    take: 20,
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
    studentsWithActivity,
    studentsWithDailyAction7d,
    studentsWithDailyAction30d,
    studentsWithTestSession,
    studentsWithUnitProgress,
    studentsWithKarya,
    studentsWithAiUsage,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "MURID" } }),
    prisma.groupMember.findMany({ where: { user: { role: "MURID" } }, distinct: ["userId"], select: { userId: true } }),
    prisma.$queryRaw`SELECT COUNT(DISTINCT "userId")::int as count FROM "DailyAction"` as Promise<{ count: number }[]>,
    prisma.$queryRaw`SELECT COUNT(DISTINCT "userId")::int as count FROM "DailyAction" WHERE "createdAt" >= ${daysAgo(7)}` as Promise<{ count: number }[]>,
    prisma.$queryRaw`SELECT COUNT(DISTINCT "userId")::int as count FROM "DailyAction" WHERE "createdAt" >= ${daysAgo(30)}` as Promise<{ count: number }[]>,
    prisma.$queryRaw`SELECT COUNT(DISTINCT "userId")::int as count FROM "TestSession"` as Promise<{ count: number }[]>,
    prisma.$queryRaw`SELECT COUNT(DISTINCT "userId")::int as count FROM "UserUnitProgress"` as Promise<{ count: number }[]>,
    prisma.studentKarya.findMany({ distinct: ["authorId"], select: { authorId: true } }),
    prisma.$queryRaw`SELECT COUNT(DISTINCT "userId")::int as count FROM "AIUsage" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'MURID')` as Promise<{ count: number }[]>,
  ]);

  const inGroupSet = new Set(studentsInGroups.map(s => s.userId));
  const karyaSet = new Set(studentsWithKarya.map(k => k.authorId));

  return {
    totalMurid,
    studentsInGroups: inGroupSet.size,
    percentInGroup: totalMurid > 0 ? +((inGroupSet.size / totalMurid) * 100).toFixed(1) : 0,
    activatedByAnyActivity: studentsWithActivity[0]?.count ?? 0,
    activated7d: studentsWithDailyAction7d[0]?.count ?? 0,
    activated30d: studentsWithDailyAction30d[0]?.count ?? 0,
    withTestSession: studentsWithTestSession[0]?.count ?? 0,
    withUnitProgress: studentsWithUnitProgress[0]?.count ?? 0,
    withKarya: karyaSet.size,
    withAiUsage: studentsWithAiUsage[0]?.count ?? 0,
  };
}

// ─── SECTION D: RETENTION ───────────────────────────────────────────────────
async function auditRetention() {
  // Cohort-based: users created in month X, active in month X+0 / X+1 / X+2
  const cohorts = await prisma.$queryRaw`
    SELECT
      TO_CHAR(u."createdAt", 'YYYY-MM') as "cohortMonth",
      COUNT(*)::int as "total",
      COUNT(CASE WHEN da."userId" IS NOT NULL THEN 1 END)::int as "activeMonth0",
      COUNT(CASE WHEN da."userId" IS NOT NULL AND da."dayKey" >= TO_CHAR(u."createdAt", 'YYYY-MM') THEN 1 END)::int as "activeInCohortMonth"
    FROM "User" u
    LEFT JOIN (
      SELECT DISTINCT "userId", TO_CHAR("createdAt", 'YYYY-MM') as "dayKey"
      FROM "DailyAction"
    ) da ON da."userId" = u."id"
    WHERE u."createdAt" >= '2026-01-01'
    GROUP BY TO_CHAR(u."createdAt", 'YYYY-MM')
    ORDER BY "cohortMonth"
  ` as Promise<{ cohortMonth: string; total: number; activeMonth0: number; activeInCohortMonth: number }[]>;

  // Simple retention: D1, D7, D30 (created users who returned)
  const d1 = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT u."id")::int as count
    FROM "User" u
    INNER JOIN "DailyAction" da ON da."userId" = u."id"
    WHERE u."createdAt" >= ${daysAgo(30)}
    AND da."createdAt" > u."createdAt"
    AND da."createdAt" <= u."createdAt" + INTERVAL '1 day'
  ` as Promise<{ count: number }[]>;

  const d7 = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT u."id")::int as count
    FROM "User" u
    INNER JOIN "DailyAction" da ON da."userId" = u."id"
    WHERE u."createdAt" >= ${daysAgo(30)}
    AND da."createdAt" > u."createdAt"
    AND da."createdAt" <= u."createdAt" + INTERVAL '7 days'
  ` as Promise<{ count: number }[]>;

  const d30 = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT u."id")::int as count
    FROM "User" u
    INNER JOIN "DailyAction" da ON da."userId" = u."id"
    WHERE u."createdAt" >= ${daysAgo(60)}
    AND da."createdAt" > u."createdAt"
    AND da."createdAt" <= u."createdAt" + INTERVAL '30 days'
  ` as Promise<{ count: number }[]>;

  // New users per month
  const newUsersPerMonth = await prisma.$queryRaw`
    SELECT TO_CHAR("createdAt", 'YYYY-MM') as "month", COUNT(*)::int as "count"
    FROM "User"
    WHERE "createdAt" >= '2026-01-01'
    GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
    ORDER BY "month"
  ` as Promise<{ month: string; count: number }[]>;

  const recentUsers = await prisma.user.count({ where: { createdAt: { gte: daysAgo(30) } } });

  return {
    cohortMonthly: cohorts,
    retentionFromRecent: { createdLast30d: recentUsers, returnedD1: d1[0]?.count ?? 0, returnedD7: d7[0]?.count ?? 0, returnedD30: d30[0]?.count ?? 0 },
    newUsersPerMonth,
  };
}

// ─── SECTION E: SCHOOL ANALYSIS ─────────────────────────────────────────────
async function auditSchoolAnalysis() {
  const [
    totalSchools,
    activeSchools,
    profilesWithSchoolRaw,
    profilesWithSchoolId,
    schoolAliases,
    uniqueRawSchoolNames,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { isActive: true } }),
    prisma.profile.count({ where: { school: { not: null } } }),
    prisma.profile.count({ where: { schoolId: { not: null } } }),
    prisma.schoolAlias.count(),
    prisma.$queryRaw`SELECT COUNT(DISTINCT LOWER(TRIM("school"))::text) as count FROM "Profile" WHERE "school" IS NOT NULL AND "school" != ''` as Promise<{ count: number }[]>,
  ]);

  // Top raw school names
  const topRawSchools = await prisma.$queryRaw`
    SELECT LOWER(TRIM("school"))::text as "name", COUNT(*)::int as "count"
    FROM "Profile"
    WHERE "school" IS NOT NULL AND "school" != ''
    GROUP BY LOWER(TRIM("school"))
    ORDER BY COUNT(*) DESC
    LIMIT 30
  ` as Promise<{ name: string; count: number }[]>;

  // School with canonical names
  const canonicalSchools = await prisma.school.findMany({
    where: { isActive: true },
    select: { id: true, canonicalName: true, normalizedName: true, _count: { select: { profiles: true, aliases: true } } },
    orderBy: { profiles: { _count: "desc" } },
    take: 30,
  });

  // Phantom schools (Profile.school set but schoolId null)
  const phantomProfiles = await prisma.profile.count({
    where: { school: { not: null }, schoolId: null },
  });

  return {
    totalSchools,
    activeSchools,
    profilesWithSchoolRaw,
    profilesWithSchoolId,
    uniqueRawSchoolNames: uniqueRawSchoolNames[0]?.count ?? 0,
    schoolAliases,
    phantomProfilesWithoutCanonicalLink: phantomProfiles,
    topRawSchools,
    canonicalSchools,
  };
}

// ─── SECTION F: LEARNING ENGAGEMENT ─────────────────────────────────────────
async function auditLearningEngagement() {
  const [
    dailyActionsTotal,
    dailyActionsByType,
    dailyActions7d,
    dailyActions30d,
    testSessionsTotal,
    testSessions30d,
    userUnitProgressTotal,
    userUnitProgressCompleted,
    progresKompetensiTotal,
    progresKompetensiCompleted,
    adaptiveSessionsTotal,
    adaptiveCompleted,
    karyaTotal,
    karya30d,
    studentKaryaTotal,
    studentKarya30d,
    ttsSessionsTotal,
    quizzesTaken,
  ] = await Promise.all([
    prisma.dailyAction.count(),
    prisma.dailyAction.groupBy({ by: ["type"], _count: true, orderBy: { _count: { type: "desc" } } }),
    prisma.dailyAction.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.dailyAction.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.testSession.count(),
    prisma.testSession.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.userUnitProgress.count(),
    prisma.userUnitProgress.count({ where: { completed: true } }),
    prisma.progresKompetensi.count(),
    prisma.progresKompetensi.count({ where: { status: "COMPLETED" } }),
    prisma.adaptivePracticeSession.count(),
    prisma.adaptivePracticeSession.count({ where: { status: "COMPLETED" } }),
    prisma.karya.count(),
    prisma.karya.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.studentKarya.count(),
    prisma.studentKarya.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.ttsSession.count(),
    prisma.quizSession.count(),
  ]);

  return {
    dailyActions: { total: dailyActionsTotal, last7d: dailyActions7d, last30d: dailyActions30d, byType: dailyActionsByType },
    testSessions: { total: testSessionsTotal, last30d: testSessions30d },
    unitProgress: { total: userUnitProgressTotal, completed: userUnitProgressCompleted },
    progresKompetensi: { total: progresKompetensiTotal, completed: progresKompetensiCompleted },
    adaptivePractice: { total: adaptiveSessionsTotal, completed: adaptiveCompleted },
    karya: { total: karyaTotal, last30d: karya30d },
    studentKarya: { total: studentKaryaTotal, last30d: studentKarya30d },
    ttsSessions: { total: ttsSessionsTotal },
    quizzesTaken,
  };
}

// ─── SECTION G: AI USAGE ────────────────────────────────────────────────────
async function auditAiUsage() {
  const [
    totalRecords,
    totalTokens,
    totalCostUSD,
    byFeature,
    byProvider,
    byStatus,
    last7d,
    last30d,
    uniqueUsers,
  ] = await Promise.all([
    prisma.aIUsage.count(),
    prisma.aIUsage.aggregate({ _sum: { tokens: true, costUSD: true } }),
    prisma.aIUsage.groupBy({ by: ["feature"], _count: true, _sum: { tokens: true, costUSD: true }, orderBy: { _count: { feature: "desc" } } }),
    prisma.aIUsage.groupBy({ by: ["provider"], _count: true, _sum: { tokens: true }, orderBy: { _count: { provider: "desc" } } }),
    prisma.aIUsage.groupBy({ by: ["status"], _count: true }),
    prisma.aIUsage.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.aIUsage.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.$queryRaw`SELECT COUNT(DISTINCT "userId")::int as count FROM "AIUsage"` as Promise<{ count: number }[]>,
  ]);

  return {
    totalRecords,
    totalTokens: totalTokens._sum.tokens ?? 0,
    totalCostUSD: +(totalTokens._sum.costUSD ?? 0).toFixed(4),
    uniqueUsers: uniqueUsers[0]?.count ?? 0,
    last7d: last7d,
    last30d: last30d,
    byFeature: byFeature.map(f => ({ feature: f.feature, count: f._count, tokens: f._sum.tokens ?? 0, costUSD: +(f._sum.costUSD ?? 0).toFixed(4) })),
    byProvider: byProvider.map(p => ({ provider: p.provider ?? "unknown", count: p._count, tokens: p._sum.tokens ?? 0 })),
    byStatus: byStatus.map(s => ({ status: s.status ?? "unknown", count: s._count })),
  };
}

// ─── SECTION H: REVENUE / TRANSAKSI ─────────────────────────────────────────
async function auditRevenue() {
  const [
    totalTransaksi,
    byType,
    byStatus,
    successfulPayments,
    revenueSuccess,
    last30dPayments,
    last90dPayments,
  ] = await Promise.all([
    prisma.transaksi.count(),
    prisma.transaksi.groupBy({ by: ["type"], _count: true, _sum: { amount: true }, orderBy: { _count: { type: "desc" } } }),
    prisma.transaksi.groupBy({ by: ["status"], _count: true, _sum: { amount: true } }),
    prisma.transaksi.findMany({ where: { status: "SUCCESS" }, select: { id: true, userId: true, type: true, amount: true, createdAt: true, orderId: true } }),
    prisma.transaksi.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true }, _count: true }),
    prisma.transaksi.count({ where: { status: "SUCCESS", createdAt: { gte: daysAgo(30) } } }),
    prisma.transaksi.count({ where: { status: "SUCCESS", createdAt: { gte: daysAgo(90) } } }),
  ]);

  const successAmount = revenueSuccess._sum.amount ?? 0;
  const successCount = revenueSuccess._count;

  // Revenue by type
  const revenueByType = await prisma.transaksi.groupBy({
    by: ["type"],
    where: { status: "SUCCESS" },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: "desc" } },
  });

  // Unique paying users
  const payingUsers = await prisma.transaksi.findMany({
    where: { status: "SUCCESS" },
    distinct: ["userId"],
    select: { userId: true },
  });

  return {
    totalTransaksi,
    byType: byType.map(t => ({ type: t.type, count: t._count, totalAmount: t._sum.amount ?? 0 })),
    byStatus: byStatus.map(s => ({ status: s.status ?? "unknown", count: s._count, totalAmount: s._sum.amount ?? 0 })),
    successSummary: { count: successCount, totalRevenue: successCount, totalAmount: successAmount },
    revenueByType: revenueByType.map(r => ({ type: r.type, count: r._count, totalAmount: r._sum.amount ?? 0 })),
    uniquePayingUsers: payingUsers.length,
    last30dSuccessPayments: last30dPayments,
    last90dSuccessPayments: last90dPayments,
    successfulPayments,
  };
}

// ─── SECTION I: COMMISSION SYSTEM ───────────────────────────────────────────
async function auditCommission() {
  const [
    totalAttributions,
    attributionsBySource,
    totalCommissions,
    commissionsByStatus,
    totalWallets,
    walletBalances,
    totalReversals,
  ] = await Promise.all([
    prisma.teacherAttribution.count(),
    prisma.teacherAttribution.groupBy({ by: ["source"], _count: true }),
    prisma.teacherCommission.count(),
    prisma.teacherCommission.groupBy({ by: ["status"], _count: true, _sum: { commissionAmount: true } }),
    prisma.teacherWallet.count(),
    prisma.teacherWallet.aggregate({ _sum: { availableBalance: true, pendingBalance: true, lifetimeEarned: true } }),
    prisma.teacherCommission.count({ where: { entryType: "REVERSAL" } }),
  ]);

  return {
    totalAttributions,
    attributionsBySource: attributionsBySource.map(a => ({ source: a.source, count: a._count })),
    totalCommissions,
    commissionsByStatus: commissionsByStatus.map(c => ({ status: c.status, count: c._count, totalAmount: c._sum.commissionAmount ?? 0 })),
    totalWallets,
    walletBalances: {
      totalAvailable: walletBalances._sum.availableBalance ?? 0,
      totalPending: walletBalances._sum.pendingBalance ?? 0,
      totalLifetimeEarned: walletBalances._sum.lifetimeEarned ?? 0,
    },
    totalReversals,
  };
}

// ─── SECTION J: GAMIFICATION ────────────────────────────────────────────────
async function auditGamification() {
  const [
    xpLedgerTotal,
    xpBySource,
    coinTransactionsTotal,
    coinByType,
    levelDistribution,
    streakDistribution,
    topXP,
  ] = await Promise.all([
    prisma.xpLedger.count(),
    prisma.xpLedger.groupBy({ by: ["source"], _count: true, _sum: { amount: true }, orderBy: { _count: { source: "desc" } } }),
    prisma.coinTransaction.count(),
    prisma.coinTransaction.groupBy({ by: ["type"], _count: true, _sum: { amount: true } }),
    prisma.user.groupBy({ by: ["level"], _count: true, where: { role: "MURID" }, orderBy: { level: "asc" } }),
    prisma.user.groupBy({ by: ["streak"], _count: true, where: { role: "MURID", streak: { gt: 0 } }, orderBy: { streak: "desc" }, take: 20 }),
    prisma.user.findMany({ where: { role: "MURID" }, select: { id: true, name: true, xp: true, level: true, streak: true }, orderBy: { xp: "desc" }, take: 20 }),
  ]);

  return {
    xpLedger: { total: xpLedgerTotal, bySource: xpBySource.map(x => ({ source: x.source, count: x._count, totalAmount: x._sum.amount ?? 0 })) },
    coinTransactions: { total: coinTransactionsTotal, byType: coinByType.map(c => ({ type: c.type ?? "unknown", count: c._count, totalAmount: c._sum.amount ?? 0 })) },
    levelDistribution,
    streakDistribution,
    topXP,
  };
}

// ─── SECTION K: PREMIUM / BILLING ───────────────────────────────────────────
async function auditPremium() {
  const [
    premiumActive,
    premiumByPlan,
    trialActiveGuru,
    trialStartedCount,
    premiumUsage,
    transaksiByType,
  ] = await Promise.all([
    prisma.user.count({ where: { isPremium: true, premiumUntil: { gt: NOW } } }),
    prisma.user.groupBy({ by: ["premiumPlan"], where: { isPremium: true, premiumUntil: { gt: NOW } }, _count: true }),
    prisma.user.count({ where: { role: "GURU", trialEndsAt: { gt: NOW } } }),
    prisma.user.count({ where: { role: "GURU", trialStartedAt: { not: null } } }),
    prisma.premiumUsage.groupBy({ by: ["feature"], _count: true, _sum: { used: true } }),
    prisma.transaksi.groupBy({ by: ["type"], _count: true, _sum: { amount: true }, where: { status: "SUCCESS" } }),
  ]);

  return {
    premiumActive,
    premiumByPlan: premiumByPlan.map(p => ({ plan: p.premiumPlan ?? "FREE", count: p._count })),
    trialActiveGuru,
    trialStartedCount,
    premiumUsageByFeature: premiumUsage.map(p => ({ feature: p.feature, count: p._count, totalUsed: p._sum.used ?? 0 })),
    successfulTransactionsByType: transaksiByType.map(t => ({ type: t.type, count: t._count, totalAmount: t._sum.amount ?? 0 })),
  };
}

// ─── SECTION L: POWER USERS ─────────────────────────────────────────────────
async function auditPowerUsers() {
  // Top teachers by group count
  const topTeachersByGroups = await prisma.user.findMany({
    where: { role: "GURU" },
    select: {
      id: true, name: true, email: true, isFounder: true, isPremium: true, createdAt: true,
      _count: { select: { groups: true, groupMembers: { where: { user: { role: "MURID" } } } } },
    },
    orderBy: { groups: { _count: "desc" } },
    take: 20,
  });

  // Top teachers by student count (via groupMembers)
  const topTeachersByStudents = await prisma.user.findMany({
    where: { role: "GURU" },
    select: {
      id: true, name: true, email: true, isFounder: true,
      _count: { select: { groupMembers: { where: { user: { role: "MURID" } } } } },
    },
    orderBy: { groupMembers: { _count: "desc" } },
    take: 20,
  });

  // Top students by XP
  const topStudentsByXp = await prisma.user.findMany({
    where: { role: "MURID" },
    select: { id: true, name: true, email: true, xp: true, level: true, streak: true, coins: true, createdAt: true },
    orderBy: { xp: "desc" },
    take: 100,
  });

  // Top students by activity count
  const topStudentsByActivity = await prisma.$queryRaw`
    SELECT u."id", u."name", u."email", u."xp", u."level", COUNT(da."id")::int as "activityCount"
    FROM "User" u
    INNER JOIN "DailyAction" da ON da."userId" = u."id"
    WHERE u."role" = 'MURID'
    GROUP BY u."id", u."name", u."email", u."xp", u."level"
    ORDER BY COUNT(da."id") DESC
    LIMIT 50
  ` as Promise<{ id: string; name: string; email: string; xp: number; level: number; activityCount: number }[]>;

  // Most active premium students
  const premiumStudentsActivity = await prisma.$queryRaw`
    SELECT u."id", u."name", u."email", u."premiumPlan", u."premiumUntil",
      COUNT(da."id")::int as "activityCount"
    FROM "User" u
    LEFT JOIN "DailyAction" da ON da."userId" = u."id"
    WHERE u."role" = 'MURID' AND u."isPremium" = true AND u."premiumUntil" > ${NOW}
    GROUP BY u."id", u."name", u."email", u."premiumPlan", u."premiumUntil"
    ORDER BY COUNT(da."id") DESC
    LIMIT 20
  ` as Promise<{ id: string; name: string; email: string; premiumPlan: string; premiumUntil: Date; activityCount: number }[]>;

  return {
    topTeachersByGroups,
    topTeachersByStudents,
    topStudentsByXp,
    topStudentsByActivity,
    premiumStudentsActivity,
  };
}

// ─── SECTION M: UKBI / TKA / SIMULATION ─────────────────────────────────────
async function auditSimulation() {
  const [
    ukbiQuestions,
    tkaQuestions,
    progresKompetensi,
    progresByStatus,
    certificates,
    lombaPeserta,
  ] = await Promise.all([
    prisma.uKBIQuestion.count(),
    prisma.tKAQuestion.count(),
    prisma.progresKompetensi.count(),
    prisma.progresKompetensi.groupBy({ by: ["status"], _count: true }),
    prisma.certificate.count(),
    prisma.lombaPeserta.count(),
  ]);

  // Simulation sessions by month
  const sessionsByMonth = await prisma.$queryRaw`
    SELECT TO_CHAR("createdAt", 'YYYY-MM') as "month", COUNT(*)::int as "count", COUNT(DISTINCT "userId")::int as "uniqueUsers"
    FROM "TestSession"
    WHERE "createdAt" >= '2026-01-01'
    GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
    ORDER BY "month"
  ` as Promise<{ month: string; count: number; uniqueUsers: number }[]>;

  return {
    ukbiQuestions,
    tkaQuestions,
    progresKompetensi: { total: progresKompetensi, byStatus: progresByStatus.map(p => ({ status: p.status, count: p._count })) },
    certificates,
    lombaPeserta,
    sessionsByMonth,
  };
}

// ─── SECTION N: CHAT / COMMUNITY ────────────────────────────────────────────
async function auditChatCommunity() {
  const [
    chatMessages,
    communities,
    communityPosts,
    notifications,
  ] = await Promise.all([
    prisma.chatMessage.count(),
    prisma.community.count(),
    prisma.communityPost.count(),
    prisma.notifikasi.count(),
  ]);

  return { chatMessages, communities, communityPosts, notifications };
}

// ─── SECTION O: GAME SYSTEM ─────────────────────────────────────────────────
async function auditGameSystem() {
  const [
    gameResults,
    gameRooms,
    gameSessions,
  ] = await Promise.all([
    prisma.gameResult.count(),
    prisma.gameRoom.count(),
    prisma.gameSession.count(),
  ]);

  const gameResults30d = await prisma.gameResult.count({ where: { createdAt: { gte: daysAgo(30) } } });

  return {
    gameResults: { total: gameResults, last30d: gameResults30d },
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
      note: "All numbers sourced from production DB via Prisma. No mutations.",
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
  fs.writeFileSync(truthPath, JSON.stringify(report, null, 2));
  console.log(`✅ Written: ${truthPath}`);

  const powerUsersPath = path.join(dataDir, "investor-power-users-september-2026.json");
  fs.writeFileSync(powerUsersPath, JSON.stringify({
    snapshotDate: SNAPSHOT_DATE,
    topTeachersByGroups: powerUsers.topTeachersByGroups,
    topTeachersByStudents: powerUsers.topTeachersByStudents,
    topStudentsByXp: powerUsers.topStudentsByXp,
    topStudentsByActivity: powerUsers.topStudentsByActivity,
    premiumStudentsActivity: powerUsers.premiumStudentsActivity,
  }, null, 2));
  console.log(`✅ Written: ${powerUsersPath}`);

  const schoolPath = path.join(dataDir, "investor-school-analysis-september-2026.json");
  fs.writeFileSync(schoolPath, JSON.stringify({
    snapshotDate: SNAPSHOT_DATE,
    ...schoolAnalysis,
  }, null, 2));
  console.log(`✅ Written: ${schoolPath}`);

  // Summary
  console.log("\n📊 AUDIT SUMMARY");
  console.log("═".repeat(60));
  console.log(`Users: ${userFunnel.total} (GURU ${userFunnel.byRole.GURU}, MURID ${userFunnel.byRole.MURID}, ADMIN ${userFunnel.byRole.ADMIN})`);
  console.log(`Founders: ${userFunnel.founders.length}`);
  console.log(`Groups: ${teacherFunnel.groupsCreated}`);
  console.log(`Students in groups: ${studentFunnel.studentsInGroups} / ${studentFunnel.totalMurid} (${studentFunnel.percentInGroup}%)`);
  console.log(`Activated (any): ${studentFunnel.activatedByAnyActivity}`);
  console.log(`Daily actions 30d: ${learningEngagement.dailyActions.last30d}`);
  console.log(`AI usage records: ${aiUsage.totalRecords} (${aiUsage.totalTokens} tokens, $${aiUsage.totalCostUSD})`);
  console.log(`Revenue (SUCCESS): Rp${revenue.successSummary.totalAmount.toLocaleString("id-ID")} (${revenue.successSummary.count} txns)`);
  console.log(`Premium active: ${premium.premiumActive} | Trial active: ${premium.trialActiveGuru}`);
  console.log(`Commission attributions: ${commission.totalAttributions} | Commissions: ${commission.totalCommissions}`);
  console.log(`UKBI questions: ${simulation.ukbiQuestions} | TKA: ${simulation.tkaQuestions}`);
  console.log("═".repeat(60));

  await prisma.$disconnect();
  console.log("\n✅ Audit complete. DB disconnected.");
}

main().catch(async (e) => {
  console.error("❌ Audit failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
