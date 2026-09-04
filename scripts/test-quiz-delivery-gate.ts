/**
 * Quiz delivery gate (P0.6) — pure contract test.
 *
 * Proves the MASTER_BANK quarantine policy:
 *  - no un-reviewed MASTER_BANK item is deliverable (allowlist empty)
 *  - allowlisted items still face the deterministic content gate
 *  - non-MASTER_BANK (AI/IMPORT/custom) items always flow
 *  - empty safe pool → graceful (never an unsafe pick)
 *
 * Runs without a database.
 */
import {
  MASTER_BANK_SOURCE,
  DELIVERABLE_MASTER_KODE_SOALS,
  masterBankContentIssues,
  masterBankBlockReason,
  isMasterBankDeliverable,
} from "../lib/question-bank/delivery-gate";

interface SoalFixture {
  kodeSoal: string | null;
  source?: string | null;
  text: string;
  type: string;
  options: string[];
  correctAnswer: string;
}

const approved = new Set<string>(["BC-APPROVED-0001"]);

function mkSoal(partial: Partial<SoalFixture> & { text?: string }): SoalFixture {
  return {
    kodeSoal: partial.kodeSoal ?? null,
    source: partial.source ?? MASTER_BANK_SOURCE,
    text: partial.text ?? "",
    type: partial.type ?? "PILIHAN_GANDA",
    options: partial.options ?? [],
    correctAnswer: partial.correctAnswer ?? "",
    ...partial,
  };
}

// ----- Real audited broken shapes (from the forensic audit) -----
const TAUTOLOGY_CERPEN = mkSoal({
  kodeSoal: "BC-CERPEN-0014",
  text: "Berikut ini yang termasuk contoh Cerpen adalah…",
  options: ["Cerpen", "Menulis cerita pendek", "Membaca puisi", "Menyusun laporan"],
  correctAnswer: "0",
});
const TAUTOLOGY_EJAAN = mkSoal({
  kodeSoal: "BC-EJAAN-0002",
  text: "Berikut ini yang termasuk contoh Ejaan adalah…",
  options: ["Ejaan", "Menulis cerita pendek", "Membaca puisi", "Menyusun laporan"],
  correctAnswer: "0",
});
const BROKEN_KEY_SINONIM = mkSoal({
  kodeSoal: "BC-SINONIM-0003",
  text: "Manakah sinonim dari kata \"gembira\"?",
  options: ["Sedih", "Senang", "Marah", "Takut"],
  correctAnswer: "1", // wrong on purpose (audited BROKEN item is key-inconsistent)
});

const validPg = mkSoal({
  kodeSoal: "BC-APPROVED-0001",
  text: "Manakah kalimat yang menggunakan kata baku yang tepat?",
  options: ["Mereka sedang mengerjakan ujian.", "Mereka lagi ngerjain ujian.", "Mereka sedang mengerjakan PR.", "Mereka akan mengerjakan ujian."],
  correctAnswer: "0",
});

function main() {
  console.log("=== Quiz Delivery Gate (P0.6) — Contract Test ===\n");
  let pass = 0;
  let total = 0;
  const check = (name: string, ok: boolean, detail = "") => {
    total++;
    if (ok) {
      pass++;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      console.log(`  ✗ FAIL: ${name} ${detail}`);
    }
  };

  console.log("— A. Deliverable policy —");
  // A1: un-reviewed MASTER_BANK never deliverable (allowlist empty)
  check("A1. un-reviewed master item blocked (default allowlist)",
    !isMasterBankDeliverable(validPg),
    masterBankBlockReason(validPg) ?? "expected a block reason");
  check("A2. allowlist is empty in production",
    DELIVERABLE_MASTER_KODE_SOALS.size === 0,
    `allowlist has ${DELIVERABLE_MASTER_KODE_SOALS.size} entries`);

  // B: allowlisted + content-safe PG → deliverable
  check("B1. allowlisted content-safe PG deliverable",
    isMasterBankDeliverable(validPg, approved));
  check("B2. block reason null when deliverable",
    masterBankBlockReason(validPg, approved) === null);

  console.log("— B. Structural rejections (allowlisted items still gated) —");
  const missingPrompt = mkSoal({ ...validPg, text: "" });
  check("B1. missing prompt rejected", masterBankBlockReason(missingPrompt, approved) === "TEXT_MISSING");

  const emptyOptions = mkSoal({ ...validPg, options: [] });
  check("B2. PG with no options rejected", masterBankBlockReason(emptyOptions, approved) === "OPTIONS_TOO_FEW");

  const emptyOption = mkSoal({ ...validPg, options: ["Satu", "", "Tiga", "Empat"] });
  check("B3. empty option rejected", masterBankBlockReason(emptyOption, approved) === "EMPTY_OPTION");

  const dupOptions = mkSoal({ ...validPg, options: ["Satu", "Dua", "Dua", "Empat"] });
  check("B4. duplicate option rejected", masterBankBlockReason(dupOptions, approved) === "DUPLICATE_OPTION");

  const badKey = mkSoal({ ...validPg, options: ["A", "B", "C", "D"], correctAnswer: "9" });
  check("B5. out-of-range key rejected", masterBankBlockReason(badKey, approved) === "KEY_OUT_OF_RANGE");

  const nonIndexKey = mkSoal({ ...validPg, options: ["A", "B", "C", "D"], correctAnswer: "A" });
  check("B6. non-index key rejected", masterBankBlockReason(nonIndexKey, approved) === "KEY_NOT_INDEX");

  const isianWithOptions = mkSoal({ kodeSoal: "BC-APPROVED-0001", type: "ISIAN_SINGKAT", text: "Jelaskan pengertian teks prosedur.", options: ["fake"], correctAnswer: "jelaskan" });
  check("B7. ISIAN_SINGKAT with options rejected", masterBankBlockReason(isianWithOptions, approved) === "ISIAN_HAS_OPTIONS");

  console.log("— C. Audited template family rejected —");
  // Un-reviewed items are blocked outright by the quarantine.
  check("C1. tautology template (BC-CERPEN-0014) blocked by quarantine",
    masterBankBlockReason(TAUTOLOGY_CERPEN) === "MASTER_NOT_REVIEWED");
  check("C2. tautology template (BC-EJAAN-0002) blocked by quarantine",
    masterBankBlockReason(TAUTOLOGY_EJAAN) !== null);
  // Even if allowlisted, the content gate still stops the template family.
  const approvedWithCerpen = new Set([...approved, "BC-CERPEN-0014"]);
  const cerpenReason = masterBankBlockReason(TAUTOLOGY_CERPEN, approvedWithCerpen);
  check("C3. allowlisted template still rejected by content gate",
    cerpenReason === "TEMPLATE_STEM" || cerpenReason === "FILLER_DISTRACTORS",
    `reason=${cerpenReason ?? "none"}`);
  check("C4. broken-key item (BC-SINONIM-0003) blocked (not reviewed)",
    masterBankBlockReason(BROKEN_KEY_SINONIM) === "MASTER_NOT_REVIEWED");

  console.log("— D. Non-master items flow —");
  const aiSoal = mkSoal({
    source: "AI",
    kodeSoal: null,
    text: "Manakah penulisan yang sesuai PUEBI?",
    options: ["tidak", "tidak ada", "tidak ada", "tidak ada"],
    correctAnswer: "0",
  });
  check("D1. AI-sourced item always deliverable", isMasterBankDeliverable(aiSoal));
  const importSoal = mkSoal({ source: "IMPORT", text: "Soal impor yang valid?", options: ["A", "B", "C", "D"], correctAnswer: "0" });
  check("D2. IMPORT-sourced item always deliverable", isMasterBankDeliverable(importSoal));

  console.log("— E. Empty safe pool → graceful —");
  const poolAllBlocked = [TAUTOLOGY_CERPEN, TAUTOLOGY_EJAAN, BROKEN_KEY_SINONIM];
  const deliverable = poolAllBlocked.filter((s) => isMasterBankDeliverable(s, approved));
  check("E1. no unsafe pick from a fully-blocked pool", deliverable.length === 0);
  check("E2. pool of only non-master flows", [aiSoal, importSoal].filter((s) => isMasterBankDeliverable(s)).length === 2);

  console.log("— F. KEY_IN_STEM intentionally excluded for bank items —");
  const stemQuotesKey = mkSoal({
    kodeSoal: "BC-APPROVED-0001",
    text: "Tentukan subjek pada kalimat \"Adik bermain di halaman\".",
    options: ["Adik", "bermain", "di halaman", "halaman"],
    correctAnswer: "0",
  });
  check("F1. bank item quoting keyed word in stem passes content gate",
    masterBankContentIssues(stemQuotesKey).length === 0,
    JSON.stringify(masterBankContentIssues(stemQuotesKey)));

  console.log(`\n--- Results ---`);
  console.log(`Tests: ${pass}/${total} passed`);
  if (pass !== total) process.exit(1);
  console.log(`\n✅ ALL TESTS PASSED — MASTER_BANK quarantined, content gate active, non-master flows intact`);
}

main();
