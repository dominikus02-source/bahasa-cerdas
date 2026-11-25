local AnalyticsService = game:GetService("AnalyticsService")

local Analytics = {}

function Analytics.custom(player: Player, name: string, value: number?)
	pcall(function()
		AnalyticsService:LogCustomEvent(player, name, value or 1)
	end)
end

return Analytics
