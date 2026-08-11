/**
 * BC Premium Economy — usage engine (atomic).
 *
 * `canUseFeature()` read-only. `consumeUsage()` yang mengubah usage.
 * Konsumsi atomic via UPDATE ... WHERE used < limit (Prisma updateMany)
 * — dua request concurrent tidak pernah overshoot; create race ditangani
 * catch P2002 (unique userId+featureCode+periodKey).
 *
 * Flow konsumsi:
 *   limit = 0          → denied (tanpa tulis)
 *   limit = Infinity   → allowed (tetap dicatat untuk statistik)
 *   row belum ada      → create used=1
 *   row ada            → increment jika used < limit (atomic)
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { resolvePlan } from "./plans";
import type { PlanCode } from "./plans";
import { getFeatureLimit } from "./entitlement";
import { getPeriodKey } from "./period";
import { entitlementKeyForUsageFeature, USAGE_PERIOD } from "./features";
import type { UsageFeatureCode } from "./features";

export interface UsageResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: PlanCode;
  periodKey: string;
}

/** Error internal saat kuota habis — dibawa sampai route untuk jadi response. */
export class FeatureLimitError extends Error {
  readonly gate: UsageResult;
  constructor(gate: UsageResult) {
    super(`FEATURE_LIMIT_REACHED: ${gate.plan} ${gate.used}/${gate.limit}`);
    this.name = "FeatureLimitError";
    this.gate = gate;
  }
}

export interface UsageRow {
  used: number;
  periodKey: string;
}

export async function getUsageRow(
  userId: string,
  featureCode: UsageFeatureCode,
  date: Date = new Date()
): Promise<UsageRow> {
  const periodKey = getPeriodKey(USAGE_PERIOD[featureCode], date);
  try {
    const row = await db.premiumUsage.findUnique({
      where: { userId_featureCode_periodKey: { userId, featureCode, periodKey } },
      select: { used: true },
    });
    return { used: row?.used ?? 0, periodKey };
  } catch {
    return { used: 0, periodKey };
  }
}

/**
 * Baca usage + limit (READ-ONLY — tidak mengubah apa pun).
 */
export async function getFeatureUsage(
  userId: string,
  featureCode: UsageFeatureCode
): Promise<UsageResult> {
  const { plan } = await resolvePlan(userId);
  const limit = await getFeatureLimit(plan, entitlementKeyForUsageFeature(featureCode) as any);
  const { used, periodKey } = await getUsageRow(userId, featureCode);
  return { allowed: used < limit, used, limit, plan, periodKey };
}

/** Alias read-only — gate tanpa efek samping. */
export function canUseFeature(userId: string, featureCode: UsageFeatureCode) {
  return getFeatureUsage(userId, featureCode);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Konsumsi atomic 1 usage (dengan client transaksi — dipanggil di dalam
 * $transaction route simulasi agar rollback ikut membatalkan session).
 */
export async function consumeUsageTx(
  tx: Prisma.TransactionClient,
  userId: string,
  featureCode: UsageFeatureCode,
  opts: { plan: PlanCode; limit: number },
  date: Date = new Date()
): Promise<UsageResult> {
  const { plan, limit } = opts;
  const periodKey = getPeriodKey(USAGE_PERIOD[featureCode], date);
  const whereUnique = { userId_featureCode_periodKey: { userId, featureCode, periodKey } };

  if (limit <= 0) {
    const { used } = await getUsageRow(userId, featureCode, date);
    return { allowed: false, used, limit, plan, periodKey };
  }

  if (limit === Infinity) {
    const updated = await tx.premiumUsage.upsert({
      where: whereUnique,
      create: { userId, featureCode, periodKey, used: 1 },
      update: { used: { increment: 1 } },
    });
    return { allowed: true, used: updated.used, limit, plan, periodKey };
  }

  const existing = await tx.premiumUsage.findUnique({ where: whereUnique });
  if (!existing) {
    try {
      await tx.premiumUsage.create({
        data: { userId, featureCode, periodKey, used: 1 },
      });
      return { allowed: true, used: 1, limit, plan, periodKey };
    } catch (error) {
      // Create race (P2002): pesaing menang — lanjut ke increment bersyarat.
      if (!isUniqueViolation(error)) throw error;
    }
  }

  const row = await tx.premiumUsage.findUnique({ where: whereUnique });
  if (!row) {
    // Peserta race lain menghapus baris — mustahil; safety net.
    return { allowed: false, used: 0, limit, plan, periodKey };
  }

  const result = await tx.premiumUsage.updateMany({
    where: { id: row.id, used: { lt: limit } },
    data: { used: { increment: 1 } },
  });
  const after = await tx.premiumUsage.findUnique({ where: { id: row.id } });
  const used = after?.used ?? row.used;
  return { allowed: result.count === 1, used, limit, plan, periodKey };
}

/**
 * Konsumsi non-transaksi (feature lain di luar simulasi — fase ini hanya
 * SIMULATION yang ter-wire). Meng-resolve plan + limit sendiri.
 */
export async function consumeUsage(
  userId: string,
  featureCode: UsageFeatureCode
): Promise<UsageResult> {
  const { plan } = await resolvePlan(userId);
  const limit = await getFeatureLimit(plan, entitlementKeyForUsageFeature(featureCode) as any);
  const result = await consumeUsageTx(db, userId, featureCode, { plan, limit });
  if (!result.allowed) throw new FeatureLimitError(result);
  return result;
}

/**
 * Konsumsi untuk dipakai di dalam transaksi route: melempar FeatureLimitError
 * bila tidak allowed (agar transaksi rollback). Gunakan dari dalam try/catch.
 */
export async function consumeUsageGuarded(
  tx: Prisma.TransactionClient,
  userId: string,
  featureCode: UsageFeatureCode,
  opts: { plan: PlanCode; limit: number }
): Promise<UsageResult> {
  const result = await consumeUsageTx(tx, userId, featureCode, opts);
  if (!result.allowed) throw new FeatureLimitError(result);
  return result;
}
