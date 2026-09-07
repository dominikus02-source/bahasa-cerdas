/**
 * Question Factory V2 — V13 Difficulty-Cognitive Consistency Golden Fixtures (P3.5D-2).
 *
 * 30 golden fixtures covering:
 *   G01–G10: PASS (consistent difficulty-cognitive)
 *   G11–G18: FAIL (difficulty-cognitive mismatch, ≥2 dimensions)
 *   G19–G24: REVIEW (borderline, exactly 1 dimension mismatch)
 *   G25–G28: INSUFFICIENT (missing data)
 *   G29–G30: Over-rejection resistance
 *
 * Section references:
 *   P3.5D-2 §V13.4 — Golden fixtures specification
 *   P3.5D-2 §V13.5 — Over-rejection resistance
 */

import type { CanonicalItem } from "../types";

// ─── Base Helper (V12 pattern) ──────────────────────────────────────────────

function baseItem(overrides: {
  id: string;
  stem: string;
  options: string[];
  correctAnswer?: string;
  qtype?: "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";
  skill?: string;
  subskill?: string;
  cognitiveTarget?: string;
  topic?: string;
  difficulty?: string;
  stimulusContent?: string;
}): CanonicalItem {
  return {
    identity: {
      id: overrides.id,
      version: 1,
      source: "V2_PILOT",
      createdAt: "2026-01-15T00:00:00.000Z",
      createdById: "test-user-v13",
    },
    content: {
      stem: overrides.stem,
      options: overrides.options,
      stimulusContent: overrides.stimulusContent,
    },
    responseModel: {
      questionType: (overrides.qtype ?? "PILIHAN_GANDA") as "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT",
      correctAnswer: overrides.correctAnswer ?? "A",
    },
    purpose: {
      purpose: "PRACTICE",
      d10State: "HYPOTHESIS",
    },
    taxonomy: {
      skill: overrides.skill ?? "GRAMMAR",
      subskill: overrides.subskill,
      difficulty: (overrides.difficulty ?? "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
      cognitiveTarget: overrides.cognitiveTarget,
      topic: overrides.topic,
    },
    provenance: {
      provenance: "EXISTING_DATA",
    },
    reviewState: "NOT_REVIEWED",
  };
}

// ─── G01–G10: PASS (consistent difficulty-cognitive) ─────────────────────────

/** G01: EASY + R1 recall + short stem + 4 options → PASS */
export const G01_EASY_R1_RECALL: CanonicalItem = baseItem({
  id: "V13-G01",
  stem: "Apa nama ibu kota Indonesia?",
  options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
  difficulty: "EASY",
  cognitiveTarget: "MENGINGAT",
});

/** G02: EASY + R2 understand + medium stem → PASS */
export const G02_EASY_R2_UNDERSTAND: CanonicalItem = baseItem({
  id: "V13-G02",
  stem: "Apa yang dimaksud dengan energi terbarukan?",
  options: [
    "Energi yang dapat dipulihkan setelah digunakan",
    "Energi yang berasal dari bahan bakar fosil",
    "Energi yang hanya tersedia di laut",
    "Energi yang tidak dapat digunakan manusia",
  ],
  difficulty: "EASY",
  cognitiveTarget: "MEMAHAMI",
});

/** G03: EASY + R1 + BenarSalah + short → PASS */
export const G03_EASY_R1_BS: CanonicalItem = baseItem({
  id: "V13-G03",
  stem: "Air bersih adalah sumber kehidupan bagi semua makhluk.",
  options: ["Benar", "Salah"],
  qtype: "BENAR_SALAH",
  difficulty: "EASY",
  cognitiveTarget: "MENGINGAT",
});

/** G04: EASY + R3 apply — borderline but PASS (R3 at boundary of EASY range [1,3]) */
export const G04_EASY_R3_BORDERLINE: CanonicalItem = baseItem({
  id: "V13-G04",
  stem: "Dalam kalimat berikut, tentukan kata kerja: 'Anak-anak bermain di taman.'",
  options: ["bermain", "anak-anak", "di", "taman"],
  difficulty: "EASY",
  cognitiveTarget: "MENERAPKAN",
});

/** G05: MEDIUM + R2 understand + stimulus (95 words) → PASS */
export const G05_MEDIUM_R2_WITH_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G05",
  stem: "Berdasarkan teks di atas, apa pesan utama yang ingin disampaikan penulis?",
  stimulusContent:
    "Pemanasan global merupakan fenomena meningkatnya suhu rata-rata permukaan bumi akibat peningkatan gas rumah kaca. Dampaknya meliputi pencairan es di kutub dan kenaikan permukaan laut. Selain itu, perubahan pola cuaca ekstrem juga menjadi ancaman serius bagi kehidupan manusia dan ekosistem. Oleh karena itu, upaya mitigasi harus segera dilakukan.",
  options: [
    "Pentingnya menjaga keseimbangan lingkungan",
    "Sejarah penemuan gas rumah kaca",
    "Jenis-jenis energi terbarukan",
    "Cara menghemat penggunaan energi",
  ],
  difficulty: "MEDIUM",
  cognitiveTarget: "MEMAHAMI",
});

/** G06: MEDIUM + R3 apply + stimulus → PASS */
export const G06_MEDIUM_R3_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G06",
  stem: "Berdasarkan aturan tata bahasa di atas, manakah kalimat yang menggunakan imbuhan dengan benar?",
  stimulusContent:
    "Imbuhan me- di depan kata dasar yang diawali konsonan akan mengalami perubahan bunyi. Contoh: me + pandang menjadi memandang, me + tulis menjadi menulis, me + pakai menjadi memakai. Perubahan ini terjadi karena asimilasi bunyi dalam bahasa Indonesia.",
  options: [
    "Dia memandang pemandangan indah itu dengan kagum",
    "Dia memandang pemandangan indah itu dengan sekali pandang",
    "Dia memandang pemandangan indah itu sebentar saja",
    "Dia memandang pemandangan indah itu dengan penuh syukur",
  ],
  difficulty: "MEDIUM",
  cognitiveTarget: "MENERAPKAN",
});

/** G07: MEDIUM + R3 apply + no stimulus → PASS */
export const G07_MEDIUM_R3_NO_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G07",
  stem: "Tentukan kalimat yang menggunakan tanda baca koma dengan benar dalam surat dinas.",
  options: [
    "Yth. Bapak/Ibu, bersama ini kami sampaikan laporan.",
    "Yth Bapak/Ibu bersama ini kami sampaikan laporan",
    "Yth. Bapak/Ibu bersama ini, kami sampaikan laporan",
    "Yth Bapak/Ibu, bersama ini kami sampaikan laporan.",
  ],
  difficulty: "MEDIUM",
  cognitiveTarget: "MENERAPKAN",
});

/** G08: MEDIUM + R4 analyze + stimulus → PASS */
export const G08_MEDIUM_R4_ANALYZE: CanonicalItem = baseItem({
  id: "V13-G08",
  stem: "Apa hubungan antara pola hidup sehat dan kualitas udara berdasarkan teks tersebut?",
  stimulusContent:
    "Kualitas udara yang buruk dapat meningkatkan risiko penyakit pernapasan seperti asma dan bronkitis. Oleh karena itu, menjaga pola hidup sehat termasuk menghindari aktivitas di luar ruangan saat polusi udara tinggi sangat penting untuk menjaga kesehatan paru-paru.",
  options: [
    "Pola hidup sehat membantu mengurangi risiko penyakit akibat polusi udara",
    "Kualitas udara tidak berpengaruh terhadap kesehatan",
    "Pola hidup sehat hanya berpengaruh pada penyakit dalam",
    "Kualitas udara baik tidak memerlukan pola hidup sehat",
  ],
  difficulty: "MEDIUM",
  cognitiveTarget: "MENGANALISIS",
});

/** G09: HARD + R4 analyze + long stem (27 words) + stimulus (112 words) + conjunctions → PASS */
export const G09_HARD_R4_LONG_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G09",
  stem: "Analisislah argumen penulis dalam teks berikut secara mendalam. Perhatikan bagaimana penulis membangun thesis dan dukungan data, lalu tentukan kesimpulan yang paling tepat berdasarkan analisis Anda terhadap teks.",
  stimulusContent:
    "Pendidikan karakter harus dimulai sejak dini. Anak-anak yang dibiasakan untuk jujur, disiplin, dan bertanggung jawab sejak kecil cenderung menjadi individu yang lebih baik di masa dewasa. Penelitian menunjukkan bahwa pembentukan karakter pada usia emas (0-6 tahun) memiliki dampak jangka panjang yang signifikan terhadap perkembangan sosial dan emosional anak. Oleh karena itu, guru dan orang tua harus bekerja sama dalam membentuk karakter anak sejak usia dini.",
  options: [
    "Pendidikan karakter efektif bila dimulai sejak usia dini dengan kolaborasi guru dan orang tua",
    "Anak-anak usia dini tidak memerlukan pendidikan karakter formal",
    "Pendidikan karakter hanya efektif untuk anak usia dewasa di sekolah",
    "Pembentukan karakter tidak berpengaruh pada perkembangan sosial anak",
  ],
  difficulty: "HARD",
  cognitiveTarget: "MENGANALISIS",
});

/** G10: HARD + R5 evaluate + long stem (26 words) + long stimulus (128 words) + multi-part → PASS */
export const G10_HARD_R5_EVALUATE: CanonicalItem = baseItem({
  id: "V13-G10",
  stem: "Setujukah Anda dengan pernyataan berikut? Berikan alasan berdasarkan dua argumen yang berbeda secara detail, lalu tentukan posisi Anda yang paling kuat dengan justifikasi.",
  stimulusContent:
    "Argumen 1: Teknologi AI akan menggantikan pekerjaan manusia dalam 10 tahun ke depan karena otomasi semakin canggih dan biaya implementasi semakin rendah. Argumen 2: Teknologi AI justru akan menciptakan jenis pekerjaan baru yang belum ada sebelumnya, seperti prompt engineer dan AI ethicist, sehingga net job creation tetap positif.",
  options: [
    "Setuju dengan argumen 1 karena otomasi mengancam pekerjaan tradisional secara massif",
    "Setuju dengan argumen 2 karena inovasi selalu menciptakan peluang baru yang tak terduga",
    "Keduanya memiliki validitas tergantung pada konteks implementasi AI di sektor berbeda",
    "Tidak setuju dengan keduanya karena prediksi 10 tahun terlalu spekulatif untuk disimpulkan",
  ],
  difficulty: "HARD",
  cognitiveTarget: "MENGEVALUASI",
});

// ─── G11–G18: FAIL (difficulty-cognitive mismatch, ≥2 dimensions) ────────────

/** G11: EASY + R5 evaluate + long stimulus → FAIL (cognitive TOO_LOW + stimulus TOO_HIGH via long stem) */
export const G11_EASY_R5_MISMATCH: CanonicalItem = baseItem({
  id: "V13-G11",
  stem: "Evaluasi kualitas puisi berikut berdasarkan unsur intrinsik dan ekstrinsiknya, lalu bandingkan dengan puisi karya penyair lain yang sezaman.",
  stimulusContent:
    "Malam telah larut, bintang gemintang, bulan purnama menyinari bumi, menyejukkan hati yang resah. Dalam diam ku bisikkan doa, untukmu yang jauh di sana. Secangkir kopi hangat menemani malam panjang, asapnya naik berputar-putar seperti pikiran yang tak kunjung usai.",
  options: [
    "Puisi ini berhasil menyampaikan emosi melalui imagery visual yang kuat dan metafora mendalam",
    "Puisi ini kurang efektif karena tidak menggunakan rima yang konsisten dalam setiap bait",
    "Keduanya benar karena puisi memiliki kelebihan dan kekurangan dari sudut pandang berbeda",
    "Puisi ini tidak memenuhi kriteria puisi Indonesia modern berdasarkan kaidah sastra",
  ],
  difficulty: "EASY",
  cognitiveTarget: "MENGEVALUASI",
});

/** G12: EASY + R6 create + long stem → FAIL (cognitive TOO_LOW + stimulus TOO_HIGH) */
export const G12_EASY_R6_MISMATCH: CanonicalItem = baseItem({
  id: "V13-G12",
  stem: "Buatlah cerpen pendek dengan tema lingkungan yang memiliki alur cerita jelas, tokoh utama yang berkembang, dan resolusi yang memuaskan.",
  options: [
    "Menggunakan setting hutan tropis dengan konflik antara penebang dan aktivis lingkungan",
    "Menggunakan setting kota dengan konflik polusi udara dan kesehatan masyarakat urban",
    "Keduanya merupakan ide yang baik untuk cerpen lingkungan dengan pendekatan berbeda",
    "Tema lingkungan tidak cocok untuk cerpen pendek karena terlalu luas cakupannya",
  ],
  difficulty: "EASY",
  cognitiveTarget: "MENCIPTAKAN",
});

/** G13: HARD + R1 recall + short stem + trivial options → FAIL (cognitive TOO_HIGH + stimulus TOO_LOW + integration TOO_LOW) */
export const G13_HARD_R1_MISMATCH: CanonicalItem = baseItem({
  id: "V13-G13",
  stem: "Sebutkan nama presiden pertama Indonesia!",
  options: ["Soekarno", "Soeharto", "Habibie", "Gus Dur"],
  difficulty: "HARD",
  cognitiveTarget: "MENGINGAT",
});

/** G14: HARD + R1 + no stimulus + short stem → FAIL (cognitive TOO_HIGH + stimulus TOO_LOW) */
export const G14_HARD_R1_NO_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G14",
  stem: "Apa warna langit pada siang hari yang cerah?",
  options: ["Biru", "Merah", "Hijau", "Kuning"],
  difficulty: "HARD",
  cognitiveTarget: "MENGINGAT",
});

/** G15: MEDIUM + R1 recall + short stem → FAIL (cognitive TOO_HIGH + stimulus TOO_LOW) */
export const G15_MEDIUM_R1_MISMATCH: CanonicalItem = baseItem({
  id: "V13-G15",
  stem: "Apa nama sungai terpanjang di Indonesia?",
  options: ["Kapuas", "Mahakam", "Barito", "Mus"],
  difficulty: "MEDIUM",
  cognitiveTarget: "MENGINGAT",
});

/** G16: EASY + long stem (48 words, many conjunctions) + stimulus → FAIL (stimulus TOO_HIGH + integration TOO_HIGH) */
export const G16_EASY_LONG_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G16",
  stem: "Bacalah teks berikut dengan saksama, lalu tentukan topik utama yang dibahas oleh penulis dalam paragraf tersebut secara tepat dan benar. Perhatikan setiap kalimat dengan seksama dan identifikasi gagasan pokok yang menjadi fokus utama pembahasan penulis, serta bagaimana penulis mengembangkan gagasan tersebut dari awal hingga akhir paragraf dengan runtut dan sistematis.",
  stimulusContent:
    "Indonesia adalah negara kepulauan terbesar di dunia dengan lebih dari 17.000 pulau. Kekayaan alam Indonesia meliputi hutan tropis, sungai-sungai besar, dan pegunungan yang membentang dari Sabang sampai Merauke.",
  options: [
    "Kekayaan alam Indonesia dan jumlah pulau yang dimiliki",
    "Sejarah penemuan kepulauan Indonesia oleh para penjelajah",
    "Jenis-jenis hutan tropis yang ada di Indonesia saat ini",
    "Perbandingan jumlah pulau Indonesia dengan negara lain",
  ],
  difficulty: "EASY",
  cognitiveTarget: "MEMAHAMI",
});

/** G17: HARD + trivial content (1+1) + short stem + trivial options → FAIL (cognitive N/A + stimulus TOO_LOW + integration TOO_LOW + distractor TOO_LOW) */
export const G17_HARD_TRIVIAL_CONTENT: CanonicalItem = baseItem({
  id: "V13-G17",
  stem: "1 + 1 = ?",
  options: ["2", "3", "1", "4"],
  difficulty: "HARD",
  cognitiveTarget: "MENERAPKAN",
});

/** G18: EASY + complex multi-part stem (44 words, multi-step) → FAIL (cognitive TOO_LOW + stimulus TOO_HIGH + task TOO_HIGH) */
export const G18_EASY_COMPLEX_STEM: CanonicalItem = baseItem({
  id: "V13-G18",
  stem: "Langkah pertama dalam menulis esai argumentatif adalah menentukan thesis statement yang jelas dan provokatif. Langkah kedua adalah mengumpulkan bukti pendukung dari sumber terpercaya dan relevan. Langkah ketiga adalah menyusun kerangka esai yang logis dan runtut. Berdasarkan langkah-langkah tersebut, manakah yang merupakan langkah paling kritis dalam menulis esai argumentatif?",
  options: [
    "Menentukan thesis statement yang jelas dan provokatif untuk pembaca",
    "Mengumpulkan bukti pendukung dari sumber terpercaya dan relevan",
    "Menyusun kerangka esai yang logis dan runtut secara sistematis",
    "Ketiga langkah tersebut sama pentingnya dan tidak dapat dipisahkan",
  ],
  difficulty: "EASY",
  cognitiveTarget: "MENGANALISIS",
});

// ─── G19–G24: REVIEW (borderline, exactly 1 dimension mismatch) ──────────────

/** G19: HARD + R6 create + short stimulus (16 words) → REVIEW (stimulus TOO_LOW, only 1 mismatch) */
export const G19_HARD_R6_SHORT_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G19",
  stem: "Buatlah kalimat passive voice dari kalimat aktif berikut dengan memperhatikan struktur tata bahasa yang benar dan tepat sesuai kaidah.",
  stimulusContent: "The teacher explains the lesson to the students every morning in the classroom.",
  options: [
    "The lesson is explained to the students by the teacher every morning",
    "The lesson explained by the teacher to the students every morning",
    "The students are explained the lesson by the teacher every morning",
    "The teacher is explained the lesson to the students every morning",
  ],
  difficulty: "HARD",
  cognitiveTarget: "MENCIPTAKAN",
});

/** G20: MEDIUM + R5 evaluate + stimulus → REVIEW (R5 at upper boundary of MEDIUM [2,4], 1 dim mismatch) */
export const G20_MEDIUM_R5_EVALUATE: CanonicalItem = baseItem({
  id: "V13-G20",
  stem: "Apakah pernyataan berikut benar atau salah? Berikan penjelasan singkat berdasarkan fakta.",
  stimulusContent:
    "Pernyataan: Semua hewan mamalia hidup di darat. Fakta: Paus, lumba-lumba, dan dugong adalah mamalia yang hidup di air.",
  options: [
    "Benar karena mamalia memiliki ciri khas tertentu yang membedakan dari hewan lain",
    "Salah karena ada mamalia yang hidup di air seperti paus dan lumba-lumba",
    "Tidak dapat ditentukan karena definisi mamalia tidak jelas dalam konteks ini",
    "Benar sebagian karena beberapa mamalia hidup di air tetapi mayoritas di darat",
  ],
  difficulty: "MEDIUM",
  cognitiveTarget: "MENGEVALUASI",
});

/** G21: EASY + R3 apply + short stimulus → REVIEW (R3 at boundary of EASY [1,3], 1 dim mismatch) */
export const G21_EASY_R3_SIMPLE_STIMULUS: CanonicalItem = baseItem({
  id: "V13-G21",
  stem: "Berdasarkan aturan berikut, manakah kalimat yang benar dan tepat?",
  stimulusContent: "Kata 'yang' digunakan untuk menunjukkan hubungan penghubung antara kata benda dan kata sifat atau kata kerja.",
  options: [
    "Buku yang saya baca sangat menarik",
    "Buku yang saya baca sangat menarik sekali",
    "Buku yang saya baca itu sangat menarik sekali",
    "Buku yang saya baca sangatlah menarik sekali",
  ],
  difficulty: "EASY",
  cognitiveTarget: "MENERAPKAN",
});

/** G22: HARD + R4 analyze + medium stimulus + trivial distractors → REVIEW (distractor low, 1 dim mismatch) */
export const G22_HARD_R4_TRIVIAL_DISTRACTORS: CanonicalItem = baseItem({
  id: "V13-G22",
  stem: "Analisis hubungan sebab-akibat dalam paragraf berikut dan identifikasi factor paling signifikan secara mendalam.",
  stimulusContent:
    "Curah hujan yang tinggi di awal musim hujan menyebabkan beberapa sungai meluap. Akibatnya, beberapa desa di sekitar sungai terendam banjir setinggi satu meter. Ribuan warga harus mengungsi ke tempat yang lebih aman. Kerugian materi diperkirakan mencapai miliaran rupiah.",
  options: [
    "Curah hujan tinggi menyebabkan banjir yang mengungsi ribuan warga desa",
    "Sungai meluap karena desa-desa terendam banjir setinggi satu meter",
    "Banjir terjadi karena kekurangan curah hujan di awal musim kemarau",
    "Curah hujan tinggi tidak berpengaruh terhadap kondisi sungai dan desa",
  ],
  difficulty: "HARD",
  cognitiveTarget: "MENGANALISIS",
});

/** G23: MEDIUM + R3 apply + stimulus + simple distractors → REVIEW (distractor borderline, 1 dim mismatch) */
export const G23_MEDIUM_R3_SIMPLE_DISTRACTORS: CanonicalItem = baseItem({
  id: "V13-G23",
  stem: "Gunakan aturan tata bahasa di atas untuk menentukan kalimat yang benar dan tepat.",
  stimulusContent:
    "Aturan: Kata 'efektif' digunakan untuk menyatakan sesuatu yang memiliki efek atau pengaruh. Kata 'efisien' digunakan untuk menyatakan sesuatu yang hemat dan optimal dalam penggunaan sumber daya.",
  options: [
    "Metode ini efektif untuk meningkatkan hasil belajar siswa",
    "Metode ini efisien untuk meningkatkan hasil belajar siswa",
    "Metode ini efektif dan efisien untuk meningkatkan hasil",
    "Keduanya benar karena memiliki arti yang sama dalam konteks pendidikan",
  ],
  difficulty: "MEDIUM",
  cognitiveTarget: "MENERAPKAN",
});

/** G24: MEDIUM + R2 understand + long stem (40 words) → REVIEW (stimulus complexity borderline, 1 dim mismatch) */
export const G24_MEDIUM_R2_LONG_STEM: CanonicalItem = baseItem({
  id: "V13-G24",
  stem: "Jelaskan perbedaan antara energi kinetik dan energi potensial berdasarkan prinsip-prinsip dasar fisika yang telah dipelajari, sertakan contoh masing-masing dalam kehidupan sehari-hari beserta penjelasan logisnya.",
  options: [
    "Energi kinetik adalah energi gerak, energi potensial adalah energi simpanan pada posisi",
    "Energi kinetik dan potensial adalah jenis energi yang sama dalam fisika dasar",
    "Energi potensial hanya ada pada benda yang diam sempurna tanpa gaya eksternal",
    "Energi kinetik tidak ada hubungannya dengan kecepatan atau massa benda",
  ],
  difficulty: "MEDIUM",
  cognitiveTarget: "MEMAHAMI",
});

// ─── G25–G28: INSUFFICIENT (missing data) ───────────────────────────────────

/** G25: No difficulty declared → DIFFICULTY_EVIDENCE_INSUFFICIENT */
export const G25_NO_DIFFICULTY: CanonicalItem = {
  identity: {
    id: "V13-G25",
    version: 1,
    source: "V2_PILOT",
    createdAt: "2026-01-15T00:00:00.000Z",
    createdById: "test-user-v13",
  },
  content: {
    stem: "Apa yang dimaksud dengan fotosintesis?",
    options: [
      "Proses pengubahan energi cahaya menjadi energi kimia pada tumbuhan",
      "Proses pengubahan energi panas menjadi energi listrik pada pembangkit",
      "Proses pengubahan energi mekanik menjadi energi panas pada mesin",
      "Proses pengubahan energi kimia menjadi energi cahaya pada lampu",
    ],
  },
  responseModel: { questionType: "PILIHAN_GANDA", correctAnswer: "A" },
  purpose: { purpose: "PRACTICE", d10State: "HYPOTHESIS" },
  taxonomy: { skill: "Pengetahuan", difficulty: undefined as any, cognitiveTarget: "MEMAHAMI" },
  provenance: { provenance: "EXISTING_DATA" },
  reviewState: "NOT_REVIEWED",
};

/** G26: No cognitive target → DIFFICULTY_EVIDENCE_INSUFFICIENT (REVIEW with only cognitive missing) */
export const G26_NO_COGNITIVE: CanonicalItem = {
  identity: {
    id: "V13-G26",
    version: 1,
    source: "V2_PILOT",
    createdAt: "2026-01-15T00:00:00.000Z",
    createdById: "test-user-v13",
  },
  content: {
    stem: "Manakah kalimat yang menggunakan tanda baca dengan benar?",
    options: [
      "Hari ini, kita akan belajar tata bahasa Indonesia dengan seksama.",
      "Hari ini kita akan belajar tata bahasa Indonesia dengan seksama",
      "Hari ini kita akan, belajar tata bahasa Indonesia dengan seksama",
      "Hari ini, kita akan belajar, tata bahasa Indonesia dengan seksama",
    ],
  },
  responseModel: { questionType: "PILIHAN_GANDA", correctAnswer: "A" },
  purpose: { purpose: "PRACTICE", d10State: "HYPOTHESIS" },
  taxonomy: { skill: "Tata Bahasa", difficulty: "MEDIUM" as any, cognitiveTarget: undefined as any },
  provenance: { provenance: "EXISTING_DATA" },
  reviewState: "NOT_REVIEWED",
};

/** G27: Neither difficulty nor cognitive → DIFFICULTY_EVIDENCE_INSUFFICIENT */
export const G27_NO_DIFFICULTY_NO_COGNITIVE: CanonicalItem = {
  identity: {
    id: "V13-G27",
    version: 1,
    source: "V2_PILOT",
    createdAt: "2026-01-15T00:00:00.000Z",
    createdById: "test-user-v13",
  },
  content: {
    stem: "Apa manfaat hutan bagi kehidupan manusia?",
    options: [
      "Sumber oksigen dan penyerap karbondioksida yang sangat penting",
      "Sumber bahan bakar fosil yang melimpah di wilayah tropis",
      "Tempat pembuangan sampah yang efisien dan terkendali",
      "Sumber energi nuklir yang dapat diperbarui secara alami",
    ],
  },
  responseModel: { questionType: "PILIHAN_GANDA", correctAnswer: "A" },
  purpose: { purpose: "PRACTICE", d10State: "HYPOTHESIS" },
  taxonomy: { skill: "Pengetahuan", difficulty: undefined as any, cognitiveTarget: undefined as any },
  provenance: { provenance: "EXISTING_DATA" },
  reviewState: "NOT_REVIEWED",
};

/** G28: Invalid difficulty value → DIFFICULTY_EVIDENCE_INSUFFICIENT */
export const G28_INVALID_DIFFICULTY: CanonicalItem = baseItem({
  id: "V13-G28",
  stem: "Tentukan jenis kalimat berikut: deklaratif, interrogatif, imperatif, atau optatif.",
  options: [
    "Kalimat deklaratif yang menyatakan informasi atau pernyataan",
    "Kalimat interrogatif yang menanyakan sesuatu kepada pembaca",
    "Kalimat imperatif yang memberikan perintah atau instruksi",
    "Kalimat optatif yang menyatakan harapan atau keinginan",
  ],
  difficulty: "SUPER_HARD",
  cognitiveTarget: "MENGINGAT",
});

// ─── G29–G30: Over-rejection resistance (tricky but valid) ──────────────────

/** G29: HARD + R3 apply + long stem (27 words) + stimulus + conjunctions + plausible distractors → PASS
 * R3 CAN be HARD if: long stem, complex stimulus, multi-step reasoning, plausible options.
 * V13 must NOT reject this.
 */
export const G29_HARD_R3_COMPOUND: CanonicalItem = baseItem({
  id: "V13-G29",
  stem: "Perhatikan aturan penggunaan imbuhan berikut dengan saksama. Kemudian tentukan kalimat manakah yang menggunakan imbuhan dengan benar sesuai aturan tersebut, dan jelaskan mengapa pilihan lain salah secara rinci.",
  stimulusContent:
    "Aturan penggunaan imbuhan me-: (1) Kata dasar yang diawali huruf vokal maka me- tetap menjadi me- (contoh: me + ambil = mengambil). (2) Kata dasar yang diawali huruf konsonan b, f, p maka me- berubah menjadi meng- (contoh: me + pakai = memakai). (3) Kata dasar yang diawali huruf konsonan c, d, j, z maka me- berubah menjadi meny- (contoh: me + dengar = mendengar).",
  options: [
    "Dia mengambil buku dari tas dengan hati-hati karena恐れる buku itu akan jatuh",
    "Dia mengambil buku dari tas dengan terburu-buru karena恐れる kesiangan",
    "Dia mengambil buku dari tas tanpa peduli karena恐oser buku itu tidak penting",
    "Dia meletakkan buku ke dalam tas dengan hati-hati karena恐oser buku itu berharga",
  ],
  difficulty: "HARD",
  cognitiveTarget: "MENERAPKAN",
});

/** G30: EASY + R1 recall + BenarSalah → PASS
 * Short ≠ harder. V13 must NOT reject short items that are genuinely EASY.
 */
export const G30_EASY_R1_SHORT_BS: CanonicalItem = baseItem({
  id: "V13-G30",
  stem: "Indonesia merdeka pada tahun 1945.",
  options: ["Benar", "Salah"],
  qtype: "BENAR_SALAH",
  difficulty: "EASY",
  cognitiveTarget: "MENGINGAT",
});

// ─── Export all fixtures ──────────────────────────────────────────────────────

export const ALL_V13_FIXTURES: CanonicalItem[] = [
  // PASS (consistent)
  G01_EASY_R1_RECALL,
  G02_EASY_R2_UNDERSTAND,
  G03_EASY_R1_BS,
  G04_EASY_R3_BORDERLINE,
  G05_MEDIUM_R2_WITH_STIMULUS,
  G06_MEDIUM_R3_STIMULUS,
  G07_MEDIUM_R3_NO_STIMULUS,
  G08_MEDIUM_R4_ANALYZE,
  G09_HARD_R4_LONG_STIMULUS,
  G10_HARD_R5_EVALUATE,
  // FAIL (mismatch ≥ 2 dims)
  G11_EASY_R5_MISMATCH,
  G12_EASY_R6_MISMATCH,
  G13_HARD_R1_MISMATCH,
  G14_HARD_R1_NO_STIMULUS,
  G15_MEDIUM_R1_MISMATCH,
  G16_EASY_LONG_STIMULUS,
  G17_HARD_TRIVIAL_CONTENT,
  G18_EASY_COMPLEX_STEM,
  // REVIEW (borderline, 1 dim mismatch)
  G19_HARD_R6_SHORT_STIMULUS,
  G20_MEDIUM_R5_EVALUATE,
  G21_EASY_R3_SIMPLE_STIMULUS,
  G22_HARD_R4_TRIVIAL_DISTRACTORS,
  G23_MEDIUM_R3_SIMPLE_DISTRACTORS,
  G24_MEDIUM_R2_LONG_STEM,
  // INSUFFICIENT (missing data)
  G25_NO_DIFFICULTY,
  G26_NO_COGNITIVE,
  G27_NO_DIFFICULTY_NO_COGNITIVE,
  G28_INVALID_DIFFICULTY,
  // Over-rejection resistance
  G29_HARD_R3_COMPOUND,
  G30_EASY_R1_SHORT_BS,
];
