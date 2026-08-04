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
          kd: "Menulis",
          emoji: "📰",
          description: "Menganalisis dan menulis teks berita dengan unsur ADIKSIMBA yang lengkap serta bahasa yang singkat, padat, objektif, dan informatif.",
          overview: "Berita ada di sekitar kita setiap hari — dari media sosial, koran, televisi, hingga percakapan sehari-hari. Bab ini mengajak siswa menjadi pembaca dan penulis berita yang cerdas. Siswa akan belajar mengidentifikasi unsur-unsur berita menggunakan ADIKSIMBA, menganalisis struktur piramida terbalik, dan menulis berita dengan bahasa jurnalistik yang objektif. Dari sekadar konsumen informasi, siswa akan berubah menjadi produsen informasi yang bertanggung jawab. Pembelajaran dimulai dengan membaca berita aktual, mengupas unsur dan strukturnya, lalu berlatih menulis berita berdasarkan peristiwa nyata di lingkungan sekolah.",
          learningGoals: [
            "Memahami pengertian, ciri-ciri, dan unsur teks berita (ADIKSIMBA)",
            "Menganalisis struktur piramida terbalik dalam teks berita",
            "Membedakan fakta dan opini serta kalimat langsung dan tidak langsung dalam berita",
            "Menulis teks berita dengan unsur ADIKSIMBA lengkap dan bahasa objektif",
            "Menyajikan berita secara lisan dengan intonasi dan ekspresi yang tepat",
          ],
          keywords: ["berita","ADIKSIMBA","piramida terbalik","fakta","opini","kalimat langsung","lead","jurnalistik","objektif","narasumber"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Teks berita adalah teks yang menyajikan laporan tentang suatu peristiwa atau kejadian faktual, terkini, dan menarik perhatian masyarakat. Berita disusun berdasarkan fakta di lapangan, bukan opini atau imajinasi penulis. Berita yang baik bersifat informatif, objektif, dan menggunakan bahasa yang mudah dipahami oleh pembaca sasaran. Pendekatan ADIKSIMBA menjadi kerangka utama dalam menyusun berita yang lengkap.",
              characteristics: [
                "Faktual dan aktual — berdasarkan fakta nyata dan peristiwa terkini",
                "Objektif — tidak memihak dan tidak mengandung opini penulis",
                "Singkat, padat, dan jelas — informasi disampaikan secara efisien",
                "Menarik perhatian pembaca melalui judul dan lead yang memikat",
                "Lengkap dengan unsur ADIKSIMBA (Apa, Di mana, Kapan, Siapa, Mengapa, Bagaimana)",
                "Menggunakan piramida terbalik — informasi terpenting di awal",
              ],
              socialFunction: "Berita berfungsi sebagai sumber informasi bagi masyarakat tentang peristiwa terkini. Berita membantu publik memahami apa yang terjadi di sekitar mereka, mengambil keputusan berdasarkan informasi, dan berpartisipasi dalam kehidupan sosial secara sadar. Berita juga menjadi alat kontrol sosial dan media edukasi publik.",
              lifeBenefits: "Kemampuan menulis berita melatih siswa menyampaikan informasi secara jelas, ringkas, dan objektif. Keterampilan ini berguna dalam berbagai profesi dan situasi: membuat laporan, menulis notulen rapat, membuat konten media sosial, hingga dokumentasi kegiatan. Membaca berita kritis juga melindungi siswa dari misinformasi dan hoaks.",
              distinction: "Berita berbeda dari teks eksposisi yang bertujuan meyakinkan melalui argumen. Berita berbeda dari laporan yang bersifat teknis dan detail. Berita juga berbeda dari artikel opini yang mengandung pendapat penulis. Berita murni menyajikan fakta tanpa bias.",
            },
            contentComposition: {
              infoPoints: [
                "ADIKSIMBA adalah akronim dari Apa, Di mana, Kapan, Siapa, Mengapa, dan Bagaimana",
                "Piramida terbalik menempatkan informasi terpenting di awal",
                "Struktur berita terdiri dari judul, lead, isi, dan ekor",
                "Kalimat langsung dan tidak langsung digunakan untuk melaporkan pernyataan narasumber",
                "Bahasa berita harus baku, lugas, dan mudah dipahami",
              ],
              buildingElements: [
                "Peristiwa nyata sebagai subjek berita",
                "Unsur ADIKSIMBA sebagai kerangka kelengkapan informasi",
                "Judul sebagai daya tarik awal dan inti berita",
                "Lead sebagai paragraf pembuka berisi informasi terpenting",
                "Isi berita sebagai pengembangan lead dengan detail peristiwa",
                "Ekor berita sebagai informasi tambahan yang kurang penting",
              ],
              mainIdeas: [
                "Berita harus berdasarkan fakta yang terverifikasi, bukan asumsi",
                "Urutan piramida terbalik membantu pembaca mendapat inti berita dengan cepat",
                "Objektivitas adalah harga mati dalam penulisan berita",
                "Bahasa berita harus jelas dan tidak ambigu",
              ],
              partRelationships: "Struktur piramida terbalik bersifat hierarkis: judul merangkum inti, lead mengembangkan judul dengan ADIKSIMBA, isi memperinci lead secara kronologis atau tematik, dan ekor berisi informasi pelengkap. Pembaca dapat berhenti kapan saja dan tetap mendapat informasi utama. Semakin ke bawah, informasi semakin detail dan kurang penting.",
              simpleExample: "Gempa bumi berkekuatan 5,2 SR mengguncang Kabupaten Bandung, Senin (15/1) pukul 08.30 WIB. Belum ada laporan korban jiwa. BPBD menyatakan gempa tidak berpotensi tsunami. Warga berhamburan keluar rumah saat guncangan terasa selama 10 detik.",
            },
            textVariants: {
              types: ["berita langsung","berita opini","berita investigasi","berita feature","berita daring"],
              variantDescriptions: [
                { name: "Berita Langsung (Straight News)", description: "Berita singkat tentang peristiwa terkini yang disampaikan secara langsung. Fokus pada fakta inti dengan struktur piramida terbalik yang ketat.", example: "Kebakaran melanda Pasar Induk Caringin, Bandung, dini hari tadi. Dua kios ludes terbakar. Tidak ada korban jiwa. Penyebab kebakaran masih diselidiki." },
                { name: "Berita Feature", description: "Berita yang lebih mendalam dengan gaya bahasa naratif. Tidak terikat struktur piramida terbalik yang kaku. Menekankan sisi humanis dan sudut pandang unik.", example: "Di balik senyum Pak Samad, penjual koran yang sudah 30 tahun mangkal di perempatan, tersimpan ribuan kisah. Ia menyapa setiap pelanggan dengan hangat, seolah mereka keluarga sendiri." },
                { name: "Berita Daring", description: "Berita yang diterbitkan di platform digital. Judul menggunakan teknik clickbait terbatas. Dilengkapi tautan, multimedia, dan interaksi pembaca.", example: "Viral! Siswa SMP di Malang Ciptakan Alat Pendeteksi Banjir dari Barang Bekas. Artikel ini telah dibaca 25 ribu kali." },
              ],
              groupingBasis: "Varian teks berita dikelompokkan berdasarkan sifat penyajian (langsung vs mendalam), subjek (peristiwa vs manusia), dan media publikasi (cetak, elektronik, daring). Dalam pembelajaran kelas VIII, fokus utama adalah berita langsung sebagai dasar penulisan berita.",
            },
            structurePattern: {
              generalPattern: [
                { name: "Judul (Headline)", description: "Kalimat singkat yang merangkum inti berita. Judul harus menarik perhatian, mewakili isi berita, dan menggunakan kata-kata yang kuat namun tetap faktual." },
                { name: "Lead (Kepala Berita)", description: "Paragraf pertama yang berisi informasi terpenting dari berita. Lead menjawab pertanyaan ADIKSIMBA secara ringkas dan menjadi penentu apakah pembaca akan melanjutkan membaca." },
                { name: "Isi Berita (Body)", description: "Pengembangan dari lead yang menjelaskan detail peristiwa secara lebih terperinci. Dapat disusun secara kronologis, tematik, atau kausal." },
                { name: "Ekor Berita", description: "Bagian akhir berisi informasi pelengkap yang kurang penting. Dalam piramida terbalik, ekor dapat dihilangkan tanpa mengurangi inti berita." },
              ],
              variationNotes: "Berita langsung selalu menggunakan piramida terbalik. Berita feature dapat menggunakan struktur naratif dengan alur klimaks di akhir. Berita daring sering menambahkan elemen multimedia dan tautan di dalam tubuh berita.",
              readingGuide: "Saat membaca berita, baca judul dan lead terlebih dahulu untuk mendapat inti berita. Identifikasi unsur ADIKSIMBA dalam lead. Bedakan kalimat langsung dan tidak langsung. Catat fakta dan bedakan dari opini narasumber. Periksa sumber informasi yang dikutip.",
            },
            languageFeatures: {
              register: "Teks berita menggunakan ragam bahasa baku yang jelas, lugas, dan efisien. Kalimat disusun pendek dan langsung pada inti informasi. Meskipun baku, bahasa berita tetap komunikatif dan mudah dipahami oleh berbagai kalangan pembaca.",
              features: [
                { name: "Kalimat Langsung", description: "Kutipan langsung dari narasumber yang ditandai dengan tanda petik. Memberikan kesan autentik dan mendekatkan pembaca pada sumber informasi.", example: "\u201CKami akan menyelidiki penyebab kebakaran ini,\u201D ujar Kapolres Bandung." },
                { name: "Kalimat Tidak Langsung", description: "Pelaporan pernyataan narasumber tanpa tanda petik, menggunakan konjungsi \u201Cbahwa\u201D.", example: "Kapolres Bandung menyatakan bahwa pihaknya akan menyelidiki penyebab kebakaran tersebut." },
                { name: "Kata Kerja Pelaporan", description: "Verba yang digunakan untuk melaporkan pernyataan narasumber. Menandai sumber informasi.", example: "mengatakan, menyatakan, menambahkan, mengungkapkan, menjelaskan, berujar" },
                { name: "Konjungsi Temporal", description: "Kata penghubung yang menunjukkan urutan waktu peristiwa.", example: "kemudian, setelah itu, sebelumnya, sementara itu, hingga saat ini" },
                { name: "Kata Kerja Mental", description: "Verba yang berkaitan dengan proses berpikir atau merasa. Digunakan dalam kutipan narasumber.", example: "menyayangkan, mengharapkan, mengkhawatirkan, mengapresiasi" },
                { name: "Keterangan Waktu dan Tempat", description: "Frasa yang menunjukkan kapan dan di mana peristiwa terjadi. Wajib ada dalam setiap berita.", example: "Senin (15/1) pukul 08.30 WIB, di Jalan Merdeka No. 25, Kota Bandung" },
              ],
              wordChoice: "Pilihan kata dalam berita harus tepat, efisien, dan tidak ambigu. Hindari kata-kata bermuatan emosional atau subjektif. Gunakan istilah baku yang mudah dipahami. Angka dan data ditulis dengan jelas. Nama orang, lembaga, dan tempat ditulis lengkap pada penyebutan pertama.",
              sentencePattern: "Struktur kalimat dalam berita cenderung pendek dan langsung. Pola subjek-predikat-objek dominan. Kalimat kompleks dihindari agar informasi mudah dicerna. Variasi kalimat aktif dan pasif digunakan sesuai kebutuhan.",
              conjunctions: "Konjungsi temporal: kemudian, setelah, sebelumnya, hingga, sejak, selama. Konjungsi kausal: karena, sebab, sehingga, akibatnya. Konjungsi aditif: dan, serta, selain itu.",
              style: "Gaya bahasa berita bersifat informatif dan lugas. Tidak menggunakan majas atau bahasa kiasan. Kalimat dibuat pendek dan langsung. Hindari pengulangan informasi. Gunakan variasi kata untuk menghindari kebosanan.",
              spelling: "Menggunakan EYD V secara ketat. Singkatan dan akronim ditulis sesuai kaidah. Nama lembaga ditulis lengkap tanpa singkatan pada penyebutan pertama. Angka ditulis dengan angka untuk data statistik dan dengan huruf untuk angka pada awal kalimat.",
              punctuation: "Tanda petik digunakan untuk kalimat langsung. Tanda koma memisahkan unsur dalam perincian. Tanda titik mengakhiri setiap kalimat. Tanda titik dua digunakan sebelum kutipan langsung.",
            },
            productionProcedure: {
              preProduction: ["Tentukan peristiwa yang akan dilaporkan — pastikan faktual dan aktual","Kumpulkan data dan fakta melalui observasi langsung atau wawancara dengan narasumber","Catat unsur ADIKSIMBA dari peristiwa yang dilaporkan","Kumpulkan dokumentasi pendukung (foto, video, data statistik) jika diperlukan","Verifikasi informasi dari minimal dua sumber berbeda"],
              production: ["Tulis judul yang menarik, singkat, dan mewakili isi berita","Tulis lead yang menjawab ADIKSIMBA secara ringkas dan langsung","Kembangkan isi berita dengan detail dari yang penting ke yang kurang penting","Sisipkan kalimat langsung dari narasumber untuk memperkuat kredibilitas","Akhiri dengan ekor berita berisi informasi pelengkap atau konteks tambahan"],
              revision: ["Periksa kelengkapan ADIKSIMBA — adakah unsur yang terlewat?","Verifikasi kembali semua fakta, nama, angka, dan kutipan","Pastikan berita objektif dan tidak mengandung opini penulis","Periksa alur piramida terbalik — apakah informasi terpenting sudah di awal?"],
              editing: ["Perbaiki ejaan dan tanda baca sesuai EYD V","Periksa konsistensi penyebutan nama dan gelar narasumber","Pastikan kalimat langsung ditulis dengan tanda petik yang benar","Periksa penggunaan kata kerja pelaporan — apakah bervariasi dan tepat?"],
              publication: ["Publikasikan berita di majalah dinding kelas atau mading sekolah","Bacakan berita di depan kelas dengan intonasi layaknya penyiar berita","Unggah berita di blog sekolah atau media sosial resmi kelas","Buat buletin berita kelas yang diterbitkan secara rutin"],
              bestPractices: ["Gunakan peristiwa nyata di lingkungan sekolah sebagai latihan pertama","Wawancarai narasumber langsung untuk melatih keterampilan jurnalistik","Bandingkan pemberitaan dua media berbeda tentang peristiwa yang sama","Selalu verifikasi fakta sebelum menulis — jangan gunakan informasi yang belum jelas kebenarannya"],
            },
          },
          exampleText: {
            title: "Pameran Seni SMP Cendekia Meriah, Karya Siswa Dipamerkan di Galeri Kota",
            content: "Pameran seni bertajuk \u201CPelajar Berkarya\u201D yang digelar oleh SMP Cendekia Mandiri berlangsung meriah di Galeri Seni Kota Bandung, Sabtu (12/4). Acara yang dibuka sejak pukul 09.00 WIB ini menampilkan lebih dari 200 karya siswa berupa lukisan, instalasi daur ulang, dan fotografi. \u201CKami ingin memberi ruang ekspresi bagi siswa melalui seni. Bakat mereka luar biasa,\u201D ujar Kepala Sekolah SMP Cendekia Mandiri, Ibu Sari Dewi, saat membuka acara. Pameran dibagi menjadi tiga zona: zona lukisan, zona instalasi, dan zona fotografi. Zona instalasi menjadi favorit pengunjung karena menyajikan karya dari limbah plastik yang disulap menjadi patung hewan. Seorang pengunjung, Bapak Rudi Hartono, mengaku kagum. \u201CSaya tidak menyangka anak SMP bisa membuat karya sebagus ini. Ini luar biasa,\u201D katanya. Pameran berlangsung selama dua hari dan ditutup dengan lelang amal. Seluruh hasil lelang akan disumbangkan untuk pembangunan perpustakaan sekolah. Panitia mencatat lebih dari 500 pengunjung hadir selama dua hari penyelenggaraan.",
            analysis: {
              structure: "Judul: Pameran Seni SMP Cendekia Meriah (Apa). Lead: menjawab Apa (pameran seni), Di mana (Galeri Seni Kota Bandung), Kapan (Sabtu 12/4), Siapa (SMP Cendekia Mandiri). Isi: pengembangan dengan detail zona pameran dan kutipan narasumber. Ekor: informasi lelang amal dan jumlah pengunjung.",
              content: "Berita mencakup semua unsur ADIKSIMBA. Terdapat kalimat langsung dari dua narasumber berbeda (kepala sekolah dan pengunjung). Informasi disusun dari yang penting (acara dan jumlah karya) ke yang kurang penting (lelang amal). Mengandung data kuantitatif (200 karya, 500 pengunjung).",
              language: "Kalimat langsung menggunakan tanda petik dengan kata kerja pelaporan (ujar, kata). Kalimat tidak langsung hadir di paragraf awal. Keterangan waktu dan tempat lengkap. Bahasa baku dan mudah dipahami. Tidak ada opini penulis.",
              strengths: "ADIKSIMBA lengkap, struktur piramida terbalik jelas, dua sumber kutipan berbeda, ada data kuantitatif, topik relevan dengan dunia siswa, objektif dan faktual.",
              improvements: "Dapat menambahkan kutipan dari siswa peserta pameran sebagai narasumber ketiga. Informasi tentang persiapan pameran dapat ditambahkan di bagian ekor.",
            },
          },
          learningActivities: {
            opening: ["Guru menayangkan video berita singkat (2-3 menit) dan meminta siswa mencatat informasi inti","Tanya jawab tentang berita yang pernah dibaca atau ditonton siswa akhir-akhir ini","Permainan \u2018ADIKSIMBA Cepat\u2019: guru membacakan berita, siswa berlomba menyebutkan unsur ADIKSIMBA","Menyampaikan tujuan pembelajaran dan mengaitkan berita dengan kehidupan sehari-hari siswa"],
            core: ["Membaca contoh teks berita dari media massa dan mengidentifikasi unsur ADIKSIMBA","Diskusi kelompok menganalisis struktur piramida terbalik pada berita yang dibaca","Latihan membedakan kalimat langsung dan tidak langsung dalam teks berita","Praktik menulis lead berita berdasarkan data peristiwa yang disediakan guru","Menyusun berita lengkap dari hasil wawancara dengan narasumber di lingkungan sekolah","Saling menukar tulisan berita dan memberi masukan berdasarkan rubrik penilaian"],
            group: ["Wawancara narasumber (guru, staf, atau teman) tentang suatu peristiwa di sekolah","Menulis berita secara berkelompok berdasarkan hasil wawancara","Membuat majalah dinding berita kelas dengan desain yang menarik","Presentasi berita layaknya penyiar TV dengan format breaking news"],
            individual: ["Menulis berita tentang kegiatan ekstrakurikuler atau acara di sekolah","Menganalisis berita dari media massa dan mengidentifikasi ADIKSIMBA serta struktur","Membandingkan berita dari dua sumber berbeda tentang topik yang sama","Membuat kliping berita dengan catatan analisis unsur dan struktur"],
            reflection: ["Diskusi: \u2018Apa yang terjadi jika sebuah berita tidak memenuhi ADIKSIMBA?\u2019","Siswa menulis jurnal refleksi: \u2018Hal baru apa yang saya pelajari tentang penulisan berita?\u2019","Guru memfasilitasi diskusi tentang bahaya hoaks dan pentingnya verifikasi informasi","Refleksi lisan: \u2018Bagaimana cara saya membedakan berita fakta dan berita hoaks?\u2019"],
          },
          worksheet: {
            title: "Lembar Kerja: Menulis Teks Berita",
            purpose: "Membantu siswa mengidentifikasi unsur ADIKSIMBA, menganalisis struktur piramida terbalik, dan menulis teks berita yang objektif dan informatif.",
            instructions: ["Pilih satu peristiwa nyata di lingkungan sekolah atau rumah yang layak diberitakan","Kumpulkan data dan fakta tentang peristiwa tersebut (observasi atau wawancara)","Isi tabel ADIKSIMBA dengan informasi yang kamu kumpulkan","Tulis berita lengkap dengan struktur judul, lead, isi, dan ekor","Periksa kembali berita menggunakan daftar periksa yang disediakan"],
            activities: [
              { name: "Pengumpulan Data ADIKSIMBA", items: ["Apa peristiwa yang terjadi? Tuliskan secara singkat.","Di mana lokasi peristiwa?","Kapan peristiwa terjadi? (hari, tanggal, waktu)","Siapa saja yang terlibat? (pelaku, korban, saksi, narasumber)","Mengapa peristiwa itu terjadi? (latar belakang atau penyebab)","Bagaimana kronologi peristiwa? (jalannya peristiwa)"] },
              { name: "Penulisan Berita", items: ["Tulis judul yang menarik dan mewakili isi berita","Tulis lead yang menjawab ADIKSIMBA dalam 1-2 kalimat","Kembangkan isi berita dari yang penting ke yang kurang penting","Sisipkan satu kalimat langsung dari narasumber","Tulis ekor berita sebagai informasi penutup"] },
              { name: "Verifikasi dan Revisi", items: ["Periksa ADIKSIMBA — adakah unsur yang terlewat?","Pastikan semua fakta akurat dan terverifikasi","Periksa objektivitas — adakah opini penulis yang masuk?","Perbaiki ejaan dan tanda baca"] },
            ],
            studentOutput: "Teks berita orisinal dengan ADIKSIMBA lengkap, struktur piramida terbalik, mengandung kalimat langsung dan tidak langsung, serta menggunakan bahasa baku yang objektif.",
          },
          assessment: {
            diagnostic: [
              { question: "Apa yang membedakan berita dengan cerita atau dongeng?", purpose: "Mengetahui pemahaman awal siswa tentang sifat faktual berita" },
              { question: "Sebutkan satu berita yang sedang hangat dibicarakan!", purpose: "Mengidentifikasi konsumsi berita dan kesadaran informasi siswa" },
              { question: "Menurutmu, apa saja unsur yang harus ada dalam sebuah berita?", purpose: "Mengetahui pengetahuan awal tentang ADIKSIMBA" },
            ],
            formative: [
              { method: "Cek identifikasi ADIKSIMBA", criteria: ["Menemukan semua unsur ADIKSIMBA dengan tepat","Mampu membedakan fakta dan opini dalam berita","Mengidentifikasi kalimat langsung dan tidak langsung dengan benar"] },
              { method: "Cek draf lead berita", criteria: ["Lead menjawab ADIKSIMBA secara ringkas","Mengandung informasi terpenting","Bahasa singkat, padat, dan jelas"] },
              { method: "Observasi wawancara", criteria: ["Mampu mengajukan pertanyaan ADIKSIMBA","Mencatat jawaban narasumber dengan tepat","Bersikap sopan dan profesional"] },
            ],
            summative: [
              { type: "Menulis Teks Berita", description: "Menulis berita lengkap (judul, lead, isi, ekor) dengan ADIKSIMBA lengkap, struktur piramida terbalik yang jelas, mengandung kalimat langsung dan tidak langsung, serta menggunakan bahasa baku objektif" },
              { type: "Analisis Berita", description: "Menganalisis unsur ADIKSIMBA, struktur piramida terbalik, dan kebahasaan dari berita yang disediakan guru" },
              { type: "Proyek Majalah Dinding", description: "Secara berkelompok membuat majalah dinding berita kelas yang berisi minimal 5 berita dari berbagai rubrik (sekolah, komunitas, sains, olahraga, seni)" },
            ],
          },
          rubric: {
            aspects: [
              { name: "Kelengkapan ADIKSIMBA", criteria: [{ level: "4", description: "Semua unsur ADIKSIMBA lengkap, jelas, dan terintegrasi dengan baik dalam berita" },{ level: "3", description: "ADIKSIMBA lengkap tetapi satu unsur kurang jelas atau kurang terperinci" },{ level: "2", description: "Hanya 4-5 dari 6 unsur ADIKSIMBA yang terpenuhi" },{ level: "1", description: "Kurang dari 4 unsur ADIKSIMBA terpenuhi" }] },
              { name: "Struktur Piramida Terbalik", criteria: [{ level: "4", description: "Informasi terpenting di lead, detail di body, informasi pelengkap di ekor; urutan sangat sistematis" },{ level: "3", description: "Struktur piramida terbalik jelas tetapi ada info penting di bagian akhir" },{ level: "2", description: "Struktur piramida terbalik kurang jelas atau informasi tidak terurut" },{ level: "1", description: "Tidak menggunakan struktur piramida terbalik" }] },
              { name: "Objektivitas dan Fakta", criteria: [{ level: "4", description: "Berita objektif, tidak mengandung opini penulis, semua fakta terverifikasi, sumber jelas" },{ level: "3", description: "Berita objektif dengan sedikit opini yang tidak mengganggu" },{ level: "2", description: "Campuran fakta dan opini yang cukup banyak" },{ level: "1", description: "Berita didominasi opini, bukan fakta" }] },
              { name: "Penggunaan Bahasa", criteria: [{ level: "4", description: "Bahasa baku, kalimat langsung dan tidak langsung benar, kata kerja pelaporan bervariasi, ejaan tepat" },{ level: "3", description: "Bahasa baku dengan sedikit kesalahan ejaan atau variasi kata terbatas" },{ level: "2", description: "Beberapa kesalahan ejaan dan tanda baca yang mengganggu" },{ level: "1", description: "Banyak kesalahan bahasa, sulit dipahami" }] },
              { name: "Kualitas Judul dan Lead", criteria: [{ level: "4", description: "Judul menarik, singkat, mewakili isi; lead padat dan menjawab ADIKSIMBA" },{ level: "3", description: "Judul dan lead baik tetapi kurang menarik" },{ level: "2", description: "Judul kurang mewakili isi atau lead terlalu panjang" },{ level: "1", description: "Judul tidak sesuai atau lead tidak menjawab ADIKSIMBA" }] },
            ],
          },
          differentiation: {
            support: ["Menyediakan tabel ADIKSIMBA yang sudah diisi sebagian untuk dilengkapi siswa","Memberikan contoh berita dengan lead yang diberi kode warna sesuai unsur ADIKSIMBA","Bimbingan wawancara dengan role play terlebih dahulu","Template berita dengan bagian rumpang untuk diisi","Bank kata kerja pelaporan dan konjungsi temporal"],
            regular: ["Kebebasan memilih peristiwa untuk diberitakan (dalam batas yang ditentukan)","Contoh berita dari berbagai media untuk dianalisis","Bimbingan menulis secara mandiri dengan daftar periksa","Kesempatan publikasi berita di mading kelas"],
            challenge: ["Menulis berita investigasi sederhana dengan minimal 3 narasumber berbeda","Membandingkan pemberitaan dari dua media tentang topik yang sama dan menganalisis perbedaan sudut pandang","Membuat berita dalam bentuk video dengan wawancara langsung","Menulis feature article tentang tokoh inspiratif di sekolah"],
          },
          remedial: ["Latihan mengidentifikasi ADIKSIMBA dari kalimat sederhana secara bertahap","Praktik membedakan fakta dan opini dengan kartu pernyataan","Menulis lead berita dari data yang sudah dikelompokkan per unsur ADIKSIMBA","Pendampingan individu dalam wawancara dan pencatatan data"],
          enrichment: ["Mengunjungi kantor berita lokal atau media massa untuk melihat proses produksi berita","Membuat blog berita kelas yang diperbarui secara rutin setiap minggu","Menulis artikel feature tentang tokoh masyarakat di lingkungan sekitar","Mengikuti lomba jurnalistik tingkat kota atau provinsi"],
          readingPractice: {
            title: "Latihan Membaca: Teks Berita",
            stimulusTitle: "Siswa SMP Ciptakan Aplikasi Pembelajaran Bahasa Daerah",
            stimulusText: `BANDUNG — Tiga siswa SMP Negeri 15 Bandung berhasil menciptakan aplikasi pembelajaran bahasa daerah bernama "Bahasaku Nusantara". Aplikasi ini dirancang untuk membantu generasi muda mempelajari bahasa Sunda, Jawa, dan Minangkabau melalui permainan interaktif dan kuis harian.

Aplikasi yang dikembangkan oleh Raka Pratama (14), Siti Nurhaliza (13), dan Dimas Ardiansyah (14) ini telah diujicobakan kepada 200 siswa di lima sekolah di Kota Bandung. Hasilnya, 85% pengguna mengalami peningkatan pemahaman kosakata bahasa daerah setelah menggunakan aplikasi selama dua minggu.

"Kami prihatin melihat banyak teman sekelas yang tidak bisa berbahasa daerah. Bahasa Sunda adalah identitas kami, dan kami ingin melestarikannya dengan cara yang menyenangkan," ujar Raka saat ditemui di sekolahnya, Selasa (12/3).

Proses pembuatan aplikasi memakan waktu enam bulan. Ketiga siswa belajar coding secara otodidak melalui kursus daring dan dibimbing oleh guru TIK sekolah. Aplikasi ini dilengkapi dengan fitur pengenalan suara, kamus digital, dan permainan tebak kata yang bisa dimainkan secara offline.

Kepala Dinas Pendidikan Kota Bandung, Dr. Hj. Dewi Sartika, M.Pd., mengapresiasi karya ketiga siswa tersebut. "Ini bukti bahwa generasi muda tidak hanya cakap teknologi, tetapi juga peduli terhadap pelestarian budaya. Kami akan mendukung pengembangan aplikasi ini agar bisa digunakan secara luas di sekolah-sekolah," tuturnya.

Rencananya, aplikasi Bahasaku Nusantara akan diluncurkan secara resmi pada peringatan Hari Sumpah Pemuda di bulan Oktober mendatang. Ketiga siswa berharap aplikasi mereka dapat diunduh gratis di Play Store dan digunakan oleh pelajar di seluruh Indonesia. Mereka juga berencana menambahkan bahasa daerah lain seperti Bugis, Batak, dan Bali dalam versi berikutnya. Sementara itu, aplikasi ini telah masuk nominasi Lomba Inovasi Teknologi tingkat provinsi dan akan dinilai oleh panel juri pada minggu depan.`,
            questions: [
              { id: "8-berita-rp-01", type: "pilihan_ganda", questionText: "Peristiwa apa yang menjadi pokok berita di atas?", options: ["Peluncuran aplikasi pembelajaran bahasa daerah", "Lomba inovasi teknologi tingkat provinsi", "Tiga siswa SMP menciptakan aplikasi pembelajaran bahasa daerah", "Dinas Pendidikan memberikan apresiasi kepada siswa"], correctAnswer: "Tiga siswa SMP menciptakan aplikasi pembelajaran bahasa daerah", explanation: "Inti berita adalah tiga siswa SMP Negeri 15 Bandung yang berhasil menciptakan aplikasi Bahasaku Nusantara.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-berita-rp-02", type: "pilihan_ganda", questionText: "Unsur 'Di mana' dalam berita tersebut adalah...", options: ["SMP Negeri 15 Bandung", "Kota Bandung", "Kota Bandung dan lima sekolah di sekitarnya", "Kantor Dinas Pendidikan Kota Bandung"], correctAnswer: "Kota Bandung", explanation: "Lead berita menyebut peristiwa terjadi di Bandung secara umum, dengan detail di SMP Negeri 15 Bandung.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-berita-rp-03", type: "pilihan_ganda", questionText: "Unsur 'Mengapa' dalam berita ini adalah...", options: ["Ikut lomba inovasi teknologi", "Prihatin melihat banyak teman tidak bisa berbahasa daerah", "Mendapat dukungan dari Dinas Pendidikan", "Aplikasi masuk nominasi lomba"], correctAnswer: "Prihatin melihat banyak teman tidak bisa berbahasa daerah", explanation: "Raka menyatakan alasan pembuatan aplikasi adalah keprihatinan terhadap teman-teman yang tidak bisa berbahasa daerah.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-berita-rp-04", type: "pilihan_ganda", questionText: "Kutipan 'Kami prihatin melihat banyak teman sekelas yang tidak bisa berbahasa daerah' termasuk kalimat...", options: ["Kalimat tidak langsung", "Kalimat langsung", "Kalimat opini", "Kalimat pasif"], correctAnswer: "Kalimat langsung", explanation: "Kalimat tersebut adalah kutipan langsung dari Raka yang ditulis dalam tanda petik, ciri kalimat langsung.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-berita-rp-05", type: "pilihan_ganda", questionText: "Struktur piramida terbalik pada berita ini terlihat dari...", options: ["Informasi penting di awal dan tambahan di akhir", "Semua informasi disusun secara kronologis", "Kutipan narasumber berada di akhir", "Data statistik disimpan di tengah"], correctAnswer: "Informasi penting di awal dan tambahan di akhir", explanation: "Lead berisi informasi inti (siapa, apa, di mana), sedangkan bagian akhir berisi rencana peluncuran — yang kurang penting.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-berita-rp-06", type: "pilihan_ganda", questionText: "Siapa narasumber yang memberikan komentar dalam berita ini?", options: ["Raka Pratama dan Dimas Ardiansyah", "Raka Pratama dan Kepala Dinas Pendidikan", "Kepala Dinas Pendidikan dan guru TIK", "Siti Nurhaliza dan Raka Pratama"], correctAnswer: "Raka Pratama dan Kepala Dinas Pendidikan", explanation: "Ada dua kutipan langsung: dari Raka sebagai kreator dan dari Kepala Dinas Pendidikan.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-berita-rp-07", type: "pilihan_ganda", questionText: "Kata 'otodidak' dalam kalimat 'Ketiga siswa belajar coding secara otodidak' berarti...", options: ["Belajar di sekolah formal", "Belajar sendiri tanpa guru formal", "Belajar dengan guru privat", "Belajar melalui kursus berbayar"], correctAnswer: "Belajar sendiri tanpa guru formal", explanation: "Otodidak berarti belajar secara mandiri, bukan melalui pendidikan formal.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-berita-rp-08", type: "pilihan_ganda", questionText: "Kalimat yang mengandung fakta dalam berita ini adalah...", options: ["Aplikasi ini adalah yang terbaik di Jawa Barat", "Proses pembuatan aplikasi memakan waktu enam bulan", "Semua siswa pasti suka aplikasi ini", "Bahasa daerah adalah identitas yang harus dilestarikan"], correctAnswer: "Proses pembuatan aplikasi memakan waktu enam bulan", explanation: "Fakta adalah informasi yang dapat diverifikasi. Waktu pembuatan enam bulan adalah data faktual.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-berita-rp-09", type: "pilihan_ganda", questionText: "Kalimat 'Rencananya, aplikasi akan diluncurkan pada Hari Sumpah Pemuda' termasuk bagian...", options: ["Lead berita", "Isi berita", "Ekor berita", "Judul berita"], correctAnswer: "Ekor berita", explanation: "Informasi tentang rencana peluncuran mendatang adalah informasi tambahan yang kurang penting — ekor berita.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-berita-rp-10", type: "pilihan_ganda", questionText: "Kata kerja pelaporan yang digunakan dalam berita ini adalah...", options: ["Menciptakan, merancang, mengembangkan", "Ujar, tutur, ditemui", "Belajar, membuat, meluncurkan", "Peduli, cakap, apresiasi"], correctAnswer: "Ujar, tutur, ditemui", explanation: "Kata kerja pelaporan: 'ujar Raka', 'tuturnya', dan 'ditemui di sekolahnya'.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-berita-rp-11", type: "jawaban_singkat", questionText: "Sebutkan tiga fitur yang ada dalam aplikasi Bahasaku Nusantara!", correctAnswer: "Pengenalan suara, kamus digital, permainan tebak kata", explanation: "Paragraf keempat menyebut tiga fitur: pengenalan suara, kamus digital, dan tebak kata offline.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-berita-rp-12", type: "jawaban_singkat", questionText: "Berapa persen pengguna yang mengalami peningkatan kosakata?", correctAnswer: "85%", explanation: "Paragraf kedua menyebut '85% pengguna mengalami peningkatan pemahaman kosakata'.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-berita-rp-13", type: "jawaban_singkat", questionText: "Mengapa ketiga siswa membuat aplikasi pembelajaran bahasa daerah?", correctAnswer: "Karena prihatin melihat banyak teman yang tidak bisa berbahasa daerah", explanation: "Raka berkata: 'Kami prihatin melihat banyak teman sekelas yang tidak bisa berbahasa daerah.'", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-berita-rp-14", type: "uraian", questionText: "Analisislah unsur ADIKSIMBA dalam berita ini. Apakah semua unsur terpenuhi? Jelaskan!", correctAnswer: ["Apa: Tiga siswa SMP ciptakan aplikasi bahasa daerah. Di mana: Bandung (SMPN 15 Bandung). Kapan: Berita ditulis Selasa 12/3, pengembangan 6 bulan, rencana launching Oktober. Siapa: Raka, Siti, Dimas, Kepala Dinas Pendidikan. Mengapa: Prihatin teman tidak bisa bahasa daerah. Bagaimana: Belajar coding otodidak 6 bulan, dibimbing guru TIK, uji coba di 5 sekolah."], explanation: "Semua unsur ADIKSIMBA lengkap — berita memenuhi syarat informatif.", skillTarget: "analisis struktur", difficulty: "menantang" },
              { id: "8-berita-rp-15", type: "uraian", questionText: "Apakah berita ini sudah objektif? Jelaskan dengan merujuk fakta, bahasa, dan keseimbangan narasumber!", correctAnswer: ["Berita objektif karena: (1) fakta terverifikasi seperti nama, persentase, waktu; (2) dua narasumber berbeda (siswa dan pejabat); (3) bahasa lugas tanpa opini penulis; (4) data spesifik '200 siswa di lima sekolah'."], explanation: "Objektivitas dinilai dari fakta, keseimbangan sumber, dan bahasa yang tidak memihak.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Teks Berita",
            questions: [
              { id: "8-berita-qq-01", type: "pilihan_ganda", questionText: "Kepanjangan ADIKSIMBA adalah...", options: ["Apa, Di mana, Kapan, Siapa, Mengapa, Bagaimana", "Arah, Dimensi, Kapan, Sifat, Makna, Bahasa", "Amanat, Dialog, Inti, Konflik, Susunan, Makna", "Asal, Dasar, Kaitan, Sumber, Isi, Maksud"], correctAnswer: "Apa, Di mana, Kapan, Siapa, Mengapa, Bagaimana", explanation: "ADIKSIMBA adalah akronim unsur berita.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-berita-qq-02", type: "pilihan_ganda", questionText: "Struktur penulisan berita yang menempatkan informasi terpenting di awal disebut...", options: ["Piramida tegak", "Piramida terbalik", "Kronologis", "Naratif"], correctAnswer: "Piramida terbalik", explanation: "Piramida terbalik: info penting di awal, semakin ke bawah kurang penting.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-berita-qq-03", type: "pilihan_ganda", questionText: "Bagian berita yang berisi paragraf pembuka dengan info terpenting disebut...", options: ["Judul", "Lead", "Isi berita", "Ekor berita"], correctAnswer: "Lead", explanation: "Lead adalah paragraf pertama yang merangkum informasi terpenting.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-berita-qq-04", type: "pilihan_ganda", questionText: "Ciri bahasa yang khas dalam teks berita adalah...", options: ["Menggunakan majas dan kiasan", "Bahasa singkat, padat, objektif", "Mengandung opini penulis", "Kalimat panjang dan deskriptif"], correctAnswer: "Bahasa singkat, padat, objektif", explanation: "Berita menggunakan bahasa efisien, langsung, dan objektif.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-berita-qq-05", type: "pilihan_ganda", questionText: "Perbedaan kalimat langsung dan tidak langsung adalah...", options: ["Kalimat langsung menggunakan kata 'bahwa'", "Kalimat langsung ditandai tanda petik, tidak langsung tidak", "Kalimat langsung lebih panjang", "Kalimat langsung hanya untuk pejabat"], correctAnswer: "Kalimat langsung ditandai tanda petik, tidak langsung tidak", explanation: "Kalimat langsung mengutip persis ucapan, tidak langsung melaporkan ulang.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-berita-qq-06", type: "pilihan_ganda", questionText: "Contoh kata kerja pelaporan dalam berita adalah...", options: ["Berlari, makan, tidur", "Mengatakan, menyatakan, mengungkapkan", "Kemudian, setelah itu, lalu", "Karena, sehingga, akibatnya"], correctAnswer: "Mengatakan, menyatakan, mengungkapkan", explanation: "Kata kerja pelaporan memperkenalkan pernyataan narasumber.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-berita-qq-07", type: "pilihan_ganda", questionText: "Yang termasuk fakta adalah...", options: ["Kebijakan baru ini tidak adil", "Uji coba melibatkan 200 siswa di lima sekolah", "Aplikasi ini pasti sukses", "Berita ini sangat menginspirasi"], correctAnswer: "Uji coba melibatkan 200 siswa di lima sekolah", explanation: "Fakta dapat diverifikasi kebenarannya.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-berita-qq-08", type: "pilihan_ganda", questionText: "Judul berita yang baik harus...", options: ["Panjang dan mendetail", "Menarik, singkat, mewakili isi", "Mengandung opini penulis", "Menggunakan bahasa kiasan"], correctAnswer: "Menarik, singkat, mewakili isi", explanation: "Judul merangkum inti berita secara singkat dan menarik.", skillTarget: "evaluasi", difficulty: "mudah" },
              { id: "8-berita-qq-09", type: "pilihan_ganda", questionText: "Ekor berita berisi...", options: ["Informasi terpenting", "Informasi pelengkap yang kurang penting", "Kesimpulan opini penulis", "Kutipan narasumber utama"], correctAnswer: "Informasi pelengkap yang kurang penting", explanation: "Ekor adalah bagian paling bawah piramida terbalik, berisi info tambahan.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-berita-qq-10", type: "pilihan_ganda", questionText: "Konjungsi temporal dalam berita adalah...", options: ["Karena, sebab, sehingga", "Kemudian, setelah itu, sebelumnya", "Dan, atau, serta", "Tetapi, namun, meskipun"], correctAnswer: "Kemudian, setelah itu, sebelumnya", explanation: "Konjungsi temporal menunjukkan urutan waktu peristiwa.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-berita-qq-11", type: "jawaban_singkat", questionText: "Sebutkan dua syarat berita yang baik selain ADIKSIMBA!", correctAnswer: "Objektif (tidak memihak) dan faktual (berdasarkan fakta)", explanation: "Berita harus objektif dan berdasarkan fakta terverifikasi.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-berita-qq-12", type: "jawaban_singkat", questionText: "Apa yang dimaksud piramida terbalik?", correctAnswer: "Informasi terpenting di awal, diikuti info yang semakin kurang penting", explanation: "Piramida terbalik menyusun berita dari yang paling penting ke kurang penting.", skillTarget: "analisis struktur", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Gunakan berita terkini yang relevan dengan usia dan minat siswa sebagai contoh awal","Tekankan pentingnya verifikasi informasi — ajarkan siswa selalu cek silang fakta","Libatkan siswa dalam simulasi konferensi pers untuk melatih keterampilan wawancara","Berikan contoh berita yang baik dan berita yang tidak baik (tidak lengkap ADIKSIMBA) agar siswa bisa membandingkan"],
            commonMisconceptions: [
              { misconception: "Siswa mengira opini narasumber adalah fakta.", correction: "Jelaskan bahwa pernyataan narasumber adalah pendapat mereka, bukan fakta mutlak. Fakta adalah data yang dapat diverifikasi." },
              { misconception: "Siswa berpikir berita harus panjang dan detail.", correction: "Berita yang baik justru efisien. Informasi yang kurang penting diletakkan di ekor dan bisa dihilangkan." },
              { misconception: "Siswa menganggap semua berita di internet adalah benar.", correction: "Ajarkan keterampilan verifikasi: cek sumber, bandingkan dengan media lain, dan periksa kredibilitas penulis." },
            ],
            feedbackGuide: ["Berikan umpan balik spesifik pada kelengkapan ADIKSIMBA, bukan sekadar 'beritanya bagus'","Tandai kalimat langsung yang tepat dan beri saran untuk yang kurang tepat","Gunakan rubrik penilaian sebagai alat umpan balik, bukan hanya alat penilaian akhir","Fokus pada satu atau dua aspek perbaikan dalam setiap sesi revisi"],
            classroomManagement: ["Siapkan kliping berita dari media massa sebagai bahan analisis di kelas","Atur jadwal wawancara dengan narasumber di lingkungan sekolah","Gunakan timer untuk setiap fase penulisan berita","Sediakan kamus dan pedoman ejaan di setiap meja kelompok"],
          },
          reflection: {
            studentQuestions: ["Unsur ADIKSIMBA mana yang paling sulit saya temukan dalam berita?","Apa yang membedakan berita berkualitas dengan berita yang tidak berkualitas?","Bagaimana cara saya memastikan berita yang saya tulis objektif?","Keterampilan baru apa yang saya dapatkan dari bab ini?"],
            teacherQuestions: ["Apakah siswa mampu mengidentifikasi ADIKSIMBA dengan tepat?","Strategi apa yang efektif membantu siswa menulis lead yang padat?","Apakah siswa mampu membedakan kalimat langsung dan tidak langsung?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah Rencana Pelaksanaan Pembelajaran (RPP) atau materi ajar tentang Teks Berita. Materi mencakup: pengertian teks berita, unsur ADIKSIMBA (Apa, Di mana, Kapan, Siapa, Mengapa, Bagaimana), struktur piramida terbalik (judul, lead, isi, ekor), ciri kebahasaan (kalimat langsung dan tidak langsung, kata kerja pelaporan, konjungsi temporal), dan perbedaan fakta dengan opini. Sertakan contoh teks berita tentang pameran seni atau kegiatan sekolah yang lengkap dengan analisis ADIKSIMBA. Buat 10 soal pilihan ganda yang menguji pemahaman ADIKSIMBA, struktur, dan kebahasaan berita, serta 5 soal uraian yang menguji kemampuan analisis dan produksi teks berita. Gunakan bahasa Indonesia yang sesuai untuk tingkat VIII SMP. Cantumkan rubrik penilaian dengan 4 level (4=Sangat Baik, 3=Baik, 2=Cukup, 1=Perlu Bimbingan).",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["berita","ADIKSIMBA","jurnalistik","fakta","piramida terbalik","objektif","kalimat langsung"],
          isReady: true,
        },
{
          id: "viii-drama",
          slug: "teks-drama",
          grade: "VIII",
          phase: "D",
          semester: 1,
          chapterNumber: 2,
          title: "Bab 2: Teks Drama",
          shortTitle: "Drama",
          kd: "Membaca dan Memirsa · Menulis",
          emoji: "\u{1F3AD}",
          description: "Mengenal, menganalisis, dan menulis naskah drama serta mementaskannya dengan ekspresi, intonasi, dan gerak yang tepat sesuai watak tokoh.",
          overview: "Drama adalah cermin kehidupan yang dipentaskan. Bab ini mengajak siswa memahami drama sebagai karya sastra yang hidup \u2014 ditulis untuk dipentaskan, bukan sekadar dibaca. Siswa akan belajar mengidentifikasi unsur-unsur drama, menganalisis karakter tokoh melalui dialog dan petunjuk lakuan, menulis naskah drama pendek, dan mempraktikkan pementasan sederhana. Dari pembaca naskah menjadi aktor di atas panggung, siswa akan merasakan bagaimana kata-kata bertransformasi menjadi aksi, emosi, dan cerita yang menyentuh penonton. Pembelajaran menekankan kerja sama, kreativitas, dan apresiasi seni peran.",
          learningGoals: [
            "Memahami pengertian, ciri-ciri, dan jenis-jenis teks drama",
            "Mengidentifikasi unsur intrinsik drama: tema, tokoh, alur, latar, dialog, dan petunjuk lakuan",
            "Menganalisis karakter tokoh melalui dialog dan konflik dalam naskah drama",
            "Menulis naskah drama pendek dengan struktur lengkap dan dialog yang alami",
            "Mementaskan drama pendek dengan ekspresi, intonasi, dan gerak yang sesuai",
          ],
          keywords: ["drama","naskah","dialog","tokoh","lakuan","panggung","monolog","babak","konflik","klimaks","peran","aktor"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Drama adalah karya sastra yang ditulis untuk dipentaskan di atas panggung. Berbeda dengan prosa atau puisi yang dinikmati melalui bacaan, drama baru lengkap ketika dipertunjukkan. Teks drama berisi dialog antartokoh dan petunjuk lakuan (stage direction) yang mengarahkan aktor dalam memerankan tokoh. Drama menggambarkan kehidupan manusia melalui konflik, emosi, dan interaksi antar tokoh.",
              characteristics: [
                "Berupa dialog antartokoh dengan narasi minimal",
                "Dilengkapi petunjuk lakuan dalam tanda kurung",
                "Menampilkan konflik sebagai inti cerita yang mendorong alur",
                "Memiliki struktur: orientasi, komplikasi, klimaks, resolusi",
                "Tokoh dikembangkan melalui dialog dan tindakan, bukan narasi",
              ],
              socialFunction: "Drama berfungsi sebagai media hiburan, pendidikan, dan kritik sosial. Melalui drama, masyarakat dapat merefleksikan kehidupan, mengeksplorasi isu-isu sosial, dan mengembangkan empati. Dalam pendidikan, drama melatih kerja sama, percaya diri, dan keterampilan berkomunikasi.",
              lifeBenefits: "Kemampuan menulis dan mementaskan drama mengembangkan kreativitas, empati, dan kecerdasan emosional. Siswa belajar memahami karakter manusia \u2014 keterampilan berharga dalam interaksi sosial. Kerja sama dalam pementasan melatih koordinasi tim dan tanggung jawab.",
              distinction: "Drama berbeda dari prosa karena disusun dalam bentuk dialog untuk dipentaskan. Berbeda dari puisi yang mengutamakan rima dan irama. Drama menggunakan dialog dan aksi untuk mengungkapkan cerita, bukan narasi deskriptif.",
            },
            contentComposition: {
              infoPoints: ["Drama ditulis untuk dipentaskan","Unsur intrinsik: tema, tokoh, alur, latar, dialog, petunjuk lakuan","Konflik adalah inti drama","Struktur: orientasi, komplikasi, klimaks, resolusi","Karakter tokoh terungkap melalui dialog"],
              buildingElements: ["Dialog sebagai unsur utama","Petunjuk lakuan sebagai panduan aktor","Tokoh dengan watak jelas","Konflik sebagai penggerak cerita","Babak dan adegan sebagai pembagian struktur"],
              mainIdeas: ["Dialog harus mencerminkan karakter tokoh","Konflik membuat drama hidup","Petunjuk lakuan membantu aktor memahami peran","Pementasan adalah hasil kerja sama tim"],
              partRelationships: "Dialog, tokoh, dan konflik saling terkait erat. Dialog mengungkapkan karakter dan mendorong konflik. Konflik menentukan alur dan perkembangan tokoh. Petunjuk lakuan mendukung dialog dengan arahan visual tentang emosi dan gerak.",
              simpleExample: "Alya: (Cemas) Lima belas menit lagi ujian. Aku lupa belajar! Raka: (Tersenyum) Santai, aku bawa catatan. Alya: (Legab) Makasih! Kamu penyelamat.",
            },
            textVariants: {
              types: ["drama tradisional","drama modern","monolog","pantomim","teater absurd"],
              variantDescriptions: [
                { name: "Drama Tradisional", description: "Terikat aturan tradisional. Bahasa daerah atau Melayu lama. Improvisasi. Contoh: lenong, ketoprak, ludruk.", example: "Wayang orang dengan lakon Mahabharata. Dialog bahasa Jawa krama. Gerak tari mengiringi setiap adegan." },
                { name: "Drama Modern", description: "Mengikuti aturan teater kontemporer. Naskah tertulis, sutradara, aktor. Struktur rapi dengan babak dan adegan.", example: "Drama tiga babak tentang konflik keluarga. Babak 1 orientasi, Babak 2 klimaks, Babak 3 resolusi." },
                { name: "Monolog", description: "Dimainkan satu aktor. Aktor berbicara sendiri atau kepada penonton. Mengungkapkan isi pikiran tokoh.", example: "Seorang siswa duduk di bangku kosong kelas, berbicara kepada bayangannya tentang kekecewaan." },
              ],
              groupingBasis: "Pengelompokan berdasarkan periode (tradisional/modern), jumlah pemain (monolog/dialog), dan bentuk penyajian (panggung/pantomim).",
            },
            structurePattern: {
              generalPattern: [
                { name: "Orientasi", description: "Pengenalan tokoh, latar, dan situasi awal cerita." },
                { name: "Komplikasi", description: "Munculnya konflik atau masalah yang dihadapi tokoh." },
                { name: "Klimaks", description: "Puncak konflik dengan ketegangan tertinggi." },
                { name: "Resolusi", description: "Penyelesaian konflik, tokoh menemukan jalan keluar." },
              ],
              variationNotes: "Drama modern umumnya 3-5 babak. Drama pendek bisa 3 babak. Monolog konfliknya internal. Drama tradisional sering tidak mengikuti struktur ketat.",
              readingGuide: "Saat membaca naskah, bayangkan panggung dan aktor di dalamnya. Baca dialog dengan suara sesuai karakter. Perhatikan petunjuk lakuan. Identifikasi konflik utama.",
            },
            languageFeatures: {
              register: "Teks drama menggunakan ragam bahasa lisan yang komunikatif dan sesuai karakter. Bahasa dapat bervariasi dari formal hingga informal tergantung tokoh dan situasi.",
              features: [
                { name: "Dialog", description: "Percakapan antartokoh. Mencerminkan karakter, suasana hati, dan tujuan tokoh.", example: '"Aku tidak percaya kau melakukan ini!" seru Rina.' },
                { name: "Petunjuk Lakuan", description: "Teks dalam kurung yang memberi arahan gerak, ekspresi, dan intonasi.", example: "(Doni berjalan mondar-mandir, wajahnya tegang.)" },
                { name: "Kalimat Langsung", description: "Ucapan tokoh langsung tanpa narasi.", example: 'Alya: "Aku tidak akan menyerah!"' },
                { name: "Kata Ganti Orang", description: "Pronomina dalam percakapan. Menunjukkan hubungan tokoh.", example: "aku, kamu, dia, mereka, kita" },
                { name: "Kata Kerja Aktif", description: "Verba tindakan tokoh. Mendominasi dialog.", example: "berlari, berteriak, memeluk, berbisik, tersenyum" },
              ],
              wordChoice: "Pilihan kata sesuai karakter: formal untuk tokoh berpendidikan, informal untuk remaja. Hindari kata terlalu puitis dalam dialog realistis.",
              sentencePattern: "Kalimat pendek dan langsung. Interogatif dan imperatif sering muncul. Kalimat fragmentaris wajar. Variasi panjang pendek menciptakan ritme percakapan.",
              conjunctions: "Temporal: lalu, kemudian, setelah itu, ketika, saat. Kausal: karena, sehingga, maka. Adversatif: tetapi, namun, meskipun.",
              style: "Gaya realistis sesuai karakter. Hindari dialog terlalu panjang. Gunakan jeda, interupsi, dan kalimat terputus untuk meniru percakapan nyata.",
              spelling: "Menggunakan EYD V. Nama tokoh konsisten. Kata tidak baku dimungkinkan untuk mencerminkan karakter.",
              punctuation: "Tanda petik untuk dialog. Tanda koma memisahkan dialog dari kalimat pengiring. Tanda seru untuk ekspresi marah/kaget. Tanda kurung untuk petunjuk lakuan.",
            },
            productionProcedure: {
              preProduction: ["Tentukan tema dekat dengan remaja","Tentukan tokoh dan karakter","Buat sinopsis alur","Tentukan konflik utama","Bagi naskah menjadi babak/adegan"],
              production: ["Tulis dialog orientasi","Kembangkan konflik melalui dialog","Tulis adegan klimaks","Selesaikan dengan resolusi logis","Tambahkan petunjuk lakuan"],
              revision: ["Baca naskah keras-keras bersama teman","Pastikan alur logis","Periksa konsistensi karakter","Evaluasi efektivitas konflik"],
              editing: ["Perbaiki dialog tidak alami","Periksa petunjuk lakuan","Perbaiki ejaan dan tanda baca","Rapikan format naskah"],
              publication: ["Latih pementasan dalam kelompok","Pentaskan di depan kelas","Rekam pementasan untuk evaluasi","Kumpulkan naskah dalam antologi kelas"],
              bestPractices: ["Gunakan konflik sederhana relevan untuk latihan awal","Bacakan naskah bersama sebelum latihan","Berikan kebebasan interpretasi aktor","Rekam latihan untuk evaluasi diri"],
            },
          },
          exampleText: {
            title: "Panggung Impian",
            content: "Babak 1: Ruang kelas SMP Nusantara, siang hari sepulang sekolah. Tiga siswa duduk melingkar. Rini memegang kertas. (Adegan 1) Rini: (Bersemangat) Aku punya ide! Pentas seni. Panggung terbuka untuk semua bakat! Dimas: (Ragu) Ide bagus, tapi dana dari mana? Anggaran OSIS habis. Sari: (Menyela) Cari sponsor! Toko kue Bu Dewi mungkin mau donasi. Rini: (Membuka catatan) Aku sudah hitung. Kalau patungan lima ribu per orang, dana cukup. (Adegan 2 \u2014 Tiga minggu kemudian, panggung darurat di halaman) Rini: (Di panggung, gemetar) Selamat datang di Panggung Impian! (Tepuk tangan) Dimas: (Bisik) Santai, Rin. Kamu bisa! Rini: (Menghela napas) Kami persembahkan pertunjukan spesial dari siswa untuk siswa! (Adegan 3 \u2014 Usai pentas) Sari: (Tersenyum) Kita berhasil! Dimas: Awalnya aku ragu, tapi ini luar biasa. Rini: (Haru) Bukan soal sempurna. Kita berani mencoba. Itu yang penting.",
            analysis: {
              structure: "3 babak: orientasi (ide pentas), komplikasi (keraguan dana), klimaks (pementasan), resolusi (refleksi setelah sukses).",
              content: "Tema inisiatif dan kerja sama. Konflik internal-eksternal: keraguan Dimas, dana terbatas, rasa gugup. Resolusi memuaskan dan inspiratif.",
              language: "Dialog alami remaja. Petunjuk lakuan jelas. Variasi: bersemangat, ragu, menyela, gemetar, bisik, haru.",
              strengths: "Dialog alami, konflik relevan, resolusi inspiratif, petunjuk lakuan membantu aktor, properti minimal.",
              improvements: "Bisa tambah tokoh antagonis. Dialog Dimas bisa lebih dikembangkan untuk show character growth.",
            },
          },
          learningActivities: {
            opening: ["Guru menampilkan video pementasan drama remaja","Tanya jawab tentang pengalaman menonton drama","Role play 2 menit dengan kartu situasi","Menyampaikan tujuan pembelajaran"],
            core: ["Membaca naskah drama dengan pembagian peran","Diskusi identifikasi unsur intrinsik","Analisis karakter tokoh melalui dialog","Latihan mengubah cerpen menjadi naskah drama","Menulis naskah drama pendek berpasangan"],
            group: ["Pembagian kelompok pementasan (5-7 orang)","Latihan pementasan dengan fokus ekspresi dan intonasi","Pementasan bergiliran","Diskusi apresiasi drama"],
            individual: ["Menulis naskah drama 3 babak","Analisis naskah dari segi unsur intrinsik","Membuat desain properti panggung","Jurnal refleksi karakter tokoh"],
            reflection: ["Diskusi: apa yang membuat drama menarik?","Jurnal refleksi pengalaman menulis/memerankan tokoh","Refleksi: keterampilan apa yang didapat?"],
          },
          worksheet: {
            title: "Lembar Kerja: Menulis Naskah Drama",
            purpose: "Membantu siswa menyusun naskah drama dengan struktur lengkap, dialog alami, dan petunjuk lakuan jelas.",
            instructions: ["Tentukan tema dekat kehidupan remaja","Tentukan tokoh, karakter, dan konflik","Buat kerangka alur","Tulis naskah drama 3 babak","Bacakan dengan teman untuk uji kealamian dialog"],
            activities: [
              { name: "Perencanaan", items: ["Tentukan tema dan judul","Buat sinopsis 3-4 kalimat","Tentukan tokoh dan karakter","Buat kerangka alur per babak","Tentukan konflik utama"] },
              { name: "Penulisan", items: ["Tulis dialog per adegan","Pastikan dialog mencerminkan karakter","Tambahkan petunjuk lakuan","Gunakan bahasa alami","Variasi panjang pendek dialog"] },
              { name: "Uji Baca dan Revisi", items: ["Bacakan dengan kelompok","Catat dialog tidak alami","Periksa alur dan konflik","Revisi berdasarkan masukan","Cetak naskah siap pakai"] },
            ],
            studentOutput: "Naskah drama 3 babak dengan dialog alami, petunjuk lakuan jelas, konflik relevan, siap dipentaskan.",
          },
          assessment: {
            diagnostic: [
              { question: "Apa perbedaan film di TV dengan drama panggung langsung?", purpose: "Memahami pemahaman tentang medium drama" },
              { question: "Pernahkah kamu bermain peran?", purpose: "Mengidentifikasi pengalaman teater" },
              { question: "Apa yang diperlukan agar drama pentas berhasil?", purpose: "Mengetahui pemahaman aspek produksi drama" },
            ],
            formative: [
              { method: "Observasi diskusi", criteria: ["Mengidentifikasi unsur intrinsik","Aktif analisis karakter","Memberi masukan konstruktif","Menghargai interpretasi berbeda"] },
              { method: "Cek draf naskah", criteria: ["Struktur babak jelas","Dialog sesuai karakter","Petunjuk lakuan membantu","Konflik jelas"] },
              { method: "Observasi latihan", criteria: ["Dialog lancar","Ekspresi sesuai","Kerja sama tim","Kreativitas properti"] },
            ],
            summative: [
              { type: "Menulis Naskah Drama", description: "Naskah drama 3 babak dengan struktur lengkap, dialog alami, petunjuk lakuan jelas, konflik relevan" },
              { type: "Pementasan Drama", description: "Pementasan kelompok dengan ekspresi, intonasi, bloking, dan properti yang mendukung" },
            ],
          },
          rubric: {
            aspects: [
              { name: "Kelengkapan Struktur", criteria: [{ level: "4", description: "Struktur orientasi, komplikasi, klimaks, resolusi lengkap dan terorganisasi baik" },{ level: "3", description: "Struktur lengkap tetapi satu bagian kurang jelas" },{ level: "2", description: "Hanya 3 dari 4 struktur lengkap" },{ level: "1", description: "Struktur tidak jelas, alur melompat" }] },
              { name: "Kualitas Dialog", criteria: [{ level: "4", description: "Dialog alami, sesuai karakter, efektif mendorong konflik" },{ level: "3", description: "Dialog cukup alami tetapi kadang kaku" },{ level: "2", description: "Dialog kaku, semua tokoh terdengar sama" },{ level: "1", description: "Dialog tidak alami, seperti pidato" }] },
              { name: "Petunjuk Lakuan", criteria: [{ level: "4", description: "Jelas, membantu aktor, tepat waktu dan situasi" },{ level: "3", description: "Cukup jelas tetapi kurang membantu aktor" },{ level: "2", description: "Minim atau kurang jelas" },{ level: "1", description: "Tidak ada petunjuk lakuan berarti" }] },
              { name: "Pementasan", criteria: [{ level: "4", description: "Ekspresi, intonasi, gerak sesuai. Properti mendukung. Hafal dialog." },{ level: "3", description: "Baik tetapi ekspresi/intonasi kadang kurang" },{ level: "2", description: "Kurang persiapan, dialog terbata" },{ level: "1", description: "Tidak siap, tidak ada properti" }] },
            ],
          },
          differentiation: {
            support: ["Kerangka naskah sudah diisi sebagian","Naskah pendek dengan 2-3 tokoh","Bimbingan ekspresi dan intonasi","Bank kosakata dialog","Contoh video pementasan"],
            regular: ["Kebebasan memilih tema","Contoh naskah dari berbagai sumber","Bimbingan bertahap","Kesempatan pentas di depan kelas"],
            challenge: ["Naskah dengan konflik kompleks","Adaptasi cerita rakyat jadi naskah","Pementasan dengan properti lengkap","Monolog tentang isu sosial"],
          },
          remedial: ["Latihan dialog sederhana 2 tokoh","Improvisasi berdasarkan situasi","Bimbingan membaca petunjuk lakuan","Tutor sebaya dalam kelompok","Fokus satu babak dulu"],
          enrichment: ["Menonton dan mengulas teater profesional","Kunjungan ke sanggar teater","Naskah drama bahasa daerah/Inggris","Film pendek dari naskah drama"],
          readingPractice: {
            title: "Latihan Membaca: Naskah Drama",
            stimulusTitle: "Teman Sejati",
            stimulusText: `Babak 1 -- Ruang kelas SMP Harapan Bangsa, siang hari sepulang sekolah. RINA sedang duduk sendiri sambil memandangi ponselnya dengan wajah cemas. ANDI masuk dengan membawa dua bungkus nasi goreng.

ANDI: (Meletakkan nasi goreng di meja) Rin, gue beliin nasi goreng. Lu belum makan siang, kan?

RINA: (Masih menatap ponsel, suara bergetar) Makasih, Di. Gue... gue lagi gak selera.

ANDI: (Duduk di seberang, khawatir) Ada apa? Dari tadi keliatan murung.

RINA: (Menghela napas) Ini... papa gue dirawat di rumah sakit. Jantungnya bermasalah. Kata dokter, harus operasi. (Air mata menggenang) Biayanya lima puluh juta.

ANDI: (Diam beberapa saat) Berat, Rin. Tapi lu gak sendiri. Gue bakal bantu.

Babak 2 -- Halaman sekolah, seminggu kemudian. DINDIN dan SARI memegang kertas dan spidol.

DINDIN: (Bersemangat) Kita ngadain galang dana buat biaya operasi papa Rina! Jualan kue di kantin, terus pentas amal.

SARI: (Menambahkan) Gue udah izin ke Bu Kepala Sekolah. Beliau setuju!

Babak 3 -- Aula sekolah, malam pentas amal. Panggung dengan lampu warna-warni. ANDI tampil dengan gitar. Layar menunjukkan donasi Rp 47.230.000 dari target Rp 50.000.000.

ANDI: (Dari panggung) Kita udah ngumpulin 47 juta! Kurang 3 juta lagi!

Beberapa penonton naik ke panggung memberikan amplop. Angka di layar naik hingga Rp 52.000.000. Aula bergemuruh.

RINA: (Terisak, di panggung) Kalian bukan cuma temen... kalian keluarga kedua buat gue.`,
            questions: [
              { id: "8-drama-rp-01", type: "pilihan_ganda", questionText: "Konflik utama dalam naskah drama ini adalah...", options: ["Persaingan antar siswa", "Rina sakit dan dirawat", "Ayah Rina sakit keras dan butuh biaya operasi besar", "Pentas amal gagal"], correctAnswer: "Ayah Rina sakit keras dan butuh biaya operasi besar", explanation: "Konflik utama: ayah Rina sakit jantung, butuh biaya Rp50 juta.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-rp-02", type: "pilihan_ganda", questionText: "Tokoh yang pertama kali mengetahui masalah Rina adalah...", options: ["Sari", "Dindin", "Andi", "Kepala Sekolah"], correctAnswer: "Andi", explanation: "Andi menemui Rina di kelas dan Rina menceritakan masalahnya.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-rp-03", type: "pilihan_ganda", questionText: "Petunjuk lakuan '(Tersenyum haru)' menunjukkan...", options: ["Rina marah", "Rina sedih", "Rina terharu dan bersyukur", "Rina berpura-pura"], correctAnswer: "Rina terharu dan bersyukur", explanation: "Petunjuk lakuan 'tersenyum haru' menunjukkan rasa terharu dan syukur.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-rp-04", type: "pilihan_ganda", questionText: "Ide yang diajukan Dindin adalah...", options: ["Galang dana di media sosial", "Jualan kue di kantin dan pentas amal", "Meminjam uang ke bank", "Mengadakan lomba"], correctAnswer: "Jualan kue di kantin dan pentas amal", explanation: "Dindin mengusulkan jual kue dan pentas amal di Babak 2.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-rp-05", type: "pilihan_ganda", questionText: "Nilai karakter yang paling menonjol dalam drama ini adalah...", options: ["Kejujuran dan disiplin", "Persahabatan dan kepedulian sosial", "Kreativitas dan kemandirian", "Tanggung jawab dan kerja keras"], correctAnswer: "Persahabatan dan kepedulian sosial", explanation: "Tema persahabatan dan kepedulian mendominasi — teman-teman bahu-membahu.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-drama-rp-06", type: "pilihan_ganda", questionText: "Struktur drama Babak 1 termasuk bagian...", options: ["Orientasi dan komplikasi", "Klimaks", "Resolusi", "Koda"], correctAnswer: "Orientasi dan komplikasi", explanation: "Babak 1 berisi orientasi (pengenalan Rina) dan komplikasi (masalah ayah sakit).", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-drama-rp-07", type: "pilihan_ganda", questionText: "Klimaks drama adalah...", options: ["Rina menceritakan masalah", "Andi bernyanyi dan donasi mencapai Rp52 juta", "Dindin mengusulkan galang dana", "Rina pulang ke rumah"], correctAnswer: "Andi bernyanyi dan donasi mencapai Rp52 juta", explanation: "Klimaks saat donasi hampir cukup dan Andi mengajak penonton membantu.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-drama-rp-08", type: "pilihan_ganda", questionText: "Bahasa dalam dialog drama ini cenderung...", options: ["Formal dan baku", "Bahasa sehari-hari remaja tidak baku", "Bahasa ilmiah populer", "Bahasa daerah"], correctAnswer: "Bahasa sehari-hari remaja tidak baku", explanation: "Dialog menggunakan 'gue', 'lu', 'gak', 'temen' — bahasa pergaulan remaja.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-drama-rp-09", type: "pilihan_ganda", questionText: "Fungsi petunjuk lakuan '(Meletakkan nasi goreng di meja)' adalah...", options: ["Menjelaskan latar", "Memberi arahan gerak pada aktor", "Menjelaskan watak", "Menunjukkan alur"], correctAnswer: "Memberi arahan gerak pada aktor", explanation: "Petunjuk lakuan memberi arahan tentang tindakan yang harus dilakukan aktor.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-drama-rp-10", type: "pilihan_ganda", questionText: "Tokoh Andi digambarkan sebagai pribadi yang...", options: ["Egois dan acuh", "Pendiam dan pemalu", "Peduli, setia, dan proaktif", "Cerewet dan suka pamer"], correctAnswer: "Peduli, setia, dan proaktif", explanation: "Andi membawakan nasi, mendengarkan, dan aktif dalam galang dana.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-drama-rp-11", type: "jawaban_singkat", questionText: "Apa resolusi konflik dalam drama ini?", correctAnswer: "Teman-teman berhasil mengumpulkan dana Rp52 juta melalui galang dana dan pentas amal", explanation: "Donasi melebihi target Rp50 juta berkat kerja sama semua teman.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-drama-rp-12", type: "jawaban_singkat", questionText: "Sebutkan tiga tokoh selain Rina yang membantu!", correctAnswer: "Andi, Dindin, dan Sari", explanation: "Andi menghibur, Dindin mengusulkan ide, Sari mengurus izin.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-rp-13", type: "uraian", questionText: "Analisislah karakter Andi berdasarkan dialog dan petunjuk lakuan! Berikan bukti!", correctAnswer: ["Andi protagonis yang peduli (membeli nasi, 'gue bisa nemenin lu'), setia ('lu gak sendiri'), proaktif (ikut pentas), berani (tampil menyanyi). Petunjuk lakuan 'wajah berubah serius' menunjukkan empati."], explanation: "Karakter dianalisis dari dialog dan petunjuk lakuan.", skillTarget: "analisis struktur", difficulty: "menantang" },
              { id: "8-drama-rp-14", type: "uraian", questionText: "Apa pesan drama ini? Jelaskan merujuk konflik, tokoh, dan penyelesaian!", correctAnswer: ["Pesan: kekuatan persahabatan dan solidaritas. Konflik (biaya RS), tokoh (Andi, Dindin, Sari yang proaktif), resolusi (donasi terkumpul dengan kerja sama). Drama mengajarkan kepedulian dalam aksi nyata."], explanation: "Amanat disampaikan melalui konflik, aksi tokoh, dan penyelesaian.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Teks Drama",
            questions: [
              { id: "8-drama-qq-01", type: "pilihan_ganda", questionText: "Teks drama berbeda dari prosa karena...", options: ["Lebih panjang", "Disusun dalam dialog untuk dipentaskan", "Tidak memiliki tokoh", "Hanya dibaca"], correctAnswer: "Disusun dalam dialog untuk dipentaskan", explanation: "Drama ditulis dalam bentuk dialog dengan petunjuk lakuan untuk dipentaskan.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-qq-02", type: "pilihan_ganda", questionText: "Petunjuk lakuan berfungsi untuk...", options: ["Menambah panjang naskah", "Memberi arahan gerak, ekspresi, intonasi aktor", "Menjelaskan latar belakang penulis", "Menggantikan dialog"], correctAnswer: "Memberi arahan gerak, ekspresi, intonasi aktor", explanation: "Petunjuk lakuan memandu aktor memerankan tokoh.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-drama-qq-03", type: "pilihan_ganda", questionText: "Struktur drama yang benar adalah...", options: ["Pernyataan umum -- argumen -- penegasan", "Orientasi -- komplikasi -- klimaks -- resolusi", "Identifikasi -- deskripsi -- kesimpulan", "Pembuka -- isi -- penutup"], correctAnswer: "Orientasi -- komplikasi -- klimaks -- resolusi", explanation: "Drama berstruktur: orientasi, komplikasi, klimaks, resolusi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-drama-qq-04", type: "pilihan_ganda", questionText: "Unsur intrinsik drama sebagai ide pokok cerita adalah...", options: ["Tema", "Tokoh", "Alur", "Amanat"], correctAnswer: "Tema", explanation: "Tema adalah gagasan pokok yang mendasari cerita.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-qq-05", type: "pilihan_ganda", questionText: "Tokoh protagonis adalah...", options: ["Tokoh pelengkap", "Tokoh yang melawan tokoh utama", "Tokoh utama yang memiliki sifat baik", "Tokoh yang muncul sekali"], correctAnswer: "Tokoh utama yang memiliki sifat baik", explanation: "Protagonis adalah tokoh utama yang baik, menjadi pusat cerita.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-qq-06", type: "pilihan_ganda", questionText: "Drama satu aktor disebut...", options: ["Pantomim", "Monolog", "Dialog", "Opera"], correctAnswer: "Monolog", explanation: "Monolog dimainkan satu aktor, mengungkapkan isi pikiran tokoh.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-drama-qq-07", type: "pilihan_ganda", questionText: "Ciri kebahasaan teks drama adalah...", options: ["Kalimat imperatif dominan", "Dialog antartokoh sebagai unsur utama", "Kalimat panjang dan deskriptif", "Istilah teknis ilmiah"], correctAnswer: "Dialog antartokoh sebagai unsur utama", explanation: "Dialog adalah elemen utama drama, bukan narasi deskriptif.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-drama-qq-08", type: "pilihan_ganda", questionText: "Contoh petunjuk lakuan adalah...", options: ["Rina: Aku tidak percaya!", "(Rina berjalan mondar-mandir, wajah tegang)", "Rina berjalan mondar-mandir", "Rina berjalan dengan tegang"], correctAnswer: "(Rina berjalan mondar-mandir, wajah tegang)", explanation: "Petunjuk lakuan ditulis dalam tanda kurung.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-drama-qq-09", type: "pilihan_ganda", questionText: "Puncak konflik dalam drama disebut...", options: ["Orientasi", "Komplikasi", "Klimaks", "Resolusi"], correctAnswer: "Klimaks", explanation: "Klimaks adalah puncak ketegangan tertinggi dalam drama.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-drama-qq-10", type: "pilihan_ganda", questionText: "Dialog yang baik sebaiknya...", options: ["Panjang seperti pidato", "Alami dan sesuai karakter tokoh", "Menggunakan bahasa kiasan rumit", "Semua tokoh sama"], correctAnswer: "Alami dan sesuai karakter tokoh", explanation: "Dialog alami mencerminkan kepribadian masing-masing tokoh.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-drama-qq-11", type: "jawaban_singkat", questionText: "Apa perbedaan drama tradisional dan modern?", correctAnswer: "Drama tradisional improvisasi, drama modern punya naskah tertulis", explanation: "Drama tradisional (lenong, ketoprak) improvisatif, drama modern memiliki naskah.", skillTarget: "pemahaman isi", difficulty: "menantang" },
              { id: "8-drama-qq-12", type: "jawaban_singkat", questionText: "Sebutkan tiga jenis drama!", correctAnswer: "Drama tradisional, drama modern, monolog", explanation: "Jenis drama berdasarkan bentuk penyajian.", skillTarget: "pemahaman isi", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Mulai dengan improvisasi sebelum menulis naskah","Tekankan kerja tim","Gunakan read through sebelum latihan","Rekam latihan untuk evaluasi diri"],
            commonMisconceptions: [
              { misconception: "Drama hanya tentang menghafal dialog.", correction: "Drama adalah seni total: ekspresi, gerak, intonasi, interaksi, properti, tata panggung." },
              { misconception: "Aktor harus berlebihan di panggung.", correction: "Akting baik terlihat alami dan meyakinkan, disesuaikan karakter." },
            ],
            feedbackGuide: ["Umpan balik spesifik pada akting","Tandai dialog paling alami","Gunakan rekaman sebagai alat evaluasi","Fokus satu aspek per sesi"],
            classroomManagement: ["Kelompok heterogen 5-7 orang","Sediakan sudut properti","Timer setiap sesi latihan","Atur tempat duduk setengah lingkaran","Sediakan ruang gerak cukup"],
          },
          reflection: {
            studentQuestions: ["Apa tersulit dalam menulis dialog?","Bagaimana membuat dialog alami?","Karakter mana paling menantang?","Apa yang membuat pementasan berhasil?"],
            teacherQuestions: ["Apakah dialog mencerminkan karakter?","Strategi apa bantu siswa atasi malu?","Apakah waktu cukup?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Teks Drama. Materi mencakup: pengertian drama, unsur intrinsik (tema, tokoh, alur, latar, dialog, petunjuk lakuan), struktur (orientasi, komplikasi, klimaks, resolusi), jenis drama, dan ciri kebahasaan. Sertakan contoh naskah drama pendek. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik penilaian 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["drama","naskah","dialog","tokoh","lakuan","panggung","monolog","babak","konflik","klimaks"],
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
          kd: "Membaca dan Memirsa · Menulis",
          emoji: "\u{1F30D}",
          description: "Memahami, menganalisis, dan menulis teks eksplanasi tentang fenomena alam, sosial, atau budaya secara logis, sistematis, dan informatif.",
          overview: "Pernahkah siswa bertanya mengapa gunung meletus atau bagaimana hujan terbentuk? Teks eksplanasi menjawab pertanyaan itu. Bab ini mengajak siswa menjadi penjelas yang cerdas \u2014 mampu menguraikan proses, sebab-akibat, dan alasan di balik berbagai fenomena. Dari siklus air hingga kemacetan lalu lintas, siswa belajar menyusun penjelasan ilmiah yang mudah dipahami. Pembelajaran melatih berpikir kausal, sistematis, dan keterampilan menulis informatif.",
          learningGoals: [
            "Memahami pengertian, tujuan, dan ciri-ciri teks eksplanasi",
            "Mengidentifikasi struktur teks eksplanasi: pernyataan umum, urutan sebab-akibat, interpretasi",
            "Menganalisis fenomena alam, sosial, atau budaya dari segi proses dan penyebab",
            "Menulis teks eksplanasi dengan informasi akurat dan urutan logis",
            "Menyajikan teks eksplanasi secara lisan dengan bahasa ilmiah populer",
          ],
          keywords: ["eksplanasi","fenomena","sebab-akibat","proses","kausalitas","ilmiah","fakta","urutan","interpretasi","penjelasan"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Teks eksplanasi adalah teks yang menjelaskan proses terjadinya suatu fenomena alam, sosial, atau budaya secara logis, sistematis, dan berdasarkan fakta. Tujuannya menjawab pertanyaan 'mengapa' dan 'bagaimana' suatu fenomena terjadi. Teks eksplanasi bersifat informatif dan ilmiah \u2014 menyajikan data dan fakta yang dapat diverifikasi.",
              characteristics: [
                "Menjelaskan proses atau tahapan secara kronologis atau kausal",
                "Bersifat informatif dan faktual berdasarkan data ilmiah",
                "Menggunakan istilah teknis berkaitan dengan fenomena",
                "Struktur: pernyataan umum, urutan sebab-akibat, interpretasi",
                "Informasi objektif dan dapat diverifikasi",
              ],
              socialFunction: "Membantu masyarakat memahami berbagai fenomena di sekitar. Pengetahuan tentang banjir, gempa, atau perubahan iklim tersampaikan secara sistematis kepada publik melalui teks eksplanasi.",
              lifeBenefits: "Mengembangkan pemikiran logis, sistematis, dan berbasis data. Berguna untuk penulisan laporan penelitian, artikel ilmiah populer, dan komunikasi teknis.",
              distinction: "Berbeda dari deskripsi yang hanya menggambarkan. Berbeda dari prosedur yang memberi petunjuk. Eksplanasi menjelaskan bagaimana sesuatu terjadi secara alami.",
            },
            contentComposition: {
              infoPoints: ["Teks eksplanasi menjawab mengapa dan bagaimana","Struktur: pernyataan umum, urutan sebab-akibat, interpretasi","Fenomena: alam, sosial, atau budaya","Data dan fakta terverifikasi","Konjungsi kausal dan temporal sebagai ciri utama"],
              buildingElements: ["Fenomena sebagai objek","Pernyataan umum sebagai pengantar","Urutan sebab-akibat sebagai penjelasan","Data dan fakta pendukung","Interpretasi sebagai penutup"],
              mainIdeas: ["Setiap fenomena memiliki sebab yang bisa dijelaskan ilmiah","Penjelasan dari umum ke khusus","Data memperkuat kredibilitas","Bahasa jelas, akurat, mudah dipahami"],
              partRelationships: "Pernyataan umum memperkenalkan fenomena. Urutan sebab-akibat menguraikan proses secara sistematis. Interpretasi menutup dengan kesimpulan. Ketiganya terkait logis.",
              simpleExample: "Hujan terbentuk dari penguapan air laut oleh sinar matahari. Uap naik ke atmosfer dan mengalami kondensasi menjadi awan. Ketika butiran air cukup berat, mereka jatuh sebagai hujan.",
            },
            textVariants: {
              types: ["eksplanasi alam","eksplanasi sosial","eksplanasi budaya","eksplanasi teknologi"],
              variantDescriptions: [
                { name: "Eksplanasi Alam", description: "Fenomena alam: gempa, tsunami, gunung meletus, siklus air, fotosintesis.", example: "Gempa bumi terjadi akibat pelepasan energi dalam bumi. Lempeng tektonik bergerak dan menciptakan gelombang seismik yang merambat ke permukaan." },
                { name: "Eksplanasi Sosial", description: "Fenomena sosial: kemacetan, urbanisasi, tawuran, perubahan gaya hidup.", example: "Kemacetan disebabkan ketidakseimbangan jumlah kendaraan dan kapasitas jalan. Pertumbuhan ekonomi meningkatkan kepemilikan kendaraan." },
                { name: "Eksplanasi Budaya", description: "Asal-usul, proses, makna tradisi atau kesenian daerah.", example: "Mudik berawal dari kebiasaan perantau pulang kampung saat Lebaran. Fenomena ini adalah kebutuhan psikologis bersilaturahmi." },
              ],
              groupingBasis: "Berdasarkan jenis fenomena: alam (proses alami), sosial (interaksi manusia), budaya (tradisi).",
            },
            structurePattern: {
              generalPattern: [
                { name: "Pernyataan Umum", description: "Pembuka yang memperkenalkan fenomena. Berisi definisi dan gambaran awal." },
                { name: "Urutan Sebab-Akibat", description: "Inti teks yang menjelaskan proses secara bertahap. Kronologis atau kausal." },
                { name: "Interpretasi", description: "Penutup berupa kesimpulan atau makna fenomena. Opsional." },
              ],
              variationNotes: "Tidak semua eksplanasi punya interpretasi. Eksplanasi sosial sering sertakan data statistik. Eksplanasi alam banyak istilah teknis.",
              readingGuide: "Identifikasi fenomena. Perhatikan urutan sebab-akibat. Catat istilah teknis. Evaluasi apakah penjelasan logis dan didukung data.",
            },
            languageFeatures: {
              register: "Ragam ilmiah populer: formal, baku, komunikatif. Istilah teknis digunakan untuk ketepatan tetapi dijelaskan untuk pembaca awam.",
              features: [
                { name: "Konjungsi Kausal", description: "Penghubung sebab-akibat.", example: "karena, sebab, oleh karena itu, sehingga, akibatnya" },
                { name: "Konjungsi Temporal", description: "Penghubung urutan waktu.", example: "kemudian, selanjutnya, setelah itu, lalu, akhirnya" },
                { name: "Istilah Teknis", description: "Kosakata khusus sesuai fenomena.", example: "Gempa: seismik, episentrum, magnitudo. Hujan: evaporasi, kondensasi, presipitasi." },
                { name: "Kalimat Deklaratif", description: "Pernyataan informatif.", example: "Gempa bumi terjadi karena pergerakan lempeng tektonik." },
                { name: "Kata Kerja Material/Relasional", description: "Verba proses fisik dan hubungan kausal.", example: "bergerak, menguap, menyebabkan, terdiri atas" },
              ],
              wordChoice: "Tepat, akurat, baku. Istilah teknis dijelaskan di awal. Hindari kata emosional. Data kuantitatif dengan angka spesifik.",
              sentencePattern: "Kalimat cenderung panjang dan kompleks untuk hubungan kausal. Majemuk setara dan bertingkat dominan. Fokus pada fenomena.",
              conjunctions: "Kausal: karena, sebab, sehingga, akibatnya, dengan demikian, maka. Temporal: kemudian, selanjutnya, setelah itu, lalu, akhirnya.",
              style: "Informatif dan lugas. Tidak menggunakan majas. Fokus kejelasan. Paragraf koheren dengan ide pokok jelas.",
              spelling: "EYD V. Istilah asing miring di awal. Satuan dan singkatan sesuai kaidah.",
              punctuation: "Koma setelah konjungsi di awal kalimat. Titik dua sebelum perincian. Kurung untuk keterangan tambahan.",
            },
            productionProcedure: {
              preProduction: ["Pilih fenomena menarik","Kumpulkan data dari sumber terpercaya","Catat fakta dan istilah teknis","Buat kerangka: pernyataan umum, sebab-akibat, interpretasi"],
              production: ["Tulis pernyataan umum","Susun urutan sebab-akibat logis","Gunakan data pendukung","Hubungkan dengan konjungsi tepat","Tulis interpretasi penutup"],
              revision: ["Periksa urutan logis","Verifikasi data dan fakta","Periksa istilah teknis","Minta teman menguji kejelasan"],
              editing: ["Perbaiki ejaan dan tanda baca","Periksa konsistensi istilah","Pastikan konjungsi tepat"],
              publication: ["Presentasi dengan media visual","Poster infografis","Unggah di blog kelas","Buku saku kumpulan eksplanasi"],
              bestPractices: ["Pilih fenomena dekat siswa","Gunakan analogi untuk istilah rumit","Visualisasi diagram sangat membantu","Sertakan data terkini"],
            },
          },
          exampleText: {
            title: "Proses Terjadinya Pelangi",
            content: "Pelangi adalah fenomena optik yang terjadi ketika sinar matahari dibiaskan oleh butiran air di atmosfer, menghasilkan spektrum warna. Fenomena ini sering terlihat setelah hujan gerimis. Prosesnya dimulai ketika sinar matahari melewati butiran air. Sinar putih dibiaskan dan diuraikan menjadi spektrum warna: merah, jingga, kuning, hijau, biru, nila, ungu (MEJIKUHIBINIU). Setelah dibiaskan, cahaya dipantulkan di dinding belakang butiran air dan dibiaskan lagi saat keluar. Pelangi berbentuk busur karena kita melihatnya dari sudut 42 derajat. Pelangi bukan objek fisik \u2014 setiap orang melihat pelangi yang 'berbeda' karena sudut pandangnya unik.",
            analysis: {
              structure: "Pernyataan umum (definisi pelangi), urutan sebab-akibat (pembiasan, spektrum, sudut 42\u00B0), interpretasi (pelangi sebagai ilusi optik).",
              content: "Penjelasan ilmiah akurat tentang pembiasan dan penguraian cahaya. Data sudut 42\u00B0 dan MEJIKUHIBINIU menambah kejelasan. Fakta pelangi bukan objek fisik memberi perspektif baru.",
              language: "Istilah teknis (difraksi, spektrum, panjang gelombang) dijelaskan. Konjungsi kausal (karena, sehingga) dan temporal (kemudian, setelah itu).",
              strengths: "Urutan logis, data spesifik, istilah dijelaskan, penutup perspektif baru, relevan.",
              improvements: "Tambah diagram pembiasan. Sertakan fakta sejarah atau budaya tentang pelangi.",
            },
          },
          learningActivities: {
            opening: ["Guru menunjukkan foto/video fenomena alam, siswa menjelaskan penyebabnya","Tanya jawab fenomena yang pernah dialami","Permainan tebak proses","Sampaikan tujuan pembelajaran"],
            core: ["Membaca contoh teks eksplanasi","Diskusi identifikasi struktur","Latihan menemukan konjungsi kausal dan temporal","Membandingkan eksplanasi alam vs sosial","Praktik menulis eksplanasi bertahap"],
            group: ["Setiap kelompok mendapat fenomena berbeda","Menyusun teks dengan data dari berbagai sumber","Membuat infografis proses","Presentasi dengan media visual"],
            individual: ["Menulis eksplanasi fenomena pilihan","Analisis artikel sains populer","Peta konsep sebab-akibat","Glosarium istilah teknis"],
            reflection: ["Diskusi perbedaan menjelaskan vs menyebutkan fakta","Jurnal: fenomena paling menarik","Refleksi: bagaimana eksplanasi mengubah cara lihat dunia?"],
          },
          worksheet: {
            title: "Lembar Kerja: Menulis Teks Eksplanasi",
            purpose: "Membantu siswa menyusun teks eksplanasi dengan struktur lengkap, informasi akurat, urutan logis.",
            instructions: ["Pilih fenomena alam/sosial/budaya","Kumpulkan info dari minimal 3 sumber","Buat kerangka","Tulis teks dengan data pendukung","Periksa urutan logis"],
            activities: [
              { name: "Riset", items: ["Tentukan fenomena","Cari dari buku/artikel/situs terpercaya","Catat data penting","Buat daftar istilah teknis","Verifikasi informasi"] },
              { name: "Penulisan", items: ["Tulis pernyataan umum","Susun urutan sebab-akibat","Sertakan data pendukung","Hubungkan dengan konjungsi","Tutup dengan interpretasi"] },
              { name: "Evaluasi", items: ["Periksa urutan logis","Verifikasi data","Minta teman menilai kejelasan","Revisi berdasarkan masukan"] },
            ],
            studentOutput: "Teks eksplanasi 3-4 paragraf dengan struktur lengkap, data akurat, urutan logis.",
          },
          assessment: {
            diagnostic: [
              { question: "Fenomena alam apa yang paling membuatmu penasaran?", purpose: "Mengetahui minat untuk pemilihan topik" },
              { question: "Jelaskan bagaimana hujan terbentuk!", purpose: "Mengidentifikasi kemampuan berpikir kausal" },
              { question: "Apa beda menceritakan dengan menjelaskan?", purpose: "Memahami pemahaman siswa" },
            ],
            formative: [
              { method: "Cek kerangka", criteria: ["Struktur jelas","Urutan logis","Data direncanakan","Istilah teknis teridentifikasi"] },
              { method: "Observasi diskusi", criteria: ["Ide sebab-akibat","Istilah teknis tepat","Terima masukan","Bantu kelompok"] },
              { method: "Cek draf", criteria: ["Struktur lengkap","Penjelasan logis","Data mendukung","Konjungsi digunakan"] },
            ],
            summative: [
              { type: "Menulis Teks Eksplanasi", description: "Teks 4-5 paragraf tentang fenomena dengan struktur lengkap, data akurat, urutan logis" },
              { type: "Presentasi Infografis", description: "Poster infografis proses fenomena dengan data dan istilah teknis" },
            ],
          },
          rubric: {
            aspects: [
              { name: "Kelengkapan Struktur", criteria: [{ level: "4", description: "Pernyataan umum, urutan sebab-akibat, interpretasi lengkap dan sistematis" },{ level: "3", description: "Struktur lengkap tetapi satu bagian kurang terperinci" },{ level: "2", description: "Hanya 2 dari 3 bagian jelas" },{ level: "1", description: "Struktur tidak sesuai" }] },
              { name: "Keakuratan Informasi", criteria: [{ level: "4", description: "Akurat, sumber terpercaya, istilah teknis tepat dan dijelaskan" },{ level: "3", description: "Akurat tetapi istilah teknis tidak dijelaskan" },{ level: "2", description: "Kurang akurat atau satu kesalahan fakta" },{ level: "1", description: "Tidak akurat, banyak kesalahan" }] },
              { name: "Urutan Logis", criteria: [{ level: "4", description: "Sangat logis, hubungan antartahap jelas, mudah diikuti" },{ level: "3", description: "Cukup logis tetapi ada satu lompatan" },{ level: "2", description: "Kurang logis, beberapa bagian tidak nyambung" },{ level: "1", description: "Acak dan tidak logis" }] },
              { name: "Penggunaan Konjungsi", criteria: [{ level: "4", description: "Kausal dan temporal bervariasi dan tepat" },{ level: "3", description: "Tepat tetapi kurang bervariasi" },{ level: "2", description: "Jarang digunakan, hubungan tidak jelas" },{ level: "1", description: "Tidak bermakna" }] },
            ],
          },
          differentiation: {
            support: ["Diagram/bagan proses sebagai alat bantu","Bank istilah teknis dengan definisi","Video fenomena sebelum menulis","Kerangka dengan kalimat pembuka","Bimbingan membaca sumber"],
            regular: ["Kebebasan memilih fenomena","Berbagai sumber informasi","Bimbingan bertahap","Kesempatan presentasi"],
            challenge: ["Fenomena yang masih diperdebatkan","Bandingkan dua teori","Artikel sains populer untuk publikasi","Model 3D proses fenomena"],
          },
          remedial: ["Identifikasi sebab-akibat dari kalimat sederhana","Susun urutan dari kartu bergambar","Pahami istilah teknis dengan analogi","Pendampingan mencatat data","Fokus fenomena sederhana"],
          enrichment: ["Kunjungi museum sains","Baca buku sains populer","Eksplanasi dalam bahasa Inggris","Video dokumenter fenomena"],
          readingPractice: {
            title: "Latihan Membaca: Teks Eksplanasi",
            stimulusTitle: "Mengapa Gunung Meletus?",
            stimulusText: `Gunung meletus adalah salah satu fenomena alam paling dahsyat di bumi. Indonesia, yang berada di jalur Cincin Api Pasifik, sering mengalami gunung meletus. Namun, apa yang menyebabkan gunung meletus? Bagaimana prosesnya hingga magma keluar ke permukaan?

Di dalam perut bumi terdapat mantel bumi berisi batuan cair pijar yang disebut magma. Suhunya mencapai ribuan derajat Celsius. Magma terus bergerak karena perbedaan suhu dan tekanan -- gerakan ini disebut konveksi magma. Magma yang naik ke permukaan akan terkumpul di kantong magma di bawah gunung berapi.

Seiring waktu, tekanan di kantong magma semakin besar karena volume magma bertambah dan gas terlarut terakumulasi -- mirip botol soda yang dikocok. Gas seperti uap air (H2O), karbon dioksida (CO2), dan sulfur dioksida (SO2) semakin tertekan.

Ketika tekanan tak tertahankan, magma mencari jalan keluar melalui retakan kerak bumi. Magma yang keluar disebut lava. Letusan bisa eksplosif (meledak) atau efusif (mengalir), tergantung kandungan gas dan kekentalan magma. Letusan eksplosif terjadi ketika magma kental dan kaya gas -- seperti Krakatau 1883. Letusan efusif ketika magma encer -- seperti Kilauea, Hawaii.

Letusan gunung membawa dampak positif (abu vulkanik menyuburkan tanah) dan negatif (lava rusak pemukiman, awan panas mematikan, hujan abu ganggu pernapasan). Oleh karena itu, PVMBG memantau gunung aktif menggunakan seismograf, GPS, dan kamera termal. Dengan pemahaman ilmiah, kita bisa mengurangi risiko bencana.`,
            questions: [
              { id: "8-eksplanasi-rp-01", type: "pilihan_ganda", questionText: "Fenomena yang dijelaskan dalam teks adalah...", options: ["Gempa bumi", "Gunung meletus", "Tsunami", "Tanah longsor"], correctAnswer: "Gunung meletus", explanation: "Seluruh teks menjelaskan proses terjadinya gunung meletus.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-rp-02", type: "pilihan_ganda", questionText: "Indonesia sering mengalami gunung meletus karena...", options: ["Terletak di daerah tropis", "Berada di jalur Cincin Api Pasifik", "Dikelilingi samudra luas", "Banyak gunung tinggi"], correctAnswer: "Berada di jalur Cincin Api Pasifik", explanation: "Indonesia di Ring of Fire, daerah aktivitas vulkanik tinggi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-rp-03", type: "pilihan_ganda", questionText: "Magma adalah...", options: ["Batuan cair pijar di perut bumi", "Air panas dari dalam bumi", "Gas beracun dari gunung", "Abu hasil letusan"], correctAnswer: "Batuan cair pijar di perut bumi", explanation: "Magma adalah batuan cair pijar di mantel bumi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-rp-04", type: "pilihan_ganda", questionText: "Gas yang terlarut dalam magma adalah...", options: ["Oksigen dan nitrogen", "H2O, CO2, dan SO2", "Hidrogen dan helium", "Ozon dan metana"], correctAnswer: "H2O, CO2, dan SO2", explanation: "Teks menyebut uap air (H2O), CO2, dan SO2.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksplanasi-rp-05", type: "pilihan_ganda", questionText: "Struktur teks eksplanasi terdiri dari...", options: ["Orientasi, komplikasi, resolusi", "Pernyataan umum, urutan sebab-akibat, interpretasi", "Tesis, argumen, penegasan ulang", "Identifikasi, klasifikasi, deskripsi"], correctAnswer: "Pernyataan umum, urutan sebab-akibat, interpretasi", explanation: "Struktur baku eksplanasi: pernyataan umum, sebab-akibat, interpretasi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksplanasi-rp-06", type: "pilihan_ganda", questionText: "Paragraf pertama termasuk bagian...", options: ["Urutan sebab-akibat", "Interpretasi", "Pernyataan umum", "Kesimpulan"], correctAnswer: "Pernyataan umum", explanation: "Paragraf pertama memperkenalkan fenomena gunung meletus secara umum.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksplanasi-rp-07", type: "pilihan_ganda", questionText: "Konjungsi kausal dalam teks ini adalah...", options: ["Kemudian, setelah itu", "Karena, sehingga, oleh karena itu", "Dan, serta, juga", "Atau, tetapi"], correctAnswer: "Karena, sehingga, oleh karena itu", explanation: "Konjungsi kausal: 'karena perbedaan suhu', 'sehingga disebut konveksi'.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-eksplanasi-rp-08", type: "pilihan_ganda", questionText: "Letusan efusif berbeda dari eksplosif dalam hal...", options: ["Lokasi gunung", "Kandungan gas dan kekentalan magma", "Waktu terjadinya", "Suhu magma"], correctAnswer: "Kandungan gas dan kekentalan magma", explanation: "Eksplosif: magma kental kaya gas. Efusif: magma encer.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksplanasi-rp-09", type: "pilihan_ganda", questionText: "Dampak positif letusan gunung adalah...", options: ["Rusaknya pemukiman", "Abu vulkanik menyuburkan tanah", "Gangguan penerbangan", "Aliran lahar dingin"], correctAnswer: "Abu vulkanik menyuburkan tanah", explanation: "Abu vulkanik mengandung mineral baik untuk pertanian.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-rp-10", type: "pilihan_ganda", questionText: "Kalimat 'Letusan bisa eksplosif atau efusif' menggunakan konjungsi...", options: ["Temporal", "Kausal", "Disjungtif (alternatif)", "Aditif"], correctAnswer: "Disjungtif (alternatif)", explanation: "Kata 'atau' menyatakan pilihan alternatif.", skillTarget: "identifikasi kebahasaan", difficulty: "menantang" },
              { id: "8-eksplanasi-rp-11", type: "jawaban_singkat", questionText: "Apa yang menyebabkan magma bergerak naik?", correctAnswer: "Tekanan dari volume magma dan akumulasi gas terlarut", explanation: "Tekanan meningkat karena volume magma dan gas terlarut.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksplanasi-rp-12", type: "jawaban_singkat", questionText: "Sebutkan dua alat pemantau gunung berapi!", correctAnswer: "Seismograf, GPS, dan kamera termal (cukup dua)", explanation: "PVMBG menggunakan seismograf, GPS, dan kamera termal.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-rp-13", type: "jawaban_singkat", questionText: "Dari lapisan bumi mana magma berasal?", correctAnswer: "Mantel bumi", explanation: "Magma berasal dari mantel bumi yang berisi batuan cair pijar.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-rp-14", type: "uraian", questionText: "Jelaskan proses gunung meletus secara berurutan menggunakan konjungsi kausal dan temporal!", correctAnswer: ["Pertama, magma di mantel bumi bergerak naik karena konveksi. Kedua, magma terkumpul di kantong magma sehingga tekanan meningkat. Ketiga, karena gas terlarut terakumulasi, tekanan semakin besar. Keempat, ketika tekanan tak tertahankan, magma keluar melalui retakan kerak bumi sehingga terjadi letusan."], explanation: "Proses melalui tiga tahap: pergerakan, akumulasi tekanan, letusan.", skillTarget: "analisis struktur", difficulty: "menantang" },
              { id: "8-eksplanasi-rp-15", type: "uraian", questionText: "Mengapa pemahaman tentang proses gunung meletus penting bagi Indonesia?", correctAnswer: ["Indonesia di Cincin Api Pasifik dengan banyak gunung aktif. Pemahaman membantu: (1) mengenali tanda awal letusan, (2) evakuasi tepat waktu, (3) mengurangi risiko, (4) memanfaatkan dampak positif seperti kesuburan tanah."], explanation: "Pemahaman ilmiah penting untuk mitigasi bencana.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Teks Eksplanasi",
            questions: [
              { id: "8-eksplanasi-qq-01", type: "pilihan_ganda", questionText: "Tujuan teks eksplanasi adalah...", options: ["Menghibur", "Menjelaskan proses fenomena", "Membujuk melakukan sesuatu", "Mendeskripsikan objek"], correctAnswer: "Menjelaskan proses fenomena", explanation: "Eksplanasi menjelaskan mengapa dan bagaimana fenomena terjadi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-qq-02", type: "pilihan_ganda", questionText: "Struktur eksplanasi yang benar...", options: ["Tesis -- argumen -- penegasan", "Pernyataan umum -- sebab-akibat -- interpretasi", "Orientasi -- komplikasi -- resolusi", "Identifikasi -- klasifikasi -- deskripsi"], correctAnswer: "Pernyataan umum -- sebab-akibat -- interpretasi", explanation: "Struktur baku eksplanasi.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-eksplanasi-qq-03", type: "pilihan_ganda", questionText: "Ciri kebahasaan eksplanasi adalah banyak menggunakan...", options: ["Kalimat imperatif", "Konjungsi kausal dan temporal", "Kalimat langsung", "Majas dan kiasan"], correctAnswer: "Konjungsi kausal dan temporal", explanation: "Eksplanasi menggunakan konjungsi kausal (karena) dan temporal (kemudian).", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-eksplanasi-qq-04", type: "pilihan_ganda", questionText: "Contoh fenomena sosial yang bisa dijelaskan eksplanasi...", options: ["Fotosintesis", "Kemacetan lalu lintas", "Gempa bumi", "Siklus air"], correctAnswer: "Kemacetan lalu lintas", explanation: "Kemacetan adalah fenomena sosial akibat interaksi manusia.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksplanasi-qq-05", type: "pilihan_ganda", questionText: "Istilah teknis dalam teks gunung meletus...", options: ["Indah, megah", "Magma, lava, seismograf", "Cepat, lambat", "Panas, dingin"], correctAnswer: "Magma, lava, seismograf", explanation: "Istilah teknis khusus bidang vulkanologi.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-eksplanasi-qq-06", type: "pilihan_ganda", questionText: "Interpretasi dalam eksplanasi berisi...", options: ["Definisi fenomena", "Kesimpulan/makna fenomena", "Urutan proses", "Data pendukung"], correctAnswer: "Kesimpulan/makna fenomena", explanation: "Interpretasi adalah penutup berisi kesimpulan atau makna.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksplanasi-qq-07", type: "pilihan_ganda", questionText: "Perbedaan eksplanasi dan prosedur adalah...", options: ["Eksplanasi lebih pendek", "Eksplanasi menjelaskan mengapa, prosedur bagaimana melakukan", "Prosedur pakai angka", "Eksplanasi hanya alam"], correctAnswer: "Eksplanasi menjelaskan mengapa, prosedur bagaimana melakukan", explanation: "Eksplanasi menjawab 'mengapa', prosedur 'bagaimana cara'.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-eksplanasi-qq-08", type: "pilihan_ganda", questionText: "Kata 'konveksi' berarti...", options: ["Penguapan", "Gerakan magma karena perbedaan suhu dan tekanan", "Pembekuan", "Pelapukan"], correctAnswer: "Gerakan magma karena perbedaan suhu dan tekanan", explanation: "Konveksi adalah pergerakan akibat perbedaan suhu dan tekanan.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksplanasi-qq-09", type: "pilihan_ganda", questionText: "Sumber informasi eksplanasi sebaiknya...", options: ["Opini penulis", "Data ilmiah terverifikasi", "Hasil wawancara satu orang", "Cerita rakyat"], correctAnswer: "Data ilmiah terverifikasi", explanation: "Eksplanasi bersifat ilmiah, informasinya harus terverifikasi.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-eksplanasi-qq-10", type: "pilihan_ganda", questionText: "Eksplanasi budaya bisa menjelaskan...", options: ["Cara membuat kerajinan", "Asal-usul tradisi mudik", "Resep masakan", "Langkah menari"], correctAnswer: "Asal-usul tradisi mudik", explanation: "Eksplanasi budaya menjelaskan asal-usul dan makna tradisi.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksplanasi-qq-11", type: "jawaban_singkat", questionText: "Sebutkan dua jenis fenomena untuk eksplanasi!", correctAnswer: "Fenomena alam (gunung meletus) dan sosial (kemacetan)", explanation: "Eksplanasi mencakup fenomena alam dan sosial.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksplanasi-qq-12", type: "jawaban_singkat", questionText: "Apa itu urutan sebab-akibat dalam eksplanasi?", correctAnswer: "Bagian inti yang menjelaskan proses fenomena secara bertahap dan logis", explanation: "Urutan sebab-akibat adalah penjelasan bertahap tentang proses fenomena.", skillTarget: "analisis struktur", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Gunakan fenomena dekat keseharian","Visualisasi dengan diagram","Ajarkan fakta vs mitos","Tegaskan verifikasi sumber"],
            commonMisconceptions: [
              { misconception: "Eksplanasi sama dengan deskripsi.", correction: "Deskripsi menggambarkan 'apa', eksplanasi menjelaskan 'mengapa dan bagaimana'." },
              { misconception: "Panjang = baik.", correction: "Kualitas diukur dari kejelasan hubungan sebab-akibat, bukan panjang." },
            ],
            feedbackGuide: ["Umpan balik pada kejelasan sebab-akibat","Tandai konjungsi tepat","Verifikasi data siswa","Fokus urutan logis"],
            classroomManagement: ["Sediakan akses sumber informasi","Jadwal presentasi teratur","Timer setiap fase","Kamus dan glosarium di meja","Kelompok heterogen"],
          },
          reflection: {
            studentQuestions: ["Fenomena apa paling menarik?","Bagaimana pastikan data akurat?","Apa beda eksplanasi dengan laporan?"],
            teacherQuestions: ["Apakah sebab-akibat logis?","Apakah siswa bedakan fakta dan opini?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Teks Eksplanasi. Materi mencakup: pengertian, struktur (pernyataan umum, urutan sebab-akibat, interpretasi), ciri kebahasaan (konjungsi kausal/temporal, istilah teknis), jenis fenomena. Sertakan contoh teks eksplanasi tentang pelangi. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["eksplanasi","fenomena","sebab-akibat","proses","kausalitas","ilmiah","fakta","urutan","interpretasi"],
          isReady: true,
        },
{
          id: "viii-eksposisi",
          slug: "teks-eksposisi",
          grade: "VIII",
          phase: "D",
          semester: 1,
          chapterNumber: 4,
          title: "Bab 4: Teks Eksposisi",
          shortTitle: "Eksposisi",
          kd: "Menulis",
          emoji: "\u{1F4DD}",
          description: "Mengenal, menganalisis, dan menulis teks eksposisi untuk menyampaikan gagasan, argumen, dan fakta secara logis dan persuasif.",
          overview: "Setiap hari kita dihadapkan pada berbagai argumen \u2014 dari iklan, artikel, pidato, hingga unggahan media sosial. Teks eksposisi adalah seni menyampaikan gagasan dengan argumen yang logis dan fakta yang kuat. Bab ini membekali siswa kemampuan mengidentifikasi, menganalisis, dan menulis teks eksposisi. Siswa akan belajar membedakan fakta dan opini, mengembangkan argumen dengan data, serta menyusun tulisan yang meyakinkan. Mereka akan berlatih berpikir kritis, menyusun pendapat secara terstruktur, dan mengomunikasikan gagasan dengan efektif.",
          learningGoals: [
            "Memahami pengertian, ciri-ciri, dan jenis-jenis teks eksposisi",
            "Mengidentifikasi struktur teks eksposisi: tesis, argumen, penegasan ulang",
            "Membedakan fakta dan opini dalam teks eksposisi",
            "Menulis teks eksposisi dengan argumen logis dan data pendukung",
            "Menyajikan teks eksposisi secara lisan dalam bentuk pidato atau debat",
          ],
          keywords: ["eksposisi","argumen","tesis","fakta","opini","data","persuasif","logis","kesimpulan","pidato"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Teks eksposisi adalah teks yang menyampaikan gagasan atau pendapat penulis tentang suatu isu disertai argumen, fakta, dan data yang mendukung. Tujuannya meyakinkan pembaca bahwa gagasan yang disampaikan layak dipertimbangkan. Teks eksposisi bersifat informatif sekaligus argumentatif \u2014 tidak hanya memberi informasi tetapi juga membujuk secara logis.",
              characteristics: [
                "Menyampaikan gagasan atau pendapat penulis secara jelas",
                "Disertai argumen logis yang didukung fakta dan data",
                "Bersifat informatif dan argumentatif",
                "Struktur: tesis, argumen, penegasan ulang",
                "Menggunakan kata-kata persuasif dan logis",
                "Objektif meskipun menyampaikan pendapat",
              ],
              socialFunction: "Teks eksposisi berfungsi sebagai media penyampaian gagasan dalam diskusi publik, artikel opini, pidato, debat, dan esai. Masyarakat menggunakannya untuk memengaruhi opini publik, mengkritik kebijakan, atau mengadvokasi perubahan.",
              lifeBenefits: "Kemampuan menulis eksposisi melatih berpikir kritis dan sistematis. Berguna dalam presentasi akademik, esai beasiswa, artikel ilmiah populer, dan komunikasi profesional.",
              distinction: "Berbeda dari narasi yang bercerita. Berbeda dari deskripsi yang menggambarkan. Eksposisi bertujuan meyakinkan dengan argumen, bukan sekadar menyajikan informasi.",
            },
            contentComposition: {
              infoPoints: ["Eksposisi berisi gagasan + argumen + data","Tesis adalah pernyataan pendapat penulis","Argumen minimal 3 untuk mendukung tesis","Fakta, data, dan contoh kuatkan argumen","Penegasan ulang memperkuat posisi penulis"],
              buildingElements: ["Tesis sebagai gagasan utama","Argumen sebagai alasan pendukung","Fakta dan data sebagai bukti","Kesimpulan sebagai penegasan","Kata persuasif dan logis"],
              mainIdeas: ["Setiap pendapat harus didukung bukti","Argumen logis lebih kuat dari emosi","Fakta dan opini harus dibedakan","Eksposisi mengajak berpikir, bukan sekadar setuju"],
              partRelationships: "Tesis adalah klaim yang ingin dibuktikan. Argumen adalah alasan mengapa klaim itu benar. Data dan fakta adalah bukti yang mendukung argumen. Penegasan ulang mengikat semua bagian menjadi kesimpulan kuat.",
              simpleExample: "Tesis: Membaca buku cetak lebih baik dari buku digital. Argumen 1: Buku cetak tidak menyebabkan mata lelah. Argumen 2: Membaca cetak membantu konsentrasi. Argumen 3: Buku cetak tidak butuh listrik. Kesimpulan: Buku cetak tetap relevan di era digital.",
            },
            textVariants: {
              types: ["eksposisi definisi","eksposisi ilustrasi","eksposisi perbandingan","eksposisi proses","eksposisi analisis"],
              variantDescriptions: [
                { name: "Eksposisi Definisi", description: "Memaparkan definisi atau pengertian suatu konsep secara mendalam.", example: "Kemacetan adalah kondisi lalu lintas yang terhambat akibat volume kendaraan melebihi kapasitas jalan. Fenomena ini bukan sekadar masalah waktu tetapi cerminan perencanaan kota yang tidak seimbang." },
                { name: "Eksposisi Ilustrasi", description: "Menggunakan contoh konkret untuk memperjelas gagasan abstrak.", example: "Bayangkan seorang siswa yang setiap hari menghabiskan 3 jam di perjalanan. Ia tiba di sekolah sudah lelah dan sulit berkonsentrasi. Inilah dampak nyata kemacetan terhadap pendidikan." },
                { name: "Eksposisi Perbandingan", description: "Membandingkan dua hal untuk memperkuat argumen.", example: "Sekolah yang menerapkan literasi pagi menunjukkan peningkatan nilai ujian sebesar 20%. Sementara sekolah tanpa program itu tetap stagnan. Perbandingan ini membuktikan efektivitas literasi." },
              ],
              groupingBasis: "Berdasarkan teknik penyampaian: definisi (memperjelas konsep), ilustrasi (memberi contoh), perbandingan (membandingkan), dan analisis (mengurai komponen).",
            },
            structurePattern: {
              generalPattern: [
                { name: "Tesis", description: "Pernyataan pendapat atau gagasan utama penulis. Thesis harus jelas, spesifik, dan dapat dipertahankan." },
                { name: "Argumen", description: "Alasan-alasan logis yang mendukung tesis. Setiap argumen didukung fakta, data, atau contoh." },
                { name: "Penegasan Ulang", description: "Kesimpulan yang memperkuat posisi penulis. Merangkum argumen dan menegaskan tesis." },
              ],
              variationNotes: "Jumlah argumen bervariasi. Eksposisi sederhana cukup 2 argumen. Eksposisi kompleks bisa 4-5 argumen dengan sub-argumen.",
              readingGuide: "Identifikasi tesis penulis. Catat argumen-argumen yang disampaikan. Evaluasi apakah data dan contoh mendukung argumen. Bedakan fakta dan opini. Simpulkan apakah Anda setuju dengan penulis.",
            },
            languageFeatures: {
              register: "Ragam bahasa formal-argumentatif. Kalimat deklaratif dominan. Menggunakan kata-kata persuasif dan logis. Istilah teknis sesuai topik.",
              features: [
                { name: "Kalimat Deklaratif", description: "Pernyataan yang menyampaikan gagasan atau argumen.", example: "Literasi digital adalah keterampilan yang wajib dikuasai siswa abad ke-21." },
                { name: "Konjungsi Argumentatif", description: "Penghubung antarargumen dan kesimpulan.", example: "oleh karena itu, dengan demikian, maka, sebab, karena, akibatnya" },
                { name: "Kata Persuasi", description: "Kata yang mengajak atau meyakinkan.", example: "seharusnya, sudah saatnya, penting, wajib, perlu, tidak dapat dipungkiri" },
                { name: "Fakta dan Data", description: "Informasi kuantitatif yang memperkuat argumen.", example: "Berdasarkan data Kemendikbud, 70% siswa lebih suka membaca di ponsel." },
                { name: "Kata Hubung Antarkalimat", description: "Transisi antarparagraf eksposisi.", example: "selain itu, di sisi lain, lebih lanjut, sementara itu, sebaliknya" },
              ],
              wordChoice: "Pilihan kata persuasif dan logis. Gunakan data dan fakta. Hindari kata emosional berlebihan. Gunakan variasi kata untuk argumen.",
              sentencePattern: "Kalimat deklaratif dominan. Variasi panjang pendek untuk ritme. Fokus pada subjek gagasan. Kalimat kompleks untuk argumen mendalam.",
              conjunctions: "Argumentatif: oleh karena itu, dengan demikian, maka, sebab, karena. Aditif: selain itu, lebih lanjut, tambahan pula. Adversatif: namun, tetapi, di sisi lain, sebaliknya.",
              style: "Gaya argumentatif-logis. Tidak menggunakan majas berlebihan. Fokus pada kekuatan argumen, bukan keindahan bahasa. Data dan fakta sebagai senjata utama.",
              spelling: "EYD V. Data dan angka ditulis tepat. Sumber kutipan disebutkan. Istilah asing ditulis miring.",
              punctuation: "Tanda titik dua untuk perincian argumen. Tanda kutip untuk mengutip pendapat ahli. Tanda kurung untuk data atau tahun.",
            },
            productionProcedure: {
              preProduction: ["Tentukan isu atau topik yang akan dibahas","Kumpulkan data dan fakta pendukung","Tentukan posisi atau pendapat pribadi","Buat kerangka: tesis, argumen 1-3, penegasan ulang"],
              production: ["Tulis tesis yang jelas dan spesifik","Kembangkan setiap argumen dalam paragraf terpisah","Dukung argumen dengan data, fakta, atau contoh","Gunakan konjungsi argumentatif","Tutup dengan penegasan ulang tesis"],
              revision: ["Periksa apakah tesis jelas dan terdefinisi","Evaluasi kekuatan argumen","Pastikan data dan fakta akurat","Periksa alur logis antaragumen"],
              editing: ["Perbaiki ejaan dan tanda baca","Periksa konsistensi argumen","Pastikan bahasa persuasif tidak berlebihan","Periksa sumber data dan kutipan"],
              publication: ["Presentasikan dalam forum debat kelas","Unggah artikel opini di blog/mading","Bacakan pidato di depan kelas","Publikasikan di media sosial sekolah"],
              bestPractices: ["Pilih isu kontemporer yang relevan dengan remaja","Tekankan pentingnya verifikasi data","Ajarkan perbedaan argumen ad hominem dan argumen logis","Gunakan contoh konkret dari lingkungan sekitar"],
            },
          },
          exampleText: {
            title: "Mengapa Remaja Harus Bijak Bermedia Sosial?",
            content: "Media sosial telah menjadi bagian tak terpisahkan dari kehidupan remaja. Dari bangun tidur hingga menjelang tidur, banyak remaja menghabiskan waktu berselancar di berbagai platform. Namun, apakah media sosial benar-benar bermanfaat atau justru merugikan? Saya berpendapat bahwa remaja harus bijak menggunakan media sosial karena dampak negatif yang ditimbulkannya tidak bisa diabaikan. Pertama, media sosial mengganggu produktivitas belajar. Data Kementerian Komunikasi dan Informatika menunjukkan rata-rata remaja Indonesia menghabiskan 5-7 jam per hari di media sosial. Waktu yang seharusnya digunakan untuk belajar, membaca, atau berolahraga justru tersita untuk menggulir linimasa. Kedua, media sosial berdampak pada kesehatan mental. Studi dari Universitas Indonesia menemukan bahwa 45% remaja mengalami kecemasan setelah menggunakan media sosial. Perbandingan sosial yang konstan, cyberbullying, dan fear of missing out (FOMO) menjadi pemicu utama. Ketiga, media sosial rentan terhadap penyebaran informasi palsu. Banyak remaja yang tidak melakukan verifikasi sebelum membagikan informasi. Akibatnya, mereka turut menyebarkan hoaks yang merugikan masyarakat. Sebagai kesimpulan, remaja harus bijak bermedia sosial. Bukan berarti meninggalkannya sama sekali, tetapi menggunakannya secara terbatas dan bertanggung jawab. Orang tua dan sekolah perlu bersama-sama mendampingi remaja dalam bernavigasi di dunia digital.",
            analysis: {
              structure: "Tesis: remaja harus bijak media sosial (paragraf 1). Argumen 1: gangguan produktivitas. Argumen 2: kesehatan mental. Argumen 3: hoaks (paragraf 2-4). Penegasan ulang: bijak menggunakan, bukan meninggalkan (paragraf 5).",
              content: "Argumen didukung data konkret dari Kominfo dan UI. Tiga argumen independen saling memperkuat. Topik relevan. Kesimpulan moderat (tidak radikal).",
              language: "Kalimat persuasif terukur. Konjungsi argumentatif (pertama, kedua, ketiga, sebagai kesimpulan). Data statistik memperkuat. Bahasa formal namun komunikatif.",
              strengths: "Data statistik mendukung argumen, tiga argumen yang kuat, topik relevan dengan remaja, kesimpulan moderat, bahasa meyakinkan.",
              improvements: "Dapat menambahkan argumen kontra untuk menunjukkan keseimbangan. Sumber data disebut lebih spesifik.",
            },
          },
          learningActivities: {
            opening: ["Guru membacakan artikel opini singkat tentang isu terkini","Tanya jawab: setuju atau tidak setuju dengan penulis? Beri alasan!","Diskusi: apa bedanya fakta dengan opini?","Sampaikan tujuan pembelajaran"],
            core: ["Membaca contoh teks eksposisi dan mengidentifikasi tesis, argumen, penegasan ulang","Latihan membedakan fakta dan opini dari kalimat-kalimat campuran","Menganalisis kekuatan argumen dalam teks eksposisi","Praktik menyusun kerangka eksposisi","Menulis draf eksposisi dengan bimbingan","Peer review: saling mengevaluasi kekuatan argumen"],
            group: ["Debat kelas: pro-kontra isu aktual","Setiap kelompok menyusun eksposisi untuk satu posisi","Presentasi argumen dengan data pendukung","Sesi tanya jawab antarkelompok"],
            individual: ["Menulis teks eksposisi tentang isu pilihan","Menganalisis artikel opini di media massa","Membuat peta argumen","Menyunting eksposisi sendiri"],
            reflection: ["Diskusi: apa yang membedakan argumen kuat dan lemah?","Jurnal refleksi: 'Argumen saya hari ini'","Refleksi: bagaimana cara meyakinkan orang dengan data?"],
          },
          worksheet: {
            title: "Lembar Kerja: Menulis Teks Eksposisi",
            purpose: "Membantu siswa menyusun teks eksposisi dengan tesis jelas, argumen logis, dan data pendukung.",
            instructions: ["Tentukan isu aktual yang kamu kuasai","Tentukan posisi/pendapatmu","Kumpulkan data dan fakta pendukung","Buat kerangka tesis-argumen-kesimpulan","Tulis teks eksposisi minimal 4 paragraf"],
            activities: [
              { name: "Pengembangan Tesis", items: ["Tulis posisimu dalam satu kalimat jelas","Uji apakah tesis bisa diperdebatkan","Catat 3 argumen pendukung","Cari data/fakta untuk setiap argumen"] },
              { name: "Penulisan", items: ["Tulis paragraf tesis","Kembangkan argumen 1 dengan data","Kembangkan argumen 2 dan 3","Gunakan konjungsi argumentatif","Tulis penegasan ulang"] },
              { name: "Revisi", items: ["Evaluasi kekuatan argumen","Periksa akurasi data","Periksa alur logis","Minta peer review"] },
            ],
            studentOutput: "Teks eksposisi 4-5 paragraf tentang isu aktual dengan tesis jelas, 3 argumen logis, data pendukung, dan penegasan ulang.",
          },
          assessment: {
            diagnostic: [
              { question: "Apa isu terkini yang menarik perhatianmu?", purpose: "Mengetahui minat untuk pemilihan topik" },
              { question: "Apa bedanya fakta dengan opini? Beri contoh!", purpose: "Memahami kemampuan membedakan fakta-opini" },
              { question: "Menurutmu, apa yang membuat argumen seseorang meyakinkan?", purpose: "Mengidentifikasi pemahaman tentang argumentasi" },
            ],
            formative: [
              { method: "Cek identifikasi tesis", criteria: ["Tesis teridentifikasi dengan tepat","Tesis jelas dan spesifik","Tesis dapat diperdebatkan"] },
              { method: "Observasi debat", criteria: ["Argumen logis dan relevan","Menggunakan data pendukung","Merespon argumen lawan","Bahasa santun dalam debat"] },
              { method: "Cek draf eksposisi", criteria: ["Struktur eksposisi lengkap","Argumen didukung fakta/data","Alur logis antaragumen","Konjungsi argumentatif digunakan"] },
            ],
            summative: [
              { type: "Menulis Teks Eksposisi", description: "Teks eksposisi tentang isu aktual dengan tesis jelas, minimal 3 argumen didukung data, dan penegasan ulang" },
              { type: "Pidato Argumentatif", description: "Pidato 3-5 menit yang menyampaikan argumen tentang isu tertentu dengan data pendukung" },
            ],
          },
          rubric: {
            aspects: [
              { name: "Kejelasan Tesis", criteria: [{ level: "4", description: "Tesis jelas, spesifik, dan dapat diperdebatkan. Posisi penulis tegas." },{ level: "3", description: "Tesis jelas tetapi terlalu umum atau kurang spesifik" },{ level: "2", description: "Tesis kurang jelas atau berubah-ubah" },{ level: "1", description: "Tidak ada tesis yang teridentifikasi" }] },
              { name: "Kekuatan Argumen", criteria: [{ level: "4", description: "Argumen logis, relevan, didukung data/fakta kuat. Minimal 3 argumen solid." },{ level: "3", description: "Argumen logis tetapi dukungan data kurang kuat" },{ level: "2", description: "Argumen lemah atau hanya argumen emosional tanpa data" },{ level: "1", description: "Tidak ada argumen yang mendukung tesis" }] },
              { name: "Penggunaan Data", criteria: [{ level: "4", description: "Data akurat, dari sumber terpercaya, disajikan dengan tepat untuk mendukung argumen" },{ level: "3", description: "Data digunakan tetapi sumber tidak jelas" },{ level: "2", description: "Data minim atau tidak relevan" },{ level: "1", description: "Tidak ada data pendukung" }] },
              { name: "Struktur dan Kebahasaan", criteria: [{ level: "4", description: "Struktur lengkap, konjungsi argumentatif bervariasi, bahasa persuasif efektif" },{ level: "3", description: "Struktur lengkap tetapi kebahasaan kurang bervariasi" },{ level: "2", description: "Struktur tidak lengkap atau kebahasaan lemah" },{ level: "1", description: "Struktur dan kebahasaan tidak sesuai" }] },
            ],
          },
          differentiation: {
            support: ["Kerangka eksposisi dengan tesis yang sudah diisi","Bank data/fakta untuk berbagai isu","Bimbingan membedakan fakta dan opini dengan kartu","Teks eksposisi contoh dengan argumen dianotasi"],
            regular: ["Kebebasan memilih isu","Contoh dari artikel opini media","Bimbingan bertahap","Diskusi pro-kontra kelas"],
            challenge: ["Menulis untuk publikasi media massa","Debat formal dengan aturan","Eksposisi perbandingan dua isu","Menulis response terhadap artikel opini"],
          },
          remedial: ["Latihan membedakan fakta-opini dari kalimat sederhana","Praktik menyusun argumen dari data yang diberikan","Bimbingan satu-satu dalam menulis tesis","Fokus pada satu argumen yang dikembangkan baik"],
          enrichment: ["Mengikuti lomba debat atau pidato","Menulis artikel opini untuk media lokal","Membuat podcast argumentatif","Menganalisis pidato tokoh nasional"],
          readingPractice: {
            title: "Latihan Membaca: Teks Eksposisi",
            stimulusTitle: "Perlunya Jam Belajar Tambahan di Sekolah",
            stimulusText: `Pendidikan adalah investasi jangka panjang yang menentukan masa depan bangsa. Salah satu isu yang sering diperdebatkan adalah perlunya jam belajar tambahan di sekolah. Saya berpendapat bahwa jam belajar tambahan diperlukan, tetapi harus dirancang bijaksana agar tidak membebani siswa.

Pertama, jam belajar tambahan dapat membantu siswa menguasai materi dengan lebih baik. Data PISA menunjukkan kemampuan literasi dan numerasi siswa Indonesia masih di bawah rata-rata OECD. Dengan tambahan waktu, guru dapat mengulang konsep sulit dan memberikan latihan lebih memadai.

Kedua, jam tambahan bisa untuk pengembangan bakat dan minat -- klub sains, seni tari, teater, atau olahraga. Studi dari Universitas Pendidikan Indonesia menunjukkan siswa aktif ekstrakurikuler memiliki nilai rata-rata 12% lebih tinggi.

Ketiga, jam tambahan perlu diimbangi istirahat cukup. Kemenkes mengingatkan siswa SMP butuh tidur 8-10 jam per hari. Jam tambahan harus diiringi pengurangan PR dan jeda cukup.

Sebagai kesimpulan, jam belajar tambahan diperlukan untuk penguasaan materi dan pengembangan bakat, tetapi harus bijaksana dengan memperhatikan keseimbangan belajar, istirahat, dan bermain. Pendidikan yang baik bukan yang paling panjang, melainkan yang paling efektif dan manusiawi.`,
            questions: [
              { id: "8-eksposisi-rp-01", type: "pilihan_ganda", questionText: "Gagasan utama penulis dalam teks ini adalah...", options: ["Jam belajar dikurangi", "Jam belajar tambahan diperlukan secara bijaksana", "Siswa tidak perlu tambahan", "Pendidikan Indonesia sudah baik"], correctAnswer: "Jam belajar tambahan diperlukan secara bijaksana", explanation: "Tesis penulis: jam tambahan perlu tetapi harus bijaksana.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksposisi-rp-02", type: "pilihan_ganda", questionText: "Argumen pertama yang mendukung tesis adalah...", options: ["Jam tambahan mengembangkan bakat", "Jam tambahan membantu menguasai materi lebih baik", "Jam tambahan mengurangi PR", "Jam tambahan meningkatkan kesehatan"], correctAnswer: "Jam tambahan membantu menguasai materi lebih baik", explanation: "Argumen pertama: data PISA menunjukkan perlunya waktu lebih.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-eksposisi-rp-03", type: "pilihan_ganda", questionText: "Data apa yang mendukung argumen kedua?", options: ["Data PISA", "Studi UPI tentang ekstrakurikuler", "Data Kemenkes tentang tidur", "Laporan OECD"], correctAnswer: "Studi UPI tentang ekstrakurikuler", explanation: "Argumen kedua: studi UPI -- siswa ekstrakurikuler nilai 12% lebih tinggi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksposisi-rp-04", type: "pilihan_ganda", questionText: "Struktur teks eksposisi terdiri dari...", options: ["Pernyataan umum -- sebab-akibat -- interpretasi", "Tesis -- argumen -- penegasan ulang", "Orientasi -- komplikasi -- resolusi", "Identifikasi -- klasifikasi -- deskripsi"], correctAnswer: "Tesis -- argumen -- penegasan ulang", explanation: "Struktur eksposisi: tesis, argumen, penegasan ulang.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksposisi-rp-05", type: "pilihan_ganda", questionText: "Paragraf terakhir termasuk bagian...", options: ["Tesis", "Argumen", "Penegasan ulang", "Pernyataan umum"], correctAnswer: "Penegasan ulang", explanation: "Penegasan ulang merangkum dan memperkuat posisi penulis.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksposisi-rp-06", type: "pilihan_ganda", questionText: "Kata persuasif dalam teks ini adalah...", options: ["diperlukan, harus, penting, bijaksana", "datang, pergi, duduk", "karena, sehingga", "dan, atau, serta"], correctAnswer: "diperlukan, harus, penting, bijaksana", explanation: "Kata persuasif meyakinkan pembaca tentang posisi penulis.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-eksposisi-rp-07", type: "pilihan_ganda", questionText: "Konjungsi 'pertama, kedua, ketiga' berfungsi...", options: ["Menunjukkan urutan waktu", "Mengurutkan argumen secara logis", "Sebab-akibat", "Menambahkan informasi"], correctAnswer: "Mengurutkan argumen secara logis", explanation: "Konjungsi ini menyusun argumen secara sistematis.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-eksposisi-rp-08", type: "pilihan_ganda", questionText: "Pernyataan yang merupakan fakta adalah...", options: ["Pendidikan investasi jangka panjang", "Siswa SMP butuh tidur 8-10 jam/hari", "Jam tambahan harus diiringi pengurangan PR", "Pendidikan yang baik adalah yang efektif"], correctAnswer: "Siswa SMP butuh tidur 8-10 jam/hari", explanation: "Fakta adalah informasi yang dapat diverifikasi -- rekomendasi Kemenkes.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksposisi-rp-09", type: "pilihan_ganda", questionText: "Penulis mengakui sudut pandang lawan di bagian...", options: ["'Data PISA menunjukkan'", "'Sebagian pihak menganggap jam belajar sudah cukup'", "'Studi UPI menunjukkan'", "'Kemenkes mengingatkan'"], correctAnswer: "'Sebagian pihak menganggap jam belajar sudah cukup'", explanation: "Penulis menyebut pandangan kontra di awal sebagai keseimbangan.", skillTarget: "analisis struktur", difficulty: "menantang" },
              { id: "8-eksposisi-rp-10", type: "pilihan_ganda", questionText: "Kesimpulan penulis tentang jam belajar tambahan...", options: ["Dihapuskan", "Diperlukan tetapi bijaksana dan seimbang", "Ditambah sebanyak mungkin", "Tidak perlu perubahan"], correctAnswer: "Diperlukan tetapi bijaksana dan seimbang", explanation: "Penulis menyimpulkan jam tambahan perlu tetapi harus seimbang.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksposisi-rp-11", type: "jawaban_singkat", questionText: "Sebutkan tiga argumen penulis!", correctAnswer: "(1) Membantu kuasai materi, (2) Pengembangan bakat/minat, (3) Harus diimbangi istirahat", explanation: "Tiga argumen mendukung tesis secara terstruktur.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksposisi-rp-12", type: "jawaban_singkat", questionText: "Apa saran penulis agar jam tambahan tidak membebani?", correctAnswer: "Diimbangi istirahat, pengurangan PR, jeda, libatkan orang tua dan siswa", explanation: "Penulis menekankan keseimbangan dan keterlibatan semua pihak.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksposisi-rp-13", type: "uraian", questionText: "Evaluasilah kekuatan argumen dalam teks ini! Apakah didukung data yang kuat?", correctAnswer: ["Argumen cukup kuat: (1) data PISA kredibel, (2) studi UPI dengan angka 12%, (3) rekomendasi Kemenkes. Namun data PISA tanpa tahun, studi UPI tanpa detail metodologi. Meski demikian, ketiga argumen logis dan relevan."], explanation: "Kekuatan argumen dinilai dari kualitas data pendukung dan relevansi.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-eksposisi-rp-14", type: "uraian", questionText: "Tulislah tesis tentang 'Penggunaan Ponsel di Sekolah' yang jelas dan dapat diperdebatkan! Sertakan dua argumen!", correctAnswer: ["Tesis: Penggunaan ponsel di sekolah sebaiknya diizinkan terbatas, tidak dilarang total. Argumen 1: Ponsel alat belajar efektif (kamus, kalkulator, sumber digital). Argumen 2: Pelarangan total membuat siswa menyalahgunakan secara sembunyi."], explanation: "Tesis harus jelas, spesifik, dapat diperdebatkan.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Teks Eksposisi",
            questions: [
              { id: "8-eksposisi-qq-01", type: "pilihan_ganda", questionText: "Tujuan teks eksposisi...", options: ["Menghibur", "Menyampaikan gagasan dengan argumen dan data", "Menggambarkan objek", "Memberi petunjuk"], correctAnswer: "Menyampaikan gagasan dengan argumen dan data", explanation: "Eksposisi bertujuan meyakinkan dengan argumen logis.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-eksposisi-qq-02", type: "pilihan_ganda", questionText: "Bagian yang berisi pendapat penulis disebut...", options: ["Argumen", "Tesis", "Penegasan ulang", "Data"], correctAnswer: "Tesis", explanation: "Tesis adalah pendapat atau posisi penulis terhadap isu.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-eksposisi-qq-03", type: "pilihan_ganda", questionText: "Argumen dalam eksposisi harus didukung...", options: ["Opini pribadi", "Fakta, data, dan contoh", "Perasaan penulis", "Kata-kata indah"], correctAnswer: "Fakta, data, dan contoh", explanation: "Argumen kuat didukung bukti faktual.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-eksposisi-qq-04", type: "pilihan_ganda", questionText: "Contoh tesis yang baik adalah...", options: ["Saya suka membaca", "Kebiasaan membaca harus ditanamkan sejak dini karena meningkatkan kecerdasan", "Membaca menyenangkan", "Buku jendela dunia"], correctAnswer: "Kebiasaan membaca harus ditanamkan sejak dini karena meningkatkan kecerdasan", explanation: "Tesis baik: spesifik, jelas, dapat diperdebatkan.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-eksposisi-qq-05", type: "pilihan_ganda", questionText: "Perbedaan fakta dan opini...", options: ["Fakta diverifikasi, opini pendapat pribadi", "Fakta panjang, opini pendek", "Fakta di buku, opini di medsos", "Fakta lebih penting"], correctAnswer: "Fakta diverifikasi, opini pendapat pribadi", explanation: "Fakta dapat diuji, opini subjektif.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksposisi-qq-06", type: "pilihan_ganda", questionText: "Contoh konjungsi argumentatif...", options: ["Kemudian, setelah itu", "Oleh karena itu, dengan demikian, maka", "Dan, atau", "Meskipun, walaupun"], correctAnswer: "Oleh karena itu, dengan demikian, maka", explanation: "Konjungsi argumentatif menghubungkan argumen dengan kesimpulan.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-eksposisi-qq-07", type: "pilihan_ganda", questionText: "Penegasan ulang berfungsi...", options: ["Memperkenalkan topik baru", "Memperkuat posisi penulis sebagai kesimpulan", "Menyajikan data", "Argumen lawan"], correctAnswer: "Memperkuat posisi penulis sebagai kesimpulan", explanation: "Penegasan ulang adalah kesimpulan yang memperkuat posisi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksposisi-qq-08", type: "pilihan_ganda", questionText: "Eksposisi vs persuasif...", options: ["Eksposisi lebih pendek", "Eksposisi meyakinkan dgn argumen logis, persuasif mengajak bertindak", "Persuasif pakai data", "Tidak ada beda"], correctAnswer: "Eksposisi meyakinkan dgn argumen logis, persuasif mengajak bertindak", explanation: "Eksposisi meyakinkan logika, persuasif mengajak aksi.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-eksposisi-qq-09", type: "pilihan_ganda", questionText: "Kata penguat argumen yang tepat...", options: ["Cantik, indah", "Berdasarkan data, menurut penelitian", "Mungkin, barangkali", "Ayo, mari"], correctAnswer: "Berdasarkan data, menurut penelitian", explanation: "Ungkapan ini memperkuat kredibilitas argumen.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-eksposisi-qq-10", type: "pilihan_ganda", questionText: "Jumlah argumen minimal dalam eksposisi...", options: ["1", "3", "5", "Tak terbatas"], correctAnswer: "3", explanation: "Eksposisi umumnya memiliki minimal tiga argumen.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-eksposisi-qq-11", type: "jawaban_singkat", questionText: "Apa perbedaan eksposisi dan narasi?", correctAnswer: "Eksposisi meyakinkan dgn argumen, narasi menghibur dgn cerita", explanation: "Eksposisi argumentatif-informatif, narasi kronologis.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-eksposisi-qq-12", type: "jawaban_singkat", questionText: "Sebutkan satu ciri kebahasaan eksposisi!", correctAnswer: "Menggunakan kata persuasif (seharusnya, wajib, perlu, penting)", explanation: "Kata persuasif memperkuat ajakan penulis.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Gunakan isu kontroversial ringan untuk memantik diskusi","Ajarkan perbedaan argumen logis dan fallacy","Berikan contoh kalimat tesis yang baik dan buruk","Fasilitasi debat terstruktur"],
            commonMisconceptions: [
              { misconception: "Eksposisi sama dengan opini tanpa data.", correction: "Eksposisi harus didukung data dan fakta, bukan sekadar opini." },
              { misconception: "Semakin keras bicara semakin meyakinkan.", correction: "Argumen yang kuat didukung data dan logika, bukan volume suara." },
            ],
            feedbackGuide: ["Fokus pada kekuatan argumen","Tandai penggunaan data yang efektif","Koreksi logical fallacy","Berikan contoh perbaikan argumen lemah"],
            classroomManagement: ["Atur debat dengan moderator siswa","Gunakan timer untuk setiap pembicara","Sediakan sumber data cetak/digital","Kelompok pro-kontra dibagi adil"],
          },
          reflection: {
            studentQuestions: ["Apa argumen terkuat yang saya buat?","Bagaimana cara mencari data yang mendukung argumen?","Apa yang membedakan argumen saya dengan orang lain?"],
            teacherQuestions: ["Apakah siswa mampu membedakan fakta dan opini?","Apakah argumen siswa logis dan terstruktur?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Teks Eksposisi. Materi mencakup: pengertian, struktur (tesis, argumen, penegasan ulang), perbedaan fakta dan opini, ciri kebahasaan (konjungsi argumentatif, kata persuasif, data). Sertakan contoh teks eksposisi tentang media sosial. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["eksposisi","argumen","tesis","fakta","opini","data","persuasif","debat","pidato"],
          isReady: true,
        },
{
          id: "viii-literasi-fiksi",
          slug: "giat-literasi-teks-fiksi",
          grade: "VIII",
          phase: "D",
          semester: 1,
          chapterNumber: 5,
          title: "Bab 5: Giat Literasi \u2014 Teks Fiksi (Cerpen)",
          shortTitle: "Giat Literasi I",
          kd: "Menulis",
          emoji: "\u{1F4D6}",
          description: "Mengapresiasi dan mengkreasi teks fiksi berupa cerita pendek melalui kegiatan literasi aktif, analisis unsur intrinsik, dan penulisan kreatif.",
          overview: "Cerita pendek adalah jendela imajinasi yang bisa dibuka dan ditutup dalam sekali duduk. Bab ini mengajak siswa menikmati, menganalisis, dan menciptakan cerpen. Dari mengidentifikasi unsur intrinsik hingga menulis cerpen orisinal, siswa akan mengembangkan apresiasi sastra dan kreativitas. Kegiatan literasi aktif seperti membaca nyaring, diskusi buku, dan menulis kreatif menjadi jantung pembelajaran. Bab ini juga menumbuhkan kebiasaan membaca dan menulis sebagai keterampilan seumur hidup.",
          learningGoals: [
            "Memahami pengertian, ciri-ciri, dan unsur intrinsik teks fiksi (cerpen)",
            "Menganalisis unsur intrinsik cerpen: tema, tokoh, alur, latar, sudut pandang, amanat",
            "Mengapresiasi cerpen melalui diskusi dan resensi sederhana",
            "Menulis cerpen orisinal dengan unsur intrinsik lengkap",
            "Mempublikasikan karya cerpen di media kelas atau digital",
          ],
          keywords: ["cerpen","fiksi","unsur intrinsik","alur","tokoh","latar","tema","amanat","sudut pandang","menulis kreatif","literasi"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Cerita pendek (cerpen) adalah karya fiksi prosa yang selesai dibaca dalam sekali duduk. Cerpen memiliki fokus pada satu konflik, satu tokoh utama, dan satu efek. Cerpen mengangkat pengalaman manusia secara ringkas namun padat makna. Kekuatan cerpen terletak pada kemampuannya menyampaikan pesan mendalam melalui kisah singkat.",
              characteristics: [
                "Selesai dibaca dalam sekali duduk (15-30 menit)",
                "Fokus pada satu peristiwa atau konflik",
                "Jumlah tokoh terbatas, biasanya 1-3 tokoh utama",
                "Alur tunggal dan ringkas",
                "Meninggalkan kesan mendalam meskipun singkat",
                "Mengandung pesan atau amanat yang ingin disampaikan",
              ],
              socialFunction: "Cerpen berfungsi sebagai media hiburan, edukasi, dan refleksi. Melalui cerpen, penulis menyampaikan pandangan tentang hidup, kritik sosial, atau nilai moral dengan cara yang menghibur dan menyentuh.",
              lifeBenefits: "Membaca dan menulis cerpen mengembangkan empati, kreativitas, dan kemampuan bercerita. Berguna dalam komunikasi, pemasaran, dan berbagai profesi kreatif.",
              distinction: "Cerpen berbeda dari novel yang lebih panjang dengan konflik kompleks. Berbeda dari puisi yang menggunakan rima dan irama. Berbeda dari naskah drama yang ditulis untuk dipentaskan.",
            },
            contentComposition: {
              infoPoints: ["Cerpen fokus satu konflik tunggal","Unsur intrinsik: tema, tokoh, alur, latar, sudut pandang, amanat","Tema adalah ide pokok cerita","Tokoh memiliki karakter dan peran masing-masing","Alur adalah rangkaian peristiwa"],
              buildingElements: ["Tema sebagai ide dasar","Tokoh dengan karakter jelas","Alur sebagai rangkaian peristiwa","Latar tempat, waktu, suasana","Dialog dan narasi sebagai teknik penceritaan"],
              mainIdeas: ["Cerpen yang baik memiliki konflik bermakna","Karakter tokoh harus meyakinkan","Setiap elemen harus mendukung tema","Akhir cerita meninggalkan kesan"],
              partRelationships: "Tema menentukan jenis tokoh dan konflik. Karakter tokoh mendorong alur. Latar mendukung suasana dan memengaruhi tokoh. Amanat lahir dari keseluruhan cerita.",
              simpleExample: "Rina ingin ikut lomba menulis. Ia ragu karena takut kalah. Ibunya bilang, 'Kemenangan bukan tujuan utama.' Rina ikut lomba dan meski tidak menang, ia bangga sudah mencoba.",
            },
            textVariants: {
              types: ["cerpen realis","cerpen fantasi","cerpen humor","cerpen misteri","cerpen inspiratif"],
              variantDescriptions: [
                { name: "Cerpen Realis", description: "Bertema keseharian, tokoh dan latar seperti dunia nyata. Konflik realistis.", example: "Cerita tentang seorang siswa yang harus membantu orang tua berjualan setelah sekolah." },
                { name: "Cerpen Fantasi", description: "Mengandung unsur magis, dunia imajiner, atau kekuatan supranatural.", example: "Seorang anak menemukan buku bekas di perpustakaan yang ternyata bisa membuat tulisannya menjadi nyata." },
                { name: "Cerpen Inspiratif", description: "Mengandung pesan motivasi. Tokoh menghadapi tantangan dan berhasil mengatasinya.", example: "Seorang tuna rungu belajar menari dan akhirnya tampil di pentas nasional." },
              ],
              groupingBasis: "Berdasarkan tema dan pendekatan: realis (dunia nyata), fantasi (imajinasi), humor (kelucuan), misteri (teka-teki), inspiratif (motivasi).",
            },
            structurePattern: {
              generalPattern: [
                { name: "Orientasi", description: "Pengenalan tokoh, latar, dan situasi awal." },
                { name: "Komplikasi", description: "Munculnya masalah atau konflik yang dihadapi tokoh." },
                { name: "Klimaks", description: "Puncak konflik di mana ketegangan tertinggi." },
                { name: "Resolusi", description: "Penyelesaian konflik." },
                { name: "Koda (opsional)", description: "Amanat atau kesimpulan cerita." },
              ],
              variationNotes: "Cerpen modern sering membalik urutan (in medias res). Tidak semua cerpen memiliki koda. Cerpen kilat hanya 2-3 paragraf.",
              readingGuide: "Identifikasi tokoh utama dan karakternya. Perhatikan konflik yang muncul. Catat latar waktu dan tempat. Cari pesan yang ingin disampaikan penulis.",
            },
            languageFeatures: {
              register: "Ragam bahasa naratif yang komunikatif. Dapat formal atau informal sesuai tema dan karakter. Bahasa kiasan dan majas digunakan untuk memperindah cerita.",
              features: [
                { name: "Kalimat Naratif", description: "Kalimat yang menceritakan peristiwa secara kronologis.", example: "Hari itu, Rina berjalan pelan menuju perpustakaan yang sudah lama tidak ia kunjungi." },
                { name: "Kalimat Dialog", description: "Ucapan tokoh yang menghidupkan interaksi.", example: '"Kamu yakin ingin ikut lomba?" tanya Ibu ragu.' },
                { name: "Majas", description: "Gaya bahasa untuk efek puitis atau penekanan.", example: "Personifikasi: Waktu berjalan lambat. Simile: Wajahnya pucat seperti kapur." },
                { name: "Kata Ganti Orang", description: "Pronomina sudut pandang.", example: "Orang pertama (aku), ketiga (dia, mereka)" },
                { name: "Konjungsi Temporal", description: "Urutan waktu peristiwa.", example: "kemudian, setelah itu, pada akhirnya, tiba-tiba, sebelum" },
              ],
              wordChoice: "Pilihan kata sesuai tema dan karakter. Kata konkret untuk gambaran jelas. Kata konotatif untuk efek emocional. Variasi kata menghindari kebosanan.",
              sentencePattern: "Variasi narasi dan dialog. Kalimat panjang untuk deskripsi, pendek untuk aksi cepat. Ritme kalimat disesuaikan suasana.",
              conjunctions: "Temporal: kemudian, lalu, setelah itu, tiba-tiba, akhirnya, sebelumnya. Kausal: karena, sehingga, maka, akibatnya.",
              style: "Gaya naratif sesuai jenis cerpen. Cerpen remaja: ringan, dialog dominan. Cerpen serius: deskriptif, kalimat kompleks.",
              spelling: "EYD V. Kata tidak baku dalam dialog dimungkinkan. Kata daerah untuk ciri khas. Tanda baca penting dalam dialog.",
              punctuation: "Tanda petik untuk dialog. Koma sebelum kata 'kata' dalam dialog. Tanda seru/ tanya sesuai ekspresi. Tanda titik untuk kalimat narasi.",
            },
            productionProcedure: {
              preProduction: ["Tentukan tema dan pesan yang ingin disampaikan","Tentukan tokoh utama dan karakternya","Buat kerangka alur","Tentukan latar dan sudut pandang"],
              production: ["Tulis orientasi yang menarik","Kembangkan konflik bertahap","Bangun ketegangan ke klimaks","Tulis resolusi memuaskan","Gunakan dialog untuk menghidupkan cerita"],
              revision: ["Periksa alur logis","Periksa konsistensi karakter","Evaluasi efektivitas konflik","Periksa dialog alami"],
              editing: ["Perbaiki ejaan dan tanda baca","Perhalus pilihan kata","Periksa sudut pandang konsisten","Rapikan format"],
              publication: ["Bacakan di kelas","Publikasikan di mading/blog","Kumpulkan dalam antologi kelas","Ikut lomba cerpen"],
              bestPractices: ["Tulis dari pengalaman pribadi untuk keautentikan","Gunakan hook di awal untuk menarik pembaca","Tunjukkan jangan ceritakan (show don't tell)","Akhiri dengan kesan mendalam"],
            },
          },
          exampleText: {
            title: "Pulang",
            content: "Angkutan kota jurusan Pasar-Cilebut berhenti di halte sekolah. Rina melompat masuk dan duduk di kursi kosong dekat jendela. Hari ini ulangan matematika dan ia yakin hasilnya buruk. Pemandangan di luar jendela bergerak lambat \u2014 deretan ruko, pohon randu, lalu persawahan mulai menguning. 'Bu Bilang, nilai bukan segalanya,' gumamnya pelan. Ponselnya bergetar. Pesan dari Ibu: 'Nak, ibu masak sayur sop kesukaanmu. Jangan lupa mampir beli tempe.' Air mata Rina mengalir tanpa ia minta. 'Makasih, Bu,' bisiknya. Di simpang lima, angkot berhenti. Rina turun dengan langkah ringan, menenteng tempe bungkus daun. Angin sore membelai wajahnya \u2014 rumah sudah di depan mata.",
            analysis: {
              structure: "Orientasi: Rina di angkot sepulang sekolah. Komplikasi: nilai jelek, kekecewaaan. Klimaks: menerima pesan Ibu. Resolusi: kesadaran bahwa kasih sayang lebih penting dari nilai. Koda implisit.",
              content: "Tema universal: kasih sayang keluarga. Konflik sederhana relevan. Tokoh Rina mewakili banyak siswa. Latar angkot dan perjalanan pulang.",
              language: "Naratif-deskriptif. Kalimat pendek efektif. Dialog minimal namun kuat. Show don't tell: air mata, langkah ringan, angin membelai.",
              strengths: "Tema relevan, konflik sederhana namun bermakna, show don't tell efektif, akhir mengharukan tanpa berlebihan, latar lokal khas Indonesia.",
              improvements: "Dapat menambah sedikit dialog atau kilas balik untuk memperdalam karakter Rina.",
            },
          },
          learningActivities: {
            opening: ["Guru membacakan cerpen pendek (1-2 menit) dengan ekspresi","Diskusi: apa perasaanmu setelah mendengar cerita itu?","Permainan tebak konflik dari gambar situasi","Sampaikan tujuan pembelajaran"],
            core: ["Membaca cerpen contoh secara bergantian","Diskusi unsur intrinsik cerpen","Menganalisis karakter tokoh","Latihan menulis pembukaan cerpen yang menarik","Menulis cerpen bertahap","Peer review cerpen teman"],
            group: ["Lingkaran literasi: diskusi buku cerpen","Membuat peta konsep unsur intrinsik","Proyek antologi cerpen kelas","Presentasi cerpen dengan ilustrasi"],
            individual: ["Menulis cerpen orisinal","Membaca dan meresensi cerpen","Membuat jurnal baca cerpen","Menyunting cerpen sendiri"],
            reflection: ["Diskusi: apa yang membuat cerpen menarik?","Jurnal: 'Cerpen yang paling berkesan'","Refleksi: keterampilan baru apa yang didapat?"],
          },
          worksheet: {
            title: "Lembar Kerja: Menulis Cerpen",
            purpose: "Membantu siswa menulis cerpen dengan unsur intrinsik lengkap.",
            instructions: ["Tentukan tema dan pesan","Tentukan tokoh utama","Buat kerangka alur","Tulis cerpen minimal 3 paragraf","Lakukan revisi dan penyuntingan"],
            activities: [
              { name: "Perencanaan", items: ["Tentukan tema","Buat profil tokoh","Tentukan konflik","Buat kerangka alur","Tentukan sudut pandang"] },
              { name: "Penulisan", items: ["Tulis orientasi","Kembangkan konflik","Tulis klimaks","Selesaikan resolusi","Gunakan dialog"] },
              { name: "Revisi", items: ["Periksa alur","Konsistensi tokoh","Efektivitas konflik","Bahasa dan ejaan","Peer review"] },
            ],
            studentOutput: "Cerpen orisinal 3-5 paragraf dengan unsur intrinsik lengkap dan pesan yang jelas.",
          },
          assessment: {
            diagnostic: [
              { question: "Apa cerita fiksi favoritmu? Mengapa?", purpose: "Mengetahui minat baca sastra siswa" },
              { question: "Apa yang membuat cerita menarik menurutmu?", purpose: "Mengidentifikasi pemahaman unsur cerita" },
            ],
            formative: [
              { method: "Observasi diskusi", criteria: ["Mengidentifikasi unsur cerpen","Analisis karakter","Memberi masukan"] },
              { method: "Cek draf cerpen", criteria: ["Struktur jelas","Karakter tokoh","Konflik menarik","Dialog alami"] },
            ],
            summative: [
              { type: "Menulis Cerpen", description: "Cerpen orisinal dengan unsur intrinsik lengkap, konflik jelas, tokoh kuat, dan pesan bermakna" },
              { type: "Resensi Cerpen", description: "Resensi sederhana cerpen yang dibaca mencakup sinopsis, analisis unsur, dan tanggapan pribadi" },
            ],
          },
          rubric: {
            aspects: [
              { name: "Kelengkapan Unsur Intrinsik", criteria: [{ level: "4", description: "Tema, tokoh, alur, latar, sudut pandang, amanat lengkap dan terintegrasi" },{ level: "3", description: "Unsur lengkap tetapi kurang terintegrasi" },{ level: "2", description: "Beberapa unsur tidak jelas" },{ level: "1", description: "Unsur tidak lengkap" }] },
              { name: "Kreativitas Cerita", criteria: [{ level: "4", description: "Ide orisinal, konflik unik, alur tidak tertebak" },{ level: "3", description: "Cukup kreatif, beberapa ide menarik" },{ level: "2", description: "Kurang kreatif, klise" },{ level: "1", description: "Meniru cerita lain" }] },
              { name: "Penggunaan Bahasa", criteria: [{ level: "4", description: "Diksi tepat, kalimat variatif, dialog alami, ejaan benar" },{ level: "3", description: "Bahasa baik dengan sedikit kesalahan" },{ level: "2", description: "Bahasa monoton, banyak pengulangan" },{ level: "1", description: "Bahasa kaku, banyak kesalahan" }] },
            ],
          },
          differentiation: {
            support: ["Kerangka cerpen diisi sebagian","Bank karakter tokoh","Bimbingan menulis dialog","Contoh cerpen pendek dianotasi"],
            regular: ["Kebebasan tema","Berbagai contoh cerpen","Bimbingan bertahap","Kesempatan publikasi"],
            challenge: ["Cerpen dengan alur mundur","Sudut pandang unik","Cerpen untuk lomba","Kumpulan cerpen tematik"],
          },
          remedial: ["Latihan menulis paragraf deskriptif","Membaca dan mengidentifikasi unsur cerpen lain","Bimbingan satu-satu","Fokus satu unsur tiap sesi"],
          enrichment: ["Membaca dan meresensi buku kumpulan cerpen","Menulis cerpen berdasarkan pengalaman","Mengirim cerpen ke majalah remaja","Membuat video literasi"],
          readingPractice: {
            title: "Latihan Membaca: Cerita Pendek",
            stimulusTitle: "Lukisan di Sudut Kelas",
            stimulusText: `Hari pertama masuk sekolah setelah liburan semester. Aku -- Dani -- duduk di bangku paling belakang seperti biasa. Kelas 8C masih sama: meja kayu dengan coretan-coretan tahun lalu, papan tulis yang sudah mengapur, dan jendela yang menghadap lapangan basket.

Di sudut kiri belakang kelas, persis di samping tempat dudukku, ada sesosok anak perempuan duduk sendirian. Ia memakai kacamata tebal dan seragam yang sedikit kebesaran. Tangannya sibuk menggambar sesuatu di buku gambar. Aku belum pernah melihatnya sebelumnya.

"Anak pindahan dari Semarang," bisik Raka, teman sebangkuku. "Namanya Renata."

Selama jam pelajaran, Renata hanya diam dan menggambar. Beberapa kali Bu Dewi menegurnya karena melamun, tetapi ia hanya menunduk.

Waktu istirahat, aku tidak sengaja melihat buku gambar Renata yang tertinggal. Mataku terbelalak. Gambar-gambarnya luar biasa indah -- pemandangan Gunung Merbabu, potret seorang ibu, pemandangan Semarang. Setiap garis pensil begitu hidup. Di halaman terakhir, ada gambar anak laki-laki tertawa -- dan entah mengapa, mirip denganku.

Hari-hari berikutnya, aku ingin menyapanya tetapi lidahku terasa kaku.

"Siapa yang kamu gambar di halaman terakhir itu?" tanyaku akhirnya, sepulang sekolah. Renata tersentak. Wajahnya memerah. "Itu... kamu," jawabnya pelan. "Kamu waktu upacara Senin. Kamu tersenyum sama teman-temanmu. Aku suka gambar senyum."

Sejak saat itu, kami mulai berbicara. Ia bercerita tentang Semarang, tentang kesulitan mencari teman di sekolah baru. Aku bercerita tentang mimpiku menjadi pelukis -- yang selama ini kusembunyikan karena takut ditertawakan.

Renata tersenyum. "Aku bisa mengajarimu menggambar, kalau kamu mau."

Untuk pertama kalinya, aku merasa dimengerti. Di sudut kelas itu, di antara coretan bangku dan debu kapur, aku menemukan teman yang tidak hanya melihatku -- tetapi juga melihat mimpi-mimpiku.`,
            questions: [
              { id: "8-cerpen-rp-01", type: "pilihan_ganda", questionText: "Tokoh utama cerpen ini adalah...", options: ["Renata", "Dani", "Raka", "Bu Dewi"], correctAnswer: "Dani", explanation: "Cerita menggunakan sudut pandang 'aku' yang bernama Dani.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-rp-02", type: "pilihan_ganda", questionText: "Renata adalah murid...", options: ["Baru pindahan dari Semarang", "Lama di sekolah itu", "Teman kecil Dani", "Kakak kelas Dani"], correctAnswer: "Baru pindahan dari Semarang", explanation: "Raka memberi tahu Dani bahwa Renata anak pindahan dari Semarang.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-rp-03", type: "pilihan_ganda", questionText: "Hobi Renata yang terlihat adalah...", options: ["Membaca", "Menggambar", "Bermain musik", "Menulis puisi"], correctAnswer: "Menggambar", explanation: "Renata terus-menerus menggambar di buku gambarnya.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-rp-04", type: "pilihan_ganda", questionText: "Dani membuka buku gambar Renata karena...", options: ["Ingin mencuri", "Penasaran karena Renata sering menggambar", "Disuruh teman", "Ingin merusak"], correctAnswer: "Penasaran karena Renata sering menggambar", explanation: "Rasa penasaran membuat Dani membuka buku gambar yang tertinggal.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-rp-05", type: "pilihan_ganda", questionText: "Yang membuat Dani terkejut adalah...", options: ["Buku itu kosong", "Gambar-gambar sangat indah dan hidup", "Ada surat untuknya", "Gambar jelek"], correctAnswer: "Gambar-gambar sangat indah dan hidup", explanation: "Dani terbelalak karena gambar Renata 'luar biasa indah'.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-rp-06", type: "pilihan_ganda", questionText: "Konflik Dani adalah...", options: ["Tidak bisa menggambar", "Malu takut ditertawakan karena ingin jadi pelukis", "Tidak suka Renata", "Nilai jelek"], correctAnswer: "Malu takut ditertawakan karena ingin jadi pelukis", explanation: "Dani menyembunyikan mimpinya jadi pelukis karena takut ditertawakan.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-cerpen-rp-07", type: "pilihan_ganda", questionText: "Orientasi terdapat pada paragraf...", options: ["1 dan 2", "3 dan 4", "5 dan 6", "7 dan 8"], correctAnswer: "1 dan 2", explanation: "Paragraf 1-2: pengenalan tokoh Dani dan Renata serta latar kelas.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-cerpen-rp-08", type: "pilihan_ganda", questionText: "Sudut pandang yang digunakan...", options: ["Orang pertama (aku)", "Orang ketiga (dia)", "Orang pertama jamak", "Orang ketiga mahatahu"], correctAnswer: "Orang pertama (aku)", explanation: "Cerita menggunakan sudut pandang 'aku' yang bernama Dani.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-cerpen-rp-09", type: "pilihan_ganda", questionText: "Amanat cerpen ini adalah...", options: ["Jangan buka buku orang lain", "Setiap orang punya bakat yang perlu dihargai", "Belajar menggambar sulit", "Sekolah pindahan menyenangkan"], correctAnswer: "Setiap orang punya bakat yang perlu dihargai", explanation: "Cerita mengajarkan keberanian mengejar mimpi dan menghargai bakat.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-cerpen-rp-10", type: "pilihan_ganda", questionText: "'Setiap garis pensil begitu hidup, seolah bernapas' menggunakan majas...", options: ["Personifikasi", "Hiperbola", "Simile", "Metafora"], correctAnswer: "Personifikasi", explanation: "Memberi sifat hidup ('bernapas') pada benda mati (garis pensil).", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-cerpen-rp-11", type: "jawaban_singkat", questionText: "Apa mimpi yang disembunyikan Dani?", correctAnswer: "Menjadi pelukis", explanation: "Dani mengaku mimpinya jadi pelukis yang disembunyikan karena takut ditertawakan.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-rp-12", type: "jawaban_singkat", questionText: "Apa yang Renata gambar di halaman terakhir?", correctAnswer: "Dani tersenyum saat upacara Hari Senin", explanation: "Renata menggambar Dani tersenyum, ia suka senyum Dani.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-cerpen-rp-13", type: "uraian", questionText: "Analisislah karakter Renata berdasarkan dialog, tindakan, dan deskripsi!", correctAnswer: ["Renata pendiam (tidak bicara, tidak bertanya), pemalu (wajah merah saat diajak bicara), berbakat (gambar luar biasa indah), dan berani dengan caranya sendiri (menunjukkan gambar Dani). Latar belakang anak pindahan menjelaskan sifat pendiamnya."], explanation: "Karakter dianalisis dari dialog, tindakan, deskripsi.", skillTarget: "analisis struktur", difficulty: "menantang" },
              { id: "8-cerpen-rp-14", type: "uraian", questionText: "Tunjukkan teknik 'show don't tell' dengan dua contoh!", correctAnswer: ["(1) Rasa takut Dani tidak dinyatakan langsung tetapi melalui 'lidahku terasa kaku' -- reaksi fisik. (2) Bakat Renata tidak diceritakan, tetapi ditunjukkan melalui reaksi Dani 'mataku terbelalak' dan deskripsi 'garis pensil begitu hidup'."], explanation: "'Show don't tell' menunjukkan melalui aksi dan detail sensoris.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Cerita Pendek",
            questions: [
              { id: "8-cerpen-qq-01", type: "pilihan_ganda", questionText: "Cerpen adalah...", options: ["Karya fiksi sekali duduk", "Novel dipendekkan", "Karya nonfiksi", "Laporan faktual"], correctAnswer: "Karya fiksi sekali duduk", explanation: "Cerpen adalah fiksi prosa yang selesai dalam sekali duduk.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-qq-02", type: "pilihan_ganda", questionText: "Unsur intrinsik cerpen meliputi...", options: ["Tema, tokoh, alur, latar, sudut pandang, amanat", "Kata pengantar, daftar isi", "Sinopsis, resensi", "Babak, dialog"], correctAnswer: "Tema, tokoh, alur, latar, sudut pandang, amanat", explanation: "Unsur intrinsik adalah unsur pembangun cerita dari dalam.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-qq-03", type: "pilihan_ganda", questionText: "Alur maju adalah...", options: ["Mundur ke masa lalu", "Kronologis dari awal ke akhir", "Campuran", "Sorot balik"], correctAnswer: "Kronologis dari awal ke akhir", explanation: "Alur maju bergerak maju secara berurutan.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-qq-04", type: "pilihan_ganda", questionText: "Bagian munculnya konflik disebut...", options: ["Orientasi", "Komplikasi", "Klimaks", "Resolusi"], correctAnswer: "Komplikasi", explanation: "Komplikasi adalah tahap konflik mulai muncul.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-cerpen-qq-05", type: "pilihan_ganda", questionText: "Sudut pandang orang pertama ditandai dengan...", options: ["Dia, mereka", "Aku, saya", "Kamu, Anda", "Kita, kami"], correctAnswer: "Aku, saya", explanation: "Sudut pandang orang pertama menggunakan 'aku'/'saya'.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-cerpen-qq-06", type: "pilihan_ganda", questionText: "Cerpen vs novel: perbedaannya...", options: ["Novel lebih pendek", "Cerpen fokus satu konflik, novel multi-konflik", "Cerpen tanpa tokoh", "Novel tanpa amanat"], correctAnswer: "Cerpen fokus satu konflik, novel multi-konflik", explanation: "Cerpen fokus satu konflik tunggal.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-cerpen-qq-07", type: "pilihan_ganda", questionText: "'Show don't tell' berarti...", options: ["Menunjukkan lewat aksi, bukan menyatakan langsung", "Berbicara keras", "Menceritakan semuanya", "Menulis panjang"], correctAnswer: "Menunjukkan lewat aksi, bukan menyatakan langsung", explanation: "Teknik bercerita dengan menunjukkan melalui tindakan dan detail.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-cerpen-qq-08", type: "pilihan_ganda", questionText: "Simile menggunakan kata...", options: ["Adalah, ialah", "Seperti, bagai", "Sangat, sekali", "Dan, atau"], correctAnswer: "Seperti, bagai", explanation: "Simile membandingkan dengan kata 'seperti' atau 'bagai'.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-cerpen-qq-09", type: "pilihan_ganda", questionText: "Amanat dalam cerpen disampaikan secara...", options: ["Langsung di awal", "Implisit lewat keseluruhan cerita", "Hanya di penutup", "Tidak ada"], correctAnswer: "Implisit lewat keseluruhan cerita", explanation: "Amanat tersirat dalam keseluruhan cerita.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-cerpen-qq-10", type: "pilihan_ganda", questionText: "Contoh cerpen tema persahabatan...", options: ["Dua sahabat saling membantu", "Pahlawan berjuang", "Petualangan di hutan", "Penemuan ilmiah"], correctAnswer: "Dua sahabat saling membantu", explanation: "Tema persahabatan berfokus pada hubungan saling mendukung.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-cerpen-qq-11", type: "jawaban_singkat", questionText: "Sebutkan lima struktur cerpen!", correctAnswer: "Orientasi, komplikasi, klimaks, resolusi, koda", explanation: "Struktur cerpen: orientasi, komplikasi, klimaks, resolusi, koda (opsional).", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-cerpen-qq-12", type: "jawaban_singkat", questionText: "Apa yang dimaksud latar dalam cerpen?", correctAnswer: "Tempat, waktu, dan suasana terjadinya peristiwa", explanation: "Latar mencakup setting tempat, waktu, dan suasana.", skillTarget: "pemahaman isi", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Mulai dengan cerpen yang relevan dengan usia siswa","Gunakan show don't tell sebagai teknik utama","Fasilitasi kelompok diskusi buku","Adakan sesi baca puisi/cerpen"],
            commonMisconceptions: [
              { misconception: "Cerpen harus panjang.", correction: "Cerpen yang baik justru efisien. Selesai sekali duduk." },
              { misconception: "Cerpen harus happy ending.", correction: "Akhir terbuka atau menyedihkan juga sah dalam cerpen." },
            ],
            feedbackGuide: ["Umpan balik spesifik pada pengembangan karakter","Tandai show don't tell yang efektif","Fokus satu aspek revisi"],
            classroomManagement: ["Sediakan pojok baca","Literasi 15 menit awal pelajaran","Jadwal publikasi rutin","Antologi kelas sebagai proyek semester"],
          },
          reflection: {
            studentQuestions: ["Apa yang membuat cerpen saya unik?","Unsur intrinsik mana tersulit ditulis?","Bagaimana membuat tokoh lebih hidup?"],
            teacherQuestions: ["Apakah siswa mampu menulis cerpen dengan unsur lengkap?","Apakah kegiatan literasi meningkatkan minat baca?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Cerita Pendek. Materi mencakup: pengertian cerpen, unsur intrinsik (tema, tokoh, alur, latar, sudut pandang, amanat), struktur (orientasi, komplikasi, klimaks, resolusi, koda), dan teknik show don't tell. Sertakan contoh cerpen tentang kehidupan sekolah. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["cerpen","fiksi","unsur intrinsik","alur","tokoh","latar","tema","amanat","menulis kreatif","literasi"],
          isReady: true,
        },
      ],
    },
    {
      semester: 2,
      chapters: [
        {
          id: "viii-puisi",
          slug: "teks-puisi-baru",
          grade: "VIII",
          phase: "D",
          semester: 2,
          chapterNumber: 6,
          title: "Bab 6: Teks Puisi (Baru)",
          shortTitle: "Puisi",
          kd: "Menulis",
          emoji: "📝",
          description: "Mengenal dan mengapresiasi puisi baru: menganalisis unsur pembangun, diksi, majas, rima, dan irama, serta menulis puisi dengan pilihan kata yang tepat.",
          overview: "Puisi adalah bahasa dalam bentuknya yang paling murni. Bab ini mengajak siswa memasuki dunia puisi baru — puisi yang tidak terikat oleh aturan jumlah baris, suku kata, atau rima seperti puisi lama. Siswa akan belajar bahwa puisi bukan sekadar rangkaian kata indah, melainkan ungkapan perasaan dan gagasan yang dikemas dengan diksi padat, majas segar, dan irama khas. Dari mendeklamasikan puisi dengan penghayatan hingga menulis puisi orisinal, siswa akan menemukan bahwa setiap orang memiliki suara puitis dalam dirinya.",
          learningGoals: [
            "Memahami pengertian, ciri-ciri, dan jenis puisi baru",
            "Menganalisis unsur fisik (diksi, majas, rima, irama) dan batin (tema, rasa, nada, amanat) puisi",
            "Membandingkan puisi baru dengan puisi lama",
            "Menulis puisi baru dengan diksi dan majas yang tepat",
            "Mendeklamasikan puisi dengan intonasi, ekspresi, dan penghayatan",
          ],
          keywords: ["puisi baru","diksi","majas","rima","irama","imaji","lambang","tipografi","deklamasi","unsur batin"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Puisi baru adalah puisi yang tidak terikat oleh aturan jumlah baris, suku kata, atau rima. Kebebasan ini justru menuntut penyair untuk lebih cermat dalam memilih kata, menciptakan imaji, dan membangun suasana.",
              characteristics: ["Tidak terikat jumlah baris per bait","Tidak terikat jumlah suku kata per baris","Penggunaan diksi yang padat dan konotatif","Kaya akan majas dan citraan","Memiliki irama yang terbentuk dari pemilihan bunyi","Tipografi bebas sesuai keinginan penulis"],
              socialFunction: "Puisi berfungsi sebagai media ekspresi perasaan dan gagasan penyair, kritik sosial yang dibalut keindahan bahasa, dan hiburan spiritual bagi pembaca.",
              lifeBenefits: "Menulis dan membaca puisi melatih kepekaan berbahasa, kemampuan memilih kata yang tepat, dan kecerdasan emosional. Puisi juga menjadi alat terapi dan katarsis yang sehat.",
              distinction: "Puisi baru berbeda dari puisi lama yang terikat aturan. Puisi baru berbeda dari prosa yang menggunakan kalimat utuh dan paragraf. Puisi juga berbeda dari drama yang memerlukan dialog dan aksi panggung.",
            },
            contentComposition: {
              infoPoints: ["Unsur fisik puisi: diksi, imaji, majas, lambang, rima, irama, tipografi","Unsur batin puisi: tema, rasa, nada, amanat","Puisi baru dibedakan berdasarkan isi dan bentuknya"],
              buildingElements: [
                "Diksi: pilihan kata yang tepat dan bermakna konotatif",
                "Imaji: citraan penglihatan, pendengaran, perabaan, dll.",
                "Majas: gaya bahasa untuk efek puitis",
                "Rima: pengulangan bunyi untuk menciptakan musikalitas",
                "Irama: alunan bunyi yang teratur",
                "Tipografi: tata wajah puisi sebagai makna visual",
              ],
              mainIdeas: "Inti puisi baru adalah kebebasan berekspresi yang tetap mengutamakan keindahan bahasa dan kedalaman makna.",
              partRelationships: "Unsur fisik dan batin saling terkait erat. Diksi yang tepat membangun imaji yang kuat, imaji membangun suasana, suasana membawa rasa, dan rasa menyampaikan amanat.",
              simpleExample: "Hujan Bulan Juni karya Sapardi Djoko Damono (dikutip sepenggal) — perhatikan diksi, imaji, dan rima.",
            },
            textVariants: {
              types: "Puisi baru berdasarkan isi",
              variantDescriptions: ["Balada: puisi berisi kisah atau cerita","Ode: puisi pujian untuk orang atau hal tertentu","Elegi: puisi ratapan atau duka","Romansa: puisi tentang cinta dan kasih sayang","Satire: puisi kritik sosial"],
              groupingBasis: "Pengelompokan berdasarkan tema dan isi puisi.",
            },
            structurePattern: {
              generalPattern: ["Membaca puisi dengan saksama","Mengidentifikasi tema dan suasana","Menganalisis diksi dan majas","Menganalisis imaji dan rima","Menemukan amanat"],
              variationNotes: "Struktur analisis dapat berbeda tergantung jenis puisi. Puisi naratif seperti balade memerlukan analisis alur, sementara puisi liris fokus pada perasaan.",
              readingGuide: "Baca puisi beberapa kali: pertama untuk kesan umum, kedua untuk makna, ketiga untuk keindahan bahasa.",
            },
            languageFeatures: {
              register: "Bahasa puitis: padat, konotatif, dan kaya citra.",
              features: [
                "Diksi bermakna konotatif bukan denotatif",
                "Penggunaan majas (personifikasi, metafora, simile, hiperbola)",
                "Kalimat pendek dan padat, tanpa kata tugas berlebihan",
                "Pengulangan bunyi untuk efek musikal",
                "Kata seru dan interjeksi untuk ekspresi",
                "Pencitraan multisensori",
                "Tipografi sebagai bagian dari makna",
              ],
              wordChoice: "Kata dipilih berdasarkan makna konotatif, bunyi, dan efek emosional.",
              sentencePattern: "Cenderung pendek, fragmentaris, atau bahkan satu kata per baris.",
              conjunctions: "Minim konjungsi untuk menciptakan efek padat dan implisit.",
              style: "Padat, simbolis, dan sugestif.",
              spelling: "EBI, dengan kebebasan tipografis untuk efek artistik.",
              punctuation: "Digunakan minimalis; kapital di awal baris opsional dalam puisi baru.",
            },
            productionProcedure: {
              preProduction: "Tentukan tema — amati lingkungan sekitar, baca puisi referensi, kumpulkan kosakata puitis.",
              production: "Tulis baris pertama sebagai pemicu, lanjutkan dengan imaji, jangan khawatir dengan rima atau aturan.",
              revision: "Baca ulang keras-keras, ganti kata yang terasa hambar dengan sinonim yang lebih segar, periksa irama.",
              editing: "Periksa diksi, potong kata yang tidak perlu, pastikan setiap baris memberi kontribusi pada suasana.",
              publication: "Kumpulkan dalam antologi kelas, bagikan di mading, bacakan dalam acara pentas puisi.",
              bestPractices: "Jangan memaksakan rima; biarkan kata mengalir alami. Gunakan panca indra sebagai pintu masuk imaji.",
            },
          },
          exampleText: {
            title: "Sajak Rembulan Sekolah",
            content: "Rembulan sekolah bersinar redup\nMelewati celah tirai jendela\nMenyinari meja dan kursi kosong\nBuku terbuka di sudut ruang\n\nAngin malam membawa bisik\nCoretan kapur yang belum terhapus\nTentang bilangan dan rumus\nYang berlari menuju ujian\n\nSatu per satu pulang\nMenyisakan lampu lorong\nDan semangat yang terus menyala\nDalam hening belajar",
            analysis: {
              structure: "Puisi terdiri dari 3 bait, 4 baris per bait. Tipografi rapi dengan rata kiri. Bait pertama menggambarkan suasana, bait kedua aktivitas, dan bait ketiga refleksi.",
              content: "Mengangkat tema perjuangan belajar di malam hari. Menggunakan diksi 'rembulan', 'bisik', 'berlari' menciptakan suasana hening namun penuh semangat.",
              language: "Personifikasi pada 'angin malam membawa bisik', metafora 'rembulan sekolah', imaji visual kuat. Rima tidak dipaksakan.",
              strengths: "Kepadatan diksi, imaji yang hidup, dan pesan yang universal.",
              improvements: "Dapat ditambah majas lain untuk variasi. Bait terakhir bisa lebih panjang untuk memperkuat pesan.",
            },
          },
          learningActivities: {
            opening: ["Apersepsi: tanya siswa apakah pernah membaca atau menulis puisi","Pemutaran video deklamasi puisi Chairil Anwar","Membaca bersama puisi pendek, tanya kesan pertama"],
            core: ["Mengidentifikasi diksi dan majas dalam contoh puisi","Diskusi kelompok menganalisis satu puisi utuh","Menulis puisi bertema pengalaman pribadi","Saling menukar dan memberi umpan balik","Deklamasi puisi di depan kelas"],
            group: ["Analisis kelompok: satu puisi, satu poster analisis","Lomba cipta puisi antarkelompok"],
            individual: ["Menulis puisi refleksi harian","Membuat buku kumpulan puisi mini"],
            reflection: ["Apa tantangan terbesar saat menulis puisi?","Bagaimana cara menemukan diksi yang tepat?"],
          },
          worksheet: {
            title: "Lembar Kerja: Analisis dan Penulisan Puisi Baru",
            purpose: "Membantu siswa memahami unsur pembangun puisi dan berlatih menulis puisi orisinal.",
            instructions: ["Baca puisi 'Sajak Rembulan Sekolah' dengan saksama","Identifikasi 3 diksi bermakna konotatif","Temukan 2 majas dan sebutkan jenisnya","Tulis puisi 2 bait tentang lingkungan sekolahmu","Jelaskan tema dan amanat puisimu"],
            activities: "Analisis puisi contoh dan menulis puisi orisinal 2 bait.",
            studentOutput: "Puisi orisinal 2 bait + catatan analisis.",
          },
          assessment: {
            diagnostic: ["Kuis singkat: bedakan puisi lama dan baru","Tulis satu baris puisi tentang pagi hari"],
            formative: ["Observasi partisipasi diskusi","Ceklis analisis puisi","Draft puisi untuk direvisi"],
            summative: ["Puisi jadi 3-4 bait dengan analisis","Deklamasi puisi dengan penghayatan"],
          },
          rubric: {
            aspects: [
              {
                name: "Kesesuaian Tema dan Isi",
                criteria: [
                  { level: 4, description: "Puisi sangat sesuai tema, isi mendalam dan orisinal" },
                  { level: 3, description: "Puisi sesuai tema, isi cukup mendalam" },
                  { level: 2, description: "Puisi kurang sesuai tema, isi dangkal" },
                  { level: 1, description: "Puisi tidak sesuai tema, isi tidak jelas" },
                ],
              },
              {
                name: "Penggunaan Diksi dan Majas",
                criteria: [
                  { level: 4, description: "Diksi sangat tepat, menggunakan 3+ majas secara efektif" },
                  { level: 3, description: "Diksi tepat, menggunakan 2 majas" },
                  { level: 2, description: "Diksi cukup, menggunakan 1 majas" },
                  { level: 1, description: "Diksi kurang tepat, tidak menggunakan majas" },
                ],
              },
              {
                name: "Unsur Fisik (Imaji, Rima, Tipografi)",
                criteria: [
                  { level: 4, description: "Imaji kuat, rima harmonis, tipografi mendukung makna" },
                  { level: 3, description: "Imaji cukup, rima baik, tipografi rapi" },
                  { level: 2, description: "Imaji kurang, rima dipaksakan, tipografi biasa" },
                  { level: 1, description: "Tanpa imaji, tanpa rima, tipografi acak" },
                ],
              },
              {
                name: "Deklamasi dan Penghayatan",
                criteria: [
                  { level: 4, description: "Lafal jelas, intonasi tepat, ekspresi sesuai, penuh penghayatan" },
                  { level: 3, description: "Lafal jelas, intonasi cukup, ekspresi ada" },
                  { level: 2, description: "Lafal kurang jelas, intonasi monoton" },
                  { level: 1, description: "Tidak siap atau membaca tanpa penghayatan" },
                ],
              },
            ],
          },
          differentiation: {
            support: ["Sediakan template analisis puisi dengan panduan bertahap","Berikan contoh puisi pendek 1 bait untuk dianalisis pertama","Bimbingan khusus memilih diksi dari daftar kosakata yang disediakan"],
            regular: ["Analisis puisi utuh 2-3 bait","Menulis puisi 2-3 bait dengan tema bebas","Deklamasi mandiri"],
            challenge: ["Analisis puisi kontemporer yang lebih kompleks","Menulis puisi dengan tema abstrak (waktu, keadilan, eksistensi)","Membuat buku kumpulan puisi digital"],
          },
          remedial: ["Latihan mengidentifikasi majas dari contoh kalimat","Menulis ulang puisi dengan bimbingan diksi","Praktik deklamasi berpasangan sebelum tampil mandiri"],
          enrichment: ["Membaca dan meresensi buku kumpulan puisi penyair nasional","Mengikuti lomba cipta puisi","Membuat video deklamasi puisi untuk media sosial kelas"],
          readingPractice: {
            title: "Latihan Membaca: Puisi Baru",
            stimulusTitle: "Dua Sajak untuk Dibaca",
            stimulusText: `Sajak 1: "Seragam Lama"

Kaucuci seragam itu setiap malam minggu
Dengan sabun colek dan air sumur
Tapi noda tinta di saku kanan
Tak pernah hilang, seperti kenangan

Di saku kiri, huruf 'A' kecil
Bordir biru karya Ibu
Setiap pagi, kau pakai dengan bangga
Tak peduli sudah usang dan lusuh

Dan ketika lenganmu makin pendek
Kau tahu kau semakin besar
Bukan hanya badan, tapi juga mimpi
Yang tak cukup dijejalkan dalam saku seragam

Sajak 2: "Buku Tulis Bergaris"

Buku tulis bergaris biru
Menampung tinta mimpiku
Setiap halaman adalah hari
Setiap baris adalah kisah

Kadang tulisanku keluar garis
Seperti hidup yang tak pernah lurus
Namun guru tersenyum dan berkata
"Tidak apa-apa, yang penting kau terus menulis"

Maka kutulis semua:
Angka, puisi, surat cinta, peta pulau impian
Di buku tulis bergaris biru ini
Aku menyusun masa depan

Ketika halaman terakhir usai
Bukan akhir, melainkan awal
Dari petualangan menulis
Yang tak akan pernah selesai`,
            questions: [
              { id: "8-puisi-rp-01", type: "pilihan_ganda", questionText: "Tema puisi 'Seragam Lama' adalah...", options: ["Kerusakan seragam", "Kenangan sekolah dan pertumbuhan", "Kesedihan karena kemiskinan", "Cara mencuci seragam"], correctAnswer: "Kenangan sekolah dan pertumbuhan", explanation: "Puisi bicara tentang seragam usang sebagai simbol pertumbuhan.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-rp-02", type: "pilihan_ganda", questionText: "Majas pada baris 'Setiap halaman adalah hari' adalah...", options: ["Personifikasi", "Metafora", "Simile", "Hiperbola"], correctAnswer: "Metafora", explanation: "Halaman = hari tanpa kata pembanding -- metafora.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-puisi-rp-03", type: "pilihan_ganda", questionText: "'Noda tinta' pada Sajak 1 bermakna...", options: ["Tumpahan tinta", "Kenangan sekolah tak terlupakan", "Kesalahan tak termaafkan", "PR belum selesai"], correctAnswer: "Kenangan sekolah tak terlupakan", explanation: "'Noda tinta' simbol konotatif kenangan yang membekas.", skillTarget: "identifikasi kebahasaan", difficulty: "menantang" },
              { id: "8-puisi-rp-04", type: "pilihan_ganda", questionText: "Suasana puisi 'Buku Tulis Bergaris' adalah...", options: ["Sedih dan murung", "Semangat dan optimis", "Marah dan frustrasi", "Takut dan cemas"], correctAnswer: "Semangat dan optimis", explanation: "Puisi menunjukkan semangat menulis dan optimisme masa depan.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-puisi-rp-05", type: "pilihan_ganda", questionText: "Rima Sajak 1 bait pertama berpola...", options: ["a-b-a-b", "a-a-b-b", "a-b-b-a", "a-a-a-a"], correctAnswer: "a-a-b-b", explanation: "minggu-sumur (a-a), kanan-kenangan (b-b).", skillTarget: "identifikasi kebahasaan", difficulty: "menantang" },
              { id: "8-puisi-rp-06", type: "pilihan_ganda", questionText: "Amanat puisi 'Buku Tulis Bergaris' adalah...", options: ["Buku harus diisi rapi", "Terus menulis dan bermimpi meski ada rintangan", "Gurulah yang berjasa", "Hidup harus lurus"], correctAnswer: "Terus menulis dan bermimpi meski ada rintangan", explanation: "'Yang penting kau terus menulis' -- jangan menyerah.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-puisi-rp-07", type: "pilihan_ganda", questionText: "Baris 'Bukan hanya badan, tapi juga mimpi' menggunakan gaya...", options: ["Hiperbola", "Paralelisme", "Ironi", "Litotes"], correctAnswer: "Paralelisme", explanation: "Pengulangan struktur 'bukan hanya... tapi juga...'.", skillTarget: "identifikasi kebahasaan", difficulty: "menantang" },
              { id: "8-puisi-rp-08", type: "pilihan_ganda", questionText: "Imaji penglihatan pada baris...", options: ["'Kaucuci seragam'", "'Bordir biru karya Ibu'", "'Setiap baris adalah kisah'", "'Petualangan menulis'"], correctAnswer: "'Bordir biru karya Ibu'", explanation: "'Bordir biru' adalah imaji visual yang dapat dilihat.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-puisi-rp-09", type: "pilihan_ganda", questionText: "Nada puisi 'Buku Tulis Bergaris' adalah...", options: ["Penuh kasih dan dukungan", "Marah dan kecewa", "Sedih pasrah", "Bergembira"], correctAnswer: "Penuh kasih dan dukungan", explanation: "Guru tersenyum dan berkata dengan dukungan, bukan kemarahan.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-puisi-rp-10", type: "pilihan_ganda", questionText: "Jenis puisi baru yang sesuai adalah...", options: ["Balada", "Ode", "Romansa", "Elegi"], correctAnswer: "Romansa", explanation: "Kedua sajak mengungkapkan kasih sayang pada pengalaman sekolah.", skillTarget: "pemahaman isi", difficulty: "menantang" },
              { id: "8-puisi-rp-11", type: "jawaban_singkat", questionText: "Apa simbol 'seragam yang lenganmu makin pendek'?", correctAnswer: "Simbol pertumbuhan fisik dan kedewasaan", explanation: "Seragam pendek melambangkan semakin besarnya tubuh dan jiwa.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-rp-12", type: "jawaban_singkat", questionText: "Makna 'tulisanku keluar garis'?", correctAnswer: "Hidup tidak selalu lurus sesuai rencana, dan itu tidak apa-apa", explanation: "Metafora bahwa hidup kadang menyimpang dari rencana.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-rp-13", type: "uraian", questionText: "Bandingkan kedua puisi dari segi tema, diksi, dan rima! Mana lebih kuat?", correctAnswer: ["Keduanya bertema sekolah/kenangan. Sajak 1 lebih kuat diksi konotatif ('noda tinta') dan rima a-a-b-b konsisten. Sajak 2 lebih kuat pesan dengan metafora 'tulisanku keluar garis'. Keduanya efektif secara berbeda."], explanation: "Perbandingan mencakup unsur fisik dan batin puisi.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-puisi-rp-14", type: "uraian", questionText: "Tulislah puisi 2 bait tentang 'Perpustakaan Sekolah' dengan minimal satu majas dan diksi konotatif!", correctAnswer: ["(Jawaban bebas. Contoh: Perpustakaan sekolah / Jendela kaca menerima senja / Debu melayang di antara rak / Buku-buku menunggu seperti sahabat setia. // Aku meminjam sepasang sayap / Dari halaman tipis / Lalu terbang ke dunia lain / Tanpa meninggalkan kursi.)"], explanation: "Penilaian berdasarkan tema, majas, diksi, keindahan, orisinalitas.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Puisi Baru",
            questions: [
              { id: "8-puisi-qq-01", type: "pilihan_ganda", questionText: "Puisi baru berbeda dari puisi lama karena...", options: ["Tidak terikat aturan jumlah baris, suku kata, rima", "Lebih panjang", "Pakai bahasa daerah", "Tidak bermakna"], correctAnswer: "Tidak terikat aturan jumlah baris, suku kata, rima", explanation: "Puisi baru bebas dari aturan ketat.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-puisi-qq-02", type: "pilihan_ganda", questionText: "Unsur fisik puisi meliputi...", options: ["Tema, rasa, nada", "Diksi, imaji, majas, rima, irama, tipografi", "Tokoh, alur, latar", "Orientasi, komplikasi"], correctAnswer: "Diksi, imaji, majas, rima, irama, tipografi", explanation: "Unsur fisik adalah aspek kebahasaan yang tampak.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-puisi-qq-03", type: "pilihan_ganda", questionText: "Personifikasi adalah...", options: ["Sifat manusia pada benda mati", "Membandingkan dengan 'seperti'", "Melebih-lebihkan", "Mengulang bunyi"], correctAnswer: "Sifat manusia pada benda mati", explanation: "Personifikasi memberi perilaku manusia pada benda mati.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-puisi-qq-04", type: "pilihan_ganda", questionText: "Imaji auditif berkaitan dengan...", options: ["Penglihatan", "Pendengaran", "Penciuman", "Peraba"], correctAnswer: "Pendengaran", explanation: "Imaji auditif berkaitan dengan indra pendengaran.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-puisi-qq-05", type: "pilihan_ganda", questionText: "Puisi pujian disebut...", options: ["Elegi", "Ode", "Satire", "Balada"], correctAnswer: "Ode", explanation: "Ode adalah puisi pujian untuk seseorang atau sesuatu.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-qq-06", type: "pilihan_ganda", questionText: "Tipografi dalam puisi adalah...", options: ["Pilihan kata", "Tata wajah/tampilan visual puisi", "Pengulangan bunyi", "Makna kiasan"], correctAnswer: "Tata wajah/tampilan visual puisi", explanation: "Tipografi adalah pengaturan visual puisi.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-qq-07", type: "pilihan_ganda", questionText: "Rima adalah...", options: ["Pilihan kata indah", "Pengulangan bunyi dalam puisi", "Gaya bahasa kiasan", "Citraan pancaindra"], correctAnswer: "Pengulangan bunyi dalam puisi", explanation: "Rima adalah persamaan bunyi, terutama di akhir baris.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-puisi-qq-08", type: "pilihan_ganda", questionText: "Unsur batin vs fisik puisi...", options: ["Fisik tampak, batin tersirat", "Batin lebih penting", "Fisik hanya puisi lama", "Tidak ada beda"], correctAnswer: "Fisik tampak, batin tersirat", explanation: "Unsur fisik terlihat, unsur batin tersirat sebagai makna.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-qq-09", type: "pilihan_ganda", questionText: "Diksi dalam puisi berarti...", options: ["Kosakata yang digunakan", "Jenis puisi", "Panjang baris", "Jumlah bait"], correctAnswer: "Kosakata yang digunakan", explanation: "Diksi adalah pilihan kata oleh penyair.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-puisi-qq-10", type: "pilihan_ganda", questionText: "Puisi 'Doa' Chairil Anwar bertema...", options: ["Percintaan", "Religius/spiritual", "Kritik sosial", "Pahlawan"], correctAnswer: "Religius/spiritual", explanation: "'Doa' mengungkapkan hubungan manusia dengan Tuhan.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-qq-11", type: "jawaban_singkat", questionText: "Sebutkan empat jenis puisi baru!", correctAnswer: "Balada, ode, elegi, romansa, satire (cukup empat)", explanation: "Jenis puisi baru berdasarkan isi.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-puisi-qq-12", type: "jawaban_singkat", questionText: "Apa itu deklamasi puisi?", correctAnswer: "Pembacaan puisi dengan intonasi, ekspresi, dan gerak sesuai", explanation: "Deklamasi adalah seni membaca puisi dengan penghayatan.", skillTarget: "pemahaman isi", difficulty: "mudah" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Gunakan musik instrumental sebagai latar saat menulis puisi","Undang siswa membaca puisi karya sendiri setiap awal pertemuan","Buat papan puisi kelas yang diperbarui setiap minggu"],
            commonMisconceptions: [
              { misconception: "Puisi harus berima a-b-a-b.", correction: "Puisi baru tidak terikat rima. Rima alami lebih baik dari rima dipaksakan." },
              { misconception: "Puisi harus sulit dipahami.", correction: "Puisi yang baik bisa sederhana asal diksi tepat dan imaji kuat." },
            ],
            feedbackGuide: ["Fokus pada ketepatan diksi dan kekuatan imaji","Hindari mengkritik pilihan tema siswa","Berikan contoh konkret kalimat sebelum dan sesudah revisi"],
            classroomManagement: ["Sediakan buku kumpulan puisi di pojok baca","Jadwalkan 'Jumat Puisi' setiap minggu","Berikan ruang ekspresi tanpa takut dihakimi"],
          },
          reflection: {
            studentQuestions: ["Apa yang paling sulit dalam menulis puisi?","Bagaimana cara menemukan diksi yang indah?","Apa perbedaan puisiku dengan puisi teman?"],
            teacherQuestions: ["Apakah siswa menunjukkan peningkatan penggunaan diksi?","Apakah kegiatan deklamasi berhasil membangun percaya diri?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Puisi Baru. Materi mencakup: pengertian puisi baru, perbedaan dengan puisi lama, unsur fisik (diksi, imaji, majas, rima, irama, tipografi), unsur batin (tema, rasa, nada, amanat), jenis puisi baru (balade, ode, elegi, romansa, satire), dan teknik menulis puisi. Sertakan contoh puisi baru bertema sekolah. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik penilaian 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["puisi baru","diksi","majas","rima","imaji","deklamasi","unsur fisik","unsur batin","apresiasi puisi","cipta puisi"],
          isReady: true,
        },
        {
          id: "viii-ulasan",
          slug: "teks-ulasan-resensi",
          grade: "VIII",
          phase: "D",
          semester: 2,
          chapterNumber: 7,
          title: "Bab 7: Teks Ulasan - Resensi",
          shortTitle: "Ulasan",
          kd: "Berbicara dan Mempresentasikan",
          emoji: "📖",
          description: "Mengulas dan meresensi karya sastra: memahami struktur teks ulasan, menganalisis kelebihan dan kekurangan karya, serta menulis resensi buku atau film.",
          overview: "Setelah membaca buku atau menonton film, pernahkah kalian ingin membagikan pendapat? Teks ulasan atau resensi adalah jawabannya. Bab ini mengajarkan siswa cara menulis ulasan yang kritis, seimbang, dan informatif. Siswa akan belajar bahwa meresensi bukan sekadar memberi nilai bagus atau jelek, melainkan menganalisis karya secara objektif dengan argumen yang didukung data dari dalam karya itu sendiri. Keterampilan ini akan membuat siswa menjadi pembaca dan penonton yang aktif, bukan sekadar konsumen pasif.",
          learningGoals: [
            "Memahami pengertian, tujuan, dan jenis teks ulasan",
            "Menganalisis struktur teks ulasan (identitas, orientasi, sinopsis, analisis, evaluasi, rekomendasi)",
            "Mengidentifikasi kelebihan dan kekurangan karya secara objektif",
            "Menulis resensi buku atau film dengan struktur lengkap",
            "Mempresentasikan ulasan secara lisan",
          ],
          keywords: ["resensi","ulasan","sinopsis","evaluasi","rekomendasi","objektivitas","kritik","apresiasi","buku","film"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Teks ulasan adalah teks yang berisi analisis, evaluasi, dan pendapat tentang suatu karya (buku, film, drama, musik) yang disusun secara objektif dan didukung data dari dalam karya.",
              characteristics: ["Berisi analisis dan evaluasi","Objektif dan didukung bukti","Struktur baku: identitas, orientasi, sinopsis, analisis, evaluasi, rekomendasi","Bahasa informatif dan argumentatif","Mencakup kelebihan dan kekurangan"],
              socialFunction: "Membantu publik memutuskan apakah suatu karya layak dinikmati, memberikan apresiasi pada kreator, dan menjadi dokumentasi kritik sastra.",
              lifeBenefits: "Melatih berpikir kritis, menganalisis secara sistematis, dan menyampaikan pendapat secara argumentatif dan santun.",
              distinction: "Berbeda dari sinopsis yang hanya meringkas cerita. Ulasan bersifat analitis dan evaluatif, bukan sekadar ringkasan.",
            },
            contentComposition: {
              infoPoints: ["Struktur ulasan: identitas → orientasi → sinopsis → analisis → evaluasi → rekomendasi","Analisis mencakup tema, tokoh, alur, bahasa, dan pesan"],
              buildingElements: [
                "Data buku/film (judul, penulis/sutradara, penerbit/tahun)",
                "Orientasi: gambaran umum karya",
                "Sinopsis: ringkasan tanpa spoiler berlebihan",
                "Analisis: pembahasan unsur karya",
                "Evaluasi: kelebihan dan kekurangan",
                "Rekomendasi: saran untuk pembaca/penonton",
              ],
              mainIdeas: "Inti ulasan adalah analisis kritis yang seimbang antara kelebihan dan kekurangan.",
              partRelationships: "Sinopsis memberi konteks, analisis mengupas unsur, evaluasi menilai kualitas, rekomendasi memberi arahan.",
              simpleExample: "Data film, sinopsis 3 paragraf, analisis tokoh dan alur, evaluasi, rekomendasi ditonton.",
            },
            textVariants: {
              types: "Berdasarkan objek",
              variantDescriptions: ["Resensi buku fiksi (novel, cerpen, kumpulan puisi)","Resensi buku nonfiksi (biografi, buku pelajaran)","Ulasan film dan drama","Ulasan album musik"],
              groupingBasis: "Berdasarkan jenis karya yang diulas.",
            },
            structurePattern: {
              generalPattern: ["Judul ulasan yang menarik","Identitas karya (judul, penulis, penerbit, tahun)","Orientasi: pengantar tentang karya","Sinopsis: ringkasan cerita","Analisis: pembahasan unsur","Evaluasi: kelebihan dan kekurangan","Rekomendasi: untuk siapa karya ini cocok"],
              variationNotes: "Struktur dapat dimodifikasi. Beberapa resensi menggabungkan analisis dan evaluasi dalam satu bagian.",
              readingGuide: "Baca/nonton karya dulu, catat poin penting, baru tulis ulasan.",
            },
            languageFeatures: {
              register: "Bahasa argumentatif-informatif, formal namun tidak kaku.",
              features: ["Istilah teknis: protagonis, antagonis, klimaks, alur, latar","Kalimat kompleks dengan konjungsi argumentatif","Kata sifat evaluatif: menarik, mendalam, membosankan","Konjungsi perbandingan: lebih...daripada, sebaliknya","Opini didukung bukti dari karya"],
              wordChoice: "Pilih kata yang tepat untuk menilai: 'memukau', 'mendalam', 'cukup', 'kurang'. Hindari kata superlatif tanpa dasar.",
              sentencePattern: "Pendapat → bukti. Pola: 'Pengembangan tokoh sangat kuat. Hal ini terlihat pada...'",
              conjunctions: "Konjungsi argumentatif: karena, sebab, oleh karena itu, dengan demikian, namun, akan tetapi.",
              style: "Argumentatif, analitis, seimbang — tidak memuji atau mengkritik secara berlebihan.",
              spelling: "EBI, konsisten.",
              punctuation: "Baku, termasuk penggunaan tanda kurung untuk kutipan halaman.",
            },
            productionProcedure: {
              preProduction: "Pilih karya yang akan diulas, baca/tonton secara saksama, catat elemen penting dan kutipan relevan.",
              production: "Tulis identitas karya, buat orientasi singkat, tulis sinopsis ringkas, analisis 2-3 unsur, beri evaluasi, tutup dengan rekomendasi.",
              revision: "Periksa objektivitas: apakah kelebihan dan kekurangan seimbang? Apakah evaluasi didukung bukti?",
              editing: "Periksa ejaan, tanda baca, kerapian struktur. Potong bagian yang terlalu panjang.",
              publication: "Publikasikan di mading kelas, blog sekolah, atau platform literasi.",
              bestPractices: "Gunakan sinopsis secukupnya (1/4 dari total ulasan). Analisis adalah bagian terpenting.",
            },
          },
          exampleText: {
            title: "Resensi: Petualangan di Negeri Awan",
            content: "Judul Buku: Petualangan di Negeri Awan\nPenulis: Andi Pratama\nPenerbit: Lentera Pustaka, 2024\nTebal: 210 halaman\n\nBuku ini mengisahkan petualangan tiga remaja — Raka, Sari, dan Dimas — yang tersesat di dunia paralel bernama Negeri Awan. Mereka harus menyelesaikan tiga teka-teki untuk kembali ke dunia nyata. \n\nKekuatan utama novel ini terletak pada pengembangan tokoh. Masing-masing tokoh memiliki latar belakang yang membuat pembaca peduli pada nasib mereka. Alur cerita cepat dengan plot twist mengejutkan di bab akhir. Bahasa yang digunakan ringan dan mudah dipahami remaja.\n\nNamun, beberapa bagian terasa terlalu cepat, terutama resolusi konflik. Negeri Awan sebagai latar kurang dieksplorasi secara detail. Beberapa dialog terdengar klise.\n\nSecara keseluruhan, novel ini layak dibaca remaja yang menyukai cerita petualangan ringan dengan pesan persahabatan. Sangat cocok untuk bacaan santai di akhir pekan.\n\nRating: 3.5/5",
            analysis: {
              structure: "Lengkap: identitas → orientasi sinopsis → analisis → evaluasi → rekomendasi. Proporsi seimbang antara analisis dan sinopsis.",
              content: "Analisis fokus pada tiga aspek: tokoh, alur, dan bahasa. Evaluasi menyebut kelebihan dan kekurangan secara seimbang.",
              language: "Bahasa argumentatif dengan bukti dari dalam buku. Menggunakan istilah sastra 'plot twist', 'resolusi konflik' dengan tepat.",
              strengths: "Objektif, seimbang, sinopsis proporsional, rekomendasi jelas.",
              improvements: "Analisis dapat diperdalam dengan contoh kutipan langsung dari buku. Dapat menambah analisis tema dan pesan moral.",
            },
          },
          learningActivities: {
            opening: ["Tanya siswa: pernah menulis review buku/film di media sosial?","Tunjukkan contoh resensi dari koran/majalah","Diskusi: apa bedanya review dengan sinopsis?"],
            core: ["Membaca contoh resensi dan mengidentifikasi strukturnya","Analisis kelompok: satu buku/film, tulis ulasan bersama","Presentasi ulasan kelompok","Meresensi buku/film pilihan mandiri","Saling mengulas ulasan teman"],
            group: ["Menulis resensi bersama untuk satu film pendek","Debat: layakkah buku ini mendapat rating 5?"],
            individual: ["Meresensi buku favorit masing-masing","Membuat video review 2 menit"],
            reflection: ["Apa tantangan menulis ulasan yang objektif?","Bagaimana jika pendapatmu berbeda dari mayoritas?"],
          },
          worksheet: {
            title: "Lembar Kerja: Menulis Resensi Buku/Film",
            purpose: "Membantu siswa menulis resensi dengan struktur lengkap dan analisis mendalam.",
            instructions: ["Pilih buku atau film yang pernah kamu nikmati","Lengkapi identitas karya","Tulis sinopsis maksimal 3 paragraf","Analisis minimal 2 unsur (tokoh, alur, atau bahasa)","Berikan evaluasi kelebihan dan kekurangan","Tulis rekomendasi untuk calon pembaca/penonton"],
            activities: "Menulis resensi lengkap sesuai struktur.",
            studentOutput: "Resensi 400-600 kata.",
          },
          assessment: {
            diagnostic: ["Tulis 3 kriteria buku yang menurutmu baik","Sebutkan satu buku/film favorit dan alasannya"],
            formative: ["Ceklis struktur pada draft resensi","Observasi diskusi analisis kelompok"],
            summative: ["Resensi individu lengkap dengan struktur","Presentasi ulasan lisan"],
          },
          rubric: {
            aspects: [
              {
                name: "Kelengkapan Struktur",
                criteria: [
                  { level: 4, description: "Semua struktur identitas, orientasi, sinopsis, analisis, evaluasi, rekomendasi" },
                  { level: 3, description: "Struktur lengkap tapi satu bagian kurang" },
                  { level: 2, description: "Hanya 3-4 struktur yang ada" },
                  { level: 1, description: "Tidak mengikuti struktur, seperti sinopsis biasa" },
                ],
              },
              {
                name: "Kedalaman Analisis",
                criteria: [
                  { level: 4, description: "Analisis mendalam pada 3+ unsur, disertai bukti dari karya" },
                  { level: 3, description: "Analisis 2 unsur, ada bukti" },
                  { level: 2, description: "Analisis 1 unsur, bukti kurang" },
                  { level: 1, description: "Tidak ada analisis, hanya ringkasan" },
                ],
              },
              {
                name: "Objektivitas dan Keseimbangan",
                criteria: [
                  { level: 4, description: "Kelebihan dan kekurangan seimbang, argumen logis dan objektif" },
                  { level: 3, description: "Ada kelebihan dan kekurangan, satu sisi lebih dominan" },
                  { level: 2, description: "Hanya kelebihan atau hanya kekurangan" },
                  { level: 1, description: "Subjektif tanpa dasar, seperti 'bagus' atau 'jelek'" },
                ],
              },
              {
                name: "Kebahasaan dan Tanda Baca",
                criteria: [
                  { level: 4, description: "Ejaan tepat, kalimat efektif, istilah sastra digunakan tepat" },
                  { level: 3, description: "Ejaan baik, kalimat efektif, 1-2 kesalahan" },
                  { level: 2, description: "Beberapa kesalahan ejaan, kalimat kurang efektif" },
                  { level: 1, description: "Banyak kesalahan ejaan, sulit dipahami" },
                ],
              },
            ],
          },
          differentiation: {
            support: ["Sediakan template resensi dengan panduan isian","Berikan contoh resensi pendek 200 kata","Bimbingan satu-satu menulis sinopsis"],
            regular: ["Menulis resensi 400-600 kata mandiri","Mempresentasikan di kelompok kecil"],
            challenge: ["Menulis resensi dengan analisis perbandingan 2 karya","Publikasi di blog atau majalah dinding"],
          },
          remedial: ["Latihan mengisi template resensi dengan panduan bertahap","Mengidentifikasi struktur dari contoh resensi","Menulis ulang evaluasi dengan bimbingan"],
          enrichment: ["Membaca resensi dari sumber profesional (Kompas, Tempo)","Menulis surat pembaca tentang buku favorit","Membuat podcast review buku"],
          readingPractice: {
            title: "Latihan Membaca: Resensi",
            stimulusTitle: "Resensi: Novel Langkah Kecil di Awan",
            stimulusText: `Identitas Buku
Judul: Langkah Kecil di Awan
Penulis: Winda Sari Dewi
Penerbit: Pustaka Pelajar, Yogyakarta
Tahun Terbit: 2025
Tebal: 178 halaman

Orientasi
Novel remaja "Langkah Kecil di Awan" mengangkat tema persahabatan, keberanian mengatasi trauma, dan petualangan. Tokoh utama Maya -- seorang gadis SMP yang takut ketinggian -- harus mengikuti program pendakian gunung sekolah.

Sinopsis
Maya adalah siswi kelas 8 dengan fobia ketinggian parah. Ketika sekolah mengadakan program wajib pendakian Gunung Kembar, Maya panik. Ia berpura-pura sakit, memalsukan surat dokter, bahkan memohon kepala sekolah. Namun orang tuanya memaksa ia ikut untuk mengatasi ketakutannya. Dalam pendakian, Maya bertemu Raka, Sari, Dimas, dan Leni. Saat hujan deras, mereka tersesat. Di sinilah mereka harus bekerja sama dan menghadapi ketakutan masing-masing.

Analisis
Kekuatan novel ini terletak pada pengembangan karakter yang mendalam. Tokoh Maya digambarkan manusiawi -- lemah, takut, kadang menyebalkan, tapi menyentuh. Dialog alami sesuai karakter remaja. Latar gunung digambarkan detail sehingga pembaca seolah ikut mendaki. Alur kronologis dengan tempo pas, klimaks di bagian tersesat, dan plot twist tentang masa lalu Maya memberi kejutan manis.

Evaluasi
Kelebihan: (1) Tema unik tentang fobia; (2) Karakter kuat dan berkembang; (3) Deskripsi latar hidup; (4) Amanat organik. Kekurangan: (1) Beberapa bagian tengah lambat; (2) Tokoh Dimas dan Leni kurang berkembang; (3) Resolusi trauma Maya terlalu mudah.

Rekomendasi
Direkomendasikan untuk remaja 12-16 tahun yang suka petualangan dengan pesan persahabatan. Bahasa ringan. Rating: 4/5 bintang.`,
            questions: [
              { id: "8-ulasan-rp-01", type: "pilihan_ganda", questionText: "Objek yang diulas adalah...", options: ["Film", "Novel", "Buku pelajaran", "Majalah"], correctAnswer: "Novel", explanation: "Teks meresensi novel 'Langkah Kecil di Awan'.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-ulasan-rp-02", type: "pilihan_ganda", questionText: "Identitas buku mencantumkan...", options: ["Judul, penulis, penerbit, tahun, tebal", "Sinopsis", "Analisis", "Kelebihan"], correctAnswer: "Judul, penulis, penerbit, tahun, tebal", explanation: "Identitas berisi data bibliografis buku.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-ulasan-rp-03", type: "pilihan_ganda", questionText: "Konflik utama tokoh Maya adalah...", options: ["Bencana alam", "Fobia ketinggian parah", "Persaingan akademik", "Masalah keluarga"], correctAnswer: "Fobia ketinggian parah", explanation: "Maya memiliki fobia ketinggian dan harus ikut pendakian.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-ulasan-rp-04", type: "pilihan_ganda", questionText: "Kelebihan utama novel menurut resensator...", options: ["Harga murah", "Pengembangan karakter mendalam dan tema unik", "Sampul menarik", "Penulis terkenal"], correctAnswer: "Pengembangan karakter mendalam dan tema unik", explanation: "Resensator memuji karakter dan tema unik tentang fobia.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-ulasan-rp-05", type: "pilihan_ganda", questionText: "Kekurangan novel ini adalah...", options: ["Bahasa sulit", "Bagian tengah lambat, tokoh sampingan kurang, resolusi mudah", "Cerita tidak menarik", "Sampul jelek"], correctAnswer: "Bagian tengah lambat, tokoh sampingan kurang, resolusi mudah", explanation: "Tiga kekurangan disebut: tempo, tokoh, resolusi.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-ulasan-rp-06", type: "pilihan_ganda", questionText: "Struktur teks ulasan adalah...", options: ["Pernyataan umum, argumen, penegasan", "Identitas, orientasi, sinopsis, analisis, evaluasi, rekomendasi", "Pembuka, isi, penutup", "Orientasi, komplikasi, resolusi"], correctAnswer: "Identitas, orientasi, sinopsis, analisis, evaluasi, rekomendasi", explanation: "Struktur baku resensi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-ulasan-rp-07", type: "pilihan_ganda", questionText: "'Tokoh Maya digambarkan manusiawi -- lemah, takut, kadang menyebalkan' termasuk...", options: ["Sinopsis", "Analisis", "Evaluasi", "Rekomendasi"], correctAnswer: "Analisis", explanation: "Kalimat ini menganalisis karakterisasi tokoh.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-ulasan-rp-08", type: "pilihan_ganda", questionText: "Bagian rekomendasi banyak menggunakan kalimat...", options: ["Imperatif dan persuasif", "Deklaratif", "Interogatif", "Eksklamatif"], correctAnswer: "Imperatif dan persuasif", explanation: "Rekomendasi mengajak: 'direkomendasikan', 'cocok untuk'.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-ulasan-rp-09", type: "pilihan_ganda", questionText: "Selain buku, resensi bisa untuk...", options: ["Puisi, cerpen", "Film, musik, drama", "Lukisan, patung", "Semua benar"], correctAnswer: "Film, musik, drama", explanation: "Ulasan dapat mengulas berbagai karya seni.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-ulasan-rp-10", type: "pilihan_ganda", questionText: "Ciri bahasa teks ulasan adalah...", options: ["Bahasa kiasan berlebihan", "Argumentatif dengan bukti dari karya", "Hanya pujian", "Imperatif"], correctAnswer: "Argumentatif dengan bukti dari karya", explanation: "Ulasan bersifat argumentatif dengan bukti dari dalam karya.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-ulasan-rp-11", type: "jawaban_singkat", questionText: "Siapa penulis novel 'Langkah Kecil di Awan'?", correctAnswer: "Winda Sari Dewi", explanation: "Identitas mencantumkan Winda Sari Dewi sebagai penulis.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-ulasan-rp-12", type: "jawaban_singkat", questionText: "Apa tema novel ini?", correctAnswer: "Persahabatan, keberanian mengatasi trauma, dan petualangan", explanation: "Tiga tema disebut dalam orientasi resensi.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-ulasan-rp-13", type: "uraian", questionText: "Evaluasilah resensi ini: apakah kelebihan dan kekurangan seimbang? Apakah rekomendasi sesuai?", correctAnswer: ["Cukup seimbang: 4 kelebihan dan 3 kekurangan. Kelebihan didukung analisis, kekurangan logis. Rekomendasi sesuai untuk remaja 12-16 yang suka petualangan -- selaras isi novel. Namun evaluasi bisa lebih kuat dengan contoh kutipan halaman spesifik."], explanation: "Resensi baik memiliki keseimbangan dan konsistensi.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-ulasan-rp-14", type: "uraian", questionText: "Bandingkan resensi dengan sinopsis biasa. Mana lebih bermanfaat?", correctAnswer: ["Resensi lebih bermanfaat karena: (1) analisis mendalam, (2) membantu keputusan, (3) wawasan sastra, (4) kelebihan/kekurangan. Sinopsis hanya ringkasan cerita tanpa penilaian kritis."], explanation: "Resensi harus berisi analisis, bukan hanya sinopsis.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Teks Ulasan",
            questions: [
              { id: "8-ulasan-qq-01", type: "pilihan_ganda", questionText: "Tujuan teks ulasan...", options: ["Menghibur", "Memberi penilaian kritis terhadap karya", "Menjelaskan proses", "Menggambarkan objek"], correctAnswer: "Memberi penilaian kritis terhadap karya", explanation: "Ulasan bertujuan menganalisis dan mengevaluasi karya.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-ulasan-qq-02", type: "pilihan_ganda", questionText: "Sinopsis berisi...", options: ["Analisis tokoh", "Ringkasan cerita tanpa spoiler", "Kelebihan karya", "Data buku"], correctAnswer: "Ringkasan cerita tanpa spoiler", explanation: "Sinopsis ringkasan cerita yang memberi gambaran umum.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-ulasan-qq-03", type: "pilihan_ganda", questionText: "Perbedaan resensi dan sinopsis...", options: ["Resensi analisis, sinopsis ringkasan", "Sinopsis lebih panjang", "Tidak ada beda", "Resensi hanya film"], correctAnswer: "Resensi analisis, sinopsis ringkasan", explanation: "Resensi berisi analisis, sinopsis hanya meringkas.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-ulasan-qq-04", type: "pilihan_ganda", questionText: "Evaluasi berisi...", options: ["Ringkasan", "Kelebihan dan kekurangan", "Data buku", "Rekomendasi"], correctAnswer: "Kelebihan dan kekurangan", explanation: "Evaluasi berisi penilaian kelebihan dan kekurangan.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-ulasan-qq-05", type: "pilihan_ganda", questionText: "Yang tidak bisa diresensi...", options: ["Novel", "Film", "Peristiwa alam", "Album musik"], correctAnswer: "Peristiwa alam", explanation: "Resensi mengulas karya manusia, bukan fenomena alam.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-ulasan-qq-06", type: "pilihan_ganda", questionText: "Ciri bahasa ulasan adalah kata sifat...", options: ["Imperatif", "Evaluatif (menarik, mendalam)", "Material", "Temporal"], correctAnswer: "Evaluatif (menarik, mendalam)", explanation: "Kata sifat evaluatif menilai kualitas karya.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-ulasan-qq-07", type: "pilihan_ganda", questionText: "Resensi baik bersifat...", options: ["Hanya memuji", "Hanya mengkritik", "Objektif dan seimbang", "Berdasarkan rumor"], correctAnswer: "Objektif dan seimbang", explanation: "Resensi baik menyebut kelebihan dan kekurangan objektif.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-ulasan-qq-08", type: "pilihan_ganda", questionText: "Rekomendasi berfungsi...", options: ["Meringkas cerita", "Memberi saran pembaca", "Menulis ulang sinopsis", "Memuji"], correctAnswer: "Memberi saran pembaca", explanation: "Rekomendasi memberi arahan calon pembaca.", skillTarget: "analisis struktur", difficulty: "mudah" },
              { id: "8-ulasan-qq-09", type: "pilihan_ganda", questionText: "'Protagonis, klimaks' adalah istilah...", options: ["Kata sifat", "Istilah teknis sastra", "Konjungsi", "Kata kerja"], correctAnswer: "Istilah teknis sastra", explanation: "Istilah untuk analisis unsur intrinsik karya sastra.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-ulasan-qq-10", type: "pilihan_ganda", questionText: "Bagian terpenting resensi adalah...", options: ["Identitas", "Analisis dan evaluasi", "Sinopsis", "Rekomendasi"], correctAnswer: "Analisis dan evaluasi", explanation: "Analisis dan evaluasi adalah inti resensi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-ulasan-qq-11", type: "jawaban_singkat", questionText: "Sebutkan 3 jenis karya yang bisa diresensi!", correctAnswer: "Buku, film, musik, atau drama", explanation: "Berbagai karya seni bisa diresensi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-ulasan-qq-12", type: "jawaban_singkat", questionText: "Apa yang dimaksud resensi objektif?", correctAnswer: "Penilaian berdasarkan bukti dan fakta dari karya, bukan selera pribadi", explanation: "Objektif berarti didukung bukti, bukan subjektif.", skillTarget: "evaluasi", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Pilih satu film pendek bersama untuk dipraktikkan meresensi","Undang siswa membawa buku favorit ke kelas","Gunakan model 'think-pair-share' untuk analisis"],
            commonMisconceptions: [
              { misconception: "Resensi harus selalu positif.", correction: "Resensi yang baik seimbang antara kelebihan dan kekurangan." },
              { misconception: "Sinopsis adalah bagian terpenting resensi.", correction: "Analisis dan evaluasi adalah inti resensi, sinopsis hanya konteks." },
            ],
            feedbackGuide: ["Tandai argumen yang didukung bukti vs opini tanpa dasar","Dorong siswa mengutip langsung dari karya","Hindari menyalahkan selera pribadi siswa"],
            classroomManagement: ["Sediakan koleksi buku/film Kemdikbud untuk diresensi","Jadwalkan 'Sesi Bedah Buku' bulanan","Buat pojok resensi di kelas yang diperbarui tiap minggu"],
          },
          reflection: {
            studentQuestions: ["Apa yang paling sulit dalam menulis resensi?","Bagaimana cara tetap objektif saat mengulas karya yang sangat kusukai?"],
            teacherQuestions: ["Apakah siswa mampu membedakan analisis dan ringkasan?","Apakah siswa menunjukkan sikap kritis dalam mengulas?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Teks Ulasan atau Resensi. Materi mencakup: pengertian teks ulasan, struktur (identitas, orientasi, sinopsis, analisis, evaluasi, rekomendasi), ciri kebahasaan, dan cara menulis resensi buku/film. Sertakan contoh resensi novel remaja. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["resensi","ulasan","sinopsis","analisis","evaluasi","rekomendasi","kritik sastra","objektif","apresiasi"],
          isReady: true,
        },
        {
          id: "viii-persuasif",
          slug: "teks-persuasif-iklan-poster",
          grade: "VIII",
          phase: "D",
          semester: 2,
          chapterNumber: 8,
          title: "Bab 8: Teks Persuasif (Iklan / Poster)",
          shortTitle: "Persuasif",
          kd: "Membaca dan Memirsa",
          emoji: "📢",
          description: "Memahami teks persuasif dalam iklan dan poster: menganalisis ajakan, fakta, opini, dan teknik persuasi visual-verbal, serta membuat poster/iklan persuasif.",
          overview: "Iklan dan poster ada di mana-mana: dari ponsel, pinggir jalan, hingga dinding kelas. Sadarkah siswa bahwa semua itu berusaha memengaruhi mereka? Bab ini membuka mata siswa terhadap teknik persuasi di balik setiap iklan dan poster. Mereka akan belajar membedakan bujukan yang etis dan yang manipulatif, menganalisis elemen visual dan verbal, serta menciptakan poster persuasif yang kuat dan bertanggung jawab. Di era digital, literasi persuasi adalah keterampilan bertahan hidup.",
          learningGoals: [
            "Memahami pengertian, ciri-ciri, dan tujuan teks persuasif",
            "Menganalisis struktur teks persuasif (pengenalan isu, rangkaian argumen, pernyataan ajakan, penegasan kembali)",
            "Membedakan fakta dan opini dalam iklan/poster",
            "Menganalisis teknik persuasi verbal dan visual",
            "Membuat poster atau iklan persuasif untuk kampanye sosial",
          ],
          keywords: ["persuasif","iklan","poster","ajakan","fakta","opini","slogan","etika persuasi","desain","kampanye"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Teks persuasif adalah teks yang bertujuan memengaruhi pembaca atau pendengar untuk melakukan sesuatu sesuai keinginan penulis.",
              characteristics: ["Bertujuan mengajak atau memengaruhi","Disertai argumen logis dan bukti","Menggunakan bahasa emosional dan rasional","Struktur: pengenalan isu, argumen, ajakan, penegasan","Dapat berupa iklan, poster, pidato, atau kampanye"],
              socialFunction: "Mempersuasi masyarakat untuk mengambil tindakan: membeli produk, mengubah perilaku, mendukung gerakan sosial.",
              lifeBenefits: "Kemampuan mengenali teknik persuasi melindungi siswa dari manipulasi. Kemampuan memersuasi berguna dalam presentasi, negosiasi, dan advokasi.",
              distinction: "Persuasif berbeda dari narasi yang bercerita, eksposisi yang menerangkan, dan argumentasi yang sekadar meyakinkan. Persuasif berujung pada ajakan bertindak.",
            },
            contentComposition: {
              infoPoints: ["Struktur: pengenalan isu → argumen → ajakan → penegasan","Teknik persuasi: emotif, rasional, otoritas, sosial, ganjaran"],
              buildingElements: [
                "Headline/judul menarik",
                "Visual pendukung (gambar, warna, tipografi)",
                "Slogan yang mudah diingat",
                "Argumen logis atau emosional",
                "Ajakan bertindak (call to action)",
                "Identitas pembuat/pengiklan",
              ],
              mainIdeas: "Inti persuasi adalah membuat orang lain mau melakukan apa yang kita ajak secara sukarela.",
              partRelationships: "Visual menarik perhatian, headline membuat penasaran, argumen meyakinkan, ajakan menutup dengan tindakan.",
              simpleExample: "Poster 'Stop Bullying' dengan foto, headline tajam, data singkat, dan ajakan 'Jadi Teman, Bukan Pelaku'.",
            },
            textVariants: {
              types: "Berdasarkan media",
              variantDescriptions: ["Iklan cetak (banner, brosur, flyer)","Iklan audiovisual (video, radio)","Poster kampanye sosial","Iklan digital (media sosial, website)"],
              groupingBasis: "Berdasarkan media penyampaian dan target audiens.",
            },
            structurePattern: {
              generalPattern: ["Pengenalan isu: perkenalan masalah","Rangkaian argumen: fakta, data, pendapat ahli, testimoni","Pernyataan ajakan: kalimat imperatif mengajak","Penegasan kembali: penguatan pesan"],
              variationNotes: "Iklan singkat mungkin hanya memiliki headline + ajakan. Poster kampanye biasanya fokus pada satu pesan utama.",
              readingGuide: "Pertama lihat visual, baca headline, baru detail argumen — perhatikan bagaimana setiap elemen mengajakmu melakukan sesuatu.",
            },
            languageFeatures: {
              register: "Bahasa persuasif: emotif, imperatif, dan argumentatif.",
              features: [
                "Kalimat imperatif: Ayo, Mari, Yuk, Jangan",
                "Kata ajakan: ayo, mari, yuk, bersama",
                "Fakta dan data untuk memperkuat argumen",
                "Bahasa emotif untuk menyentuh perasaan",
                "Slogan pendek dan mudah diingat",
                "Pertanyaan retoris",
                "Gradasi: dari umum ke khusus",
              ],
              wordChoice: "Kata konkret, emotif, dan mudah diingat.",
              sentencePattern: "Didominasi kalimat imperatif dan persuasif.",
              conjunctions: "Konjungsi kausal: karena, sebab, oleh karena itu, maka.",
              style: "Persuasif, menggugah, dan langsung ke sasaran.",
              spelling: "EBI, dengan kebebasan tipografis untuk efek visual.",
              punctuation: "Tanda seru sering digunakan untuk penekanan ajakan.",
            },
            productionProcedure: {
              preProduction: "Tentukan tujuan persuasi, target audiens, dan pesan utama. Riset data pendukung.",
              production: "Buat headline kuat, pilih visual yang mendukung, tulis argumen singkat, buat ajakan jelas.",
              revision: "Uji pada teman: apakah pesan tersampaikan? Apakah ajakan cukup kuat?",
              editing: "Periksa fakta dan data. Pastikan tidak ada klaim menyesatkan.",
              publication: "Tempel di mading, unggah ke media sosial kelas, bagikan di grup sekolah.",
              bestPractices: "Satu poster, satu pesan. Visual 70%, teks 30%. Gunakan kontras warna untuk daya tarik.",
            },
          },
          exampleText: {
            title: "Poster: Kurangi Sampah Plastik",
            content: "HEADLINE (besar, merah): \nSETIAP TAHUN, 8 JUTA TON PLASTIK MASUK LAUT\n\nVisual: Ikan terjebak dalam kantong plastik\n\nSub-headline: \nLaut kita mencekik, dimulai dari sedotan yang kita gunakan 10 menit\n\nArgumen:\n- 1 botol plastik butuh 450 tahun untuk terurai\n- Hanya 9% sampah plastik dunia yang didaur ulang\n- Mikroplastik sudah ditemukan dalam air minum dan garam\n\nAjakan (kuning, font besar):\nMULAI DARI DIRI SENDIRI!\n✓ Bawa botol minum sendiri\n✓ Tolak sedotan plastik\n✓ Gunakan tas belanja kain\n\nPenegasan:\nBumi bukan warisan dari nenek moyang kita, melainkan titipan dari anak cucu kita.",
            analysis: {
              structure: "Lengkap: isu → argumen (3 data) → ajakan (aksi konkret) → penegasan (kutipan inspiratif).",
              content: "Data kuat dan relevan, ajakan konkret dan mudah dilakukan. Visual mendukung pesan.",
              language: "Imperatif: 'Mulai dari diri sendiri!'. Data angka menambah kredibilitas. Slogan penutup mengena.",
              strengths: "Keseimbangan data-emosi, ajakan konkret, visual kuat, pesan jelas.",
              improvements: "Dapat menambah sumber data. Ajakan bisa lebih spesifik dengan target waktu (selama 30 hari).",
            },
          },
          learningActivities: {
            opening: ["Perlihatkan 3 iklan/poster, minta siswa menebak tujuannya","Diskusi: pernah membeli sesuatu karena iklan?","Brainstorming: ciri-ciri poster yang menarik"],
            core: ["Analisis struktur poster contoh","Diskusi kelompok: teknik persuasi dalam 5 iklan berbeda","Membandingkan poster efektif dan tidak efektif","Merancang poster kampanye sosial","Presentasi dan saling memberi umpan balik"],
            group: ["Lomba desain poster kelas","Bermain peran: tim kreatif iklan vs klien"],
            individual: ["Membuat poster digital atau manual","Jurnal: analisis satu iklan di media sosial"], 
            reflection: ["Apa teknik persuasi paling efektif menurutmu?","Kapan persuasi menjadi manipulasi?"],
          },
          worksheet: {
            title: "Lembar Kerja: Analisis dan Pembuatan Poster Persuasif",
            purpose: "Melatih siswa menganalisis teknik persuasi dan membuat poster kampanye.",
            instructions: ["Analisis poster 'Kurangi Sampah Plastik' — identifikasi struktur dan teknik persuasi","Pilih satu isu sosial di lingkungan sekolah","Tulis pesan utama dan 3 argumen pendukung","Buat sketsa poster","Tulis ajakan konkret"],
            activities: "Analisis poster contoh, lalu buat poster orisinal.",
            studentOutput: "Poster digital/manual + catatan analisis.",
          },
          assessment: {
            diagnostic: ["Sebutkan 3 hal yang membuat poster menarik","Tulis slogan untuk kampanye kebersihan kelas"],
            formative: ["Observasi diskusi analisis iklan","Ceklis sketsa poster"],
            summative: ["Poster jadi + laporan analisis","Presentasi poster di depan kelas"],
          },
          rubric: {
            aspects: [
              {
                name: "Kekuatan Pesan Persuasif",
                criteria: [
                  { level: 4, description: "Pesan sangat jelas, ajakan kuat, argumen meyakinkan, etis" },
                  { level: 3, description: "Pesan jelas, ajakan cukup, argumen ada" },
                  { level: 2, description: "Pesan kurang jelas, ajakan lemah" },
                  { level: 1, description: "Tidak ada pesan persuasif yang jelas" },
                ],
              },
              {
                name: "Kesesuaian Struktur",
                criteria: [
                  { level: 4, description: "Lengkap: isu, argumen, ajakan, penegasan — urut dan koheren" },
                  { level: 3, description: "Struktur lengkap, urutan kurang logis" },
                  { level: 2, description: "Hanya 2 dari 4 struktur" },
                  { level: 1, description: "Tidak mengikuti struktur" },
                ],
              },
              {
                name: "Desain dan Visual",
                criteria: [
                  { level: 4, description: "Visual menarik, komposisi seimbang, warna kontras, tipografi jelas" },
                  { level: 3, description: "Visual cukup menarik, komposisi baik" },
                  { level: 2, description: "Visual kurang menarik, komposisi berantakan" },
                  { level: 1, description: "Tidak ada visual atau asal-asalan" },
                ],
              },
              {
                name: "Kebahasaan dan Slogan",
                criteria: [
                  { level: 4, description: "Bahasa persuasif dan santun, slogan mudah diingat, ejaan tepat" },
                  { level: 3, description: "Bahasa baik, slogan cukup, 1-2 kesalahan ejaan" },
                  { level: 2, description: "Bahasa kurang persuasif, slogan biasa" },
                  { level: 1, description: "Banyak kesalahan ejaan, tidak ada slogan" },
                ],
              },
            ],
          },
          differentiation: {
            support: ["Sediakan template poster dengan panduan isian","Berikan contoh slogan untuk dipilih","Bimbingan satu-satu merumuskan ajakan"],
            regular: ["Mendesain poster mandiri, digital atau manual","Presentasi di kelompok kecil"],
            challenge: ["Membuat rangkaian 3 poster untuk satu kampanye","Menganalisis efektivitas poster dengan survei kecil"],
          },
          remedial: ["Latihan menulis slogan dari 3 tema berbeda","Mengidentifikasi struktur dari 3 contoh poster","Membuat ulang poster dengan bimbingan"],
          enrichment: ["Menganalisis iklan di TV/media sosial dengan rubrik","Membuat video iklan layanan masyarakat 30 detik","Mengikuti lomba desain poster"],
          readingPractice: {
            title: "Latihan Membaca: Teks Persuasif",
            stimulusTitle: "Kurangi Sampah Plastik, Mulai dari Sekolah!",
            stimulusText: `Setiap hari, siswa di sekolah kita menghasilkan sampah plastik: bungkus jajan, sedotan minuman, botol air mineral, dan kemasan makanan ringan. Pernahkah kalian membayangkan ke mana semua sampah itu pergi? Sebagian besar berakhir di tempat pembuangan akhir, sebagian lagi mencemari sungai dan laut. Data Kementerian Lingkungan Hidup menunjukkan bahwa Indonesia menghasilkan 67,8 juta ton sampah pada tahun 2024, dan 15% di antaranya adalah sampah plastik.

Sampah plastik membutuhkan waktu 100 hingga 500 tahun untuk terurai secara alami. Selama itu, plastik akan terpecah menjadi mikroplastik yang mencemari tanah dan air. Mikroplastik sudah ditemukan dalam garam, air minum, dan bahkan dalam tubuh manusia. Sebuah studi dari Universitas Gadjah Mada menemukan bahwa 70% garam yang beredar di Indonesia mengandung partikel mikroplastik. Ini bukan lagi masalah lingkungan -- ini masalah kesehatan kita bersama.

Sudah saatnya kita bertindak! Sekolah kita bisa menjadi pelopor pengurangan sampah plastik. Caranya sangat mudah. Pertama, biasakan membawa botol minum sendiri dari rumah. Kedua, gunakan tempat makanan (lunchbox) untuk membawa bekal, bukan plastik sekali pakai. Ketiga, tolak sedotan plastik saat membeli minuman. Keempat, sediakan tempat sampah terpisah untuk sampah organik, anorganik, dan plastik di setiap sudut sekolah.

Bayangkan jika setiap siswa membawa satu botol minum sendiri. Dalam satu hari, kita bisa mengurangi 500 botol plastik. Dalam satu bulan, 10.000 botol. Dalam satu tahun, lebih dari 120.000 botol plastik tidak mencemari lingkungan. Angka yang luar biasa, bukan?

Mari, kita mulai hari ini! Bawa botol minum sendiri, gunakan kotak makanan, dan tolak sedotan plastik. Ajak teman-temanmu ikut serta. Jadilah generasi yang tidak hanya pintar secara akademik, tetapi juga peduli terhadap bumi. Karena bumi bukan warisan dari nenek moyang kita, melainkan titipan dari anak cucu kita.`,
            questions: [
              { id: "8-persuasif-rp-01", type: "pilihan_ganda", questionText: "Tujuan teks persuasif ini adalah...", options: ["Menghibur pembaca", "Mengajak mengurangi sampah plastik di sekolah", "Menjelaskan proses daur ulang", "Mendeskripsikan masalah sampah"], correctAnswer: "Mengajak mengurangi sampah plastik di sekolah", explanation: "Teks bertujuan memersuasi pembaca mengurangi sampah plastik.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-persuasif-rp-02", type: "pilihan_ganda", questionText: "Data yang digunakan untuk argumen adalah...", options: ["Indonesia hasilkan 67,8 juta ton sampah, 15% plastik", "Semua siswa suka jajan", "Plastik mudah didaur ulang", "Sampah plastik tidak berbahaya"], correctAnswer: "Indonesia hasilkan 67,8 juta ton sampah, 15% plastik", explanation: "Data dari Kementerian Lingkungan Hidup memperkuat argumen.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-persuasif-rp-03", type: "pilihan_ganda", questionText: "Struktur teks persuasif terdiri dari...", options: ["Pernyataan umum -- sebab-akibat -- interpretasi", "Pengenalan isu -- argumen -- ajakan -- penegasan", "Orientasi -- komplikasi -- resolusi", "Tesis -- argumen -- penegasan ulang"], correctAnswer: "Pengenalan isu -- argumen -- ajakan -- penegasan", explanation: "Struktur baku persuasif: isu, argumen, ajakan, penegasan.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-persuasif-rp-04", type: "pilihan_ganda", questionText: "Kalimat 'Mari, kita mulai hari ini!' termasuk jenis kalimat...", options: ["Deklaratif", "Imperatif", "Interogatif", "Eksklamatif"], correctAnswer: "Imperatif", explanation: "Kalimat 'Mari' adalah kalimat imperatif yang mengajak.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-persuasif-rp-05", type: "pilihan_ganda", questionText: "Paragraf keempat berisi...", options: ["Pengenalan isu", "Ajakan bertindak (call to action)", "Argumen data", "Penegasan kembali"], correctAnswer: "Ajakan bertindak (call to action)", explanation: "Paragraf keempat berisi ajakan konkret: bawa botol, gunakan lunchbox.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-persuasif-rp-06", type: "pilihan_ganda", questionText: "Data '70% garam mengandung mikroplastik' dari...", options: ["Kemenkes", "UGM", "KemenLHK", "WHO"], correctAnswer: "UGM", explanation: "Studi UGM menemukan 70% garam mengandung mikroplastik.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-persuasif-rp-07", type: "pilihan_ganda", questionText: "Kalimat 'Bayangkan jika setiap siswa membawa satu botol' adalah teknik persuasi...", options: ["Emosional", "Rasional dengan data", "Otoritas", "Ganjaran"], correctAnswer: "Emosional", explanation: "Kalimat 'bayangkan' mengajak pembaca membayangkan dampak positif.", skillTarget: "identifikasi kebahasaan", difficulty: "menantang" },
              { id: "8-persuasif-rp-08", type: "pilihan_ganda", questionText: "Slogan yang terdapat dalam teks ini adalah...", options: ["Bumi bukan warisan, melainkan titipan", "Sekolahku bersih", "Indonesia bebas plastik", "Sampah adalah berkah"], correctAnswer: "Bumi bukan warisan, melainkan titipan", explanation: "Kalimat penutup adalah slogan yang mudah diingat.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-persuasif-rp-09", type: "pilihan_ganda", questionText: "Teknik persuasi yang digunakan penulis adalah...", options: ["Hanya data statistik", "Data ilmiah + ajakan emosional + ajakan konkret", "Hanya ajakan", "Hanya ancaman"], correctAnswer: "Data ilmiah + ajakan emosional + ajakan konkret", explanation: "Kombinasi data (KLHK, UGM), emosi (bayangkan), dan aksi (bawa botol).", skillTarget: "analisis struktur", difficulty: "menantang" },
              { id: "8-persuasif-rp-10", type: "pilihan_ganda", questionText: "Target audiens teks ini adalah...", options: ["Pejabat pemerintah", "Siswa sekolah", "Pedagang plastik", "Pabrik makanan"], correctAnswer: "Siswa sekolah", explanation: "Teks menyasar siswa dengan ajakan aksi di lingkungan sekolah.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-persuasif-rp-11", type: "jawaban_singkat", questionText: "Sebutkan tiga ajakan konkret dalam teks ini!", correctAnswer: "(1) Bawa botol minum, (2) Gunakan lunchbox, (3) Tolak sedotan plastik", explanation: "Empat ajakan: botol, lunchbox, tolak sedotan, sediakan tempat sampah.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-persuasif-rp-12", type: "jawaban_singkat", questionText: "Mengapa sampah plastik berbahaya bagi kesehatan?", correctAnswer: "Karena mikroplastik sudah mencemari garam, air minum, dan ditemukan dalam tubuh manusia", explanation: "Plastik terurai jadi mikroplastik yang masuk rantai makanan.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-persuasif-rp-13", type: "uraian", questionText: "Analisislah teknik persuasi yang digunakan penulis! Apakah teks ini etis dan tidak manipulatif?", correctAnswer: ["Teknik persuasi: data statistik (KLHK, UGM) rasional, 'bayangkan' emosional, ajakan konkret, slogan penutup. Teks etis karena: (1) data dari sumber kredibel, (2) tidak menakut-nakuti berlebihan, (3) ajakan realistis dan mudah dilakukan. Tidak manipulatif karena tidak memelintir fakta."], explanation: "Persuasi etis menggunakan data benar dan ajakan realistis.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-persuasif-rp-14", type: "uraian", questionText: "Buatlah sebuah poster persuasif tentang 'Kebersihan Toilet Sekolah'! Tuliskan headline, 2 argumen, dan ajakan konkret!", correctAnswer: ["Headline: TOILET BERSIH, BELAJAR NYAMAN! Argumen 1: Toilet kotor sumber penyakit (diare, cacingan). Argumen 2: 80% siswa mengaku malas ke toilet kotor. Ajakan: (1) Siram setelah pakai, (2) Buang sampah di tempatnya, (3) Laporkan kerusakan!"], explanation: "Poster harus punya headline kuat, argumen, dan ajakan jelas.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Teks Persuasif",
            questions: [
              { id: "8-persuasif-qq-01", type: "pilihan_ganda", questionText: "Tujuan teks persuasif adalah...", options: ["Menghibur", "Memengaruhi pembaca melakukan sesuatu", "Menjelaskan proses", "Menggambarkan objek"], correctAnswer: "Memengaruhi pembaca melakukan sesuatu", explanation: "Persuasif bertujuan membujuk atau mengajak.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-persuasif-qq-02", type: "pilihan_ganda", questionText: "Struktur teks persuasif...", options: ["Tesis -- argumen -- penegasan", "Isu -- argumen -- ajakan -- penegasan", "Orientasi -- komplikasi -- resolusi", "Identifikasi -- klasifikasi"], correctAnswer: "Isu -- argumen -- ajakan -- penegasan", explanation: "Struktur baku persuasif.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-persuasif-qq-03", type: "pilihan_ganda", questionText: "Ciri kebahasaan teks persuasif adalah banyak menggunakan kalimat...", options: ["Deklaratif", "Imperatif (ajakan)", "Interogatif", "Eksklamatif"], correctAnswer: "Imperatif (ajakan)", explanation: "Kalimat imperatif seperti 'ayo', 'mari', 'jangan' dominan.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-persuasif-qq-04", type: "pilihan_ganda", questionText: "Contoh slogan yang persuasif...", options: ["Membaca itu baik", "Buku adalah jendela dunia -- baca, kau akan tahu!", "Saya suka buku", "Buku itu tebal"], correctAnswer: "Buku adalah jendela dunia -- baca, kau akan tahu!", explanation: "Slogan persuasif pendek, mudah diingat, ada ajakan.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-persuasif-qq-05", type: "pilihan_ganda", questionText: "Perbedaan persuasif dan eksposisi...", options: ["Persuasif mengajak bertindak, eksposisi meyakinkan argumen", "Tidak ada beda", "Eksposisi lebih pendek", "Persuasif tidak pakai data"], correctAnswer: "Persuasif mengajak bertindak, eksposisi meyakinkan argumen", explanation: "Persuasif berujung ajakan, eksposisi berujung keyakinan.", skillTarget: "evaluasi", difficulty: "menantang" },
              { id: "8-persuasif-qq-06", type: "pilihan_ganda", questionText: "Teknik persuasi yang menggunakan data disebut...", options: ["Emosional", "Rasional", "Otoritas", "Ganjaran"], correctAnswer: "Rasional", explanation: "Data dan fakta masuk teknik rasional/logis.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-persuasif-qq-07", type: "pilihan_ganda", questionText: "Iklan termasuk teks...", options: ["Narasi", "Persuasif", "Eksplanasi", "Deskripsi"], correctAnswer: "Persuasif", explanation: "Iklan bertujuan membujuk konsumen membeli produk.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-persuasif-qq-08", type: "pilihan_ganda", questionText: "Elemen penting poster persuasif...", options: ["Paragraf panjang", "Visual + teks singkat + ajakan", "Hanya tulisan", "Hanya gambar"], correctAnswer: "Visual + teks singkat + ajakan", explanation: "Poster efektif: visual kuat, teks minimal, ajakan jelas.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-persuasif-qq-09", type: "pilihan_ganda", questionText: "Kalimat yang termasuk ajakan (call to action)...", options: ["Harga naik tahun ini", "Ayo, tanam satu pohon hari ini!", "Pohon itu tinggi", "Saya menanam pohon"], correctAnswer: "Ayo, tanam satu pohon hari ini!", explanation: "'Ayo' adalah ajakan langsung untuk bertindak.", skillTarget: "identifikasi kebahasaan", difficulty: "mudah" },
              { id: "8-persuasif-qq-10", type: "pilihan_ganda", questionText: "Persuasi dikatakan tidak etis jika...", options: ["Menggunakan data akurat", "Memelintir fakta", "Mengajak kebaikan", "Mencantumkan sumber"], correctAnswer: "Memelintir fakta", explanation: "Persuasi tidak etis jika menggunakan data palsu atau menyesatkan.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-persuasif-qq-11", type: "jawaban_singkat", questionText: "Sebutkan tiga teknik persuasi!", correctAnswer: "Rasional (data), emosional (perasaan), otoritas (ahli)", explanation: "Teknik persuasi meliputi rasional, emosional, otoritas, sosial, ganjaran.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-persuasif-qq-12", type: "jawaban_singkat", questionText: "Apa yang dimaksud call to action?", correctAnswer: "Ajakan kepada pembaca untuk melakukan sesuatu yang konkret", explanation: "Call to action adalah ajakan bertindak dalam teks persuasif.", skillTarget: "pemahaman isi", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Kumpulkan poster dari lingkungan sekitar untuk bahan analisis","Diskusikan etika persuasi: kapan iklan menjadi menyesatkan","Gunakan aplikasi desain gratis Canva untuk praktik"],
            commonMisconceptions: [
              { misconception: "Semua iklan adalah kebohongan.", correction: "Iklan yang etis menyampaikan manfaat produk secara jujur." },
              { misconception: "Poster harus penuh teks.", correction: "Poster efektif minimalis: satu pesan, visual kuat, teks terbatas." },
            ],
            feedbackGuide: ["Fokus pada kejelasan pesan dan ketepatan sasaran","Tandai penggunaan data yang tidak valid","Apresiasi kreativitas visual"],
            classroomManagement: ["Sediakan kertas karton dan spidol warna","Gunakan sesi 'gallery walk' untuk memajang dan mengapresiasi poster","Atur jadwal presentasi 3 menit per siswa"],
          },
          reflection: {
            studentQuestions: ["Apa teknik persuasi paling efektif yang kupelajari?","Poster mana yang paling berkesan dan mengapa?"],
            teacherQuestions: ["Apakah siswa mampu membedakan persuasi etis dan manipulatif?","Apakah siswa menunjukkan kreativitas dalam desain?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Teks Persuasif dalam Iklan dan Poster. Materi mencakup: pengertian teks persuasif, struktur (pengenalan isu, argumen, ajakan, penegasan), teknik persuasi verbal dan visual, ciri kebahasaan, dan cara membuat poster kampanye sosial. Sertakan contoh poster kampanye sosial. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["persuasif","iklan","poster","ajakan","slogan","desain","kampanye","etika persuasi","fakta","opini"],
          isReady: true,
        },
        {
          id: "viii-literasi-ii",
          slug: "giat-literasi-nonfiksi",
          grade: "VIII",
          phase: "D",
          semester: 2,
          chapterNumber: 9,
          title: "Bab 9: Giat Literasi II — Teks Nonfiksi (Pengaya)",
          shortTitle: "Literasi Nonfiksi",
          kd: "Berbicara dan Mempresentasikan",
          emoji: "📚",
          description: "Membaca, memahami, dan merespons teks nonfiksi populer: artikel, biografi, esai pendek, dan teks prosedural sebagai pengaya literasi.",
          overview: "Literasi bukan hanya tentang membaca novel. Di dunia nyata, sebagian besar bacaan kita adalah nonfiksi: artikel berita, posting blog, biografi tokoh, esai pendek, dan petunjuk prosedural. Bab ini melatih siswa membaca kritis teks nonfiksi populer, membedakan fakta dari opini, mengidentifikasi sudut pandang penulis, dan menyusun respons kritis secara lisan maupun tulisan. Keterampilan ini esensial untuk sukses di sekolah dan kehidupan.",
          learningGoals: [
            "Memahami perbedaan teks fiksi dan nonfiksi", 
            "Mengidentifikasi fakta, opini, dan sudut pandang penulis dalam teks nonfiksi",
            "Menganalisis struktur artikel populer dan biografi",
            "Menyusun ringkasan dan respons kritis terhadap teks nonfiksi",
            "Mempresentasikan pemahaman secara lisan",
          ],
          keywords: ["nonfiksi","artikel","biografi","fakta","opini","sudut pandang","ringkasan","respons kritis","esai","literasi"],
          suggestedDuration: "8 JP x 40 menit",
          teachingContent: {
            textNature: {
              definition: "Teks nonfiksi adalah teks yang berisi informasi faktual, data nyata, dan peristiwa sungguhan yang disusun secara informatif dan argumentatif.",
              characteristics: ["Berdasarkan fakta dan data nyata","Tujuan informatif atau argumentatif","Struktur sesuai jenis: artikel, biografi, esai","Penulis bertanggung jawab atas kebenaran informasi","Dapat mengandung opini yang didukung fakta"],
              socialFunction: "Memberikan informasi akurat, menyampaikan gagasan, mendokumentasikan peristiwa, dan memengaruhi opini publik.",
              lifeBenefits: "Kemampuan membaca kritis nonfiksi melindungi dari misinformasi dan membantu pengambilan keputusan berdasarkan informasi yang benar.",
              distinction: "Nonfiksi berbeda dari fiksi yang berdasarkan imajinasi. Nonfiksi populer (artikel, esai) berbeda dari nonfiksi ilmiah (jurnal, skripsi) dari segi bahasa dan kedalaman.",
            },
            contentComposition: {
              infoPoints: ["Jenis nonfiksi populer: artikel, biografi, esai pendek, teks prosedural","Fakta vs opini: fakta bisa diverifikasi, opini adalah pendapat pribadi"],
              buildingElements: [
                "Judul yang menarik dan informatif",
                "Lead/pembuka yang memikat",
                "Isi dengan fakta, data, dan argumen",
                "Kesimpulan atau penutup",
                "Sumber informasi (jika ada)",
              ],
              mainIdeas: "Inti nonfiksi adalah penyampaian informasi faktual secara jelas, menarik, dan bertanggung jawab.",
              partRelationships: "Lead menarik minat, isi menyampaikan informasi, penutup mengikat pesan.",
              simpleExample: "Artikel 'Manfaat Membaca 20 Menit Sehari' — lead, data penelitian, tips, kesimpulan.",
            },
            textVariants: {
              types: "Jenis teks nonfiksi populer",
              variantDescriptions: ["Artikel populer (majalah, blog)","Biografi dan autobiografi","Esai pendek","Teks prosedural dan panduan"],
              groupingBasis: "Berdasarkan tujuan dan struktur.",
            },
            structurePattern: {
              generalPattern: ["Judul informatif","Lead: paragraf pembuka menarik","Isi: fakta, argumen, atau tahapan","Penutup: kesimpulan atau ajakan"],
              variationNotes: "Artikel populer fleksibel, biografi kronologis, esai lebih reflektif.",
              readingGuide: "Baca judul dan lead dulu, lalu baca sekilas sub-heading untuk struktur, baru baca detail.",
            },
            languageFeatures: {
              register: "Bahasa jurnalistik atau populer: informatif namun ringan.",
              features: ["Fakta dan data akurat","Kata denotatif untuk informasi","Kalimat efektif dan informatif","Istilah teknis sesuai topik","Opini didukung bukti"],
              wordChoice: "Kata informatif, tidak ambigu.",
              sentencePattern: "Kalimat deklaratif dominan.",
              conjunctions: "Konjungsi kausal, temporal, dan aditif.",
              style: "Informatif, lugas, kadang argumentatif.",
              spelling: "EBI, konsisten.",
              punctuation: "Baku, sesuai EBI.",
            },
            productionProcedure: {
              preProduction: "Tentukan topik, riset dari sumber terpercaya, kumpulkan data dan fakta.",
              production: "Tulis lead menarik, susun isi dengan fakta dan argumen, tutup dengan kesimpulan.",
              revision: "Fakta sudah benar? Sumber disebutkan? Bahasa mudah dipahami?",
              editing: "Periksa ejaan, data, konsistensi istilah.",
              publication: "Mading, blog pribadi, majalah sekolah.",
              bestPractices: "Satu paragraf satu ide. Gunakan sub-heading. Cantumkan sumber.",
            },
          },
          exampleText: {
            title: "Biografi Singkat: Bu Sinta, Pustakawan Desa yang Mengubah Kampung",
            content: "Bu Sinta, 47 tahun, adalah pustakawan Desa Sukamaju. Berawal dari 50 buku sumbangan di teras rumahnya, kini ia mengelola perpustakaan desa dengan 3.000 koleksi. \n\nAwalnya, anak-anak desa lebih suka bermain ponsel. Bu Sinta tidak menyerah. Ia mengadakan lomba baca puisi, story telling, dan hadiah buku untuk peminjam terbanyak. Perlahan, perpustakaan mulai ramai.\n\n'Kuncinya bukan koleksi lengkap, tapi membuat anak merasa senang datang ke sini,' ujar Bu Sinta.\n\nKini, tingkat kunjungan mencapai 50 anak per hari. Tiga alumninya berhasil jadi juara lomba literasi tingkat provinsi. Bu Sinta membuktikan bahwa satu orang bisa mengubah kampung, dimulai dengan segelas teh dan sebuah buku.\n\nSumber: Wawancara langsung, Desember 2025.",
            analysis: {
              structure: "Lead perkenalan tokoh, isi kisah perjuangan, kutipan langsung, penutup inspiratif.",
              content: "Inspiratif, data konkret (50 buku → 3000 buku, 50 anak/hari), pesan motivasi kuat.",
              language: "Ringan dan populer, mudah dipahami remaja. Kutipan langsung memberi otentisitas.",
              strengths: "Narasi mengalir, data spesifik, pesan universal, inspiratif tanpa menggurui.",
              improvements: "Dapat menambah konflik yang dihadapi lebih detail. Bisa ditambah data perbandingan sebelum-sesudah.",
            },
          },
          learningActivities: {
            opening: ["Tanya siswa: artikel/blog apa yang pernah dibaca minggu ini?","Perlihatkan artikel menarik dari media remaja","Diskusi: apa bedanya berita dengan cerpen?"],
            core: ["Membaca artikel populer dan mengidentifikasi fakta/opini","Analisis struktur biografi singkat","Menulis ringkasan artikel","Respons kritis: setuju/tidak setuju dengan penulis?","Presentasi analisis"],
            group: ["Membandingkan 2 artikel topik sama dari sumber berbeda","Debat: apakah media sosial membuat kita pintar atau bodoh?"],
            individual: ["Membaca artikel pilihan dan membuat peta pikiran","Menulis esai pendek 300 kata"],
            reflection: ["Bagaimana cara membedakan berita asli dan hoaks?","Apakah aku sudah menjadi pembaca kritis?"],
          },
          worksheet: {
            title: "Lembar Kerja: Membaca Kritis Teks Nonfiksi",
            purpose: "Melatih kemampuan membaca kritis dan merespons teks nonfiksi.",
            instructions: ["Baca biografi Bu Sinta dengan saksama","Identifikasi 3 fakta dan 2 opini","Apa pesan utama teks?","Tulis ringkasan 3 kalimat","Tulis respons kritis: apa yang bisa dipelajari dari Bu Sinta?"],
            activities: "Membaca, menganalisis, merespons teks nonfiksi.",
            studentOutput: "Ringkasan + respons kritis.",
          },
          assessment: {
            diagnostic: ["Sebutkan 3 jenis teks nonfiksi","Apa perbedaan utama fakta dan opini?"],
            formative: ["Ceklis hasil analisis fakta/opini","Observasi diskusi dan presentasi"],
            summative: ["Laporan analisis artikel/artikel pilihan","Presentasi lisan 3 menit"],
          },
          rubric: {
            aspects: [
              {
                name: "Pemahaman Isi",
                criteria: [
                  { level: 4, description: "Pemahaman sangat mendalam, mampu mengidentifikasi pesan implisit" },
                  { level: 3, description: "Pemahaman baik, mampu menyebut ide pokok" },
                  { level: 2, description: "Pemahaman cukup, hanya hafal detail" },
                  { level: 1, description: "Tidak memahami isi teks" },
                ],
              },
              {
                name: "Analisis Fakta dan Opini",
                criteria: [
                  { level: 4, description: "Tepat membedakan fakta/opini, mampu menjelaskan dasar pembedaan" },
                  { level: 3, description: "Membedakan fakta/opini dengan benar" },
                  { level: 2, description: "Kurang tepat membedakan fakta/opini" },
                  { level: 1, description: "Tidak bisa membedakan" },
                ],
              },
              {
                name: "Kualitas Respons Kritis",
                criteria: [
                  { level: 4, description: "Respons kritis, argumentatif, didukung bukti dari teks" },
                  { level: 3, description: "Ada respons kritis, argumen cukup" },
                  { level: 2, description: "Respons deskriptif tanpa analisis" },
                  { level: 1, description: "Tidak ada respons atau hanya 'suka/tidak suka'" },
                ],
              },
              {
                name: "Kebahasaan dan Penyajian",
                criteria: [
                  { level: 4, description: "Bahasa efektif, ejaan tepat, penyajian rapi" },
                  { level: 3, description: "Bahasa baik, 1-2 kesalahan" },
                  { level: 2, description: "Beberapa kesalahan" },
                  { level: 1, description: "Banyak kesalahan" },
                ],
              },
            ],
          },
          differentiation: {
            support: ["Sediakan artikel dengan kosakata lebih sederhana","Bimbingan membaca bersama","Template analisis fakta/opini"],
            regular: ["Artikel populer standar","Analisis dan respons mandiri"],
            challenge: ["Artikel jurnalistik atau esai lebih kompleks","Membandingkan 3 sumber berita topik sama"],
          },
          remedial: ["Latihan membedakan kalimat fakta dan opini dari contoh","Membaca ulang dengan panduan guru"],
          enrichment: ["Menulis artikel untuk majalah sekolah","Membuat blog review buku nonfiksi"],
          readingPractice: {
            title: "Latihan Membaca: Teks Nonfiksi",
            stimulusTitle: "Biografi Singkat: Bu Sinta, Pustakawan Desa yang Mengubah Kampung",
            stimulusText: `Bu Sinta, 47 tahun, adalah pustakawan Desa Sukamaju, sebuah desa kecil di lereng Gunung Sindoro. Berawal dari 50 buku sumbangan di teras rumahnya, kini ia mengelola perpustakaan desa dengan 3.000 koleksi yang melayani lebih dari 200 anggota aktif.

Awalnya, minat baca di desa itu sangat rendah. Anak-anak lebih suka bermain ponsel daripada membaca. Orang tua sibuk bekerja dan tidak terbiasa membacakan buku untuk anak-anak mereka. Bu Sinta tidak menyerah. Ia mengadakan berbagai program: lomba baca puisi setiap bulan, story telling dengan boneka, dan hadiah buku untuk peminjam terbanyak setiap pekan. Perlahan tapi pasti, perpustakaan mulai ramai dikunjungi.

"Kuncinya bukan koleksi lengkap, tapi membuat anak-anak merasa senang datang ke sini. Kalau mereka sudah nyaman, minat baca akan tumbuh dengan sendirinya," ujar Bu Sinta dengan senyum khasnya. Program-program inovatif Bu Sinta menarik perhatian Dinas Pendidikan setempat. Mereka memberikan bantuan tambahan 500 buku dan dua rak baru. Seiring waktu, perpustakaan Bu Sinta menjadi pusat kegiatan anak-anak di desa -- bukan hanya membaca, tetapi juga belajar kelompok, diskusi, dan bermain sambil belajar.

Kini, tingkat kunjungan mencapai 50 anak per hari. Tiga alumninya berhasil menjadi juara lomba literasi tingkat provinsi. Seorang alumninya bahkan diterima di sekolah favorit berkat kemampuannya membaca dan menulis yang baik. Bu Sinta membuktikan bahwa satu orang bisa mengubah kampung, dimulai dari segelas teh dan sebuah buku di teras rumahnya. Ia juga aktif melatih ibu-ibu desa untuk menjadi pendamping literasi di rumah masing-masing.

Namun perjuangan belum selesai. Bu Sinta kini bermimpi memiliki perpustakaan keliling untuk menjangkau desa-desa tetangga yang belum memiliki akses buku. "Kalau bukan kita yang memulai, siapa lagi?" katanya mantap.

Sumber: Wawancara langsung, Desember 2025.`,
            questions: [
              { id: "8-nonfiksi-rp-01", type: "pilihan_ganda", questionText: "Teks ini termasuk jenis nonfiksi...", options: ["Artikel populer", "Biografi", "Esai", "Teks prosedural"], correctAnswer: "Biografi", explanation: "Teks menceritakan perjalanan hidup Bu Sinta secara faktual.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-02", type: "pilihan_ganda", questionText: "Profesi Bu Sinta adalah...", options: ["Guru", "Pustakawan desa", "Kepala desa", "Pedagang buku"], correctAnswer: "Pustakawan desa", explanation: "Teks menyebut Bu Sinta adalah pustakawan Desa Sukamaju.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-03", type: "pilihan_ganda", questionText: "Awal mula berdirinya perpustakaan adalah...", options: ["Gedung baru dari pemerintah", "50 buku sumbangan di teras rumah", "Hibah dari perusahaan", "Warisan orang tua"], correctAnswer: "50 buku sumbangan di teras rumah", explanation: "Perpustakaan berawal dari 50 buku sumbangan di teras rumah Bu Sinta.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-04", type: "pilihan_ganda", questionText: "Tantangan awal yang dihadapi Bu Sinta adalah...", options: ["Koleksi buku terlalu banyak", "Minat baca rendah, anak-anak lebih suka ponsel", "Gedung perpustakaan terlalu besar", "Banyak pengunjung tapi buku kurang"], correctAnswer: "Minat baca rendah, anak-anak lebih suka ponsel", explanation: "Awalnya anak-anak lebih suka ponsel, minat baca rendah.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-05", type: "pilihan_ganda", questionText: "Program yang dibuat Bu Sinta untuk menarik minat baca...", options: ["Lomba olahraga", "Lomba baca puisi, story telling, hadiah buku", "Bimbel gratis", "Les komputer"], correctAnswer: "Lomba baca puisi, story telling, hadiah buku", explanation: "Bu Sinta mengadakan lomba baca puisi, story telling, dan hadiah buku.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-nonfiksi-rp-06", type: "pilihan_ganda", questionText: "Prestasi alumni perpustakaan Bu Sinta adalah...", options: ["Menjadi guru", "Juara lomba literasi tingkat provinsi", "Menjadi pustakawan", "Bekerja di penerbit"], correctAnswer: "Juara lomba literasi tingkat provinsi", explanation: "Tiga alumninya juara lomba literasi tingkat provinsi.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-nonfiksi-rp-07", type: "pilihan_ganda", questionText: "Kutipan 'Kuncinya bukan koleksi lengkap, tapi membuat anak-anak merasa senang' termasuk...", options: ["Fakta", "Opini", "Data", "Kesimpulan"], correctAnswer: "Opini", explanation: "Ini adalah pendapat/pandangan pribadi Bu Sinta, bukan fakta yang bisa diverifikasi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-nonfiksi-rp-08", type: "pilihan_ganda", questionText: "Yang merupakan fakta dalam teks adalah...", options: ["Bu Sinta adalah pahlawan literasi", "Kunjungan mencapai 50 anak per hari", "Anak-anak pasti suka perpustakaan", "Perpustakaan adalah masa depan desa"], correctAnswer: "Kunjungan mencapai 50 anak per hari", explanation: "Data kunjungan adalah fakta yang bisa diverifikasi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-nonfiksi-rp-09", type: "pilihan_ganda", questionText: "Teks nonfiksi berbeda dari fiksi karena...", options: ["Berdasarkan imajinasi", "Berdasarkan fakta dan data nyata", "Lebih panjang", "Tidak punya tokoh"], correctAnswer: "Berdasarkan fakta dan data nyata", explanation: "Nonfiksi berdasarkan fakta, fiksi berdasarkan imajinasi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-10", type: "pilihan_ganda", questionText: "Mimpi Bu Sinta selanjutnya adalah...", options: ["Pensiun", "Memiliki perpustakaan keliling untuk desa tetangga", "Menjual buku", "Pindah ke kota"], correctAnswer: "Memiliki perpustakaan keliling untuk desa tetangga", explanation: "Bu Sinta bermimpi memiliki perpustakaan keliling untuk desa-desa tetangga.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-11", type: "jawaban_singkat", questionText: "Awalnya berapa jumlah buku koleksi Bu Sinta?", correctAnswer: "50 buku sumbangan di teras rumah", explanation: "Teks menyebut 'berawal dari 50 buku sumbangan di teras rumahnya'.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-12", type: "jawaban_singkat", questionText: "Berapa jumlah koleksi perpustakaan Bu Sinta sekarang?", correctAnswer: "3.000 koleksi", explanation: "Kini perpustakaan memiliki 3.000 koleksi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-rp-13", type: "jawaban_singkat", questionText: "Apa pesan inspiratif dari teks biografi ini?", correctAnswer: "Satu orang bisa mengubah kampung dimulai dari langkah kecil", explanation: "Bu Sinta membuktikan seseorang bisa membawa perubahan besar.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-nonfiksi-rp-14", type: "uraian", questionText: "Identifikasi 3 fakta dan 2 opini dari teks di atas! Jelaskan mengapa kamu mengelompokkannya demikian!", correctAnswer: ["Fakta: (1) Bu Sinta 47 tahun, (2) Koleksi 3.000 buku, (3) Kunjungan 50 anak/hari -- bisa diverifikasi. Opini: (1) 'Kuncinya membuat anak senang' -- pendapat pribadi, (2) 'Kalau bukan kita yang memulai, siapa lagi?' -- pandangan subjektif."], explanation: "Fakta dapat diverifikasi, opini adalah pandangan pribadi.", skillTarget: "analisis struktur", difficulty: "menantang" },
              { id: "8-nonfiksi-rp-15", type: "uraian", questionText: "Tulislah respons kritis: apa yang bisa dipelajari dari kisah Bu Sinta? Setujukah kamu bahwa satu orang bisa mengubah kampung? Jelaskan!", correctAnswer: ["Dari Bu Sinta: kegigihan, kreativitas, dan kepedulian sosial. Ia tidak menunggu bantuan pemerintah tetapi memulai dari yang ada. Saya setuju satu orang bisa mengubah kampung -- perubahan besar dimulai dari langkah kecil dan konsisten. Contoh: Bu Sinta memulai dari 50 buku di teras. Namun perubahan juga perlu dukungan lingkungan."], explanation: "Respons kritis harus argumentatif dan didukung bukti dari teks.", skillTarget: "evaluasi", difficulty: "menantang" },
            ]
          },
          quickQuiz: {
            title: "Kuis Cepat: Teks Nonfiksi",
            questions: [
              { id: "8-nonfiksi-qq-01", type: "pilihan_ganda", questionText: "Teks nonfiksi adalah teks yang berisi...", options: ["Cerita imajinatif", "Informasi faktual dan data nyata", "Dongeng", "Puisi dan pantun"], correctAnswer: "Informasi faktual dan data nyata", explanation: "Nonfiksi berdasarkan fakta, bukan imajinasi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-qq-02", type: "pilihan_ganda", questionText: "Contoh teks nonfiksi populer adalah...", options: ["Novel", "Artikel, biografi, esai", "Cerpen", "Drama"], correctAnswer: "Artikel, biografi, esai", explanation: "Nonfiksi populer: artikel, biografi, esai pendek.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-qq-03", type: "pilihan_ganda", questionText: "Perbedaan utama fiksi dan nonfiksi...", options: ["Fiksi imajinasi, nonfiksi fakta", "Fiksi lebih panjang", "Nonfiksi lebih menarik", "Tidak ada beda"], correctAnswer: "Fiksi imajinasi, nonfiksi fakta", explanation: "Fiksi berdasarkan imajinasi, nonfiksi berdasarkan kenyataan.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-qq-04", type: "pilihan_ganda", questionText: "Fakta yang dapat diverifikasi adalah...", options: ["Saya rasa", "Menurut data BPS", "Barangkali", "Mungkin benar"], correctAnswer: "Menurut data BPS", explanation: "Data BPS adalah sumber terpercaya yang bisa diverifikasi.", skillTarget: "analisis struktur", difficulty: "sedang" },
              { id: "8-nonfiksi-qq-05", type: "pilihan_ganda", questionText: "Opini adalah...", options: ["Pendapat pribadi yang belum tentu benar", "Data statistik", "Hasil penelitian", "Informasi dari buku"], correctAnswer: "Pendapat pribadi yang belum tentu benar", explanation: "Opini bersifat subjektif dan tidak bisa diverifikasi.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-qq-06", type: "pilihan_ganda", questionText: "Ciri bahasa artikel populer adalah...", options: ["Formal kaku", "Informatif namun ringan dan komunikatif", "Berima", "Berbentuk dialog"], correctAnswer: "Informatif namun ringan dan komunikatif", explanation: "Nonfiksi populer menggunakan bahasa yang ringan dan mudah dipahami.", skillTarget: "identifikasi kebahasaan", difficulty: "sedang" },
              { id: "8-nonfiksi-qq-07", type: "pilihan_ganda", questionText: "Bagian yang berisi ringkasan dari teks nonfiksi disebut...", options: ["Resensi", "Ringkasan", "Sinopsis", "Kesimpulan"], correctAnswer: "Ringkasan", explanation: "Ringkasan menyajikan inti teks secara singkat.", skillTarget: "pemahaman isi", difficulty: "sedang" },
              { id: "8-nonfiksi-qq-08", type: "pilihan_ganda", questionText: "Respons kritis terhadap teks nonfiksi berarti...", options: ["Setuju saja", "Menganalisis dan memberi tanggapan argumentatif", "Menghafal isi", "Membaca ulang"], correctAnswer: "Menganalisis dan memberi tanggapan argumentatif", explanation: "Respons kritis bersifat analitis dan argumentatif.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-nonfiksi-qq-09", type: "pilihan_ganda", questionText: "Biografi adalah teks nonfiksi yang berisi...", options: ["Cerita fiksi tokoh", "Riwayat hidup seseorang yang ditulis orang lain", "Biografi hewan", "Petunjuk melakukan sesuatu"], correctAnswer: "Riwayat hidup seseorang yang ditulis orang lain", explanation: "Biografi adalah kisah hidup seseorang yang ditulis oleh orang lain.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-qq-10", type: "pilihan_ganda", questionText: "Literasi media penting untuk...", options: ["Membedakan berita asli dan hoaks", "Menonton film", "Bermain game", "Menulis puisi"], correctAnswer: "Membedakan berita asli dan hoaks", explanation: "Literasi media melatih kemampuan memverifikasi informasi.", skillTarget: "evaluasi", difficulty: "sedang" },
              { id: "8-nonfiksi-qq-11", type: "jawaban_singkat", questionText: "Sebutkan tiga jenis teks nonfiksi populer!", correctAnswer: "Artikel, biografi, esai", explanation: "Nonfiksi populer meliputi artikel, biografi, dan esai.", skillTarget: "pemahaman isi", difficulty: "mudah" },
              { id: "8-nonfiksi-qq-12", type: "jawaban_singkat", questionText: "Apa yang dimaksud membaca kritis?", correctAnswer: "Membaca dengan menganalisis fakta, opini, dan sudut pandang penulis", explanation: "Membaca kritis berarti tidak menerima informasi mentah-mentah.", skillTarget: "evaluasi", difficulty: "sedang" },
            ]
          },
          teacherNotes: {
            teachingStrategies: ["Gunakan artikel terkini yang relevan dengan siswa","Ajarkan teknik membaca scanning dan skimming","Selipkan latihan literasi media setiap pekan"],
            commonMisconceptions: [
              { misconception: "Nonfiksi selalu membosankan.", correction: "Nonfiksi populer ditulis dengan gaya menarik dan ringan." },
              { misconception: "Semua data di artikel adalah benar.", correction: "Pembaca harus kritis — cek sumber data." },
            ],
            feedbackGuide: ["Apresiasi ketika siswa menemukan sudut pandang penulis","Dorong siswa mempertanyakan data dan sumber"],
            classroomManagement: ["Sediakan kliping artikel untuk bahan bacaan","Jadwalkan 'Kamis Literasi' dengan artikel terkini"],
          },
          reflection: {
            studentQuestions: ["Artikel apa yang paling menarik?","Bagaimana cara menjadi pembaca yang kritis?"],
            teacherQuestions: ["Apakah siswa menunjukkan kemajuan dalam membaca kritis?","Apakah siswa mampu mengidentifikasi bias penulis?"],
          },
          aiContextPrompt: "Kamu adalah asisten guru Bahasa Indonesia untuk kelas VIII SMP. Buatlah RPP atau materi ajar tentang Literasi Nonfiksi (Giat Literasi II). Materi mencakup: pengertian teks nonfiksi, perbedaan dengan fiksi, jenis nonfiksi populer (artikel, biografi, esai), cara membaca kritis, membedakan fakta dan opini, dan menulis respons kritis. Sertakan contoh artikel populer atau biografi. Buat 10 soal pilihan ganda dan 5 soal uraian. Cantumkan rubrik 4 level.",
          sourceBasis: "founder-smp-list",
          reviewStatus: "ready",
          tags: ["nonfiksi","artikel","biografi","fakta","opini","membaca kritis","ringkasan","respons kritis","literasi","informasi"],
          isReady: true,
        },
      ],
    },
  ],
}
