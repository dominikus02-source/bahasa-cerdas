/**
 * P8D — Midtrans disbursement adapter (STUB — capability NOT VERIFIED).
 *
 * HASIL VERIFIKASI (docs resmi Midtrans, 26 Agustus 2026):
 * Midtrans TIDAK menyediakan API disbursement B2C untuk membayar pihak ketiga.
 * "Payout" Midtrans = penarikan saldo merchant SENDIRI (manual via dashboard
 * atau Auto-Withdrawal schedule). Satu-satunya disbursement pihak ketiga
 * terdokumentasi = Reward GoPay (butuh authorization token per user).
 * Lihat: docs/P8D_MIDTRANS_MONEY_RAIL_VERIFICATION.md
 *
 * SESUAI DIREKTIF: JANGAN mengarang endpoint/request body/webhook signature.
 * Adapter ini mengimplementasikan kontrak PayoutProvider dengan JUJUR:
 * - createPayout → kegagalan deterministik MIDTRANS_NOT_SUPPORTED
 *   (TIDAK PERNAH mengirim uang, TIDAK memanggil endpoint palsu)
 * - getPayoutStatus → UNKNOWN (tidak ada status inquiry yang terdokumentasi)
 * - verifyWebhook → ditolak (tidak ada skema webhook disbursement resmi)
 * - validateDestination → validasi format (sama dengan mock)
 *
 * Bila PAYOUT_PROVIDER=midtrans diset, safety gate P7E tetap menahan real
 * money (PAYOUT_REAL_MONEY_ENABLED=false) — dan bila tetap lolos sampai
 * submit, hasilnya gagal LANTANG + teraudit, bukan diam-diam.
 */

import { validateDestinationFormat } from "./mock-provider";
import type {
  CreatePayoutResult,
  DestinationValidationResult,
  PayoutDestination,
  PayoutProvider,
  PayoutStatusResult,
} from "./types";

export const midtransPayoutProvider: PayoutProvider = {
  id: "midtrans",

  async validateDestination(dest: PayoutDestination): Promise<DestinationValidationResult> {
    // Format validation saja — Midtrans TIDAK punya account validation API
    // untuk penerima pihak ketiga (UNVERIFIED). Provider tetap authoritative
    // hanya bila rail B2C resmi tersedia di masa depan.
    return validateDestinationFormat(dest);
  },

  async createPayout(_req: Parameters<PayoutProvider["createPayout"]>[0]): Promise<CreatePayoutResult> {
    // Tidak ada API resmi — TIDAK mengarang panggilan.
    return {
      ok: false,
      retryable: false,
      code: "MIDTRANS_NOT_SUPPORTED",
      reason: "Midtrans tidak menyediakan API disbursement B2C (lihat P8D_MIDTRANS_MONEY_RAIL_VERIFICATION.md).",
    };
  },

  async getPayoutStatus(providerReference: string): Promise<PayoutStatusResult> {
    // Tidak ada status inquiry disbursement yang terdokumentasi.
    return { status: "UNKNOWN", providerReference };
  },

  async verifyWebhook(_headers, _rawBody) {
    // Tidak ada skema webhook disbursement resmi — jangan menebak signature.
    return { ok: false, reason: "Webhook disbursement Midtrans tidak didukung (tidak ada skema resmi)." };
  },
};
