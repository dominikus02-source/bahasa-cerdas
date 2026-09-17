/**
 * FOUNDER BANK REPLACEMENT — idempotent importer for /guru/bank-soal.
 *
 * Google Drive = source of truth. The Drive folder's 49 documents (40 already
 * mirrored locally + 9 Drive-native documents, committed under
 * data/founder-bank-soal/) define the FINAL bank: themes and question counts
 * come from the source. NO 50-theme / 2,500-question constraint is applied.
 *
 * Pipeline:
 *   1. Parse all 49 files deterministically (no AI, no rewording).
 *   2. Validate every question (structure, options, key → option).
 *   3. Detect duplicates (exact + normalized stem/content hashes).
 *   4. Dry run (default): print the full reconciliation, touch nothing.
 *      --execute: mutate the DB inside explicit gates below.
 *
 * Mutation plan (single transaction):
 *   - insert new Soal rows   source:"MASTER_BANK", kodeSoal:"BC-GB2-…"
 *                            kelas:"SEMUA" (reusable-library sentinel, no grade)
 *   - retire old rows        MASTER_BANK → MASTER_BANK_RETIRED
 *                            (histories keep their references; nothing deleted)
 *   - retire old themes      themes with zero Founder questions vanish from
 *                            /guru/bank-soal automatically (no rows remain
 *                            active for them)
 *
 * P0.6 delivery gate: founder rows carry human-approved content; their codes
 * are added to DELIVERABLE_MASTER_KODE_SOALS (lib/question-bank/delivery-gate.ts)
 * in a follow-up code change AFTER the DB import is approved and run.
 *
 * Safety: dry-run default; --execute requires env FOUNDER_IMPORT_CONFIRM=YES;
 * re-running the importer is a no-op (kodeSoal unique, upsert-by-code).
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────── config ──
const REPO_DIR = path.join(process.cwd(), "data/founder-bank-soal");
const EXECUTE = process.argv.includes("--execute");
const CONFIRMED = process.env.FOUNDER_IMPORT_CONFIRM === "YES";
const KODE_PREFIX = "BC-GB2-";
const KELAS_SENTINEL = "SEMUA";

// ─────────────────────────────────────── theme map (exact names) ──
// Founder file → theme (topik). Founder names are authoritative: where no DB
// theme matches, the founder name BECOMES the new theme (Phase 6).
const THEME_MAP: Record<string, string> = {
  "BUKU FIKSI DAN NONFIKSI.md": "Buku Fiksi dan Nonfiksi",
  "TATA BAHASA & LITERASI - ARTIKEL.md": "Artikel",
  "TATA BAHASA & LITERASI - FAKTA DAN OPINI.md": "Fakta dan Opini",
  "TATA BAHASA & LITERASI - RINGKASAN DAN KESIMPULAN.md": "Simpulan",
  "TATA BAHASA & LITERASI - TEKS ANEKDOT.md": "Anekdot",
  "TATA BAHASA & LITERASI - TEKS BERITA.md": "Teks Berita",
  "TATA BAHASA & LITERASI - TEKS BIOGRAFI.md": "Teks Biografi",
  "TATA BAHASA & LITERASI - TEKS CERPEN.md": "Cerpen",
  "TATA BAHASA & LITERASI - TEKS EKSPLANASI.md": "Teks Eksplanasi",
  "TATA BAHASA & LITERASI - TEKS EKSPOSISI.md": "Teks Eksposisi",
  "TATA BAHASA & LITERASI - TEKS NEGOSIASI.md": "Teks Negosiasi",
  "TATA BAHASA & LITERASI - TEKS PROSEDUR.md": "Teks Prosedur",
  "TATA BAHASA & LITERASI - TEKS RESENSI.md": "Resensi",
  "TATA BAHASA & SASTRA - GURINDAM.md": "Gurindam",
  "TATA BAHASA & SASTRA - HIKAYAT.md": "Hikayat",
  "TATA BAHASA & SASTRA - LEGENDA.md": "Legenda",
  "TATA BAHASA & SASTRA - MITOS.md": "Mitos",
  "TATA BAHASA & SASTRA - NOVEL.md": "Novel",
  "TATA BAHASA & SASTRA - PANTUN.md": "Pantun",
  "TATA BAHASA & SASTRA - SYAIR.md": "Syair",
  "TATA BAHASA & SASTRA - TEKS DRAMA.md": "Drama",
  "TATA BAHASA & SASTRA - TEKS PUISI.md": "Puisi",
  "TATA BAHASA - EJAAN (HURUF KAPITAL & TANDA BACA).md": "Ejaan",
  "TATA BAHASA - KATA TIDAK BAKU.md": "Kata Tidak Baku",
  "TATA BAHASA - MAJAS (GAYA BAHASA).md": "Majas",
  "TATA BAHASA - MAKNA KATA.md": "Makna Kata",
  "TATA BAHASA - PARAGRAF.md": "Paragraf",
  "TATA BAHASA - PERIBAHASA DAN UNGKAPAN.md": "Peribahasa dan Ungkapan",
  "TEKS CERITA INSPIRATIF.md": "Cerita Inspiratif",
  "TEKS CERITA PENDEK (CERPEN) KOMPLEKS.md": "Cerpen",
  "TEKS DISKUSI.md": "Teks Diskusi",
  "TEKS EDITORIAL (TAJUK RENCANA).md": "Teks Editorial",
  "TEKS EKSPLANASI KOMPLEKS.md": "Teks Eksplanasi",
  "TEKS FABEL & CERITA FANTASI.md": "Fabel",
  "TEKS LAPORAN HASIL OBSERVASI.md": "Laporan Hasil Observasi",
  "TEKS PERSUASI & PIDATO PERSUASIF.md": "Teks Persuasi",
  "TEKS PIDATO DAN RETORIKA PUBLIK.md": "Pidato",
  "TEKS PROSEDUR KOMPLEKS.md": "Teks Prosedur",
  "TEKS TANGGAPAN KRITIS.md": "Teks Tanggapan Kritis",
  "TEKS ULASAN.md": "Teks Ulasan",
  "01_Tata_Bahasa_Antonim_50_Soal.md": "Antonim",
  "02_Tata_Bahasa_Ejaan_50_Soal.md": "Ejaan",
  "03_Tata_Bahasa_SPOK_50_Soal.md": "SPOK",
  "04_Tata_Bahasa_Gagasan_Utama_50_Soal.md": "Gagasan Utama",
  "05_Tata_Bahasa_Ide_Pokok_50_Soal.md": "Ide Pokok",
  "06_Tata_Bahasa_Imbuhan_50_Soal.md": "Imbuhan",
  "07_Tata_Bahasa_Kalimat_Efektif_50_Soal.md": "Kalimat Efektif",
  "08_Tata_Bahasa_Kalimat_50_Soal.md": "Kalimat",
  "09_Tata_Bahasa_Kata_Baku_50_Soal.md": "Kata Baku",
};

// Slug for kodeSoal + difficulty ranges from founder headers (LOTS 1-15,
// MOTS 16-35, HOTS 36-50 in every file so far — but derive per file).
const SLUGS: Record<string, string> = {
  "Buku Fiksi dan Nonfiksi": "BUKUFIKSI", "Artikel": "ARTIKEL", "Fakta dan Opini": "FAKTAOPINI",
  "Simpulan": "SIMPULAN", "Anekdot": "ANEKDOT", "Teks Berita": "TEKSBERITA",
  "Teks Biografi": "BIOGRAFI", "Cerpen": "CERPEN", "Teks Eksplanasi": "EKSLAN",
  "Teks Eksposisi": "EKSPISI", "Teks Negosiasi": "NEGOSIASI", "Teks Prosedur": "PROSEDUR",
  "Resensi": "RESENSI", "Gurindam": "GURINDAM", "Hikayat": "HIKAYAT", "Legenda": "LEGENDA",
  "Mitos": "MITOS", "Novel": "NOVEL", "Pantun": "PANTUN", "Syair": "SYAIR", "Drama": "DRAMA",
  "Puisi": "PUISI", "Ejaan": "EJAAN", "Kata Tidak Baku": "KTDBAKU", "Majas": "MAJAS",
  "Makna Kata": "MAKNAKATA", "Paragraf": "PARAGRAF", "Peribahasa dan Ungkapan": "PERIBAHASA",
  "Cerita Inspiratif": "CERINSPIRATIF", "Teks Diskusi": "DISKUSI", "Teks Editorial": "TEKSEDITORIAL",
  "Fabel": "FABEL", "Laporan Hasil Observasi": "LHO", "Teks Persuasi": "PERSUASI",
  "Pidato": "PIDATO", "Teks Tanggapan Kritis": "TANGKRITIS", "Teks Ulasan": "ULASAN",
  "Antonim": "ANTONIM", "SPOK": "SPOK", "Gagasan Utama": "GAGASANUTAMA",
  "Ide Pokok": "IDEPOKOK", "Imbuhan": "IMBUHAN", "Kalimat Efektif": "KALIMATEFEKTIF",
  "Kalimat": "KALIMAT", "Kata Baku": "KATABAKU",
};

function difficultyFor(num: number, ranges: { lo: number; hi: number } | null): "MUDAH" | "SEDANG" | "SULIT" {
  if (ranges && num >= ranges.lo && num <= ranges.hi) return "SULIT"; // HOTS band
  if (ranges && num >= (ranges.lo - 20)) return "SEDANG";             // MOTS band (16-35)
  if (ranges) return "MUDAH";                                          // LOTS band
  // fallback: founder header absent — neutral default
  return num <= 15 ? "MUDAH" : num <= 35 ? "SEDANG" : "SULIT";
}

// ──────────────────────────────────────── parsing (verbatim) ──
const unescapeDocsExport = (s: string) => s.replace(/\\([.\-*[\]()\\"])/g, "$1");
const normWS = (s: string) => s.replace(/\s+/g, " ").trim();
const normKey = (s: string) => normWS(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ");
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

interface ParsedOption { letter: string; text: string }
interface ParsedQuestion {
  num: number; stem: string; options: ParsedOption[];
  keyLetter: string | null; keyExplanation: string | null;
  stemHash: string; contentHash: string; issues: string[];
}
interface FileReport {
  file: string; theme: string;
  declaredTotal: number | null;
  hotsRange: { lo: number; hi: number } | null;
  keyFormat: string;
  questions: ParsedQuestion[]; valid: number; invalid: number;
  warnings: string[];
}

function parseFile(file: string): FileReport {
  const raw = fs.readFileSync(path.join(REPO_DIR, file), "utf8");
  let text = raw.replace(/\r\n/g, "\n");
  text = unescapeDocsExport(text);

  const warnings: string[] = [];
  const declaredTotal = (() => {
    const m = text.match(/Total Soal[^\d]*(\d{2,4})/i);
    return m ? Number(m[1]) : null;
  })();

  // HOTS range from the header ("Soal 36 - 50" style) → SULIT band
  const hotsRange = (() => {
    const m = text.match(/Tingkat Tinggi[^]*?Soal\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/i);
    return m ? { lo: Number(m[1]), hi: Number(m[2]) } : null;
  })();

  let keyIdx = text.search(/^.*KUNCI JAWABAN.*$/im);
  if (keyIdx < 0) keyIdx = text.search(/^.*\bJAWABAN\b.*$/im);
  if (keyIdx < 0) {
    const m = text.match(/^\d{1,2}\.\s+\*\*[A-E]\*\*.*$/m);
    if (m && m.index !== undefined) keyIdx = m.index;
  }
  const bodyText = keyIdx >= 0 ? text.slice(0, keyIdx) : text;
  const keyText = keyIdx >= 0 ? text.slice(keyIdx) : "";

  // keys: strip bold/escapes; multi-pair table rows + numbered/bulleted lines
  const keys = new Map<number, { letter: string; explanation: string | null }>();
  let tableKeys = 0, bulletKeys = 0;
  const keyPlain = keyText.replace(/\*\*/g, "").replace(/\\([.\-])/g, "$1");
  for (const line of keyPlain.split("\n")) {
    if (!line.trimStart().startsWith("|")) continue;
    const pairs = [...line.matchAll(/\|\s*(\d{1,3})\s*\|\s*([A-Ea-e])\s*(?=\||$)/g)];
    for (const p of pairs) {
      const n = Number(p[1]);
      if (!keys.has(n)) { keys.set(n, { letter: p[2].toUpperCase(), explanation: null }); tableKeys++; }
    }
  }
  for (const line of keyPlain.split("\n")) {
    const m = line.match(/^\s*\*?\s*(\d{1,3})\.\s+([A-Ea-e])\s*(.*)$/);
    if (!m || keys.has(Number(m[1]))) continue;
    const rest = m[3] ?? "";
    const pm = rest.match(/\((.*)\)\s*\.?\s*$/);
    keys.set(Number(m[1]), { letter: m[2].toUpperCase(), explanation: pm ? normWS(pm[1]) : normWS(rest) || null });
    bulletKeys++;
  }
  const keyFormat = tableKeys && bulletKeys ? "MIXED" : tableKeys ? "TABLE" : bulletKeys ? "BULLET" : "NONE";

  const lines = bodyText.split("\n");
  const starts: { num: number; line: number }[] = [];
  lines.forEach((ln, i) => {
    const m = ln.match(/^\s*(\d{1,2})\.\s+\S/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= (declaredTotal ?? 99)) starts.push({ num: n, line: i });
    }
  });
  const seen = new Set<number>();
  const qStarts = starts.filter((s) => (seen.has(s.num) ? false : (seen.add(s.num), true)));

  const questions: ParsedQuestion[] = [];
  for (let qi = 0; qi < qStarts.length; qi++) {
    const { num, line } = qStarts[qi];
    const end = qi + 1 < qStarts.length ? qStarts[qi + 1].line : lines.length;
    const blockLines = lines.slice(line + 1, end);
    const issues: string[] = [];

    const optStarts: { letter: string; line: number }[] = [];
    blockLines.forEach((ln, i) => {
      const m = ln.match(/^\s*([A-E])[.)]\s+\S/);
      if (m) optStarts.push({ letter: m[1].toUpperCase(), line: i });
    });

    const firstOptLine = optStarts.length ? optStarts[0].line : -1;
    const stemLines: string[] = [];
    const upto = firstOptLine < 0 ? blockLines.length : firstOptLine;
    stemLines.push(...blockLines.slice(0, upto));
    stemLines.unshift(lines[line].replace(/^\s*\d{1,2}\.\s*/, ""));
    const stem = normWS(stemLines.join(" "));

    const options: ParsedOption[] = [];
    for (let oi = 0; oi < optStarts.length; oi++) {
      const o = optStarts[oi];
      const oEnd = oi + 1 < optStarts.length ? optStarts[oi + 1].line : blockLines.length;
      const otext = normWS(blockLines.slice(o.line, oEnd).join(" ").replace(/^\s*[A-E][.)]\s*/, ""));
      options.push({ letter: o.letter, text: otext });
    }

    const key = keys.get(num) ?? null;
    if (!stem) issues.push("EMPTY_STEM");
    if (options.length !== 4) issues.push(`OPTION_COUNT_${options.length}`);
    const letters = options.map((o) => o.letter).join("");
    if (letters && letters !== "ABCD") issues.push(`OPTION_LETTERS_${letters}`);
    if (!key) issues.push("NO_KEY");
    if (key && !options.some((o) => o.letter === key.letter)) issues.push("KEY_NOT_IN_OPTIONS");

    const stemHash = sha(normKey(stem));
    const contentHash = sha(normKey(stem + "|" + options.map((o) => o.text).join("|")));
    questions.push({ num, stem, options, keyLetter: key?.letter ?? null, keyExplanation: key?.explanation ?? null, stemHash, contentHash, issues });
  }

  if (qStarts.length !== (declaredTotal ?? qStarts.length)) warnings.push(`declared ${declaredTotal}, found ${qStarts.length}`);
  if (keyFormat === "NONE") warnings.push("NO_KEY_SECTION_FOUND");

  const valid = questions.filter((q) => q.issues.length === 0).length;
  return {
    file, theme: THEME_MAP[file], declaredTotal, hotsRange, keyFormat,
    questions, valid, invalid: questions.length - valid, warnings,
  };
}

// ─────────────────────────────────────────────────────── main ──
const founderFiles = fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".md"));
for (const file of founderFiles) if (!THEME_MAP[file]) {
  console.error(`FATAL: unmapped founder file: ${file}`);
  process.exit(2);
}

const reports = founderFiles.map((file) => parseFile(file));

// duplicates across the whole source
const byContent = new Map<string, { file: string; num: number }[]>();
for (const r of reports)
  for (const q of r.questions) {
    if (!byContent.has(q.contentHash)) byContent.set(q.contentHash, []);
    byContent.get(q.contentHash)!.push({ file: r.file, num: q.num });
  }
const dupGroups = [...byContent.entries()].filter(([, v]) => v.length > 1);
const dupKeys = new Set(
  dupGroups.flatMap(([, occ]) => occ.slice(1).map((o) => `${o.file}#${o.num}`))
);

// canonical unique set: first occurrence wins, provenance lists all sources
interface ImportRow {
  kodeSoal: string; text: string; type: string; difficulty: string;
  options: string[]; correctAnswer: string; explanation: string | null;
  topik: string; sourceProvenance: string;
}
const themeAgg = new Map<string, { files: string[]; rows: ImportRow[]; dupes: number; invalid: number }>();
let seqByTheme = new Map<string, number>();
const allParsedQ = reports.flatMap((r) => r.questions.map((q) => ({ r, q })));
for (const { r, q } of allParsedQ) {
  const slug = SLUGS[r.theme];
  if (!slug) { console.error(`FATAL: no slug for theme ${r.theme}`); process.exit(2); }
  if (q.issues.length > 0) {
    const t = themeAgg.get(r.theme) ?? { files: [], rows: [], dupes: 0, invalid: 0 };
    t.invalid++; themeAgg.set(r.theme, t);
    continue; // blocked question — reported, never repaired
  }
  const dupKey = `${r.file}#${q.num}`;
  const isDup = dupKeys.has(dupKey);
  const t = themeAgg.get(r.theme) ?? { files: [], rows: [], dupes: 0, invalid: 0 };
  if (!t.files.includes(r.file)) t.files.push(r.file);
  if (isDup) { t.dupes++; continue; } // exact content dup → single canonical row
  const seq = (seqByTheme.get(r.theme) ?? 0) + 1;
  seqByTheme.set(r.theme, seq);
  t.rows.push({
    kodeSoal: `${KODE_PREFIX}${slug}-${String(seq).padStart(3, "0")}`,
    text: q.stem,
    type: "PILIHAN_GANDA",
    difficulty: difficultyFor(q.num, r.hotsRange),
    options: q.options.map((o) => o.text),
    correctAnswer: String(q.options.findIndex((o) => o.letter === q.keyLetter)),
    explanation: q.keyExplanation,
    topik: r.theme,
    sourceProvenance: `${r.file}#Q${q.num}`,
  });
  themeAgg.set(r.theme, t);
}

const themes = [...themeAgg.entries()].map(([topik, t]) => ({
  topik, files: t.files, count: t.rows.length, dupes: t.dupes, invalid: t.invalid,
})).sort((a, b) => a.topik.localeCompare(b.topik));
const totalValid = themes.reduce((s, t) => s + t.count, 0);
const totalDupes = themes.reduce((s, t) => s + t.dupes, 0);
const totalInvalid = themes.reduce((s, t) => s + t.invalid, 0);

// ─────────────────────────────────────────────── dry-run print ──
console.log("═══════════ FOUNDER BANK IMPORT — " + (EXECUTE ? "EXECUTE" : "DRY RUN") + " ═══════════");
console.log(`source files: ${founderFiles.length} · parsed: ${reports.length} · valid: ${totalValid} · dupes skipped: ${totalDupes} · blocked: ${totalInvalid}`);
console.log("");
for (const t of themes) console.log(`  ${t.topik.padEnd(28)} ${String(t.count).padStart(3)} soal${t.files.length > 1 ? `  (${t.files.length} files)` : ""}${t.dupes ? `  [${t.dupes} dupes skipped]` : ""}${t.invalid ? `  [${t.invalid} BLOCKED]` : ""}`);
console.log(`\nthemes: ${themes.length} · total importable: ${totalValid}`);
if (!EXECUTE) {
  console.log("\nDRY RUN ONLY — no DB writes. Re-run with --execute (and FOUNDER_IMPORT_CONFIRM=YES) to apply.");
  process.exit(0);
}

if (!CONFIRMED) {
  console.error("EXECUTE requires FOUNDER_IMPORT_CONFIRM=YES");
  process.exit(2);
}

// ─────────────────────────────────────────────── DB mutation ──
async function main(): Promise<void> {
const db = new PrismaClient();
// expected retired = every pre-existing non-founder MASTER_BANK row (live count,
// not a hardcoded baseline)
const result_expectedRetired = await db.soal.count({
  where: { source: "MASTER_BANK", kodeSoal: { not: { startsWith: KODE_PREFIX } } },
});
const guru = await db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } });
if (!guru) { console.error("FATAL: uploader guru@demo.com not found"); process.exit(2); }

const allRows = themes.flatMap((t) => themeAgg.get(t.topik)!.rows);
const result = await db.$transaction(async (tx) => {
  // 1. retire ALL old active master bank rows (MASTER_BANK → MASTER_BANK_RETIRED)
  const retired = await tx.soal.updateMany({
    where: { source: "MASTER_BANK", kodeSoal: { not: { startsWith: KODE_PREFIX } } },
    data: { source: "MASTER_BANK_RETIRED" },
  });
  // 2. insert founder rows in BATCHES. Idempotency: kodeSoal is globally
  // unique — pre-select existing codes and insert only the missing ones, so a
  // rerun performs 0 inserts and 0 updates (approved update:{} semantics).
  const existing = await tx.soal.findMany({
    where: { kodeSoal: { startsWith: KODE_PREFIX } },
    select: { kodeSoal: true },
  });
  const existingSet = new Set(existing.map((e) => e.kodeSoal));
  const fresh = allRows.filter((r) => !existingSet.has(r.kodeSoal));
  let inserted = 0;
  const BATCH = 250;
  for (let i = 0; i < fresh.length; i += BATCH) {
    const slice = fresh.slice(i, i + BATCH);
    const res = await tx.soal.createMany({
      data: slice.map((row) => ({
        kodeSoal: row.kodeSoal, judul: row.topik, text: row.text, type: row.type,
        difficulty: row.difficulty, options: row.options, correctAnswer: row.correctAnswer,
        explanation: row.explanation, topik: row.topik, kelas: KELAS_SENTINEL,
        source: "MASTER_BANK", uploaderId: guru.id,
      })),
      skipDuplicates: true, // belt-and-braces against concurrent same-code inserts
    });
    inserted += res.count;
  }
  // 3. in-transaction invariants — any failure here ROLLS BACK EVERYTHING
  const activeCount = await tx.soal.count({ where: { source: "MASTER_BANK", kodeSoal: { startsWith: KODE_PREFIX } } });
  if (activeCount !== totalValid) throw new Error(`INVARIANT_FAIL: active founder rows ${activeCount} != expected ${totalValid}`);
  const retiredCount = await tx.soal.count({ where: { source: "MASTER_BANK_RETIRED" } });
  // retired must never SHRINK and must equal pre-existing active + retired-this-run
  if (retiredCount !== result_expectedRetired) {
    // post-first-run reruns: everything is already retired — expectedRetired was
    // computed as "active non-founder before txn", which is 0 on a rerun, while
    // RETIRED stays 1.500. Both states are correct; assert the lower bound.
    if (retiredCount < result_expectedRetired) throw new Error(`INVARIANT_FAIL: retired ${retiredCount} < expected ${result_expectedRetired}`);
  }
  const invalidKeys = await tx.soal.count({
    where: { source: "MASTER_BANK", kodeSoal: { startsWith: KODE_PREFIX }, OR: [
      { text: "" }, { correctAnswer: "" },
    ] },
  });
  if (invalidKeys > 0) throw new Error(`INVARIANT_FAIL: ${invalidKeys} rows with empty text/key`);
  return { retired: retired.count, inserted };
}, { timeout: 720000 });

console.log(`\nEXECUTED: retired ${result.retired} old rows → MASTER_BANK_RETIRED; upserted ${result.inserted} founder rows.`);
console.log("NEXT: add founder kodeSoals to DELIVERABLE_MASTER_KODE_SOALS (delivery-gate.ts) then verify UI.");
await db.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
