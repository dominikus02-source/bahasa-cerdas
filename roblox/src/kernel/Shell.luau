local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TeleportService = game:GetService("TeleportService")

local Config = require(ReplicatedStorage.Shared.Config)
local Analytics = require(script.Parent.Analytics)
local BahasaApi = require(script.Parent.BahasaApi)
local Leaderboard = require(script.Parent.Leaderboard)
local PlayerData = require(script.Parent.PlayerData)
local Progress = require(script.Parent.Progress)
local Remotes = require(script.Parent.Remotes)

local Shell = {}

local options = nil
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

function Shell.toast(player: Player, text: string, tone: string?)
	Remotes.fire(player, "toast", { Text = text, Tone = tone or "info" })
end

function Shell.push(player: Player)
	local profile = PlayerData.get(player)
	if not profile or not options then
		return
	end
	local snap = Progress.snapshot(profile)
	snap.Title = options.Title
	snap.Goal = options.Goal(profile)
	snap.ReturnLobby = options.ReturnLobby == true
	Remotes.fire(player, "state", snap)
end

function Shell.allow(player: Player, action: string, maxCount: number, window: number): boolean
	return allow(player, action, maxCount, window)
end

function Shell.profile(player: Player)
	return PlayerData.get(player)
end

function Shell.mark(player: Player)
	PlayerData.mark(player)
end

local function goLobby(player: Player)
	if not options or not options.ReturnLobby then
		Shell.toast(player, "Petualangan ini berdiri sendiri.", "info")
		return
	end
	if RunService:IsStudio() or game.PlaceId == Config.LobbyPlaceId then
		Shell.toast(player, "Di aplikasi Roblox, gerbang ini kembali ke Alun-Alun.", "info")
		return
	end
	Shell.toast(player, "Kembali ke Alun-Alun...", "info")
	local ok = pcall(function()
		TeleportService:TeleportAsync(Config.LobbyPlaceId, { player })
	end)
	if not ok then
		Shell.toast(player, "Perjalanan pulang gagal. Coba lagi.", "warn")
	end
end

function Shell.home(player: Player)
	if not allow(player, "home", 3, 12) then
		return
	end
	goLobby(player)
end

function Shell.start(spec)
	options = spec
	Remotes.init()
	PlayerData.start()

	local function arrive(player: Player)
		local profile = PlayerData.load(player)
		Progress.ensure(profile)
		if profile._memory then
			Shell.toast(player, "Simpanan belum tersambung. Main tetap jalan di sesi ini.", "warn")
		end
		task.spawn(function()
			BahasaApi.refresh(player, profile)
			BahasaApi.flush(player, profile)
			Shell.push(player)
		end)
		Progress.applyLook(player, profile)
		Analytics.custom(player, "spawn", 1)
		if spec.OnJoin then
			spec.OnJoin(player, profile)
		end
		Shell.push(player)
	end

	Players.PlayerAdded:Connect(function(player)
		player.CharacterAdded:Connect(function()
			local profile = PlayerData.get(player)
			if profile then
				task.defer(function()
					Progress.applyLook(player, profile)
				end)
			end
		end)
		arrive(player)
	end)
	for _, player in Players:GetPlayers() do
		task.spawn(arrive, player)
	end

	Remotes.onAction(function(player: Player, kind: string, payload)
		if type(kind) ~= "string" then
			return
		end
		local profile = PlayerData.get(player)
		if not profile then
			return
		end
		payload = if type(payload) == "table" then payload else {}
		if kind == "sync" then
			Shell.push(player)
			return
		end
		if spec.OnAction and spec.OnAction(player, profile, kind, payload) then
			return
		end
		if kind == "claimDaily" then
			if not allow(player, "claim", 6, 20) then
				return
			end
			local ok, message = Progress.claimDaily(player, profile)
			Shell.toast(player, message, if ok then "good" else "warn")
			Shell.push(player)
		elseif kind == "claimQuest" then
			if not allow(player, "claim", 8, 30) then
				return
			end
			local ok, message = Progress.claimQuest(profile, tostring(payload.Id or ""))
			Shell.toast(player, message, if ok then "good" else "warn")
			Shell.push(player)
		elseif kind == "buy" then
			if not allow(player, "shop", 8, 20) then
				return
			end
			local ok, message = Progress.buy(profile, tostring(payload.Id or ""))
			Shell.toast(player, message, if ok then "good" else "warn")
			if ok then
				Progress.applyLook(player, profile)
			end
			Shell.push(player)
		elseif kind == "equip" then
			if not allow(player, "shop", 8, 20) then
				return
			end
			local ok, message = Progress.equip(player, profile, tostring(payload.Id or ""))
			Shell.toast(player, message, if ok then "good" else "warn")
			Shell.push(player)
		elseif kind == "link" then
			if not allow(player, "link", 5, 60) then
				Shell.toast(player, "Terlalu banyak percobaan. Tunggu sebentar.", "warn")
				return
			end
			local code = string.upper(string.gsub(tostring(payload.Code or ""), "%s+", ""))
			if #code < 4 or #code > 16 or string.match(code, "^[%w%-]+$") == nil then
				Shell.toast(player, "Kode berisi huruf, angka, dan tanda hubung.", "warn")
				return
			end
			local ok, message = BahasaApi.verify(player, profile, code)
			Shell.toast(player, message, if ok then "good" else "warn")
			Shell.push(player)
		elseif kind == "home" then
			Shell.home(player)
		end
	end)

	Remotes.onQuery(function(_player: Player, kind: string)
		if kind == "board" then
			return Leaderboard.top()
		end
		return { Ok = false, Message = "Tidak dikenal." }
	end)

	task.spawn(function()
		while true do
			task.wait(60)
			for _, player in Players:GetPlayers() do
				local profile = PlayerData.get(player)
				if profile then
					BahasaApi.flush(player, profile)
				end
			end
		end
	end)

	Players.PlayerRemoving:Connect(function(player)
		limits[player] = nil
	end)
end

return Shell
