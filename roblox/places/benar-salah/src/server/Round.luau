local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Shared.Config)
local Palette = require(ReplicatedStorage.Shared.Palette)
local BahasaApi = require(ServerScriptService.Kernel.BahasaApi)
local Gate = require(ServerScriptService.Kernel.Gate)
local Picker = require(ServerScriptService.Kernel.Picker)
local Progress = require(ServerScriptService.Kernel.Progress)
local Remotes = require(ServerScriptService.Kernel.Remotes)
local Shell = require(ServerScriptService.Kernel.Shell)
local Bank = require(script.Parent.Bank)

local Round = {}

local rounds = {}
local ROUND_SIZE = 5

local function starsFor(mode: string, correct: number, elapsed: number): number
	local ratio = correct / ROUND_SIZE
	if mode == "tantangan" then
		local fast = elapsed <= ROUND_SIZE * 9
		if ratio >= 0.9 and fast then
			return 3
		end
		if ratio >= 0.75 then
			return 2
		end
		if ratio >= 0.5 then
			return 1
		end
		return 0
	end
	if ratio >= 0.85 then
		return 2
	end
	if ratio >= 0.5 then
		return 1
	end
	return 0
end

local function paintBoard(text: string)
	local world = Round._world
	if not world then
		return
	end
	local board = world.board
	for _, child in board:GetChildren() do
		if child:IsA("SurfaceGui") and child.Name == "Soal" then
			child:Destroy()
		end
	end
	for _, face in { Enum.NormalId.Front, Enum.NormalId.Back } do
		local gui = Instance.new("SurfaceGui")
		gui.Name = "Soal"
		gui.Face = face
		gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		gui.PixelsPerStud = 22
		gui.Parent = board
	end
	for _, child in board:GetChildren() do
		if child:IsA("SurfaceGui") and child.Name == "Soal" then
			local label = Instance.new("TextLabel")
			label.BackgroundColor3 = Palette.Plate
			label.Size = UDim2.fromScale(1, 1)
			label.Font = Enum.Font.Gotham
			label.Text = text
			label.TextColor3 = Color3.fromRGB(42, 46, 54)
			label.TextSize = 14
			label.TextWrapped = false
			label.TextStrokeTransparency = 1
			label.RichText = false
			label.TextTruncate = Enum.TextTruncate.AtEnd
			label.AutoLocalize = false
			label.Parent = child
		end
	end
end

local function show(player: Player, round)
	local item = round.items[round.index]
	round.shown = os.clock()
	round.token += 1
	round.open = true
	local token = round.token
	local seconds = nil
	if round.mode == "tantangan" then
		seconds = Config.Timer[item.Tier] or 14
	end
	local foot = "Santai · tanpa waktu"
	if round.mode == "tantangan" then
		foot = "Tantangan · " .. tostring(seconds) .. " detik"
	end
	foot = foot .. " · rentetan " .. tostring(round.combo)
	Remotes.fire(player, "quiz", {
		Head = tostring(round.index) .. " dari " .. tostring(ROUND_SIZE),
		Body = item.Statement,
		Foot = foot,
	})
	paintBoard(item.Statement)
	if seconds then
		task.delay(seconds, function()
			local current = rounds[player]
			if current == round and current.token == token and current.open then
				Round.grade(player, nil, true)
			end
		end)
	end
end

local function finish(player: Player, round)
	round.open = false
	round.done = true
	local elapsed = os.clock() - round.began
	local stars = starsFor(round.mode, round.correct, elapsed)
	local profile = Shell.profile(player)
	local coins = round.correct * 6 + math.min(round.bestCombo, 6) * 2
	if profile then
		local arena = if round.mode == "tantangan" then "bs_tantang" else "bs_santai"
		Progress.keepStars(profile, arena, stars)
		Progress.noteArena(profile, round.mode)
		Progress.addCoins(profile, coins)
		if stars >= 2 and not profile.flags.bsBadge then
			profile.flags.bsBadge = true
			BahasaApi.badge(player, profile, { "roblox-benar-salah" })
		end
		Shell.mark(player)
		Shell.push(player)
	end
	Remotes.fire(player, "result", {
		Correct = true,
		Head = "Ronde selesai",
		Body = tostring(round.correct)
			.. " benar. +"
			.. tostring(coins)
			.. " koin. "
			.. tostring(stars)
			.. " bintang.",
		Foot = "",
		Done = true,
		Next = round.mode == "santai",
		Mode = round.mode,
	})
	rounds[player] = nil
end

function Round.grade(player: Player, choice: string?, timedOut: boolean?)
	local round = rounds[player]
	if not round or not round.open or round.done then
		return
	end
	if not timedOut and os.clock() - round.shown < Config.MinAnswerSeconds then
		Shell.toast(player, "Terlalu cepat. Baca dulu pernyataannya.", "warn")
		return
	end
	round.open = false
	local item = round.items[round.index]
	local picked = if choice == "benar" then true elseif choice == "salah" then false else nil
	local correct = (not timedOut) and picked == item.Truth
	local profile = Shell.profile(player)
	if profile then
		Progress.noteAnswer(profile, correct, item.Id, "ejaan")
		if correct and item.Card then
			Progress.noteCard(profile, item.Card)
		end
		if (profile.stats.correct or 0) == 1 then
			local Analytics = require(ServerScriptService.Kernel.Analytics)
			Analytics.custom(player, "first_correct", 1)
		end
		Shell.mark(player)
	end
	if correct then
		round.correct += 1
		round.combo += 1
		round.bestCombo = math.max(round.bestCombo, round.combo)
	else
		round.combo = 0
	end
	player:SetAttribute("BCCombo", round.combo)
	local head = if correct then "Tepat" elseif timedOut then "Waktu habis" else "Belum tepat"
	Remotes.fire(player, "result", {
		Correct = correct,
		Head = head,
		Body = item.Explanation,
		Foot = if item.Truth then "Pernyataannya benar." else "Pernyataannya salah.",
		Done = false,
	})
	if round.index >= ROUND_SIZE then
		task.delay(1.6, function()
			if rounds[player] == round then
				finish(player, round)
			end
		end)
		return
	end
	round.index += 1
	task.delay(1.6, function()
		if rounds[player] == round and not round.done then
			show(player, round)
		end
	end)
end

function Round.begin(player: Player, mode: string)
	local profile = Shell.profile(player)
	if not profile then
		return
	end
	local previous = rounds[player]
	if previous then
		previous.done = true
	end
	local blocked = {}
	local items = Picker.take(profile, Bank, ROUND_SIZE, "ejaan", blocked)
	if #items < 4 then
		Shell.toast(player, "Bank soal belum cukup.", "warn")
		return
	end
	local round = {
		world = nil,
		mode = mode,
		items = items,
		index = 1,
		correct = 0,
		combo = 0,
		bestCombo = 0,
		token = 0,
		shown = 0,
		open = false,
		done = false,
		began = os.clock(),
	}
	rounds[player] = round
	if (profile.stats.answered or 0) == 0 then
		local Analytics = require(ServerScriptService.Kernel.Analytics)
		Analytics.custom(player, "first_answer", 1)
	end
	show(player, round)
end

function Round.bind(world)
	local function hook(part: BasePart)
		part.Touched:Connect(function(hit)
			if not hit:IsA("BasePart") then
				return
			end
			local player = Gate.playerFromHit(hit)
			if not player or not Gate.near(player, part, 16) then
				return
			end
			local choice = part:GetAttribute("Choice")
			if type(choice) ~= "string" then
				return
			end
			Round.grade(player, choice, false)
		end)
	end
	hook(world.benar)
	hook(world.salah)
	world.home.Triggered:Connect(function(player)
		Shell.home(player)
	end)
	world.santai.Triggered:Connect(function(player)
		Shell.toast(player, "Mode Santai. Tidak ada waktu, bintang paling banyak dua.", "info")
		Round.begin(player, "santai")
	end)
	world.tantang.Triggered:Connect(function(player)
		Shell.toast(player, "Mode Tantangan. Ada waktu, bintang ketiga bisa diraih.", "info")
		Round.begin(player, "tantangan")
	end)
	world.npc.Triggered:Connect(function(player)
		Remotes.fire(player, "speech", {
			Speaker = "Pak Putusan",
			Text = "Baca papan. Gerbang kiri kalau pernyataan itu benar, kanan kalau salah.",
		})
	end)
	game:GetService("Players").PlayerRemoving:Connect(function(player)
		local round = rounds[player]
		if round then
			round.done = true
			rounds[player] = nil
		end
	end)
	Round._world = world
end

function Round.welcome(player: Player, profile)
	Remotes.fire(player, "speech", {
		Speaker = "Pak Putusan",
		Text = "Lapangan ini menguji satu kalimat. Lari ke gerbang, atau ketuk tombol di bawah.",
	})
	if not profile.flags.bsWelcomed then
		profile.flags.bsWelcomed = true
		Shell.mark(player)
	end
	task.delay(1.4, function()
		if player.Parent and not rounds[player] then
			Round.begin(player, "santai")
		end
	end)
end

function Round.choice(player: Player, payload)
	local id = payload.Id
	if id ~= "benar" and id ~= "salah" then
		return
	end
	if not Shell.allow(player, "answer", 8, 6) then
		return
	end
	Round.grade(player, id, false)
end

function Round.goal(profile): string
	local santai = math.floor(tonumber(profile.stars.bs_santai) or 0)
	local tantang = math.floor(tonumber(profile.stars.bs_tantang) or 0)
	if santai < 1 then
		return "Selesaikan satu ronde Santai."
	end
	if tantang < 1 then
		return "Coba mode Tantangan untuk bintang berwaktu."
	end
	return "Bintang Santai " .. tostring(santai) .. " · Tantangan " .. tostring(tantang) .. "."
end

return Round
