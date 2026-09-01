import { db } from "@/lib/db";

// ════════════════════════════════════════════════════════════════════
// PREMIUM RECONCILIATION SERVICE
//
// Detects and safely repairs SUCCESS payments without active entitlement.
// Reuses canonical activation logic — no duplicate Premium activation.
//
// Student Premium (MURID_PREMIUM):
//   Safe to auto-repair. Criteria:
//     - isPremium = false
//     - premiumPlan = "FREE" (or null)
//     - premiumUntil IS NULL (never activated)
//     - qualifying MURID_PREMIUM SUCCESS transaction exists
//
// Guru Premium (PREMIUM_UPGRADE):
//   NOT safe to auto-repair. Return as manual_review_required.
//   Cannot distinguish activation failure from legitimate expiration.
//
// Dry-run: reads only, no writes.
// Idempotent: running twice changes nothing.
// ════════════════════════════════════════════════════════════════════

const MURID_PREMIUM_TYPES = ["MURID_PREMIUM"] as const;
const GURU_PREMIUM_TYPES = ["PREMIUM_UPGRADE"] as const;
const ALL_PREMIUM_TYPES = [...MURID_PREMIUM_TYPES, ...GURU_PREMIUM_TYPES];

export interface ReconciliationCandidate {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  transactionId: string;
  transactionType: string;
  transactionAmount: number;
  transactionReference: string | null;
  transactionDate: Date;
  currentUserState: {
    isPremium: boolean;
    premiumPlan: string | null;
    premiumUntil: Date | null;
  };
  safeToRepair: boolean;
  reason: string;
}

export interface ReconciliationResult {
  scanned: number;
  matched: number;
  repaired: number;
  skipped: number;
  manualReview: number;
  errors: number;
  candidates: ReconciliationCandidate[];
  repairedUsers: { userId: string; fullName: string; premiumUntil: Date }[];
  duration: number;
}

/**
 * Scan for mismatched users. Does NOT write anything.
 */
export async function scanForMismatches(): Promise<ReconciliationCandidate[]> {
  const now = new Date();

  // Find users with SUCCESS premium transactions but no active entitlement
  const mismatchedUsers = await db.user.findMany({
    where: {
      isFounder: false,
      transaksi: {
        some: {
          type: { in: [...ALL_PREMIUM_TYPES] },
          status: "SUCCESS",
        },
      },
      OR: [
        { isPremium: false },
        { premiumUntil: null },
        { premiumUntil: { lt: now } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isPremium: true,
      premiumPlan: true,
      premiumUntil: true,
      transaksi: {
        where: {
          type: { in: [...ALL_PREMIUM_TYPES] },
          status: "SUCCESS",
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          type: true,
          amount: true,
          reference: true,
          createdAt: true,
        },
      },
    },
  });

  return mismatchedUsers.map((u) => {
    const tx = u.transaksi[0];
    const isMurid = tx?.type === "MURID_PREMIUM";
    const isGuru = tx?.type === "PREMIUM_UPGRADE";

    // Student Premium: safe to repair if never activated
    // (isPremium=false, premiumPlan=FREE/null, premiumUntil=null)
    const neverActivated =
      !u.isPremium &&
      (!u.premiumPlan || u.premiumPlan === "FREE") &&
      !u.premiumUntil;

    // Guru Premium: never safe to auto-repair
    const safeToRepair = isMurid && neverActivated;

    return {
      userId: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      transactionId: tx?.id || "",
      transactionType: tx?.type || "",
      transactionAmount: tx?.amount || 0,
      transactionReference: tx?.reference || null,
      transactionDate: tx?.createdAt || now,
      currentUserState: {
        isPremium: u.isPremium,
        premiumPlan: u.premiumPlan,
        premiumUntil: u.premiumUntil,
      },
      safeToRepair,
      reason: isGuru
        ? "Guru Premium — manual review required (cannot distinguish activation failure from legitimate expiration)"
        : neverActivated
          ? "Student Premium — never activated, safe to repair"
          : "Student Premium — previously had entitlement, manual review required",
    };
  });
}

/**
 * Calculate premium duration from transaction metadata.
 */
function calculateDuration(reference: string | null, metadata: unknown): number {
  const meta = (metadata || {}) as Record<string, unknown>;
  if (meta.durationDays === 365) return 365;
  if (reference?.includes("YEARLY")) return 365;
  return 30; // default monthly
}

/**
 * Execute reconciliation for safe-to-repair candidates.
 * Returns what would be/was repaired.
 */
export async function executeReconciliation(
  dryRun: boolean = true,
  adminUserId?: string,
): Promise<ReconciliationResult> {
  const t0 = Date.now();
  const candidates = await scanForMismatches();
  const safeToRepair = candidates.filter((c) => c.safeToRepair);
  const manualReview = candidates.filter((c) => !c.safeToRepair);

  const repairedUsers: { userId: string; fullName: string; premiumUntil: Date }[] = [];
  let errors = 0;

  if (!dryRun && safeToRepair.length > 0) {
    const now = new Date();

    for (const candidate of safeToRepair) {
      try {
        // Fetch full transaction for metadata
        const tx = await db.transaksi.findUnique({
          where: { id: candidate.transactionId },
          select: { metadata: true },
        });

        const durationDays = calculateDuration(candidate.transactionReference, tx?.metadata);
        const premiumUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // Atomic activation + audit log
        await db.$transaction([
          db.user.update({
            where: { id: candidate.userId },
            data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
          }),
          db.adminPaymentAuditLog.create({
            data: {
              adminUserId: adminUserId || "SYSTEM_RECONCILIATION",
              targetUserId: candidate.userId,
              transactionId: candidate.transactionId,
              action: "RECONCILIATION_FIX",
              previousValue: JSON.stringify(candidate.currentUserState),
              newValue: JSON.stringify({ isPremium: true, premiumUntil: premiumUntil.toISOString() }),
              reason: "Automated reconciliation — Student Premium never activated after SUCCESS payment",
              metadata: {
                source: "premium-reconciliation",
                transactionType: candidate.transactionType,
                transactionAmount: candidate.transactionAmount,
                durationDays,
              },
            },
          }),
          db.notifikasi.create({
            data: {
              userId: candidate.userId,
              title: "Premium Dipulihkan (Otomatis)",
              body: `Hak premium-mu telah dipulihkan secara otomatis. Berlaku hingga ${premiumUntil.toLocaleDateString("id-ID")}.`,
              type: "PREMIUM",
            },
          }),
        ]);

        repairedUsers.push({
          userId: candidate.userId,
          fullName: candidate.fullName,
          premiumUntil,
        });
      } catch (err) {
        errors++;
        console.error("[Reconciliation] Error repairing user:", candidate.userId, err);
      }
    }
  }

  return {
    scanned: candidates.length,
    matched: safeToRepair.length,
    repaired: dryRun ? 0 : repairedUsers.length,
    skipped: dryRun ? safeToRepair.length : 0,
    manualReview: manualReview.length,
    errors,
    candidates,
    repairedUsers,
    duration: Date.now() - t0,
  };
}
