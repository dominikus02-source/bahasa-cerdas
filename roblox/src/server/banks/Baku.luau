-- Bentuk baku EYD V / KBBI. Jawaban ada di indeks pertama sebelum diacak server.
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

local P = "Pilih bentuk baku menurut EYD V."

return {
	Q(
		"ey_b_01",
		1,
		{ "a01" },
		P,
		"Obat dibeli di apotek.",
		{ "Obat dibeli di apotik.", "Obat dibeli di apoteek.", "obat dibeli di apotek." },
		"Bentuk baku adalah apotek, bukan apotik.",
		{ Id = "w_apotek", Word = "apotek", Definition = "Tempat menjual obat. Bukan apotik." }
	),
	Q("ey_b_02", 1, { "a01" }, P, "Kegiatan itu bagian dari aktivitas kelas.", {
		"Kegiatan itu bagian dari aktifitas kelas.",
		"Kegiatan itu bagian dari aktiviti kelas.",
		"kegiatan itu bagian dari aktivitas kelas.",
	}, "Bentuk baku adalah aktivitas, bukan aktifitas.", nil),
	Q(
		"ey_b_03",
		1,
		{ "a01", "boss" },
		P,
		"Setiap perjalanan punya risiko.",
		{
			"Setiap perjalanan punya resiko.",
			"Setiap perjalanan punya risikoo.",
			"setiap perjalanan punya risiko.",
		},
		"Bentuk baku adalah risiko, bukan resiko.",
		{ Id = "w_risiko", Word = "risiko", Definition = "Kemungkinan buruk. Ejaannya risiko." }
	),
	Q(
		"ey_b_04",
		1,
		{ "a01" },
		P,
		"Tarik napas pelan-pelan.",
		{ "Tarik nafas pelan-pelan.", "Tarik nafas pelan pelan.", "tarik napas pelan-pelan." },
		"Bentuk baku adalah napas. Pelan-pelan memakai tanda hubung.",
		{ Id = "w_napas", Word = "napas", Definition = "Udara yang dihirup. Bukan nafas." }
	),
	Q("ey_b_05", 1, { "a01", "boss" }, P, "Praktik membaca dilakukan setiap pagi.", {
		"Praktek membaca dilakukan setiap pagi.",
		"PraktIk membaca dilakukan setiap pagi.",
		"praktik membaca dilakukan setiap pagi.",
	}, "Bentuk baku adalah praktik, bukan praktek.", nil),
	Q(
		"ey_b_06",
		1,
		{ "a01" },
		P,
		"Berikan contoh yang konkret.",
		{ "Berikan contoh yang konkrit.", "Berikan contoh yang kongkret.", "berikan contoh yang konkret." },
		"Bentuk baku adalah konkret, bukan konkrit.",
		nil
	),
	Q(
		"ey_b_07",
		2,
		{ "a01", "boss" },
		P,
		"Kualitas tulisan itu baik.",
		{ "Kwalitas tulisan itu baik.", "Kwalitet tulisan itu baik.", "kualitas tulisan itu baik." },
		"Bentuk baku adalah kualitas, bukan kwalitas.",
		nil
	),
	Q(
		"ey_b_08",
		2,
		{ "a01" },
		P,
		"Simpan kuitansi pembelian.",
		{ "Simpan kwitansi pembelian.", "Simpan kuitansi pembelianya.", "simpan kuitansi pembelian." },
		"Bentuk baku adalah kuitansi, bukan kwitansi.",
		{ Id = "w_kuitansi", Word = "kuitansi", Definition = "Bukti bayar. Ejaannya kuitansi." }
	),
	Q(
		"ey_b_09",
		1,
		{ "a01", "a02" },
		P,
		"Minta izin kepada guru.",
		{ "Minta ijin kepada guru.", "Minta ijin kepada Guru.", "minta izin kepada guru." },
		"Bentuk baku adalah izin, bukan ijin.",
		nil
	),
	Q("ey_b_10", 2, { "a01", "boss" }, P, "Murid itu berpikir sebelum menjawab.", {
		"Murid itu berfikir sebelum menjawab.",
		"Murid itu berpikiir sebelum menjawab.",
		"murid itu berpikir sebelum menjawab.",
	}, "Bentuk baku adalah berpikir, dengan huruf p.", nil),
	Q(
		"ey_b_10b",
		2,
		{ "a01" },
		P,
		"Mereka berpikir bersama di perpustakaan.",
		{
			"Mereka berfikir bersama di perpustakaan.",
			"Mereka berpiker bersama di perpustakaan.",
			"mereka berpikir bersama di perpustakaan.",
		},
		"Kata baku untuk kegiatan akal ini adalah berpikir.",
		{ Id = "w_berpikir", Word = "berpikir", Definition = "Memakai p, bukan berfikir." }
	),
	Q(
		"ey_b_11",
		2,
		{ "a01", "boss" },
		P,
		"Editor mengubah ejaan yang keliru.",
		{
			"Editor merubah ejaan yang keliru.",
			"Editor ngubah ejaan yang keliru.",
			"editor mengubah ejaan yang keliru.",
		},
		"Bentuk baku dari ubah adalah mengubah, bukan merubah.",
		{ Id = "w_mengubah", Word = "mengubah", Definition = "Bukan merubah." }
	),
	Q("ey_b_11b", 3, { "boss" }, P, "Guru mengubah urutan kalimat itu.", {
		"Guru merubah urutan kalimat itu.",
		"Guru mengubah urutan Kalimat itu.",
		"guru mengubah urutan kalimat itu.",
	}, "Awalan meng- pada ubah menghasilkan mengubah.", nil),
	Q(
		"ey_b_12",
		2,
		{ "a01", "boss" },
		P,
		"Kami antre di loket.",
		{ "Kami antri di loket.", "Kami antre di Loket.", "kami antre di loket." },
		"Bentuk baku adalah antre, bukan antri.",
		{ Id = "w_antre", Word = "antre", Definition = "Menunggu giliran. Bukan antri." }
	),
	Q(
		"ey_b_13",
		1,
		{ "a01" },
		P,
		"Atlet itu berlatih rutin.",
		{ "Atlit itu berlatih rutin.", "Atlet itu berlatih Rutin.", "atlet itu berlatih rutin." },
		"Bentuk baku adalah atlet, bukan atlit.",
		nil
	),
	Q("ey_b_14", 2, { "a01", "boss" }, P, "Guru membuat analisis hasil ulangan.", {
		"Guru membuat analisa hasil ulangan.",
		"Guru membuat analisis hasil Ulangan.",
		"guru membuat analisis hasil ulangan.",
	}, "Nomina bakunya analisis, bukan analisa.", nil),
	Q(
		"ey_b_15",
		2,
		{ "a01", "boss" },
		P,
		"Respons murid sangat cepat.",
		{ "Respon murid sangat cepat.", "Respons murid sangat Cepat.", "respons murid sangat cepat." },
		"Nomina bakunya respons, dengan huruf s di akhir.",
		{ Id = "w_respons", Word = "respons", Definition = "Tanggapan. Bukan respon." }
	),
	Q(
		"ey_b_16",
		2,
		{ "a01" },
		P,
		"Ia datang sekadar bertanya.",
		{ "Ia datang sekedar bertanya.", "Ia datang sekadar Bertanya.", "ia datang sekadar bertanya." },
		"Bentuk baku adalah sekadar, bukan sekedar.",
		nil
	),
	Q(
		"ey_b_17",
		1,
		{ "a01", "a02" },
		P,
		"Silakan duduk di bangku depan.",
		{
			"Silahkan duduk di bangku depan.",
			"Silakan duduk di Bangku depan.",
			"silakan duduk di bangku depan.",
		},
		"Bentuk baku adalah silakan, bukan silahkan.",
		{ Id = "w_silakan", Word = "silakan", Definition = "Ajakan sopan. Bukan silahkan." }
	),
	Q("ey_b_18", 2, { "a01" }, P, "Ayah menerima telepon dari sekolah.", {
		"Ayah menerima telpon dari sekolah.",
		"Ayah menerima telepon dari Sekolah.",
		"ayah menerima telepon dari sekolah.",
	}, "Bentuk baku adalah telepon, bukan telpon.", nil),
	Q(
		"ey_b_19",
		3,
		{ "a01", "boss" },
		P,
		"Bacaan yang baik memengaruhi kosakata.",
		{
			"Bacaan yang baik mempengaruhi kosakata.",
			"Bacaan yang baik mempengaruh kosakata.",
			"bacaan yang baik memengaruhi kosakata.",
		},
		"Bentuk baku adalah memengaruhi, bukan mempengaruhi.",
		{ Id = "w_memengaruhi", Word = "memengaruhi", Definition = "Satu p. Bukan mempengaruhi." }
	),
	Q("ey_b_20", 2, { "a01", "boss" }, P, "Ulang tahunnya bulan Februari.", {
		"Ulang tahunnya bulan Pebruari.",
		"Ulang tahunnya bulan februari.",
		"ulang tahunnya bulan Februari.",
	}, "Nama bulan yang baku adalah Februari, bukan Pebruari.", nil),
	Q("ey_b_21", 2, { "a01" }, P, "Pengajian diadakan hari Jumat.", {
		"Pengajian diadakan hari Jum'at.",
		"Pengajian diadakan hari jumat.",
		"pengajian diadakan hari Jumat.",
	}, "Nama hari ditulis Jumat, tanpa tanda petik.", nil),
	Q(
		"ey_b_22",
		2,
		{ "a01", "boss" },
		P,
		"Cerita itu terjadi pada zaman kerajaan.",
		{
			"Cerita itu terjadi pada jaman kerajaan.",
			"Cerita itu terjadi pada Zaman kerajaan.",
			"cerita itu terjadi pada zaman kerajaan.",
		},
		"Bentuk baku adalah zaman, bukan jaman.",
		{ Id = "w_zaman", Word = "zaman", Definition = "Masa. Bukan jaman." }
	),
	Q("ey_b_23", 1, { "a01" }, P, "Jadwal pelajaran menempel di dinding.", {
		"Jadual pelajaran menempel di dinding.",
		"Jadwal pelajaran menempel di Dinding.",
		"jadwal pelajaran menempel di dinding.",
	}, "Bentuk baku adalah jadwal, bukan jadual.", nil),
	Q(
		"ey_b_24",
		3,
		{ "a01", "a02", "boss" },
		P,
		"Kerja sama kelompok dimulai hari ini.",
		{
			"Kerjasama kelompok dimulai hari ini.",
			"Kerja-sama kelompok dimulai hari ini.",
			"kerja sama kelompok dimulai hari ini.",
		},
		"Kerja sama ditulis terpisah, bukan digabung atau diberi tanda hubung.",
		{ Id = "w_kerjasama", Word = "kerja sama", Definition = "Dua kata terpisah, bukan kerjasama." }
	),
	Q(
		"ey_b_25",
		2,
		{ "a01", "a02", "boss" },
		P,
		"Kalimat itu ditulis dengan rapi.",
		{
			"Kalimat itu di tulis dengan rapi.",
			"Kalimat itu di-tulis dengan rapi.",
			"kalimat itu ditulis dengan rapi.",
		},
		"Imbuhan di- dirangkai dengan kata yang mengikutinya.",
		{ Id = "w_ditulis", Word = "ditulis", Definition = "Imbuhan di- digabung: ditulis, dibaca, dijual." }
	),
	Q(
		"ey_b_26",
		2,
		{ "a01", "a02" },
		P,
		"Mereka pergi ke sekolah.",
		{ "Mereka pergi kesekolah.", "Mereka pergi ke Sekolah.", "mereka pergi ke sekolah." },
		"Kata depan ke dipisah. Kesekolah bukan bentuk baku.",
		nil
	),
	Q(
		"ey_b_27",
		2,
		{ "a01", "boss" },
		P,
		"Kami keluar dari kelas.",
		{ "Kami ke luar dari kelas.", "Kami keluar dari Kelas.", "kami keluar dari kelas." },
		"Keluar sebagai kata kerja yang berarti pergi ke luar ditulis serangkai.",
		nil
	),
	Q(
		"ey_b_28",
		1,
		{ "a01", "a02" },
		P,
		"Rani tinggal di Jakarta.",
		{ "Rani tinggal dijakarta.", "Rani tinggal di jakarta.", "rani tinggal di Jakarta." },
		"Kata depan di dipisah, dan nama kota tetap kapital.",
		nil
	),
}
