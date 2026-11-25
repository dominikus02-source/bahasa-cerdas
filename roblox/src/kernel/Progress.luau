local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Calendar = require(ReplicatedStorage.Shared.Calendar)
local Cosmetics = require(ReplicatedStorage.Shared.Cosmetics)
local DailyRewards = require(ReplicatedStorage.Shared.DailyRewards)
local Palette = require(ReplicatedStorage.Shared.Palette)
local Quests = require(ReplicatedStorage.Shared.Quests)
local Leaderboard = require(script.Parent.Leaderboard)

local Progress = {}

local function owns(profile, id: string): boolean
	for _, owned in profile.cosmetics.owned do
		if owned == id then
			return true
		end
	end
	return false
end

local function grant(profile, id: string)
	if id ~= "" and not owns(profile, id) then
		table.insert(profile.cosmetics.owned, id)
	end
end

function Progress.starTotal(profile): number
	local total = 0
	for _, value in profile.stars do
		total += math.floor(tonumber(value) or 0)
	end
	return total
end

function Progress.ensure(profile)
	local today = Calendar.dayKey(os.time())
	local week = Calendar.weekKey(os.time())
	if profile.quests.day ~= today then
		profile.quests.day = today
		profile.quests.daily = {}
	end
	if profile.quests.week ~= week then
		profile.quests.week = week
		profile.quests.weekly = {}
		profile.stats.weeklyCorrect = 0
		profile.stats.weeklyStars = 0
		profile.stats.week = week
	end
	for _, quest in Quests.Daily do
		if type(profile.quests.daily[quest.Id]) ~= "table" then
			profile.quests.daily[quest.Id] = { p = 0, done = false, claimed = false }
		end
	end
	for _, quest in Quests.Weekly do
		if type(profile.quests.weekly[quest.Id]) ~= "table" then
			profile.quests.weekly[quest.Id] = { p = 0, done = false, claimed = false }
		end
	end
end

local function bump(bucket, id: string, amount: number, goal: number)
	local row = bucket[id]
	if not row or row.done then
		return
	end
	row.p = math.min(goal, (row.p or 0) + amount)
	if row.p >= goal then
		row.done = true
	end
end

function Progress.noteAnswer(profile, correct: boolean, questionId: string, skillKey: string?)
	Progress.ensure(profile)
	local key = skillKey or "ejaan"
	profile.stats.answered = (profile.stats.answered or 0) + 1
	local previous = profile.skill[key]
	if type(previous) ~= "number" then
		previous = 0.55
	end
	local score = if correct then 1 else 0
	profile.skill[key] = previous * 0.8 + score * 0.2
	if correct then
		profile.stats.correct = (profile.stats.correct or 0) + 1
		profile.stats.weeklyCorrect = (profile.stats.weeklyCorrect or 0) + 1
		local kept = {}
		for _, id in profile.review do
			if id ~= questionId then
				table.insert(kept, id)
			end
		end
		profile.review = kept
		local quest = Quests.Daily[1]
		bump(profile.quests.daily, quest.Id, 1, quest.Goal)
		local weekly = Quests.Weekly[1]
		bump(profile.quests.weekly, weekly.Id, 1, weekly.Goal)
	else
		local review = { questionId }
		for _, id in profile.review do
			if id ~= questionId and #review < 24 then
				table.insert(review, id)
			end
		end
		profile.review = review
	end
	profile._dirty = true
end

function Progress.addCoins(profile, amount: number)
	profile.coins = math.max(0, profile.coins + math.floor(amount))
	profile._dirty = true
end

function Progress.noteCard(profile, card): boolean
	if type(card) ~= "table" or type(card.Id) ~= "string" then
		return false
	end
	if profile.cards[card.Id] then
		return false
	end
	profile.cards[card.Id] = { Word = card.Word, Definition = card.Definition }
	Progress.ensure(profile)
	local quest = Quests.Daily[3]
	bump(profile.quests.daily, quest.Id, 1, quest.Goal)
	profile._dirty = true
	return true
end

function Progress.noteArena(profile, mode: string)
	if mode ~= "tantangan" and mode ~= "boss" then
		return
	end
	Progress.ensure(profile)
	local quest = Quests.Daily[2]
	bump(profile.quests.daily, quest.Id, 1, quest.Goal)
	profile._dirty = true
end

function Progress.keepStars(profile, arenaId: string, stars: number): number
	local previous = math.floor(tonumber(profile.stars[arenaId]) or 0)
	local best = math.max(previous, stars)
	profile.stars[arenaId] = best
	if best > previous then
		profile.stats.weeklyStars = (profile.stats.weeklyStars or 0) + (best - previous)
		local week = Calendar.weekKey(os.time())
		if type(profile._userId) == "number" then
			Leaderboard.publish(profile._userId, week, profile.stats.weeklyStars)
		end
	end
	profile._dirty = true
	return best
end

function Progress.claimDaily(player: Player, profile)
	Progress.ensure(profile)
	local today = Calendar.dayKey(os.time())
	if profile.daily.lastDay == today then
		return false, "Hadiah hari ini sudah diambil."
	end
	local streak = profile.daily.streak or 0
	if profile.daily.lastDay == "" then
		streak = 1
	else
		local gap = Calendar.daySerial(today) - Calendar.daySerial(profile.daily.lastDay)
		if gap <= 0 then
			return false, "Hadiah hari ini sudah diambil."
		elseif gap == 1 then
			streak += 1
		else
			local missed = gap - 1
			if missed <= (profile.daily.freezes or 0) then
				profile.daily.freezes -= missed
				streak += 1
			else
				streak = 1
			end
		end
	end
	local index = ((streak - 1) % #DailyRewards) + 1
	local reward = DailyRewards[index]
	profile.daily.streak = streak
	profile.daily.lastDay = today
	profile.daily.freezes = math.clamp((profile.daily.freezes or 0) + (reward.Freeze or 0), 0, 2)
	Progress.addCoins(profile, reward.Coins or 0)
	if reward.Title then
		grant(profile, reward.Title)
	end
	profile._dirty = true
	Progress.applyLook(player, profile)
	return true, "Hari ke-" .. tostring(index) .. " terbuka. +" .. tostring(reward.Coins or 0) .. " koin."
end

function Progress.claimQuest(profile, questId: string)
	Progress.ensure(profile)
	local definition = nil
	local bucket = nil
	for _, quest in Quests.Daily do
		if quest.Id == questId then
			definition = quest
			bucket = profile.quests.daily
		end
	end
	for _, quest in Quests.Weekly do
		if quest.Id == questId then
			definition = quest
			bucket = profile.quests.weekly
		end
	end
	if not definition or not bucket then
		return false, "Misi tidak ditemukan."
	end
	local row = bucket[questId]
	if not row or not row.done then
		return false, "Misi belum selesai."
	end
	if row.claimed then
		return false, "Hadiah misi sudah diambil."
	end
	row.claimed = true
	Progress.addCoins(profile, definition.Reward)
	return true, "Misi selesai. +" .. tostring(definition.Reward) .. " koin."
end

function Progress.buy(profile, cosmeticId: string)
	local item = Cosmetics.ById[cosmeticId]
	if not item or item.Hidden or item.Price <= 0 then
		return false, "Barang ini tidak dijual."
	end
	if owns(profile, cosmeticId) then
		return false, "Kamu sudah memilikinya."
	end
	if profile.coins < item.Price then
		return false, "Koin belum cukup."
	end
	profile.coins -= item.Price
	grant(profile, cosmeticId)
	profile._dirty = true
	return true, item.Name .. " sekarang milikmu."
end

function Progress.equip(player: Player, profile, cosmeticId: string)
	local item = Cosmetics.ById[cosmeticId]
	if not item then
		return false, "Barang tidak dikenal."
	end
	if not owns(profile, cosmeticId) then
		return false, "Kamu belum memiliki barang itu."
	end
	local slot = item.Slot
	if profile.cosmetics.equipped[slot] == cosmeticId then
		profile.cosmetics.equipped[slot] = ""
	else
		profile.cosmetics.equipped[slot] = cosmeticId
	end
	profile._dirty = true
	Progress.applyLook(player, profile)
	return true, "Tampilan diperbarui."
end

local function particles(parent: Instance, color: Color3, rate: number)
	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	emitter.Rate = rate
	emitter.Lifetime = NumberRange.new(0.35, 0.7)
	emitter.Speed = NumberRange.new(0.6, 1.8)
	emitter.SpreadAngle = Vector2.new(20, 20)
	emitter.LightEmission = 0.7
	emitter.Size = NumberSequence.new(0.35)
	emitter.Color = ColorSequence.new(color)
	emitter.Parent = parent
	return emitter
end

local function colorFor(id: string): Color3
	if id == "trail_kunyit" or id == "aura_pena" then
		return Palette.Kunyit
	end
	if id == "pet_kunang" then
		return Palette.Lamp
	end
	return Palette.Teal
end

function Progress.applyLook(player: Player, profile)
	local character = player.Character
	if not character then
		return
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	local head = character:FindFirstChild("Head")
	if not hrp then
		return
	end
	local old = character:FindFirstChild("BCLook")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "BCLook"
	folder.Parent = character
	local equipped = profile.cosmetics.equipped
	if equipped.trail ~= "" then
		particles(hrp, colorFor(equipped.trail), 16)
	end
	if equipped.aura == "aura_pena" then
		local light = Instance.new("PointLight")
		light.Color = Palette.Kunyit
		light.Brightness = 1.4
		light.Range = 10
		light.Parent = hrp
		particles(hrp, Palette.Krem, 8)
	end
	if equipped.pet == "pet_kunang" then
		local pet = Instance.new("Part")
		pet.Name = "Kunang"
		pet.Shape = Enum.PartType.Ball
		pet.Size = Vector3.new(1.1, 1.1, 1.1)
		pet.Color = Palette.Lamp
		pet.Material = Enum.Material.Neon
		pet.CanCollide = false
		pet.CanTouch = false
		pet.CanQuery = false
		pet.CastShadow = false
		pet.Massless = true
		pet.Parent = folder
		local weld = Instance.new("Weld")
		weld.Part0 = hrp
		weld.Part1 = pet
		weld.C0 = CFrame.new(2.4, 2.1, 0)
		weld.Parent = pet
	end
	local titleItem = Cosmetics.ById[equipped.title]
	if head and titleItem and titleItem.Title then
		local billboard = Instance.new("BillboardGui")
		billboard.Size = UDim2.fromOffset(110, 18)
		billboard.StudsOffsetWorldSpace = Vector3.new(0, 1.8, 0)
		billboard.MaxDistance = 45
		billboard.Parent = head
		local label = Instance.new("TextLabel")
		label.BackgroundColor3 = Palette.Navy
		label.BackgroundTransparency = 0.2
		label.Size = UDim2.fromScale(1, 1)
		label.Font = Enum.Font.GothamBold
		label.TextColor3 = Palette.Kunyit
		label.TextSize = 11
		label.Text = titleItem.Title
		label.AutoLocalize = false
		label.Parent = billboard
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 8)
		corner.Parent = label
	end
end

local function questRows(definitions, bucket)
	local rows = {}
	for _, quest in definitions do
		local row = bucket[quest.Id] or { p = 0, done = false, claimed = false }
		table.insert(rows, {
			Id = quest.Id,
			Text = quest.Text,
			Progress = row.p or 0,
			Goal = quest.Goal,
			Done = row.done == true,
			Claimed = row.claimed == true,
			Reward = quest.Reward,
		})
	end
	return rows
end

function Progress.snapshot(profile)
	Progress.ensure(profile)
	local cards = {}
	for _, card in profile.cards do
		if type(card) == "table" then
			table.insert(cards, { Word = card.Word or "", Definition = card.Definition or "" })
		end
	end
	table.sort(cards, function(a, b)
		return a.Word < b.Word
	end)
	local shop = {}
	for _, item in Cosmetics.List do
		if not item.Hidden and item.Price > 0 then
			table.insert(shop, {
				Id = item.Id,
				Name = item.Name,
				Price = item.Price,
				Owned = owns(profile, item.Id),
			})
		end
	end
	local nextDay = ((profile.daily.streak or 0) % #DailyRewards) + 1
	if profile.daily.lastDay == Calendar.dayKey(os.time()) then
		nextDay = ((math.max(profile.daily.streak, 1) - 1) % #DailyRewards) + 1
	end
	return {
		Coins = profile.coins,
		Stars = profile.stars,
		StarTotal = Progress.starTotal(profile),
		Streak = profile.daily.streak or 0,
		Freezes = profile.daily.freezes or 0,
		CanClaimDaily = profile.daily.lastDay ~= Calendar.dayKey(os.time()),
		DailyDay = nextDay,
		Quests = questRows(Quests.Daily, profile.quests.daily),
		Weekly = questRows(Quests.Weekly, profile.quests.weekly),
		Cards = cards,
		Shop = shop,
		Link = {
			Linked = profile.link.linked == true,
			Online = profile.link.online == true,
			Name = profile.link.name or "",
		},
		Memory = profile._memory == true,
	}
end

return Progress
