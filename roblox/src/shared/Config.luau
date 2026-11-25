-- Angka yang boleh dilihat klien. Alamat web dan nama secret hanya ada di server.
local Config = {
	UniverseId = 10778759021,
	LobbyPlaceId = 83804286143888,
	-- 0 artinya Pasar Ejaan masih di dalam place lobi. Isi setelah pemilik membuat place baru.
	PasarPlaceId = 0,
	GroupId = 741001776,
	WalkSpeed = 18,
	MinAnswerSeconds = 0.55,
	QaMode = false,
	Legacy = {
		BenarSalah = 94365112072969,
		SusunKata = 137487012250171,
		Nusantara = 135622689114243,
	},
	DataStore = "PlayerData_v1",
	OrderedPrefix = "WeeklyStars_",
	LockSeconds = 120,
	Sounds = {
		Correct = "rbxasset://sounds/electronicpingshort.wav",
		Wrong = "rbxasset://sounds/hit.wav",
		Reward = "rbxasset://sounds/victory.wav",
		Click = "rbxasset://sounds/switch.wav",
	},
	Timer = {
		[1] = 10,
		[2] = 8,
		[3] = 6,
	},
	Lanes = {
		tutorial = 2,
		a01 = 6,
		a02 = 6,
		boss = 4,
		setor = 3,
	},
}

return Config
