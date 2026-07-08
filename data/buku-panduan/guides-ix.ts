import type { GradeData } from "./types"

export const kelasIX: GradeData = {
  grade: "IX",
  label: "Kelas IX",
  phase: "D",
  semesters: [
    {
      semester: 1,
      chapters: [
        {
          id: "ix-tanggapan-kritis",
          slug: "teks-tanggapan",
          grade: "IX",
          phase: "D",
          semester: 1,
          chapterNumber: 1,
          title: "Bab 1: Teks Tanggapan",
          shortTitle: "Tanggapan",
          kd: "3.1/4.1",
          emoji: "💬",
          description:
            "Mengenal, menganalisis, dan menulis teks tanggapan kritis yang berisi pujian atau kritik yang beralasan terhadap suatu hal.",
          learningGoals: [
            "Memahami pengertian dan fungsi teks tanggapan",
            "Mengidentifikasi struktur dan kebahasaan teks tanggapan",
            "Menulis tanggapan kritis yang santun dan beralasan",
          ],
          keyConcepts: {
            definition:
              "Teks tanggapan adalah teks yang berisi komentar, pujian, atau kritik terhadap suatu karya, peristiwa, atau fenomena yang disertai alasan yang logis.",
            characteristics: [
              "Berisi penilaian (pujian atau kritik) yang disertai alasan",
              "Bersifat objektif dan logis",
              "Disampaikan dengan bahasa yang santun",
              "Mengacu pada fakta atau data yang jelas",
              "Bertujuan membangun, bukan menjatuhkan",
            ],
            structure: [
              { name: "Konteks", description: "Pengantar yang menjelaskan objek yang akan ditanggapi" },
              { name: "Deskripsi", description: "Gambaran singkat tentang objek tanggapan" },
              { name: "Pujian/Kritik", description: "Penilaian disertai alasan yang logis" },
            ],
            languageFeatures: [
              "Kalimat pujian dan kritik yang santun",
              "Konjungsi pertentangan (namun, meskipun, sedangkan)",
              "Konjungsi kausal (karena, sebab, oleh karena itu)",
              "Kalimat rekomendasi (sebaiknya, seharusnya)",
              "Pilihan kata yang tidak menyinggung",
            ],
            examples: [
              {
                label: "Contoh Teks Tanggapan",
                content:
                  "Kantin sekolah kita sudah cukup baik dalam menyediakan makanan bergizi. Berbagai menu tersedia dengan harga yang terjangkau. Namun, kebersihan kantin masih perlu ditingkatkan. Beberapa meja terlihat kurang bersih setelah jam istirahat pertama. Sebaiknya petugas kantin lebih sering membersihkan meja dan area sekitar.",
                analysis:
                  "Konteks (kantin sekolah), deskripsi (menu bergizi, harga terjangkau), kritik (kebersihan kurang). Bahasa santun dan membangun.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Kalimat pujian dan kritik yang santun",
              "Konjungsi pertentangan untuk menyampaikan kritik",
              "Kata kerja mental (menurut saya, saya berpendapat)",
            ],
            notes:
              "Kritik yang membangun disampaikan dengan santun dan disertai solusi.",
          },
          activities: {
            opening: [
              "Guru mengajak siswa menanggapi kondisi kelas secara lisan",
              "Diskusi tentang cara menyampaikan kritik yang baik",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh teks tanggapan dan mengidentifikasi strukturnya",
              "Latihan membedakan pujian dan kritik yang konstruktif",
              "Menulis tanggapan terhadap suatu isu secara terbimbing",
              "Suntingan sejawat (peer review)",
            ],
            group: [
              "Tanggapan terhadap film pendek yang diputar bersama",
              "Diskusi panel menanggapi suatu isu",
              "Presentasi tanggapan kelompok",
            ],
            reflection: [
              "Diskusi tentang etika dalam memberikan tanggapan",
              "Refleksi: bagaimana menerima kritik dengan baik",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis teks tanggapan tentang kondisi lingkungan sekolah" },
            { type: "group", description: "Memberi tanggapan terhadap artikel berita dan mendiskusikannya" },
            { type: "pair", description: "Saling menanggapi tulisan teman secara konstruktif" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa perbedaan kritik dan hinaan?", purpose: "Mengetahui pemahaman tentang kritik membangun" },
              { question: "Bagaimana cara menyampaikan kritik yang baik?", purpose: "Mengidentifikasi keterampilan sosial siswa" },
            ],
            formative: [
              { method: "Cek tulisan", criteria: ["Ada pujian/kritik", "Disertai alasan", "Bahasa santun"] },
              { method: "Observasi diskusi", criteria: ["Menyampaikan pendapat", "Menghargai perbedaan"] },
            ],
            summative: [
              { type: "Teks Tanggapan", description: "Menulis teks tanggapan terhadap suatu isu dengan struktur lengkap" },
              { type: "Tanggapan Lisan", description: "Memberikan tanggapan lisan secara spontan dan santun" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Ketepatan Tanggapan",
                criteria: [
                  { level: "Sangat Baik", description: "Tanggapan relevan, logis, dan disertai alasan kuat" },
                  { level: "Baik", description: "Tanggapan relevan dengan alasan cukup" },
                  { level: "Cukup", description: "Tanggapan relevan tetapi tanpa alasan" },
                  { level: "Kurang", description: "Tanggapan tidak relevan atau tidak jelas" },
                ],
              },
              {
                name: "Kesantunan Bahasa",
                criteria: [
                  { level: "Sangat Baik", description: "Bahasa santun, tidak menyinggung, konstruktif" },
                  { level: "Baik", description: "Bahasa santun tetapi kurang konstruktif" },
                  { level: "Cukup", description: "Bahasa cukup santun" },
                  { level: "Kurang", description: "Bahasa kasar atau menyinggung" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan kerangka kalimat untuk memulai tanggapan",
              "Daftar kata yang santun dalam memberikan kritik",
              "Bimbingan mengidentifikasi objek yang tepat untuk ditanggapi",
            ],
            challenge: [
              "Menulis tanggapan terhadap isu kontroversial",
              "Menganalisis tanggapan publik di media sosial",
              "Menulis artikel opini untuk media massa",
            ],
          },
          remedial: [
            "Latihan membedakan kritik membangun dan menjatuhkan",
            "Praktik menyampaikan pendapat secara lisan terlebih dahulu",
            "Bimbingan menulis alasan yang logis",
          ],
          enrichment: [
            "Membaca rubrik surat pembaca di koran",
            "Membuat pojok tanggapan di majalah dinding",
          ],
          teacherNotes: [
            "Ciptakan suasana kelas yang aman untuk berpendapat",
            "Tekankan bahwa kritik harus membangun, bukan menjatuhkan",
            "Berikan contoh tanggapan dari tokoh publik untuk inspirasi",
          ],
          tags: ["tanggapan", "kritik", "pujian", "apresiasi"],
          isReady: true,
        },
        {
          id: "ix-cerpen",
          slug: "cerpen",
          grade: "IX",
          phase: "D",
          semester: 1,
          chapterNumber: 2,
          title: "Bab 2: Cerpen",
          shortTitle: "Cerpen",
          kd: "3.2/4.2",
          emoji: "📖",
          description:
            "Mengenal, menganalisis, dan menulis cerita pendek dengan memperhatikan unsur intrinsik dan ekstrinsik serta nilai kehidupan.",
          learningGoals: [
            "Memahami pengertian dan ciri-ciri cerpen",
            "Menganalisis unsur intrinsik dan ekstrinsik cerpen",
            "Menulis cerpen dengan alur yang menarik dan pesan moral",
          ],
          keyConcepts: {
            definition:
              "Cerpen (cerita pendek) adalah prosa fiksi yang menceritakan suatu peristiwa secara singkat, padat, dan lengkap, dengan fokus pada satu konflik utama.",
            characteristics: [
              "Panjang cerita kurang dari 10.000 kata",
              "Memiliki satu konflik utama",
              "Alur yang padat dan tidak berbelit",
              "Jumlah tokoh terbatas",
              "Meninggalkan kesan mendalam bagi pembaca",
            ],
            structure: [
              { name: "Orientasi", description: "Pengenalan tokoh, latar, dan suasana" },
              { name: "Komplikasi", description: "Munculnya konflik yang dihadapi tokoh" },
              { name: "Klimaks", description: "Puncak konflik" },
              { name: "Resolusi", description: "Penyelesaian konflik" },
              { name: "Koda (opsional)", description: "Pesan moral atau penutup" },
            ],
            languageFeatures: [
              "Menggunakan kata kerja yang menunjukkan tindakan",
              "Kalimat deskriptif untuk menggambarkan latar dan tokoh",
              "Dialog yang mendukung karakterisasi",
              "Majas untuk memperindah cerita",
              "Sudut pandang penceritaan yang konsisten",
            ],
            examples: [
              {
                label: "Contoh Cerpen",
                content:
                  "Rina menunduk dalam-dalam. Nilai ulangannya jatuh lagi. 'Kenapa kamu tidak belajar?' tanya Bu Sari lembut. Rina tidak menjawab. Di rumah, ibunya sedang sakit. Sepulang sekolah, Rina harus mengurus adik-adiknya. Bu Sari mengerti. 'Kamu boleh datang ke perpustakaan setiap pulang sekolah. Ibu akan membantumu,' kata Bu Sari. Rina tersenyum untuk pertama kalinya hari itu.",
                analysis:
                  "Orientasi (Rina dapat nilai jelek). Komplikasi (ibu sakit, harus mengurus adik). Klimaks (Bu Sari menawarkan bantuan). Resolusi (Rina tersenyum). Sudut pandang orang ketiga. Pesan moral: guru yang peduli.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Penggunaan sudut pandang penceritaan",
              "Dialog dan narasi yang seimbang",
              "Majas perbandingan untuk memperkuat deskripsi",
            ],
            notes:
              "Cerpen yang baik memiliki keseimbangan antara narasi, deskripsi, dan dialog.",
          },
          activities: {
            opening: [
              "Guru membacakan cerpen pendek dan meminta siswa merespon",
              "Tanya jawab tentang pengalaman membaca cerpen",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca cerpen dan mengidentifikasi unsur intrinsik",
              "Diskusi tentang karakter tokoh dan konflik",
              "Analisis majas dan diksi dalam cerpen",
              "Menulis cerpen berdasarkan pengalaman pribadi atau imajinasi",
            ],
            group: [
              "Bedah cerpen secara berkelompok",
              "Menulis cerpen bersama dengan metode sambung cerita",
              "Presentasi dan apresiasi karya",
            ],
            reflection: [
              "Diskusi tentang nilai-nilai kehidupan dalam cerpen",
              "Refleksi: cerpen apa yang ingin kamu tulis?",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis cerpen 2-3 halaman dengan unsur intrinsik lengkap" },
            { type: "group", description: "Membuat antologi cerpen kelas yang dibukukan" },
            { type: "pair", description: "Menganalisis unsur intrinsik dan ekstrinsik cerpen yang disediakan" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa perbedaan cerpen dengan novel?", purpose: "Mengetahui pemahaman tentang cerpen" },
              { question: "Cerpen apa yang pernah kamu baca?", purpose: "Mengidentifikasi pengalaman literasi" },
            ],
            formative: [
              { method: "Cek draf cerpen", criteria: ["Alur jelas", "Tokoh tergambar", "Dialog mendukung"] },
              { method: "Diskusi analisis", criteria: ["Mengidentifikasi unsur intrinsik", "Menganalisis pesan moral"] },
            ],
            summative: [
              { type: "Cerpen", description: "Menulis cerpen dengan struktur lengkap, konflik menarik, dan pesan moral" },
              { type: "Analisis", description: "Menganalisis cerpen dari segi unsur intrinsik dan ekstrinsik" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kualitas Cerita",
                criteria: [
                  { level: "Sangat Baik", description: "Alur menarik, konflik kuat, tokoh hidup, pesan moral jelas" },
                  { level: "Baik", description: "Cerita menarik tetapi ada kelemahan minor" },
                  { level: "Cukup", description: "Cerita kurang menarik atau konflik lemah" },
                  { level: "Kurang", description: "Cerita tidak terstruktur dan membosankan" },
                ],
              },
              {
                name: "Penggunaan Bahasa",
                criteria: [
                  { level: "Sangat Baik", description: "Diksi variatif, kalimat efektif, dialog alami" },
                  { level: "Baik", description: "Bahasa baik tetapi kurang variasi" },
                  { level: "Cukup", description: "Bahasa sederhana dengan sedikit kesalahan" },
                  { level: "Kurang", description: "Bahasa kaku dan banyak kesalahan" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan peta cerita (story map) untuk perencanaan",
              "Kerangka cerpen dengan pertanyaan pemandu",
              "Bank kata sifat dan kata kerja yang bisa digunakan",
            ],
            challenge: [
              "Menulis cerpen dengan alur mundur (flashback)",
              "Menggunakan sudut pandang yang unik (orang kedua, hewan)",
              "Menulis cerpen mini (flash fiction) 200 kata",
            ],
          },
          remedial: [
            "Latihan menulis satu paragraf deskripsi tokoh terlebih dahulu",
            "Praktik mengembangkan konflik dari pengalaman sehari-hari",
            "Bimbingan menyusun alur cerita secara bertahap",
          ],
          enrichment: [
            "Membaca kumpulan cerpen penulis Indonesia (Djenar, Seno, dll.)",
            "Mengirim cerpen ke majalah dinding atau blog",
          ],
          teacherNotes: [
            "Berikan kebebasan tema tetapi awasi konten",
            "Dorong siswa menulis dari pengalaman pribadi",
            "Fasilitasi publikasi karya siswa (mading, blog, antologi)",
          ],
          tags: ["cerpen", "fiksi", "menulis", "apresiasi"],
          isReady: true,
        },
        {
          id: "ix-pidato-persuasif",
          slug: "pidato-persuasif",
          grade: "IX",
          phase: "D",
          semester: 1,
          chapterNumber: 3,
          title: "Bab 3: Pidato Persuasif",
          shortTitle: "Pidato",
          kd: "3.3/4.3",
          emoji: "🎤",
          description:
            "Mengenal, menyusun, dan menyampaikan pidato persuasif dengan struktur yang baik dan bahasa yang meyakinkan.",
          learningGoals: [
            "Memahami struktur dan ciri kebahasaan pidato persuasif",
            "Menyusun naskah pidato dengan argumen yang meyakinkan",
            "Menyampaikan pidato dengan intonasi, ekspresi, dan gestur yang tepat",
          ],
          keyConcepts: {
            definition:
              "Pidato persuasif adalah pidato yang bertujuan membujuk atau memengaruhi audiens untuk melakukan suatu tindakan atau mengadopsi suatu pandangan.",
            characteristics: [
              "Memiliki tujuan meyakinkan atau membujuk audiens",
              "Menggunakan argumen yang logis dan emosional",
              "Disampaikan dengan intonasi dan ekspresi yang tepat",
              "Memperhatikan audiens dan konteks",
              "Struktur terdiri dari pembukaan, isi, penutup",
            ],
            structure: [
              { name: "Pembukaan", description: "Salam, ucapan syukur, pengenalan topik" },
              { name: "Isi", description: "Argumen utama, data pendukung, ajakan" },
              { name: "Penutup", description: "Kesimpulan, ajakan terakhir, salam penutup" },
            ],
            languageFeatures: [
              "Kalimat persuasif (Marilah, Ayo, Jangan)",
              "Kata sapaan yang sesuai audiens",
              "Konjungsi argumentatif (dengan demikian, oleh karena itu)",
              "Retorik (pertanyaan provokatif)",
              "Pengulangan (repetisi) untuk penekanan",
            ],
            examples: [
              {
                label: "Contoh Pidato Persuasif (Penggalan)",
                content:
                  "Assalamualaikum warahmatullahi wabarakatuh. Yang saya hormati, Ibu Guru dan teman-teman yang saya cintai. Marilah kita panjatkan puji syukur ke hadirat Tuhan Yang Maha Esa. Teman-teman, tahukah kalian bahwa setiap menit, satu ton sampah plastik berakhir di lautan? Jika kita tidak bertindak sekarang, pada tahun 2050 akan lebih banyak plastik daripada ikan di laut. Oleh karena itu, mari kita mulai mengurangi penggunaan plastik sekali pakai. Mulailah dengan membawa botol minum sendiri ke sekolah. Mulailah sekarang!",
                analysis:
                  "Pembukaan: salam dan syukur. Isi: data tentang sampah plastik, ajakan. Penutup: ajakan konkret (bawa botol minum). Bahasa persuasif (marilah, mari). Kalimat retorik (tahukah kalian).",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Kalimat persuasif dan imperatif",
              "Retorik untuk melibatkan audiens",
              "Kata sapaan yang sesuai konteks",
            ],
            notes:
              "Pidato yang baik disesuaikan dengan tingkat pemahaman audiens.",
          },
          activities: {
            opening: [
              "Guru memperlihatkan video pidato singkat yang inspiratif",
              "Diskusi tentang pidato yang pernah didengar siswa",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Menganalisis struktur pidato dari contoh naskah",
              "Latihan menulis bagian pembuka pidato",
              "Menyusun naskah pidato dengan argumen yang kuat",
              "Praktik menyampaikan pidato secara bergiliran",
            ],
            group: [
              "Lomba pidato antarkelompok",
              "Saling memberi masukan tentang penampilan pidato",
              "Membuat video pidato untuk kampanye sosial",
            ],
            reflection: [
              "Diskusi tentang rasa percaya diri saat berbicara di depan umum",
              "Refleksi: apa yang perlu ditingkatkan dari pidatomu?",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menyusun naskah pidato 3-5 menit tentang isu sosial" },
            { type: "group", description: "Membuat kampanye pidato untuk acara sekolah" },
            { type: "pair", description: "Saling mengevaluasi pidato dengan rubrik yang disediakan" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang membuat pidato menarik?", purpose: "Mengetahui kriteria pidato dari sudut pandang siswa" },
              { question: "Pernahkah kamu berpidato? Apa temanya?", purpose: "Mengidentifikasi pengalaman berbicara di depan umum" },
            ],
            formative: [
              { method: "Cek naskah", criteria: ["Struktur lengkap", "Argumen logis", "Bahasa persuasif"] },
              { method: "Observasi praktik", criteria: ["Intonasi jelas", "Ekspresi sesuai", "Kontak mata dengan audiens"] },
            ],
            summative: [
              { type: "Naskah Pidato", description: "Menyusun naskah pidato persuasif dengan struktur lengkap" },
              { type: "Praktik Pidato", description: "Menyampaikan pidato di depan kelas dengan intonasi dan ekspresi yang tepat" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kualitas Naskah",
                criteria: [
                  { level: "Sangat Baik", description: "Struktur lengkap, argumen kuat, data akurat, bahasa persuasif efektif" },
                  { level: "Baik", description: "Struktur lengkap, argumen cukup kuat" },
                  { level: "Cukup", description: "Struktur kurang lengkap atau argumen lemah" },
                  { level: "Kurang", description: "Naskah tidak terstruktur, tanpa argumen jelas" },
                ],
              },
              {
                name: "Penyampaian",
                criteria: [
                  { level: "Sangat Baik", description: "Intonasi variatif, gestur natural, kontak mata, percaya diri" },
                  { level: "Baik", description: "Cukup percaya diri tetapi intonasi kurang variatif" },
                  { level: "Cukup", description: "Kurang percaya diri, banyak membaca teks" },
                  { level: "Kurang", description: "Tidak siap, suara tidak jelas" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan kerangka naskah pidato",
              "Latihan berpidato di depan cermin atau teman",
              "Rekaman latihan untuk evaluasi mandiri",
            ],
            challenge: [
              "Berpidato tanpa teks (impromptu)",
              "Menganalisis pidato tokoh nasional dari segi retorika",
              "Menulis dan menyampaikan pidato dalam bahasa Inggris",
            ],
          },
          remedial: [
            "Latihan berbicara di depan kelompok kecil terlebih dahulu",
            "Praktik mengatur napas saat berbicara",
            "Bimbingan menulis naskah dengan kalimat yang mudah diucapkan",
          ],
          enrichment: [
            "Mengikuti lomba pidato tingkat sekolah atau kecamatan",
            "Membuat kanal podcast inspiratif",
          ],
          teacherNotes: [
            "Ciptakan suasana yang mendukung agar siswa percaya diri",
            "Berikan apresiasi pada setiap upaya, bukan hanya hasil",
            "Rekam pidato siswa untuk bahan evaluasi dan portofolio",
          ],
          tags: ["pidato", "persuasi", "public speaking", "retorika"],
          isReady: true,
        },
      ],
    },
    {
      semester: 2,
      chapters: [
        {
          id: "ix-laporan-percobaan",
          slug: "laporan-percobaan",
          grade: "IX",
          phase: "D",
          semester: 2,
          chapterNumber: 4,
          title: "Bab 4: Laporan Percobaan",
          shortTitle: "Percobaan",
          kd: "3.4/4.4",
          emoji: "🔬",
          description:
            "Mengenal dan menulis laporan percobaan dengan data yang akurat menggunakan metode ilmiah sederhana.",
          learningGoals: [
            "Memahami pengertian dan struktur laporan percobaan",
            "Melakukan percobaan sederhana dan mencatat data",
            "Menulis laporan percobaan dengan bahasa ilmiah yang tepat",
          ],
          keyConcepts: {
            definition:
              "Laporan percobaan adalah teks yang menyajikan hasil dari suatu eksperimen atau percobaan secara sistematis dan objektif.",
            characteristics: [
              "Berdasarkan hasil eksperimen atau percobaan nyata",
              "Bersifat objektif dan faktual",
              "Disusun secara sistematis (metode ilmiah)",
              "Menggunakan data hasil pengamatan",
              "Menarik kesimpulan berdasarkan data",
            ],
            structure: [
              { name: "Tujuan", description: "Rumusan tentang apa yang ingin dicapai dalam percobaan" },
              { name: "Alat dan Bahan", description: "Daftar lengkap alat dan bahan yang digunakan" },
              { name: "Langkah Percobaan", description: "Prosedur yang dilakukan secara urut" },
              { name: "Hasil", description: "Data yang diperoleh dari percobaan (tabel, grafik, deskripsi)" },
              { name: "Kesimpulan", description: "Interpretasi hasil dan jawaban dari tujuan percobaan" },
            ],
            languageFeatures: [
              "Kalimat imperatif (siapkan, campurkan, amati)",
              "Istilah teknis ilmiah",
              "Kalimat pasif (dilakukan, diamati, disimpulkan)",
              "Data dalam bentuk tabel atau grafik",
              "Bahasa baku dan logis",
            ],
            examples: [
              {
                label: "Contoh Laporan Percobaan: Membuat Pelangi dalam Gelas",
                content:
                  "Tujuan: Membuat pelangi dalam gelas menggunakan bahan sederhana.\nAlat dan Bahan: 3 gelas, air, pewarna makanan (merah, kuning, biru), tisu gulung.\nLangkah: 1. Isi tiga gelas dengan air setengah penuh. 2. Beri pewarna merah di gelas 1, kuning di gelas 2, biru di gelas 3. 3. Lipat tisu gulung menjadi dua, celupkan ujungnya ke masing-masing gelas bersebelahan. 4. Diamkan selama 24 jam.\nHasil: Air merambat melalui tisu dan mencampurkan warna. Warna jingga terbentuk antara merah dan kuning, hijau antara kuning dan biru, ungu antara biru dan merah.\nKesimpulan: Percobaan berhasil menunjukkan pencampuran warna dengan metode kapiler.",
                analysis:
                  "Lengkap: tujuan, alat/bahan, langkah, hasil, kesimpulan. Menggunakan kalimat imperatif dan pasif. Data hasil observasi jelas.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Kalimat perintah dan pasif dalam prosedur",
              "Istilah teknis sesuai percobaan",
              "Penyajian data secara sistematis",
            ],
            notes:
              "Tekankan perbedaan antara hasil (data mentah) dan kesimpulan (interpretasi data).",
          },
          activities: {
            opening: [
              "Guru mendemonstrasikan percobaan sederhana (telur dalam cuka, dll.)",
              "Siswa mengamati dan mencatat apa yang terjadi",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh laporan percobaan dan mengidentifikasi struktur",
              "Merancang percobaan sederhana secara berkelompok",
              "Melakukan percobaan dan mencatat data",
              "Menulis laporan percobaan lengkap",
            ],
            group: [
              "Praktik percobaan dengan bahan sederhana",
              "Membuat poster hasil percobaan",
              "Presentasi laporan percobaan",
            ],
            reflection: [
              "Diskusi tentang pentingnya metode ilmiah",
              "Refleksi: apa yang terjadi jika langkah tidak tepat?",
            ],
          },
          studentTasks: [
            { type: "group", description: "Melakukan percobaan sederhana dan menulis laporan lengkap" },
            { type: "individual", description: "Menulis laporan percobaan dari percobaan mandiri di rumah" },
            { type: "pair", description: "Menyajikan data percobaan dalam bentuk tabel dan grafik" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa itu percobaan ilmiah?", purpose: "Mengetahui pemahaman tentang metode ilmiah" },
              { question: "Pernahkah kamu melakukan percobaan sains?", purpose: "Mengidentifikasi pengalaman praktik sains" },
            ],
            formative: [
              { method: "Observasi percobaan", criteria: ["Mengikuti prosedur", "Mencatat data dengan benar"] },
              { method: "Cek laporan", criteria: ["Struktur lengkap", "Data akurat", "Kesimpulan logis"] },
            ],
            summative: [
              { type: "Laporan Percobaan", description: "Menulis laporan percobaan lengkap dengan data dan kesimpulan" },
              { type: "Presentasi", description: "Mempresentasikan hasil percobaan di depan kelas" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Ketepatan Metode",
                criteria: [
                  { level: "Sangat Baik", description: "Prosedur benar, data tercatat sistematis, kesimpulan logis" },
                  { level: "Baik", description: "Prosedur benar, data tercatat, kesimpulan sesuai" },
                  { level: "Cukup", description: "Ada kesalahan prosedur atau data kurang lengkap" },
                  { level: "Kurang", description: "Prosedur tidak benar, data tidak valid" },
                ],
              },
              {
                name: "Struktur Laporan",
                criteria: [
                  { level: "Sangat Baik", description: "Tujuan, alat/bahan, langkah, hasil, kesimpulan lengkap dan rapi" },
                  { level: "Baik", description: "Struktur lengkap tetapi kurang terperinci" },
                  { level: "Cukup", description: "Satu bagian tidak lengkap" },
                  { level: "Kurang", description: "Laporan tidak sesuai struktur" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan lembar kerja laporan yang sudah berformat",
              "Bimbingan melakukan percobaan step by step",
              "Mengurangi jumlah variabel dalam percobaan",
            ],
            challenge: [
              "Merancang percobaan dengan variabel kontrol dan variabel bebas",
              "Menulis laporan dengan analisis data statistik sederhana",
              "Membandingkan hasil dengan teori yang ada",
            ],
          },
          remedial: [
            "Praktik mencatat data dari percobaan sederhana",
            "Latihan membedakan hasil dan kesimpulan",
            "Bimbingan menyusun kalimat kesimpulan yang tepat",
          ],
          enrichment: [
            "Membaca jurnal ilmiah populer tentang eksperimen sains",
            "Mengikuti lomba karya ilmiah remaja (LKIR)",
          ],
          teacherNotes: [
            "Gunakan bahan yang aman dan mudah didapat",
            "Tekankan keselamatan saat melakukan percobaan",
            "Hubungkan dengan pelajaran IPA untuk pengalaman interdisipliner",
          ],
          tags: ["percobaan", "eksperimen", "ilmiah", "data"],
          isReady: true,
        },
        {
          id: "ix-kisah-inspiratif",
          slug: "kisah-inspiratif",
          grade: "IX",
          phase: "D",
          semester: 2,
          chapterNumber: 5,
          title: "Bab 5: Kisah Inspiratif",
          shortTitle: "Inspiratif",
          kd: "3.5/4.5",
          emoji: "🌟",
          description:
            "Mengenal, menganalisis, dan menulis kisah inspiratif yang memotivasi pembaca melalui tokoh dan peristiwa yang bermakna.",
          learningGoals: [
            "Memahami pengertian dan struktur kisah inspiratif",
            "Mengidentifikasi pesan moral dalam kisah inspiratif",
            "Menulis kisah inspiratif berdasarkan pengalaman atau tokoh nyata",
          ],
          keyConcepts: {
            definition:
              "Kisah inspiratif adalah teks yang menceritakan perjuangan atau pengalaman seseorang yang memberikan motivasi dan pelajaran hidup bagi pembaca.",
            characteristics: [
              "Berbasis pengalaman atau perjuangan nyata",
              "Mengandung pesan moral dan motivasi",
              "Tokoh utama memiliki karakter kuat dan pantang menyerah",
              "Alur perjalanan dari sulit menuju sukses",
              "Meninggalkan kesan mendalam dan membangkitkan semangat",
            ],
            structure: [
              { name: "Orientasi", description: "Pengenalan tokoh dan latar belakang" },
              { name: "Peristiwa", description: "Rangkaian kejadian yang dialami tokoh" },
              { name: "Konflik", description: "Tantangan dan kesulitan yang dihadapi" },
              { name: "Resolusi", description: "Keberhasilan atau pembelajaran dari pengalaman" },
              { name: "Koda", description: "Pesan inspiratif yang dapat dipetik" },
            ],
            languageFeatures: [
              "Menggunakan kata kerja tindakan",
              "Kalimat bermakna motivasi",
              "Dialog yang menggambarkan karakter tokoh",
              "Penggunaan kata emotif untuk menyentuh perasaan",
              "Majas perbandingan untuk memperkuat pesan",
            ],
            examples: [
              {
                label: "Contoh Kisah Inspiratif",
                content:
                  "Mala lahir di desa kecil tanpa listrik. Setiap malam, ia belajar di bawah cahaya lampu minyak. Buku-bukunya lusuh dan sering kekurangan kertas. Namun, semangat Mala tidak pernah padam. 'Aku akan menjadi guru,' katanya pada ibunya. Kini, Mala telah menjadi dosen di universitas ternama dan membangun perpustakaan di desanya. 'Kemiskinan bukan alasan untuk berhenti bermimpi,' ujarnya.",
                analysis:
                  "Orientasi (Mala lahir di desa kecil). Konflik (tanpa listrik, buku lusuh). Resolusi (menjadi dosen). Koda (kemiskinan bukan alasan). Mengandung pesan motivasi dan inspirasi.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Kata emotif untuk menyentuh perasaan",
              "Kalimat motivasi dan persuasif",
              "Penggunaan majas perbandingan",
            ],
            notes:
              "Kisah inspiratif yang baik didasarkan pada kebenaran atau setidaknya masuk akal.",
          },
          activities: {
            opening: [
              "Guru membacakan kisah inspiratif singkat",
              "Diskusi tentang tokoh inspiratif yang dikenal siswa",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca kisah inspiratif dan mengidentifikasi strukturnya",
              "Diskusi tentang nilai-nilai inspiratif dalam cerita",
              "Latihan menulis pengalaman inspiratif sendiri",
              "Menyunting dan memperbaiki tulisan",
            ],
            group: [
              "Membuat buku kumpulan kisah inspiratif kelas",
              "Presentasi tokoh inspiratif pilihan",
              "Dramatisasi kisah inspiratif",
            ],
            reflection: [
              "Diskusi tentang perjuangan dan kegigihan",
              "Refleksi: siapa tokoh paling inspiratif dalam hidupmu?",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis kisah inspiratif tentang tokoh yang dikagumi" },
            { type: "group", description: "Membuat majalah dinding bertema inspiratif" },
            { type: "pair", description: "Mewawancarai tokoh inspiratif di lingkungan sekitar" },
          ],
          assessment: {
            diagnostic: [
              { question: "Siapa tokoh yang paling kalian kagumi?", purpose: "Mengidentifikasi referensi tokoh inspiratif" },
              { question: "Apa yang membuat seseorang inspiratif?", purpose: "Mengetahui kriteria inspirasi dari sudut pandang siswa" },
            ],
            formative: [
              { method: "Cek tulisan", criteria: ["Ada konflik perjuangan", "Pesan moral jelas", "Bahasa emotif tapi tidak berlebihan"] },
              { method: "Diskusi", criteria: ["Mampu mengidentifikasi nilai inspiratif dalam cerita"] },
            ],
            summative: [
              { type: "Kisah Inspiratif", description: "Menulis kisah inspiratif minimal 3 paragraf dengan struktur lengkap" },
              { type: "Analisis", description: "Menganalisis pesan moral dan nilai inspiratif dalam teks yang disediakan" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kekuatan Inspirasi",
                criteria: [
                  { level: "Sangat Baik", description: "Cerita sangat menginspirasi, pesan moral kuat dan relevan" },
                  { level: "Baik", description: "Cukup inspiratif dengan pesan moral yang jelas" },
                  { level: "Cukup", description: "Kurang inspiratif, pesan moral terlalu umum" },
                  { level: "Kurang", description: "Tidak memberikan inspirasi atau motivasi" },
                ],
              },
              {
                name: "Struktur Cerita",
                criteria: [
                  { level: "Sangat Baik", description: "Orientasi, konflik, resolusi, koda lengkap dan mengalir" },
                  { level: "Baik", description: "Struktur lengkap tetapi kurang mengalir" },
                  { level: "Cukup", description: "Satu bagian struktur tidak jelas" },
                  { level: "Kurang", description: "Cerita tidak terstruktur" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan daftar tokoh inspiratif yang bisa dipilih",
              "Kerangka cerita dengan pertanyaan pemandu",
              "Bimbingan mengidentifikasi momen inspiratif dalam kehidupan",
            ],
            challenge: [
              "Menulis kisah inspiratif dari tokoh yang kurang dikenal",
              "Membandingkan kisah inspiratif dari budaya berbeda",
              "Menulis dalam format biografi singkat",
            ],
          },
          remedial: [
            "Latihan mengidentifikasi pesan moral dari cerita sederhana",
            "Praktik menulis satu paragraf pengalaman inspiratif",
            "Bimbingan mengembangkan konflik dan resolusi",
          ],
          enrichment: [
            "Membaca buku biografi tokoh nasional dan internasional",
            "Membuat podcast kisah inspiratif",
          ],
          teacherNotes: [
            "Pastikan siswa menulis dari hati, bukan sekadar formalitas",
            "Hargai setiap cerita yang ditulis siswa",
            "Kisah inspiratif bisa berasal dari hal-hal sederhana di sekitar",
          ],
          tags: ["inspirasi", "motivasi", "biografi", "perjuangan"],
          isReady: true,
        },
        {
          id: "ix-diskusi",
          slug: "teks-diskusi",
          grade: "IX",
          phase: "D",
          semester: 2,
          chapterNumber: 6,
          title: "Bab 6: Teks Diskusi",
          shortTitle: "Diskusi",
          kd: "3.6/4.6",
          emoji: "🗣️",
          description:
            "Mengenal, menganalisis, dan menulis teks diskusi yang menyajikan dua sudut pandang (pro/kontra) secara seimbang.",
          learningGoals: [
            "Memahami pengertian dan tujuan teks diskusi",
            "Menganalisis struktur teks diskusi (isu, argumen pro, argumen kontra, kesimpulan)",
            "Menulis teks diskusi dengan argumen yang seimbang dan logis",
          ],
          keyConcepts: {
            definition:
              "Teks diskusi adalah teks yang menyajikan suatu isu atau topik dari dua sudut pandang berbeda (pro dan kontra) secara seimbang untuk mencapai pemahaman bersama atau kesimpulan.",
            characteristics: [
              "Menyajikan minimal dua sudut pandang (pro dan kontra)",
              "Bersifat objektif dan tidak memihak",
              "Setiap argumen didukung alasan dan data",
              "Kesimpulan bersifat seimbang",
              "Menggunakan bahasa yang logis dan argumentatif",
            ],
            structure: [
              { name: "Isu", description: "Pengantar topik yang akan dibahas dari dua sisi" },
              { name: "Argumen Pro", description: "Pendapat dan alasan yang mendukung isu" },
              { name: "Argumen Kontra", description: "Pendapat dan alasan yang menentang isu" },
              { name: "Kesimpulan", description: "Rangkuman dan penilaian seimbang terhadap kedua sisi" },
            ],
            languageFeatures: [
              "Konjungsi perlawanan (namun, meskipun, di sisi lain)",
              "Konjungsi kausal (sebab, karena, oleh karena itu)",
              "Kalimat argumentatif (Berdasarkan data..., Jika dilihat dari sisi...)",
              "Kata kerja mental (berpendapat, meyakini, menganggap)",
              "Pilihan kata yang netral dan tidak memihak",
            ],
            examples: [
              {
                label: "Contoh Teks Diskusi: Penggunaan Ponsel di Sekolah",
                content:
                  "Isu: Penggunaan ponsel di sekolah menjadi perdebatan antara pihak yang mendukung dan menentang.\n\nArgumen Pro: Ponsel dapat membantu siswa mencari informasi pelajaran dengan cepat. Selain itu, ponsel memudahkan komunikasi antara siswa dan orang tua. Banyak aplikasi edukatif yang dapat dimanfaatkan untuk belajar.\n\nArgumen Kontra: Ponsel sering mengganggu konsentrasi belajar. Siswa lebih sering bermain game atau media sosial daripada belajar. Selain itu, ponsel berpotensi disalahgunakan untuk menyontek.\n\nKesimpulan: Ponsel memiliki manfaat dan risiko dalam lingkungan sekolah. Penggunaannya perlu diatur dengan kebijakan yang jelas, seperti penggunaan terbatas pada jam tertentu dan pengawasan dari guru.",
                analysis:
                  "Isu jelas (ponsel di sekolah). Argumen pro dan kontra seimbang. Kesimpulan tidak memihak, memberikan solusi. Bahasa netral dan argumentatif.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Konjungsi perlawanan untuk membandingkan sudut pandang",
              "Kalimat argumentatif dengan data pendukung",
              "Pilihan kata yang netral dan objektif",
            ],
            notes:
              "Teks diskusi yang baik tidak memihak — kedua sisi mendapatkan porsi yang seimbang.",
          },
          activities: {
            opening: [
              "Guru mengajukan isu kontroversial sederhana (PR sekolah, seragam)",
              "Siswa menyebutkan pendapat pro dan kontra secara lisan",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh teks diskusi dan mengidentifikasi struktur",
              "Diskusi tentang argumen pro dan kontra suatu isu",
              "Latihan menulis argumen pro dan kontra secara berpasangan",
              "Menyusun teks diskusi lengkap",
            ],
            group: [
              "Debat kelas dengan format pro/kontra",
              "Menulis teks diskusi kelompok",
              "Presentasi dan tanya jawab",
            ],
            reflection: [
              "Diskusi tentang pentingnya melihat suatu isu dari berbagai sisi",
              "Refleksi: bagaimana cara menyikapi perbedaan pendapat",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis teks diskusi tentang isu pilihan dengan argumen pro/kontra seimbang" },
            { type: "group", description: "Mengadakan debat kelas dengan format teks diskusi" },
            { type: "pair", description: "Menganalisis keseimbangan argumen dalam teks diskusi dari media" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang dimaksud dengan pro dan kontra?", purpose: "Mengetahui pemahaman tentang dua sisi argumen" },
              { question: "Pernahkah kamu berbeda pendapat dengan teman? Bagaimana menyikapinya?", purpose: "Mengidentifikasi keterampilan diskusi siswa" },
            ],
            formative: [
              { method: "Cek argumen pro/kontra", criteria: ["Relevan dengan isu", "Didukung alasan", "Seimbang"] },
              { method: "Observasi diskusi", criteria: ["Aktif", "Menghargai perbedaan", "Menggunakan argumen logis"] },
            ],
            summative: [
              { type: "Teks Diskusi", description: "Menulis teks diskusi lengkap (isu, pro, kontra, kesimpulan) dengan argumen seimbang" },
              { type: "Debat", description: "Berpartisipasi dalam debat kelas dengan argumen logis dan sikap sportif" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Keseimbangan Argumen",
                criteria: [
                  { level: "Sangat Baik", description: "Pro dan kontra seimbang, masing-masing didukung alasan kuat dan data" },
                  { level: "Baik", description: "Pro dan kontra seimbang dengan alasan cukup" },
                  { level: "Cukup", description: "Satu sisi lebih dominan dari sisi lainnya" },
                  { level: "Kurang", description: "Hanya satu sisi yang dibahas" },
                ],
              },
              {
                name: "Kualitas Argumen",
                criteria: [
                  { level: "Sangat Baik", description: "Argumen logis, relevan, didukung data atau contoh konkret" },
                  { level: "Baik", description: "Argumen logis dan relevan" },
                  { level: "Cukup", description: "Argumen kurang logis atau kurang relevan" },
                  { level: "Kurang", description: "Argumen tidak logis atau tidak relevan" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan daftar isu sederhana yang relevan dengan remaja",
              "Kerangka teks diskusi dengan format tabel pro/kontra",
              "Bank konjungsi dan kalimat argumentatif",
            ],
            challenge: [
              "Menulis diskusi tentang isu kompleks (politik, etika)",
              "Menganalisis diskusi publik di media sosial dari segi keseimbangan argumen",
              "Menulis teks diskusi dengan tiga sudut pandang",
            ],
          },
          remedial: [
            "Latihan membedakan argumen pro dan kontra dari contoh",
            "Praktik mencari alasan dari satu isu sederhana",
            "Bimbingan menyusun kesimpulan yang seimbang",
          ],
          enrichment: [
            "Mengikuti forum diskusi atau debat di luar sekolah",
            "Membaca artikel opini dari berbagai sudut pandang",
          ],
          teacherNotes: [
            "Pilih isu yang sesuai usia dan tidak sensitif",
            "Ciptakan suasana yang aman untuk berbeda pendapat",
            "Tekankan bahwa tujuan diskusi adalah memahami, bukan menang",
          ],
          tags: ["diskusi", "pro-kontra", "argumen", "debat"],
          isReady: true,
        },
      ],
    },
  ],
}
