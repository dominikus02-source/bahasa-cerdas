-- Memilih soal tanpa mengirim kunci. Antrean ulang didahulukan.
local Picker = {}

local function skillOf(profile, key: string): number
	if type(profile.skill) == "table" and type(profile.skill[key]) == "number" then
		return profile.skill[key]
	end
	if type(profile.skill) == "table" and type(profile.skill.ejaan) == "number" then
		return profile.skill.ejaan
	end
	return 0.55
end

function Picker.tier(profile, key: string): number
	local skill = skillOf(profile, key)
	if skill >= 0.82 then
		return 3
	end
	if skill <= 0.45 then
		return 1
	end
	return 2
end

function Picker.take(profile, pool, count: number, skillKey: string, blocked)
	local want = Picker.tier(profile, skillKey)
	local review = {}
	if type(profile.review) == "table" then
		for _, id in profile.review do
			review[id] = true
		end
	end
	local fresh = {}
	local rest = {}
	for _, item in pool do
		if not blocked[item.Id] then
			if review[item.Id] or item.Tier == want then
				table.insert(fresh, item)
			else
				table.insert(rest, item)
			end
		end
	end
	local rng = Random.new()
	local function mix(list)
		for index = #list, 2, -1 do
			local swap = rng:NextInteger(1, index)
			list[index], list[swap] = list[swap], list[index]
		end
	end
	mix(fresh)
	mix(rest)
	local picked = {}
	for _, item in fresh do
		if #picked >= count then
			break
		end
		table.insert(picked, item)
		blocked[item.Id] = true
	end
	for _, item in rest do
		if #picked >= count then
			break
		end
		table.insert(picked, item)
		blocked[item.Id] = true
	end
	return picked
end

return Picker
