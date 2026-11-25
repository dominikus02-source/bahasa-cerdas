local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)
local Palette = require(ReplicatedStorage.Shared.Palette)

local Juice = {}

local player = Players.LocalPlayer
local flash: Frame? = nil

function Juice.bindFlash(frame: Frame)
	flash = frame
end

function Juice.play(soundId: string, speed: number)
	local sound = Instance.new("Sound")
	sound.SoundId = soundId
	sound.Volume = 0.45
	sound.PlaybackSpeed = speed
	sound.Parent = SoundService
	sound:Play()
	sound.Ended:Connect(function()
		sound:Destroy()
	end)
end

function Juice.confetti()
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end
	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	emitter.Rate = 0
	emitter.Speed = NumberRange.new(10, 16)
	emitter.Lifetime = NumberRange.new(0.4, 0.8)
	emitter.SpreadAngle = Vector2.new(180, 180)
	emitter.LightEmission = 0.9
	emitter.Color = ColorSequence.new(Palette.Kunyit, Palette.Teal)
	emitter.Parent = hrp
	emitter:Emit(36)
	task.delay(1.2, function()
		emitter:Destroy()
	end)
end

function Juice.pulse(color: Color3)
	if not flash then
		return
	end
	flash.BackgroundColor3 = color
	flash.BackgroundTransparency = 0.72
	TweenService:Create(flash, TweenInfo.new(0.35), { BackgroundTransparency = 1 }):Play()
end

local function fruitColor(index: number, state): Color3
	local stars = state.Stars or {}
	local lit = 0
	if index == 1 then
		lit = stars.a01 or 0
	elseif index == 2 then
		lit = stars.a02 or 0
	elseif index == 3 and state.Boss then
		lit = 3
	end
	if lit >= 3 then
		return Palette.Kunyit
	elseif lit == 2 then
		return Palette.Teal
	elseif lit == 1 then
		return Palette.Leaf
	end
	return Palette.Ungu
end

function Juice.paintFruits(state)
	for _, fruit in CollectionService:GetTagged("BCFruit") do
		if fruit:IsA("BasePart") then
			local index = fruit:GetAttribute("FruitIndex")
			if type(index) == "number" then
				fruit.Color = fruitColor(index, state)
			end
		end
	end
end

function Juice.watchFruits(getState)
	CollectionService:GetInstanceAddedSignal("BCFruit"):Connect(function()
		local state = getState()
		if state then
			Juice.paintFruits(state)
		end
	end)
end

function Juice.click()
	Juice.play(Config.Sounds.Click, 1)
end

return Juice
