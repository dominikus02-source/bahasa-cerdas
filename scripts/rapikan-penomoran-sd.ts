/**
 * Rapikan penomoran bab buku panduan guru tingkat SD (kelas I–VI).
 *
 * Masalah: semester 2 mengulang penomoran dari 1, sehingga tiap kelas punya
 * DUA "Bab 1". Guru yang berkata "kerjakan Bab 3" jadi ambigu — Bab 3 semester
 * ganjil atau genap?
 *
 * Konvensi yang dipakai diambil dari jenjang SMP/SMA yang sudah benar
 * (guides-vii s.d. guides-xii): nomor bab BERLANJUT lintas semester.
 *   Semester 1 → Bab 1..5
 *   Semester 2 → Bab 6..10
 *
 * Yang diubah hanya dua medan:
 *   - chapterNumber
 *   - awalan "Bab N:" pada title
 *
 * `id`, `slug`, dan `semester` TIDAK disentuh. id/slug berbasis nama
 * (mis. "iii-cerita-rakyat-anak"), jadi penomoran ulang tidak memutus tautan,
 * bookmark, maupun data progres murid yang menyimpan id.
 *
 *   npx tsx scripts/rapikan-penomoran-sd.ts            # uji, tidak menulis
 *   npx tsx scripts/rapikan-penomoran-sd.ts --tulis
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const TULIS = process.argv.includes("--tulis");
const BERKAS = ["i", "ii", "iii", "iv", "v", "vi"];
const DIR = join(process.cwd(), "data/buku-panduan");

// Kunci bisa polos (chapterNumber:) atau berkutip ("chapterNumber":) — berkas
// guides-iv memakai gaya JSON sementara sisanya tidak.
const RE_NOMOR = /("?chapterNumber"?\s*:\s*)(\d+)/g;
const RE_JUDUL = /("?title"?\s*:\s*")Bab\s+(\d+):/g;

let totalUbah = 0;

for (const kode of BERKAS) {
  const path = join(DIR, `guides-${kode}.ts`);
  const asli = readFileSync(path, "utf8");

  const nomorLama = [...asli.matchAll(RE_NOMOR)].map((m) => Number(m[2]));
  const judulLama = [...asli.matchAll(RE_JUDUL)].map((m) => Number(m[2]));

  if (nomorLama.length !== judulLama.length) {
    console.error(
      `guides-${kode}: JUMLAH TIDAK COCOK (chapterNumber=${nomorLama.length}, title=${judulLama.length}) — dilewati agar tidak merusak.`
    );
    continue;
  }

  // Nomor benar = urutan kemunculan di berkas. Semester 1 lebih dulu, lalu
  // semester 2 — jadi urutan dokumen sudah menghasilkan 1..N berlanjut.
  const jumlah = nomorLama.length;
  const nomorBaru = Array.from({ length: jumlah }, (_, i) => i + 1);

  const berubah = nomorLama.filter((n, i) => n !== nomorBaru[i]).length;
  const label = `guides-${kode}`.padEnd(11);

  if (berubah === 0) {
    console.log(`${label} ${jumlah} bab — sudah benar, tidak diubah`);
    continue;
  }

  console.log(`${label} ${jumlah} bab — ${berubah} nomor diperbaiki`);
  for (let i = 0; i < jumlah; i++) {
    if (nomorLama[i] !== nomorBaru[i]) {
      console.log(`              Bab ${nomorLama[i]} → Bab ${nomorBaru[i]}`);
    }
  }
  totalUbah += berubah;

  if (!TULIS) continue;

  let ke = 0;
  let hasil = asli.replace(RE_NOMOR, (_m, awalan) => `${awalan}${nomorBaru[ke++]}`);
  ke = 0;
  hasil = hasil.replace(RE_JUDUL, (_m, awalan) => `${awalan}Bab ${nomorBaru[ke++]}:`);
  writeFileSync(path, hasil);
}

console.log(`\nTotal nomor diperbaiki: ${totalUbah}`);
if (!TULIS) console.log("(uji — tidak ada berkas ditulis; pakai --tulis untuk menerapkan)");
