/**
 * P7D — Payout pure types. No DB, no provider-specific logic.
 */

import type { DestinationType, PayoutStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Provider abstraction (spec §2)
// ─────────────────────────────────────────────────────────────────────────────

export interface PayoutDestination {
  recipientName: string;
  destinationType: DestinationType;
  bankName: string;      // nama bank / e-wallet
  accountNumber: string; // nomor rekening / identifier tujuan
}

export interface DestinationValidationResult {
  ok: boolean;
  code?: "INVALID_ACCOUNT" | "INVALID_NAME" | "INVALID_DESTINATION_TYPE" | "PROVIDER_REJECTED";
  reason?: string;
}

export interface CreatePayoutRequest {
  /** Deterministik: `withdrawal:{withdrawalId}` — bukan random (spec §9). */
  idempotencyKey: string;
  providerReference: string | null; // reference lama saat retry (null = pertama)
  amount: number;
  currency: string;
  destination: PayoutDestination;
}

export type CreatePayoutResult =
  | { ok: true; providerReference: string; providerStatus: "PROCESSING" | "PAID"; amount?: number; fee?: number }
  | { ok: false; retryable: true; code: string; reason: string }
  | { ok: false; retryable: false; code: string; reason: string }
  | { ok: false; unknown: true; reason: string }; // timeout — state TIDAK diketahui (§11)

export type ProviderPayoutStatus = "PROCESSING" | "PAID" | "FAILED" | "UNKNOWN";

export interface PayoutStatusResult {
  status: ProviderPayoutStatus;
  providerReference: string;
}

export interface VerifiedWebhookEvent {
  id: string;             // provider event id (idempotency)
  type: string;           // "PAYOUT.PAID" | "PAYOUT.FAILED" | ...
  providerReference: string;
  amount?: number;
}

export interface PayoutProvider {
  id: string;
  validateDestination(dest: PayoutDestination): Promise<DestinationValidationResult>;
  createPayout(req: CreatePayoutRequest): Promise<CreatePayoutResult>;
  getPayoutStatus(providerReference: string): Promise<PayoutStatusResult>;
  verifyWebhook(headers: Record<string, string | null>, rawBody: string): Promise<{ ok: true; event: VerifiedWebhookEvent } | { ok: false; reason: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration
// ─────────────────────────────────────────────────────────────────────────────

export type PayoutSubmitResult =
  | { ok: true; payoutId: string; status: PayoutStatus; withdrawalStatus: string }
  | {
      ok: false;
      error:
        | "WITHDRAWAL_NOT_FOUND"
        | "WITHDRAWAL_NOT_PENDING"
        | "NO_PROFILE"
        | "PROFILE_REJECTED"
        | "INVALID_DESTINATION"
        | "ALREADY_SUBMITTED"
        | "PROVIDER_FAILED"
        | "PROVIDER_UNKNOWN"
        | "PAYOUT_REAL_MONEY_DISABLED"
        | "PAYOUT_PROVIDER_DISABLED"
        | "PAYOUT_KILL_SWITCH"
        | "PAYOUT_PILOT_BLOCKED"
        | "LIMIT_BELOW_MINIMUM"
        | "LIMIT_ABOVE_MAXIMUM"
        | "LIMIT_DAILY"
        | "LIMIT_GLOBAL"
        | "RISK_REVIEW_REQUIRED"
        | "RISK_RESTRICTED"
        | "FIRST_PAYOUT_BLOCKED"
        | "PAYOUT_PILOT_LIMIT_REACHED";
      payoutId?: string;
    };

export type PayoutOutcomeResult =
  | { ok: true; payoutId: string; newStatus: PayoutStatus; withdrawalStatus: string; walletUpdated: boolean }
  | { ok: false; error: "NOT_FOUND" | "INVALID_TRANSITION" | "ALREADY_APPLIED" };

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation (§18/§19)
// ─────────────────────────────────────────────────────────────────────────────

export interface PayoutReconciliationIssue {
  payoutId: string;
  withdrawalId: string;
  teacherId: string;
  type:
    | "INTERNAL_PAID_PROVIDER_NOT_PAID"
    | "PROVIDER_PAID_INTERNAL_NOT_PAID"
    | "AMOUNT_MISMATCH"
    | "MISSING_PROVIDER_REFERENCE"
    | "DUPLICATE_PROVIDER_REFERENCE"
    | "DUPLICATE_IDEMPOTENCY_KEY"
    | "WITHDRAWAL_PAID_WALLET_MISMATCH"
    | "PAYOUT_FAILED_FUNDS_STILL_LOCKED"
    | "PAYOUT_STALE_PROCESSING";
  detail: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface PayoutProfileInput {
  recipientName: string;
  destinationType: DestinationType;
  bankName: string;
  accountNumber: string;
}

export type ProfileSaveResult =
  | { ok: true; profileId: string; maskedAccount: string }
  | { ok: false; error: "INVALID_ACCOUNT" | "INVALID_NAME" | "INVALID_DESTINATION_TYPE" | "INVALID_BANK" };

export interface MaskedPayoutProfile {
  recipientName: string;
  destinationType: DestinationType;
  bankName: string;
  maskedAccount: string; // "•••• 4821"
  verificationStatus: string;
  verifiedAt: Date | null;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Observability (§26)
// ─────────────────────────────────────────────────────────────────────────────

export type PayoutEventName =
  | "payout.profile.created"
  | "payout.profile.updated"
  | "payout.requested"
  | "payout.validating"
  | "payout.submitted"
  | "payout.processing"
  | "payout.paid"
  | "payout.failed"
  | "payout.retryable"
  | "payout.reconciliation_required"
  | "payout.reconciled"
  | "payout.mismatch";

export interface PayoutEvent {
  event: PayoutEventName;
  teacherId?: string;
  withdrawalId?: string;
  payoutId?: string;
  provider?: string;
  amount?: number;
  code?: string;
  actor?: "system" | "admin" | "teacher" | "provider";
  at: string;
}
