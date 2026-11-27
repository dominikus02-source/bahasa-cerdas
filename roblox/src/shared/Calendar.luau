-- Hari dan minggu dihitung di zona WIB (UTC+7). Minggu mengikuti ISO.
local Calendar = {}

local function daysFromCivil(year: number, month: number, day: number): number
	local y = year
	if month <= 2 then
		y -= 1
	end
	local era = y // 400
	local yoe = y - era * 400
	local shift = if month > 2 then -3 else 9
	local doy = (153 * (month + shift) + 2) // 5 + day - 1
	local doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
	return era * 146097 + doe - 719468
end

local function civilFromDays(z: number): (number, number, number)
	local days = z + 719468
	local era = days // 146097
	local doe = days - era * 146097
	local yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
	local y = yoe + era * 400
	local doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
	local mp = (5 * doy + 2) // 153
	local d = doy - (153 * mp + 2) // 5 + 1
	local m = mp + (if mp < 10 then 3 else -9)
	if m <= 2 then
		y += 1
	end
	return y, m, d
end

local ISO_DOW = { 4, 5, 6, 7, 1, 2, 3 }

local function wibDate(unix: number): (number, number, number)
	local parts = os.date("!*t", unix + 7 * 3600)
	return parts.year, parts.month, parts.day
end

function Calendar.dayKey(unix: number): string
	local year, month, day = wibDate(unix)
	return string.format("%04d-%02d-%02d", year, month, day)
end

function Calendar.weekKey(unix: number): string
	local year, month, day = wibDate(unix)
	local z = daysFromCivil(year, month, day)
	local isoDow = ISO_DOW[(z % 7) + 1]
	local thursday = z + (4 - isoDow)
	local isoYear = civilFromDays(thursday)
	local jan4 = daysFromCivil(isoYear, 1, 4)
	local jan4Dow = ISO_DOW[(jan4 % 7) + 1]
	local week1Monday = jan4 - (jan4Dow - 1)
	local thisMonday = z - (isoDow - 1)
	local week = (thisMonday - week1Monday) // 7 + 1
	return string.format("%04dW%02d", isoYear, week)
end

function Calendar.daySerial(key: string): number
	local year, month, day = string.match(key, "(%d+)%-(%d+)%-(%d+)")
	if not year then
		return 0
	end
	return daysFromCivil(tonumber(year) or 1970, tonumber(month) or 1, tonumber(day) or 1)
end

return Calendar
