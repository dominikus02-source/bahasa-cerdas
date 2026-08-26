/**
 * P8B §19 — Copy guidelines & share templates untuk Guru Cerdas Sejahtera.
 *
 * Bahasa yang DIIZINKAN: akses belajar, mendampingi, memantau perkembangan.
 * Bahasa yang DIHINDARI: jual Premium, kejar target, rekrut, passive income,
 * atau pesan yang menyebut komisi/uang kepada MURID.
 */

/** Diizinkan — akses belajar & pendampingan. */
export const GCS_ALLOWED_PHRASES = [
  "Bagikan akses belajar BahasaCerdas.",
  "Undang muridmu untuk belajar.",
  "Pantau perkembangan belajar mereka.",
  "Beri muridmu akses belajar yang lebih baik.",
] as const;

/** Dihindari — nada menjual / komisi-ke-murid. */
export const GCS_AVOIDED_PHRASES = [
  "Jual Premium",
  "Kejar target",
  "Tambah referral",
  "Rekrut murid",
  "Passive income",
  "Daftar Premium supaya saya dapat uang",
] as const;

export interface ShareClassInfo {
  name: string;
  grade?: string | null;
  accessCode: string;
}

/**
 * Template pesan siap kirim untuk guru → murid.
 * KRITIS: TIDAK BOLEH menyebut komisi/penghasilan guru (spec §9).
 */
export function buildShareMessage(kelas: ShareClassInfo): string {
  const lines = [
    "Halo, silakan bergabung ke kelas BahasaCerdas saya untuk melanjutkan latihan Bahasa Indonesia secara lebih terarah.",
    "",
    `Kelas: ${kelas.name}`,
    `Gunakan kode: ${kelas.accessCode}`,
    "",
    "Sampai jumpa di BahasaCerdas.",
  ];
  return lines.join("\n");
}

/** Link akses kelas resmi — attribution mengikuti kode akses platform. */
export function buildClassJoinUrl(origin: string, accessCode: string): string {
  return `${origin}/murid/gabung-kelas?kode=${encodeURIComponent(accessCode)}`;
}

/** FAQ program — konsisten dengan aturan P7C (jangan menyimpang dari engine). */
export const GCS_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Apa itu Guru Cerdas Sejahtera?",
    a: "Guru Cerdas Sejahtera adalah program BahasaCerdas yang menghargai kontribusi guru dalam mendampingi murid belajar. Guru yang muridnya berlangganan Premium dapat memperoleh penghasilan berulang sesuai ketentuan program.",
  },
  {
    q: "Bagaimana murid terhubung dengan saya?",
    a: "Murid terhubung melalui kode akses kelas. Saat murid bergabung ke kelasmu, koneksi tercatat secara resmi di platform dan tidak berpindah otomatis jika murid pindah kelas atau sekolah.",
  },
  {
    q: "Berapa penghasilan guru?",
    a: "Guru dapat memperoleh 10% dari transaksi Premium murid yang memenuhi ketentuan program, dihitung dari jumlah yang berhasil dibayarkan.",
  },
  {
    q: "Kapan komisi tercatat?",
    a: "Setelah pembayaran Premium murid berhasil dan memenuhi ketentuan program, komisi tercatat di riwayat penghasilanmu.",
  },
  {
    q: "Bagaimana jika murid berhenti Premium?",
    a: "Tidak ada masalah. Penghasilan hanya tercatat dari transaksi Premium yang memenuhi ketentuan. Koneksi murid denganmu tetap tercatat.",
  },
  {
    q: "Kapan penghasilan dapat dicairkan?",
    a: "Setelah melewati masa penahanan, saldo masuk ke saldo tersedia dan dapat diajukan untuk pencairan mulai Rp50.000 ke rekening terdaftar.",
  },
  {
    q: "Apakah guru harus menjual Premium?",
    a: "Tidak. Peranmu adalah memberikan akses belajar yang lebih baik kepada murid. Murid berlangganan Premium atas pilihan mereka sendiri di dalam ekosistem BahasaCerdas.",
  },
];
