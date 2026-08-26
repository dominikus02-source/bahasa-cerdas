/**
 * Guru Cerdas Sejahtera — Backfill service (P7C §19).
 *
 * Dua tahap:
 *   A. Backfill ATTRIBUTION dari enrollment pre-launch (GroupMember) —
 *      eligibleFrom = tanggal resmi program (NO retroactive commission).
 *   B. Backfill COMMISSION dari Transaksi MURID_PREMIUM SUCCESS yang belum
 *      punya entry komisi.
 *
 * Selalu mendukung DRY RUN (default) — laporan lengkap tanpa tulis apa pun.
 * EXECUTE idempotent: aman dijalankan ulang berkali-kali (unique key db-level).
 * Respect: launch date, eligibleFrom, attribution aktif, status SUCCESS,
 * ADMIN exclusion, first-valid-wins, self-referral, wallet suspended.
 */

import { db } from "@/lib/db";
import { teacherCommissionLaunchDate } from "./config";
import { ensureAttributionOnClassJoin } from "./attribution";
import { createCommissionFromTransaction, evaluateCommission } from "./engine";
import type { BackfillReport, BackfillRow, BackfillRowStatus } from "./types";

interface TransaksiCandidate {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  updatedAt: Date;
  metadata: unknown;
}

/** Kandidat: transaksi murid-premium SUCCESS yang belum punya komisi. */
async function loadCandidates(): Promise<TransaksiCandidate[]> {
  const settled = await db.transaksi.findMany({
    where: {
      type: "MURID_PREMIUM",
      status: "SUCCESS",
      // Sudah punya komisi (entryType COMMISSION) → lewati (ALREADY_EXISTS).
      commissions: { none: { entryType: "COMMISSION" } },
    },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      status: true,
      updatedAt: true,
      metadata: true,
    },
  });
  return settled;
}

function mapSkipReason(reason: string): BackfillRowStatus {
  switch (reason) {
    case "NOT_SETTLED":
      return "SKIPPED_NOT_SETTLED";
    case "NOT_PREMIUM_STUDENT":
    case "INVALID_PAYMENT":
      return "INVALID_PAYMENT";
    case "NO_ATTRIBUTION":
      return "SKIPPED_NO_ATTRIBUTION";
    case "TEACHER_EXCLUDED":
      return "EXCLUDED_TEACHER";
    case "SELF_REFERRAL":
      return "INVALID_ATTRIBUTION";
    case "BEFORE_ELIGIBLE_FROM":
      return "PRE_LAUNCH";
    case "ZERO_COMMISSION":
      return "ZERO_COMMISSION";
    case "WALLET_SUSPENDED":
      return "WALLET_SUSPENDED";
    default:
      return "INVALID_ATTRIBUTION";
  }
}

/**
 * Run backfill. dryRun=true (default) → report only, zero writes.
 * dryRun=false → creates attributions (pre-launch) + commissions, idempotent.
 */
export async function backfillTeacherCommissions(opts: {
  dryRun: boolean;
  includeAttributionBackfill?: boolean;
}): Promise<BackfillReport> {
  const dryRun = opts.dryRun;
  const launch = teacherCommissionLaunchDate();
  const report: BackfillReport = {
    dryRun,
    totalScanned: 0,
    eligible: 0,
    skipped: 0,
    alreadyExists: 0,
    invalidAttribution: 0,
    preLaunch: 0,
    excludedTeacher: 0,
    invalidPayment: 0,
    rows: [],
  };

  // ── Tahap A: attribution pre-launch dari enrollment existing ──
  if (opts.includeAttributionBackfill !== false) {
    const members = await db.groupMember.findMany({
      select: { userId: true, groupId: true },
      orderBy: { joinedAt: "asc" }, // kronologis → first-valid-wins deterministik
    });
    const attributed = new Set(
      (
        await db.teacherAttribution.findMany({
          select: { studentId: true },
        })
      ).map((a) => a.studentId),
    );

    for (const m of members) {
      if (attributed.has(m.userId)) continue;
      if (!dryRun) {
        const res = await ensureAttributionOnClassJoin(m.userId, m.groupId, launch);
        if (res.created) attributed.add(m.userId);
      }
      // Dry-run tidak menulis — cukup hitung (sisa statistik ada di tahap B).
    }
  }

  // ── Tahap B: komisi dari transaksi settled ──
  const candidates = await loadCandidates();
  report.totalScanned = candidates.length;

  for (const t of candidates) {
    const metadata = (t.metadata ?? {}) as Record<string, unknown>;
    const planId = typeof metadata.planId === "string" ? metadata.planId : null;
    const ctx = {
      transaksiId: t.id,
      amount: t.amount,
      userId: t.userId,
      planId,
      metadata,
      settledAt: t.updatedAt,
    };

    if (dryRun) {
      // Evaluasi read-only → klasifikasi tanpa tulis.
      const evaluated = await evaluateCommission(ctx);
      let status: BackfillRowStatus;
      let commissionAmount = 0;
      let teacherId: string | null = null;

      if (evaluated.eligible) {
        status = "ELIGIBLE";
        commissionAmount = evaluated.commissionAmount;
        teacherId = evaluated.teacherId;
      } else {
        status = mapSkipReason(evaluated.reason);
      }

      pushRow(report, {
        transaksiId: t.id,
        studentId: t.userId,
        teacherId,
        amount: t.amount,
        status,
        commissionAmount,
      });
    } else {
      const result = await createCommissionFromTransaction(t.id);
      let status: BackfillRowStatus;
      let commissionAmount = 0;

      if (result.created) {
        status = result.idempotent ? "ALREADY_EXISTS" : "ELIGIBLE";
        commissionAmount = result.commissionAmount;
      } else {
        status = mapSkipReason(result.reason);
      }

      pushRow(report, {
        transaksiId: t.id,
        studentId: t.userId,
        teacherId: result.created ? result.teacherId : null,
        amount: t.amount,
        status,
        commissionAmount,
      });
    }
  }

  return report;
}

function pushRow(report: BackfillReport, row: BackfillRow): void {
  report.rows.push(row);
  switch (row.status) {
    case "ELIGIBLE":
      report.eligible++;
      break;
    case "ALREADY_EXISTS":
      report.alreadyExists++;
      break;
    case "SKIPPED_NO_ATTRIBUTION":
      report.skipped++;
      break;
    case "INVALID_ATTRIBUTION":
      report.invalidAttribution++;
      break;
    case "PRE_LAUNCH":
      report.preLaunch++;
      break;
    case "EXCLUDED_TEACHER":
      report.excludedTeacher++;
      break;
    case "INVALID_PAYMENT":
      report.invalidPayment++;
      break;
    default:
      report.skipped++;
  }
}
