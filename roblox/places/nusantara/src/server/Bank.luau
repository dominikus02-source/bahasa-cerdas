local function Q(id, tier, truth, statement, explanation, card)
	return {
		Id = id,
		Tier = tier,
		Truth = truth,
		Statement = statement,
		Explanation = explanation,
		Card = card,
	}
end

return {
	Jawa = {
		Q(
			"nj_01",
			1,
			true,
			"Bahasa Jawa adalah bahasa daerah yang sah dipakai di komunitasnya.",
			"Bahasa daerah bukan kesalahan. Ia hidup di rumah dan di komunitas.",
			{
				Id = "c_nj_01",
				Word = "bahasa daerah",
				Definition = "Bahasa yang dipakai komunitas setempat, bukan lawan bahasa Indonesia.",
			}
		),
		Q(
			"nj_02",
			1,
			false,
			"Semua percakapan di rumah wajib memakai bahasa Indonesia baku.",
			"Di rumah, bahasa daerah atau ragam santai tetap sah.",
			nil
		),
		Q(
			"nj_03",
			1,
			true,
			"Di tulisan resmi sekolah, kita memakai kaidah bahasa Indonesia.",
			"Ranah resmi memakai ejaan dan kata baku bersama.",
			nil
		),
		Q(
			"nj_04",
			1,
			false,
			"Memakai bahasa Jawa di keluarga berarti salah berbahasa.",
			"Salah baru terjadi jika kaidah resmi dilanggar di ranah yang memintanya.",
			nil
		),
		Q(
			"nj_05",
			1,
			true,
			"Bahasa Indonesia berfungsi sebagai bahasa persatuan.",
			"Ia menghubungkan penutur bahasa daerah yang berbeda.",
			nil
		),
		Q(
			"nj_06",
			2,
			false,
			"EYD hanya berlaku untuk satu pulau.",
			"EYD berlaku untuk pemakaian bahasa Indonesia di ranah resmi, di mana pun.",
			nil
		),
		Q(
			"nj_07",
			2,
			true,
			"Kata baku dipilih supaya makna tulisan resmi tidak terbelah.",
			"Baku membantu pembaca dari latar berbeda memahami teks yang sama.",
			nil
		),
		Q(
			"nj_08",
			2,
			false,
			"Dialek harus dihapus agar bahasa Indonesia tumbuh.",
			"Dialek tetap hidup. Bahasa Indonesia mengurus ranah bersama.",
			nil
		),
		Q(
			"nj_09",
			2,
			true,
			"Sebuah kata bisa santai di percakapan dan baku di karangan.",
			"Ragam bahasa berubah mengikuti situasi.",
			nil
		),
		Q(
			"nj_10",
			2,
			false,
			"Papan nama sekolah boleh mengabaikan huruf kapital.",
			"Nama pada papan resmi mengikuti ejaan.",
			nil
		),
		Q(
			"nj_11",
			3,
			true,
			"Menulis diubah lebih tepat daripada di ubah untuk imbuhan.",
			"Imbuhan di- digabung dengan kata kerja.",
			nil
		),
		Q(
			"nj_12",
			3,
			false,
			"Bentuk merubah dianjurkan di karangan resmi.",
			"Bentuk yang dianjurkan ialah mengubah.",
			nil
		),
		Q(
			"nj_13",
			3,
			true,
			"Kalimat para siswa mereka belajar tidak efektif karena subjeknya ganda.",
			"Cukup satu subjek.",
			nil
		),
		Q(
			"nj_14",
			3,
			false,
			"Antara tugas dengan ujian adalah pasangan kata yang baku.",
			"Pasangannya ialah antara tugas dan ujian.",
			nil
		),
	},
	Sumatra = {
		Q(
			"ns_01",
			1,
			true,
			"Bahasa Indonesia tumbuh dari bahasa Melayu.",
			"Akarnya bahasa Melayu yang sudah dipakai luas di pesisir Nusantara.",
			{ Id = "c_ns_01", Word = "Melayu", Definition = "Bahasa yang menjadi akar bahasa Indonesia." }
		),
		Q(
			"ns_02",
			1,
			false,
			"Bahasa Indonesia diciptakan dari nol pada 28 Oktober 1928.",
			"Hari itu bahasa Indonesia diikrarkan sebagai bahasa persatuan, bukan diciptakan dari kekosongan.",
			nil
		),
		Q(
			"ns_03",
			1,
			true,
			"Sumpah Pemuda diikrarkan pada 28 Oktober 1928.",
			"Tanggal itu dikenang sebagai ikrar pemuda.",
			nil
		),
		Q(
			"ns_04",
			1,
			false,
			"Kongres Pemuda Kedua berlangsung di Medan.",
			"Kongres yang menghasilkan Sumpah Pemuda berlangsung di Jakarta.",
			nil
		),
		Q(
			"ns_05",
			2,
			true,
			"Salah satu ikrar menjunjung bahasa Indonesia sebagai bahasa persatuan.",
			"Ikrar itu menyebut bahasa Indonesia, bukan salah satu bahasa daerah sebagai satu-satunya bahasa rumah.",
			nil
		),
		Q(
			"ns_06",
			2,
			false,
			"Dialek daerah adalah kesalahan bahasa Indonesia.",
			"Dialek sah di komunitasnya. Ia bukan ejaan yang rusak.",
			nil
		),
		Q(
			"ns_07",
			2,
			true,
			"Bahasa Melayu pesisir sudah menjadi bahasa perhubungan sebelum ikrar pemuda.",
			"Para pemuda mengukuhkan yang sudah hidup, lalu menamainya bahasa Indonesia.",
			nil
		),
		Q(
			"ns_08",
			2,
			false,
			"Setelah 1928, bahasa daerah dilarang dituturkan.",
			"Tidak ada larangan menuturkan bahasa daerah di rumah.",
			nil
		),
		Q(
			"ns_09",
			3,
			true,
			"Tulisan resmi tetap memakai ejaan bersama meski penuturnya beragam.",
			"Ejaan bersama membuat surat dan buku pelajaran terbaca lintas daerah.",
			nil
		),
		Q(
			"ns_10",
			3,
			false,
			"Kata tidak baku lebih tepat daripada kata baku di naskah ujian.",
			"Naskah ujian memakai kata baku supaya penilaiannya adil.",
			nil
		),
		Q(
			"ns_11",
			3,
			true,
			"Bentuk karena lebih baku daripada karna.",
			"Karangan resmi memakai karena.",
			nil
		),
		Q("ns_12", 3, false, "Bentuk tau sudah tepat di karangan ilmiah.", "Tulis tahu.", nil),
	},
	Jurus = {
		{
			Id = "ju_01",
			Tier = 1,
			Prompt = "Jurus mana yang baku untuk tempat obat?",
			Options = { "apotek", "apotik", "apotex" },
			Answer = "apotek",
			Explanation = "Bentuk yang dianjurkan ialah apotek.",
		},
		{
			Id = "ju_02",
			Tier = 1,
			Prompt = "Jurus mana yang baku untuk kegiatan berlatih secara nyata?",
			Options = { "praktik", "praktek", "praktekkan" },
			Answer = "praktik",
			Explanation = "praktik, bukan praktek.",
		},
		{
			Id = "ju_03",
			Tier = 1,
			Prompt = "Pilih bentuk ubah yang baku.",
			Options = { "mengubah", "merubah", "merobah" },
			Answer = "mengubah",
			Explanation = "Awalan yang tepat menghasilkan mengubah.",
		},
		{
			Id = "ju_04",
			Tier = 1,
			Prompt = "Pilih ejaan kemungkinan buruk yang baku.",
			Options = { "risiko", "resiko", "risikokan" },
			Answer = "risiko",
			Explanation = "risiko memakai huruf i.",
		},
		{
			Id = "ju_05",
			Tier = 2,
			Prompt = "Jurus yang menanyakan tempat dengan ejaan tepat ialah ...",
			Options = { "di mana", "dimana", "dimeja" },
			Answer = "di mana",
			Explanation = "di dan mana ditulis terpisah.",
		},
		{
			Id = "ju_06",
			Tier = 2,
			Prompt = "Pilih bentuk giliran yang dianjurkan.",
			Options = { "antre", "antri", "ngantre" },
			Answer = "antre",
			Explanation = "Bahan ajar resmi memakai antre.",
		},
		{
			Id = "ju_07",
			Tier = 2,
			Prompt = "Pilih bentuk yang memengaruhi orang lain.",
			Options = { "memengaruhi", "mempengaruhi", "mempengarui" },
			Answer = "memengaruhi",
			Explanation = "Huruf p luluh.",
		},
		{
			Id = "ju_08",
			Tier = 2,
			Prompt = "Pilih ajakan sopan yang baku.",
			Options = { "silakan", "silahkan", "silahken" },
			Answer = "silakan",
			Explanation = "Tidak ada h pada silakan.",
		},
		{
			Id = "ju_09",
			Tier = 3,
			Prompt = "Pilih nama mutu yang baku.",
			Options = { "kualitas", "kwalitas", "kualita" },
			Answer = "kualitas",
			Explanation = "Tidak diawali kw.",
		},
		{
			Id = "ju_10",
			Tier = 3,
			Prompt = "Pilih uraian teliti yang bakunya tepat.",
			Options = { "analisis", "analisa", "analisys" },
			Answer = "analisis",
			Explanation = "analisis, bukan analisa.",
		},
		{
			Id = "ju_11",
			Tier = 3,
			Prompt = "Pilih tatanan yang ejaannya baku.",
			Options = { "sistem", "sistim", "system" },
			Answer = "sistem",
			Explanation = "sistem memakai e, bukan i, dan bukan ejaan Inggris.",
		},
		{
			Id = "ju_12",
			Tier = 3,
			Prompt = "Pilih sasaran yang bakunya tepat.",
			Options = { "objek", "obyek", "object" },
			Answer = "objek",
			Explanation = "objek, bukan obyek.",
		},
	},
	BossAsk = {
		{
			Id = "ba_01",
			Tier = 2,
			Prompt = "Di karangan resmi, bentuk mana yang dijaga?",
			Options = { "izin", "ijin", "izin." },
			Answer = "izin",
			Explanation = "izin tanpa j.",
		},
		{
			Id = "ba_02",
			Tier = 2,
			Prompt = "Pasangan mana yang utuh?",
			Options = { "antara buku dan pensil", "antara buku dengan pensil", "antara buku atau pensil" },
			Answer = "antara buku dan pensil",
			Explanation = "antara berpasangan dengan dan.",
		},
		{
			Id = "ba_03",
			Tier = 2,
			Prompt = "Kalimat mana yang subjeknya tidak ganda?",
			Options = { "Para murid membaca.", "Para murid mereka membaca.", "Murid mereka para membaca." },
			Answer = "Para murid membaca.",
			Explanation = "Satu subjek cukup.",
		},
		{
			Id = "ba_04",
			Tier = 3,
			Prompt = "Penulisan nama bahasa yang tepat di tengah kalimat ialah ...",
			Options = { "bahasa Indonesia", "Bahasa indonesia", "bahasa indonesia" },
			Answer = "bahasa Indonesia",
			Explanation = "bahasa kecil, Indonesia kapital.",
		},
		{
			Id = "ba_05",
			Tier = 3,
			Prompt = "Lambang satuan yang tepat ialah ...",
			Options = { "cm", "cm.", "c.m" },
			Answer = "cm",
			Explanation = "Lambang satuan tidak diberi titik.",
		},
		{
			Id = "ba_06",
			Tier = 3,
			Prompt = "Kata ulang yang tepat ialah ...",
			Options = { "laki-laki", "laki laki", "laki2" },
			Answer = "laki-laki",
			Explanation = "Ulangan penuh memakai tanda hubung.",
		},
		{
			Id = "ba_07",
			Tier = 1,
			Prompt = "Awal kalimat yang tepat ialah ...",
			Options = { "Saya tinggal di Jakarta.", "saya tinggal di jakarta.", "Saya tinggal di jakarta" },
			Answer = "Saya tinggal di Jakarta.",
			Explanation = "Awal kalimat, nama kota, dan titik.",
		},
		{
			Id = "ba_08",
			Tier = 1,
			Prompt = "Bentuk sebab yang baku ialah ...",
			Options = { "karena", "karna", "krna" },
			Answer = "karena",
			Explanation = "karena lengkap hurufnya.",
		},
	},
	BossFast = {
		Q(
			"bf_01",
			1,
			true,
			"Penjaga Makna menjaga tulisan resmi, bukan melarang bahasa daerah.",
			"Bahasa di rumah tetap sah.",
			nil
		),
		Q(
			"bf_02",
			1,
			false,
			"Bahasa daerah harus disebut salah ejaan.",
			"Bahasa daerah punya sistemnya sendiri.",
			nil
		),
		Q("bf_03", 2, true, "di rumah memisahkan kata depan.", "di depan kata tempat dipisah.", nil),
		Q("bf_04", 2, false, "dirumah adalah imbuhan.", "Itu kata depan yang salah digabung.", nil),
		Q("bf_05", 2, true, "ditulis adalah imbuhan yang digabung.", "di- plus tulis menjadi ditulis.", nil),
		Q("bf_06", 2, false, "di tulis memisahkan imbuhan dengan benar.", "Imbuhan tidak dipisah.", nil),
		Q(
			"bf_07",
			3,
			true,
			"Sumpah Pemuda mengikrarkan bahasa persatuan.",
			"Ikrar itu tidak menghapus bahasa daerah.",
			nil
		),
		Q(
			"bf_08",
			3,
			false,
			"Tahun 1928 bahasa Indonesia muncul tanpa akar Melayu.",
			"Akarnya bahasa Melayu.",
			nil
		),
		Q("bf_09", 3, true, "risiko lebih baku daripada resiko.", "Huruf i yang dianjurkan.", nil),
		Q("bf_10", 3, false, "aktifitas lebih baku daripada aktivitas.", "Bentuk bakunya aktivitas.", nil),
		Q("bf_11", 1, true, "Kalimat tanya memakai tanda tanya.", "Tanda itu menutup pertanyaan.", nil),
		Q("bf_12", 1, false, "Judul berita wajib diakhiri titik.", "Judul tidak diakhiri titik.", nil),
	},
	BossLine = {
		{
			Id = "bl_01",
			Tier = 1,
			Words = { "Bahasa", "Indonesia", "bahasa", "persatuan." },
			Note = "Semboyan ikrar, dengan nama bahasa yang kapital.",
		},
		{
			Id = "bl_02",
			Tier = 2,
			Words = { "Kami", "menjaga", "makna", "tulisan", "resmi." },
			Note = "Subjek, predikat, lalu objek.",
		},
		{
			Id = "bl_03",
			Tier = 2,
			Words = { "Bahasa", "daerah", "tetap", "hidup", "di", "rumah." },
			Note = "di rumah terpisah.",
		},
		{
			Id = "bl_04",
			Tier = 3,
			Words = { "Silakan", "mengubah", "ejaan", "yang", "keliru." },
			Note = "silakan dan mengubah, keduanya baku.",
		},
		{
			Id = "bl_05",
			Tier = 3,
			Words = { "Antara", "makna", "dan", "ejaan", "saling", "menguatkan." },
			Note = "antara ... dan ...",
		},
		{
			Id = "bl_06",
			Tier = 1,
			Words = { "Mbok", "Leksika", "menjaga", "bahasa", "daerah." },
			Note = "Nama tokoh dikapital.",
		},
	},
}
