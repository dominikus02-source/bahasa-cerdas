#!/usr/bin/env npx tsx
// ════════════════════════════════════════════════════════════════════
// TEST: Historical Daily Business Snapshot (Phase 9.2)
//
// Fully OFFLINE — no database, no .env required. Uses a fake Prisma client
// so the real generator logic (windows, filters, idempotency, immutability,
// atomicity, concurrency) is exercised deterministically.
//
// Sections:
//   A. Schema contract (scans prisma/schema.prisma + manual SQL migration)
//   B. Timezone / businessDate boundaries (00:00 & 23:59:59 WIB, month/year
//      end, leap day, UTC ↔ WIB)
//   C. Invariant validation (pure)
//   D. Generator behavior via fake client (fields, MRR, premium boundary,
//      idempotency, immutability, concurrency, atomicity, versioning)
// ════════════════════════════════════════════════════════════════════

import * as fs from "node:fs";
import * as path from "node:path";
import { Prisma } from "@prisma/client";
import {
  generateDailyBusinessSnapshot,
  normalizeBusinessDate,
  assertSnapshotInvariants,
  SnapshotInvariantError,
  SNAPSHOT_CALCULATION_VERSION,
  type SnapshotClient,
  type DailySnapshotValues,
} from "../lib/admin/historical-snapshot";
import {
  wibDayToUtcRange,
  utcToWibDate,
} from "../lib/admin/analytics-timezone";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${label}: ${detail || "assertion failed"}`);
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
  assert(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertThrows(label: string, fn: () => unknown, match?: RegExp) {
  try {
    fn();
    assert(label, false, "expected an error but none was thrown");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (match) assert(label, match.test(msg), `error message did not match ${match}: ${msg}`);
    else assert(label, true);
  }
}

async function assertRejects(label: string, p: Promise<unknown>, match?: RegExp) {
  try {
    await p;
    assert(label, false, "expected a rejection but none occurred");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (match) assert(label, match.test(msg), `rejection did not match ${match}: ${msg}`);
    else assert(label, true);
  }
}

const root = path.resolve(__dirname, "..");

// ════════════════════════════════════════════════════════════════════
// A. SCHEMA CONTRACT
// ════════════════════════════════════════════════════════════════════

const schemaText = fs.readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8");
const modelMatch = /model DailyBusinessSnapshot \{([\s\S]*?)\n\}/.exec(schemaText);
assert("schema: DailyBusinessSnapshot model exists", !!modelMatch);
const modelBlock = modelMatch ? modelMatch[1] : "";

const expectedFields = [
  "id", "businessDate", "generatedAt",
  "totalUsers", "muridUsers", "guruUsers",
  "dau", "wau", "mau",
  "activePremium", "muridPremium", "guruPremium",
  "mrr", "muridMonthlyMrr", "muridYearlyMrr", "guruMonthlyMrr", "guruYearlyMrr",
  "calculationVersion",
];
for (const f of expectedFields) {
  assert(`schema: field ${f} present`, new RegExp(`\\b${f}\\b`).test(modelBlock));
}

const intFields = [
  "totalUsers", "muridUsers", "guruUsers", "dau", "wau", "mau",
  "activePremium", "muridPremium", "guruPremium",
  "mrr", "muridMonthlyMrr", "muridYearlyMrr", "guruMonthlyMrr", "guruYearlyMrr",
];
for (const f of intFields) {
  assert(`schema: ${f} is Int`, new RegExp(`${f}\\s+Int\\b`).test(modelBlock));
  assert(`schema: ${f} is Int (not Float/Decimal/BigInt)`, !new RegExp(`${f}\\s+(Float|Decimal|BigInt)`).test(modelBlock));
  assert(`schema: ${f} NOT NULL (no nullable marker)`, !new RegExp(`${f}\\s+Int\\?`).test(modelBlock));
}
assert("schema: no nullable Int anywhere in model", !/\bInt\?/.test(modelBlock));
assert("schema: no nullable DateTime", !/\bDateTime\?/.test(modelBlock));
assert("schema: businessDate unique via @@unique([businessDate, calculationVersion])", modelBlock.includes("@@unique([businessDate, calculationVersion])"));
assert("schema: @@index([businessDate])", modelBlock.includes("@@index([businessDate])"));
assert("schema: zero Float/Decimal/BigInt money", !/Float|Decimal|BigInt/.test(modelBlock));

const migrationText = fs.readFileSync(
  path.join(root, "prisma", "migrations", "manual", "2026-09-08_daily_business_snapshot.sql"),
  "utf8"
);
for (const c of [
  "daily_snapshot_mrr_decomposition",
  "daily_snapshot_premium_decomposition",
  "daily_snapshot_non_negative",
  "daily_snapshot_activity_hierarchy",
  "daily_snapshot_premium_bounds",
]) {
  assert(`migration: CHECK constraint ${c}`, migrationText.includes(c));
}
assert("migration: unique index (businessDate, calculationVersion)", migrationText.includes("DailyBusinessSnapshot_businessDate_calculationVersion_key"));
assert("migration: CREATE TABLE IF NOT EXISTS (idempotent)", migrationText.includes("CREATE TABLE IF NOT EXISTS \"DailyBusinessSnapshot\""));

// ════════════════════════════════════════════════════════════════════
// B. TIMEZONE / BUSINESSDATE SEMANTICS
// ════════════════════════════════════════════════════════════════════

// 2026-09-03T16:59:59.999Z = 23:59:59.999 WIB on Sep 3 → businessDate Sep 3.
let bd = normalizeBusinessDate(new Date(Date.UTC(2026, 8, 3, 16, 59, 59, 999)));
assertEqual("tz: 23:59:59.999 WIB Sep 3 → Sep 3", utcToWibDate(bd).day, 3);
assertEqual("tz: normalized value = UTC midnight Sep 3", bd.getTime(), Date.UTC(2026, 8, 3));

// 2026-09-03T17:00:00.000Z = 00:00:00 WIB on Sep 4 → businessDate Sep 4.
bd = normalizeBusinessDate(new Date(Date.UTC(2026, 8, 3, 17, 0, 0, 0)));
assertEqual("tz: 00:00:00 WIB Sep 4 → Sep 4", utcToWibDate(bd).day, 4);

// 2026-09-03T00:00:00.000Z = 07:00 WIB Sep 3 → businessDate Sep 3.
bd = normalizeBusinessDate(new Date(Date.UTC(2026, 8, 3, 0, 0, 0)));
assertEqual("tz: UTC midnight Sep 3 (07:00 WIB) → Sep 3", utcToWibDate(bd).day, 3);

// Month rollover: 2026-09-30T17:00:00Z = 00:00 WIB Oct 1 → Oct 1.
bd = normalizeBusinessDate(new Date(Date.UTC(2026, 8, 30, 17, 0, 0)));
assertEqual("tz: month-end 00:00 WIB Oct 1 → Oct 1", utcToWibDate(bd).day, 1);
assertEqual("tz: month-end rolls month", utcToWibDate(bd).month, 9);

// Year rollover: 2026-12-31T17:00:00Z = 00:00 WIB 2027-01-01 → 2027-01-01.
bd = normalizeBusinessDate(new Date(Date.UTC(2026, 11, 31, 17, 0, 0)));
assertEqual("tz: year-end rolls year", utcToWibDate(bd).year, 2027);

// Leap day: 2028-02-29T16:00:00Z = 23:00 WIB Feb 29 2028 → Feb 29 2028.
bd = normalizeBusinessDate(new Date(Date.UTC(2028, 1, 29, 16, 0, 0)));
assertEqual("tz: leap day preserved", utcToWibDate(bd).day, 29);

// WIB day window for normalized Sep 3: [Sep 2 17:00Z, Sep 3 17:00Z).
const sep3 = normalizeBusinessDate(new Date(Date.UTC(2026, 8, 3)));
const range = wibDayToUtcRange(sep3);
assertEqual("tz: day window start = 17:00Z Sep 2", range.start.getTime(), Date.UTC(2026, 8, 2, 17));
assertEqual("tz: day window end = 17:00Z Sep 3", range.end.getTime(), Date.UTC(2026, 8, 3, 17));

// ════════════════════════════════════════════════════════════════════
// C. INVARIANT VALIDATION (pure)
// ════════════════════════════════════════════════════════════════════

function sampleValues(overrides: Partial<DailySnapshotValues> = {}): DailySnapshotValues {
  // Contract §8 sample row: mrr 250,000 = 38,000+15,000+147,000+50,000; active 8 = 3+5.
  return {
    businessDate: new Date(Date.UTC(2026, 8, 30)),
    totalUsers: 1500, muridUsers: 1200, guruUsers: 300,
    dau: 215, wau: 480, mau: 890,
    activePremium: 8, muridPremium: 3, guruPremium: 5,
    mrr: 250_000,
    muridMonthlyMrr: 38_000, muridYearlyMrr: 15_000, guruMonthlyMrr: 147_000, guruYearlyMrr: 50_000,
    calculationVersion: SNAPSHOT_CALCULATION_VERSION,
    ...overrides,
  };
}

assert("inv: contract sample row passes", (() => { try { assertSnapshotInvariants(sampleValues()); return true; } catch { return false; } })());
assertThrows("inv: negative mrr rejected", () =>
  assertSnapshotInvariants(sampleValues({ mrr: -20, muridMonthlyMrr: -5, muridYearlyMrr: -5, guruMonthlyMrr: -5, guruYearlyMrr: -5 })),
  /Non-negativity/);
assertThrows("inv: negative count rejected", () => assertSnapshotInvariants(sampleValues({ dau: -3 })), /Non-negativity/);
assertThrows("inv: MRR mismatch rejected", () => assertSnapshotInvariants(sampleValues({ muridMonthlyMrr: 1 })), /MRR decomposition/);
assertThrows("inv: premium mismatch rejected", () => assertSnapshotInvariants(sampleValues({ muridPremium: 9 })), /Premium decomposition/);
assertThrows("inv: activePremium > totalUsers rejected", () =>
  assertSnapshotInvariants(sampleValues({ activePremium: 1501, muridPremium: 900, guruPremium: 601 })),
  /Premium bounds/);
assertThrows("inv: muridPremium > muridUsers rejected", () => assertSnapshotInvariants(sampleValues({ muridPremium: 1201, activePremium: 1206, guruPremium: 5 })), /Premium bounds/);
assertThrows("inv: guruPremium > guruUsers rejected", () => assertSnapshotInvariants(sampleValues({ guruPremium: 301, activePremium: 304 })), /Premium bounds/);
assertThrows("inv: dau > wau rejected", () => assertSnapshotInvariants(sampleValues({ dau: 500 })), /Activity hierarchy/);
assertThrows("inv: wau > mau rejected", () => assertSnapshotInvariants(sampleValues({ wau: 900 })), /Activity hierarchy/);
assertThrows("inv: empty calculationVersion rejected", () => assertSnapshotInvariants(sampleValues({ calculationVersion: "" })), /calculationVersion/);
assertThrows("inv: NaN rejected", () => assertSnapshotInvariants(sampleValues({ dau: NaN })), /Non-negativity/);

// ════════════════════════════════════════════════════════════════════
// D. GENERATOR BEHAVIOR (fake Prisma client, fully offline)
// ════════════════════════════════════════════════════════════════════

interface FakeTx { reference: string; createdAt: Date; status: string; type: string }
interface FakeUser {
  id: string; createdAt: Date; role: "MURID" | "GURU" | "ADMIN";
  isPremium: boolean; premiumUntil: Date | null; isFounder: boolean;
  premiumPlan: string | null; transaksi: FakeTx[];
}
interface FakeXp { userId: string; createdAt: Date }

interface SnapshotRow extends DailySnapshotValues {
  id: string;
  generatedAt: Date;
}

interface CountWhere {
  createdAt?: { lt?: Date; gte?: Date; gt?: Date };
  role?: string;
  isPremium?: boolean;
  isFounder?: boolean;
  premiumUntil?: { gt?: Date };
}

function userMatches(u: FakeUser, where: CountWhere | undefined): boolean {
  if (!where) return true;
  if (where.role !== undefined && u.role !== where.role) return false;
  if (where.isPremium !== undefined && u.isPremium !== where.isPremium) return false;
  if (where.isFounder !== undefined && u.isFounder !== where.isFounder) return false;
  if (where.createdAt) {
    const c = u.createdAt.getTime();
    if (where.createdAt.lt !== undefined && !(c < where.createdAt.lt.getTime())) return false;
    if (where.createdAt.gte !== undefined && !(c >= where.createdAt.gte.getTime())) return false;
    if (where.createdAt.gt !== undefined && !(c > where.createdAt.gt.getTime())) return false;
  }
  if (where.premiumUntil?.gt !== undefined) {
    const p = u.premiumUntil ? u.premiumUntil.getTime() : -Infinity;
    if (!(p > where.premiumUntil.gt.getTime())) return false;
  }
  return true;
}

function makeFakeClient(cfg: { users?: FakeUser[]; xp?: FakeXp[]; failCreate?: boolean } = {}) {
  const users = [...(cfg.users ?? [])];
  const xp = [...(cfg.xp ?? [])];
  const store: SnapshotRow[] = [];
  let createCalls = 0;
  let idCounter = 0;

  const client = {
    user: {
      async count(args: { where?: CountWhere }): Promise<number> {
        return users.filter((u) => userMatches(u, args.where)).length;
      },
      // Mirrors executive.ts getActivePremiumUsers() shape (MRR path).
      async findMany(args: { where?: CountWhere; orderBy?: unknown; take?: number; select?: unknown }) {
        return users
          .filter((u) => userMatches(u, args.where))
          .map((u) => ({
            id: u.id,
            role: u.role,
            premiumPlan: u.premiumPlan,
            transaksi: [...u.transaksi]
              .filter((t) => t.status === "SUCCESS" && (t.type === "PREMIUM_UPGRADE" || t.type === "MURID_PREMIUM"))
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 1),
          }));
      },
    },
    xPTransaction: {
      async groupBy(args: { by: ["userId"]; where: { createdAt: { gte?: Date; lt?: Date } } }) {
        const seen = new Set<string>();
        for (const t of xp) {
          const ts = t.createdAt.getTime();
          if (args.where?.createdAt?.gte && ts < args.where.createdAt.gte.getTime()) continue;
          if (args.where?.createdAt?.lt && ts >= args.where.createdAt.lt.getTime()) continue;
          seen.add(t.userId);
        }
        return Array.from(seen).map((userId) => ({ userId }));
      },
    },
    dailyBusinessSnapshot: {
      async findUnique(args: { where: { businessDate_calculationVersion: { businessDate: Date; calculationVersion: string } } }) {
        const key = args.where.businessDate_calculationVersion;
        const row = store.find(
          (r) => r.businessDate.getTime() === key.businessDate.getTime() && r.calculationVersion === key.calculationVersion
        );
        return row ?? null;
      },
      async create(args: { data: DailySnapshotValues }) {
        createCalls++;
        if (cfg.failCreate) throw new Error("connection reset (simulated DB failure)");
        const dup = store.some(
          (r) => r.businessDate.getTime() === args.data.businessDate.getTime() && r.calculationVersion === args.data.calculationVersion
        );
        if (dup) {
          throw new Prisma.PrismaClientKnownRequestError(
            "Unique constraint failed on the fields: (`businessDate`,`calculationVersion`)",
            { code: "P2002", clientVersion: "5.0.0" }
          );
        }
        const row: SnapshotRow = {
          ...args.data,
          id: `snap_${idCounter++}`,
          generatedAt: new Date(Date.UTC(2026, 9, 1, 0, 5)),
        };
        store.push(row);
        return { ...row };
      },
    },
  };

  return { client: client as unknown as SnapshotClient, store, getCreateCalls: () => createCalls };
}

// ── D1. Field computation from fake data ──

const endOfDaySep3 = new Date(Date.UTC(2026, 8, 3, 17)); // end of WIB Sep 3 = start of Sep 4
const D = new Date(Date.UTC(2026, 8, 3)); // businessDate Sep 3

const baseUsers: FakeUser[] = [
  // 4 users registered before end of Sep 3: 3 murid + 1 guru (1 guru is founder → excluded from premium only).
  { id: "u1", createdAt: new Date(Date.UTC(2026, 7, 1)), role: "MURID", isPremium: true, premiumUntil: new Date(Date.UTC(2026, 9, 1)), isFounder: false, premiumPlan: "MURID_PREMIUM_MONTHLY", transaksi: [] },
  { id: "u2", createdAt: new Date(Date.UTC(2026, 7, 5)), role: "MURID", isPremium: true, premiumUntil: new Date(Date.UTC(2026, 9, 15)), isFounder: false, premiumPlan: "MURID_PREMIUM_YEARLY", transaksi: [{ reference: "MURID_PREMIUM_YEARLY", createdAt: new Date(Date.UTC(2026, 7, 5)), status: "SUCCESS", type: "MURID_PREMIUM" }] },
  { id: "u3", createdAt: new Date(Date.UTC(2026, 8, 2)), role: "MURID", isPremium: false, premiumUntil: null, isFounder: false, premiumPlan: null, transaksi: [] },
  { id: "u4", createdAt: new Date(Date.UTC(2026, 7, 10)), role: "GURU", isPremium: true, premiumUntil: new Date(Date.UTC(2026, 10, 1)), isFounder: false, premiumPlan: "GURU_PRO_YEARLY", transaksi: [{ reference: "GURU_PRO_YEARLY", createdAt: new Date(Date.UTC(2026, 7, 10)), status: "SUCCESS", type: "PREMIUM_UPGRADE" }] },
  { id: "u5", createdAt: new Date(Date.UTC(2026, 7, 20)), role: "GURU", isPremium: true, premiumUntil: new Date(Date.UTC(2026, 9, 20)), isFounder: true, premiumPlan: "GURU_PRO_MONTHLY", transaksi: [] }, // founder → excluded
  // Registered AFTER end of Sep 3 → excluded from counts.
  { id: "u6", createdAt: new Date(Date.UTC(2026, 8, 3, 17, 0, 1)), role: "MURID", isPremium: false, premiumUntil: null, isFounder: false, premiumPlan: null, transaksi: [] },
];

const sep3Window = wibDayToUtcRange(D); // [Aug 2 17:00Z, Sep 3 17:00Z)
const baseXp: FakeXp[] = [
  { userId: "u1", createdAt: new Date(sep3Window.start.getTime() + 1000) }, // dau
  { userId: "u3", createdAt: new Date(sep3Window.start.getTime() + 2000) }, // dau
  { userId: "u2", createdAt: new Date(Date.UTC(2026, 8, 1, 10)) }, // 2 WIB days before D → wau+mau, not dau
  { userId: "u4", createdAt: new Date(Date.UTC(2026, 7, 20, 10)) }, // ~14 days before → mau only
  { userId: "u1", createdAt: new Date(sep3Window.end.getTime()) }, // exactly at boundary → excluded (lt end)
];

(async () => {
  // D1. Fields
  const fc1 = makeFakeClient({ users: baseUsers, xp: baseXp });
  const s1 = await generateDailyBusinessSnapshot(D, { client: fc1.client });
  assertEqual("gen: businessDate normalized", s1.businessDate.getTime(), D.getTime());
  assertEqual("gen: totalUsers = 5 (excludes post-end registration)", s1.totalUsers, 5);
  assertEqual("gen: muridUsers = 3", s1.muridUsers, 3);
  assertEqual("gen: guruUsers = 2", s1.guruUsers, 2);
  assertEqual("gen: dau = 2 (boundary activity excluded)", s1.dau, 2);
  assertEqual("gen: wau = 3 (u1,u3 dau + u2 in last 7 days)", s1.wau, 3);
  assertEqual("gen: mau = 4 (adds u4 within 30 days)", s1.mau, 4);
  // Premium: u1 (murid monthly), u2 (murid yearly), u4 (guru yearly) active; u5 founder excluded; u3 free.
  assertEqual("gen: activePremium = 3", s1.activePremium, 3);
  assertEqual("gen: muridPremium = 2", s1.muridPremium, 2);
  assertEqual("gen: guruPremium = 1", s1.guruPremium, 1);
  // MRR: murid monthly 19,000 + murid yearly 15,000 + guru yearly 33,250.
  assertEqual("gen: muridMonthlyMrr = 19000", s1.muridMonthlyMrr, 19_000);
  assertEqual("gen: muridYearlyMrr = 15000", s1.muridYearlyMrr, 15_000);
  assertEqual("gen: guruMonthlyMrr = 0", s1.guruMonthlyMrr, 0);
  assertEqual("gen: guruYearlyMrr = 33250", s1.guruYearlyMrr, 33_250);
  assertEqual("gen: mrr = breakdown total (single canonical formula)", s1.mrr, 19_000 + 15_000 + 33_250);
  assertEqual("gen: calculationVersion default", s1.calculationVersion, SNAPSHOT_CALCULATION_VERSION);

  // D2. Premium end-of-day boundary semantics: expiring exactly at endOfDay is NOT
  // active at the snapshot moment; 1s later IS (state at the last instant of day D).
  const boundUsers: FakeUser[] = [
    { id: "b1", createdAt: new Date(Date.UTC(2026, 0, 1)), role: "MURID", isPremium: true, premiumUntil: new Date(endOfDaySep3.getTime()), isFounder: false, premiumPlan: "MURID_PREMIUM_MONTHLY", transaksi: [] },
    { id: "b2", createdAt: new Date(Date.UTC(2026, 0, 1)), role: "MURID", isPremium: true, premiumUntil: new Date(endOfDaySep3.getTime() + 1000), isFounder: false, premiumPlan: "MURID_PREMIUM_MONTHLY", transaksi: [] },
  ];
  const fc2 = makeFakeClient({ users: boundUsers, xp: [] });
  const s2 = await generateDailyBusinessSnapshot(D, { client: fc2.client });
  assertEqual("gen: premium expiring exactly at endOfDay is excluded", s2.activePremium, 1);
  assertEqual("gen: premium expiring 1s after endOfDay is included", s2.muridPremium, 1);
  assertEqual("gen: boundary MRR = 19000 (one plan)", s2.mrr, 19_000);

  // D3. Idempotency — same date twice → same row, no second create.
  const fc3 = makeFakeClient({ users: baseUsers, xp: baseXp });
  const a3 = await generateDailyBusinessSnapshot(D, { client: fc3.client });
  const b3 = await generateDailyBusinessSnapshot(D, { client: fc3.client });
  assertEqual("idem: second run returns the same row", b3.id, a3.id);
  assertEqual("idem: exactly one row in store", fc3.store.length, 1);
  assertEqual("idem: only one create call", fc3.getCreateCalls(), 1);
  assertEqual("idem: no mutation of stored values", fc3.store[0].mrr, a3.mrr);

  // D4. Immutability — pre-existing row (different value) is returned unchanged.
  const fc4 = makeFakeClient({ users: baseUsers, xp: baseXp });
  const preSeed = { ...(await generateDailyBusinessSnapshot(D, { client: fc4.client })), mrr: 999 };
  fc4.store[0] = preSeed; // simulate a committed row that "disagrees" (never happens via generator)
  const again = await generateDailyBusinessSnapshot(D, { client: fc4.client });
  assertEqual("immut: existing row returned, not recomputed", again.mrr, 999);
  assertEqual("immut: store still 1 row", fc4.store.length, 1);
  assertEqual("immut: no create call", fc4.getCreateCalls(), 1);

  // D5. Concurrency — two parallel generators converge to exactly one row.
  const fc5 = makeFakeClient({ users: baseUsers, xp: baseXp });
  const [ra, rb] = await Promise.all([
    generateDailyBusinessSnapshot(D, { client: fc5.client }),
    generateDailyBusinessSnapshot(D, { client: fc5.client }),
  ]);
  assertEqual("conc: exactly one row after concurrent generation", fc5.store.length, 1);
  assertEqual("conc: both callers got the committed row", ra.id, rb.id);

  // D6. Atomicity — persistence failure → zero rows, no partial data.
  const fc6 = makeFakeClient({ users: baseUsers, xp: baseXp, failCreate: true });
  await assertRejects("atomic: DB failure rejects generation", generateDailyBusinessSnapshot(D, { client: fc6.client }), /connection reset/);
  assertEqual("atomic: zero rows persisted on failure", fc6.store.length, 0);

  // D7. Atomicity via invariants — a compute failure throws before any write.
  // Simulate an impossible premium population: guruPremium counted even though no
  // guru exists is not producible from one user list, so exercise the invariant
  // layer directly with a malformed cross-field object (Layer 1 of the contract).
  assertThrows("atomic: invariant violation throws SnapshotInvariantError", () => {
    assertSnapshotInvariants({ ...sampleValues(), activePremium: 1501, muridPremium: 900, guruPremium: 601 });
  }, /Premium bounds/);

  // D8. Versioning — two versions of one day coexist; regeneration is stable.
  const fc8 = makeFakeClient({ users: baseUsers, xp: baseXp });
  const v1a = await generateDailyBusinessSnapshot(D, { client: fc8.client, calculationVersion: "1.0" });
  const v2 = await generateDailyBusinessSnapshot(D, { client: fc8.client, calculationVersion: "2.0" });
  assertEqual("vers: two versions coexist", fc8.store.length, 2);
  assertEqual("vers: v1 stored with its version", v1a.calculationVersion, "1.0");
  assertEqual("vers: v2 stored with its version", v2.calculationVersion, "2.0");
  const v1b = await generateDailyBusinessSnapshot(D, { client: fc8.client, calculationVersion: "1.0" });
  assertEqual("vers: regenerate v1 returns same row", v1b.id, v1a.id);
  assertEqual("vers: repeated generation does not mutate version", fc8.store.filter((r) => r.calculationVersion === "1.0").length, 1);

  // ── Summary ──
  console.log(`\nPhase 9.2 snapshot tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("\nFailures:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  console.error("Test harness crashed:", err);
  process.exit(1);
});
