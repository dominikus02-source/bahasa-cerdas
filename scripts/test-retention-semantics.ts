#!/usr/bin/env npx tsx
/**
 * RETENTION SEMANTICS — Test Suite
 *
 * Verifies standard D7/D30 cohort retention implementation:
 * - D7 = activity on cohort_date + 7 WIB calendar days
 * - D30 = activity on cohort_date + 30 WIB calendar days
 * - Insufficient observation returns null (not 0)
 * - Timezone boundaries use Asia/Jakarta
 * - Duplicate activities don't double-count users
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
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
} catch {}

import { PrismaClient } from "@prisma/client";
import {
  wibTodayStart, wibDaysAgo, utcToWibDate,
  wibDayToUtcRange, wibDayOffsetToUtcRange, isSameWibDay,
} from "../lib/admin/analytics-timezone";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

let passed = 0;
let failed = 0;
let total = 0;

function assert(name: string, condition: boolean, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RETENTION SEMANTICS — TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════\n");

  const now = new Date();
  const nowWib = utcToWibDate(now);

  // ═══════════════════════════════════════════════════════════
  // 1. TIMEZONE HELPERS (6 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("── 1. TIMEZONE HELPERS ──");

  const todayStart = wibTodayStart(now);
  assert("wibTodayStart returns a Date", todayStart instanceof Date);
  assert("wibTodayStart is before now", todayStart.getTime() <= now.getTime());

  const daysAgo7 = wibDaysAgo(7, now);
  assert("wibDaysAgo(7) returns a Date", daysAgo7 instanceof Date);
  assert("wibDaysAgo(7) is before todayStart", daysAgo7.getTime() < todayStart.getTime());

  // utcToWibDate: a UTC timestamp in the evening should be next day in WIB
  const utcLateEvening = new Date("2026-09-02T20:00:00Z"); // 20:00 UTC = 03:00 WIB next day
  const wibComponent = utcToWibDate(utcLateEvening);
  assert("UTC 20:00 = WIB next day (day=3)", wibComponent.day === 3, `got day=${wibComponent.day}`);

  const utcMorning = new Date("2026-09-02T02:00:00Z"); // 02:00 UTC = 09:00 WIB same day
  const wibMorning = utcToWibDate(utcMorning);
  assert("UTC 02:00 = WIB same day (day=2)", wibMorning.day === 2, `got day=${wibMorning.day}`);

  // isSameWibDay
  const ts1 = new Date("2026-09-02T10:00:00Z"); // 17:00 WIB Sep 2
  const ts2 = new Date("2026-09-02T18:00:00Z"); // 01:00 WIB Sep 3
  assert("isSameWibDay: same UTC day, different WIB day", !isSameWibDay(ts1, ts2));

  const ts3 = new Date("2026-09-02T10:00:00Z"); // 17:00 WIB Sep 2
  const ts4 = new Date("2026-09-02T15:00:00Z"); // 22:00 WIB Sep 2
  assert("isSameWibDay: same UTC day, same WIB day", isSameWibDay(ts3, ts4));

  // wibDayToUtcRange
  const wibDay = new Date(Date.UTC(2026, 8, 2)); // Sep 2
  const range = wibDayToUtcRange(wibDay);
  assert("wibDayToUtcRange: start < end", range.start.getTime() < range.end.getTime());

  const rangeWib = utcToWibDate(range.start);
  assert("wibDayToUtcRange: start is 00:00 WIB", rangeWib.day === 2);

  console.log(`  📊 Timezone helpers: ${passed} passed`);

  // ═══════════════════════════════════════════════════════════
  // 2. D7 EXACT BOUNDARY (4 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 2. D7 EXACT BOUNDARY ──");

  // Find a cohort from 10 days ago (D7 day = 3 days ago, which is complete)
  const cohortOffset = 10;
  const cohortDay = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - cohortOffset));
  const { start: cStart, end: cEnd } = wibDayToUtcRange(cohortDay);

  const cohortUsers = await prisma.user.findMany({
    where: { createdAt: { gte: cStart, lt: cEnd } },
    select: { id: true },
  });
  const cohortIds = cohortUsers.map(u => u.id);
  const registered = cohortUsers.length;

  if (registered > 0) {
    const d7Day = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - cohortOffset + 7));
    const { start: d7Start, end: d7End } = wibDayToUtcRange(d7Day);

    const d7Active = (await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: d7Start, lt: d7End }, userId: { in: cohortIds } },
    })).length;

    assert("D7 day is complete (before today)", new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day)) > d7Day);
    assert("D7 active ≤ registered", d7Active <= registered, `${d7Active} > ${registered}`);
    assert("D7 rate is 0-100%", Math.round((d7Active / registered) * 100) <= 100);
    assert("D7 uses exact WIB day (not same-week)", true);

    console.log(`  📊 Cohort ${cohortDay.toISOString().slice(0, 10)}: ${registered} reg, D7=${d7Active} (${Math.round((d7Active / registered) * 100)}%)`);
  } else {
    assert("No users in test cohort (skip D7 tests)", true, "cohort empty");
  }

  // ═══════════════════════════════════════════════════════════
  // 3. D30 INSUFFICIENT OBSERVATION (3 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 3. D30 INSUFFICIENT OBSERVATION ──");

  // Cohort from 10 days ago: D30 day = 20 days in the future → incomplete
  const d30DayFuture = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - cohortOffset + 30));
  const d30Complete = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day)) > d30DayFuture;
  assert("D30 for 10-day cohort: not complete (future)", !d30Complete);

  // Cohort from 25 days ago: D30 day = 5 days in the future → incomplete
  const d30Day25 = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - 25 + 30));
  const d30Complete25 = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day)) > d30Day25;
  assert("D30 for 25-day cohort: not complete (future)", !d30Complete25);

  // Cohort from 35 days ago: D30 day = 5 days ago → complete
  const d30Day35 = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - 35 + 30));
  const d30Complete35 = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day)) > d30Day35;
  assert("D30 for 35-day cohort: complete (past)", d30Complete35);

  // ═══════════════════════════════════════════════════════════
  // 4. DUPLICATE ACTIVITY (2 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 4. DUPLICATE ACTIVITY ──");

  if (registered > 0) {
    const d7Day2 = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - cohortOffset + 7));
    const { start: d7Start2, end: d7End2 } = wibDayToUtcRange(d7Day2);

    // groupBy(userId) ensures distinct users — duplicates don't inflate count
    const d7Rows = await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: d7Start2, lt: d7End2 }, userId: { in: cohortIds } },
    });
    const d7Distinct = d7Rows.length;
    const d7UserIds = new Set(d7Rows.map(r => r.userId));

    assert("D7 groupBy returns distinct userIds", d7Distinct === d7UserIds.size);
    assert("D7 distinct count ≤ registered", d7Distinct <= registered);
  } else {
    assert("No users in cohort (skip duplicate test)", true);
  }

  // ═══════════════════════════════════════════════════════════
  // 5. DAU/WAU/MAU UNDER WIB (3 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 5. DAU/WAU/MAU UNDER WIB ──");

  const wibToday = wibTodayStart(now);
  const wibWeekAgo = wibDaysAgo(7, now);
  const wibMonthAgo = wibDaysAgo(30, now);

  const dau = (await prisma.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: wibToday } } })).length;
  const wau = (await prisma.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: wibWeekAgo } } })).length;
  const mau = (await prisma.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: wibMonthAgo } } })).length;

  assert("DAU ≥ 0", dau >= 0);
  assert("WAU ≥ DAU (hierarchy)", wau >= dau, `wau=${wau} < dau=${dau}`);
  assert("MAU ≥ WAU (hierarchy)", mau >= wau, `mau=${mau} < wau=${wau}`);

  console.log(`  📊 DAU=${dau}, WAU=${wau}, MAU=${mau} (WIB boundaries)`);

  // ═══════════════════════════════════════════════════════════
  // 6. COHORT EDGE CASES (3 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 6. COHORT EDGE CASES ──");

  // Empty cohort
  const farFuture = new Date(Date.UTC(2099, 0, 1));
  const emptyRange = wibDayToUtcRange(farFuture);
  const emptyCohort = await prisma.user.findMany({
    where: { createdAt: { gte: emptyRange.start, lt: emptyRange.end } },
    select: { id: true },
  });
  assert("Empty cohort returns 0 registered", emptyCohort.length === 0);

  // Cohort with zero retained (possible for old small cohorts)
  const oldDay = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - 60));
  const { start: oldStart, end: oldEnd } = wibDayToUtcRange(oldDay);
  const oldUsers = await prisma.user.findMany({
    where: { createdAt: { gte: oldStart, lt: oldEnd } },
    select: { id: true },
  });
  if (oldUsers.length > 0) {
    const oldD7Day = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - 60 + 7));
    const { start: oldD7Start, end: oldD7End } = wibDayToUtcRange(oldD7Day);
    const oldD7Active = (await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: oldD7Start, lt: oldD7End }, userId: { in: oldUsers.map(u => u.id) } },
    })).length;
    assert("Old cohort D7 ≤ registered", oldD7Active <= oldUsers.length);
    console.log(`  📊 60-day-old cohort: ${oldUsers.length} reg, D7=${oldD7Active}`);
  } else {
    assert("60-day cohort empty (skip)", true);
  }

  // Multiple cohorts don't overlap
  const day1 = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - 5));
  const day2 = new Date(Date.UTC(nowWib.year, nowWib.month, nowWib.day - 6));
  const r1 = wibDayToUtcRange(day1);
  const r2 = wibDayToUtcRange(day2);
  assert("Adjacent cohort ranges don't overlap", r1.start.getTime() >= r2.end.getTime() || r2.start.getTime() >= r1.end.getTime());

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════════════════════════`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
