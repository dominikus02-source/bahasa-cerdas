-- Gerbang NUSANTARA: Kebangkitan Bahasa, linking the existing published BC experience.
-- TeleportAsync requires published source and Roblox client; Studio Play Solo cannot execute teleports.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local TeleportService=game:GetService("TeleportService")
local world=workspace:WaitForChild("BC_Lobby",30)
if not world then return end

local destinations=require(RS:WaitForChild("LobbyDestinations"))
local TARGET_PLACE_ID=destinations.Nusantara.placeId -- Verified published place owned by BahasaCerdas.
local root=Instance.new("Model")
root.Name="Gerbang_NUSANTARA"
root.Parent=world
local remote=Instance.new("RemoteEvent")
remote.Name="NusantaraPortalEvent"
remote.Parent=RS
local navy=Color3.fromRGB(17,28,58)
local violet=Color3.fromRGB(124,58,237)
local pink=Color3.fromRGB(236,72,153)
local gold=Color3.fromRGB(251,191,36)
local blue=Color3.fromRGB(37,99,235)
local function block(name,size,cf,color,material)
 local p=Instance.new("Part",root)
 p.Name=name;p.Anchored=true;p.CanCollide=false;p.CastShadow=false
 p.Size=size;p.CFrame=cf;p.Color=color;p.Material=material or Enum.Material.SmoothPlastic
 return p
end
local x,z=27,28
local deck=block("Pijakan",Vector3.new(18,.5,15),CFrame.new(x,1.8,z),navy)
deck.CanCollide=true
local left=block("Pilar Kiri",Vector3.new(3,15,3),CFrame.new(x-6.8,9,z),violet)
local right=block("Pilar Kanan",Vector3.new(3,15,3),CFrame.new(x+6.8,9,z),blue)
local arch=block("Lengkung Aksara",Vector3.new(16,3,3),CFrame.new(x,16,z),pink)
local portal=block("Cahaya Gerbang",Vector3.new(10,12,.8),CFrame.new(x,8.3,z),violet,Enum.Material.Neon)
portal.Transparency=.47;portal.CanCollide=false
local outline=block("Kilau Portal",Vector3.new(12,.6,1.2),CFrame.new(x,3.4,z),gold,Enum.Material.Neon)
outline.Transparency=.2
local sign=Instance.new("BillboardGui",arch)
sign.Name="NusantaraTitle";sign.Size=UDim2.fromOffset(270,75)
sign.StudsOffsetWorldSpace=Vector3.new(0,5,0)
sign.MaxDistance=68;sign.AlwaysOnTop=false
local frame=Instance.new("Frame",sign);frame.Size=UDim2.fromScale(1,1);frame.BackgroundColor3=navy
Instance.new("UICorner",frame).CornerRadius=UDim.new(0,14)
local title=Instance.new("TextLabel",frame)
title.Size=UDim2.new(1,-14,.60,0);title.Position=UDim2.fromOffset(7,4)
title.BackgroundTransparency=1;title.Font=Enum.Font.GothamBold;title.TextScaled=true
title.TextColor3=gold;title.Text="NUSANTARA"
local subtitle=Instance.new("TextLabel",frame)
subtitle.Size=UDim2.new(1,-14,.33,0);subtitle.Position=UDim2.new(0,7,.62,0)
subtitle.BackgroundTransparency=1;subtitle.Font=Enum.Font.GothamMedium;subtitle.TextScaled=true
subtitle.TextColor3=Color3.new(1,1,1);subtitle.Text="KEBANGKITAN BAHASA"
local prompt=Instance.new("ProximityPrompt",arch)
prompt.ActionText="Jelajahi NUSANTARA"
prompt.ObjectText="Gerbang Petualangan"
prompt.HoldDuration=.2;prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false
prompt.Triggered:Connect(function(player)
 remote:FireClient(player,"open",{title="NUSANTARA: Kebangkitan Bahasa",
  description="Jelajahi dunia Bahasa Indonesia, temui tokoh, selesaikan kuis, dan kuasai jurus kata.",
  placeId=TARGET_PLACE_ID})
end)
local cooldown={}
local function validNear(player)
 local ch=player.Character
 local human=ch and ch:FindFirstChildOfClass("Humanoid")
 local hrp=ch and ch:FindFirstChild("HumanoidRootPart")
 return human and human.Health>0 and hrp and (hrp.Position-arch.Position).Magnitude<=22
end
remote.OnServerEvent:Connect(function(player,action)
 if action~="enter" then return end
 if not validNear(player) then
  remote:FireClient(player,"error","Dekati Gerbang NUSANTARA terlebih dahulu.")
  return
 end
 local now=os.clock()
 if now-(cooldown[player] or -100)<8 then return end
 cooldown[player]=now
 if game:GetService("RunService"):IsStudio() then
  remote:FireClient(player,"error","Pindah dunia tidak dapat diuji melalui Play Solo. Terbitkan lobby, lalu uji lewat aplikasi Roblox.")
  return
 end
 remote:FireClient(player,"loading","Menghubungkan ke NUSANTARA...")
 local ok,err=pcall(function()
  TeleportService:TeleportAsync(TARGET_PLACE_ID,{player})
 end)
 if not ok then
  warn("[NusantaraPortal] TeleportAsync failed for",player.UserId,err)
  remote:FireClient(player,"error","Belum berhasil masuk ke NUSANTARA. Coba lagi atau periksa akses kedua game.")
 end
end)
TeleportService.TeleportInitFailed:Connect(function(player,teleportResult,errorMessage,placeId)
 if placeId==TARGET_PLACE_ID and player and player.Parent then
  remote:FireClient(player,"error","Perjalanan ke NUSANTARA gagal. Silakan coba lagi.")
 end
end)
Players.PlayerRemoving:Connect(function(player)cooldown[player]=nil end)
print("[BC Portal] Nusantara destination verified; place="..TARGET_PLACE_ID)
