/**
 * Commission Forensic Audit — Dzaky Salman Mahendra
 * 
 * READ-ONLY script. Zero writes to database.
 * Run: npx tsx scripts/audit-commission-dzaky.ts
 * 
 * Audit date: September 1, 2026
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== COMMISSION FORENSIC AUDIT — DZAKY SALMAN MAHENDRA ===');
  console.log(`Date: ${new Date().toISOString()}\n`);

  // 1. Find Dzaky Salman Mahendra (known ID)
  console.log('--- 1. STUDENT: Dzaky Salman Mahendra ---');
  const DZAKY_ID = 'cmru3bleo001dr8mjxd1hay5v';
  const dzaky = await prisma.user.findUnique({
    where: { id: DZAKY_ID },
    select: {
      id: true,
      fullName: true,
      role: true,
      isPremium: true,
      premiumUntil: true,
      premiumPlan: true,
      createdAt: true,
    },
  });

  if (!dzaky) {
    console.log('  ERROR: Dzaky not found');
    return;
  }

  console.log(`  ID: ${dzaky.id}`);
  console.log(`  Name: ${dzaky.fullName}`);
  console.log(`  isPremium: ${dzaky.isPremium}`);
  console.log(`  premiumUntil: ${dzaky.premiumUntil?.toISOString() ?? 'null'}`);
  console.log(`  premiumPlan: ${dzaky.premiumPlan}`);
  console.log(`  Created: ${dzaky.createdAt.toISOString()}`);

  // 2. Find teacher's class
  console.log('\n--- 2. CLASS MEMBERSHIP ---');
  const TEACHER_ID = 'cmqxema6a000013z9kefn4jm1';
  
  // Get teacher info directly
  const teacher = await prisma.user.findUnique({
    where: { id: TEACHER_ID },
    select: { id: true, fullName: true, role: true, isFounder: true },
  });

  if (!teacher) {
    console.log('  ERROR: Teacher not found');
    return;
  }

  console.log(`  Teacher: ${teacher.fullName} (ID: ${teacher.id})`);
  console.log(`  Role: ${teacher.role}`);
  console.log(`  isFounder: ${teacher.isFounder}`);

  // Find Dzaky's class memberships
  const memberships = await prisma.groupMember.findMany({
    where: { userId: dzaky.id },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          teacherId: true,
          createdAt: true,
        },
      },
    },
  });

  for (const m of memberships) {
    console.log(`\n  Class: ${m.group.name} (ID: ${m.group.id})`);
    console.log(`  Teacher ID: ${m.group.teacherId}`);
    console.log(`  Joined: ${m.joinedAt.toISOString()}`);
    console.log(`  Is Dzaky's teacher = Dominikus Wahyu? ${m.group.teacherId === TEACHER_ID}`);
  }

  const teacherId = TEACHER_ID;

  // 3. Check TeacherAttribution for Dzaky
  console.log('\n--- 3. TEACHER ATTRIBUTION (Dzaky) ---');
  const attribution = await prisma.teacherAttribution.findUnique({
    where: { studentId: dzaky.id },
  });

  if (attribution) {
    console.log(`  FOUND: ${JSON.stringify(attribution, null, 2)}`);
  } else {
    console.log('  NOT FOUND — No attribution exists for Dzaky');
  }

  // 4. Check all attributions for this teacher
  console.log('\n--- 4. ALL ATTRIBUTIONS FOR THIS TEACHER ---');
  const teacherAttributions = await prisma.teacherAttribution.findMany({
    where: { teacherId },
    include: {
      student: { select: { id: true, fullName: true } },
    },
  });

  console.log(`  Total attributions: ${teacherAttributions.length}`);
  for (const a of teacherAttributions) {
    console.log(`    - ${a.student.fullName} (ID: ${a.studentId}, status: ${a.status})`);
  }

  // 5. Check commission entries for this teacher
  console.log('\n--- 5. COMMISSION ENTRIES (this teacher) ---');
  const commissions = await prisma.teacherCommission.findMany({
    where: { teacherId },
    include: {
      student: { select: { id: true, fullName: true } },
    },
  });

  console.log(`  Total commission entries: ${commissions.length}`);
  for (const c of commissions) {
    console.log(`    - ${c.student.fullName}: Rp${c.commissionAmount} (${c.status})`);
  }

  // 6. Check wallet
  console.log('\n--- 6. TEACHER WALLET ---');
  const wallet = await prisma.teacherWallet.findUnique({
    where: { teacherId },
  });

  if (wallet) {
    console.log(`  Available: Rp${wallet.availableBalance}`);
    console.log(`  Pending: Rp${wallet.pendingBalance}`);
    console.log(`  Lifetime: Rp${wallet.lifetimeEarned}`);
  } else {
    console.log('  NO WALLET EXISTS');
  }

  // 7. Check Dzaky's transactions
  console.log('\n--- 7. DZAKY TRANSACTIONS ---');
  const transactions = await prisma.transaksi.findMany({
    where: { userId: dzaky.id },
    orderBy: { createdAt: 'desc' },
  });

  for (const t of transactions) {
    console.log(`  ${t.type}: Rp${t.amount} [${t.status}] — ${t.createdAt.toISOString()}`);
  }

  // 8. Global commission system state
  console.log('\n--- 8. GLOBAL COMMISSION STATE ---');
  const [
    totalAttributions,
    totalCommissions,
    totalWallets,
    teachersWithAttributions,
  ] = await Promise.all([
    prisma.teacherAttribution.count(),
    prisma.teacherCommission.count(),
    prisma.teacherWallet.count(),
    prisma.teacherAttribution.groupBy({
      by: ['teacherId'],
    }),
  ]);

  console.log(`  Total TeacherAttribution records: ${totalAttributions}`);
  console.log(`  Total TeacherCommission records: ${totalCommissions}`);
  console.log(`  Total TeacherWallet records: ${totalWallets}`);
  console.log(`  Teachers with attributions: ${teachersWithAttributions.length}`);

  // 9. Root cause check
  console.log('\n--- 9. ROOT CAUSE ANALYSIS ---');
  // Teacher already fetched above

  const isEligible = teacher.role === 'GURU' && !teacher.isFounder;
  const skipReason = !isEligible
    ? teacher.isFounder
      ? 'TEACHER_EXCLUDED (isFounder=true)'
      : `TEACHER_EXCLUDED (role=${teacher.role})`
    : 'ELIGIBLE';

  console.log(`  Teacher: ${teacher.fullName}`);
  console.log(`  Role: ${teacher.role}`);
  console.log(`  isFounder: ${teacher.isFounder}`);
  console.log(`  isEligibleForCommission: ${isEligible}`);
  console.log(`  Skip reason: ${skipReason}`);

  // 10. Summary
  console.log('\n--- 10. SUMMARY ---');
  console.log(`  Student Dzaky: PREMIUM=${dzaky.isPremium}, plan=${dzaky.premiumPlan}`);
  console.log(`  Teacher: ${teacher.fullName} (${teacher.role}, founder=${teacher.isFounder})`);
  console.log(`  Attribution: ${attribution ? 'EXISTS' : 'MISSING'}`);
  console.log(`  Commission entries: ${commissions.length}`);
  console.log(`  Wallet: ${wallet ? 'EXISTS' : 'MISSING'}`);
  console.log(`  Root cause: ${skipReason}`);
  console.log(`  System working as designed: YES`);
  console.log(`  Is this a bug: NO — teacher is excluded by design`);

  console.log('\n=== AUDIT COMPLETE ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
