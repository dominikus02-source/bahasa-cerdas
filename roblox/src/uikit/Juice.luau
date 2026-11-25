local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)
local Palette = require(ReplicatedStorage.Shared.Palette)

local Juice = {}

local flash: Frame? = nil

function Juice.bind(frame: Frame)
	flash = frame
end

function Juice.play(soundId: string, speed: number?)
	local sound = Instance.new("Sound")
	sound.SoundId = soundId
	sound.Volume = 0.4
	sound.PlaybackSpeed = speed or 1
	sound.Parent = SoundService
	sound:Play()
	sound.Ended:Connect(function()
		sound:Destroy()
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

function Juice.confetti()
	local character = Players.LocalPlayer.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp or not hrp:IsA("BasePart") then
		return
	end
	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	emitter.Rate = 0
	emitter.Speed = NumberRange.new(8, 14)
	emitter.Lifetime = NumberRange.new(0.4, 0.8)
	emitter.SpreadAngle = Vector2.new(180, 180)
	emitter.LightEmission = 0.9
	emitter.Color = ColorSequence.new(Palette.Kunyit, Palette.Teal)
	emitter.Parent = hrp
	emitter:Emit(28)
	task.delay(1.2, function()
		emitter:Destroy()
	end)
end

function Juice.good()
	Juice.play(Config.Sounds.Correct, 1)
	Juice.pulse(Palette.Teal)
	Juice.confetti()
end

function Juice.bad()
	Juice.play(Config.Sounds.Wrong, 1)
	Juice.pulse(Palette.Koral)
end

function Juice.reward()
	Juice.play(Config.Sounds.Reward, 1)
	Juice.pulse(Palette.Kunyit)
	Juice.confetti()
end

function Juice.click()
	Juice.play(Config.Sounds.Click, 1)
end

return Juice
