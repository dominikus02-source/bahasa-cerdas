local ServerScriptService = game:GetService("ServerScriptService")

local Shell = require(ServerScriptService:WaitForChild("Kernel"):WaitForChild("Shell"))
local Round = require(script.Parent.Round)
local World = require(script.Parent.World)

Round.bind(World.build())

Shell.start({
	Title = "Susun Kata",
	ReturnLobby = true,
	Goal = function(profile)
		return Round.goal(profile)
	end,
	OnJoin = function(player, profile)
		Round.welcome(player, profile)
	end,
	OnAction = function(player, _profile, action, payload)
		if action == "order" then
			Round.order(player, payload)
			return true
		elseif action == "mode" then
			Round.mode(player, payload)
			return true
		end
		return false
	end,
})
