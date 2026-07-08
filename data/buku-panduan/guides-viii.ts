import type { GradeData } from "./types"

export const kelasVIII: GradeData = {
  grade: "VIII",
  label: "Kelas VIII",
  phase: "D",
  semesters: [
    {
      semester: 1,
      chapters: [
        {
          id: "viii-berita",
          slug: "teks-berita",
          grade: "VIII",
          phase: "D",
          semester: 1,
          chapterNumber: 1,
          title: "Bab 1: Teks Berita",
          shortTitle: "Berita",
          kd: "3.1/4.1",
          emoji: "📰",
          description:
            "Menganalisis dan menulis teks berita dengan unsur 5W+1H yang lengkap serta bahasa yang singkat, padat, dan objektif.",
          learningGoals: [
            "Memahami unsur-unsur teks berita (5W+1H)",
            "Menganalisis struktur teks berita (judul, lead, isi, penutup)",
            "Menulis teks berita dengan bahasa yang objektif dan informatif",
          ],
          keyConcepts: {
            definition:
              "Teks berita adalah teks yang menyajikan laporan tentang suatu peristiwa atau kejadian faktual, terkini, dan menarik perhatian masyarakat.",
            characteristics: [
              "Faktual dan aktual (berdasarkan fakta dan terkini)",
              "Objektif (tidak memihak dan tidak mengandung opini penulis)",
              "Singkat, padat, dan jelas",
              "Menarik perhatian pembaca",
              "Lengkap dengan unsur 5W+1H",
            ],
            structure: [
              { name: "Judul", description: "Judul yang menarik, singkat, mewakili isi berita" },
              { name: "Lead (Kepala Berita)", description: "Paragraf pembuka yang berisi inti berita (paling penting dari 5W+1H)" },
              { name: "Isi Berita (Body)", description: "Pengembangan dari lead, menjelaskan detail peristiwa secara berurutan" },
              { name: "Ekor (Penutup)", description: "Informasi tambahan yang kurang penting, bisa dihilangkan" },
            ],
            languageFeatures: [
              "Kalimat langsung (kutipan dari narasumber)",
              "Kalimat tidak langsung (melaporkan pernyataan narasumber)",
              "Konjungsi temporal (kemudian, setelah itu)",
              "Kata kerja mental (mengatakan, menyatakan, menambahkan)",
              "Bahasa baku dan mudah dipahami",
            ],
            examples: [
              {
                label: "Contoh Teks Berita",
                content:
                  "Kementerian Pendidikan mengumumkan kebijakan baru tentang jam belajar sekolah. Mulai tahun ajaran depan, jam belajar akan ditambah 30 menit per hari. 'Penambahan ini bertujuan meningkatkan kualitas pembelajaran,' ujar Menteri Pendidikan dalam konferensi pers kemarin. Kebijakan ini akan diterapkan secara bertahap di seluruh Indonesia.",
                analysis:
                  "Memenuhi 5W+1H: What (kebijakan jam belajar), Who (Kemendikbud), When (tahun ajaran depan), Where (Indonesia), Why (meningkatkan kualitas). Struktur: lead (inti berita), isi (penjelasan + kutipan).",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Kalimat langsung dan tidak langsung dalam berita",
              "Penggunaan kata kerja pelaporan (mengatakan, menyatakan)",
              "Kebakuan bahasa dalam penulisan berita",
            ],
            notes:
              "Bedakan kalimat langsung (kutipan dengan tanda petik) dan kalimat tidak langsung (laporan tanpa tanda petik).",
          },
          activities: {
            opening: [
              "Guru memutar video berita singkat dan meminta siswa mencatat inti berita",
              "Diskusi tentang sumber-sumber berita yang dikenal siswa",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca berita dari media massa dan mengidentifikasi 5W+1H",
              "Diskusi struktur berita (piramida terbalik)",
              "Latihan menulis lead berita",
              "Menulis berita lengkap berdasarkan data yang disediakan",
            ],
            group: [
              "Menulis berita berdasarkan peristiwa di sekolah",
              "Wawancara narasumber untuk berita",
              "Presentasi berita ala reporter TV",
            ],
            reflection: [
              "Diskusi tentang pentingnya berita yang faktual dan terverifikasi",
              "Refleksi tentang bahaya berita hoaks",
            ],
          },
          studentTasks: [
            { type: "group", description: "Membuat majalah dinding berita kelas" },
            { type: "individual", description: "Menulis berita tentang kegiatan sekolah (5W+1H lengkap)" },
            { type: "pair", description: "Membandingkan pemberitaan dari dua media berbeda tentang topik sama" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang membedakan berita dengan cerita?", purpose: "Mengetahui pemahaman tentang berita" },
              { question: "Sebutkan satu berita yang kamu ingat!", purpose: "Mengidentifikasi konsumsi berita siswa" },
            ],
            formative: [
              { method: "Cek identifikasi 5W+1H", criteria: ["Menemukan semua unsur", "Tepat dalam mengidentifikasi"] },
              { method: "Observasi diskusi", criteria: ["Partisipasi aktif", "Menggunakan istilah jurnalistik"] },
            ],
            summative: [
              { type: "Teks Berita", description: "Menulis berita lengkap (struktur piramida terbalik, 5W+1H, kalimat langsung)" },
              { type: "Analisis Berita", description: "Menganalisis unsur 5W+1H dan struktur berita dari media massa" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kelengkapan 5W+1H",
                criteria: [
                  { level: "Sangat Baik", description: "Semua unsur 5W+1H lengkap dan jelas" },
                  { level: "Baik", description: "5W+1H lengkap tetapi ada satu unsur kurang jelas" },
                  { level: "Cukup", description: "Hanya 4 dari 6 unsur yang lengkap" },
                  { level: "Kurang", description: "Kurang dari 4 unsur yang terpenuhi" },
                ],
              },
              {
                name: "Objektivitas",
                criteria: [
                  { level: "Sangat Baik", description: "Berita objektif, tidak mengandung opini penulis" },
                  { level: "Baik", description: "Hanya sedikit opini yang masuk" },
                  { level: "Cukup", description: "Campuran fakta dan opini" },
                  { level: "Kurang", description: "Didominasi opini, bukan fakta" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan tabel 5W+1H untuk diisi",
              "Bimbingan membaca berita dengan keras (reading aloud)",
              "Menggunakan berita dari sumber yang dekat dengan siswa",
            ],
            challenge: [
              "Menulis berita investigasi sederhana",
              "Menganalisis bias dalam pemberitaan",
              "Membuat perbandingan berita media cetak dan digital",
            ],
          },
          remedial: [
            "Latihan mengidentifikasi 5W+1H dari kalimat sederhana",
            "Praktik membedakan fakta dan opini",
            "Menulis lead berita secara bertahap",
          ],
          enrichment: [
            "Mengunjungi kantor berita lokal (field trip)",
            "Membuat blog berita kelas yang diperbarui rutin",
          ],
          teacherNotes: [
            "Gunakan berita terkini yang relevan dengan usia siswa",
            "Tekankan pentingnya verifikasi informasi",
            "Ajak siswa kritis membedakan berita faktual dan hoaks",
          ],
          tags: ["berita", "5W+1H", "jurnalistik", "fakta"],
          isReady: true,
        },
        {
          id: "viii-drama",
          slug: "drama",
          grade: "VIII",
          phase: "D",
          semester: 1,
          chapterNumber: 2,
          title: "Bab 2: Drama",
          shortTitle: "Drama",
          kd: "3.2/4.2",
          emoji: "🎭",
          description:
            "Memahami struktur, unsur, dan kebahasaan drama serta menulis dan mementaskan naskah drama sederhana.",
          learningGoals: [
            "Memahami pengertian, struktur, dan unsur drama",
            "Menganalisis naskah drama berdasarkan karakter tokoh dan konflik",
            "Menulis naskah drama sederhana dan mementaskannya",
          ],
          keyConcepts: {
            definition:
              "Drama adalah karya sastra yang ditulis untuk dipentaskan, mengungkapkan cerita melalui dialog dan tindakan tokoh.",
            characteristics: [
              "Berupa dialog antartokoh",
              "Dilengkapi petunjuk laku (stage direction) dalam tanda kurung",
              "Mengandung konflik sebagai inti cerita",
              "Dipentaskan di atas panggung",
              "Ada pembagian babak dan adegan",
            ],
            structure: [
              { name: "Prolog", description: "Pembukaan drama (dapat berupa pengantar)" },
              { name: "Dialog", description: "Percakapan antartokoh yang membangun alur" },
              { name: "Petunjuk Laku", description: "Instruksi tentang gerakan, ekspresi, suasana hati" },
              { name: "Epilog", description: "Penutup drama" },
            ],
            languageFeatures: [
              "Dialog sebagai unsur utama (bukan narasi)",
              "Petunjuk laku dalam tanda kurung",
              "Bahasa lisan yang komunikatif dan sesuai karakter tokoh",
              "Penggunaan kata seru dan kalimat interogatif",
            ],
            examples: [
              {
                label: "Petunjuk Laku dalam Naskah Drama",
                content:
                  "(Rina duduk termenung di bangku taman. Matanya berkaca-kaca. Andi datang menghampiri.)\nAndi: \"Kenapa, Rin? Kamu sedih?\"\nRina: (menyeka air mata) \"Aku gagal lomba pidato, Di.\"\nAndi: \"Kamu sudah berusaha keras. Itu yang penting.\"\nRina: (tersenyum tipis) \"Terima kasih, Di. Kamu benar.\"",
                analysis:
                  "Petunjuk laku dalam kurung menggambarkan ekspresi dan gerakan. Dialog alami dan sesuai karakter. Tidak ada narasi panjang.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Penulisan dialog yang efektif dan alami",
              "Petunjuk laku yang jelas",
              "Karakterisasi melalui pilihan kata",
            ],
            notes:
              "Dialog yang baik mencerminkan karakter dan latar tokoh, bukan sekadar menyampaikan informasi.",
          },
          activities: {
            opening: [
              "Guru mendemonstrasikan adegan drama pendek bersama kolaborator",
              "Siswa mengamati unsur drama dalam demonstrasi",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca naskah drama dan mengidentifikasi strukturnya",
              "Diskusi karakterisasi tokoh melalui dialog",
              "Latihan menulis dialog berdasarkan konflik yang diberikan",
              "Menyusun naskah drama kelompok",
            ],
            group: [
              "Pembagian peran dalam kelompok",
              "Latihan pementasan (blocking dan penghayatan)",
              "Pementasan drama di depan kelas",
              "Saling memberi tanggapan pentas",
            ],
            reflection: [
              "Diskusi tentang kesulitan saat menulis dan mementaskan drama",
              "Refleksi tentang nilai kerja sama dalam pementasan",
            ],
          },
          studentTasks: [
            { type: "group", description: "Menulis naskah drama pendek (2-3 tokoh, 1 babak) dan mementaskannya" },
            { type: "individual", description: "Menulis analisis karakter tokoh dalam naskah drama yang disediakan" },
            { type: "pair", description: "Mengubah cerpen menjadi naskah drama" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang membedakan drama dengan cerpen?", purpose: "Mengetahui pemahaman tentang drama" },
              { question: "Siapa yang pernah melihat pertunjukan drama?", purpose: "Mengidentifikasi pengalaman apresiasi" },
            ],
            formative: [
              { method: "Cek naskah", criteria: ["Dialog jelas", "Petunjuk laku ada", "Konflik tergambar"] },
              { method: "Observasi latihan", criteria: ["Kerja sama kelompok", "Kreativitas ekspresi"] },
            ],
            summative: [
              { type: "Naskah Drama", description: "Menulis naskah drama pendek (1 babak, 2-3 tokoh) dengan struktur lengkap" },
              { type: "Pementasan", description: "Mementaskan drama dengan penghayatan, ekspresi, dan blocking yang tepat" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kualitas Naskah",
                criteria: [
                  { level: "Sangat Baik", description: "Dialog alami, petunjuk laku jelas, konflik kuat, karakter tergambar baik" },
                  { level: "Baik", description: "Dialog baik, petunjuk laku ada, konflik cukup" },
                  { level: "Cukup", description: "Dialog kaku, petunjuk laku minim" },
                  { level: "Kurang", description: "Naskah tidak layak pentas" },
                ],
              },
              {
                name: "Pementasan",
                criteria: [
                  { level: "Sangat Baik", description: "Penghayatan kuat, blocking tepat, ekspresi sesuai, suara jelas" },
                  { level: "Baik", description: "Penghayatan cukup, blocking kurang variatif" },
                  { level: "Cukup", description: "Kurang penghayatan, sering lupa dialog" },
                  { level: "Kurang", description: "Tidak siap pentas" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan kerangka naskah drama dengan dialog yang dirumpangkan",
              "Bimbingan karakterisasi melalui contoh video",
              "Pembagian peran sesuai kemampuan siswa",
            ],
            challenge: [
              "Menulis drama multi-babak",
              "Mengintegrasikan unsur musik atau tari dalam pementasan",
              "Menganalisis struktur drama klasik vs modern",
            ],
          },
          remedial: [
            "Latihan membaca dialog dengan intonasi yang tepat",
            "Praktik menulis petunjuk laku dari adegan yang diamati",
            "Pendampingan kelompok dalam menyusun naskah",
          ],
          enrichment: [
            "Mengunjungi pertunjukan drama atau menonton rekaman pentas",
            "Menulis resensi pertunjukan drama",
          ],
          teacherNotes: [
            "Berikan kebebasan kreatif dalam pementasan",
            "Fasilitasi siswa yang pemalu untuk tetap berpartisipasi",
            "Tekankan kerja sama tim lebih penting dari penampilan individu",
          ],
          tags: ["drama", "naskah", "pementasan", "dialog"],
          isReady: true,
        },
        {
          id: "viii-eksplanasi",
          slug: "teks-eksplanasi",
          grade: "VIII",
          phase: "D",
          semester: 1,
          chapterNumber: 3,
          title: "Bab 3: Teks Eksplanasi",
          shortTitle: "Eksplanasi",
          kd: "3.3/4.3",
          emoji: "🌊",
          description:
            "Memahami dan menulis teks eksplanasi yang menjelaskan proses terjadinya suatu fenomena alam, sosial, atau budaya secara ilmiah.",
          learningGoals: [
            "Memahami pengertian dan tujuan teks eksplanasi",
            "Mengidentifikasi struktur dan ciri kebahasaan teks eksplanasi",
            "Menulis teks eksplanasi dengan urutan kausal yang logis",
          ],
          keyConcepts: {
            definition:
              "Teks eksplanasi adalah teks yang menjelaskan proses terjadinya suatu fenomena alam, sosial, atau budaya secara ilmiah dan faktual.",
            characteristics: [
              "Menjelaskan proses terjadinya sesuatu (bagaimana dan mengapa)",
              "Bersifat ilmiah dan faktual",
              "Berisi hubungan kausal (sebab-akibat)",
              "Informasi bersifat informatif dan edukatif",
              "Fokus pada fenomena umum, bukan partikular",
            ],
            structure: [
              { name: "Pernyataan Umum", description: "Pembuka yang menjelaskan fenomena yang akan dibahas" },
              { name: "Deretan Penjelas", description: "Urutan proses terjadinya fenomena secara kronologis atau kausal" },
              { name: "Interpretasi (opsional)", description: "Kesimpulan atau komentar tentang fenomena" },
            ],
            languageFeatures: [
              "Konjungsi kausal (sebab, karena, akibatnya, oleh karena itu)",
              "Konjungsi kronologis (kemudian, lalu, setelah itu)",
              "Istilah teknis sesuai fenomena",
              "Kalimat pasif (terjadi, dihasilkan, disebabkan)",
              "Verba material dan relasional",
            ],
            examples: [
              {
                label: "Contoh Teks Eksplanasi: Proses Terjadinya Hujan",
                content:
                  "Hujan adalah peristiwa turunnya air dari atmosfer ke permukaan bumi. Proses terjadinya hujan dimulai dari penguapan air laut oleh sinar matahari. Uap air naik ke atmosfer dan mengalami kondensasi menjadi awan. Akibatnya, partikel air dalam awan semakin besar dan berat. Ketika awan tidak dapat menampung lagi, air turun sebagai hujan. Proses ini disebut siklus hidrologi.",
                analysis:
                  "Struktur: pernyataan umum (hujan adalah), deretan penjelas (penguapan → kondensasi → presipitasi). Konjungsi kausal (akibatnya). Istilah teknis (kondensasi, siklus hidrologi).",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Konjungsi kausal dan kronologis",
              "Istilah teknis sesuai fenomena",
              "Kalimat definisi dan klasifikasi",
            ],
            notes:
              "Tekankan bahwa eksplanasi menjelaskan PROSES, bukan sekadar mendefinisikan.",
          },
          activities: {
            opening: [
              "Guru memutar video tentang fenomena alam (gunung meletus, tsunami)",
              "Siswa menyebutkan proses yang mereka amati",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh teks eksplanasi dan mengidentifikasi struktur",
              "Membuat diagram alir (flowchart) proses terjadinya fenomena",
              "Diskusi tentang hubungan kausal dalam teks",
              "Menulis teks eksplanasi secara terbimbing",
            ],
            group: [
              "Setiap kelompok memilih fenomena berbeda",
              "Menyusun teks eksplanasi dengan diagram alir",
              "Presentasi disertai media visual",
            ],
            reflection: [
              "Diskusi tentang pentingnya memahami proses alamiah di sekitar",
              "Refleksi: fenomena apa yang ingin kalian jelaskan?",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis teks eksplanasi tentang proses terjadinya gempa bumi" },
            { type: "group", description: "Membuat poster infografis proses terjadinya fenomena alam" },
            { type: "pair", description: "Membandingkan eksplanasi dengan teks LHO" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang dimaksud dengan fenomena alam?", purpose: "Mengetahui pemahaman tentang fenomena" },
              { question: "Mengapa hujan bisa turun?", purpose: "Mengidentifikasi pengetahuan awal tentang proses alam" },
            ],
            formative: [
              { method: "Cek diagram alir", criteria: ["Urutan logis", "Hubungan kausal benar"] },
              { method: "Cek tulisan", criteria: ["Struktur lengkap", "Konjungsi tepat", "Istilah teknis digunakan"] },
            ],
            summative: [
              { type: "Teks Eksplanasi", description: "Menulis teks eksplanasi 3-4 paragraf dengan struktur lengkap" },
              { type: "Analisis", description: "Menganalisis teks eksplanasi dari segi struktur dan kebahasaan" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kejelasan Proses",
                criteria: [
                  { level: "Sangat Baik", description: "Proses dijelaskan secara urut, logis, dan mudah dipahami" },
                  { level: "Baik", description: "Proses jelas tetapi ada satu bagian yang kurang detail" },
                  { level: "Cukup", description: "Proses kurang urut atau ada lompatan" },
                  { level: "Kurang", description: "Proses tidak jelas dan membingungkan" },
                ],
              },
              {
                name: "Penggunaan Konjungsi Kausal",
                criteria: [
                  { level: "Sangat Baik", description: "Konjungsi kausal variatif dan tepat" },
                  { level: "Baik", description: "Konjungsi kausal digunakan dengan tepat" },
                  { level: "Cukup", description: "Konjungsi kausal terbatas" },
                  { level: "Kurang", description: "Tidak menggunakan konjungsi kausal" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan teks eksplanasi dengan kalimat yang lebih sederhana",
              "Bantuan membuat diagram alir secara visual",
              "Daftar konjungsi kausal dan kronologis",
            ],
            challenge: [
              "Menulis eksplanasi dengan data kuantitatif (angka, statistik)",
              "Menjelaskan fenomena sosial (inflasi, kemacetan) secara eksplanatif",
              "Membandingkan dua teori tentang fenomena yang sama",
            ],
          },
          remedial: [
            "Latihan membuat kalimat dengan konjungsi kausal",
            "Mengurutkan potongan teks eksplanasi yang acak",
            "Praktik mengidentifikasi hubungan sebab-akibat",
          ],
          enrichment: [
            "Membaca artikel sains populer tentang fenomena alam",
            "Membuat video edukasi proses terjadinya fenomena",
          ],
          teacherNotes: [
            "Pilih fenomena yang dekat dengan lingkungan siswa",
            "Gunakan media visual (video, animasi) untuk memudahkan pemahaman",
            "Hubungkan dengan mata pelajaran IPA untuk pengalaman interdisipliner",
          ],
          tags: ["eksplanasi", "fenomena", "proses", "kausal"],
          isReady: true,
        },
        {
          id: "viii-puisi-baru",
          slug: "puisi-baru",
          grade: "VIII",
          phase: "D",
          semester: 1,
          chapterNumber: 4,
          title: "Bab 4: Puisi Baru",
          shortTitle: "Puisi Baru",
          kd: "3.4/4.4",
          emoji: "📝",
          description:
            "Mengenal, menganalisis, dan menulis puisi baru dengan memperhatikan unsur fisik dan batin puisi.",
          learningGoals: [
            "Memahami pengertian dan jenis puisi baru",
            "Menganalisis unsur fisik (diksi, imaji, rima) dan batin (tema, rasa, nada, amanat)",
            "Menulis puisi dengan pilihan kata yang tepat dan bermakna",
          ],
          keyConcepts: {
            definition:
              "Puisi baru adalah jenis puisi yang tidak terikat oleh aturan rima, jumlah baris, dan suku kata sebagaimana puisi lama (pantun, syair). Puisi baru lebih bebas dalam bentuk tetapi tetap memiliki irama dan makna yang mendalam.",
            characteristics: [
              "Tidak terikat jumlah baris, rima, dan suku kata",
              "Menggunakan diksi yang indah dan bermakna konotatif",
              "Mengandung majas dan imaji",
              "Memiliki irama (ritme) yang teratur",
              "Mengungkapkan perasaan, pikiran, atau pengalaman penyair",
            ],
            structure: [
              { name: "Unsur Fisik", description: "Diksi, imaji, majas, rima, ritme, tipografi" },
              { name: "Unsur Batin", description: "Tema, rasa (feeling), nada (tone), amanat (pesan)" },
            ],
            languageFeatures: [
              "Pilihan kata konotatif dan bermakna kias",
              "Majas personifikasi, metafora, simile, hiperbola",
              "Imaji penglihatan, pendengaran, perabaan",
              "Rima (persamaan bunyi) untuk memperindah",
            ],
            examples: [
              {
                label: "Puisi: 'Aku Ingin' karya Sapardi Djoko Damono",
                content:
                  "Aku ingin mencintaimu dengan sederhana\nDengan kata yang tak sempat diucapkan\nKayu kepada api yang menjadikannya abu\n\nAku ingin mencintaimu dengan sederhana\nDengan isyarat yang tak sempat disampaikan\nAwan kepada hujan yang menjadikannya tiada",
                analysis:
                  "Majas personifikasi (kayu kepada api, awan kepada hujan). Imaji penglihatan dan perasaan. Tema: cinta yang sederhana. Diksi: sederhana, abu, tiada.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Diksi dan makna konotatif",
              "Majas perbandingan (personifikasi, metafora, simile)",
              "Imaji dalam puisi",
            ],
            notes:
              "Puisi yang baik tidak sekadar menggunakan kata indah, tetapi memiliki makna yang dalam.",
          },
          activities: {
            opening: [
              "Guru membacakan puisi dengan penghayatan",
              "Siswa mengungkapkan perasaan setelah mendengar puisi",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca dan mengapresiasi puisi dari penyair terkenal",
              "Diskusi unsur fisik dan batin puisi",
              "Analisis majas dan imaji dalam puisi",
              "Menulis puisi dengan bimbingan",
            ],
            group: [
              "Membaca puisi secara bergiliran dalam kelompok",
              "Memberi tanggapan terhadap puisi teman",
              " membuat antologi puisi kelas",
            ],
            reflection: [
              "Diskusi tentang pengalaman menulis puisi",
              "Membacakan puisi karya sendiri di depan kelas",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis 2 puisi dengan tema berbeda (minimal 12 baris)" },
            { type: "group", description: "Membuat antologi puisi kelas yang dibukukan" },
            { type: "pair", description: "Menganalisis puisi dari segi unsur fisik dan batin" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa perbedaan puisi dengan prosa?", purpose: "Mengetahui pemahaman awal tentang puisi" },
              { question: "Siapa penyair Indonesia yang kamu kenal?", purpose: "Mengidentifikasi pengetahuan tentang sastra" },
            ],
            formative: [
              { method: "Cek puisi", criteria: ["Menggunakan diksi yang tepat", "Ada majas", "Tema jelas"] },
              { method: "Diskusi analisis", criteria: ["Mampu mengidentifikasi unsur fisik dan batin"] },
            ],
            summative: [
              { type: "Kumpulan Puisi", description: "Membuat kumpulan 3 puisi dengan tema pilihan, dilengkapi analisis singkat" },
              { type: "Analisis Puisi", description: "Menganalisis puisi (unsur fisik dan batin) secara tertulis" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kreativitas dan Diksi",
                criteria: [
                  { level: "Sangat Baik", description: "Diksi orisinal, konotatif, dan menciptakan suasana yang kuat" },
                  { level: "Baik", description: "Diksi baik dan cukup variatif" },
                  { level: "Cukup", description: "Diksi umum dan kurang variasi" },
                  { level: "Kurang", description: "Diksi tidak menarik, cenderung seperti prosa" },
                ],
              },
              {
                name: "Penggunaan Majas",
                criteria: [
                  { level: "Sangat Baik", description: "Menggunakan minimal 2 jenis majas secara efektif" },
                  { level: "Baik", description: "Menggunakan 1 jenis majas dengan baik" },
                  { level: "Cukup", description: "Mencoba menggunakan majas tetapi kurang tepat" },
                  { level: "Kurang", description: "Tidak menggunakan majas" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan bank kata puitis untuk dipilih",
              "Memberikan contoh puisi dengan struktur sederhana",
              "Bimbingan menulis puisi dengan tema yang dekat dengan siswa",
            ],
            challenge: [
              "Menulis puisi dengan bentuk visual (konkret/tipografi)",
              "Menganalisis puisi dengan pendekatan stilistika",
              "Menulis puisi dalam dua bahasa (Indonesia-Inggris)",
            ],
          },
          remedial: [
            "Latihan menulis kalimat bermajas dari kalimat lugas",
            "Praktik mengubah prosa menjadi puisi",
            "Pendampingan memilih kata yang tepat untuk puisi",
          ],
          enrichment: [
            "Membaca kumpulan puisi penyair Indonesia (Chairil Anwar, Sapardi, Taufiq Ismail)",
            "Mengikuti lomba baca puisi",
          ],
          teacherNotes: [
            "Jangan terlalu kaku menilai puisi — apresiasi kreativitas",
            "Bacakan puisi dengan penghayatan sebagai contoh",
            "Fasilitasi siswa yang pemalu untuk membaca karyanya",
          ],
          tags: ["puisi", "majas", "diksi", "imaji"],
          isReady: true,
        },
      ],
    },
    {
      semester: 2,
      chapters: [
        {
          id: "viii-eksposisi",
          slug: "teks-eksposisi",
          grade: "VIII",
          phase: "D",
          semester: 2,
          chapterNumber: 5,
          title: "Bab 5: Teks Eksposisi",
          shortTitle: "Eksposisi",
          kd: "3.5/4.5",
          emoji: "📊",
          description:
            "Mengenal, menganalisis, dan menulis teks eksposisi untuk menyampaikan gagasan atau argumen yang didukung data dan fakta.",
          learningGoals: [
            "Memahami pengertian dan tujuan teks eksposisi",
            "Mengidentifikasi struktur teks eksposisi (tesis, argumen, penegasan ulang)",
            "Menulis teks eksposisi dengan argumen yang logis dan data pendukung",
          ],
          keyConcepts: {
            definition:
              "Teks eksposisi adalah teks yang bertujuan untuk menjelaskan atau memaparkan suatu gagasan, pendapat, atau informasi dilengkapi argumen dan data pendukung.",
            characteristics: [
              "Bertujuan menjelaskan atau meyakinkan pembaca",
              "Berisi argumen yang didukung fakta dan data",
              "Bersifat informatif dan persuasif",
              "Struktur terdiri dari tesis, argumen, penegasan ulang",
              "Menggunakan bahasa yang jelas dan logis",
            ],
            structure: [
              { name: "Tesis (Pernyataan Pendapat)", description: "Pembuka berisi pendapat atau gagasan utama penulis" },
              { name: "Argumen", description: "Alasan, data, dan fakta yang mendukung tesis" },
              { name: "Penegasan Ulang (Kesimpulan)", description: "Penguatan kembali pendapat yang telah diargumentasikan" },
            ],
            languageFeatures: [
              "Kalimat deklaratif (pernyataan)",
              "Konjungsi kausal (karena, oleh karena itu, sebab)",
              "Konjungsi argumentatif (dengan demikian, berdasarkan data)",
              "Istilah teknis sesuai topik",
              "Data dan fakta sebagai penguat argumen",
            ],
            examples: [
              {
                label: "Contoh Teks Eksposisi",
                content:
                  "Membaca buku memiliki banyak manfaat bagi perkembangan otak dan karakter seseorang. Berdasarkan penelitian, membaca selama 30 menit per hari dapat meningkatkan kemampuan analitis dan empati. Selain itu, membaca juga mengurangi stres hingga 68 persen. Oleh karena itu, kebiasaan membaca perlu ditanamkan sejak dini.",
                analysis:
                  "Tesis: membaca buku bermanfaat. Argumen: data penelitian (30 menit/hari, 68% stres). Penegasan: kebiasaan membaca perlu ditanamkan.",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Penggunaan data dan fakta untuk mendukung argumen",
              "Konjungsi argumentatif dan kausal",
              "Kalimat deklaratif yang tegas",
            ],
            notes:
              "Bedakan eksposisi dengan persuasi — eksposisi lebih pada informasi, persuasi pada ajakan.",
          },
          activities: {
            opening: [
              "Guru mengajukan isu kontroversial dan meminta pendapat siswa",
              "Tanya jawab tentang perbedaan fakta dan opini",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh teks eksposisi dan mengidentifikasi struktur",
              "Diskusi tentang kualitas argumen dan data pendukung",
              "Latihan menulis tesis yang kuat",
              "Menyusun argumen dengan data pendukung",
            ],
            group: [
              "Debat mini dengan format eksposisi",
              "Menyusun teks eksposisi kelompok",
              "Presentasi dan saling mengevaluasi argumen",
            ],
            reflection: [
              "Diskusi tentang pentingnya data dalam menyampaikan pendapat",
              "Refleksi: bagaimana cara membedakan argumen kuat dan lemah",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis teks eksposisi tentang pentingnya pendidikan karakter" },
            { type: "group", description: "Menyusun teks eksposisi untuk debat kelas" },
            { type: "pair", description: "Menganalisis kekuatan argumen dalam teks eksposisi media massa" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa perbedaan fakta dan opini?", purpose: "Mengetahui pemahaman dasar" },
              { question: "Pernahkah kamu berdebat dengan argumen?", purpose: "Mengidentifikasi pengalaman argumentasi" },
            ],
            formative: [
              { method: "Cek tesis", criteria: ["Jelas", "Dapat diargumentasikan", "Spesifik"] },
              { method: "Cek argumen", criteria: ["Logis", "Didukung data/fakta", "Relevan"] },
            ],
            summative: [
              { type: "Teks Eksposisi", description: "Menulis teks eksposisi 4-5 paragraf dengan struktur lengkap" },
              { type: "Analisis", description: "Menganalisis penggunaan bahasa dan kekuatan argumen dalam teks eksposisi" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kualitas Argumen",
                criteria: [
                  { level: "Sangat Baik", description: "Argumen logis, didukung data faktual, dan relevan" },
                  { level: "Baik", description: "Argumen logis dengan data pendukung yang cukup" },
                  { level: "Cukup", description: "Argumen kurang didukung data" },
                  { level: "Kurang", description: "Argumen tidak logis dan tanpa data" },
                ],
              },
              {
                name: "Struktur Eksposisi",
                criteria: [
                  { level: "Sangat Baik", description: "Tesis, argumen, penegasan ulang lengkap dan sistematis" },
                  { level: "Baik", description: "Struktur lengkap tetapi kurang sistematis" },
                  { level: "Cukup", description: "Satu bagian kurang lengkap" },
                  { level: "Kurang", description: "Struktur tidak sesuai eksposisi" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan data/fakta yang bisa digunakan sebagai argumen",
              "Kerangka tesis dengan formula sederhana",
              "Bantuan merumuskan argumen dari data yang disediakan",
            ],
            challenge: [
              "Menulis eksposisi dengan menggunakan data statistik asli",
              "Membandingkan dua teks eksposisi dengan sudut pandang berbeda",
              "Menulis eksposisi dalam bentuk artikel opini untuk media massa",
            ],
          },
          remedial: [
            "Latihan membedakan fakta dan opini melalui contoh konkret",
            "Praktik merumuskan argumen dari data sederhana",
            "Bimbingan menyusun tesis yang jelas",
          ],
          enrichment: [
            "Membaca artikel opini di koran/majalah",
            "Membuat blog opini tentang isu pendidikan",
          ],
          teacherNotes: [
            "Pilih isu yang relevan dan tidak sensitif",
            "Tekankan pentingnya argumen berbasis data, bukan emosi",
            "Ajak siswa berpikir kritis terhadap informasi yang diterima",
          ],
          tags: ["eksposisi", "argumen", "fakta", "opini"],
          isReady: true,
        },
        {
          id: "viii-ulasan",
          slug: "teks-ulasan-resensi",
          grade: "VIII",
          phase: "D",
          semester: 2,
          chapterNumber: 6,
          title: "Bab 6: Teks Ulasan / Resensi",
          shortTitle: "Ulasan",
          kd: "3.6/4.6",
          emoji: "⭐",
          description:
            "Mengenal, menganalisis, dan menulis ulasan atau resensi terhadap karya sastra, film, atau produk budaya lainnya.",
          learningGoals: [
            "Memahami pengertian dan fungsi teks ulasan",
            "Menganalisis struktur dan kebahasaan teks ulasan",
            "Menulis ulasan atau resensi secara objektif dan kritis",
          ],
          keyConcepts: {
            definition:
              "Teks ulasan atau resensi adalah teks yang mengulas, menilai, dan memberikan tanggapan terhadap suatu karya (buku, film, musik, dll.) secara kritis dan objektif.",
            characteristics: [
              "Berisi penilaian terhadap suatu karya",
              "Bersifat objektif dan kritis",
              "Terdapat sinopsis singkat karya yang diulas",
              "Menyertakan kelebihan dan kekurangan",
              "Memberikan rekomendasi kepada pembaca",
            ],
            structure: [
              { name: "Identitas Karya", description: "Judul, pengarang, tahun terbit, penerbit, tebal halaman" },
              { name: "Orientasi", description: "Pengantar tentang karya dan kesan umum" },
              { name: "Sinopsis", description: "Ringkasan cerita atau isi karya" },
              { name: "Analisis", description: "Pembahasan sistematis tentang unsur-unsur karya" },
              { name: "Evaluasi", description: "Kelebihan, kekurangan, dan penilaian akhir" },
            ],
            languageFeatures: [
              "Menggunakan istilah sastra (tokoh, alur, latar, tema)",
              "Kalimat rekomendasi (direkomendasikan, sayang untuk dilewatkan)",
              "Konjungsi perbandingan (namun, sedangkan, meskipun)",
              "Kalimat evaluatif (menarik, kurang kuat, sangat mengesankan)",
            ],
            examples: [
              {
                label: "Contoh Ulasan Novel",
                content:
                  "Novel 'Laskar Pelangi' karya Andrea Hirata menceritakan perjuangan anak-anak Belitung dalam mengejar pendidikan. Kekuatan novel ini terletak pada bahasa yang indah dan kisah inspiratif. Namun, alurnya terkadang terasa lambat di beberapa bagian. Secara keseluruhan, novel ini sangat direkomendasikan untuk remaja karena memberikan motivasi dan semangat belajar.",
                analysis:
                  "Identitas (Laskar Pelangi, Andrea Hirata). Sinopsis (perjuangan anak-anak Belitung). Analisis (bahasa indah, alur lambat). Evaluasi (rekomendasi untuk remaja).",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Istilah sastra dan penilaian estetika",
              "Kalimat evaluatif dan rekomendasi",
              "Konjungsi perbandingan dan pertentangan",
            ],
            notes:
              "Ulasan yang baik bersifat objektif — menyebutkan kelebihan dan kekurangan secara berimbang.",
          },
          activities: {
            opening: [
              "Guru bertanya tentang film/buku favorit dan alasan menyukainya",
              "Diskusi tentang kriteria karya yang baik",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Membaca contoh resensi dari media massa",
              "Diskusi struktur dan kebahasaan teks ulasan",
              "Latihan mengidentifikasi kelebihan dan kekurangan karya",
              "Menulis ulasan film pendek atau buku yang sudah dibaca",
            ],
            group: [
              "Ulasan buku secara berkelompok",
              "Presentasi hasil ulasan",
              "Diskusi panel: setuju atau tidak dengan ulasan teman",
            ],
            reflection: [
              "Diskusi tentang perbedaan selera dalam mengapresiasi karya",
              "Refleksi: apakah ulasan dapat memengaruhi minat baca?",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Menulis resensi buku yang sudah dibaca (struktur lengkap)" },
            { type: "group", description: "Membuat blog ulasan film/karya yang dikelola kelas" },
            { type: "pair", description: "Membandingkan dua resensi tentang karya yang sama" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa yang membuat suatu karya bagus menurutmu?", purpose: "Mengidentifikasi kriteria estetika siswa" },
              { question: "Pernahkah kamu membaca ulasan buku/film?", purpose: "Mengetahui paparan terhadap resensi" },
            ],
            formative: [
              { method: "Cek sinopsis", criteria: ["Singkat", "Mencakup inti cerita", "Tidak spoiler berlebihan"] },
              { method: "Cek evaluasi", criteria: ["Objektif", "Disertai alasan", "Berimbang"] },
            ],
            summative: [
              { type: "Resensi", description: "Menulis resensi buku/film dengan struktur lengkap dan penilaian objektif" },
              { type: "Analisis", description: "Menganalisis teks ulasan dari media massa dari segi struktur dan bahasa" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kualitas Analisis",
                criteria: [
                  { level: "Sangat Baik", description: "Analisis mendalam, sistematis, dan menunjukkan pemahaman karya" },
                  { level: "Baik", description: "Analisis cukup baik tetapi kurang mendalam" },
                  { level: "Cukup", description: "Analisis dangkal dan cenderung deskriptif" },
                  { level: "Kurang", description: "Hanya sinopsis tanpa analisis" },
                ],
              },
              {
                name: "Objektivitas",
                criteria: [
                  { level: "Sangat Baik", description: "Penilaian berimbang, ada kelebihan dan kekurangan, disertai alasan" },
                  { level: "Baik", description: "Cukup berimbang tetapi kurang alasan" },
                  { level: "Cukup", description: "Cenderung subjektif atau hanya satu sisi" },
                  { level: "Kurang", description: "Hanya pujian atau hanya kritik tanpa alasan" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan daftar pertanyaan panduan analisis",
              "Memberikan contoh resensi dengan struktur sederhana",
              "Memilih karya yang pendek dan mudah dipahami",
            ],
            challenge: [
              "Menulis perbandingan resensi dari dua karya sejenis",
              "Mengulas karya seni rupa atau pertunjukan",
              "Menulis kritik sastra dengan pendekatan teori",
            ],
          },
          remedial: [
            "Latihan membedakan deskripsi dan evaluasi",
            "Praktik menulis satu paragraf analisis dengan bimbingan",
            "Mengulas karya yang sangat sederhana terlebih dahulu",
          ],
          enrichment: [
            "Membaca rubrik resensi di koran/majalah",
            "Menghadiri bedah buku dan menulis laporan",
          ],
          teacherNotes: [
            "Dorong siswa untuk membaca buku sebelum mengulas",
            "Ajarkan etika dalam memberikan kritik (kritis tapi santun)",
            "Ulasan bisa dikembangkan menjadi blog kelas",
          ],
          tags: ["ulasan", "resensi", "kritik", "apresiasi"],
          isReady: true,
        },
        {
          id: "viii-pariwara",
          slug: "iklan-slogan-poster",
          grade: "VIII",
          phase: "D",
          semester: 2,
          chapterNumber: 7,
          title: "Bab 7: Iklan, Slogan, dan Poster",
          shortTitle: "Pariwara",
          kd: "3.7/4.7",
          emoji: "📢",
          description:
            "Mengenal, menganalisis, dan membuat iklan, slogan, serta poster dengan bahasa persuasif dan desain yang menarik.",
          learningGoals: [
            "Memahami pengertian dan fungsi iklan, slogan, dan poster",
            "Menganalisis bahasa persuasif dalam iklan, slogan, dan poster",
            "Membuat iklan, slogan, atau poster dengan pesan yang efektif",
          ],
          keyConcepts: {
            definition:
              "Iklan adalah pemberitahuan yang bertujuan membujuk khalayak. Slogan adalah kalimat pendek yang mudah diingat. Poster adalah plakat berisi gambar dan tulisan yang dipajang di tempat umum.",
            characteristics: [
              "Iklan: informatif, persuasif, menarik perhatian",
              "Slogan: singkat, mudah diingat, berima atau ritmis",
              "Poster: perpaduan visual dan teks, komunikatif",
              "Ketiganya bertujuan memengaruhi khalayak",
              "Menggunakan bahasa yang mudah dipahami",
            ],
            structure: [
              { name: "Iklan", description: "Judul/headline, subjudul, isi/bodi, penutup/call to action" },
              { name: "Slogan", description: "Kalimat pendek 3-7 kata, mudah diingat" },
              { name: "Poster", description: "Headline, ilustrasi/gambar, pesan, call to action" },
            ],
            languageFeatures: [
              "Kalimat persuasif (Mari, Ayo, Jangan lupa)",
              "Kata imperatif dan sugestif",
              "Kata konkret dan mudah dipahami",
              "Majas retorik (pertanyaan yang tidak perlu jawaban)",
              "Bahasa yang menarik dan emosional",
            ],
            examples: [
              {
                label: "Contoh Iklan Layanan Masyarakat",
                content:
                  "Headline: 'Buanglah Sampah pada Tempatnya'\nIlustrasi: Taman bersih dengan tempat sampah berwarna\nPesan: 'Jagalah kebersihan, mulai dari diri sendiri'\nCall to Action: 'Ayo, buang sampah pada tempatnya!'",
                analysis:
                  "Menggunakan kalimat imperatif (buanglah, jagalah). Ada ajakan (Ayo). Pesan singkat dan mudah diingat.",
              },
              {
                label: "Contoh Slogan",
                content: "'Buku adalah jendela dunia'\n'Pendidikan untuk semua'\n'Senyum, salam, sapa'",
              },
            ],
          },
          languageFocus: {
            aspects: [
              "Bahasa persuasif dan imperatif",
              "Kalimat pendek yang mudah diingat",
              "Penggunaan majas retorik dan repetisi",
            ],
            notes:
              "Iklan yang efektif tidak hanya informatif tetapi juga menyentuh emosi.",
          },
          activities: {
            opening: [
              "Guru menunjukkan beberapa iklan/slogan/poster dan meminta siswa menebak tujuannya",
              "Diskusi tentang iklan yang paling diingat siswa",
              "Menyampaikan tujuan pembelajaran",
            ],
            core: [
              "Menganalisis bahasa persuasif dalam iklan",
              "Mengidentifikasi struktur iklan/slogan/poster",
              "Latihan membuat slogan untuk kampanye sekolah",
              "Merancang poster dengan pesan sosial",
            ],
            group: [
              "Membuat iklan layanan masyarakat untuk isu tertentu",
              "Pameran poster di kelas",
              "Voting poster terbaik",
            ],
            reflection: [
              "Diskusi tentang pengaruh iklan terhadap perilaku konsumen",
              "Refleksi: bagaimana membedakan iklan informatif dan manipulatif",
            ],
          },
          studentTasks: [
            { type: "individual", description: "Membuat slogan dan poster untuk kampanye lingkungan sekolah" },
            { type: "group", description: "Membuat iklan layanan masyarakat (video/poster) tentang isu sosial" },
            { type: "pair", description: "Menganalisis strategi persuasi dalam 3 iklan dari media" },
          ],
          assessment: {
            diagnostic: [
              { question: "Apa iklan yang paling kalian ingat? Mengapa?", purpose: "Mengidentifikasi daya ingat terhadap iklan" },
              { question: "Apa yang membuat suatu poster menarik?", purpose: "Mengetahui kriteria estetika awal" },
            ],
            formative: [
              { method: "Cek slogan", criteria: ["Singkat", "Mudah diingat", "Sesuai tema"] },
              { method: "Cek poster", criteria: ["Pesan jelas", "Visual menarik", "Bahasa persuasif"] },
            ],
            summative: [
              { type: "Portofolio", description: "Membuat portofolio berisi 1 slogan, 1 poster, dan 1 naskah iklan" },
              { type: "Analisis", description: "Menganalisis bahasa persuasif dalam iklan media cetak/digital" },
            ],
          },
          rubric: {
            aspects: [
              {
                name: "Kekuatan Pesan",
                criteria: [
                  { level: "Sangat Baik", description: "Pesan jelas, persuasif, dan mudah diingat" },
                  { level: "Baik", description: "Pesan jelas tetapi kurang persuasif" },
                  { level: "Cukup", description: "Pesan kurang jelas atau terlalu panjang" },
                  { level: "Kurang", description: "Pesan tidak jelas dan tidak meyakinkan" },
                ],
              },
              {
                name: "Kreativitas",
                criteria: [
                  { level: "Sangat Baik", description: "Ide orisinal, desain menarik, bahasa unik dan berkesan" },
                  { level: "Baik", description: "Cukup kreatif tetapi masih umum" },
                  { level: "Cukup", description: "Kurang kreatif, mirip contoh yang ada" },
                  { level: "Kurang", description: "Tidak ada kreativitas" },
                ],
              },
            ],
          },
          differentiation: {
            support: [
              "Menyediakan kumpulan contoh slogan untuk inspirasi",
              "Template poster digital siap edit",
              "Bimbingan dalam merumuskan pesan inti",
            ],
            challenge: [
              "Membuat iklan video 30 detik",
              "Menganalisis strategi pemasaran di media sosial",
              "Merancang kampanye iklan multi-platform",
            ],
          },
          remedial: [
            "Latihan membuat kalimat persuasif sederhana",
            "Mengidentifikasi unsur iklan dari contoh konkret",
            "Praktik menggabungkan gambar dan teks sederhana",
          ],
          enrichment: [
            "Studi kasus iklan viral di media sosial",
            "Mengunjungi biro iklan atau agensi kreatif",
          ],
          teacherNotes: [
            "Gunakan iklan yang etis dan mendidik sebagai contoh",
            "Tekankan tanggung jawab dalam membuat konten publik",
            "Ajak siswa kritis terhadap iklan yang menyesatkan",
          ],
          tags: ["iklan", "slogan", "poster", "persuasi"],
          isReady: true,
        },
      ],
    },
  ],
}
