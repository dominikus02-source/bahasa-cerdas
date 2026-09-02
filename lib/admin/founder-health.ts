// ════════════════════════════════════════════════════════════════════
// FOUNDER HEALTH ENGINE
//
// Deterministic, rule-based health evaluation for the Founder Control Tower.
// No AI. No randomness. Every recommendation is traceable to data.
//
// Evaluates 4 domains:
//   1. Business — MRR, premium conversion, cash collected
//   2. Product — DAU/WAU/MAU, retention, learning activity
//   3. Trust — payment health, data quality, entitlement integrity
//   4. Operations — pending actions, system health
// ════════════════════════════════════════════════════════════════════

export type FounderHealthStatus = "HEALTHY" | "ATTENTION" | "CRITICAL";

export interface FounderPriority {
  severity: "P1" | "P2" | "P3";
  title: string;
  description: string;
  evidence: string;
  actionLabel: string;
  href: string;
}

export interface FounderHealthResult {
  status: FounderHealthStatus;
  summary: string;
  priorities: FounderPriority[];
}

/** Input data required by the health engine. All fields must come from canonical services. */
export interface HealthInput {
  // Trust domain
  paymentMismatchCount: number;
  paymentMismatchRevenue: number;
  dataQualityCriticalCount: number;

  // Business domain
  activePremium: number;
  mrrValue: number;
  cashCollectedAllTime: number;
  premiumConversionRate: number;
  /** Total eligible users in conversion denominator (for sample-size check). */
  eligibleUserCount: number;

  // DAU for consecutive decline check
  dauToday: number;
  dauYesterday: number;
  dauTwoDaysAgo: number;

  // Retention
  latestD7Rate: number | null;
  /** Cohort size for latest D7 retention (for sample-size check). */
  latestD7CohortSize: number;

  // Learning
  jalurCompleted7d: number;
}

// ── Configurable thresholds ────────────────────────────────────────

/** Premium conversion rate below this triggers P3 */
const PREMIUM_CONVERSION_THRESHOLD = 5;

/** D7 retention below this triggers P2 */
const D7_RETENTION_THRESHOLD = 20;

/** Minimum DAU absolute value for consecutive-day decline rule to be meaningful. */
const DAU_MIN_ABSOLUTE = 10;

/** Minimum relative decline (%) across 3 days to trigger P2.
 *  Prevents tiny numerical declines (e.g. 50→49→48) from generating false signals. */
const DAU_MIN_RELATIVE_DECLINE_PCT = 20;

/** Minimum cohort size for D7 retention to be statistically meaningful. */
const RETENTION_MIN_COHORT = 10;

/** Minimum eligible user count for Premium Conversion to be meaningful. */
const CONVERSION_MIN_ELIGIBLE = 5;

// ── Rule evaluation ────────────────────────────────────────────────

function evaluatePriorities(input: HealthInput): FounderPriority[] {
  const priorities: FounderPriority[] = [];

  // ── P1: Critical trust issues ──

  // Rule 1: Payment mismatch > 0 (SUCCESS payment without active entitlement)
  if (input.paymentMismatchCount > 0) {
    priorities.push({
      severity: "P1",
      title: "Payment tanpa entitlement",
      description:
        `${input.paymentMismatchCount} transaksi SUCCESS Premium tidak menghasilkan entitlement aktif.`,
      evidence: `${input.paymentMismatchCount} user terdampak — Rp${input.paymentMismatchRevenue.toLocaleString("id-ID")} cash at risk.`,
      actionLabel: "Investigasi Pembayaran",
      href: "/admin/payments",
    });
  }

  // Rule 2: Critical data quality > 0
  if (input.dataQualityCriticalCount > 0) {
    priorities.push({
      severity: "P1",
      title: "Integritas data kritis",
      description:
        `${input.dataQualityCriticalCount} masalah data quality kritis terdeteksi.`,
      evidence: "Data integrity harus diperbaiki sebelum metrik bisnis bisa dipercaya.",
      actionLabel: "Lihat Data Quality",
      href: "/admin/data-center",
    });
  }

  // REMOVED: "activePremium=0 AND cashAllTime>0" → P1
  // Rationale: Historical cash from expired subscriptions is not an integrity issue.
  // Payment Health mismatch (Rule 1) already covers current payment/entitlement mismatches.

  // ── P2: Business & product signals ──

  // Rule 4: DAU declining 3 consecutive days — hardened
  // Requires: all days have data, meaningful relative decline, minimum DAU population
  const dauDeclining3 =
    input.dauToday > 0 &&
    input.dauYesterday > 0 &&
    input.dauTwoDaysAgo > 0 &&
    input.dauYesterday < input.dauTwoDaysAgo &&
    input.dauToday < input.dauYesterday &&
    input.dauTwoDaysAgo >= DAU_MIN_ABSOLUTE;

  const dauDropPct = dauDeclining3
    ? Math.round(((input.dauTwoDaysAgo - input.dauToday) / input.dauTwoDaysAgo) * 100)
    : 0;

  if (dauDeclining3 && dauDropPct >= DAU_MIN_RELATIVE_DECLINE_PCT) {
    priorities.push({
      severity: "P2",
      title: "DAU menurun 3 hari berturut",
      description: "Daily Active Users menurun secara signifikan selama 3 hari terakhir.",
      evidence: `${input.dauTwoDaysAgo} → ${input.dauYesterday} → ${input.dauToday} (${dauDropPct}% penurunan).`,
      actionLabel: "Lihat Learning Analytics",
      href: "/admin/analytics",
    });
  }

  // Rule 5: D7 retention below threshold — with sample-size protection
  if (
    input.latestD7Rate !== null &&
    input.latestD7Rate < D7_RETENTION_THRESHOLD &&
    input.latestD7CohortSize >= RETENTION_MIN_COHORT
  ) {
    priorities.push({
      severity: "P2",
      title: "Retensi D7 rendah",
      description:
        `Retensi D7 berada di ${input.latestD7Rate}%, di bawah threshold ${D7_RETENTION_THRESHOLD}%.`,
      evidence: `Cohort ${input.latestD7CohortSize} user — ${input.latestD7Rate}% aktif di hari ke-7.`,
      actionLabel: "Analisis Retensi",
      href: "/admin/analytics",
    });
  }

  // ── P3: Growth opportunities ──

  // Rule 6: Premium conversion below threshold — with sample-size protection
  if (
    input.premiumConversionRate < PREMIUM_CONVERSION_THRESHOLD &&
    input.activePremium > 0 &&
    input.eligibleUserCount >= CONVERSION_MIN_ELIGIBLE
  ) {
    priorities.push({
      severity: "P3",
      title: "Konversi Premium rendah",
      description:
        `Premium conversion rate ${input.premiumConversionRate}% — di bawah ${PREMIUM_CONVERSION_THRESHOLD}%.`,
      evidence: `${input.activePremium} dari ${input.eligibleUserCount} eligible membayar Premium.`,
      actionLabel: "Review Premium",
      href: "/admin/premium",
    });
  }

  // Rule 7: Learning engagement opportunity
  if (
    input.jalurCompleted7d === 0 &&
    input.dauToday > 0
  ) {
    priorities.push({
      severity: "P3",
      title: "Tidak ada completion belajar",
      description:
        "Tidak ada unit Jalur Cerdas yang diselesaikan minggu ini.",
      evidence: `${input.dauToday} DAU aktif, tapi 0 completion.`,
      actionLabel: "Lihat Analytics",
      href: "/admin/analytics",
    });
  }

  // Sort by severity, then return at most 3
  priorities.sort((a, b) => {
    const order = { P1: 0, P2: 1, P3: 2 };
    return order[a.severity] - order[b.severity];
  });

  return priorities.slice(0, 3);
}

function deriveStatus(priorities: FounderPriority[]): FounderHealthStatus {
  if (priorities.some((p) => p.severity === "P1")) return "CRITICAL";
  if (priorities.some((p) => p.severity === "P2")) return "ATTENTION";
  return "HEALTHY";
}

function deriveSummary(
  status: FounderHealthStatus,
  priorities: FounderPriority[],
  input: HealthInput,
): string {
  if (status === "CRITICAL") {
    const p1 = priorities.find((p) => p.severity === "P1");
    return p1 ? p1.title + "." : "Ada masalah kritis yang perlu perhatian segera.";
  }
  if (status === "ATTENTION") {
    const p2 = priorities.find((p) => p.severity === "P2");
    return p2 ? p2.title + "." : "Ada sinyal yang perlu diperhatikan.";
  }
  // HEALTHY — one growth-focused recommendation
  if (input.dauToday > 0 && input.premiumConversionRate < 20) {
    return "Semua sistem sehat. Fokus pada konversi Premium dan pertumbuhan user.";
  }
  return "Semua sistem sehat. Teruskan pertumbuhan dan engagement.";
}

/**
 * Evaluate founder health from canonical executive metrics.
 * Pure function — no DB calls, no side effects.
 */
export function evaluateFounderHealth(input: HealthInput): FounderHealthResult {
  const priorities = evaluatePriorities(input);
  const status = deriveStatus(priorities);
  const summary = deriveSummary(status, priorities, input);
  return { status, summary, priorities };
}
