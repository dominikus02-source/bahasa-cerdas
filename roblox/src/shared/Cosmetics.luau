-- Toko memakai Koin Aksara. Tidak ada harga Robux.
local Cosmetics = {
	{
		Id = "trail_kunyit",
		Slot = "trail",
		Name = "Jejak Kunyit",
		Price = 80,
		Description = "Kilau kuning mengikuti langkahmu.",
	},
	{
		Id = "trail_teal",
		Slot = "trail",
		Name = "Jejak Aksara",
		Price = 80,
		Description = "Jejak teal seperti tinta pena.",
	},
	{
		Id = "aura_pena",
		Slot = "aura",
		Name = "Aura Pena",
		Price = 150,
		Description = "Cahaya lembut di sekelilingmu.",
	},
	{
		Id = "title_juru",
		Slot = "title",
		Name = "Juru Ejaan",
		Price = 200,
		Title = "Juru Ejaan",
		Description = "Gelar yang tampil di atas kepalamu.",
	},
	{
		Id = "pet_kunang",
		Slot = "pet",
		Name = "Kunang Huruf",
		Price = 300,
		Description = "Kunang-kunang kecil yang menemanimu.",
	},
	{
		Id = "title_muda",
		Slot = "title",
		Name = "Penjaga Muda",
		Price = 0,
		Title = "Penjaga Muda",
		Description = "Gelar awal para penjaga baru.",
		Hidden = true,
	},
	{
		Id = "title_rajin",
		Slot = "title",
		Name = "Rajin Aksara",
		Price = 0,
		Title = "Rajin Aksara",
		Description = "Hadiah masuk hari ketujuh.",
		Hidden = true,
	},
}

local byId = {}
for _, item in Cosmetics do
	byId[item.Id] = item
end

return {
	List = Cosmetics,
	ById = byId,
}
