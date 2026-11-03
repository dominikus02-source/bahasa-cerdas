/**
 * AKU SASTRAWAN — jawaban Pendamping Menulis (NARA).
 *   1. Markdown dirender aman: judul, tebal, daftar, garis — tanpa simbol mentah
 *      (##, **, ---) di DOM; HTML mentah, skrip, tautan javascript:, dan gambar dibuang.
 *   2. Instruksi sistem mewajibkan Bahasa Indonesia penuh (padanan istilah), dan
 *      jaring pengaman server mengganti istilah Inggris (mis. "Stakes (taruhan)").
 *   3. Rute coach memakai instruksi baru + kerahasiaan AI, dan model tidak diubah.
 *
 * Usage: npx tsx scripts/test-aku-sastrawan-pendamping.tsx
 */
import { readFileSync } from "fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NaraMarkdown } from "../components/aku-sastrawan/studio/NaraMarkdown";
import { indonesiakanIstilah, INSTRUKSI_PENDAMPING } from "../lib/aku-sastrawan/instruksi-pendamping";

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); } else { failed++; console.log(`  ❌ ${label}`); }
}

export const CONTOH_JAWABAN = `## Penilaian singkat

Premismu **kuat**: Sekar pulang untuk menyelamatkan warung ibunya.

### Yang bisa dipertajam
- **Taruhan**: apa yang hilang bila Sekar gagal?
- *Tempo cerita* di bagian tengah terasa lambat.

---

1. Tulis ulang adegan pembuka.
2. Tambahkan satu rintangan.

> Tunjukkan, jangan katakan.`;

const html = renderToStaticMarkup(createElement(NaraMarkdown, { teks: CONTOH_JAWABAN }));
const teksSaja = html.replace(/<[^>]+>/g, "");

console.log("\n1. Markdown aman");
assert(/<h3[^>]*>Penilaian singkat<\/h3>/.test(html), "## → judul (h3, di bawah judul laci)");
assert(/<h4[^>]*>Yang bisa dipertajam<\/h4>/.test(html), "### → subjudul (h4)");
assert(/<strong[^>]*>kuat<\/strong>/.test(html), "**tebal** → <strong>");
assert(/<ul[^>]*>/.test(html) && /<ol[^>]*>/.test(html) && (html.match(/<li/g) ?? []).length === 4, "daftar butir & bernomor");
assert(/<hr/.test(html), "--- → <hr>");
assert(/<blockquote/.test(html), "> → <blockquote>");
assert(!teksSaja.includes("##") && !teksSaja.includes("**") && !teksSaja.includes("---"), "tidak ada ##, **, --- mentah di DOM");
assert(html.includes("data-nara-markdown"), "pembungkus bertanda data-nara-markdown");

const jahat = renderToStaticMarkup(createElement(NaraMarkdown, {
  teks: "Halo <script>alert(1)</script> <img src=x onerror=alert(1)> <b>tebal</b>\n\n[klik](javascript:alert(1)) ![gambar](https://contoh.test/a.png)\n\n<iframe src=\"https://contoh.test\"></iframe>",
}));
assert(!/<script|<img|<iframe|onerror|<a[\s>]|javascript:/i.test(jahat), "HTML mentah, skrip, gambar, tautan dibuang");
assert(jahat.includes("klik"), "teks tautan tetap terbaca sebagai teks biasa");

console.log("\n2. Bahasa Indonesia penuh");
assert(/Bahasa Indonesia/.test(INSTRUKSI_PENDAMPING) && /Inggris/.test(INSTRUKSI_PENDAMPING), "instruksi mewajibkan Bahasa Indonesia, melarang istilah Inggris");
assert(INSTRUKSI_PENDAMPING.includes("taruhan") && INSTRUKSI_PENDAMPING.includes("sudut pandang"), "instruksi memuat padanan istilah");
assert(indonesiakanIstilah("### Stakes (taruhan)\nApa stakes-nya?") === "### Taruhan\nApa taruhannya?", "\"Stakes (taruhan)\" → \"Taruhan\"");
assert(indonesiakanIstilah("Pacing di tengah lambat; cek POV.") === "Tempo cerita di tengah lambat; cek sudut pandang.", "pacing/POV → padanan Indonesia");
assert(indonesiakanIstilah("Tokoh berkata, \u201cIni plot twist!\u201d") === "Tokoh berkata, \u201cIni plot twist!\u201d", "kutipan naskah tidak diubah");
assert(indonesiakanIstilah("Plot cerita ini rapi.") === "Plot cerita ini rapi.", "kata serapan umum (plot) tetap");
const keluaran = indonesiakanIstilah(CONTOH_JAWABAN.replace("**Taruhan**", "**Stakes (taruhan)**"));
assert(!/\bstakes\b/i.test(keluaran) && keluaran.includes("**Taruhan**"), "jawaban contoh bebas istilah Inggris");

console.log("\n3. Rute coach");
const rute = readFileSync("app/api/aku-sastrawan/coach/route.ts", "utf8");
assert(rute.includes("INSTRUKSI_PENDAMPING") && rute.includes("AI_CONFIDENTIALITY_INSTRUCTION"), "instruksi sistem = pendamping + kerahasiaan");
assert(/indonesiakanIstilah\(/.test(rute), "jawaban melewati jaring pengaman istilah");
const panel = readFileSync("components/aku-sastrawan/studio/NaraPanel.tsx", "utf8");
const rancang = readFileSync("components/aku-sastrawan/studio/RancangCerita.tsx", "utf8");
assert(panel.includes("<NaraMarkdown") && rancang.includes("<NaraMarkdown"), "laci NARA & Rancang Cerita memakai NaraMarkdown");
const md = readFileSync("components/aku-sastrawan/studio/NaraMarkdown.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
assert(!/rehype-raw|dangerouslySetInnerHTML/.test(md) && md.includes("skipHtml"), "tanpa rehype-raw / dangerouslySetInnerHTML");

console.log(`\n${passed} lulus, ${failed} gagal`);
if (failed) process.exit(1);
