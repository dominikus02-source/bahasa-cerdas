local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Shared.Config)
local BahasaApi = require(ServerScriptService.Kernel.BahasaApi)
local Picker = require(ServerScriptService.Kernel.Picker)
local Progress = require(ServerScriptService.Kernel.Progress)
local Remotes = require(ServerScriptService.Kernel.Remotes)
local Shell = require(ServerScriptService.Kernel.Shell)
local Bank = require(script.Parent.Bank)

local Quest = {}

local sessions = {}
local world = nil
local angle = 0

local HUB = CFrame.new(0, 4, -4)
local JAWA = CFrame.new(0, 4, -408)
local SUMATRA = CFrame.new(430, 4, -4)
local BOSS = CFrame.new(0, 4, -798)

local function journey(profile)
	if type(profile.journey) ~= "table" then
		profile.journey = {
			jawa = false,
			sumatra = false,
			secretJawa = false,
			secretSumatra = false,
			boss = false,
			jurus = {},
		}
	end
	if type(profile.journey.jurus) ~= "table" then
		profile.journey.jurus = {}
	end
	return profile.journey
end

local function move(player: Player, target: CFrame)
	local character = player.Character
	if character then
		character:PivotTo(target)
	end
end

local function ownsJurus(list, id: string): boolean
	for _, owned in list do
		if owned == id then
			return true
		end
	end
	return false
end

local function shuffleOptions(options)
	local copy = table.clone(options)
	local rng = Random.new()
	for index = #copy, 2, -1 do
		local swap = rng:NextInteger(1, index)
		copy[index], copy[swap] = copy[swap], copy[index]
	end
	return copy
end

local function showQuiz(player: Player, session)
	local item = session.items[session.index]
	session.shown = os.clock()
	session.open = true
	session.token += 1
	Remotes.fire(player, "quiz", {
		Head = tostring(session.index) .. " dari " .. tostring(#session.items),
		Body = item.Statement,
		Foot = session.label,
		Left = "Benar",
		Right = "Salah",
	})
end

local function showChoice(player: Player, session)
	local item = session.items[session.index]
	session.shown = os.clock()
	session.open = true
	session.token += 1
	session.offered = shuffleOptions(item.Options)
	Remotes.fire(player, "choice3", {
		Head = session.label .. " · " .. tostring(session.index) .. "/" .. tostring(#session.items),
		Body = item.Prompt,
		Options = session.offered,
	})
end

local function showLine(player: Player, session)
	local item = session.line
	session.shown = os.clock()
	session.open = true
	session.token += 1
	local tiles = {}
	for index, word in item.Words do
		table.insert(tiles, { Id = tostring(index), Text = word })
	end
	local rng = Random.new()
	for index = #tiles, 2, -1 do
		local swap = rng:NextInteger(1, index)
		tiles[index], tiles[swap] = tiles[swap], tiles[index]
	end
	session.byId = {}
	for _, tile in tiles do
		session.byId[tile.Id] = tile.Text
	end
	session.answer = table.concat(item.Words, " ")
	session.count = #item.Words
	Remotes.fire(player, "tiles", {
		Head = "Fase dua · susun semboyan",
		Body = "Hindari gumpal ungu. Urutan yang salah tidak menghabisi, hanya mengulang.",
		Foot = item.Note,
		Tiles = tiles,
	})
end

local function closeSession(player: Player)
	local session = sessions[player]
	if session then
		session.done = true
		session.open = false
	end
	sessions[player] = nil
end

local function growPena(correct: number)
	if world and world.pena then
		local height = 2 + correct * 1.6
		world.pena.Size = Vector3.new(1.2, height, 1.2)
		world.pena.CFrame = CFrame.new(0, 1 + height / 2, -830)
	end
end

local function finishBoss(player: Player, session)
	local profile = Shell.profile(player)
	local ratio = session.correct / math.max(session.asked, 1)
	local won = ratio >= 0.7
	if profile then
		if won then
			Progress.keepStars(profile, "ns_penjaga", 3)
			Progress.addCoins(profile, 80)
			journey(profile).boss = true
			if not profile.flags.nsBadge then
				profile.flags.nsBadge = true
				BahasaApi.badge(player, profile, { "roblox-nusantara-penjaga" })
			end
		else
			Progress.keepStars(profile, "ns_penjaga", 1)
			Progress.addCoins(profile, 20)
		end
		Progress.noteArena(profile, "boss")
		Shell.mark(player)
		Shell.push(player)
	end
	growPena(0)
	local body = if won
		then "Makna tulisan resmi tetap jernih. Bahasa daerah tidak kamu kalahkan. Kamu menjaganya supaya tidak tertukar dengan ejaan yang rusak."
		else "Penjaga Makna masih berjaga. Ulangi dari gapura kalau kamu mau mencoba lagi."
	Remotes.fire(player, "result", {
		Correct = won,
		Done = true,
		Head = if won then "Penjaga Makna undur" else "Belum cukup jernih",
		Body = body,
		Foot = tostring(session.correct) .. " tepat dari " .. tostring(session.asked) .. ".",
	})
	closeSession(player)
	task.delay(2, function()
		if player.Parent then
			move(player, HUB)
		end
	end)
end

local function advance(player: Player, session)
	if session.index >= #session.items then
		if session.phase == "boss1" then
			session.phase = "boss2"
			session.open = false
			local picked = Picker.take(Shell.profile(player), Bank.BossLine, 1, "ejaan", {})
			session.line = picked[1]
			if not session.line then
				finishBoss(player, session)
				return
			end
			task.delay(1.2, function()
				if sessions[player] == session then
					showLine(player, session)
				end
			end)
			return
		end
		if
			session.phase == "boss3"
			or session.phase == "jawa"
			or session.phase == "sumatra"
			or session.phase == "jurus"
		then
			task.delay(1.2, function()
				if sessions[player] ~= session then
					return
				end
				if session.phase == "boss3" then
					finishBoss(player, session)
					return
				end
				local profile = Shell.profile(player)
				if profile then
					local row = journey(profile)
					if session.phase == "jawa" then
						row.jawa = true
						Progress.keepStars(profile, "ns_jawa", if session.correct >= 4 then 2 else 1)
					elseif session.phase == "sumatra" then
						row.sumatra = true
						Progress.keepStars(profile, "ns_sumatra", if session.correct >= 3 then 2 else 1)
					elseif session.phase == "jurus" then
						Progress.keepStars(profile, "ns_jurus", math.clamp(session.correct, 0, 3))
					end
					Progress.addCoins(profile, session.correct * 8)
					Shell.mark(player)
					Shell.push(player)
				end
				Remotes.fire(player, "result", {
					Correct = true,
					Done = true,
					Head = "Selesai",
					Body = session.closing,
					Foot = tostring(session.correct) .. " tepat.",
				})
				closeSession(player)
			end)
			return
		end
	end
	session.index += 1
	task.delay(1.15, function()
		if sessions[player] ~= session or session.done then
			return
		end
		if session.phase == "jurus" or session.phase == "boss1" then
			showChoice(player, session)
		else
			showQuiz(player, session)
		end
	end)
end

local function gradeBool(player: Player, choice: string?)
	local session = sessions[player]
	if not session or not session.open or session.done then
		return
	end
	if os.clock() - session.shown < Config.MinAnswerSeconds then
		Shell.toast(player, "Baca dulu, jangan terburu.", "warn")
		return
	end
	session.open = false
	local item = session.items[session.index]
	local picked = if choice == "benar" then true elseif choice == "salah" then false else nil
	local correct = picked == item.Truth
	session.asked += 1
	if correct then
		session.correct += 1
	end
	local profile = Shell.profile(player)
	if profile then
		Progress.noteAnswer(profile, correct, item.Id, "ejaan")
		if correct and item.Card then
			Progress.noteCard(profile, item.Card)
		end
		Shell.mark(player)
	end
	if session.phase == "boss1" or session.phase == "boss3" then
		growPena(session.correct)
	end
	Remotes.fire(player, "result", {
		Correct = correct,
		Done = false,
		Head = if correct then "Tepat" else "Belum tepat",
		Body = item.Explanation,
		Foot = if item.Truth then "Pernyataannya benar." else "Pernyataannya salah.",
	})
	advance(player, session)
end

local function gradeChoice(player: Player, text: string)
	local session = sessions[player]
	if not session or not session.open then
		return
	end
	if os.clock() - session.shown < Config.MinAnswerSeconds then
		Shell.toast(player, "Lihat ketiga jurus dulu.", "warn")
		return
	end
	local allowed = false
	for _, option in session.offered do
		if option == text then
			allowed = true
		end
	end
	if not allowed then
		return
	end
	session.open = false
	local item = session.items[session.index]
	local correct = text == item.Answer
	if session.phase == "jurus" and not correct and (session.misses or 0) < 1 then
		session.misses = 1
		local character = player.Character
		local hrp = character and character:FindFirstChild("HumanoidRootPart")
		if hrp and hrp:IsA("BasePart") then
			hrp.AssemblyLinearVelocity = Vector3.new(0, 18, 12)
		end
		Shell.toast(player, "Kabut belum buyar. Pilih jurus lain.", "warn")
		showChoice(player, session)
		return
	end
	session.misses = 0
	session.asked += 1
	if correct then
		session.correct += 1
		local profile = Shell.profile(player)
		if profile then
			local row = journey(profile)
			if not ownsJurus(row.jurus, item.Id) then
				table.insert(row.jurus, item.Id)
			end
		end
	end
	local profile = Shell.profile(player)
	if profile then
		Progress.noteAnswer(profile, correct, item.Id, "kosakata")
		Shell.mark(player)
	end
	if session.phase == "boss1" then
		growPena(session.correct)
	end
	Remotes.fire(player, "result", {
		Correct = correct,
		Done = false,
		Head = if correct then "Jurus tepat" else "Kabut belum buyar",
		Body = item.Explanation,
		Foot = "Bentuk yang dijaga: " .. item.Answer,
	})
	advance(player, session)
end

function Quest.order(player: Player, order)
	local session = sessions[player]
	if not session or session.phase ~= "boss2" or not session.open or type(order) ~= "table" then
		return
	end
	local built = {}
	local seen = {}
	for _, id in order do
		local key = tostring(id)
		if seen[key] or not session.byId[key] then
			return
		end
		seen[key] = true
		table.insert(built, session.byId[key])
	end
	if #built ~= session.count then
		Shell.toast(player, "Masih ada balok di luar semboyan.", "warn")
		return
	end
	session.asked += 1
	local correct = table.concat(built, " ") == session.answer
	session.open = false
	if correct then
		session.correct += 1
	end
	local profile = Shell.profile(player)
	if profile then
		Progress.noteAnswer(profile, correct, session.line.Id, "ejaan")
		Shell.mark(player)
	end
	Remotes.fire(player, "result", {
		Correct = correct,
		Done = false,
		Head = if correct then "Semboyan utuh" else "Urutan belum jadi",
		Body = session.answer,
		Foot = session.line.Note,
	})
	session.phase = "boss3"
	session.items = Picker.take(profile, Bank.BossFast, 6, "ejaan", {})
	session.index = 1
	session.label = "Fase tiga"
	task.delay(1.3, function()
		if sessions[player] == session and #session.items > 0 then
			showQuiz(player, session)
		elseif sessions[player] == session then
			finishBoss(player, session)
		end
	end)
end

local function startList(player: Player, phase: string, items, label: string, closing: string, shower)
	if #items == 0 then
		Shell.toast(player, "Soal wilayah ini belum siap.", "warn")
		return
	end
	local previous = sessions[player]
	if previous then
		previous.done = true
	end
	local session = {
		phase = phase,
		items = items,
		index = 1,
		correct = 0,
		asked = 0,
		token = 0,
		shown = 0,
		open = false,
		done = false,
		label = label,
		closing = closing,
	}
	sessions[player] = session
	shower(player, session)
end

function Quest.jawaQuiz(player: Player)
	local profile = Shell.profile(player)
	if not profile then
		return
	end
	startList(
		player,
		"jawa",
		Picker.take(profile, Bank.Jawa, 5, "ejaan", {}),
		"Gapura Jawa",
		"Mbok Leksika mengangguk. Jurus kata di bantalan ungu, atau lanjut ke Penjaga Makna.",
		showQuiz
	)
end

function Quest.jurus(player: Player)
	local profile = Shell.profile(player)
	if not profile then
		return
	end
	if not journey(profile).jawa then
		Shell.toast(player, "Selesaikan kuis Mbok Leksika dulu.", "warn")
		return
	end
	startList(
		player,
		"jurus",
		Picker.take(profile, Bank.Jurus, 4, "kosakata", {}),
		"Jurus kata",
		"Empat jurus sudah kamu coba. Nama yang tepat tersimpan di perjalananmu.",
		showChoice
	)
end

function Quest.sumatra(player: Player)
	local profile = Shell.profile(player)
	if not profile then
		return
	end
	startList(
		player,
		"sumatra",
		Picker.take(profile, Bank.Sumatra, 4, "ejaan", {}),
		"Pesisir Sumatra",
		"Cik Malaya menutup naskah. Dermaga tetap menyala di belakangmu.",
		showQuiz
	)
end

function Quest.boss(player: Player)
	local profile = Shell.profile(player)
	if not profile then
		return
	end
	if not journey(profile).jawa then
		Shell.toast(player, "Penjaga Makna menunggu kamu selesai di Gapura Jawa.", "warn")
		move(player, JAWA)
		return
	end
	move(player, BOSS)
	growPena(0)
	Remotes.fire(player, "speech", {
		Speaker = "Penjaga Makna",
		Text = "Aku menjaga tulisan resmi. Bahasa di rumahmu bukan lawanku.",
	})
	task.delay(1.2, function()
		if not player.Parent or not Shell.profile(player) then
			return
		end
		startList(
			player,
			"boss1",
			Picker.take(Shell.profile(player), Bank.BossAsk, 4, "ejaan", {}),
			"Fase satu",
			"",
			showChoice
		)
	end)
end

function Quest.secret(player: Player, which: string)
	local profile = Shell.profile(player)
	if not profile then
		return
	end
	local row = journey(profile)
	local flag = if which == "jawa" then "secretJawa" else "secretSumatra"
	if row[flag] then
		Shell.toast(player, "Prasasti ini sudah kamu baca.", "info")
		return
	end
	row[flag] = true
	local card = if which == "jawa"
		then {
			Id = "ns_prasasti_jawa",
			Word = "persatuan",
			Definition = "Bahasa Indonesia dipakai bersama tanpa menghapus bahasa daerah.",
		}
		else {
			Id = "ns_prasasti_sumatra",
			Word = "Melayu",
			Definition = "Bahasa Indonesia tumbuh dari bahasa Melayu yang hidup di pesisir Nusantara.",
		}
	Progress.noteCard(profile, card)
	Progress.addCoins(profile, 30)
	Shell.mark(player)
	Shell.push(player)
	Shell.toast(player, "Prasasti terbaca. Satu kartu baru masuk album.", "good")
end

function Quest.bind(built)
	world = built
	local function back(player: Player)
		move(player, HUB)
	end
	built.backJawa.Triggered:Connect(back)
	built.backSumatra.Triggered:Connect(back)
	built.backBoss.Triggered:Connect(back)
	built.jawaTalk.Triggered:Connect(function(player)
		Remotes.fire(player, "speech", {
			Speaker = "Mbok Leksika",
			Text = "Bahasa Jawa di rumah itu harta. Di papan resmi, kita pakai kaidah bersama.",
		})
	end)
	built.jawaQuiz.Triggered:Connect(Quest.jawaQuiz)
	built.jawaJurus.Triggered:Connect(Quest.jurus)
	built.secretJawa.Triggered:Connect(function(player)
		Quest.secret(player, "jawa")
	end)
	built.sumatraTalk.Triggered:Connect(function(player)
		Quest.sumatra(player)
	end)
	built.secretSumatra.Triggered:Connect(function(player)
		Quest.secret(player, "sumatra")
	end)
	built.toBoss.Triggered:Connect(Quest.boss)
	built.boss.Triggered:Connect(Quest.boss)
	for _, prompt in built.gates do
		prompt.Triggered:Connect(function(player)
			local gate = prompt:GetAttribute("Gate")
			if gate == "jawa" then
				move(player, JAWA)
				Remotes.fire(player, "speech", {
					Speaker = "Mbok Leksika",
					Text = "Selamat datang di gapura. Mulai dari papan kuis, atau sapalah aku dulu.",
				})
			elseif gate == "sumatra" then
				move(player, SUMATRA)
				Remotes.fire(player, "speech", {
					Speaker = "Cik Malaya",
					Text = "Pesisir ini menyimpan akar Melayu. Sapalah aku untuk kuis singkat.",
				})
			else
				Shell.toast(player, "Wilayah ini menyusul. Jawa dan Sumatra sudah bisa dijelajah.", "info")
			end
		end)
	end
	for _, orb in built.orbs do
		orb.Touched:Connect(function(hit)
			if not hit:IsA("BasePart") then
				return
			end
			local model = hit:FindFirstAncestorOfClass("Model")
			if not model then
				return
			end
			local player = game:GetService("Players"):GetPlayerFromCharacter(model)
			local session = player and sessions[player]
			if not session or session.phase ~= "boss2" or not session.open then
				return
			end
			if os.clock() - (session.bumped or 0) < 1.4 then
				return
			end
			session.bumped = os.clock()
			local hrp = model:FindFirstChild("HumanoidRootPart")
			if hrp and hrp:IsA("BasePart") then
				hrp.AssemblyLinearVelocity = Vector3.new(0, 22, -16)
			end
			Shell.toast(player, "Kabut menyenggol. Susun lagi dari awal.", "warn")
			showLine(player, session)
		end)
	end
	game:GetService("Players").PlayerRemoving:Connect(function(player)
		local session = sessions[player]
		if session then
			session.done = true
			sessions[player] = nil
		end
	end)
	RunService.Heartbeat:Connect(function(dt)
		angle += dt * 0.7
		for index, orb in built.orbs do
			local spin = angle + (index - 1) * math.pi * 2 / 3
			orb.CFrame = CFrame.new(math.cos(spin) * 16, 3.2, -830 + math.sin(spin) * 16)
		end
	end)
end

function Quest.choice(player: Player, payload)
	if not Shell.allow(player, "answer", 8, 6) then
		return
	end
	local session = sessions[player]
	if not session then
		return
	end
	if session.phase == "jurus" or session.phase == "boss1" then
		gradeChoice(player, tostring(payload.Text or ""))
	else
		gradeBool(player, payload.Id)
	end
end

function Quest.welcome(player: Player, profile)
	journey(profile)
	Remotes.fire(player, "speech", {
		Speaker = "Dermaga",
		Text = "Delapan gapura mengelilingi peta. Masuk ke Jawa atau Sumatra. Enam lagi menyusul.",
	})
	if not profile.flags.nsWelcomed then
		profile.flags.nsWelcomed = true
		Shell.mark(player)
	end
end

function Quest.goal(profile): string
	local row = journey(profile)
	local count = #row.jurus
	if not row.jawa then
		return "Masuk Gapura Jawa dan selesaikan kuis Mbok Leksika."
	end
	if not row.boss then
		return "Jurus terkumpul " .. tostring(count) .. ". Penjaga Makna menunggu di ujung jalan Jawa."
	end
	if not row.sumatra then
		return "Pesisir Sumatra masih sepi. Cik Malaya punya kuis singkat."
	end
	return "Dua wilayah terbuka sudah kamu jelajahi. Enam gapura menyusul."
end

return Quest
