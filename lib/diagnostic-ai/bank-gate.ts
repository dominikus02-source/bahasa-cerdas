/**
 * BANK GATE — Content eligibility gate untuk butir bank yang boleh masuk Tes Awal.
 *
 * Latar belakang (P0.5 audit 2026-09-04): butir bank yang rusak mencapai murid
 * lewat jalur fallback AI-adaptif. Pool live berisi satu keluarga soal template
 * rusak ("Berikut ini yang termasuk contoh {topik} adalah…" dengan kunci = kata
 * topik itu sendiri dan distraktor lintas-topik yang sama), plus sejumlah
 * isian-singkat yang menyimpan opsi palsu dan opsi duplikat.
 *
 * Gate ini MURNI (tanpa DB/LLM) dan dipakai di titik konstruksi pool
 * (buildDiagnosticCandidates) dan pemilihan fallback (bankFallbackFor /
 * pickBankFallbackCandidate). Menolak butir yang terbukti rusak tanpa mengubah
 * database dan tanpa menyentuh skoring/engine — reversible (hapus panggilan).
 */
import { normalizeText } from "./validator";
import type { AiQuestionType } from "./types";

export type BankGateCode =
  | "TEXT_MISSING"
  | "TEXT_TOO_SHORT"
  | "TEMPLATE_STEM" // keluarga "contoh {topik}" yang terbukti rusak
  | "OPTIONS_TOO_FEW"
  | "EMPTY_OPTION"
  | "DUPLICATE_OPTION"
  | "ISIAN_HAS_OPTIONS"
  | "KEY_NOT_INDEX"
  | "KEY_OUT_OF_RANGE"
  | "STEM_DUPLICATE";

export interface BankGateIssue {
  code: BankGateCode;
  detail: string;
}

export interface BankGateInput {
  /** kodeSoal / id butir (hanya untuk pesan). */
  id?: string;
  text: string;
  options: string[];
  /** Tipe soal sudah ternormalisasi (PILIHAN_GANDA/BENAR_SALAH/ISIAN_SINGKAT). */
  questionType: AiQuestionType;
  /** Kunci tersimpan: indeks (PG/BS) atau teks (isian). */
  correctAnswer: string;
  /** Stem yang sudah dipakai sesi ini (anti konten sama dua kali). */
  avoidStems?: string[];
}

const KEY_INDEX = /^\d+$/;

/** Prefix template artefak "Berikut ini yang termasuk contoh {topik} …" */
const TEMPLATE_PREFIXES = [
  /^berikut ini yang termasuk (contoh|jenis) /,
  /^berikut yang termasuk (contoh|jenis) /,
  /^manakah yang termasuk (contoh|jenis) /,
  /^contoh [a-z ]+ (adalah|:|…|$)/,
];

function isTemplateStem(text: string): boolean {
  const stem = normalizeText(text);
  if (!stem) return false;
  return TEMPLATE_PREFIXES.some((pattern) => pattern.test(stem));
}

/** Aturan konten untuk butir bank; tidak membaca DB. */
export function bankGateIssues(input: BankGateInput): BankGateIssue[] {
  const issues: BankGateIssue[] = [];
  const label = input.id ? `[${input.id}] ` : "";
  const text = input.text.trim();
  const stem = normalizeText(text);
  const options = input.options.map((option) => option.trim());
  const correctAnswer = String(input.correctAnswer ?? "").trim();

  if (!text) issues.push({ code: "TEXT_MISSING", detail: `${label}teks soal kosong` });
  else if (text.length < 10) issues.push({ code: "TEXT_TOO_SHORT", detail: `${label}teks hanya ${text.length} karakter` });

  // Keluarga template yang terbukti rusak: stem template + kunci mengulang
  // topik / distraktor lintas-topik — butir yang sama digandakan lintas
  // tingkat kesulitan (BC-CERPEN-0014/0026 dst). Seluruh keluarga ditolak.
  if (stem && isTemplateStem(text)) {
    issues.push({ code: "TEMPLATE_STEM", detail: `${label}stem template "contoh …" (keluarga rusak teraudit)` });
  }

  if (input.questionType === "ISIAN_SINGKAT") {
    if (options.length > 0) {
      issues.push({
        code: "ISIAN_HAS_OPTIONS",
        detail: `${label}isian singkat menyimpan ${options.length} opsi palsu — klien menampilkan tombol & menilai sebagai indeks`,
      });
    }
    if (!correctAnswer) issues.push({ code: "KEY_NOT_INDEX", detail: `${label}isian tanpa kunci jawaban` });
  } else {
    if (options.length < 2) {
      issues.push({ code: "OPTIONS_TOO_FEW", detail: `${label}${input.questionType}: hanya ${options.length} opsi` });
    }
    if (options.some((option) => option.length === 0)) {
      issues.push({ code: "EMPTY_OPTION", detail: `${label}ada opsi kosong` });
    }
    const seen = new Map<string, number>();
    options.forEach((option, index) => {
      const key = normalizeText(option);
      if (!key) return;
      if (seen.has(key)) issues.push({ code: "DUPLICATE_OPTION", detail: `${label}opsi "${option}" duplikat dengan indeks ${seen.get(key)}` });
      else seen.set(key, index);
    });
    if (!KEY_INDEX.test(correctAnswer)) {
      issues.push({ code: "KEY_NOT_INDEX", detail: `${label}kunci "${correctAnswer}" bukan indeks opsi` });
    } else if (options.length > 0 && Number(correctAnswer) >= options.length) {
      issues.push({ code: "KEY_OUT_OF_RANGE", detail: `${label}indeks kunci ${correctAnswer} di luar ${options.length} opsi` });
    }
  }

  if (stem && input.avoidStems && input.avoidStems.length > 0) {
    for (const used of input.avoidStems) {
      if (normalizeText(used) === stem) {
        issues.push({ code: "STEM_DUPLICATE", detail: `${label}stem sama dengan butir yang sudah dipakai sesi ini` });
        break;
      }
    }
  }

  return issues;
}

/** True bila butir bank layak dikirim ke murid (tidak ada isu gate). */
export function isBankEligible(input: BankGateInput): boolean {
  return bankGateIssues(input).length === 0;
}
