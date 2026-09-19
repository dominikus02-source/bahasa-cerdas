// ─── Package Compatibility (Murni, Tanpa Silent Drop) ───────
// Evaluasi satu paket Bank Soal terhadap dukungan Main Bersama v1.
// Hasil EKSPLISIT: caller tahu persis berapa soal didukung dan
// mengapa sisanya ditolak — tidak pernah diam-diam memotong paket.

import type { MainQuestionSnapshot } from '../../domain/entities/question';
import type { BankSoalQuestionInput } from '../../application/use-cases/ports';
import { adaptQuestion } from './adapt-question';

export interface PackageCompatibilityItem {
  sourceQuestionId: string;
  ok: boolean;
  /** Snapshot bila ok; undefined bila tidak didukung. */
  question?: MainQuestionSnapshot;
  /** Kode + alasan penolakan bila tidak ok. */
  code?: 'UNSUPPORTED_QUESTION_TYPE' | 'INVALID_QUESTION';
  reason?: string;
}

export interface PackageCompatibilityResult {
  /** Total soal yang dibaca dari paket. */
  total: number;
  supported: number;
  unsupported: number;
  /** Semua soal didukung — paket siap dipakai utuh. */
  fullyCompatible: boolean;
  /** Urutan sama dengan urutan soal di paket. */
  items: PackageCompatibilityItem[];
}

/** Info soal yang TIDAK dipakai pada jalur useSupportedQuestions. */
export interface UnusedQuestionsInfo {
  count: number;
  sourceQuestionIds: string[];
  details: Array<{ sourceQuestionId: string; code: string; reason: string }>;
}

/**
 * Evaluasi kompatibilitas + adaptasi sekaligus (satu pass).
 * Tidak mutasi input. Urutan soal terjaga.
 */
export function evaluatePackageCompatibility(
  questions: readonly BankSoalQuestionInput[],
): PackageCompatibilityResult {
  const items: PackageCompatibilityItem[] = [];
  let supported = 0;

  for (const input of questions) {
    const result = adaptQuestion(input);
    if (result.ok) {
      supported++;
      items.push({ sourceQuestionId: input.sourceQuestionId, ok: true, question: result.question });
    } else {
      items.push({
        sourceQuestionId: input.sourceQuestionId,
        ok: false,
        code: result.code,
        reason: result.reason,
      });
    }
  }

  return {
    total: questions.length,
    supported,
    unsupported: items.length - supported,
    fullyCompatible: supported === items.length,
    items,
  };
}

/** Ringkas statistik (untuk caller/UI nanti tanpa membawa isi soal). */
export function summarizeCompatibility(result: PackageCompatibilityResult): {
  total: number;
  supported: number;
  unsupported: number;
  reasonByCode: Record<string, number>;
} {
  const reasonByCode: Record<string, number> = {};
  for (const item of result.items) {
    if (!item.ok && item.code) {
      reasonByCode[item.code] = (reasonByCode[item.code] ?? 0) + 1;
    }
  }
  return {
    total: result.total,
    supported: result.supported,
    unsupported: result.unsupported,
    reasonByCode,
  };
}

/**
 * Jalur EKSPLISIT "pakai soal kompatibel saja" (fix review Tahap 5 §1).
 * Memungkinkan tema campuran (mis. 30 soal → 27 supported + 3
 * ISIAN_SINGKAT) tetap dimainkan TANPA silent drop: caller HARUS
 * memanggil fungsi ini setelah compatibility result diketahui —
 * keputusan menggunakan subset ada di caller, bukan otomatis.
 */
export function useSupportedQuestions(
  result: PackageCompatibilityResult,
): { ok: true; questions: MainQuestionSnapshot[]; unused: UnusedQuestionsInfo } | { ok: false; code: 'NO_SUPPORTED_QUESTIONS' } {
  if (result.supported === 0) {
    return { ok: false, code: 'NO_SUPPORTED_QUESTIONS' };
  }
  const questions: MainQuestionSnapshot[] = [];
  const unusedSourceQuestionIds: string[] = [];
  for (const item of result.items) {
    if (item.ok && item.question) {
      questions.push(item.question);
    } else {
      // Unsupported TIDAK hilang diam-diam — id + kode + alasan
      // tetap dibawa pada `unused` untuk transparansi penuh.
      unusedSourceQuestionIds.push(item.sourceQuestionId);
    }
  }
  return {
    ok: true,
    questions,
    unused: {
      count: result.unsupported,
      sourceQuestionIds: unusedSourceQuestionIds,
      details: result.items
        .filter((item) => !item.ok)
        .map((item) => ({
          sourceQuestionId: item.sourceQuestionId,
          code: item.code!,
          reason: item.reason!,
        })),
    },
  };
}
