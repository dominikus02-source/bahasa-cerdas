/**
 * TKA Ingestion — precise DOCX paragraph extraction (incl. tables) via raw XML.
 * Purpose: resolve question-numbering anomalies before ingestion (answer-key shift risk).
 * Output: numbered paragraph list per SOAL docx into /tmp/tka-src-text/PARA_*.txt
 */
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

/** Minimal ZIP reader: inflate a single entry (e.g. word/document.xml) from a docx. */
function readZipEntry(buf: Buffer, entryName: string): Buffer {
  // locate End Of Central Directory
  const eocdSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.compare(eocdSig, 0, 4, i, i + 4) === 0) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip (no EOCD)");
  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdSig = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
  let off = cdOffset;
  for (let n = 0; n < entryCount; n++) {
    if (buf.compare(cdSig, 0, 4, off, off + 4) !== 0) throw new Error("bad central dir at " + off);
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString("utf8");
    if (name === entryName) {
      // local header: read its own name/extra lengths (may differ from central)
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const dataStart = localOff + 30 + lNameLen + lExtraLen;
      const data = buf.slice(dataStart, dataStart + compSize);
      return method === 0 ? data : zlib.inflateRawSync(data);
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error("entry not found: " + entryName);
}

function docxParagraphs(file: string): string[] {
  const xml = readZipEntry(fs.readFileSync(file), "word/document.xml").toString("utf8");
  const paras: string[] = [];
  const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  // tokens: <w:t> content kept; <w:br/> becomes newline (preserves option-line structure)
  // NOTE: <w:t[ >] — a word-boundary guard so `<w:type ...>` (inside <w:sectPr>) does not
  // match as <w:t>; the capture then keeps attributes like ` xml:space="preserve"` out of
  // the text by matching the closing `>` explicitly.
  const tokenRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:br\s*\/>/g;
  let m: RegExpExecArray | null;
  pRegex.lastIndex = 0;
  while ((m = pRegex.exec(xml)) !== null) {
    let text = "";
    let t: RegExpExecArray | null;
    tokenRegex.lastIndex = 0;
    while ((t = tokenRegex.exec(m[0])) !== null) {
      if (t[1] !== undefined) text += t[1];
      else if (t[0].startsWith("<w:br")) text += "\n";
    }
    text = text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    paras.push(text);
  }
  return paras;
}

function main(): void {
  // CLI:
  //   npx tsx scripts/tka-ingest-docx-paras.ts --source "<DIR WITH SOAL/KUNCI DOCX>"
  //   npx tsx scripts/tka-ingest-docx-paras.ts --source "<DIR>" --out /tmp/tka-src-text
  // No machine-specific absolute path is baked in.
  function cliArg(flag: string): string | undefined {
    const i = process.argv.indexOf(flag);
    return i > -1 ? process.argv[i + 1] : undefined;
  }
  const SRC = cliArg("--source");
  if (!SRC || !fs.existsSync(SRC)) {
    console.error("Usage: npx tsx scripts/tka-ingest-docx-paras.ts --source <DIR containing the SOAL/KUNCI docx>");
    process.exit(1);
  }
  const OUT_DIR = cliArg("--out") ?? "/tmp/tka-src-text";
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const targets = [
    "SOAL TKA BAHASA INDONESIA KELAS IX 1.docx",
    "SOAL TKA BAHASA INDONESIA KELAS IX 2.docx",
    "SOAL TKA BAHASA INDONESIA KELAS IX 3.docx",
  ];
  for (const name of targets) {
    const srcPath = path.join(SRC, name);
    if (!fs.existsSync(srcPath)) {
      console.error(`missing required source file: ${srcPath}`);
      process.exit(1);
    }
    const paras = docxParagraphs(srcPath);
    const out = path.join(OUT_DIR, `PARA_${name.replace(/[^0-9]/g, "")}.txt`);
    fs.writeFileSync(out, paras.map((p, i) => `[${String(i).padStart(4, "0")}] ${p}`).join("\n"));
    const nums = new Set<number>();
    for (const p of paras) {
      const mm = p.match(/^\s*(\d{1,2})[.)]\s/);
      if (mm) nums.add(parseInt(mm[1], 10));
    }
    const sorted = [...nums].sort((a, b) => a - b);
    const max = sorted[sorted.length - 1] ?? 0;
    const missing: string[] = [];
    for (let i = 1; i <= max; i++) if (!nums.has(i)) missing.push(String(i));
    console.log(`${name}`);
    console.log(`  paragraphs: ${paras.length}, distinct q-numbers: ${sorted.length}, max: ${max}`);
    console.log(`  numbers: ${sorted.join(",")}`);
    console.log(`  gaps: ${missing.join(",") || "none"}`);
  }

  // KUNCI docx files — required by the parser (KUNCI_JAWABAN_I/II/III.txt)
  const kunciTargets: { file: string; out: string }[] = [
    { file: "KUNCI JAWABAN I.docx", out: "KUNCI_JAWABAN_I.txt" },
    { file: "KUNCI JAWABAN II.docx", out: "KUNCI_JAWABAN_II.txt" },
    { file: "KUNCI JAWABAN III.docx", out: "KUNCI_JAWABAN_III.txt" },
  ];
  for (const { file, out } of kunciTargets) {
    const srcPath = path.join(SRC, file);
    if (!fs.existsSync(srcPath)) {
      console.error(`missing required source file: ${srcPath}`);
      process.exit(1);
    }
    const paras = docxParagraphs(srcPath);
    fs.writeFileSync(path.join(OUT_DIR, out), paras.join("\n"));
    console.log(`${file} → ${out} (${paras.length} paragraphs)`);
  }
}

main();
