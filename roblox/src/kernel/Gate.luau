local Players = game:GetService("Players")

local Gate = {}

function Gate.playerFromHit(hit: BasePart): Player?
	local model = hit:FindFirstAncestorOfClass("Model")
	if not model then
		return nil
	end
	return Players:GetPlayerFromCharacter(model)
end

function Gate.near(player: Player, part: BasePart, maxDist: number): boolean
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not hrp or not hrp:IsA("BasePart") or not humanoid or humanoid.Health <= 0 then
		return false
	end
	return (hrp.Position - part.Position).Magnitude <= maxDist
end

return Gate
