local AnalyticsService = game:GetService("AnalyticsService")

local Analytics = {}

local STEPS = {
	spawn = 1,
	first_answer = 2,
	first_correct = 3,
	first_reward = 4,
	portal_seen = 5,
	enter_world_1 = 6,
}

function Analytics.funnel(player: Player, name: string)
	local step = STEPS[name]
	if not step then
		return
	end
	pcall(function()
		AnalyticsService:LogOnboardingFunnelStepEvent(player, step, name)
	end)
end

function Analytics.custom(player: Player, name: string, value: number?)
	pcall(function()
		AnalyticsService:LogCustomEvent(player, name, value or 1)
	end)
end

return Analytics
