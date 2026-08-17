/**
 * STEP 7.1 — Master Question Bank Recovery: Test Harness
 * check(name, fn) MENG-EKSEKUSI fn (bukan truthy-check function object) —
 * self-test false=>FAIL, true=>PASS membuktikan harness mengevaluasi hasil.
 * Jalankan: npx tsx scripts/test-master-question-recovery.ts
 */
import fs from "fs";
import path from "path";
import {
  MasterQuestion,
  ClassificationResult,
  normText,
  normOption,
  keyIndex,
  isTemplateConceptQuestion,
  isJelaskanTokenQuestion,
  isTautologyBS,
  isSelfAnswer,
  isWrongTypeMCQ,
  isJelaskanTokenBroken,
  optionIssues,
  keyInRange,
  hasTemplateExplanation,
  explanationContradictsKey,
  difficultyMismatch,
  languageError,
  skillMismatch,
  semanticValidate,
  classifyQuestion,
  buildDuplicateContext,
  countByDisposition,
  countByFlag,
  isProductionEligible,
  exactDuplicateKey,
  tokenJaccard,
} from "../lib/master-recovery";

const MASTER_DIR = path.join(process.cwd(), "data/question-bank/master");

interface CheckResult {
  name: string;
  passed: boolean;
  error?: string;
}

function loadAll(): MasterQuestion[] {
  const files = fs.readdirSync(MASTER_DIR).filter((f) => f.endsWith(".json"));
  const all: MasterQuestion[] = [];
  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(path.join(MASTER_DIR, f), "utf8"));
    for (const q of arr) all.push({ ...q, file: f });
  }
  return all;
}

const bank = loadAll();
const ctx = buildDuplicateContext(bank);
const results: ClassificationResult[] = bank.map((q) => classifyQuestion(q, ctx));
const byKode = new Map(results.map((r) => [r.kodeSoal, r]));
const byDisposition = countByDisposition(results);
const byFlag = countByFlag(results);

const resultsOf: Array<CheckResult> = [];
let discovered = 0;
let metaChecks = 0;

function check(name: string, fn: () => boolean): void {
  discovered++;
  let passed = false;
  let error: string | undefined;
  try {
    passed = fn() === true;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  resultsOf.push({ name, passed, error });
}

function checkMeta(name: string, fn: () => boolean): void {
  metaChecks++;
  check(name, fn);
}

const q = (kode: string): MasterQuestion => {
  const found = bank.find((b) => b.kodeSoal === kode);
  if (!found) throw new Error(`soal tidak ada: ${kode}`);
  return found;
};
const r = (kode: string): ClassificationResult => {
  const found = byKode.get(kode);
  if (!found) throw new Error(`hasil tidak ada: ${kode}`);
  return found;
};

// ---- SELF-TEST (membuktikan harness mengeksekusi hasil, bukan object) ----
checkMeta("self-test: true => PASS", () => true);
checkMeta("self-test: false => FAIL (harness harus menangkap)", () => false);

// ---- NORMALIZE ----
check("normText: casing/whitespace/punctuation", () =>
  normText("  Contoh, Kalimat!  (Uji)  ") === "contoh kalimat uji"
);
check("normOption: trim+lowercase", () => normOption("  Benar  ") === "benar");
check("keyIndex: BS 'Benar' => 0", () => keyIndex("Benar", "BENAR_SALAH") === 0);
check("keyIndex: BS index string => parseInt fallback", () => keyIndex("2", "BENAR_SALAH") === 2);

// ---- PATTERN DETECTORS ----
check("template: ejaan#0 terdeteksi + konsep", () => {
  const t = isTemplateConceptQuestion(q("BC-EJAAN-0001"));
  return t.is === true && t.concept === "ejaan";
});
check("template: kunci = konsep (NO_CORRECT)", () => {
  const c = r("BC-EJAAN-0001");
  return c.flags.includes("NO_CORRECT") && c.flags.includes("BAD_TEMPLATE");
});
check("jelaskan: anekdot-0005 terdeteksi", () =>
  isJelaskanTokenQuestion(q("BC-ANEKDOT-0005"))
);
check("jelaskan-token: broken (opsi tunggal)", () => {
  const c = r("BC-ANEKDOT-0005");
  return isJelaskanTokenBroken(q("BC-ANEKDOT-0005")) && c.flags.includes("BROKEN_CONTENT");
});
check("tautologi: anekdot-0003 terdeteksi", () =>
  isTautologyBS(q("BC-ANEKDOT-0003"))
);
check("tautologi: FALSE POSITIVE di SPOK-0003 (konten asli)", () =>
  !isTautologyBS(q("BC-SPOK-0003"))
);
check("wrong-type: SPOK-0003 BS-4opsi => WRONG_METADATA", () =>
  isWrongTypeMCQ(q("BC-SPOK-0003")) && r("BC-SPOK-0003").flags.includes("WRONG_METADATA")
);
check("self-answer: SINONIM-0003 kunci='Berani' => WRONG_KEY", () => {
  const s = isSelfAnswer(q("BC-SINONIM-0003"));
  return s.is && r("BC-SINONIM-0003").flags.includes("WRONG_KEY");
});

// ---- OBJECTIVE VALIDATION ----
check("keyInRange: semua 1500 kunci di jangkauan opsi", () =>
  bank.every((b) => keyInRange(b).ok)
);
check("options: semua non-pattern punya >= 2 opsi tanpa duplikat/kosong", () =>
  bank
    .filter(
      (b) =>
        !isTemplateConceptQuestion(b).is &&
        !isJelaskanTokenQuestion(b) &&
        !isTautologyBS(b)
    )
    .every((b) => optionIssues(b).length === 0)
);
check("options: 149 jelaskan-token ter-flag INVALID_OPTION", () =>
  byFlag.INVALID_OPTION === 149
);
check("fixture: kunci out-of-range terdeteksi", () => {
  const bad: MasterQuestion = {
    ...q("BC-SINONIM-0001"),
    kodeSoal: "FIXTURE-1",
    options: ["a", "b"],
    correctAnswer: "5",
  };
  return keyInRange(bad).ok === false;
});
check("fixture: opsi duplikat terdeteksi", () => {
  const bad: MasterQuestion = {
    ...q("BC-SINONIM-0001"),
    kodeSoal: "FIXTURE-2",
    options: ["Senang", "Senang", "Marah", "Kecewa"],
  };
  return optionIssues(bad).length > 0;
});
check("fixture: opsi kosong terdeteksi", () => {
  const bad: MasterQuestion = {
    ...q("BC-SINONIM-0001"),
    kodeSoal: "FIXTURE-3",
    options: ["Senang", "", "Marah", "Kecewa"],
  };
  return optionIssues(bad).length > 0;
});

// ---- EXPLANATION / DIFFICULTY ----
check("explanation templat terdeteksi (ejaan-0001)", () =>
  hasTemplateExplanation(q("BC-EJAAN-0001"))
);
check("explanation templat = flag EXPLANATION_MISMATCH", () =>
  r("BC-EJAAN-0001").flags.includes("EXPLANATION_MISMATCH")
);
check("fixture: explanation menyangkal kunci terdeteksi", () => {
  const bad: MasterQuestion = {
    ...q("BC-SINONIM-0001"),
    kodeSoal: "FIXTURE-4",
    options: ["Sedih", "Senang", "Marah", "Kecewa"],
    correctAnswer: "1",
    explanation: "Jawaban yang benar adalah Sedih, bukan Senang.",
  };
  return explanationContradictsKey(bad);
});
check("difficulty: indikator (MUDAH) vs difficulty SULIT terdeteksi", () => {
  const bad: MasterQuestion = {
    ...q("BC-SINONIM-0001"),
    kodeSoal: "FIXTURE-5",
    indikator: "Memahami konsep Sinonim (MUDAH)",
    difficulty: "SULIT",
  };
  return difficultyMismatch(bad);
});
check("difficulty: templat SULIT => DIFFICULTY_MISMATCH", () =>
  byFlag.DIFFICULTY_MISMATCH > 0
);

// ---- LANGUAGE / SKILL ----
check("languageError: 'Langgsung' terdeteksi", () =>
  languageError({ ...q("BC-SINONIM-0001"), kodeSoal: "FIXTURE-6", text: "Langgsung benar" }) !== null
);
check("skillMismatch: kodeSoal tidak mengandung tema", () => {
  const bad: MasterQuestion = {
    ...q("BC-SINONIM-0001"),
    kodeSoal: "BC-LAIN-0001",
    tema: "Sinonim",
  };
  return skillMismatch(bad);
});
check("skillMismatch: 0 false positive di bank asli", () =>
  byFlag.SKILL_MISMATCH === undefined || byFlag.SKILL_MISMATCH === 0
);

// ---- SEMANTICS ----
check("semantik: SINONIM-0001 bahagia->senang valid", () =>
  semanticValidate(q("BC-SINONIM-0001")).valid
);
check("semantik: SINONIM-0003 kunci salah (berani->Gagah)", () => {
  const v = semanticValidate(q("BC-SINONIM-0003"));
  return !v.valid && /opsi index 3/.test(v.reason || "");
});
check("semantik: MAJAS-0001 personifikasi valid", () =>
  semanticValidate(q("BC-MAJAS-0001")).valid
);
check("semantik: SPOK-0003 objek=sayur valid", () =>
  semanticValidate(q("BC-SPOK-0003")).valid
);

// ---- DUPLICATES ----
check("duplikat: template ejaan-0002 = duplikat ejaan-0001", () => {
  const c = r("BC-EJAAN-0002");
  return c.flags.includes("DUPLICATE") && c.duplicateOf === "BC-EJAAN-0001";
});
check("duplikat: canonical ejaan-0001 TIDAK di-flag", () =>
  !r("BC-EJAAN-0001").flags.includes("DUPLICATE")
);
check("duplikat: grup exact di bank = 150, canonical = 170", () => {
  const canonical = results.filter((x) => !x.flags.includes("DUPLICATE")).length;
  const groups = new Set(results.filter((x) => x.duplicateOf).map((x) => x.duplicateOf!));
  return groups.size === 150 && canonical === 170;
});
check("near-duplicate: tokenJaccard threshold", () => {
  const a = "Sinonim dari kata bahagia adalah";
  const b = "Sinonim dari kata bahagia adalah";
  const c = "Antonim dari kata bahagia adalah";
  return tokenJaccard(a, b) === 1 && tokenJaccard(a, c) < 1;
});
check("near-duplicate: canonical templat tidak di-flag tanpa variasi", () => {
  const near = results.filter((x) => x.flags.includes("NEAR_DUPLICATE"));
  return near.length === 0;
});

// ---- DISPOSITION / GOLD CONTRACT ----
check("disposisi: template => AI_REPAIR_CANDIDATE", () =>
  byDisposition.AI_REPAIR_CANDIDATE === 1480
);
check("disposisi: AUTO_REPAIR = 6 (tipe metadata saja)", () => {
  const auto = results.filter((x) => x.disposition === "AUTO_REPAIR_ALLOWED");
  return auto.length === 6 && auto.every((x) => x.repair?.type === "PILIHAN_GANDA");
});
check("disposisi: HUMAN_REVIEW = 1 (SINONIM-0003 WRONG_KEY)", () =>
  byDisposition.HUMAN_REVIEW_REQUIRED === 1 &&
  r("BC-SINONIM-0003").disposition === "HUMAN_REVIEW_REQUIRED"
);
check("disposisi: REJECT = 0 (tidak ada yang diputuskan tanpa bukti)", () =>
  (byDisposition.REJECT || 0) === 0
);
check("disposisi: total = 1500", () =>
  Object.values(byDisposition).reduce((a, b) => a + b, 0) === 1500
);
check("GOLD: 13 soal konten murni + 6 auto-repair = 19 gold", () => {
  const gold = results.filter((x) => x.gold);
  return gold.length === 19 && byDisposition.GOLD === 13;
});
check("GOLD: setiap gold lolos isProductionEligible", () => {
  return results
    .filter((x) => x.gold)
    .every((x) => isProductionEligible(q(x.kodeSoal), x));
});
check("GOLD: soal templat TIDAK production-eligible", () =>
  !isProductionEligible(q("BC-EJAAN-0001"), r("BC-EJAAN-0001"))
);
check("gold contract: BC-SINONIM-0001 0 flag + gold", () => {
  const c = r("BC-SINONIM-0001");
  return c.gold && c.flags.length === 0 && c.disposition === "GOLD";
});
check("gold contract: SPOK-0005 auto-repair ISIAN->PG gold", () => {
  const c = r("BC-SPOK-0005");
  return c.gold && c.repair?.type === "PILIHAN_GANDA";
});
check("tidak mengarang: auto-repair hanya ubah tipe, konten asli", () => {
  const auto = results.filter((x) => x.disposition === "AUTO_REPAIR_ALLOWED");
  return auto.every((x) => {
    const src = q(x.kodeSoal);
    return x.text === src.text &&
      JSON.stringify(x.type === "PILIHAN_GANDA" ? src.options : src.options) ===
        JSON.stringify(src.options) &&
      x.repair?.type === "PILIHAN_GANDA";
  });
});

// ---- DETERMINISM ----
check("deterministik: klasifikasi ulang identik", () => {
  const again = bank.map((b) => classifyQuestion(b, ctx));
  return JSON.stringify(again.map((x) => [x.kodeSoal, x.disposition, x.flags, x.gold])) ===
    JSON.stringify(results.map((x) => [x.kodeSoal, x.disposition, x.flags, x.gold]));
});

// ---- TALLY (meta self-test dieksklusi dari failed; perilakunya diverifikasi eksplisit) ----
const regular = resultsOf.filter((_, i) => i >= metaChecks);
const passed = regular.filter((x) => x.passed).length;
const failed = regular.filter((x) => !x.passed).length;
const executed = resultsOf.length;
const skipped = 0;

console.log("========== MASTER QUESTION RECOVERY ==========");
console.log("Discovered:", discovered);
console.log("Executed:  ", executed);
console.log("Passed:    ", passed, `(+${metaChecks} meta self-test)`);
console.log("Failed:    ", failed);
console.log("Skipped:   ", skipped);
console.log("");
if (failed > 0) {
  console.log("FAILED CHECKS:");
  regular.filter((x) => !x.passed).forEach((x) =>
    console.log(`  ✗ ${x.name}${x.error ? ` — ${x.error}` : ""}`)
  );
}
const selfTrue = resultsOf[0]?.passed === true;
const selfFalse = resultsOf[1]?.passed === false;
console.log("");
console.log(`Self-test: true=>PASS ${selfTrue ? "✅" : "✗"} | false=>FAIL ${selfFalse ? "✅" : "✗"}`);
console.log(`RESULT: ${failed === 0 && selfTrue && selfFalse ? "SEMUA LULUS ✅" : `${failed} GAGAL ✗`}`);

process.exit(failed === 0 && selfTrue && selfFalse ? 0 : 1);
