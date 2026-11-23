-- Canonical Roblox routing identifiers. Keep all unpublished game destinations as nil.
-- Filled from successful Roblox Studio publication and verified server logs.
local Destinations={
  Lobby={placeId=83975639468986,universeId=10778631695,name="BahasaCerdas"},
  Nusantara={placeId=135622689114243,universeId=10778596245,name="NUSANTARA: Kebangkitan Bahasa"},
  Games={
    ["benar-salah"]=100707509457007,
    ["susun-kata"]=nil,
    ["tebak-kata"]=nil,
    ["lari-kata"]=nil,
    ["menara"]=nil,
    ["bermain-kata"]=nil,
    ["petualangan-kata"]=nil,
    ["irama-kata"]=nil,
    ["teka-teki-silang"]=nil,
    ["tantang"]=nil,
    ["adu-cepat"]=nil,
    ["kuis-tempur"]=nil,
    ["rpg"]=nil,
  }
}
return Destinations
