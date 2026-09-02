#!/usr/bin/env tsx
/**
 * FOUNDER IDENTITY & ROLE SEPARATION AUDIT
 * READ-ONLY — NO PRODUCTION MUTATION
 *
 * Usage: npx tsx scripts/audit-founder-identity-role.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  FOUNDER IDENTITY & ROLE SEPARATION AUDIT");
  console.log("  READ-ONLY — NO PRODUCTION MUTATION");
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1-2: FIND ALL FOUNDERS + IDENTIFY ROLES
  // ═══════════════════════════════════════════════════════════════
  console.log("Section 1-2: Finding all founders...");
  const founders = await prisma.user.findMany({
    where: { isFounder: true },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isFounder: true,
      supabaseId: true,
      createdAt: true,
      updatedAt: true,
      isPremium: true,
      premiumPlan: true,
      premiumUntil: true,
    },
  });

  console.log(`  → ${founders.length} founders found\n`);

  for (const f of founders) {
    const profile = await prisma.profile.findUnique({ where: { userId: f.id } });
    const classCount = await prisma.group.count({ where: { teacherId: f.id } });
    const studentCount = await prisma.groupMember.count({ where: { group: { teacherId: f.id } } });
    const attributionCount = await prisma.teacherAttribution.count({ where: { teacherId: f.id } });
    const commissionCount = await prisma.teacherCommission.count({ where: { teacherId: f.id } });
    const commissionAgg = await prisma.teacherCommission.aggregate({ where: { teacherId: f.id }, _sum: { commissionAmount: true } });
    const walletCount = await prisma.teacherWallet.count({ where: { teacherId: f.id } });
    const premiumStudents = await prisma.user.count({ where: { isPremium: true, groupMemberships: { some: { group: { teacherId: f.id } } } } });
    const transactionCount = await prisma.transaksi.count({ where: { userId: f.id } });
    const aiUsageCount = await prisma.aIUsage.count({ where: { userId: f.id } });
    const gameResultCount = await prisma.gameResult.count({ where: { userId: f.id } });
    const karyaCount = await prisma.studentKarya.count({ where: { userId: f.id } });
    const assignmentCount = await prisma.penugasan.count({ where: { teacherId: f.id } });
    const quizCount = await prisma.quiz.count({ where: { creatorId: f.id } });
    const notificationCount = await prisma.notifikasi.count({ where: { userId: f.id } });

    console.log(`  ${f.email}:`);
    console.log(`    role=${f.role}, isFounder=${f.isFounder}, isPremium=${f.isPremium}`);
    console.log(`    classes=${classCount}, students=${studentCount}, commissions=${commissionCount}`);
    console.log(`    school=${profile?.school ?? "(none)"}, province=${profile?.province ?? "(none)"}`);
    console.log(`    supabaseId=${f.supabaseId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: COMMISSION IMPACT
  // ═══════════════════════════════════════════════════════════════
  console.log("\nSection 5: Commission impact...");
  console.log("  isEligibleForCommission: role === 'GURU' && !isFounder");
  for (const f of founders) {
    const eligible = f.role === "GURU" && !f.isFounder;
    console.log(`  ${f.email}: eligible=${eligible} (role=${f.role}, isFounder=${f.isFounder})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: CLASS IMPACT
  // ═══════════════════════════════════════════════════════════════
  console.log("\nSection 6: Class/teacher impact...");
  for (const f of founders) {
    const groups = await prisma.group.findMany({
      where: { teacherId: f.id },
      select: { name: true, _count: { select: { members: true } } },
    });
    console.log(`  ${f.email}: ${groups.length} classes`);
    for (const g of groups) {
      console.log(`    - ${g.name} (${g._count.members} students)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: DB MODEL
  // ═══════════════════════════════════════════════════════════════
  console.log("\nSection 9: Database model...");
  console.log("  Role enum: GURU | MURID | ADMIN (no FOUNDER)");
  console.log("  isFounder: Boolean field on User model");
  console.log("  Pattern: role + isFounder flag (not separate role)");

  // ═══════════════════════════════════════════════════════════════
  // SECTION 14: SECURITY
  // ═══════════════════════════════════════════════════════════════
  console.log("\nSection 14: Security check...");
  console.log("  If Dominikus changes role=GURU, isFounder=true:");
  console.log("  ✅ /guru/* access (via layout.tsx: isFounder bypass)");
  console.log("  ✅ /admin/* access (via layout.tsx: isFounder bypass)");
  console.log("  ✅ /murid/* access (via layout.tsx: isFounder bypass)");
  console.log("  ✅ /arena/* access (via layout.tsx: isFounder bypass)");
  console.log("  ⚠️  Commission: still blocked (isFounder=true → excluded)");
  console.log("  ⚠️  Plan: still FOUNDER (isFounder → unlimited)");
  console.log("  ⚠️  Admin routes: still accessible (isFounder bypass)");
  console.log("  ⚠️  XP/coin admin: still accessible (isFounder bypass)");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  AUDIT COMPLETE");
  console.log("  Production mutation: NONE");
  console.log("═══════════════════════════════════════════════════════════════");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
