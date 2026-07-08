import type { GradeData } from "./types"

export const kelasVII: GradeData = {
  grade: "VII",
  label: "Kelas VII",
  phase: "D",
  semesters: [
    {
      semester: 1,
      chapters: [
        {
          id: "vii-deskripsi",
          slug: "teks-deskripsi",
          grade: "VII",
          phase: "D",
          semester: 1,
          chapterNumber: 1,
          title: "Bab 1: Teks Deskripsi",
          shortTitle: "Deskripsi",
          kd: "3.1/4.1",
          emoji: "🏞️",
          description:
            "Mengenal dan menulis teks deskripsi yang menggambarkan objek, tempat, atau peristiwa secara detail sehingga pembaca seolah-olah melihat, mendengar, atau merasakan sendiri.",
          learningGoals: [
            "Memahami pengertian dan ciri-ciri teks deskripsi",
            "Mengidentifikasi struktur teks deskripsi (identifikasi, klasifikasi, deskripsi bagian)",
            "Menulis teks deskripsi dengan pilihan kata yang tepat dan kalimat yang variatif",
          ],
          keyConcepts: {
            definition:
              "Teks deskripsi adalah teks yang menggambarkan suatu objek, tempat, atau peristiwa secara terperinci sehingga pembaca seolah-olah melihat, mendengar, atau merasakan objek yang digambarkan.",
            characteristics: [
              "Menggambarkan objek secara konkret dan detail",
              "Melibatkan pancaindra (penglihatan, pendengaran, penciuman, peraba, pengecap)",
              "Bersifat Subjektif karena menggambarkan objek berdasarkan sudut pandang penulis",
              "Menggunakan kata-kata khusus dan istilah yang spesifik",
              "Banyak menggunakan kata sifat (adjektiva) untuk memperjelas gambaran",
            ],
            structure: [
              { name: "Identifikasi", description: "Bagian pembuka yang menyebutkan objek yang akan dideskripsikan" },
              { name: "Klasifikasi", description: "Pengelompokan objek berdasarkan ciri atau kategori tertentu" },
              { name: "Deskripsi Bagian", description: "Uraian terperinci tentang bagian-bagian objek" },
            ],
            languageFeatures: [
              "Kata sifat (indah, luas, bersih, harum)",
              "Kata kerja transitif dan intransitif",
              "Kalimat simpleks dan kompleks",
              "Majas personifikasi dan simile",
              "Kata sinonim dan antonim untuk variasi",
            ],
            examples: [
              {
                label: "Contoh Teks Deskripsi",
                content:
                  "Kelas VII-A adalah ruangan yang nyaman dan menenangkan. Dindingnya dicat warna biru muda yang segar dipandang. Di sudut ruangan terdapat rak buku berisi puluhan buku bacaan. Meja-meja tersusun rapi dengan kursi yang sama tingginya. Di depan kelas, papan tulis putih bersih tanpa coretan. Udara di dalam ruangan terasa sejuk karena AC menyala pelan. Suara kipas yang berputar perlahan menambah kenyamanan belajar di kelas ini.",
                analysis:
                  "Teks ini menggambarkan ruang kelas dengan detail visual (biru muda, rapi), auditori (suara kipas), dan sensasi (sejuk). Struktur: identifikasi (kelas nyaman) → deskripsi bagian (dinding, rak buku, meja, papan tulis, udara).",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Penggunaan kata sifat untuk menggambarkan objek",
              "Kalimat simpleks (satu verba) dan kompleks (lebih dari satu verba)",
              "Penggunaan sinonim untuk menghindari pengulangan kata",
            ],
            notes:
              "Tekankan bahwa deskripsi yang baik menggunakan pancaindra, bukan sekadar menyebutkan ciri.",
          },
          activities: {
            opening: [
              "Guru menunjukkan gambar pemandangan alam dan meminta siswa mendeskripsikannya secara lisan",
              "Tanya jawab tentang apa yang mereka lihat, dengar, dan rasakan",
              "Menyampaikan tujuan pembelajaran teks deskripsi",
            ],
            core: [
              "Membaca contoh teks deskripsi dari buku paket atau sumber lain",
              "Diskusi kelompok mengidentifikasi struktur teks deskripsi",
              "Latihan menemukan kata sifat dalam teks deskripsi",
              "Menulis teks deskripsi secara berpasangan",
            ],
            group: [
              "Masing-masing kelompok mendapat gambar berbeda dan menulis deskripsi",
              "Presentasi hasil deskripsi di depan kelas",
              "Saling memberi tanggapan antarkelompok",
            ],
            reflection: [
              "Siswa menyampaikan kesulitan saat menulis teks deskripsi",
              "Guru memberikan penguatan tentang pentingnya pilihan kata",
              "Refleksi tertulis: 'Apa yang baru saya pelajari hari ini?'",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis teks deskripsi tentang benda favorit (150-200 kata)" },
            { type: "pair", description: "Mendeskripsikan teman sebangku dan menebak siapa yang dideskripsikan" },
            { type: "group", description: "Membuat poster deskripsi tentang lingkungan sekolah" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang kalian ketahui tentang teks deskripsi?", purpose: "Mengetahui pengetahuan awal siswa" },
              { question: "Sebutkan satu contoh teks yang pernah kalian baca!", purpose: "Mengidentifikasi pengalaman literasi siswa" },
            ],
            formative: [
              { method: "Observasi diskusi kelompok", criteria: ["Aktif berpendapat", "Menghargai pendapat teman", "Menggunakan istilah yang tepat"] },
              { method: "Cek pemahaman tulis", criteria: ["Mampu mengidentifikasi struktur", "Menemukan kata sifat minimal 5", "Menulis kalimat efektif"] },
              { method: "Kuis singkat", criteria: ["Memahami ciri teks deskripsi", "Membedakan deskripsi dengan narasi"] },
            ],
            summative: [
              { type: "Teks Deskripsi Individu", description: "Menulis teks deskripsi tentang tempat favorit minimal 3 paragraf dengan struktur lengkap" },
              { type: "Analisis Teks", description: "Menganalisis teks deskripsi yang disediakan guru (struktur, ciri bahasa, penggunaan pancaindra)" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kesesuaian Struktur",
                criteria: [
                  { level: "Sangat Baik", description: "Struktur identifikasi, klasifikasi, dan deskripsi bagian lengkap dan sistematis" },
                  { level: "Baik", description: "Struktur lengkap tetapi kurang sistematis" },
                  { level: "Cukup", description: "Satu bagian struktur tidak lengkap" },
                  { level: "Kurang", description: "Struktur tidak sesuai dengan teks deskripsi" },
                ],
              },
              {
                name: "Pilihan Kata",
                criteria: [
                  { level: "Sangat Baik", description: "Menggunakan kata sifat variatif, sinonim, dan majas sederhana" },
                  { level: "Baik", description: "Menggunakan kata sifat dengan baik, sedikit variasi" },
                  { level: "Cukup", description: "Kata sifat terbatas, banyak pengulangan" },
                  { level: "Kurang", description: "Tidak menggunakan kata sifat yang tepat" },
                ],
              },
              {
                name: "Keterlibatan Pancaindra",
                criteria: [
                  { level: "Sangat Baik", description: "Melibatkan minimal 3 pancaindra secara jelas" },
                  { level: "Baik", description: "Melibatkan 2 pancaindra" },
                  { level: "Cukup", description: "Melibatkan 1 pancaindra" },
                  { level: "Kurang", description: "Tidak melibatkan pancaindra, hanya menyebut" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan kerangka teks deskripsi (template dengan bagian yang dirumpangkan)",
              "Memberikan bank kata sifat yang dapat digunakan",
              "Bimbingan khusus dalam kelompok kecil",
              "Mengurangi panjang teks menjadi 100-150 kata",
            ],
            challenge: [
              "Menulis teks deskripsi dengan sudut pandang unik (dari sudut pandang benda)",
              "Mengintegrasikan majas personifikasi secara konsisten",
              "Menulis deskripsi dalam bentuk puisi deskriptif",
            ],
          },
          remedial: [
            "Identifikasi ulang struktur teks deskripsi dengan contoh lebih sederhana",
            "Latihan menulis kalimat deskriptif secara bertahap (kata → kalimat → paragraf)",
            "Pendampingan teman sebaya (peer tutoring)",
          ],
          enrichment: [
            "Membaca dan menganalisis teks deskripsi dari media massa atau buku perjalanan",
            "Membuat kliping deskripsi dari berbagai sumber",
          ],
          teacherNotes: [
            "Pastikan setiap siswa memiliki buku catatan untuk menulis draf",
            "Gunakan media visual (gambar, video) untuk memicu ide menulis",
            "Berikan contoh teks deskripsi dari berbagai tema (alam, benda, tempat, orang)",
          ],
          tags: ["deskripsi", "menulis", "membaca", "kosakata"],
          isReady: true,
        },
        {
          id: "vii-cerita-rakyat",
          slug: "cerita-rakyat-fabel",
          grade: "VII",
          phase: "D",
          semester: 1,
          chapterNumber: 2,
          title: "Bab 2: Cerita Rakyat dan Fabel",
          shortTitle: "Cerita Rakyat",
          kd: "3.2/4.2",
          emoji: "📖",
          description:
            "Mengenal dan mengapresiasi cerita rakyat serta fabel sebagai warisan budaya bangsa beserta nilai-nilai moral yang terkandung di dalamnya.",
          learningGoals: [
            "Memahami pengertian dan ciri-ciri cerita rakyat dan fabel",
            "Mengidentifikasi struktur dan unsur intrinsik cerita rakyat",
            "Menceritakan kembali cerita rakyat dengan bahasa sendiri",
          ],
          keyConcepts: {
            definition:
              "Cerita rakyat adalah kisah yang berasal dari masyarakat dan berkembang secara lisan dari generasi ke generasi. Fabel adalah cerita yang tokohnya hewan berperilaku seperti manusia dan mengandung pesan moral.",
            characteristics: [
              "Disampaikan secara lisan (tradisi lisan)",
              "Anonim (tidak diketahui pengarangnya)",
              "Mengandung nilai-nilai budaya dan moral",
              "Tokoh hewan pada fabel berperilaku seperti manusia",
              "Memiliki pesan moral yang eksplisit atau implisit",
            ],
            structure: [
              { name: "Orientasi", description: "Pengenalan tokoh, latar tempat, dan suasana" },
              { name: "Komplikasi", description: "Munculnya masalah atau konflik" },
              { name: "Resolusi", description: "Penyelesaian masalah" },
              { name: "Koda", description: "Pesan moral yang dapat dipetik" },
            ],
            languageFeatures: [
              "Menggunakan kata kerja (verba) yang menunjukkan tindakan",
              "Banyak menggunakan dialog antartokoh",
              "Penggunaan kata penghubung (konjungsi) temporal",
              "Kata ganti orang ketiga (ia, mereka, si Kancil)",
              "Latar tempat dan waktu yang sederhana",
            ],
            examples: [
              {
                label: "Contoh Fabel",
                content:
                  "Si Kancil yang cerdik sedang berjalan-jalan di tepi hutan. Ia melihat seekor Buaya yang sedang berjemur di tepi sungai. 'Wah, ada Buaya! Bagaimana caranya aku menyeberang?' pikir Kancil. Dengan akal bulusnya, Kancil berkata, 'Pak Buaya, aku membawa pesan dari Raja Hutan. Semua buaya harus dikumpulkan untuk mendapat daging segar.' Buaya yang ragu-ragu akhirnya memanggil kawanan buaya lainnya. Kancil pun melompat dari punggung buaya satu ke buaya lainnya sambil berhitung sampai ia sampai di seberang. 'Terima kasih, Buaya! Kalian begitu baik telah mengantarku,' kata Kancil sambil tertawa. Para Buaya marah karena merasa tertipu.",
                analysis:
                  "Cerita ini menggunakan tokoh hewan (Kancil dan Buaya) dengan karakter seperti manusia. Struktur: orientasi (Kancil di tepi hutan), komplikasi (Kancil ingin menyeberang), resolusi (Kancil menipu buaya). Pesan moral: kecerdikan dapat mengatasi masalah, tetapi jangan menyalahgunakannya.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Penggunaan kata kerja aktif dalam alur cerita",
              "Penggunaan konjungsi temporal (kemudian, lalu, setelah itu)",
              "Dialog dengan kalimat langsung dan tidak langsung",
            ],
            notes:
              "Perhatikan perbedaan penggunaan kata 'berkata' (untuk dialog langsung) dan 'mengatakan' (untuk dialog tidak langsung).",
          },
          activities: {
            opening: [
              "Guru membacakan penggalan cerita rakyat daerah setempat",
              "Tanya jawab tentang cerita rakyat yang dikenal siswa",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca cerita rakyat/fabel secara bergantian",
              "Diskusi kelompok mengidentifikasi unsur intrinsik",
              "Menganalisis karakter tokoh dan pesan moral",
              "Latihan menceritakan kembali secara tertulis",
            ],
            group: [
              "Setiap kelompok membaca cerita rakyat berbeda dari berbagai daerah",
              "Membuat peta konsep (mind map) unsur cerita",
              "Bermain peran (role play) penggalan cerita",
            ],
            reflection: [
              "Diskusi tentang nilai moral yang relevan dengan kehidupan sehari-hari",
              "Siswa menulis jurnal refleksi tentang cerita yang paling berkesan",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menceritakan kembali fabel dengan bahasa sendiri (200 kata)" },
            { type: "group", description: "Membuat pementasan mini fabel durasi 5-7 menit" },
            { type: "pair", description: "Membandingkan dua cerita rakyat dari daerah berbeda" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa cerita rakyat favoritmu?", purpose: "Mengetahui familiaritas siswa dengan cerita rakyat" },
              { question: "Apa perbedaan cerita biasa dengan fabel?", purpose: "Mengidentifikasi pemahaman awal tentang fabel" },
            ],
            formative: [
              { method: "Diskusi kelompok", criteria: ["Mampu mengidentifikasi tokoh dan karakter", "Menemukan pesan moral"] },
              { method: "Tugas individu", criteria: ["Alur cerita runtut", "Menggunakan bahasa sendiri", "Pesan moral tersampaikan"] },
            ],
            summative: [
              { type: "Menulis Fabel", description: "Menulis fabel pendek dengan tokoh hewan, struktur lengkap, dan pesan moral yang jelas" },
              { type: "Analisis Cerita", description: "Menganalisis unsur intrinsik cerita rakyat yang disediakan" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kelengkapan Struktur",
                criteria: [
                  { level: "Sangat Baik", description: "Orientasi, komplikasi, resolusi, koda lengkap dan jelas" },
                  { level: "Baik", description: "Struktur lengkap tetapi koda kurang jelas" },
                  { level: "Cukup", description: "Satu bagian struktur tidak lengkap" },
                  { level: "Kurang", description: "Struktur tidak runtut dan membingungkan" },
                ],
              },
              {
                name: "Pesan Moral",
                criteria: [
                  { level: "Sangat Baik", description: "Pesan moral eksplisit dan relevan dengan kehidupan" },
                  { level: "Baik", description: "Pesan moral tersampaikan tetapi terlalu umum" },
                  { level: "Cukup", description: "Pesan moral sulit dipahami" },
                  { level: "Kurang", description: "Tidak ada pesan moral yang jelas" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan teks fabel yang lebih pendek dan sederhana",
              "Menggunakan gambar berseri untuk membantu memahami alur",
              "Bimbingan membaca terbimbing (guided reading)",
            ],
            challenge: [
              "Menulis fabel dengan konflik yang lebih kompleks",
              "Membandingkan versi berbeda dari cerita rakyat yang sama",
              "Mengadaptasi cerita rakyat ke dalam bentuk drama",
            ],
          },
          remedial: [
            "Membaca ulang teks dengan bimbingan intensif",
            "Latihan mengidentifikasi tokoh dan watak melalui dialog",
            "Praktik menceritakan kembali secara lisan terlebih dahulu",
          ],
          enrichment: [
            "Mengumpulkan cerita rakyat dari daerah asal masing-masing",
            "Membaca buku kumpulan fabel klasik (Aesop, Mousa, dll.)",
          ],
          teacherNotes: [
            "Gunakan cerita rakyat dari berbagai daerah di Indonesia untuk memperkenalkan keberagaman budaya",
            "Hindari cerita yang mengandung unsur kekerasan berlebihan",
            "Tekankan nilai-nilai moral yang universal",
          ],
          tags: ["cerita rakyat", "fabel", "moral", "budaya"],
          isReady: true,
        },
        {
          id: "vii-lho",
          slug: "laporan-hasil-observasi",
          grade: "VII",
          phase: "D",
          semester: 1,
          chapterNumber: 3,
          title: "Bab 3: Laporan Hasil Observasi (LHO)",
          shortTitle: "LHO",
          kd: "3.3/4.3",
          emoji: "🔍",
          description:
            "Mengenal, menganalisis, dan menulis laporan hasil observasi berdasarkan pengamatan sistematis terhadap suatu objek atau fenomena.",
          learningGoals: [
            "Memahami pengertian dan tujuan teks LHO",
            "Mengidentifikasi struktur dan ciri kebahasaan teks LHO",
            "Melakukan observasi sederhana dan menulis laporan hasil observasi",
          ],
          keyConcepts: {
            definition:
              "Laporan Hasil Observasi (LHO) adalah teks yang menyajikan hasil pengamatan secara sistematis dan objektif terhadap suatu objek, fenomena, atau peristiwa.",
            characteristics: [
              "Bersifat objektif dan faktual berdasarkan data pengamatan",
              "Menggunakan bahasa ilmiah atau baku",
              "Tidak mengandung opini atau prasangka pribadi",
              "Disusun secara sistematis",
              "Dilengkapi data pendukung (angka, fakta, tabel, grafik)",
            ],
            structure: [
              { name: "Pernyataan Umum", description: "Pembuka yang menjelaskan objek observasi secara umum" },
              { name: "Deskripsi Bagian", description: "Uraian terperinci tentang bagian-bagian objek yang diamati" },
              { name: "Deskripsi Manfaat", description: "Penjelasan kegunaan atau manfaat objek yang diamati" },
            ],
            languageFeatures: [
              "Menggunakan istilah teknis sesuai objek observasi",
              "Kalimat definisi (adalah, merupakan, yaitu)",
              "Kalimat klasifikasi (terbagi, terdiri atas, meliputi)",
              "Menggunakan verba relasional (adalah, merupakan)",
              "Menggunakan konjungsi kausal (karena, sebab, akibatnya)",
            ],
            examples: [
              {
                label: "Contoh Teks LHO",
                content:
                  "Kucing (Felis catus) adalah hewan mamalia karnivora yang banyak dipelihara manusia. Tubuh kucing terdiri atas tiga bagian utama: kepala, badan, dan ekor. Kepala kucing memiliki mata yang tajam, kumis yang sensitif, dan telinga yang dapat bergerak 180 derajat. Badan kucing ditutupi bulu yang lebat dengan berbagai warna dan pola. Kucing memiliki cakar yang dapat ditarik masuk untuk berburu atau memanjat. Ekor kucing berfungsi untuk menjaga keseimbangan saat melompat atau berlari.",
                analysis:
                  "Teks ini menggunakan definisi (adalah), kalimat klasifikasi (terdiri atas), dan istilah ilmiah (Felis catus, mamalia karnivora). Struktur: pernyataan umum (kucing adalah mamalia) → deskripsi bagian (kepala, badan, ekor).",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Istilah teknis sesuai objek observasi",
              "Kalimat definisi dan klasifikasi",
              "Penggunaan verba relasional dan material",
            ],
            notes:
              "Bedakan antara kalimat definisi (pengertian umum) dan kalimat deskripsi (ciri khusus).",
          },
          activities: {
            opening: [
              "Guru membawa objek nyata (tanaman, hewan, atau benda lain) untuk diamati",
              "Siswa menyebutkan ciri-ciri objek secara lisan",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh teks LHO dan mengidentifikasi strukturnya",
              "Observasi langsung objek di lingkungan sekolah",
              "Mencatat hasil observasi dalam format laporan",
              "Menulis teks LHO berdasarkan data observasi",
            ],
            group: [
              "Observasi kelompok pada objek berbeda",
              "Penyusunan laporan observasi kelompok",
              "Presentasi hasil observasi",
            ],
            reflection: [
              "Membahas kesulitan saat melakukan observasi dan menulis laporan",
              "Menyimpulkan ciri-ciri teks LHO yang baik",
            ],
          },
          studentTasks: [
            { type: "group", description: "Observasi tanaman di halaman sekolah dan tulis laporan" },
            { type: "individual", description: "Observasi hewan peliharaan dan tulis teks LHO 3 paragraf" },
            { type: "pair", description: "Membandingkan dua teks LHO dari sumber berbeda" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang dimaksud dengan observasi?", purpose: "Mengetahui pemahaman tentang observasi" },
              { question: "Pernahkah kalian membuat laporan? Seperti apa?", purpose: "Mengidentifikasi pengalaman menulis laporan" },
            ],
            formative: [
              { method: "Observasi kegiatan", criteria: ["Melakukan pengamatan dengan saksama", "Mencatat data secara sistematis"] },
              { method: "Cek laporan", criteria: ["Data sesuai hasil observasi", "Menggunakan bahasa baku", "Struktur lengkap"] },
            ],
            summative: [
              { type: "Laporan Observasi", description: "Menulis teks LHO berdasarkan observasi mandiri dengan struktur lengkap" },
              { type: "Analisis LHO", description: "Menganalisis teks LHO dari segi struktur dan kebahasaan" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Ketepatan Observasi",
                criteria: [
                  { level: "Sangat Baik", description: "Data observasi lengkap, akurat, dan sesuai objek" },
                  { level: "Baik", description: "Data observasi cukup lengkap dan akurat" },
                  { level: "Cukup", description: "Data observasi kurang lengkap" },
                  { level: "Kurang", description: "Data observasi tidak sesuai atau dibuat-buat" },
                ],
              },
              {
                name: "Struktur LHO",
                criteria: [
                  { level: "Sangat Baik", description: "Pernyataan umum, deskripsi bagian, dan deskripsi manfaat lengkap" },
                  { level: "Baik", description: "Struktur lengkap tetapi kurang terperinci" },
                  { level: "Cukup", description: "Satu bagian struktur tidak ada" },
                  { level: "Kurang", description: "Tidak menggunakan struktur LHO yang benar" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan format laporan yang sudah ada kerangkanya",
              "Membantu pemilihan objek observasi yang mudah diamati",
              "Bimbingan khusus dalam menulis kalimat definisi",
            ],
            challenge: [
              "Observasi fenomena alam yang memerlukan pengamatan berulang",
              "Menambahkan data kuantitatif (tabel, grafik) dalam laporan",
              "Menulis laporan observasi dengan objek abstrak (karakter, perilaku)",
            ],
          },
          remedial: [
            "Latihan menulis kalimat definisi dan klasifikasi secara terpisah",
            "Praktik observasi sederhana dengan objek yang mudah",
            "Revisi laporan dengan bimbingan guru",
          ],
          enrichment: [
            "Membaca laporan hasil penelitian sederhana dari jurnal ilmiah populer",
            "Membuat poster infografis hasil observasi",
          ],
          teacherNotes: [
            "Pastikan keamanan saat observasi di luar kelas",
            "Siapkan lembar observasi terstruktur untuk memudahkan siswa",
            "Berikan contoh objek observasi yang konkret dan mudah diakses",
          ],
          tags: ["observasi", "laporan", "ilmiah", "data"],
          isReady: true,
        },
        {
          id: "vii-puisi-rakyat",
          slug: "puisi-rakyat",
          grade: "VII",
          phase: "D",
          semester: 1,
          chapterNumber: 4,
          title: "Bab 4: Puisi Rakyat",
          shortTitle: "Puisi Rakyat",
          kd: "3.4/4.4",
          emoji: "🎭",
          description:
            "Mengenal dan mengapresiasi puisi rakyat (pantun, syair, gurindam) sebagai sastra lisan warisan budaya Indonesia.",
          learningGoals: [
            "Memahami pengertian dan ciri-ciri puisi rakyat",
            "Membedakan pantun, syair, dan gurindam",
            "Menulis pantun dan syair dengan memperhatikan rima dan sampiran",
          ],
          keyConcepts: {
            definition:
              "Puisi rakyat adalah karya sastra lisan yang terikat aturan rima, jumlah baris, dan jumlah suku kata. Jenisnya meliputi pantun (a-b-a-b, 4 baris), syair (a-a-a-a, 4 baris), dan gurindam (2 baris, nasihat).",
            characteristics: [
              "Bersifat lisan dan tradisional",
              "Terikat oleh aturan rima dan jumlah baris",
              "Mengandung nilai-nilai budaya dan moral",
              "Menggunakan bahasa kiasan",
              "Fungsinya sebagai nasihat, hiburan, atau pendidikan",
            ],
            structure: [
              { name: "Pantun", description: "4 baris, a-b-a-b. Baris 1-2 sampiran, baris 3-4 isi" },
              { name: "Syair", description: "4 baris, a-a-a-a. Semua baris adalah isi, berupa cerita atau nasihat" },
              { name: "Gurindam", description: "2 baris, a-a. Baris 1 sebab, baris 2 akibat" },
            ],
            languageFeatures: [
              "Menggunakan rima (persamaan bunyi)",
              "Kata konotatif dan kiasan",
              "Kalimat imperatif dan persuasif (khusus gurindam)",
              "Pilihan kata yang indah dan bermakna",
            ],
            examples: [
              {
                label: "Contoh Pantun",
                content: "Pergi ke pasar membeli duku\nJangan lupa membeli salak\nJika kita rajin membaca buku\nPastilah pintar dan tak pernah gagal",
                analysis:
                  "Bersajak a-b-a-b: duku-buku (a), salak-gagal (b). Baris 1-2 adalah sampiran, baris 3-4 adalah isi berupa nasihat tentang rajin membaca.",
              },
              {
                label: "Contoh Syair",
                content: "Wahai ananda intan permata\nRajinlah belajar siang dan malam\nIlmu itu tidak akan usang ditelan zaman\nBekal kehidupan hingga akhir zaman",
                analysis:
                  "Bersajak a-a-a-a. Semua baris adalah isi, berupa nasihat dari orang tua kepada anak.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Rima akhir (persamaan bunyi pada akhir baris)",
              "Sampiran dan isi pada pantun",
              "Diksi dan gaya bahasa dalam puisi rakyat",
            ],
            notes:
              "Tekankan bahwa pantun memiliki sampiran yang tidak boleh lebih dominan dari isi.",
          },
          activities: {
            opening: [
              "Guru membacakan pantun lucu untuk menarik perhatian",
              "Siswa menebak pantun dan menjawab secara lisan",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca berbagai contoh pantun, syair, dan gurindam",
              "Diskusi kelompok membedakan ketiga jenis puisi rakyat",
              "Latihan mengidentifikasi rima dan sampiran",
              "Menulis pantun secara terbimbing",
            ],
            group: [
              "Lomba menulis pantun antarkelompok",
              "Bermain pantun berbalas (berbalas pantun)",
              "Presentasi hasil karya puisi rakyat",
            ],
            reflection: [
              "Menyimpulkan perbedaan pantun, syair, dan gurindam",
              "Refleksi tentang kesulitan menulis pantun",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis 2 pantun (nasihat dan jenaka) dengan rima yang tepat" },
            { type: "group", description: "Berbalas pantun 5 ronde dengan tema pendidikan" },
            { type: "pair", description: "Mengubah syair menjadi pantun atau sebaliknya" },
          ],
          assessment: {
            diagnostic: [
              { question: "Siapa yang bisa membuat pantun?", purpose: "Mengidentifikasi siswa yang sudah mengenal pantun" },
              { question: "Apa beda pantun dengan puisi biasa?", purpose: "Mengetahui pemahaman siswa tentang aturan pantun" },
            ],
            formative: [
              { method: "Cek tulisan pantun", criteria: ["Rima a-b-a-b", "Sampiran dan isi jelas", "Jumlah baris 4"] },
              { method: "Observasi berbalas pantun", criteria: ["Kesesuaian tema", "Ketepatan rima", "Kelancaran"] },
            ],
            summative: [
              { type: "Kumpulan Puisi Rakyat", description: "Membuat kumpulan 3 pantun, 1 syair, dan 1 gurindam dengan tema pilihan" },
              { type: "Analisis", description: "Menganalisis rima, sampiran, isi, dan makna puisi rakyat yang disediakan" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kesesuaian Rima",
                criteria: [
                  { level: "Sangat Baik", description: "Rima sempurna dan konsisten sesuai jenis puisi rakyat" },
                  { level: "Baik", description: "Rima tepat dengan sedikit ketidakkonsistenan" },
                  { level: "Cukup", description: "Rima kurang tepat tetapi masih bisa diterima" },
                  { level: "Kurang", description: "Tidak memperhatikan rima" },
                ],
              },
              {
                name: "Isi dan Makna",
                criteria: [
                  { level: "Sangat Baik", description: "Isi padat, bermakna, sesuai tema" },
                  { level: "Baik", description: "Isi sesuai tema tetapi kurang mendalam" },
                  { level: "Cukup", description: "Isi kurang sesuai tema atau terlalu umum" },
                  { level: "Kurang", description: "Isi tidak jelas atau tidak bermakna" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan contoh pantun dengan rima yang diberi kode warna",
              "Menggunakan kartu kata untuk menyusun pantun",
              "Mengurangi jumlah pantun yang harus ditulis",
            ],
            challenge: [
              "Menulis pantun kilat (tema ditentukan mendadak)",
              "Mengubah prosa menjadi syair",
              "Menganalisis makna filosofis gurindam",
            ],
          },
          remedial: [
            "Latihan berima dengan kata-kata sederhana",
            "Praktik menyusun baris menjadi pantun dengan kartu kata",
            "Pendampingan individual dalam menulis pantun",
          ],
          enrichment: [
            "Membaca kumpulan pantun Melayu klasik",
            "Membuat antologi puisi rakyat kelas",
            "Membandingkan puisi rakyat Nusantara dengan budaya lain",
          ],
          teacherNotes: [
            "Gunakan permainan bahasa untuk membuat pembelajaran menyenangkan",
            "Tekankan bahwa pantun adalah warisan budaya yang diakui UNESCO",
            "Fasilitasi lomba pantun untuk memotivasi siswa",
          ],
          tags: ["pantun", "syair", "gurindam", "puisi", "rima"],
          isReady: true,
        },
      ],
    },
    {
      semester: 2,
      chapters: [
        {
          id: "vii-prosedur",
          slug: "teks-prosedur",
          grade: "VII",
          phase: "D",
          semester: 2,
          chapterNumber: 5,
          title: "Bab 5: Teks Prosedur",
          shortTitle: "Prosedur",
          kd: "3.5/4.5",
          emoji: "📋",
          description:
            "Mengenal, memahami, dan menulis teks prosedur yang berisi langkah-langkah melakukan sesuatu secara urut dan sistematis.",
          learningGoals: [
            "Memahami pengertian dan tujuan teks prosedur",
            "Mengidentifikasi struktur dan ciri kebahasaan teks prosedur",
            "Menulis teks prosedur dengan langkah yang jelas dan urut",
          ],
          keyConcepts: {
            definition:
              "Teks prosedur adalah teks yang berisi langkah-langkah atau tahapan yang harus dilakukan untuk mencapai suatu tujuan, seperti cara membuat sesuatu, cara melakukan sesuatu, atau cara menggunakan sesuatu.",
            characteristics: [
              "Berisi langkah-langkah yang urut dan sistematis",
              "Bersifat informatif dan instruktif",
              "Menggunakan kalimat imperatif (perintah)",
              "Tidak mengandung opini atau penilaian subjektif",
              "Setiap langkah harus jelas dan dapat diikuti",
            ],
            structure: [
              { name: "Tujuan", description: "Penjelasan tentang tujuan atau hasil akhir yang akan dicapai" },
              { name: "Bahan/Alat", description: "Daftar bahan, alat, atau persyaratan yang diperlukan" },
              { name: "Langkah-langkah", description: "Tahapan berurutan untuk mencapai tujuan" },
            ],
            languageFeatures: [
              "Kalimat imperatif (siapkan, masukkan, aduk, tekan)",
              "Konjungsi temporal (pertama, kedua, kemudian, setelah itu, lalu)",
              "Kata teknis atau istilah spesifik terkait prosedur",
              "Kalimat deklaratif untuk menjelaskan tujuan dan bahan",
              "Verba material (tindakan fisik: potong, campur, tarik)",
            ],
            examples: [
              {
                label: "Contoh Teks Prosedur: Cara Membuat Telur Dadar",
                content:
                  "Tujuan: Membuat telur dadar yang lezat dan sederhana. Bahan: 2 butir telur, garam secukupnya, merica bubuk, minyak goreng. Alat: mangkuk, garpu, wajan anti lengket, spatula. Langkah-langkah: 1. Pecahkan telur ke dalam mangkuk. 2. Tambahkan garam dan merica secukupnya. 3. Kocok telur hingga merata menggunakan garpu. 4. Panaskan wajan dengan api sedang. 5. Tuangkan minyak goreng secukupnya. 6. Masukkan kocokan telur ke wajan. 7. Masak hingga sisi bawah matang, lalu balik. 8. Angkat dan sajikan di piring.",
                analysis:
                  "Menggunakan kalimat imperatif (pecahkan, tambahkan, kocok). Konjungsi temporal tersirat dalam urutan nomor. Terdapat bagian tujuan, bahan/alat, dan langkah-langkah.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Kalimat imperatif sebagai ciri utama",
              "Konjungsi temporal untuk urutan langkah",
              "Penggunaan kata teknis sesuai prosedur",
            ],
            notes:
              "Bedakan teks prosedur dengan teks narasi — prosedur tidak boleh mengandung cerita atau opini.",
          },
          activities: {
            opening: [
              "Guru mendemonstrasikan cara membuat sesuatu yang sederhana (origami, minuman)",
              "Siswa mengamati dan mencatat langkah-langkahnya",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh teks prosedur dari berbagai sumber",
              "Diskusi struktur dan kebahasaan teks prosedur",
              "Praktik menulis teks prosedur dengan bimbingan",
              "Saling menilai teks prosedur antarteman",
            ],
            group: [
              "Praktik membuat makanan/minuman sederhana sesuai prosedur",
              "Membuat video tutorial teks prosedur",
              "Presentasi hasil praktik",
            ],
            reflection: [
              "Diskusi tentang pentingnya urutan langkah yang tepat",
              "Refleksi: 'Apa jadinya jika langkah tidak urut?'",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis teks prosedur cara membuat kerajinan sederhana" },
            { type: "group", description: "Membuat video tutorial cara melakukan sesuatu (5-7 langkah)" },
            { type: "pair", description: "Mengubah teks prosedur menjadi infografis" },
          ],
          assessment: {
            diagnostic: [
              { question: "Pernahkah kamu mengikuti petunjuk penggunaan suatu alat?", purpose: "Mengetahui pengalaman siswa dengan instruksi" },
              { question: "Apa yang terjadi jika langkah tidak urut?", purpose: "Memahami kesadaran akan urutan prosedur" },
            ],
            formative: [
              { method: "Cek langkah-langkah", criteria: ["Urut dan logis", "Setiap langkah jelas", "Menggunakan kalimat imperatif"] },
              { method: "Praktik langsung", criteria: ["Mengikuti langkah sesuai teks", "Hasil sesuai tujuan"] },
            ],
            summative: [
              { type: "Teks Prosedur", description: "Menulis teks prosedur lengkap (tujuan, bahan/alat, langkah) tentang topik pilihan" },
              { type: "Praktik", description: "Mendemonstrasikan prosedur di depan kelas" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kelengkapan Struktur",
                criteria: [
                  { level: "Sangat Baik", description: "Tujuan, bahan/alat, langkah-langkah lengkap dan jelas" },
                  { level: "Baik", description: "Struktur lengkap tetapi kurang terperinci" },
                  { level: "Cukup", description: "Satu bagian tidak lengkap" },
                  { level: "Kurang", description: "Struktur tidak sesuai teks prosedur" },
                ],
              },
              {
                name: "Kejelasan Langkah",
                criteria: [
                  { level: "Sangat Baik", description: "Langkah urut, detail, dan mudah diikuti" },
                  { level: "Baik", description: "Langkah urut tetapi ada yang kurang detail" },
                  { level: "Cukup", description: "Langkah kurang urut atau membingungkan" },
                  { level: "Kurang", description: "Langkah tidak dapat diikuti" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan kerangka teks prosedur yang sudah diisi sebagian",
              "Menggunakan gambar setiap langkah (pictorial procedure)",
              "Praktik langsung sebelum menulis",
            ],
            challenge: [
              "Menulis prosedur dengan variasi kalimat (tidak monoton imperatif)",
              "Membuat prosedur dalam bentuk diagram alir (flowchart)",
              "Menulis prosedur untuk kegiatan yang kompleks (eksperimen sains)",
            ],
          },
          remedial: [
            "Latihan menulis kalimat imperatif terlebih dahulu",
            "Praktik menyusun langkah acak menjadi urutan yang benar",
            "Bimbingan khusus dalam menulis langkah yang detail",
          ],
          enrichment: [
            "Membaca manual book atau buku petunjuk penggunaan alat",
            "Membandingkan teks prosedur dalam bahasa Indonesia dan Inggris",
          ],
          teacherNotes: [
            "Pilih prosedur yang sederhana dan relevan dengan kehidupan siswa",
            "Pastikan keamanan saat praktik membuat sesuatu",
            "Tekankan pentingnya kata kerja imperatif yang tepat",
          ],
          tags: ["prosedur", "instruksi", "langkah", "tutorial"],
          isReady: true,
        },
        {
          id: "vii-surat",
          slug: "surat-pribadi-dinas",
          grade: "VII",
          phase: "D",
          semester: 2,
          chapterNumber: 6,
          title: "Bab 6: Surat Pribadi dan Surat Dinas",
          shortTitle: "Surat",
          kd: "3.6/4.6",
          emoji: "✉️",
          description:
            "Mengenal, membedakan, dan menulis surat pribadi serta surat dinas sesuai dengan fungsi dan kaidah kebahasaannya.",
          learningGoals: [
            "Memahami perbedaan surat pribadi dan surat dinas",
            "Mengidentifikasi struktur dan ciri kebahasaan surat",
            "Menulis surat pribadi dan surat dinas dengan format yang benar",
          ],
          keyConcepts: {
            definition:
              "Surat adalah media komunikasi tertulis yang digunakan untuk menyampaikan pesan dari pengirim kepada penerima. Surat pribadi bersifat tidak resmi untuk komunikasi personal, sedangkan surat dinas bersifat resmi untuk keperluan kedinasan.",
            characteristics: [
              "Surat pribadi: bahasa santai, format fleksibel, untuk teman/keluarga",
              "Surat dinas: bahasa baku, format resmi, berkop surat, ada nomor",
              "Surat pribadi: mencerminkan hubungan emosional",
              "Surat dinas: mencerminkan hubungan formal/kedinasan",
            ],
            structure: [
              { name: "Surat Pribadi", description: "Tempat/tanggal, salam pembuka, isi (kabar/pesan), penutup, salam akhir, nama pengirim" },
              { name: "Surat Dinas", description: "Kop surat, nomor, lampiran, perihal, alamat tujuan, salam pembuka, isi, penutup, tanda tangan, cap stempel" },
            ],
            languageFeatures: [
              "Surat pribadi: bahasa santai, sapaan akrab, emotif",
              "Surat dinas: bahasa baku, kalimat efektif, singkat dan jelas",
              "Surat dinas: menggunakan salam resmi (Yang Terhormat, Dengan Hormat)",
              "Surat pribadi: bisa menggunakan bahasa daerah atau slang terbatas",
            ],
            examples: [
              {
                label: "Contoh Surat Pribadi",
                content:
                  "Jakarta, 15 Juli 2024\n\nHalo Sari,\n\nApa kabar? Lama tidak bertemu. Aku ingin bercerita tentang liburanku kemarin. Aku pergi ke rumah nenek di desa. Di sana aku belajar menanam padi dan memberi makan ayam. Seru sekali!\n\nSemoga kamu juga liburan yang menyenangkan, ya.\n\nSalam,\nDina",
                analysis:
                  "Bahasa santai, sapaan akrab (Halo), isi berupa cerita pribadi, salam penutup tidak resmi.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Perbedaan ragam bahasa formal dan informal",
              "Penggunaan sapaan yang sesuai konteks",
              "Struktur kalimat efektif untuk surat dinas",
            ],
            notes:
              "Tekankan pemilihan bahasa yang sesuai dengan penerima surat.",
          },
          activities: {
            opening: [
              "Guru menunjukkan dua surat (pribadi dan dinas) dan meminta siswa menebak perbedaannya",
              "Tanya jawab tentang pengalaman menulis surat",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh surat pribadi dan surat dinas",
              "Diskusi kelompok mengidentifikasi perbedaan struktur",
              "Latihan menulis surat pribadi untuk teman",
              "Latihan menulis surat dinas sederhana",
            ],
            group: [
              "Bermain peran: mengirim dan menerima surat",
              "Menyunting surat dinas yang tidak sesuai format",
              "Presentasi perbandingan surat pribadi dan dinas",
            ],
            reflection: [
              "Diskusi kapan harus menggunakan surat pribadi dan kapan surat dinas",
              "Refleksi tentang pentingnya etika berkomunikasi tertulis",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis surat pribadi untuk sahabat pena (150-200 kata)" },
            { type: "individual", description: "Menulis surat izin sakit dengan format surat dinas" },
            { type: "pair", description: "Membandingkan format surat pribadi dan surat dinas" },
          ],
          assessment: {
            diagnostic: [
              { question: "Siapa yang pernah menulis surat? Untuk apa?", purpose: "Mengetahui pengalaman menulis surat" },
              { question: "Apa beda surat untuk teman dan surat untuk guru?", purpose: "Menyadarkan perbedaan ragam bahasa" },
            ],
            formative: [
              { method: "Cek surat pribadi", criteria: ["Format benar", "Bahasa sesuai", "Isi komunikatif"] },
              { method: "Cek surat dinas", criteria: ["Format resmi", "Bahasa baku", "Kelengkapan bagian"] },
            ],
            summative: [
              { type: "Portofolio Surat", description: "Membuat portofolio berisi 1 surat pribadi dan 1 surat dinas dengan topik berbeda" },
              { type: "Suntingan", description: "Menyunting surat dinas yang mengandung kesalahan format dan bahasa" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kesesuaian Format",
                criteria: [
                  { level: "Sangat Baik", description: "Format surat sesuai dengan jenisnya, lengkap dan rapi" },
                  { level: "Baik", description: "Format sesuai tetapi ada kekurangan kecil" },
                  { level: "Cukup", description: "Format campuran antara pribadi dan dinas" },
                  { level: "Kurang", description: "Format tidak sesuai dengan jenis surat" },
                ],
              },
              {
                name: "Kesesuaian Bahasa",
                criteria: [
                  { level: "Sangat Baik", description: "Bahasa sesuai konteks, santai untuk pribadi, baku untuk dinas" },
                  { level: "Baik", description: "Bahasa sesuai tetapi ada beberapa kata tidak tepat" },
                  { level: "Cukup", description: "Bahasa kurang konsisten dengan jenis surat" },
                  { level: "Kurang", description: "Bahasa tidak sesuai jenis surat" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan template surat dengan bagian yang dirumpangkan",
              "Bank kosakata formal dan informal",
              "Bimbingan menulis surat dinas langkah demi langkah",
            ],
            challenge: [
              "Menulis surat lamaran pekerjaan sederhana",
              "Mengirim surel (email) resmi sebagai pengganti surat dinas",
              "Menganalisis perbedaan surat elektronik dan surat konvensional",
            ],
          },
          remedial: [
            "Latihan membedakan bahasa formal dan informal melalui kalimat",
            "Praktik menulis alamat surat yang benar",
            "Pendampingan menyusun surat dinas dari kerangka",
          ],
          enrichment: [
            "Membaca kumpulan surat tokoh nasional",
            "Membuat proposal kegiatan sederhana dengan format surat dinas",
          ],
          teacherNotes: [
            "Surat dinas bisa diganti dengan surel resmi untuk konteks kekinian",
            "Tekankan bahwa surat pribadi tidak berarti asal-asalan",
            "Berikan contoh surat dinas yang autentik dari sekolah",
          ],
          tags: ["surat", "komunikasi", "formal", "informal"],
          isReady: true,
        },
        {
          id: "vii-cerita-fantasi",
          slug: "cerita-fantasi",
          grade: "VII",
          phase: "D",
          semester: 2,
          chapterNumber: 7,
          title: "Bab 7: Cerita Fantasi",
          shortTitle: "Cerita Fantasi",
          kd: "3.7/4.7",
          emoji: "🦄",
          description:
            "Mengenal dan menulis cerita fantasi dengan imajinasi kreatif yang mengandung unsur keajaiban, kesaktian, atau hal-hal misterius.",
          learningGoals: [
            "Memahami pengertian dan ciri-ciri cerita fantasi",
            "Mengidentifikasi struktur dan unsur intrinsik cerita fantasi",
            "Menulis cerita fantasi dengan pengembangan imajinasi yang kreatif",
          ],
          keyConcepts: {
            definition:
              "Cerita fantasi adalah cerita yang dikembangkan berdasarkan imajinasi pengarang dengan unsur keajaiban, kesaktian, atau hal-hal misterius yang tidak masuk akal secara logika.",
            characteristics: [
              "Mengandung unsur keajaiban atau kemustahilan",
              "Tokoh memiliki kesaktian atau kemampuan khusus",
              "Latar lintas ruang dan waktu (masa lalu, masa depan, dunia paralel)",
              "Alur kompleks dengan konflik yang unik",
              "Pesan moral tersirat melalui petualangan tokoh",
            ],
            structure: [
              { name: "Orientasi", description: "Pengenalan tokoh, latar, dan suasana" },
              { name: "Konflik", description: "Munculnya masalah yang dihadapi tokoh" },
              { name: "Resolusi", description: "Penyelesaian konflik" },
              { name: "Koda (opsional)", description: "Pesan moral atau penutup" },
            ],
            languageFeatures: [
              "Menggunakan kata konkret untuk menggambarkan dunia fantasi",
              "Kata ganti orang ketiga (ia, dia, mereka)",
              "Penggunaan sinonim untuk variasi kata",
              "Kalimat deskriptif yang kuat",
              "Dialog yang mendukung karakterisasi tokoh",
            ],
            examples: [
              {
                label: "Contoh Cerita Fantasi",
                content:
                  "Rafa tidak pernah menyangka bahwa pensil pemberian kakeknya bisa berbicara. 'Gambarlah sesuatu, dan aku akan menghidupkannya,' bisik pensil itu. Rafa yang terkejut hampir menjatuhkan pensil ajaib itu. Dengan tangan gemetar, ia menggambar seekor kupu-kupu. Sekejap, kupu-kupu itu terbang keluar dari kertas! Rafa tersenyum lebar. 'Hari ini adalah awal dari petualangan terbaik dalam hidupku,' gumamnya.",
                analysis:
                  "Cerita mengandung unsur keajaiban (pensil berbicara, gambar hidup). Orientasi (Rafa dapat pensil dari kakek), konflik (keraguan/keterkejutan), resolusi (gambar hidup). Bahasa deskriptif (tangan gemetar, tersenyum lebar).",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Kata konkret untuk menggambarkan dunia fantasi",
              "Penggunaan majas personifikasi dan hiperbola",
              "Variasi kalimat untuk menciptakan ketegangan",
            ],
            notes:
              "Imajinasi siswa perlu diarahkan agar tetap memiliki pesan moral, tidak sekadar 'mustahil'.",
          },
          activities: {
            opening: [
              "Guru membacakan penggalan novel fantasi populer",
              "Siswa menyebutkan film/cerita fantasi yang mereka ketahui",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh cerita fantasi dan mengidentifikasi struktur",
              "Diskusi tentang unsur keajaiban dalam cerita",
              "Brainstorming ide cerita fantasi dengan peta pikiran",
              "Menulis cerita fantasi secara bertahap",
            ],
            group: [
              "Bermain 'cerita berantai' fantasi",
              "Membuat ilustrasi tokoh fantasi",
              "Presentasi cerita fantasi kelompok",
            ],
            reflection: [
              "Diskusi tentang perbedaan cerita fantasi dan cerita realis",
              "Siswa membacakan karyanya di depan kelas",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis cerita fantasi pendek 3-4 paragraf dengan unsur keajaiban" },
            { type: "group", description: "Membuat komik strip cerita fantasi 4 panel" },
            { type: "pair", description: "Mengubah cerita fantasi menjadi naskah drama pendek" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa contoh film cerita fantasi yang kamu tahu?", purpose: "Mengenali familiaritas dengan genre" },
              { question: "Apa yang membedakan cerita fantasi dari cerita biasa?", purpose: "Memahami pemahaman awal siswa" },
            ],
            formative: [
              { method: "Cek draf cerita", criteria: ["Ada unsur keajaiban", "Struktur orientasi-konflik-resolusi"] },
              { method: "Diskusi kelompok", criteria: ["Ide kreatif", "Partisipasi aktif"] },
            ],
            summative: [
              { type: "Cerita Fantasi", description: "Menulis cerita fantasi minimal 4 paragraf dengan struktur lengkap, unsur keajaiban, dan pesan moral" },
              { type: "Analisis", description: "Menganalisis unsur intrinsik cerita fantasi yang disediakan" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kreativitas",
                criteria: [
                  { level: "Sangat Baik", description: "Ide orisinal, dunia fantasi digambarkan detail, unsur keajaiban unik" },
                  { level: "Baik", description: "Kreatif tetapi masih mirip cerita yang sudah ada" },
                  { level: "Cukup", description: "Kurang kreatif, banyak klise" },
                  { level: "Kurang", description: "Tidak ada unsur fantasi yang jelas" },
                ],
              },
              {
                name: "Struktur Cerita",
                criteria: [
                  { level: "Sangat Baik", description: "Orientasi, konflik, resolusi lengkap dengan alur yang menarik" },
                  { level: "Baik", description: "Struktur lengkap tetapi alur kurang menarik" },
                  { level: "Cukup", description: "Satu bagian struktur tidak jelas" },
                  { level: "Kurang", description: "Cerita tidak terstruktur" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan gambar berseri sebagai pemicu ide",
              "Kerangka cerita dengan pertanyaan pemandu",
              "Daftar kata sifat dan kata kerja yang bisa digunakan",
            ],
            challenge: [
              "Menulis cerita fantasi dengan alur mundur (flashback)",
              "Menciptakan bahasa atau istilah untuk dunia fantasi sendiri",
              "Menulis dari sudut pandang tokoh antagonis",
            ],
          },
          remedial: [
            "Latihan membedakan cerita fantasi dan realis melalui contoh",
            "Menulis 1 paragraf deskripsi dunia fantasi terlebih dahulu",
            "Pendampingan dalam mengembangkan konflik",
          ],
          enrichment: [
            "Membaca novel fantasi Indonesia (Bumi, Petualangan Sherina)",
            "Membuat trailer buku fantasi dalam bentuk video",
          ],
          teacherNotes: [
            "Arahkan imajinasi siswa agar tetap terstruktur",
            "Berikan apresiasi pada ide-ide kreatif meskipun sederhana",
            "Hubungkan dengan pesan moral yang relevan",
          ],
          tags: ["fantasi", "imajinasi", "cerita", "kreatif"],
          isReady: true,
        },
      ],
    },
  ],
}
