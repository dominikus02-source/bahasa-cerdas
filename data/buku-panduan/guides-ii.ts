import type { GradeData } from "./types"

export const kelasII: GradeData = {
  grade: "II",
  label: "Kelas II",
  phase: "A",
  semesters: [
    {
      semester: 1,
      chapters: [
        {
          id: "ii-baca-lancar",
          slug: "membaca-lancar-kalimat-sederhana",
          grade: "II",
          phase: "A",
          semester: 1,
          chapterNumber: 1,
          title: "Bab 1: Membaca Lancar Kalimat Sederhana",
          shortTitle: "Baca Lancar",
          kd: "3.1/4.1",
          emoji: "📖",
          description: "Membaca kalimat sederhana dengan lafal, intonasi, dan jeda yang tepat. Siswa berlatih membaca nyaring dengan lancar tanpa mengeja huruf satu per satu.",
          overview: "Setelah kelas satu mampu membaca suku kata dan kata, kini saatnya siswa membaca kalimat sederhana secara lancar. Bab ini berfokus pada kelancaran membaca. Siswa berlatih membaca nyaring kalimat pendek dengan lafal yang jelas, intonasi yang sesuai, dan jeda di tanda baca. Guru memberikan model membaca yang baik, lalu siswa menirukan secara klasikal, kelompok, dan individual. Latihan harian 10-15 menit sangat dianjurkan untuk membangun kebiasaan membaca. Pada akhir bab, siswa diharapkan mampu membaca 5-7 kalimat sederhana secara lancar tanpa mengeja.",
          learningGoals: [
            "Membaca kalimat sederhana (5-7 kata) tanpa mengeja huruf satu per satu",
            "Melafalkan kata dengan bunyi yang jelas dan benar",
            "Menggunakan intonasi yang sesuai dengan jenis kalimat (berita, tanya, seru)",
            "Berhenti sejenak di tanda baca koma dan titik",
            "Membaca nyaring dengan suara yang terdengar jelas",
            "Menunjukkan pemahaman isi kalimat yang dibaca"
          ],
          keywords: ["membaca lancar","membaca nyaring","lafal","intonasi","jeda","tanda baca","kalimat sederhana","kecepatan membaca","pemahaman"],
          suggestedDuration: "14 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Kalimat sederhana adalah satuan bahasa yang mengungkapkan pikiran secara utuh, terdiri dari subjek dan predikat, serta mengandung satu gagasan pokok. Untuk siswa kelas II, kalimat sederhana memiliki panjang 3-7 kata dengan pola SP (subjek-predikat) atau SPO (subjek-predikat-objek). Membaca lancar berarti mampu membaca kalimat tanpa tersendat-sendat, dengan lafal yang benar, intonasi yang wajar, dan jeda yang tepat.",
              characteristics: [
                "Kalimat sederhana memiliki satu subjek dan satu predikat",
                "Panjang kalimat 3-7 kata, sesuai kemampuan anak usia 7-8 tahun",
                "Mengandung kosakata yang sudah dikenal anak",
                "Tidak mengandung anak kalimat atau klausa kompleks",
                "Pola kalimat umumnya SP, SPO, atau SPK"
              ],
              socialFunction: "Kemampuan membaca lancar memungkinkan anak mengikuti pelajaran dengan lebih baik, membaca instruksi, memahami bacaan, dan menikmati buku cerita. Di kehidupan sehari-hari, anak dapat membaca nama jalan, label makanan, pengumuman, dan pesan singkat.",
              lifeBenefits: "Anak yang lancar membaca akan lebih percaya diri di sekolah. Mereka dapat mengerjakan soal sendiri tanpa perlu dibacakan. Membaca lancar juga menjadi pintu masuk untuk menikmati berbagai buku cerita, yang memperkaya kosakata dan pengetahuan umum.",
              distinction: "Membaca lancar berbeda dengan membaca terbata-bata atau mengeja. Pada kelas I, targetnya adalah mampu menggabungkan huruf menjadi suku kata dan kata. Pada kelas II, targetnya adalah membaca kalimat secara utuh dalam satu rangkaian dengan tempo yang wajar."
            },
            contentComposition: {
              infoPoints: [
                "Kalimat sederhana terdiri dari subjek dan predikat",
                "Subjek adalah pelaku dalam kalimat; predikat adalah kegiatan atau keadaan",
                "Intonasi naik saat membaca kalimat tanya, turun saat kalimat berita",
                "Tanda koma (,) menandai jeda sebentar; tanda titik (.) menandai jeda panjang",
                "Kata depan seperti 'di', 'ke', 'dari' ditulis terpisah dari kata yang mengikutinya"
              ],
              buildingElements: [
                "Subjek kalimat: kata atau frasa yang menerangkan pelaku",
                "Predikat kalimat: kata yang menerangkan kegiatan atau keadaan subjek",
                "Objek atau keterangan: pelengkap informasi dalam kalimat",
                "Tanda baca: penanda jeda dan intonasi",
                "Kata penghubung: 'dan', 'lalu', 'kemudian', 'sehingga'"
              ],
              mainIdeas: [
                "Setiap kalimat utuh memiliki subjek dan predikat",
                "Intonasi membaca berbeda untuk kalimat berita, tanya, dan seru",
                "Jeda diperlukan di tanda baca agar bacaan mudah dipahami",
                "Membaca lancar dicapai dengan latihan rutin setiap hari"
              ],
              partRelationships: "Subjek dan predikat adalah dua bagian utama kalimat. Subjek memberitahu siapa atau apa yang dibicarakan. Predikat memberitahu apa yang dilakukan atau dialami subjek. Tanda baca membantu pembaca mengetahui kapan harus berhenti, kapan intonasi naik, dan kapan intonasi turun.",
              simpleExample: "Ibu memasak nasi goreng. (S: Ibu, P: memasak, O: nasi goreng). Siapa yang memasak? Ibu. (kalimat tanya, intonasi naik di akhir)."
            },
            textVariants: {
              types: ["kalimat berita", "kalimat tanya", "kalimat seru", "kalimat perintah sederhana"],
              variantDescriptions: [
                { name: "Kalimat Berita", description: "Kalimat yang menyampaikan informasi atau fakta. Intonasi datar dan sedikit turun di akhir.", example: "Adik bermain bola di halaman. Matahari bersinar terang hari ini." },
                { name: "Kalimat Tanya", description: "Kalimat yang menanyakan sesuatu. Menggunakan kata tanya seperti 'apa', 'siapa', 'di mana', 'kapan'. Intonasi naik di akhir.", example: "Apa yang kamu bawa? Siapa namamu? Di mana rumahmu?" },
                { name: "Kalimat Seru", description: "Kalimat yang mengungkapkan perasaan kagum, marah, sedih, atau terkejut. Diakhiri tanda seru (!).", example: "Wah, bagus sekali gambarmu! Aduh, aku terjatuh!" },
                { name: "Kalimat Perintah Sederhana", description: "Kalimat yang menyuruh atau meminta seseorang melakukan sesuatu.", example: "Tolong ambilkan buku itu. Ayo kita belajar bersama." }
              ],
              groupingBasis: "Pengelompokan berdasarkan tujuan dan intonasi kalimat. Setiap jenis kalimat memiliki ciri intonasi dan tanda baca yang berbeda."
            },
            structurePattern: {
              generalPattern: [
                { name: "Mengenal Jenis Kalimat", description: "Guru memperkenalkan jenis-jenis kalimat: berita, tanya, seru, perintah. Siswa belajar membedakan melalui intonasi dan tanda baca." },
                { name: "Model Membaca", description: "Guru membaca kalimat dengan lafal, intonasi, dan jeda yang tepat. Siswa menyimak dan memperhatikan." },
                { name: "Membaca Bersama", description: "Guru dan siswa membaca kalimat secara bersama-sama. Guru menyesuaikan kecepatan dengan siswa." },
                { name: "Membaca Berkelompok", description: "Siswa membaca secara berkelompok. Setiap kelompok membaca satu jenis kalimat. Kelompok lain menyimak." },
                { name: "Membaca Individual", description: "Setiap siswa maju membaca satu atau dua kalimat secara nyaring. Guru memberikan umpan balik langsung." }
              ],
              variationNotes: "Kecepatan membaca setiap siswa berbeda. Fokus pada kemajuan individual, bukan perbandingan antar siswa. Gunakan teks yang sama untuk latihan berulang agar siswa semakin percaya diri.",
              readingGuide: "Saat membaca, perhatikan: 1) Lafalkan setiap kata dengan jelas, 2) Perhatikan tanda baca: berhenti sejenak di koma, berhenti lebih lama di titik, 3) Naikkan intonasi di kalimat tanya, 4) Gunakan ekspresi sesuai isi kalimat."
            },
            languageFeatures: {
              register: "Gunakan bahasa Indonesia baku yang sederhana. Hindari dialek daerah dan bahasa gaul.",
              features: [
                { name: "Subjek dan Predikat", description: "Ciri utama kalimat sederhana adalah memiliki subjek dan predikat. Subjek adalah pelaku, predikat adalah kegiatan.", example: "Ayah membaca koran. (S: Ayah, P: membaca koran)" },
                { name: "Intonasi Kalimat", description: "Nada suara saat membaca kalimat. Intonasi naik untuk tanya, turun untuk berita, dan ekspresif untuk seru.", example: "Kamu pergi ke mana? (intonasi naik). Hari ini hujan. (intonasi datar)." },
                { name: "Jeda", description: "Penghentian sesaat saat membaca. Jeda terjadi di tanda koma, titik, dan setelah subjek jika panjang.", example: "Setelah makan, kami berangkat ke sekolah. (jeda di koma)" }
              ],
              wordChoice: "Gunakan kosakata yang sudah dikenal dari kelas I dan kata-kata baru yang dekat dengan kehidupan sehari-hari.",
              sentencePattern: "Pola SP: Ibu tidur. Pola SPO: Ayah membaca koran. Pola SPK: Adik bermain di halaman.",
              conjunctions: "Gunakan kata hubung sederhana: 'dan', 'lalu', 'kemudian', 'tetapi', 'karena'.",
              style: "Gaya membaca ekspresif: gunakan suara berbeda untuk tokoh berbeda, tempo berubah sesuai isi.",
              spelling: "Ajarkan ejaan yang benar sesuai PUEBI untuk kelas awal: huruf kapital di awal kalimat dan nama orang, penulisan kata depan.",
              punctuation: "Tanda titik (.) untuk akhir kalimat berita dan perintah. Tanda tanya (?) untuk kalimat tanya. Tanda seru (!) untuk kalimat seru."
            },
            productionProcedure: {
              preProduction: "Siapkan teks bacaan pendek (5-7 kalimat) dengan ukuran huruf besar (minimal 16 pt). Siapkan kartu kalimat untuk permainan mencocokkan.",
              production: [
                "Guru membacakan kalimat dengan lafal dan intonasi yang tepat. Siswa menyimak sambil melihat teks. Ulangi 2-3 kali.",
                "Siswa membaca bersama-sama (klasikal) sambil guru menunjuk kata per kata. Lakukan 2-3 kali.",
                "Siswa membaca secara berkelompok. Setiap kelompok membaca satu paragraf pendek.",
                "Siswa membaca secara berpasangan. Satu membaca, satu menyimak dan memberi komentar.",
                "Siswa membaca secara individual di depan kelas atau kepada guru secara pribadi."
              ],
              revision: "Catat kata-kata yang masih sulit dibaca siswa. Ulangi latihan untuk kata-kata tersebut.",
              editing: "Setelah membaca, tanyakan isi bacaan untuk memastikan pemahaman.",
              publication: "Adakan 'Hari Membaca' di mana setiap siswa membacakan satu teks pendek di depan kelas.",
              bestPractices: [
                "Jadwalkan 10-15 menit membaca nyaring setiap hari.",
                "Gunakan teks yang sama selama 3-5 hari berturut-turut untuk membangun kepercayaan diri.",
                "Rekam suara siswa saat membaca di awal dan akhir bab untuk menunjukkan kemajuan."
              ]
            }
          },
          exampleText: {
            title: "Hari Pertama Sekolah",
            content: "Hari ini hari pertama sekolah. Rani bangun pagi-pagi. Ia memakai seragam baru. Tasnya sudah siap sejak malam. Ibu mengantar Rani ke sekolah. Di sekolah, Rani bertemu teman-teman. Mereka senang bertemu lagi. Bel berbunyi. Semua masuk kelas.",
            analysis: {
              structure: "Teks terdiri dari sembilan kalimat pendek yang menceritakan urutan kegiatan pagi hari. Struktur naratif sederhana: orientasi, rangkaian kegiatan, dan penutup.",
              content: "Isi cerita dekat dengan pengalaman siswa kelas II. Menggunakan tokoh anak perempuan bernama Rani. Kegiatan rutinitas yang dikenal semua anak.",
              language: "Kalimat sangat pendek (3-5 kata per kalimat). Kosakata sederhana dan sudah dikenal. Penggunaan kata depan 'di' yang benar.",
              strengths: "Teks sesuai pengalaman anak. Struktur jelas. Kalimat pendek dan mudah dibaca.",
              improvements: "Bisa ditambahkan dialog sederhana. Bisa ditambahkan gambar ilustrasi."
            }
          },
          learningActivities: {
            opening: [
              "Guru menyapa dan bertanya, 'Siapa yang suka membaca? Buku apa yang kamu baca di rumah?'",
              "Guru menunjukkan kartu kalimat dan bertanya, 'Apa yang kalian lihat? Ini namanya kalimat.'",
              "Guru membacakan satu kalimat dengan intonasi datar, lalu dengan intonasi ekspresif. Tanya, 'Mana yang lebih enak didengar?'",
              "Guru menyampaikan tujuan: kita akan belajar membaca kalimat dengan lancar dan berekspresi."
            ],
            core: [
              "Guru menulis kalimat di papan tulis: 'Ibu memasak nasi goreng.' Guru membaca dengan lafal jelas. Siswa menirukan 3 kali.",
              "Guru menambahkan variasi: 'Apa Ibu memasak? — Ibu memasak nasi goreng.' Bandingkan intonasi kalimat tanya dan kalimat jawab.",
              "Latihan dengan 5 kalimat berbeda. Guru membaca, siswa menirukan bersama, lalu bergantian.",
              "Permainan 'Sambung Kalimat': guru memulai dengan satu kalimat, siswa melanjutkan dengan kalimat lain yang berhubungan.",
              "Siswa membaca teks 'Hari Pertama Sekolah' secara bersama-sama, lalu berkelompok, lalu individual.",
              "Guru membimbing siswa yang masih kesulitan. Fokus pada kata yang panjang atau tidak dikenal."
            ],
            group: [
              "Setiap kelompok mendapat 3 kartu kalimat. Tugas: membaca kalimat dengan intonasi yang tepat.",
              "Lomba membaca nyaring: perwakilan kelompok maju membaca satu teks pendek.",
              "Bermain peran: satu siswa membaca kalimat tanya, yang lain menjawab dengan kalimat berita."
            ],
            individual: [
              "Setiap siswa membaca teks 'Hari Pertama Sekolah' secara mandiri. Guru mendampingi secara bergiliran.",
              "Siswa menulis satu kalimat tentang kegiatan pagi hari mereka, lalu membacakannya di depan kelas.",
              "Siswa berlatih membaca dengan jari sebagai penunjuk untuk menjaga konsentrasi."
            ],
            reflection: [
              "Guru bertanya, 'Apakah hari ini kalian bisa membaca lebih lancar daripada kemarin?'",
              "Siswa menyebutkan satu kata yang sulit dibaca dan bagaimana mereka mengatasinya.",
              "Tepuk tangan untuk semua siswa yang sudah berusaha membaca dengan baik."
            ]
          },
          worksheet: {
            title: "Lembar Kerja: Membaca Lancar",
            purpose: "Melatih siswa membaca kalimat sederhana dengan lafal, intonasi, dan jeda yang tepat.",
            instructions: [
              "Baca setiap kalimat dalam hati terlebih dahulu.",
              "Baca nyaring satu per satu dengan suara jelas.",
              "Perhatikan tanda baca saat membaca.",
              "Warnai bintang jika sudah lancar membaca semua kalimat."
            ],
            activities: [
              { name: "Berlatih Membaca", items: ["Ibu mencuci pakaian di sungai.", "Ayah pergi ke sawah setiap pagi.", "Siti membantu ibu memasak sayur.", "Mereka bermain bola di lapangan.", "Kakek bercerita tentang masa kecilnya."] },
              { name: "Membedakan Kalimat", items: ["Tentukan apakah kalimat ini berita, tanya, atau seru.", "Tulis B untuk berita, T untuk tanya, atau S untuk seru."] },
              { name: "Menjodohkan", items: ["Hubungkan kalimat tanya dengan jawaban yang tepat.", "Siapa yang membawa buku? — Budi yang membawa buku.", "Di mana buku itu? — Buku itu di atas meja."] }
            ],
            studentOutput: "Siswa menghasilkan lembar kerja berisi latihan membaca, identifikasi jenis kalimat, dan hasil menjodohkan kalimat tanya-jawab."
          },
          assessment: {
            diagnostic: [
              { question: "Coba baca kalimat ini: 'Adik bermain bola.'", purpose: "Mengetahui kemampuan membaca awal siswa." },
              { question: "Apa bedanya kalimat berita dan kalimat tanya?", purpose: "Mengetahui pemahaman awal tentang jenis kalimat." },
              { question: "Bacakan satu kalimat yang kamu hafal!", purpose: "Mengetahui kepercayaan diri siswa dalam membaca." }
            ],
            formative: [
              { method: "Pengamatan saat membaca nyaring", criteria: ["Lafal jelas dan benar", "Intonasi sesuai jenis kalimat", "Jeda tepat di tanda baca", "Suara terdengar jelas"] },
              { method: "Hasil lembar kerja", criteria: ["Mengisi dengan benar", "Tulisan rapi dan terbaca", "Selesai tepat waktu"] },
              { method: "Diskusi kelas", criteria: ["Berani menjawab pertanyaan", "Menggunakan bahasa yang santun", "Menyimak pendapat teman"] }
            ],
            summative: [
              { type: "Tes membaca", description: "Siswa membaca 5 kalimat dengan jenis berbeda (berita, tanya, seru, perintah). Guru menilai lafal, intonasi, dan jeda." },
              { type: "Tes pemahaman", description: "Setelah membaca teks pendek, siswa menjawab 3 pertanyaan tentang isi bacaan." },
              { type: "Observasi", description: "Guru mencatat perkembangan kelancaran membaca siswa setiap minggu." }
            ]
          },
          rubric: {
            aspects: [
              { name: "Kelancaran Membaca", criteria: [
                { level: 4, description: "Membaca 5 kalimat dengan sangat lancar tanpa tersendat, lafal jelas, intonasi tepat, jeda sesuai tanda baca." },
                { level: 3, description: "Membaca dengan lancar, 1-2 kali tersendat, lafal cukup jelas, intonasi hampir sesuai." },
                { level: 2, description: "Membaca masih terbata-bata di beberapa kata, perlu bantuan intonasi dan jeda." },
                { level: 1, description: "Membaca kata per kata, belum mampu menggabungkan menjadi kalimat lancar." }
              ]},
              { name: "Pemahaman Isi", criteria: [
                { level: 4, description: "Menjawab semua pertanyaan isi bacaan dengan benar dan lengkap." },
                { level: 3, description: "Menjawab sebagian besar pertanyaan dengan benar." },
                { level: 2, description: "Menjawab setengah pertanyaan dengan benar." },
                { level: 1, description: "Belum dapat menjawab pertanyaan tentang isi bacaan." }
              ]}
            ]
          },
          differentiation: {
            support: [
              "Gunakan teks dengan huruf besar (20-24 pt) dan spasi lebar.",
              "Berikan teks yang sama selama seminggu penuh untuk latihan berulang.",
              "Fokus pada 2-3 kalimat pendek per pertemuan.",
              "Gunakan kartu kata untuk latihan membaca kata per kata.",
              "Izinkan siswa membaca sambil menunjuk kata dengan jari."
            ],
            regular: [
              "Ikuti kegiatan sesuai rencana pembelajaran dengan variasi permainan.",
              "Berikan teks baru setiap 2-3 hari untuk tantangan.",
              "Dorong siswa membaca dengan ekspresi."
            ],
            challenge: [
              "Berikan teks lebih panjang (8-10 kalimat) dengan kosakata lebih beragam.",
              "Minta siswa membaca dengan kecepatan bertahap tanpa mengurangi kejelasan.",
              "Minta siswa menceritakan kembali isi bacaan dengan bahasa sendiri.",
              "Siswa menulis kalimat baru berdasarkan teks yang dibaca."
            ]
          },
          remedial: [
            "Ulangi pembelajaran dengan teks yang lebih pendek (3-4 kalimat).",
            "Bimbing individual 10 menit setiap hari: baca bersama, lalu siswa menirukan.",
            "Gunakan metode suku kata: bagi kata panjang menjadi suku kata, lalu gabungkan.",
            "Berikan latihan membaca di rumah dengan pendampingan orang tua.",
            "Gunakan teknologi: putarkan rekaman bacaan yang benar, siswa menirukan."
          ],
          enrichment: [
            "Bacakan teks yang lebih panjang dan minta siswa menceritakan kembali isinya.",
            "Siswa membuat buku kecil berisi 5 kalimat tentang topik favorit mereka.",
            "Adakan 'Panggung Membaca' setiap Jumat: siswa membacakan teks pilihan di depan kelas.",
            "Siswa mewawancarai teman dan menulis jawabannya dalam bentuk kalimat."
          ],
          teacherNotes: {
            teachingStrategies: [
              "Gunakan metode 'Saya membaca, kamu membaca': guru membaca satu kalimat, siswa menirukan.",
              "Lakukan asesmen membaca individual setiap minggu untuk memantau perkembangan.",
              "Berikan contoh membaca yang baik: lafal jelas, intonasi tepat, jeda sesuai.",
              "Gunakan teks yang bermakna dan dekat dengan kehidupan siswa."
            ],
            commonMisconceptions: [
              { misconception: "Membaca cepat berarti membaca lancar. Siswa terburu-buru sehingga lafal tidak jelas.", correction: "Tekankan bahwa membaca lancar berarti membaca dengan tepat dan jelas, bukan sekadar cepat." },
              { misconception: "Siswa membaca semua kalimat dengan intonasi datar seperti robot.", correction: "Ajarkan perbedaan intonasi untuk setiap jenis kalimat. Gunakan contoh yang kontras." },
              { misconception: "Siswa berhenti di setiap kata karena terbiasa mengeja.", correction: "Ajarkan membaca frasa, bukan kata per kata." }
            ],
            feedbackGuide: [
              "Berikan pujian spesifik: 'Lafal kata itu sudah benar sekali.'",
              "Koreksi dengan lembut: 'Coba baca sekali lagi. Perhatikan huruf \"e\"-nya.'",
              "Rekam perkembangan: buat grafik sederhana jumlah kata yang bisa dibaca lancar setiap minggu.",
              "Libatkan orang tua: berikan laporan perkembangan membaca setiap bulan."
            ],
            classroomManagement: [
              "Atur tempat duduk melingkar atau setengah lingkaran agar semua siswa melihat teks.",
              "Gunakan teks ukuran besar (font minimal 16 pt) atau proyeksikan di layar.",
              "Siapkan teks cadangan untuk siswa yang selesai lebih cepat.",
              "Alokasikan 5 menit terakhir untuk refleksi dan penguatan positif."
            ]
          },
          reflection: {
            studentQuestions: [
              "Apakah kamu bisa membaca kalimat hari ini lebih lancar dari kemarin?",
              "Kalimat apa yang paling sulit kamu baca? Mengapa?",
              "Apa yang kamu lakukan saat menemukan kata yang sulit?",
              "Bagian mana yang paling menyenangkan dalam belajar membaca hari ini?"
            ],
            teacherQuestions: [
              "Apakah semua siswa menunjukkan kemajuan dalam kelancaran membaca?",
              "Siswa mana yang masih membutuhkan bimbingan intensif?",
              "Apakah teks yang digunakan sudah sesuai dengan kemampuan siswa?",
              "Strategi apa yang paling efektif hari ini?",
              "Apa yang perlu diubah untuk pertemuan berikutnya?"
            ]
          },
          readingPractice: {
            title: "Latihan Membaca: Hari Pertama Sekolah",
            stimulusTitle: "Hari Pertama Sekolah",
            stimulusText: "Rani bangun pagi-pagi sekali. Hari ini hari pertama sekolah. Ia memakai seragam baru berwarna putih merah. Tasnya sudah siap sejak malam hari. Ibu mengantar Rani ke sekolah. Di depan sekolah, Rani bertemu Siti. Mereka bersahabat sejak kelas satu. Bel berbunyi tanda masuk kelas. Rani dan Siti berjalan bersama menuju kelas baru mereka.",
            questions: [
              { id: "r1-ii-bab1", type: "pilihan_ganda", questionText: "Siapa tokoh utama dalam cerita?", options: ["Siti", "Rani", "Ibu", "Ayah"], correctAnswer: "Rani", explanation: "Cerita dimulai dengan 'Rani bangun pagi-pagi sekali' dan semua kegiatan berpusat pada Rani.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab1", type: "pilihan_ganda", questionText: "Apa warna seragam Rani?", options: ["Biru putih", "Putih merah", "Putih abu-abu", "Merah putih"], correctAnswer: "Putih merah", explanation: "Teks mengatakan 'Ia memakai seragam baru berwarna putih merah.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab1", type: "pilihan_ganda", questionText: "Siapa yang mengantar Rani ke sekolah?", options: ["Ayah", "Kakek", "Ibu", "Siti"], correctAnswer: "Ibu", explanation: "Teks mengatakan 'Ibu mengantar Rani ke sekolah.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r4-ii-bab1", type: "jawaban_singkat", questionText: "Siapa teman Rani di sekolah?", correctAnswer: "Siti", explanation: "Teks mengatakan 'Rani bertemu Siti' dan 'Mereka bersahabat sejak kelas satu.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r5-ii-bab1", type: "pilihan_ganda", questionText: "Apa yang dilakukan Rani dan Siti setelah bel berbunyi?", options: ["Pulang ke rumah", "Bermain di lapangan", "Berjalan menuju kelas", "Makan di kantin"], correctAnswer: "Berjalan menuju kelas", explanation: "Teks mengatakan 'Rani dan Siti berjalan bersama menuju kelas baru mereka.'", skillTarget: "informasi tersurat", difficulty: "sedang" }
            ]
          },
          quickQuiz: {
            title: "Kuis Membaca Lancar",
            questions: [
              { id: "q1-ii-bab1", type: "pilihan_ganda", questionText: "Kalimat 'Siapa namamu?' termasuk kalimat…", options: ["berita", "tanya", "seru", "perintah"], correctAnswer: "tanya", explanation: "Kalimat tanya menggunakan kata tanya 'siapa' dan diakhiri tanda tanya.", skillTarget: "jenis kalimat", difficulty: "mudah" },
              { id: "q2-ii-bab1", type: "pilihan_ganda", questionText: "Tanda baca yang digunakan di akhir kalimat berita adalah…", options: ["tanya", "titik", "seru", "koma"], correctAnswer: "titik", explanation: "Kalimat berita diakhiri dengan tanda titik (.)", skillTarget: "tanda baca", difficulty: "mudah" },
              { id: "q3-ii-bab1", type: "jawaban_singkat", questionText: "Sebutkan satu jenis kalimat selain kalimat berita!", correctAnswer: "Kalimat tanya, kalimat seru, atau kalimat perintah", explanation: "Selain kalimat berita, ada kalimat tanya, kalimat seru, dan kalimat perintah.", skillTarget: "jenis kalimat", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 1 Semester 1: Membaca Lancar Kalimat Sederhana untuk Kelas II SD Fase A Kurikulum Merdeka. Fokus pembelajaran adalah kelancaran membaca — membaca kalimat sederhana 5-7 kata dengan lafal, intonasi, dan jeda yang tepat. Jenis kalimat yang diajarkan: berita, tanya, seru, dan perintah sederhana. Siswa kelas II sudah bisa membaca suku kata dan kata pendek, kini berlatih membaca kalimat utuh secara lancar tanpa mengeja. Gunakan teks pendek (5-9 kalimat) bertema kegiatan sehari-hari. Durasi 14 JP x 35 menit. Pendekatan: guru memberi model, membaca bersama, berkelompok, berpasangan, individual. Asesmen: tes membaca nyaring dan tes pemahaman isi. Sumber: CP Fase A Kurikulum Merdeka, buku SIBI Bahasa Indonesia Kelas II. Jika diminta membuat RPP, susun kegiatan terstruktur dengan latihan harian 10-15 menit. Untuk pembuatan soal, buat soal pilihan ganda dan jawaban singkat dengan tingkat kesulitan mudah hingga sedang. Untuk PPT, tampilkan contoh kalimat dengan tanda baca berwarna berbeda, dan sertakan audio contoh bacaan yang benar.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","Kurikulum Merdeka","membaca lancar","membaca nyaring","kalimat sederhana"],
          isReady: false
        },
        {
          id: "ii-cerita-keluarga",
          slug: "cerita-tentang-keluarga-dan-teman",
          grade: "II",
          phase: "A",
          semester: 1,
          chapterNumber: 2,
          title: "Bab 2: Cerita tentang Keluarga dan Teman",
          shortTitle: "Keluarga dan Teman",
          kd: "3.2/4.2",
          emoji: "👨‍👩‍👧‍👦",
          description: "Mengenal dan memahami cerita sederhana tentang keluarga dan teman. Siswa belajar mengidentifikasi tokoh, latar, dan urutan cerita serta menceritakan kembali isi cerita.",
          overview: "Setelah mampu membaca kalimat lancar, siswa diajak menikmati cerita pendek tentang keluarga dan teman — dua topik yang paling dekat dengan kehidupan mereka. Bab ini memperkenalkan unsur-unsur cerita: tokoh, latar, dan urutan peristiwa. Siswa belajar mengidentifikasi siapa tokoh dalam cerita, di mana cerita terjadi, dan apa yang terjadi pertama, kedua, dan seterusnya. Kegiatan dimulai dari menyimak cerita yang dibacakan guru, lalu membaca sendiri, dan akhirnya menceritakan kembali. Pendekatan bertahap ini membangun kepercayaan diri siswa dalam memahami bacaan.",
          learningGoals: [
            "Mengidentifikasi tokoh-tokoh dalam cerita tentang keluarga dan teman",
            "Menentukan latar tempat dan waktu dalam cerita sederhana",
            "Mengurutkan peristiwa dalam cerita sesuai alur",
            "Menceritakan kembali isi cerita dengan bahasa sendiri",
            "Menghubungkan isi cerita dengan pengalaman pribadi",
            "Menunjukkan sikap menyayangi keluarga dan teman melalui cerita"
          ],
          keywords: ["cerita","keluarga","teman","tokoh","latar","alur","urutan peristiwa","menceritakan kembali","fabel","cerita sehari-hari"],
          suggestedDuration: "12 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Cerita sederhana adalah teks naratif pendek yang menceritakan rangkaian peristiwa yang dialami tokoh. Untuk kelas II, cerita memiliki alur sangat sederhana (awal-masalah-selesaian), tokoh terbatas (1-3 tokoh), latar jelas, dan pesan moral eksplisit. Tema keluarga dan teman dipilih karena paling dekat dengan keseharian anak.",
              characteristics: [
                "Cerita memiliki tokoh yang jelas: ayah, ibu, kakak, adik, teman",
                "Alur cerita linear: dari awal ke akhir tanpa kilas balik",
                "Latar cerita konkret: rumah, sekolah, taman, pasar",
                "Konflik sederhana: kehilangan barang, bertengkar, minta maaf",
                "Pesan moral disampaikan secara eksplisit di akhir cerita"
              ],
              socialFunction: "Cerita tentang keluarga dan teman mengajarkan nilai-nilai sosial: kasih sayang, tolong-menolong, kejujuran, tanggung jawab, dan memaafkan. Melalui cerita, anak belajar bagaimana bersikap dalam kehidupan nyata.",
              lifeBenefits: "Anak yang terbiasa mendengar dan membaca cerita memiliki empati lebih tinggi, kosakata lebih kaya, dan pemahaman sosial lebih baik. Mereka juga lebih mudah mengekspresikan perasaan dan pengalaman melalui cerita.",
              distinction: "Cerita untuk kelas II berbeda dengan dongeng kelas I. Di kelas I, cerita sangat pendek (3-5 kalimat) dengan bantuan gambar dominan. Di kelas II, cerita lebih panjang (8-15 kalimat), teks lebih dominan daripada gambar, dan siswa mulai belajar mengidentifikasi unsur cerita secara eksplisit."
            },
            contentComposition: {
              infoPoints: [
                "Setiap cerita memiliki tokoh yang melakukan kegiatan",
                "Latar adalah tempat dan waktu terjadinya cerita",
                "Alur adalah urutan peristiwa dalam cerita",
                "Cerita yang baik memiliki pesan atau amanat"
              ],
              buildingElements: [
                "Tokoh: orang, hewan, atau benda yang menjadi pelaku cerita",
                "Latar: keterangan tempat dan waktu",
                "Peristiwa: kegiatan yang dilakukan tokoh",
                "Urutan: awal, tengah, akhir cerita",
                "Amanat: pesan yang ingin disampaikan penulis"
              ],
              mainIdeas: [
                "Keluarga dan teman adalah orang-orang terdekat dalam kehidupan kita",
                "Cerita dapat mengajarkan nilai-nilai kebaikan",
                "Kita dapat belajar dari cerita tentang cara bersikap kepada keluarga dan teman"
              ],
              partRelationships: "Tokoh melakukan kegiatan di suatu tempat (latar). Kegiatan berlangsung dalam urutan waktu tertentu (alur). Dari rangkaian kegiatan itu, pembaca dapat mengambil pelajaran (amanat). Keempat unsur ini saling terkait membentuk cerita yang utuh.",
              simpleExample: "Keluarga Andi pergi ke pasar. Ayah membeli ikan. Ibu membeli sayur. Andi membeli buku. Mereka pulang bersama. Pesan: kegiatan keluarga yang menyenangkan."
            },
            textVariants: {
              types: ["cerita keluarga", "cerita persahabatan", "cerita keseharian", "fabel bertema keluarga"],
              variantDescriptions: [
                { name: "Cerita Keluarga", description: "Cerita tentang kegiatan dan hubungan antaranggota keluarga. Mengajarkan nilai kasih sayang dan tanggung jawab.", example: "Keluarga Rani pergi berlibur ke pantai. Ayah berenang, Ibu berjemur, Rani bermain pasir." },
                { name: "Cerita Persahabatan", description: "Cerita tentang hubungan pertemanan di sekolah atau lingkungan rumah. Mengajarkan nilai tolong-menolong dan setia kawan.", example: "Siti jatuh di lapangan. Teman-teman membantu Siti berdiri. Mereka mengantar Siti ke UKS." },
                { name: "Fabel Bertema Keluarga", description: "Cerita binatang yang menggambarkan hubungan keluarga. Binatang berperilaku seperti manusia.", example: "Induk ayam mencari makan untuk anak-anaknya. Anak ayam berlindung di bawah sayap induk saat hujan turun." }
              ],
              groupingBasis: "Pengelompokan berdasarkan tema cerita: keluarga, persahabatan, dan fabel. Setiap tema memiliki nilai-nilai khas yang ingin ditanamkan pada siswa."
            },
            structurePattern: {
              generalPattern: [
                { name: "Mengenal Unsur Cerita", description: "Guru memperkenalkan unsur cerita: tokoh, latar, alur, amanat. Gunakan istilah sederhana: siapa, di mana, apa yang terjadi, pesan." },
                { name: "Menyimak Cerita", description: "Guru membacakan cerita dengan ekspresif. Siswa menyimak sambil melihat ilustrasi." },
                { name: "Diskusi Cerita", description: "Guru mengajukan pertanyaan: Siapa tokohnya? Di mana ceritanya? Apa yang terjadi? Apa pesannya?" },
                { name: "Membaca Mandiri", description: "Siswa membaca cerita sendiri. Guru mendampingi siswa yang kesulitan." },
                { name: "Menceritakan Kembali", description: "Siswa menceritakan kembali isi cerita dengan bantuan gambar atau kata kunci." }
              ],
              variationNotes: "Untuk siswa yang masih kesulitan membaca, guru dapat mendampingi secara khusus atau menggunakan teks dengan huruf lebih besar. Untuk siswa yang sudah lancar, berikan cerita sedikit lebih panjang dengan konflik lebih kompleks.",
              readingGuide: "Saat membacakan cerita, tunjukkan gambar di setiap bagian. Gunakan suara berbeda untuk tokoh berbeda. Ajukan pertanyaan prediktif: 'Kira-kira apa yang terjadi selanjutnya?'"
            },
            languageFeatures: {
              register: "Gunakan bahasa Indonesia sehari-hari yang santun. Hindari bahasa formal kaku. Dialog tokoh menggunakan bahasa yang wajar diucapkan anak-anak.",
              features: [
                { name: "Nama Tokoh", description: "Setiap tokoh memiliki nama yang memudahkan identifikasi. Nama tokoh selalu ditulis dengan huruf kapital.", example: "Andi, Rani, Siti, Budi, Ibu, Ayah" },
                { name: "Kata Ganti", description: "Kata yang merujuk pada tokoh agar tidak mengulang nama terus-menerus.", example: "Ia, dia, mereka, -nya" },
                { name: "Kata Kerja Kegiatan", description: "Kata yang menggambarkan kegiatan tokoh dalam cerita.", example: "berlari, memasak, bermain, membaca, membantu" }
              ],
              wordChoice: "Pilih kosakata yang berkaitan dengan kehidupan keluarga dan pergaulan: ayah, ibu, kakak, adik, sahabat, tetangga, membantu, berbagi, memaafkan.",
              sentencePattern: "Kalimat terdiri dari 5-8 kata. Gunakan variasi: kalimat berita untuk menceritakan, kalimat tanya dalam dialog, kalimat seru untuk ekspresi.",
              conjunctions: "Gunakan kata hubung waktu: 'kemudian', 'lalu', 'setelah itu', 'akhirnya'. Juga 'tetapi' dan 'karena'.",
              style: "Gaya bercerita dengan deskripsi sederhana dan dialog. Gunakan pengulangan untuk memperkuat ingatan.",
              spelling: "Terapkan ejaan yang benar sesuai PUEBI. Huruf kapital di awal kalimat dan nama orang. Kata depan 'di', 'ke', 'dari' ditulis terpisah.",
              punctuation: "Gunakan tanda titik, koma, tanda tanya, tanda seru, dan tanda petik untuk dialog."
            },
            productionProcedure: {
              preProduction: "Pilih 3-4 cerita pendek bertema keluarga dan teman. Siapkan gambar ilustrasi. Buat kartu unsur cerita (tokoh, latar, alur, amanat).",
              production: [
                "Guru membacakan cerita 'Liburan ke Pantai' dengan ekspresif. Siswa menyimak.",
                "Tanya jawab tentang tokoh, latar, dan urutan peristiwa.",
                "Siswa membaca cerita kedua 'Teman yang Baik' secara berpasangan.",
                "Siswa mengidentifikasi unsur cerita menggunakan kartu unsur.",
                "Siswa menceritakan kembali cerita dengan bantuan gambar berseri."
              ],
              revision: "Bantu siswa yang kesulitan menceritakan kembali dengan pertanyaan pancingan: 'Siapa tadi tokohnya? Pertama, apa yang terjadi?'",
              editing: "Perbaiki urutan cerita jika siswa menceritakan dengan urutan salah. Bantu dengan kartu urutan.",
              publication: "Siswa membuat buku kecil berisi cerita keluarga mereka sendiri. Kumpulkan menjadi 'Buku Cerita Kelas II'.",
              bestPractices: ["Gunakan cerita yang relevan dengan latar belakang siswa.", "Bacakan cerita yang sama beberapa kali hingga siswa hafal.", "Libatkan siswa dalam pembuatan ilustrasi cerita."]
            }
          },
          exampleText: {
            title: "Liburan ke Pantai",
            content: "Keluarga Rani pergi berlibur ke Pantai Parangtritis. Mereka naik mobil. Ayah menyetir mobil dengan hati-hati. Ibu duduk di samping Ayah. Rani dan Adi duduk di belakang.\n\nSesampainya di pantai, Rani berlari ke tepi air. Ombak kecil menyapu kakinya. Rani tertawa senang. Adi membuat istana pasir. Ibu menyiapkan bekal makanan. Ayah memotret pemandangan.\n\nMenjelang sore, mereka berkemas. Rani merasa sedih karena harus pulang. Tapi Ibu berjanji akan mengajak mereka liburan lagi. Rani senang sekali.\n\nPesan moral: Kegiatan bersama keluarga sangat menyenangkan.",
            analysis: {
              structure: "Cerita memiliki struktur lengkap: orientasi (pergi ke pantai), rangkaian peristiwa (bermain, membuat istana pasir, menyiapkan bekal), resolusi (pulang dengan janji liburan lagi), dan pesan moral. Alur linear dan mudah diikuti.",
              content: "Tema liburan keluarga dekat dengan pengalaman anak. Tokoh terdiri dari ayah, ibu, Rani, dan Adi — mewakili keluarga inti. Kegiatan di pantai adalah aktivitas yang dikenal anak-anak.",
              language: "Kalimat pendek (4-7 kata). Kosakata sederhana. Ada variasi kalimat berita, seru, dan dialog.",
              strengths: "Cerita relevan, struktur jelas, pesan moral eksplisit, bahasa sesuai usia.",
              improvements: "Bisa ditambahkan konflik kecil untuk mengajarkan penyelesaian masalah."
            }
          },
          learningActivities: {
            opening: [
              "Guru bertanya: 'Siapa yang pernah liburan bersama keluarga? Ke mana?'",
              "Guru menunjukkan gambar pantai dan bertanya: 'Apa yang kalian lihat?'",
              "Guru menyampaikan tujuan: hari ini kita akan membaca cerita tentang liburan keluarga."
            ],
            core: [
              "Guru membacakan cerita 'Liburan ke Pantai' dengan suara dan ekspresi yang menarik.",
              "Tanya jawab: 'Siapa tokoh dalam cerita? Di mana mereka liburan? Apa yang dilakukan Rani?'",
              "Siswa membaca cerita secara bergiliran. Setiap siswa membaca 2-3 kalimat.",
              "Siswa mengurutkan gambar berseri sesuai urutan cerita.",
              "Siswa menceritakan kembali cerita dengan bantuan gambar berseri.",
              "Siswa menulis 2-3 kalimat tentang liburan mereka sendiri."
            ],
            group: [
              "Setiap kelompok mendapat satu cerita pendek berbeda. Mereka membaca bersama dan mengidentifikasi tokoh, latar, dan urutan peristiwa.",
              "Bermain peran: satu kelompok memerankan cerita 'Liburan ke Pantai', kelompok lain menebak.",
              "Diskusi: 'Apa yang kamu pelajari dari cerita ini? Apa pesan moralnya?'"
            ],
            individual: [
              "Siswa membaca cerita secara mandiri. Guru mendampingi secara bergiliran.",
              "Siswa mengisi lembar kerja: menulis tokoh, latar, dan urutan peristiwa.",
              "Siswa menggambar satu adegan dari cerita dan menulis satu kalimat tentangnya."
            ],
            reflection: [
              "Guru bertanya: 'Cerita mana yang paling kalian suka? Mengapa?'",
              "Siswa berbagi: 'Keluargaku juga pernah melakukan kegiatan serupa.'",
              "Guru mengajak siswa bersyukur memiliki keluarga dan teman yang baik."
            ]
          },
          worksheet: {
            title: "Lembar Kerja: Keluarga dan Teman",
            purpose: "Membantu siswa memahami cerita sederhana dan mengidentifikasi unsur-unsurnya.",
            instructions: ["Baca cerita dengan saksama.", "Jawab pertanyaan dengan benar.", "Tulis dengan rapi dan jelas."],
            activities: [
              { name: "Unsur Cerita", items: ["Tulis tokoh-tokoh dalam cerita.", "Tulis latar tempat cerita.", "Tulis urutan peristiwa: pertama… kedua… ketiga…", "Tulis pesan moral dari cerita."] },
              { name: "Menjodohkan", items: ["Hubungkan tokoh dengan kegiatan yang dilakukan.", "Rani — membuat istana pasir", "Adi — berlari ke tepi air", "Ibu — menyiapkan bekal", "Ayah — memotret pemandangan"] },
              { name: "Menulis Cerita", items: ["Tulis 2-3 kalimat tentang kegiatan keluargamu.", "Gambarlah satu momen yang paling berkesan."] }
            ],
            studentOutput: "Siswa menghasilkan lembar kerja berisi identifikasi unsur cerita, hasil menjodohkan, dan cerita pendek tentang keluarga mereka."
          },
          assessment: {
            diagnostic: [
              { question: "Apa nama anggota keluarga kamu? Coba sebutkan!", purpose: "Mengetahui latar belakang keluarga siswa." },
              { question: "Kegiatan apa yang biasa kamu lakukan bersama keluarga?", purpose: "Mengetahui pengalaman siswa terkait tema." },
              { question: "Coba ceritakan satu pengalaman seru bersama temanmu!", purpose: "Mengetahui kemampuan awal bercerita siswa." }
            ],
            formative: [
              { method: "Pengamatan saat diskusi cerita", criteria: ["Siswa aktif menjawab pertanyaan", "Siswa dapat menyebutkan tokoh cerita", "Siswa dapat menyebutkan latar cerita"] },
              { method: "Hasil mengurutkan gambar", criteria: ["Urutan gambar benar", "Siswa dapat menjelaskan urutan", "Siswa percaya diri"] },
              { method: "Menceritakan kembali", criteria: ["Alur cerita runtut", "Tokoh disebutkan semua", "Menggunakan bahasa sendiri"] }
            ],
            summative: [
              { type: "Tes lisan", description: "Siswa menceritakan kembali cerita yang sudah dibaca. Guru menilai kelengkapan unsur cerita." },
              { type: "Tes tertulis", description: "Siswa menjawab 5 pertanyaan tentang isi cerita (tokoh, latar, urutan, pesan moral)." },
              { type: "Proyek", description: "Siswa membuat buku kecil berisi cerita tentang keluarga atau teman, lengkap dengan gambar." }
            ]
          },
          rubric: {
            aspects: [
              { name: "Pemahaman Cerita", criteria: [
                { level: 4, description: "Menyebutkan semua tokoh, latar, dan urutan peristiwa dengan benar tanpa bantuan." },
                { level: 3, description: "Menyebutkan sebagian besar tokoh, latar, dan urutan peristiwa dengan sedikit bantuan." },
                { level: 2, description: "Menyebutkan tokoh dan latar tetapi belum dapat mengurutkan peristiwa." },
                { level: 1, description: "Belum dapat menyebutkan unsur cerita dengan benar." }
              ]},
              { name: "Menceritakan Kembali", criteria: [
                { level: 4, description: "Menceritakan kembali dengan runtut, lengkap, dan bahasa sendiri." },
                { level: 3, description: "Menceritakan kembali dengan runtut tetapi masih menggunakan kata-kata dari teks." },
                { level: 2, description: "Menceritakan kembali sebagian cerita dengan bantuan guru." },
                { level: 1, description: "Belum dapat menceritakan kembali cerita." }
              ]}
            ]
          },
          differentiation: {
            support: [
              "Gunakan cerita dengan gambar ilustrasi yang dominan.",
              "Bacakan cerita lebih lambat dan ulangi 2-3 kali.",
              "Berikan kartu kata kunci untuk membantu mengurutkan cerita.",
              "Izinkan siswa menceritakan kembali dengan bahasa daerah jika perlu.",
              "Gunakan boneka jari untuk memerankan tokoh cerita."
            ],
            regular: ["Ikuti kegiatan sesuai rencana pembelajaran.", "Berikan cerita baru setiap 2 pertemuan untuk variasi.", "Dorong siswa untuk menghubungkan cerita dengan pengalaman pribadi."],
            challenge: [
              "Berikan cerita dengan konflik lebih kompleks dan tokoh lebih banyak.",
              "Minta siswa mengubah akhir cerita sesuai imajinasi mereka.",
              "Siswa menulis cerita pendek sendiri tentang keluarga atau teman.",
              "Siswa membandingkan dua cerita: persamaan dan perbedaannya."
            ]
          },
          remedial: [
            "Gunakan cerita yang sangat pendek (5-7 kalimat) dengan gambar besar.",
            "Bimbing individual: guru membacakan kalimat, siswa menirukan.",
            "Gunakan media audio: putarkan rekaman cerita, siswa menyimak sambil melihat teks.",
            "Latihan mengurutkan gambar berseri setiap hari selama 10 menit.",
            "Libatkan orang tua untuk membacakan cerita di rumah."
          ],
          enrichment: [
            "Kunjungi perpustakaan sekolah dan pinjam buku cerita bertema keluarga.",
            "Buat peta cerita: gambar alur cerita dalam bentuk diagram sederhana.",
            "Wawancarai orang tua tentang cerita masa kecil mereka dan tulis dalam bentuk cerita pendek.",
            "Adakan 'Hari Bercerita': setiap siswa membacakan cerita karya sendiri di depan kelas."
          ],
          teacherNotes: {
            teachingStrategies: [
              "Gunakan cerita yang mencerminkan keberagaman keluarga siswa.",
              "Ajarkan nilai-nilai karakter melalui cerita.",
              "Libatkan siswa dalam memilih cerita yang akan dibaca.",
              "Buat 'sudut cerita' di kelas dengan kumpulan buku cerita bergambar."
            ],
            commonMisconceptions: [
              { misconception: "Siswa mengira semua unsur cerita harus disebutkan eksplisit.", correction: "Latar dan amanat kadang tersirat." },
              { misconception: "Siswa hanya fokus pada gambar.", correction: "Tunjuk teks saat membaca." },
              { misconception: "Menceritakan kembali = menghafal teks.", correction: "Gunakan bahasa sendiri." }
            ],
            feedbackGuide: [
              "Puji siswa yang berani bercerita di depan kelas.",
              "Bantu siswa yang kesulitan menemukan kata.",
              "Catat perkembangan untuk laporan orang tua."
            ],
            classroomManagement: [
              "Atur tempat duduk melingkar saat menyimak cerita.",
              "Siapkan buku cerita cadangan.",
              "Alokasikan waktu untuk bercerita sukarela."
            ]
          },
          reflection: {
            studentQuestions: [
              "Cerita apa yang kamu baca hari ini?",
              "Siapa tokoh favoritmu? Mengapa?",
              "Pesan apa yang kamu dapat?"
            ],
            teacherQuestions: [
              "Apakah siswa antusias?",
              "Dapatkah mengidentifikasi unsur cerita?",
              "Strategi apa yang efektif?"
            ]
          },
          readingPractice: {
            title: "Latihan Membaca: Keluarga dan Teman",
            stimulusTitle: "Teman yang Baik",
            stimulusText: "Siti dan Rina bersahabat sejak kelas satu. Setiap hari mereka bermain bersama di halaman sekolah. Suatu hari, Siti terjatuh saat berlari. Lututnya berdarah. Rina segera membantu Siti berdiri. Ia mengantar Siti ke ruang UKS. Ibu guru membersihkan luka Siti. Setelah sembuh, Siti berterima kasih kepada Rina. Rina tersenyum.",
            questions: [
              { id: "r1-ii-bab2", type: "pilihan_ganda", questionText: "Siapa sahabat Siti?", options: ["Rani", "Rina", "Ibu guru", "Adi"], correctAnswer: "Rina", explanation: "Teks mengatakan 'Siti dan Rina bersahabat sejak kelas satu.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab2", type: "pilihan_ganda", questionText: "Apa yang terjadi pada Siti?", options: ["Siti jatuh dari sepeda", "Siti terjatuh saat berlari", "Siti lupa membawa buku", "Siti dimarahi guru"], correctAnswer: "Siti terjatuh saat berlari", explanation: "Teks mengatakan 'Siti terjatuh saat berlari. Lututnya berdarah.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab2", type: "pilihan_ganda", questionText: "Apa yang dilakukan Rina saat Siti jatuh?", options: ["Menangis", "Memanggil guru", "Membantu Siti berdiri", "Berlari menjauh"], correctAnswer: "Membantu Siti berdiri", explanation: "Teks mengatakan 'Rina segera membantu Siti berdiri.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r4-ii-bab2", type: "jawaban_singkat", questionText: "Ke mana Rina mengantar Siti?", correctAnswer: "Ke ruang UKS", explanation: "Teks mengatakan 'Ia mengantar Siti ke ruang UKS.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r5-ii-bab2", type: "pilihan_ganda", questionText: "Pesan apa yang dapat kamu ambil dari cerita?", options: ["Kita harus berlari hati-hati", "Sahabat saling membantu", "Jangan bermain di sekolah", "Luka harus dibersihkan"], correctAnswer: "Sahabat saling membantu", explanation: "Cerita mengajarkan bahwa sahabat yang baik saling membantu saat kesulitan.", skillTarget: "pesan moral", difficulty: "sedang" }
            ]
          },
          quickQuiz: {
            title: "Kuis Cerita Keluarga dan Teman",
            questions: [
              { id: "q1-ii-bab2", type: "pilihan_ganda", questionText: "Cerita 'Liburan ke Pantai' berlatar tempat di…", options: ["gunung", "pantai", "sawah", "kota"], correctAnswer: "pantai", explanation: "Cerita mengatakan mereka pergi ke Pantai Parangtritis.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "q2-ii-bab2", type: "pilihan_ganda", questionText: "Siapa yang membuat istana pasir dalam cerita?", options: ["Rani", "Adi", "Ibu", "Ayah"], correctAnswer: "Adi", explanation: "Teks mengatakan 'Adi membuat istana pasir.'", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "q3-ii-bab2", type: "jawaban_singkat", questionText: "Sebutkan satu nilai yang diajarkan dalam cerita persahabatan!", correctAnswer: "Tolong-menolong, saling membantu, setia kawan", explanation: "Cerita persahabatan mengajarkan nilai tolong-menolong dan kesetiaan.", skillTarget: "nilai moral", difficulty: "sedang" }
            ]
          },
          aiContextPrompt: "Materi Bab 2 Semester 1: Cerita tentang Keluarga dan Teman untuk Kelas II SD Fase A Kurikulum Merdeka. Fokus pembelajaran adalah mengidentifikasi unsur cerita sederhana: tokoh, latar, alur, dan amanat. Tema cerita adalah keluarga dan teman. Cerita memiliki alur linear, tokoh terbatas, konflik sederhana, dan pesan moral eksplisit. Siswa belajar menyimak cerita, membaca mandiri, mengidentifikasi unsur cerita, mengurutkan peristiwa, dan menceritakan kembali. Durasi pembelajaran 12 JP x 35 menit. Gunakan pendekatan cerita bergambar, diskusi, dan bermain peran. Sumber: CP Fase A Kurikulum Merdeka, buku SIBI Bahasa Indonesia Kelas II. Jika diminta membuat RPP, susun kegiatan dengan urutan: menyimak, diskusi, membaca mandiri, mengidentifikasi unsur, menceritakan kembali. Untuk pembuatan soal, buat soal pilihan ganda dan jawaban singkat tentang tokoh, latar, urutan, dan amanat. Untuk PPT, gunakan gambar ilustrasi cerita yang menarik dan kartu unsur cerita berwarna.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","Kurikulum Merdeka","cerita","keluarga","teman","unsur cerita"],
          isReady: false
        }
,
        {
          id: "ii-deskripsi-sederhana",
          slug: "mengenal-teks-deskripsi-sederhana",
          grade: "II",
          phase: "A",
          semester: 1,
          chapterNumber: 3,
          title: "Bab 3: Mengenal Teks Deskripsi Sederhana",
          shortTitle: "Deskripsi",
          kd: "3.3/4.3",
          emoji: "🔍",
          description: "Mengenal teks deskripsi sederhana yang menggambarkan benda, hewan, atau tempat. Siswa belajar mengamati ciri-ciri objek dan menuangkannya dalam kalimat deskriptif.",
          overview: "Setelah terbiasa dengan cerita, siswa diperkenalkan dengan jenis teks baru: teks deskripsi. Berbeda dengan cerita yang menceritakan urutan peristiwa, teks deskripsi menggambarkan sesuatu — bagaimana rupa benda, bagaimana sifat hewan, bagaimana suasana tempat. Bab ini mengajak siswa mengamati sekeliling dengan saksama, lalu menuangkan hasil pengamatan dalam kalimat sederhana. Kegiatan dimulai dari mengamati benda konkret di kelas, mendeskripsikan secara lisan, lalu menulis deskripsi sederhana.",
          learningGoals: [
            "Mengidentifikasi objek yang dideskripsikan dalam teks",
            "Menemukan ciri-ciri objek dari teks deskripsi sederhana",
            "Menggunakan kata sifat untuk menggambarkan objek",
            "Mendeskripsikan benda atau hewan secara lisan dengan runtut",
            "Menulis 3-5 kalimat deskripsi sederhana tentang suatu objek",
            "Membedakan teks deskripsi dengan teks cerita"
          ],
          keywords: ["deskripsi","gambaran","ciri-ciri","kata sifat","observasi","benda","hewan","tempat","panca indra"],
          suggestedDuration: "12 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Teks deskripsi sederhana adalah teks yang menggambarkan suatu objek (benda, hewan, tempat, atau orang) dengan kata-kata sehingga pembaca seolah-olah melihat, mendengar, atau merasakan objek tersebut. Untuk kelas II, deskripsi difokuskan pada ciri-ciri fisik yang dapat diamati langsung dengan panca indra: bentuk, warna, ukuran, suara, dan tekstur.",
              characteristics: [
                "Objek yang dideskripsikan disebutkan di awal teks",
                "Ciri-ciri objek disusun secara berurutan dan jelas",
                "Menggunakan banyak kata sifat (adjektiva)",
                "Menggunakan kata kerja yang menggambarkan keadaan",
                "Tidak ada alur cerita atau urutan waktu"
              ],
              socialFunction: "Kemampuan mendeskripsikan membantu anak berkomunikasi dengan lebih jelas dan terperinci.",
              lifeBenefits: "Anak yang terlatih mendeskripsikan memiliki kepekaan observasi yang baik.",
              distinction: "Teks deskripsi berbeda dengan teks cerita. Cerita menceritakan urutan peristiwa. Deskripsi menggambarkan keadaan suatu objek."
            },
            contentComposition: {
              infoPoints: [
                "Setiap benda, hewan, dan tempat memiliki ciri-ciri khusus",
                "Ciri-ciri dapat diamati dengan panca indra",
                "Kata sifat digunakan untuk menggambarkan ciri-ciri objek",
                "Deskripsi yang baik menggunakan urutan yang logis"
              ],
              buildingElements: [
                "Objek: benda/hewan/tempat yang dideskripsikan",
                "Ciri fisik: warna, bentuk, ukuran, tekstur",
                "Kata sifat: putih, besar, bulat, halus, keras"
              ],
              mainIdeas: [
                "Teks deskripsi menggambarkan suatu objek dengan kata-kata",
                "Kata sifat adalah kata kunci dalam teks deskripsi"
              ],
              partRelationships: "Objek adalah pusat deskripsi. Ciri-ciri ditemukan melalui pengamatan. Kata sifat digunakan untuk menyebutkan ciri-ciri.",
              simpleExample: "Ini pensilku. Pensilku berwarna biru. Ujungnya runcing. Pensilku panjang dan ringan."
            },
            textVariants: {
              types: ["deskripsi benda", "deskripsi hewan", "deskripsi tempat", "deskripsi orang"],
              variantDescriptions: [
                { name: "Deskripsi Benda", description: "Menggambarkan benda mati.", example: "Bonekaku berwarna cokelat. Matanya bulat dan hitam." },
                { name: "Deskripsi Hewan", description: "Menggambarkan hewan peliharaan.", example: "Kucingku bernama Milo. Bulunya putih dan tebal." },
                { name: "Deskripsi Tempat", description: "Menggambarkan ruangan.", example: "Kelasku luas dan terang. Dindingnya berwarna hijau muda." }
              ],
              groupingBasis: "Pengelompokan berdasarkan jenis objek."
            },
            structurePattern: {
              generalPattern: [
                { name: "Mengamati Objek", description: "Siswa mengamati objek dengan panca indra." },
                { name: "Menyebutkan Objek", description: "Tulis nama objek yang diamati." },
                { name: "Menyebutkan Ciri-Ciri", description: "Sebutkan ciri-ciri secara berurutan." },
                { name: "Merangkai Deskripsi", description: "Rangkai informasi menjadi teks deskripsi." }
              ],
              variationNotes: "Gunakan foto atau video untuk objek yang tidak bisa dibawa ke kelas.",
              readingGuide: "Saat membaca deskripsi, bayangkan objek yang digambarkan."
            },
            languageFeatures: {
              register: "Gunakan bahasa Indonesia baku sederhana.",
              features: [
                { name: "Kata Sifat", description: "Inti teks deskripsi.", example: "besar, kecil, bulat, putih, harum" },
                { name: "Kata Bantu", description: "Menghubungkan objek dengan cirinya.", example: "Kucing adalah hewan berkaki empat." }
              ],
              wordChoice: "Kosakata panca indra.",
              sentencePattern: "Subjek + Predikat + Pelengkap.",
              conjunctions: "'dan', 'tetapi', 'sangat', 'sekali'.",
              style: "Melukis dengan kata-kata.",
              spelling: "Ejaan benar sesuai PUEBI.",
              punctuation: "Titik, koma, tanda seru."
            },
            productionProcedure: {
              preProduction: "Siapkan benda konkret: buah, mainan, alat tulis.",
              production: [
                "Tunjukkan benda. Amati bersama.",
                "Kumpulkan kata sifat di papan.",
                "Guru mencontohkan menulis deskripsi.",
                "Siswa berlatih berpasangan.",
                "Siswa menulis deskripsi benda pilihan."
              ],
              revision: "Bantu siswa menemukan kata sifat.",
              editing: "Perbaiki penggunaan kata sifat.",
              publication: "Tempel hasil tulisan di dinding kelas.",
              bestPractices: ["Gunakan benda nyata.", "Ajarkan kosakata baru dalam konteks."]
            }
          },
          exampleText: {
            title: "Kucingku Milo",
            content: "Aku mempunyai seekor kucing. Namanya Milo. Milo berbulu putih dan tebal. Matanya bulat dan berwarna hijau. Ekornya panjang dan lentik. Milo suka bermain bola benang. Ia juga suka tidur di pangkuanku. Milo adalah kucing yang lucu dan manja.",
            analysis: {
              structure: "Perkenalan objek, lalu ciri fisik, kebiasaan, kesan umum.",
              content: "Objek kucing yang dekat dengan anak.",
              language: "Kalimat pendek, dominan kata sifat.",
              strengths: "Struktur jelas, objek familiar, bahasa sesuai usia.",
              improvements: "Bisa ditambahkan perbandingan."
            }
          },
          learningActivities: {
            opening: [
              "Guru membawa benda misterius dalam tas.",
              "'Bagaimana kamu bisa menebak? Ciri apa?'",
              "Sampaikan tujuan pembelajaran."
            ],
            core: [
              "Amati jeruk bersama: warna, bentuk, tekstur, bau.",
              "Tulis kata sifat di papan.",
              "Guru mencontohkan deskripsi.",
              "Siswa berpasangan, tulis deskripsi.",
              "Bacakan, tebak benda."
            ],
            group: [
              "Setiap kelompok mendapat gambar hewan.",
              "Satu siswa mendeskripsikan, kelompok lain menebak."
            ],
            individual: [
              "Pilih benda di rumah, tulis deskripsi.",
              "Gambar benda dan tulis deskripsi."
            ],
            reflection: [
              "Apa yang baru kamu pelajari?",
              "Kata sifat baru apa yang kamu dapatkan?"
            ]
          },
          worksheet: {
            title: "Lembar Kerja: Mendeskripsikan Benda",
            purpose: "Melatih siswa mengamati dan menulis deskripsi.",
            instructions: ["Pilih benda.", "Amati.", "Tulis ciri.", "Rangkai jadi teks."],
            activities: [
              { name: "Observasi", items: ["Nama benda: …", "Warna: …", "Bentuk: …", "Ukuran: …"] },
              { name: "Menulis", items: ["Tulis 3-5 kalimat.", "Gunakan kata sifat."] }
            ],
            studentOutput: "Teks deskripsi 3-5 kalimat."
          },
          assessment: {
            diagnostic: [
              { question: "Sebutkan 3 kata sifat!", purpose: "Penguasaan kosakata." },
              { question: "Apa warna, bentuk meja ini?", purpose: "Kemampuan mengamati." }
            ],
            formative: [
              { method: "Observasi", criteria: ["Fokus mengamati", "Gunakan kata sifat"] },
              { method: "Tulisan", criteria: ["Objek jelas", "Ciri minimal 3"] }
            ],
            summative: [
              { type: "Tes tertulis", description: "Menulis deskripsi 5 kalimat." },
              { type: "Proyek", description: "Buku kecil berisi 3 deskripsi." }
            ]
          },
          rubric: {
            aspects: [
              { name: "Kelengkapan Ciri", criteria: [
                { level: 4, description: "5+ ciri dengan tepat." },
                { level: 3, description: "3-4 ciri dengan tepat." },
                { level: 2, description: "1-2 ciri." },
                { level: 1, description: "Belum dapat menyebutkan ciri." }
              ]},
              { name: "Kata Sifat", criteria: [
                { level: 4, description: "4+ kata sifat tepat dan bervariasi." },
                { level: 3, description: "2-3 kata sifat tepat." },
                { level: 2, description: "1 kata sifat." },
                { level: 1, description: "Belum menggunakan kata sifat." }
              ]}
            ]
          },
          differentiation: {
            support: ["Kerangka deskripsi.", "Benda dikenal.", "Target 2-3 kalimat."],
            regular: ["Ikuti rencana.", "Variasi objek."],
            challenge: ["Deskripsikan tempat.", "Bandingkan dua benda."]
          },
          remedial: ["Ulangi observasi dengan pendampingan.", "Kata sifat paling umum."],
          enrichment: ["Kunjungi taman, deskripsikan tanaman.", "Kartu tebakan."],
          teacherNotes: {
            teachingStrategies: ["Gunakan benda nyata.", "Ajarkan kata sifat dalam kelompok."],
            commonMisconceptions: [
              { misconception: "Deskripsi harus panjang.", correction: "3-5 kalimat padat cukup." },
              { misconception: "Hanya satu ciri.", correction: "Ajukan pertanyaan ciri lain." }
            ],
            feedbackGuide: ["Puji kata sifat baru."],
            classroomManagement: ["Bagikan benda merata.", "Waktu observasi 5 menit."]
          },
          reflection: {
            studentQuestions: ["Benda apa yang kamu deskripsikan?", "Kata sifat baru apa?"],
            teacherQuestions: ["Siswa dapat mengamati?", "Strategi apa yang membantu?"]
          },
          readingPractice: {
            title: "Latihan Membaca: Teks Deskripsi",
            stimulusTitle: "Kelasku yang Indah",
            stimulusText: "Kelasku bernama Kelas II C. Kelasku besar dan terang. Ada dua jendela besar di sisi kiri. Dindingnya berwarna hijau muda. Di depan ada papan tulis putih yang bersih. Ada dua puluh meja dan kursi tersusun rapi. Di sudut kelas ada pojok baca dengan rak buku. Tanaman hias membuat udara terasa segar. Aku senang belajar di kelasku.",
            questions: [
              { id: "r1-ii-bab3", type: "pilihan_ganda", questionText: "Nama kelas?", options: ["II A", "II B", "II C", "II D"], correctAnswer: "II C", explanation: "Kelasku bernama Kelas II C.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab3", type: "pilihan_ganda", questionText: "Jumlah jendela?", options: ["Satu", "Dua", "Tiga", "Empat"], correctAnswer: "Dua", explanation: "Ada dua jendela besar.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab3", type: "pilihan_ganda", questionText: "Warna dinding?", options: ["Biru", "Hijau", "Putih", "Kuning"], correctAnswer: "Hijau", explanation: "Dindingnya hijau muda.", skillTarget: "informasi tersurat", difficulty: "mudah" }
            ]
          },
          quickQuiz: {
            title: "Kuis Deskripsi",
            questions: [
              { id: "q1-ii-bab3", type: "pilihan_ganda", questionText: "Teks deskripsi menggambarkan…", options: ["urutan peristiwa", "ciri-ciri objek", "percakapan"], correctAnswer: "ciri-ciri objek", explanation: "Menggambarkan ciri-ciri.", skillTarget: "pengertian", difficulty: "mudah" },
              { id: "q2-ii-bab3", type: "pilihan_ganda", questionText: "Kata yang sering digunakan?", options: ["kata kerja", "kata sifat", "kata tanya"], correctAnswer: "kata sifat", explanation: "Kata sifat.", skillTarget: "kebahasaan", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 3 Semester 1: Mengenal Teks Deskripsi Sederhana untuk Kelas II SD Fase A Kurikulum Merdeka. Fokus: mengamati objek dan mendeskripsikan secara lisan/tertulis. Gunakan kata sifat untuk ciri fisik. Durasi 12 JP x 35 menit. Sumber: CP Fase A Kurikulum Merdeka.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","Kurikulum Merdeka","teks deskripsi","kata sifat"],
          isReady: false
        }
,
        {
          id: "ii-puisi-anak",
          slug: "puisi-anak",
          grade: "II",
          phase: "A",
          semester: 1,
          chapterNumber: 4,
          title: "Bab 4: Puisi Anak",
          shortTitle: "Puisi Anak",
          kd: "3.4/4.4",
          emoji: "🎭",
          description: "Mengenal puisi anak sederhana. Siswa belajar memahami bait, rima, dan makna puisi serta mengekspresikan puisi dengan lafal dan intonasi yang tepat.",
          overview: "Setelah mampu membaca kalimat dan cerita, siswa diajak menikmati keindahan bahasa melalui puisi. Puisi anak untuk kelas II sangat sederhana: dua hingga empat baris per bait, rima yang jelas, dan isi tentang hal-hal yang dekat dengan anak. Bab ini memperkenalkan unsur puisi: baris, bait, rima, dan makna. Siswa belajar membaca puisi dengan ekspresi, menikmati irama kata, dan memahami perasaan yang terkandung dalam puisi. Kegiatan puncak adalah menulis puisi sederhana bersama-sama.",
          learningGoals: [
            "Mengenal puisi sebagai salah satu bentuk karya sastra",
            "Memahami pengertian baris, bait, dan rima dalam puisi",
            "Membaca puisi dengan lafal, intonasi, dan ekspresi yang tepat",
            "Menulis 2-4 baris puisi sederhana tentang alam atau keluarga",
            "Menikmati keindahan bunyi dan irama dalam puisi"
          ],
          keywords: ["puisi","bait","baris","rima","irama","ekspresi","apresiasi sastra","kata puitis"],
          suggestedDuration: "10 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Puisi anak adalah karya sastra yang mengungkapkan perasaan, pikiran, atau pengalaman anak melalui kata-kata indah yang terikat oleh rima dan irama. Untuk kelas II, puisi sangat sederhana: 2-4 baris per bait, rima akhir yang jelas (a-a-a-a atau a-b-a-b).",
              characteristics: [
                "Baris puisi pendek (2-5 kata per baris)",
                "Rima akhir yang jelas dan mudah dikenali",
                "Isi tentang hal konkret: alam, hewan, keluarga"
              ],
              socialFunction: "Puisi mengajarkan anak menghargai keindahan bahasa dan mengekspresikan perasaan kreatif.",
              lifeBenefits: "Anak terbiasa dengan puisi memiliki kepekaan bunyi bahasa dan kosakata lebih kaya.",
              distinction: "Puisi berbeda dengan cerita. Cerita menceritakan rangkaian peristiwa. Puisi mengungkapkan perasaan padat dan indah."
            },
            contentComposition: {
              infoPoints: ["Puisi terdiri dari baris-baris pendek.", "Kumpulan baris disebut bait.", "Rima adalah bunyi akhir yang sama."],
              buildingElements: ["Baris: satu deretan kata.", "Bait: kumpulan baris (2-4 baris).", "Rima: persamaan bunyi akhir.", "Kata puitis: kata-kata indah."],
              mainIdeas: ["Puisi adalah bahasa yang indah.", "Setiap orang bisa membuat puisi sederhana."],
              partRelationships: "Baris terkecil puisi. Beberapa baris jadi bait. Rima menghubungkan baris.",
              simpleExample: "Matahari / Bulat dan terang / Setiap pagi kau datang."
            },
            textVariants: {
              types: ["puisi alam", "puisi keluarga", "pantun anak"],
              variantDescriptions: [
                { name: "Puisi Alam", description: "Keindahan alam.", example: "Pelangi / Warna-warni di langit biru" },
                { name: "Puisi Keluarga", description: "Rasa sayang keluarga.", example: "Ibu / Kaulah sinar di hidupku" },
                { name: "Pantun Anak", description: "Sampiran dan isi.", example: "Pergi ke pasar membeli duku / Mari kita belajar bersama" }
              ],
              groupingBasis: "Berdasarkan tema."
            },
            structurePattern: {
              generalPattern: [
                { name: "Mendengarkan Puisi", description: "Guru membacakan puisi." },
                { name: "Memahami Unsur", description: "Baris, bait, rima." },
                { name: "Membaca Bersama", description: "Guru dan siswa membaca." },
                { name: "Menulis Puisi", description: "Siswa menulis 2-4 baris." }
              ],
              variationNotes: "Kerangka puisi untuk siswa kesulitan.",
              readingGuide: "Baca lebih lambat dari cerita, hayati setiap kata."
            },
            languageFeatures: {
              register: "Bahasa puitis sederhana.",
              features: [
                { name: "Rima", description: "Persamaan bunyi akhir.", example: "Matahari (i) / Setiap pagi (i)" },
                { name: "Pilihan Kata", description: "Kata indah.", example: "'Cahaya' lebih indah dari 'sinar'" }
              ],
              wordChoice: "Kata indah: cahaya, pelangi, bintang, embun.",
              sentencePattern: "Baris tidak harus kalimat utuh.",
              conjunctions: "dan, serta, yang",
              style: "Gaya puitis dengan pengulangan.",
              spelling: "Ejaan benar. Huruf kapital di awal baris.",
              punctuation: "Koma untuk jeda, titik di akhir bait."
            },
            productionProcedure: {
              preProduction: "Kumpulan puisi anak. Poster unsur puisi.",
              production: [
                "Guru membacakan puisi.",
                "Hitung baris dan bait, temukan rima.",
                "Siswa membaca bersama.",
                "Siswa menulis puisi sederhana."
              ],
              revision: "Bantu dengan bank kata berima.",
              editing: "Perbaiki rima, pilih kata lebih indah.",
              publication: "Kumpulkan jadi antologi kelas.",
              bestPractices: ["Musik pengiring.", "Rekam siswa.", "Lomba baca puisi."]
            }
          },
          exampleText: {
            title: "Ibuku",
            content: "Ibu…\nKaulah cahaya di hidupku\nSetiap hari merawatku\nDengan penuh kasih sayang\n\nIbu…\nKaulah bintang di malamku\nTerima kasih, Ibu.",
            analysis: {
              structure: "2 bait, 3-4 baris per bait.",
              content: "Tema kasih sayang ibu.",
              language: "Rima tidak kaku, bahasa sederhana penuh perasaan.",
              strengths: "Tema dekat, bahasa indah.",
              improvements: "Bisa ditambahkan aktivitas ibu."
            }
          },
          learningActivities: {
            opening: ["Guru bacakan baris puisi.", "Siapa pernah dengar puisi?"],
            core: ["Guru bacakan puisi 'Ibuku'.", "Diskusi baris, bait, rima.", "Siswa membaca bersama.", "Siswa menulis puisi."],
            group: ["Lomba baca puisi.", "Bermain rima."],
            individual: ["Tulis puisi sendiri (4 baris).", "Hafalkan puisi pendek."],
            reflection: ["Apa yang kamu rasakan?", "Bagikan puisimu."]
          },
          worksheet: {
            title: "Lembar Kerja: Ayo Menulis Puisi",
            purpose: "Memahami unsur puisi dan menulis puisi.",
            instructions: ["Baca puisi contoh.", "Hitung baris dan bait.", "Tulis puisimu."],
            activities: [
              { name: "Analisis", items: ["Judul: …", "Jumlah bait: …", "Rima akhir: …"] },
              { name: "Menulis", items: ["Pilih tema.", "Tulis 4-8 baris.", "Ada rima."] }
            ],
            studentOutput: "Puisi asli 4-8 baris dan ilustrasi."
          },
          assessment: {
            diagnostic: [{ question: "Apa itu puisi?", purpose: "Pengetahuan awal." }],
            formative: [{ method: "Membaca puisi", criteria: ["Lafal jelas", "Ekspresi mendukung"] }],
            summative: [{ type: "Unjuk kerja", description: "Membaca puisi di depan kelas." }]
          },
          rubric: {
            aspects: [
              { name: "Membaca Puisi", criteria: [
                { level: 4, description: "Lafal jelas, intonasi tepat, ekspresif." },
                { level: 3, description: "Lafal jelas, intonasi cukup." },
                { level: 2, description: "Lafal kurang jelas." },
                { level: 1, description: "Belum dapat membaca puisi." }
              ]},
              { name: "Menulis Puisi", criteria: [
                { level: 4, description: "Judul, 4-8 baris, tema jelas, rima baik." },
                { level: 3, description: "Judul, 4 baris, rima cukup." },
                { level: 2, description: "2-3 baris." },
                { level: 1, description: "Belum dapat menulis." }
              ]}
            ]
          },
          differentiation: {
            support: ["Kerangka puisi.", "Puisi 2 baris."],
            regular: ["Ikuti rencana.", "Variasi tema."],
            challenge: ["Puisi dengan rima a-b-a-b.", "Bandingkan dua puisi."]
          },
          remedial: ["Gunakan lagu anak.", "Baca berulang hingga hafal."],
          enrichment: ["Kunjungi perpustakaan.", "Pentas puisi kelas."],
          teacherNotes: {
            teachingStrategies: ["Mulai puisi pendek.", "Musik klasik latar."],
            commonMisconceptions: [
              { misconception: "Puisi harus panjang.", correction: "2-4 baris cukup." },
              { misconception: "Rima harus sempurna.", correction: "Keindahan kata lebih penting." }
            ],
            feedbackGuide: ["Puji pilihan kata."],
            classroomManagement: ["Suasana tenang.", "Bola bicara."]
          },
          reflection: {
            studentQuestions: ["Puisi apa yang kamu suka?", "Kata indah apa?"],
            teacherQuestions: ["Siswa antusias?", "Semua berhasil menulis?"]
          },
          readingPractice: {
            title: "Latihan Membaca Puisi",
            stimulusTitle: "Pelangi",
            stimulusText: "Pelangi, pelangi\nIndah sekali\nWarna-warni di langit biru\nMembuat hati rindu\n\nMerah, jingga, kuning, hijau\nBiru, nila, ungu\nSeperti jembatan di awan",
            questions: [
              { id: "r1-ii-bab4", type: "pilihan_ganda", questionText: "Tema puisi?", options: ["hujan", "pelangi", "matahari"], correctAnswer: "pelangi", explanation: "Tentang pelangi.", skillTarget: "tema", difficulty: "mudah" },
              { id: "r2-ii-bab4", type: "pilihan_ganda", questionText: "Jumlah bait?", options: ["satu", "dua", "tiga"], correctAnswer: "dua", explanation: "2 bait.", skillTarget: "struktur", difficulty: "mudah" }
            ]
          },
          quickQuiz: {
            title: "Kuis Puisi",
            questions: [
              { id: "q1-ii-bab4", type: "pilihan_ganda", questionText: "Kumpulan baris puisi disebut…", options: ["kata", "bait", "rima"], correctAnswer: "bait", explanation: "Bait.", skillTarget: "istilah", difficulty: "mudah" },
              { id: "q2-ii-bab4", type: "pilihan_ganda", questionText: "Persamaan bunyi akhir baris disebut…", options: ["irama", "rima", "baris"], correctAnswer: "rima", explanation: "Rima.", skillTarget: "istilah", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 4 Semester 1: Puisi Anak untuk Kelas II SD Fase A Kurikulum Merdeka. Fokus: mengenal, membaca, dan menulis puisi anak sederhana. Unsur: baris, bait, rima. Durasi 10 JP x 35 menit. Sumber: CP Fase A Kurikulum Merdeka.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","Kurikulum Merdeka","puisi","sastra anak"],
          isReady: false
        }
,
        {
          id: "ii-menulis-kalimat",
          slug: "menulis-kalimat-sederhana",
          grade: "II",
          phase: "A",
          semester: 1,
          chapterNumber: 5,
          title: "Bab 5: Menulis Kalimat Sederhana",
          shortTitle: "Menulis Kalimat",
          kd: "3.5/4.5",
          emoji: "✏️",
          description: "Menulis kalimat sederhana dengan struktur subjek-predikat yang benar. Siswa belajar menggunakan huruf kapital, tanda baca titik, dan spasi yang tepat.",
          overview: "Kemampuan menulis adalah keterampilan yang sama pentingnya dengan membaca. Bab ini mengajak siswa menulis kalimat sederhana dengan struktur yang benar. Dimulai dari menyalin kalimat, menulis ulang, menulis berdasarkan gambar, hingga menulis kalimat sendiri. Fokus utama adalah penggunaan huruf kapital di awal kalimat, tanda baca titik di akhir, dan spasi antarkata. Guru perlu sabar membimbing karena menulis adalah keterampilan motorik halus yang memerlukan latihan.",
          learningGoals: [
            "Menulis kalimat sederhana dengan struktur subjek dan predikat",
            "Menggunakan huruf kapital di awal kalimat",
            "Menggunakan tanda titik di akhir kalimat berita",
            "Memberi spasi yang tepat antarkata",
            "Menulis 3-5 kalimat sederhana tentang suatu topik"
          ],
          keywords: ["menulis","kalimat","huruf kapital","tanda titik","spasi","ejaan","subjek","predikat"],
          suggestedDuration: "12 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Menulis kalimat sederhana adalah menuangkan pikiran dalam bentuk tulisan dengan struktur kalimat yang benar. Untuk kelas II, fokus pada kalimat lengkap dengan subjek dan predikat, huruf kapital di awal, titik di akhir, dan spasi tepat.",
              characteristics: [
                "Kalimat diawali huruf kapital dan diakhiri tanda titik",
                "Setiap kalimat memiliki subjek dan predikat",
                "Antarkata diberi spasi",
                "Kata ditulis sesuai ejaan yang benar"
              ],
              socialFunction: "Kemampuan menulis memungkinkan anak berkomunikasi tertulis.",
              lifeBenefits: "Anak terampil menulis lebih mudah mengerjakan tugas.",
              distinction: "Menulis berbeda dengan menyalin. Menulis menghasilkan ide sendiri."
            },
            contentComposition: {
              infoPoints: ["Huruf kapital di awal kalimat.", "Tanda titik di akhir.", "Spasi antarkata."],
              buildingElements: ["Ide", "Subjek", "Predikat", "Tanda baca"],
              mainIdeas: ["Menulis mengekspresikan pikiran.", "Kalimat baik mudah dipahami."],
              partRelationships: "Ide jadi subjek-predikat. Diberi huruf kapital dan titik.",
              simpleExample: "Ide: kucing. Kalimat: Kucingku bernama Putih."
            },
            textVariants: {
              types: ["menulis dari gambar", "menulis dari pengalaman", "menulis jawaban"],
              variantDescriptions: [
                { name: "Dari Gambar", description: "Tulis kalimat tentang gambar.", example: "Dua anak bermain bola." },
                { name: "Dari Pengalaman", description: "Tulis pengalaman.", example: "Kemarin aku pergi ke pasar." }
              ],
              groupingBasis: "Berdasarkan sumber ide."
            },
            structurePattern: {
              generalPattern: [
                { name: "Menyiapkan Ide", description: "Tentukan yang akan ditulis." },
                { name: "Menyusun Kalimat", description: "Subjek dan predikat." },
                { name: "Menulis dengan Benar", description: "Huruf kapital, titik, spasi." },
                { name: "Membaca Ulang", description: "Periksa tulisan." }
              ],
              variationNotes: "Gunakan kertas bergaris untuk membantu kerapian.",
              readingGuide: "Duduk tegak. Pegang pensil benar. Kertas agak miring."
            },
            languageFeatures: {
              register: "Bahasa Indonesia baku sederhana.",
              features: [
                { name: "Huruf Kapital", description: "Awal kalimat dan nama orang.", example: "Ibu pergi ke pasar." },
                { name: "Tanda Titik", description: "Akhir kalimat.", example: "Aku suka membaca." },
                { name: "Spasi", description: "Jarak antarkata.", example: "Ibu memasak nasi goreng." }
              ],
              wordChoice: "Kosakata dikenal siswa.",
              sentencePattern: "S-P, S-P-O, S-P-K.",
              conjunctions: "'dan', 'lalu', 'kemudian'.",
              style: "Jelas dan lugas.",
              spelling: "Ejaan PUEBI. Kata depan terpisah.",
              punctuation: "Titik dan huruf kapital."
            },
            productionProcedure: {
              preProduction: "Gambar menarik, kertas bergaris, poster aturan menulis.",
              production: [
                "Tunjukkan gambar. Siswa sebut kalimat.",
                "Perbaiki bersama: huruf kapital, titik, spasi.",
                "Siswa menulis 2-3 kalimat.",
                "Bacakan tulisan."
              ],
              revision: "Bantu yang tanpa spasi/titik.",
              editing: "Tandai bagian perlu diperbaiki.",
              publication: "Kumpulkan 'Buku Tulis Kelas II'.",
              bestPractices: ["Contoh baik setiap hari.", "Latihan 10 menit per hari."]
            }
          },
          exampleText: {
            title: "Kegiatanku di Pagi Hari",
            content: "Setiap pagi aku bangun jam lima. Aku merapikan tempat tidur. Lalu aku mandi dan gosok gigi. Setelah itu aku sarapan. Aku berangkat sekolah jam enam.",
            analysis: {
              structure: "5 kalimat kronologis.",
              content: "Rutinitas pagi yang dikenal anak.",
              language: "Huruf kapital dan titik benar. Kata hubung waktu.",
              strengths: "Urutan logis, kalimat pendek.",
              improvements: "Tambahkan perasaan."
            }
          },
          learningActivities: {
            opening: ["Siapa yang suka menulis?", "Tunjukkan tulisan salah 'ibumasaknasi'."],
            core: [
              "Gambar anak menyiram bunga.",
              "Siswa sebut kalimat. Guru tulis.",
              "Periksa: huruf kapital? titik? spasi?",
              "Siswa menulis 3 kalimat.",
              "Bacakan, beri komentar."
            ],
            group: ["Lomba menulis kalimat terbanyak.", "Koreksi tulisan kelompok lain."],
            individual: ["Tulis 3 kalimat kegiatan pagi.", "Periksa sendiri."],
            reflection: ["Apa yang kamu pelajari?", "Kesalahan apa yang diperbaiki?"]
          },
          worksheet: {
            title: "Lembar Kerja: Menulis Kalimat",
            purpose: "Melatih menulis dengan huruf kapital, titik, spasi.",
            instructions: ["Lihat gambar.", "Tulis kalimat.", "Periksa."],
            activities: [
              { name: "Menulis dari Gambar", items: ["Anak membaca buku", "Ibu memasak", "Ayah mencuci mobil"] },
              { name: "Memperbaiki", items: ["Perbaiki 'inibukusaya'", "Perbaiki 'Ibumasaknasi'"] }
            ],
            studentOutput: "3 kalimat dari gambar."
          },
          assessment: {
            diagnostic: [{ question: "Tulis namamu!", purpose: "Kemampuan dasar." }],
            formative: [{ method: "Hasil tulisan", criteria: ["Huruf kapital", "Titik", "Spasi"] }],
            summative: [{ type: "Tes tertulis", description: "Menulis 5 kalimat dari gambar." }]
          },
          rubric: {
            aspects: [
              { name: "Ketepatan", criteria: [
                { level: 4, description: "Kapital, titik, spasi benar semua." },
                { level: 3, description: "Sebagian besar benar." },
                { level: 2, description: "Beberapa kesalahan." },
                { level: 1, description: "Banyak kesalahan." }
              ]}
            ]
          },
          differentiation: {
            support: ["Mulai menyalin kalimat.", "Kertas bergaris.", "Target 1-2 kalimat."],
            regular: ["Ikuti rencana.", "Variasi gambar."],
            challenge: ["Tulis paragraf 5-7 kalimat.", "Koreksi tulisan teman."]
          },
          remedial: ["Latihan menulis huruf.", "Buku halus kasar."],
          enrichment: ["Buat buku kecil tentang hobi.", "Tulis surat untuk teman."],
          teacherNotes: {
            teachingStrategies: ["Latihan pendek setiap hari.", "Tunjukkan benar dan salah."],
            commonMisconceptions: [
              { misconception: "Menulis cepat = baik.", correction: "Kerapian lebih penting." },
              { misconception: "Kapital hanya di awal paragraf.", correction: "Setiap awal kalimat." }
            ],
            feedbackGuide: ["Puji tulisan rapi."],
            classroomManagement: ["Pensil sudah diraut.", "Kertas bergaris cadangan."]
          },
          reflection: {
            studentQuestions: ["Tulisanku lebih rapi?", "Apa yang sulit?"],
            teacherQuestions: ["Semua bisa menulis?", "Strategi yang membantu?"]
          },
          readingPractice: {
            title: "Latihan Membaca: Kegiatan Sehari-hari",
            stimulusTitle: "Hari Minggu Bersama Keluarga",
            stimulusText: "Hari ini hari Minggu. Rani dan keluarga tidak pergi ke mana-mana. Mereka berkumpul di rumah. Ibu membuat kue kesukaan Rani. Ayah membaca koran di teras. Rani membantu Ibu di dapur. Mereka makan kue bersama-sama. Rani senang sekali.",
            questions: [
              { id: "r1-ii-bab5", type: "pilihan_ganda", questionText: "Hari apa?", options: ["Senin", "Sabtu", "Minggu"], correctAnswer: "Minggu", explanation: "Hari Minggu.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab5", type: "pilihan_ganda", questionText: "Apa yang dibuat Ibu?", options: ["Roti", "Kue", "Nasi goreng"], correctAnswer: "Kue", explanation: "Ibu membuat kue.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab5", type: "jawaban_singkat", questionText: "Apa yang dilakukan Rani?", correctAnswer: "Membantu Ibu", explanation: "Rani membantu Ibu.", skillTarget: "informasi tersurat", difficulty: "mudah" }
            ]
          },
          quickQuiz: {
            title: "Kuis Menulis",
            questions: [
              { id: "q1-ii-bab5", type: "pilihan_ganda", questionText: "Awal kalimat menggunakan…", options: ["huruf kecil", "huruf kapital", "angka"], correctAnswer: "huruf kapital", explanation: "Huruf kapital.", skillTarget: "ejaan", difficulty: "mudah" },
              { id: "q2-ii-bab5", type: "pilihan_ganda", questionText: "Akhir kalimat berita menggunakan…", options: ["tanya", "titik", "seru"], correctAnswer: "titik", explanation: "Tanda titik.", skillTarget: "tanda baca", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 5 Semester 1: Menulis Kalimat Sederhana untuk Kelas II SD Fase A Kurikulum Merdeka. Fokus: menulis dengan subjek-predikat, huruf kapital, titik, spasi. Durasi 12 JP x 35 menit. Sumber: CP Fase A Kurikulum Merdeka.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","Kurikulum Merdeka","menulis","kalimat","ejaan"],
          isReady: false
        }
      ]
    },
    {
      semester: 2,
      chapters: [
        {
          id: "ii-prosedur-sederhana",
          slug: "teks-prosedur-sederhana",
          grade: "II",
          phase: "A",
          semester: 2,
          chapterNumber: 6,
          title: "Bab 6: Teks Prosedur Sederhana",
          shortTitle: "Prosedur",
          kd: "3.6/4.6",
          emoji: "🛠️",
          description: "Mengenal teks prosedur sederhana yang berisi petunjuk melakukan sesuatu. Siswa belajar memahami urutan langkah-langkah dan menulis prosedur sederhana.",
          overview: "Setelah terbiasa dengan cerita, deskripsi, dan puisi, siswa sekarang belajar jenis teks yang sangat berguna: teks prosedur. Teks prosedur memberi petunjuk tentang cara melakukan sesuatu — membuat mainan, memasak makanan sederhana, atau merawat tanaman. Bab ini dimulai dengan memahami urutan langkah, mempraktikkan langsung, dan akhirnya menulis prosedur sederhana.",
          learningGoals: [
            "Mengidentifikasi teks prosedur sederhana",
            "Menemukan urutan langkah-langkah dalam teks prosedur",
            "Melakukan kegiatan sesuai petunjuk dalam teks prosedur",
            "Menulis teks prosedur sederhana 3-5 langkah",
            "Menggunakan kata perintah yang santun"
          ],
          keywords: ["prosedur","petunjuk","langkah","cara membuat","urutan","kata perintah"],
          suggestedDuration: "12 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Teks prosedur sederhana berisi langkah-langkah atau petunjuk untuk melakukan suatu kegiatan. Untuk kelas II, teks prosedur sangat sederhana: 3-5 langkah, menggunakan kalimat perintah santun, dan dilengkapi bahan/alat.",
              characteristics: [
                "Memiliki tujuan",
                "Menyebutkan bahan atau alat",
                "Langkah-langkah berurutan",
                "Menggunakan kata perintah santun"
              ],
              socialFunction: "Membantu anak melakukan sesuatu dengan benar dan aman.",
              lifeBenefits: "Anak dapat mengikuti instruksi dan melakukan kegiatan mandiri.",
              distinction: "Prosedur berbeda dengan cerita. Cerita menceritakan apa yang terjadi. Prosedur memberi petunjuk apa yang harus dilakukan."
            },
            contentComposition: {
              infoPoints: ["Petunjuk melakukan sesuatu.", "Langkah berurutan.", "Diawali kata kerja."],
              buildingElements: ["Tujuan", "Bahan", "Alat", "Langkah"],
              mainIdeas: ["Setiap kegiatan memiliki urutan benar.", "Urutan salah bisa gagal."],
              partRelationships: "Tujuan = hasil akhir. Bahan/alat = yang diperlukan. Langkah = cara mencapai tujuan.",
              simpleExample: "Cara Menanam Kacang Hijau. 1) Siapkan gelas dan kapas. 2) Basahi kapas. 3) Taruh biji."
            },
            textVariants: {
              types: ["prosedur membuat", "prosedur melakukan", "prosedur merawat"],
              variantDescriptions: [
                { name: "Membuat", description: "Petunjuk membuat sesuatu.", example: "Cara Membuat Mobil-mobilan dari Kardus." },
                { name: "Merawat", description: "Petunjuk merawat tanaman/hewan.", example: "Cara Merawat Tanaman Bunga." }
              ],
              groupingBasis: "Berdasarkan tujuan."
            },
            structurePattern: {
              generalPattern: [
                { name: "Mengenal Prosedur", description: "Guru menunjukkan contoh." },
                { name: "Identifikasi", description: "Tujuan, bahan, langkah." },
                { name: "Mempraktikkan", description: "Lakukan sesuai prosedur." },
                { name: "Menulis", description: "Tulis prosedur sendiri." }
              ],
              variationNotes: "Gambar langkah untuk siswa kesulitan.",
              readingGuide: "Baca semua langkah dulu sebelum praktik."
            },
            languageFeatures: {
              register: "Bahasa perintah santun.",
              features: [
                { name: "Kata Perintah", description: "Santun dengan -kan/-lah.", example: "Siapkan, Ambillah, Letakkan" },
                { name: "Kata Urutan", description: "Pertama, kedua, ketiga.", example: "Pertama, siapkan alat." }
              ],
              wordChoice: "siapkan, ambil, taruh, letakkan, aduk, tuang, potong.",
              sentencePattern: "Kata kerja + objek + keterangan.",
              conjunctions: "kemudian, lalu, setelah itu, sebelum",
              style: "Instruksional, jelas, langsung.",
              spelling: "Ejaan PUEBI.",
              punctuation: "Titik setiap langkah. Koma untuk daftar."
            },
            productionProcedure: {
              preProduction: "Contoh prosedur 'Cara Menanam Kacang Hijau'. Bahan dan alat.",
              production: [
                "Baca teks bersama.",
                "Identifikasi tujuan, bahan, langkah.",
                "Praktik menanam kacang hijau.",
                "Menulis prosedur kegiatan lain."
              ],
              revision: "Periksa urutan langkah.",
              editing: "Perbaiki kata perintah.",
              publication: "Tempel di dinding. 'Buku Prosedur Kelas II'.",
              bestPractices: ["Praktik langsung.", "Kegiatan aman dan mudah."]
            }
          },
          exampleText: {
            title: "Cara Membuat Jus Jeruk",
            content: "Bahan: 2 jeruk, 2 sdm gula, 1 gelas air, es batu. Alat: gelas, pisau, sendok, saringan. Langkah: 1) Cuci jeruk. 2) Potong jeruk. 3) Peras dan saring. 4) Masukkan ke gelas. 5) Tambah gula dan air. Aduk. 6) Masukkan es batu.",
            analysis: {
              structure: "Bahan, alat, langkah. Setiap langkah dinomori.",
              content: "Membuat minuman yang dekat anak.",
              language: "Kata perintah santun.",
              strengths: "Struktur lengkap, langkah urut.",
              improvements: "Gambar setiap langkah."
            }
          },
          learningActivities: {
            opening: ["Siapa pernah membuat sesuatu?", "Tunjukkan gelas jus."],
            core: ["Baca teks 'Cara Membuat Jus Jeruk'.", "Identifikasi bagian.", "Praktik membuat jus.", "Menulis prosedur."],
            group: ["Identifikasi bagian prosedur.", "Poster prosedur."],
            individual: ["Tulis prosedur 3-5 langkah.", "Gambar langkah."],
            reflection: ["Apa itu prosedur?", "Apa jika langkah terbalik?"]
          },
          worksheet: {
            title: "Lembar Kerja: Prosedur",
            purpose: "Memahami dan menulis prosedur.",
            instructions: ["Baca teks.", "Lengkapi.", "Tulis prosedur."],
            activities: [
              { name: "Struktur", items: ["Tujuan: …", "Bahan: …", "Jumlah langkah: …"] },
              { name: "Menulis", items: ["Pilih kegiatan.", "Tulis 3-5 langkah."] }
            ],
            studentOutput: "Teks prosedur 3-5 langkah."
          },
          assessment: {
            diagnostic: [{ question: "Sebutkan langkah membuat teh!", purpose: "Kemampuan awal." }],
            formative: [{ method: "Praktik", criteria: ["Urutan sesuai", "Berhasil"] }],
            summative: [{ type: "Produk", description: "Prosedur 3-5 langkah." }]
          },
          rubric: {
            aspects: [
              { name: "Menulis Prosedur", criteria: [
                { level: 4, description: "4-5 langkah, urut, kata perintah tepat." },
                { level: 3, description: "3 langkah, urut." },
                { level: 2, description: "2 langkah, kurang urut." },
                { level: 1, description: "Belum dapat." }
              ]}
            ]
          },
          differentiation: {
            support: ["Prosedur dengan gambar.", "Target 2-3 langkah."],
            regular: ["Ikuti rencana.", "Variasi jenis."],
            challenge: ["6-8 langkah.", "Bandingkan dua prosedur."]
          },
          remedial: ["Prosedur 2-3 langkah.", "Praktik berulang."],
          enrichment: ["Buku kumpulan prosedur.", "Video prosedur."],
          teacherNotes: {
            teachingStrategies: ["Kegiatan aman.", "Siapkan bahan sebelum pelajaran."],
            commonMisconceptions: [
              { misconception: "Urutan tidak penting.", correction: "Langkah terbalik bisa gagal." },
              { misconception: "Kata perintah kasar.", correction: "Gunakan 'siapkan', 'ambillah'." }
            ],
            feedbackGuide: ["Puji kerapian urutan."],
            classroomManagement: ["Siapkan bahan.", "Awasi praktik."]
          },
          reflection: {
            studentQuestions: ["Prosedur apa dipelajari?", "Apa jika langkah terbalik?"],
            teacherQuestions: ["Siswa bisa ikuti urutan?", "Praktik lancar?"]
          },
          readingPractice: {
            title: "Latihan Membaca: Prosedur",
            stimulusTitle: "Cara Membuat Lampion Kertas",
            stimulusText: "Bahan: kertas warna, gunting, lem, benang. Langkah: 1) Gunting kertas persegi panjang. 2) Lipat dua. 3) Gunting garis dari lipatan ke tepi. 4) Buka lipatan. 5) Rekatkan ujung. 6) Ikat benang.",
            questions: [
              { id: "r1-ii-bab6", type: "pilihan_ganda", questionText: "Apa yang dibuat?", options: ["Topi", "Lampion", "Mobil"], correctAnswer: "Lampion", explanation: "Lampion kertas.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab6", type: "pilihan_ganda", questionText: "Jumlah langkah?", options: ["3", "4", "5", "6"], correctAnswer: "6", explanation: "6 langkah.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab6", type: "jawaban_singkat", questionText: "Bahan utama?", correctAnswer: "Kertas warna", explanation: "Kertas warna.", skillTarget: "informasi tersurat", difficulty: "mudah" }
            ]
          },
          quickQuiz: {
            title: "Kuis Prosedur",
            questions: [
              { id: "q1-ii-bab6", type: "pilihan_ganda", questionText: "Teks prosedur berisi…", options: ["cerita", "petunjuk", "deskripsi"], correctAnswer: "petunjuk", explanation: "Petunjuk.", skillTarget: "pengertian", difficulty: "mudah" },
              { id: "q2-ii-bab6", type: "pilihan_ganda", questionText: "Contoh kata perintah santun?", options: ["Siapkan", "Ambil!", "Pergi!"], correctAnswer: "Siapkan", explanation: "Kata perintah santun.", skillTarget: "kebahasaan", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 1 Semester 2: Teks Prosedur Sederhana untuk Kelas II SD Fase A Kurikulum Merdeka. Fokus: memahami dan menulis prosedur 3-5 langkah. Struktur: tujuan, bahan/alat, langkah. Gunakan kata perintah santun. Durasi 12 JP x 35 menit. Sumber: CP Fase A Kurikulum Merdeka.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","Kurikulum Merdeka","teks prosedur","petunjuk"],
          isReady: false
        }
,
        {
          id: "ii-menulis-pengalaman",
          slug: "menulis-pengalaman-pribadi",
          grade: "II",
          phase: "A",
          semester: 2,
          chapterNumber: 7,
          title: "Bab 7: Menulis Pengalaman Pribadi",
          shortTitle: "Pengalaman",
          kd: "3.7/4.7",
          emoji: "📝",
          description: "Menulis pengalaman pribadi dalam beberapa kalimat runtut. Siswa belajar menceritakan kejadian yang dialami dengan urutan waktu yang tepat.",
          overview: "Setiap anak memiliki pengalaman berharga yang layak diceritakan. Bab ini mengajak siswa menulis pengalaman pribadi — kejadian menyenangkan, sedih, lucu, atau mengharukan yang mereka alami sendiri. Bab ini dimulai dengan bercerita lisan, lalu menulis panduan (5W+1H), dan akhirnya menulis cerita pengalaman yang runtut.",
          learningGoals: [
            "Mengingat pengalaman pribadi yang berkesan",
            "Mengurutkan kejadian sesuai urutan waktu",
            "Menulis 4-6 kalimat tentang pengalaman pribadi",
            "Menggunakan kata ganti aku, saya, atau nama sendiri",
            "Mengungkapkan perasaan dalam tulisan",
            "Membacakan cerita pengalaman di depan kelas"
          ],
          keywords: ["pengalaman","pribadi","cerita","urutan waktu","perasaan","narasi","aku"],
          suggestedDuration: "10 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Teks pengalaman pribadi adalah cerita berdasarkan kejadian nyata yang dialami sendiri. Untuk kelas II, teks ini sangat sederhana: 4-6 kalimat, menceritakan satu kejadian, dengan urutan waktu jelas, dan diakhiri perasaan penulis.",
              characteristics: [
                "Kejadian nyata yang dialami sendiri",
                "Sudut pandang orang pertama (aku/saya)",
                "Urutan waktu jelas",
                "Ada perasaan penulis"
              ],
              socialFunction: "Melatih anak merefleksikan kejadian dan mengekspresikan perasaan.",
              lifeBenefits: "Membantu anak mengkomunikasikan apa yang terjadi pada mereka.",
              distinction: "Berbeda dengan cerita khayal. Pengalaman pribadi adalah cerita nyata."
            },
            contentComposition: {
              infoPoints: ["Pengalaman adalah kejadian yang kita alami.", "Cerita menggunakan 'aku'.", "Urutan waktu membantu pemahaman."],
              buildingElements: ["Pembukaan: kapan, di mana", "Isi: urutan kejadian", "Penutup: perasaan"],
              mainIdeas: ["Setiap orang punya pengalaman berharga.", "Pengalaman bisa ditulis jadi cerita."],
              partRelationships: "Pembukaan = latar. Isi = urutan. Penutup = perasaan.",
              simpleExample: "Kemarin aku pergi ke kebun binatang. Aku melihat gajah. Aku senang sekali."
            },
            textVariants: {
              types: ["pengalaman menyenangkan", "pengalaman lucu", "pengalaman pertama kali"],
              variantDescriptions: [
                { name: "Menyenangkan", description: "Liburan, ulang tahun.", example: "Saat ulang tahun, ibu membuat kue." },
                { name: "Pertama Kali", description: "Pertama naik sepeda.", example: "Pertama naik sepeda, aku jatuh." }
              ],
              groupingBasis: "Berdasarkan jenis perasaan."
            },
            structurePattern: {
              generalPattern: [
                { name: "Mengingat", description: "Ingat pengalaman berkesan." },
                { name: "Bercerita Lisan", description: "Cerita ke teman." },
                { name: "Menulis Panduan", description: "5W+1H." },
                { name: "Menulis Cerita", description: "4-6 kalimat." }
              ],
              variationNotes: "Tema spesifik untuk siswa kesulitan mengingat.",
              readingGuide: "Bayangkan kamu di situ. Rasakan perasaan penulis."
            },
            languageFeatures: {
              register: "Bahasa sehari-hari santun.",
              features: [
                { name: "Kata Ganti Pertama", description: "aku, saya", example: "Aku pergi ke pantai." },
                { name: "Kata Waktu", description: "kemarin, tadi pagi", example: "Kemarin aku…" },
                { name: "Kata Perasaan", description: "senang, sedih", example: "Aku senang sekali." }
              ],
              wordChoice: "pergi, melihat, bermain, tertawa, jatuh.",
              sentencePattern: "S-P-O-K (waktu/tempat).",
              conjunctions: "'lalu', 'kemudian', 'setelah itu'.",
              style: "Alami seperti berbicara.",
              spelling: "Ejaan benar.",
              punctuation: "Titik, koma, tanda seru."
            },
            productionProcedure: {
              preProduction: "Foto/gambar pemicu ingatan. Kartu 5W+1H.",
              production: [
                "Guru bercerita tentang pengalamannya.",
                "Siswa berpasangan bercerita.",
                "Tulis panduan 5W+1H di papan.",
                "Siswa menulis cerita."
              ],
              revision: "Pertanyaan pancingan untuk mengingat.",
              editing: "Perbaiki urutan waktu.",
              publication: "'Kumpulan Pengalaman Kelas II'.",
              bestPractices: ["Contoh dari guru.", "Hargai setiap pengalaman."]
            }
          },
          exampleText: {
            title: "Liburan ke Rumah Nenek",
            content: "Saat liburan, aku pergi ke rumah nenek. Aku naik bus bersama ibu. Di desa, aku bermain dengan sepupu. Kami menangkap ikan di sungai. Nenek memasakkan ikan itu. Aku sedih saat harus pulang.",
            analysis: {
              structure: "Pembukaan, perjalanan, kegiatan, penutup dengan perasaan.",
              content: "Liburan ke desa — dekat anak Indonesia.",
              language: "Sudut pandang 'aku'. Kata waktu 'saat liburan'.",
              strengths: "Cerita nyata, urutan jelas, ada perasaan.",
              improvements: "Tambahkan dialog."
            }
          },
          learningActivities: {
            opening: ["Apa pengalaman paling berkesan?", "Guru bercerita."],
            core: ["Berpasangan bercerita.", "Panduan 5W+1H.", "Tulis cerita.", "Bacakan."],
            group: ["Cerita bergiliran.", "Pilih cerita terbaik."],
            individual: ["Tulis pengalaman.", "Gambar adegan."],
            reflection: ["Apa yang menarik dari cerita teman?"]
          },
          worksheet: {
            title: "Lembar Kerja: Pengalaman",
            purpose: "Menulis pengalaman runtut.",
            instructions: ["Ingat pengalaman.", "Jawab panduan.", "Tulis 4-6 kalimat."],
            activities: [
              { name: "Panduan", items: ["Siapa: …", "Kapan: …", "Di mana: …", "Apa terjadi: …", "Perasaan: …"] },
              { name: "Menulis", items: ["Tulis 4-6 kalimat.", "Mulai dengan kapan.", "Akhiri perasaan."] }
            ],
            studentOutput: "Cerita 4-6 kalimat."
          },
          assessment: {
            diagnostic: [{ question: "Ceritakan kegiatan kemarin!", purpose: "Kemampuan bercerita." }],
            formative: [{ method: "Tulisan", criteria: ["Pembukaan", "Urutan waktu", "Perasaan"] }],
            summative: [{ type: "Produk", description: "Cerita pengalaman 4-6 kalimat." }]
          },
          rubric: {
            aspects: [
              { name: "Kelengkapan", criteria: [
                { level: 4, description: "Ada pembukaan, isi, penutup. Urut jelas." },
                { level: 3, description: "Ada pembukaan, isi, penutup." },
                { level: 2, description: "Cerita belum lengkap." },
                { level: 1, description: "Belum dapat." }
              ]}
            ]
          },
          differentiation: {
            support: ["Panduan gambar.", "Target 3-4 kalimat.", "Guru menuliskan."],
            regular: ["Ikuti rencana.", "Tema berbeda."],
            challenge: ["8-10 kalimat.", "Tambahkan dialog.", "Dua pengalaman."]
          },
          remedial: ["Foto bantu ingat.", "Gambar berseri.", "Latihan bercerita lisan."],
          enrichment: ["Buku harian seminggu.", "Wawancara orang tua.", "Cerita komik."],
          teacherNotes: {
            teachingStrategies: ["Contoh dari guru.", "Hargai setiap cerita."],
            commonMisconceptions: [
              { misconception: "Cerita harus panjang.", correction: "4-6 kalimat cukup." },
              { misconception: "Harus luar biasa.", correction: "Pengalaman sederhana juga berharga." }
            ],
            feedbackGuide: ["Puji keberanian."],
            classroomManagement: ["Atur giliran.", "Tepuk tangan."]
          },
          reflection: {
            studentQuestions: ["Pengalaman apa yang ditulis?", "Bagaimana perasaanmu?"],
            teacherQuestions: ["Semua bisa ingat pengalaman?"]
          },
          readingPractice: {
            title: "Latihan Membaca: Pengalaman",
            stimulusTitle: "Pertama Kali Naik Sepeda",
            stimulusText: "Dua hari lalu, aku belajar naik sepeda. Ayah memegangi sepedaku. Aku mengayuh perlahan. Tiba-tiba aku terjatuh. Lututku lecet. Ayah berkata 'Ayo coba lagi!' Aku mencoba lagi. Kini aku bisa. Aku senang sekali.",
            questions: [
              { id: "r1-ii-bab7", type: "pilihan_ganda", questionText: "Apa yang dipelajari?", options: ["Berenang", "Naik sepeda", "Memasak"], correctAnswer: "Naik sepeda", explanation: "Belajar naik sepeda.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab7", type: "pilihan_ganda", questionText: "Siapa yang membantu?", options: ["Ibu", "Ayah", "Teman"], correctAnswer: "Ayah", explanation: "Ayah membantu.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab7", type: "jawaban_singkat", questionText: "Apa yang terjadi saat jatuh?", correctAnswer: "Lutut lecet", explanation: "Lutut lecet.", skillTarget: "informasi tersurat", difficulty: "mudah" }
            ]
          },
          quickQuiz: {
            title: "Kuis Pengalaman",
            questions: [
              { id: "q1-ii-bab7", type: "pilihan_ganda", questionText: "Kata ganti untuk pengalaman pribadi?", options: ["dia", "mereka", "aku"], correctAnswer: "aku", explanation: "Menggunakan aku.", skillTarget: "kebahasaan", difficulty: "mudah" },
              { id: "q2-ii-bab7", type: "pilihan_ganda", questionText: "Contoh kata waktu?", options: ["senang", "kemarin", "karena"], correctAnswer: "kemarin", explanation: "Kata waktu.", skillTarget: "kebahasaan", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 2 Semester 2: Menulis Pengalaman Pribadi untuk Kelas II SD Fase A. Fokus: menulis 4-6 kalimat dengan urutan waktu dan perasaan. Gunakan 'aku'. Durasi 10 JP x 35 menit. Sumber: CP Fase A.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","pengalaman pribadi","menulis","narasi"],
          isReady: false
        }
,
        {
          id: "ii-menanggapi-cerita",
          slug: "menanggapi-cerita",
          grade: "II",
          phase: "A",
          semester: 2,
          chapterNumber: 8,
          title: "Bab 8: Menanggapi Cerita",
          shortTitle: "Menanggapi",
          kd: "3.8/4.8",
          emoji: "💬",
          description: "Menanggapi cerita dengan pertanyaan dan komentar sederhana. Siswa belajar menyampaikan pendapat tentang isi cerita.",
          overview: "Setelah membaca atau mendengar cerita, siswa perlu merespons. Bab 3 melatih siswa menanggapi cerita — bertanya tentang tokoh, mengomentari alur, dan menyampaikan pendapat. Siswa belajar bahwa cerita bisa dinikmati dan didiskusikan. Kegiatan dimulai dengan tanya jawab sederhana lalu menulis tanggapan.",
          learningGoals: [
            "Menyebutkan tokoh dan watak dalam cerita",
            "Menanyakan hal yang tidak dimengerti",
            "Mengomentari bagian cerita yang disukai/tidak",
            "Menghubungkan cerita dengan pengalaman sendiri",
            "Menyampaikan pendapat dalam 2-3 kalimat",
            "Mendengarkan tanggapan teman dengan baik"
          ],
          keywords: ["tanggapan","cerita","pendapat","tokoh","alur","komentar","pertanyaan"],
          suggestedDuration: "10 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Menanggapi cerita berarti menyampaikan reaksi, pendapat, atau pertanyaan setelah membaca/mendengar cerita. Untuk kelas II, tanggapan sederhana seperti \"Aku suka tokoh Kancil karena pintar\" sudah cukup.",
              characteristics: [
                "Berdasarkan cerita yang dibaca atau didengar",
                "Bersifat subyektif — boleh suka atau tidak",
                "Menggunakan alasan sederhana",
                "Disampaikan secara lisan atau tulisan"
              ],
              socialFunction: "Melatih berpikir kritis dan menghargai pendapat orang lain.",
              lifeBenefits: "Anak belajar mengekspresikan reaksi terhadap informasi.",
              distinction: "Berbeda dengan 'meringkas'. Tanggapan adalah reaksi pribadi."
            },
            contentComposition: {
              infoPoints: ["Cerita bisa ditanggapi.", "Tanggapan bukan benar/salah.", "Alasan penting."],
              buildingElements: ["Pendapat: aku suka/tidak suka", "Alasan: karena…", "Pertanyaan: mengapa…"],
              mainIdeas: ["Cerita bisa dinikmati dan didiskusikan.", "Setiap orang punya tanggapan berbeda."],
              partRelationships: "Pendapat + alasan = tanggapan yang baik.",
              simpleExample: "Aku suka cerita ini. Karena lucu."
            },
            textVariants: {
              types: ["tanggapan lisan", "tanggapan tulisan", "tanggapan gambar"],
              variantDescriptions: [
                { name: "Lisan", description: "Langsung setelah bercerita.", example: "Aku suka cerita ini karena seru." },
                { name: "Tulisan", description: "Buku tanggapan.", example: "Menurutku cerita ini bagus." }
              ],
              groupingBasis: "Berdasarkan media."
            },
            structurePattern: {
              generalPattern: [
                { name: "Membaca/Mendengar", description: "Simak cerita." },
                { name: "Merespons", description: "Pendapat + alasan." },
                { name: "Berbagi", description: "Diskusi." }
              ],
              variationNotes: "Pertanyaan terbuka untuk siswa pemalu.",
              readingGuide: "Apa yang kamu rasakan saat membaca ini?"
            },
            languageFeatures: {
              register: "Bahasa santun.",
              features: [
                { name: "Kata Suka/Tidak", description: "suka, tidak suka", example: "Aku suka…" },
                { name: "Kata Alasan", description: "karena, sebab", example: "…karena lucu." }
              ],
              wordChoice: "suka, bagus, menarik, lucu, sedih.",
              sentencePattern: "Pendapat + karena + alasan.",
              conjunctions: "'karena', 'sebab'.",
              style: "Sederhana dan jujur.",
              spelling: "Ejaan benar.",
              punctuation: "Titik, koma."
            },
            productionProcedure: {
              preProduction: "Buku cerita. Kartu pertanyaan.",
              production: [
                "Guru membacakan cerita.",
                "Tanya jawab tokoh dan alur.",
                "Siswa menulis tanggapan.",
                "Berbagi dengan teman."
              ],
              revision: "Guru bertanya 'apa lagi?'.",
              editing: "Perbaiki ejaan.",
              publication: "'Buku Tanggapan Kelas II'.",
              bestPractices: ["Hargai semua tanggapan."]
            }
          },
          exampleText: {
            title: "Tanggapan tentang Kancil",
            content: "Aku suka cerita Kancil dan Buaya. Kancil pintar. Ia bisa menipu buaya. Aku ingin pintar seperti Kancil. Tapi buaya kasihan juga.",
            analysis: {
              structure: "Pendapat, alasan, harapan, empati.",
              content: "Cerita Kancil familiar.",
              language: "Sederhana.",
              strengths: "Ada pendapat, alasan, dan empati.",
              improvements: "Tambahkan pertanyaan."
            }
          },
          learningActivities: {
            opening: ["Siapa suka cerita?", "Cerita apa yang diingat?"],
            core: ["Dengar cerita.", "Tanya jawab.", "Tulis tanggapan.", "Presentasi."],
            group: ["Diskusi kelompok.", "Tukar tanggapan."],
            individual: ["Tulis tanggapan.", "Gambar adegan."],
            reflection: ["Apa pendapat teman yang menarik?"]
          },
          worksheet: {
            title: "Lembar Kerja: Menanggapi",
            purpose: "Menulis tanggapan cerita.",
            instructions: ["Baca cerita.", "Tulis tanggapan."],
            activities: [
              { name: "Panduan", items: ["Judul cerita:", "Tokoh:", "Pendapatku:", "Karena:"] },
              { name: "Pertanyaan", items: ["Apa yang ingin ditanyakan?"] }
            ],
            studentOutput: "Tanggapan 2-3 kalimat."
          },
          assessment: {
            diagnostic: [{ question: "Apa cerita favoritmu?", purpose: "Ketertarikan." }],
            formative: [{ method: "Observasi", criteria: ["Keberanian bicara", "Kualitas alasan"] }],
            summative: [{ type: "Produk", description: "Tanggapan cerita 2-3 kalimat." }]
          },
          rubric: {
            aspects: [
              { name: "Ketepatan", criteria: [
                { level: 4, description: "Pendapat jelas + alasan kuat." },
                { level: 3, description: "Pendapat jelas, alasan ada." },
                { level: 2, description: "Pendapat ada tanpa alasan." },
                { level: 1, description: "Belum dapat." }
              ]}
            ]
          },
          differentiation: {
            support: ["Pertanyaan pilihan.", "Bantuan guru.", "Lisan saja."],
            regular: ["Cerita berbeda.", "Menulis 2-3 kalimat."],
            challenge: ["4-5 kalimat.", "Bandingkan cerita.", "Saran untuk tokoh."]
          },
          remedial: ["Gambar berseri.", "Roleplay tokoh.", "Latihan lisan."],
          enrichment: ["Tulis ulang akhir cerita.", "Buat cerita lanjutan.", "Surat untuk tokoh."],
          teacherNotes: {
            teachingStrategies: ["Bacakan ekspresif.", "Hargai perbedaan."],
            commonMisconceptions: [
              { misconception: "Tanggapan harus benar.", correction: "Tanggapan adalah pendapat pribadi." }
            ],
            feedbackGuide: ["Tanya 'mengapa'."],
            classroomManagement: ["Atur giliran bicara."]
          },
          reflection: {
            studentQuestions: ["Apa yang menarik?", "Apakah pendapatmu didengar?"],
            teacherQuestions: ["Semua berani bicara?"]
          },
          readingPractice: {
            title: "Latihan Membaca: Tanggapan",
            stimulusTitle: "Kancil dan Siput",
            stimulusText: "Kancil bertemu Siput. Kancil mengejek Siput lambat. Siput tersinggung. Ia menantang lomba lari Kancil. Saat lomba, Siput bersembunyi di dekat garis finis. Kancil kaget. Siput menang. Kancil malu. Ia belajar tidak boleh mengejek.",
            questions: [
              { id: "r1-ii-bab8", type: "pilihan_ganda", questionText: "Siapa yang diejek Kancil?", options: ["Buaya", "Siput", "Kelinci"], correctAnswer: "Siput", explanation: "Kancil mengejek Siput.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab8", type: "pilihan_ganda", questionText: "Mengapa Siput tersinggung?", options: ["Diejek lambat", "Kalah lomba", "Jatuh"], correctAnswer: "Diejek lambat", explanation: "Siput tersinggung karena diejek.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab8", type: "pilihan_ganda", questionText: "Siapa pemenang lomba?", options: ["Kancil", "Siput", "Seri"], correctAnswer: "Siput", explanation: "Siput menang.", skillTarget: "informasi tersurat", difficulty: "mudah" }
            ]
          },
          quickQuiz: {
            title: "Kuis Menanggapi",
            questions: [
              { id: "q1-ii-bab8", type: "pilihan_ganda", questionText: "Apa itu menanggapi cerita?", options: ["Meringkas", "Memberi pendapat", "Menghafal"], correctAnswer: "Memberi pendapat", explanation: "Menanggapi = memberi pendapat.", skillTarget: "pemahaman konsep", difficulty: "mudah" },
              { id: "q2-ii-bab8", type: "pilihan_ganda", questionText: "Kata untuk memberi alasan?", options: ["dan", "karena", "lalu"], correctAnswer: "karena", explanation: "Karena untuk alasan.", skillTarget: "kebahasaan", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 3 Semester 2: Menanggapi Cerita untuk Kelas II SD Fase A. Fokus: menanggapi cerita dengan pendapat dan alasan sederhana. Durasi 10 JP x 35 menit. Sumber: CP Fase A, Elemen Berbicara dan Menulis.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","menanggapi","cerita","pendapat","diskusi"],
          isReady: false
        }
,
        {
          id: "ii-ejaan-tanda-baca",
          slug: "ejaan-dan-tanda-baca-dasar",
          grade: "II",
          phase: "A",
          semester: 2,
          chapterNumber: 9,
          title: "Bab 9: Ejaan dan Tanda Baca Dasar",
          shortTitle: "Ejaan",
          kd: "3.7/4.7",
          emoji: "🔤",
          description: "Menggunakan huruf kapital, tanda titik, dan tanda tanya dengan benar. Siswa belajar aturan ejaan dasar dalam menulis.",
          overview: "Bab ini mengajarkan ejaan dasar: huruf kapital di awal kalimat dan nama orang, tanda titik di akhir kalimat, dan tanda tanya untuk pertanyaan. Bab ini menggunakan latihan menyenangkan — memperbaiki kalimat, menulis ulang, dan bermain 'Detektif Ejaan'."
          ,
          learningGoals: [
            "Menggunakan huruf kapital di awal kalimat",
            "Menulis nama orang dengan huruf kapital",
            "Menempatkan tanda titik di akhir kalimat",
            "Menggunakan tanda tanya untuk kalimat tanya",
            "Memperbaiki kesalahan ejaan sederhana",
            "Menulis 3-4 kalimat dengan ejaan benar"
          ],
          keywords: ["huruf kapital","tanda titik","tanda tanya","ejaan","tanda baca","kalimat"],
          suggestedDuration: "12 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Ejaan adalah aturan penulisan huruf dan tanda baca. Untuk kelas II, fokus pada huruf kapital, tanda titik, dan tanda tanya sebagai dasar menulis yang rapi dan benar.",
              characteristics: [
                "Huruf kapital di awal kalimat",
                "Nama orang pakai huruf kapital",
                "Titik di akhir kalimat berita",
                "Tanda tanya di akhir kalimat tanya",
                "Diterapkan setiap hari"
              ],
              socialFunction: "Membantu orang lain membaca tulisan dengan mudah.",
              lifeBenefits: "Tulisan rapi = pesan jelas.",
              distinction: "Ejaan bukan 'hiasan' — aturan wajib."
            },
            contentComposition: {
              infoPoints: ["Kapital di awal.", "Nama orang kapital.", "Titik akhir.", "Tanya pakai ?"],
              buildingElements: ["Awal kalimat: Kapital", "Akhir berita: .", "Akhir tanya: ?"],
              mainIdeas: ["Ejaan membuat tulisan benar.", "Aturan sederhana, manfaat besar."],
              partRelationships: "Kapital + titik/tanya = kalimat benar.",
              simpleExample: "Adi bermain bola. Siapa namamu?"
            },
            textVariants: {
              types: ["kalimat berita", "kalimat tanya"],
              variantDescriptions: [
                { name: "Berita", description: "Akhir titik.", example: "Aku makan." },
                { name: "Tanya", description: "Akhir tanda tanya.", example: "Kamu sudah makan?" }
              ],
              groupingBasis: "Berdasarkan jenis kalimat."
            },
            structurePattern: {
              generalPattern: [
                { name: "Mengenal Aturan", description: "Kenalkan satu aturan per pertemuan." },
                { name: "Contoh", description: "Tunjukkan contoh di papan." },
                { name: "Latihan Terbimbing", description: "Perbaiki kalimat bersama." },
                { name: "Latihan Mandiri", description: "Tulis kalimat sendiri." }
              ],
              variationNotes: "Mulai dari aturan yang paling sering dipakai (kapital dan titik).",
              readingGuide: "Baca kalimat dan perhatikan huruf pertama serta tanda akhir."
            },
            languageFeatures: {
              register: "Formal dan santun.",
              features: [
                { name: "Huruf Kapital", description: "Awal kalimat", example: "Aku…" },
                { name: "Tanda Titik", description: "Akhir berita", example: "…sekolah." },
                { name: "Tanda Tanya", description: "Akhir tanya", example: "…pulang?" }
              ],
              wordChoice: "Sesuai tema.",
              sentencePattern: "S-P-O + tanda baca.",
              conjunctions: "-",
              style: "Rapi dan konsisten.",
              spelling: "Benar sesuai PUEBI.",
              punctuation: "Titik, tanda tanya, koma."
            },
            productionProcedure: {
              preProduction: "Kartu kalimat. Poster aturan.",
              production: [
                "Kenalkan aturan satu per satu.",
                "Contoh di papan.",
                "Perbaiki kalimat rusak.",
                "Tulis kalimat sendiri."
              ],
              revision: "Detektif Ejaan — cari kesalahan.",
              editing: "Perbaiki ejaan.",
              publication: "'Buku Ejaan Kelas II'.",
              bestPractices: ["Konsisten setiap pelajaran."]
            }
          },
          exampleText: {
            title: "Kalimat dengan Ejaan Benar",
            content: "Rina pergi ke pasar. Ia membeli sayur. Apakah kamu mau ikut?",
            analysis: {
              structure: "Dua berita, satu tanya.",
              content: "Aktivitas sehari-hari.",
              language: "R: Kapital. Titik. Tanda tanya.",
              strengths: "Semua benar.",
              improvements: "Bisa ditambah koma."
            }
          },
          learningActivities: {
            opening: ["Mana yang benar: 'aku' atau 'Aku'?", "Hitung kesalahan di papan."],
            core: ["Pelajari aturan.", "Latihan perbaiki.", "Tulis kalimat."],
            group: ["Lomba Detektif Ejaan.", "Perbaiki paragraf."],
            individual: ["Latihan soal.", "Tulis 3 kalimat."],
            reflection: ["Aturan apa paling berguna?"]
          },
          worksheet: {
            title: "Lembar Kerja: Ejaan",
            purpose: "Menerapkan ejaan benar.",
            instructions: ["Perbaiki kalimat.", "Tulis ulang."],
            activities: [
              { name: "Perbaiki", items: ["rini pergi ke sekolah →", "dimana buku kamu →"] },
              { name: "Tulis", items: ["Satu kalimat berita.", "Satu kalimat tanya."] }
            ],
            studentOutput: "3 kalimat benar."
          },
          assessment: {
            diagnostic: [{ question: "Tulis satu kalimat!", purpose: "Melihat ejaan awal." }],
            formative: [{ method: "Latihan", criteria: ["Kapital", "Titik", "Tanda tanya"] }],
            summative: [{ type: "Tes", description: "Perbaiki 5 kalimat." }]
          },
          rubric: {
            aspects: [
              { name: "Ejaan", criteria: [
                { level: 4, description: "Semua benar." },
                { level: 3, description: "1-2 kesalahan." },
                { level: 2, description: "3-4 kesalahan." },
                { level: 1, description: ">4 kesalahan." }
              ]}
            ]
          },
          differentiation: {
            support: ["Kartu aturan di meja.", "3 soal."],
            regular: ["5-6 soal.", "Campur berita dan tanya."],
            challenge: ["Perbaiki paragraf 5 kalimat.", "Tambahkan koma."]
          },
          remedial: ["Flashcard aturan.", "Latihan per aturan."],
          enrichment: ["Buat poster aturan.", "Detektif Ejaan di buku."],
          teacherNotes: {
            teachingStrategies: ["Poster di dinding.", "Konsisten."],
            commonMisconceptions: [
              { misconception: "Kapital di semua kata.", correction: "Kapital di awal kalimat dan nama." },
              { misconception: "Tanya = suara keras.", correction: "Tanya = butuh jawaban." }
            ],
            feedbackGuide: ["Tunjukkan kesalahan."],
            classroomManagement: ["Game lomba perbaiki."]
          },
          reflection: {
            studentQuestions: ["Aturan mana yang sulit?", "Mengapa ejaan penting?"],
            teacherQuestions: ["Siswa konsisten?"]
          },
          readingPractice: {
            title: "Latihan Membaca dan Memperbaiki",
            stimulusTitle: "Pergi ke Perpustakaan",
            stimulusText: "hari ini aku pergi ke perpustakaan. ibu guru meminjamkan buku. judulnya si kancil mencuri timun. aku suka sekali. apakah kamu suka membaca",
            questions: [
              { id: "r1-ii-bab9", type: "pilihan_ganda", questionText: "Berapa kesalahan kapital?", options: ["2", "3", "4"], correctAnswer: "4", explanation: "hari → Hari, si → Si, aku → Aku (2x).", skillTarget: "ejaan", difficulty: "sedang" },
              { id: "r2-ii-bab9", type: "pilihan_ganda", questionText: "Kalimat terakhir kurang apa?", options: ["Titik", "Tanda tanya", "Kapital"], correctAnswer: "Tanda tanya", explanation: "Kalimat tanya butuh ?.", skillTarget: "ejaan", difficulty: "sedang" }
            ]
          },
          quickQuiz: {
            title: "Kuis Ejaan",
            questions: [
              { id: "q1-ii-bab9", type: "pilihan_ganda", questionText: "Mana yang benar?", options: ["adi bermain", "Adi bermain", "adi Bermain"], correctAnswer: "Adi bermain", explanation: "Nama pakai kapital.", skillTarget: "ejaan", difficulty: "mudah" },
              { id: "q2-ii-bab9", type: "pilihan_ganda", questionText: "Akhir kalimat tanya pakai…", options: [".", "?", "!"], correctAnswer: "?", explanation: "Tanda tanya.", skillTarget: "ejaan", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 4 Semester 2: Ejaan dan Tanda Baca Dasar untuk Kelas II SD Fase A. Fokus: huruf kapital di awal kalimat dan nama orang, tanda titik, tanda tanya. Durasi 12 JP x 35 menit. Sumber: CP Fase A Elemen Menulis.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","ejaan","tanda baca","huruf kapital","tanda titik"],
          isReady: false
        }
,
        {
          id: "ii-membaca-cerpen",
          slug: "membaca-cerita-pendek",
          grade: "II",
          phase: "A",
          semester: 2,
          chapterNumber: 10,
          title: "Bab 10: Membaca Cerita Pendek",
          shortTitle: "Cerita Pendek",
          kd: "3.8/4.8",
          emoji: "📖",
          description: "Membaca dan memahami cerita pendek sederhana. Siswa belajar mengidentifikasi tokoh, latar, alur, dan pesan moral dari cerita.",
          overview: "Bab terakhir menutup Kelas II dengan membaca cerita pendek sederhana. Siswa diajak membaca mandiri, memahami tokoh, latar tempat dan waktu, serta pesan dari cerita. Bab ini juga mengajak siswa menceritakan kembali isi cerita dengan kata-kata sendiri. Kegiatan membaca diakhiri dengan refleksi tentang apa yang dipelajari dari cerita.",
          learningGoals: [
            "Membaca cerita pendek dengan lancar",
            "Menjawab pertanyaan tentang isi cerita",
            "Mengidentifikasi tokoh dan karakter tokoh",
            "Menyebutkan latar tempat dan waktu cerita",
            "Menceritakan kembali isi cerita",
            "Menyimpulkan pesan moral cerita"
          ],
          keywords: ["cerita pendek","tokoh","latar","alur","pesan moral","membaca","pemahaman"],
          suggestedDuration: "12 JP x 35 menit",
          teachingContent: {
            textNature: {
              definition: "Cerita pendek (cerpen) adalah cerita yang selesai dibaca dalam sekali duduk. Untuk kelas II, cerpen sangat pendek — 50-100 kata, satu konflik sederhana, tokoh sedikit, dan pesan moral yang jelas.",
              characteristics: [
                "Pendek — 50-100 kata",
                "Tokoh 2-3 orang atau binatang",
                "Alur sederhana: awal-masalah-selesai",
                "Pesan moral tersurat",
                "Bahasa sederhana"
              ],
              socialFunction: "Menghibur sekaligus memberi pelajaran.",
              lifeBenefits: "Menumbuhkan kegemaran membaca.",
              distinction: "Berbeda dengan dongeng. Cerpen bisa nyata atau rekaan."
            },
            contentComposition: {
              infoPoints: ["Cerpen pendek dan padat.", "Ada tokoh dan latar.", "Ada pesan moral."],
              buildingElements: ["Tokoh", "Latar (tempat/waktu)", "Masalah", "Penyelesaian", "Pesan"],
              mainIdeas: ["Cerpen punya cerita utuh.", "Cerpen mengajarkan sesuatu."],
              partRelationships: "Tokoh + latar + masalah → penyelesaian → pesan.",
              simpleExample: "Kancil ingin makan. Ia lihat timun. Ia curi. Petani marah. Kancil lari."
            },
            textVariants: {
              types: ["cerpen binatang", "cerpen persahabatan", "cerpen sehari-hari"],
              variantDescriptions: [
                { name: "Binatang", description: "Tokoh binatang berprilaku manusia.", example: "Kancil curi timun." },
                { name: "Persahabatan", description: "Cerita tentang teman.", example: "Dua sahabat berdebat." },
                { name: "Sehari-hari", description: "Kejadian biasa.", example: "Bangun pagi." }
              ],
              groupingBasis: "Berdasarkan tema/tokoh."
            },
            structurePattern: {
              generalPattern: [
                { name: "Awal", description: "Kenalkan tokoh dan latar." },
                { name: "Masalah", description: "Konflik dimulai." },
                { name: "Akhir", description: "Masalah selesai." },
                { name: "Pesan", description: "Apa yang dipelajari." }
              ],
              variationNotes: "Beberapa cerpen langsung ke masalah.",
              readingGuide: "Siapa? Di mana? Apa masalahnya? Selesai bagaimana?"
            },
            languageFeatures: {
              register: "Bahasa naratif sederhana.",
              features: [
                { name: "Kata Tokoh", description: "nama atau kata ganti", example: "Kancil, ia" },
                { name: "Kata Latar", description: "di hutan, pada pagi hari", example: "Di kebun" },
                { name: "Kata Aksi", description: "berlari, memakan", example: "Kancil berlari." }
              ],
              wordChoice: "lari, makan, marah, senang, sedih.",
              sentencePattern: "S-P-O atau S-P-K.",
              conjunctions: "lalu, kemudian, tetapi.",
              style: "Langsung dan sederhana.",
              spelling: "Benar.",
              punctuation: "Titik, koma, tanda seru."
            },
            productionProcedure: {
              preProduction: "Buku cerpen anak. Kartu tanya.",
              production: [
                "Guru bacakan cerpen.",
                "Siswa baca bergantian.",
                "Tanya jawab isi cerita.",
                "Identifikasi tokoh, latar, pesan.",
                "Ceritakan kembali."
              ],
              revision: "Guru bantu urutkan cerita.",
              editing: "-",
              publication: "'Antologi Cerpen Kelas II'.",
              bestPractices: ["Pilih cerpen dekat anak."]
            }
          },
          exampleText: {
            title: "Cerita Pendek: Semut dan Merpati",
            content: "Semut jatuh ke sungai. Ia hampir tenggelam. Merpati melihat. Merpati melempar daun. Semut naik ke daun. Semut selamat. Semut berterima kasih. \"Aku akan membantumu,\" kata Semut. Beberapa hari kemudian, pemburu hendak menangkap Merpati. Semut menggigit kaki pemburu. Pemburu kesakitan. Merpati terbang. Mereka bersahabat.",
            analysis: {
              structure: "Awal (Semut jatuh) → masalah (tenggelam) → bantuan → balas budi → persahabatan.",
              content: "Kebaikan dibalas kebaikan.",
              language: "Sederhana, dialog pendek.",
              strengths: "Pesan moral jelas, alur lengkap.",
              improvements: "Latar tempat bisa diperjelas."
            }
          },
          learningActivities: {
            opening: ["Siapa suka baca cerita?", "Cerita apa yang diingat?"],
            core: ["Baca cerpen.", "Tanya jawab.", "Identifikasi tokoh.", "Ceritakan kembali."],
            group: ["Baca bergiliran.", "Diskusi pesan moral."],
            individual: ["Tulis tokoh dan latar.", "Gambar adegan."],
            reflection: ["Pesan apa dari cerita?", "Cerita apa yang paling disukai?"]
          },
          worksheet: {
            title: "Lembar Kerja: Cerita Pendek",
            purpose: "Memahami cerita pendek.",
            instructions: ["Baca cerita.", "Jawab pertanyaan."],
            activities: [
              { name: "Identifikasi", items: ["Tokoh:", "Latar:", "Masalah:", "Pesan:"] },
              { name: "Ceritakan Kembali", items: ["Tulis 4-5 kalimat."] }
            ],
            studentOutput: "Identifikasi + ringkasan."
          },
          assessment: {
            diagnostic: [{ question: "Baca 3 kalimat. Siapa tokohnya?", purpose: "Kemampuan identifikasi." }],
            formative: [{ method: "Tanya jawab", criteria: ["Pemahaman isi", "Identifikasi tokoh/latar"] }],
            summative: [{ type: "Tes", description: "Baca cerpen baru, jawab 5 pertanyaan." }]
          },
          rubric: {
            aspects: [
              { name: "Pemahaman", criteria: [
                { level: 4, description: "Semua benar." },
                { level: 3, description: "3-4 benar." },
                { level: 2, description: "1-2 benar." },
                { level: 1, description: "Tidak bisa." }
              ]}
            ]
          },
          differentiation: {
            support: ["Cerpen sangat pendek.", "Bantuan guru.", "Soal lisan."],
            regular: ["Cerpen 50-70 kata.", "Soal tertulis."],
            challenge: ["Cerpen 100+ kata.", "Bandingkan dua cerpen.", "Tulis ulang akhir cerita."]
          },
          remedial: ["Cerpen bergambar.", "Baca bersama guru.", "Pertanyaan pilihan ganda."],
          enrichment: ["Kumpulan cerpen.", "Buat cerpen sendiri.", "Buku harian baca."],
          teacherNotes: {
            teachingStrategies: ["Bacakan ekspresif.", "Berhenti di bagian seru."],
            commonMisconceptions: [
              { misconception: "Semua kata harus dibaca benar.", correction: "Pemahaman isi lebih penting." },
              { misconception: "Cerpen harus dihafal.", correction: "Cerpen dipahami, bukan dihafal." }
            ],
            feedbackGuide: ["Puji kelancaran.", "Tanya pemahaman."],
            classroomManagement: ["Sudut baca nyaman."]
          },
          reflection: {
            studentQuestions: ["Cerita apa yang mengesankan?", "Apa yang dipelajari dari cerita?"],
            teacherQuestions: ["Siswa bisa membaca mandiri?", "Paham isi cerita?"]
          },
          readingPractice: {
            title: "Latihan Membaca: Cerpen",
            stimulusTitle: "Kucing dan Burung",
            stimulusText: "Kucing melihat burung di pohon. Kucing ingin menangkapnya. Ia memanjat pelan-pelan. Burung melihat Kucing. Burung terbang. Kucing jatuh. Kucing sakit. Ia belajar bahwa tidak semua keinginan tercapai.",
            questions: [
              { id: "r1-ii-bab10", type: "pilihan_ganda", questionText: "Apa yang ingin dilakukan Kucing?", options: ["Tidur", "Menangkap burung", "Makan"], correctAnswer: "Menangkap burung", explanation: "Kucing ingin menangkap burung.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r2-ii-bab10", type: "pilihan_ganda", questionText: "Mengapa Kucing gagal?", options: ["Kucing lapar", "Burung terbang", "Kucing lelah"], correctAnswer: "Burung terbang", explanation: "Burung terbang — kucing gagal.", skillTarget: "informasi tersurat", difficulty: "mudah" },
              { id: "r3-ii-bab10", type: "jawaban_singkat", questionText: "Apa yang dipelajari Kucing?", correctAnswer: "Tidak semua keinginan tercapai.", explanation: "Pesan moral.", skillTarget: "pesan moral", difficulty: "sedang" }
            ]
          },
          quickQuiz: {
            title: "Kuis Cerpen",
            questions: [
              { id: "q1-ii-bab10", type: "pilihan_ganda", questionText: "Tokoh adalah…", options: ["Tempat cerita", "Pelaku cerita", "Akhir cerita"], correctAnswer: "Pelaku cerita", explanation: "Tokoh = pelaku.", skillTarget: "pemahaman konsep", difficulty: "mudah" },
              { id: "q2-ii-bab10", type: "pilihan_ganda", questionText: "Pesan moral adalah…", options: ["Tempat cerita", "Apa yang dipelajari", "Nama tokoh"], correctAnswer: "Apa yang dipelajari", explanation: "Pesan moral = pelajaran.", skillTarget: "pemahaman konsep", difficulty: "mudah" }
            ]
          },
          aiContextPrompt: "Materi Bab 5 Semester 2: Membaca Cerita Pendek untuk Kelas II SD Fase A. Fokus: membaca pemahaman cerpen 50-100 kata, identifikasi tokoh, latar, masalah, pesan moral. Durasi 12 JP x 35 menit. Sumber: CP Fase A Elemen Membaca. Catatan: Bab penutup Kelas II — siswa diharapkan bisa membaca mandiri dan memahami cerita sederhana.",
          sourceBasis: "cp-atp-research",
          reviewStatus: "needs-review",
          tags: ["SD","Kelas II","Fase A","cerpen","membaca","pemahaman","tokoh","pesan moral"],
          isReady: false
        }
      ]
    }
  ]
};
