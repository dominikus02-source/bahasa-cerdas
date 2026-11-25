local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Cosmetics = require(ReplicatedStorage.Shared.Cosmetics)
local DailyRewards = require(ReplicatedStorage.Shared.DailyRewards)
local Juice = require(script.Parent.Juice)
local Palette = require(ReplicatedStorage.Shared.Palette)

local Hud = {}

local FONT_TITLE = Enum.Font.GothamBold
local FONT_BODY = Enum.Font.GothamMedium
for _, item in Enum.Font:GetEnumItems() do
	if item.Name == "BuilderSans" then
		FONT_BODY = item
	elseif item.Name == "BuilderSansBold" then
		FONT_TITLE = item
	end
end

local function corner(parent: Instance, radius: number)
	local ui = Instance.new("UICorner")
	ui.CornerRadius = UDim.new(0, radius)
	ui.Parent = parent
end

local function stroke(parent: Instance, color: Color3, thickness: number?)
	local ui = Instance.new("UIStroke")
	ui.Color = color
	ui.Thickness = thickness or 1
	ui.Transparency = 0.55
	ui.Parent = parent
end

local function warmPlate(frame: GuiObject)
	frame.BackgroundColor3 = Palette.Plate
	frame.BackgroundTransparency = 0.22
	frame.BorderSizePixel = 0
	corner(frame, 12)
	stroke(frame, Palette.WoodDark, 1)
	local wash = Instance.new("UIGradient")
	wash.Color = ColorSequence.new(Palette.White, Palette.Krem)
	wash.Rotation = 90
	wash.Parent = frame
end

local function label(parent: Instance, text: string, font: Enum.Font, color: Color3, textSize: number?)
	local ui = Instance.new("TextLabel")
	ui.BackgroundTransparency = 1
	ui.Font = font
	ui.Text = text
	ui.TextColor3 = color
	ui.TextSize = textSize or 13
	ui.TextScaled = false
	ui.TextWrapped = true
	ui.TextTruncate = Enum.TextTruncate.AtEnd
	ui.TextXAlignment = Enum.TextXAlignment.Left
	ui.TextYAlignment = Enum.TextYAlignment.Center
	ui.AutoLocalize = false
	ui.Parent = parent
	return ui
end

local function button(parent: Instance, text: string, color: Color3)
	local ui = Instance.new("TextButton")
	ui.AutoButtonColor = true
	if color == Palette.White then
		color = Palette.Plate
	end
	ui.BackgroundColor3 = color
	ui.BackgroundTransparency = 0.02
	ui.Font = FONT_TITLE
	ui.Text = text
	ui.TextColor3 = Palette.Ink
	ui.TextSize = 13
	ui.TextScaled = false
	ui.TextWrapped = true
	ui.TextTruncate = Enum.TextTruncate.AtEnd
	ui.AutoLocalize = false
	ui.Parent = parent
	corner(ui, 10)
	stroke(ui, Palette.WoodDark, 1)
	return ui
end

function Hud.mount(fire)
	local gui = Instance.new("ScreenGui")
	gui.Name = "KotaAksara"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	pcall(function()
		gui.ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets
	end)
	gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

	local flash = Instance.new("Frame")
	flash.Size = UDim2.fromScale(1, 1)
	flash.BackgroundTransparency = 1
	flash.BorderSizePixel = 0
	flash.ZIndex = 1
	flash.Parent = gui
	Juice.bindFlash(flash)

	-- Persistent chrome is one 36px bar. On a 667x375 phone that is under 10% of the screen.
	local top = Instance.new("Frame")
	top.Position = UDim2.fromOffset(8, 8)
	top.Size = UDim2.new(1, -16, 0, 28)
	top.Parent = gui
	warmPlate(top)
	local topCap = Instance.new("UISizeConstraint")
	topCap.MaxSize = Vector2.new(1920, 28)
	topCap.Parent = top
	local coins = label(top, "Koin 0", FONT_TITLE, Palette.Ink, 12)
	coins.Position = UDim2.fromOffset(8, 0)
	coins.Size = UDim2.fromOffset(88, 28)
	local stars = label(top, "Bintang 0", FONT_BODY, Palette.Kunyit, 12)
	stars.Position = UDim2.fromOffset(96, 0)
	stars.Size = UDim2.new(1, -168, 0, 28)

	local menuButton = button(top, "Menu", Palette.Teal)
	menuButton.AnchorPoint = Vector2.new(1, 0.5)
	menuButton.Position = UDim2.new(1, -4, 0.5, 0)
	menuButton.Size = UDim2.fromOffset(58, 22)
	menuButton.TextSize = 12

	local promptCard = Instance.new("Frame")
	promptCard.AnchorPoint = Vector2.new(0.5, 0)
	promptCard.Position = UDim2.new(0.5, 0, 0, 40)
	promptCard.Size = UDim2.new(1, -24, 0, 34)
	promptCard.Visible = false
	promptCard.Parent = gui
	warmPlate(promptCard)
	local promptLimit = Instance.new("UISizeConstraint")
	promptLimit.MaxSize = Vector2.new(560, 34)
	promptLimit.Parent = promptCard
	local promptText = label(promptCard, "", FONT_BODY, Palette.Ink, 13)
	promptText.Size = UDim2.new(1, -78, 1, 0)
	promptText.Position = UDim2.fromOffset(8, 0)
	promptText.TextXAlignment = Enum.TextXAlignment.Center
	local timer = label(promptCard, "", FONT_TITLE, Palette.Koral, 15)
	timer.AnchorPoint = Vector2.new(1, 0)
	timer.Position = UDim2.new(1, -8, 0, 0)
	timer.Size = UDim2.fromOffset(28, 34)
	timer.TextXAlignment = Enum.TextXAlignment.Right
	timer.Visible = false

	local combo = label(gui, "", FONT_TITLE, Palette.Navy, 16)
	combo.AnchorPoint = Vector2.new(0.5, 0)
	combo.Position = UDim2.new(0.5, 0, 0, 100)
	combo.Size = UDim2.fromOffset(120, 18)
	combo.TextSize = 12
	combo.BackgroundColor3 = Palette.Kunyit
	combo.BackgroundTransparency = 1
	combo.TextXAlignment = Enum.TextXAlignment.Center
	corner(combo, 8)

	local answers = Instance.new("Frame")
	answers.AnchorPoint = Vector2.new(1, 1)
	answers.Position = UDim2.new(1, -8, 1, -72)
	answers.Size = UDim2.fromOffset(176, 120)
	answers.BackgroundTransparency = 1
	answers.Visible = false
	answers.Parent = gui
	local answerLimit = Instance.new("UISizeConstraint")
	answerLimit.MaxSize = Vector2.new(176, 120)
	answerLimit.Parent = answers
	local grid = Instance.new("UIListLayout")
	grid.Padding = UDim.new(0, 4)
	grid.SortOrder = Enum.SortOrder.LayoutOrder
	grid.Parent = answers
	local answerButtons = {}
	for index = 1, 4 do
		local choice = button(answers, "", Palette.Plate)
		choice.Size = UDim2.new(1, 0, 0, 28)
		choice.TextSize = 12
		choice.TextXAlignment = Enum.TextXAlignment.Center
		choice.LayoutOrder = index
		choice.MouseButton1Click:Connect(function()
			Juice.click()
			fire("choose", { Index = index })
		end)
		answerButtons[index] = choice
	end

	local speech = Instance.new("Frame")
	speech.AnchorPoint = Vector2.new(0.5, 0)
	speech.Position = UDim2.new(0.5, 0, 0, 48)
	speech.Size = UDim2.new(1, -32, 0, 28)
	speech.Visible = false
	speech.Parent = gui
	warmPlate(speech)
	local speechLimit = Instance.new("UISizeConstraint")
	speechLimit.MaxSize = Vector2.new(420, 28)
	speechLimit.Parent = speech
	local speechText = label(speech, "", FONT_BODY, Palette.Ink, 12)
	speechText.Size = UDim2.new(1, -12, 1, 0)
	speechText.Position = UDim2.fromOffset(6, 0)

	local toastFrame = label(gui, "", FONT_BODY, Palette.Ink, 14)
	toastFrame.AnchorPoint = Vector2.new(0, 1)
	toastFrame.Position = UDim2.new(0, 8, 1, -8)
	toastFrame.Size = UDim2.fromOffset(220, 24)
	toastFrame.BackgroundColor3 = Palette.Krem
	toastFrame.BackgroundTransparency = 1
	toastFrame.TextTransparency = 1
	toastFrame.TextXAlignment = Enum.TextXAlignment.Center
	corner(toastFrame, 8)
	local toastLimit = Instance.new("UISizeConstraint")
	toastLimit.MaxSize = Vector2.new(480, 28)
	toastLimit.Parent = toastFrame

	local shade = Instance.new("TextButton")
	shade.Size = UDim2.fromScale(1, 1)
	shade.BackgroundColor3 = Palette.Ink
	shade.BackgroundTransparency = 0.35
	shade.Text = ""
	shade.Visible = false
	shade.AutoButtonColor = false
	shade.ZIndex = 5
	shade.Parent = gui

	local modal = Instance.new("Frame")
	modal.AnchorPoint = Vector2.new(0.5, 0.5)
	modal.Position = UDim2.fromScale(0.5, 0.5)
	modal.Size = UDim2.new(1, -24, 0, 360)
	modal.Visible = false
	modal.ZIndex = 6
	modal.Parent = gui
	warmPlate(modal)
	local modalLimit = Instance.new("UISizeConstraint")
	modalLimit.MaxSize = Vector2.new(440, 420)
	modalLimit.Parent = modal
	local modalTitle = label(modal, "", FONT_TITLE, Palette.Navy)
	modalTitle.Position = UDim2.fromOffset(16, 12)
	modalTitle.Size = UDim2.new(1, -32, 0, 36)
	modalTitle.ZIndex = 7
	local scroller = Instance.new("ScrollingFrame")
	scroller.Position = UDim2.fromOffset(12, 56)
	scroller.Size = UDim2.new(1, -24, 1, -112)
	scroller.BackgroundTransparency = 1
	scroller.BorderSizePixel = 0
	scroller.ScrollBarThickness = 6
	scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
	scroller.CanvasSize = UDim2.new()
	scroller.ZIndex = 7
	scroller.Parent = modal
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 8)
	list.Parent = scroller
	local close = button(modal, "Tutup", Palette.Teal)
	close.AnchorPoint = Vector2.new(0.5, 1)
	close.Position = UDim2.new(0.5, 0, 1, -12)
	close.Size = UDim2.fromOffset(160, 42)
	close.ZIndex = 7

	local menu = Instance.new("Frame")
	menu.AnchorPoint = Vector2.new(1, 0)
	menu.Position = UDim2.new(1, -12, 0, 64)
	menu.Size = UDim2.fromOffset(132, 200)
	menu.Visible = false
	menu.ZIndex = 6
	menu.Parent = gui
	warmPlate(menu)
	local menuList = Instance.new("UIListLayout")
	menuList.Padding = UDim.new(0, 6)
	menuList.HorizontalAlignment = Enum.HorizontalAlignment.Center
	menuList.Parent = menu
	local menuPad = Instance.new("UIPadding")
	menuPad.PaddingTop = UDim.new(0, 8)
	menuPad.Parent = menu

	local state = nil
	local deadline = 0
	local skip = button(promptCard, "Lewati", Palette.White)
	skip.AnchorPoint = Vector2.new(1, 0.5)
	skip.Position = UDim2.new(1, -40, 0.5, 0)
	skip.Size = UDim2.fromOffset(64, 26)
	skip.Visible = false
	skip.MouseButton1Click:Connect(function()
		Juice.click()
		skip.Visible = false
		fire("skip", {})
	end)

	local function clearList()
		for _, child in scroller:GetChildren() do
			if child:IsA("GuiObject") then
				child:Destroy()
			end
		end
	end

	local function showModal(title: string)
		menu.Visible = false
		shade.Visible = true
		modal.Visible = true
		modalTitle.Text = title
		clearList()
	end

	local function hideModal()
		shade.Visible = false
		modal.Visible = false
		speech.Visible = false
	end

	close.MouseButton1Click:Connect(function()
		Juice.click()
		hideModal()
	end)
	shade.MouseButton1Click:Connect(hideModal)

	local function rowButton(text: string, color: Color3, callback)
		local ui = button(scroller, text, color)
		ui.Size = UDim2.new(1, -8, 0, 30)
		ui.TextSize = 13
		ui.ZIndex = 7
		ui.MouseButton1Click:Connect(function()
			Juice.click()
			callback()
		end)
		return ui
	end

	local function openShop()
		showModal("Toko Kosmetik")
		if not state then
			return
		end
		local owned = {}
		for _, id in state.Owned or {} do
			owned[id] = true
		end
		for _, item in Cosmetics.List do
			if not item.Hidden then
				local equipped = state.Equipped and state.Equipped[item.Slot] == item.Id
				local caption = item.Name .. " · " .. tostring(item.Price) .. " koin"
				if owned[item.Id] then
					caption = item.Name .. (if equipped then " · dipakai" else " · pakai")
				end
				rowButton(caption, if owned[item.Id] then Palette.Teal else Palette.Kunyit, function()
					if owned[item.Id] then
						fire("equip", { Id = item.Id })
					else
						fire("buy", { Id = item.Id })
					end
				end)
			end
		end
	end

	local function openQuests()
		showModal("Papan Misi")
		if not state then
			return
		end
		local function draw(rows)
			for _, quest in rows do
				local caption = quest.Text .. "  " .. tostring(quest.Progress) .. "/" .. tostring(quest.Goal)
				if quest.Claimed then
					caption = caption .. " · diambil"
				elseif quest.Done then
					caption = caption .. " · ambil " .. tostring(quest.Reward)
				end
				rowButton(
					caption,
					if quest.Done and not quest.Claimed then Palette.Kunyit else Palette.White,
					function()
						if quest.Done and not quest.Claimed then
							fire("claimQuest", { Id = quest.Id })
						end
					end
				)
			end
		end
		draw(state.Quests or {})
		draw(state.Weekly or {})
	end

	local function openDaily()
		showModal("Hadiah 7 Hari")
		if not state then
			return
		end
		for index, reward in DailyRewards do
			local mark = "Hari " .. tostring(index) .. " · " .. tostring(reward.Coins) .. " koin"
			if reward.Freeze then
				mark = mark .. " + pelindung"
			end
			rowButton(mark, if index == state.DailyDay then Palette.Kunyit else Palette.White, function() end)
		end
		local caption = if state.CanClaimDaily then "Ambil hadiah hari ini" else "Sudah diambil hari ini"
		rowButton(caption, Palette.Teal, function()
			if state.CanClaimDaily then
				fire("claimDaily", {})
			end
		end)
		rowButton(
			"Rentetan " .. tostring(state.Streak) .. " · pelindung " .. tostring(state.Freezes),
			Palette.White,
			function() end
		)
	end

	local function openAlbum()
		showModal("Album Kartu Kata")
		if not state or #(state.Cards or {}) == 0 then
			rowButton("Belum ada kartu. Jawab soal baru di pasar.", Palette.White, function() end)
			return
		end
		for _, card in state.Cards do
			rowButton(card.Word .. " — " .. card.Definition, Palette.White, function() end)
		end
	end

	local function openLink()
		showModal("Kios Tautan")
		local info = label(
			scroller,
			"Punya kode tautan? Masukkan di sini untuk menyimpan XP-mu.",
			FONT_BODY,
			Palette.Ink
		)
		info.Size = UDim2.new(1, -8, 0, 64)
		info.ZIndex = 7
		local box = Instance.new("TextBox")
		box.Size = UDim2.new(1, -8, 0, 48)
		box.BackgroundColor3 = Palette.White
		box.Font = FONT_BODY
		box.PlaceholderText = "Kode tautan"
		box.Text = ""
		box.TextSize = 16
		box.TextScaled = false
		box.ClearTextOnFocus = false
		box.AutoLocalize = false
		box.ZIndex = 7
		box.Parent = scroller
		corner(box, 12)
		stroke(box, Palette.Navy)
		rowButton("Simpan tautan", Palette.Teal, function()
			fire("link", { Code = box.Text })
		end)
		rowButton("Setor XP", Palette.Kunyit, function()
			hideModal()
			fire("setor", {})
		end)
		if state and state.Link and state.Link.Linked then
			local linked = state.Link
			local note = "Tertaut: " .. linked.Name .. " · XP " .. tostring(linked.Xp)
			if not linked.AgeAllowed then
				note = "Konfirmasi usiamu dulu di akun BahasaCerdas."
			elseif not linked.Online then
				note = note .. " · kota sedang luring"
			end
			rowButton(note, Palette.White, function() end)
		end
	end

	local function openBoard()
		showModal("Peringkat Minggu")
		local query = ReplicatedStorage:FindFirstChild("BC_Query")
		if not query then
			return
		end
		local ok, result = pcall(function()
			return query:InvokeServer("leaderboard")
		end)
		if not ok or type(result) ~= "table" then
			rowButton("Peringkat belum bisa dibaca.", Palette.White, function() end)
			return
		end
		if result.Note and result.Note ~= "" then
			rowButton(result.Note, Palette.White, function() end)
		end
		for index, row in result.Rows or {} do
			rowButton(
				tostring(index) .. ". " .. row.Name .. " · " .. tostring(row.Score) .. " bintang",
				Palette.White,
				function() end
			)
		end
		if #(result.Rows or {}) == 0 then
			rowButton("Belum ada bintang minggu ini.", Palette.White, function() end)
		end
	end

	local panels = {
		toko = openShop,
		misi = openQuests,
		hadiah = openDaily,
		album = openAlbum,
		tautan = openLink,
		peringkat = openBoard,
	}
	for _, spec in
		{
			{ "Misi", "misi" },
			{ "Hadiah", "hadiah" },
			{ "Toko", "toko" },
			{ "Album", "album" },
			{ "Peringkat", "peringkat" },
			{ "Tautan", "tautan" },
		}
	do
		local ui = button(menu, spec[1], Palette.Plate)
		ui.Size = UDim2.new(1, -12, 0, 26)
		ui.TextSize = 12
		ui.ZIndex = 7
		ui.MouseButton1Click:Connect(function()
			Juice.click()
			local opener = panels[spec[2]]
			if opener then
				opener()
			end
		end)
	end

	menuButton.MouseButton1Click:Connect(function()
		Juice.click()
		menu.Visible = not menu.Visible
	end)

	task.spawn(function()
		while gui.Parent do
			if answers.Visible and deadline > 0 then
				local left = math.max(0, math.ceil(deadline - os.clock()))
				timer.Text = tostring(left)
				timer.Visible = true
			else
				timer.Visible = false
			end
			task.wait(0.2)
		end
	end)

	local api = {}

	function api.state(payload)
		state = payload
		coins.Text = "Koin " .. tostring(payload.Coins or 0)
		local linked = payload.Link
		local linkNote = ""
		if linked and linked.Linked then
			linkNote = " · " .. tostring(linked.Xp) .. " XP"
		end
		stars.Text = "Bintang "
			.. tostring(payload.StarTotal or 0)
			.. " · hari "
			.. tostring(payload.Streak or 0)
			.. linkNote
		Juice.paintFruits(payload)
	end

	function api.question(payload)
		promptCard.Visible = true
		promptText.Text = payload.Prompt or ""
		answers.Visible = true
		speech.Visible = false
		for index, choice in answerButtons do
			local option = payload.Options and payload.Options[index]
			choice.Visible = option ~= nil
			choice.Text = option or ""
			choice.BackgroundColor3 = Palette.White
		end
		if (payload.Seconds or 0) > 0 then
			deadline = os.clock() + payload.Seconds
		else
			deadline = 0
		end
		if (payload.Combo or 0) >= 2 then
			combo.Text = "Rentetan " .. tostring(payload.Combo)
			combo.BackgroundTransparency = 0.1
		else
			combo.Text = ""
			combo.BackgroundTransparency = 1
		end
	end

	function api.resolved(payload)
		deadline = 0
		if payload.Correct then
			Juice.play(require(ReplicatedStorage.Shared.Config).Sounds.Correct, 1)
			Juice.confetti()
			Juice.pulse(Palette.Teal)
			combo.Text = if (payload.Combo or 0) >= 2 then "Rentetan " .. tostring(payload.Combo) else ""
			combo.BackgroundTransparency = if (payload.Combo or 0) >= 2 then 0.1 else 1
		else
			Juice.play(require(ReplicatedStorage.Shared.Config).Sounds.Wrong, 1)
			Juice.pulse(Palette.Koral)
			combo.Text = ""
			combo.BackgroundTransparency = 1
		end
		api.toast({ Text = payload.Explanation or "", Tone = if payload.Correct then "good" else "warn" })
	end

	function api.summary(payload)
		answers.Visible = false
		promptCard.Visible = false
		deadline = 0
		combo.Text = ""
		combo.BackgroundTransparency = 1
		skip.Visible = false
		showModal("Hasil latihan")
		local total = math.max(payload.Total or 0, 1)
		rowButton(
			tostring(payload.Correct or 0) .. " benar dari " .. tostring(payload.Total or 0),
			Palette.White,
			function() end
		)
		rowButton("+" .. tostring(payload.Coins or 0) .. " koin", Palette.Kunyit, function() end)
		if (payload.Stars or 0) > 0 then
			local marks = { "☆", "☆", "☆" }
			for star = 1, math.min(payload.Stars, 3) do
				marks[star] = "★"
			end
			rowButton(table.concat(marks, " ") .. "  bintang", Palette.Teal, function() end)
		end
		if type(payload.Next) == "string" and payload.Next ~= "" then
			rowButton(payload.Next, Palette.White, function() end)
		end
		if (payload.Xp or 0) > 0 then
			rowButton("+" .. tostring(payload.Xp) .. " XP akun", Palette.Teal, function() end)
		end
		if payload.Arena ~= "tutorial" then
			rowButton("Main lagi", Palette.Teal, function()
				hideModal()
				fire("replay", { Arena = payload.Arena, Mode = payload.Mode })
			end)
		end
		rowButton("Ke Alun-Alun", Palette.White, function()
			hideModal()
			fire("lobby", {})
		end)
		if payload.Arena == "tutorial" then
			rowButton("Ke Pasar Ejaan lewat portal utara", Palette.Kunyit, function()
				hideModal()
			end)
		end
		if total > 0 and (payload.Correct or 0) / total >= 0.85 then
			Juice.play(require(ReplicatedStorage.Shared.Config).Sounds.Reward, 1)
		end
	end

	function api.toast(payload)
		toastFrame.Text = payload.Text or ""
		toastFrame.TextColor3 = if payload.Tone == "warn"
			then Palette.Koral
			elseif payload.Tone == "good" then Palette.Leaf
			else Palette.Ink
		toastFrame.TextTransparency = 0
		toastFrame.BackgroundTransparency = 0.05
		TweenService:Create(toastFrame, TweenInfo.new(0.2), { TextTransparency = 0 }):Play()
		task.delay(3.2, function()
			if toastFrame.Text == (payload.Text or "") then
				toastFrame.TextTransparency = 1
				toastFrame.BackgroundTransparency = 1
			end
		end)
	end

	function api.speech(payload)
		if promptCard.Visible then
			return
		end
		speech.Visible = true
		speechText.Text = (payload.Speaker or "Mbak Nara") .. ": " .. (payload.Text or "")
		task.delay(4, function()
			if speechText.Text == (payload.Speaker or "Mbak Nara") .. ": " .. (payload.Text or "") then
				speech.Visible = false
			end
		end)
	end

	function api.open(payload)
		local opener = panels[payload.Panel]
		if opener then
			opener()
		end
	end

	local oldQuestion = api.question
	function api.question(payload)
		oldQuestion(payload)
		skip.Visible = payload.Tutorial == true
	end

	return api
end

return Hud
