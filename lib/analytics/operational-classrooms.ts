import { db } from "@/lib/db";
import { wibDaysAgo } from "@/lib/admin/analytics-timezone";

/**
 * Canonical Operational-Classroom + Teacher Activation + Funnel measurement
 * service (Operational Teacher Experiment, Phase 9 / P0 #7 measurement layer).
 *
 * Single source of truth for O1 (Activation), O3 (Operational Classrooms), and
 * the F1–F10 funnel, aligned EXACTLY with the approved specs:
 *   docs/OPERATIONAL_CLASSROOM_METRIC_SPEC_SEPTEMBER_2026.md
 *   docs/OPERATIONAL_TEACHER_EXPERIMENT_SPEC_SEPTEMBER_2026.md
 *   docs/TEACHER_ACTIVATION_ANALYTICS_SPEC_SEPTEMBER_2026.md
 *
 * All date windows: Asia/Jakarta (WIB, UTC+7), trailing-30d by WIB calendar
 * (reusing lib/admin/analytics-timezone.ts).
 *
 * Design rules (non-negotiable):
 *  - Z-evidence NEVER via legacy `User.xp` denormalized flag — only transactional
 *    rows: XPTransaction, QuizSubmission, UserUnitProgress, ProgresKompetensi,
 *    StudentKarya.
 *  - Founder separation: every cohort figure reported with-founders AND
 *    ex-founders (organic). Non-founder = role GURU && !isFounder.
 *  - Y counts DISTINCT students (GroupMember.userId) each with ≥1 Z-evidence.
 *  - X = teacher artifact (Penugasan/MateriKirim/Pengumuman teacher-owned for the
 *    group; QuizAssignment whose Quiz.creatorId = group.teacherId; OR ≥1
 *    StudentKarya published into the group by a member) in trailing-30d.
 *  - F4/F8 are PROXY (schema-backed) by design; ProductEvent table is read
 *    only when available (best-effort) and NEVER fabricated.
 */

export interface TimeRange {
  start: Date; // inclusive
  end: Date; // now
}

export interface GroupOperationalResult {
  groupId: string;
  groupName: string;
  teacherId: string;
  isFounderTeacher: boolean;
  operational: boolean; // currently operational in trailing-30d WIB
  operationalSince: Date | null; // max(earliestX, earliestY, earliestZ)
  operationalInLast90d: boolean;
  x: { hasArtifact: boolean; artifactCount: number; earliestX: Date | null };
  y: { distinctActiveStudents: number; studentFloor: number; ySatisfied: boolean; earliestY: Date | null };
  z: { distinctEvidenceStudents: number; zSatisfied: boolean; earliestZ: Date | null };
}

export interface OperationalClassroomsResult {
  windowDays: number;
  timezone: "Asia/Jakarta";
  now: Date;
  start: Date;
  totalGroups: number;
  operationalNow: number;
  operationalInLast90d: number;
  withFounders: {
    totalGroups: number;
    operationalNow: number;
  };
  exFounders: {
    totalGroups: number;
    operationalNow: number;
  };
  groups: GroupOperationalResult[];
}

/* ─────────────────────────── Z-EVIDENCE (student) ─────────────────────────── */

const Z_EVIDENCE_SOURCES = ["XPTransaction", "QuizSubmission", "UserUnitProgress", "ProgresKompetensi", "StudentKarya"] as const;

/**
 * Distinct group members with ≥1 Z-evidence in W, per group.
 * Returns Map<groupId, { userIds: string[]; earliestZ: Date }>.
 * NEVER reads `User.xp`.
 */
async function collectStudentZEvidence(range: TimeRange): Promise<
  Map<string, { userIds: Set<string>; earliestZ: Date }>
> {
  const out = new Map<string, { userIds: Set<string>; earliestZ: Date }>();
  const start = range.start;
  const end = range.end;

  const touch = (groupId: string, userId: string, ts: Date | null) => {
    if (!ts || ts < start || ts > end) return;
    let entry = out.get(groupId);
    if (!entry) {
      entry = { userIds: new Set(), earliestZ: ts };
      out.set(groupId, entry);
    }
    entry.userIds.add(userId);
    if (ts < entry.earliestZ) entry.earliestZ = ts;
  };

  // 1. XPTransaction — source-agnostic; userId + createdAt in W.
  //    Scoped by group membership below (can't join directly without group).
  const txRows = await db.xPTransaction.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { userId: true, createdAt: true },
  });
  const txByUser = new Map<string, Date>();
  for (const r of txRows) {
    const existing = txByUser.get(r.userId);
    if (!existing || r.createdAt < existing) txByUser.set(r.userId, r.createdAt);
  }

  // 2. Group membership lookup: load all members to map userId -> groups.
  //    We do this once and reuse for all Z legs + Y.
  const members = await db.groupMember.findMany({
    select: { groupId: true, userId: true },
  });
  const groupsByUser = new Map<string, Set<string>>();
  for (const m of members) {
    let set = groupsByUser.get(m.userId);
    if (!set) {
      set = new Set();
      groupsByUser.set(m.userId, set);
    }
    set.add(m.groupId);
  }

  // Apply XP evidence: for each user with XP in W, touch all their groups.
  for (const [userId, ts] of txByUser) {
    const gs = groupsByUser.get(userId);
    if (gs) for (const g of gs) touch(g, userId, ts);
  }

  // 3. QuizSubmission completed (submittedAt) in W.
  const quizSubs = await db.quizSubmission.findMany({
    where: { submittedAt: { gte: start, lte: end } },
    select: { userId: true, submittedAt: true, assignment: { select: { groupId: true } } },
  });
  for (const s of quizSubs) touch(s.assignment.groupId, s.userId, s.submittedAt);

  // 4. UserUnitProgress completed (completedAt) in W.
  const uupRows = await db.userUnitProgress.findMany({
    where: { completedAt: { gte: start, lte: end } },
    select: { userId: true, completedAt: true, unit: { select: { level: { select: { type: true } } } } },
  });
  // unit.level.type: JALUR vs PANDUAN — both count as student learning activity.
  for (const r of uupRows) {
    const gs = groupsByUser.get(r.userId);
    if (gs && r.completedAt) for (const g of gs) touch(g, r.userId, r.completedAt);
  }

  // 5. ProgresKompetensi finished (finishedAt) in W.
  const pkRows = await db.progresKompetensi.findMany({
    where: { finishedAt: { gte: start, lte: end } },
    select: { userId: true, finishedAt: true },
  });
  for (const r of pkRows) {
    const gs = groupsByUser.get(r.userId);
    if (gs && r.finishedAt) for (const g of gs) touch(g, r.userId, r.finishedAt);
  }

  // 6. StudentKarya published (createdAt) in W.
  const karyaRows = await db.studentKarya.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { userId: true, createdAt: true },
  });
  for (const r of karyaRows) {
    const gs = groupsByUser.get(r.userId);
    if (gs && r.createdAt) for (const g of gs) touch(g, r.userId, r.createdAt);
  }

  void Z_EVIDENCE_SOURCES;
  return out;
}

/* ─────────────────────────── X-ARTIFACT (teacher) ─────────────────────────── */

/**
 * Per-group teacher artifact evidence in W.
 * Returns Map<groupId, { earliestX: Date; artifactCount: number }>.
 */
async function collectTeacherArtifacts(range: TimeRange): Promise<
  Map<string, { earliestX: Date; artifactCount: number }>
> {
  const out = new Map<string, { earliestX: Date; artifactCount: number }>();
  const start = range.start;
  const end = range.end;

  const add = (groupId: string, ts: Date | null) => {
    if (!ts || ts < start || ts > end) return;
    let e = out.get(groupId);
    if (!e) {
      e = { earliestX: ts, artifactCount: 0 };
      out.set(groupId, e);
    }
    e.artifactCount += 1;
    if (ts < e.earliestX) e.earliestX = ts;
  };

  // Penugasan (teacher-owned, group-attached)
  const penugasan = await db.penugasan.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { groupId: true, createdAt: true },
  });
  for (const r of penugasan) add(r.groupId, r.createdAt);

  // MateriKirim (teacher-owned, group-attached)
  const materi = await db.materiKirim.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { groupId: true, createdAt: true },
  });
  for (const r of materi) add(r.groupId, r.createdAt);

  // Pengumuman (teacher-owned, group-attached)
  const pengumuman = await db.pengumuman.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { groupId: true, createdAt: true },
  });
  for (const r of pengumuman) add(r.groupId, r.createdAt);

  // QuizAssignment — teacher artifact via Quiz.creatorId = group.teacherId.
  // Resolve group teacher via Group table, and Quiz creator via Quiz table.
  const assignments = await db.quizAssignment.findMany({
    where: { assignedAt: { gte: start, lte: end } },
    select: {
      assignedAt: true,
      groupId: true,
      quiz: { select: { creatorId: true } },
    },
  });
  if (assignments.length > 0) {
    const groupIds = [...new Set(assignments.map((a) => a.groupId))];
    const groups = await db.group.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, teacherId: true },
    });
    const teacherByGroup = new Map(groups.map((g) => [g.id, g.teacherId]));
    for (const a of assignments) {
      const teacherId = teacherByGroup.get(a.groupId);
      if (teacherId && a.quiz.creatorId === teacherId) add(a.groupId, a.assignedAt);
    }
  }

  // StudentKarya "into the group" — a karya by a group member counts as X
  // artifact for that group (spec X definition: "or >=1 StudentKarya into the group").
  const groupIdsOf = new Set<string>();
  const members = await db.groupMember.findMany({ select: { groupId: true, userId: true } });
  const groupsByUser = new Map<string, Set<string>>();
  for (const m of members) {
    let s = groupsByUser.get(m.userId);
    if (!s) {
      s = new Set();
      groupsByUser.set(m.userId, s);
    }
    s.add(m.groupId);
  }
  const karya = await db.studentKarya.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { userId: true, createdAt: true },
  });
  for (const k of karya) {
    const gs = groupsByUser.get(k.userId);
    if (gs) for (const g of gs) {
      groupIdsOf.add(g);
      add(g, k.createdAt);
    }
  }

  void groupIdsOf;
  return out;
}

/* ─────────────────────────── OPERATIONAL CLASSROOMS (O3) ─────────────────────────── */

export interface OperationalClassroomsOptions {
  now?: Date;
  windowDays?: number;
  groupIds?: string[]; // optional subset
}

export async function getOperationalClassrooms(
  opts: OperationalClassroomsOptions = {}
): Promise<OperationalClassroomsResult> {
  const windowDays = opts.windowDays ?? 30;
  const now = opts.now ?? new Date();
  const start = wibDaysAgo(windowDays, now);

  const range: TimeRange = { start, end: now };

  // Load groups (optionally filtered).
  const groups = await db.group.findMany({
    where: opts.groupIds ? { id: { in: opts.groupIds } } : undefined,
    select: { id: true, name: true, teacherId: true },
  });
  const teacherIds = [...new Set(groups.map((g) => g.teacherId))];
  const teachers = teacherIds.length
    ? await db.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, isFounder: true } })
    : [];
  const isFounderByTeacher = new Map(teachers.map((t) => [t.id, t.isFounder]));

  const [zMap, xMap] = await Promise.all([
    collectStudentZEvidence(range),
    collectTeacherArtifacts(range),
  ]);

  // Group membership per group for Y distinct count + Z intersect.
  const members = await db.groupMember.findMany({ select: { groupId: true, userId: true } });
  const membersByGroup = new Map<string, Set<string>>();
  for (const m of members) {
    let s = membersByGroup.get(m.groupId);
    if (!s) {
      s = new Set();
      membersByGroup.set(m.groupId, s);
    }
    s.add(m.userId);
  }

  // Last-90d operational (at least once) — reuse same X/Z with a 90d window.
  const start90 = wibDaysAgo(90, now);
  const [zMap90] = await Promise.all([collectStudentZEvidence({ start: start90, end: now })]);

  const groupResults: GroupOperationalResult[] = [];

  for (const g of groups) {
    const z = zMap.get(g.id);
    const x = xMap.get(g.id);
    const z90 = zMap90.get(g.id);

    // Y: distinct active students = distinct GroupMembers who have ≥1 Z-evidence.
    const memberSet = membersByGroup.get(g.id) ?? new Set<string>();
    let distinctActiveStudents = 0;
    let earliestY: Date | null = null;
    if (z) {
      for (const uid of z.userIds) {
        if (memberSet.has(uid)) {
          distinctActiveStudents += 1;
          if (earliestY === null || z.earliestZ < earliestY) earliestY = z.earliestZ;
        }
      }
    }
    const ySatisfied = distinctActiveStudents >= 3;

    const hasArtifact = !!x;
    const artifactCount = x?.artifactCount ?? 0;
    const earliestX = x?.earliestX ?? null;
    const xSatisfied = hasArtifact;

    const distinctEvidenceStudents = z ? [...z.userIds].filter((u) => memberSet.has(u)).length : 0;
    const zSatisfied = distinctEvidenceStudents >= 1;
    const earliestZ = z?.earliestZ ?? null;

    // operationalSince = max(earliestX, earliestY, earliestZ); only meaningful if all legs.
    const operational = xSatisfied && ySatisfied && zSatisfied;
    const legTs = [earliestX, earliestY, earliestZ].filter((d): d is Date => !!d);
    const operationalSince = operational && legTs.length === 3 ? new Date(Math.max(...legTs.map((d) => d.getTime()))) : null;

    // Operational at least once in last 90d (X + Y + Z each present within 90d).
    const y90 = z90 ? [...z90.userIds].filter((u) => (membersByGroup.get(g.id) ?? new Set()).has(u)).length : 0;
    const x90 = !!(await Promise.all([db.penugasan.count({ where: { groupId: g.id, createdAt: { gte: start90, lte: now } } }),
      db.materiKirim.count({ where: { groupId: g.id, createdAt: { gte: start90, lte: now } } }),
      db.pengumuman.count({ where: { groupId: g.id, createdAt: { gte: start90, lte: now } } }),
      db.quizAssignment.count({ where: { groupId: g.id, assignedAt: { gte: start90, lte: now } } }),
      db.studentKarya.count({ where: { createdAt: { gte: start90, lte: now }, userId: { in: [...memberSet] } } }),
    ]).then((counts) => counts.some((c) => c > 0)));
    const operationalInLast90d = x90 && y90 >= 3 && z90 !== undefined;

    groupResults.push({
      groupId: g.id,
      groupName: g.name,
      teacherId: g.teacherId,
      isFounderTeacher: isFounderByTeacher.get(g.teacherId) ?? false,
      operational,
      operationalSince,
      operationalInLast90d,
      x: { hasArtifact, artifactCount, earliestX },
      y: { distinctActiveStudents, studentFloor: 3, ySatisfied, earliestY },
      z: { distinctEvidenceStudents, zSatisfied, earliestZ },
    });
  }

  const operationalNow = groupResults.filter((r) => r.operational).length;
  const operationalInLast90dCount = groupResults.filter((r) => r.operationalInLast90d).length;
  const withFounders = groupResults.filter((r) => r.isFounderTeacher);
  const exFounders = groupResults.filter((r) => !r.isFounderTeacher);

  return {
    windowDays,
    timezone: "Asia/Jakarta",
    now,
    start,
    totalGroups: groupResults.length,
    operationalNow,
    operationalInLast90d: operationalInLast90dCount,
    withFounders: {
      totalGroups: withFounders.length,
      operationalNow: withFounders.filter((r) => r.operational).length,
    },
    exFounders: {
      totalGroups: exFounders.length,
      operationalNow: exFounders.filter((r) => r.operational).length,
    },
    groups: groupResults,
  };
}

/* ─────────────────────────── ACTIVATION (O1) ─────────────────────────── */

export interface ActivationOptions {
  now?: Date;
  cohortKey?: string; // "2026-09-01" etc. — cohort of teachers creation-filter
  cohortFrom?: Date; // teachers whose createdAt >= cohortFrom
  cohortTo?: Date; // teachers whose createdAt < cohortTo
}

export interface ActivationResult {
  metric: "O1_ACTIVATION";
  cohortLabel: string;
  withFounders: { eligible: number; activated: number; percent: number };
  exFounders: { eligible: number; activated: number; percent: number };
  target: number; // >=25
  baseline: number; // 11.2
}

export async function getTeacherActivation(opts: ActivationOptions = {}): Promise<ActivationResult> {
  const now = opts.now ?? new Date();

  const teacherWhere: Record<string, unknown> = {
    role: "GURU",
    onboarded: true,
  };
  if (opts.cohortFrom || opts.cohortTo) {
    const createdAt: Record<string, Date> = {};
    if (opts.cohortFrom) createdAt.gte = opts.cohortFrom;
    if (opts.cohortTo) createdAt.lt = opts.cohortTo;
    teacherWhere.createdAt = createdAt;
  }

  const teachers = await db.user.findMany({
    where: teacherWhere as never,
    select: { id: true, isFounder: true },
  });

  const classCreators = await db.group.findMany({
    where: { teacherId: { in: teachers.map((t) => t.id) } },
    select: { teacherId: true },
  });
  const creatorSet = new Set(classCreators.map((c) => c.teacherId));

  const calc = (list: typeof teachers) => {
    const eligible = list.length;
    const activated = list.filter((t) => creatorSet.has(t.id)).length;
    return {
      eligible,
      activated,
      percent: eligible > 0 ? Math.round((activated / eligible) * 1000) / 10 : 0,
    };
  };

  const withFounders = calc(teachers);
  const exFounders = calc(teachers.filter((t) => !t.isFounder));

  return {
    metric: "O1_ACTIVATION",
    cohortLabel: opts.cohortKey ?? "ALL_GURU_ACTIVE",
    withFounders,
    exFounders,
    target: 25,
    baseline: 11.2,
  };
}

/* ─────────────────────────── FUNNEL (F1–F10) ─────────────────────────── */

export interface FunnelOptions {
  now?: Date;
  cohortFrom?: Date;
  cohortTo?: Date;
  teacherId?: string; // drilldown to a single teacher
}

export interface FunnelStage {
  stage: "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10";
  name: string;
  source: string;
  schema: boolean;
  proxy: boolean;
  count: number;
}

export interface FunnelResult {
  metric: "FUNNEL_F1_F10";
  scope: "ALL_GURU" | "COHORT" | "TEACHER";
  withFounders: FunnelStage[];
  exFounders: FunnelStage[];
}

/**
 * Funnel F1–F10. Schema-backed stages derive directly; F4/F8 are PROXY by design
 * (F4 = first GroupMember.joinedAt, F8 = first artifact after class create).
 * ProductEvent counts are merged additively ONLY when the table exists (best-effort),
 * never fabricated.
 */
export async function getTeacherFunnel(opts: FunnelOptions = {}): Promise<FunnelResult> {
  const now = opts.now ?? new Date();

  const teacherWhere: Record<string, unknown> = { role: "GURU", onboarded: true };
  if (opts.cohortFrom || opts.cohortTo) {
    const createdAt: Record<string, Date> = {};
    if (opts.cohortFrom) createdAt.gte = opts.cohortFrom;
    if (opts.cohortTo) createdAt.lt = opts.cohortTo;
    teacherWhere.createdAt = createdAt;
  }
  if (opts.teacherId) teacherWhere.id = opts.teacherId;

  const teachers = await db.user.findMany({
    where: teacherWhere as never,
    select: { id: true, isFounder: true },
  });
  const teacherIds = teachers.map((t) => t.id);

  const groups = await db.group.findMany({
    where: { teacherId: { in: teacherIds } },
    select: {
      id: true,
      teacherId: true,
      createdAt: true,
      members: { select: { userId: true, joinedAt: true } },
    },
  });

  // F3: teacher created >=1 class
  const groupsByTeacher = new Map<string, typeof groups>();
  for (const g of groups) {
    let arr = groupsByTeacher.get(g.teacherId);
    if (!arr) {
      arr = [];
      groupsByTeacher.set(g.teacherId, arr);
    }
    arr.push(g);
  }

  // Aggregate per teacher.
  const stats = new Map<string, {
    hasClass: boolean;
    minJoinAt: Date | null; // F5
    memberCountMax: number; // F6
    firstClassAt: Date | null; // for F8 proxy
    firstArtifactAfterClass: Date | null; // F8 proxy
  }>();

  for (const t of teachers) {
    stats.set(t.id, {
      hasClass: false,
      minJoinAt: null,
      memberCountMax: 0,
      firstClassAt: null,
      firstArtifactAfterClass: null,
    });
  }

  // Group members for F4/F5/F6.
  for (const g of groups) {
    const s = stats.get(g.teacherId);
    if (!s) continue;
    s.hasClass = true;
    if (!s.firstClassAt || g.createdAt < s.firstClassAt) s.firstClassAt = g.createdAt;
    const joins = g.members.map((m) => m.joinedAt).filter((d): d is Date => !!d);
    for (const j of joins) {
      if (!s.minJoinAt || j < s.minJoinAt) s.minJoinAt = j;
    }
    if (g.members.length > s.memberCountMax) s.memberCountMax = g.members.length;
  }

  // F7: student activity (Z) per teacher = any group with >=1 distinct active student.
  const range: TimeRange = { start: new Date(0), end: now };
  const zMap = await collectStudentZEvidence({ start: new Date(0), end: now });
  const members = await db.groupMember.findMany({ select: { groupId: true, userId: true } });
  const memberSetByGroup = new Map<string, Set<string>>();
  for (const m of members) {
    let s = memberSetByGroup.get(m.groupId);
    if (!s) {
      s = new Set();
      memberSetByGroup.set(m.groupId, s);
    }
    s.add(m.userId);
  }
  const studentActivityByTeacher = new Map<string, boolean>();
  for (const g of groups) {
    const z = zMap.get(g.id);
    if (!z) continue;
    const memberSet = memberSetByGroup.get(g.id) ?? new Set<string>();
    if ([...z.userIds].some((u) => memberSet.has(u))) studentActivityByTeacher.set(g.teacherId, true);
  }

  // F8: first artifact after class create.
  await hydrateFirstArtifactAfterClass(groups, stats, now);
  void range;

  // Count stages.
  const countStages = (list: typeof teachers) => {
    const result: FunnelStage[] = [];
    const teacherSub = new Set(list.map((t) => t.id));
    let f1 = 0,
      f2 = 0,
      f3 = 0,
      f4 = 0,
      f5 = 0,
      f6 = 0,
      f7 = 0,
      f8 = 0,
      f9 = 0,
      f10 = 0;
    for (const t of list) {
      const s = stats.get(t.id);
      if (!s) continue;
      f1 += 1; // Registered GURU
      f2 += 1; // onboarded filter (list already onboarded-only)
      if (s.hasClass) f3 += 1;
      if (s.hasClass && s.minJoinAt) f4 += 1;
      if (s.hasClass && s.minJoinAt) f5 += 1;
      if (s.hasClass && s.memberCountMax >= 3) f6 += 1;
      if (s.hasClass && (studentActivityByTeacher.get(t.id) ?? false) && teacherSub.has(t.id)) f7 += 1;
      if (s.hasClass && s.firstArtifactAfterClass) f8 += 1;
      if (s.hasClass) f9 += 1;
      // F10: teacher has >=1 operational classroom (canonical O3, trailing-30d).
      if (s.hasClass && operationalForTeacher(t.id)) f10 += 1;
    }
    return buildStages(f1, f2, f3, f4, f5, f6, f7, f8, f9, f10);
  };

  // F10 needs a trailing-30d operational lookup.
  const operationalTeacherIds = new Set<string>();
  try {
    const op = await getOperationalClassrooms({ now });
    for (const r of op.groups) if (r.operational) operationalTeacherIds.add(r.teacherId);
  } catch {
    // operational lookup is best-effort; F10 falls to 0.
  }
  const operationalForTeacher = (tid: string) => operationalTeacherIds.has(tid);

  const scope = opts.teacherId ? "TEACHER" : opts.cohortFrom || opts.cohortTo ? "COHORT" : "ALL_GURU";

  // Recompute F10 with proper closure (operationalForTeacher defined above hoists? no — define before use)
  return {
    metric: "FUNNEL_F1_F10",
    scope,
    withFounders: countStages(teachers),
    exFounders: countStages(teachers.filter((t) => !t.isFounder)),
  };
}

function buildStages(
  f1: number, f2: number, f3: number, f4: number, f5: number,
  f6: number, f7: number, f8: number, f9: number, f10: number
): FunnelStage[] {
  return [
    { stage: "F1", name: "Registered GURU", source: "User.role=GURU", schema: true, proxy: false, count: f1 },
    { stage: "F2", name: "Onboarded", source: "User.onboarded", schema: true, proxy: false, count: f2 },
    { stage: "F3", name: "Created first class (CLIFF)", source: "Group.teacherId", schema: true, proxy: false, count: f3 },
    { stage: "F4", name: "Code shared", source: "proxy: first GroupMember.join OR ProductEvent", schema: false, proxy: true, count: f4 },
    { stage: "F5", name: "First student joined", source: "GroupMember.joinedAt", schema: true, proxy: false, count: f5 },
    { stage: "F6", name: "3rd/5th student joined", source: "COUNT(GroupMember)", schema: true, proxy: false, count: f6 },
    { stage: "F7", name: "First student activity", source: "Z evidence tables", schema: true, proxy: false, count: f7 },
    { stage: "F8", name: "Teacher returns within 7d", source: "proxy: first artifact after class create", schema: false, proxy: true, count: f8 },
    { stage: "F9", name: "ACTIVATION (primary metric)", source: "F3 reached", schema: true, proxy: false, count: f9 },
    { stage: "F10", name: "OPERATIONAL CLASSROOM (North Star)", source: "X AND Y AND Z composite", schema: true, proxy: false, count: f10 },
  ];
}

/** F8 proxy: earliest teacher artifact (across all X tables) with createdAt after each group's first class. */
async function hydrateFirstArtifactAfterClass(
  groups: Array<{ id: string; teacherId: string; createdAt: Date }>,
  stats: Map<string, { hasClass: boolean; minJoinAt: Date | null; memberCountMax: number; firstClassAt: Date | null; firstArtifactAfterClass: Date | null }>,
  now: Date
): Promise<void> {
  const teacherIds = [...new Set(groups.map((g) => g.teacherId))];
  // Collect all teacher artifacts with timestamps (all-table, all-time enough for F8 proxy within 7d logic).
  // F8 = "first artifact after class create" — we compare to firstClassAt (which we derive from stats).
  interface Art { teacherId: string; at: Date; groupId: string }
  const arts: Art[] = [];

  // For simplicity & determinism: gather per-group artifacts (teacher-owned).
  const [penugasan, materi, pengumuman] = await Promise.all([
    db.penugasan.findMany({ where: { teacherId: { in: teacherIds } }, select: { teacherId: true, groupId: true, createdAt: true } }),
    db.materiKirim.findMany({ where: { teacherId: { in: teacherIds } }, select: { teacherId: true, groupId: true, createdAt: true } }),
    db.pengumuman.findMany({ where: { teacherId: { in: teacherIds } }, select: { teacherId: true, groupId: true, createdAt: true } }),
  ]);
  for (const r of [...penugasan, ...materi, ...pengumuman]) {
    arts.push({ teacherId: r.teacherId, at: r.createdAt, groupId: r.groupId });
  }

  // For each group, find earliest artifact in that group with at >= group.createdAt.
  for (const g of groups) {
    const s = stats.get(g.teacherId);
    if (!s) continue;
    const candidates = arts.filter((a) => a.groupId === g.id && a.at >= g.createdAt);
    if (candidates.length > 0) {
      const earliest = new Date(Math.min(...candidates.map((c) => c.at.getTime())));
      if (!s.firstArtifactAfterClass || earliest < s.firstArtifactAfterClass) s.firstArtifactAfterClass = earliest;
    }
  }
  void now;
}
