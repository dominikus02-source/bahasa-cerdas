local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Shared.Config)
local BahasaApi = require(ServerScriptService.Kernel.BahasaApi)
local Picker = require(ServerScriptService.Kernel.Picker)
local Progress = require(ServerScriptService.Kernel.Progress)
local Remotes = require(ServerScriptService.Kernel.Remotes)
local Shell = require(ServerScriptService.Kernel.Shell)
local Bank = require(script.Parent.Bank)

local Round = {}

local rounds = {}
local ROUND_SIZE = 4

local function shuffle(items)
	local rng = Random.new()
	for index = #items, 2, -1 do
		local swap = rng:NextInteger(1, index)
		items[index], items[swap] = items[swap], items[index]
	end
	return items
end

local function pack(kind: string, item)
	local texts = {}
	local answer = ""
	if kind == "huruf" then
		for index = 1, #item.Word do
			table.insert(texts, string.sub(item.Word, index, index))
		end
		answer = item.Word
	else
		for _, word in item.Words do
			table.insert(texts, word)
		end
		answer = table.concat(item.Words, " ")
	end
	local tiles = {}
	for index, text in texts do
		table.insert(tiles, { Id = tostring(index), Text = text })
	end
	shuffle(tiles)
	if #tiles > 1 then
		local same = true
		for index, tile in tiles do
			if tile.Id ~= tostring(index) then
				same = false
			end
		end
		if same then
			tiles[1], tiles[2] = tiles[2], tiles[1]
		end
	end
	local byId = {}
	for _, tile in tiles do
		byId[tile.Id] = tile.Text
	end
	return {
		Id = item.Id,
		Tier = item.Tier,
		Hint = if kind == "huruf" then item.Definition else item.Note,
		Card = item.Card,
		Answer = answer,
		Tiles = tiles,
		ById = byId,
		Count = #texts,
		Kind = kind,
	}
end

local function starsFor(mode: string, correct: number, elapsed: number): number
	local ratio = correct / ROUND_SIZE
	if mode == "tantangan" then
		if ratio >= 0.85 and elapsed <= 150 then
			return 3
		end
		if ratio >= 0.7 then
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

local function send(player: Player, round)
	local item = round.items[round.index]
	round.shown = os.clock()
	round.token += 1
	round.open = true
	round.misses = 0
	local token = round.token
	local limit = nil
	if round.mode == "tantangan" then
		limit = if item.Kind == "huruf" then 22 else 34
	end
	local head = if item.Kind == "huruf" then "Susun huruf" else "Susun kalimat"
	head = tostring(round.index) .. "/" .. tostring(ROUND_SIZE) .. " · " .. head
	Remotes.fire(player, "tiles", {
		Head = head,
		Body = item.Hint,
		Foot = if limit then "Tantangan · " .. tostring(limit) .. " detik" else "Santai · tiga kesempatan",
		Tiles = item.Tiles,
	})
	if limit then
		task.delay(limit, function()
			local current = rounds[player]
			if current == round and current.token == token and current.open then
				Round.reveal(player, "Waktu habis.")
			end
		end)
	end
end

local function finish(player: Player, round)
	round.done = true
	round.open = false
	local stars = starsFor(round.mode, round.correct, os.clock() - round.began)
	local profile = Shell.profile(player)
	local coins = round.correct * 8
	if profile then
		local arena = if round.kind == "huruf" then "sk_huruf" else "sk_kalimat"
		if round.mode == "tantangan" then
			arena = arena .. "_t"
		end
		Progress.keepStars(profile, arena, stars)
		Progress.noteArena(profile, round.mode)
		Progress.addCoins(profile, coins)
		if stars >= 2 and not profile.flags.skBadge then
			profile.flags.skBadge = true
			BahasaApi.badge(player, profile, { "roblox-susun-kata" })
		end
		Shell.mark(player)
		Shell.push(player)
	end
	Remotes.fire(player, "result", {
		Correct = true,
		Done = true,
		Head = "Ronde selesai",
		Body = tostring(round.correct)
			.. " tersusun. +"
			.. tostring(coins)
			.. " koin. "
			.. tostring(stars)
			.. " bintang.",
		Foot = "",
		Next = round.kind == "huruf" or round.mode == "santai",
		Kind = round.kind,
		Mode = round.mode,
	})
	rounds[player] = nil
end

function Round.reveal(player: Player, reason: string)
	local round = rounds[player]
	if not round or not round.open then
		return
	end
	round.open = false
	local item = round.items[round.index]
	local profile = Shell.profile(player)
	if profile then
		Progress.noteAnswer(profile, false, item.Id, "kosakata")
		Shell.mark(player)
	end
	Remotes.fire(player, "result", {
		Correct = false,
		Done = false,
		Head = reason,
		Body = item.Answer,
		Foot = item.Hint,
	})
	Round.advance(player, round)
end

function Round.advance(player: Player, round)
	if round.index >= ROUND_SIZE then
		task.delay(1.5, function()
			if rounds[player] == round then
				finish(player, round)
			end
		end)
		return
	end
	round.index += 1
	task.delay(1.4, function()
		if rounds[player] == round and not round.done then
			send(player, round)
		end
	end)
end

function Round.submit(player: Player, order)
	local round = rounds[player]
	if not round or not round.open or type(order) ~= "table" then
		return
	end
	if os.clock() - round.shown < Config.MinAnswerSeconds then
		Shell.toast(player, "Terlalu cepat. Lihat artinya dulu.", "warn")
		return
	end
	local item = round.items[round.index]
	local seen = {}
	local built = {}
	for _, id in order do
		local key = tostring(id)
		if seen[key] or not item.ById[key] then
			Shell.toast(player, "Urutan tidak dikenal.", "warn")
			return
		end
		seen[key] = true
		table.insert(built, item.ById[key])
	end
	if #built ~= item.Count then
		Shell.toast(player, "Masih ada balok yang belum masuk.", "warn")
		return
	end
	local joined = if item.Kind == "huruf" then table.concat(built, "") else table.concat(built, " ")
	if joined == item.Answer then
		round.open = false
		round.correct += 1
		local profile = Shell.profile(player)
		if profile then
			Progress.noteAnswer(profile, true, item.Id, "kosakata")
			if item.Card then
				Progress.noteCard(profile, item.Card)
			end
			Shell.mark(player)
		end
		Remotes.fire(player, "result", {
			Correct = true,
			Done = false,
			Head = "Tersusun",
			Body = item.Answer,
			Foot = item.Hint,
		})
		Round.advance(player, round)
		return
	end
	round.misses += 1
	if round.misses >= 3 then
		Round.reveal(player, "Tiga kali belum tepat.")
		return
	end
	Shell.toast(player, "Urutan belum tepat. Kesempatan " .. tostring(3 - round.misses) .. " lagi.", "warn")
	Remotes.fire(player, "miss", { Left = 3 - round.misses })
end

function Round.begin(player: Player, kind: string, mode: string)
	local profile = Shell.profile(player)
	if not profile then
		return
	end
	local pool = if kind == "huruf" then Bank.Huruf else Bank.Kalimat
	local blocked = {}
	local picked = Picker.take(profile, pool, ROUND_SIZE, "kosakata", blocked)
	if #picked < 4 then
		Shell.toast(player, "Bank kata belum cukup.", "warn")
		return
	end
	local items = {}
	for _, item in picked do
		table.insert(items, pack(kind, item))
	end
	local previous = rounds[player]
	if previous then
		previous.done = true
	end
	local round = {
		kind = kind,
		mode = mode,
		items = items,
		index = 1,
		correct = 0,
		misses = 0,
		token = 0,
		shown = 0,
		open = false,
		done = false,
		began = os.clock(),
	}
	rounds[player] = round
	player:SetAttribute("SKKind", kind)
	send(player, round)
end

function Round.bind(world)
	world.home.Triggered:Connect(function(player)
		Shell.home(player)
	end)
	world.huruf.Triggered:Connect(function(player)
		Shell.toast(player, "Susun huruf. Arti tampil, ejaannya tidak.", "info")
		Round.begin(player, "huruf", "santai")
	end)
	world.kalimat.Triggered:Connect(function(player)
		Shell.toast(player, "Susun kalimat. Satu urutan yang rapi.", "info")
		Round.begin(player, "kalimat", "santai")
	end)
	world.waktu.Triggered:Connect(function(player)
		local kind = player:GetAttribute("SKKind")
		if kind ~= "kalimat" then
			kind = "huruf"
		end
		Shell.toast(player, "Mode Tantangan. Waktu berjalan, bintang ketiga bisa diraih.", "info")
		Round.begin(player, kind, "tantangan")
	end)
	world.npc.Triggered:Connect(function(player)
		Remotes.fire(player, "speech", {
			Speaker = "Mak Bengkel",
			Text = "Ketuk balok sesuai urutan, lalu kunci. Tiga meleset mengungkap jawabannya.",
		})
	end)
	game:GetService("Players").PlayerRemoving:Connect(function(player)
		local round = rounds[player]
		if round then
			round.done = true
			rounds[player] = nil
		end
	end)
end

function Round.welcome(player: Player, profile)
	Remotes.fire(player, "speech", {
		Speaker = "Mak Bengkel",
		Text = "Bengkel ini menyusun huruf dan kalimat. Meja huruf sudah menunggu.",
	})
	if not profile.flags.skWelcomed then
		profile.flags.skWelcomed = true
		Shell.mark(player)
	end
	task.delay(1.4, function()
		if player.Parent and not rounds[player] then
			Round.begin(player, "huruf", "santai")
		end
	end)
end

function Round.order(player: Player, payload)
	if not Shell.allow(player, "answer", 10, 8) then
		return
	end
	Round.submit(player, payload.Order)
end

function Round.mode(player: Player, payload)
	local kind = if payload.Kind == "kalimat" then "kalimat" else "huruf"
	local mode = if payload.Mode == "tantangan" then "tantangan" else "santai"
	Round.begin(player, kind, mode)
end

function Round.goal(profile): string
	local huruf = math.floor(tonumber(profile.stars.sk_huruf) or 0)
	local kalimat = math.floor(tonumber(profile.stars.sk_kalimat) or 0)
	if huruf < 1 then
		return "Selesaikan satu ronde susun huruf."
	end
	if kalimat < 1 then
		return "Lanjut ke meja susun kalimat."
	end
	return "Huruf " .. tostring(huruf) .. " bintang · Kalimat " .. tostring(kalimat) .. " bintang."
end

return Round
