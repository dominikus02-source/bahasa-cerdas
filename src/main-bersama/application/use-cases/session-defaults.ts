// ─── Session Defaults & Target Policy (Kebijakan Produk) ────
// Target produk: guru memilih paket → memilih game → memilih kelas
// (opsional) → buat sesi. Default di sini EKSPLISIT di code dan
// dapat dites — bukan konstanta tersebar.
//
// KOTA CAHAYA (fix review Tahap 5 §2): mode kooperatif whole-class.
// Kebutuhan target bergantung roster yang BELUM diketahui saat
// prepared session dibuat, jadi:
//  - target eksplisit guru → divalidasi & FINAL sekarang;
//  - tanpa target eksplisit → PENDING_ROSTER (difinalisasi saat
//    roster/eligible players diketahui, sebelum game dimulai —
//    implementasi finalization ada di tahap start-session/realtime).
// TIDAK ADA sentinel angka magic (0 dsb.) — pending direpresentasikan
// `null` di kolom `MainSession.kotaTargetCorrect` (nullable sejak
// Tahap 4) dan tanpa baris initial game state.

import type { GameMode } from '../../domain/types/session';

/** Durasi default per round (ms). 60 detik — cukup baca + jawab. */
export const DEFAULT_ROUND_DURATION_MS = 60_000;

/**
 * Target Kota Cahaya hasil resolusi policy.
 * FINAL = sudah dikunci (eksplisit guru); PENDING_ROSTER = menunggu
 * roster, WAJIB difinalisasi sebelum sesi boleh dimulai.
 */
export type KotaTargetResolution =
  | { kind: 'FINAL'; target: number }
  | { kind: 'PENDING_ROSTER' };

/**
 * Kandidat target untuk policy finalisasi PENDING_ROSTER pada tahap
 * start-session/realtime (roster/eligible sudah diketahui). SENGaja
 * TIDAK diterapkan saat prepared session dibuat — keputusan final
 * menunggu kebijakan roster (jumlah/bahkan komposisi peserta).
 */
export const DEFAULT_KOTA_TARGET_CORRECT = 15;

/** Target eksplisit valid: integer > 0. Tanpa batas arbitrer lain. */
export function isValidKotaTarget(target: number): boolean {
  return Number.isInteger(target) && target > 0;
}

/**
 * Resolusi target Kota Cahaya untuk prepared session.
 * Eksplisit → divalidasi ketat (ditolak bila invalid); absen →
 * PENDING_ROSTER (bukan angka default).
 */
export function resolveKotaTarget(input: {
  kotaTargetCorrect?: number;
}): { ok: true; resolution: KotaTargetResolution } | { ok: false; code: 'INVALID_GAME_CONFIG'; reason: string } {
  if (input.kotaTargetCorrect === undefined) {
    return { ok: true, resolution: { kind: 'PENDING_ROSTER' } };
  }
  if (!isValidKotaTarget(input.kotaTargetCorrect)) {
    return {
      ok: false,
      code: 'INVALID_GAME_CONFIG',
      reason: `target Kota Cahaya ${input.kotaTargetCorrect} tidak valid (harus integer > 0)`,
    };
  }
  return { ok: true, resolution: { kind: 'FINAL', target: input.kotaTargetCorrect } };
}

/** Konfigurasi efektif per mode setelah default diisi. */
export type ResolvedGameConfig =
  | { gameMode: 'jelajah-kata'; roundDurationMs: number }
  | { gameMode: 'kota-cahaya'; roundDurationMs: number; kotaTarget: KotaTargetResolution };

/** Isi default untuk input minimal guru. Deterministik. */
export function resolveGameConfig(
  gameMode: GameMode,
  totalRounds: number,
  input: { roundDurationMs?: number; kotaTargetCorrect?: number } = {},
): { ok: true; config: ResolvedGameConfig } | { ok: false; code: 'INVALID_GAME_CONFIG'; reason: string } {
  if (!Number.isInteger(totalRounds) || totalRounds <= 0) {
    return { ok: false, code: 'INVALID_GAME_CONFIG', reason: 'totalRounds harus integer > 0' };
  }

  const roundDurationMs = input.roundDurationMs ?? DEFAULT_ROUND_DURATION_MS;
  if (!Number.isInteger(roundDurationMs) || roundDurationMs <= 0) {
    return { ok: false, code: 'INVALID_GAME_CONFIG', reason: 'roundDurationMs harus integer > 0' };
  }

  if (gameMode === 'jelajah-kata') {
    // Jelajah: tidak ada config tambahan (4 regu tetap dari domain).
    return { ok: true, config: { gameMode: 'jelajah-kata', roundDurationMs } };
  }

  // Kota Cahaya: target eksplisit divalidasi; tanpa target → pending
  // roster (bukan angka magic). Finalization di start-session nanti.
  const target = resolveKotaTarget(input);
  if (!target.ok) return target;
  return {
    ok: true,
    config: { gameMode: 'kota-cahaya', roundDurationMs, kotaTarget: target.resolution },
  };
}
