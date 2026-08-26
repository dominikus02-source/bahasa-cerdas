/**
 * P7C §17 — Admin audit integration.
 *
 * REUSE AdminPaymentAuditLog (schema.prisma:2351) — jangan buat sistem audit
 * kedua. Commission actions are identifiable by domain/entity/action via the
 * `action` string: "COMMISSION_*" prefix + entity id di metadata.
 *
 * Semua mutasi finansial komisi wajib lewat helper ini:
 *   - commission creation        (system)
 *   - commission reversal        (system/admin)
 *   - attribution correction     (admin)
 *   - wallet mismatch            (system — reconciliation)
 *   - manual adjustment          (admin)
 *   - withdrawal intervention    (admin)
 *   - payout failure resolution  (admin)
 *   - reconciliation event       (system)
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { emitCommissionEvent } from "./events";

type DbClient = Prisma.TransactionClient | typeof db;

interface AuditInput {
  /** User.id aktor. Wajib untuk aksi admin. "system" untuk aksi otomatis. */
  actorUserId?: string | null;
  /** User.id target (guru/murid yang datanya berubah). */
  targetUserId?: string | null;
  /** Transaksi terkait (jika ada). */
  transactionId?: string | null;
  /** Identitas domain, mis. "COMMISSION_CREATE". */
  action: string;
  /** Nilai sebelum (JSON-safe). */
  previousValue?: unknown;
  /** Nilai sesudah (JSON-safe). */
  newValue?: unknown;
  /** Alasan manusia. */
  reason?: string;
  /** Konteks tambahan (entity id, dst.). */
  metadata?: Record<string, unknown>;
}

function stringifyForLog(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Write one AdminPaymentAuditLog row. Best-effort: audit failure logged but
 * never thrown — financial flow must not break because audit table is down.
 * Optional `tx` reuses an open transaction (audit rolls back together with
 * the mutation it documents).
 */
export async function auditCommission(
  input: AuditInput,
  tx?: DbClient,
): Promise<void> {
  const client = tx ?? db;
  try {
    await client.adminPaymentAuditLog.create({
      data: {
        adminUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        transactionId: input.transactionId ?? null,
        action: input.action,
        previousValue: stringifyForLog(input.previousValue),
        newValue: stringifyForLog(input.newValue),
        reason: input.reason ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[commission][audit] gagal menulis AdminPaymentAuditLog:", err);
  }
}

/** Emit event + audit log (system actor). */
export async function auditSystemEvent(
  event: Parameters<typeof emitCommissionEvent>[0],
  audit: AuditInput,
  tx?: DbClient,
): Promise<void> {
  emitCommissionEvent(event);
  await auditCommission({ ...audit, actorUserId: audit.actorUserId ?? null }, tx);
}
