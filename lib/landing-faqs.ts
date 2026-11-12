/**
 * FAQ landing — satu sumber untuk blok tanya jawab yang tampil
 * (components/landing/FAQSection.tsx) dan data terstruktur FAQPage
 * (app/page.tsx), agar isi keduanya selalu sama.
 */
export interface LandingFaq {
  q: string;
  a: string;
}

export const LANDING_FAQS: LandingFaq[] = [
  {
    q: "Apa itu BahasaCerdas?",
    a: "BahasaCerdas adalah ekosistem belajar Bahasa Indonesia yang terbuka untuk masyarakat umum, murid, dan guru. Belajar, berlatih, bermain, berkarya, dan bertumbuh dalam satu platform — dari artikel AKSARA, asisten NARA, Arena, dan kelas, hingga Toko Karya.",
  },
  {
    q: "Siapa saja yang bisa memakai BahasaCerdas?",
    a: "Siapa saja. Masyarakat umum bisa belajar mandiri, membaca artikel AKSARA, bertanya kepada NARA, dan berkarya. Murid bisa belajar lewat kode kelas atau langsung di Arena. Guru mendapat ruang kelas, bank soal, dan alat AI untuk menyiapkan pembelajaran.",
  },
  {
    q: "Apakah BahasaCerdas gratis?",
    a: "Ya, gratis untuk memulai. Guru mendapat uji coba Guru Pro selama 30 hari tanpa komitmen, dan uji coba itu tidak otomatis berlanjut ke paket berbayar. Setelah itu tersedia paket Guru Pro mulai Rp 49.000/bulan.",
  },
  {
    q: "Apa yang bisa dilakukan murid?",
    a: "Murid bisa bergabung lewat kode kelas dari guru atau langsung belajar di Arena: Jalur Cerdas, latihan soal, gim edukasi, menulis dan membagikan karya, mengumpulkan XP dan lencana, naik peringkat di liga mingguan, serta mengikuti simulasi UKBI/TKA.",
  },
  {
    q: "Apa yang bisa dilakukan guru?",
    a: "Guru bisa mengelola kelas, menyiapkan materi ajar, membuat dan membagikan latihan, menilai karya dan tugas, memantau buku nilai, menyusun perangkat ajar dengan bantuan AI, serta menjual karya di Toko Karya.",
  },
  {
    q: "Apa itu NARA, AI di BahasaCerdas?",
    a: "NARA adalah AI BahasaCerdas — Narasumber Andalan, Rekan Anda. NARA membantu masyarakat umum, murid, dan guru mencari ide, memahami materi, dan berlatih berbahasa. Guru juga dapat memanfaatkannya untuk menyusun perangkat ajar dan latihan. NARA membantu; keputusan dan pemeriksaan akhir tetap dilakukan manusia.",
  },
  {
    q: "Bagaimana keamanan data saya?",
    a: "BahasaCerdas menggunakan HTTPS untuk melindungi data saat dikirim. Pengelolaan data dan keterlibatan penyedia layanan dijelaskan di halaman Kebijakan Privasi.",
  },
];
