-- Bank soal Pasar Ejaan. Kunci jawaban tidak boleh keluar dari ServerScriptService.
local Kapital = require(script.Parent.banks.Kapital)
local Tanda = require(script.Parent.banks.Tanda)
local Baku = require(script.Parent.banks.Baku)

local QuestionBank = {}
local all = {}
local byId = {}

local function add(list)
	for _, item in list do
		table.insert(all, item)
		byId[item.Id] = item
	end
end

add(Kapital)
add(Tanda)
add(Baku)

local TUTORIAL = { "ey_k_01", "ey_k_02", "ey_k_03" }

local function fits(item, arenaId: string): boolean
	for _, arena in item.Arenas do
		if arena == arenaId then
			return true
		end
	end
	return false
end

function QuestionBank.count(): number
	return #all
end

function QuestionBank.get(id: string)
	return byId[id]
end

function QuestionBank.tutorial()
	local items = {}
	for _, id in TUTORIAL do
		local item = byId[id]
		if item then
			table.insert(items, item)
		end
	end
	return items
end

function QuestionBank.pick(profile, arenaId: string, count: number, mode: string)
	local pool = {}
	for _, item in all do
		if fits(item, arenaId) then
			table.insert(pool, item)
		end
	end

	local chosen = {}
	local used = {}
	local function take(item)
		if used[item.Id] then
			return
		end
		used[item.Id] = true
		table.insert(chosen, item)
	end

	local review = profile.review or {}
	for _, id in review do
		if #chosen >= math.min(2, count) then
			break
		end
		local item = byId[id]
		if item and fits(item, arenaId) then
			take(item)
		end
	end

	local accuracy = 0.55
	if profile.skill and type(profile.skill.ejaan) == "number" then
		accuracy = profile.skill.ejaan
	end
	local prefer = 2
	if mode == "santai" or accuracy < 0.5 then
		prefer = 1
	elseif accuracy > 0.85 then
		prefer = 3
	end
	if mode == "tantangan" then
		prefer = math.max(prefer, 2)
	end
	if arenaId == "boss" then
		prefer = 3
	end

	local rng = Random.new()
	while #chosen < count do
		local phase = (#chosen + 1) / count
		local want = prefer
		if phase < 0.34 then
			want = math.max(1, prefer - 1)
		elseif phase > 0.67 then
			want = math.min(3, prefer + 1)
		end
		if mode == "santai" then
			want = math.min(want, 2)
		end

		local candidates = {}
		for _, item in pool do
			if not used[item.Id] and item.Tier == want then
				table.insert(candidates, item)
			end
		end
		if #candidates == 0 then
			for _, item in pool do
				if not used[item.Id] then
					table.insert(candidates, item)
				end
			end
		end
		if #candidates == 0 then
			break
		end
		take(candidates[rng:NextInteger(1, #candidates)])
	end

	return chosen
end

return QuestionBank
