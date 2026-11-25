local scripts = script.Parent.Parent
local Juice = require(scripts:WaitForChild("UiKit"):WaitForChild("Juice"))
local NetClient = require(scripts:WaitForChild("UiKit"):WaitForChild("NetClient"))
local Theme = require(scripts:WaitForChild("UiKit"):WaitForChild("Theme"))

local ui = Theme.mount({
	Title = "Susun Kata",
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
		ui.speech(tostring(payload.Speaker or "Mak Bengkel"), tostring(payload.Text or ""))
	elseif kind == "tiles" then
		ui.clearChoices()
		ui.setPrompt(tostring(payload.Head or ""), tostring(payload.Body or ""), tostring(payload.Foot or ""))
		ui.setTiles(payload.Tiles or {}, function(order)
			NetClient.fire("order", { Order = order })
		end)
	elseif kind == "miss" then
		Juice.bad()
	elseif kind == "result" then
		if payload.Done then
			Juice.reward()
			ui.roundOver({
				Title = tostring(payload.Head or ""),
				Body = tostring(payload.Body or ""),
				Foot = tostring(payload.Foot or ""),
				Next = payload.Next == true,
			}, function()
				NetClient.fire("mode", { Kind = payload.Kind or "huruf", Mode = payload.Mode or "santai" })
			end, function()
				local stepKind = if payload.Kind == "huruf" and payload.Mode ~= "tantangan"
					then "huruf"
					else "kalimat"
				local stepMode = if payload.Kind == "huruf" and payload.Mode ~= "tantangan"
					then "tantangan"
					else "santai"
				NetClient.fire("mode", { Kind = stepKind, Mode = stepMode })
			end)
		elseif payload.Correct then
			Juice.good()
			ui.clearTiles()
		else
			Juice.bad()
			ui.clearTiles()
		end
		ui.setPrompt(tostring(payload.Head or ""), tostring(payload.Body or ""), tostring(payload.Foot or ""))
	end
end)

NetClient.start()
NetClient.fire("sync", {})
