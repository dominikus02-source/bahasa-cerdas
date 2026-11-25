local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Palette = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Palette"))
local scripts = script.Parent.Parent
local Juice = require(scripts:WaitForChild("UiKit"):WaitForChild("Juice"))
local NetClient = require(scripts:WaitForChild("UiKit"):WaitForChild("NetClient"))
local Theme = require(scripts:WaitForChild("UiKit"):WaitForChild("Theme"))

local ui = Theme.mount({
	Title = "Benar atau Salah",
	ReturnLobby = true,
})

NetClient.on(function(kind, payload)
	if type(payload) ~= "table" then
		payload = {}
	end
	if kind == "state" then
		ui.applyState(payload)
	elseif kind == "toast" then
		ui.toast(tostring(payload.Text or ""), payload.Tone)
	elseif kind == "speech" then
		ui.speech(tostring(payload.Speaker or "Pak Putusan"), tostring(payload.Text or ""))
	elseif kind == "quiz" then
		ui.clearTiles()
		ui.setPrompt(tostring(payload.Head or ""), tostring(payload.Body or ""), tostring(payload.Foot or ""))
		ui.setChoices({
			{ Id = "benar", Text = "Benar", Color = Palette.Teal },
			{ Id = "salah", Text = "Salah", Color = Palette.Koral },
		}, function(id)
			NetClient.fire("choice", { Id = id })
		end)
	elseif kind == "result" then
		ui.clearChoices()
		if payload.Done then
			Juice.reward()
		elseif payload.Correct then
			Juice.good()
		else
			Juice.bad()
		end
		ui.setPrompt(tostring(payload.Head or ""), tostring(payload.Body or ""), tostring(payload.Foot or ""))
	end
end)

NetClient.start()
NetClient.fire("sync", {})
