/**
 * GAME QUESTION QUALITY — karantina (metadata-based, TANPA perubahan DB).
 *
 * Soal yang dinyatakan QUARANTINED (manual atau oleh validator) TIDAK BOLEH
 * masuk gameplay. Alasan disimpan agar bisa diaudit. Daftar ini adalah sumber
 * kebenaran untuk pengecualian gameplay; daftar kosong = tidak ada karantina
 * manual (validator tetap berjalan runtime).
 */

import type { GameQuestion, QuarantineReason } from "./types";

export interface QuarantineEntry {
  /** id soal (bank/katastra/harvest) — atau key normalisasi bila tanpa id. */
  id: string;
  source: string;
  reason: QuarantineReason;
  note?: string;
}

/**
 * Karantina manual. Diisi bila ditemukan soal yang harus ditarik dari
 * gameplay (mis. multiple-correct yang tidak bisa di-repair dengan aman).
 */
export const QUARANTINE_MANUAL: QuarantineEntry[] = [];

export function isQuarantined(q: GameQuestion): boolean {
  if (QUARANTINE_MANUAL.length === 0) return false;
  return QUARANTINE_MANUAL.some((e) => e.id === q.id);
}

export function quarantine(
  q: GameQuestion,
  reason: QuarantineReason,
  note?: string
): QuarantineEntry {
  const entry: QuarantineEntry = { id: q.id, source: q.source || "unknown", reason, note };
  if (!QUARANTINE_MANUAL.some((e) => e.id === entry.id)) {
    QUARANTINE_MANUAL.push(entry);
  }
  return entry;
}

export function quarantineReasons(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of QUARANTINE_MANUAL) out[e.reason] = (out[e.reason] || 0) + 1;
  return out;
}
