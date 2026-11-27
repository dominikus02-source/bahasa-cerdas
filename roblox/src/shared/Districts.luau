-- Enam distrik. Hanya Pasar Ejaan yang bisa dimasuki pada MVP.
local Districts = {
	{
		Id = "pasar",
		Name = "Pasar Ejaan",
		Skill = "EYD V",
		Stars = 0,
		Open = true,
		Blurb = "Huruf kapital, tanda baca, dan kata baku.",
		Color = "Teal",
	},
	{
		Id = "hutan",
		Name = "Hutan Kosakata",
		Skill = "Makna kata",
		Stars = 4,
		Open = false,
		Blurb = "Sinonim, antonim, dan bentuk kata.",
		Color = "Leaf",
	},
	{
		Id = "pelabuhan",
		Name = "Pelabuhan Kalimat",
		Skill = "Kalimat",
		Stars = 9,
		Open = false,
		Blurb = "Kalimat efektif, SPOK, dan konjungsi.",
		Color = "Water",
	},
	{
		Id = "perpustakaan",
		Name = "Perpustakaan Labirin",
		Skill = "Membaca",
		Stars = 15,
		Open = false,
		Blurb = "Ide pokok dan simpulan.",
		Color = "Wood",
	},
	{
		Id = "panggung",
		Name = "Panggung Pantun",
		Skill = "Sastra",
		Stars = 22,
		Open = false,
		Blurb = "Rima, puisi, dan majas.",
		Color = "Koral",
	},
	{
		Id = "menara",
		Name = "Menara UKBI",
		Skill = "Campuran",
		Stars = 30,
		Open = false,
		Blurb = "Ujian akhir melawan Si Galat.",
		Color = "Ungu",
	},
}

return Districts
