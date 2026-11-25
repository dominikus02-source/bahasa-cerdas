local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Palette = require(ReplicatedStorage.Shared.Palette)
local Juice = require(script.Parent.Juice)
local NetClient = require(script.Parent.NetClient)

local Theme = {}

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

local function stroke(parent: Instance, color: Color3)
	local ui = Instance.new("UIStroke")
	ui.Color = color
	ui.Thickness = 1
	ui.Transparency = 0.55
	ui.Parent = parent
end

local function plate(frame: GuiObject)
	frame.BackgroundColor3 = Palette.Plate
	frame.BackgroundTransparency = 0.22
	frame.BorderSizePixel = 0
	corner(frame, 12)
	stroke(frame, Palette.WoodDark)
end

local function label(parent: Instance, text: string, font: Enum.Font, color: Color3, textSize: number)
	local ui = Instance.new("TextLabel")
	ui.BackgroundTransparency = 1
	ui.Font = font
	ui.Text = text
	ui.TextColor3 = color
	ui.TextSize = textSize
	ui.TextWrapped = true
	ui.TextTruncate = Enum.TextTruncate.AtEnd
	ui.TextXAlignment = Enum.TextXAlignment.Left
	ui.AutoLocalize = false
	ui.Parent = parent
	return ui
end

function Theme.mount(options)
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
	flash.ZIndex = 20
	flash.Parent = gui
	Juice.bind(flash)

	local top = Instance.new("Frame")
	top.BackgroundTransparency = 1
	top.Position = UDim2.fromOffset(8, 8)
	top.Size = UDim2.new(1, -16, 0, 28)
	top.Parent = gui
	plate(top)
	local topCap = Instance.new("UISizeConstraint")
	topCap.MaxSize = Vector2.new(1920, 28)
	topCap.Parent = top
	local title = label(top, options.Title or "BahasaCerdas", FONT_TITLE, Palette.Ink, 12)
	title.Position = UDim2.fromOffset(8, 0)
	title.Size = UDim2.fromScale(0.34, 1)
	local stats = label(top, "", FONT_BODY, Palette.Navy, 12)
	stats.Position = UDim2.fromScale(0.34, 0)
	stats.Size = UDim2.new(0.66, -140, 1, 0)
	stats.TextXAlignment = Enum.TextXAlignment.Right

	local menuButton = Instance.new("TextButton")
	menuButton.AnchorPoint = Vector2.new(1, 0.5)
	menuButton.Position = UDim2.new(1, -4, 0.5, 0)
	menuButton.Size = UDim2.fromOffset(52, 22)
	menuButton.BackgroundColor3 = Palette.Kunyit
	menuButton.Font = FONT_TITLE
	menuButton.Text = "Menu"
	menuButton.TextSize = 12
	menuButton.TextColor3 = Palette.Ink
	menuButton.AutoLocalize = false
	menuButton.Parent = top
	corner(menuButton, 8)

	local homeButton = Instance.new("TextButton")
	homeButton.AnchorPoint = Vector2.new(1, 0.5)
	homeButton.Position = UDim2.new(1, -60, 0.5, 0)
	homeButton.Size = UDim2.fromOffset(72, 22)
	homeButton.BackgroundColor3 = Palette.Teal
	homeButton.Font = FONT_TITLE
	homeButton.Text = "Alun-Alun"
	homeButton.TextSize = 12
	homeButton.TextColor3 = Palette.Ink
	homeButton.AutoLocalize = false
	homeButton.Visible = options.ReturnLobby == true
	homeButton.Parent = top
	corner(homeButton, 8)
	homeButton.MouseButton1Click:Connect(function()
		Juice.click()
		NetClient.fire("home", {})
	end)

	local prompt = Instance.new("Frame")
	prompt.AnchorPoint = Vector2.new(0.5, 0)
	prompt.Position = UDim2.new(0.5, 0, 0, 40)
	prompt.Size = UDim2.new(0.9, 0, 0, 64)
	prompt.Parent = gui
	plate(prompt)
	local promptLimit = Instance.new("UISizeConstraint")
	promptLimit.MaxSize = Vector2.new(560, 64)
	promptLimit.Parent = prompt
	local promptTitle = label(prompt, "", FONT_TITLE, Palette.Navy, 12)
	promptTitle.Position = UDim2.fromOffset(8, 2)
	promptTitle.Size = UDim2.new(1, -16, 0, 14)
	local promptBody = label(prompt, "", FONT_BODY, Palette.Ink, 13)
	promptBody.Position = UDim2.fromOffset(8, 16)
	promptBody.Size = UDim2.new(1, -16, 0, 30)
	promptBody.TextYAlignment = Enum.TextYAlignment.Top
	local promptFoot = label(prompt, "", FONT_BODY, Palette.WoodDark, 12)
	promptFoot.Position = UDim2.fromOffset(8, 46)
	promptFoot.Size = UDim2.new(1, -16, 0, 16)

	local choiceBar = Instance.new("Frame")
	choiceBar.AnchorPoint = Vector2.new(0.5, 1)
	choiceBar.Position = UDim2.new(0.5, 0, 1, -18)
	choiceBar.Size = UDim2.new(0.92, 0, 0, 36)
	choiceBar.BackgroundTransparency = 1
	choiceBar.Parent = gui
	local choiceLayout = Instance.new("UIListLayout")
	choiceLayout.FillDirection = Enum.FillDirection.Horizontal
	choiceLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	choiceLayout.Padding = UDim.new(0, 10)
	choiceLayout.Parent = choiceBar

	local tileBar = Instance.new("Frame")
	tileBar.AnchorPoint = Vector2.new(0.5, 1)
	tileBar.Position = UDim2.new(0.5, 0, 1, -64)
	tileBar.Size = UDim2.new(0.92, 0, 0, 88)
	tileBar.Visible = false
	tileBar.Parent = gui
	plate(tileBar)
	local pickedLabel = label(tileBar, "", FONT_BODY, Palette.Ink, 12)
	pickedLabel.Position = UDim2.fromOffset(8, 2)
	pickedLabel.Size = UDim2.new(1, -16, 0, 16)
	local tileRow = Instance.new("ScrollingFrame")
	tileRow.BackgroundTransparency = 1
	tileRow.Position = UDim2.fromOffset(8, 20)
	tileRow.Size = UDim2.new(1, -16, 0, 32)
	tileRow.ScrollBarThickness = 4
	tileRow.AutomaticCanvasSize = Enum.AutomaticSize.X
	tileRow.CanvasSize = UDim2.new()
	tileRow.Parent = tileBar
	local tileLayout = Instance.new("UIListLayout")
	tileLayout.FillDirection = Enum.FillDirection.Horizontal
	tileLayout.Padding = UDim.new(0, 6)
	tileLayout.Parent = tileRow
	local tileActions = Instance.new("Frame")
	tileActions.BackgroundTransparency = 1
	tileActions.Position = UDim2.new(0, 8, 1, -26)
	tileActions.Size = UDim2.new(1, -16, 0, 22)
	tileActions.Parent = tileBar
	local actionLayout = Instance.new("UIListLayout")
	actionLayout.FillDirection = Enum.FillDirection.Horizontal
	actionLayout.Padding = UDim.new(0, 8)
	actionLayout.Parent = tileActions

	local toast = label(gui, "", FONT_BODY, Palette.Ink, 12)
	toast.AnchorPoint = Vector2.new(0.5, 1)
	toast.Position = UDim2.new(0.5, 0, 1, -120)
	toast.Size = UDim2.new(0.86, 0, 0, 28)
	toast.TextXAlignment = Enum.TextXAlignment.Center
	toast.BackgroundColor3 = Palette.Plate
	toast.BackgroundTransparency = 1
	corner(toast, 10)

	local speech = label(gui, "", FONT_BODY, Palette.Ink, 12)
	speech.AnchorPoint = Vector2.new(0.5, 1)
	speech.Position = UDim2.new(0.5, 0, 1, -154)
	speech.Size = UDim2.new(0.8, 0, 0, 28)
	speech.TextXAlignment = Enum.TextXAlignment.Center
	speech.BackgroundColor3 = Palette.White
	speech.BackgroundTransparency = 0.08
	speech.Visible = false
	corner(speech, 10)

	local menu = Instance.new("Frame")
	menu.AnchorPoint = Vector2.new(1, 0)
	menu.Visible = false
	menu.Position = UDim2.new(1, -8, 0, 40)
	menu.Size = UDim2.fromOffset(240, 280)
	menu.Parent = gui
	plate(menu)
	local scroller = Instance.new("ScrollingFrame")
	scroller.BackgroundTransparency = 1
	scroller.Size = UDim2.fromScale(1, 1)
	scroller.ScrollBarThickness = 5
	scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
	scroller.CanvasSize = UDim2.new()
	scroller.Parent = menu
	local menuLayout = Instance.new("UIListLayout")
	menuLayout.Padding = UDim.new(0, 8)
	menuLayout.SortOrder = Enum.SortOrder.LayoutOrder
	menuLayout.Parent = scroller
	local pad = Instance.new("UIPadding")
	pad.PaddingTop = UDim.new(0, 10)
	pad.PaddingLeft = UDim.new(0, 10)
	pad.PaddingRight = UDim.new(0, 10)
	pad.PaddingBottom = UDim.new(0, 10)
	pad.Parent = scroller

	local goal = label(scroller, "", FONT_BODY, Palette.Navy, 12)
	goal.Size = UDim2.new(1, 0, 0, 28)
	local dailyButton = Instance.new("TextButton")
	dailyButton.Size = UDim2.new(1, 0, 0, 28)
	dailyButton.BackgroundColor3 = Palette.Kunyit
	dailyButton.Font = FONT_TITLE
	dailyButton.TextSize = 12
	dailyButton.TextColor3 = Palette.Ink
	dailyButton.Text = "Ambil hadiah hari ini"
	dailyButton.AutoLocalize = false
	dailyButton.Parent = scroller
	corner(dailyButton, 10)
	dailyButton.MouseButton1Click:Connect(function()
		Juice.click()
		NetClient.fire("claimDaily", {})
	end)

	local linkBox = Instance.new("TextBox")
	linkBox.Size = UDim2.new(1, 0, 0, 28)
	linkBox.BackgroundColor3 = Palette.White
	linkBox.Font = FONT_BODY
	linkBox.TextSize = 12
	linkBox.PlaceholderText = "Kode tautan"
	linkBox.Text = ""
	linkBox.ClearTextOnFocus = false
	linkBox.TextColor3 = Palette.Ink
	linkBox.AutoLocalize = false
	linkBox.Parent = scroller
	corner(linkBox, 8)
	local linkButton = Instance.new("TextButton")
	linkButton.Size = UDim2.new(1, 0, 0, 28)
	linkButton.BackgroundColor3 = Palette.Teal
	linkButton.Font = FONT_TITLE
	linkButton.TextSize = 12
	linkButton.TextColor3 = Palette.Ink
	linkButton.Text = "Simpan kode"
	linkButton.AutoLocalize = false
	linkButton.Parent = scroller
	corner(linkButton, 10)
	linkButton.MouseButton1Click:Connect(function()
		Juice.click()
		NetClient.fire("link", { Code = linkBox.Text })
	end)
	local linkNote = label(
		scroller,
		"Punya kode tautan? Masukkan di sini untuk menyimpan XP-mu.",
		FONT_BODY,
		Palette.WoodDark,
		12
	)
	linkNote.Size = UDim2.new(1, 0, 0, 32)

	local board = label(scroller, "Peringkat mingguan belum dimuat.", FONT_BODY, Palette.Navy, 12)
	board.Size = UDim2.new(1, 0, 0, 96)

	menuButton.MouseButton1Click:Connect(function()
		Juice.click()
		menu.Visible = not menu.Visible
		if menu.Visible then
			local result = NetClient.query("board", {})
			if result.Ok and type(result.Rows) == "table" then
				local lines = { result.Note or "Minggu ini" }
				for index, row in result.Rows do
					table.insert(
						lines,
						tostring(index) .. ". " .. tostring(row.Name) .. " · " .. tostring(row.Score)
					)
				end
				if #result.Rows == 0 then
					table.insert(lines, "Belum ada bintang minggu ini.")
				end
				board.Text = table.concat(lines, "\n")
				board.Size = UDim2.new(1, 0, 0, 20 + #lines * 18)
			else
				board.Text = tostring(result.Note or result.Message or "Peringkat belum tersedia.")
			end
		end
	end)

	local api = {}
	local questButtons = {}
	local shopButtons = {}

	local function smallButton(parent: Instance, text: string, color: Color3, height: number)
		local button = Instance.new("TextButton")
		button.Size = UDim2.new(1, 0, 0, height)
		button.BackgroundColor3 = color
		button.Font = FONT_TITLE
		button.TextSize = 12
		button.TextColor3 = Palette.Ink
		button.TextWrapped = true
		button.Text = text
		button.AutoLocalize = false
		button.Parent = parent
		corner(button, 8)
		return button
	end

	function api.applyState(state)
		stats.Text = tostring(state.Coins or 0)
			.. " koin · "
			.. tostring(state.StarTotal or 0)
			.. " bintang · "
			.. tostring(state.Streak or 0)
			.. " hari"
		goal.Text = tostring(state.Goal or "")
		if state.CanClaimDaily then
			dailyButton.Text = "Ambil hadiah hari ke-" .. tostring(state.DailyDay or 1)
		else
			dailyButton.Text = "Hadiah hari ini sudah diambil"
		end
		if state.Link and state.Link.Linked then
			linkNote.Text = "Tertaut: " .. tostring(state.Link.Name)
		elseif state.Memory then
			linkNote.Text = "Simpanan sesi ini belum masuk papan. Permainan tetap jalan."
		end
		for _, child in questButtons do
			child:Destroy()
		end
		table.clear(questButtons)
		local function addQuest(row)
			local text = tostring(row.Text)
				.. " ("
				.. tostring(row.Progress)
				.. "/"
				.. tostring(row.Goal)
				.. ")"
			if row.Claimed then
				text = text .. " · sudah diambil"
			elseif row.Done then
				text = text .. " · ambil +" .. tostring(row.Reward)
			end
			local button = smallButton(
				scroller,
				text,
				if row.Done and not row.Claimed then Palette.Leaf else Palette.White,
				28
			)
			button.LayoutOrder = 20
			button.MouseButton1Click:Connect(function()
				Juice.click()
				NetClient.fire("claimQuest", { Id = row.Id })
			end)
			table.insert(questButtons, button)
		end
		for _, row in state.Quests or {} do
			addQuest(row)
		end
		for _, row in state.Weekly or {} do
			addQuest(row)
		end
		for _, child in shopButtons do
			child:Destroy()
		end
		table.clear(shopButtons)
		for _, item in state.Shop or {} do
			local text = item.Name .. " · " .. tostring(item.Price) .. " koin"
			if item.Owned then
				text = item.Name .. " · pakai"
			end
			local button = smallButton(scroller, text, Palette.Krem, 28)
			button.LayoutOrder = 40
			button.MouseButton1Click:Connect(function()
				Juice.click()
				if item.Owned then
					NetClient.fire("equip", { Id = item.Id })
				else
					NetClient.fire("buy", { Id = item.Id })
				end
			end)
			table.insert(shopButtons, button)
		end
	end

	function api.toast(text: string, tone: string?)
		toast.Text = text
		toast.BackgroundTransparency = 0.08
		if tone == "good" then
			toast.TextColor3 = Palette.LeafDark
		elseif tone == "warn" then
			toast.TextColor3 = Palette.Koral
		else
			toast.TextColor3 = Palette.Ink
		end
		task.delay(3.2, function()
			if toast.Text == text then
				toast.Text = ""
				toast.BackgroundTransparency = 1
			end
		end)
	end

	function api.speech(speaker: string, text: string)
		speech.Text = speaker .. ": " .. text
		speech.Visible = true
		task.delay(7, function()
			if speech.Text == speaker .. ": " .. text then
				speech.Visible = false
			end
		end)
	end

	function api.setPrompt(head: string, body: string, foot: string?)
		promptTitle.Text = head
		promptBody.Text = body
		promptFoot.Text = foot or ""
	end

	function api.clearChoices()
		for _, child in choiceBar:GetChildren() do
			if child:IsA("TextButton") then
				child:Destroy()
			end
		end
	end

	function api.setChoices(list, onPick)
		api.clearChoices()
		local wide = false
		for _, item in list do
			if #item.Text > 16 then
				wide = true
			end
		end
		choiceBar.Size = UDim2.new(0.92, 0, 0, if wide then 52 else 32)
		local width = if #list >= 3 then 0.33 else 0.46
		for _, item in list do
			local button = Instance.new("TextButton")
			button.Size = UDim2.new(width, -8, 1, 0)
			button.BackgroundColor3 = item.Color or Palette.White
			button.Font = FONT_TITLE
			button.TextSize = 12
			button.TextWrapped = true
			button.TextColor3 = Palette.Ink
			button.Text = item.Text
			button.AutoLocalize = false
			button.Parent = choiceBar
			corner(button, 12)
			stroke(button, Palette.WoodDark)
			button.MouseButton1Click:Connect(function()
				Juice.click()
				onPick(item.Id)
			end)
		end
	end

	local tileOrder = {}
	local tileMap = {}

	local function paintPicked()
		local words = {}
		for _, id in tileOrder do
			table.insert(words, tileMap[id] or "")
		end
		pickedLabel.Text = if #words > 0 then table.concat(words, " ") else "Ketuk balok sesuai urutan."
	end

	function api.clearTiles()
		tileBar.Visible = false
		table.clear(tileOrder)
		table.clear(tileMap)
		for _, child in tileRow:GetChildren() do
			if child:IsA("TextButton") then
				child:Destroy()
			end
		end
		for _, child in tileActions:GetChildren() do
			if child:IsA("TextButton") then
				child:Destroy()
			end
		end
	end

	function api.setTiles(list, onSubmit)
		api.clearTiles()
		tileBar.Visible = true
		for _, item in list do
			tileMap[item.Id] = item.Text
			local button = Instance.new("TextButton")
			button.Size = UDim2.fromOffset(math.clamp(#item.Text * 8 + 18, 36, 140), 28)
			button.BackgroundColor3 = Palette.White
			button.Font = FONT_TITLE
			button.TextSize = 12
			button.TextColor3 = Palette.Ink
			button.Text = item.Text
			button.AutoLocalize = false
			button.Parent = tileRow
			corner(button, 8)
			button.MouseButton1Click:Connect(function()
				Juice.click()
				for index, id in tileOrder do
					if id == item.Id then
						table.remove(tileOrder, index)
						button.BackgroundColor3 = Palette.White
						paintPicked()
						return
					end
				end
				table.insert(tileOrder, item.Id)
				button.BackgroundColor3 = Palette.Kunyit
				paintPicked()
			end)
		end
		local undo = Instance.new("TextButton")
		undo.Size = UDim2.fromOffset(72, 22)
		undo.BackgroundColor3 = Palette.Stone
		undo.Font = FONT_TITLE
		undo.TextSize = 12
		undo.TextColor3 = Palette.Ink
		undo.Text = "Urung"
		undo.AutoLocalize = false
		undo.Parent = tileActions
		corner(undo, 8)
		undo.MouseButton1Click:Connect(function()
			Juice.click()
			table.clear(tileOrder)
			for _, child in tileRow:GetChildren() do
				if child:IsA("TextButton") then
					child.BackgroundColor3 = Palette.White
				end
			end
			paintPicked()
		end)
		local lock = Instance.new("TextButton")
		lock.Size = UDim2.fromOffset(84, 22)
		lock.BackgroundColor3 = Palette.Teal
		lock.Font = FONT_TITLE
		lock.TextSize = 12
		lock.TextColor3 = Palette.Ink
		lock.Text = "Kunci"
		lock.AutoLocalize = false
		lock.Parent = tileActions
		corner(lock, 8)
		lock.MouseButton1Click:Connect(function()
			Juice.click()
			onSubmit(table.clone(tileOrder))
		end)
		paintPicked()
	end

	return api
end

return Theme
