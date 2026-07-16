import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost")) {
    console.error("SAFEGUARD: only runs on localhost");
    process.exit(1);
  }

  const paketId = "local-ukbi-practice";
  const questions = [
    { seksi: "MERESPONS_KAIDAH" as const, text: "Pilihan kata yang tepat untuk melengkapi kalimat berikut adalah...", options: [{ id: "A", text: "mengoperasikan" }, { id: "B", text: "mengoperasikkan" }, { id: "C", text: "mengoperasikaan" }, { id: "D", text: "mengoperasi" }], correctAnswer: "A" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Kalimat yang menggunakan ejaan yang benar adalah...", options: [{ id: "A", text: "Dia membaca buku di perpustakaan" }, { id: "B", text: "Dia membaca buku di perpustakaan." }, { id: "C", text: "Dia, membaca buku di perpustakaan" }, { id: "D", text: "Dia membaca buku, di perpustakaan" }], correctAnswer: "B" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Bentuk pasif yang benar dari 'Ayah membaca koran' adalah...", options: [{ id: "A", text: "Koran dibaca oleh Ayah" }, { id: "B", text: "Koran membacakan Ayah" }, { id: "C", text: "Koran di baca oleh Ayah" }, { id: "D", text: "Koran membaca Ayah" }], correctAnswer: "A" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Kata baku dari 'kwalitet' adalah...", options: [{ id: "A", text: "kwalitas" }, { id: "B", text: "kualitas" }, { id: "C", text: "kualitet" }, { id: "D", text: "kwalitet" }], correctAnswer: "B" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Kalimat dengan konjungsi yang tepat adalah...", options: [{ id: "A", text: "Dia sakit, tetapi tetap masuk sekolah" }, { id: "B", text: "Dia sakit, dan tetap masuk sekolah" }, { id: "C", text: "Dia sakit, atau tetap masuk sekolah" }, { id: "D", text: "Dia sakit, lalu tetap masuk sekolah" }], correctAnswer: "A" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Kata tidak baku dalam 'Aktifitas itu sangat bermanfaat' adalah...", options: [{ id: "A", text: "Aktifitas" }, { id: "B", text: "sangat" }, { id: "C", text: "bermanfaat" }, { id: "D", text: "itu" }], correctAnswer: "A" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Penulisan kata depan yang benar adalah...", options: [{ id: "A", text: "di sekolah" }, { id: "B", text: "disekolah" }, { id: "C", text: "di-sekolah" }, { id: "D", text: "Di sekolah" }], correctAnswer: "A" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Kalimat efektif dari 'Buku itu adalah buku yang tebal' adalah...", options: [{ id: "A", text: "Buku itu tebal" }, { id: "B", text: "Buku itu adalah tebal" }, { id: "C", text: "Buku itu adalah buku tebal" }, { id: "D", text: "Buku itu merupakan tebal" }], correctAnswer: "A" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Arti imbuhan pe-an pada 'pengelolaan' adalah...", options: [{ id: "A", text: "proses mengelola" }, { id: "B", text: "alat untuk mengelola" }, { id: "C", text: "orang yang mengelola" }, { id: "D", text: "hasil mengelola" }], correctAnswer: "A" },
    { seksi: "MERESPONS_KAIDAH" as const, text: "Ide pokok bacaan: Indonesia memiliki kekayaan budaya yang beragam...", options: [{ id: "A", text: "Kekayaan budaya Indonesia" }, { id: "B", text: "Tarian tradisional daerah" }, { id: "C", text: "Keunikan setiap daerah" }, { id: "D", text: "Indonesia yang beragam" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Sinonim kata 'beragam' adalah...", options: [{ id: "A", text: "bermacam-macam" }, { id: "B", text: "sama" }, { id: "C", text: "tunggal" }, { id: "D", text: "sedikit" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Simpulan bacaan polusi udara adalah...", options: [{ id: "A", text: "Kendaraan menyebabkan polusi" }, { id: "B", text: "Polusi tidak berbahaya" }, { id: "C", text: "Kota bebas polusi" }, { id: "D", text: "Asap tidak berbahaya" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Kata 'meningkat' memiliki arti...", options: [{ id: "A", text: "naik" }, { id: "B", text: "turun" }, { id: "C", text: "tetap" }, { id: "D", text: "berkurang" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Pernyataan sesuai bacaan Membaca buku: Membaca memperluas...", options: [{ id: "A", text: "wawasan" }, { id: "B", text: "waktu" }, { id: "C", text: "biaya" }, { id: "D", text: "tenaga" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Antonim 'memperluas' adalah...", options: [{ id: "A", text: "mempersempit" }, { id: "B", text: "memperbesar" }, { id: "C", text: "memanjangkan" }, { id: "D", text: "memperdalam" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Gagasan utama bacaan Air adalah sumber kehidupan...", options: [{ id: "A", text: "Pentingnya air bagi kehidupan" }, { id: "B", text: "Makhluk hidup di air" }, { id: "C", text: "Sumber air bersih" }, { id: "D", text: "Kekeringan" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Manfaat olahraga: menyehatkan jantung dan mengurangi...", options: [{ id: "A", text: "stres" }, { id: "B", text: "berat" }, { id: "C", text: "nafsu" }, { id: "D", text: "tidur" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Kata 'meningkatkan' memiliki imbuhan...", options: [{ id: "A", text: "meN-kan" }, { id: "B", text: "meN-i" }, { id: "C", text: "di-kan" }, { id: "D", text: "ter-kan" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Olahraga teratur meningkatkan kesehatan. Manfaat yang disebut...", options: [{ id: "A", text: "Kesehatan jantung" }, { id: "B", text: "Berat badan ideal" }, { id: "C", text: "Tidur nyenyak" }, { id: "D", text: "Kulit sehat" }], correctAnswer: "A" },
    { seksi: "MEMBACA" as const, text: "Tujuan penulis bacaan olahraga adalah mengajak...", options: [{ id: "A", text: "berolahraga" }, { id: "B", text: "belajar" }, { id: "C", text: "bekerja" }, { id: "D", text: "istirahat" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Tujuan liburan yang disebutkan dalam percakapan adalah...", options: [{ id: "A", text: "Pantai" }, { id: "B", text: "Gunung" }, { id: "C", text: "Kota" }, { id: "D", text: "Desa" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Nada bicara pembicara menunjukkan perasaan...", options: [{ id: "A", text: "Senang" }, { id: "B", text: "Sedih" }, { id: "C", text: "Marah" }, { id: "D", text: "Takut" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Topik utama percakapan adalah tentang...", options: [{ id: "A", text: "Pendidikan" }, { id: "B", text: "Kesehatan" }, { id: "C", text: "Ekonomi" }, { id: "D", text: "Politik" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Pembicara menyarankan untuk...", options: [{ id: "A", text: "Belajar lebih giat" }, { id: "B", text: "Istirahat cukup" }, { id: "C", text: "Makan teratur" }, { id: "D", text: "Olahraga rutin" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Latar tempat percakapan adalah...", options: [{ id: "A", text: "Sekolah" }, { id: "B", text: "Rumah" }, { id: "C", text: "Kantor" }, { id: "D", text: "Taman" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Hubungan kedua pembicara adalah...", options: [{ id: "A", text: "Guru dan murid" }, { id: "B", text: "Dokter dan pasien" }, { id: "C", text: "Kakak dan adik" }, { id: "D", text: "Teman sebaya" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Informasi penting yang disampaikan adalah...", options: [{ id: "A", text: "Jadwal ujian" }, { id: "B", text: "Harga barang" }, { id: "C", text: "Cuaca hari ini" }, { id: "D", text: "Berita olahraga" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Sikap pembicara terhadap topik adalah...", options: [{ id: "A", text: "Mendukung" }, { id: "B", text: "Menolak" }, { id: "C", text: "Netral" }, { id: "D", text: "Ragu" }], correctAnswer: "A" },
    { seksi: "MENDENGARKAN" as const, text: "Kesimpulan percakapan adalah...", options: [{ id: "A", text: "Perlunya kerja sama" }, { id: "B", text: "Hindari konflik" }, { id: "C", text: "Utamakan kepentingan bersama" }, { id: "D", text: "Semua benar" }], correctAnswer: "D" },
    { seksi: "MENDENGARKAN" as const, text: "Waktu percakapan terjadi pada...", options: [{ id: "A", text: "Pagi hari" }, { id: "B", text: "Siang hari" }, { id: "C", text: "Sore hari" }, { id: "D", text: "Malam hari" }], correctAnswer: "A" },
  ];

  let count = 0;
  for (const q of questions) {
    await prisma.uKBIQuestion.create({
      data: {
        seksi: q.seksi,
        text: q.text,
        options: q.options as any,
        correctAnswer: q.correctAnswer,
        type: "PILIHAN_GANDA",
        keywords: [],
        competencyPackets: {
          connect: { id: paketId },
        },
      },
    });
    count++;
  }
  console.log(`Created ${count} questions connected to paket ${paketId}`);

  // Update totalQuestions on paket
  await prisma.paketKompetensi.update({
    where: { id: paketId },
    data: { totalQuestions: count },
  });
  console.log(`Updated paket totalQuestions = ${count}`);
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
