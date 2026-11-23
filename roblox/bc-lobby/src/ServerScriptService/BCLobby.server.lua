-- Lobby BahasaCerdas, langkah 1. All structures built server-side.
-- No TeleportService yet; displays showcase gates only until langkah 2.
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")
local catalog = require(ReplicatedStorage:WaitForChild("LobbyCatalog"))
local root = Workspace:FindFirstChild("BC_Lobby")
if root then root:Destroy() end
root=Instance.new("Folder")
root.Name="BC_Lobby"
root.Parent=Workspace
local remote=Instance.new("RemoteEvent")
remote.Name="LobbyAction"
remote.Parent=ReplicatedStorage
local remoteInfo=Instance.new("RemoteEvent")
remoteInfo.Name="LobbyInfo"
remoteInfo.Parent=ReplicatedStorage
local C={
 sky=Color3.fromRGB(145,216,255),grass=Color3.fromRGB(90,180,125),
 ivory=Color3.fromRGB(244,237,215),plaza=Color3.fromRGB(231,221,194),
 violet=Color3.fromRGB(107,78,198),pink=Color3.fromRGB(236,110,188),
 gold=Color3.fromRGB(255,201,95),teal=Color3.fromRGB(67,197,195),
 blue=Color3.fromRGB(56,142,232),brown=Color3.fromRGB(139,95,67),
 ink=Color3.fromRGB(34,36,75),
}
local function part(name,size,cf,color,material,parent)
 local p=Instance.new("Part")
 p.Name=name;p.Anchored=true;p.Size=size;p.CFrame=cf
 p.Color=color;p.Material=material or Enum.Material.SmoothPlastic
 p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth
 p.CastShadow=size.Magnitude>16
 p.Parent=parent or root
 return p
end
local function cyl(name,r,thick,at,color,material)
 local p=part(name,Vector3.new(thick,r*2,r*2),CFrame.new(at)*CFrame.Angles(0,0,math.pi/2),color,material)
 p.Shape=Enum.PartType.Cylinder
 return p
end
local function ball(name,diam,at,color)
 local p=part(name,Vector3.new(diam,diam,diam),CFrame.new(at),color,Enum.Material.SmoothPlastic)
 p.Shape=Enum.PartType.Ball
 return p
end
local function sign(adornee,title,subtitle,y)
 local gui=Instance.new("BillboardGui")
 gui.Name="Penanda";gui.Adornee=adornee;gui.Size=UDim2.fromOffset(230,75)
 gui.StudsOffsetWorldSpace=Vector3.new(0,y or 6,0)
 gui.AlwaysOnTop=false;gui.MaxDistance=40;gui.Parent=adornee
 local bg=Instance.new("Frame",gui)
 bg.Size=UDim2.fromScale(1,1);bg.BackgroundColor3=C.ink;bg.BackgroundTransparency=.08
 Instance.new("UICorner",bg).CornerRadius=UDim.new(0,13)
 local stroke=Instance.new("UIStroke",bg);stroke.Color=C.gold;stroke.Thickness=1.3
 local label=Instance.new("TextLabel",bg)
 label.Size=UDim2.new(1,-12,.54,0);label.Position=UDim2.fromOffset(6,5)
 label.BackgroundTransparency=1;label.Text=title;label.TextColor3=Color3.new(1,1,1)
 label.TextScaled=true;label.Font=Enum.Font.GothamBold
 local sub=Instance.new("TextLabel",bg)
 sub.Position=UDim2.new(0,7,.59,0);sub.Size=UDim2.new(1,-14,.32,0)
 sub.BackgroundTransparency=1;sub.Text=subtitle;sub.TextColor3=C.gold
 sub.TextScaled=true;sub.Font=Enum.Font.GothamMedium
end
Lighting.ClockTime=13.5;Lighting.Brightness=2.2
Lighting.OutdoorAmbient=Color3.fromRGB(175,194,215)
Lighting.Ambient=Color3.fromRGB(145,145,173)
Lighting.FogStart=180;Lighting.FogEnd=450;Lighting.FogColor=C.sky
local atmosphere=Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere",Lighting)
atmosphere.Density=.18;atmosphere.Haze=.45;atmosphere.Color=Color3.fromRGB(210,233,255)
local ground=part("Taman Kota",Vector3.new(225,2,225),CFrame.new(0,-1,0),C.grass,Enum.Material.Grass)
ground.Locked=true
cyl("Plaza Belajar",30,1.2,Vector3.new(0,.24,0),C.plaza,Enum.Material.Concrete)
cyl("Cincin Plaza",25,.13,Vector3.new(0,.91,0),C.gold,Enum.Material.SmoothPlastic)
cyl("Lantai Tengah",23,.18,Vector3.new(0,1,0),C.ivory,Enum.Material.Concrete)
-- Spawn at center facing welcome structure.
local spawn=Instance.new("SpawnLocation")
spawn.Name="LobbySpawn";spawn.Size=Vector3.new(11,1,11)
spawn.CFrame=CFrame.new(0,1.8,12);spawn.Anchored=true
spawn.Neutral=true;spawn.CanCollide=true;spawn.Transparency=.7
spawn.Color=C.teal;spawn.Material=Enum.Material.SmoothPlastic
spawn.Duration=0;spawn.Parent=root
-- Center statue is a sculptural open book (lightweight, 3D primitives).
cyl("Panggung Buku",7,1.1,Vector3.new(0,1.5,-10),C.violet,Enum.Material.Marble)
part("Punggung Buku",Vector3.new(1.2,3.3,9.5),CFrame.new(0,6.2,-10),C.gold,Enum.Material.SmoothPlastic)
local l=part("Halaman Buku Kiri",Vector3.new(10,1.2,8),CFrame.new(-4.8,6.4,-10)*CFrame.Angles(0,0,math.rad(-18)),C.ivory,Enum.Material.SmoothPlastic)
local r=part("Halaman Buku Kanan",Vector3.new(10,1.2,8),CFrame.new(4.8,6.4,-10)*CFrame.Angles(0,0,math.rad(18)),C.ivory,Enum.Material.SmoothPlastic)
l.CastShadow=false;r.CastShadow=false
local titleBase=part("Tugu BahasaCerdas",Vector3.new(25,7,2),CFrame.new(0,7,-25),C.violet,Enum.Material.SmoothPlastic)
sign(titleBase,"BAHASACERDAS","SELAMAT DATANG DI KOTA BELAJAR",6)
-- Four quiet reading shelters.
local function house(x,z,paint)
 local m=Instance.new("Model",root);m.Name="Rumah Baca"
 local wall=part("Ruang Baca",Vector3.new(15,10,12),CFrame.new(x,5,z),C.ivory,Enum.Material.WoodPlanks,m)
 local roof=part("Atap Nusantara",Vector3.new(19,2,15),CFrame.new(x,11,z),paint,Enum.Material.WoodPlanks,m)
 roof.CFrame=CFrame.new(x,11,z)*CFrame.Angles(0,0,math.rad(4))
 part("Pintu",Vector3.new(5,6,.3),CFrame.new(x,3.1,z-6.15),C.brown,Enum.Material.Wood,m)
 for _,offset in ipairs({-5,5}) do
  part("Jendela",Vector3.new(3.1,3,.35),CFrame.new(x+offset,6,z-6.25),C.blue,Enum.Material.Glass,m)
 end
end
house(-94,-35,C.teal);house(94,-35,C.pink)
house(-94,37,C.gold);house(94,37,C.violet)
-- Performance minded botanical dressing, fixed deterministic seed.
local rng=Random.new(16112026)
for i=1,38 do
 local side=i%4
 local x=(side<2 and -1 or 1)*rng:NextNumber(70,105)
 local z=rng:NextNumber(-100,100)
 if i%3==0 then x=rng:NextNumber(-100,100);z=(i%2==0 and 1 or -1)*rng:NextNumber(93,106) end
 if (Vector2.new(x,z)).Magnitude>71 then
  local h=rng:NextNumber(6,10)
  part("Batang",Vector3.new(1.5,h,1.5),CFrame.new(x,h/2,z),C.brown,Enum.Material.Wood)
  ball("Tajuk",rng:NextNumber(6,10),Vector3.new(x,h+2,z),Color3.fromRGB(51,rng:NextInteger(132,181),125))
 end
end
local colorByCategory={
 Kata=C.teal,Literasi=C.blue,["Cepat"]=C.gold,Tantangan=C.violet,Kompetitif=C.pink,
}
local ringRadius=78
local positions={}
for i,gameDef in ipairs(catalog) do
 local theta=2*math.pi*(i-1)/#catalog-math.pi/2
 local x=math.sin(theta)*ringRadius
 local z=math.cos(theta)*ringRadius
 local point=Vector3.new(x,0,z)
 positions[gameDef.id]={x=x,z=z}
 local toward=Vector3.new(x,0,z).Unit
 local from=Vector3.new(toward.X*24,.17,toward.Z*24)
 local to=Vector3.new(x,.17,z)
 local mid=(from+to)/2
 local path=part("Jalur "..gameDef.name,Vector3.new(8,.18,(to-from).Magnitude),CFrame.lookAt(mid,to),C.ivory,Enum.Material.Cobblestone)
 path.CastShadow=false
 cyl("Pijakan Gerbang",9,.35,Vector3.new(x,.17,z),C.plaza,Enum.Material.Concrete)
 local color=colorByCategory[gameDef.category] or C.violet
 local gate=Instance.new("Model",root);gate.Name="Gerbang_"..gameDef.id
 local heading=CFrame.lookAt(Vector3.new(x,0,z),Vector3.new(0,0,0))
 local col=Vector3.new(heading.RightVector.X,0,heading.RightVector.Z)
 for _,k in ipairs({-1,1}) do
  local pos=Vector3.new(x,0,z)+col*(k*5)
  part("Tiang",Vector3.new(2.3,12,2.3),CFrame.new(pos.X,6.6,pos.Z),color,Enum.Material.SmoothPlastic,gate)
 end
 local arch=part("Papan Nama",Vector3.new(13,3,3),CFrame.new(x,13,z),color,Enum.Material.SmoothPlastic,gate)
 sign(arch,gameDef.name,gameDef.unpublished and "BELUM DITERBITKAN" or "SEGERA HADIR",5.2)
 local tile=part("Segel Gerbang",Vector3.new(8,7,1.2),CFrame.new(x,5,z)*CFrame.Angles(0,theta,0),C.ink,Enum.Material.SmoothPlastic,gate)
 tile.Transparency=.28;tile.CanCollide=false
 local prompt=Instance.new("ProximityPrompt",arch)
 prompt.Name="InfoGame";prompt.ActionText="Lihat informasi";prompt.ObjectText=gameDef.name
 prompt.HoldDuration=.1;prompt.MaxActivationDistance=14
 prompt.RequiresLineOfSight=false
 prompt.Triggered:Connect(function(player)
  remoteInfo:FireClient(player,{id=gameDef.id,name=gameDef.name,description=gameDef.description,
   category=gameDef.category,level=gameDef.level,players=gameDef.players,available=false})
 end)
end
local returnCooldown={}
remote.OnServerEvent:Connect(function(player,action)
 if action~="returnLobby" then return end
 local now=os.clock()
 if returnCooldown[player] and now-returnCooldown[player]<2 then return end
 returnCooldown[player]=now
 local char=player.Character;local hrp=char and char:FindFirstChild("HumanoidRootPart")
 if hrp then
  hrp.AssemblyLinearVelocity=Vector3.zero
  hrp.CFrame=CFrame.lookAt(Vector3.new(0,6,14),Vector3.new(0,6,-10))
 end
end)
Players.PlayerRemoving:Connect(function(p) returnCooldown[p]=nil end)
print("[BC Lobby] Step 1 ready, gates="..#catalog..", teleport=disabled")
