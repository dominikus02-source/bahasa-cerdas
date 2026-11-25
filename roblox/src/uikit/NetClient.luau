local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Net = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Net"))

local NetClient = {}

local action: RemoteEvent? = nil
local query: RemoteFunction? = nil
local handlers = {}

function NetClient.on(handler)
	table.insert(handlers, handler)
end

function NetClient.fire(kind: string, payload)
	if action then
		action:FireServer(kind, payload or {})
	end
end

function NetClient.query(kind: string, payload)
	if not query then
		return { Ok = false, Message = "Belum tersambung." }
	end
	local ok, result = pcall(function()
		return query:InvokeServer(kind, payload or {})
	end)
	if not ok or type(result) ~= "table" then
		return { Ok = false, Message = "Permintaan gagal. Coba lagi." }
	end
	return result
end

function NetClient.start()
	local event = ReplicatedStorage:WaitForChild(Net.Event, 15)
	action = ReplicatedStorage:WaitForChild(Net.Action, 15) :: RemoteEvent
	query = ReplicatedStorage:WaitForChild(Net.Query, 15) :: RemoteFunction
	if not event or not event:IsA("RemoteEvent") then
		return
	end
	event.OnClientEvent:Connect(function(kind, payload)
		for _, handler in handlers do
			handler(kind, payload)
		end
	end)
end

return NetClient
