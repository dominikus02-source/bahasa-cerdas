local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")

local Palette = require(game:GetService("ReplicatedStorage").Shared.Palette)

local Guide = {}

local beam: Beam? = nil
local fromAttachment: Attachment? = nil
local current = ""

local function clear()
	if beam then
		beam:Destroy()
		beam = nil
	end
	if fromAttachment then
		fromAttachment:Destroy()
		fromAttachment = nil
	end
end

local function findTarget(name: string): Attachment?
	for _, mark in CollectionService:GetTagged("BCGuide") do
		if mark:GetAttribute("Guide") == name then
			local attachment = mark:FindFirstChild("Tujuan")
			if attachment and attachment:IsA("Attachment") then
				return attachment
			end
		end
	end
	return nil
end

function Guide.aim(targetName: string?)
	clear()
	current = if type(targetName) == "string" then targetName else ""
	if current == "" then
		return
	end
	local character = Players.LocalPlayer.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local goal = findTarget(current)
	if not root or not goal then
		return
	end
	local source = Instance.new("Attachment")
	source.Name = "Arah"
	source.Position = Vector3.new(0, 1, 0)
	source.Parent = root
	fromAttachment = source
	local line = Instance.new("Beam")
	line.Attachment0 = source
	line.Attachment1 = goal
	line.Width0 = 0.7
	line.Width1 = 0.25
	line.FaceCamera = true
	line.LightEmission = 0.6
	line.Color = ColorSequence.new(Palette.Kunyit)
	line.Transparency = NumberSequence.new(0.15)
	line.Parent = root
	beam = line
end

function Guide.bind()
	Players.LocalPlayer.CharacterAdded:Connect(function()
		local target = current
		clear()
		task.defer(function()
			if target ~= "" then
				Guide.aim(target)
			end
		end)
	end)
end

return Guide
