local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Palette = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Palette"))
local scripts = script.Parent.Parent
local Juice = require(scripts:WaitForChild("UiKit"):WaitForChild("Juice"))
local NetClient = require(scripts:WaitForChild("UiKit"):WaitForChild("NetClient"))
local Theme = require(scripts:WaitForChild("UiKit"):WaitForChild("Theme"))

local ui = Theme.mount({
	Title = "NUSANTARA",
	ReturnLobby = false,
})

local function choicesFrom(payload)
	local list = {}
	local colors = { Palette.Teal, Palette.Kunyit, Palette.Koral }
	for index, text in payload.Options or {} do
		table.insert(list, {
			Id = text,
			Text = text,
			Color = colors[((index - 1) % #colors) + 1],
		})
	end
	return list
end

NetClient.on(function(kind, payload)
	if type(payload) ~= "table" then
		payload = {}
	end
	if kind == "state" then
		ui.applyState(payload)
	elseif kind == "toast" then
		ui.toast(tostring(payload.Text or ""), payload.Tone)
	elseif kind == "speech" then
		ui.speech(tostring(payload.Speaker or "Nusantara"), tostring(payload.Text or ""))
	elseif kind == "quiz" then
		ui.clearTiles()
		ui.setPrompt(tostring(payload.Head or ""), tostring(payload.Body or ""), tostring(payload.Foot or ""))
		ui.setChoices({
			{ Id = "benar", Text = payload.Left or "Benar", Color = Palette.Teal },
			{ Id = "salah", Text = payload.Right or "Salah", Color = Palette.Koral },
		}, function(id)
			NetClient.fire("choice", { Id = id })
		end)
	elseif kind == "choice3" then
		ui.clearTiles()
		ui.setPrompt(tostring(payload.Head or ""), tostring(payload.Body or ""), "Pilih jurus yang tepat.")
		ui.setChoices(choicesFrom(payload), function(id)
			NetClient.fire("choice", { Text = id })
		end)
	elseif kind == "tiles" then
		ui.clearChoices()
		ui.setPrompt(tostring(payload.Head or ""), tostring(payload.Body or ""), tostring(payload.Foot or ""))
		ui.setTiles(payload.Tiles or {}, function(order)
			NetClient.fire("order", { Order = order })
		end)
	elseif kind == "result" then
		ui.clearChoices()
		ui.clearTiles()
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
