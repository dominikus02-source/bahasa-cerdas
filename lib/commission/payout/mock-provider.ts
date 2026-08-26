/**
 * P7D — Mock payout provider (SANDBOX ONLY, spec §29).
 *
 * TIDAK mengirim uang sungguhan. Mensimulasikan kontrak provider asli:
 * - validateDestination: validasi format (angka 6–20 digit, nama, bank non-kosong)
 * - createPayout: mode "instant" → PAID langsung; mode "manual" → PROCESSING
 *   (hasil akhir via webhook / reconcile / retry)
 * - getPayoutStatus: dari memory proses + fallback UNKNOWN (mensimulasikan
 *   timeout — orchestrator wajib menuju RECONCILIATION_REQUIRED, bukan FAILED)
 * - verifyWebhook: HMAC-SHA256(body, PAYOUT_WEBHOOK_SECRET) header x-payout-signature
 *
 * Sandbox state in-memory — TIDAK cocok untuk production (real provider
 * dipilih pada Founder Gate terpisah; real money tetap DISABLED).
 */

import crypto from "crypto";
import { mockPayoutMode } from "./config";
import type {
  CreatePayoutRequest,
  CreatePayoutResult,
  DestinationValidationResult,
  PayoutDestination,
  PayoutProvider,
  PayoutStatusResult,
} from "./types";

/** Simulasi "database" provider sandbox — per proses, bukan durable. */
const sandboxStore = new Map<
  string,
  { reference: string; amount: number; status: "PROCESSING" | "PAID" | "FAILED" }
>();

function webhookSecret(): string {
  return process.env.PAYOUT_WEBHOOK_SECRET ?? "";
}

function sign(rawBody: string): string {
  return crypto.createHmac("sha256", webhookSecret()).update(rawBody).digest("hex");
}

/** Format validation (spec §7) — format valid ≠ rekening pasti valid. */
export function validateDestinationFormat(
  dest: PayoutDestination,
): DestinationValidationResult {
  const account = dest.accountNumber.trim().replace(/[-\s]/g, "");
  if (!/^\d{6,20}$/.test(account)) {
    return { ok: false, code: "INVALID_ACCOUNT", reason: "Nomor rekening harus 6–20 digit angka." };
  }
  if (!dest.recipientName.trim() || dest.recipientName.trim().length > 80) {
    return { ok: false, code: "INVALID_NAME", reason: "Nama penerima wajib diisi (maks 80 karakter)." };
  }
  if (!dest.bankName.trim() || dest.bankName.trim().length > 40) {
    return { ok: false, code: "INVALID_DESTINATION_TYPE", reason: "Nama bank/e-wallet wajib diisi." };
  }
  return { ok: true };
}

export const mockPayoutProvider: PayoutProvider = {
  id: "mock",

  async validateDestination(dest) {
    return validateDestinationFormat(dest);
  },

  async createPayout(req: CreatePayoutRequest): Promise<CreatePayoutResult> {
    // Idempotency provider-side: kunci yang sama → kembalikan payout yang sama.
    if (req.providerReference) {
      const existing = sandboxStore.get(req.providerReference);
      if (existing) {
        if (existing.status === "FAILED") {
          return { ok: false, retryable: false, code: "PROVIDER_FAILED", reason: "Sandbox: payout sebelumnya gagal." };
        }
        return { ok: true, providerReference: existing.reference, providerStatus: existing.status };
      }
    }
    const known = [...sandboxStore.values()].find((v) => v.amount === req.amount);
    // Sandbox simulation: duplicate idempotency key with same amount → reuse.
    if (known && known.status === "PAID" && mockPayoutMode() === "instant") {
      return { ok: true, providerReference: known.reference, providerStatus: "PAID" };
    }

    const reference = `mock-payout-${crypto.randomUUID()}`;
    const mode = mockPayoutMode();
    const status = mode === "instant" ? "PAID" : "PROCESSING";
    sandboxStore.set(reference, { reference, amount: req.amount, status });
    return { ok: true, providerReference: reference, providerStatus: status };
  },

  async getPayoutStatus(providerReference: string): Promise<PayoutStatusResult> {
    const found = sandboxStore.get(providerReference);
    if (!found) {
      // Simulasi state provider tidak terjangkau — UNKNOWN, bukan FAILED.
      return { status: "UNKNOWN", providerReference };
    }
    return { status: found.status, providerReference };
  },

  async verifyWebhook(headers, rawBody) {
    const signature = headers["x-payout-signature"] ?? headers["X-Payout-Signature"];
    if (!webhookSecret()) {
      return { ok: false, reason: "PAYOUT_WEBHOOK_SECRET belum diset (sandbox)" };
    }
    if (!signature) return { ok: false, reason: "Signature header tidak ada" };
    const expected = sign(rawBody);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(String(signature), "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: "Signature tidak cocok" };
    }
    try {
      const payload = JSON.parse(rawBody) as {
        id?: string;
        type?: string;
        reference?: string;
        amount?: number;
      };
      if (!payload.id || !payload.type || !payload.reference) {
        return { ok: false, reason: "Payload webhook tidak lengkap" };
      }
      // Catat status sandbox supaya getPayoutStatus konsisten dengan webhook.
      const existing = sandboxStore.get(payload.reference);
      if (existing) {
        existing.status = payload.type === "PAYOUT.PAID" ? "PAID" : "FAILED";
      } else {
        sandboxStore.set(payload.reference, {
          reference: payload.reference,
          amount: payload.amount ?? 0,
          status: payload.type === "PAYOUT.PAID" ? "PAID" : "FAILED",
        });
      }
      return {
        ok: true,
        event: {
          id: payload.id,
          type: payload.type,
          providerReference: payload.reference,
          amount: payload.amount,
        },
      };
    } catch {
      return { ok: false, reason: "Payload webhook bukan JSON valid" };
    }
  },
};
