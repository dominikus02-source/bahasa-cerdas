/**
 * P7D — Payout provider abstraction (spec §2).
 *
 * Wallet/commission/withdrawal TIDAK boleh bergantung ke provider tertentu.
 * Semua komunikasi provider lewat interface ini + registry di bawah.
 * Provider adapter dapat diganti tanpa mengubah domain lain.
 */

import { mockPayoutProvider } from "./mock-provider";
import { xenditPayoutProvider } from "./xendit-provider";
import { midtransPayoutProvider } from "./midtrans-provider";
import type { PayoutProvider } from "./types";

/**
 * Registry adapter provider yang tersedia.
 * - "mock"    : sandbox (default) — tidak mengirim uang asli
 * - "xendit"  : production rail candidate (P7E) — real-money TETAP disabled
 *               sampai Founder Gate (ditegakkan di safety.ts)
 * - "midtrans": STUB JUJUR (P8D) — capability disbursement B2C TIDAK
 *               terverifikasi; createPayout gagal deterministik
 *               MIDTRANS_NOT_SUPPORTED (lihat docs/P8D_MIDTRANS_MONEY_RAIL_VERIFICATION.md)
 */
export function getPayoutProvider(providerId: string): PayoutProvider | null {
  switch (providerId) {
    case "mock":
      return mockPayoutProvider;
    case "xendit":
      return xenditPayoutProvider;
    case "midtrans":
      return midtransPayoutProvider;
    default:
      return null;
  }
}

export type { PayoutProvider } from "./types";
