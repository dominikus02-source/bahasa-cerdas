-- Huruf kapital menurut EYD V (berlaku 16 Agustus 2022). Jawaban ada di indeks pertama sebelum diacak server.
local function Q(id, tier, arenas, prompt, answer, wrongs, explanation, card)
	local options = { answer }
	for _, wrong in wrongs do
		table.insert(options, wrong)
	end
	return {
		Id = id,
		Tier = tier,
		Arenas = arenas,
		Prompt = prompt,
		Options = options,
		Answer = answer,
		Explanation = explanation,
		Card = card,
	}
end

local P = "Pilih penulisan yang sesuai EYD V."

return {
	Q(
		"ey_k_01",
		1,
		{ "tutorial", "a01" },
		P,
		"Saya tinggal di Jakarta.",
		{ "saya tinggal di jakarta.", "Saya Tinggal di jakarta.", "saya tinggal di Jakarta" },
		"Awal kalimat dan nama tempat memakai huruf kapital. Kalimat berita diakhiri titik.",
		{ Id = "w_jakarta", Word = "Jakarta", Definition = "Nama kota ditulis dengan huruf kapital." }
	),
	Q(
		"ey_k_02",
		1,
		{ "tutorial", "a01" },
		"Mana kalimat yang penulisannya tepat?",
		"Besok hari Senin.",
		{ "Besok hari senin.", "besok hari Senin.", "Besok Hari senin." },
		"Nama hari ditulis dengan huruf kapital. Awal kalimat juga kapital.",
		{ Id = "w_senin", Word = "Senin", Definition = "Nama hari selalu diawali huruf kapital." }
	),
	Q(
		"ey_k_03",
		1,
		{ "tutorial", "a01", "a02" },
		P,
		"Buku itu di rumah.",
		{ "Buku itu dirumah.", "buku itu di rumah.", "Buku itu di Rumah." },
		"Kata depan di dipisah dari kata yang mengikutinya. Rumah di sini bukan nama tempat.",
		{ Id = "w_di", Word = "di", Definition = "Kata depan di ditulis terpisah: di rumah, di sekolah." }
	),
	Q(
		"ey_k_04",
		1,
		{ "a01", "boss" },
		P,
		"Kami belajar bahasa Indonesia.",
		{
			"Kami belajar Bahasa Indonesia.",
			"kami belajar bahasa Indonesia.",
			"Kami belajar bahasa indonesia.",
		},
		"Nama bahasa memakai huruf kapital pada kata nama bahasanya. Kata bahasa di tengah kalimat tidak dikapital.",
		{
			Id = "w_bahasa",
			Word = "bahasa Indonesia",
			Definition = "Kata bahasa ditulis kecil, nama bahasanya kapital.",
		}
	),
	Q(
		"ey_k_05",
		1,
		{ "a01" },
		P,
		"Ia berdoa kepada Tuhan.",
		{ "Ia berdoa kepada tuhan.", "ia berdoa kepada Tuhan.", "Ia Berdoa kepada Tuhan." },
		"Kata Tuhan sebagai nama ditulis dengan huruf kapital.",
		nil
	),
	Q(
		"ey_k_06",
		1,
		{ "a01" },
		"Mana kalimat yang penulisannya tepat?",
		"Bulan Agustus berhawa sejuk.",
		{ "Bulan agustus berhawa sejuk.", "bulan Agustus berhawa sejuk.", "Bulan Agustus Berhawa sejuk." },
		"Nama bulan ditulis dengan huruf kapital.",
		{ Id = "w_agustus", Word = "Agustus", Definition = "Nama bulan diawali huruf kapital." }
	),
	Q("ey_k_07", 1, { "a01" }, P, "Rani membaca novel di perpustakaan.", {
		"rani membaca novel di perpustakaan.",
		"Rani Membaca novel di Perpustakaan.",
		"Rani membaca Novel di perpustakaan.",
	}, "Nama orang memakai huruf kapital. Kata umum seperti novel dan perpustakaan tidak.", nil),
	Q(
		"ey_k_08",
		1,
		{ "a01" },
		P,
		"Ayah pergi ke Bandung.",
		{ "Ayah pergi ke bandung.", "ayah pergi ke Bandung.", "Ayah Pergi ke Bandung." },
		"Nama kota ditulis dengan huruf kapital. Kata depan ke tetap terpisah.",
		nil
	),
	Q(
		"ey_k_09",
		2,
		{ "a01", "boss" },
		P,
		"Pidato presiden disiarkan malam ini.",
		{
			"Pidato Presiden disiarkan malam ini.",
			"pidato presiden disiarkan malam ini.",
			"Pidato presiden disiarkan Malam ini.",
		},
		"Jabatan yang tidak diikuti nama orang ditulis dengan huruf kecil.",
		{
			Id = "w_jabatan",
			Word = "presiden",
			Definition = "Jabatan tanpa nama orang di belakangnya tidak dikapital.",
		}
	),
	Q("ey_k_10", 2, { "a01", "boss" }, P, "Kami menyambut Presiden Prabowo di bandara.", {
		"Kami menyambut presiden Prabowo di bandara.",
		"Kami menyambut Presiden prabowo di bandara.",
		"kami menyambut Presiden Prabowo di bandara.",
	}, "Jabatan yang diikuti nama orang ditulis dengan huruf kapital, begitu pula nama orangnya.", nil),
	Q("ey_k_11", 2, { "a01" }, P, "Suku Banjar tinggal di Kalimantan.", {
		"Suku banjar tinggal di kalimantan.",
		"suku Banjar tinggal di Kalimantan.",
		"Suku Banjar tinggal di kalimantan.",
	}, "Nama suku dan nama geografi ditulis dengan huruf kapital.", nil),
	Q(
		"ey_k_12",
		2,
		{ "a01", "boss" },
		P,
		"Pelajaran agama Islam diadakan hari ini.",
		{
			"Pelajaran Agama Islam diadakan hari ini.",
			"Pelajaran agama islam diadakan hari ini.",
			"pelajaran agama Islam diadakan hari ini.",
		},
		"Nama agama ditulis dengan huruf kapital. Kata agama sendiri tidak dikapital di tengah kalimat.",
		{ Id = "w_islam", Word = "Islam", Definition = "Nama agama diawali huruf kapital." }
	),
	Q(
		"ey_k_13",
		2,
		{ "a01", "boss" },
		P,
		"Idulfitri dirayakan setelah Ramadan.",
		{
			"Idul Fitri dirayakan setelah Ramadan.",
			"Idulfitri dirayakan setelah ramadan.",
			"idulfitri dirayakan setelah Ramadan.",
		},
		"Nama hari raya dan bulan ditulis kapital. Idulfitri ditulis serangkai.",
		{
			Id = "w_idulfitri",
			Word = "Idulfitri",
			Definition = "Nama hari raya ini ditulis serangkai dan diawali kapital.",
		}
	),
	Q("ey_k_14", 2, { "a01" }, P, "Sungai Musi membelah Palembang.", {
		"sungai Musi membelah Palembang.",
		"Sungai musi membelah palembang.",
		"Sungai Musi membelah palembang.",
	}, "Unsur nama geografi seperti Sungai Musi dan nama kota ditulis dengan huruf kapital.", nil),
	Q("ey_k_15", 2, { "a01" }, P, "Kami berkunjung ke Danau Toba.", {
		"Kami berkunjung ke danau Toba.",
		"Kami berkunjung ke Danau toba.",
		"kami berkunjung ke Danau Toba.",
	}, "Danau Toba adalah nama diri geografi. Kedua unsurnya memakai huruf kapital.", nil),
	Q("ey_k_16", 2, { "a01", "boss" }, P, "Surat resmi dikirim ke Kementerian Pendidikan.", {
		"Surat resmi dikirim ke kementerian pendidikan.",
		"Surat resmi dikirim ke Kementerian pendidikan.",
		"surat resmi dikirim ke Kementerian Pendidikan.",
	}, "Setiap unsur nama lembaga pemerintahan ditulis dengan huruf kapital.", nil),
	Q(
		"ey_k_17",
		2,
		{ "a01" },
		P,
		"Nabi Muhammad lahir di Mekah.",
		{ "Nabi muhammad lahir di mekah.", "nabi Muhammad lahir di Mekah.", "Nabi Muhammad lahir di mekah." },
		"Gelar keagamaan yang diikuti nama, nama orang, dan nama tempat ditulis kapital.",
		nil
	),
	Q(
		"ey_k_18",
		2,
		{ "a01" },
		"Mana kalimat yang penulisannya tepat?",
		"Bahasa ibu Rani adalah bahasa Jawa.",
		{
			"Bahasa ibu Rani adalah Bahasa jawa.",
			"bahasa ibu Rani adalah bahasa Jawa.",
			"Bahasa ibu Rani adalah bahasa jawa.",
		},
		"Awal kalimat kapital. Nama bahasa (Jawa) kapital, sedangkan kata bahasa di tengah kalimat tidak.",
		nil
	),
	Q(
		"ey_k_19",
		3,
		{ "a01", "boss" },
		P,
		"Ia membeli Laskar Pelangi di toko buku.",
		{
			"Ia membeli laskar pelangi di toko buku.",
			"Ia membeli Laskar pelangi di toko buku.",
			"ia membeli Laskar Pelangi di toko buku.",
		},
		"Setiap kata dalam judul karya tulis memakai huruf kapital.",
		{
			Id = "w_judul",
			Word = "Laskar Pelangi",
			Definition = "Judul buku memakai huruf kapital pada setiap katanya.",
		}
	),
	Q("ey_k_20", 3, { "a01", "boss" }, P, "Perang Diponegoro terjadi di Jawa.", {
		"Perang diponegoro terjadi di Jawa.",
		"perang Diponegoro terjadi di jawa.",
		"Perang Diponegoro terjadi di jawa.",
	}, "Nama peristiwa sejarah dan nama pulau ditulis dengan huruf kapital.", nil),
	Q("ey_k_21", 3, { "a01", "boss" }, P, "Hari Kemerdekaan diperingati setiap Agustus.", {
		"Hari kemerdekaan diperingati setiap Agustus.",
		"hari Kemerdekaan diperingati setiap agustus.",
		"Hari Kemerdekaan diperingati setiap agustus.",
	}, "Nama hari raya dan nama bulan ditulis dengan huruf kapital pada setiap unsurnya.", nil),
	Q("ey_k_22", 3, { "a01", "boss" }, P, "Gelar Sultan Hasanuddin melekat pada pahlawan itu.", {
		"Gelar sultan Hasanuddin melekat pada pahlawan itu.",
		"Gelar Sultan hasanuddin melekat pada pahlawan itu.",
		"gelar Sultan Hasanuddin melekat pada pahlawan itu.",
	}, "Gelar kehormatan yang diikuti nama orang ditulis dengan huruf kapital.", nil),
	Q("ey_k_23", 3, { "a01", "boss" }, P, "Surat itu ditujukan kepada Gubernur Jawa Barat.", {
		"Surat itu ditujukan kepada gubernur Jawa Barat.",
		"Surat itu ditujukan kepada Gubernur jawa barat.",
		"surat itu ditujukan kepada Gubernur Jawa Barat.",
	}, "Nama jabatan yang diikuti nama wilayah ditulis dengan huruf kapital.", nil),
	Q("ey_k_24", 3, { "a01", "boss" }, P, "Novel Bumi Manusia ditulis Pramoedya.", {
		"Novel bumi manusia ditulis Pramoedya.",
		"Novel Bumi manusia ditulis pramoedya.",
		"novel Bumi Manusia ditulis Pramoedya.",
	}, "Judul karya dan nama pengarang memakai huruf kapital.", nil),
}
