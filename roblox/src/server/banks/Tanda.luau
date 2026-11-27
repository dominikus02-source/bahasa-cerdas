-- Tanda baca menurut EYD V. Jawaban ada di indeks pertama sebelum diacak server.
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

local P = "Mana tanda baca dan ejaan yang tepat?"

return {
	Q(
		"ey_t_01",
		1,
		{ "a02" },
		P,
		"Apa kabar hari ini?",
		{ "Apa kabar hari ini.", "Apa kabar hari ini!", "apa kabar hari ini?" },
		"Kalimat tanya diakhiri tanda tanya. Awal kalimat memakai huruf kapital.",
		{ Id = "w_tanya", Word = "?", Definition = "Tanda tanya menutup kalimat tanya." }
	),
	Q(
		"ey_t_02",
		1,
		{ "a02" },
		P,
		"Hati-hati di jalan.",
		{ "Hati hati di jalan.", "Hati-hati dijalan.", "hati-hati di jalan." },
		"Kata ulang utuh memakai tanda hubung tanpa spasi. Kata depan di tetap terpisah. Kalimat berita diakhiri titik.",
		{
			Id = "w_hubung",
			Word = "hati-hati",
			Definition = "Kata ulang ditulis dengan tanda hubung, tanpa spasi.",
		}
	),
	Q(
		"ey_t_03",
		1,
		{ "a02" },
		P,
		"Ibu membeli beras, gula, dan teh.",
		{
			"Ibu membeli beras gula dan teh.",
			"Ibu membeli beras, gula dan teh.",
			"ibu membeli beras, gula, dan teh.",
		},
		"Koma memisahkan perincian, termasuk sebelum kata dan pada daftar.",
		{ Id = "w_koma", Word = "koma", Definition = "Koma memisahkan unsur dalam perincian." }
	),
	Q(
		"ey_t_04",
		1,
		{ "a02" },
		P,
		"Dia siswa kelas 5.",
		{ "Dia siswa kelas 5?", "Dia siswa kelas 5,", "dia siswa kelas 5." },
		"Kalimat berita biasa diakhiri titik.",
		nil
	),
	Q(
		"ey_t_05",
		1,
		{ "a02" },
		P,
		"Apakah kamu sudah makan?",
		{ "Apakah kamu sudah makan.", "Apakah kamu sudah makan!", "apakah kamu sudah makan?" },
		"Kalimat yang meminta jawaban diakhiri tanda tanya.",
		nil
	),
	Q(
		"ey_t_06",
		1,
		{ "a02" },
		P,
		"Siapa penulis novel itu?",
		{ "Siapa penulis novel itu.", "siapa penulis novel itu?", "Siapa penulis novel itu!" },
		"Kata tanya siapa membentuk kalimat tanya, jadi diakhiri tanda tanya.",
		nil
	),
	Q(
		"ey_t_07",
		2,
		{ "a02", "boss" },
		P,
		[[Rani berkata, "Besok saya datang."]],
		{
			[[Rani berkata "Besok saya datang."]],
			[[Rani berkata, "besok saya datang."]],
			[[rani berkata, "Besok saya datang."]],
		},
		"Kalimat langsung didahului koma dan ditulis di antara tanda petik.",
		{
			Id = "w_petik",
			Word = "tanda petik",
			Definition = "Kalimat langsung diapit tanda petik dan didahului koma.",
		}
	),
	Q(
		"ey_t_08",
		2,
		{ "a02", "boss" },
		P,
		"Bahan yang dibutuhkan: tepung, telur, dan susu.",
		{
			"Bahan yang dibutuhkan, tepung, telur, dan susu.",
			"Bahan yang dibutuhkan tepung, telur, dan susu.",
			"bahan yang dibutuhkan: tepung, telur, dan susu.",
		},
		"Titik dua dipakai sebelum perincian.",
		{ Id = "w_titikdua", Word = "titik dua", Definition = "Titik dua mengantar daftar atau perincian." }
	),
	Q(
		"ey_t_09",
		2,
		{ "a02", "boss" },
		P,
		"Upacara dimulai pukul 07.30.",
		{ "Upacara dimulai pukul 07:30.", "Upacara dimulai pukul 07,30.", "upacara dimulai pukul 07.30." },
		"Penulisan pukul memakai titik, bukan titik dua dan bukan koma.",
		{ Id = "w_pukul", Word = "07.30", Definition = "Jam dan menit dipisah titik: pukul 07.30." }
	),
	Q("ey_t_10", 2, { "a02" }, P, "Kami tiba tanggal 17 Agustus 2024.", {
		"Kami tiba tanggal 17 Agustus, 2024.",
		"Kami tiba tanggal 17 agustus 2024.",
		"kami tiba tanggal 17 Agustus 2024.",
	}, "Tanggal, nama bulan, dan tahun tidak dipisah koma. Nama bulan kapital.", nil),
	Q("ey_t_11", 2, { "a02" }, P, "Tolong bawa air, gelas, dan nampan.", {
		"Tolong bawa air gelas dan nampan.",
		"Tolong bawa air, gelas dan nampan.",
		"tolong bawa air, gelas, dan nampan.",
	}, "Unsur perincian dipisah koma, termasuk sebelum dan.", nil),
	Q("ey_t_12", 2, { "a02" }, P, "Kami butuh gula, garam, dan merica.", {
		"Kami butuh gula garam dan merica.",
		"Kami butuh gula; garam; dan merica.",
		"kami butuh gula, garam, dan merica.",
	}, "Perincian singkat memakai koma, bukan titik koma.", nil),
	Q(
		"ey_t_13",
		2,
		{ "a02", "boss" },
		P,
		"Selamat pagi, Bu.",
		{ "Selamat pagi Bu.", "selamat pagi, Bu.", "Selamat pagi, bu." },
		"Koma memisahkan sapaan. Sapaan Bu ditulis dengan huruf kapital.",
		nil
	),
	Q("ey_t_14", 2, { "a02" }, P, "Catat tiga hal: tujuan, langkah, dan hasil.", {
		"Catat tiga hal; tujuan, langkah, dan hasil.",
		"Catat tiga hal tujuan, langkah, dan hasil.",
		"catat tiga hal: tujuan, langkah, dan hasil.",
	}, "Titik dua dipakai tepat sebelum rincian.", nil),
	Q("ey_t_15", 2, { "a02" }, P, "Anak-anak bermain di halaman.", {
		"Anak anak bermain di halaman.",
		"Anak - anak bermain di halaman.",
		"anak-anak bermain di halaman.",
	}, "Kata ulang ditulis dengan tanda hubung tanpa spasi di kiri atau kanannya.", nil),
	Q("ey_t_16", 3, { "a02", "boss" }, P, [[Ayah berkata, "Jangan lupa belajar."]], {
		[[Ayah berkata "Jangan lupa belajar."]],
		[[Ayah berkata, "jangan lupa belajar."]],
		[[Ayah berkata, "Jangan lupa belajar".]],
	}, "Koma mendahului kutipan. Titik penutup kutipan berada di dalam tanda petik.", nil),
	Q("ey_t_17", 3, { "a02", "boss" }, P, [[Ia bertanya, "Di mana buku itu?"]], {
		[[Ia bertanya, "Di mana buku itu".]],
		[[Ia bertanya "Di mana buku itu?"]],
		[[ia bertanya, "Di mana buku itu?"]],
	}, "Tanda tanya kutipan tetap di dalam tanda petik karena bagian dari kalimat yang diucapkan.", nil),
	Q(
		"ey_t_18",
		3,
		{ "a02", "boss" },
		P,
		"Buku itu seharga Rp50.000,00.",
		{ "Buku itu seharga Rp 50.000.", "Buku itu seharga RP50,000.00.", "buku itu seharga Rp50.000,00." },
		"Singkatan rupiah ditulis Rp tanpa spasi. Ribuan memakai titik dan desimal memakai koma.",
		{
			Id = "w_rupiah",
			Word = "Rp50.000,00",
			Definition = "Penulisan mata uang: Rp lalu angka tanpa spasi.",
		}
	),
	Q("ey_t_19", 3, { "a02", "boss" }, P, "Lomba itu diikuti siswa SD, SMP, dan SMA.", {
		"Lomba itu diikuti siswa S.D., S.M.P., dan S.M.A.",
		"Lomba itu diikuti siswa SD SMP dan SMA.",
		"lomba itu diikuti siswa SD, SMP, dan SMA.",
	}, "Singkatan jenjang sekolah yang lazim ditulis tanpa titik di setiap huruf.", nil),
	Q("ey_t_20", 3, { "a02", "boss" }, P, "Mereka berlari-lari di lapangan.", {
		"Mereka berlari lari di lapangan.",
		"Mereka berlari - lari di lapangan.",
		"mereka berlari-lari di lapangan.",
	}, "Bentuk ulang dengan imbuhan tetap dirangkai tanda hubung.", nil),
	Q(
		"ey_t_21",
		3,
		{ "a02", "boss" },
		P,
		"Bawalah buku, pensil, dll.",
		{ "Bawalah buku, pensil, dll", "Bawalah buku, pensil dll.", "Bawalah buku pensil dll." },
		"Singkatan dan lain-lain adalah dll. dan diakhiri titik. Koma tetap memisahkan perincian.",
		{ Id = "w_dll", Word = "dll.", Definition = "Singkatan dan lain-lain diakhiri titik." }
	),
	Q("ey_t_22", 3, { "a02", "boss" }, P, "Surat ini dikirim ke Jl. Melati No. 8, Bogor.", {
		"Surat ini dikirim ke Jl Melati No 8 Bogor.",
		"Surat ini dikirim ke jl. Melati no. 8, Bogor.",
		"surat ini dikirim ke Jl. Melati No. 8, Bogor.",
	}, "Singkatan Jl. dan No. diakhiri titik. Nama jalan dan kota kapital. Koma memisahkan kota.", nil),
	Q("ey_t_23", 2, { "a02" }, P, [[Guru berkata, "Kerjakan soal ini."]], {
		[[Guru berkata "Kerjakan soal ini."]],
		[[Guru berkata, "kerjakan soal ini."]],
		[[Guru berkata, "Kerjakan soal ini"]],
	}, "Kalimat langsung memakai koma, tanda petik, huruf kapital, dan titik di dalam petik.", nil),
	Q(
		"ey_t_24",
		1,
		{ "a02" },
		P,
		"Terima kasih, Bu.",
		{ "Terimakasih, Bu.", "Terima kasih Bu.", "terima kasih, Bu." },
		"Terima kasih ditulis terpisah. Koma memisahkan sapaan Bu.",
		{
			Id = "w_terima",
			Word = "terima kasih",
			Definition = "Ungkapan ini ditulis dua kata, bukan digabung.",
		}
	),
}
