const siteUrl = "https://www.bahasacerdas.com";

export interface AeoMeta {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
}

export const aeoPages: Record<string, AeoMeta> = {
  home: {
    title: "BahasaCerdas — Platform Edukasi Bahasa Indonesia untuk Guru & Siswa",
    description:
      "Platform edukasi Bahasa Indonesia lengkap: AI generator RPP, bank soal HOTS, kuis multiplayer, toko karya, dan komunitas MGMP aktif. Gratis untuk memulai.",
    path: "/",
    ogTitle: "BahasaCerdas — Platform Edukasi Bahasa Indonesia",
    ogDescription:
      "MGMP + AI + Toko Karya dalam satu platform. Daftar gratis.",
  },
  fitur: {
    title: "Fitur Lengkap BahasaCerdas — AI RPP, Soal HOTS, Kuis Multiplayer & Toko Karya",
    description:
      "Jelajahi semua fitur BahasaCerdas: AI generator RPP Kurikulum Merdeka, bank soal HOTS, kuis multiplayer interaktif, toko karya guru, dan komunitas MGMP. Satu platform untuk semua kebutuhan mengajar Bahasa Indonesia.",
    path: "/fitur",
    ogTitle: "Fitur Lengkap | BahasaCerdas",
    ogDescription: "AI RPP, soal HOTS, kuis multiplayer, toko karya, dan komunitas MGMP dalam satu platform.",
  },
  tentang: {
    title: "Tentang BahasaCerdas — Misi, Visi & Tim",
    description:
      "Pelajari tentang BahasaCerdas: platform edukasi Bahasa Indonesia yang dibangun oleh guru, untuk guru. Misi kami adalah membantu guru mengajar lebih efektif dengan teknologi AI dan komunitas MGMP.",
    path: "/tentang",
    ogTitle: "Tentang BahasaCerdas | Platform Edukasi Bahasa Indonesia",
    ogDescription: "Dibangun oleh guru, untuk guru. Misi, visi, dan tim di balik BahasaCerdas.",
  },
  artikel: {
    title: "Artikel & Tips Mengajar Bahasa Indonesia — BahasaCerdas",
    description:
      "Kumpulan artikel dan tips mengajar Bahasa Indonesia untuk guru. Strategi pembelajaran, media ajar, metode asesmen, dan wawasan pendidikan terkini.",
    path: "/artikel",
    ogTitle: "Artikel & Tips Mengajar | BahasaCerdas",
    ogDescription: "Tips mengajar, strategi pembelajaran, dan wawasan pendidikan Bahasa Indonesia.",
  },
  kebijakanPrivasi: {
    title: "Kebijakan Privasi — BahasaCerdas",
    description:
      "Kebijakan privasi BahasaCerdas. Pelajari bagaimana kami melindungi data pribadi Anda saat menggunakan platform edukasi Bahasa Indonesia kami.",
    path: "/kebijakan-privasi",
  },
  syaratKetentuan: {
    title: "Syarat & Ketentuan — BahasaCerdas",
    description:
      "Syarat dan ketentuan penggunaan platform BahasaCerdas. Baca ketentuan layanan, hak dan kewajiban pengguna platform edukasi Bahasa Indonesia.",
    path: "/syarat-ketentuan",
  },
  aiRpp: {
    title: "AI Generator RPP — Buat RPP Kurikulum Merdeka Otomatis | BahasaCerdas",
    description:
      "Buat RPP Kurikulum Merdeka otomatis dengan AI generator RPP BahasaCerdas. Cukup masukkan topik, kelas, dan durasi — RPP siap pakai dalam hitungan detik. Hemat waktu persiapan mengajar hingga 90%.",
    path: /*** path to be defined */ "",
  },
  soalHots: {
    title: "Bank Soal HOTS — Generator Soal Higher Order Thinking Skills | BahasaCerdas",
    description:
      "Hasilkan soal HOTS (Higher Order Thinking Skills) untuk Bahasa Indonesia secara otomatis. Soal berbasis level kognitif C4-C6, sesuai Kurikulum Merdeka. Cocok untuk asesmen formatif dan sumatif.",
    path: "",
  },
};

export function pageMeta(meta: AeoMeta) {
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${siteUrl}${meta.path}`,
    },
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      url: `${siteUrl}${meta.path}`,
      siteName: "BahasaCerdas",
      locale: "id_ID",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
    },
  };
}
