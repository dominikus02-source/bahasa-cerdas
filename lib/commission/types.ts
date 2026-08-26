/**
 * Guru Cerdas Sejahtera — Commission engine types.
 *
 * Pure types — no DB. Used across engine, wallet, withdrawals, and attribution.
 */

import type {
  AttributionSource,
  CommissionStatus,
  CommissionEntryType,
  TeacherWithdrawalStatus,
  WalletStatus,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Commission engine results (skip reasons keep everything observable)
// ─────────────────────────────────────────────────────────────────────────────

export type CommissionSkipReason =
  | "INVALID_PAYMENT"       // transaksi tidak ditemukan
  | "NOT_SETTLED"          // Transaksi.status ≠ SUCCESS
  | "NOT_PREMIUM_STUDENT"  // type bukan MURID_PREMIUM / plan tidak eligible
  | "NO_ATTRIBUTION"       // tidak ada TeacherAttribution aktif untuk murid
  | "TEACHER_EXCLUDED"     // guru = founder/ADMIN (server-side)
  | "SELF_REFERRAL"        // murid == guru (tidak mungkin, tetap dijaga)
  | "BEFORE_ELIGIBLE_FROM" // transaksi settle < eligibleFrom → NO COMMISSION
  | "ZERO_COMMISSION"      // floor(amount × rate) = 0
  | "WALLET_SUSPENDED";    // wallet guru SUSPENDED/CLOSED

export type CommissionCreateResult =
  | {
      created: true;
      id: string;
      transaksiId: string;
      teacherId: string;
      studentId: string;
      commissionAmount: number;
      status: CommissionStatus;
      holdingEndsAt: Date | null;
      idempotent: boolean;
    }
  | { created: false; reason: CommissionSkipReason };

// ─────────────────────────────────────────────────────────────────────────────
// Reversal results
// ─────────────────────────────────────────────────────────────────────────────

export type ReversalReason = "REFUND" | "CANCELLATION" | "ADMIN_REVERSAL";

export type ReversalResult =
  | { reversed: true; commissionId: string; reversalEntryId: string; amount: number }
  | { reversed: false; reason: "NO_COMMISSION" | "ALREADY_REVERSED" };

// ─────────────────────────────────────────────────────────────────────────────
// Wallet
// ─────────────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  teacherId: string;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  lifetimeEarned: number;
  lifetimeWithdrawn: number;
  totalReversed: number;
  status: WalletStatus;
}

export interface ReconciliationResult {
  teacherId: string;
  expected: WalletBalance;
  actual: WalletBalance;
  matches: boolean;
  mismatches: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Withdrawal
// ─────────────────────────────────────────────────────────────────────────────

export interface WithdrawalRequestInput {
  teacherId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export type WithdrawalRequestResult =
  | {
      ok: true;
      withdrawal: {
        id: string;
        amount: number;
        status: TeacherWithdrawalStatus;
        createdAt: Date;
      };
      newAvailable: number;
      newLocked: number;
    }
  | {
      ok: false;
      error: "INVALID_AMOUNT" | "BELOW_MINIMUM" | "INSUFFICIENT_BALANCE" | "WALLET_NOT_ACTIVE" | "BANK_DETAILS_MISSING";
    };

export type WithdrawalAction = "APPROVE" | "REJECT" | "TRANSFER" | "CANCEL";

export type WithdrawalProcessResult =
  | {
      ok: true;
      id: string;
      action: WithdrawalAction;
      newStatus: TeacherWithdrawalStatus;
      amount: number;
      walletUpdated: boolean;
    }
  | { ok: false; error: "NOT_FOUND" | "INVALID_TRANSITION" | "ALREADY_PROCESSED" };

// ─────────────────────────────────────────────────────────────────────────────
// Attribution
// ─────────────────────────────────────────────────────────────────────────────

export interface AttributionUpsertResult {
  attributionId: string;
  teacherId: string;
  source: AttributionSource;
  eligibleFrom: Date;
  created: boolean;
  skipped: boolean;
  skipReason?: "TEACHER_EXCLUDED" | "SELF_REFERRAL" | "GROUP_NOT_FOUND" | "ATTRIBUTION_EXISTS";
}

// ─────────────────────────────────────────────────────────────────────────────
// Backfill
// ─────────────────────────────────────────────────────────────────────────────

export type BackfillRowStatus =
  | "ELIGIBLE"
  | "SKIPPED_NOT_SETTLED"
  | "SKIPPED_NO_ATTRIBUTION"
  | "ALREADY_EXISTS"
  | "INVALID_ATTRIBUTION"
  | "PRE_LAUNCH"
  | "EXCLUDED_TEACHER"
  | "INVALID_PAYMENT"
  | "ZERO_COMMISSION"
  | "WALLET_SUSPENDED";

export interface BackfillRow {
  transaksiId: string;
  studentId: string;
  teacherId: string | null;
  amount: number;
  status: BackfillRowStatus;
  commissionAmount: number;
}

export interface BackfillReport {
  dryRun: boolean;
  totalScanned: number;
  eligible: number;
  skipped: number;
  alreadyExists: number;
  invalidAttribution: number;
  preLaunch: number;
  excludedTeacher: number;
  invalidPayment: number;
  rows: BackfillRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Commission entry input (used by engine internals)
// ─────────────────────────────────────────────────────────────────────────────

export interface CommissionContext {
  transaksiId: string;
  amount: number;               // settled amount (post-coupon actual)
  userId: string;               // student (buyer)
  planId?: string | null;       // e.g. "MURID_PREMIUM_MONTHLY"
  metadata?: Record<string, unknown>;
  settledAt: Date;              // kapan pembayaran settle (webhook SUCCESS)
}

export interface CommissionEntryInput {
  transaksiId: string;
  teacherId: string;
  studentId: string;
  attributionId: string;
  attributionSource: AttributionSource;
  sourceGroupId: string | null;
  eligibleFrom: Date;
  grossAmount: number;          // settled amount (post-coupon)
  commissionRate: number;       // e.g. 0.10
  commissionAmount: number;     // floor(gross × rate)
  status: CommissionStatus;     // initial status (ELIGIBLE/AVAILABLE)
  holdingEndsAt: Date | null;   // null = instant (holding = 0)
  entryType?: CommissionEntryType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured observability events (§21) — console-only, no sensitive data
// ─────────────────────────────────────────────────────────────────────────────

export type CommissionEventName =
  | "commission.created"
  | "commission.released"
  | "commission.reversed"
  | "wallet.reconciled"
  | "wallet.mismatch"
  | "withdrawal.requested"
  | "withdrawal.processing"
  | "withdrawal.paid"
  | "withdrawal.failed";

export interface CommissionEvent {
  event: CommissionEventName;
  teacherId?: string;
  transaksiId?: string;
  commissionId?: string;
  withdrawalId?: string;
  amount?: number;
  reason?: string;
  actor?: "system" | "admin" | "teacher";
  at: string;
}
