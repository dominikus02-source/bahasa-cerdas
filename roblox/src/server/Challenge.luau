local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TeleportService = game:GetService("TeleportService")

local Analytics = require(script.Parent.Analytics)
local BahasaApi = require(script.Parent.BahasaApi)
local Config = require(ReplicatedStorage.Shared.Config)
local Leaderboard = require(script.Parent.Leaderboard)
local Palette = require(ReplicatedStorage.Shared.Palette)
local PlayerData = require(script.Parent.PlayerData)
local Progress = require(script.Parent.Progress)
local QuestionBank = require(script.Parent.QuestionBank)
local Remotes = require(script.Parent.Remotes)

local Challenge = {}

local world = nil
local rounds = {}
local lastLegacy = {}
local cardTouch = {}

local function profileOf(player: Player)
	return PlayerData.get(player)
end

local function toast(player: Player, text: string, tone: string?)
	Remotes.fire(player, "toast", { Text = text, Tone = tone or "info" })
end

local function pivot(player: Player, cf: CFrame?)
	if not cf then
		return
	end
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.CFrame = cf
	end
end

local function humanoidOf(player: Player): Humanoid?
	local character = player.Character
	return character and character:FindFirstChildOfClass("Humanoid")
end

local function soundAt(player: Player, soundId: string, speed: number)
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end
	local sound = Instance.new("Sound")
	sound.SoundId = soundId
	sound.Volume = 0.7
	sound.PlaybackSpeed = speed
	sound.RollOffMaxDistance = 40
	sound.Parent = hrp
	sound:Play()
	Debris:AddItem(sound, 3)
end

local function burst(part: BasePart, color: Color3)
	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	emitter.Rate = 0
	emitter.Speed = NumberRange.new(8, 14)
	emitter.Lifetime = NumberRange.new(0.35, 0.75)
	emitter.SpreadAngle = Vector2.new(180, 180)
	emitter.LightEmission = 0.8
	emitter.Color = ColorSequence.new(color)
	emitter.Parent = part
	emitter:Emit(28)
	Debris:AddItem(emitter, 1.4)
end

local function clearLane(lane)
	if lane.boardLabel then
		lane.boardLabel.Text = ""
	end
	for _, label in lane.gateLabels do
		label.Text = ""
	end
	for _, gate in lane.gates do
		gate.CanTouch = false
	end
end

local function showQuestion(lane, prompt: string, options)
	lane.boardLabel.Text = prompt
	for index, gate in lane.gates do
		local label = lane.gateLabels[index]
		local option = options[index]
		if option then
			label.Text = option
			gate.CanTouch = true
			gate.Transparency = 0.45
		else
			label.Text = ""
			gate.CanTouch = false
			gate.Transparency = 0.9
		end
	end
end

local function acquire(arenaId: string)
	local lanes = world.lanes[arenaId]
	if not lanes then
		return nil
	end
	for slot, lane in ipairs(lanes) do
		if not lane.busy then
			lane.busy = true
			return slot, lane
		end
	end
	return nil
end

local function releaseRound(round)
	if round.lane then
		round.lane.busy = false
		clearLane(round.lane)
	end
end

local function packLocal(item, mode: string)
	local options = table.clone(item.Options)
	local rng = Random.new()
	for index = #options, 2, -1 do
		local swap = rng:NextInteger(1, index)
		options[index], options[swap] = options[swap], options[index]
	end
	local seconds = 0
	if mode == "tantangan" or mode == "boss" then
		seconds = Config.Timer[item.Tier] or 12
	end
	return {
		Id = item.Id,
		Prompt = item.Prompt,
		Options = options,
		Correct = table.find(options, item.Answer),
		Explanation = item.Explanation,
		Card = item.Card,
		Seconds = seconds,
		Source = "local",
	}
end

local function questionsFor(profile, arenaId: string, mode: string)
	if arenaId == "tutorial" then
		local packed = {}
		for _, item in QuestionBank.tutorial() do
			table.insert(packed, packLocal(item, "santai"))
		end
		return packed
	end
	local count = 6
	if mode == "tantangan" then
		count = 8
	end
	if arenaId == "boss" then
		count = 5
	end
	local packed = {}
	for _, item in QuestionBank.pick(profile, arenaId, count, mode) do
		table.insert(packed, packLocal(item, if arenaId == "boss" then "boss" else mode))
	end
	return packed
end

local function coinFor(round, combo: number): number
	local base = 8
	if round.mode == "tantangan" or round.arenaId == "boss" then
		base = 12
	end
	if round.arenaId == "tutorial" then
		base = 6
	end
	local bonus = 1 + 0.15 * math.min(math.max(combo - 1, 0), 6)
	return math.floor(base * bonus)
end

local function starsFor(round, elapsed: number): number
	if round.arenaId == "tutorial" or round.arenaId == "setor" or round.asked == 0 then
		return 0
	end
	local accuracy = round.correct / round.asked
	local stars = 0
	if accuracy >= 0.6 then
		stars = 1
	end
	if accuracy >= 0.85 then
		stars = 2
	end
	local timed = round.mode == "tantangan" or round.arenaId == "boss"
	if timed and accuracy >= 0.9 and elapsed <= round.budget then
		stars = 3
	end
	if round.mode == "santai" then
		stars = math.min(stars, 2)
	end
	return stars
end

local function finish(player: Player, round, skipped: boolean?)
	if round.finished then
		return
	end
	round.finished = true
	round.wait = false
	releaseRound(round)
	rounds[player] = nil
	local profile = profileOf(player)
	if not profile then
		return
	end
	local elapsed = os.clock() - round.startedAt
	local stars = if skipped then 0 else starsFor(round, elapsed)
	local best = 0
	if stars > 0 then
		best = Progress.keepStars(profile, round.arenaId, stars)
		Leaderboard.publish(player.UserId, profile.stats.week, profile.stats.weeklyStars or 0)
		Progress.noteArena(profile, if round.arenaId == "boss" then "boss" else round.mode)
		if round.arenaId == "boss" then
			profile.flags.boss = true
		end
		if round.arenaId == "a01" or round.arenaId == "a02" then
			BahasaApi.badge(player, profile, { "roblox-pasar-ejaan" })
		end
	end
	if round.arenaId == "tutorial" and not skipped then
		Progress.grantTutorial(player, profile)
		if not profile.flags.firstReward then
			profile.flags.firstReward = true
			Analytics.funnel(player, "first_reward")
		end
		toast(player, "Kamu Penjaga Muda. +50 koin dan Kartu pertama menantimu di pasar.", "good")
	end
	Analytics.custom(player, "arena_complete", round.correct)
	PlayerData.mark(player)
	Progress.push(player)
	Remotes.fire(player, "summary", {
		Arena = round.arenaId,
		Mode = round.mode,
		Correct = round.correct,
		Total = round.asked,
		Coins = round.coins,
		Stars = stars,
		Best = best,
		Skipped = skipped == true,
		Xp = round.xp or 0,
	})
	soundAt(player, Config.Sounds.Reward, 1)
end

local function resolveChoice(player: Player, round, choice: number?)
	local question = round.current
	local profile = profileOf(player)
	if not question or not profile or round.finished then
		return
	end
	local correct = false
	local explanation = question.Explanation or "Belum ada pembahasan."
	local xpGain = 0
	if question.Source == "web" then
		if choice and question.Options[choice] and question.SessionId ~= "" then
			local result = BahasaApi.submitAnswer(
				player,
				profile,
				question.SessionId,
				question.Id,
				question.Options[choice]
			)
			if type(result) == "table" then
				local feedback = result.feedback and result.feedback[1]
				if type(feedback) == "table" then
					correct = feedback.correct == true
					if type(feedback.explanation) == "string" and feedback.explanation ~= "" then
						explanation = feedback.explanation
					end
				end
				xpGain = tonumber(result.xp) or 0
				if type(result.totalXp) == "number" then
					profile.link.xp = result.totalXp
					profile.link.level = tonumber(result.level) or profile.link.level
					profile.link.rank = tostring(result.rank or profile.link.rank)
				end
			else
				explanation = "Jawaban tersimpan di antrean. XP menyusul saat sambungan pulih."
			end
		else
			explanation = "Waktu habis sebelum jawaban terkirim."
		end
	else
		correct = choice ~= nil and choice == question.Correct
		if choice == nil then
			explanation = "Waktu habis. " .. explanation
		end
	end

	round.asked += 1
	Progress.noteAnswer(profile, correct, question.Id, question.Source == "local")
	if not profile.flags.firstAnswer then
		profile.flags.firstAnswer = true
		Analytics.funnel(player, "first_answer")
	end
	local gained = 0
	local cardNew = false
	if correct then
		round.correct += 1
		round.combo += 1
		if not profile.flags.firstCorrect then
			profile.flags.firstCorrect = true
			Analytics.funnel(player, "first_correct")
		end
		gained = coinFor(round, round.combo)
		round.coins += gained
		round.xp += xpGain
		Progress.addCoins(profile, gained)
		cardNew = Progress.noteCard(profile, question.Card)
		soundAt(player, Config.Sounds.Correct, 1 + math.min(round.combo, 6) * 0.04)
		local gate = round.lane.gates[choice or 1]
		if gate then
			gate.Color = Palette.Teal
			burst(gate, Palette.Kunyit)
			task.delay(0.35, function()
				if gate.Parent then
					gate.Color = Palette.Teal
				end
			end)
		end
	else
		round.combo = 0
		soundAt(player, Config.Sounds.Wrong, 1)
		local character = player.Character
		local hrp = character and character:FindFirstChild("HumanoidRootPart")
		local humanoid = humanoidOf(player)
		if hrp then
			local ink = Instance.new("Part")
			ink.Anchored = true
			ink.CanCollide = false
			ink.CanTouch = false
			ink.Shape = Enum.PartType.Cylinder
			ink.Size = Vector3.new(0.4, 7, 7)
			ink.Color = Palette.Ungu
			ink.Material = Enum.Material.Neon
			ink.CFrame = CFrame.new(hrp.Position - Vector3.new(0, 2.6, 0)) * CFrame.Angles(0, 0, math.rad(90))
			ink.Parent = workspace
			Debris:AddItem(ink, 0.7)
			hrp.Anchored = true
			task.delay(0.35, function()
				if hrp.Parent then
					hrp.CFrame = round.lane.checkpoint
					hrp.Anchored = false
				end
			end)
		end
		if humanoid then
			humanoid.WalkSpeed = 10
			task.delay(0.7, function()
				if humanoid.Parent then
					humanoid.WalkSpeed = Config.WalkSpeed
				end
			end)
		end
		if choice and round.lane.gates[choice] then
			round.lane.gates[choice].Color = Palette.Koral
			task.delay(0.35, function()
				local gate = round.lane.gates[choice]
				if gate and gate.Parent then
					gate.Color = Palette.Teal
				end
			end)
		end
	end

	Remotes.fire(player, "resolved", {
		Correct = correct,
		Explanation = explanation,
		Combo = round.combo,
		Coins = gained,
		Card = cardNew,
		Xp = xpGain,
	})
	PlayerData.mark(player)
	Progress.push(player)
end

local function runRound(player: Player, round)
	for index, question in round.questions do
		if round.finished or not player.Parent then
			return
		end
		round.index = index
		round.current = question
		round.choice = nil
		round.wait = true
		round.questionAt = os.clock()
		showQuestion(round.lane, question.Prompt, question.Options)
		Remotes.fire(player, "question", {
			Arena = round.arenaId,
			Prompt = question.Prompt,
			Options = question.Options,
			Index = index,
			Total = #round.questions,
			Combo = round.combo,
			Seconds = question.Seconds,
			Tutorial = round.arenaId == "tutorial",
		})
		local limit = if question.Seconds > 0 then question.Seconds else 90
		local started = os.clock()
		while round.wait and player.Parent and not round.finished do
			if os.clock() - started >= limit then
				break
			end
			task.wait(0.1)
		end
		if round.finished or not player.Parent then
			return
		end
		resolveChoice(player, round, round.choice)
		task.wait(if round.choice and round.questions[index] then 0.85 else 0.45)
	end
	finish(player, round, false)
end

local function begin(player: Player, arenaId: string, mode: string, questions)
	if rounds[player] then
		toast(player, "Selesaikan dulu soal yang sedang berjalan.", "warn")
		return
	end
	local slot, lane = acquire(arenaId)
	if not slot then
		toast(player, "Arena sedang penuh. Coba sebentar lagi.", "warn")
		return
	end
	local budget = 1
	for _, question in questions do
		budget += question.Seconds or 0
	end
	if budget <= 1 then
		budget = 999
	end
	local round = {
		arenaId = arenaId,
		mode = mode,
		lane = lane,
		slot = slot,
		questions = questions,
		index = 0,
		correct = 0,
		asked = 0,
		combo = 0,
		coins = 0,
		xp = 0,
		startedAt = os.clock(),
		questionAt = os.clock(),
		budget = budget,
		finished = false,
		wait = false,
		choice = nil,
		current = nil,
	}
	rounds[player] = round
	pivot(player, lane.spawn)
	Analytics.custom(player, "arena_start", #questions)
	task.spawn(function()
		runRound(player, round)
	end)
end

function Challenge.startLocal(player: Player, arenaId: string, mode: string)
	local profile = profileOf(player)
	if not profile then
		return
	end
	if arenaId == "boss" and not ((profile.stars.a01 or 0) >= 1 and (profile.stars.a02 or 0) >= 1) then
		toast(player, "Kumpulkan minimal 1 bintang di kedua lapak dulu.", "warn")
		return
	end
	if arenaId ~= "tutorial" and arenaId ~= "a01" and arenaId ~= "a02" and arenaId ~= "boss" then
		return
	end
	if mode ~= "santai" and mode ~= "tantangan" and mode ~= "boss" then
		return
	end
	local questions = questionsFor(profile, arenaId, mode)
	if #questions == 0 then
		toast(player, "Soal arena ini belum siap.", "warn")
		return
	end
	begin(player, arenaId, mode, questions)
end

function Challenge.startTutorial(player: Player)
	local profile = profileOf(player)
	if not profile or profile.flags.tutorial then
		return
	end
	Challenge.startLocal(player, "tutorial", "santai")
end

function Challenge.skipTutorial(player: Player)
	local round = rounds[player]
	local profile = profileOf(player)
	if not profile then
		return
	end
	if round and round.arenaId == "tutorial" then
		finish(player, round, true)
	end
	if not profile.flags.tutorial then
		Progress.grantTutorial(player, profile, 20)
		toast(player, "Tutorial dilewati. Kamu tetap Penjaga Muda.", "info")
		Progress.push(player)
	end
end

function Challenge.startSetor(player: Player)
	local profile = profileOf(player)
	if not profile then
		return
	end
	if not profile.link.linked then
		toast(player, "Masukkan kode tautan dulu supaya XP akun bisa masuk.", "warn")
		return
	end
	if not profile.link.ageAllowed then
		toast(player, "Konfirmasi usiamu dulu di akun BahasaCerdas.", "warn")
		return
	end
	if not BahasaApi.online() then
		toast(player, "Sambungan belum ada. Latihan kota tetap bisa dimainkan.", "warn")
		return
	end
	if not world.lanes.setor then
		toast(player, "Setor XP ada di Alun-Alun.", "info")
		return
	end
	if rounds[player] then
		toast(player, "Selesaikan dulu soal yang sedang berjalan.", "warn")
		return
	end
	local questions = {}
	for _ = 1, 5 do
		local question = BahasaApi.fetchQuestion(player)
		if not question then
			break
		end
		question.Seconds = 20
		question.Correct = nil
		table.insert(questions, question)
	end
	if #questions == 0 then
		toast(player, "Setor XP belum bisa dimulai. Coba lagi nanti.", "warn")
		return
	end
	begin(player, "setor", "santai", questions)
end

function Challenge.submit(player: Player, index: number)
	local round = rounds[player]
	if not round or round.finished or not round.wait then
		return
	end
	if type(index) ~= "number" then
		return
	end
	index = math.floor(index)
	local question = round.current
	if not question or index < 1 or index > #question.Options then
		return
	end
	if os.clock() - round.questionAt < Config.MinAnswerSeconds then
		toast(player, "Terlalu cepat. Baca dulu soalnya.", "warn")
		return
	end
	round.choice = index
	round.wait = false
end

function Challenge.onSpawn(player: Player)
	local humanoid = humanoidOf(player)
	if humanoid then
		humanoid.WalkSpeed = Config.WalkSpeed
	end
	local profile = profileOf(player)
	if profile then
		Progress.applyLook(player, profile)
	end
	local round = rounds[player]
	if round and round.lane and not round.finished then
		task.defer(function()
			pivot(player, round.lane.checkpoint)
		end)
	end
end

local function near(player: Player, part: BasePart): boolean
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = humanoidOf(player)
	return hrp ~= nil
		and humanoid ~= nil
		and humanoid.Health > 0
		and (hrp.Position - part.Position).Magnitude <= 22
end

function Challenge.travel(player: Player, destination: string)
	if destination == "pasar" then
		local profile = profileOf(player)
		if Config.PasarPlaceId > 0 and game.PlaceId ~= Config.PasarPlaceId and not RunService:IsStudio() then
			local ok = pcall(function()
				TeleportService:TeleportAsync(Config.PasarPlaceId, { player })
			end)
			if not ok then
				toast(player, "Perjalanan ke Pasar Ejaan gagal. Coba lagi.", "warn")
			end
			return
		end
		if world.marketSpawn then
			pivot(player, world.marketSpawn)
			if profile and not profile.flags.world then
				profile.flags.world = true
				Analytics.funnel(player, "enter_world_1")
				PlayerData.mark(player)
			end
			toast(player, "Selamat datang di Pasar Ejaan.", "good")
		end
	elseif destination == "lobby" then
		if game.PlaceId ~= Config.LobbyPlaceId and not RunService:IsStudio() then
			local ok = pcall(function()
				TeleportService:TeleportAsync(Config.LobbyPlaceId, { player })
			end)
			if not ok then
				toast(player, "Kembali ke alun-alun gagal. Coba lagi.", "warn")
			end
			return
		end
		if world.lobbySpawn then
			pivot(player, world.lobbySpawn)
		else
			toast(player, "Di permainan yang sudah terbit, gerbang ini kembali ke Alun-Alun.", "info")
		end
	end
end

function Challenge.legacy(player: Player, id: string, part: BasePart)
	local placeId = nil
	local title = ""
	if id == "benar-salah" then
		placeId = Config.Legacy.BenarSalah
		title = "Arena Benar atau Salah"
	elseif id == "susun-kata" then
		placeId = Config.Legacy.SusunKata
		title = "Estafet Susun Kata"
	elseif id == "nusantara" then
		placeId = Config.Legacy.Nusantara
		title = "NUSANTARA"
	end
	if not placeId or not near(player, part) then
		toast(player, "Dekati gerbangnya dulu.", "warn")
		return
	end
	local now = os.clock()
	if now - (lastLegacy[player] or -100) < 8 then
		toast(player, "Tunggu sebentar sebelum mencoba lagi.", "warn")
		return
	end
	if RunService:IsStudio() then
		toast(player, "Pindah arena ini dicoba dari aplikasi Roblox setelah lobi diterbitkan.", "warn")
		return
	end
	lastLegacy[player] = now
	toast(player, "Menghubungkan ke " .. title .. "...", "info")
	local ok, err = pcall(function()
		TeleportService:TeleportAsync(placeId, { player })
	end)
	if not ok then
		lastLegacy[player] = nil
		warn("[Kota Aksara] Teleport gagal " .. id .. ": " .. tostring(err))
		toast(player, "Perpindahan belum berhasil. Coba lagi.", "warn")
	end
end

function Challenge.bind(registry)
	world = registry
	for _, gate in world.gates do
		gate.Touched:Connect(function(hit)
			local character = hit:FindFirstAncestorOfClass("Model")
			if not character then
				return
			end
			local player = Players:GetPlayerFromCharacter(character)
			if not player then
				return
			end
			local round = rounds[player]
			if not round or round.finished or gate:GetAttribute("ArenaId") ~= round.arenaId then
				return
			end
			if gate:GetAttribute("Slot") ~= round.slot then
				return
			end
			Challenge.submit(player, gate:GetAttribute("GateIndex"))
		end)
	end

	Players.PlayerRemoving:Connect(function(player)
		local round = rounds[player]
		if round then
			round.finished = true
			round.wait = false
			releaseRound(round)
			rounds[player] = nil
		end
		lastLegacy[player] = nil
		cardTouch[player] = nil
	end)

	TeleportService.TeleportInitFailed:Connect(function(player)
		if player and player.Parent then
			lastLegacy[player] = nil
			toast(player, "Koneksi perpindahan gagal. Coba lagi.", "warn")
		end
	end)
end

function Challenge.secretCard(player: Player)
	if os.clock() - (cardTouch[player] or 0) < 2 then
		return
	end
	cardTouch[player] = os.clock()
	local profile = profileOf(player)
	if not profile then
		return
	end
	if profile.cards.w_tersembunyi then
		toast(player, "Kartu di atap ini sudah kamu ambil.", "info")
		return
	end
	local fresh = Progress.noteCard(profile, {
		Id = "w_tersembunyi",
		Word = "Aksara",
		Definition = "Huruf yang menjaga nama-nama di kota ini.",
	})
	if fresh then
		Progress.addCoins(profile, 15)
		toast(player, "Kamu menemukan Kartu Kata tersembunyi: Aksara. +15 koin.", "good")
		soundAt(player, Config.Sounds.Reward, 1.05)
		Progress.push(player)
	end
end

return Challenge
