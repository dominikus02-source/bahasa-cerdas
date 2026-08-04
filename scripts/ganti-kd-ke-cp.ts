/**
 * Ganti penanda kurikulum dari KD (Kurikulum 2013) ke elemen CP (Kurikulum
 * Merdeka) di seluruh buku panduan guru.
 *
 * Masalah: medan `phase` sudah memakai fase A-F (Merdeka), tetapi medan `kd`
 * masih memakai notasi "3.1/4.1" — itu Kompetensi Dasar dari Kurikulum 2013.
 * Kurikulum Merdeka tidak mengenal KD; ia memakai Capaian Pembelajaran yang
 * dibagi menjadi empat ELEMEN. Menariknya `sourceBasis` semua bab tertulis
 * "cp-atp-research", jadi materinya memang disusun dari CP/ATP — hanya
 * labelnya yang tertinggal.
 *
 * Elemen ditentukan dari kata kerja pada learningGoals tiap bab, bukan ditebak
 * dari judul: judul sering menyebut jenis teks ("Teks Prosedur") sementara
 * elemen ditentukan oleh apa yang DILAKUKAN murid terhadap teks itu.
 *
 *   npx tsx scripts/ganti-kd-ke-cp.ts            # uji + tabel tinjauan
 *   npx tsx scripts/ganti-kd-ke-cp.ts --tulis
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { allGrades } from "../data/buku-panduan";

const TULIS = process.argv.includes("--tulis");
const DIR = join(process.cwd(), "data/buku-panduan");

/** Empat elemen Capaian Pembelajaran Bahasa Indonesia (Kurikulum Merdeka). */
const ELEMEN = {
  MENYIMAK: "Menyimak",
  MEMBACA: "Membaca dan Memirsa",
  BERBICARA: "Berbicara dan Mempresentasikan",
  MENULIS: "Menulis",
} as const;

// Bobot: kata kerja yang khas satu elemen diberi nilai lebih tinggi daripada
// kata umum yang bisa muncul di mana saja.
const PENANDA: { elemen: string; kata: [string, number][] }[] = [
  {
    elemen: ELEMEN.MENYIMAK,
    kata: [["menyimak", 4], ["mendengarkan", 4], ["membedakan bunyi", 3], ["bunyi", 1], ["audio", 2], ["disimak", 3]],
  },
  {
    elemen: ELEMEN.MEMBACA,
    kata: [["membaca", 3], ["bacaan", 2], ["memahami isi", 3], ["mengidentifikasi", 2], ["menemukan informasi", 3],
           ["gagasan pokok", 3], ["ide pokok", 3], ["memirsa", 4], ["menganalisis", 2], ["menyimpulkan", 2], ["kosakata", 1]],
  },
  {
    elemen: ELEMEN.BERBICARA,
    kata: [["menceritakan kembali", 4], ["mempresentasikan", 4], ["presentasi", 3], ["berdiskusi", 3], ["diskusi", 2],
           ["membacakan", 3], ["melafalkan", 3], ["berpidato", 4], ["pidato", 2], ["wawancara", 3],
           ["di depan kelas", 3], ["percaya diri", 1], ["menyampaikan", 2], ["bercerita", 3]],
  },
  {
    elemen: ELEMEN.MENULIS,
    kata: [["menulis", 4], ["menyusun", 3], ["menyunting", 4], ["mengarang", 4], ["merevisi", 3],
           ["paragraf", 2], ["draf", 3], ["memublikasikan", 3], ["ejaan", 2], ["tanda baca", 2]],
  },
];

function tentukanElemen(goals: string[], judul: string): { elemen: string; ganda: boolean } {
  const j = judul.toLowerCase();

  const skor = PENANDA.map(({ elemen, kata }) => {
    // Tiap kata dihitung dari BERAPA TUJUAN yang memuatnya, bukan berapa kali
    // ia muncul. Tanpa ini "menulis" menang di hampir semua bab hanya karena
    // diulang beberapa kali dalam satu tujuan yang sama.
    const dariTujuan = kata.reduce((a, [k, b]) => {
      const jumlahTujuan = goals.filter((g) => g.toLowerCase().includes(k)).length;
      return a + Math.min(jumlahTujuan, 3) * b;
    }, 0);

    // Judul menyatakan fokus bab secara eksplisit — bobotnya paling tinggi.
    const dariJudul = kata.reduce((a, [k, b]) => a + (j.includes(k) ? b * 3 : 0), 0);

    return { elemen, nilai: dariTujuan + dariJudul };
  });

  skor.sort((a, b) => b.nilai - a.nilai);
  if (skor[0].nilai === 0) return { elemen: ELEMEN.MEMBACA, ganda: false };

  // Selisih tipis BUKAN kegagalan pemetaan — bab seperti "Teks Prosedur" atau
  // "Teks Drama" memang mencakup dua elemen sekaligus: murid membaca contohnya
  // lalu menulis sendiri. Memaksakan satu elemen membuang informasi yang justru
  // dibutuhkan guru saat menyusun modul ajar. Maka keduanya ditampilkan.
  const ganda = skor[1].nilai > 0 && skor[0].nilai < skor[1].nilai * 1.4;
  const elemen = ganda ? `${skor[0].elemen} · ${skor[1].elemen}` : skor[0].elemen;
  return { elemen, ganda };
}

// Kumpulkan pemetaan: id bab → elemen.
const peta = new Map<string, { elemen: string; ganda: boolean; lama: string; grade: string; judul: string }>();
for (const g of allGrades) {
  for (const c of g.semesters.flatMap((s) => s.chapters)) {
    const hasil = tentukanElemen(c.learningGoals, c.title);
    peta.set(c.id, {
      elemen: hasil.elemen,
      ganda: hasil.ganda,
      lama: c.kd,
      grade: g.label,
      judul: c.title,
    });
  }
}

// Tabel tinjauan.
const hitung = new Map<string, number>();
console.log(TULIS ? "MODE: TULIS\n" : "MODE: UJI (pakai --tulis untuk menerapkan)\n");
let kelasSekarang = "";
for (const [, v] of peta) {
  if (v.grade !== kelasSekarang) {
    kelasSekarang = v.grade;
    console.log(`\n── ${v.grade} ${"─".repeat(60 - v.grade.length)}`);
  }
  console.log(`  ${v.lama.padEnd(9)} → ${v.elemen.padEnd(48)} ${v.judul.slice(0, 38)}`);
  hitung.set(v.elemen, (hitung.get(v.elemen) ?? 0) + 1);
}

const gandaList = [...peta.values()].filter((v) => v.ganda);
console.log(`\n\nBab mencakup dua elemen: ${gandaList.length} dari ${peta.size}`);

console.log(`\n\nSebaran elemen (${peta.size} bab):`);
[...hitung.entries()].sort((a, b) => b[1] - a[1]).forEach(([e, n]) =>
  console.log(`  ${e.padEnd(31)} ${n} bab`)
);

if (!TULIS) {
  console.log("\n(uji — tidak ada berkas ditulis)");
  process.exit(0);
}

// Terapkan: cari tiap bab lewat id-nya, ganti nilai kd tepat sesudahnya.
const BERKAS = ["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi","xii"];
let totalUbah = 0;
for (const kode of BERKAS) {
  const path = join(DIR, `guides-${kode}.ts`);
  let isi = readFileSync(path, "utf8");
  let ubah = 0;

  for (const [id, v] of peta) {
    // id unik per bab; kd muncul beberapa baris sesudahnya dalam objek yang sama.
    const re = new RegExp(`("?id"?\\s*:\\s*"${id}"[\\s\\S]{0,600}?"?kd"?\\s*:\\s*")([^"]*)(")`);
    if (re.test(isi)) {
      isi = isi.replace(re, `$1${v.elemen}$3`);
      ubah++;
    }
  }
  if (ubah > 0) {
    writeFileSync(path, isi);
    console.log(`guides-${kode}: ${ubah} bab diperbarui`);
    totalUbah += ubah;
  }
}
console.log(`\nTotal: ${totalUbah} dari ${peta.size} bab.`);
if (totalUbah !== peta.size) {
  console.error("⚠ Ada bab yang tidak tersentuh — periksa berkas yang formatnya berbeda.");
}
