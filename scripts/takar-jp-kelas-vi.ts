/**
 * Takar ulang alokasi JP Kelas VI (sekali jalan).
 *
 * Kelas VI sebelumnya seragam 10 JP per bab (total 100 JP setahun), sementara
 * Kelas V 16-24 JP per bab (188 JP). Turun separuh justru di tahun kelulusan
 * yang seharusnya paling padat — polanya terlalu rata untuk disebut pilihan
 * pedagogis, lebih mirip nilai sementara yang tidak pernah ditinjau.
 *
 * Takaran baru TIDAK menyalin Kelas V mentah-mentah. Semester 2 Kelas VI di
 * sekolah Indonesia memang lebih pendek — terpotong Ujian Sekolah dan rangkaian
 * kelulusan. Menyamakannya dengan Kelas V justru memberi guru alokasi yang
 * tidak mungkin dipenuhi.
 *
 *   Semester 1: 96 JP  (setara Kelas V, isi Kelas VI lebih padat)
 *   Semester 2: 80 JP  (sengaja lebih ringan — semester terpotong)
 *   Total     : 176 JP
 *
 * Bobot per bab mengikuti tuntutan kegiatannya: bab produksi tulisan dan bab
 * yang menuntut tampil di depan kelas diberi porsi terbesar, bab apresiasi
 * penutup paling ringan.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const TULIS = process.argv.includes("--tulis");
const PATH = join(process.cwd(), "data/buku-panduan/guides-vi.ts");

// Urutan sama dengan urutan bab di berkas (Bab 1..10).
const TAKARAN: { bab: number; jp: number; judul: string; alasan: string }[] = [
  { bab: 1,  jp: 20, judul: "Teks Laporan dan Artikel Pendek",   alasan: "produksi tulisan panjang + riset kecil" },
  { bab: 2,  jp: 20, judul: "Teks Pidato Sederhana",             alasan: "menulis lalu tampil — praktik butuh waktu" },
  { bab: 3,  jp: 20, judul: "Teks Argumentasi Sederhana",        alasan: "konsep paling abstrak di jenjang SD" },
  { bab: 4,  jp: 18, judul: "Cerita Pendek Anak",                alasan: "produksi kreatif + revisi" },
  { bab: 5,  jp: 18, judul: "Membaca Kritis Teks Informatif",    alasan: "latihan bertahap, banyak teks" },
  { bab: 6,  jp: 18, judul: "Teks Diskusi Sederhana",            alasan: "praktik diskusi kelompok" },
  { bab: 7,  jp: 18, judul: "Menulis Karya untuk Dipublikasikan", alasan: "produksi + penyuntingan" },
  { bab: 8,  jp: 16, judul: "Persiapan Literasi Menuju SMP",     alasan: "penguatan, bukan materi baru" },
  { bab: 9,  jp: 16, judul: "Menyunting dan Memublikasikan Karya", alasan: "lanjutan Bab 7" },
  { bab: 10, jp: 12, judul: "Apresiasi Sastra Anak",             alasan: "penutup apresiatif, beban ringan" },
];

const RE = /(suggestedDuration:\s*")(\d+)( JP x 35 menit")/g;

const asli = readFileSync(PATH, "utf8");
const lama = [...asli.matchAll(RE)].map((m) => Number(m[2]));

if (lama.length !== TAKARAN.length) {
  console.error(`GAGAL: ditemukan ${lama.length} suggestedDuration, diharapkan ${TAKARAN.length}. Berkas tidak diubah.`);
  process.exit(1);
}

console.log(TULIS ? "MODE: TULIS\n" : "MODE: UJI (pakai --tulis untuk menerapkan)\n");
console.log("Bab  Lama  Baru  Judul                              Alasan");
console.log("-".repeat(94));
for (let i = 0; i < TAKARAN.length; i++) {
  const t = TAKARAN[i];
  const tanda = lama[i] === t.jp ? " " : "→";
  console.log(
    `${String(t.bab).padStart(3)}  ${String(lama[i]).padStart(4)}  ${String(t.jp).padStart(4)} ${tanda} ${t.judul.padEnd(34)} ${t.alasan}`
  );
}

const s1Lama = lama.slice(0, 5).reduce((a, b) => a + b, 0);
const s2Lama = lama.slice(5).reduce((a, b) => a + b, 0);
const s1Baru = TAKARAN.slice(0, 5).reduce((a, t) => a + t.jp, 0);
const s2Baru = TAKARAN.slice(5).reduce((a, t) => a + t.jp, 0);

console.log("-".repeat(94));
console.log(`Semester 1 : ${s1Lama} → ${s1Baru} JP`);
console.log(`Semester 2 : ${s2Lama} → ${s2Baru} JP   (sengaja lebih ringan — semester terpotong US & kelulusan)`);
console.log(`TOTAL      : ${s1Lama + s2Lama} → ${s1Baru + s2Baru} JP   (Kelas V = 188 JP)`);

if (!TULIS) {
  console.log("\n(uji — berkas tidak ditulis)");
} else {
  let i = 0;
  const hasil = asli.replace(RE, (_m, a, _n, c) => `${a}${TAKARAN[i++].jp}${c}`);
  writeFileSync(PATH, hasil);
  console.log("\nguides-vi.ts diperbarui.");
}
