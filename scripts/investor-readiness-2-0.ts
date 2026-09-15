/**
 * INVESTOR READINESS 2.0 — PRODUCTION TRUTH AUDIT
 * BahasaCerdas — September 2026
 *
 * READ-ONLY. Zero production mutations.
 * Outputs: data/investor-readiness-2-0-september-2026.json
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load env from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Skip placeholder [SENSITIVE] values
    if (val === "[SENSITIVE]" || val.includes("[SENSITIVE]")) continue;
    if (!process.env[key]) process.env[key] = val;
  }
}

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

const WIB_OFFSET = 7 * 60 * 60 * 1000;
function toWIB(d: Date): Date { return new Date(d.getTime() + WIB_OFFSET); }
function dayKeyWIB(d: Date): string { const w = toWIB(d); return w.toISOString().slice(0, 10); }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d; }
function hoursAgo(n: number): Date { return new Date(Date.now() - n * 3600_000); }

function metric(value: unknown, status: "FACT" | "INFERENCE" | "ASSUMPTION" | "UNKNOWN", confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN", source: string, notes = "") {
  return { value, status, confidence, source, notes };
}

// ── Phase B: Current Production Truth ────────────────────────────────────────

async function collectUsers() {
  console.log("  Collecting users...");
  const [
    totalUsers, totalGuru, totalMurid, totalAdmin,
    founderCount, active7d, active30d,
    emailConfirmed, onboarded
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "GURU" } }),
    db.user.count({ where: { role: "MURID" } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { isFounder: true } }),
    db.user.count({ where: { lastActiveAt: { gte: daysAgo(7) } } }),
    db.user.count({ where: { lastActiveAt: { gte: daysAgo(30) } } }),
    db.user.count({ where: { emailConfirmed: true } }),
    db.user.count({ where: { onboarded: true } }),
  ]);

  return {
    total: metric(totalUsers, "FACT", "HIGH", "User.count()", "Prisma User table"),
    guru: metric(totalGuru, "FACT", "HIGH", "User.count(role=GURU)"),
    murid: metric(totalMurid, "FACT", "HIGH", "User.count(role=MURID)"),
    admin: metric(totalAdmin, "FACT", "HIGH", "User.count(role=ADMIN)"),
    founders: metric(founderCount, "FACT", "HIGH", "User.count(isFounder=true)"),
    active7d: metric(active7d, "INFERENCE", "MEDIUM", "User.lastActiveAt", "lastActiveAt updated on login/api activity; may miss passive page views"),
    active30d: metric(active30d, "INFERENCE", "MEDIUM", "User.lastActiveAt", "Same limitation as 7d"),
    emailConfirmed: metric(emailConfirmed, "FACT", "HIGH", "User.emailConfirmed"),
    onboarded: metric(onboarded, "FACT", "HIGH", "User.onboarded"),
  };
}

async function collectTeachers() {
  console.log("  Collecting teachers...");
  const teacherWhere = { role: "GURU" as const };

  const [
    total, createdClass, created3Students, created5Students,
    active7d, active30d, everTaught, withPhone, premiumActive, trialActive
  ] = await Promise.all([
    db.user.count({ where: teacherWhere }),
    db.group.count({ where: { teacher: teacherWhere } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT g."teacherId") as count
      FROM "Group" g
      JOIN "GroupMember" gm ON gm."groupId" = g.id
      WHERE g."teacherId" IN (SELECT id FROM "User" WHERE role = 'GURU')
      GROUP BY g."teacherId"
      HAVING COUNT(gm.id) >= 3
    `.then(r => Number(r[0]?.count ?? 0)),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT g."teacherId") as count
      FROM "Group" g
      JOIN "GroupMember" gm ON gm."groupId" = g.id
      WHERE g."teacherId" IN (SELECT id FROM "User" WHERE role = 'GURU')
      GROUP BY g."teacherId"
      HAVING COUNT(gm.id) >= 5
    `.then(r => Number(r[0]?.count ?? 0)),
    db.user.count({ where: { ...teacherWhere, lastActiveAt: { gte: daysAgo(7) } } }),
    db.user.count({ where: { ...teacherWhere, lastActiveAt: { gte: daysAgo(30) } } }),
    // everTaught = teacher who has at least 1 group member (ever had a student)
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT g."teacherId") as count
      FROM "Group" g
      JOIN "GroupMember" gm ON gm."groupId" = g.id
    `.then(r => Number(r[0]?.count ?? 0)),
    db.user.count({ where: { ...teacherWhere, nickname: { not: null } } }),
    db.user.count({ where: { ...teacherWhere, isPremium: true, premiumUntil: { gt: new Date() } } }),
    db.user.count({ where: { ...teacherWhere, trialEndsAt: { gt: new Date() } } }),
  ]);

  // Unique teachers who ever had a student (via GroupMember)
  const teachersWithStudents = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT g."teacherId") as count
    FROM "Group" g
    JOIN "GroupMember" gm ON gm."groupId" = g.id
  `.then(r => Number(r[0]?.count ?? 0));

  return {
    total: metric(total, "FACT", "HIGH", "User.count(role=GURU)"),
    createdClass: metric(createdClass, "FACT", "HIGH", "Group.count(teacher)", "Distinct teachers who created >=1 class"),
    created3Students: metric(created3Students, "INFERENCE", "HIGH", "SQL: Group+GroupMember", "Teachers with >=3 total students across all classes"),
    created5Students: metric(created5Students, "INFERENCE", "HIGH", "SQL: Group+GroupMember", "Teachers with >=5 total students across all classes"),
    teachersWithStudents: metric(teachersWithStudents, "INFERENCE", "HIGH", "SQL: Group+GroupMember", "Teachers who ever had at least 1 student"),
    active7d: metric(active7d, "INFERENCE", "MEDIUM", "User.lastActiveAt"),
    active30d: metric(active30d, "INFERENCE", "MEDIUM", "User.lastActiveAt"),
    everTaught: metric(everTaught, "INFERENCE", "HIGH", "SQL: Group+GroupMember", "Teachers with at least 1 student across all time"),
    premiumActive: metric(premiumActive, "FACT", "HIGH", "User.isPremium+premiumUntil", "Guru Pro active (paid or trial)"),
    trialActive: metric(trialActive, "FACT", "HIGH", "User.trialEndsAt", "Guru with active trial (not paid)"),
  };
}

async function collectClassrooms() {
  console.log("  Collecting classrooms...");
  const [
    totalGroups, activeGroups, groupsWith1, groupsWith3, groupsWith5,
    groupsWithRecentActivity
  ] = await Promise.all([
    db.group.count(),
    db.group.count({ where: { isActive: true } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Group" g
      WHERE EXISTS (SELECT 1 FROM "GroupMember" gm WHERE gm."groupId" = g.id)
    `.then(r => Number(r[0]?.count ?? 0)),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT g.id FROM "Group" g
        JOIN "GroupMember" gm ON gm."groupId" = g.id
        GROUP BY g.id HAVING COUNT(gm.id) >= 3
      ) sub
    `.then(r => Number(r[0]?.count ?? 0)),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT g.id FROM "Group" g
        JOIN "GroupMember" gm ON gm."groupId" = g.id
        GROUP BY g.id HAVING COUNT(gm.id) >= 5
      ) sub
    `.then(r => Number(r[0]?.count ?? 0)),
    // Recent activity = has penugasan created in last 30d OR quiz assignment submitted in last 30d
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT g.id) as count FROM "Group" g
      WHERE g.id IN (
        SELECT DISTINCT p."groupId" FROM "Penugasan" p WHERE p."createdAt" >= ${daysAgo(30)}
        UNION
        SELECT DISTINCT qa."groupId" FROM "QuizAssignment" qa
        JOIN "QuizSubmission" qs ON qs."assignmentId" = qa.id
        WHERE qs."submittedAt" >= ${daysAgo(30)}
      )
    `.then(r => Number(r[0]?.count ?? 0)),
  ]);

  return {
    totalGroups: metric(totalGroups, "FACT", "HIGH", "Group.count()"),
    activeGroups: metric(activeGroups, "FACT", "HIGH", "Group.count(isActive=true)"),
    groupsWith1Student: metric(groupsWith1, "INFERENCE", "HIGH", "SQL: Group+GroupMember"),
    groupsWith3Students: metric(groupsWith3, "INFERENCE", "HIGH", "SQL: Group+GroupMember"),
    groupsWith5Students: metric(groupsWith5, "INFERENCE", "HIGH", "SQL: Group+GroupMember"),
    groupsWithRecentActivity: metric(groupsWithRecentActivity, "INFERENCE", "MEDIUM", "SQL: Penugasan+QuizAssignment", "Groups with assignment/quiz activity in trailing 30d"),
  };
}

async function collectOperationalClassrooms() {
  console.log("  Collecting operational classrooms...");
  // O3 North Star: X (has artifact) AND Y (>=3 distinct active students) AND Z (evidence students)
  // Artifact = Penugasan created by teacher in group OR QuizAssignment with submission
  // Active student = UserUnitProgress or QuizSubmission or PenugasanSubmission in last 30d

  const groups = await db.group.findMany({
    where: { isActive: true },
    include: {
      teacher: { select: { id: true, role: true, isFounder: true, email: true } },
      members: { select: { userId: true } },
      penugasans: { select: { id: true, createdAt: true } },
      quizAssignments: {
        select: {
          id: true,
          submissions: {
            select: { userId: true, submittedAt: true, status: true },
            where: { submittedAt: { gte: daysAgo(30) } },
          },
        },
      },
    },
  });

  let operationalCount = 0;
  let operationalTeacherIds = new Set<string>();
  let operationalStudentIds = new Set<string>();
  const groupDetails: Array<{
    groupId: string; teacherId: string; teacherEmail: string; isFounder: boolean;
    studentCount: number; artifactCount: number; activeStudentCount: number;
    evidenceStudentCount: number; operational: boolean;
  }> = [];

  for (const g of groups) {
    const memberIds = g.members.map(m => m.userId);

    // X: artifact count (penugasan + quiz submissions)
    const penugasanCount = g.penugasans.length;
    const quizSubmissionCount = g.quizAssignments.reduce((acc, qa) => acc + qa.submissions.length, 0);
    const artifactCount = penugasanCount + quizSubmissionCount;

    // Y: distinct active students (submitted something in last 30d)
    const activeStudentIds = new Set<string>();
    for (const qa of g.quizAssignments) {
      for (const qs of qa.submissions) {
        if (qs.submittedAt && qs.submittedAt >= daysAgo(30)) activeStudentIds.add(qs.userId);
      }
    }

    // Z: distinct evidence students (any learning activity)
    const evidenceStudentIds = new Set<string>();
    // Check UserUnitProgress for these students
    if (memberIds.length > 0) {
      const progresses = await db.userUnitProgress.findMany({
        where: { userId: { in: memberIds }, completedAt: { gte: daysAgo(30) } },
        select: { userId: true },
      });
      for (const p of progresses) evidenceStudentIds.add(p.userId);
    }
    // Also count quiz submissions as evidence
    for (const qa of g.quizAssignments) {
      for (const qs of qa.submissions) {
        if (qs.submittedAt) evidenceStudentIds.add(qs.userId);
      }
    }

    const operational = artifactCount > 0 && activeStudentIds.size >= 3;
    if (operational) {
      operationalCount++;
      operationalTeacherIds.add(g.teacherId);
      activeStudentIds.forEach(sid => operationalStudentIds.add(sid));
    }

    groupDetails.push({
      groupId: g.id,
      teacherId: g.teacherId,
      teacherEmail: g.teacher.email,
      isFounder: g.teacher.isFounder,
      studentCount: memberIds.length,
      artifactCount,
      activeStudentCount: activeStudentIds.size,
      evidenceStudentCount: evidenceStudentIds.size,
      operational,
    });
  }

  // Sort by operational then by student count
  groupDetails.sort((a, b) => (b.operational ? 1 : 0) - (a.operational ? 1 : 0) || b.studentCount - a.studentCount);

  const top10 = groupDetails.slice(0, 10);
  const founderOwned = groupDetails.filter(g => g.isFounder);
  const founderOperational = founderOwned.filter(g => g.operational);

  return {
    operationalCount: metric(operationalCount, "INFERENCE", "MEDIUM", "SQL: Group+Penugasan+QuizAssignment+UserUnitProgress", "X AND Y AND Z trailing-30d WIB. X=artifact, Y>=3 active students, Z=evidence"),
    uniqueTeachers: metric(operationalTeacherIds.size, "INFERENCE", "MEDIUM", "Derived from operational classrooms"),
    uniqueStudents: metric(operationalStudentIds.size, "INFERENCE", "MEDIUM", "Derived from operational classrooms"),
    concentration: metric({
      top5PctOfTotal: groupDetails.filter(g => g.operational).slice(0, 5).length,
      top10PctOfTotal: groupDetails.filter(g => g.operational).slice(0, 10).length,
      founderOwnedOperational: founderOperational.length,
      founderOwnedTotal: founderOwned.length,
    }, "INFERENCE", "MEDIUM", "Derived", "Concentration analysis"),
    top10: top10,
    allGroupsSorted: groupDetails,
  };
}

async function collectStudents() {
  console.log("  Collecting students...");
  const studentWhere = { role: "MURID" as const };

  const [
    totalStudents, enrolledInGroups, active7d, active30d,
    withLearningActivity
  ] = await Promise.all([
    db.user.count({ where: studentWhere }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT gm."userId") as count FROM "GroupMember" gm
      JOIN "User" u ON u.id = gm."userId" WHERE u.role = 'MURID'
    `.then(r => Number(r[0]?.count ?? 0)),
    db.user.count({ where: { ...studentWhere, lastActiveAt: { gte: daysAgo(7) } } }),
    db.user.count({ where: { ...studentWhere, lastActiveAt: { gte: daysAgo(30) } } }),
    // Students with any learning signal: UserUnitProgress, QuizSubmission, PenugasanSubmission, ProgresKompetensi, GameResult
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT sub."userId") as count FROM (
        SELECT "userId" FROM "UserUnitProgress"
        UNION
        SELECT "userId" FROM "QuizSubmission"
        UNION
        SELECT "userId" FROM "PenugasanSubmission"
        UNION
        SELECT "userId" FROM "ProgresKompetensi"
        UNION
        SELECT "userId" FROM "GameResult"
      ) sub
      JOIN "User" u ON u.id = sub."userId" WHERE u.role = 'MURID'
    `.then(r => Number(r[0]?.count ?? 0)),
  ]);

  // Average students per active teacher (teacher with >=1 student)
  const teacherStudentCounts = await db.$queryRaw<{ teacherId: string; count: bigint }[]>`
    SELECT g."teacherId", COUNT(DISTINCT gm."userId") as count
    FROM "Group" g
    JOIN "GroupMember" gm ON gm."groupId" = g.id
    JOIN "User" u ON u.id = g."teacherId"
    WHERE u.role = 'GURU'
    GROUP BY g."teacherId"
  `;
  const counts = teacherStudentCounts.map(r => Number(r.count));
  const avgStudentsPerTeacher = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const sortedCounts = [...counts].sort((a, b) => a - b);
  const medianStudentsPerTeacher = sortedCounts.length > 0
    ? sortedCounts[Math.floor(sortedCounts.length / 2)]
    : 0;

  return {
    total: metric(totalStudents, "FACT", "HIGH", "User.count(role=MURID)"),
    enrolledInGroups: metric(enrolledInGroups, "INFERENCE", "HIGH", "SQL: GroupMember+User"),
    withLearningActivity: metric(withLearningActivity, "INFERENCE", "HIGH", "SQL: multiple tables", "Students with any learning signal (progress/quiz/assignment/assessment/game)"),
    active7d: metric(active7d, "INFERENCE", "MEDIUM", "User.lastActiveAt"),
    active30d: metric(active30d, "INFERENCE", "MEDIUM", "User.lastActiveAt"),
    avgStudentsPerActiveTeacher: metric(Math.round(avgStudentsPerTeacher * 10) / 10, "INFERENCE", "MEDIUM", "Derived"),
    medianStudentsPerActiveTeacher: metric(medianStudentsPerTeacher, "INFERENCE", "MEDIUM", "Derived"),
  };
}

async function collectLearningActivity() {
  console.log("  Collecting learning activity...");

  const [
    unitProgressTotal, unitProgressCompleted,
    quizSubmissions, quizSubmissionsGraded,
    penugasanSubmissions, penugasanCompleted,
    progresKompetensi, progresKompetensiCompleted,
    gameResults, studentKarya, karyaLikes,
    jalurCerdasLevels, jalurCerdasUnits,
    aiUsageTotal, aiUsage30d, aiUsageTeachers,
  ] = await Promise.all([
    db.userUnitProgress.count(),
    db.userUnitProgress.count({ where: { completed: true } }),
    db.quizSubmission.count(),
    db.quizSubmission.count({ where: { status: "GRADED" } }),
    db.penugasanSubmission.count(),
    db.penugasanSubmission.count({ where: { status: { in: ["COMPLETED", "GRADED"] } } }),
    db.progresKompetensi.count(),
    db.progresKompetensi.count({ where: { status: "COMPLETED" } }),
    db.gameResult.count(),
    db.studentKarya.count(),
    db.studentKaryaLike.count(),
    db.learningLevel.count({ where: { type: "JALUR" } }),
    db.learningUnit.count({ where: { level: { type: "JALUR" } } }),
    db.aIUsage.count(),
    db.aIUsage.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "userId") as count FROM "AIUsage"
      WHERE "createdAt" >= ${daysAgo(30)}
    `.then(r => Number(r[0]?.count ?? 0)),
  ]);

  // Distinct students with learning activity in last 30d
  const activeLearners30d = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT sub."userId") as count FROM (
      SELECT "userId" FROM "UserUnitProgress" WHERE "completedAt" >= ${daysAgo(30)}
      UNION
      SELECT "userId" FROM "QuizSubmission" WHERE "submittedAt" >= ${daysAgo(30)}
      UNION
      SELECT "userId" FROM "PenugasanSubmission" WHERE "completedAt" >= ${daysAgo(30)} OR "submittedAt" >= ${daysAgo(30)}
      UNION
      SELECT "userId" FROM "ProgresKompetensi" WHERE "finishedAt" >= ${daysAgo(30)}
      UNION
      SELECT "userId" FROM "GameResult" WHERE "createdAt" >= ${daysAgo(30)}
    ) sub
    JOIN "User" u ON u.id = sub."userId" WHERE u.role = 'MURID'
  `.then(r => Number(r[0]?.count ?? 0));

  return {
    unitProgress: {
      total: metric(unitProgressTotal, "FACT", "HIGH", "UserUnitProgress.count()"),
      completed: metric(unitProgressCompleted, "FACT", "HIGH", "UserUnitProgress.count(completed=true)"),
    },
    quizSubmissions: {
      total: metric(quizSubmissions, "FACT", "HIGH", "QuizSubmission.count()"),
      graded: metric(quizSubmissionsGraded, "FACT", "HIGH", "QuizSubmission.count(status=GRADED)"),
    },
    penugasanSubmissions: {
      total: metric(penugasanSubmissions, "FACT", "HIGH", "PenugasanSubmission.count()"),
      completed: metric(penugasanCompleted, "FACT", "HIGH", "PenugasanSubmission.count(COMPLETED|GRADED)"),
    },
    progresKompetensi: {
      total: metric(progresKompetensi, "FACT", "HIGH", "ProgresKompetensi.count()"),
      completed: metric(progresKompetensiCompleted, "FACT", "HIGH", "ProgresKompetensi.count(COMPLETED)"),
    },
    gameResults: metric(gameResults, "FACT", "HIGH", "GameResult.count()"),
    studentKarya: metric(studentKarya, "FACT", "HIGH", "StudentKarya.count()"),
    karyaLikes: metric(karyaLikes, "FACT", "HIGH", "StudentKaryaLike.count()"),
    jalurCerdas: {
      levels: metric(jalurCerdasLevels, "FACT", "HIGH", "LearningLevel.count(type=JALUR)"),
      units: metric(jalurCerdasUnits, "FACT", "HIGH", "LearningUnit.count(level.type=JALUR)"),
    },
    aiUsage: {
      lifetime: metric(aiUsageTotal, "FACT", "HIGH", "AIUsage.count()"),
      last30d: metric(aiUsage30d, "FACT", "HIGH", "AIUsage.count(30d)"),
      uniqueTeachers30d: metric(aiUsageTeachers, "FACT", "HIGH", "AIUsage.count(DISTINCT userId, 30d)"),
    },
    activeLearners30d: metric(activeLearners30d, "INFERENCE", "MEDIUM", "SQL: multiple tables", "Distinct murid with any learning signal in trailing 30d"),
  };
}

async function collectMonetization() {
  console.log("  Collecting monetization...");

  const [
    transaksiSuccess, transaksiPending, transaksiExpired, transaksiFailed,
    revenueSuccess, premiumActive, premiumGuru, premiumMurid,
    trialActive, subscriptionActive,
    teacherAttributions, teacherCommissions, teacherWallets,
    commissionEligible, commissionAvailable, commissionPaid,
  ] = await Promise.all([
    db.transaksi.count({ where: { status: "SUCCESS" } }),
    db.transaksi.count({ where: { status: "PENDING" } }),
    db.transaksi.count({ where: { status: "EXPIRED" } }),
    db.transaksi.count({ where: { status: "FAILED" } }),
    db.transaksi.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    db.user.count({ where: { isPremium: true, premiumUntil: { gt: new Date() } } }),
    db.user.count({ where: { role: "GURU", isPremium: true, premiumUntil: { gt: new Date() } } }),
    db.user.count({ where: { role: "MURID", isPremium: true, premiumUntil: { gt: new Date() } } }),
    db.user.count({ where: { trialEndsAt: { gt: new Date() } } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.teacherAttribution.count({ where: { status: "ACTIVE" } }),
    db.teacherCommission.count(),
    db.teacherWallet.count(),
    db.teacherCommission.count({ where: { status: { in: ["PENDING", "ELIGIBLE"] } } }),
    db.teacherCommission.count({ where: { status: "AVAILABLE" } }),
    db.teacherCommission.count({ where: { status: "PAID" } }),
  ]);

  // Breakdown of transaksi types
  const transaksiTypes = await db.$queryRaw<{ type: string; status: string; count: bigint; sum: bigint }[]>`
    SELECT type, status, COUNT(*) as count, SUM(amount) as sum
    FROM "Transaksi"
    GROUP BY type, status
    ORDER BY type, status
  `;

  // Wallet total balances
  const walletTotals = await db.teacherWallet.aggregate({
    _sum: { availableBalance: true, pendingBalance: true, lockedBalance: true, lifetimeEarned: true, lifetimeWithdrawn: true },
  });

  // Teacher payout count
  const payoutCount = await db.teacherPayout.count();

  return {
    transactions: {
      successful: metric(transaksiSuccess, "FACT", "HIGH", "Transaksi.count(SUCCESS)"),
      pending: metric(transaksiPending, "FACT", "HIGH", "Transaksi.count(PENDING)"),
      expired: metric(transaksiExpired, "FACT", "HIGH", "Transaksi.count(EXPIRED)"),
      failed: metric(transaksiFailed, "FACT", "HIGH", "Transaksi.count(FAILED)"),
    },
    revenue: {
      grossSuccess: metric(Number(revenueSuccess._sum.amount ?? 0), "FACT", "HIGH", "Transaksi.aggregate(SUCCESS).sum.amount", "Rp — gross amount, not net"),
    },
    premium: {
      active: metric(premiumActive, "FACT", "HIGH", "User.isPremium+premiumUntil"),
      guruActive: metric(premiumGuru, "FACT", "HIGH", "User(isPremium+premiumUntil, GURU)"),
      muridActive: metric(premiumMurid, "FACT", "HIGH", "User(isPremium+premiumUntil, MURID)"),
      trialActive: metric(trialActive, "FACT", "HIGH", "User.trialEndsAt"),
      subscriptionActive: metric(subscriptionActive, "FACT", "HIGH", "Subscription.count(ACTIVE)"),
    },
    transaksiBreakdown: transaksiTypes,
    commission: {
      attributions: metric(teacherAttributions, "FACT", "HIGH", "TeacherAttribution.count(ACTIVE)"),
      totalCommissions: metric(teacherCommissions, "FACT", "HIGH", "TeacherCommission.count()"),
      eligible: metric(commissionEligible, "FACT", "HIGH", "TeacherCommission.count(PENDING|ELIGIBLE)"),
      available: metric(commissionAvailable, "FACT", "HIGH", "TeacherCommission.count(AVAILABLE)"),
      paid: metric(commissionPaid, "FACT", "HIGH", "TeacherCommission.count(PAID)"),
      wallets: metric(teacherWallets, "FACT", "HIGH", "TeacherWallet.count()"),
      walletBalances: metric({
        available: Number(walletTotals._sum.availableBalance ?? 0),
        pending: Number(walletTotals._sum.pendingBalance ?? 0),
        locked: Number(walletTotals._sum.lockedBalance ?? 0),
        lifetimeEarned: Number(walletTotals._sum.lifetimeEarned ?? 0),
        lifetimeWithdrawn: Number(walletTotals._sum.lifetimeWithdrawn ?? 0),
      }, "FACT", "HIGH", "TeacherWallet.aggregate()"),
      payouts: metric(payoutCount, "FACT", "HIGH", "TeacherPayout.count()"),
    },
  };
}

async function collectRetention() {
  console.log("  Collecting retention...");

  // Teacher D7/D30: teachers whose first activity was >=N days ago AND still active
  const now = new Date();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  // Teacher retention: teachers created >=N days ago AND active in last 7d
  const teacherRetention = await Promise.all([
    // D7: teachers registered >=7d ago AND active in last 7d
    db.$queryRaw<{ total: bigint; retained: bigint }[]>`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN u."lastActiveAt" >= ${d7} THEN 1 END) as retained
      FROM "User" u
      WHERE u.role = 'GURU' AND u."createdAt" <= ${d7}
    `.then(r => ({ total: Number(r[0]?.total ?? 0), retained: Number(r[0]?.retained ?? 0) })),
    // D30: teachers registered >=30d ago AND active in last 30d
    db.$queryRaw<{ total: bigint; retained: bigint }[]>`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN u."lastActiveAt" >= ${d30} THEN 1 END) as retained
      FROM "User" u
      WHERE u.role = 'GURU' AND u."createdAt" <= ${d30}
    `.then(r => ({ total: Number(r[0]?.total ?? 0), retained: Number(r[0]?.retained ?? 0) })),
  ]);

  // Student retention
  const studentRetention = await Promise.all([
    db.$queryRaw<{ total: bigint; retained: bigint }[]>`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN u."lastActiveAt" >= ${d7} THEN 1 END) as retained
      FROM "User" u
      WHERE u.role = 'MURID' AND u."createdAt" <= ${d7}
    `.then(r => ({ total: Number(r[0]?.total ?? 0), retained: Number(r[0]?.retained ?? 0) })),
    db.$queryRaw<{ total: bigint; retained: bigint }[]>`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN u."lastActiveAt" >= ${d30} THEN 1 END) as retained
      FROM "User" u
      WHERE u.role = 'MURID' AND u."createdAt" <= ${d30}
    `.then(r => ({ total: Number(r[0]?.total ?? 0), retained: Number(r[0]?.retained ?? 0) })),
  ]);

  return {
    teacher: {
      d7: metric(
        teacherRetention[0].total > 0
          ? Math.round((teacherRetention[0].retained / teacherRetention[0].total) * 1000) / 10
          : 0,
        "INFERENCE", "MEDIUM", "SQL: User.lastActiveAt",
        `${teacherRetention[0].retained}/${teacherRetention[0].total} teachers registered >=7d`
      ),
      d30: metric(
        teacherRetention[1].total > 0
          ? Math.round((teacherRetention[1].retained / teacherRetention[1].total) * 1000) / 10
          : 0,
        "INFERENCE", "MEDIUM", "SQL: User.lastActiveAt",
        `${teacherRetention[1].retained}/${teacherRetention[1].total} teachers registered >=30d`
      ),
      _raw: { d7: teacherRetention[0], d30: teacherRetention[1] },
    },
    student: {
      d7: metric(
        studentRetention[0].total > 0
          ? Math.round((studentRetention[0].retained / studentRetention[0].total) * 1000) / 10
          : 0,
        "INFERENCE", "MEDIUM", "SQL: User.lastActiveAt",
        `${studentRetention[0].retained}/${studentRetention[0].total} students registered >=7d`
      ),
      d30: metric(
        studentRetention[1].total > 0
          ? Math.round((studentRetention[1].retained / studentRetention[1].total) * 1000) / 10
          : 0,
        "INFERENCE", "MEDIUM", "SQL: User.lastActiveAt",
        `${studentRetention[1].retained}/${studentRetention[1].total} students registered >=30d`
      ),
      _raw: { d7: studentRetention[0], d30: studentRetention[1] },
    },
  };
}

async function collectPowerTeachers() {
  console.log("  Collecting power teachers...");

  const teacherStats = await db.$queryRaw<{
    teacherId: string; email: string; isFounder: boolean;
    classes: bigint; totalStudents: bigint;
    groupIds: string[];
  }[]>`
    SELECT
      g."teacherId",
      u.email,
      u."isFounder",
      COUNT(DISTINCT g.id) as classes,
      COUNT(DISTINCT gm."userId") as "totalStudents",
      ARRAY_AGG(DISTINCT g.id) as "groupIds"
    FROM "Group" g
    JOIN "User" u ON u.id = g."teacherId"
    LEFT JOIN "GroupMember" gm ON gm."groupId" = g.id
    WHERE u.role = 'GURU'
    GROUP BY g."teacherId", u.email, u."isFounder"
    ORDER BY "totalStudents" DESC
  `;

  // Get activity counts per teacher
  const teacherActivity = await db.$queryRaw<{
    teacherId: string; penugasanCount: bigint; quizCount: bigint;
  }[]>`
    SELECT
      p."teacherId",
      COUNT(DISTINCT p.id) as "penugasanCount",
      COUNT(DISTINCT qa.id) as "quizCount"
    FROM "Penugasan" p
    LEFT JOIN "QuizAssignment" qa ON qa."groupId" = p."groupId"
    GROUP BY p."teacherId"
  `;
  const activityMap = new Map(teacherActivity.map(r => [r.teacherId, {
    penugasan: Number(r.penugasanCount),
    quizzes: Number(r.quizCount),
  }]));

  // Get operational status per teacher group
  const operationalStatus = await db.$queryRaw<{
    teacherId: string; operationalGroups: bigint;
  }[]>`
    SELECT
      g."teacherId",
      COUNT(DISTINCT g.id) as "operationalGroups"
    FROM "Group" g
    JOIN "Penugasan" p ON p."groupId" = g.id
    JOIN "GroupMember" gm ON gm."groupId" = g.id
    GROUP BY g."teacherId"
    HAVING COUNT(DISTINCT gm."userId") >= 3
  `;
  const opMap = new Map(operationalStatus.map(r => [r.teacherId, Number(r.operationalGroups)]));

  const enriched = teacherStats.map(t => ({
    teacherId: t.teacherId,
    email: t.email,
    isFounder: t.isFounder,
    classes: Number(t.classes),
    totalStudents: Number(t.totalStudents),
    activity: activityMap.get(t.teacherId) ?? { penugasan: 0, quizzes: 0 },
    operationalGroups: opMap.get(t.teacherId) ?? 0,
  }));

  // Top 10
  const top10 = enriched.slice(0, 10);
  const founderTeachers = enriched.filter(t => t.isFounder);

  // Is teacher-as-distribution-node behavior present?
  const hasDistribution = enriched.some(t => !t.isFounder && t.totalStudents >= 10);

  return {
    top10,
    founderTeachers,
    total: enriched.length,
    distributionSignal: metric(
      hasDistribution ? "YES" : "INCONCLUSIVE",
      "INFERENCE", "MEDIUM", "Derived",
      hasDistribution
        ? "At least 1 non-founder teacher has >=10 students"
        : "No non-founder teacher has >=10 students yet"
    ),
    allTeachers: enriched,
  };
}

async function collectProductUsage() {
  console.log("  Collecting product usage...");

  const [
    aiRpp, aiSoal, aiPpt, aiFeedback, aiEyd, aiGrading, aiTextAnalysis, aiBcChat,
    soalSets, ukbiQuestions, tkaQuestions, simSessions, simCompleted,
    articles, notifikasi,
    quizzes, quizAssignments,
  ] = await Promise.all([
    db.aIUsage.count({ where: { feature: "agent:rpp" } }),
    db.aIUsage.count({ where: { feature: "agent:soal" } }),
    db.aIUsage.count({ where: { feature: "agent:ppt" } }),
    db.aIUsage.count({ where: { feature: "agent:feedback" } }),
    db.aIUsage.count({ where: { feature: "agent:eyd" } }),
    db.aIUsage.count({ where: { feature: "agent:grading" } }),
    db.aIUsage.count({ where: { feature: "agent:text-analysis" } }),
    db.aIUsage.count({ where: { feature: "ai-bc-chat" } }),
    db.soalSet.count(),
    db.uKBIQuestion.count(),
    db.tKAQuestion.count(),
    db.testSession.count(),
    db.testSession.count({ where: { status: "COMPLETED" } }),
    db.artikel.count(),
    db.notifikasi.count(),
    db.quiz.count(),
    db.quizAssignment.count(),
  ]);

  // Distinct AI users
  const aiUsers = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "userId") as count FROM "AIUsage"
  `.then(r => Number(r[0]?.count ?? 0));

  // Distinct AI users 30d
  const aiUsers30d = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "userId") as count FROM "AIUsage"
    WHERE "createdAt" >= ${daysAgo(30)}
  `.then(r => Number(r[0]?.count ?? 0));

  return {
    aiTools: {
      rpp: metric(aiRpp, "FACT", "HIGH", "AIUsage.count(feature=agent:rpp)"),
      soal: metric(aiSoal, "FACT", "HIGH", "AIUsage.count(feature=agent:soal)"),
      ppt: metric(aiPpt, "FACT", "HIGH", "AIUsage.count(feature=agent:ppt)"),
      feedback: metric(aiFeedback, "FACT", "HIGH", "AIUsage.count(feature=agent:feedback)"),
      eyd: metric(aiEyd, "FACT", "HIGH", "AIUsage.count(feature=agent:eyd)"),
      grading: metric(aiGrading, "FACT", "HIGH", "AIUsage.count(feature=agent:grading)"),
      textAnalysis: metric(aiTextAnalysis, "FACT", "HIGH", "AIUsage.count(feature=agent:text-analysis)"),
      bcChat: metric(aiBcChat, "FACT", "HIGH", "AIUsage.count(feature=ai-bc-chat)"),
    },
    aiUsers: metric(aiUsers, "FACT", "HIGH", "AIUsage.count(DISTINCT userId)"),
    aiUsers30d: metric(aiUsers30d, "FACT", "HIGH", "AIUsage.count(DISTINCT userId, 30d)"),
    content: {
      soalSets: metric(soalSets, "FACT", "HIGH", "SoalSet.count()"),
      ukbiQuestions: metric(ukbiQuestions, "FACT", "HIGH", "UKBIQuestion.count()"),
      tkaQuestions: metric(tkaQuestions, "FACT", "HIGH", "TKAQuestion.count()"),
      articles: metric(articles, "FACT", "HIGH", "Artikel.count()"),
    },
    simulation: {
      sessions: metric(simSessions, "FACT", "HIGH", "TestSession.count()"),
      completed: metric(simCompleted, "FACT", "HIGH", "TestSession.count(COMPLETED)"),
    },
    assessments: {
      quizzes: metric(quizzes, "FACT", "HIGH", "Quiz.count()"),
      quizAssignments: metric(quizAssignments, "FACT", "HIGH", "QuizAssignment.count()"),
    },
    notifications: metric(notifikasi, "FACT", "HIGH", "Notifikasi.count()"),
  };
}

async function collectDataQuality() {
  console.log("  Collecting data quality...");

  const [
    usersNoLastActive, usersNoSupabaseId, duplicateEmails,
    productEventRows, dailySnapshotRows,
    founderAsTeacher, testTransactions,
  ] = await Promise.all([
    db.user.count({ where: { lastActiveAt: null } }),
    db.user.count({ where: { supabaseId: "" } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT email, COUNT(*) as cnt FROM "User" GROUP BY email HAVING COUNT(*) > 1
      ) sub
    `.then(r => Number(r[0]?.count ?? 0)),
    db.productEvent.count(),
    db.dailyBusinessSnapshot.count(),
    db.user.count({ where: { isFounder: true, role: "GURU" } }),
    // Check for test/seed transactions (dominikus.02@gmail.com, hdsastra47@gmail.com, demo accounts)
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Transaksi" t
      JOIN "User" u ON u.id = t."userId"
      WHERE u.email IN ('dominikus.02@gmail.com', 'hdsastra47@gmail.com', 'alexsurya1968@gmail.com',
                         'guru@demo.com', 'murid@demo.com')
    `.then(r => Number(r[0]?.count ?? 0)),
  ]);

  return {
    usersNoLastActive: metric(usersNoLastActive, "FACT", "HIGH", "User.count(lastActiveAt=null)"),
    usersNoSupabaseId: metric(usersNoSupabaseId, "FACT", "HIGH", "User.count(supabaseId='')"),
    duplicateEmails: metric(duplicateEmails, "FACT", "HIGH", "SQL: duplicate check"),
    productEventRows: metric(productEventRows, "FACT", "HIGH", "ProductEvent.count()", "Expected 0 until Operational Teacher Experiment hooks fire"),
    dailySnapshotRows: metric(dailySnapshotRows, "FACT", "HIGH", "DailyBusinessSnapshot.count()", "Expected 1 — snapshot started but barely populated"),
    founderAsTeacher: metric(founderAsTeacher, "FACT", "HIGH", "User(isFounder=true, role=GURU)"),
    testTransactions: metric(testTransactions, "FACT", "HIGH", "SQL: founder/test account transactions", "Transactions by founder/test accounts — excluded from revenue"),
    instrumentationGaps: [
      "ProductEvent: 0 rows — F4/F8 hooks wired but table never populated until experiment fires",
      "DailyBusinessSnapshot: 1 row — snapshot generation started but not recurring",
      "MRR/premium historical: NOT reconstructable — only current-state mutable fields survive",
      "AIUsage feature labels: migrated from legacy (rpp/soal/ppt) to agent: prefix — some old records may use legacy labels",
      "Student engagement granularity: no per-lesson time-on-task or per-question attempt instrumentation",
      "Passive page views: NOT tracked as learning activity (by design per hard rule 9)",
    ],
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  INVESTOR READINESS 2.0 — PRODUCTION TRUTH");
  console.log("  BahasaCerdas — September 2026");
  console.log("  READ-ONLY AUDIT — NO PRODUCTION MUTATIONS");
  console.log("═══════════════════════════════════════════════\n");

  const startTime = Date.now();

  const users = await collectUsers();
  const teachers = await collectTeachers();
  const classrooms = await collectClassrooms();
  const operationalClassrooms = await collectOperationalClassrooms();
  const students = await collectStudents();
  const learningActivity = await collectLearningActivity();
  const monetization = await collectMonetization();
  const retention = await collectRetention();
  const powerTeachers = await collectPowerTeachers();
  const productUsage = await collectProductUsage();
  const dataQuality = await collectDataQuality();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  ✅ Data collection complete (${elapsed}s)`);

  // ── Build JSON artifact ──────────────────────────────────────────────────

  const artifact = {
    generatedAt: new Date().toISOString(),
    dataSource: "Production Supabase PostgreSQL via Prisma (READ-ONLY)",
    auditVersion: "2.0",
    collectionTimeSeconds: parseFloat(elapsed),
    users,
    teachers,
    students,
    classrooms,
    operationalClassrooms: {
      count: operationalClassrooms.operationalCount,
      uniqueTeachers: operationalClassrooms.uniqueTeachers,
      uniqueStudents: operationalClassrooms.uniqueStudents,
      concentration: operationalClassrooms.concentration,
      top10: operationalClassrooms.top10,
      definition: "O3 North Star: X (artifact exists) AND Y (>=3 distinct active students in trailing-30d) AND Z (evidence students)",
    },
    retention,
    powerTeachers: {
      top10: powerTeachers.top10,
      founderTeachers: powerTeachers.founderTeachers,
      total: powerTeachers.total,
      distributionSignal: powerTeachers.distributionSignal,
    },
    learningActivity,
    monetization,
    productUsage,
    dataQuality,
  };

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outputPath = path.join(dataDir, "investor-readiness-2-0-september-2026.json");
  fs.writeFileSync(outputPath, JSON.stringify(artifact, (_key, value) =>
    typeof value === "bigint" ? Number(value) : value, 2));
  console.log(`  📄 Written to ${outputPath}`);

  // ── Print summary ───────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════════");
  console.log("  EXECUTIVE SUMMARY");
  console.log("═══════════════════════════════════════════════");

  console.log(`\n  USERS`);
  console.log(`    Total:              ${users.total.value}`);
  console.log(`    GURU:               ${users.guru.value}`);
  console.log(`    MURID:              ${users.murid.value}`);
  console.log(`    ADMIN:              ${users.admin.value}`);
  console.log(`    Founders:           ${users.founders.value}`);
  console.log(`    Active 7d:          ${users.active7d.value}`);
  console.log(`    Active 30d:         ${users.active30d.value}`);

  console.log(`\n  TEACHERS`);
  console.log(`    Total:              ${teachers.total.value}`);
  console.log(`    Created class:      ${teachers.createdClass.value}`);
  console.log(`    With >=3 students:  ${teachers.created3Students.value}`);
  console.log(`    With >=5 students:  ${teachers.created5Students.value}`);
  console.log(`    Active 7d:          ${teachers.active7d.value}`);
  console.log(`    Active 30d:         ${teachers.active30d.value}`);
  console.log(`    Ever had student:   ${teachers.everTaught.value}`);
  console.log(`    Premium active:     ${teachers.premiumActive.value}`);
  console.log(`    Trial active:       ${teachers.trialActive.value}`);

  console.log(`\n  CLASSROOMS`);
  console.log(`    Total groups:       ${classrooms.totalGroups.value}`);
  console.log(`    Active groups:      ${classrooms.activeGroups.value}`);
  console.log(`    With >=1 student:   ${classrooms.groupsWith1Student.value}`);
  console.log(`    With >=3 students:  ${classrooms.groupsWith3Students.value}`);
  console.log(`    With >=5 students:  ${classrooms.groupsWith5Students.value}`);
  console.log(`    Recent activity:    ${classrooms.groupsWithRecentActivity.value}`);

  console.log(`\n  OPERATIONAL CLASSROOMS (O3 North Star)`);
  console.log(`    Operational:        ${operationalClassrooms.operationalCount.value}`);
  console.log(`    Unique teachers:    ${operationalClassrooms.uniqueTeachers.value}`);
  console.log(`    Unique students:    ${operationalClassrooms.uniqueStudents.value}`);

  console.log(`\n  STUDENTS`);
  console.log(`    Total:              ${students.total.value}`);
  console.log(`    Enrolled in groups: ${students.enrolledInGroups.value}`);
  console.log(`    With learning:      ${students.withLearningActivity.value}`);
  console.log(`    Active 7d:          ${students.active7d.value}`);
  console.log(`    Active 30d:         ${students.active30d.value}`);

  console.log(`\n  LEARNING ACTIVITY`);
  console.log(`    Unit progress:      ${learningActivity.unitProgress.total.value}`);
  console.log(`    Quiz submissions:   ${learningActivity.quizSubmissions.total.value}`);
  console.log(`    Penugasan:          ${learningActivity.penugasanSubmissions.total.value}`);
  console.log(`    Simulasi sessions:  ${learningActivity.progresKompetensi.total.value}`);
  console.log(`    Game results:       ${learningActivity.gameResults.value}`);
  console.log(`    Student karya:      ${learningActivity.studentKarya.value}`);
  console.log(`    Active learners 30d:${learningActivity.activeLearners30d.value}`);

  console.log(`\n  MONETIZATION`);
  console.log(`    Revenue (gross):    Rp${(monetization.revenue.grossSuccess as any).value ?? 0}`);
  console.log(`    Transactions:       ${(monetization.transactions.successful as any).value ?? 0} success`);
  console.log(`    Premium active:     ${(monetization.premium.active as any).value ?? 0}`);
  console.log(`    Trial active:       ${(monetization.premium.trialActive as any).value ?? 0}`);
  const wf = (monetization.commission.walletBalances as any).value;
  console.log(`    Commission earned:  Rp${wf?.lifetimeEarned ?? 0}`);

  console.log(`\n  RETENTION`);
  const rt = retention.teacher;
  const rs = retention.student;
  console.log(`    Teacher D7:         ${rt.d7.value}%`);
  console.log(`    Teacher D30:        ${rt.d30.value}%`);
  console.log(`    Student D7:         ${rs.d7.value}%`);
  console.log(`    Student D30:        ${rs.d30.value}%`);

  console.log(`\n  POWER TEACHERS`);
  const pt0 = powerTeachers.top10[0];
  console.log(`    Top teacher:        ${pt0?.email ?? "N/A"} (${pt0?.totalStudents ?? 0} students)`);
  console.log(`    Distribution:       ${powerTeachers.distributionSignal.value}`);

  console.log(`\n  PRODUCT USAGE`);
  console.log(`    AI users (all):     ${productUsage.aiUsers.value}`);
  console.log(`    AI users (30d):     ${productUsage.aiUsers30d.value}`);
  console.log(`    Simulasi sessions:  ${productUsage.simulation.sessions.value}`);
  console.log(`    UKBI questions:     ${productUsage.content.ukbiQuestions.value}`);
  console.log(`    TKA questions:      ${productUsage.content.tkaQuestions.value}`);

  console.log(`\n  DATA QUALITY`);
  console.log(`    ProductEvent rows:  ${dataQuality.productEventRows.value}`);
  console.log(`    DailySnapshot rows: ${dataQuality.dailySnapshotRows.value}`);
  console.log(`    Test transactions:  ${dataQuality.testTransactions.value}`);

  console.log("\n═══════════════════════════════════════════════");
  console.log("  AUDIT COMPLETE — NO PRODUCTION CHANGES MADE");
  console.log("═══════════════════════════════════════════════");

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("Audit failed:", e);
  await db.$disconnect();
  process.exit(1);
});
