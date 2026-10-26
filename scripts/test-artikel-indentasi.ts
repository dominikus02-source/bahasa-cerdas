/**
 * TEST — indentasi karya/puisi di halaman artikel (bug "Di Pagi Kau Pergi", 2026-10-26).
 *
 * Baris puisi yang menjorok >= 4 spasi dulu diparse Markdown sebagai blok kode
 * (<pre><code>, monospace, melebar keluar layar ponsel). Tes ini memastikan:
 *  A. Baris menjorok menjadi paragraf biasa dengan indentasi NBSP (tanpa <pre>/<code>).
 *  B. Markdown sah tetap utuh: blok kode berpagar, daftar bersarang, kutipan, tabel.
 *  C. Sanitasi TIDAK melemah: HTML mentah tetap tidak dirender (tanpa rehype-raw).
 *  D. Halaman artikel & pratinjau guru memakai helper; CSS anti-overflow ada.
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { isKaryaBerbaris, MAX_INDENT_COLUMNS, preserveLeadingIndentation } from "../lib/artikel/preserve-indentation";

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;
function ok(desc: string, cond: boolean, extra = "") {
  if (cond) { passed++; console.log(`PASS  ${desc}`); }
  else { failed++; console.log(`FAIL  ${desc}${extra ? ` — ${extra}` : ""}`); }
}
const render = (md: string) =>
  renderToStaticMarkup(React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm, remarkBreaks] }, md));
const NBSP = "\u00A0";

// Cuplikan pola "Di Pagi Kau Pergi" (indentasi spasi & tab, bait menjorok).
const PUISI = [
  "Di Pagi Kau Pergi",
  "",
  "                              (Puisi untuk Bagas)",
  "",
  "Di pagi kau pergi",
  "Kuterpaku diam membatu",
  "",
  "                    Di pagi kau pergi",
  "                    Ku masih genggam hangatnya tanganmu",
  "\t\tKu masih cium wangi rambutmu",
  "  Ku masih kenang senyum hangatmu",
].join("\n");

// ── A. Puisi ──
{
  const before = render(PUISI);
  ok("A0. (kontrol) tanpa helper, baris menjorok memang jadi <pre><code>", /<pre><code>/.test(before));
  const html = render(preserveLeadingIndentation(PUISI));
  ok("A1. Tanpa <pre>/<code> setelah helper", !/<pre|<code/.test(html), html.slice(0, 200));
  ok("A2. Indentasi dipertahankan sebagai NBSP", html.includes(`${NBSP.repeat(20)}Di pagi kau pergi`));
  ok("A3. Tab diperluas ke kolom (2 tab = 8 NBSP)", html.includes(`${NBSP.repeat(8)}Ku masih cium`) && !html.includes(`${NBSP.repeat(9)}Ku masih cium`));
  ok("A4. Indentasi 1–3 spasi juga dipertahankan", html.includes(`${NBSP.repeat(2)}Ku masih kenang`));
  ok(`A5. Indentasi dibatasi ${MAX_INDENT_COLUMNS} kolom (tidak mendorong keluar layar)`,
    html.includes(`${NBSP.repeat(MAX_INDENT_COLUMNS)}(Puisi untuk Bagas)`) && !html.includes(`${NBSP.repeat(MAX_INDENT_COLUMNS + 1)}(Puisi`));
  ok("A6. Teks puisi utuh", ["Kuterpaku diam membatu", "hangatnya tanganmu"].every((t) => html.includes(t)));
  ok("A7. CRLF dinormalisasi", !preserveLeadingIndentation("a\r\n    b").includes("\r"));
  ok("A8. Konten kosong aman", preserveLeadingIndentation(null) === "" && preserveLeadingIndentation("") === "");
}

// ── B. Markdown sah tidak rusak ──
{
  const fenced = render(preserveLeadingIndentation("```\n    kode_menjorok()\n```"));
  ok("B1. Blok kode berpagar tetap <pre><code> dengan spasi asli", /<pre><code>    kode_menjorok\(\)/.test(fenced), fenced);
  const tilde = render(preserveLeadingIndentation("~~~\n    x\n~~~\n    puisi"));
  ok("B2. Pagar ~~~ ditutup benar; baris sesudahnya kembali jadi teks", /<pre><code>    x/.test(tilde) && tilde.includes(`${NBSP.repeat(4)}puisi`));
  const nested = render(preserveLeadingIndentation("- satu\n    - dua\n- tiga"));
  ok("B3. Daftar bersarang tetap <ul> di dalam <li>", /<li>satu\s*<ul>\s*<li>dua<\/li>/.test(nested), nested);
  const ol = render(preserveLeadingIndentation("1. a\n    1. b"));
  ok("B4. Daftar bernomor bersarang tetap", /<ol>[\s\S]*<ol>[\s\S]*<li>b<\/li>/.test(ol));
  const quote = render(preserveLeadingIndentation("  > kutipan"));
  ok("B5. Kutipan menjorok tetap <blockquote>", /<blockquote>/.test(quote));
  const table = render(preserveLeadingIndentation("  | a | b |\n  |---|---|\n  | 1 | 2 |"));
  ok("B6. Tabel menjorok tetap <table>", /<table>/.test(table));
}

// ── C. Sanitasi tidak melemah ──
{
  const evil = [
    "    <script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "      <iframe src=\"javascript:alert(1)\"></iframe>",
    "[klik](javascript:alert(1))",
  ].join("\n\n");
  const html = render(preserveLeadingIndentation(evil));
  ok("C1. <script> tidak dirender sebagai elemen", !/<script/i.test(html));
  ok("C2. <img onerror> tidak dirender sebagai elemen", !/<img/i.test(html));
  ok("C3. <iframe> tidak dirender sebagai elemen", !/<iframe/i.test(html));
  ok("C4. Tautan javascript: dinetralkan", !/href="javascript:/i.test(html));
  const page = fs.readFileSync(path.join(ROOT, "app/artikel/[slug]/page.tsx"), "utf8");
  const preview = fs.readFileSync(path.join(ROOT, "app/(dashboard)/guru/artikel/page.tsx"), "utf8");
  ok("C5. Halaman artikel & pratinjau tidak memakai rehype-raw / dangerouslySetInnerHTML",
    ![page, preview].some((s) => /rehype-raw|rehypeRaw|dangerouslySetInnerHTML/.test(s)));
}

// ── D. Pemasangan + CSS ──
{
  const page = fs.readFileSync(path.join(ROOT, "app/artikel/[slug]/page.tsx"), "utf8");
  const preview = fs.readFileSync(path.join(ROOT, "app/(dashboard)/guru/artikel/page.tsx"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
  const cover = fs.readFileSync(path.join(ROOT, "components/shared/ArticleCoverLightbox.tsx"), "utf8");
  ok("D1. Halaman artikel memakai preserveLeadingIndentation", /preserveLeadingIndentation\(artikel\.content\)/.test(page));
  ok("D2. Pratinjau editor guru memakai helper yang sama", /preserveLeadingIndentation\(form\.content\)/.test(preview));
  ok("D3. Halaman artikel memilih articleType untuk mode puisi", /articleType: true/.test(page) && /isKaryaBerbaris\(/.test(page));
  ok("D4. CSS: pre membungkus & tidak melebar", /\.artikel-content pre \{[\s\S]*?white-space: pre-wrap;/.test(css) && /\.artikel-content \{[\s\S]*?overflow-wrap: break-word;/.test(css));
  ok("D5. CSS: puisi rata kiri", /\.artikel-content\.artikel-content--berbaris p \{ text-align: left; \}/.test(css));
  ok("D6. Placeholder cover selebar kartu (w-full)", /mb-2 aspect-video w-full overflow-hidden/.test(cover));
  ok("D7. isKaryaBerbaris: PUISI / tag 'karya puisi' / bukan artikel biasa",
    isKaryaBerbaris("PUISI", []) && isKaryaBerbaris(null, ["karya puisi"]) && !isKaryaBerbaris("ARTIKEL", ["literasi"]));
}

console.log(`\nARTIKEL INDENTASI — Passed: ${passed}, Failed: ${failed}`);
process.exit(failed ? 1 : 0);
