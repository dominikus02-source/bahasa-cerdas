/**
 * Hallucination Checker
 *
 * Basic checks for factual accuracy in AI-generated content.
 * Focuses on Bahasa Indonesia education domain.
 *
 * Limitations:
 * - Cannot verify against live sources (no web search integration yet)
 * - Checks are pattern-based, not semantic
 * - Does not replace human expert review
 */

export interface HallucinationCheckResult {
  passed: boolean;
  flaggedStatements: { statement: string; reason: string; severity: "low" | "medium" | "high" }[];
}

const KNOWN_FACTS: [RegExp, string][] = [
  [/PUEBI digantikan EYD/, "PUEBI digantikan oleh EYD V pada tahun 2022 — ini benar, jangan di-flag"],
  [/EYD V ([0-9]{4})/, "EYD V berlaku sejak 2022 — periksa tahun: $1"],
  [/ukbi/i, "UKBI: Uji Kemahiran Berbahasa Indonesia — 7 predikat dari Istimewa hingga Terbatas"],
  [/kurikulum merdeka (diluncurkan|diterbitkan)/i, "Kurikulum Merdeka diluncurkan tahun 2022 sebagai penyempurnaan K13"],
];

const SUSPICIOUS_PATTERNS = [
  { pattern: /menurut penelitian terbaru(?!\s*[\[\(])/i, reason: 'Klaim "penelitian terbaru" tanpa sitasi', severity: "medium" as const },
  { pattern: /data menunjukkan\s+(bahwa\s+)?(semua|setiap|tidak ada)/i, reason: "Klaim absolut tanpa data pendukung", severity: "medium" as const },
  { pattern: /pada tahun\s+(20\d{2})(?!.*?(?:dilansir|sumber|menurut))/i, reason: "Tahun tanpa sumber — bisa jadi halusinasi", severity: "medium" as const },
  { pattern: /(selalu|tidak pernah|semua orang|pasti)/i, reason: "Bahasa absolut — hindari dalam konten edukasi", severity: "low" as const },
  { pattern: /menurut\s+(?!.*(?:kemendikbud|puebi|eyd|kbbi))/i, reason: 'Sumber tidak jelas — sebutkan "menurut Kemendikbud" atau lembaga resmi', severity: "medium" as const },
];

export function checkHallucination(text: string): HallucinationCheckResult {
  const flaggedStatements: { statement: string; reason: string; severity: "low" | "medium" | "high" }[] = [];

  for (const { pattern, reason, severity } of SUSPICIOUS_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flaggedStatements.push({
        statement: matches[0].substring(0, 100),
        reason,
        severity,
      });
    }
  }

  return {
    passed: flaggedStatements.length === 0,
    flaggedStatements,
  };
}
