#!/usr/bin/env npx tsx
/**
 * PRODUCTION TRUTH AUDIT — September 2026
 * 
 * Queries the live production Supabase database to populate
 * the Investor Truth Base metrics table.
 * 
 * Output: VERIFIED / HISTORICAL / UNVERIFIED per metric.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Manually load .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local not found, rely on shell env */ }

import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not found. Check .env.local");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const now = new Date();
const WIB_OFFSET = 7 * 60 * 60 * 1000;
const nowWIB = new Date(now.getTime() + WIB_OFFSET);
const todayWIB = nowWIB.toISOString().split("T")[0];

function fmt(n: number): string {
  return n.toLocaleString("id-ID");
}

interface Metric {
  name: string;
  value: string;
  period: string;
  source: string;
  status: "VERIFIED" | "HISTORICAL" | "UNVERIFIED" | "AUDIT_NEEDED";
}

const metrics: Metric[] = [];

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  BAHASACERDAS — PRODUCTION TRUTH AUDIT");
  console.log(`  Date: ${todayWIB} WIB`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // ─── 1. USER BASE ───────────────────────────────────────────
  console.log("── 1. USER BASE ──");

  const totalUsers = await prisma.user.count();
  console.log(`  Total registered users: ${fmt(totalUsers)}`);

  const byRole = await prisma.user.groupBy({ by: ["role"], _count: true });
  const roleMap = Object.fromEntries(byRole.map(r => [r.role, r._count]));
  console.log(`  By role: ${JSON.stringify(roleMap)}`);

  const founders = await prisma.user.count({ where: { isFounder: true } });
  console.log(`  Founders: ${founders}`);

  const premiumUsers = await prisma.user.count({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false },
  });
  console.log(`  Pro berbayar aktif: ${premiumUsers}`);

  const trialActive = await prisma.user.count({
    where: { role: "GURU", trialEndsAt: { gt: now } },
  });
  console.log(`  Guru trial aktif: ${trialActive}`);

  metrics.push(
    { name: "Registered Users", value: fmt(totalUsers), period: todayWIB, source: "Production DB (User)", status: "VERIFIED" },
    { name: "Students (MURID)", value: fmt(roleMap["MURID"] || 0), period: todayWIB, source: "Production DB (User)", status: "VERIFIED" },
    { name: "Teachers (GURU)", value: fmt(roleMap["GURU"] || 0), period: todayWIB, source: "Production DB (User)", status: "VERIFIED" },
    { name: "Admins (ADMIN)", value: fmt(roleMap["ADMIN"] || 0), period: todayWIB, source: "Production DB (User)", status: "VERIFIED" },
    { name: "Paying Teachers (Pro)", value: fmt(premiumUsers), period: todayWIB, source: "Production DB (User)", status: "VERIFIED" },
    { name: "Guru Trial Active", value: fmt(trialActive), period: todayWIB, source: "Production DB (User)", status: "VERIFIED" },
  );

  // ─── 2. ACTIVE USERS ────────────────────────────────────────
  console.log("\n── 2. ACTIVE USERS ──");

  // Check last 7 days and 30 days from XPTransaction and GameResult
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const active7d = await prisma.xPTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: sevenDaysAgo } },
  });
  console.log(`  Active 7d (XP): ${fmt(active7d.length)}`);

  const active30d = await prisma.xPTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: thirtyDaysAgo } },
  });
  console.log(`  Active 30d (XP): ${fmt(active30d.length)}`);

  metrics.push(
    { name: "Active Users (7d)", value: fmt(active7d.length), period: "7d rolling", source: "XPTransaction", status: "VERIFIED" },
    { name: "Active Users (30d)", value: fmt(active30d.length), period: "30d rolling", source: "XPTransaction", status: "VERIFIED" },
  );

  // ─── 3. TEACHER VALUE ──────────────────────────────────────
  console.log("\n── 3. TEACHER VALUE ──");

  const aiUsageCount = await prisma.aIUsage.count();
  console.log(`  Total AI usage records: ${fmt(aiUsageCount)}`);

  const aiUsageByFeature = await prisma.aIUsage.groupBy({
    by: ["feature"],
    _count: true,
    orderBy: { _count: { feature: "desc" } },
  });
  console.log(`  AI usage by feature:`);
  for (const f of aiUsageByFeature) {
    console.log(`    ${f.feature}: ${f._count}`);
  }

  // AIUsage stores feature as "agent:<agentId>" (see src/ai/core/usage-logger.ts).
  // Query with startsWith to match all agent-prefixed features, then group manually.
  const rppGenerated = await prisma.aIUsage.count({ where: { feature: { startsWith: "agent:" } } });
  // Group agent features for breakdown
  const agentFeatures = await prisma.aIUsage.groupBy({
    by: ["feature"],
    where: { feature: { startsWith: "agent:" } },
    _count: true,
    orderBy: { _count: { feature: "desc" } },
  });
  const agentBreakdown = agentFeatures.map(f => ({
    feature: f.feature.replace("agent:", ""),
    count: f._count,
  }));
  console.log(`  Agent usage breakdown:`);
  for (const a of agentBreakdown) {
    console.log(`    ${a.feature}: ${a.count}`);
  }

  metrics.push(
    { name: "AI Generations (total)", value: fmt(aiUsageCount), period: "all-time", source: "AIUsage", status: "VERIFIED" },
    { name: "Agent Usage (all agents)", value: fmt(rppGenerated), period: "all-time", source: "AIUsage (feature=agent:*)", status: "VERIFIED" },
    ...agentBreakdown.map(a => ({
      name: `Agent: ${a.feature}`,
      value: fmt(a.count),
      period: "all-time",
      source: `AIUsage (feature=agent:${a.feature})`,
      status: "VERIFIED" as const,
    })),
  );

// Teacher-created groups
const groups = await prisma.group.count();
console.log(`  Groups (classes): ${fmt(groups)}`);

  // ─── 4. STUDENT VALUE ──────────────────────────────────────
  console.log("\n── 4. STUDENT VALUE ──");

  const jalurProgress = await prisma.userUnitProgress.count();
  const jalurCompleted = await prisma.userUnitProgress.count({ where: { completed: true } });
  console.log(`  Jalur Cerdas progress: ${fmt(jalurProgress)} (completed: ${fmt(jalurCompleted)})`);

  const karyaCount = await prisma.studentKarya.count();
  const karyaByType = await prisma.studentKarya.groupBy({ by: ["type"], _count: true });
  console.log(`  Karya (student): ${fmt(karyaCount)}`);
  for (const k of karyaByType) {
    console.log(`    ${k.type}: ${k._count}`);
  }

  const quizSubmissions = await prisma.quizSubmission.count();
  const quizSubmissionsCompleted = await prisma.quizSubmission.count({ where: { status: "GRADED" } });
  console.log(`  Quiz submissions: ${fmt(quizSubmissions)} (graded: ${fmt(quizSubmissionsCompleted)})`);

  const penugasanSubmissions = await prisma.penugasanSubmission.count();
  const penugasanCompleted = await prisma.penugasanSubmission.count({ where: { status: "COMPLETED" } });
  console.log(`  Penugasan submissions: ${fmt(penugasanSubmissions)} (completed: ${fmt(penugasanCompleted)})`);

  metrics.push(
    { name: "Learning Events (Jalur Cerdas)", value: fmt(jalurProgress), period: "all-time", source: "UserUnitProgress", status: "VERIFIED" },
    { name: "Completed Learning Units", value: fmt(jalurCompleted), period: "all-time", source: "UserUnitProgress", status: "VERIFIED" },
    { name: "Student Karya", value: fmt(karyaCount), period: "all-time", source: "StudentKarya", status: "VERIFIED" },
    { name: "Quiz Submissions", value: fmt(quizSubmissions), period: "all-time", source: "QuizSubmission", status: "VERIFIED" },
    { name: "Penugasan Submissions", value: fmt(penugasanSubmissions), period: "all-time", source: "PenugasanSubmission", status: "VERIFIED" },
  );

  // ─── 5. GAMIFICATION ───────────────────────────────────────
  console.log("\n── 5. GAMIFICATION ──");

  const totalXP = await prisma.xPTransaction.aggregate({ _sum: { amount: true } });
  console.log(`  Total XP awarded: ${fmt(totalXP._sum.amount || 0)}`);

  const xpBySource = await prisma.xPTransaction.groupBy({
    by: ["source"],
    _count: true,
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  console.log(`  XP by source:`);
  for (const s of xpBySource) {
    console.log(`    ${s.source}: ${s._sum.amount} XP (${s._count} txns)`);
  }

  const coinTxns = await prisma.coinTransaction.count();
  const totalCoins = await prisma.coinTransaction.aggregate({ _sum: { amount: true } });
  console.log(`  Coin transactions: ${fmt(coinTxns)}, total coins: ${fmt(totalCoins._sum.amount || 0)}`);

  const badges = await prisma.userBadge.count();
  console.log(`  Badges earned: ${fmt(badges)}`);

  const achievements = await prisma.userAchievement.count();
  const achievementsClaimed = await prisma.userAchievement.count({ where: { claimed: true } });
  console.log(`  Achievements: ${fmt(achievements)} (claimed: ${fmt(achievementsClaimed)})`);

  // Player profiles
  const playerProfiles = await prisma.playerProfile.count();
  console.log(`  Player profiles: ${fmt(playerProfiles)}`);

  // Rank distribution
  const rankDist = await prisma.playerProfile.groupBy({ by: ["currentRank"], _count: true });
  console.log(`  Rank distribution:`);
  for (const r of rankDist) {
    console.log(`    ${r.currentRank}: ${r._count}`);
  }

  metrics.push(
    { name: "Total XP Awarded", value: fmt(totalXP._sum.amount || 0), period: "all-time", source: "XPTransaction", status: "VERIFIED" },
    { name: "Coin Transactions", value: fmt(coinTxns), period: "all-time", source: "CoinTransaction", status: "VERIFIED" },
    { name: "Badges Earned", value: fmt(badges), period: "all-time", source: "UserBadge", status: "VERIFIED" },
    { name: "Achievements Claimed", value: fmt(achievementsClaimed), period: "all-time", source: "UserAchievement", status: "VERIFIED" },
    { name: "Player Profiles", value: fmt(playerProfiles), period: todayWIB, source: "PlayerProfile", status: "VERIFIED" },
  );

  // ─── 6. ASSESSMENT ─────────────────────────────────────────
  console.log("\n── 6. ASSESSMENT ──");

  const ukbiSessions = await prisma.progresKompetensi.count();
  const ukbiCompleted = await prisma.progresKompetensi.count({ where: { status: "COMPLETED" } });
  console.log(`  UKBI sessions: ${fmt(ukbiSessions)} (completed: ${fmt(ukbiCompleted)})`);

  const adaptiveSessions = await prisma.adaptivePracticeSession.count();
  const adaptiveCompleted = await prisma.adaptivePracticeSession.count({ where: { status: "COMPLETED" } });
  console.log(`  Adaptive sessions: ${fmt(adaptiveSessions)} (completed: ${fmt(adaptiveCompleted)})`);

  const diagnosticSessions = await prisma.adaptivePracticeSession.count({ where: { reasonCode: "DIAGNOSTIC" } });
  console.log(`  Diagnostic sessions: ${fmt(diagnosticSessions)}`);

  metrics.push(
    { name: "UKBI/TKA Sessions", value: fmt(ukbiSessions), period: "all-time", source: "ProgresKompetensi", status: "VERIFIED" },
    { name: "UKBI/TKA Completed", value: fmt(ukbiCompleted), period: "all-time", source: "ProgresKompetensi", status: "VERIFIED" },
    { name: "Adaptive Practice Sessions", value: fmt(adaptiveSessions), period: "all-time", source: "AdaptivePracticeSession", status: "VERIFIED" },
    { name: "Diagnostic Sessions", value: fmt(diagnosticSessions), period: "all-time", source: "AdaptivePracticeSession", status: "VERIFIED" },
  );

  // ─── 7. PAYMENT / REVENUE ─────────────────────────────────
  console.log("\n── 7. PAYMENT / REVENUE ──");

  const transactions = await prisma.transaksi.findMany();
  const successTxns = transactions.filter(t => t.status === "SUCCESS");
  const totalRevenue = successTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
  console.log(`  Total transactions: ${fmt(transactions.length)} (success: ${fmt(successTxns.length)})`);
  console.log(`  Total revenue: Rp ${fmt(totalRevenue)}`);

  const txnsByType = await prisma.transaksi.groupBy({
    by: ["type"],
    _count: true,
    _sum: { amount: true },
  });
  console.log(`  Transactions by type:`);
  for (const t of txnsByType) {
    console.log(`    ${t.type}: ${t._count} txns, Rp ${fmt(t._sum.amount || 0)}`);
  }

  metrics.push(
    { name: "Transactions (total)", value: fmt(transactions.length), period: "all-time", source: "Transaksi", status: "VERIFIED" },
    { name: "Transactions (success)", value: fmt(successTxns.length), period: "all-time", source: "Transaksi", status: "VERIFIED" },
    { name: "Total Revenue", value: `Rp ${fmt(totalRevenue)}`, period: "all-time", source: "Transaksi", status: "VERIFIED" },
  );

  // ─── 8. GAME SYSTEM ────────────────────────────────────────
  console.log("\n── 8. GAME SYSTEM ──");

  const gameResults = await prisma.gameResult.count();
  const gameSessions = await prisma.gameSession.count();
  console.log(`  Game results: ${fmt(gameResults)}, sessions: ${fmt(gameSessions)}`);

const gameResultsByRoom = await prisma.gameRoom.groupBy({
  by: ["gameType"],
  _count: { id: true },
  orderBy: { _count: { id: "desc" } },
});
console.log(`  Game results by room type:`);
for (const g of gameResultsByRoom) {
  console.log(`    ${g.gameType}: ${g._count.id} rooms`);
}

  metrics.push(
    { name: "Game Results", value: fmt(gameResults), period: "all-time", source: "GameResult", status: "VERIFIED" },
    { name: "Game Sessions", value: fmt(gameSessions), period: "all-time", source: "GameSession", status: "VERIFIED" },
  );

  // ─── 9. QUESTION BANKS ─────────────────────────────────────
  console.log("\n── 9. QUESTION BANKS ──");

  const soalCount = await prisma.soal.count();
  console.log(`  Soal (bank soal): ${fmt(soalCount)}`);

  const soalByType = await prisma.soal.groupBy({ by: ["type"], _count: true });
console.log(`  Soal by type:`);
for (const s of soalByType) {
  console.log(`    ${s.type}: ${s._count}`);
}

  const quizzes = await prisma.quiz.count();
  const quizByType = await prisma.quiz.groupBy({ by: ["type"], _count: true });
  console.log(`  Quizzes: ${fmt(quizzes)}`);
  for (const q of quizByType) {
    console.log(`    ${q.type}: ${q._count}`);
  }

  metrics.push(
    { name: "Soal (bank soal)", value: fmt(soalCount), period: todayWIB, source: "Soal", status: "VERIFIED" },
    { name: "Quizzes", value: fmt(quizzes), period: todayWIB, source: "Quiz", status: "VERIFIED" },
  );

  // ─── 10. LEARNING CONTENT ──────────────────────────────────
  console.log("\n── 10. LEARNING CONTENT ──");

  const levels = await prisma.learningLevel.count();
  const jalurLevels = await prisma.learningLevel.count({ where: { type: "JALUR" } });
  const panduanLevels = await prisma.learningLevel.count({ where: { type: "PANDUAN" } });
  const units = await prisma.learningUnit.count();
  console.log(`  Levels: ${fmt(levels)} (Jalur: ${jalurLevels}, Panduan: ${panduanLevels})`);
  console.log(`  Units: ${fmt(units)}`);

  // ─── 11. COMMUNITY ──────────────────────────────────────────
  console.log("\n── 11. COMMUNITY ──");

  const communities = await prisma.community.count();
  const communityPosts = await prisma.communityPost.count();
  console.log(`  Communities: ${fmt(communities)}, posts: ${fmt(communityPosts)}`);

  // ─── 12. PENUGASAN (ASSIGNMENTS) ───────────────────────────
  console.log("\n── 12. PENUGASAN (ASSIGNMENTS) ──");

  const penugasan = await prisma.penugasan.count();
  console.log(`  Penugasan (assignments): ${fmt(penugasan)}`);

  // ─── 13. LEARNING EVIDENCE ─────────────────────────────────
  console.log("\n── 13. LEARNING EVIDENCE ──");

  const evidence = await prisma.learningEvidence.count();
  console.log(`  Learning evidence: ${fmt(evidence)}`);

  // ─── 14. LEARNER STATE ─────────────────────────────────────
  console.log("\n── 14. LEARNER STATE ──");

  try {
    const learnerStates = await (prisma as any).learnerState?.count() ?? 0;
    console.log(`  Learner states: ${fmt(learnerStates)}`);
  } catch {
    console.log(`  Learner states: N/A (model may not exist)`);
  }

  // ─── 15. PREMIUM ECONOMY ───────────────────────────────────
  console.log("\n── 15. PREMIUM ECONOMY ──");

  const premiumUsage = await prisma.premiumUsage.count();
  console.log(`  Premium usage records: ${fmt(premiumUsage)}`);

  // ─── 16. SCHOOLS (from Group + Profile) ─────────────────────
  console.log("\n── 16. SCHOOLS & CLASSROOMS ──");

  const schoolProfiles = await prisma.profile.findMany({
    where: { school: { not: null } },
    select: { school: true },
    distinct: ["school"],
  });
  const uniqueSchools = schoolProfiles.filter(p => p.school && p.school.trim() !== "").map(p => p.school!);
  const uniqueSchoolCount = new Set(uniqueSchools).size;
  console.log(`  Unique school names in profiles: ${fmt(uniqueSchoolCount)}`);

  const groupCount = await prisma.group.count();
  const groupMembers = await prisma.groupMember.count();
  console.log(`  Groups (classes): ${fmt(groupCount)}`);
  console.log(`  Group members (enrollments): ${fmt(groupMembers)}`);

  metrics.push(
    { name: "Unique School Names", value: fmt(uniqueSchoolCount), period: todayWIB, source: "Profile.school", status: "VERIFIED" },
    { name: "Groups (classes)", value: fmt(groupCount), period: todayWIB, source: "Group", status: "VERIFIED" },
    { name: "Group Members", value: fmt(groupMembers), period: todayWIB, source: "GroupMember", status: "VERIFIED" },
  );

  // ─── 17. SCHOOL MODEL (if School table exists) ─────────────
  try {
    const schoolCount = await (prisma as any).school?.count() ?? 0;
    console.log(`  School records: ${fmt(schoolCount)}`);
    metrics.push({ name: "School Records", value: fmt(schoolCount), period: todayWIB, source: "School", status: "VERIFIED" });
  } catch {
    console.log(`  School records: N/A (table may not exist)`);
  }

  // ─── 18. DAILY ACTIVITY (last 7 days) ──────────────────────
  console.log("\n── 18. DAILY ACTIVITY (last 7 days) ──");

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

    const dayXP = await prisma.xPTransaction.count({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    });
    const dayUsers = await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    });
    const dayStr = dayEnd.toISOString().split("T")[0];
    console.log(`  ${dayStr}: ${dayUsers.length} users, ${dayXP} XP events`);
  }

  // ─── 19. LEARNING SKILLS ───────────────────────────────────
  console.log("\n── 19. LEARNING SKILLS ──");

  try {
    const skills = await (prisma as any).learningSkill?.count() ?? 0;
    console.log(`  Learning skill records: ${fmt(skills)}`);
  } catch {
    console.log(`  Learning skill records: N/A`);
  }

  // ─── 20. NOTIFIKASI ────────────────────────────────────────
  console.log("\n── 20. NOTIFIKASI ──");

  try {
    const notifCount = await (prisma as any).notifikasi?.count() ?? 0;
    console.log(`  Notifications: ${fmt(notifCount)}`);
  } catch {
    console.log(`  Notifications: N/A`);
  }

  // ─── 21. RETENTION (D7/D30) ───────────────────────────────
  console.log("\n── 21. RETENTION (D7/D30) ──");

  // Retention = of users who registered in cohort week, how many were active (XP) in week+N?
  // We use 4-week cohorts: W0 (4w ago), W1 (3w ago), W2 (2w ago), W3 (1w ago)
  const cohortWeeks = [
    { label: "W-4 (4w ago)", offsetWeeks: 4 },
    { label: "W-3 (3w ago)", offsetWeeks: 3 },
    { label: "W-2 (2w ago)", offsetWeeks: 2 },
    { label: "W-1 (1w ago)", offsetWeeks: 1 },
  ];

  for (const cohort of cohortWeeks) {
    const weekStartMs = now.getTime() - cohort.offsetWeeks * 7 * 24 * 60 * 60 * 1000;
    const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
    const weekStart = new Date(weekStartMs);
    const weekEnd = new Date(weekEndMs);

    // Users registered in this cohort week
    const cohortUsers = await prisma.user.findMany({
      where: { createdAt: { gte: weekStart, lt: weekEnd } },
      select: { id: true },
    });
    const cohortCount = cohortUsers.length;
    if (cohortCount === 0) {
      console.log(`  ${cohort.label}: 0 users registered, skipping`);
      continue;
    }
    const cohortIds = new Set(cohortUsers.map(u => u.id));

    // D7 retention: active in the SAME week as registration
    const d7Active = await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: weekStart, lt: weekEnd }, userId: { in: [...cohortIds] } },
    });
    const d7Count = d7Active.length;
    const d7Pct = cohortCount > 0 ? Math.round((d7Count / cohortCount) * 100) : 0;

    // D30 retention: active any time AFTER registration week
    const postWeekStart = weekEnd;
    const d30Active = await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: postWeekStart }, userId: { in: [...cohortIds] } },
    });
    const d30Count = d30Active.length;
    const d30Pct = cohortCount > 0 ? Math.round((d30Count / cohortCount) * 100) : 0;

    console.log(`  ${cohort.label}: ${cohortCount} registered, D7=${d7Count} (${d7Pct}%), D30=${d30Count} (${d30Pct}%)`);

    metrics.push(
      { name: `Retention D7 (${cohort.label})`, value: `${d7Pct}% (${d7Count}/${cohortCount})`, period: cohort.label, source: "User+XPTransaction", status: "VERIFIED" },
      { name: `Retention D30 (${cohort.label})`, value: `${d30Pct}% (${d30Count}/${cohortCount})`, period: cohort.label, source: "User+XPTransaction", status: "VERIFIED" },
    );
  }

  // ─── 22. MRR (Monthly Recurring Revenue) ──────────────────
  console.log("\n── 22. MRR (Monthly Recurring Revenue) ──
");

  // Group successful transactions by month
  const allSuccessTxns = await prisma.transaksi.findMany({
    where: { status: "SUCCESS" },
    select: { amount: true, createdAt: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  const monthlyRevenue: Record<string, { total: number; count: number; types: Record<string, number> }> = {};
  for (const t of allSuccessTxns) {
    const month = t.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyRevenue[month]) monthlyRevenue[month] = { total: 0, count: 0, types: {} };
    monthlyRevenue[month].total += t.amount || 0;
    monthlyRevenue[month].count += 1;
    monthlyRevenue[month].types[t.type] = (monthlyRevenue[month].types[t.type] || 0) + 1;
  }

  for (const [month, data] of Object.entries(monthlyRevenue)) {
    console.log(`  ${month}: Rp ${fmt(data.total)} (${data.count} txns) ${JSON.stringify(data.types)}`);
    metrics.push(
      { name: `MRR (${month})`, value: `Rp ${fmt(data.total)}`, period: month, source: "Transaksi (SUCCESS)", status: "VERIFIED" },
    );
  }

  // Current MRR (last month with transactions)
  const latestMonth = Object.keys(monthlyRevenue).pop();
  if (latestMonth) {
    const currentMRR = monthlyRevenue[latestMonth].total;
    console.log(`  Current MRR: Rp ${fmt(currentMRR)} (${latestMonth})`);
    metrics.push(
      { name: "Current MRR", value: `Rp ${fmt(currentMRR)}`, period: latestMonth, source: "Transaksi (SUCCESS)", status: "VERIFIED" },
    );
  }

  // ─── 23. SUPABASE PROJECT INVENTORY ──────────────────────
  console.log("\n── 23. SUPABASE PROJECT INVENTORY ──
");
  console.log("  NOTE: Run 'npx supabase projects list' manually to check for unused projects.");
  console.log("  Known projects: Bahasa Cerdas DB (prod), bahasa-cerdas-staging, sepedamania");
  console.log("  ACTION: Pause any unused Pro-plan projects to save $25/month each.");

  // ═══════════════════════════════════════════════════════════
  // SUMMARY TABLE
  // ═══════════════════════════════════════════════════════════
  console.log("\n\n═══════════════════════════════════════════════════════════");
  console.log("  INVESTOR TRUTH METRICS TABLE");
  console.log("═══════════════════════════════════════════════════════════\n");

  const header = `| Metric | Value | Period | Source | Status |`;
  const separator = `| --- | ---: | --- | --- | --- |`;
  console.log(header);
  console.log(separator);
  for (const m of metrics) {
    const icon = m.status === "VERIFIED" ? "🟢" : m.status === "HISTORICAL" ? "🟡" : "🔴";
    console.log(`| ${m.name} | ${m.value} | ${m.period} | ${m.source} | ${icon} ${m.status} |`);
  }

  // Write JSON report
  const report = {
    generatedAt: nowWIB.toISOString(),
    period: todayWIB,
    metrics: metrics.map(m => ({
      name: m.name,
      value: m.value,
      period: m.period,
      source: m.source,
      status: m.status,
    })),
  };

  const fs = await import("fs");
  fs.writeFileSync(
    "data/production-truth-audit.json",
    JSON.stringify(report, null, 2),
  );
  console.log(`\n✅ Report saved to data/production-truth-audit.json`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
