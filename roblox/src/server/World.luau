local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Districts = require(ReplicatedStorage.Shared.Districts)
local Palette = require(ReplicatedStorage.Shared.Palette)

local World = {}

local function fontNamed(name: string, fallback: Enum.Font): Enum.Font
	for _, item in Enum.Font:GetEnumItems() do
		if item.Name == name then
			return item
		end
	end
	return fallback
end

local FONT_BODY = fontNamed("BuilderSans", Enum.Font.GothamMedium)
local FONT_BOLD = fontNamed("BuilderSansBold", Enum.Font.GothamBold)
local FONT_DISPLAY = fontNamed("FredokaOne", Enum.Font.GothamBold)

local function part(parent, name, size, cf, color, material, collide)
	local piece = Instance.new("Part")
	piece.Name = name
	piece.Size = size
	piece.CFrame = cf
	piece.Color = color
	piece.Material = material or Enum.Material.SmoothPlastic
	piece.Anchored = true
	piece.CanCollide = collide == true
	piece.CanTouch = false
	piece.CanQuery = collide == true
	piece.CastShadow = collide == true
	piece.TopSurface = Enum.SurfaceType.Smooth
	piece.BottomSurface = Enum.SurfaceType.Smooth
	piece.Parent = parent
	return piece
end

-- Papan krem, teks tinta. "jawaban" cukup besar untuk dibaca sambil berlari, tanpa TextScaled.
local function faceLabel(host: BasePart, text: string, kind: string)
	host.Color = Palette.Plate
	host.Material = Enum.Material.SmoothPlastic
	local gui = Instance.new("SurfaceGui")
	gui.Name = "Tulisan"
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = if kind == "jawaban" then 22 else 18
	gui.LightInfluence = 0
	gui.MaxDistance = 90
	gui.Parent = host
	local label = Instance.new("TextLabel")
	label.Name = "Teks"
	label.BackgroundColor3 = Palette.Plate
	label.BackgroundTransparency = 0.04
	label.Size = UDim2.fromScale(1, 1)
	label.TextColor3 = Palette.Ink
	label.TextScaled = false
	label.TextWrapped = true
	label.TextXAlignment = Enum.TextXAlignment.Center
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.Text = text
	label.AutoLocalize = false
	label.Parent = gui
	if kind == "judul" then
		label.Font = FONT_DISPLAY
		label.TextSize = 18
	elseif kind == "jawaban" then
		label.Font = FONT_BOLD
		label.TextSize = 20
	else
		label.Font = FONT_BODY
		label.TextSize = 16
	end
	local plateCorner = Instance.new("UICorner")
	plateCorner.CornerRadius = UDim.new(0, 10)
	plateCorner.Parent = label
	local plateEdge = Instance.new("UIStroke")
	plateEdge.Color = Palette.WoodDark
	plateEdge.Thickness = 2
	plateEdge.Parent = label
	local pad = Instance.new("UIPadding")
	pad.PaddingTop = UDim.new(0, 6)
	pad.PaddingBottom = UDim.new(0, 6)
	pad.PaddingLeft = UDim.new(0, 8)
	pad.PaddingRight = UDim.new(0, 8)
	pad.Parent = label
	return label
end

local function lookBack(cf: CFrame, offset: Vector3): CFrame
	local position = (cf * CFrame.new(offset)).Position
	return CFrame.lookAt(position, position - cf.LookVector)
end

local function faceToward(cf: CFrame, offset: Vector3): CFrame
	local position = (cf * CFrame.new(offset)).Position
	return CFrame.lookAt(position, position + cf.LookVector)
end

local function arch(model, cf: CFrame, color: Color3)
	part(
		model,
		"TiangKiri",
		Vector3.new(1.3, 8, 1.3),
		cf * CFrame.new(-3.4, 4, 0),
		Palette.Wood,
		Enum.Material.WoodPlanks,
		true
	)
	part(
		model,
		"TiangKanan",
		Vector3.new(1.3, 8, 1.3),
		cf * CFrame.new(3.4, 4, 0),
		Palette.Wood,
		Enum.Material.WoodPlanks,
		true
	)
	part(
		model,
		"Balok",
		Vector3.new(8.4, 1.2, 1.4),
		cf * CFrame.new(0, 8.5, 0),
		Palette.WoodDark,
		Enum.Material.Wood,
		true
	)
	local gate = part(
		model,
		"Gerbang",
		Vector3.new(5.6, 7.2, 2.2),
		cf * CFrame.new(0, 3.8, 0),
		color,
		Enum.Material.Glass,
		false
	)
	gate.Transparency = 0.55
	gate.CanTouch = true
	gate.CanQuery = true
	local sign = part(
		model,
		"PapanGerbang",
		Vector3.new(6.2, 1.7, 0.22),
		lookBack(cf, Vector3.new(0, 9.2, 0)),
		Palette.Plate,
		Enum.Material.SmoothPlastic,
		false
	)
	local label = faceLabel(sign, "", "jawaban")
	return gate, label
end

local function joglo(parent, cf: CFrame, width: number, depth: number, wall: Color3)
	local model = Instance.new("Model")
	model.Name = "Joglo"
	model.Parent = parent
	part(
		model,
		"Lantai",
		Vector3.new(width, 0.6, depth),
		cf * CFrame.new(0, 0.4, 0),
		Palette.Stone,
		Enum.Material.Cobblestone,
		true
	)
	local posts =
		{ Vector3.new(-1, 0, -1), Vector3.new(1, 0, -1), Vector3.new(-1, 0, 1), Vector3.new(1, 0, 1) }
	for _, sign in posts do
		part(
			model,
			"Tiang",
			Vector3.new(0.7, 5, 0.7),
			cf * CFrame.new(sign.X * (width * 0.38), 3, sign.Z * (depth * 0.38)),
			Palette.WoodDark,
			Enum.Material.Wood,
			true
		)
	end
	local rise = 3.2
	local roofY = 6.2
	local left = Instance.new("WedgePart")
	left.Name = "AtapKiri"
	left.Size = Vector3.new(width + 1.6, rise, depth / 2 + 0.6)
	left.Anchored = true
	left.CanCollide = false
	left.CastShadow = false
	left.Color = Palette.Awning
	left.Material = Enum.Material.SmoothPlastic
	left.CFrame = cf * CFrame.new(0, roofY, depth / 4) * CFrame.Angles(0, math.rad(180), 0)
	left.Parent = model
	local right = left:Clone()
	right.Name = "AtapKanan"
	right.CFrame = cf * CFrame.new(0, roofY, -depth / 4)
	right.Parent = model
	part(
		model,
		"Dinding",
		Vector3.new(width * 0.72, 3.2, 0.4),
		cf * CFrame.new(0, 3.2, -depth * 0.28),
		wall,
		Enum.Material.SmoothPlastic,
		true
	)
	model.PrimaryPart = model:FindFirstChild("Lantai") :: BasePart
	return model
end

local function lamp(parent, cf: CFrame)
	part(
		parent,
		"TiangLampu",
		Vector3.new(0.35, 7, 0.35),
		cf * CFrame.new(0, 3.5, 0),
		Palette.WoodDark,
		Enum.Material.Wood,
		false
	)
	local glow = part(
		parent,
		"Lampion",
		Vector3.new(1.5, 1.5, 1.5),
		cf * CFrame.new(0, 7.2, 0),
		Palette.Lamp,
		Enum.Material.Neon,
		false
	)
	glow.Shape = Enum.PartType.Ball
	local light = Instance.new("PointLight")
	light.Color = Palette.Lamp
	light.Brightness = 1.1
	light.Range = 14
	light.Parent = glow
end

local function mist(parent, cf: CFrame)
	local host = part(
		parent,
		"Kabut",
		Vector3.new(1, 1, 1),
		cf * CFrame.new(0, 5, 0),
		Palette.Ungu,
		Enum.Material.SmoothPlastic,
		false
	)
	host.Transparency = 1
	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = "rbxasset://textures/particles/smoke_main.dds"
	emitter.Color = ColorSequence.new(Palette.Ungu)
	emitter.LightEmission = 0.25
	emitter.Rate = 3
	emitter.Lifetime = NumberRange.new(2.5, 4)
	emitter.Speed = NumberRange.new(0.2, 0.8)
	emitter.Size = NumberSequence.new(3, 6)
	emitter.Transparency = NumberSequence.new(0.55, 1)
	emitter.Parent = host
	host:SetAttribute("Juice", true)
end

local function buildLane(parent, arenaId: string, slot: number, origin: CFrame, gatesOut)
	local model = Instance.new("Model")
	model.Name = arenaId .. "_" .. tostring(slot)
	model.Parent = parent
	local floor = part(
		model,
		"Lantai",
		Vector3.new(36, 0.4, 52),
		origin * CFrame.new(0, 0.55, -8),
		Palette.Stone,
		Enum.Material.Cobblestone,
		true
	)
	model.PrimaryPart = floor
	local boardPosition = (origin * CFrame.new(0, 4.2, -16)).Position
	local board = part(
		model,
		"PapanSoal",
		Vector3.new(14, 3.2, 0.5),
		CFrame.lookAt(boardPosition, boardPosition - origin.LookVector),
		Palette.Navy,
		Enum.Material.SmoothPlastic,
		false
	)
	local boardLabel = faceLabel(board, "", "judul")
	local gates = {}
	local labels = {}
	for index, x in { -13.5, -4.5, 4.5, 13.5 } do
		local gateCf = origin * CFrame.new(x, 0, -30)
		local gate, label = arch(model, gateCf, Palette.Teal)
		gate:SetAttribute("ArenaId", arenaId)
		gate:SetAttribute("Slot", slot)
		gate:SetAttribute("GateIndex", index)
		gate.CanTouch = false
		table.insert(gates, gate)
		table.insert(labels, label)
		table.insert(gatesOut, gate)
	end
	local spawn =
		CFrame.lookAt((origin * CFrame.new(0, 4, 12)).Position, (origin * CFrame.new(0, 4, 0)).Position)
	local checkpoint =
		CFrame.lookAt((origin * CFrame.new(0, 4, 6)).Position, (origin * CFrame.new(0, 4, -10)).Position)
	return {
		spawn = spawn,
		checkpoint = checkpoint,
		boardLabel = boardLabel,
		gateLabels = labels,
		gates = gates,
		busy = false,
	}
end

local function laneRow(parent, arenaId: string, count: number, origin: CFrame, spacing: number, gatesOut)
	local lanes = {}
	local start = -((count - 1) * spacing) / 2
	for slot = 1, count do
		local cf = origin * CFrame.new(start + (slot - 1) * spacing, 0, 0)
		lanes[slot] = buildLane(parent, arenaId, slot, cf, gatesOut)
	end
	return lanes
end

local function applyLighting()
	Lighting.ClockTime = 17.15
	Lighting.Brightness = 2.2
	Lighting.Ambient = Color3.fromRGB(70, 60, 52)
	Lighting.OutdoorAmbient = Color3.fromRGB(140, 120, 100)
	Lighting.EnvironmentDiffuseScale = 0.4
	Lighting.EnvironmentSpecularScale = 0.3
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
	atmosphere.Density = 0.28
	atmosphere.Offset = 0.15
	atmosphere.Color = Color3.fromRGB(255, 214, 170)
	atmosphere.Decay = Color3.fromRGB(120, 90, 140)
	atmosphere.Glare = 0.15
	atmosphere.Haze = 1.1
	atmosphere.Parent = Lighting
	local bloom = Lighting:FindFirstChild("BCBloom") or Instance.new("BloomEffect")
	bloom.Name = "BCBloom"
	bloom.Intensity = 0.4
	bloom.Size = 20
	bloom.Threshold = 1.6
	bloom.Parent = Lighting
	local sun = Lighting:FindFirstChild("BCSun") or Instance.new("SunRaysEffect")
	sun.Name = "BCSun"
	sun.Intensity = 0.08
	sun.Spread = 0.4
	sun.Parent = Lighting
	local color = Lighting:FindFirstChild("BCColor") or Instance.new("ColorCorrectionEffect")
	color.Name = "BCColor"
	color.Saturation = 0.08
	color.Contrast = 0.05
	color.TintColor = Color3.fromRGB(255, 244, 230)
	color.Parent = Lighting
end

local function spawnPad(parent, cf: CFrame, name: string)
	local pad = Instance.new("SpawnLocation")
	pad.Name = name
	pad.Size = Vector3.new(8, 1, 8)
	pad.CFrame = cf
	pad.Anchored = true
	pad.Neutral = true
	pad.Duration = 0
	pad.Color = Palette.Kunyit
	pad.Material = Enum.Material.Neon
	pad.Parent = parent
	return pad
end

function World.build(role: string, onPrompt)
	applyLighting()
	local folder = Instance.new("Folder")
	folder.Name = "KotaAksara"
	folder.Parent = workspace
	local gates = {}
	local registry = {
		folder = folder,
		gates = gates,
		lanes = {},
		lobbySpawn = nil,
		marketSpawn = nil,
		legacy = {},
	}

	local function hook(promptInstance, info)
		promptInstance.Triggered:Connect(function(player)
			onPrompt(player, info)
		end)
	end

	if role ~= "pasar-ejaan" then
		local lobby = Instance.new("Model")
		lobby.Name = "AlunAlun"
		lobby.Parent = folder
		part(
			lobby,
			"Tanah",
			Vector3.new(220, 2, 220),
			CFrame.new(0, -1, 0),
			Palette.Grass,
			Enum.Material.Grass,
			true
		)
		part(
			lobby,
			"Plaza",
			Vector3.new(78, 1, 78),
			CFrame.new(0, 0.2, 8),
			Palette.Krem,
			Enum.Material.Cobblestone,
			true
		)
		for index = 1, 18 do
			local angle = (index / 18) * math.pi * 2
			part(
				lobby,
				"Jalan",
				Vector3.new(16, 0.6, 12),
				CFrame.new(math.cos(angle) * 62, 0.45, math.sin(angle) * 62) * CFrame.Angles(0, -angle, 0),
				Palette.Stone,
				Enum.Material.Cobblestone,
				true
			)
		end
		part(
			lobby,
			"Terusan",
			Vector3.new(14, 0.5, 300),
			CFrame.new(0, 0.35, -210),
			Palette.Stone,
			Enum.Material.Cobblestone,
			true
		)

		local trunk = part(
			lobby,
			"Batang",
			Vector3.new(14, 3.4, 3.4),
			CFrame.new(0, 7, 0),
			Palette.WoodDark,
			Enum.Material.Wood,
			true
		)
		trunk.Shape = Enum.PartType.Cylinder
		trunk.CFrame = CFrame.new(0, 7, 0) * CFrame.Angles(0, 0, math.rad(90))
		local leaves = part(
			lobby,
			"Daun",
			Vector3.new(18, 12, 18),
			CFrame.new(0, 15, 0),
			Palette.Leaf,
			Enum.Material.Grass,
			false
		)
		leaves.Shape = Enum.PartType.Ball
		for index = 1, 13 do
			local angle = (index / 13) * math.pi * 2
			local fruit = part(
				lobby,
				"Buah" .. index,
				Vector3.new(1.5, 1.5, 1.5),
				CFrame.new(math.cos(angle) * 7.2, 14.5 + (index % 3) * 0.6, math.sin(angle) * 7.2),
				Palette.Ungu,
				Enum.Material.Neon,
				false
			)
			fruit.Shape = Enum.PartType.Ball
			fruit:SetAttribute("FruitIndex", index)
			CollectionService:AddTag(fruit, "BCFruit")
		end
		local treeSign = part(
			lobby,
			"NamaPohon",
			Vector3.new(10, 2, 0.4),
			CFrame.lookAt(Vector3.new(0, 11, 6), Vector3.new(0, 11, 20)),
			Palette.Navy,
			Enum.Material.SmoothPlastic,
			false
		)
		faceLabel(treeSign, "Pohon Aksara", "judul")

		local nara = Instance.new("Model")
		nara.Name = "MbakNara"
		nara.Parent = lobby
		local naraCf = CFrame.new(-16, 0.8, 102)
		part(
			nara,
			"Kaki",
			Vector3.new(2.2, 2.2, 1.2),
			naraCf * CFrame.new(0, 1.2, 0),
			Palette.Teal,
			Enum.Material.SmoothPlastic,
			false
		)
		part(
			nara,
			"Badan",
			Vector3.new(2.4, 2.6, 1.3),
			naraCf * CFrame.new(0, 3.4, 0),
			Palette.Kunyit,
			Enum.Material.SmoothPlastic,
			false
		)
		local head = part(
			nara,
			"Kepala",
			Vector3.new(1.8, 1.8, 1.8),
			naraCf * CFrame.new(0, 5.5, 0),
			Palette.Krem,
			Enum.Material.SmoothPlastic,
			false
		)
		head.Shape = Enum.PartType.Ball
		local name = Instance.new("BillboardGui")
		name.Size = UDim2.fromOffset(96, 18)
		name.StudsOffsetWorldSpace = Vector3.new(0, 1.6, 0)
		name.MaxDistance = 50
		name.AlwaysOnTop = false
		name.Parent = head
		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.fromScale(1, 1)
		nameLabel.BackgroundColor3 = Palette.Navy
		nameLabel.BackgroundTransparency = 0.25
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextColor3 = Palette.Krem
		nameLabel.TextSize = 12
		nameLabel.TextScaled = false
		nameLabel.Text = "Mbak Nara"
		nameLabel.AutoLocalize = false
		nameLabel.Parent = name
		local speech = part(
			nara,
			"Ucapan",
			Vector3.new(8, 2.2, 0.3),
			CFrame.lookAt(Vector3.new(-16, 9.4, 100.2), Vector3.new(-16, 9.4, 112)),
			Palette.Navy,
			Enum.Material.SmoothPlastic,
			false
		)
		faceLabel(speech, "Lari ke gerbang. Pilih kalimat yang tepat.", "isi")
		local talk = Instance.new("ProximityPrompt")
		talk.ActionText = "Sapa"
		talk.ObjectText = "Mbak Nara"
		talk.HoldDuration = 0
		talk.MaxActivationDistance = 12
		talk.RequiresLineOfSight = false
		talk.Parent = head
		hook(talk, { Kind = "speech" })

		local station = {
			{ Name = "Misi", Position = Vector3.new(0, 0, -36), Kind = "quest", Text = "Papan Misi" },
			{ Name = "Hadiah", Position = Vector3.new(36, 0, 28), Kind = "daily", Text = "Peti 7 Hari" },
			{
				Name = "Peringkat",
				Position = Vector3.new(40, 0, -6),
				Kind = "board",
				Text = "Peringkat Minggu",
			},
			{ Name = "Tautan", Position = Vector3.new(-40, 0, 16), Kind = "kiosk", Text = "Kios Tautan" },
			{ Name = "Toko", Position = Vector3.new(-28, 0, 36), Kind = "shop", Text = "Toko Kosmetik" },
		}
		for _, info in station do
			local cf = CFrame.lookAt(info.Position, Vector3.new(0, 0, 8))
			joglo(lobby, cf, 12, 10, Palette.Krem)
			local sign = part(
				lobby,
				info.Name,
				Vector3.new(8, 2.2, 0.4),
				faceToward(cf, Vector3.new(0, 7.5, 0)),
				Palette.Navy,
				Enum.Material.SmoothPlastic,
				false
			)
			faceLabel(sign, info.Text, "judul")
			local button = Instance.new("ProximityPrompt")
			button.ActionText = "Buka"
			button.ObjectText = info.Text
			button.HoldDuration = 0.05
			button.MaxActivationDistance = 12
			button.RequiresLineOfSight = false
			button.Parent = sign
			hook(button, { Kind = info.Kind })
			lamp(lobby, cf * CFrame.new(7, 0, 0))
		end

		for index, district in Districts do
			local angle = math.rad(-90 + (index - 1) * 60)
			local position = Vector3.new(math.cos(angle) * 86, 0.35, math.sin(angle) * 86)
			local cf = CFrame.lookAt(position, Vector3.new(0, 0, 8))
			local color = Palette[district.Color] or Palette.Stone
			if not district.Open then
				color = Palette.Ungu
				mist(lobby, cf)
			end
			local gate = arch(lobby, cf, color)
			gate.CanTouch = false
			local sign = part(
				lobby,
				district.Id,
				Vector3.new(8.4, 2.6, 0.3),
				faceToward(cf, Vector3.new(0, 12.2, 0)),
				Palette.Navy,
				Enum.Material.SmoothPlastic,
				false
			)
			local caption = district.Name
			if not district.Open then
				caption = district.Name .. "\nSegera hadir"
			end
			faceLabel(sign, caption, "judul")
			local button = Instance.new("ProximityPrompt")
			button.ActionText = if district.Open then "Masuk" else "Lihat"
			button.ObjectText = district.Name
			button.HoldDuration = 0.12
			button.MaxActivationDistance = 14
			button.RequiresLineOfSight = false
			button.Parent = sign
			if district.Open then
				hook(button, { Kind = "portal", Id = district.Id })
			else
				hook(
					button,
					{ Kind = "locked", Id = district.Id, Stars = district.Stars, Name = district.Name }
				)
			end
		end

		local legacy = {
			{ Id = "benar-salah", Title = "Benar atau Salah", Position = Vector3.new(96, 0, 28) },
			{ Id = "susun-kata", Title = "Susun Kata", Position = Vector3.new(96, 0, 4) },
			{ Id = "nusantara", Title = "NUSANTARA", Position = Vector3.new(96, 0, -20) },
		}
		for _, info in legacy do
			local cf = CFrame.lookAt(info.Position, info.Position + Vector3.new(-1, 0, 0))
			local gate = arch(lobby, cf, Palette.Kunyit)
			gate.CanTouch = false
			local sign = part(
				lobby,
				info.Id,
				Vector3.new(9, 2.4, 0.4),
				faceToward(cf, Vector3.new(0, 12, 0)),
				Palette.Navy,
				Enum.Material.SmoothPlastic,
				false
			)
			faceLabel(sign, info.Title, "judul")
			local button = Instance.new("ProximityPrompt")
			button.ActionText = "Masuk"
			button.ObjectText = info.Title
			button.HoldDuration = 0.15
			button.MaxActivationDistance = 14
			button.RequiresLineOfSight = false
			button.Parent = sign
			registry.legacy[info.Id] = sign
			hook(button, { Kind = "legacy", Id = info.Id, Part = sign })
		end

		registry.lanes.tutorial = laneRow(
			lobby,
			"tutorial",
			2,
			CFrame.lookAt(Vector3.new(35, 0, 108), Vector3.new(35, 0, 40)),
			70,
			gates
		)
		registry.lanes.setor = laneRow(
			lobby,
			"setor",
			3,
			CFrame.lookAt(Vector3.new(-150, 0, 70), Vector3.new(-150, 0, 0)),
			56,
			gates
		)
		local vista = registry.lanes.tutorial[1].spawn
		registry.lobbySpawn = vista
		local padCf = CFrame.lookAt(
			Vector3.new(vista.Position.X, 1.15, vista.Position.Z),
			Vector3.new(vista.Position.X, 1.15, vista.Position.Z - 10)
		)
		spawnPad(lobby, padCf, "Muncul")
		local function guideMark(targetName: string, cf: CFrame)
			local mark = part(
				lobby,
				"Panduan" .. targetName,
				Vector3.new(1, 1, 1),
				cf,
				Palette.Kunyit,
				Enum.Material.Neon,
				false
			)
			mark.Transparency = 1
			mark.CanQuery = false
			local attachment = Instance.new("Attachment")
			attachment.Name = "Tujuan"
			attachment.Parent = mark
			mark:SetAttribute("Guide", targetName)
			CollectionService:AddTag(mark, "BCGuide")
		end
		local firstGate = registry.lanes.tutorial[1].gates[2]
		guideMark("gerbang", firstGate.CFrame * CFrame.new(0, 6, 0))
		guideMark("pasar", CFrame.new(0, 8, -86))
	end

	local marketOrigin = if role == "pasar-ejaan" then Vector3.new(0, 0, 40) else Vector3.new(0, 0, -430)
	local market = Instance.new("Model")
	market.Name = "PasarEjaan"
	market.Parent = folder
	local base = CFrame.new(marketOrigin)
	part(
		market,
		"TanahPasar",
		Vector3.new(180, 2, 150),
		base * CFrame.new(0, -1, -20),
		Palette.Krem,
		Enum.Material.Sand,
		true
	)
	part(
		market,
		"JalanPasar",
		Vector3.new(16, 0.5, 90),
		base * CFrame.new(0, 0.3, -10),
		Palette.Stone,
		Enum.Material.Cobblestone,
		true
	)
	for index = -2, 2 do
		local stall = base * CFrame.new(index * 22, 0, if index % 2 == 0 then -8 else 10)
		joglo(market, stall, 14, 10, Palette.White)
		lamp(market, stall * CFrame.new(8, 0, 0))
	end
	local bannerPos = (base * CFrame.new(0, 10, 18)).Position
	local banner = part(
		market,
		"Spanduk",
		Vector3.new(12, 2.2, 0.4),
		CFrame.lookAt(bannerPos, bannerPos + Vector3.new(0, 0, 1)),
		Palette.Navy,
		Enum.Material.SmoothPlastic,
		false
	)
	faceLabel(banner, "Pasar Ejaan", "judul")

	local function entrance(
		name: string,
		offset: Vector3,
		arena: string?,
		mode: string?,
		labelText: string,
		action: string
	)
		local cf = base * CFrame.new(offset)
		local gate = arch(market, cf, Palette.Teal)
		gate.CanTouch = false
		local sign = part(
			market,
			name,
			Vector3.new(9, 2.6, 0.4),
			lookBack(cf, Vector3.new(0, 12, 0)),
			Palette.Navy,
			Enum.Material.SmoothPlastic,
			false
		)
		faceLabel(sign, labelText, "judul")
		local button = Instance.new("ProximityPrompt")
		button.ActionText = action
		button.ObjectText = labelText
		button.HoldDuration = 0.08
		button.MaxActivationDistance = 14
		button.RequiresLineOfSight = false
		button.Parent = sign
		if arena then
			hook(button, { Kind = "arena", Arena = arena, Mode = mode })
		else
			hook(button, { Kind = "lobby" })
		end
	end

	entrance("KapitalSantai", Vector3.new(-28, 0, -24), "a01", "santai", "Lapak Kapital\nSantai", "Mulai")
	entrance(
		"KapitalTantang",
		Vector3.new(-28, 0, -38),
		"a01",
		"tantangan",
		"Lapak Kapital\nTantangan",
		"Mulai"
	)
	entrance("TandaSantai", Vector3.new(28, 0, -24), "a02", "santai", "Gang Tanda Baca\nSantai", "Mulai")
	entrance(
		"TandaTantang",
		Vector3.new(28, 0, -38),
		"a02",
		"tantangan",
		"Gang Tanda Baca\nTantangan",
		"Mulai"
	)
	entrance("Boss", Vector3.new(0, 0, -62), "boss", "boss", "Raksasa Typo", "Tantang")
	entrance("Kembali", Vector3.new(0, 0, 24), nil, nil, "Alun-Alun", "Kembali")

	local roof = joglo(market, base * CFrame.new(-48, 0, -8), 16, 12, Palette.Leaf)
	local step = roof.PrimaryPart
	if step then
		for level = 1, 3 do
			part(
				market,
				"Tangga" .. level,
				Vector3.new(4, 1, 3),
				step.CFrame * CFrame.new(-6, level * 1.6, 4),
				Palette.Wood,
				Enum.Material.WoodPlanks,
				true
			)
		end
		local secret = part(
			market,
			"KartuAtap",
			Vector3.new(3, 1, 3),
			step.CFrame * CFrame.new(0, 8.2, 0),
			Palette.Kunyit,
			Enum.Material.Neon,
			false
		)
		secret.CanTouch = true
		secret.Touched:Connect(function(hit)
			local character = hit:FindFirstAncestorOfClass("Model")
			local player = character and game:GetService("Players"):GetPlayerFromCharacter(character)
			if player then
				onPrompt(player, { Kind = "card" })
			end
		end)
	end

	local laneOrigin = if role == "pasar-ejaan"
		then CFrame.lookAt(Vector3.new(0, 0, -80), Vector3.new(0, 0, -140))
		else CFrame.lookAt(Vector3.new(0, 0, -560), Vector3.new(0, 0, -640))
	registry.lanes.a01 = laneRow(market, "a01", 6, laneOrigin * CFrame.new(-180, 0, 0), 56, gates)
	registry.lanes.a02 = laneRow(market, "a02", 6, laneOrigin * CFrame.new(180, 0, 0), 56, gates)
	registry.lanes.boss = laneRow(market, "boss", 4, laneOrigin * CFrame.new(0, 0, -80), 56, gates)

	local arrival =
		CFrame.lookAt((base * CFrame.new(0, 4, 30)).Position, (base * CFrame.new(0, 4, 0)).Position)
	registry.marketSpawn = arrival
	if role == "pasar-ejaan" then
		spawnPad(market, arrival * CFrame.new(0, -3, 0), "MunculPasar")
	end

	return registry
end

return World
