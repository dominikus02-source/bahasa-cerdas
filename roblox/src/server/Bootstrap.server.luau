local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Analytics = require(script.Parent.Analytics)
local BahasaApi = require(script.Parent.BahasaApi)
local Calendar = require(ReplicatedStorage.Shared.Calendar)
local Challenge = require(script.Parent.Challenge)
local PlayerData = require(script.Parent.PlayerData)
local Progress = require(script.Parent.Progress)
local QuestionBank = require(script.Parent.QuestionBank)
local Remotes = require(script.Parent.Remotes)
local World = require(script.Parent.World)

local roleValue = ReplicatedStorage:FindFirstChild("PlaceRole")
local role = if roleValue and roleValue:IsA("StringValue") then roleValue.Value else "lobby"

pcall(function()
	Workspace.StreamingEnabled = true
	Workspace.ModelStreamingBehavior = Enum.ModelStreamingBehavior.Improved
	Workspace.StreamingIntegrityMode = Enum.StreamingIntegrityMode.PauseOutsideLoadedArea
end)

local limits = {}

local function allow(player: Player, action: string, maxCount: number, window: number): boolean
	local now = os.clock()
	local byPlayer = limits[player]
	if not byPlayer then
		byPlayer = {}
		limits[player] = byPlayer
	end
	local bucket = byPlayer[action]
	if not bucket or now - bucket.t > window then
		byPlayer[action] = { t = now, n = 1 }
		return true
	end
	if bucket.n >= maxCount then
		return false
	end
	bucket.n += 1
	return true
end

local function toast(player: Player, text: string, tone: string?)
	Remotes.fire(player, "toast", { Text = text, Tone = tone or "info" })
end

local NARA = {
	"Lari ke gerbang kuning. Pilih kalimat yang tepat.",
	"Gerbang yang salah menumpahkan tinta. Coba lagi dari awal jalur.",
	"Selesai? Ikuti cahaya ke portal Pasar Ejaan.",
}

local world

local function onPrompt(player: Player, info)
	if not allow(player, "prompt", 12, 10) then
		return
	end
	local profile = PlayerData.get(player)
	if not profile then
		return
	end
	if info.Kind == "speech" then
		local index = (player:GetAttribute("NaraLine") or 0) + 1
		player:SetAttribute("NaraLine", index)
		Remotes.fire(player, "speech", { Speaker = "Mbak Nara", Text = NARA[((index - 1) % #NARA) + 1] })
	elseif info.Kind == "portal" and info.Id == "pasar" then
		if not profile.flags.portalSeen then
			profile.flags.portalSeen = true
			Analytics.funnel(player, "portal_seen")
			PlayerData.mark(player)
		end
		Challenge.travel(player, "pasar")
	elseif info.Kind == "locked" then
		local total = Progress.starTotal(profile)
		local text = info.Name .. " segera hadir."
		if total < info.Stars then
			text = text
				.. " Butuh "
				.. tostring(info.Stars)
				.. " bintang. Kamu punya "
				.. tostring(total)
				.. "."
		end
		toast(player, text, "info")
		if not profile.flags.portalSeen then
			profile.flags.portalSeen = true
			Analytics.funnel(player, "portal_seen")
			PlayerData.mark(player)
		end
	elseif info.Kind == "arena" then
		Challenge.startLocal(player, info.Arena, info.Mode)
	elseif info.Kind == "lobby" then
		Challenge.travel(player, "lobby")
	elseif info.Kind == "legacy" then
		Challenge.legacy(player, info.Id, info.Part)
	elseif info.Kind == "kiosk" then
		Remotes.fire(player, "open", { Panel = "tautan" })
	elseif info.Kind == "shop" then
		Remotes.fire(player, "open", { Panel = "toko" })
	elseif info.Kind == "quest" then
		Remotes.fire(player, "open", { Panel = "misi" })
	elseif info.Kind == "daily" then
		Remotes.fire(player, "open", { Panel = "hadiah" })
	elseif info.Kind == "board" then
		Remotes.fire(player, "open", { Panel = "peringkat" })
	elseif info.Kind == "card" then
		Challenge.secretCard(player)
	end
end

Remotes.init()
PlayerData.start()
world = World.build(role, onPrompt)
Challenge.bind(world)
local soal, masalah = QuestionBank.audit()
local httpLabel = if BahasaApi.online() then "hidup" else "mati"
local catatan = if masalah == 0 then "tidak-ada" else tostring(masalah)
print(
	"[Kota Aksara] Siap | peran="
		.. role
		.. " | soal="
		.. tostring(soal)
		.. " | gerbang="
		.. tostring(#world.gates)
		.. " | http="
		.. httpLabel
		.. " | masalah="
		.. catatan
)

local function onPlayer(player: Player)
	local profile = PlayerData.load(player)
	profile.stats.week = profile.stats.week ~= "" and profile.stats.week or Calendar.weekKey(os.time())
	Progress.ensure(profile)
	task.spawn(function()
		BahasaApi.refresh(player, profile)
		BahasaApi.flush(player, profile)
		Progress.push(player)
	end)
	player.CharacterAdded:Connect(function()
		Challenge.onSpawn(player)
	end)
	if player.Character then
		Challenge.onSpawn(player)
	end
	Analytics.funnel(player, "spawn")
	if not profile.flags.tutorial and role ~= "pasar-ejaan" then
		Remotes.fire(player, "speech", { Speaker = "Mbak Nara", Text = NARA[1] })
		Remotes.fire(player, "guide", { Target = "gerbang" })
	elseif not profile.flags.world and role ~= "pasar-ejaan" then
		Remotes.fire(player, "guide", { Target = "pasar" })
	end
	if profile._memory then
		toast(player, "Progres kota belum tersimpan. Kami akan mencoba lagi.", "warn")
	elseif profile._lost then
		toast(player, "Akun sedang terbuka di server lain. Tunggu sebentar lalu masuk lagi.", "warn")
	end
	Progress.push(player)
	task.delay(1.4, function()
		if player.Parent and not profile.flags.tutorial and role ~= "pasar-ejaan" then
			Challenge.startTutorial(player)
		end
	end)
end

Remotes.onAction(function(player: Player, action: string, payload)
	if type(action) ~= "string" or #action > 32 then
		return
	end
	local profile = PlayerData.get(player)
	if not profile then
		return
	end
	payload = if type(payload) == "table" then payload else {}
	if action == "choose" then
		if not allow(player, "choose", 8, 10) then
			return
		end
		Challenge.submit(player, tonumber(payload.Index) or -1)
	elseif action == "skip" then
		Challenge.skipTutorial(player)
	elseif action == "claimDaily" then
		if not allow(player, "claim", 6, 30) then
			return
		end
		local ok, message = Progress.claimDaily(player, profile)
		toast(player, message, if ok then "good" else "warn")
		Progress.push(player)
	elseif action == "claimQuest" then
		if not allow(player, "claim", 8, 30) then
			return
		end
		local ok, message = Progress.claimQuest(profile, tostring(payload.Id or ""))
		toast(player, message, if ok then "good" else "warn")
		Progress.push(player)
	elseif action == "buy" then
		if not allow(player, "shop", 8, 20) then
			return
		end
		local ok, message = Progress.buy(profile, tostring(payload.Id or ""))
		toast(player, message, if ok then "good" else "warn")
		Progress.push(player)
	elseif action == "equip" then
		if not allow(player, "shop", 8, 20) then
			return
		end
		local ok, message = Progress.equip(player, profile, tostring(payload.Id or ""))
		toast(player, message, if ok then "good" else "warn")
		Progress.push(player)
	elseif action == "link" then
		if not allow(player, "link", 5, 60) then
			toast(player, "Terlalu banyak percobaan. Tunggu sebentar.", "warn")
			return
		end
		local code = string.upper(string.gsub(tostring(payload.Code or ""), "%s+", ""))
		if #code < 4 or #code > 16 or string.match(code, "^[%w%-]+$") == nil then
			toast(player, "Kode berisi huruf, angka, dan tanda hubung.", "warn")
			return
		end
		local ok, message = BahasaApi.verify(player, profile, code)
		if ok then
			Analytics.custom(player, "link_success", 1)
		end
		toast(player, message, if ok then "good" else "warn")
		Progress.push(player)
	elseif action == "setor" then
		if not allow(player, "setor", 4, 60) then
			toast(player, "Setor XP bisa dicoba lagi sebentar lagi.", "warn")
			return
		end
		Challenge.startSetor(player)
	elseif action == "replay" then
		local arena = tostring(payload.Arena or "")
		local mode = tostring(payload.Mode or "santai")
		if arena == "setor" then
			Challenge.startSetor(player)
		else
			Challenge.startLocal(player, arena, mode)
		end
	elseif action == "lobby" then
		Challenge.travel(player, "lobby")
	end
end)

Remotes.onQuery(function(player: Player, kind: string)
	if kind ~= "leaderboard" then
		return { Ok = false }
	end
	if not allow(player, "board", 6, 20) then
		return { Ok = false, Rows = {}, Note = "Tunggu sebentar." }
	end
	return require(script.Parent.Leaderboard).top()
end)

Players.PlayerAdded:Connect(onPlayer)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayer, player)
end

Players.PlayerRemoving:Connect(function(player)
	limits[player] = nil
end)
