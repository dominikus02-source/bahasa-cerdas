local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local Palette = require(ReplicatedStorage.Shared.Palette)
local Build = require(ServerScriptService:WaitForChild("Kit"):WaitForChild("Build"))

local World = {}

function World.build()
	local folder = Build.folder(Workspace, "BengkelAksara")
	Build.plate(folder, Vector3.new(0, -1, 0), 120, 90, Palette.Wood, 2)
	local yard = Build.part(
		folder,
		"Halaman",
		Vector3.new(70, 0.3, 50),
		CFrame.new(0, 0.2, 0),
		Palette.Stone,
		Enum.Material.Cobblestone
	)
	yard.CanTouch = false
	Build.spawnPad(folder, CFrame.new(0, 1.2, 32))

	for index = 1, 6 do
		local slot = Build.part(
			folder,
			"Alur",
			Vector3.new(4, 0.5, 4),
			CFrame.new(-14 + (index - 1) * 5.2, 0.6, -6),
			Palette.Krem
		)
		slot.CanTouch = false
		local lamp = Build.decor(
			folder,
			"Titik",
			Vector3.new(0.6, 0.6, 0.6),
			CFrame.new(-14 + (index - 1) * 5.2, 1.3, -6),
			Palette.Ungu,
			Enum.PartType.Ball
		)
		lamp.Material = Enum.Material.Neon
	end

	for index = 1, 8 do
		local block = Build.decor(
			folder,
			"Rak",
			Vector3.new(2.2, 2.2, 2.2),
			CFrame.new(-18 + (index - 1) * 5, 2.2, -22),
			if index % 2 == 0 then Palette.Kunyit else Palette.Teal
		)
		block.Material = Enum.Material.Wood
	end
	local shelf = Build.part(
		folder,
		"Meja",
		Vector3.new(42, 1, 4),
		CFrame.new(0, 0.8, -22),
		Palette.WoodDark,
		Enum.Material.Wood
	)
	shelf.CanTouch = false

	local sign = Build.part(folder, "Papan", Vector3.new(14, 5, 0.6), CFrame.new(0, 6, -30), Palette.Plate)
	Build.label(sign, "Susun balok, lalu kunci.", Enum.NormalId.Front, 28, Palette.Ink)
	Build.label(sign, "Susun balok, lalu kunci.", Enum.NormalId.Back, 28, Palette.Ink)

	Build.lamp(folder, Vector3.new(-28, 0, 10))
	Build.lamp(folder, Vector3.new(28, 0, 10))
	Build.tree(folder, Vector3.new(-40, 0, -10), 0.9)
	Build.tree(folder, Vector3.new(40, 0, -8), 0.9)

	local home = Build.part(folder, "Pulang", Vector3.new(10, 7, 2), CFrame.new(0, 3.5, 40), Palette.Navy)
	Build.label(home, "Alun-Alun", Enum.NormalId.Front, 28, Palette.Krem)
	Build.label(home, "Alun-Alun", Enum.NormalId.Back, 28, Palette.Krem)

	local huruf = Build.part(folder, "Huruf", Vector3.new(9, 1, 8), CFrame.new(-12, 1, 18), Palette.Teal)
	Build.label(huruf, "Huruf", Enum.NormalId.Top, 22, Palette.Ink)
	local kalimat = Build.part(folder, "Kalimat", Vector3.new(9, 1, 8), CFrame.new(12, 1, 18), Palette.Kunyit)
	Build.label(kalimat, "Kalimat", Enum.NormalId.Top, 22, Palette.Ink)
	local waktu = Build.part(folder, "Waktu", Vector3.new(8, 1, 6), CFrame.new(0, 1, 18), Palette.Koral)
	Build.label(waktu, "Waktu", Enum.NormalId.Top, 18, Palette.Ink)

	local npc =
		Build.part(folder, "MakBengkel", Vector3.new(2, 4.4, 1.3), CFrame.new(-22, 2.3, 8), Palette.LeafDark)
	Build.decor(
		folder,
		"KepalaMak",
		Vector3.new(1.5, 1.5, 1.5),
		CFrame.new(-22, 5.2, 8),
		Palette.Krem,
		Enum.PartType.Ball
	)

	return {
		home = Build.prompt(home, "Pulang", "Alun-Alun"),
		huruf = Build.prompt(huruf, "Main", "Susun Huruf"),
		kalimat = Build.prompt(kalimat, "Main", "Susun Kalimat"),
		waktu = Build.prompt(waktu, "Waktu", "Mode Tantangan"),
		npc = Build.prompt(npc, "Sapa", "Mak Bengkel"),
	}
end

return World
