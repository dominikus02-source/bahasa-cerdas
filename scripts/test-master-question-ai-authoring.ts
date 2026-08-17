/**
 * STEP 7.3 — MASTER QUESTION AI AUTHORING — Harness QA
 * check(name, fn) MENGEKSEKUSI fn secara nyata; self-test false=>FAIL, true=>PASS.
 * Provider AI disimulasikan via stub executor (tanpa secret, tanpa jaringan).
 */
import { MasterQuestion } from "../lib/master-recovery";
import {
  AuthoringQuestion,
  createAuthoringExecutor,
  authorQuestion,
  summarizeAuthoring,
  authoringCandidate,
} from "../lib/master-authoring";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, fn: () => boolean | Promise<boolean>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then((ok) => {
          if (ok) {
            passed++;
            console.log(`  ✓ ${name}`);
          } else {
            failed++;
            failures.push(name);
            console.log(`  ✗ FAIL: ${name}`);
          }
        })
        .catch((e) => {
          failed++;
          failures.push(name);
          console.log(`  ✗ FAIL (throw): ${name} — ${String(e instanceof Error ? e.message : e).slice(0, 200)}`);
        });
    } else if (result) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      failures.push(name);
      console.log(`  ✗ FAIL: ${name}`);
    }
  } catch (e) {
    failed++;
    failures.push(name);
    console.log(`  ✗ FAIL (throw): ${name} — ${String(e instanceof Error ? e.message : e).slice(0, 200)}`);
  }
}

// ─── Helpers ────────────────────────────────────────────────

function stubExecutor(content: string): ReturnType<typeof createAuthoringExecutor> {
  return async () => ({
    content,
    model: "stub-oss-120b",
    provider: "stub-groq",
    latencyMs: 2,
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  });
}

function retryOnceStub(): ReturnType<typeof createAuthoringExecutor> {
  let calls = 0;
  return async () => {
    calls++;
    if (calls === 1) throw new Error("SK_test_stub_error gsk_AAABBBCCCDDD");
    return {
      content: contractJson(goldContract("SINONIM")),
      model: "stub-oss-120b",
      provider: "stub-groq",
      latencyMs: 2,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    };
  };
}

function makeSource(over: Partial<MasterQuestion> = {}): MasterQuestion {
  return {
    kodeSoal: "BC-SINONIM-TPL-0001",
    judul: "Bank Soal",
    tema: "sinonim",
    kelas: "VII",
    semester: 1,
    kompetensi: "K1",
    indikator: "I1",
    difficulty: "MUDAH",
    levelBerpikir: 1,
    type: "PILIHAN_GANDA",
    text: "Pilihlah sinonim dari kata 'cerdas'.",
    options: ["pintar", "malas"],
    correctAnswer: "0",
    explanation: "Sinonim berarti persamaan kata.",
    kataKunci: ["sinonim"],
    estimasiWaktu: 60,
    isHOTS: false,
    file: "bank.json",
    ...over,
  };
}

function baseSkill(skill: string): AuthoringQuestion {
  if (skill === "ANTONIM")
    return {
      type: "PILIHAN_GANDA",
      skill: "ANTONIM",
      difficulty: "MUDAH",
      stem: "Pilihlah antonim dari kata 'panas' yang tepat.",
      options: ["dingin", "hangat", "lembab", "basi"],
      correctAnswer: "dingin",
      explanation: "Karena 'dingin' adalah lawan kata dari 'panas', sehingga kunci yang tepat adalah 'dingin'.",
    };
  if (skill === "EJAAN")
    return {
      type: "PILIHAN_GANDA",
      skill: "EJAAN",
      difficulty: "MUDAH",
      stem: "Penulisan kata baku yang tepat terdapat pada kalimat...",
      options: ["Dia membeli nasehat guru.", "Dia menuruti nasihat guru.", "Dia patuh pada nasehat.", "Dia dengar nasihat."],
      correctAnswer: "Dia menuruti nasihat guru.",
      explanation: "Karena bentuk baku menurut PUEBI adalah 'nasihat', bukan 'nasehat', sehingga jawaban yang tepat adalah opsi kedua.",
    };
  if (skill === "MAKNA_KATA")
    return {
      type: "PILIHAN_GANDA",
      skill: "MAKNA_KATA",
      difficulty: "SEDANG",
      stem: "Dalam kalimat berikut, kata 'bangku' bermakna...",
      options: ["kursi panjang", "posisi belajar", "jabatan", "meja kerja"],
      correctAnswer: "jabatan",
      explanation: "Karena dalam konteks kalimat tersebut kata 'bangku' merujuk pada kedudukan, sehingga maknanya adalah jabatan.",
    };
  if (skill === "KONSEP")
    return {
      type: "PILIHAN_GANDA",
      skill: "KONSEP",
      difficulty: "MUDAH",
      stem: "Berikut ini yang termasuk kalimat tanya adalah...",
      options: ["Apa kabar?", "Tolong diam!", "Kerjakan tugasmu.", "Sungguh indah!"],
      correctAnswer: "Apa kabar?",
      explanation: "Karena kalimat tanya ditandai oleh kata 'apa' dan tanda tanya, sehingga opsi pertama adalah jawaban yang benar.",
    };
  if (skill === "SPOK")
    return {
      type: "PILIHAN_GANDA",
      skill: "SPOK",
      difficulty: "SEDANG",
      stem: "Pada kalimat 'Adik membaca buku di kamar', kata yang berfungsi sebagai subjek adalah...",
      options: ["Adik", "membaca", "buku", "di kamar"],
      correctAnswer: "Adik",
      explanation: "Karena subjek adalah pelaku yang melakukan tindakan, dan dalam kalimat tersebut pelakunya adalah 'Adik'.",
    };
  if (skill === "MAJAS")
    return {
      type: "PILIHAN_GANDA",
      skill: "MAJAS",
      difficulty: "SEDANG",
      stem: "Kalimat 'Angin berbisik di malam hari' mengandung majas...",
      options: ["personifikasi", "metafora", "simile", "hiperbola"],
      correctAnswer: "personifikasi",
      explanation: "Karena 'angin' (benda mati) diberi sifat manusia 'berbisik', sehingga majas yang tepat adalah personifikasi.",
    };
  if (skill === "KALIMAT_EFEKTIF")
    return {
      type: "PILIHAN_GANDA",
      skill: "KALIMAT_EFEKTIF",
      difficulty: "SEDANG",
      stem: "Kalimat yang paling efektif dari kalimat berikut adalah...",
      options: ["Para siswa siswa belajar bersama.", "Para siswa belajar bersama.", "Para siswa belajar belajar bersama.", "Para siswa-siswa bersama belajar."],
      correctAnswer: "Para siswa belajar bersama.",
      explanation: "Karena kalimat efektif tidak memuat kata yang berlebihan atau pleonasme, sehingga opsi kedua paling ringkas dan tepat.",
    };
  return {
    type: "PILIHAN_GANDA",
    skill: "SINONIM",
    difficulty: "MUDAH",
    stem: "Pilihlah sinonim dari kata 'cerdas' yang tepat.",
    options: ["pintar", "malas", "lemah", "bodoh"],
    correctAnswer: "pintar",
    explanation: "Karena 'pintar' memiliki makna yang sama dengan 'cerdas', yaitu pandai atau tajam pikiran, sehingga kunci yang tepat adalah 'pintar'.",
  };
}

function goldContract(skill: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  const q = baseSkill(skill);
  const { question: qOver, ...restOver } = over;
  return {
    decision: "GOLD",
    question: { ...q, ...((qOver as Record<string, unknown> | undefined) ?? {}) },
    reason: "Cukup bukti; diperbaiki menjadi soal yang dapat dipertanggungjawabkan.",
    confidence: 0.9,
    difficultyEvidence:
      skill === "MAKNA_KATA" || skill === "SPOK" || skill === "KALIMAT_EFEKTIF"
        ? "Butuh pemahaman konteks dua langkah: kenali kalimat lalu tentukan fungsi/makna (SEDANG)."
        : "Hafalan langsung persamaan lawan kata dasar (MUDAH).",
    semanticEvidence:
      skill === "SINONIM" || skill === "ANTONIM"
        ? "Pasangan kata terverifikasi pada tabel semantik bank (cerdas=pintar / panas=dingin)."
        : "Kaidah bahasa Indonesia yang pasti dan dapat diverifikasi (PUEBI / struktur kalimat).",
    repairType: "TEMPLATE_TO_VALID_ITEM",
    sourceQuestionId: "BC-SINONIM-TPL-0001",
    sourcePreserved: true,
    ...restOver,
  } as Record<string, unknown>;
}

function contractJson(contract: Record<string, unknown>): string {
  return JSON.stringify(contract);
}

async function authorWith(content: string | Record<string, unknown>, overSource: Partial<MasterQuestion> = {}) {
  const str = typeof content === "string" ? content : contractJson(content);
  return authorQuestion(makeSource(overSource), undefined, {
    bank: [makeSource()],
    authored: [],
    familyKey: makeSource().text,
  }, { executor: stubExecutor(str) });
}

const MAIN_SKILLS = ["SINONIM", "ANTONIM", "EJAAN", "MAKNA_KATA", "KONSEP"];
const VERIFY_SKILLS = ["SPOK", "MAJAS", "KALIMAT_EFEKTIF"];

// Source per-skill agar classifySkill(source) mendeteksi skill yang sama dengan kontrak.
const SOURCE_OVERRIDES: Record<string, Partial<MasterQuestion>> = {
  SINONIM: { tema: "sinonim", text: "Pilihlah sinonim dari kata 'cerdas'." },
  ANTONIM: { tema: "antonim", text: "Pilihlah antonim dari kata 'panas'.", options: ["dingin", "hangat"] },
  EJAAN: { tema: "kata-baku", text: "Tentukan penulisan kata baku yang tepat.", options: ["nasehat", "nasihat"] },
  MAKNA_KATA: { tema: "makna-kata", text: "Kata 'bangku' dalam kalimat bermakna?", options: ["jabatan", "kursi"] },
  KONSEP: { tema: "konsep", text: "Yang termasuk kalimat tanya adalah...", options: ["Apa kabar?", "Tolong diam!"] },
  SPOK: { tema: "spok", text: "Pada kalimat 'Adik membaca buku', unsur subjek adalah...", options: ["Adik", "membaca"] },
  MAJAS: { tema: "majas", text: "Kalimat 'Angin berbisik' mengandung majas...", options: ["personifikasi", "metafora"] },
  KALIMAT_EFEKTIF: { tema: "kalimat", text: "Kalimat yang paling efektif adalah...", options: ["Para siswa belajar.", "Para siswa-siswa belajar."] },
};

async function main() {
  console.log("── Self-test framework ──");
  check("SELF: check(false) → FAIL (kanari)", () => false);
  check("SELF: check(true) → PASS", () => true);

  console.log("\n── Provider behaviors ──");
  check("T.01 provider failure → REPAIR_FAILED + PROVIDER_FAILED + source utuh", async () => {
    const r = await authorQuestion(makeSource(), undefined, { bank: [makeSource()], authored: [] }, { executor: retryOnceStub() });
    return r.decision === "REPAIR_FAILED" && r.telemetry.errorCode === "PROVIDER_FAILED" &&
      r.source.kodeSoal === "BC-SINONIM-TPL-0001" && r.source.text.includes("sinonim");
  });
  check("T.02 provider retry (gagal lalu sukses) → sukses, attempted=true", async () => {
    const ex = retryOnceStub();
    const r1 = await authorQuestion(makeSource(), undefined, { bank: [makeSource()], authored: [] }, { executor: ex });
    const r2 = await authorQuestion(makeSource(), undefined, { bank: [makeSource()], authored: [] }, { executor: ex });
    return r1.decision === "REPAIR_FAILED" && r2.decision === "GOLD" && r2.telemetry.attempted === true;
  });
  check("T.03 empty response → INVALID_CONTRACT + HUMAN_REVIEW_REQUIRED", async () => {
    const r = await authorWith("");
    return r.decision === "HUMAN_REVIEW_REQUIRED" && r.telemetry.errorCode === "INVALID_CONTRACT";
  });
  check("T.04 malformed JSON → INVALID_CONTRACT + HUMAN_REVIEW_REQUIRED", async () => {
    const r = await authorWith("ini bukan json { rusak");
    return r.decision === "HUMAN_REVIEW_REQUIRED" && r.telemetry.errorCode === "INVALID_CONTRACT";
  });
  check("T.05 tanpa executor → REPAIR_FAILED + EXECUTOR_UNAVAILABLE", async () => {
    const r = await authorQuestion(makeSource(), undefined, { bank: [makeSource()], authored: [] }, {});
    return r.decision === "REPAIR_FAILED" && r.telemetry.errorCode === "EXECUTOR_UNAVAILABLE";
  });
  check("T.06 no-secret-leak: error tersanitasi, tanpa sk- pattern di record", async () => {
    const { sanitizeError } = await import("../lib/master-authoring");
    const msg = sanitizeError(new Error("fail with key sk-1234567890abcdef rahasia"));
    const r = await authorQuestion(makeSource(), undefined, { bank: [makeSource()], authored: [] }, { executor: retryOnceStub() });
    const json = JSON.stringify(r);
    return !msg.includes("sk-1234567890abcdef") && !json.includes("sk-") && !json.includes("AIza");
  });

  console.log("\n── GOLD: kandidat valid dari stub (provider nyata disimulasikan) ──");
  for (const skill of MAIN_SKILLS) {
    check(`T.07+ GOLD valid ${skill} → GOLD`, async () => {
      const r = await authorWith(goldContract(skill), SOURCE_OVERRIDES[skill]);
      return r.decision === "GOLD" && r.candidate !== null && r.candidate.skill === skill;
    });
  }
  for (const skill of VERIFY_SKILLS) {
    check(`T.08+ ${skill} tak-terverifikasi tabel → HUMAN_REVIEW_REQUIRED (jujur)`, async () => {
      const r = await authorWith(goldContract(skill), SOURCE_OVERRIDES[skill]);
      return r.decision === "HUMAN_REVIEW_REQUIRED";
    });
  }

  console.log("\n── Rejections / downgrade ──");
  check("T.09 self-answer (kunci muncul di stem) → bukan GOLD", async () => {
    const r = await authorWith(goldContract("SINONIM", { question: { stem: "Pilihlah sinonim dari kata 'cerdas'; jawabannya pintar." } }));
    return r.decision !== "GOLD";
  });
  check("T.10 multiple-correct (dua opsi sinonim) → bukan GOLD", async () => {
    const r = await authorWith(goldContract("SINONIM", { question: { options: ["pintar", "pandai", "lemah", "bodoh"] } }));
    return r.decision !== "GOLD" && r.detectedRisks.some((x) => x.includes("multi") || x.includes("semantik"));
  });
  check("T.11 opsi < 2 → parse gagal → HUMAN_REVIEW_REQUIRED", async () => {
    const r = await authorWith(goldContract("SINONIM", { question: { options: ["pintar"] } }));
    return r.decision === "HUMAN_REVIEW_REQUIRED" && r.telemetry.errorCode === "INVALID_CONTRACT";
  });
  check("T.12 explanation generik (template) → bukan GOLD", async () => {
    const r = await authorWith(goldContract("SINONIM", { question: { explanation: "Karena jawaban yang tepat karena sesuai dengan konsep yang dimaksud." } }));
    return r.decision !== "GOLD";
  });
  check("T.13 tautologi BS → bukan GOLD", async () => {
    const bs = goldContract("SINONIM", {
      question: {
        type: "BENAR_SALAH",
        stem: "Pernyataan: Kata 'cerdas' adalah bagian dari materi Bahasa Indonesia.",
        options: ["Benar", "Salah"],
        correctAnswer: "Benar",
        explanation: "Karena pernyataan tersebut menyatakan hal yang sama dengan kunci, maka jawabannya benar.",
      },
    });
    const r = await authorWith(bs, { tema: "sinonim", type: "BENAR_SALAH", options: ["Benar", "Salah"], correctAnswer: "0" });
    return r.decision !== "GOLD";
  });
  check("T.14 duplicate exact vs bank → PASS D fail → bukan GOLD", async () => {
    const bank = [makeSource({ options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "0" })];
    const r = await authorQuestion(makeSource(), undefined, { bank, authored: [] }, {
      executor: stubExecutor(contractJson(goldContract("SINONIM", { question: { stem: "Pilihlah sinonim dari kata 'cerdas'." } }))),
    });
    return r.decision !== "GOLD" && r.gates !== null && r.gates.passD.passed === false;
  });
  check("T.15 near-duplicate (stem identik vs bank) → PASS D fail", async () => {
    const bank = [makeSource({ options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "0" })];
    const r = await authorQuestion(makeSource(), undefined, { bank, authored: [] }, {
      executor: stubExecutor(contractJson(goldContract("SINONIM", { question: { stem: "Pilihlah sinonim dari kata 'cerdas'." } }))),
    });
    return r.decision !== "GOLD" && r.gates !== null && r.gates.passD.passed === false;
  });
  check("T.16 template spam (stem mirip batch) → PASS D fail", async () => {
    const authored: AuthoringQuestion[] = [];
    for (let i = 0; i < 4; i++) {
      authored.push({ ...baseSkill("SINONIM"), stem: `Pilihlah sinonim dari kata 'cerdas' yang tepat varian ${i}.` });
    }
    const r = await authorQuestion(makeSource(), undefined, { bank: [makeSource()], authored }, {
      executor: stubExecutor(contractJson(goldContract("SINONIM"))),
    });
    return r.decision !== "GOLD";
  });
  check("T.17 difficultyEvidence pendek → PASS E fail → bukan GOLD", async () => {
    const r = await authorWith(goldContract("SINONIM", { difficultyEvidence: "mudah" }));
    return r.decision !== "GOLD";
  });
  check("T.18 hallucination: GOLD tanpa semanticEvidence → bukan GOLD", async () => {
    const r = await authorWith(goldContract("SINONIM", { semanticEvidence: "menurut saya" }));
    return r.decision !== "GOLD";
  });
  check("T.19 sourceQuestionId/sourcePreserved tidak dihormati → bukan GOLD", async () => {
    const r = await authorWith(goldContract("SINONIM", { sourceQuestionId: "BC-XXX" }));
    return r.decision !== "GOLD";
  });
  check("T.20 GOLD membutuhkan A+B+C+D+E: corrupt per gate", async () => {
    // PASS C rusak (dua opsi benar) → HUMAN_REVIEW_REQUIRED (bukan GOLD)
    const cFail = await authorWith(goldContract("SINONIM", { question: { options: ["pintar", "pandai", "pintar", "pintar"] } }));
    // PASS A rusak (stem pendek) → REJECT? stem < 10 → passA gagal → routeByConfidence: passA fail → REJECT
    const aFail = await authorWith(goldContract("SINONIM", { question: { stem: "Singkat." } }));
    return cFail.decision !== "GOLD" && aFail.decision !== "GOLD" && aFail.decision === "REJECT";
  });
  check("T.21 HUMAN_REVIEW routing dikirim AI → HUMAN_REVIEW_REQUIRED", async () => {
    const r = await authorWith({ ...goldContract("SINONIM"), decision: "HUMAN_REVIEW" });
    return r.decision === "HUMAN_REVIEW_REQUIRED";
  });
  check("T.22 REJECT routing dikirim AI → REJECT", async () => {
    const r = await authorWith({ ...goldContract("SINONIM"), decision: "REJECT", question: null });
    return r.decision === "REJECT";
  });
  check("T.23 source preservation: record.source tidak dimutasi", async () => {
    const src = makeSource();
    const snapshot = JSON.stringify(src);
    const r = await authorQuestion(src, undefined, { bank: [makeSource()], authored: [] }, { executor: stubExecutor(contractJson(goldContract("SINONIM"))) });
    return JSON.stringify(src) === snapshot && JSON.stringify(r.source) === snapshot;
  });
  check("T.24 retry idempoten: dua panggilan → keputusan sama", async () => {
    const mk = () => authorWith(goldContract("SINONIM"));
    const [r1, r2] = [await mk(), await mk()];
    return r1.decision === r2.decision && (r1.candidate?.stem ?? null) === (r2.candidate?.stem ?? null);
  });
  check("T.25 executor default tersedia (createAuthoringExecutor)", () => {
    const ex = createAuthoringExecutor();
    return typeof ex === "function";
  });
  check("T.26 summarizeAuthoring menghitung stats benar", async () => {
    const records = [
      await authorWith(goldContract("SINONIM")),
      await authorWith(""),
      await authorWith({ ...goldContract("ANTONIM"), decision: "REJECT", question: null }),
    ];
    const s = summarizeAuthoring(records);
    return s.total === 3 && s.gold === 1 && s.humanReview === 1 && s.rejected === 1 && s.errorCodes["INVALID_CONTRACT"] === 1;
  });
  check("T.27 authoringCandidate helper export ada", () => {
    return typeof authoringCandidate === "function" || authoringCandidate !== undefined;
  });

  await new Promise((r) => setTimeout(r, 50));

  // Kanari "check(false) → FAIL" sengaja tercatat sebagai failure — bukti framework hidup.
  const realFailures = failures.filter((f) => !f.startsWith("SELF: check(false) → FAIL"));
  console.log(
    `\nRESULT: ${passed} passed, ${failed} failed (kanari 1; real fail ${realFailures.length})` +
      (realFailures.length ? " — " + realFailures.join(", ") : "")
  );
  process.exit(realFailures.length > 0 ? 1 : 0);
}

main();