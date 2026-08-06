import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";

// ════════════════════════════════════════════════════════════════════
// LEARNING ANALYTICS DASHBOARD — /admin/analytics
// Read-only, aggregate-only. Tidak menyentuh API/engine lama.
// Semua angka = user UNIK dalam rentang (kecuali disebut total).
// Cache Redis 5 menit (gagal-silent bila Redis mati).
// ════════════════════════════════════════════════════════════════════

const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function startOfTodayWIB(): Date {
  const d = new Date(Date.now() + WIB_OFFSET_MS);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - WIB_OFFSET_MS);
}

function startOfDayWIB(ms: number): Date {
  const d = new Date(ms + WIB_OFFSET_MS);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - WIB_OFFSET_MS);
}

/** Fragmen SQL `"userId" = ANY(...)`; FALSE bila daftar kosong. */
function idsSql(ids: string[]): Prisma.Sql {
  if (!ids.length) return Prisma.sql`FALSE`;
  return Prisma.sql`"userId" = ANY(${ids})`;
}

/** Fragment SQL userId untuk tabel lain (kolom bukan "userId", mis. authorId). */
function colSql(col: string, ids: string[]): Prisma.Sql {
  if (!ids.length) return Prisma.sql`FALSE`;
  return Prisma.sql`${Prisma.raw(col)} = ANY(${ids})`;
}

/** UNION dari semua tabel aktivitas (WIB-aware). */
function activityUnion(since: Date, ids: string[]): Prisma.Sql {
  const idsWhere = idsSql(ids);
  return Prisma.sql`
    SELECT "userId", "createdAt" AS ts FROM "PlayerActivity" WHERE "createdAt" >= ${since} AND ${idsWhere}
    UNION ALL SELECT "userId", "createdAt" FROM "GameResult" WHERE "createdAt" >= ${since} AND ${idsWhere}
    UNION ALL SELECT "userId", "createdAt" FROM "StudentKarya" WHERE "createdAt" >= ${since} AND ${idsWhere}
    UNION ALL SELECT "userId", "startedAt" FROM "ProgresKompetensi" WHERE "startedAt" >= ${since} AND ${idsWhere}
    UNION ALL SELECT "userId", "createdAt" FROM "UserUnitProgress" WHERE "createdAt" >= ${since} AND ${idsWhere}
    UNION ALL SELECT "userId", "createdAt" FROM "XPTransaction" WHERE "createdAt" >= ${since} AND ${idsWhere}
    UNION ALL SELECT "userId", "createdAt" FROM "CoinTransaction" WHERE "createdAt" >= ${since} AND ${idsWhere}
  `;
}

interface RangeParams {
  since: Date;
  prevSince: Date;
  until: Date;
  days: number;
  label: string;
}

function parseRange(searchParams: URLSearchParams): RangeParams {
  const range = searchParams.get("range") || "30";
  const now = new Date();
  let days = 30;

  if (range === "today") days = 1;
  else if (range === "semester") days = 180;
  else if (range === "custom") {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (start) {
      const s = new Date(start);
      const e = end ? new Date(end) : now;
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        days = Math.max(1, Math.min(365, Math.round((e.getTime() - s.getTime()) / DAY_MS)));
      }
    }
  } else {
    const n = parseInt(range, 10);
    if (Number.isFinite(n) && n > 0) days = Math.min(365, n);
  }

  const since = new Date(now.getTime() - days * DAY_MS);
  const prevSince = new Date(since.getTime() - days * DAY_MS);
  return { since, prevSince, until: now, days, label: `${days}d` };
}

async function filterUserIds(searchParams: URLSearchParams): Promise<string[]> {
  const role = searchParams.get("role");
  const province = searchParams.get("province");
  const city = searchParams.get("city");
  const school = searchParams.get("school");
  const grade = searchParams.get("grade");
  const teacher = searchParams.get("teacher");

  if (!role && !province && !city && !school && !grade && !teacher) return [];

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role as Prisma.UserWhereInput["role"];

  const profileFilters: Prisma.ProfileWhereInput = {};
  if (province) profileFilters.province = { contains: province, mode: "insensitive" };
  if (city) profileFilters.city = { contains: city, mode: "insensitive" };
  if (school) profileFilters.school = { contains: school, mode: "insensitive" };
  if (grade) profileFilters.grade = { contains: grade, mode: "insensitive" };
  if (Object.keys(profileFilters).length) where.profile = profileFilters;

  if (teacher) {
    where.groupMemberships = { some: { group: { teacherId: teacher } } };
  }

  const users = await db.user.findMany({
    where,
    select: { id: true },
    take: 10000,
  });
  return users.map((u) => u.id);
}

interface StageRow {
  userId: string;
}

async function runStage(sql: Prisma.Sql): Promise<string[]> {
  const rows = await db.$queryRaw<StageRow[]>(sql);
  return rows.map((r) => r.userId);
}

const STAGE_SQL = {
  login: (since: Date, until: Date, ids: string[]) => Prisma.sql`
    SELECT "userId" FROM (${activityUnion(since, ids)}) a
    WHERE a.ts >= ${since} AND a.ts < ${until}
    GROUP BY "userId"
  `,
  arena: (since: Date, until: Date, ids: string[]) => Prisma.sql`
    SELECT "userId" FROM "GameResult" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
    UNION
    SELECT "userId" FROM "PlayerActivity" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND "type" IN ('GAME','JALUR_CERDAS','LESSON','QUIZ') AND ${idsSql(ids)}
    UNION
    SELECT "userId" FROM "UserUnitProgress" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
  `,
  jalur: (since: Date, until: Date, ids: string[]) => Prisma.sql`
    SELECT DISTINCT p."userId" FROM "UserUnitProgress" p
    JOIN "LearningUnit" u ON u.id = p."unitId"
    JOIN "LearningLevel" l ON l.id = u."levelId"
    WHERE p."createdAt" >= ${since} AND p."createdAt" < ${until}
      AND l.type = 'JALUR' AND ${idsSql(ids)}
  `,
  karya: (since: Date, until: Date, ids: string[]) => Prisma.sql`
    SELECT "userId" FROM "StudentKarya" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
  `,
  ukbi: (since: Date, until: Date, ids: string[]) => Prisma.sql`
    SELECT "userId" FROM "ProgresKompetensi" WHERE "startedAt" >= ${since} AND "startedAt" < ${until} AND ${idsSql(ids)}
  `,
  rankUp: (since: Date, until: Date, ids: string[]) => Prisma.sql`
    SELECT "userId" FROM "CoinTransaction" WHERE "reason" = 'RANK_UP' AND "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
  `,
  kembali: (since: Date, until: Date, ids: string[]) => Prisma.sql`
    SELECT "userId" FROM (
      SELECT "userId", COUNT(DISTINCT DATE(ts AT TIME ZONE 'Asia/Jakarta')) AS d
      FROM (${activityUnion(since, ids)}) a
      WHERE a.ts >= ${since} AND a.ts < ${until}
      GROUP BY "userId"
    ) x WHERE x.d >= 2
  `,
};

async function funnelStage(
  key: keyof typeof STAGE_SQL,
  since: Date,
  until: Date,
  ids: string[]
): Promise<string[]> {
  const sql = STAGE_SQL[key](since, until, ids);
  const rows = await db.$queryRaw<StageRow[]>(sql);
  return rows.map((r) => r.userId);
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = parseRange(searchParams);
    const ids = await filterUserIds(searchParams);

    const cacheKey = `admin:analytics:v1:${range.label}:${searchParams.toString()}`;
    const cached = await cache.get<unknown>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const { since, prevSince, until } = range;
    const idsAll = ids.length ? ids : [];

    // ── FUNNEL (2 rentang: sekarang & periode sebelumnya) ─────────────
    const stageKeys = Object.keys(STAGE_SQL) as (keyof typeof STAGE_SQL)[];
    const [cur, prev] = await Promise.all([
      Promise.all(stageKeys.map((k) => funnelStage(k, since, until, idsAll))),
      Promise.all(stageKeys.map((k) => funnelStage(k, prevSince, since, idsAll))),
    ]);

    const stageLabel: Record<string, string> = {
      login: "LOGIN",
      arena: "ARENA",
      jalur: "JALUR CERDAS",
      karya: "KARYA SISWA",
      ukbi: "SIMULASI UKBI/TKA",
      rankUp: "NAIK LEVEL / RANK",
      kembali: "KEMBALI BESOK",
    };
    const stageOrder: (keyof typeof STAGE_SQL)[] = [
      "login",
      "arena",
      "jalur",
      "karya",
      "ukbi",
      "rankUp",
      "kembali",
    ];

    const loginCount = cur[stageKeys.indexOf("login")].length;
    const funnel = stageOrder.map((k, i) => {
      const idx = stageKeys.indexOf(k);
      const count = cur[idx].length;
      const prevCount = prev[idx].length;
      const conversion =
        i === 0 ? 100 : loginCount === 0 ? 0 : Math.round((count / loginCount) * 100);
      return {
        stage: k,
        label: stageLabel[k],
        users: count,
        conversion,
        change: pctChange(count, prevCount),
      };
    });

    const arenaIds = cur[stageKeys.indexOf("arena")];
    const karyaIds = cur[stageKeys.indexOf("karya")];
    const karyaArenaIntersect = karyaIds.filter((id) => arenaIds.includes(id)).length;

    // ── DROP OFF (berurutan antar stage) ─────────────────────────────
    const dropoff = [];
    for (let i = 0; i < funnel.length - 1; i++) {
      const from = funnel[i].users;
      const to = funnel[i + 1].users;
      const drop = from === 0 ? 0 : Math.round(((from - to) / from) * 100);
      dropoff.push({
        from: funnel[i].label,
        to: funnel[i + 1].label,
        drop,
      });
    }

    // ── RETENTION (DAU/WAU/MAU, stickiness, D1/D7/D30) ───────────────
    const retention = await computeRetention(since, idsAll);

    // ── ENGAGEMENT ───────────────────────────────────────────────────
    const engagement = await computeEngagement(since, until, idsAll);

    // ── HEATMAP (30 hari WIB) ────────────────────────────────────────
    const heatSince = new Date(Date.now() - 30 * DAY_MS);
    const heatmap = await computeHeatmap(heatSince, idsAll);

    // ── COHORT RETENTION (mingguan, PlayerProfile = "pertama aktif") ─
    const cohort = await computeCohort(idsAll);

    // ── DISTRIBUSI XP & RANK ─────────────────────────────────────────
    const xpDist = await computeXpDist(idsAll);
    const rankDist = await computeRankDist(since, idsAll);

    // ── LEARNING SKILL (radar) ───────────────────────────────────────
    const skills = await computeSkills(idsAll);

    // ── CONTENT HEALTH ───────────────────────────────────────────────
    const content = await computeContent(since, until, idsAll);

    // ── TOP GAME ─────────────────────────────────────────────────────
    const topGames = await computeTopGames(since, until, idsAll);

    // ── AI GURU ──────────────────────────────────────────────────────
    const aiGuru = await computeAiGuru(since, until, idsAll);

    // ── TOP JOURNEY (urutan aktivitas per user per hari) ─────────────
    const topJourneys = await computeTopJourneys(since, until, idsAll);

    // ── INSIGHT AI (rule-based, maks 10) ─────────────────────────────
    const insights = buildInsights({
      funnel,
      retention,
      engagement,
      content,
      topGames,
      aiGuru,
      karyaArenaIntersect,
      karyaCount: karyaIds.length,
      range: range.days,
    });

    const payload = {
      success: true,
      generatedAt: new Date().toISOString(),
      range: { days: range.days, since: since.toISOString(), until: until.toISOString() },
      filterApplied: idsAll.length > 0,
      funnel,
      dropoff,
      retention,
      engagement,
      heatmap,
      cohort,
      xpDist,
      rankDist,
      skills,
      content,
      topGames,
      aiGuru,
      topJourneys,
      insights,
    };

    await cache.set(cacheKey, payload, 300);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[Admin Analytics Dashboard] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────────

async function computeRetention(since: Date, ids: string[]) {
  const todayStart = startOfTodayWIB();
  const now = new Date();
  const window = new Date(now.getTime() - 90 * DAY_MS);
  const start = since < window ? since : window;

  // Ringkasan per-user (jendela 90 hari / minimal rentang).
  const rows = await db.$queryRaw<
    { userId: string; days: number; lastTs: Date }[]
  >(Prisma.sql`
    SELECT "userId", COUNT(DISTINCT DATE(ts AT TIME ZONE 'Asia/Jakarta'))::int AS days, MAX(ts) AS "lastTs"
    FROM (${activityUnion(start, ids)}) a
    WHERE a.ts >= ${start}
    GROUP BY "userId"
  `);

  const mauDate = new Date(now.getTime() - 30 * DAY_MS);
  const wauDate = new Date(now.getTime() - 7 * DAY_MS);

  let dau = 0,
    wau = 0,
    mau = 0,
    avgActiveDays = 0;
  for (const r of rows) {
    if (r.lastTs >= todayStart) dau++;
    if (r.lastTs >= wauDate) wau++;
    if (r.lastTs >= mauDate) mau++;
  }
  if (rows.length) avgActiveDays = Math.round((rows.reduce((s, r) => s + r.days, 0) / rows.length) * 10) / 10;

  // Login tambahan dari heartbeat (User.lastActiveAt) — di luar union.
  const [loginToday, login7, login30] = await Promise.all([
    db.user.count({ where: { lastActiveAt: { gte: todayStart }, ...(ids.length ? { id: { in: ids } } : {}) } }),
    db.user.count({ where: { lastActiveAt: { gte: wauDate }, ...(ids.length ? { id: { in: ids } } : {}) } }),
    db.user.count({ where: { lastActiveAt: { gte: mauDate }, ...(ids.length ? { id: { in: ids } } : {}) } }),
  ]);

  dau = Math.max(dau, loginToday);
  wau = Math.max(wau, login7);
  mau = Math.max(mau, login30);

  // Retention D1/D7/D30 — kohor = profil pemain yang dibuat dalam rentang,
  // "kembali" = ada aktivitas (lastActiveAt) ≥ N hari setelah profil dibuat.
  const cohortRows = await db.$queryRaw<
    { total: number; d1: number; d7: number; d30: number }[]
  >(Prisma.sql`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE "lastActiveAt" IS NOT NULL AND "lastActiveAt" >= "createdAt" + interval '1 day')::int AS d1,
      COUNT(*) FILTER (WHERE "lastActiveAt" IS NOT NULL AND "lastActiveAt" >= "createdAt" + interval '7 days')::int AS d7,
      COUNT(*) FILTER (WHERE "lastActiveAt" IS NOT NULL AND "lastActiveAt" >= "createdAt" + interval '30 days')::int AS d30
    FROM "PlayerProfile"
    WHERE "createdAt" >= ${since} ${ids.length ? Prisma.sql`AND "userId" = ANY(${ids})` : Prisma.sql``}
  `);
  const cohort0 = cohortRows[0] ?? { total: 0, d1: 0, d7: 0, d30: 0 };

  const streakRows = await db.$queryRaw<{ avg: number; max: number }[]>(Prisma.sql`
    SELECT COALESCE(AVG("streak"), 0)::int AS avg, COALESCE(MAX("streak"), 0)::int AS max
    FROM "PlayerProfile"
    WHERE ${ids.length ? Prisma.sql`"userId" = ANY(${ids})` : Prisma.sql`TRUE`}
  `);

  const r1 = cohort0.total > 0 ? Math.round((cohort0.d1 / cohort0.total) * 100) : 0;
  const r7 = cohort0.total > 0 ? Math.round((cohort0.d7 / cohort0.total) * 100) : 0;
  const r30 = cohort0.total > 0 ? Math.round((cohort0.d30 / cohort0.total) * 100) : 0;

  return {
    dau,
    wau,
    mau,
    stickiness: mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0,
    retentionD1: r1,
    retentionD7: r7,
    retentionD30: r30,
    avgStreak: streakRows[0]?.avg ?? 0,
    maxStreak: streakRows[0]?.max ?? 0,
    avgActiveDays,
    activeUsers90d: rows.length,
  };
}

async function computeEngagement(since: Date, until: Date, ids: string[]) {
  const [xp, quest, badge, ach, rankUp, game, jalur, karya, ukbi, activity] =
    await Promise.all([
      db.xPTransaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { createdAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) },
      }),
      db.dailyQuest.count({ where: { completed: true, updatedAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.userBadge.count({ where: { awardedAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.userAchievement.count({ where: { completed: true, updatedAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.coinTransaction.count({ where: { reason: "RANK_UP", createdAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.gameResult.count({ where: { createdAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.userUnitProgress.count({ where: { completed: true, completedAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.studentKarya.count({ where: { createdAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.progresKompetensi.count({ where: { finishedAt: { gte: since, lt: until }, status: "COMPLETED", ...(ids.length ? { userId: { in: ids } } : {}) } }),
      db.playerActivity.count({ where: { createdAt: { gte: since, lt: until }, ...(ids.length ? { userId: { in: ids } } : {}) } }),
    ]);

  const lvlUp = await db.userBadge.count({
    where: {
      awardedAt: { gte: since, lt: until },
      badge: { code: { startsWith: "lvl-" } },
      ...(ids.length ? { userId: { in: ids } } : {}),
    },
  });

  return {
    avgSessionsPerDay: activity > 0 ? Math.max(1, Math.round(activity / Math.max(1, (until.getTime() - since.getTime()) / DAY_MS))) : 0,
    totalActions: activity,
    xpEarned: xp._sum.amount ?? 0,
    xpTransactions: xp._count,
    questsCompleted: quest,
    badgesAwarded: badge,
    achievementsCompleted: ach,
    rankUps: rankUp,
    levelUps: lvlUp,
    gamesPlayed: game,
    jalurCompleted: jalur,
    karyaCreated: karya,
    ukbiCompleted: ukbi,
  };
}

async function computeHeatmap(since: Date, ids: string[]) {
  const rows = await db.$queryRaw<
    { dow: number; hour: number; users: number }[]
  >(Prisma.sql`
    SELECT EXTRACT(DOW FROM ts AT TIME ZONE 'Asia/Jakarta')::int AS dow,
           EXTRACT(HOUR FROM ts AT TIME ZONE 'Asia/Jakarta')::int AS hour,
           COUNT(DISTINCT "userId")::int AS users
    FROM (${activityUnion(since, ids)}) a
    WHERE a.ts >= ${since}
    GROUP BY 1, 2
  `);
  return rows;
}

async function computeCohort(ids: string[]) {
  const rows = await db.$queryRaw<
    { week: string; users: number; w1: number; w2: number; w3: number; w4: number }[]
  >(Prisma.sql`
    SELECT to_char(DATE_TRUNC('week', "createdAt" AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS week,
           COUNT(*)::int AS users,
           COUNT(*) FILTER (WHERE "lastActiveAt" IS NOT NULL AND "lastActiveAt" >= "createdAt" + interval '7 days')::int AS w1,
           COUNT(*) FILTER (WHERE "lastActiveAt" IS NOT NULL AND "lastActiveAt" >= "createdAt" + interval '14 days')::int AS w2,
           COUNT(*) FILTER (WHERE "lastActiveAt" IS NOT NULL AND "lastActiveAt" >= "createdAt" + interval '21 days')::int AS w3,
           COUNT(*) FILTER (WHERE "lastActiveAt" IS NOT NULL AND "lastActiveAt" >= "createdAt" + interval '28 days')::int AS w4
    FROM "PlayerProfile"
    WHERE ${ids.length ? Prisma.sql`"userId" = ANY(${ids})` : Prisma.sql`TRUE`}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 10
  `);
  return rows.map((r) => ({
    week: r.week,
    users: r.users,
    w1: r.users > 0 ? Math.round((r.w1 / r.users) * 100) : 0,
    w2: r.users > 0 ? Math.round((r.w2 / r.users) * 100) : 0,
    w3: r.users > 0 ? Math.round((r.w3 / r.users) * 100) : 0,
    w4: r.users > 0 ? Math.round((r.w4 / r.users) * 100) : 0,
  }));
}

async function computeXpDist(ids: string[]) {
  const rows = await db.$queryRaw<{ bucket: string; users: number }[]>(Prisma.sql`
    SELECT CASE
        WHEN "totalXP" < 100 THEN '0-100'
        WHEN "totalXP" < 500 THEN '100-500'
        WHEN "totalXP" < 1000 THEN '500-1000'
        WHEN "totalXP" < 5000 THEN '1000-5000'
        ELSE '5000+'
      END AS bucket,
      COUNT(*)::int AS users
    FROM "PlayerProfile"
    WHERE ${ids.length ? Prisma.sql`"userId" = ANY(${ids})` : Prisma.sql`TRUE`}
    GROUP BY 1
  `);
  const order = ["0-100", "100-500", "500-1000", "1000-5000", "5000+"];
  return order.map((b) => ({
    bucket: b,
    users: rows.find((r) => r.bucket === b)?.users ?? 0,
  }));
}

async function computeRankDist(since: Date, ids: string[]) {
  const rows = await db.$queryRaw<{ rank: string; users: number }[]>(Prisma.sql`
    SELECT "currentRank" AS rank, COUNT(*)::int AS users
    FROM "PlayerProfile"
    WHERE ${ids.length ? Prisma.sql`"userId" = ANY(${ids})` : Prisma.sql`TRUE`}
    GROUP BY 1
  `);
  const promoRows = await db.$queryRaw<{ reference: string; users: number }[]>(Prisma.sql`
    SELECT "reference", COUNT(DISTINCT "userId")::int AS users
    FROM "CoinTransaction"
    WHERE "reason" = 'RANK_UP' AND "createdAt" >= ${since} AND ${idsSql(ids)}
    GROUP BY "reference"
  `);
  const rankOrder = ["BRONZE", "SILVER", "GOLD", "EMERALD", "RUBY", "SAPPHIRE", "DIAMOND", "MASTER", "LEGEND"];
  const promoByRank: Record<string, number> = {};
  for (const p of promoRows) {
    const m = p.reference?.match(/rank-up-([A-Z_]+)/i);
    if (m) promoByRank[m[1].toUpperCase()] = (promoByRank[m[1].toUpperCase()] ?? 0) + p.users;
  }
  return rankOrder.map((r) => ({
    rank: r,
    users: rows.find((x) => x.rank === r)?.users ?? 0,
    promotedThisWeek: promoByRank[r] ?? 0,
  }));
}

async function computeSkills(ids: string[]) {
  const rows = await db.$queryRaw<{ skill: string; avgLevel: number; users: number }[]>(Prisma.sql`
    SELECT "skill", COALESCE(AVG("level"), 0)::numeric(6,1) AS "avgLevel", COUNT(*)::int AS users
    FROM "LearningSkill"
    WHERE ${ids.length ? Prisma.sql`"userId" = ANY(${ids})` : Prisma.sql`TRUE`}
    GROUP BY "skill"
  `);
  return rows;
}

async function computeContent(since: Date, until: Date, ids: string[]) {
  const uIds = ids.length ? { userId: { in: ids } } : {};
  const todayStart = startOfTodayWIB();
  const weekStart = new Date(Date.now() - 7 * DAY_MS);
  const monthStart = new Date(Date.now() - 30 * DAY_MS);

  const [karyaToday, karyaWeek, karyaMonth, karyaTotal, komentar, like, views, artikel, themes] =
    await Promise.all([
      db.studentKarya.count({ where: { createdAt: { gte: todayStart }, ...uIds } }),
      db.studentKarya.count({ where: { createdAt: { gte: weekStart }, ...uIds } }),
      db.studentKarya.count({ where: { createdAt: { gte: monthStart }, ...uIds } }),
      db.studentKarya.count({ where: uIds }),
      db.studentKaryaComment.count({ where: { createdAt: { gte: since, lt: until }, ...uIds } }),
      db.studentKaryaLike.count({ where: { createdAt: { gte: since, lt: until }, ...uIds } }),
      db.studentKarya.aggregate({ _sum: { viewsCount: true }, where: uIds }),
      db.artikel.count({ where: { isPublished: true } }),
      db.studentKarya.groupBy({ by: ["type"], _count: true, where: { createdAt: { gte: since, lt: until }, ...uIds } }),
    ]);

  const themesSorted = themes
    .map((t) => ({ type: t.type, count: t._count }))
    .sort((a, b) => b.count - a.count);

  return {
    karyaToday,
    karyaWeek,
    karyaMonth,
    karyaTotal,
    artikel,
    comments: komentar,
    likes: like,
    views: views._sum.viewsCount ?? 0,
    topTheme: themesSorted[0]?.type ?? null,
    themes: themesSorted,
  };
}

const GAME_SOURCES = ["GAME", "KATASTRA", "MENARA", "TANTANG", "ARENA"];
const GAME_LABELS: Record<string, string> = {
  GAME: "Kuis & Game Solo",
  KATASTRA: "Katastra",
  MENARA: "Menara Cerdas",
  TANTANG: "Adu Cepat",
  ARENA: "Arena",
};

async function computeTopGames(since: Date, until: Date, ids: string[]) {
  const rows = await db.$queryRaw<
    { source: string; players: number; totalXp: number; txs: number; repeat: number }[]
  >(Prisma.sql`
    SELECT "source",
           COUNT(DISTINCT "userId")::int AS players,
           COALESCE(SUM("amount"), 0)::int AS "totalXp",
           COUNT(*)::int AS txs,
           COUNT(*) FILTER (WHERE "userId" IN (
             SELECT "userId" FROM "XPTransaction" x2
             WHERE x2."userId" = "XPTransaction"."userId" AND x2."source" = "XPTransaction"."source"
             GROUP BY x2."userId" HAVING COUNT(*) > 1
           ))::int AS repeat
    FROM "XPTransaction"
    WHERE "source" = ANY(${GAME_SOURCES}) AND "createdAt" >= ${since} AND "createdAt" < ${until}
      AND ${idsSql(ids)}
    GROUP BY "source"
  `);

  return rows
    .map((r) => ({
      source: r.source,
      label: GAME_LABELS[r.source] ?? r.source,
      players: r.players,
      totalXp: r.totalXp,
      avgXp: r.players > 0 ? Math.round(r.totalXp / r.players) : 0,
      repeatRate: r.players > 0 ? Math.round((r.repeat / r.players) * 100) : 0,
    }))
    .sort((a, b) => b.players - a.players);
}

async function computeAiGuru(since: Date, until: Date, ids: string[]) {
  const rows = await db.$queryRaw<
    { feature: string; prompts: number; users: number; tokens: number }[]
  >(Prisma.sql`
    SELECT "feature", COUNT(*)::int AS prompts, COUNT(DISTINCT "userId")::int AS users, COALESCE(SUM("tokens"), 0)::int AS tokens
    FROM "AIUsage"
    WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
    GROUP BY "feature"
  `);

  const bucket = (keys: string[]) =>
    rows.filter((r) => keys.some((k) => r.feature.toLowerCase().includes(k)));

  const sum = (arr: { prompts: number; users: number; tokens: number }[]) => ({
    prompts: arr.reduce((s, r) => s + r.prompts, 0),
    users: arr.reduce((s, r) => Math.max(s, r.users), 0),
    tokens: arr.reduce((s, r) => s + r.tokens, 0),
  });

  const rpp = sum(bucket(["rpp"]));
  const soal = sum(bucket(["soal"]));
  const materi = sum(bucket(["ppt", "materi"]));
  const review = sum(bucket(["feedback", "grading"]));
  const eyd = sum(bucket(["eyd"]));
  const analisis = sum(bucket(["text-analysis"]));
  const asisten = sum(bucket(["bc-assistant", "assistant", "chat"]));
  const download = sum(bucket(["export", "ai_export"]));

  const guruRows = await db.$queryRaw<{ n: number }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT "userId")::int AS n
    FROM "AIUsage"
    WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
  `);
  const activeGurus = guruRows[0]?.n ?? 0;

  return {
    activeGurus,
    totalPrompts: rows.reduce((s, r) => s + r.prompts, 0),
    totalTokens: rows.reduce((s, r) => s + r.tokens, 0),
    rpp: rpp.prompts,
    soal: soal.prompts,
    materi: materi.prompts,
    review: review.prompts,
    eyd: eyd.prompts,
    analisis: analisis.prompts,
    asisten: asisten.prompts,
    download: download.prompts,
  };
}

async function computeTopJourneys(since: Date, until: Date, ids: string[]) {
  const rows = await db.$queryRaw<
    { userId: string; ts: Date; typ: string }[]
  >(Prisma.sql`
    SELECT "userId", ts, typ FROM (
      SELECT "userId", "createdAt" AS ts,
             CASE "type"
               WHEN 'LESSON' THEN 'JALUR' WHEN 'JALUR_CERDAS' THEN 'JALUR'
               WHEN 'QUIZ' THEN 'KUIS' WHEN 'SIMULASI_UKBI' THEN 'UKBI'
               WHEN 'SIMULASI_TKA' THEN 'TKA' ELSE "type"::text
             END AS typ
      FROM "PlayerActivity" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
      UNION ALL
      SELECT "userId", "createdAt", 'GAME' FROM "GameResult" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
      UNION ALL
      SELECT "userId", "createdAt", 'KARYA' FROM "StudentKarya" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
      UNION ALL
      SELECT "userId", "startedAt", 'UKBI' FROM "ProgresKompetensi" WHERE "startedAt" >= ${since} AND "startedAt" < ${until} AND ${idsSql(ids)}
      UNION ALL
      SELECT "userId", "createdAt", 'JALUR' FROM "UserUnitProgress" WHERE "createdAt" >= ${since} AND "createdAt" < ${until} AND ${idsSql(ids)}
    ) x
    ORDER BY "userId", ts
    LIMIT 60000
  `);

  // Urutan aktivitas per user per hari (WIB), kompresi duplikat berurutan.
  const sequences: string[][] = [];
  let current: { day: string; list: string[] } | null = null;
  for (const r of rows) {
    const day = r.ts.toISOString().slice(0, 10);
    if (!current || current.day !== day) {
      if (current && current.list.length >= 3) sequences.push(current.list);
      current = { day, list: [] };
    }
    if (current.list[current.list.length - 1] !== r.typ) current.list.push(r.typ);
  }
  if (current && current.list.length >= 3) sequences.push(current.list);

  // Seluruh window (3..5) dihitung, diurutkan berdasar frekuensi;
  // window lebih panjang menang tie-break.
  const allCounts = new Map<string, { seq: string[]; count: number; len: number }>();
  for (const seq of sequences) {
    for (const len of [5, 4, 3]) {
      for (let i = 0; i <= seq.length - len; i++) {
        const window = seq.slice(i, i + len);
        const key = window.join(" → ");
        const ex = allCounts.get(key);
        if (ex) ex.count++;
        else allCounts.set(key, { seq: window, count: 1, len });
      }
    }
  }

  return Array.from(allCounts.values())
    .sort((a, b) => b.count - a.count || b.len - a.len)
    .slice(0, 10)
    .map((j) => ({ journey: j.seq, count: j.count }));
}

interface InsightCtx {
  funnel: { stage: string; label: string; users: number; conversion: number; change: number | null }[];
  retention: { dau: number; wau: number; mau: number; stickiness: number; retentionD1: number; retentionD7: number; retentionD30: number; avgStreak: number };
  engagement: { xpEarned: number; rankUps: number; karyaCreated: number; ukbiCompleted: number; gamesPlayed: number };
  content: { topTheme: string | null; karyaWeek: number; likes: number };
  topGames: { label: string; players: number; avgXp: number }[];
  aiGuru: { activeGurus: number; totalPrompts: number; rpp: number; download: number };
  karyaArenaIntersect: number;
  karyaCount: number;
  range: number;
}

function buildInsights(ctx: InsightCtx) {
  const out: { tone: "good" | "bad" | "neutral"; text: string }[] = [];

  const stageMap = Object.fromEntries(ctx.funnel.map((f) => [f.stage, f]));
  for (const key of ["login", "arena", "jalur", "karya", "ukbi", "rankUp", "kembali"]) {
    const s = stageMap[key];
    if (!s || s.change === null || s.change === 0) continue;
    if (s.change >= 15) {
      out.push({ tone: "good", text: `${s.label} naik ${s.change}% dibanding periode sebelumnya.` });
    } else if (s.change <= -15) {
      out.push({ tone: "bad", text: `${s.label} turun ${Math.abs(s.change)}% dibanding periode sebelumnya.` });
    }
  }

  if (ctx.retention.mau > 0 && ctx.retention.stickiness < 10) {
    out.push({ tone: "bad", text: `Stickiness ${ctx.retention.stickiness}% — sebagian besar pengguna aktif bulanan tidak kembali setiap hari.` });
  } else if (ctx.retention.mau > 0 && ctx.retention.stickiness >= 25) {
    out.push({ tone: "good", text: `Stickiness ${ctx.retention.stickiness}% — pengguna aktif bulanan kembali hampir setiap hari.` });
  }

  if (ctx.retention.retentionD7 > 0 && ctx.retention.retentionD7 < 20) {
    out.push({ tone: "bad", text: `Retensi D7 hanya ${ctx.retention.retentionD7}% — banyak pemain baru berhenti dalam seminggu pertama.` });
  } else if (ctx.retention.retentionD7 >= 40) {
    out.push({ tone: "good", text: `Retensi D7 ${ctx.retention.retentionD7}% — pemain baru kembali di hari ketujuh.` });
  }

  if (ctx.content.topTheme) {
    out.push({ tone: "neutral", text: `Tema "${ctx.content.topTheme}" paling populer untuk karya siswa.` });
  }

  if (ctx.karyaCount > 0) {
    const pct = Math.round((ctx.karyaArenaIntersect / ctx.karyaCount) * 100);
    if (pct >= 50) {
      out.push({ tone: "good", text: `${pct}% penulis karya juga aktif di arena — korelasi kuat antara bermain dan berkarya.` });
    } else if (pct > 0) {
      out.push({ tone: "neutral", text: `${pct}% penulis karya juga pernah bermain di arena dalam rentang ini.` });
    }
  }

  const topGame = ctx.topGames[0];
  if (topGame && topGame.players > 0) {
    out.push({ tone: "neutral", text: `Game terpopuler: ${topGame.label} (${topGame.players} pemain, rata-rata ${topGame.avgXp} XP).` });
  }

  if (ctx.aiGuru.activeGurus > 0) {
    out.push({ tone: "neutral", text: `${ctx.aiGuru.activeGurus} guru memakai Alat AI (${ctx.aiGuru.totalPrompts} prompt). RPP ${ctx.aiGuru.rpp}, unduhan ${ctx.aiGuru.download}.` });
  }

  if (ctx.engagement.rankUps > 0) {
    out.push({ tone: "good", text: `${ctx.engagement.rankUps} kenaikan rank tercatat dalam rentang ini.` });
  }

  if (out.length === 0) {
    out.push({ tone: "neutral", text: "Belum ada cukup data untuk insight. Ajak murid mulai belajar di Jalur Cerdas." });
  }

  return out.slice(0, 10);
}
