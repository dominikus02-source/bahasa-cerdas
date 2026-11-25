local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Hud = require(script.Parent.Hud)
local Juice = require(script.Parent.Juice)
local Net = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Net"))

local action = ReplicatedStorage:WaitForChild(Net.Action) :: RemoteEvent
local event = ReplicatedStorage:WaitForChild(Net.Event) :: RemoteEvent

local state = nil
Juice.watchFruits(function()
	return state
end)

local hud = Hud.mount(function(kind: string, payload)
	action:FireServer(kind, payload)
end)

event.OnClientEvent:Connect(function(kind: string, payload)
	if kind == "state" then
		state = payload
		hud.state(payload)
		return
	end
	local handler = hud[kind]
	if handler then
		handler(payload)
	end
end)
