/**
 * STEP 7.0 — test:question-bank-quality-audit
 *
 * Audit deterministik kualitas bank soal BahasaCerdas dari SUMBER KEBENARAN
 * (file JSON yang men-seed DB — DB produksi tidak dapat dibaca lokal karena
 * env DATABASE_URL di-mask `[SENSITIVE]` oleh Vercel).
 *
 * Sumber:
 *  - data/question-bank/master/*.json  — Bank Soal utama (1500 soal, seed Soal)
 *  - data/question-bank/ukbi/**        — bank UKBI
 *  - data/question-bank/tka/**         — bank TKA
 *  - lib/game/question-bank.ts         — bank game solo
 *  - scripts/seed-jalur-dedupe-data/*.ts — Jalur Cerdas
 *
 * Harness: check("nama", () => kondisi) — false => FAIL, true => PASS.
 * Discovered == Executed == Passed + Failed (tidak ada skip).
 * READ ONLY — 0 write, 0 migration.
 */
import fs from "fs";
import path from "path";

// ── Harness ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];
const executed: string[] = [];

function check(name: string, fn: () => boolean) {
  executed.push(name);
  let ok = false;
  try {
    ok = fn() === true;
  } catch {
    ok = false;
  }
  if (ok) passed++;
  else {
    failed++;
    failures.push(name);
  }
}

// Self-test harness (meta-test evaluator, bukan data soal).
const evaluate = (fn: () => boolean) => {
  try {
    return fn() === true;
  } catch {
    return false;
  }
};
check("self-test: ekspresi true dinilai PASS", () => evaluate(() => true) === true);
check("self-test: ekspresi false dinilai FAIL", () => evaluate(() => false) === false);

// ── Loader ────────────────────────────────────────────────────────────────
interface MasterQ {
  kodeSoal?: string;
  judul?: string;
  tema?: string;
  kelas?: string;
  semester?: number | null;
  kompetensi?: string;
  indikator?: string;
  difficulty?: string;
  levelBerpikir?: number | null;
  type?: string;
  text?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  kataKunci?: string[];
}

const MASTER_DIR = path.join(process.cwd(), "data/question-bank/master");
const UKBI_DIR = path.join(process.cwd(), "data/question-bank/ukbi");
const TKA_DIR = path.join(process.cwd(), "data/question-bank/tka");

function loadJson<T>(p: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T[];
  } catch (e) {
    return [] as T[];
  }
}

function masterFiles(): string[] {
  return fs.readdirSync(MASTER_DIR).filter((f) => f.endsWith(".json") && f !== "types.ts");
}
function walkJson(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJson(full));
    else if (e.name.endsWith(".json")) out.push(full);
  }
  return out;
}

const masterAll: MasterQ[] = masterFiles().flatMap((f) => loadJson<MasterQ>(path.join(MASTER_DIR, f)));

// normalize untuk deteksi duplikat (huruf kecil, strip tanda baca/whitespace)
const norm = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

const VALID_DIFF = new Set(["MUDAH", "SEDANG", "SULIT", "EASY", "MEDIUM", "HARD"]);
const VALID_TYPE = new Set(["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT", "PILIHAN_GANDA_KOMPLEKS", "MENJODOHKAN", "URAIAN"]);

// ── 1. Completeness ────────────────────────────────────────────────────────
check("bank master: semua soal punya kodeSoal", () => masterAll.every((q) => !!q.kodeSoal));
check("bank master: semua soal punya text (stem) tidak kosong", () =>
  masterAll.every((q) => typeof q.text === "string" && q.text.trim().length > 0));
check("bank master: semua soal punya options minimal 1", () =>
  masterAll.every((q) => Array.isArray(q.options) && q.options.length >= 1));
check("bank master: semua soal punya correctAnswer", () =>
  masterAll.every((q) => typeof q.correctAnswer === "string" && q.correctAnswer !== ""));
check("bank master: tidak ada opsi kosong", () =>
  masterAll.every((q) => q.options!.every((o) => typeof o === "string" && o.trim().length > 0)));

// ── 2. Answer key integrity ────────────────────────────────────────────────
const keyOutOfRange = masterAll.filter((q) => {
  const t = q.type;
  const ca = q.correctAnswer!;
  if (t === "BENAR_SALAH") {
    return !(ca === "0" || ca === "1" || ca === "Benar" || ca === "Salah");
  }
  if (t === "ISIAN_SINGKAT" || t === "URAIAN") {
    return ca !== "0" && !q.options!.some((o) => norm(o) === norm(ca));
  }
  const idx = parseInt(ca, 10);
  return Number.isNaN(idx) || idx < 0 || idx >= q.options!.length;
});
check("bank master: tidak ada correctAnswer di luar jangkauan opsi", () => keyOutOfRange.length === 0);

// ── 3. Option integrity ────────────────────────────────────────────────────
const dupOptionQ = masterAll.filter((q) => {
  const seen = new Set<string>();
  for (const o of q.options!) {
    const n = norm(o);
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
});
check("bank master: tidak ada opsi duplikat dalam satu soal", () => dupOptionQ.length === 0);

// ── 4. Type integrity ──────────────────────────────────────────────────────
const bsWrongOptions = masterAll.filter(
  (q) => q.type === "BENAR_SALAH" && !(q.options!.length === 2 && norm(q.options![0]) === "benar" && norm(q.options![1]) === "salah")
);
check("bank master: BENAR_SALAH selalu berisi tepat [Benar, Salah]", () => bsWrongOptions.length === 0);

const pgTooFew = masterAll.filter((q) => q.type === "PILIHAN_GANDA" && q.options!.length < 2);
check("bank master: PILIHAN_GANDA punya minimal 2 opsi", () => pgTooFew.length === 0);

const invalidType = masterAll.filter((q) => !VALID_TYPE.has(q.type!));
check("bank master: type termasuk set yang dikenal", () => invalidType.length === 0);

// ── 5. Duplicate detection (exact normalized, dalam file & lintas file) ───
const seenByText = new Map<string, string[]>();
const dupGroups: { text: string; kodes: string[] }[] = [];
for (const q of masterAll) {
  const n = norm(q.text!) + "|" + q.options!.map(norm).join("|") + "|" + q.correctAnswer;
  const kodes = seenByText.get(n) ?? [];
  kodes.push(q.kodeSoal!);
  seenByText.set(n, kodes);
}
for (const [n, kodes] of seenByText) {
  if (kodes.length > 1) dupGroups.push({ text: n.split("|")[0], kodes });
}
check("bank master: tidak ada soal duplikat persis (text+opsi+jawaban)", () => dupGroups.length === 0);

// ── 6. Metadata consistency ────────────────────────────────────────────────
check("bank master: difficulty valid (MUDAH/SEDANG/SULIT)", () =>
  masterAll.every((q) => VALID_DIFF.has(q.difficulty ?? "")));
check("bank master: kelas (grade) selalu ada", () => masterAll.every((q) => typeof q.kelas === "string" && q.kelas !== ""));
check("bank master: kompetensi selalu ada", () => masterAll.every((q) => typeof q.kompetensi === "string" && q.kompetensi !== ""));
check("bank master: levelBerpikir dalam 1..6 (Bloom)", () =>
  masterAll.every((q) => q.levelBerpikir == null || (q.levelBerpikir! >= 1 && q.levelBerpikir! <= 6)));
check("bank master: tema diisi", () => masterAll.every((q) => typeof q.tema === "string" && q.tema !== ""));

// ── 7. Synonym/Antonym metadata vs konten ──────────────────────────────────
const sinonims = masterAll.filter((q) => (q.tema ?? "").toLowerCase() === "sinonim");
const antonims = masterAll.filter((q) => (q.tema ?? "").toLowerCase() === "antonim");
const sinonimNoKata = sinonims.filter((q) => !/sinonim/i.test(q.text!));
const antonimNoKata = antonims.filter((q) => !/antonim/i.test(q.text!));
check("bank sinonim: setiap stem memuat kata 'sinonim' (metadata konsisten)", () => sinonimNoKata.length === 0);
check("bank antonim: setiap stem memuat kata 'antonim' (metadata konsisten)", () => antonimNoKata.length === 0);

// ── 8. Isian — pola "Jelaskan..." dengan opsi tunggal kata (suspect) ───────
const isianJelaskan = masterAll.filter(
  (q) => q.type === "ISIAN_SINGKAT" && /jelaskan/i.test(q.text!) && q.options!.length === 1
);
check("bank master: ISIAN_SINGKAT 'Jelaskan...' tidak memakai opsi tunggal (format jawaban cocok)", () =>
  isianJelaskan.length === 0);

// ── 9. Template repeat — stem berulang dengan jawaban sama (generated) ─────
const textCount = new Map<string, string[]>();
for (const q of masterAll) {
  const n = norm(q.text!);
  const kodes = textCount.get(n) ?? [];
  kodes.push(q.kodeSoal!);
  textCount.set(n, kodes);
}
const repeatedStems = [...textCount.entries()].filter(([, k]) => k.length > 1);
check("bank master: tidak ada stem yang diulang lebih dari sekali", () => repeatedStems.length === 0);

// ── 10. Explanation quality (heuristik) ────────────────────────────────────
const templatedExplanation = masterAll.filter(
  (q) => !!q.explanation && /adalah jawaban yang tepat|konsep yang dimaksud|perlu dipahami dengan baik/i.test(q.explanation)
);
check("bank master: tidak ada explanation template kosong ('...jawaban yang tepat...')", () =>
  templatedExplanation.length === 0);

// ── 11. UKBI / TKA structural (opsi A-D + correctAnswer) ───────────────────
interface UkbiQ {
  id?: string;
  options?: { id?: string; text?: string }[];
  correctAnswer?: string;
  questionType?: string;
  difficulty?: number | string;
}
interface UkbiWrapper {
  questions?: UkbiQ[];
}
const loadWrapper = (f: string): UkbiQ[] => {
  try {
    const raw = JSON.parse(fs.readFileSync(f, "utf-8")) as unknown;
    if (Array.isArray(raw)) return raw as UkbiQ[];
    const w = raw as { questions?: UkbiQ[] };
    return w.questions ?? [];
  } catch {
    return [];
  }
};
const ukbiAll = walkJson(UKBI_DIR).flatMap((f) => loadWrapper(f).map((q) => ({ ...q, _file: f })));
const tkaAll = walkJson(TKA_DIR).flatMap((f) => loadWrapper(f).map((q) => ({ ...q, _file: f })));

const ukbiOptionErrors = ukbiAll.filter((q) => {
  const constructed = q.questionType === "CONSTRUCTED" || !Array.isArray(q.options) || q.options.length === 0;
  return !constructed && !q.options.some((o) => o.id === q.correctAnswer);
});
check("UKBI: correctAnswer ada di opsi (non-CONSTRUCTED)", () => ukbiOptionErrors.length === 0);
const tkaOptionErrors = tkaAll.filter(
  (q) => !Array.isArray(q.options) || q.options.length === 0 || !q.options.some((o) => o.id === q.correctAnswer)
);
check("TKA: correctAnswer ada di opsi", () => tkaOptionErrors.length === 0);

// ── 12. Game bank (lib/game/question-bank.ts) ──────────────────────────────
import { QUESTION_BANK } from "../lib/game/question-bank";
check("game bank: jawaban dalam jangkauan opsi", () =>
  QUESTION_BANK.every((q) => q.jawaban >= 0 && q.jawaban < q.opsi.length));
check("game bank: tidak ada opsi duplikat (case-insensitive, tanpa normalisasi spasi)", () =>
  QUESTION_BANK.every((q) => {
    const lower = q.opsi.map((o) => o.toLowerCase());
    return new Set(lower).size === lower.length;
  }));
check("game bank: tidak ada stem duplikat", () => {
  const seen = new Set<string>();
  for (const q of QUESTION_BANK) {
    const n = norm(q.soal);
    if (seen.has(n)) return false;
    seen.add(n);
  }
  return true;
});

// ── 13. Jalur Cerdas (seed-jalur-dedupe-data) ──────────────────────────────
const JALUR_DIR = path.join(process.cwd(), "scripts/seed-jalur-dedupe-data");
let jalurCount = 0;
let jalurBad = 0;
if (fs.existsSync(JALUR_DIR)) {
  const files = fs.readdirSync(JALUR_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith("types.ts"));
  for (const f of files) {
    const src = fs.readFileSync(path.join(JALUR_DIR, f), "utf-8");
    const qs = [...src.matchAll(/\{ id: "(\w+)", tipe: "(\w+)", soal: "([^"]*)", opsi: (\[[^\]]*\])?[^}]*jawaban: ([^,}]+),/g)];
    for (const m of qs) {
      jalurCount++;
      const [, , tipe, soal, , jawabanRaw] = m;
      if (!soal || !soal.trim()) jalurBad++;
      if (tipe === "pilihan_ganda" || tipe === "benar_salah") {
        const opsi = (m[4] ?? "").match(/"[^"]+"/g) ?? [];
        const jb = jawabanRaw.trim().replace(/"/g, "");
        const idx = parseInt(jb, 10);
        if (tipe === "pilihan_ganda" && (Number.isNaN(idx) || idx < 0 || idx >= opsi.length)) jalurBad++;
        if (tipe === "benar_salah" && jb !== "Benar" && jb !== "Salah") jalurBad++;
      }
    }
  }
}
check("jalur cerdas: semua soal punya stem", () => jalurCount > 0 && jalurBad === 0);

// ── Summary ────────────────────────────────────────────────────────────────
const totalChecked = executed.length;
console.log(`\n========== QUESTION BANK QUALITY AUDIT ==========`);
console.log(`Banks: master ${masterAll.length} | ukbi ${ukbiAll.length} | tka ${tkaAll.length} | game ${QUESTION_BANK.length} | jalur ${jalurCount}`);
console.log(`Dup groups (exact): ${dupGroups.length} | Repeated stems: ${repeatedStems.length}`);
console.log(`BS wrong options: ${bsWrongOptions.length} | Isian 'Jelaskan' 1-opsi: ${isianJelaskan.length}`);
console.log(`Explanation template: ${templatedExplanation.length} | Sinonim tanpa kata: ${sinonimNoKata.length} | Antonim tanpa kata: ${antonimNoKata.length}`);
console.log(`\nDiscovered: ${totalChecked}`);
console.log(`Executed:   ${totalChecked}`);
console.log(`Passed:     ${passed}`);
console.log(`Failed:     ${failed}`);
if (failures.length) {
  console.log(`\nFAILED CHECKS:`);
  for (const f of failures) console.log(`  ✗ ${f}`);
}
console.log(`\nRESULT: ${failed === 0 ? "SEMUA LULUS ✅" : `${failed} GAGAL ✗`}`);
process.exit(failed === 0 ? 0 : 1);
