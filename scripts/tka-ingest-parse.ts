/**
 * TKA Ingestion — FINAL parser "Soal TKA" folder → canonical JSON + integrity report.
 *
 * Design (faithful to source, no content rewriting):
 *   - Line-stream parse of PARA_*.txt (paragraph-level docx extraction with <w:br/> → \n).
 *   - Question block = from "N. " line to next "N. " line.
 *   - Shared stimulus declarations ("Teks untuk soal nomor X s.d. Y!") attach their body
 *     text to every question in the declared range as `passage`.
 *   - Intra-block pre-option lines (stimuli like memo/kutipan) become per-question `passage`.
 *   - Stem = the actual question line (last meaningful pre-option line after filtering
 *     meta instructions like "Pilihlah jawaban yang benar!").
 *   - Answer keys paired SEQUENTIALLY (source order), verified CONTENT-BASED
 *     (key text ↔ option text, letters must exist in options; grid rows label-aligned).
 *     IX1 skips printed number 20 (25 questions, 25 keys) — sequential order is authoritative.
 *
 * Output:
 *   data/question-bank/tka/smp/soal-tka-ix/set-001.json  (seed-tka-all-tracks format)
 *   /tmp/tka-ingest-report.json                          (parsing + answer-key integrity report)
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// CLI:
//   npx tsx scripts/tka-ingest-parse.ts --in <DIR> [--source "<ORIGINAL SOURCE DIR>"]
//
//   --in      directory containing the extracted paragraph files (PARA_*.txt, KUNCI_*.txt)
//             produced by scripts/tka-ingest-docx-paras.ts --source <SOURCE DIR>
//   --source  original source directory (recorded in the report for provenance only; optional)
//
// Defaults keep the one-time-ingestion workflow reproducible without any machine-specific
// absolute paths baked into the code.
function cliArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const TMP = cliArg("--in") ?? "/tmp/tka-src-text";
const SOURCE_DIR_PROVENANCE =
  cliArg("--source") ?? "(original source dir not recorded — pass --source at extraction time)";
const OUT_DIR = path.join(__dirname, "..", "data", "question-bank", "tka", "smp", "soal-tka-ix");
const REPORT_PATH = path.join(__dirname, "..", "docs", "TKA_INGESTION_PARSE_REPORT.json");

interface ParsedOption { id: string; text: string; }
interface ParsedQuestion {
  setId: string;
  sourceNumber: number;
  orderIndex: number;
  stem: string;
  passage: string | null;
  options: ParsedOption[];
  type: "PILIHAN_GANDA" | "MULTI_ANSWER" | "TRUE_FALSE_GRID";
  keyRaw: string | null;
  keyLetters: string[];
  keyMatched: boolean;
  section: string;
  sourceHash: string;
  warnings: string[];
}

const META_INSTRUCTION =
  /^(Pilihlah jawaban yang benar|Jawaban (benar )?(dapat )?lebih dari satu|Tentukan (Setuju|apakah)|Jawaban dapat lebih dari satu)/i;

function norm(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function looseEqual(a: string, b: string): boolean {
  const clean = (x: string) =>
    norm(x)
      .replace(/["""''']/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\.{2,}|…/g, "");
  const na = clean(a);
  const nb = clean(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return longer.includes(shorter) && shorter.length >= 8;
}

// ---------------- KUNCI ----------------

interface KeyEntry { raw: string; }

function parseKunciSequenced(file: string): KeyEntry[] {
  const raw = fs.readFileSync(path.join(TMP, file), "utf8");
  const entries: KeyEntry[] = [];
  const re = /Kunci Jawaban:\s*([\s\S]*?)(?=Kunci Jawaban:|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) entries.push({ raw: m[1].trim().replace(/\s+/g, " ") });
  return entries;
}

function parseKunciBareLetters(file: string): KeyEntry[] {
  const raw = fs.readFileSync(path.join(TMP, file), "utf8");
  return raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /^[A-E]$/.test(l))
    .map((l) => ({ raw: l }));
}

function lettersFromKey(raw: string): string[] {
  const trimmed = raw.trim();
  const bare = trimmed.match(/^([A-E])$/);
  if (bare) return [bare[1]];
  const out: string[] = [];
  const re = /([A-E])\.\s/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) out.push(m[1]);
  return out;
}

function gridValuesFromKey(raw: string): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const re = /([A-E])\.\s*(Benar|Salah|Setuju|Tidak Setuju|Tidaksetuju)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    let v = m[2].replace(/\s+/g, " ").trim();
    v = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    if (v === "Tidaksetuju") v = "Tidak Setuju";
    out.push({ label: m[1], value: v });
  }
  return out;
}

// ---------------- SOAL ----------------

const HEADER_PATTERNS = [
  /^SOAL TKA BAHASA INDONESIA KELAS IX$/i,
  /^[IVX]+\.$/,          // section markers "II." "III."
  /^\s*$/,
];

interface StimulusDecl { start: number; end?: number; }

function parseSoalDoc(file: string, setId: string): ParsedQuestion[] {
  const raw = fs.readFileSync(path.join(TMP, file), "utf8");
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/\u00a0/g, " ").replace(/^\[\d+\]\s?/, "").replace(/\s+$/, ""));

  // locate question-start lines
  const qStarts: number[] = [];
  lines.forEach((l, i) => {
    if (/^\s*\d{1,2}\.\s+\S/.test(l)) qStarts.push(i);
  });

  // shared-stimulus declarations + their captured body (from decl line to next qStart/decl)
  interface Stimulus { decl: StimulusDecl; text: string; line: number; }
  const stimuli: Stimulus[] = [];
  lines.forEach((l, i) => {
    const m =
      l.match(/Teks untuk (?:menjawab )?soal nomor\s*(\d+)\s*(?:[-–]|\s*s\.?d\.?\s*|sampai\s*)\s*(\d+)?/i) ||
      l.match(/(?:Bacalah|Cermatilah|Perhatikanlah?) teks? berikut[^!]*!?\s*(?:untuk (?:menjawab )?soal (?:no|nomor)\s*(\d+)\s*(?:[-–]|sampai|\s*s\.?d\.?\s*)\s*(\d+)?)?/i) ||
      l.match(/(?:Bacalah|Cermatilah|Perhatikanlah?) (?:kedua )?teks (?:prosedur|berikut)[^!]*!(?:\s*untuk[^!]*?soal[^!]*?(\d+)\s*[-–]\s*(\d+))?/i) ||
      l.match(/Perhatikan dan cermati[^!]*!.*?soal no\s*(\d+)\s*[-–]\s*(\d+)/i);
    if (m) {
      const start = parseInt(m[1] || "0", 10);
      const end = m[2] ? parseInt(m[2], 10) : m[1] ? start : undefined;
      if (start > 0) stimuli.push({ decl: { start, end }, text: "", line: i });
    }
  });

  // capture stimulus body: from decl line+1 to next question start (or next decl)
  stimuli.forEach((s) => {
    let end = lines.length;
    for (const q of qStarts) if (q > s.line) { end = q; break; }
    for (const o of stimuli) if (o.line > s.line && o.line < end) end = o.line;
    s.text = lines
      .slice(s.line + 1, end)
      .filter((l) => l.trim().length > 0)
      .join("\n")
      .trim();
  });

  function stimulusFor(qNum: number, nextBlockStart: number): Stimulus | null {
    // A decl applies to this question if it physically precedes the NEXT question block
    // (its captured body ends there) and qNum is inside its declared range. Nearest wins.
    let best: Stimulus | null = null;
    for (const s of stimuli) {
      if (s.line >= nextBlockStart) continue;
      if (s.text.length === 0) continue;
      const inRange = s.decl.end === undefined ? qNum === s.decl.start : qNum >= s.decl.start && qNum <= s.decl.end;
      if (inRange && (!best || s.line > best.line)) best = s;
    }
    return best;
  }

  const questions: ParsedQuestion[] = [];
  qStarts.forEach((start, bi) => {
    const end = bi + 1 < qStarts.length ? qStarts[bi + 1] : lines.length;
    const num = parseInt(lines[start].match(/^\s*(\d{1,2})\./)![1], 10);
    const block = lines.slice(start, end);

    // options region start (first line beginning with A./a.)
    let optionStartIdx = -1;
    let optLower = false;
    for (let i = 1; i < block.length; i++) {
      if (/^[A-E]\.\s*\S/.test(block[i])) { optionStartIdx = i; break; }
      if (/^[a-e]\.\s*\S/.test(block[i])) { optionStartIdx = i; optLower = true; break; }
    }

    const preLines = block.slice(1, optionStartIdx === -1 ? block.length : optionStartIdx).filter((l) => l.trim().length > 0);
    const optLines = optionStartIdx === -1 ? [] : block.slice(optionStartIdx);

    // options (line-per-option; continuation lines append)
    const options: ParsedOption[] = [];
    const letterRe = optLower ? /^[a-e]\.\s*/ : /^[A-E]\.\s*/;
    let cur: ParsedOption | null = null;
    for (const l of optLines) {
      if (letterRe.test(l)) {
        if (cur) options.push(cur);
        cur = { id: l[0].toUpperCase(), text: l.replace(letterRe, "").trim() };
      } else if (cur && l.trim()) {
        cur.text += " " + l.trim();
      }
    }
    if (cur) options.push(cur);

    // strip grid markers, detect grid
    const isGrid = options.some((o) => /\((Benar\/Salah|Setuju\/Tidak Setuju)\)/i.test(o.text));
    if (isGrid) for (const o of options) o.text = o.text.replace(/\s*\((Benar\/Salah|Setuju\/Tidak Setuju)\)\s*/gi, "").trim();

    // stem selection: last pre-line that is not a meta instruction; fallback numbered line
    const meaningful = preLines.filter((l) => !META_INSTRUCTION.test(l.trim()));
    const stem =
      meaningful.length > 0
        ? meaningful[meaningful.length - 1].trim()
        : block[0].replace(/^\s*\d{1,2}\.\s*/, "").trim();
    const contextLines = meaningful.slice(0, -1);

    // passage = shared stimulus (in range) + intra-block context lines
    const stim = stimulusFor(num, end);
    const passageParts: string[] = [];
    if (stim) passageParts.push(stim.text);
    if (contextLines.length > 0) passageParts.push(contextLines.join("\n"));
    const passage = passageParts.length > 0 ? passageParts.join("\n\n") : null;

    // multi-answer detection (non-grid): instruction mentions multiple correct answers
    const blockText = block.join("\n");
    const multiHint = /Jawaban benar lebih dari satu|Jawaban dapat lebih dari satu/i.test(blockText);

    const warnings: string[] = [];
    if (options.length === 0) warnings.push("no-options-detected");

    questions.push({
      setId,
      sourceNumber: num,
      orderIndex: bi + 1,
      stem,
      passage,
      options,
      type: isGrid ? "TRUE_FALSE_GRID" : multiHint ? "MULTI_ANSWER" : "PILIHAN_GANDA",
      keyRaw: null,
      keyLetters: [],
      keyMatched: false,
      section: "membaca", // refined below by classifySection
      sourceHash: "",
      warnings,
    });
  });

  return questions;
}

/** Content-based section classification (drives kompetensi mapping in the seeder). */
function classifySection(q: ParsedQuestion): string {
  const hay = norm(`${q.stem} ${q.passage || ""} ${q.options.map((o) => o.text).join(" ")}`);
  if (/pantun|syair|puisi|citraan|majas|rima|bait|larik/.test(hay)) return "sastra";
  if (/kalimat efektif|ejaan|pleonasme|pemborosan kata|makna kata|peyoras|amelioras|spesialisas|asosias|penyempitan makna|gejala bahasa|daftar pustaka|huruf kapital|tanda baca|konjungsi|imbuhan/.test(hay)) return "kebahasaan";
  return "membaca";
}

// ---------------- pairing + emit ----------------

function sha(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function main(): void {
  const sources: { doc: string; kunci: string; set: string }[] = [
    { doc: "PARA_1.txt", kunci: "KUNCI_JAWABAN_I.txt", set: "IX1" },
    { doc: "PARA_2.txt", kunci: "KUNCI_JAWABAN_II.txt", set: "IX2" },
    { doc: "PARA_3.txt", kunci: "KUNCI_JAWABAN_III.txt", set: "IX3" },
  ];

  const report: any = { generatedAt: new Date().toISOString(), sources: [], blockedSources: [] };
  const all: ParsedQuestion[] = [];

  for (const src of sources) {
    const qs = parseSoalDoc(src.doc, src.set);
    const keys = src.set === "IX3" ? parseKunciBareLetters(src.kunci) : parseKunciSequenced(src.kunci);

    const sReport: any = { set: src.set, questionsParsed: qs.length, keysParsed: keys.length, countMatch: qs.length === keys.length, pairings: [] };

    qs.forEach((q, i) => {
      const key = keys[i];
      if (!key) {
        q.warnings.push("no-key-at-position");
        sReport.pairings.push({ sourceNumber: q.sourceNumber, status: "NO_KEY" });
        all.push(q);
        return;
      }
      q.keyRaw = key.raw;
      if (q.type === "TRUE_FALSE_GRID") {
        const gv = gridValuesFromKey(key.raw);
        q.keyLetters = gv.map((g) => g.value);
        q.keyMatched = gv.length === q.options.length && gv.every((g, gi) => g.label === q.options[gi].id);
        if (!q.keyMatched) q.warnings.push(`grid-key-mismatch keyRows=${gv.length} rows=${q.options.length}`);
      } else {
        const letters = lettersFromKey(key.raw);
        q.keyLetters = letters;
        // Deterministic re-classification: the answer key's SHAPE is authoritative.
        // A key that selects >1 option makes the question MULTI_ANSWER regardless of
        // wording hints (the docs only sometimes say "Pilih semua jawaban yang benar").
        // The active pool is single-select, so a multi-option key must never remain
        // PILIHAN_GANDA — such a question would be unscoreable (engine: ua === correctAnswer).
        if (q.type === "PILIHAN_GANDA" && letters.length > 1) {
          q.type = "MULTI_ANSWER";
          q.warnings.push("reclassified-multi-from-key-shape");
        }
        const isBare = /^[A-E]$/.test(key.raw.trim());
        let matched = letters.length > 0 && letters.every((L) => q.options.some((o) => o.id === L));
        if (matched && !isBare && letters.length === 1) {
          const keyText = key.raw.replace(/^[A-E]\.\s*/, "").trim();
          if (keyText.length > 0 && !/^\(\d/.test(keyText)) {
            const opt = q.options.find((o) => o.id === letters[0])!;
            if (!looseEqual(keyText, opt.text)) {
              q.warnings.push(`content-mismatch key="${keyText.slice(0, 40)}" opt="${opt.text.slice(0, 40)}"`);
              matched = false;
            }
          }
        }
        q.keyMatched = matched;
        if (!matched) q.warnings.push("key-not-verified");
      }
      q.section = classifySection(q);
      q.sourceHash = sha(norm(q.stem) + "|" + q.options.map((o) => norm(o.text)).join("|"));
      sReport.pairings.push({
        sourceNumber: q.sourceNumber,
        type: q.type,
        section: q.section,
        status: q.keyMatched ? "OK" : "UNVERIFIED",
        warnings: q.warnings,
      });
      all.push(q);
    });

    report.sources.push(sReport);
  }

  // ---- blocked sources (no readable questions / no key) ----
  report.blockedSources = [
    {
      file: "LATIHAN SOAL TKA BAHASA INDONESIA SMPN 28 MUARO JAMBI OLEH YAYUK PURWANTI.pdf",
      reason: "scanned PDF without text layer (30 pages → 60 chars) — questions unreadable; its key file (Kunci_Jawaban_Latihan_Soal_TKA_Bahasa_Indonesia.docx, 30 rows) has nothing reliable to attach to",
      questions: 0,
      disposition: "BLOCKED — requires OCR or digital source from owner",
    },
    {
      file: "PAKET 1 UJI COBA TKA BAHASA INDONESIA.pdf",
      reason: "29 questions readable (text layer OK) but NO answer key exists anywhere in the folder",
      questions: 29,
      disposition: "BLOCKED — answer key required before ingestion (hard gate: no guessing)",
    },
    {
      file: "Kunci_Jawaban_Latihan_Soal_TKA_Bahasa_Indonesia.docx",
      reason: "orphaned key table (30 rows) for the unreadable Yayuk PDF",
      disposition: "RETAINED — will pair automatically if digital source of the questions is provided",
    },
  ];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  // ---- emit canonical JSON ----
  const meta = {
    source: `Soal TKA folder (dokumen guru: SOAL TKA BAHASA INDONESIA KELAS IX 1-3.docx + KUNCI JAWABAN I-III.docx) — original dir: ${SOURCE_DIR_PROVENANCE}`,
    ingestedAt: new Date().toISOString(),
    provenance: "Dokumen soal + kunci asli (answer keys preserved verbatim, content-verified)",
    note: "MULTI_ANSWER & TRUE_FALSE_GRID disimpan dengan status blocked — engine scoring saat ini single-select (isCorrect = answer === correctAnswer); aktifkan setelah engine mendukung multi-select/grid. MULTI_ANSWER ditentukan deterministik dari bentuk kunci (>1 opsi terpilih), bukan dari hint teks.",
  };

  const outQuestions = all.map((q) => {
    const blocked = q.type !== "PILIHAN_GANDA" || !q.keyMatched;
    const item: any = {
      id: `BC-TKA-SMP-SOALTKA-${q.setId}-Q${String(q.sourceNumber).padStart(2, "0")}`,
      product: "TKA_PRACTICE",
      track: "TKA_SMP",
      section: q.section,
      band: "SEDANG",
      type: q.type.toLowerCase(),
      difficulty: 2,
      sourceNumber: q.sourceNumber,
      sourceFile: `SOAL TKA BAHASA INDONESIA KELAS IX ${q.setId.slice(2)}.docx`,
      sourceHash: q.sourceHash,
      stem: q.stem,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      correctAnswer: q.type === "TRUE_FALSE_GRID"
        ? q.options.map((o, i) => `${o.id}. ${q.keyLetters[i]}`).join("")
        : q.keyLetters.join(","),
      explanation: null,
      status: blocked ? "blocked" : "approved",
      source: "SOAL_TKA_KELAS_IX_DOCX",
    };
    if (q.passage) item.passage = q.passage;
    return item;
  });

  const out = { meta, questions: outQuestions };
  const outPath = path.join(OUT_DIR, "set-001.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  // ---- console summary ----
  const summary = {
    total: all.length,
    keyVerified: all.filter((q) => q.keyMatched).length,
    byType: all.reduce((a, q) => ((a[q.type] = (a[q.type] || 0) + 1), a), {} as Record<string, number>),
    bySection: all.reduce((a, q) => ((a[q.section] = (a[q.section] || 0) + 1), a), {} as Record<string, number>),
    blocked: outQuestions.filter((q) => q.status === "blocked").length,
  };
  console.log(JSON.stringify(summary, null, 1));
  console.log(`\nWritten: ${outPath}`);
  const bad = all.filter((q) => !q.keyMatched);
  if (bad.length) {
    console.log("UNVERIFIED:");
    bad.forEach((q) => console.log(`  [${q.setId}#${q.sourceNumber}] ${q.warnings.join("; ")}`));
  }
}

main();
