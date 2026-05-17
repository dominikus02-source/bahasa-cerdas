import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MGMP_COMMUNITIES = [
  // DKI Jakarta
  {
    name: "MGMP Bahasa Indonesia SMA DKI Jakarta",
    description: "Forum Musyawarah Guru Mata Pelajaran Bahasa Indonesia tingkat SMA/MA se-DKI Jakarta. Wadah kolaborasi, berbagi materi ajar, dan pengembangan profesionalisme guru.",
    province: "DKI Jakarta",
    city: "Jakarta",
    school: "Tingkat Provinsi",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Jakarta Timur",
    description: "Komunitas guru Bahasa Indonesia SMP/MTs wilayah Jakarta Timur. Fokus pada pengembangan perangkat ajar Kurikulum Merdeka dan berbagi praktik baik pembelajaran.",
    province: "DKI Jakarta",
    city: "Jakarta Timur",
    school: "Tingkat Wilayah",
  },
  {
    name: "MGMP Bahasa Indonesia SMK DKI Jakarta",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMK se-DKI Jakarta. Membahas penyusunan modul ajar, asesmen berbasis literasi, dan pembelajaran bahasa untuk SMK.",
    province: "DKI Jakarta",
    city: "Jakarta",
    school: "Tingkat Provinsi",
  },
  // Jawa Barat
  {
    name: "MGMP Bahasa Indonesia SMA Kab. Karawang",
    description: "Forum guru Bahasa Indonesia SMA/MA se-Kabupaten Karawang. Kegiatan rutin meliputi diskusi materi ajar, workshop penyusunan soal, dan pelatihan Kurikulum Merdeka.",
    province: "Jawa Barat",
    city: "Karawang",
    school: "Tingkat Kabupaten",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Kota Bandung",
    description: "Komunitas profesional guru Bahasa Indonesia SMP/MTs Kota Bandung. Berbagi strategi pembelajaran, pengembangan bahan ajar digital, dan peningkatan kompetensi guru.",
    province: "Jawa Barat",
    city: "Bandung",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kota Bogor",
    description: "Wadah silaturahmi dan pengembangan profesional guru Bahasa Indonesia SMA/MA se-Kota Bogor. Rutin mengadakan pertemuan bulanan dan workshop pedagogik.",
    province: "Jawa Barat",
    city: "Bogor",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMK Kab. Garut",
    description: "Forum guru Bahasa Indonesia SMK se-Kabupaten Garut. Fokus pada pembelajaran bahasa Indonesia kontekstual untuk siswa SMK dan penyusunan modul ajar berbasis projek.",
    province: "Jawa Barat",
    city: "Garut",
    school: "Tingkat Kabupaten",
  },
  // Jawa Tengah
  {
    name: "MGMP Bahasa Indonesia SMP Provinsi Jawa Tengah",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMP tingkat Provinsi Jawa Tengah. Berkolaborasi dengan Balai Bahasa untuk festival bahasa dan sastra.",
    province: "Jawa Tengah",
    city: "Tingkat Provinsi",
    school: "Tingkat Provinsi",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kota Semarang",
    description: "Komunitas guru Bahasa Indonesia SMA/MA se-Kota Semarang. Kegiatan meliputi bedah kisi-kisi TKA, penyusunan bank soal, dan berbagi praktik baik pembelajaran.",
    province: "Jawa Tengah",
    city: "Semarang",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Kab. Kendal",
    description: "Forum guru Bahasa Indonesia SMP/MTs se-Kabupaten Kendal. Rutin mengadakan pertemuan untuk membahas strategi pembelajaran dan pengembangan perangkat ajar.",
    province: "Jawa Tengah",
    city: "Kendal",
    school: "Tingkat Kabupaten",
  },
  {
    name: "MGMP Bahasa Indonesia SMK Kota Surakarta",
    description: "Wadah kolaborasi guru Bahasa Indonesia SMK se-Kota Surakarta (Solo). Fokus pada pembelajaran bahasa untuk kebutuhan dunia kerja dan industri.",
    province: "Jawa Tengah",
    city: "Surakarta",
    school: "Tingkat Kota",
  },
  // Jawa Timur
  {
    name: "MGMP Bahasa Indonesia SMP Provinsi Jawa Timur",
    description: "Forum MGMP Bahasa Indonesia SMP tingkat Provinsi Jawa Timur. Aktif mengadakan tryout TKA, workshop penyusunan soal HOTS, dan pelatihan Kurikulum Merdeka.",
    province: "Jawa Timur",
    city: "Tingkat Provinsi",
    school: "Tingkat Provinsi",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kab. Jember",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMA/MA se-Kabupaten Jember. Pertemuan rutin membahas program kerja, pertanggungjawaban kegiatan, dan pengembangan profesi.",
    province: "Jawa Timur",
    city: "Jember",
    school: "Tingkat Kabupaten",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Kota Surabaya",
    description: "Komunitas guru Bahasa Indonesia SMP/MTs se-Kota Surabaya. Berbagi strategi pembelajaran inovatif, pengembangan bahan ajar digital, dan persiapan TKA.",
    province: "Jawa Timur",
    city: "Surabaya",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMK Kab. Malang",
    description: "Forum guru Bahasa Indonesia SMK se-Kabupaten Malang. Fokus pada pembelajaran bahasa Indonesia terapan dan penyusunan modul ajar berbasis projek profil pelajar Pancasila.",
    province: "Jawa Timur",
    city: "Malang",
    school: "Tingkat Kabupaten",
  },
  // Kalimantan
  {
    name: "MGMP Bahasa Indonesia SMP Kab. Kutai Kartanegara",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMP se-Kabupaten Kutai Kartanegara, Kalimantan Timur. Disdikbud setempat aktif mendukung peningkatan kompetensi guru melalui MGMP.",
    province: "Kalimantan Timur",
    city: "Kutai Kartanegara",
    school: "Tingkat Kabupaten",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kab. Kotawaringin Timur",
    description: "Forum guru Bahasa Indonesia SMA/MA se-Kabupaten Kotawaringin Timur, Kalimantan Tengah. Wadah berbagi materi ajar dan pengembangan profesionalisme guru.",
    province: "Kalimantan Tengah",
    city: "Kotawaringin Timur",
    school: "Tingkat Kabupaten",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Kota Balikpapan",
    description: "Komunitas guru Bahasa Indonesia SMP/MTs se-Kota Balikpapan. Kegiatan meliputi workshop penyusunan soal, bedah kurikulum, dan berbagi praktik baik.",
    province: "Kalimantan Timur",
    city: "Balikpapan",
    school: "Tingkat Kota",
  },
  // Sumatera
  {
    name: "MGMP Bahasa Indonesia SMA Kab. Bireuen",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMA/SMK se-Kabupaten Bireuen, Aceh. Aktif mengadakan pelatihan kelompok belajar (Kombel) untuk peningkatan kompetensi guru.",
    province: "Aceh",
    city: "Bireuen",
    school: "Tingkat Kabupaten",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Kota Medan",
    description: "Forum guru Bahasa Indonesia SMP/MTs se-Kota Medan. Rutin mengadakan pertemuan untuk membahas strategi pembelajaran dan pengembangan perangkat ajar Kurikulum Merdeka.",
    province: "Sumatera Utara",
    city: "Medan",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kota Palembang",
    description: "Komunitas guru Bahasa Indonesia SMA/MA se-Kota Palembang, Sumatera Selatan. Wadah kolaborasi dan berbagi materi ajar untuk peningkatan kualitas pembelajaran.",
    province: "Sumatera Selatan",
    city: "Palembang",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Kab. Kampar",
    description: "Forum guru Bahasa Indonesia SMP/MTs se-Kabupaten Kampar, Riau. Fokus pada pengembangan literasi dan numerasi melalui pembelajaran bahasa Indonesia.",
    province: "Riau",
    city: "Kampar",
    school: "Tingkat Kabupaten",
  },
  // Sulawesi
  {
    name: "MGMP Bahasa Indonesia SMK-SMA Kab. Kolaka",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMK-SMA se-Kabupaten Kolaka, Sulawesi Tenggara. Wadah berbagi pengalaman dan pengembangan profesionalisme guru.",
    province: "Sulawesi Tenggara",
    city: "Kolaka",
    school: "Tingkat Kabupaten",
  },
  {
    name: "MGMP Bahasa Indonesia SMP Kota Makassar",
    description: "Komunitas guru Bahasa Indonesia SMP/MTs se-Kota Makassar, Sulawesi Selatan. Kegiatan meliputi workshop penyusunan soal HOTS dan berbagi praktik baik pembelajaran.",
    province: "Sulawesi Selatan",
    city: "Makassar",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kota Manado",
    description: "Forum guru Bahasa Indonesia SMA/MA se-Kota Manado, Sulawesi Utara. Rutin mengadakan pertemuan untuk bedah kurikulum dan pengembangan perangkat ajar.",
    province: "Sulawesi Utara",
    city: "Manado",
    school: "Tingkat Kota",
  },
  // Bali & Nusa Tenggara
  {
    name: "MGMP Bahasa Indonesia SMP Kota Denpasar",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMP/MTs se-Kota Denpasar, Bali. Fokus pada pembelajaran bahasa Indonesia yang kontekstual dan berkarakter.",
    province: "Bali",
    city: "Denpasar",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kab. Lombok Barat",
    description: "Forum guru Bahasa Indonesia SMA/MA se-Kabupaten Lombok Barat, NTB. Wadah kolaborasi untuk peningkatan kompetensi guru dan kualitas pembelajaran.",
    province: "Nusa Tenggara Barat",
    city: "Lombok Barat",
    school: "Tingkat Kabupaten",
  },
  // Maluku & Papua
  {
    name: "MGMP Bahasa Indonesia SMP Kota Ambon",
    description: "Komunitas guru Bahasa Indonesia SMP/MTs se-Kota Ambon, Maluku. Berbagi strategi pembelajaran dan pengembangan bahan ajar untuk daerah 3T.",
    province: "Maluku",
    city: "Ambon",
    school: "Tingkat Kota",
  },
  {
    name: "MGMP Bahasa Indonesia SMA Kota Jayapura",
    description: "Forum guru Bahasa Indonesia SMA/MA se-Kota Jayapura, Papua. Fokus pada peningkatan literasi dan kemampuan berbahasa Indonesia yang baik dan benar.",
    province: "Papua",
    city: "Jayapura",
    school: "Tingkat Kota",
  },
  // Kepulauan Riau
  {
    name: "MGMP Bahasa Indonesia SMP/MTS Kota Batam",
    description: "Komunitas guru Bahasa Indonesia, pengawas, dan pembina jurusan se-Kota Batam, Kepulauan Riau. Wadah silaturahmi, belajar, berdiskusi, berkolaborasi, dan berinovasi untuk pendidikan.",
    province: "Kepulauan Riau",
    city: "Batam",
    school: "Tingkat Kota",
  },
  // Lampung
  {
    name: "MGMP Bahasa Indonesia SMA Kab. Lampung Selatan",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMA/MA se-Kabupaten Lampung Selatan. Rutin mengadakan workshop dan berbagi materi ajar.",
    province: "Lampung",
    city: "Lampung Selatan",
    school: "Tingkat Kabupaten",
  },
  // Banten
  {
    name: "MGMP Bahasa Indonesia SMP Kota Tangerang Selatan",
    description: "Forum guru Bahasa Indonesia SMP/MTs se-Kota Tangerang Selatan, Banten. Kegiatan meliputi bedah kisi-kisi TKA, penyusunan bank soal, dan pelatihan Kurikulum Merdeka.",
    province: "Banten",
    city: "Tangerang Selatan",
    school: "Tingkat Kota",
  },
  // DI Yogyakarta
  {
    name: "MGMP Bahasa Indonesia SMA Kota Yogyakarta",
    description: "Komunitas guru Bahasa Indonesia SMA/MA se-Kota Yogyakarta. Wadah kolaborasi untuk pengembangan perangkat ajar dan peningkatan kompetensi pedagogik.",
    province: "DI Yogyakarta",
    city: "Yogyakarta",
    school: "Tingkat Kota",
  },
  // Kalimantan Selatan
  {
    name: "MGMP Bahasa Indonesia SMP Kota Banjarmasin",
    description: "Forum guru Bahasa Indonesia SMP/MTs se-Kota Banjarmasin, Kalimantan Selatan. Fokus pada pengembangan literasi dan pembelajaran bahasa yang menyenangkan.",
    province: "Kalimantan Selatan",
    city: "Banjarmasin",
    school: "Tingkat Kota",
  },
  // Sumatera Barat
  {
    name: "MGMP Bahasa Indonesia SMA Kota Padang",
    description: "Musyawarah Guru Mata Pelajaran Bahasa Indonesia SMA/MA se-Kota Padang, Sumatera Barat. Rutin mengadakan pertemuan untuk berbagi praktik baik dan pengembangan profesi.",
    province: "Sumatera Barat",
    city: "Padang",
    school: "Tingkat Kota",
  },
  // Gorontalo
  {
    name: "MGMP Bahasa Indonesia SMP Kab. Gorontalo",
    description: "Komunitas guru Bahasa Indonesia SMP/MTs se-Kabupaten Gorontalo. Wadah silaturahmi dan pengembangan profesionalisme guru melalui kegiatan MGMP.",
    province: "Gorontalo",
    city: "Gorontalo",
    school: "Tingkat Kabupaten",
  },
];

async function main() {
  console.log("🌱 Seeding MGMP Bahasa Indonesia communities...");

  const existingNames = await prisma.community.findMany({
    where: { type: "MGMP" },
    select: { name: true },
  });
  const existingNameSet = new Set(existingNames.map((c) => c.name.toLowerCase()));

  let created = 0;
  let skipped = 0;
  for (const c of MGMP_COMMUNITIES) {
    if (existingNameSet.has(c.name.toLowerCase())) {
      skipped++;
      continue;
    }
    await prisma.community.create({
      data: {
        name: c.name,
        description: c.description,
        type: "MGMP",
        province: c.province,
        city: c.city,
        school: c.school,
        isPublic: true,
        isVerified: true,
        status: "APPROVED",
        memberCount: 0,
        postCount: 0,
      },
    });
    created++;
  }

  console.log(`✅ Added ${created} MGMP Bahasa Indonesia communities`);
  if (skipped > 0) console.log(`⏩ Skipped ${skipped} (already exist)`);
  console.log("🎉 MGMP seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
