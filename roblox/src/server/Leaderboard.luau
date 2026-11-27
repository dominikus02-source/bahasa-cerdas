local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Calendar = require(ReplicatedStorage.Shared.Calendar)
local Config = require(ReplicatedStorage.Shared.Config)

local Leaderboard = {}

local cache = { at = 0, rows = {}, note = "" }
local stores = {}

local function ordered(week: string)
	local existing = stores[week]
	if existing then
		return existing
	end
	local store = DataStoreService:GetOrderedDataStore(Config.OrderedPrefix .. week)
	stores[week] = store
	return store
end

function Leaderboard.publish(userId: number, week: string, score: number)
	if score < 0 then
		return
	end
	pcall(function()
		ordered(week):SetAsync(tostring(userId), math.floor(score))
	end)
end

function Leaderboard.top()
	if os.clock() - cache.at < 20 and #cache.rows > 0 then
		return { Ok = true, Rows = cache.rows, Note = cache.note }
	end
	local week = Calendar.weekKey(os.time())
	local ok, pages = pcall(function()
		return ordered(week):GetSortedAsync(false, 10)
	end)
	if not ok or pages == nil then
		return {
			Ok = false,
			Rows = {},
			Note = "Peringkat muncul setelah permainan diterbitkan.",
		}
	end
	local rows = {}
	local pageOk, page = pcall(function()
		return pages:GetCurrentPage()
	end)
	if pageOk and type(page) == "table" then
		for _, entry in page do
			local userId = tonumber(entry.key)
			local name = "Pemain"
			if userId then
				local nameOk, resolved = pcall(function()
					return Players:GetNameFromUserIdAsync(userId)
				end)
				if nameOk and type(resolved) == "string" then
					name = resolved
				end
			end
			table.insert(rows, { Name = name, Score = entry.value })
		end
	end
	cache = { at = os.clock(), rows = rows, note = "Minggu " .. week }
	return { Ok = true, Rows = rows, Note = cache.note }
end

return Leaderboard
