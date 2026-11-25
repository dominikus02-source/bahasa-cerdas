local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Net = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Net"))

local Remotes = {}
local event: RemoteEvent
local action: RemoteEvent
local query: RemoteFunction

function Remotes.init()
	event = Instance.new("RemoteEvent")
	event.Name = Net.Event
	event.Parent = ReplicatedStorage

	action = Instance.new("RemoteEvent")
	action.Name = Net.Action
	action.Parent = ReplicatedStorage

	query = Instance.new("RemoteFunction")
	query.Name = Net.Query
	query.Parent = ReplicatedStorage
end

function Remotes.fire(player: Player, kind: string, payload)
	if player and player.Parent and event then
		event:FireClient(player, kind, payload)
	end
end

function Remotes.onAction(handler)
	action.OnServerEvent:Connect(handler)
end

function Remotes.onQuery(handler)
	query.OnServerInvoke = function(player, kind, payload)
		local ok, result = pcall(handler, player, kind, payload)
		if not ok then
			return { Ok = false, Message = "Permintaan gagal. Coba lagi." }
		end
		return result
	end
end

return Remotes
