/**
 * AKU SASTRAWAN — ekspor naskah (.txt, PDF, Word) tanpa DB.
 *   1. susunNaskah: Peta Cerita (JSON di kolom synopsis) tampil rapi, tidak pernah JSON mentah;
 *      sinopsis lama (teks polos) tetap terbaca.
 *   2. Nama berkas Indonesia + Unicode di Content-Disposition (RFC 6266/5987).
 *   3. PDF: berkas sah, teks judul/penulis/peta/bab terbaca (Unicode: é, ā, —, "…").
 *   4. DOCX: word/document.xml berisi judul, penulis, peta, dan bab.
 *   5. Rute ekspor: wajib login (401), hanya milik sendiri (userId: user.id → 404),
 *      TANPA gerbang Premium (karya tetap bisa diunduh setelah Premium berakhir).
 *   6. Menu unduh di studio & novel menawarkan ketiga format.
 *
 * Usage: npx tsx scripts/test-aku-sastrawan-ekspor.ts
 */
import { readFileSync } from "fs";
import JSZip from "jszip";
import { bacaFormatEkspor, FORMAT_EKSPOR, tautanEkspor } from "../lib/aku-sastrawan/ekspor/format";
import { contentDisposition, namaBerkas, naskahSebagaiTeks, susunNaskah } from "../lib/aku-sastrawan/ekspor/naskah";
import { buatPdfNaskah } from "../lib/aku-sastrawan/ekspor/pdf";
import { buatDocxNaskah } from "../lib/aku-sastrawan/ekspor/docx";
import { petaKosong, tulisSinopsis } from "../lib/aku-sastrawan/peta-cerita";

const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (b: Buffer) => Promise<{ text: string; numpages: number }>;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); } else { failed++; console.log(`  ❌ ${label}`); }
}
const rata = (s: string) => s.replace(/\s+/g, " ");

const peta = petaKosong();
peta.genre = "Drama keluarga";
peta.tokoh = [{ nama: "Sekar", watak: "Keras kepala", keinginan: "Pulang ke Solo" }];
peta.latar = { tempat: "Pasar Gede", waktu: "Subuh", suasana: "Hening" };
peta.konflik = "Warung ibunya akan digusur.";
peta.alur = { awal: "Sekar menerima surat.", tengah: "Ia melawan.", akhir: "Ia berdamai." };
peta.sudutPandang = "Orang pertama";
peta.amanat = "Rumah adalah orang, bukan tempat.";
const synopsis = tulisSinopsis("Seorang anak kembali ke pasar masa kecilnya.", peta);

const novel = susunNaskah({
  title: "Senja di Pasar Gede — Kisah Sekar",
  genre: "NOVEL",
  synopsis,
  content: "",
  chapters: [
    { title: "Kedua", content: "Bab dua.\n\nAdegan baru.", orderIndex: 4 },
    { title: "Bab 7", content: "Bab bawaan.", orderIndex: 7 },
    { title: "Surat", content: "Café itu sepi. Nāga tua bercerita \u201cpelan\u201d.\nBaris kedua.", orderIndex: 1 },
  ],
}, "Dewi Lestari");

console.log("\n1. susunNaskah");
assert(synopsis.trim().startsWith("{"), "kolom synopsis memang JSON (Peta Cerita berversi)");
assert(novel.sinopsis === "Seorang anak kembali ke pasar masa kecilnya.", "sinopsis terbaca dari JSON");
assert(novel.peta.map((b) => b.judul).join("|") === "Genre|Tokoh|Latar|Konflik|Alur|Sudut pandang|Amanat/tema", "bagian peta lengkap & berurutan");
assert(novel.bab.map((b) => `${b.nomor}:${b.judul}`).join("|") === "1:Surat|2:Kedua|3:", "bab urut orderIndex, bernomor 1..n tanpa bolong, judul bawaan tidak diulang");
const txt = naskahSebagaiTeks(novel);
assert(!txt.includes("{\"") && !txt.includes("\"v\":"), ".txt tidak berisi JSON mentah");
assert(txt.includes("Sekar") && txt.includes("Pasar Gede") && txt.includes("oleh Dewi Lestari"), ".txt memuat peta & penulis");
const lama = susunNaskah({ title: "", genre: "CERPEN", synopsis: "Sinopsis lama polos.", content: "Isi cerpen.", chapters: [] }, "");
assert(lama.sinopsis === "Sinopsis lama polos." && lama.peta.length === 0, "sinopsis lama (teks polos) tetap terbaca");
assert(lama.judul === "Tanpa judul" && lama.jenis === "Cerpen", "judul kosong → \"Tanpa judul\"");

console.log("\n2. Format & nama berkas");
assert(bacaFormatEkspor(null) === "txt" && bacaFormatEkspor("pdf") === "pdf" && bacaFormatEkspor("docx") === "docx", "format dikenali");
assert(bacaFormatEkspor("exe") === null, "format lain ditolak");
assert(tautanEkspor("p1", "txt") === "/api/aku-sastrawan/projects/p1/export" && tautanEkspor("p1", "pdf").endsWith("?format=pdf"), "tautan ekspor");
assert(FORMAT_EKSPOR.map((f) => f.format).join(",") === "pdf,docx,txt", "menu menawarkan PDF, Word, .txt");
const nb = namaBerkas("Senja di Pasar Gede — Kisah Sekar", "pdf");
assert(nb.unicode.endsWith(".pdf") && nb.unicode.includes("Senja") && /^[\x20-\x7e]+$/.test(nb.ascii), "nama Unicode + cadangan ASCII");
const cd = contentDisposition("Café Nāga", "docx");
assert(cd.startsWith("attachment; filename=\"") && cd.includes("filename*=UTF-8''") && cd.includes("Caf%C3%A9"), "Content-Disposition aman untuk Unicode");
assert(!/[\r\n"]/.test(namaBerkas("a\"b\r\nc", "txt").ascii), "nama berkas tidak bisa menyisipkan header");

async function main() {
  console.log("\n3. PDF");
  const pdf = await buatPdfNaskah(novel);
  assert(pdf.subarray(0, 5).toString() === "%PDF-", "berkas PDF sah");
  const { text, numpages } = await pdfParse(pdf);
  const t = rata(text);
  assert(numpages >= 5, `halaman: judul, rancangan, tiap bab (${numpages})`);
  for (const s of ["Senja di Pasar Gede", "Dewi Lestari", "Peta Cerita", "Pasar Gede", "Keras kepala", "Bab 1", "Surat", "Bab 2", "Bab 3", "Café", "Nāga"]) {
    assert(t.includes(s), `PDF memuat "${s}"`);
  }
  assert(!t.includes("{\"") && !t.includes("sudutPandang"), "PDF tanpa JSON mentah");
  const emoji = await buatPdfNaskah(susunNaskah({ title: "Uji 🌙", genre: "CERPEN", synopsis: null, content: "Malam 🌙 tenang.", chapters: [] }, "A"));
  assert(emoji.length > 1000, "emoji tidak membuat PDF gagal");

  console.log("\n4. DOCX");
  const docx = await buatDocxNaskah(novel);
  assert(docx.subarray(0, 2).toString() === "PK", "berkas DOCX (zip) sah");
  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file("word/document.xml")!.async("string");
  const isi = rata(xml.replace(/<[^>]+>/g, " "));
  for (const s of ["Senja di Pasar Gede", "Dewi Lestari", "Rancangan Cerita", "Peta Cerita", "Pulang ke Solo", "Surat", "Café", "Nāga"]) {
    assert(isi.includes(s), `DOCX memuat "${s}"`);
  }
  assert(!isi.includes("sudutPandang"), "DOCX tanpa JSON mentah");
  const core = await zip.file("docProps/core.xml")!.async("string");
  assert(core.includes("Dewi Lestari"), "metadata penulis DOCX");

  console.log("\n5. Rute ekspor");
  const rute = readFileSync("app/api/aku-sastrawan/projects/[projectId]/export/route.ts", "utf8");
  assert(/if \(!user\)[^\n]*status: 401/.test(rute), "tanpa login → 401");
  assert(/where: \{ id: projectId, userId: user\.id \}/.test(rute), "hanya karya milik sendiri (lainnya 404)");
  assert(/status: 404/.test(rute), "karya tidak ditemukan → 404");
  assert(!/premium|akuSastrawanWriteAllowed|requireAkuSastrawan/i.test(rute.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "tidak ada gerbang Premium pada ekspor");
  assert(/Cache-Control": "private, no-store"/.test(rute), "unduhan tidak di-cache publik");

  console.log("\n6. Menu unduh");
  const studio = readFileSync("app/aku-sastrawan/studio/page.tsx", "utf8");
  const novelPage = readFileSync("app/aku-sastrawan/novel/[projectId]/page.tsx", "utf8");
  const menu = readFileSync("components/aku-sastrawan/studio/MenuUnduh.tsx", "utf8");
  assert(studio.includes("FORMAT_EKSPOR.map") && studio.includes("simpanSekarang()"), "studio: tiga format, simpan dulu sebelum unduh");
  assert(novelPage.includes("<MenuUnduh") && menu.includes("FORMAT_EKSPOR.map"), "novel: menu unduh tiga format");

  console.log(`\n${passed} lulus, ${failed} gagal`);
  if (failed) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
