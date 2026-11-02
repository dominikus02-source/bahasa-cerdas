/**
 * Uji unit Peta Cerita (penyimpanan rancangan di kolom `synopsis`, tanpa ubah skema).
 * Jalankan: npx tsx scripts/test-aku-sastrawan-peta.ts
 */
import { BATAS_SERIAL, bacaSinopsis, hitungKata, petaKosong, petaSebagaiTeks, tulisSinopsis, type PetaCerita } from "../lib/aku-sastrawan/peta-cerita";

let gagal = 0;
function ok(cond: unknown, label: string) {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) gagal += 1;
}

const contoh: PetaCerita = {
  genre: "Keluarga",
  tokoh: [{ nama: "Rani", watak: "keras kepala, penyayang", keinginan: "melunasi utang ayah" }, { nama: "Ayah", watak: "pendiam", keinginan: "menjaga warung" }],
  latar: { tempat: "warung dekat rel", waktu: "malam hari, 1998", suasana: "sunyi, cemas" },
  konflik: "Warung akan digusur.",
  alur: { awal: "Rani menghitung uang.", tengah: "Surat penggusuran datang.", akhir: "Mereka pindah, tetapi bersama." },
  sudutPandang: "Orang pertama",
  amanat: "Rumah adalah orang-orangnya.",
};

// 1. Pulang-pergi
const raw = tulisSinopsis("Kisah warung kecil.", contoh);
const balik = bacaSinopsis(raw);
ok(balik.sinopsis === "Kisah warung kecil.", "pulang-pergi: sinopsis utuh");
ok(JSON.stringify(balik.peta) === JSON.stringify(contoh), "pulang-pergi: peta utuh");

// 2. Teks lama (tanpa JSON) tetap terbaca sebagai sinopsis
const lama = bacaSinopsis("Sinopsis lama yang ditulis sebelum Peta Cerita ada.");
ok(lama.sinopsis === "Sinopsis lama yang ditulis sebelum Peta Cerita ada.", "teks lama: dibaca sebagai sinopsis");
ok(JSON.stringify(lama.peta) === JSON.stringify(petaKosong()), "teks lama: peta kosong");
ok(bacaSinopsis(null).sinopsis === "" && bacaSinopsis(undefined).sinopsis === "", "null/undefined aman");

// 3. Peta kosong → disimpan sebagai teks biasa (kompatibel mundur)
ok(tulisSinopsis("Hanya sinopsis.", petaKosong()) === "Hanya sinopsis.", "peta kosong: tetap teks biasa");

// 4. JSON rusak → teks mentah tampil, tidak hilang
const rusak = '{"v":1,"jenis":"peta-cerita","sinopsis":"terpot';
const r = bacaSinopsis(rusak);
ok(r.sinopsis === rusak, "JSON rusak: teks mentah dipertahankan sebagai sinopsis");

// 5. Batas serialisasi ≤ 9.800 karakter walau semua isian penuh
const panjang = (n: number) => "kata ".repeat(Math.ceil(n / 5)).slice(0, n);
const penuh: PetaCerita = {
  genre: panjang(500),
  tokoh: Array.from({ length: 12 }, () => ({ nama: panjang(500), watak: panjang(900), keinginan: panjang(900) })),
  latar: { tempat: panjang(900), waktu: panjang(900), suasana: panjang(900) },
  konflik: panjang(3000), alur: { awal: panjang(3000), tengah: panjang(3000), akhir: panjang(3000) },
  sudutPandang: panjang(500), amanat: panjang(3000),
};
const besar = tulisSinopsis(panjang(20000), penuh);
ok(besar.length <= BATAS_SERIAL, `serial penuh ${besar.length} ≤ ${BATAS_SERIAL}`);
const besarBalik = bacaSinopsis(besar);
ok(besarBalik.peta.tokoh.length > 0 && besarBalik.peta.tokoh.length <= 6, "serial penuh: tetap JSON valid, tokoh dibatasi 6");
ok(bacaSinopsis(besar.slice(0, 10_000)).peta.konflik === besarBalik.peta.konflik, "pemotongan API 10.000 tidak merusak JSON");

// 5b. Isian penuh tanda kutip (escape JSON menggandakan panjang) tetap ≤ batas
const kutip = (n: number) => '"'.repeat(n);
const penuhKutip: PetaCerita = {
  genre: kutip(500),
  tokoh: Array.from({ length: 6 }, () => ({ nama: kutip(500), watak: kutip(900), keinginan: kutip(900) })),
  latar: { tempat: kutip(900), waktu: kutip(900), suasana: kutip(900) },
  konflik: kutip(3000), alur: { awal: kutip(3000), tengah: kutip(3000), akhir: kutip(3000) },
  sudutPandang: kutip(500), amanat: kutip(3000),
};
const besarKutip = tulisSinopsis(kutip(5000), penuhKutip);
ok(besarKutip.length <= BATAS_SERIAL, `serial penuh kutip ${besarKutip.length} ≤ ${BATAS_SERIAL}`);
ok(bacaSinopsis(besarKutip).peta.tokoh.length === 6, "serial penuh kutip: tetap JSON valid");

// 6. Karakter khusus & emoji
const unik = { ...contoh, konflik: 'Kutip "ganda", garis\nbaru, emoji 📚, \\ garis miring' };
ok(bacaSinopsis(tulisSinopsis("", unik)).peta.konflik === unik.konflik, "karakter khusus selamat");

// 7. Teks ekspor terbaca manusia, tanpa JSON
const t = petaSebagaiTeks("Kisah warung kecil.", contoh);
ok(t.includes("Rani") && t.includes("warung dekat rel") && !t.includes('"v":1'), "ekspor: teks rapi tanpa JSON");
ok(petaSebagaiTeks("", petaKosong()).trim() === "", "ekspor: kosong bila tidak ada rancangan");

// 8. Hitung kata
ok(hitungKata("") === 0 && hitungKata("  satu dua\n tiga ") === 3, "hitung kata");

console.log(gagal ? `\nGAGAL: ${gagal} pemeriksaan` : "\nLULUS: Peta Cerita aman disimpan di kolom sinopsis.");
process.exit(gagal ? 1 : 0);
