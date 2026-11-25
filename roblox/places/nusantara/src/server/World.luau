local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local Palette = require(ReplicatedStorage.Shared.Palette)
local Build = require(ServerScriptService:WaitForChild("Kit"):WaitForChild("Build"))

local World = {}

local function marker(parent: Instance, name: string, cframe: CFrame)
	local pad = Build.part(parent, name, Vector3.new(6, 0.4, 6), cframe, Palette.Krem)
	pad.CanTouch = false
	return pad
end

function World.build()
	local folder = Build.folder(Workspace, "Nusantara")

	Build.plate(folder, Vector3.new(0, -2, 0), 90, 90, Palette.Grass, 2)
	Build.water(folder, Vector3.new(0, -0.2, 18), 70, 28)
	Build.boat(folder, CFrame.new(-16, 1.2, 22))
	Build.boat(folder, CFrame.new(18, 1.2, 26) * CFrame.Angles(0, 0.6, 0))
	Build.spawnPad(folder, CFrame.new(0, 3, -8))
	local map = Build.part(
		folder,
		"Peta",
		Vector3.new(10, 1, 10),
		CFrame.new(0, 1, -8) * CFrame.Angles(0, 0, math.rad(90)),
		Palette.Stone,
		Enum.Material.Slate
	)
	map.Shape = Enum.PartType.Cylinder
	map.CanTouch = false
	Build.lamp(folder, Vector3.new(-20, 0, -16))
	Build.lamp(folder, Vector3.new(20, 0, -16))
	local notice =
		Build.part(folder, "PapanDermaga", Vector3.new(12, 4, 0.5), CFrame.new(0, 5, -24), Palette.Plate)
	Build.label(notice, "Delapan wilayah. Dua sudah terbuka.", Enum.NormalId.Front, 16, Palette.Ink)
	Build.label(notice, "Kota Aksara adalah petualangan lain.", Enum.NormalId.Back, 18, Palette.Ink)

	local gates = {}
	local ring = {
		{ Id = "jawa", Label = "Jawa", Open = true, Color = Palette.Teal },
		{ Id = "sumatra", Label = "Sumatra", Open = true, Color = Palette.Kunyit },
		{ Id = "kalimantan", Label = "Kalimantan", Open = false, Color = Palette.Stone },
		{ Id = "sulawesi", Label = "Sulawesi", Open = false, Color = Palette.Stone },
		{ Id = "bali", Label = "Bali", Open = false, Color = Palette.Stone },
		{ Id = "nusa", Label = "Nusa", Open = false, Color = Palette.Stone },
		{ Id = "maluku", Label = "Maluku", Open = false, Color = Palette.Stone },
		{ Id = "papua", Label = "Papua", Open = false, Color = Palette.Stone },
	}
	for index, item in ring do
		local angle = (index - 1) / #ring * math.pi * 2
		local position = Vector3.new(math.cos(angle) * 32, 0, math.sin(angle) * 32 - 8)
		local trigger = Build.arch(folder, CFrame.new(position), item.Color, item.Label)
		local prompt = Build.prompt(trigger, if item.Open then "Masuk" else "Lihat", item.Label)
		prompt:SetAttribute("Gate", item.Id)
		table.insert(gates, prompt)
	end

	-- Gapura Jawa
	Build.plate(folder, Vector3.new(0, -1, -430), 70, 50, Palette.Grass, 2)
	marker(folder, "JawaSpawn", CFrame.new(0, 1, -410))
	Build.tree(folder, Vector3.new(-18, 0, -430), 1.1)
	Build.tree(folder, Vector3.new(16, 0, -448), 0.8)
	Build.rock(folder, Vector3.new(22, 0, -400), 1.2)
	Build.rock(folder, Vector3.new(28, 0, -404), 0.9)
	local leksika =
		Build.part(folder, "Mbok", Vector3.new(2, 4.4, 1.2), CFrame.new(-8, 2.4, -418), Palette.Ungu)
	Build.decor(
		folder,
		"KepalaMbok",
		Vector3.new(1.5, 1.5, 1.5),
		CFrame.new(-8, 5.3, -418),
		Palette.Krem,
		Enum.PartType.Ball
	)
	local jawaSign =
		Build.part(folder, "PapanJawa", Vector3.new(12, 4, 0.5), CFrame.new(0, 5, -446), Palette.Plate)
	Build.label(
		jawaSign,
		"Bahasa daerah sah. Tulisan resmi punya kaidah.",
		Enum.NormalId.Front,
		18,
		Palette.Ink
	)
	local jurusPad = Build.part(folder, "Jurus", Vector3.new(8, 1, 8), CFrame.new(10, 1, -422), Palette.Ungu)
	Build.label(jurusPad, "Jurus", Enum.NormalId.Top, 16, Palette.Krem)
	local backJawa =
		Build.part(folder, "PulangJawa", Vector3.new(6, 5, 1), CFrame.new(-20, 2.6, -400), Palette.Navy)
	Build.label(backJawa, "Dermaga", Enum.NormalId.Front, 18, Palette.Krem)
	local secretJawa = Build.part(
		folder,
		"PrasastiJawa",
		Vector3.new(3, 4, 1),
		CFrame.new(26, 2.2, -408),
		Palette.Kunyit,
		Enum.Material.Slate
	)
	Build.label(secretJawa, "Prasasti", Enum.NormalId.Front, 16, Palette.Ink)

	-- Pesisir Sumatra
	Build.plate(folder, Vector3.new(430, -1, 0), 60, 46, Palette.Grass, 2)
	Build.water(folder, Vector3.new(430, -0.4, 20), 40, 12)
	marker(folder, "SumatraSpawn", CFrame.new(430, 1, -6))
	local house = Build.part(
		folder,
		"RumahPanggung",
		Vector3.new(10, 4, 8),
		CFrame.new(418, 4, -4),
		Palette.Wood,
		Enum.Material.Wood
	)
	house.CanTouch = false
	local stilts = Build.part(
		folder,
		"TiangRumah",
		Vector3.new(8, 3, 6),
		CFrame.new(418, 1.5, -4),
		Palette.WoodDark,
		Enum.Material.Wood
	)
	stilts.CanTouch = false
	local roof = Build.part(folder, "Atap", Vector3.new(12, 2, 10), CFrame.new(418, 7, -4), Palette.Awning)
	roof.CanTouch = false
	local cik = Build.part(folder, "Cik", Vector3.new(2, 4.4, 1.2), CFrame.new(440, 2.4, -2), Palette.Teal)
	Build.decor(
		folder,
		"KepalaCik",
		Vector3.new(1.5, 1.5, 1.5),
		CFrame.new(440, 5.3, -2),
		Palette.Krem,
		Enum.PartType.Ball
	)
	local secretSumatra = Build.part(
		folder,
		"PrasastiSumatra",
		Vector3.new(3, 3.5, 1),
		CFrame.new(412, 2, 8),
		Palette.Kunyit,
		Enum.Material.Slate
	)
	Build.label(secretSumatra, "Naskah", Enum.NormalId.Front, 18, Palette.Ink)
	local backSumatra =
		Build.part(folder, "PulangSumatra", Vector3.new(6, 5, 1), CFrame.new(450, 2.6, -8), Palette.Navy)
	Build.label(backSumatra, "Dermaga", Enum.NormalId.Front, 18, Palette.Krem)

	-- Arena Penjaga Makna
	Build.plate(folder, Vector3.new(0, -1, -830), 64, 64, Palette.Stone, 2)
	marker(folder, "BossSpawn", CFrame.new(0, 1, -800))
	local pena = Build.part(
		folder,
		"Pena",
		Vector3.new(1.2, 2, 1.2),
		CFrame.new(0, 2, -830),
		Palette.Kunyit,
		Enum.Material.Neon
	)
	local orbs = {}
	for index = 1, 3 do
		local orb = Build.part(
			folder,
			"Kabut",
			Vector3.new(3.2, 3.2, 3.2),
			CFrame.new(12, 3, -830),
			Palette.Ungu,
			Enum.Material.Neon,
			Enum.PartType.Ball
		)
		orb.CanCollide = false
		orb.CanTouch = true
		orb.CastShadow = false
		orbs[index] = orb
	end
	local bossSign =
		Build.part(folder, "PapanBos", Vector3.new(14, 4, 0.5), CFrame.new(0, 6, -856), Palette.Navy)
	Build.label(bossSign, "Penjaga Makna", Enum.NormalId.Front, 18, Palette.Krem)
	Build.label(bossSign, "Bukan musuh bahasa daerah.", Enum.NormalId.Back, 18, Palette.Krem)
	local backBoss =
		Build.part(folder, "PulangBos", Vector3.new(6, 5, 1), CFrame.new(-22, 2.6, -800), Palette.Navy)
	Build.label(backBoss, "Dermaga", Enum.NormalId.Front, 18, Palette.Krem)
	local toBoss =
		Build.part(folder, "KePenjaga", Vector3.new(8, 6, 1.2), CFrame.new(0, 3, -458), Palette.Koral)
	Build.label(toBoss, "Penjaga Makna", Enum.NormalId.Front, 18, Palette.Ink)

	return {
		gates = gates,
		jawaTalk = Build.prompt(leksika, "Sapa", "Mbok Leksika"),
		jawaQuiz = Build.prompt(jawaSign, "Mulai", "Kuis Jawa"),
		jawaJurus = Build.prompt(jurusPad, "Mulai", "Jurus Kata"),
		secretJawa = Build.prompt(secretJawa, "Baca", "Prasasti"),
		sumatraTalk = Build.prompt(cik, "Sapa", "Cik Malaya"),
		secretSumatra = Build.prompt(secretSumatra, "Baca", "Naskah"),
		boss = Build.prompt(bossSign, "Hadapi", "Penjaga Makna"),
		toBoss = Build.prompt(toBoss, "Masuk", "Penjaga Makna"),
		backJawa = Build.prompt(backJawa, "Kembali", "Dermaga"),
		backSumatra = Build.prompt(backSumatra, "Kembali", "Dermaga"),
		backBoss = Build.prompt(backBoss, "Kembali", "Dermaga"),
		pena = pena,
		orbs = orbs,
	}
end

return World
