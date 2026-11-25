local ServerScriptService = game:GetService("ServerScriptService")

local Shell = require(ServerScriptService:WaitForChild("Kernel"):WaitForChild("Shell"))
local Round = require(script.Parent.Round)
local World = require(script.Parent.World)

local world = World.build()
Round.bind(world)

Shell.start({
	Title = "Benar atau Salah",
	ReturnLobby = true,
	Goal = function(profile)
		return Round.goal(profile)
	end,
	OnJoin = function(player, profile)
		Round.welcome(player, profile)
	end,
	OnAction = function(player, _profile, action, payload)
		if action == "choice" then
			Round.choice(player, payload)
			return true
		elseif action == "again" then
			Round.begin(player, if payload.Mode == "tantangan" then "tantangan" else "santai")
			return true
		elseif action == "next" then
			Round.begin(player, "tantangan")
			return true
		end
		return false
	end,
})
