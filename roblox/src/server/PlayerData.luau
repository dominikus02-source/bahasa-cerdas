local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local PlayerData = {}

local SESSION = HttpService:GenerateGUID(false)
local store = DataStoreService:GetDataStore(Config.DataStore)
local cache = {}

local function blank()
	return {
		v = 1,
		coins = 0,
		stars = {},
		best = {},
		cards = {},
		skill = { ejaan = 0.55 },
		review = {},
		cosmetics = {
			owned = {},
			equipped = { trail = "", aura = "", title = "", pet = "" },
		},
		quests = { day = "", week = "", daily = {}, weekly = {} },
		daily = { lastDay = "", streak = 0, freezes = 2 },
		flags = { tutorial = false, portalSeen = false, boss = false, world = false },
		link = { linked = false, name = "", xp = 0, level = 1, rank = "", ageAllowed = true, online = false },
		stats = { answered = 0, correct = 0, weeklyCorrect = 0, weeklyStars = 0, week = "" },
		queue = {},
	}
end

local function ensure(data)
	local base = blank()
	if type(data) ~= "table" then
		return base
	end
	for key, value in base do
		if data[key] == nil then
			data[key] = value
		end
	end
	if type(data.cosmetics) ~= "table" then
		data.cosmetics = base.cosmetics
	end
	if type(data.cosmetics.owned) ~= "table" then
		data.cosmetics.owned = {}
	end
	if type(data.cosmetics.equipped) ~= "table" then
		data.cosmetics.equipped = { trail = "", aura = "", title = "", pet = "" }
	end
	if type(data.skill) ~= "table" then
		data.skill = { ejaan = 0.55 }
	end
	if type(data.flags) ~= "table" then
		data.flags = base.flags
	end
	if type(data.link) ~= "table" then
		data.link = base.link
	end
	if type(data.stats) ~= "table" then
		data.stats = base.stats
	end
	if type(data.daily) ~= "table" then
		data.daily = base.daily
	end
	if type(data.quests) ~= "table" then
		data.quests = base.quests
	end
	data.coins = math.max(0, math.floor(tonumber(data.coins) or 0))
	data.daily.freezes = math.clamp(math.floor(tonumber(data.daily.freezes) or 2), 0, 2)
	return data
end

local function export(profile)
	local lock = profile._lock
	local memory = profile._memory
	local dirty = profile._dirty
	local lost = profile._lost
	profile._lock = nil
	profile._memory = nil
	profile._dirty = nil
	profile._lost = nil
	local encoded = HttpService:JSONEncode(profile)
	profile._lock = lock
	profile._memory = memory
	profile._dirty = dirty
	profile._lost = lost
	return HttpService:JSONDecode(encoded)
end

local function keyFor(userId: number): string
	return "u_" .. tostring(userId)
end

local function claim(userId: number)
	local key = keyFor(userId)
	local ok, result = pcall(function()
		return store:UpdateAsync(key, function(old)
			local data = ensure(old)
			local lock = data._lock
			if type(lock) == "table" and lock.session ~= SESSION and type(lock.at) == "number" then
				if os.time() - lock.at < Config.LockSeconds then
					return nil
				end
			end
			data._lock = { session = SESSION, at = os.time() }
			return data
		end)
	end)
	if ok and type(result) == "table" and result._lock and result._lock.session == SESSION then
		return ensure(result)
	end
	return nil
end

local function write(profile, releaseLock: boolean): boolean
	if profile._memory or profile._lost then
		return false
	end
	local snapshot = export(profile)
	if releaseLock then
		snapshot._lock = nil
	else
		snapshot._lock = { session = SESSION, at = os.time() }
	end
	local key = keyFor(profile._userId)
	local ok, result = pcall(function()
		return store:UpdateAsync(key, function(old)
			if type(old) == "table" and type(old._lock) == "table" and old._lock.session ~= SESSION then
				if type(old._lock.at) == "number" and os.time() - old._lock.at < Config.LockSeconds then
					return nil
				end
			end
			return snapshot
		end)
	end)
	if not ok or result == nil then
		profile._lost = true
		return false
	end
	profile._lock = result._lock
	profile._dirty = false
	return true
end

function PlayerData.mark(player: Player)
	local profile = cache[player]
	if profile then
		profile._dirty = true
	end
end

function PlayerData.get(player: Player)
	return cache[player]
end

function PlayerData.load(player: Player)
	local loaded
	local tries = if RunService:IsStudio() then 1 else 6
	for _ = 1, tries do
		loaded = claim(player.UserId)
		if loaded then
			break
		end
		if not RunService:IsStudio() then
			task.wait(2)
		end
	end
	if not loaded then
		loaded = blank()
		loaded._memory = true
	end
	loaded._userId = player.UserId
	loaded._dirty = false
	cache[player] = loaded
	return loaded
end

function PlayerData.release(player: Player)
	local profile = cache[player]
	if not profile then
		return
	end
	write(profile, true)
	cache[player] = nil
end

function PlayerData.start()
	task.spawn(function()
		while true do
			task.wait(45)
			for player, profile in cache do
				if player.Parent and profile._dirty and not profile._memory and not profile._lost then
					write(profile, false)
				end
			end
		end
	end)

	game:BindToClose(function()
		for player, _profile in cache do
			PlayerData.release(player)
		end
	end)

	Players.PlayerRemoving:Connect(function(player)
		PlayerData.release(player)
	end)
end

return PlayerData
