local ServerScriptService = game:GetService("ServerScriptService")

local Shell = require(ServerScriptService:WaitForChild("Kernel"):WaitForChild("Shell"))
local Quest = require(script.Parent.Quest)
local World = require(script.Parent.World)

Quest.bind(World.build())

Shell.start({
	Title = "NUSANTARA",
	ReturnLobby = false,
	Goal = function(profile)
		return Quest.goal(profile)
	end,
	OnJoin = function(player, profile)
		Quest.welcome(player, profile)
	end,
	OnAction = function(player, _profile, action, payload)
		if action == "choice" then
			Quest.choice(player, payload)
			return true
		elseif action == "again" then
			Quest.replay(player, tostring(payload.Phase or "jawa"))
			return true
		elseif action == "next" then
			Quest.follow(player)
			return true
		elseif action == "order" then
			if not Shell.allow(player, "answer", 8, 8) then
				return true
			end
			Quest.order(player, payload.Order)
			return true
		end
		return false
	end,
})
