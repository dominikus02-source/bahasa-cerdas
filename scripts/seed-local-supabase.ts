import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost")) {
    console.error("SAFEGUARD: only runs on localhost DB");
    process.exit(1);
  }

  const users = [
    { supabaseId: "71b72b6a-bf78-4edf-b065-1f9f9a73f2ca", email: "loadtest_001@example.com" },
    { supabaseId: "c477ff7a-ad2d-41eb-aa41-3fbfa483c4cd", email: "loadtest_002@example.com" },
    { supabaseId: "4acf5420-7819-4bd6-8b54-144fd9d2599d", email: "loadtest_003@example.com" },
    { supabaseId: "d62f0e90-a126-432c-aa0d-008414c5cb0e", email: "loadtest_004@example.com" },
    { supabaseId: "a730242d-7343-49ae-a9d5-94de6123abd6", email: "loadtest_005@example.com" },
    { supabaseId: "93110c49-73ef-40ab-9b35-396b8c931436", email: "loadtest_006@example.com" },
    { supabaseId: "728701f2-4e98-4998-9451-c862c0ad6e6f", email: "loadtest_007@example.com" },
    { supabaseId: "b67a866f-e3ab-4775-b785-9b593ba07212", email: "loadtest_008@example.com" },
    { supabaseId: "af922752-bc11-4287-b18b-641ccc09caf1", email: "loadtest_009@example.com" },
    { supabaseId: "fd08b858-628c-4d03-9835-39bfa79daa6a", email: "loadtest_010@example.com" },
    { supabaseId: "e8b4dd5a-5d2b-4112-859f-10e204a2f6d6", email: "loadtest_011@example.com" },
    { supabaseId: "b56a5ba5-c540-4726-a24f-2a30bc6034e1", email: "loadtest_012@example.com" },
    { supabaseId: "5dbc0a8c-8bd5-4ba6-a040-6441de0a3c88", email: "loadtest_013@example.com" },
    { supabaseId: "8556bcb8-8f75-4fe8-8e25-1dacce14902d", email: "loadtest_014@example.com" },
    { supabaseId: "4c305305-6cbc-43ec-b010-e2f0d29ba63d", email: "loadtest_015@example.com" },
    { supabaseId: "4d584176-3f7c-43f4-b61b-1391428168b5", email: "loadtest_016@example.com" },
    { supabaseId: "bc89a8e1-743d-4f0c-bd3e-0d2e35cb9e5c", email: "loadtest_017@example.com" },
    { supabaseId: "c2eda8c4-288e-4b47-b6c5-80b2e8160e72", email: "loadtest_018@example.com" },
    { supabaseId: "7069f05b-5809-42db-a039-2aa4d5a00b3a", email: "loadtest_019@example.com" },
    { supabaseId: "f46ca6d6-b2d1-4d16-aa23-05a0c6904828", email: "loadtest_020@example.com" },
  ];

  const demoUser = { supabaseId: "06f3565c-63b3-4e14-b5df-033a034f2c79", email: "demo@example.com" };
  users.push(demoUser);

  for (const u of users) {
    await prisma.user.upsert({
      where: { supabaseId: u.supabaseId },
      update: { email: u.email, fullName: u.email.replace("@example.com", "") },
      create: {
        id: `local-${u.supabaseId.substring(0, 8)}`,
        supabaseId: u.supabaseId,
        email: u.email,
        fullName: u.email.replace("@example.com", ""),
        role: "MURID",
        emailConfirmed: true,
        onboarded: true,
      },
    });
  }
  console.log(`Created/updated ${users.length} User records`);

  const paket = await prisma.paketKompetensi.upsert({
    where: { id: "local-ukbi-practice" },
    update: {},
    create: {
      id: "local-ukbi-practice",
      title: "Simulasi UKBI Practice (30Q)",
      type: "UKBI_SD",
      description: "Paket latihan UKBI untuk load testing lokal",
      duration: 30,
      isActive: true,
      sections: [],
      totalQuestions: 30,
    },
  });
  console.log(`Paket: ${paket.id} - ${paket.title}`);

  const sections = [
    {
      seksi: "MERESPONS_KAIDAH" as const,
      pertanyaan: [
        {
          soal: "Pilihan kata yang tepat untuk melengkapi kalimat berikut adalah...",
          options: [{ id: "A", text: "mengoperasikan" }, { id: "B", text: "mengoperasikkan" }, { id: "C", text: "mengoperasikaan" }, { id: "D", text: "mengoperasi" }],
          jawaban: "A",
        },
        {
          soal: "Kalimat yang menggunakan ejaan yang benar adalah...",
          options: [{ id: "A", text: "Dia membaca buku di perpustakaan" }, { id: "B", text: "Dia membaca buku di perpustakaan." }, { id: "C", text: "Dia, membaca buku di perpustakaan" }, { id: "D", text: "Dia membaca buku, di perpustakaan" }],
          jawaban: "B",
        },
        {
          soal: "Bentuk pasif yang benar dari kalimat 'Ayah membaca koran' adalah...",
          options: [{ id: "A", text: "Koran dibaca oleh Ayah" }, { id: "B", text: "Koran membacakan Ayah" }, { id: "C", text: "Koran di baca oleh Ayah" }, { id: "D", text: "Koran membaca Ayah" }],
          jawaban: "A",
        },
        {
          soal: "Kata baku dari 'kwalitet' adalah...",
          options: [{ id: "A", text: "kwalitas" }, { id: "B", text: "kualitas" }, { id: "C", text: "kualitet" }, { id: "D", text: "kwalitet" }],
          jawaban: "B",
        },
        {
          soal: "Kalimat berikut yang menggunakan konjungsi yang tepat adalah...",
          options: [{ id: "A", text: "Dia sakit, tetapi tetap masuk sekolah" }, { id: "B", text: "Dia sakit, dan tetap masuk sekolah" }, { id: "C", text: "Dia sakit, atau tetap masuk sekolah" }, { id: "D", text: "Dia sakit, lalu tetap masuk sekolah" }],
          jawaban: "A",
        },
        {
          soal: "Kata tidak baku dalam kalimat 'Aktifitas itu sangat bermanfaat' adalah...",
          options: [{ id: "A", text: "Aktifitas" }, { id: "B", text: "sangat" }, { id: "C", text: "bermanfaat" }, { id: "D", text: "itu" }],
          jawaban: "A",
        },
        {
          soal: "Penulisan kata depan yang benar adalah...",
          options: [{ id: "A", text: "di sekolah" }, { id: "B", text: "disekolah" }, { id: "C", text: "di-sekolah" }, { id: "D", text: "Di sekolah" }],
          jawaban: "A",
        },
        {
          soal: "Kalimat efektif dari 'Buku itu adalah buku yang tebal' adalah...",
          options: [{ id: "A", text: "Buku itu tebal" }, { id: "B", text: "Buku itu adalah tebal" }, { id: "C", text: "Buku itu adalah buku tebal" }, { id: "D", text: "Buku itu merupakan tebal" }],
          jawaban: "A",
        },
        {
          soal: "Arti imbuhan pe-an pada kata 'pengelolaan' adalah...",
          options: [{ id: "A", text: "proses mengelola" }, { id: "B", text: "alat untuk mengelola" }, { id: "C", text: "orang yang mengelola" }, { id: "D", text: "hasil mengelola" }],
          jawaban: "A",
        },
        {
          soal: "Bacaan: 'Indonesia memiliki kekayaan budaya yang beragam.' Ide pokok paragraf tersebut adalah...",
          options: [{ id: "A", text: "Kekayaan budaya Indonesia" }, { id: "B", text: "Tarian tradisional daerah" }, { id: "C", text: "Keunikan setiap daerah" }, { id: "D", text: "Indonesia yang beragam" }],
          jawaban: "A",
        },
      ],
    },
    {
      seksi: "MEMBACA" as const,
      pertanyaan: [
        {
          soal: "Sinonim kata 'beragam' adalah...",
          options: [{ id: "A", text: "bermacam-macam" }, { id: "B", text: "sama" }, { id: "C", text: "tunggal" }, { id: "D", text: "sedikit" }],
          jawaban: "A",
        },
        {
          soal: "Bacaan: 'Polusi udara meningkat karena asap kendaraan.' Simpulan yang tepat adalah...",
          options: [{ id: "A", text: "Kendaraan dan pabrik menyebabkan polusi" }, { id: "B", text: "Polusi udara tidak berbahaya" }, { id: "C", text: "Kota besar bebas polusi" }, { id: "D", text: "Asap pabrik tidak berbahaya" }],
          jawaban: "A",
        },
        {
          soal: "Kata 'meningkat' memiliki arti...",
          options: [{ id: "A", text: "naik" }, { id: "B", text: "turun" }, { id: "C", text: "tetap" }, { id: "D", text: "berkurang" }],
          jawaban: "A",
        },
        {
          soal: "Bacaan: 'Membaca buku memperluas wawasan.' Pernyataan yang sesuai adalah...",
          options: [{ id: "A", text: "Membaca memperluas wawasan" }, { id: "B", text: "Membaca membuang waktu" }, { id: "C", text: "Pengetahuan tidak penting" }, { id: "D", text: "Buku adalah hiburan" }],
          jawaban: "A",
        },
        {
          soal: "Antonim 'memperluas' adalah...",
          options: [{ id: "A", text: "mempersempit" }, { id: "B", text: "memperbesar" }, { id: "C", text: "memanjangkan" }, { id: "D", text: "memperdalam" }],
          jawaban: "A",
        },
        {
          soal: "Bacaan: 'Air adalah sumber kehidupan.' Gagasan utama adalah...",
          options: [{ id: "A", text: "Pentingnya air bagi kehidupan" }, { id: "B", text: "Makhluk hidup di air" }, { id: "C", text: "Sumber air bersih" }, { id: "D", text: "Kekeringan di musim kemarau" }],
          jawaban: "A",
        },
        {
          soal: "Manfaat olahraga yang disebutkan dalam bacaan adalah...",
          options: [{ id: "A", text: "Menyehatkan jantung dan mengurangi stres" }, { id: "B", text: "Menambah berat badan" }, { id: "C", text: "Menyebabkan sakit" }, { id: "D", text: "Menghabiskan waktu" }],
          jawaban: "A",
        },
        {
          soal: "Kata 'meningkatkan' memiliki imbuhan...",
          options: [{ id: "A", text: "meN-kan" }, { id: "B", text: "meN-i" }, { id: "C", text: "di-kan" }, { id: "D", text: "ter-kan" }],
          jawaban: "A",
        },
        {
          soal: "Bacaan: 'Olahraga teratur meningkatkan kesehatan.' Manfaat yang disebut adalah...",
          options: [{ id: "A", text: "Kesehatan jantung" }, { id: "B", text: "Berat badan ideal" }, { id: "C", text: "Tidur nyenyak" }, { id: "D", text: "Kulit sehat" }],
          jawaban: "A",
        },
        {
          soal: "Tujuan penulis dalam bacaan adalah...",
          options: [{ id: "A", text: "Mengajak berolahraga" }, { id: "B", text: "Menjelaskan bahaya olahraga" }, { id: "C", text: "Membandingkan olahraga" }, { id: "D", text: "Mengkritik olahraga" }],
          jawaban: "A",
        },
      ],
    },
    {
      seksi: "MENDENGARKAN" as const,
      pertanyaan: [
        {
          soal: "Dalam percakapan tentang rencana liburan, tujuan yang disebutkan adalah...",
          options: [{ id: "A", text: "Pantai" }, { id: "B", text: "Gunung" }, { id: "C", text: "Kota" }, { id: "D", text: "Desa" }],
          jawaban: "A",
        },
        {
          soal: "Nada bicara pembicara menunjukkan perasaan...",
          options: [{ id: "A", text: "Senang" }, { id: "B", text: "Sedih" }, { id: "C", text: "Marah" }, { id: "D", text: "Takut" }],
          jawaban: "A",
        },
        {
          soal: "Topik utama percakapan adalah tentang...",
          options: [{ id: "A", text: "Pendidikan" }, { id: "B", text: "Kesehatan" }, { id: "C", text: "Ekonomi" }, { id: "D", text: "Politik" }],
          jawaban: "A",
        },
        {
          soal: "Pembicara menyarankan untuk...",
          options: [{ id: "A", text: "Belajar lebih giat" }, { id: "B", text: "Istirahat cukup" }, { id: "C", text: "Makan teratur" }, { id: "D", text: "Olahraga rutin" }],
          jawaban: "A",
        },
        {
          soal: "Latar tempat percakapan adalah...",
          options: [{ id: "A", text: "Sekolah" }, { id: "B", text: "Rumah" }, { id: "C", text: "Kantor" }, { id: "D", text: "Taman" }],
          jawaban: "A",
        },
        {
          soal: "Hubungan antara kedua pembicara adalah...",
          options: [{ id: "A", text: "Guru dan murid" }, { id: "B", text: "Dokter dan pasien" }, { id: "C", text: "Kakak dan adik" }, { id: "D", text: "Teman sebaya" }],
          jawaban: "A",
        },
        {
          soal: "Informasi penting yang disampaikan adalah...",
          options: [{ id: "A", text: "Jadwal ujian" }, { id: "B", text: "Harga barang" }, { id: "C", text: "Cuaca hari ini" }, { id: "D", text: "Berita olahraga" }],
          jawaban: "A",
        },
        {
          soal: "Sikap pembicara terhadap topik adalah...",
          options: [{ id: "A", text: "Mendukung" }, { id: "B", text: "Menolak" }, { id: "C", text: "Netral" }, { id: "D", text: "Ragu" }],
          jawaban: "A",
        },
        {
          soal: "Kesimpulan dari percakapan adalah...",
          options: [{ id: "A", text: "Perlunya kerja sama" }, { id: "B", text: "Hindari konflik" }, { id: "C", text: "Utamakan kepentingan bersama" }, { id: "D", text: "Semua benar" }],
          jawaban: "D",
        },
        {
          soal: "Waktu percakapan terjadi pada...",
          options: [{ id: "A", text: "Pagi hari" }, { id: "B", text: "Siang hari" }, { id: "C", text: "Sore hari" }, { id: "D", text: "Malam hari" }],
          jawaban: "A",
        },
      ],
    },
  ];

  let questionCount = 0;
  for (const section of sections) {
    for (const q of section.pertanyaan) {
      await prisma.uKBIQuestion.create({
        data: {
          seksi: section.seksi,
          text: q.soal,
          options: q.options as any,
          correctAnswer: q.jawaban,
          type: "PILIHAN_GANDA",
          keywords: [],
          competencyPackets: {
            connect: { id: paket.id },
          },
        },
      });
      questionCount++;
    }
  }
  console.log(`Created ${questionCount} UKBI questions`);

  console.log("\nSeed complete!");
  console.log(`- ${users.length} User records`);
  console.log(`- 1 PaketKompetensi (${paket.id})`);
  console.log(`- ${questionCount} UKBI questions`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
