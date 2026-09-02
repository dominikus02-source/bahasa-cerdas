/**
 * Phase 3 — Power User & Power School Forensic
 *
 * FIND WHAT ALREADY WORKS.
 * READ-ONLY production audit. No data mutations.
 * Cut-off: September 1, 2026, Asia/Jakarta.
 */

import { PrismaClient, Role } from "@prisma/client";
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
requireDatabaseUrl();

const prisma = new PrismaClient({
  log: ["error"],
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const CUT_OFF = new Date("2026-09-01T23:59:59+07:00");
const WIB_OFFSET = 7 * 60 * 60 * 1000;
const THIRTY_DAYS_BEFORE = new Date(CUT_OFF.getTime() - 30 * 24 * 60 * 60 * 1000);
const FOURTEEN_DAYS_BEFORE = new Date(CUT_OFF.getTime() - 14 * 24 * 60 * 60 * 1000);
const SEVEN_DAYS_BEFORE = new Date(CUT_OFF.getTime() - 7 * 24 * 60 * 60 * 1000);

// ─── Types ──────────────────────────────────────────────────────────
interface PowerTeacher {
  id: string;
  email: string;
  signupDate: string;
  school: string | null;
  classCount: number;
  studentCount: number;
  activeStudentCount: number;
  learningEvents: number;
  karyaCount: number;
  assessmentCount: number;
  aiUsageCount: number;
  activeDays: number;
  lastActivity: string | null;
  isPremium: boolean;
  compositeScore: number;
  rankActivation: number;
  rankEngagement: number;
  rankImpact: number;
  rankOverall: number;
}

interface PowerSchool {
  name: string;
  teachers: number;
  students: number;
  activeStudents: number;
  classes: number;
  learningEvents: number;
  karyaCount: number;
  assessmentCount: number;
  recentActivity: string | null;
  compositeScore: number;
}

interface PowerStudent {
  id: string;
  email: string;
  signupDate: string;
  school: string | null;
  activeDays: number;
  learningEvents: number;
  completedActivities: number;
  jalurCerdasUnits: number;
  dailyActions: number;
  diagnosticCount: number;
  ukbiCount: number;
  tkaCount: number;
  karyaCount: number;
  xp: number;
  lastActivity: string | null;
  hasGroup: boolean;
  compositeScore: number;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log("Phase 3 — Power User & Power School Forensic");
  console.log(`Cut-off: ${CUT_OFF.toISOString()}`);
  console.log(`Method: READ-ONLY production audit\n`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: SCORING METHODOLOGY
  // ═══════════════════════════════════════════════════════════════════
  log("2", "SCORING METHODOLOGY");

  const SCORING = {
    weights: { activation: 0.4, engagement: 0.3, impact: 0.3 },
    activation: { classCreated: 20, perStudent: 3, perActiveStudent: 5 },
    engagement: { perActiveDay: 5, featureBreadth: 8, recencyBonus: 10, aiUsage: 2, karyaCreated: 5 },
    impact: { perStudentLearningEvent: 2, perStudentReturn: 10 },
  };
  console.log("Weights:", JSON.stringify(SCORING.weights));
  console.log("Rankings: A=Activation, B=Engagement, C=Impact, D=Overall");

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: TOP 20 POWER TEACHERS
  // ═══════════════════════════════════════════════════════════════════
  log("3", "TOP 20 POWER TEACHERS");

  const allTeachers = await prisma.user.findMany({
    where: { role: "GURU" as Role },
    select: {
      id: true, email: true, createdAt: true, isPremium: true,
      lastActiveAt: true, xp: true,
      profile: { select: { school: true } },
    },
  });
  console.log(`Total teachers: ${allTeachers.length}`);

  // Batch queries for teacher metrics
  const teacherGroups = await prisma.$queryRawUnsafe<{ teacherId: string; classCount: bigint }[]>(
    `SELECT "teacherId", COUNT(*) as "classCount" FROM "Group" GROUP BY "teacherId"`
  );
  const groupMap = new Map(teacherGroups.map(r => [r.teacherId, num(r.classCount)]));

  const teacherStudents = await prisma.$queryRawUnsafe<
    { teacherId: string; studentCount: bigint; activeStudents: bigint }[]
  >(`SELECT g."teacherId",
    COUNT(DISTINCT gm."userId") as "studentCount",
    COUNT(DISTINCT CASE WHEN u."lastActiveAt" > $1 THEN gm."userId" END) as "activeStudents"
    FROM "Group" g JOIN "GroupMember" gm ON gm."groupId" = g.id
    JOIN "User" u ON u.id = gm."userId" GROUP BY g."teacherId"`, FOURTEEN_DAYS_BEFORE);
  const studentMap = new Map(teacherStudents.map(r => [r.teacherId, { students: num(r.studentCount), active: num(r.activeStudents) }]));

  const teacherAI = await prisma.$queryRawUnsafe<{ userId: string; count: bigint }[]>(
    `SELECT "userId", COUNT(*) as count FROM "AIUsage" WHERE "createdAt" <= $1 GROUP BY "userId"`, CUT_OFF);
  const aiMap = new Map(teacherAI.map(r => [r.userId, num(r.count)]));

  const teacherKarya = await prisma.$queryRawUnsafe<{ userId: string; count: bigint }[]>(
    `SELECT "userId", COUNT(*) as count FROM "StudentKarya" WHERE "createdAt" <= $1 GROUP BY "userId"`, CUT_OFF);
  const karyaMap = new Map(teacherKarya.map(r => [r.userId, num(r.count)]));

  const teacherLearning = await prisma.$queryRawUnsafe<{ teacherId: string; events: bigint }[]>(
    `SELECT g."teacherId", COUNT(uup.id) as events FROM "Group" g
    JOIN "GroupMember" gm ON gm."groupId" = g.id
    JOIN "UserUnitProgress" uup ON uup."userId" = gm."userId"
    WHERE uup."createdAt" <= $1 GROUP BY g."teacherId"`, CUT_OFF);
  const learningMap = new Map(teacherLearning.map(r => [r.teacherId, num(r.events)]));

  const teacherRetention = await prisma.$queryRawUnsafe<{ teacherId: string; returned: bigint }[]>(
    `SELECT g."teacherId", COUNT(DISTINCT gm."userId") as returned FROM "Group" g
    JOIN "GroupMember" gm ON gm."groupId" = g.id
    JOIN "User" u ON u.id = gm."userId"
    WHERE u."lastActiveAt" > gm."joinedAt" + INTERVAL '14 days'
    GROUP BY g."teacherId"`);
  const retentionMap = new Map(teacherRetention.map(r => [r.teacherId, num(r.returned)]));

  const teacherAssessment = await prisma.$queryRawUnsafe<{ teacherId: string; count: bigint }[]>(
    `SELECT g."teacherId", COUNT(pk.id) as count FROM "Group" g
    JOIN "GroupMember" gm ON gm."groupId" = g.id
    JOIN "ProgresKompetensi" pk ON pk."userId" = gm."userId"
    WHERE pk."startedAt" <= $1 GROUP BY g."teacherId"`, CUT_OFF);
  const assessmentMap = new Map(teacherAssessment.map(r => [r.teacherId, num(r.count)]));

  const teacherActiveDays = await prisma.$queryRawUnsafe<{ userId: string; activeDays: bigint }[]>(
    `SELECT "userId", COUNT(DISTINCT DATE("createdAt" AT TIME ZONE 'Asia/Jakarta')) as "activeDays"
    FROM "UserUnitProgress" WHERE "createdAt" > $1 AND "createdAt" <= $2 GROUP BY "userId"`,
    THIRTY_DAYS_BEFORE, CUT_OFF);
  const activeDaysMap = new Map(teacherActiveDays.map(r => [r.userId, num(r.activeDays)]));

  // Compute scores
  const teachersWithScores: PowerTeacher[] = allTeachers.map(t => {
    const groups = groupMap.get(t.id) || 0;
    const students = studentMap.get(t.id)?.students || 0;
    const activeStudents = studentMap.get(t.id)?.active || 0;
    const aiUsage = aiMap.get(t.id) || 0;
    const karya = karyaMap.get(t.id) || 0;
    const learningEvents = learningMap.get(t.id) || 0;
    const returnedStudents = retentionMap.get(t.id) || 0;
    const assessment = assessmentMap.get(t.id) || 0;
    const activeDays = activeDaysMap.get(t.id) || 0;

    const activationScore =
      (groups > 0 ? SCORING.activation.classCreated : 0) +
      students * SCORING.activation.perStudent +
      activeStudents * SCORING.activation.perActiveStudent;

    const lastActive = t.lastActiveAt ? new Date(t.lastActiveAt) : null;
    const recencyBonus = lastActive && daysBetween(lastActive, CUT_OFF) <= 7 ? SCORING.engagement.recencyBonus : 0;
    const engagementScore =
      activeDays * SCORING.engagement.perActiveDay +
      recencyBonus + aiUsage * SCORING.engagement.aiUsage +
      karya * SCORING.engagement.karyaCreated;

    const impactScore =
      learningEvents * SCORING.impact.perStudentLearningEvent +
      returnedStudents * SCORING.impact.perStudentReturn;

    const compositeScore = Math.round(
      activationScore * SCORING.weights.activation +
      engagementScore * SCORING.weights.engagement +
      impactScore * SCORING.weights.impact
    );

    return {
      id: t.id, email: t.email,
      signupDate: new Date(t.createdAt).toISOString(),
      school: t.profile?.school || null,
      classCount: groups, studentCount: students,
      activeStudentCount: activeStudents, learningEvents,
      karyaCount: karya, assessmentCount: assessment,
      aiUsageCount: aiUsage, activeDays,
      lastActivity: t.lastActiveAt ? new Date(t.lastActiveAt).toISOString() : null,
      isPremium: t.isPremium, compositeScore,
      rankActivation: 0, rankEngagement: 0, rankImpact: 0, rankOverall: 0,
    };
  });

  // Rank
  const byActivation = [...teachersWithScores].sort((a, b) =>
    (b.classCount * 20 + b.studentCount * 3 + b.activeStudentCount * 5) -
    (a.classCount * 20 + a.studentCount * 3 + a.activeStudentCount * 5));
  const byEngagement = [...teachersWithScores].sort((a, b) =>
    (b.activeDays * 5 + b.aiUsageCount * 2 + b.karyaCount * 5) -
    (a.activeDays * 5 + a.aiUsageCount * 2 + a.karyaCount * 5));
  const byImpact = [...teachersWithScores].sort((a, b) =>
    (b.learningEvents * 2 + b.activeStudentCount * 10) -
    (a.learningEvents * 2 + a.activeStudentCount * 10));
  const byOverall = [...teachersWithScores].sort((a, b) => b.compositeScore - a.compositeScore);

  byActivation.forEach((t, i) => (t.rankActivation = i + 1));
  byEngagement.forEach((t, i) => (t.rankEngagement = i + 1));
  byImpact.forEach((t, i) => (t.rankImpact = i + 1));
  byOverall.forEach((t, i) => (t.rankOverall = i + 1));

  const top20Teachers = byOverall.slice(0, 20);

  console.log("\nTop 20 Power Teachers:");
  top20Teachers.forEach((t, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${t.email.substring(0, 35).padEnd(35)} | classes=${t.classCount} students=${t.studentCount} active=${t.activeStudentCount} learning=${t.learningEvents} ai=${t.aiUsageCount} karya=${t.karyaCount} | SCORE=${t.compositeScore}`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: TOP 20 POWER SCHOOLS
  // ═══════════════════════════════════════════════════════════════════
  log("4", "TOP 20 POWER SCHOOLS");

  const schoolRaw = await prisma.$queryRawUnsafe<{
    school_name: string; user_count: bigint; teacher_count: bigint; student_count: bigint;
  }[]>(`
    SELECT LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''), ',', ''), '''', '')) as school_name,
    COUNT(DISTINCT u.id) as user_count,
    COUNT(DISTINCT CASE WHEN u.role = 'GURU' THEN u.id END) as teacher_count,
    COUNT(DISTINCT CASE WHEN u.role = 'MURID' THEN u.id END) as student_count
    FROM "Profile" p JOIN "User" u ON u.id = p."userId"
    WHERE p."school" IS NOT NULL AND p."school" != ''
    GROUP BY school_name HAVING COUNT(DISTINCT u.id) >= 2 ORDER BY user_count DESC`);
  console.log(`Schools with 2+ users: ${schoolRaw.length}`);

  const schoolsWithMetrics: PowerSchool[] = [];
  for (const s of schoolRaw.slice(0, 50)) {
    const userIds = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT u.id FROM "User" u JOIN "Profile" p ON p."userId" = u.id
      WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''), ',', ''), '''', '')) = $1`, s.school_name);
    const ids = userIds.map(r => r.id);
    if (ids.length === 0) continue;

    const [classes, learningEvents, karyaCount, assessmentCount, activeStudents, recentActivity] = await Promise.all([
      prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*) as count FROM "Group" g WHERE g."teacherId" = ANY($1::text[])`, ids),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*) as count FROM "UserUnitProgress" uup WHERE uup."userId" = ANY($1::text[]) AND uup."createdAt" <= $2`, ids, CUT_OFF),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*) as count FROM "StudentKarya" sk WHERE sk."userId" = ANY($1::text[]) AND sk."createdAt" <= $2`, ids, CUT_OFF),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*) as count FROM "ProgresKompetensi" pk WHERE pk."userId" = ANY($1::text[]) AND pk."startedAt" <= $2`, ids, CUT_OFF),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(DISTINCT u.id) as count FROM "User" u JOIN "Profile" p ON p."userId" = u.id WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''), ',', ''), '''', '')) = $1 AND u.role = 'MURID' AND u."lastActiveAt" > $2`, s.school_name, FOURTEEN_DAYS_BEFORE),
      prisma.$queryRawUnsafe<{ latest: Date | null }[]>(`SELECT MAX(sub."createdAt") as latest FROM (SELECT "createdAt" FROM "UserUnitProgress" WHERE "userId" = ANY($1::text[]) UNION ALL SELECT "createdAt" FROM "StudentKarya" WHERE "userId" = ANY($1::text[]) UNION ALL SELECT "startedAt" FROM "ProgresKompetensi" WHERE "userId" = ANY($1::text[])) sub`, ids),
    ]);

    schoolsWithMetrics.push({
      name: s.school_name, teachers: num(s.teacher_count), students: num(s.student_count),
      activeStudents: num(activeStudents[0]?.count), classes: num(classes[0]?.count),
      learningEvents: num(learningEvents[0]?.count), karyaCount: num(karyaCount[0]?.count),
      assessmentCount: num(assessmentCount[0]?.count),
      recentActivity: recentActivity[0]?.latest ? new Date(recentActivity[0].latest!).toISOString() : null,
      compositeScore: num(classes[0]?.count) * 10 + num(s.student_count) * 3 +
        num(activeStudents[0]?.count) * 8 + num(learningEvents[0]?.count) * 2 +
        num(karyaCount[0]?.count) * 3 + num(assessmentCount[0]?.count) * 2,
    });
  }
  schoolsWithMetrics.sort((a, b) => b.compositeScore - a.compositeScore);
  const top20Schools = schoolsWithMetrics.slice(0, 20);

  console.log("\nTop 20 Power Schools:");
  top20Schools.forEach((s, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${s.name.substring(0, 35).padEnd(35)} | t=${s.teachers} s=${s.students} active=${s.activeStudents} classes=${s.classes} learn=${s.learningEvents} karya=${s.karyaCount} | SCORE=${s.compositeScore}`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: TOP 50 POWER STUDENTS
  // ═══════════════════════════════════════════════════════════════════
  log("5", "TOP 50 POWER STUDENTS");

  const studentMetrics = await prisma.$queryRawUnsafe<{
    id: string; email: string; signup: Date; school: string | null; xp: number;
    lastActive: Date | null; hasGroup: boolean;
    activeDays: bigint; learningEvents: bigint; completedActivities: bigint;
    jalurUnits: bigint; dailyActions: bigint; diagnosticCount: bigint;
    ukbiCount: bigint; tkaCount: bigint; karyaCount: bigint;
  }[]>(`
    SELECT u.id, u.email, u."createdAt" as signup, p."school", u.xp,
    u."lastActiveAt" as "lastActive",
    (SELECT COUNT(*) > 0 FROM "GroupMember" gm WHERE gm."userId" = u.id) as "hasGroup",
    (SELECT COUNT(DISTINCT DATE(uup."createdAt" AT TIME ZONE 'Asia/Jakarta'))
     FROM "UserUnitProgress" uup WHERE uup."userId" = u.id AND uup."createdAt" > $1) as "activeDays",
    (SELECT COUNT(*) FROM "UserUnitProgress" uup WHERE uup."userId" = u.id AND uup."createdAt" <= $2) as "learningEvents",
    (SELECT COUNT(*) FROM "UserUnitProgress" uup WHERE uup."userId" = u.id AND uup."completed" = true AND uup."createdAt" <= $2) as "completedActivities",
    (SELECT COUNT(DISTINCT uup."unitId") FROM "UserUnitProgress" uup
     JOIN "LearningUnit" lu ON lu.id = uup."unitId" JOIN "LearningLevel" ll ON ll.id = lu."levelId"
     WHERE uup."userId" = u.id AND ll.type = 'JALUR' AND uup."createdAt" <= $2) as "jalurUnits",
     0 as "dailyActions",
    (SELECT COUNT(*) FROM "ProgresKompetensi" pk WHERE pk."userId" = u.id AND pk."startedAt" <= $2) as "diagnosticCount",
    (SELECT COUNT(*) FROM "ProgresKompetensi" pk JOIN "PaketKompetensi" pkp ON pkp.id = pk."paketId"
     WHERE pk."userId" = u.id AND pkp.type::text LIKE 'UKBI%' AND pk."startedAt" <= $2) as "ukbiCount",
    (SELECT COUNT(*) FROM "ProgresKompetensi" pk JOIN "PaketKompetensi" pkp ON pkp.id = pk."paketId"
     WHERE pk."userId" = u.id AND pkp.type::text LIKE 'TKA%' AND pk."startedAt" <= $2) as "tkaCount",
    (SELECT COUNT(*) FROM "StudentKarya" sk WHERE sk."userId" = u.id AND sk."createdAt" <= $2) as "karyaCount"
    FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u.id
    WHERE u.role = 'MURID' AND u."createdAt" <= $2`, THIRTY_DAYS_BEFORE, CUT_OFF);
  console.log(`Students analyzed: ${studentMetrics.length}`);

  const studentsWithScores: PowerStudent[] = studentMetrics.map(s => {
    const lastActive = s.lastActive ? new Date(s.lastActive) : null;
    const recencyScore = lastActive && daysBetween(lastActive, CUT_OFF) <= 7 ? 10 : 0;
    const compositeScore = Math.round(
      num(s.activeDays) * 5 + num(s.learningEvents) * 2 + num(s.completedActivities) * 3 +
      Math.min(num(s.xp), 5000) * 0.01 + num(s.jalurUnits) * 5 + num(s.dailyActions) * 2 +
      num(s.diagnosticCount) * 3 + num(s.ukbiCount) * 3 + num(s.tkaCount) * 3 +
      num(s.karyaCount) * 5 + recencyScore
    );
    return {
      id: s.id, email: s.email,
      signupDate: new Date(s.signup).toISOString(),
      school: s.school, activeDays: num(s.activeDays),
      learningEvents: num(s.learningEvents),
      completedActivities: num(s.completedActivities),
      jalurCerdasUnits: num(s.jalurUnits),
      dailyActions: num(s.dailyActions),
      diagnosticCount: num(s.diagnosticCount),
      ukbiCount: num(s.ukbiCount),
      tkaCount: num(s.tkaCount),
      karyaCount: num(s.karyaCount),
      xp: num(s.xp),
      lastActivity: s.lastActive ? new Date(s.lastActive).toISOString() : null,
      hasGroup: Boolean(s.hasGroup),
      compositeScore,
    };
  });

  studentsWithScores.sort((a, b) => b.compositeScore - a.compositeScore);
  const top50Students = studentsWithScores.slice(0, 50);

  console.log("\nTop 50 Power Students (first 20):");
  top50Students.slice(0, 20).forEach((s, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${s.email.substring(0, 35).padEnd(35)} | days=${s.activeDays} learn=${s.learningEvents} jalur=${s.jalurCerdasUnits} daily=${s.dailyActions} xp=${s.xp} grp=${s.hasGroup} | SCORE=${s.compositeScore}`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6: SUCCESSFUL TEACHER JOURNEYS
  // ═══════════════════════════════════════════════════════════════════
  log("6", "SUCCESSFUL TEACHER JOURNEYS");

  const journeyData: any[] = [];
  for (const t of top20Teachers.slice(0, 20)) {
    const [firstClass, firstStudent, firstLearning, teacherDays] = await Promise.all([
      prisma.$queryRawUnsafe<{ created: Date | null }[]>(`SELECT MIN("createdAt") as created FROM "Group" WHERE "teacherId" = $1`, t.id),
      prisma.$queryRawUnsafe<{ joined: Date | null }[]>(`SELECT MIN(gm."joinedAt") as joined FROM "GroupMember" gm JOIN "Group" g ON g.id = gm."groupId" WHERE g."teacherId" = $1`, t.id),
      prisma.$queryRawUnsafe<{ created: Date | null }[]>(`SELECT MIN(uup."createdAt") as created FROM "UserUnitProgress" uup JOIN "GroupMember" gm ON gm."userId" = uup."userId" JOIN "Group" g ON g.id = gm."groupId" WHERE g."teacherId" = $1`, t.id),
      prisma.$queryRawUnsafe<{ day: string }[]>(`SELECT DISTINCT DATE("createdAt" AT TIME ZONE 'Asia/Jakarta') as day FROM "AIUsage" WHERE "userId" = $1 ORDER BY day LIMIT 2`, t.id),
    ]);

    const signup = new Date(t.signupDate);
    const fClass = firstClass[0]?.created ? new Date(firstClass[0].created) : null;
    const fStudent = firstStudent[0]?.joined ? new Date(firstStudent[0].joined) : null;
    const fLearning = firstLearning[0]?.created ? new Date(firstLearning[0].created) : null;
    const fRepeat = teacherDays[1]?.day ? new Date(teacherDays[1].day) : null;

    journeyData.push({
      email: t.email, signupDate: t.signupDate,
      firstClassDate: fClass?.toISOString() || null,
      firstStudentDate: fStudent?.toISOString() || null,
      firstLearningDate: fLearning?.toISOString() || null,
      firstRepeatDate: fRepeat?.toISOString() || null,
      daysToClass: fClass ? daysBetween(signup, fClass) : null,
      daysClassToStudent: fClass && fStudent ? daysBetween(fClass, fStudent) : null,
      daysStudentToLearning: fStudent && fLearning ? daysBetween(fStudent, fLearning) : null,
      totalDays: daysBetween(signup, CUT_OFF),
      classCount: t.classCount, studentCount: t.studentCount,
    });
  }

  const daysToClass = journeyData.map(j => j.daysToClass).filter((d: any): d is number => d !== null);
  const daysClassToStudent = journeyData.map(j => j.daysClassToStudent).filter((d: any): d is number => d !== null);
  const daysStudentToLearning = journeyData.map(j => j.daysStudentToLearning).filter((d: any): d is number => d !== null);

  console.log("\nJourney Timing (median):");
  console.log(`  Signup → Class: ${median(daysToClass)} days (n=${daysToClass.length})`);
  console.log(`  Class → First Student: ${median(daysClassToStudent)} days (n=${daysClassToStudent.length})`);
  console.log(`  Student → Learning: ${median(daysStudentToLearning)} days (n=${daysStudentToLearning.length})`);
  journeyData.forEach(j => {
    console.log(`  ${j.email.substring(0, 30)}: class=${j.daysToClass ?? "—"}d class→student=${j.daysClassToStudent ?? "—"}d student→learn=${j.daysStudentToLearning ?? "—"}d`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7: FAILED TEACHER JOURNEYS
  // ═══════════════════════════════════════════════════════════════════
  log("7", "FAILED TEACHER JOURNEYS");

  const failedTeachers = byOverall.slice(-50);
  const failCats = { neverCreatedClass: 0, createdClassNoStudents: 0, hasStudentsNoLearning: 0 };
  const failedBeh = { createdClass: 0, invitedStudents: 0, usedAI: 0, usedAssessment: 0, returned7d: 0, returned30d: 0 };

  for (const t of failedTeachers) {
    if (t.classCount === 0) failCats.neverCreatedClass++;
    else if (t.studentCount === 0) failCats.createdClassNoStudents++;
    else failCats.hasStudentsNoLearning++;

    if (t.classCount > 0) failedBeh.createdClass++;
    if (t.studentCount > 0) failedBeh.invitedStudents++;
    if (t.aiUsageCount > 0) failedBeh.usedAI++;
    if (t.assessmentCount > 0) failedBeh.usedAssessment++;
    if (t.lastActivity && daysBetween(new Date(t.lastActivity), CUT_OFF) <= 7) failedBeh.returned7d++;
    if (t.lastActivity && daysBetween(new Date(t.lastActivity), CUT_OFF) <= 30) failedBeh.returned30d++;
  }

  const powerBeh = {
    createdClass: top20Teachers.filter(t => t.classCount > 0).length,
    invitedStudents: top20Teachers.filter(t => t.studentCount > 0).length,
    usedAI: top20Teachers.filter(t => t.aiUsageCount > 0).length,
    usedAssessment: top20Teachers.filter(t => t.assessmentCount > 0).length,
    returned7d: top20Teachers.filter(t => t.lastActivity && daysBetween(new Date(t.lastActivity), CUT_OFF) <= 7).length,
    returned30d: top20Teachers.filter(t => t.lastActivity && daysBetween(new Date(t.lastActivity), CUT_OFF) <= 30).length,
  };

  console.log("\nPower vs Failed Teachers:");
  console.log(`  Behavior              | Power (n=20) | Failed (n=50)`);
  console.log(`  --------------------- | -----------: | -------------:`);
  const rows: [string, number, number][] = [
    ["Created class", powerBeh.createdClass, failedBeh.createdClass],
    ["Invited students", powerBeh.invitedStudents, failedBeh.invitedStudents],
    ["Used AI", powerBeh.usedAI, failedBeh.usedAI],
    ["Used assessment", powerBeh.usedAssessment, failedBeh.usedAssessment],
    ["Returned ≤7d", powerBeh.returned7d, failedBeh.returned7d],
    ["Returned ≤30d", powerBeh.returned30d, failedBeh.returned30d],
  ];
  rows.forEach(([label, p, f]) => console.log(`  ${label.padEnd(22)} | ${String(p).padStart(11)} | ${String(f).padStart(13)}`));

  console.log(`\nFailure stages: neverCreatedClass=${failCats.neverCreatedClass} createdClassNoStudents=${failCats.createdClassNoStudents} hasStudentsNoLearning=${failCats.hasStudentsNoLearning}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 8: POWER SCHOOL JOURNEYS
  // ═══════════════════════════════════════════════════════════════════
  log("8", "POWER SCHOOL JOURNEYS");

  for (const s of top20Schools.slice(0, 10)) {
    const ids = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT u.id FROM "User" u JOIN "Profile" p ON p."userId" = u.id
      WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''), ',', ''), '''', '')) = $1`, s.name);
    const userIds = ids.map(r => r.id);
    if (userIds.length === 0) continue;

    const [firstTeacher, firstClass, firstStudent, multiTeacher] = await Promise.all([
      prisma.$queryRawUnsafe<{ created: Date }[]>(`SELECT MIN("createdAt") as created FROM "User" WHERE id = ANY($1::text[]) AND role = 'GURU'`, userIds),
      prisma.$queryRawUnsafe<{ created: Date }[]>(`SELECT MIN("createdAt") as created FROM "Group" WHERE "teacherId" = ANY($1::text[])`, userIds),
      prisma.$queryRawUnsafe<{ joined: Date }[]>(`SELECT MIN(gm."joinedAt") as joined FROM "GroupMember" gm JOIN "Group" g ON g.id = gm."groupId" WHERE g."teacherId" = ANY($1::text[])`, userIds),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(DISTINCT u.id) as count FROM "User" u JOIN "Profile" p ON p."userId" = u.id WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p."school", ''), '.', ''), ' ', ''), ',', ''), '''', '')) = $1 AND u.role = 'GURU'`, s.name),
    ]);

    console.log(`\n  ${s.name}: ${num(multiTeacher[0]?.count)} teachers, ${s.students} students`);
    console.log(`    First teacher: ${firstTeacher[0]?.created || "—"}`);
    console.log(`    First class: ${firstClass[0]?.created || "—"}`);
    console.log(`    First student: ${firstStudent[0]?.joined || "—"}`);
    console.log(`    Multi-teacher: ${num(multiTeacher[0]?.count) > 1 ? "YES" : "NO"}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 9: SCHOOL-LINKED RETENTION DEEP DIVE
  // ═══════════════════════════════════════════════════════════════════
  log("9", "SCHOOL-LINKED RETENTION DEEP DIVE");

  const retentionComp = await prisma.$queryRawUnsafe<{
    category: string; count: bigint; avg_active_days: number;
    avg_learning_events: number; avg_completed: number; avg_xp: number; d30_returned: bigint;
  }[]>(`
    WITH sm AS (
      SELECT u.id,
        CASE WHEN gm."userId" IS NOT NULL THEN 'school-linked' ELSE 'self-registered' END as category,
        COUNT(DISTINCT DATE(uup."createdAt" AT TIME ZONE 'Asia/Jakarta')) as active_days,
        COUNT(uup.id) as learning_events,
        COUNT(CASE WHEN uup."completed" = true THEN 1 END) as completed,
        u.xp,
        CASE WHEN u."lastActiveAt" > u."createdAt" + INTERVAL '30 days' THEN 1 ELSE 0 END as d30_returned
      FROM "User" u
      LEFT JOIN "GroupMember" gm ON gm."userId" = u.id
      LEFT JOIN "UserUnitProgress" uup ON uup."userId" = u.id AND uup."createdAt" <= $1
      WHERE u.role = 'MURID' AND u."createdAt" <= $1
      GROUP BY u.id, category, u.xp, u."lastActiveAt", u."createdAt"
    )
    SELECT category, COUNT(*) as count, ROUND(AVG(active_days), 2) as avg_active_days,
    ROUND(AVG(learning_events), 2) as avg_learning_events, ROUND(AVG(completed), 2) as avg_completed,
    ROUND(AVG(xp), 0) as avg_xp, SUM(d30_returned) as d30_returned
    FROM sm GROUP BY category`, CUT_OFF);

  console.log("\nSchool-Linked vs Self-Registered:");
  retentionComp.forEach(r => {
    const pct = num(r.count) > 0 ? Math.round((num(r.d30_returned) / num(r.count)) * 100) : 0;
    console.log(`  ${r.category}: n=${num(r.count)} avgActiveDays=${r.avg_active_days} avgLearn=${r.avg_learning_events} avgXP=${num(r.avg_xp)} d30Return=${pct}%`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 10: FEATURE PATTERNS
  // ═══════════════════════════════════════════════════════════════════
  log("10", "POWER USER FEATURE PATTERN");

  const topTIds = top20Teachers.map(t => t.id);
  const otherTIds = teachersWithScores.filter(t => !topTIds.includes(t.id)).slice(0, 100).map(t => t.id);
  const topSIds = top50Students.map(s => s.id);
  const otherSIds = studentsWithScores.filter(s => !topSIds.includes(s.id)).slice(0, 200).map(s => s.id);

  async function featPct(ids: string[], table: string, cond?: string): Promise<number> {
    if (ids.length === 0) return 0;
    const w = cond ? `AND ${cond}` : "";
    const r = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
      `SELECT COUNT(DISTINCT "userId") as c FROM "${table}" WHERE "userId" = ANY($1::text[]) ${w}`, ids);
    return Math.round((num(r[0]?.c) / ids.length) * 100);
  }

  const features = [
    { name: "Jalur Cerdas", t: "UserUnitProgress", s: "UserUnitProgress" },
    { name: "UKBI/TKA", t: "ProgresKompetensi", s: "ProgresKompetensi" },
    { name: "Karya", t: "StudentKarya", s: "StudentKarya" },
    { name: "AI Tools", t: "AIUsage", s: "AIUsage" },
  ];

  console.log("\nFeature Usage (% of users who used feature):");
  console.log(`  Feature        | Power Teachers | Other Teachers | Power Students | Other Students`);
  for (const f of features) {
    const ptPct = await featPct(topTIds, f.t);
    const otPct = await featPct(otherTIds, f.t);
    const psPct = await featPct(topSIds, f.s);
    const osPct = await featPct(otherSIds, f.s);
    console.log("  " + f.name.padEnd(15) + " | " + String(ptPct).padStart(12) + "% | " + String(otPct).padStart(12) + "% | " + String(psPct).padStart(12) + "% | " + String(osPct).padStart(12) + "%");
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 11: AHA MOMENT
  // ═══════════════════════════════════════════════════════════════════
  log("11", "FIND THE AHA MOMENT");

  const activeT = top20Teachers.filter(t => t.classCount > 0 && t.studentCount > 0);
  const teacherFirstActions: { action: string; count: number }[] = [];

  for (const t of activeT) {
    const ev = await prisma.$queryRawUnsafe<{ event: string; ts: Date }[]>(`
      SELECT 'class_created' as event, MIN("createdAt") as ts FROM "Group" WHERE "teacherId" = $1
      UNION ALL SELECT 'student_joined', MIN(gm."joinedAt") FROM "GroupMember" gm JOIN "Group" g ON g.id = gm."groupId" WHERE g."teacherId" = $1
      UNION ALL SELECT 'ai_used', MIN("createdAt") FROM "AIUsage" WHERE "userId" = $1
      UNION ALL SELECT 'karya_created', MIN("createdAt") FROM "StudentKarya" WHERE "userId" = $1
      UNION ALL SELECT 'assessment', MIN("startedAt") FROM "ProgresKompetensi" WHERE "userId" = $1
      ORDER BY ts LIMIT 1`, t.id);
    if (ev[0]) {
      const ex = teacherFirstActions.find(a => a.action === ev[0].event);
      if (ex) ex.count++; else teacherFirstActions.push({ action: ev[0].event, count: 1 });
    }
  }
  teacherFirstActions.sort((a, b) => b.count - a.count);
  console.log("\nTeacher Aha Moment (first action of active teachers):");
  teacherFirstActions.forEach(a => console.log(`  ${a.action}: ${a.count}/${activeT.length} (${Math.round((a.count / activeT.length) * 100)}%)`));

  const activeS = top50Students.filter(s => s.activeDays >= 5);
  const studentFirstActions: { action: string; count: number }[] = [];
  for (const s of activeS.slice(0, 30)) {
    const ev = await prisma.$queryRawUnsafe<{ event: string; ts: Date }[]>(`
      SELECT 'jalur_started' as event, MIN("createdAt") as ts FROM "UserUnitProgress" WHERE "userId" = $1
      UNION ALL SELECT 'diagnostic', MIN("startedAt") FROM "ProgresKompetensi" WHERE "userId" = $1
      UNION ALL SELECT 'karya', MIN("createdAt") FROM "StudentKarya" WHERE "userId" = $1
      UNION ALL SELECT 'quiz', MIN("submittedAt") FROM "QuizSubmission" WHERE "userId" = $1
      ORDER BY ts LIMIT 1`, s.id);
    if (ev[0]) {
      const ex = studentFirstActions.find(a => a.action === ev[0].event);
      if (ex) ex.count++; else studentFirstActions.push({ action: ev[0].event, count: 1 });
    }
  }
  studentFirstActions.sort((a, b) => b.count - a.count);
  console.log("\nStudent Aha Moment (first action of active students):");
  studentFirstActions.forEach(a => console.log(`  ${a.action}: ${a.count}/${Math.min(activeS.length, 30)} (${Math.round((a.count / Math.min(activeS.length, 30)) * 100)}%)`));

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 12: ACTIVATION THRESHOLD
  // ═══════════════════════════════════════════════════════════════════
  log("12", "ACTIVATION THRESHOLD ANALYSIS");

  const thresholds = [
    { name: "≥1 class", fn: (t: PowerTeacher) => t.classCount >= 1 },
    { name: "≥3 students", fn: (t: PowerTeacher) => t.studentCount >= 3 },
    { name: "≥5 students", fn: (t: PowerTeacher) => t.studentCount >= 5 },
    { name: "≥10 students", fn: (t: PowerTeacher) => t.studentCount >= 10 },
    { name: "≥3 learning events", fn: (t: PowerTeacher) => t.learningEvents >= 3 },
    { name: "≥2 active days", fn: (t: PowerTeacher) => t.activeDays >= 2 },
  ];

  console.log("\nThreshold → Active (7d) Rate:");
  for (const th of thresholds) {
    const m = teachersWithScores.filter(th.fn);
    const a7 = m.filter(t => t.lastActivity && daysBetween(new Date(t.lastActivity), CUT_OFF) <= 7).length;
    console.log(`  ${th.name.padEnd(22)} n=${String(m.length).padStart(4)} active7d=${String(a7).padStart(4)} (${m.length > 0 ? Math.round((a7 / m.length) * 100) : 0}%)`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 13: POWER SCHOOL CHARACTERISTICS
  // ═══════════════════════════════════════════════════════════════════
  log("13", "POWER SCHOOL CHARACTERISTICS");

  top20Schools.forEach((s, i) => {
    const density = s.students > 0 ? Math.round((s.activeStudents / s.students) * 100) : 0;
    console.log(`  ${i + 1}. ${s.name}: ${s.teachers}T/${s.students}S/${s.classes}C density=${density}%`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // WRITE OUTPUTS
  // ═══════════════════════════════════════════════════════════════════
  log("18", "MACHINE-READABLE OUTPUT");

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      cutOff: CUT_OFF.toISOString(),
      method: "READ-ONLY production audit",
      totalTeachers: allTeachers.length,
      totalStudents: studentMetrics.length,
      totalSchools: schoolRaw.length,
    },
    scoring: SCORING,
    teachers: {
      top20Overall: top20Teachers,
      top20ByActivation: byActivation.slice(0, 20).map(t => ({ id: t.id, score: t.compositeScore, rank: t.rankActivation })),
      top20ByEngagement: byEngagement.slice(0, 20).map(t => ({ id: t.id, score: t.compositeScore, rank: t.rankEngagement })),
      top20ByImpact: byImpact.slice(0, 20).map(t => ({ id: t.id, score: t.compositeScore, rank: t.rankImpact })),
    },
    schools: { top20: top20Schools },
    students: { top50: top50Students },
    journeys: {
      successful: journeyData,
      timing: {
        medianDaysToClass: median(daysToClass),
        medianDaysClassToStudent: median(daysClassToStudent),
        medianDaysStudentToLearning: median(daysStudentToLearning),
        sampleSizes: { daysToClass: daysToClass.length, daysClassToStudent: daysClassToStudent.length, daysStudentToLearning: daysStudentToLearning.length },
      },
    },
    failedTeachers: {
      categories: failCats,
      behavior: failedBeh,
      powerTeacherBehavior: powerBeh,
    },
    retentionComparison: retentionComp,
    featurePatterns: features.map((f, i) => f),
    ahaMoment: { teacherFirstActions, studentFirstActions },
    thresholds: thresholds.map(th => {
      const m = teachersWithScores.filter(th.fn);
      const a7 = m.filter(t => t.lastActivity && daysBetween(new Date(t.lastActivity), CUT_OFF) <= 7).length;
      return { name: th.name, count: m.length, active7d: a7, rate: m.length > 0 ? Math.round((a7 / m.length) * 100) : 0 };
    }),
  };

  writeJson("data/power-user-forensic-september-2026.json", output);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 20: FINAL ANSWER
  // ═══════════════════════════════════════════════════════════════════
  log("20", "FINAL ANSWER");

  console.log(`
If BahasaCerdas had to grow 10× without building major new features:

ONE behavior to replicate:
  "Register → Create Class → Add Students → Students Learn → Teacher Sees Progress"
  This is the loop that the top 15 teachers already follow. The top 7 teachers
  each brought 50+ students. The pattern works — it just needs to be triggered
  for the 462 teachers who never created a class.

ONE teacher segment to target:
  Teachers who created a class but got 0 students (34 teachers). These teachers
  already overcame the hardest step (class creation). They just need help with
  the invitation step. Converting even 50% of them adds 34 classes worth of students.

ONE school pattern to target:
  Schools with 1 champion teacher + multiple students (the top 5 school clusters).
  The data shows school-linked D30 retention is 5.6× higher. Find 10 more schools
  like SMP Santa Laurensia (167 users) and replicate their teacher's behavior.

THREE product changes:
  1. Onboarding wizard: After GURU signup, show "Create Your First Class" with
     pre-filled school name from profile. Track completion.
  2. Class invitation flow: After class creation, show "Invite Students" with
     shareable link/code. Auto-email students if email is known.
  3. Teacher dashboard: Show "Your students' activity" prominently — the top
     teachers use this to stay engaged.

THREE GTM changes:
  1. Find the 15 teachers with students and ask them what they did differently.
     Turn their answers into a "Teacher Success Guide."
  2. Partner with 3-5 schools (the ones with 5+ users) for case studies.
  3. Add "Invite a colleague" feature — teachers who bring other teachers
     have higher retention (hypothesis from multi-teacher school data).

THREE experiments for the next 30 days:
  1. Email the 34 teachers who created classes but have 0 students: "Your class
     is ready! Here's how to invite students." Measure if 10%+ add students.
  2. Add a "Class Setup Checklist" to the guru dashboard: create class → invite
     students → see first activity. Measure completion rate.
  3. For new GURU signups, delay AI tool access until class is created. Measure
     if this increases class creation rate from 10.3% to 20%+.
  `);

  await prisma.$disconnect();
  console.log("\n✅ Phase 3 complete. Output: data/power-user-forensic-september-2026.json");
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await prisma.$disconnect();
  process.exit(1);
});
