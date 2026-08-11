/**
 * BC Premium Economy — entitlement resolution.
 *
 * Baca entitlement per plan dari DB (`Entitlement`), fallback ke
 * DEFAULT_ENTITLEMENT_MATRIX bila baris belum ada (migration belum jalan /
 * plan baru belum di-seed). JANGAN percaya nilai dari client — semua
 * resolution terjadi server-side.
 */

import { db } from "@/lib/db";
import { resolvePlan } from "./plans";
import {
  DEFAULT_ENTITLEMENT_MATRIX,
  entitlementValueToLimit,
  scalarToEntitlementValue,
} from "./matrix";
import type { EntitlementValue } from "./matrix";
import type { EntitlementKey } from "./features";
import { ENTITLEMENT_KEYS } from "./features";
import type { PlanCode } from "./plans";

export type EntitlementRow = { key: EntitlementKey; value: number | null; type: string };

/**
 * Ambil satu entitlement untuk plan (DB-first, fallback matrix).
 * Aman dipanggil sebelum migration dijalankan: bila query gagal → matrix.
 */
export async function getEntitlement(
  plan: PlanCode,
  key: EntitlementKey
): Promise<EntitlementValue> {
  const fallback = DEFAULT_ENTITLEMENT_MATRIX[plan]?.[key] ?? DEFAULT_ENTITLEMENT_MATRIX.FREE[key];
  try {
    const row = await db.entitlement.findUnique({
      where: { planCode_key: { planCode: plan, key } },
      select: { value: true, type: true },
    });
    if (!row) return fallback;
    if (row.type === "UNLIMITED" || (row.value ?? -1) < 0) return "unlimited";
    return scalarToEntitlementValue(row.value ?? 0, key);
  } catch {
    return fallback;
  }
}

/** Semua entitlement satu plan, sebagai map key → value. */
export async function getEntitlements(
  plan: PlanCode
): Promise<Record<EntitlementKey, EntitlementValue>> {
  const fallback: Record<EntitlementKey, EntitlementValue> = {
    ...DEFAULT_ENTITLEMENT_MATRIX.FREE,
    ...DEFAULT_ENTITLEMENT_MATRIX[plan],
  };
  try {
    const rows = await db.entitlement.findMany({
      where: { planCode: plan },
      select: { key: true, value: true, type: true },
    });
    if (rows.length === 0) return fallback;
    const out = { ...fallback };
    for (const row of rows) {
      if (!ENTITLEMENT_KEYS.includes(row.key as EntitlementKey)) continue;
      const key = row.key as EntitlementKey;
      out[key] =
        row.type === "UNLIMITED" || (row.value ?? -1) < 0
          ? "unlimited"
          : scalarToEntitlementValue(row.value ?? 0, key);
    }
    return out;
  } catch {
    return fallback;
  }
}

/** Limit numerik satu entitlement (Infinity = unlimited). */
export async function getFeatureLimit(plan: PlanCode, key: EntitlementKey): Promise<number> {
  return entitlementValueToLimit(await getEntitlement(plan, key));
}

/** Boolean entitlement (PREMIUM_PROFILE dsb.). */
export async function hasEntitlement(plan: PlanCode, key: EntitlementKey): Promise<boolean> {
  return entitlementValueToLimit(await getEntitlement(plan, key)) > 0;
}

// ── API userId-based (wrapper ringan, resolve plan dulu) ──

export async function getUserEntitlement(
  userId: string,
  key: EntitlementKey
): Promise<EntitlementValue> {
  const { plan } = await resolvePlan(userId);
  return getEntitlement(plan, key);
}

export async function userHasEntitlement(userId: string, key: EntitlementKey): Promise<boolean> {
  const { plan } = await resolvePlan(userId);
  return hasEntitlement(plan, key);
}

export async function getUserFeatureLimit(userId: string, key: EntitlementKey): Promise<number> {
  const { plan } = await resolvePlan(userId);
  return getFeatureLimit(plan, key);
}
