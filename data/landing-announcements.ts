// Pengumuman resmi BahasaCerdas — tampil di hero landing page.
// Admin/developer cukup mengubah data di sini (atau mengganti gambar di
// /public/landing/) tanpa menyentuh komponen slider.
//
// - image  : path gambar lokal di /public/landing/ (BUKAN URL eksternal)
// - link   : tujuan saat banner diklik (kosongkan untuk non-klik)
// - active : false = disembunyikan dari slider
// Slider mendukung maksimal 5 banner aktif.

export type LandingAnnouncement = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link?: string;
  buttonText?: string;
  backgroundColor: string;
  active: boolean;
};

export const landingAnnouncements: LandingAnnouncement[] = [
  {
    id: "guru-pro",
    title: "Program Guru Cerdas",
    subtitle: "Jadi Guru Pro hanya Rp 1.000/bulan — AI Tools penuh, 500 kredit AI, ekspor dokumen tanpa batas.",
    image: "/landing/banner-1.webp",
    link: "/guru/berlangganan",
    buttonText: "Cek Program",
    backgroundColor: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
    active: true,
  },
  {
    id: "arena",
    title: "Masuk Arena",
    subtitle: "Belajar Bahasa Indonesia sambil main — Jalur Cerdas, gim, & simulasi UKBI/TKA.",
    image: "/landing/banner-2.webp",
    link: "/arena",
    buttonText: "Buka Arena",
    backgroundColor: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)",
    active: true,
  },
  {
    id: "ukbi-tka",
    title: "Simulasi UKBI & TKA",
    subtitle: "Uji kemampuanmu dari SD sampai UTBK dengan ratusan soal latihan.",
    image: "/landing/banner-3.webp",
    link: "/arena/simulasi",
    buttonText: "Coba Simulasi",
    backgroundColor: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
    active: true,
  },
  {
    id: "lomba-menulis",
    title: "Lomba Menulis Karya",
    subtitle: "Tulis puisi, cerpen, dan pantun — kumpulkan koin & naik peringkat league.",
    image: "/landing/banner-4.webp",
    link: "/arena/tulis",
    buttonText: "Mulai Menulis",
    backgroundColor: "linear-gradient(135deg, #f59e0b 0%, #e11d48 100%)",
    active: true,
  },
  {
    id: "artikel",
    title: "Tips & Artikel",
    subtitle: "Panduan mengajar & belajar Bahasa Indonesia dari para ahli.",
    image: "/landing/banner-5.webp",
    link: "/artikel",
    buttonText: "Baca Artikel",
    backgroundColor: "linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)",
    active: true,
  },
];

/** Banner aktif maksimal 5 — urutan sesuai data. */
export function getActiveAnnouncements(): LandingAnnouncement[] {
  return landingAnnouncements.filter((a) => a.active).slice(0, 5);
}