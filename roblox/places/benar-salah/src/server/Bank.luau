-- Bank dinilai di server. Klien tidak pernah menerima Truth.
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

	Q(
		"bs_01",
		1,
		true,
		"Nama hari Senin ditulis dengan huruf kapital.",
		"EYD V menulis nama hari dengan huruf kapital.",
		{ Id = "c_bs_01", Word = "Senin", Definition = "Nama hari diawali huruf kapital." }
	),
	Q(
		"bs_02",
		1,
		false,
		"Penulisan saya tinggal di jakarta sudah tepat untuk awal kalimat.",
		"Awal kalimat dan nama kota memakai huruf kapital: Saya tinggal di Jakarta.",
		nil
	),
	Q(
		"bs_03",
		1,
		true,
		"Kata depan pada di rumah ditulis terpisah.",
		"di sebagai kata depan dipisah dari kata yang mengikutinya.",
		{ Id = "c_bs_03", Word = "di", Definition = "Kata depan di, ke, dan dari ditulis terpisah." }
	),
	Q(
		"bs_04",
		1,
		false,
		"Bentuk dirumah adalah penulisan kata depan yang tepat.",
		"Kata depan tidak digabung. Tulis di rumah.",
		nil
	),
	Q(
		"bs_05",
		1,
		true,
		"Kalimat tanya diakhiri tanda tanya.",
		"Tanda tanya menutup kalimat yang menanyakan sesuatu.",
		nil
	),
	Q(
		"bs_06",
		1,
		false,
		"Kalimat berita diakhiri tanda seru.",
		"Kalimat berita biasa diakhiri titik, bukan tanda seru.",
		nil
	),
	Q(
		"bs_07",
		1,
		true,
		"Bentuk baku tempat penjualan obat adalah apotek.",
		"KBBI menganjurkan apotek, bukan apotik.",
		{ Id = "c_bs_07", Word = "apotek", Definition = "Bentuk baku untuk tempat obat." }
	),
	Q(
		"bs_08",
		1,
		false,
		"Praktek dokter adalah bentuk baku.",
		"Bentuk baku yang diajarkan adalah praktik.",
		{ Id = "c_bs_08", Word = "praktik", Definition = "Bukan praktek." }
	),
	Q(
		"bs_09",
		1,
		true,
		"Mengubah adalah bentuk baku.",
		"Awalan me- pada ubah menjadi mengubah, bukan merubah.",
		{ Id = "c_bs_09", Word = "mengubah", Definition = "Bentuk baku dari ubah." }
	),
	Q("bs_10", 1, false, "Merubah warna adalah bentuk baku.", "Bentuk yang tepat ialah mengubah warna.", nil),
	Q(
		"bs_11",
		1,
		true,
		"Nama bulan Mei ditulis dengan huruf kapital.",
		"Nama bulan termasuk nama diri yang dikapital.",
		{ Id = "c_bs_11", Word = "Mei", Definition = "Nama bulan diawali huruf kapital." }
	),
	Q(
		"bs_12",
		1,
		false,
		"bulan mei sudah tepat sebagai awal kalimat.",
		"Awal kalimat dan nama bulan dikapital: Mei.",
		nil
	),
	Q(
		"bs_13",
		1,
		true,
		"Di tengah kalimat, bahasa Indonesia menulis kata bahasa dengan huruf kecil.",
		"Yang dikapital adalah nama bahasanya, yaitu Indonesia.",
		{ Id = "c_bs_13", Word = "Indonesia", Definition = "Nama bahasa dikapital, kata bahasa tidak." }
	),
	Q(
		"bs_14",
		1,
		false,
		"Bahasa indonesia tepat dipakai di tengah kalimat.",
		"Huruf i pada Indonesia harus kapital.",
		nil
	),
	Q(
		"bs_15",
		1,
		true,
		"Bentuk baku untuk kemungkinan buruk adalah risiko.",
		"KBBI menganjurkan risiko, bukan resiko.",
		{ Id = "c_bs_15", Word = "risiko", Definition = "Bukan resiko." }
	),
	Q("bs_16", 1, false, "Resiko gagal adalah bentuk baku.", "Tulis risiko gagal.", nil),
	Q(
		"bs_17",
		1,
		true,
		"Telepon adalah bentuk baku.",
		"Bukan tilpun atau telpon dalam ejaan yang dianjurkan di sekolah.",
		{ Id = "c_bs_17", Word = "telepon", Definition = "Ejaan baku alat komunikasi itu." }
	),
	Q(
		"bs_18",
		1,
		false,
		"Analisa data adalah bentuk baku.",
		"Bentuk baku ialah analisis data.",
		{ Id = "c_bs_18", Word = "analisis", Definition = "Bukan analisa." }
	),
	Q(
		"bs_19",
		1,
		true,
		"Imbuhan di- pada kata kerja ditulis digabung, seperti ditulis.",
		"di- sebagai imbuhan tidak diberi spasi.",
		nil
	),
	Q(
		"bs_20",
		1,
		false,
		"di tulis dengan spasi adalah imbuhan yang tepat.",
		"Imbuhan digabung: ditulis.",
		nil
	),
	Q(
		"bs_21",
		2,
		true,
		"Sekadar adalah bentuk baku.",
		"Bukan sekedar.",
		{ Id = "c_bs_21", Word = "sekadar", Definition = "Bentuk baku yang diajarkan di sekolah." }
	),
	Q("bs_22", 2, false, "Sekedar tahu adalah bentuk baku.", "Tulis sekadar tahu.", nil),
	Q(
		"bs_23",
		2,
		true,
		"Antre adalah bentuk baku untuk menunggu giliran.",
		"Bahan ajar EYD menganjurkan antre, bukan antri.",
		{ Id = "c_bs_23", Word = "antre", Definition = "Menunggu giliran." }
	),
	Q("bs_24", 2, false, "Antri tiket adalah bentuk baku.", "Bentuk yang dianjurkan ialah antre tiket.", nil),
	Q(
		"bs_25",
		2,
		true,
		"Memengaruhi adalah bentuk baku.",
		"P pada pengaruh luluh: memengaruhi.",
		{ Id = "c_bs_25", Word = "memengaruhi", Definition = "Bukan mempengaruhi." }
	),
	Q("bs_26", 2, false, "Mempengaruhi keputusan adalah bentuk baku.", "Tulis memengaruhi keputusan.", nil),
	Q(
		"bs_27",
		2,
		true,
		"Konkret adalah bentuk baku.",
		"Bukan konkrit.",
		{ Id = "c_bs_27", Word = "konkret", Definition = "Nyata, bukan konkrit." }
	),
	Q(
		"bs_28",
		2,
		false,
		"Sistim komputer adalah bentuk baku.",
		"Bentuk baku ialah sistem.",
		{ Id = "c_bs_28", Word = "sistem", Definition = "Bukan sistim." }
	),
	Q(
		"bs_29",
		2,
		true,
		"Kualitas adalah bentuk baku.",
		"Bukan kwalitas.",
		{ Id = "c_bs_29", Word = "kualitas", Definition = "Mutu. Bukan kwalitas." }
	),
	Q(
		"bs_30",
		2,
		false,
		"Ijin masuk adalah bentuk baku.",
		"Bentuk baku ialah izin masuk.",
		{ Id = "c_bs_30", Word = "izin", Definition = "Bukan ijin." }
	),
	Q(
		"bs_31",
		2,
		true,
		"Utang adalah bentuk yang dianjurkan KBBI.",
		"Utang lebih dianjurkan daripada hutang.",
		{ Id = "c_bs_31", Word = "utang", Definition = "Kewajiban membayar." }
	),
	Q(
		"bs_32",
		2,
		false,
		"Hakekat masalah adalah bentuk baku.",
		"Tulis hakikat masalah.",
		{ Id = "c_bs_32", Word = "hakikat", Definition = "Inti. Bukan hakekat." }
	),
	Q(
		"bs_33",
		2,
		true,
		"Jenderal adalah bentuk baku.",
		"Bukan jendral.",
		{ Id = "c_bs_33", Word = "jenderal", Definition = "Pangkat. Bukan jendral." }
	),
	Q(
		"bs_34",
		2,
		false,
		"Komplek perumahan adalah bentuk baku untuk kawasan.",
		"Untuk kawasan, tulis kompleks.",
		{ Id = "c_bs_34", Word = "kompleks", Definition = "Bukan komplek untuk kawasan." }
	),
	Q(
		"bs_35",
		2,
		true,
		"Nama orang ditulis dengan huruf kapital.",
		"Nama diri orang dikapital pada setiap unsurnya.",
		nil
	),
	Q(
		"bs_36",
		2,
		false,
		"Kata presiden tanpa nama selalu ditulis huruf kapital.",
		"Jabatan umum tidak dikapital. Kapital jika diikuti nama orang.",
		nil
	),
	Q(
		"bs_37",
		2,
		true,
		"Presiden Soekarno menulis jabatan yang diikuti nama dengan huruf kapital.",
		"Jabatan plus nama diri dikapital.",
		nil
	),
	Q(
		"bs_38",
		2,
		false,
		"Tanda koma diletakkan sesudah spasi.",
		"Koma menempel pada kata sebelumnya, lalu spasi.",
		nil
	),
	Q(
		"bs_39",
		2,
		true,
		"Sapaan Ayah sebagai pengganti nama ditulis dengan huruf kapital.",
		"Kata sapaan yang dipakai sebagai nama dikapital.",
		nil
	),
	Q(
		"bs_40",
		2,
		false,
		"Para siswa harus ditulis Para Siswa di tengah kalimat.",
		"Itu bukan nama diri, jadi tidak dikapital.",
		nil
	),
	Q(
		"bs_41",
		2,
		true,
		"Kalimat perintah dapat diakhiri tanda seru.",
		"Tanda seru dipakai untuk perintah atau seruan yang keras.",
		nil
	),
	Q("bs_42", 2, false, "Setiap judul buku diakhiri tanda titik.", "Judul tidak diakhiri titik.", nil),
	Q(
		"bs_43",
		2,
		true,
		"Ke sekolah sebagai arah ditulis terpisah.",
		"ke adalah kata depan, sama seperti di dan dari.",
		nil
	),
	Q("bs_44", 2, false, "Kesekolah adalah penulisan kata depan yang tepat.", "Tulis ke sekolah.", nil),
	Q(
		"bs_45",
		2,
		true,
		"Adapun ditulis serangkai.",
		"Bentuk pun yang sudah padu, termasuk adapun, ditulis serangkai.",
		nil
	),
	Q(
		"bs_46",
		2,
		false,
		"Buku pun harus digabung menjadi bukupun.",
		"pun yang berarti juga dipisah: buku pun.",
		nil
	),
	Q("bs_47", 2, true, "Meskipun ditulis serangkai.", "meskipun termasuk bentuk yang tidak dipisah.", nil),
	Q(
		"bs_48",
		2,
		false,
		"Abad ke 21 tanpa tanda hubung sudah tepat.",
		"Urutan bilangan memakai tanda hubung: abad ke-21.",
		nil
	),
	Q(
		"bs_49",
		2,
		true,
		"Abad ke-21 memakai tanda hubung.",
		"ke- pada bilangan diikuti hubung lalu angka.",
		nil
	),
	Q("bs_50", 2, false, "di ubah memisahkan imbuhan dengan benar.", "Imbuhan di- digabung: diubah.", nil),
	Q(
		"bs_51",
		3,
		true,
		"Standar adalah bentuk baku, bukan standard.",
		"standard adalah ejaan bahasa Inggris.",
		{ Id = "c_bs_51", Word = "standar", Definition = "Ukuran yang disepakati." }
	),
	Q(
		"bs_52",
		3,
		false,
		"Metoda penelitian adalah bentuk baku.",
		"Bentuk baku ialah metode penelitian.",
		{ Id = "c_bs_52", Word = "metode", Definition = "Cara yang teratur. Bukan metoda." }
	),
	Q(
		"bs_53",
		3,
		true,
		"Respons adalah bentuk yang dianjurkan.",
		"KBBI mengutamakan respons, bukan respon.",
		{ Id = "c_bs_53", Word = "respons", Definition = "Tanggapan." }
	),
	Q(
		"bs_54",
		3,
		false,
		"Aktifitas harian adalah bentuk baku.",
		"Tulis aktivitas harian.",
		{ Id = "c_bs_54", Word = "aktivitas", Definition = "Kegiatan. Bukan aktifitas." }
	),
	Q(
		"bs_55",
		3,
		true,
		"Objek adalah bentuk baku.",
		"Bukan obyek.",
		{ Id = "c_bs_55", Word = "objek", Definition = "Benda atau sasaran. Bukan obyek." }
	),
	Q("bs_56", 3, false, "Obyek penelitian adalah bentuk baku.", "Tulis objek penelitian.", nil),
	Q(
		"bs_57",
		3,
		true,
		"Huruf pertama petikan langsung ditulis kapital.",
		"Kalimat di dalam petikan mulai dengan huruf kapital.",
		nil
	),
	Q(
		"bs_58",
		3,
		false,
		"Petikan langsung tidak perlu huruf kapital.",
		"Awal kalimat petikan tetap dikapital.",
		nil
	),
	Q("bs_59", 3, true, "Singkatan dll. memakai titik.", "dan lain-lain disingkat dll.", nil),
	Q(
		"bs_60",
		3,
		false,
		"Lambang sentimeter ditulis cm. dengan titik.",
		"Lambang satuan tidak diberi titik: cm.",
		nil
	),
	Q(
		"bs_61",
		3,
		true,
		"Lambang cm tidak diakhiri titik.",
		"Titik hanya jika lambang itu mengakhiri kalimat.",
		nil
	),
	Q(
		"bs_62",
		3,
		true,
		"Jawa Barat memakai huruf kapital pada kedua katanya.",
		"Nama geografi dikapital pada tiap unsurnya.",
		nil
	),
	Q(
		"bs_63",
		3,
		false,
		"jawa barat tepat untuk nama provinsi di tengah kalimat.",
		"Kedua kata nama provinsi dikapital.",
		nil
	),
	Q(
		"bs_64",
		3,
		true,
		"Sumpah Pemuda sebagai nama peristiwa ditulis dengan huruf kapital.",
		"Nama peristiwa sejarah dikapital.",
		{ Id = "c_bs_64", Word = "Sumpah Pemuda", Definition = "Ikrar 28 Oktober 1928." }
	),
	Q(
		"bs_65",
		3,
		false,
		"laki laki tanpa tanda hubung sudah tepat.",
		"Kata ulang utuh memakai tanda hubung: laki-laki.",
		nil
	),
	Q("bs_66", 3, true, "laki-laki memakai tanda hubung.", "Ulangan penuh ditulis dengan hubung.", nil),
	Q(
		"bs_67",
		3,
		false,
		"berlari lari harus tanpa tanda hubung.",
		"Ulangan yang berimbuhan tetap berhubung: berlari-lari.",
		nil
	),
	Q(
		"bs_68",
		3,
		true,
		"Para murid mereka membaca bukan kalimat efektif.",
		"Subjeknya ganda. Cukup para murid membaca, atau mereka membaca.",
		nil
	),
	Q("bs_69", 3, false, "Para murid mereka membaca adalah kalimat efektif.", "Pilih satu subjek saja.", nil),
	Q(
		"bs_70",
		3,
		true,
		"Pasangan yang sejajar ialah tidak hanya ..., tetapi juga ...",
		"Bentuk korelatif itu dipakai bersama, bukan dicampur dengan pasangan lain.",
		nil
	),
	Q(
		"bs_71",
		3,
		false,
		"Antara buku dengan pensil adalah pasangan baku.",
		"Pasangan bakunya ialah antara ... dan ...",
		nil
	),
	Q("bs_72", 3, true, "Antara buku dan pensil memakai kata dan.", "antara berpasangan dengan dan.", nil),
	Q(
		"bs_73",
		3,
		false,
		"Silahkan masuk adalah bentuk baku.",
		"Bentuk baku ialah silakan masuk.",
		{ Id = "c_bs_73", Word = "silakan", Definition = "Bukan silahkan." }
	),
	Q(
		"bs_74",
		3,
		true,
		"Silakan masuk adalah bentuk baku.",
		"Huruf h itu tidak dipakai pada bentuk baku ini.",
		nil
	),
	Q(
		"bs_75",
		3,
		false,
		"dimana ditulis serangkai untuk menanyakan tempat.",
		"Untuk menanyakan tempat, tulis di mana, terpisah.",
		nil
	),
	Q(
		"bs_76",
		3,
		true,
		"di mana untuk menanyakan tempat ditulis terpisah.",
		"di adalah kata depan, mana adalah kata tanya.",
		nil
	),
	Q("bs_77", 3, false, "karna adalah bentuk baku dari karena.", "Bentuk baku ialah karena.", nil),
	Q(
		"bs_78",
		3,
		true,
		"karena adalah bentuk baku.",
		"Bukan karna.",
		{ Id = "c_bs_78", Word = "karena", Definition = "Kata penghubung sebab." }
	),
	Q("bs_79", 3, false, "tau adalah bentuk baku dari tahu.", "Dalam kalimat, tulis tahu.", nil),
	Q("bs_80", 3, true, "tahu adalah bentuk baku untuk mengetahui.", "Bukan tau.", nil),
}
