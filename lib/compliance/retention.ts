import "server-only";
import { db } from "@/lib/db";

const cutoff = (days: number) => new Date(Date.now() - days * 86400000);

export type RetentionSweepSummary = {
  aiJobs: number;
  aiSaved: number;
  analytics: number;
  invitations: number;
  reportPayloads: number;
};

/**
 * Enforces the currently approved application-level retention schedule.
 * Destructive execution is fail-closed behind a reviewed evidence reference.
 */
export async function runPrivacyRetentionSweep(options: {
  execute?: boolean;
  reviewRef?: string | null;
} = {}) {
  const execute = options.execute === true;
  const expiredAi = { createdAt: { lt: cutoff(30) } };
  const expiredEvents = { createdAt: { lt: cutoff(90) } };
  const expiredInvites = {
    status: { in: ["PENDING", "SUPERSEDED", "REJECTED"] },
    expiresAt: { lt: cutoff(30) },
  };
  const reportPayload = { status: "RESOLVED", reviewedAt: { lt: cutoff(180) } };

  const summary: RetentionSweepSummary = {
    aiJobs: await db.aIJob.count({ where: expiredAi }),
    aiSaved: await db.aiSavedResult.count({ where: expiredAi }),
    analytics: await db.productEvent.count({ where: expiredEvents }),
    invitations: await db.guardianRequest.count({ where: expiredInvites }),
    reportPayloads: await db.safetyReport.count({
      where: { ...reportPayload, detail: { not: "[retention-expired]" } },
    }),
  };

  if (!execute) return { mode: "dry-run" as const, summary };
  const reviewRef = options.reviewRef?.trim();
  if (!reviewRef || reviewRef.length < 6) throw new Error("RETENTION_REVIEW_REQUIRED");

  await db.$transaction(async (tx) => {
    await tx.aIJob.deleteMany({ where: expiredAi });
    await tx.aiSavedResult.deleteMany({ where: expiredAi });
    await tx.productEvent.deleteMany({ where: expiredEvents });
    await tx.guardianRequest.updateMany({
      where: expiredInvites,
      data: {
        status: "EXPIRED",
        guardianEmail: "expired@account.invalid",
        verificationRef: null,
      },
    });
    await tx.safetyReport.updateMany({
      where: reportPayload,
      data: {
        detail: "[retention-expired]",
        contact: null,
        reporterId: null,
        targetId: "[retention-expired]",
      },
    });
    await tx.complianceAudit.create({
      data: {
        action: "RETENTION_SWEEP",
        reference: JSON.stringify({ reviewRef, ...summary }),
      },
    });
  }, { timeout: 20000 });

  return { mode: "execute" as const, summary, reviewRef };
}
