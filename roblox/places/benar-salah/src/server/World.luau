local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local Palette = require(ReplicatedStorage.Shared.Palette)
local Build = require(ServerScriptService:WaitForChild("Kit"):WaitForChild("Build"))

local World = {}

function World.build()
	local folder = Build.folder(Workspace, "LapanganPutusan")
	Build.plate(folder, Vector3.new(0, -1, 0), 130, 110, Palette.Grass, 2)
	local path = Build.part(
		folder,
		"Jalan",
		Vector3.new(14, 0.4, 70),
		CFrame.new(0, 0.2, 6),
		Palette.Krem,
		Enum.Material.SmoothPlastic
	)
	path.CanTouch = false
	Build.spawnPad(folder, CFrame.new(0, 1.2, 42))
	local board = Build.board(folder, CFrame.new(0, 0, -34), Palette.Plate)
	Build.label(board, "Pernyataan ada di papan ini dan di kartu atas.", Enum.NormalId.Front, 16, Palette.Ink)
	Build.label(board, "Pernyataan ada di papan ini dan di kartu atas.", Enum.NormalId.Back, 16, Palette.Ink)

	local benar = Build.arch(folder, CFrame.new(-18, 0, -8), Palette.Teal, "Benar")
	benar:SetAttribute("Choice", "benar")
	local salah = Build.arch(folder, CFrame.new(18, 0, -8), Palette.Koral, "Salah")
	salah:SetAttribute("Choice", "salah")

	for _, spot in
		{ Vector3.new(-40, 0, 20), Vector3.new(40, 0, 20), Vector3.new(-36, 0, -30), Vector3.new(36, 0, -30) }
	do
		Build.tree(folder, spot, 1)
		Build.lamp(folder, spot + Vector3.new(6, 0, 4))
	end
	Build.rock(folder, Vector3.new(-28, 0, 36), 0.8)
	Build.rock(folder, Vector3.new(30, 0, 34), 0.7)

	local home = Build.part(folder, "Pulang", Vector3.new(10, 8, 2), CFrame.new(0, 4, 52), Palette.Navy)
	Build.label(home, "Alun-Alun", Enum.NormalId.Front, 18, Palette.Krem)
	Build.label(home, "Alun-Alun", Enum.NormalId.Back, 18, Palette.Krem)
	local homePrompt = Build.prompt(home, "Pulang", "Alun-Alun")

	local santai = Build.part(folder, "Santai", Vector3.new(8, 1, 8), CFrame.new(-14, 1, 28), Palette.Teal)
	Build.label(santai, "Santai", Enum.NormalId.Top, 16, Palette.Ink)
	local santaiPrompt = Build.prompt(santai, "Main", "Mode Santai")

	local tantang =
		Build.part(folder, "Tantangan", Vector3.new(8, 1, 8), CFrame.new(14, 1, 28), Palette.Kunyit)
	Build.label(tantang, "Tantangan", Enum.NormalId.Top, 16, Palette.Ink)
	local tantangPrompt = Build.prompt(tantang, "Main", "Mode Tantangan")

	local npc =
		Build.part(folder, "PakPutusan", Vector3.new(2.2, 4.5, 1.4), CFrame.new(-24, 2.4, 18), Palette.Wood)
	local head = Build.decor(
		folder,
		"KepalaPutusan",
		Vector3.new(1.6, 1.6, 1.6),
		CFrame.new(-24, 5.4, 18),
		Palette.Krem,
		Enum.PartType.Ball
	)
	head.CanCollide = false
	local npcPrompt = Build.prompt(npc, "Sapa", "Pak Putusan")

	local low = Build.part(
		folder,
		"Pagar",
		Vector3.new(80, 2, 1),
		CFrame.new(0, 1, -48),
		Palette.WoodDark,
		Enum.Material.Wood
	)
	low.CanTouch = false
	Build.sky(15.5)
	Build.kampung(folder, Vector3.new(0, 0, 6), "putusan")

	return {
		board = board,
		benar = benar,
		salah = salah,
		home = homePrompt,
		santai = santaiPrompt,
		tantang = tantangPrompt,
		npc = npcPrompt,
		spawn = spawn,
	}
end

return World
