// ════════════════════════════════════════════════════════════════════
// HISTORICAL DAILY BUSINESS SNAPSHOT — Phase 9.2 generator
//
// Contract: docs/HISTORICAL_SNAPSHOT_FINAL_CONTRACT.md (the single source
// of truth for this table). Read it before changing anything here.
//
// Semantics (end-of-day WIB):
//   A snapshot with businessDate = D represents business truth at the END of
//   the Asia/Jakarta calendar day D — the snapshot moment is `endOfDay` =
//   start of the next WIB day (exclusive bound of day D).
//
//   businessDate is normalized to `Date.UTC(y, m, d)` of the WIB calendar
//   day, so the stored value's calendar label always equals the WIB date it
//   represents (matches the contract's sample row 2026-09-30T00:00:00Z =
//   "Sep 30 WIB"). `wibDayToUtcRange()` recovers the real WIB-day window.
//
//   IMPORTANT — late-event limitation (documented, not solved here):
//   Premium state (User.isPremium / premiumUntil) is MUTABLE current state.
//   A snapshot only reflects entitlement state visible AT the snapshot
//   moment. It cannot reconstruct a premium that has since been revoked
//   (isPremium reset), and a purchase made between end-of-day D and
//   generation time is attributed to D. This is the contract's accepted
//   semantics; a Premium event ledger is Phase 9.6+ scope.
//
// Immutability: rows are never updated or deleted. One row per
//   (businessDate, calculationVersion). Regeneration returns the existing
//   row unchanged; concurrent generation converges to a single row via the
//   unique constraint.
// ════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  calculateMRRBreakdown,
  calculateMRR,
} from "@/lib/admin/executive";
import {
  wibDayToUtcRange,
  wibDayOffsetToUtcRange,
  utcToWibDate,
} from "@/lib/admin/analytics-timezone";

/** Semantic calculation version — bump ONLY when the metric definition changes. */
export const SNAPSHOT_CALCULATION_VERSION = "1.0";

/** Prisma client surface the generator touches (injectable for offline tests). */
export type SnapshotClient = Pick<
  typeof db,
  "user" | "xPTransaction" | "dailyBusinessSnapshot"
>;

/** The 17 typed fields of DailyBusinessSnapshot (contract §5). */
export interface DailySnapshotValues {
  businessDate: Date;
  totalUsers: number;
  muridUsers: number;
  guruUsers: number;
  dau: number;
  wau: number;
  mau: number;
  activePremium: number;
  muridPremium: number;
  guruPremium: number;
  mrr: number;
  muridMonthlyMrr: number;
  muridYearlyMrr: number;
  guruMonthlyMrr: number;
  guruYearlyMrr: number;
  calculationVersion: string;
}

export class SnapshotInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotInvariantError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/**
 * Normalize an input date to the UTC midnight that carries the same calendar
 * label as its Asia/Jakarta calendar day. Pure and deterministic.
 */
export function normalizeBusinessDate(input: Date): Date {
  const { year, month, day } = utcToWibDate(input);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Application-level invariant checks (contract §4 — Layer 1).
 * Throws SnapshotInvariantError on the first violation. Pure.
 */
export function assertSnapshotInvariants(v: DailySnapshotValues): void {
  if (
    v.mrr !==
    v.muridMonthlyMrr + v.muridYearlyMrr + v.guruMonthlyMrr + v.guruYearlyMrr
  ) {
    throw new SnapshotInvariantError(
      `MRR decomposition violated: mrr=${v.mrr} != muridMonthly=${v.muridMonthlyMrr} + muridYearly=${v.muridYearlyMrr} + guruMonthly=${v.guruMonthlyMrr} + guruYearly=${v.guruYearlyMrr}`
    );
  }
  if (v.activePremium !== v.muridPremium + v.guruPremium) {
    throw new SnapshotInvariantError(
      `Premium decomposition violated: activePremium=${v.activePremium} != murid=${v.muridPremium} + guru=${v.guruPremium}`
    );
  }
  const counts = [
    v.totalUsers, v.muridUsers, v.guruUsers, v.dau, v.wau, v.mau,
    v.activePremium, v.muridPremium, v.guruPremium,
    v.mrr, v.muridMonthlyMrr, v.muridYearlyMrr, v.guruMonthlyMrr, v.guruYearlyMrr,
  ];
  if (counts.some((c) => !Number.isInteger(c) || c < 0)) {
    throw new SnapshotInvariantError(
      "Non-negativity violated: every count/money field must be a non-negative integer"
    );
  }
  if (!(v.dau <= v.wau && v.wau <= v.mau)) {
    throw new SnapshotInvariantError(
      `Activity hierarchy violated: dau=${v.dau} wau=${v.wau} mau=${v.mau}`
    );
  }
  if (
    v.activePremium > v.totalUsers ||
    v.muridPremium > v.muridUsers ||
    v.guruPremium > v.guruUsers
  ) {
    throw new SnapshotInvariantError(
      `Premium bounds violated: active=${v.activePremium}/total=${v.totalUsers}, murid=${v.muridPremium}/muridUsers=${v.muridUsers}, guru=${v.guruPremium}/guruUsers=${v.guruUsers}`
    );
  }
  if (!v.calculationVersion) {
    throw new SnapshotInvariantError("calculationVersion must not be empty");
  }
}

/**
 * Generate the daily business snapshot for one WIB business day.
 *
 * Flow: normalize businessDate → derive WIB window → compute all 17 values
 * from canonical sources → assert invariants → single INSERT (atomic).
 *
 * Idempotent: if a row already exists for (businessDate, calculationVersion)
 * it is returned unchanged — never mutated. Concurrent calls converge to one
 * row (unique constraint + P2002 → re-read).
 */
export async function generateDailyBusinessSnapshot(
  inputDate: Date,
  opts: { client?: SnapshotClient; calculationVersion?: string } = {}
): Promise<DailySnapshotValues & { id: string; generatedAt: Date }> {
  const client = opts.client ?? db;
  const calculationVersion = opts.calculationVersion ?? SNAPSHOT_CALCULATION_VERSION;

  const businessDate = normalizeBusinessDate(inputDate);
  const { end: endOfDay } = wibDayToUtcRange(businessDate); // exclusive end = start of next WIB day
  const wauStart = wibDayOffsetToUtcRange(-6, businessDate).start; // D-6 .. D (7 WIB days)
  const mauStart = wibDayOffsetToUtcRange(-29, businessDate).start; // D-29 .. D (30 WIB days)

  // ── Users existing at end of day D (User.createdAt is authoritative) ──
  const [totalUsers, muridUsers, guruUsers] = await Promise.all([
    client.user.count({ where: { createdAt: { lt: endOfDay } } }),
    client.user.count({ where: { createdAt: { lt: endOfDay }, role: "MURID" } }),
    client.user.count({ where: { createdAt: { lt: endOfDay }, role: "GURU" } }),
  ]);

  // ── Engagement over WIB windows (XPTransaction is authoritative) ──
  const wibRange = wibDayToUtcRange(businessDate);
  const [dauCount, wauCount, mauCount] = await Promise.all([
    client.xPTransaction
      .groupBy({ by: ["userId"], where: { createdAt: { gte: wibRange.start, lt: wibRange.end } } })
      .then((r) => r.length),
    client.xPTransaction
      .groupBy({ by: ["userId"], where: { createdAt: { gte: wauStart, lt: wibRange.end } } })
      .then((r) => r.length),
    client.xPTransaction
      .groupBy({ by: ["userId"], where: { createdAt: { gte: mauStart, lt: wibRange.end } } })
      .then((r) => r.length),
  ]);

  // ── Premium state at end of day D (canonical entitlement predicate) ──
  const [activePremium, muridPremium, guruPremium] = await Promise.all([
    client.user.count({
      where: { isPremium: true, premiumUntil: { gt: endOfDay }, isFounder: false },
    }),
    client.user.count({
      where: { isPremium: true, premiumUntil: { gt: endOfDay }, isFounder: false, role: "MURID" },
    }),
    client.user.count({
      where: { isPremium: true, premiumUntil: { gt: endOfDay }, isFounder: false, role: "GURU" },
    }),
  ]);

  // ── MRR from the SAME canonical formula, evaluated at the snapshot moment ──
  const breakdown = await calculateMRRBreakdown(endOfDay, client);
  const mrr = await calculateMRR(endOfDay, client);
  if (mrr !== breakdown.total) {
    throw new SnapshotInvariantError(
      `Canonical MRR mismatch: calculateMRR()=${mrr} != calculateMRRBreakdown().total=${breakdown.total}`
    );
  }

  // ── Compose + validate (Layer 1) BEFORE any write ──
  const values: DailySnapshotValues = {
    businessDate,
    totalUsers,
    muridUsers,
    guruUsers,
    dau: dauCount,
    wau: wauCount,
    mau: mauCount,
    activePremium,
    muridPremium,
    guruPremium,
    mrr: breakdown.total,
    muridMonthlyMrr: breakdown.muridMonthly,
    muridYearlyMrr: breakdown.muridYearly,
    guruMonthlyMrr: breakdown.guruMonthly,
    guruYearlyMrr: breakdown.guruYearly,
    calculationVersion,
  };
  assertSnapshotInvariants(values);

  // ── Idempotent, immutable, atomic persist ──
  const uniqueWhere = {
    businessDate_calculationVersion: { businessDate, calculationVersion },
  };
  const existing = await client.dailyBusinessSnapshot.findUnique({
    where: uniqueWhere,
  });
  if (existing) return existing; // never mutate a committed snapshot

  try {
    const row = await client.dailyBusinessSnapshot.create({ data: values });
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Concurrent generator won the race — return the committed row.
      const winner = await client.dailyBusinessSnapshot.findUnique({ where: uniqueWhere });
      if (winner) return winner;
    }
    throw err;
  }
}
