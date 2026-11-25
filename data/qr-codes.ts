/**
 * Tabel kode QR buku teks → halaman platform.
 *
 * Sumber: "Daftar Kode Platform v5" Jelajah Kata SMP K7–K9 (25 Nov 2026) dan
 * "Daftar Kode Platform" Cakrawala Kata Kelas X (25 Nov 2026). Setiap kotak
 * "Koneksi bahasacerdas.com" di buku mencetak `https://www.bahasacerdas.com/b/{KODE}`;
 * route `app/b/[kode]` membaca tabel ini (lewat `lib/qr/resolve.ts`).
 *
 * Penomoran bab mengikuti BUKU v5 (Giat Literasi dihapus). Kode tidak berubah
 * walau nomor bab berubah. `unitId` = id bab di `data/buku-panduan/guides-*.ts`
 * (id tidak berubah, jadi halaman Panduan Guru tetap valid).
 *
 * Bentuk kode: `BC-{JENJANG}{KELAS}-{GENRE}-{FITUR}`, contoh `BC-SMP7-DESKRIPSI-VIDEO`.
 */

/** Audiens tujuan. `tamu` = belum masuk (halaman publik saja). */
export type QrAudience = "murid" | "guru" | "tamu";

/**
 * Status tujuan:
 * - `tersedia`: fitur di buku ada di platform.
 * - `terdekat`: fitur di buku belum ada; diarahkan ke halaman terdekat yang ada.
 * - `segera-hadir`: belum ada padanan yang layak; diarahkan ke halaman info "Segera hadir".
 */
export type QrTargetStatus = "tersedia" | "terdekat" | "segera-hadir";

/** Tujuan per audiens. `{unit}` diganti dengan `unitId` bab. `null` = halaman info "Segera hadir". */
export interface QrFeatureRule {
  /** Nama fitur seperti tertulis di buku. */
  label: string;
  murid: string | null;
  guru: string | null;
  /** Halaman publik untuk pengunjung yang belum masuk. Tanpa ini → login dulu. */
  tamu?: string;
  status: QrTargetStatus;
  /** Catatan untuk tim web (tidak tampil ke pengguna). */
  catatan?: string;
}

const PANDUAN_BAB = "/guru/panduan-guru/{unit}";

/** Akhiran kode SMP (Jelajah Kata v5). */
export const SMP_FEATURES = {
  VIDEO: { label: "Video Belajar", murid: "/video-belajar", guru: "/video-belajar", tamu: "/video-belajar", status: "tersedia", catatan: "Belum per bab; id video per bab belum dipetakan." },
  MODEL: { label: "Teks Model (video)", murid: "/video-belajar", guru: "/video-belajar", tamu: "/video-belajar", status: "terdekat", catatan: "Belum per teks model." },
  KONFIRMASI: { label: "Kuis Konfirmasi", murid: "/arena/jalur-cerdas", guru: PANDUAN_BAB, status: "tersedia", catatan: "Unit Jalur Cerdas per bab butuh ID basis data." },
  STRUKTUR: { label: "Analisis Teks", murid: "/arena/jalur-cerdas", guru: PANDUAN_BAB, status: "terdekat", catatan: "Fitur Analisis Teks belum ada." },
  KAIDAH: { label: "Latihan Kaidah", murid: "/arena/jalur-cerdas", guru: PANDUAN_BAB, status: "tersedia" },
  LKS01: { label: "Kuis Kilat LKS", murid: "/arena/jalur-cerdas", guru: PANDUAN_BAB, status: "tersedia" },
  ARENA: { label: "Kuis Tempur", murid: "/arena/battle", guru: PANDUAN_BAB, status: "tersedia" },
  GAME: { label: "Main Bersama", murid: "/main-bersama/join", guru: "/main-bersama/layar", tamu: "/main-bersama/join", status: "tersedia" },
  BACA: { label: "Pojok Baca", murid: null, guru: PANDUAN_BAB, status: "segera-hadir", catatan: "Fitur Pojok Baca belum ada." },
  NARA: { label: "NARA: Asisten Wicara", murid: "/arena/ai", guru: "/guru/ai-bc", tamu: "/ai-bc", status: "terdekat", catatan: "NARA (obrolan) ada; mode wicara khusus belum ada." },
  EYD: { label: "Koreksi EYD", murid: null, guru: "/guru/ai-tools/eyd", status: "segera-hadir", catatan: "Koreksi EYD baru untuk akun guru; murid ke halaman info." },
  KARYA: { label: "Portofolio dan Karya", murid: "/murid/karya", guru: "/guru/feed-karya", status: "terdekat", catatan: "Halaman Portofolio belum ada; Karya ada." },
  REFLEKSI: { label: "Jurnal Refleksi", murid: null, guru: PANDUAN_BAB, status: "segera-hadir", catatan: "Jurnal refleksi belum ada." },
  EVALUASI: { label: "Uji Unit (digital)", murid: "/murid/tugasku", guru: PANDUAN_BAB, status: "terdekat", catatan: "Menu Evaluasi murid belum ada; Uji Unit dibagikan guru sebagai tugas." },
} as const satisfies Record<string, QrFeatureRule>;

/** Akhiran kode SMA (Cakrawala Kata). */
export const SMA_FEATURES = {
  VIDEO: { label: "Video Belajar", murid: "/video-belajar", guru: "/video-belajar", tamu: "/video-belajar", status: "tersedia", catatan: "Belum per bab." },
  BAB: { label: "Halaman Bab", murid: "/murid/belajar", guru: PANDUAN_BAB, status: "tersedia", catatan: "Halaman bab untuk murid belum ada; murid ke Belajar." },
  KAMUS: { label: "Kamus BahasaCerdas", murid: "/kamus", guru: "/kamus", tamu: "/kamus", status: "tersedia" },
  GAME: { label: "Gim Belajar", murid: "/murid/game", guru: "/guru/game", status: "tersedia" },
  AI: { label: "Asisten AI", murid: "/arena/ai", guru: "/guru/ai-bc", tamu: "/ai-bc", status: "tersedia" },
  KARYA: { label: "Unggah Karya", murid: "/murid/karya/tulis", guru: "/guru/feed-karya", status: "tersedia" },
  LATIH: { label: "Latihan Membaca", murid: "/murid/dokumen-latihan", guru: "/guru/dokumen-latihan", status: "tersedia" },
  UJI: { label: "Uji Unit (digital)", murid: "/murid/tugasku", guru: PANDUAN_BAB, status: "tersedia" },
} as const satisfies Record<string, QrFeatureRule>;

/** Tes Sumatif: soal asli rahasia, dibuka guru di platform. */
export const SUMATIF_FEATURE: QrFeatureRule = {
  label: "Tes Sumatif",
  murid: "/murid/tugasku",
  guru: "/guru/evaluasi-simulasi",
  status: "terdekat",
  catatan: "Paket Tes Sumatif per semester belum dibuat; murid melihatnya di Tugasku setelah dibuka guru.",
};

export type SmpFeatureKey = keyof typeof SMP_FEATURES;
export type SmaFeatureKey = keyof typeof SMA_FEATURES;

export interface QrChapter {
  /** Prefiks kode tanpa akhiran fitur, mis. `BC-SMP7-DESKRIPSI`. */
  prefix: string;
  kelas: number;
  buku: "Jelajah Kata" | "Cakrawala Kata";
  /** Nomor bab di buku v5 (setelah Giat Literasi dihapus). */
  bab: number;
  judul: string;
  /** id bab di data/buku-panduan. */
  unitId: string;
  /** Akhiran fitur yang tercetak di buku untuk bab ini. */
  fitur: readonly string[];
}

const SMP_SEMUA: readonly SmpFeatureKey[] = [
  "VIDEO", "MODEL", "KONFIRMASI", "STRUKTUR", "KAIDAH", "LKS01", "ARENA",
  "GAME", "BACA", "NARA", "EYD", "KARYA", "REFLEKSI", "EVALUASI",
];
const SMP_TANPA_MODEL = SMP_SEMUA.filter((f) => f !== "MODEL");

function smp(kelas: number, bab: number, genre: string, judul: string, unitId: string, fitur = SMP_SEMUA): QrChapter {
  return { prefix: `BC-SMP${kelas}-${genre}`, kelas, buku: "Jelajah Kata", bab, judul, unitId, fitur };
}

const SMA_INTI: readonly SmaFeatureKey[] = ["VIDEO", "BAB", "AI", "KARYA", "LATIH", "UJI"];

function sma(kelas: number, bab: number, genre: string, judul: string, unitId: string, fitur = SMA_INTI): QrChapter {
  return { prefix: `BC-SMA${kelas}-${genre}`, kelas, buku: "Cakrawala Kata", bab, judul, unitId, fitur };
}

export const QR_CHAPTERS: readonly QrChapter[] = [
  // Jelajah Kata Kelas VII — 7 bab
  smp(7, 1, "DESKRIPSI", "Teks Deskripsi", "vii-deskripsi"),
  smp(7, 2, "CERITARAKYAT", "Cerita Rakyat: Fabel dan Legenda", "vii-cerita-rakyat"),
  smp(7, 3, "PROSEDUR", "Teks Prosedur", "vii-prosedur"),
  smp(7, 4, "PUISIRAKYAT", "Puisi Rakyat", "vii-puisi-rakyat"),
  smp(7, 5, "LHO", "Laporan Hasil Observasi", "vii-lho"),
  smp(7, 6, "TEKSSURAT", "Teks Surat", "vii-surat", SMP_TANPA_MODEL),
  smp(7, 7, "FANTASI", "Cerita Fantasi", "vii-cerita-fantasi"),
  // Jelajah Kata Kelas VIII — 7 bab
  smp(8, 1, "BERITA", "Teks Berita", "viii-berita"),
  smp(8, 2, "DRAMA", "Teks Drama", "viii-drama"),
  smp(8, 3, "EKSPLANASI", "Teks Eksplanasi", "viii-eksplanasi"),
  smp(8, 4, "EKSPOSISI", "Teks Eksposisi", "viii-eksposisi"),
  smp(8, 5, "PUISI", "Teks Puisi Baru", "viii-puisi"),
  smp(8, 6, "ULASAN", "Teks Ulasan", "viii-ulasan"),
  smp(8, 7, "PERSUASIF", "Teks Persuasif", "viii-persuasif"),
  // Jelajah Kata Kelas IX — 6 bab
  smp(9, 1, "PERCOBAAN", "Teks Laporan Percobaan", "ix-laporan-percobaan"),
  smp(9, 2, "PIDATO", "Teks Pidato Persuasif", "ix-pidato-persuasif"),
  smp(9, 3, "CERPEN", "Teks Cerita Pendek", "ix-cerpen"),
  smp(9, 4, "TANGGAPAN", "Teks Tanggapan", "ix-tanggapan"),
  smp(9, 5, "DISKUSI", "Teks Diskusi", "ix-diskusi"),
  smp(9, 6, "ARTIKEL", "Teks Artikel", "ix-artikel"),
  // Cakrawala Kata Kelas X — 5 bab
  sma(10, 1, "LHO", "Laporan Hasil Observasi", "x-lho", ["VIDEO", "BAB", "KAMUS", "GAME", "AI", "KARYA", "LATIH", "UJI"]),
  sma(10, 2, "ANEKDOT", "Teks Anekdot", "x-anekdot"),
  sma(10, 3, "NEGOSIASI", "Teks Negosiasi", "x-negosiasi"),
  sma(10, 4, "HIKAYAT", "Hikayat", "x-hikayat"),
  sma(10, 5, "BIOGRAFI", "Teks Biografi", "x-biografi"),
];

export interface QrSumatif {
  kode: string;
  /** Bentuk lain yang juga diterima (tertukar urutan). */
  alias: readonly string[];
  kelas: number;
  buku: QrChapter["buku"];
  semester: "Ganjil" | "Genap";
  cakupan: string;
}

export const QR_SUMATIF: readonly QrSumatif[] = [
  { kode: "BC-SMP7-SUMATIF-GANJIL", alias: ["BC-SMP7-GANJIL-SUMATIF"], kelas: 7, buku: "Jelajah Kata", semester: "Ganjil", cakupan: "Bab 1–4" },
  { kode: "BC-SMP7-SUMATIF-GENAP", alias: ["BC-SMP7-GENAP-SUMATIF"], kelas: 7, buku: "Jelajah Kata", semester: "Genap", cakupan: "Bab 5–7" },
  { kode: "BC-SMP8-SUMATIF-GANJIL", alias: ["BC-SMP8-GANJIL-SUMATIF"], kelas: 8, buku: "Jelajah Kata", semester: "Ganjil", cakupan: "Bab 1–4" },
  { kode: "BC-SMP8-SUMATIF-GENAP", alias: ["BC-SMP8-GENAP-SUMATIF"], kelas: 8, buku: "Jelajah Kata", semester: "Genap", cakupan: "Bab 5–7" },
  { kode: "BC-SMP9-SUMATIF-GANJIL", alias: ["BC-SMP9-GANJIL-SUMATIF"], kelas: 9, buku: "Jelajah Kata", semester: "Ganjil", cakupan: "Bab 1–3" },
  { kode: "BC-SMP9-SUMATIF-GENAP", alias: ["BC-SMP9-GENAP-SUMATIF"], kelas: 9, buku: "Jelajah Kata", semester: "Genap", cakupan: "Bab 4–6" },
  // Cakrawala Kata X mencetak urutan GANJIL-SUMATIF; bentuk SMP diterima sebagai alias.
  { kode: "BC-SMA10-GANJIL-SUMATIF", alias: ["BC-SMA10-SUMATIF-GANJIL"], kelas: 10, buku: "Cakrawala Kata", semester: "Ganjil", cakupan: "Bab 1–3" },
  { kode: "BC-SMA10-GENAP-SUMATIF", alias: ["BC-SMA10-SUMATIF-GENAP"], kelas: 10, buku: "Cakrawala Kata", semester: "Genap", cakupan: "Bab 4–5" },
];
