-- Kota Aksara -> Benar atau Salah (same UniverseId 10778631695).
-- Guards distance, character health, cooldown; server owns TeleportAsync.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local TeleportService=game:GetService("TeleportService")
local Dest=require(RS:WaitForChild("LobbyDestinations"))
local PLACE=Dest.Games["benar-salah"]
assert(type(PLACE)=="number" and PLACE>0,"BenarSalah place ID missing from LobbyDestinations")
local world=workspace:WaitForChild("BC_Lobby",30)
if not world then return end
local gate=world:WaitForChild("Gerbang_benar-salah",30)
if not gate then return end
local arch=gate:WaitForChild("Papan Nama",20)
if not arch then return end
local original=arch:FindFirstChild("InfoGame")
if original then original.Enabled=false end
local remote=Instance.new("RemoteEvent",RS)
remote.Name="BCBenarSalahPortal"
local prompt=Instance.new("ProximityPrompt",arch)
prompt.Name="MasukBenarSalah";prompt.ActionText="Masuk Arena"
prompt.ObjectText="Benar atau Salah";prompt.MaxActivationDistance=14
prompt.HoldDuration=.12;prompt.RequiresLineOfSight=false
local cooldown={}
prompt.Triggered:Connect(function(player)
 remote:FireClient(player,"open","Buktikan ketelitianmu! Pilih Benar atau Salah, raih bintang, dan buka 9 tingkat.")
end)
remote.OnServerEvent:Connect(function(player,action)
 if action~="enter" then return end
 local hrp=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
 local hum=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
 if not hrp or not hum or hum.Health<=0 or (hrp.Position-arch.Position).Magnitude>23 then
  remote:FireClient(player,"error","Dekati gerbang Benar atau Salah terlebih dahulu.")
  return
 end
 local now=os.clock()
 if now-(cooldown[player] or -100)<7 then return end
 cooldown[player]=now
 remote:FireClient(player,"loading","Membuka Arena Dua Pilihan...")
 local ok,err=pcall(function()
  TeleportService:TeleportAsync(PLACE,{player})
 end)
 if not ok then
  cooldown[player]=nil
  warn("[BC BenarSalah Portal] "..tostring(err))
  remote:FireClient(player,"error","Belum berhasil pindah arena. Silakan coba kembali.")
 end
end)
TeleportService.TeleportInitFailed:Connect(function(player,result,msg,placeId)
 if placeId~=PLACE or not player or not player.Parent then return end
 cooldown[player]=nil
 remote:FireClient(player,"error","Koneksi ke arena belum berhasil. Coba lagi.")
end)
Players.PlayerRemoving:Connect(function(p)cooldown[p]=nil end)
print("[BC BenarSalah Portal] Destination "..PLACE.." loaded")
