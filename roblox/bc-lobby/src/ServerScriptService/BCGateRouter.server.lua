-- One centralized server-owned route for the lobby's game gates.
-- Benar atau Salah retains its existing tested-specific portal script;
-- this router handles the other catalog entries without duplicate prompts.
-- Unpublished places (nil) remain preview-only, never fake teleports.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local TeleportService=game:GetService("TeleportService")
local RunService=game:GetService("RunService")
local catalog=require(RS:WaitForChild("LobbyCatalog"))
local destination=require(RS:WaitForChild("LobbyDestinations"))
local world=workspace:WaitForChild("BC_Lobby",30)
if not world then warn("[BC Gates] Lobby missing");return end
local router=Instance.new("RemoteEvent")
router.Name="BCGateRouter";router.Parent=RS
local byId={}
local cooldown={}
for _,entry in ipairs(catalog) do
 byId[entry.id]=entry
end
local function message(player,kind,payload)
 router:FireClient(player,kind,payload)
end
local function validNear(player,arch)
 local character=player.Character
 local humanoid=character and character:FindFirstChildOfClass("Humanoid")
 local hrp=character and character:FindFirstChild("HumanoidRootPart")
 return hrp and humanoid and humanoid.Health>0 and (hrp.Position-arch.Position).Magnitude<=23
end
for _,entry in ipairs(catalog) do
 -- Legacy BenarSalahPortal.server.lua already owns this playable route.
 if entry.id=="benar-salah" then continue end
 local gate=world:WaitForChild("Gerbang_"..entry.id,30)
 local arch=gate and gate:WaitForChild("Papan Nama",20)
 if not arch then
  warn("[BC Gates] Gate missing: "..entry.id)
  continue
 end
 local placeId=destination.Games[entry.id]
 local canEnter=not entry.unpublished and type(placeId)=="number" and placeId>0
 local old=arch:FindFirstChild("InfoGame")
 if old then old.Enabled=false end
 local prompt=Instance.new("ProximityPrompt")
 prompt.Name="GerbangPilihan"
 prompt.ActionText=canEnter and "Lihat & Masuk" or "Lihat Informasi"
 prompt.ObjectText=entry.name
 prompt.HoldDuration=.12
 prompt.MaxActivationDistance=14
 prompt.RequiresLineOfSight=false
 prompt.Parent=arch
 prompt.Triggered:Connect(function(player)
  message(player,"detail",{
   id=entry.id,title=entry.name,description=entry.description,
   level=entry.level,players=entry.players,available=canEnter,
   status=entry.unpublished and "Belum diterbitkan" or
    (canEnter and "Siap menuju arena" or "Menunggu penerbitan game")
  })
 end)
end
router.OnServerEvent:Connect(function(player,action,id)
 if action~="enter" or type(id)~="string" or #id>64 then return end
 local entry=byId[id]
 if not entry then return end
 if id=="benar-salah" then
  message(player,"error","Gunakan gerbang Benar atau Salah yang tersedia.")
  return
 end
 local placeId=destination.Games[id]
 if entry.unpublished or type(placeId)~="number" or placeId<=0 then
  message(player,"error","Permainan ini belum diterbitkan. Gerbang masih pratinjau.")
  return
 end
 local worldNow=workspace:FindFirstChild("BC_Lobby")
 local gate=worldNow and worldNow:FindFirstChild("Gerbang_"..id)
 local arch=gate and gate:FindFirstChild("Papan Nama")
 if not arch or not validNear(player,arch) then
  message(player,"error","Dekati gerbang yang dipilih sebelum masuk.")
  return
 end
 local now=os.clock()
 if now-(cooldown[player] or -100)<8 then return end
 cooldown[player]=now
 if RunService:IsStudio() then
  message(player,"error","Teleport lintas place perlu diuji dari aplikasi Roblox setelah publish.")
  return
 end
 message(player,"loading","Menghubungkan ke "..entry.name.."...")
 local ok,err=pcall(function()
  TeleportService:TeleportAsync(placeId,{player})
 end)
 if not ok then
  cooldown[player]=nil
  warn("[BC Gates] Teleport failed "..id..": "..tostring(err))
  message(player,"error","Perpindahan belum berhasil. Coba lagi.")
 end
end)
TeleportService.TeleportInitFailed:Connect(function(player,_,_,placeId)
 if not player or not player.Parent then return end
 for id,target in pairs(destination.Games) do
  if type(target)=="number" and target==placeId and id~="benar-salah" then
   cooldown[player]=nil
   message(player,"error","Koneksi gagal. Silakan mencoba kembali.")
   break
  end
 end
end)
Players.PlayerRemoving:Connect(function(player)cooldown[player]=nil end)
print("[BC Gates] 13 catalog entries; all unpublished routes remain disabled")
