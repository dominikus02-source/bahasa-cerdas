local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Palette = require(ReplicatedStorage.Shared.Palette)

local Build = {}

local function atomic(model: Model)
	pcall(function()
		model.ModelStreamingMode = Enum.ModelStreamingMode.Atomic
	end)
end

function Build.folder(parent: Instance, name: string): Folder
	local folder = Instance.new("Folder")
	folder.Name = name
	folder.Parent = parent
	return folder
end

function Build.model(parent: Instance, name: string): Model
	local model = Instance.new("Model")
	model.Name = name
	model.Parent = parent
	atomic(model)
	return model
end

function Build.part(
	parent: Instance,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material?,
	shape: Enum.PartType?
): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	if shape then
		part.Shape = shape
	end
	return part
end

function Build.decor(
	parent: Instance,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	shape: Enum.PartType?
)
	local part = Build.part(parent, name, size, cframe, color, Enum.Material.SmoothPlastic, shape)
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.CastShadow = false
	return part
end

function Build.plate(
	parent: Instance,
	center: Vector3,
	sizeX: number,
	sizeZ: number,
	color: Color3,
	thickness: number?
)
	local height = thickness or 1
	return Build.part(
		parent,
		"Lantai",
		Vector3.new(sizeX, height, sizeZ),
		CFrame.new(center + Vector3.new(0, height / 2, 0)),
		color,
		Enum.Material.Grass
	)
end

local function regularFont(): Enum.Font
	for _, item in Enum.Font:GetEnumItems() do
		if item.Name == "BuilderSans" then
			return item
		end
	end
	return Enum.Font.Gotham
end

function Build.label(part: BasePart, text: string, _face: Enum.NormalId?, textSize: number?, color: Color3?)
	if part.Size.Y > 1.2 and part.Size.Z < 1.2 then
		part.Transparency = 1
		part.CanCollide = false
		part.CastShadow = false
	end
	local gui = Instance.new("BillboardGui")
	gui.Name = "Tulisan"
	gui.Size = UDim2.fromOffset(180, 22)
	gui.StudsOffsetWorldSpace = Vector3.new(0, 1.3, 0)
	gui.MaxDistance = 70
	gui.AlwaysOnTop = false
	gui.LightInfluence = 0
	gui.Parent = part
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.fromScale(1, 1)
	label.Font = regularFont()
	label.Text = text
	label.TextColor3 = color or Color3.fromRGB(42, 46, 54)
	label.TextSize = math.clamp(textSize or 14, 14, 16)
	label.TextWrapped = false
	label.TextScaled = false
	label.TextStrokeTransparency = 1
	label.RichText = false
	label.TextTruncate = Enum.TextTruncate.AtEnd
	label.TextXAlignment = Enum.TextXAlignment.Center
	label.AutoLocalize = false
	label.Parent = gui
	return label
end

function Build.spawnPad(parent: Instance, cframe: CFrame): SpawnLocation
	local pad = Instance.new("SpawnLocation")
	pad.Name = "Mulai"
	pad.Size = Vector3.new(8, 1, 8)
	pad.CFrame = cframe
	pad.Anchored = true
	pad.Neutral = true
	pad.Duration = 0
	pad.Color = Palette.Krem
	pad.Material = Enum.Material.SmoothPlastic
	pad.TopSurface = Enum.SurfaceType.Smooth
	pad.Parent = parent
	return pad
end

function Build.lamp(parent: Instance, position: Vector3)
	Build.part(
		parent,
		"Tiang",
		Vector3.new(0.6, 7, 0.6),
		CFrame.new(position + Vector3.new(0, 3.5, 0)),
		Palette.WoodDark,
		Enum.Material.Wood
	)
	local glow = Build.decor(
		parent,
		"Lampu",
		Vector3.new(1.4, 1.4, 1.4),
		CFrame.new(position + Vector3.new(0, 7.2, 0)),
		Palette.Lamp,
		Enum.PartType.Ball
	)
	glow.Material = Enum.Material.Neon
	local light = Instance.new("PointLight")
	light.Color = Palette.Lamp
	light.Brightness = 1.2
	light.Range = 16
	light.Shadows = false
	light.Parent = glow
end

function Build.tree(parent: Instance, position: Vector3, scale: number?)
	local size = scale or 1
	Build.part(
		parent,
		"Batang",
		Vector3.new(1.2, 5, 1.2) * Vector3.new(size, size, size),
		CFrame.new(position + Vector3.new(0, 2.5 * size, 0)),
		Palette.Wood,
		Enum.Material.Wood
	)
	local leaf = Build.decor(
		parent,
		"Daun",
		Vector3.new(5.5, 3.2, 5.5) * size,
		CFrame.new(position + Vector3.new(0, 6.2 * size, 0)),
		Palette.Leaf,
		Enum.PartType.Ball
	)
	leaf.Material = Enum.Material.Grass
end

function Build.arch(parent: Instance, cframe: CFrame, color: Color3, text: string): Part
	local model = Build.model(parent, "Gerbang")
	model:PivotTo(cframe)
	local function localPart(name: string, size: Vector3, offset: CFrame, paint: Color3)
		return Build.part(model, name, size, cframe * offset, paint, Enum.Material.SmoothPlastic)
	end
	localPart("TiangKiri", Vector3.new(1.6, 12, 1.6), CFrame.new(-5.2, 6, 0), Palette.Wood)
	localPart("TiangKanan", Vector3.new(1.6, 12, 1.6), CFrame.new(5.2, 6, 0), Palette.Wood)
	local header = localPart("Palang", Vector3.new(8.2, 1.1, 1.2), CFrame.new(0, 11.2, 0), color)
	local gui = Instance.new("BillboardGui")
	gui.Name = "Tulisan"
	gui.Size = UDim2.fromOffset(160, 22)
	gui.StudsOffsetWorldSpace = Vector3.new(0, 1.2, 0)
	gui.MaxDistance = 70
	gui.AlwaysOnTop = false
	gui.Parent = header
	local caption = Instance.new("TextLabel")
	caption.BackgroundTransparency = 1
	caption.Size = UDim2.fromScale(1, 1)
	caption.Font = regularFont()
	caption.Text = text
	caption.TextColor3 = Color3.fromRGB(42, 46, 54)
	caption.TextSize = 16
	caption.TextScaled = false
	caption.TextWrapped = false
	caption.TextTruncate = Enum.TextTruncate.AtEnd
	caption.TextStrokeTransparency = 1
	caption.RichText = false
	caption.Parent = gui
	local trigger = localPart("Pemicu", Vector3.new(8, 10, 3), CFrame.new(0, 5, 0), color)
	trigger.Transparency = 1
	trigger.CanCollide = false
	trigger.CanTouch = true
	trigger.CanQuery = true
	return trigger
end

function Build.prompt(part: BasePart, actionText: string, objectText: string): ProximityPrompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = actionText
	prompt.ObjectText = objectText
	prompt.MaxActivationDistance = 12
	prompt.RequiresLineOfSight = false
	prompt.HoldDuration = 0
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.Parent = part
	return prompt
end

function Build.board(parent: Instance, cframe: CFrame, color: Color3): Part
	local post = Build.part(
		parent,
		"TiangPapan",
		Vector3.new(1, 8, 1),
		cframe * CFrame.new(0, 4, 0),
		Palette.WoodDark,
		Enum.Material.Wood
	)
	post.Name = "TiangPapan"
	local face = Build.part(parent, "Papan", Vector3.new(16, 8, 0.6), cframe * CFrame.new(0, 8, 0), color)
	return face
end

function Build.rock(parent: Instance, position: Vector3, scale: number?)
	local size = scale or 1
	local rock = Build.part(
		parent,
		"Batu",
		Vector3.new(4, 2.4, 3.2) * size,
		CFrame.new(position + Vector3.new(0, 1.2 * size, 0)) * CFrame.Angles(0, 0.4, 0.1),
		Palette.Stone,
		Enum.Material.Slate
	)
	return rock
end

function Build.water(parent: Instance, center: Vector3, sizeX: number, sizeZ: number)
	local water = Build.part(
		parent,
		"Air",
		Vector3.new(sizeX, 1.2, sizeZ),
		CFrame.new(center),
		Palette.Water,
		Enum.Material.SmoothPlastic
	)
	water.CanCollide = false
	water.Transparency = 0.25
	return water
end

function Build.boat(parent: Instance, cframe: CFrame)
	local model = Build.model(parent, "Perahu")
	Build.part(model, "Lambung", Vector3.new(4, 1.2, 10), cframe, Palette.Wood, Enum.Material.Wood)
	Build.part(
		model,
		"Hidung",
		Vector3.new(4, 1.2, 3),
		cframe * CFrame.new(0, 0.4, -6) * CFrame.Angles(0.5, 0, 0),
		Palette.WoodDark,
		Enum.Material.Wood,
		Enum.PartType.Wedge
	)
	Build.decor(model, "Layar", Vector3.new(0.2, 4, 3), cframe * CFrame.new(0, 3.2, 0), Palette.Krem)
end

function Build.sky(clock: number)
	local Lighting = game:GetService("Lighting")
	Lighting.ClockTime = clock
	Lighting.Brightness = 2.1
	Lighting.Ambient = Color3.fromRGB(78, 68, 58)
	Lighting.OutdoorAmbient = Color3.fromRGB(148, 128, 104)
	Lighting.Technology = Enum.Technology.Future
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
	atmosphere.Density = 0.26
	atmosphere.Offset = 0.12
	atmosphere.Color = Color3.fromRGB(255, 214, 168)
	atmosphere.Decay = Color3.fromRGB(130, 96, 120)
	atmosphere.Glare = 0.12
	atmosphere.Haze = 1
	atmosphere.Parent = Lighting
	local bloom = Lighting:FindFirstChild("BCBloom") or Instance.new("BloomEffect")
	bloom.Name = "BCBloom"
	bloom.Intensity = 0.28
	bloom.Size = 18
	bloom.Threshold = 1.7
	bloom.Parent = Lighting
	local color = Lighting:FindFirstChild("BCColor") or Instance.new("ColorCorrectionEffect")
	color.Name = "BCColor"
	color.Saturation = 0.06
	color.Contrast = 0.04
	color.TintColor = Color3.fromRGB(255, 244, 228)
	color.Parent = Lighting
end

function Build.kampung(parent: Instance, center: Vector3, flavor: string)
	local function quiet(piece: BasePart)
		piece.CastShadow = false
		piece.CanTouch = false
		piece.CanQuery = false
	end
	for step = -3, 3 do
		local tile = Build.decor(
			parent,
			"Jalan",
			Vector3.new(3.2, 0.15, 3.2),
			CFrame.new(center + Vector3.new(0, 0.2, step * 4)),
			Palette.Stone
		)
		quiet(tile)
	end
	local spots = {
		center + Vector3.new(-16, 0, 8),
		center + Vector3.new(18, 0, -6),
		center + Vector3.new(-10, 0, -18),
	}
	for _, spot in spots do
		local trunk = Build.part(
			parent,
			"Palem",
			Vector3.new(6.5, 0.5, 0.5),
			CFrame.new(spot + Vector3.new(0, 3.2, 0)) * CFrame.Angles(0, 0, math.rad(90)),
			Palette.Wood,
			Enum.Material.Wood,
			Enum.PartType.Cylinder
		)
		trunk.CastShadow = false
		trunk.CanCollide = false
		local crown = Build.decor(
			parent,
			"Daun",
			Vector3.new(3.4, 1.2, 3.4),
			CFrame.new(spot + Vector3.new(0, 6.6, 0)),
			Palette.Leaf,
			Enum.PartType.Ball
		)
		quiet(crown)
		Build.lamp(parent, spot + Vector3.new(3, 0, 2))
	end
	if flavor == "jawa" then
		local canopy = Build.decor(
			parent,
			"Beringin",
			Vector3.new(10, 4, 10),
			CFrame.new(center + Vector3.new(14, 6, 6)),
			Palette.LeafDark,
			Enum.PartType.Ball
		)
		quiet(canopy)
	elseif flavor == "sumatra" then
		Build.boat(parent, CFrame.new(center + Vector3.new(-8, 1.2, 10)))
	elseif flavor == "dermaga" then
		local bird = Build.decor(
			parent,
			"Burung",
			Vector3.new(0.8, 0.3, 1.2),
			CFrame.new(center + Vector3.new(0, 12, -6)),
			Palette.Ink
		)
		quiet(bird)
	end
end

return Build
