local HttpService = game:GetService("HttpService")

local ApiConfig = require(script.Parent.ApiConfig)

local BahasaApi = {}

local secretObject = nil
local secretMissing = false

local function secret()
	if secretMissing then
		return nil
	end
	if secretObject ~= nil then
		return secretObject
	end
	local ok, result = pcall(function()
		return HttpService:GetSecret(ApiConfig.Secret)
	end)
	if not ok or result == nil then
		secretMissing = true
		return nil
	end
	secretObject = result
	return secretObject
end

function BahasaApi.online(): boolean
	return HttpService.HttpEnabled and secret() ~= nil
end

function BahasaApi.post(path: string, body)
	local token = secret()
	if not token or not HttpService.HttpEnabled then
		return nil, "offline"
	end
	local payload = HttpService:JSONEncode(body)
	for attempt = 1, 3 do
		local headers = {
			["Content-Type"] = "application/json",
			["Authorization"] = token:AddPrefix("Bearer "),
			["x-roblox-timestamp"] = tostring(DateTime.now().UnixTimestampMillis),
			["x-request-id"] = HttpService:GenerateGUID(false),
			["x-roblox-job-id"] = game.JobId,
			["x-roblox-place-id"] = tostring(game.PlaceId),
		}
		local ok, response = pcall(function()
			return HttpService:RequestAsync({
				Url = ApiConfig.Base .. path,
				Method = "POST",
				Headers = headers,
				Body = payload,
			})
		end)
		if ok and type(response) == "table" then
			local decoded = nil
			if type(response.Body) == "string" and response.Body ~= "" then
				pcall(function()
					decoded = HttpService:JSONDecode(response.Body)
				end)
			end
			local status = response.StatusCode
			if status >= 200 and status < 300 then
				return decoded or {}
			end
			if status == 409 or status == 400 or status == 401 or status == 403 then
				return nil, decoded or { error = "HTTP_" .. tostring(status) }
			end
		end
		task.wait(0.4 * attempt)
	end
	return nil, "offline"
end

function BahasaApi.enqueue(profile, path: string, body)
	profile.queue = profile.queue or {}
	if #profile.queue >= 20 then
		table.remove(profile.queue, 1)
	end
	table.insert(profile.queue, { Path = path, Body = body })
end

function BahasaApi.flush(player: Player, profile)
	if type(profile.queue) ~= "table" or #profile.queue == 0 then
		return
	end
	if not BahasaApi.online() then
		return
	end
	local remain = {}
	for _, job in profile.queue do
		local result, err = BahasaApi.post(job.Path, job.Body)
		if result == nil and err == "offline" then
			table.insert(remain, job)
		end
	end
	profile.queue = remain
	if player then
		profile._dirty = true
	end
end

local LINK_TEXT = {
	INVALID_CODE = "Kode tidak dikenal.",
	CODE_USED = "Kode itu sudah dipakai.",
	CODE_EXPIRED = "Kode sudah tidak berlaku. Minta kode baru dari akunmu.",
	ACCOUNT_ALREADY_LINKED = "Akun itu sudah tertaut.",
	ROBLOX_ALREADY_LINKED = "Pengguna Roblox ini sudah tertaut ke akun lain.",
	AGE_GATE = "Konfirmasi usiamu dulu di akun BahasaCerdas.",
	LINK_CONFLICT = "Tautan bentrok. Coba lagi nanti.",
}

function BahasaApi.refresh(player: Player, profile)
	local result, err = BahasaApi.post("/api/roblox/session", {
		robloxUserId = tostring(player.UserId),
	})
	profile.link = profile.link or {}
	if result == nil then
		profile.link.online = false
		return err
	end
	profile.link.online = true
	if result.linked then
		profile.link.linked = true
		profile.link.name = tostring(result.displayName or "")
		profile.link.xp = tonumber(result.xp) or 0
		profile.link.level = tonumber(result.level) or 1
		profile.link.rank = tostring(result.rank or "")
		profile.link.ageAllowed = result.ageAllowed ~= false
	else
		profile.link.linked = false
		profile.link.name = ""
	end
	profile._dirty = true
	return nil
end

function BahasaApi.verify(player: Player, profile, code: string)
	local result, err = BahasaApi.post("/api/roblox/link/verify", {
		code = code,
		robloxUserId = tostring(player.UserId),
		robloxUsername = player.Name,
		robloxDisplayName = player.DisplayName,
	})
	if result and result.linked then
		profile.link.linked = true
		profile.link.online = true
		profile._dirty = true
		BahasaApi.refresh(player, profile)
		return true, "Tautan tersimpan. XP akunmu bisa masuk lewat Setor XP."
	end
	if type(err) == "table" then
		local known = LINK_TEXT[err.error]
		if known then
			return false, known
		end
	end
	if err == "offline" then
		return false, "Tautan belum tersambung. Koin dan bintang tetap tersimpan di kota ini."
	end
	return false, "Kode belum bisa dipakai. Coba lagi."
end

function BahasaApi.fetchQuestion(player: Player)
	local result = BahasaApi.post("/api/roblox/questions", {
		robloxUserId = tostring(player.UserId),
		count = 1,
	})
	if type(result) ~= "table" or type(result.questions) ~= "table" then
		return nil
	end
	local question = result.questions[1]
	if
		type(question) ~= "table"
		or type(question.prompt) ~= "string"
		or type(question.options) ~= "table"
	then
		return nil
	end
	if #question.options < 2 or #question.options > 4 then
		return nil
	end
	local options = {}
	for _, option in question.options do
		if type(option) ~= "string" or option == "" then
			return nil
		end
		table.insert(options, option)
	end
	return {
		Id = tostring(question.id),
		Prompt = question.prompt,
		Options = options,
		SessionId = tostring(result.sessionId or ""),
		Source = "web",
	}
end

function BahasaApi.submitAnswer(
	player: Player,
	profile,
	sessionId: string,
	questionId: string,
	answerText: string
)
	local body = {
		robloxUserId = tostring(player.UserId),
		sessionId = sessionId,
		idempotencyKey = "setor-" .. sessionId,
		answers = {
			{ questionId = questionId, answer = answerText },
		},
	}
	local result, err = BahasaApi.post("/api/roblox/results", body)
	if result == nil and err == "offline" then
		BahasaApi.enqueue(profile, "/api/roblox/results", body)
		profile._dirty = true
	end
	return result, err
end

function BahasaApi.badge(player: Player, profile, codes)
	if not profile.link or not profile.link.linked then
		return
	end
	local body = {
		robloxUserId = tostring(player.UserId),
		codes = codes,
	}
	local result, err = BahasaApi.post("/api/roblox/badges", body)
	if result == nil and err == "offline" then
		BahasaApi.enqueue(profile, "/api/roblox/badges", body)
		profile._dirty = true
	end
end

return BahasaApi
