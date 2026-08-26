/**
 * P7E — Xendit Payouts v3 adapter (PRIMARY production money rail).
 *
 * Terisolasi di balik PayoutProvider (P7D) — upper layers TIDAK melihat
 * schema Xendit. Real-money TETAP disabled sampai Founder Gate; adapter ini
 * hanya berjalan bila:
 *   PAYOUT_REAL_MONEY_ENABLED=true AND PAYOUT_PROVIDER_ENABLED=true
 *   AND PAYOUT_PROVIDER=xendit AND kill switch off (ditegakkan di safety.ts).
 *
 * Kunci Xendit (docs resmi 2026):
 * - POST /v3/payouts — header `idempotency-key` (max 100), `api-version: 2025-09-01`
 * - Auth: Basic (Secret API Key, permission MONEY-OUT)
 * - Status: ACCEPTED/PENDING_COMPLIANCE_REVIEW/ROUTING/REQUESTED/READY/LOCKED → PROCESSING
 *           SUCCEEDED → PAID · FAILED/REJECTED/CANCELLED/COMPLIANCE_REJECTED/EXPIRED/REVERSED → FAILED
 * - failure_code retryable: INSUFFICIENT_BALANCE, REJECTED_BY_CHANNEL,
 *   TEMPORARY_TRANSFER_ERROR · non-retryable: INVALID_DESTINATION,
 *   DESTINATION_MAXIMUM_LIMIT, ACCOUNT_NAME_MISMATCH, TRANSFER_ERROR
 * - Indonesia: rail BI-Fast (ETA ±15 mnt) / RTGS; limit per tx Rp250jt;
 *   bank code routing + e-wallet (WALLET) routing
 * - Webhook: verifikasi via `x-callback-token` header (XENDIT_WEBHOOK_TOKEN)
 *
 * Secrets (SERVER-SIDE ONLY, environment): XENDIT_API_KEY, XENDIT_WEBHOOK_TOKEN.
 */

import { validateDestinationFormat } from "./mock-provider";
import type {
  CreatePayoutRequest,
  CreatePayoutResult,
  DestinationValidationResult,
  PayoutDestination,
  PayoutProvider,
  PayoutStatusResult,
  ProviderPayoutStatus,
} from "./types";

const XENDIT_API_BASE = "https://api.xendit.co";

function apiKey(): string {
  return process.env.XENDIT_API_KEY ?? "";
}

function webhookToken(): string {
  return process.env.XENDIT_WEBHOOK_TOKEN ?? "";
}

/** Kode routing bank Indonesia umum → kode bank Xendit (uppercase). */
export const XENDIT_BANK_CODES = new Set([
  "BCA",
  "BNI",
  "BRI",
  "MANDIRI",
  "PERMATA",
  "CIMB_NIAGA",
  "MAYBANK",
  "DANAMON",
  "BSI",
  "BTN",
  "BJB",
]);

/** E-wallet Indonesia → routing WALLET code Xendit. */
export const XENDIT_WALLET_CODES: Record<string, string> = {
  DANA: "ID_DANA",
  OVO: "ID_OVO",
  SHOPEEPAY: "ID_SHOPEEPAY",
  LINKAJA: "ID_LINKAJA",
  GOPAY: "ID_GOPAY",
};

export function normalizeBankCode(bankName: string): string {
  const normalized = bankName.trim().toUpperCase().replace(/\s+/g, "_");
  return normalized;
}

// ── PURE MAPPINGS (diuji tanpa jaringan) ─────────────────────────────────────

export function mapXenditStatusToInternal(status: string): ProviderPayoutStatus {
  switch (status) {
    case "SUCCEEDED":
      return "PAID";
    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
    case "COMPLIANCE_REJECTED":
    case "EXPIRED":
    case "REVERSED":
      return "FAILED";
    case "ACCEPTED":
    case "PENDING_COMPLIANCE_REVIEW":
    case "PENDING_COMPLIANCE_ASSESSMENT":
    case "ROUTING":
    case "REQUESTED":
    case "READY":
    case "LOCKED":
      return "PROCESSING";
    default:
      return "UNKNOWN";
  }
}

const RETRYABLE_FAILURE_CODES = new Set([
  "INSUFFICIENT_BALANCE",
  "REJECTED_BY_CHANNEL",
  "TEMPORARY_TRANSFER_ERROR",
]);

export function isRetryableXenditFailure(failureCode: string | null | undefined): boolean {
  return !!failureCode && RETRYABLE_FAILURE_CODES.has(failureCode);
}

function basicAuth(): string {
  return `Basic ${Buffer.from(`${apiKey()}:`).toString("base64")}`;
}

interface XenditPayoutResponse {
  payout_id?: string;
  id?: string;
  status?: string;
  destination_amount?: number;
  source_amount?: number;
  failure_code?: string;
  fee?: number;
}

async function callXendit<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${XENDIT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    // Bounded timeout: timeout = state TIDAK diketahui → jangan dianggap gagal.
    signal: AbortSignal.timeout(15_000),
  } as RequestInit);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Xendit API ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const xenditPayoutProvider: PayoutProvider = {
  id: "xendit",

  async validateDestination(dest: PayoutDestination): Promise<DestinationValidationResult> {
    // Validasi format dulu. Kepemilikan rekening TIDAK bisa diverifikasi dari
    // format — provider tetap authoritative saat submission via failure_code
    // ACCOUNT_NAME_MISMATCH (P7E §9: format ≠ ownership verification).
    const format = validateDestinationFormat(dest);
    if (!format.ok) return format;

    const bankCode = normalizeBankCode(dest.bankName);
    if (dest.destinationType === "BANK" && !XENDIT_BANK_CODES.has(bankCode)) {
      // Bank di luar daftar routing umum — biarkan provider memutuskan saat
      // submission (jangan menolak validasi hanya karena daftar lokal).
      return { ok: true };
    }
    return { ok: true };
  },

  async createPayout(req: CreatePayoutRequest): Promise<CreatePayoutResult> {
    if (!apiKey()) {
      return {
        ok: false,
        retryable: false,
        code: "XENDIT_API_KEY_MISSING",
        reason: "XENDIT_API_KEY belum diset (server-side).",
      };
    }

    const isBank = req.destination.destinationType === "BANK";
    const bankCode = normalizeBankCode(req.destination.bankName);
    const walletCode = isBank ? null : XENDIT_WALLET_CODES[bankCode] ?? null;

    if (isBank && !XENDIT_BANK_CODES.has(bankCode)) {
      // Bank tidak dikenal di daftar routing — serahkan ke provider, tapi
      // tandai risiko: kemungkinan INVALID_DESTINATION dari Xendit.
      // Tetap kirim: provider adalah otoritas final.
    }

    const body: Record<string, unknown> = {
      reference_id: `bc-${req.idempotencyKey.replace(/[^a-zA-Z0-9:-]/g, "_")}`.slice(0, 255),
      recipient: {
        type: "INDIVIDUAL",
        given_name: req.destination.recipientName.slice(0, 50),
        relationship: "BUSINESS_PARTNER",
        account_details: {
          currency: "IDR",
          account_country: "ID",
          account_holder_name: req.destination.recipientName.slice(0, 255),
          account_number: req.destination.accountNumber,
          routing_type_1: isBank ? "BANK_CODE" : "WALLET",
          routing_value_1: isBank ? bankCode : walletCode,
        },
      },
      payout_details: {
        source_currency: "IDR",
        source_amount: req.amount, // IDR minor unit = rupiah utuh
        destination_currency: "IDR",
      },
      source_of_fund: "BUSINESS_REVENUE",
      purpose_code: "SALARY",
      description: "Guru Cerdas Sejahtera",
    };

    if (!isBank && !walletCode) {
      return {
        ok: false,
        retryable: false,
        code: "UNSUPPORTED_WALLET",
        reason: `E-wallet "${req.destination.bankName}" tidak didukung routing payout.`,
      };
    }

    try {
      const response = await callXendit<XenditPayoutResponse>("/v3/payouts", {
        method: "POST",
        headers: {
          "api-version": "2025-09-01",
          "idempotency-key": req.idempotencyKey.slice(0, 100),
        },
        body: JSON.stringify(body),
      });

      const providerReference = response.payout_id ?? response.id;
      if (!providerReference) {
        return { ok: false, unknown: true, reason: "Response Xendit tanpa payout id." };
      }

      const internal = mapXenditStatusToInternal(response.status ?? "ACCEPTED");
      if (internal === "FAILED") {
        const retryable = isRetryableXenditFailure(response.failure_code);
        return {
          ok: false,
          retryable,
          code: response.failure_code ?? "XENDIT_FAILED",
          reason: `Payout ditolak Xendit: ${response.failure_code ?? "unknown"}`,
        };
      }

      return {
        ok: true,
        providerReference,
        providerStatus: internal === "PAID" ? "PAID" : "PROCESSING",
        amount: response.destination_amount ?? response.source_amount,
        fee: response.fee,
      };
    } catch (err) {
      // Timeout/network error → state TIDAK diketahui (jangan dianggap gagal).
      console.error("[payout][xendit] createPayout error:", err);
      return { ok: false, unknown: true, reason: "Xendit error — state tidak diketahui." };
    }
  },

  async getPayoutStatus(providerReference: string): Promise<PayoutStatusResult> {
    try {
      const response = await callXendit<XenditPayoutResponse>(`/v3/payouts/${encodeURIComponent(providerReference)}`, {
        method: "GET",
        headers: { "api-version": "2025-09-01" },
      });
      return {
        status: mapXenditStatusToInternal(response.status ?? "UNKNOWN"),
        providerReference,
      };
    } catch (err) {
      console.error("[payout][xendit] getPayoutStatus error:", err);
      return { status: "UNKNOWN", providerReference };
    }
  },

  async verifyWebhook(headers, rawBody) {
    const token = headers["x-callback-token"] ?? headers["X-Callback-Token"];
    if (!webhookToken()) {
      return { ok: false, reason: "XENDIT_WEBHOOK_TOKEN belum diset" };
    }
    if (!token) return { ok: false, reason: "x-callback-token tidak ada" };
    if (token !== webhookToken()) {
      return { ok: false, reason: "x-callback-token tidak cocok" };
    }

    try {
      const payload = JSON.parse(rawBody) as {
        id?: string;
        event?: string;
        data?: {
          id?: string;
          status?: string;
          reference_id?: string;
          destination_amount?: number;
          failure_code?: string;
        };
      };

      const providerReference = payload.data?.id;
      if (!payload.event || !providerReference) {
        return { ok: false, reason: "Payload webhook Xendit tidak lengkap" };
      }

      // Map event → type internal (dipakai route webhook P7D).
      let type: string;
      if (payload.event === "payouts.succeeded") type = "PAYOUT.PAID";
      else if (payload.event === "payouts.failed" || payload.event === "payouts.rejected") {
        type = isRetryableXenditFailure(payload.data?.failure_code)
          ? "PAYOUT.RETRYABLE_FAILED"
          : "PAYOUT.FAILED";
      } else {
        return { ok: false, reason: `Event Xendit tidak dikenal: ${payload.event}` };
      }

      return {
        ok: true,
        event: {
          id: payload.id ?? `xendit-${payload.event}-${providerReference}`,
          type,
          providerReference,
          amount: payload.data?.destination_amount,
        },
      };
    } catch {
      return { ok: false, reason: "Payload webhook bukan JSON valid" };
    }
  },
};
