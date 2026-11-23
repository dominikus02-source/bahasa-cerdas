-- Nusantara v0.2 | low-poly environment scenery, landmarks, and pathways
local world=workspace:WaitForChild("NusantaraWorld",30)
if not world then return end
local deco=Instance.new("Folder",world);deco.Name="Lingkungan"
local function block(name,sz,at,color,material,parent)
 local p=Instance.new("Part");p.Name=name;p.Anchored=true;p.Size=sz;p.Position=at
 p.Color=color;p.Material=material or Enum.Material.SmoothPlastic;p.Parent=parent or deco
 return p
end
local function ball(name,sz,at,color)
 local p=block(name,Vector3.new(sz,sz,sz),at,color,Enum.Material.Grass)
 p.Shape=Enum.PartType.Ball;return p
end
local function path(from,to,width)
 local a=Vector3.new(from.X,1.7,from.Z)
 local b=Vector3.new(to.X,1.7,to.Z)
 local diff=b-a
 local p=block("Jalan Batu",Vector3.new(width,.55,diff.Magnitude),a+diff/2,Color3.fromRGB(207,182,148),Enum.Material.Cobblestone)
 p.CFrame=CFrame.lookAt(a+diff/2,b)
end
local P={
 plaza=Vector3.new(0,0,12),hutan=Vector3.new(-6,0,-18),
 kanal=Vector3.new(0,0,-34),pustaka=Vector3.new(22,0,-46),
 majas=Vector3.new(42,0,-12),dermaga=Vector3.new(-44,0,10),
 kuil=Vector3.new(34,0,30),arena=Vector3.new(-20,0,-52)
}
for _,e in ipairs({{"plaza","hutan"},{"hutan","kanal"},{"kanal","pustaka"},{"plaza","majas"},{"plaza","dermaga"},{"plaza","kuil"},{"kanal","arena"}}) do
 path(P[e[1]],P[e[2]],4.4)
end
local function roof(name,x,y,z,w,d,c)
 local top=block(name,Vector3.new(w,1.5,d),Vector3.new(x,y,z),c,Enum.Material.WoodPlanks)
 top.CFrame=CFrame.new(x,y,z)
end
local function hut(x,z,size,roofColor)
 block("Rumah Nusantara",Vector3.new(size,7,size),Vector3.new(x,5,z),Color3.fromRGB(178,121,79),Enum.Material.Wood)
 roof("Atap Rumah",x,9,z,size+3,size+3,roofColor)
 block("Pintu Rumah",Vector3.new(3,4,.3),Vector3.new(x,3.6,z-size/2-.2),Color3.fromRGB(77,47,48),Enum.Material.Wood)
end
hut(-23,23,10,Color3.fromRGB(157,67,79))
hut(18,16,10,Color3.fromRGB(94,70,162))
hut(-26,-3,11,Color3.fromRGB(80,117,149))
-- Library silhouette (landmark referenced in HTML v9.3).
block("Gedung Perpustakaan",Vector3.new(19,13,13),Vector3.new(22,8,-47),Color3.fromRGB(145,107,148),Enum.Material.Brick)
roof("Atap Perpustakaan",22,15.2,-47,23,17,Color3.fromRGB(87,59,123))
for i=-1,1 do
 block("Pilar Perpustakaan",Vector3.new(1.6,12,1.6),Vector3.new(22+i*6,8,-39.8),Color3.fromRGB(223,205,180),Enum.Material.Marble)
end
-- Jembatan Aksara and water channel.
block("Kanal Air",Vector3.new(17,.2,20),Vector3.new(-2,1.5,-34),Color3.fromRGB(37,163,230),Enum.Material.Glass).Transparency=.3
local bridge=block("Jembatan Aksara",Vector3.new(5,1,19),Vector3.new(0,3,-34),Color3.fromRGB(174,118,71),Enum.Material.WoodPlanks)
for _,x in ipairs({-3,3}) do
 block("Pagar Jembatan",Vector3.new(.45,2,19),Vector3.new(x,4,-34),Color3.fromRGB(113,73,58),Enum.Material.Wood)
end
-- Giant language scroll landmark in plaza.
local scroll=block("Tugu Bahasa",Vector3.new(4,15,4),Vector3.new(8,10,10),Color3.fromRGB(251,203,119),Enum.Material.Marble)
block("Puncak Tugu",Vector3.new(8,2,8),Vector3.new(8,18,10),Color3.fromRGB(255,229,149),Enum.Material.Neon)
-- Fireflies and botanical composition.
local rng=Random.new(93)
for i=1,38 do
 local x=-6+rng:NextNumber(-21,21);local z=-18+rng:NextNumber(-20,20)
 if math.abs(x+6)>6 and (Vector2.new(x,z)-Vector2.new(-6,-18)).Magnitude<22 then
  local h=rng:NextNumber(6,10)
  block("Pohon Rimba",Vector3.new(1.7,h,1.7),Vector3.new(x,2+h/2,z),Color3.fromRGB(91,65,53),Enum.Material.Wood)
  ball("Kanopi Rimba",rng:NextNumber(6,10),Vector3.new(x,2+h+2,z),Color3.fromRGB(45,rng:NextInteger(110,170),105))
 end
end
for i=1,22 do
 local theta=i*math.pi*2/22
 local x=42+math.cos(theta)*14;local z=-12+math.sin(theta)*14
 local stem=block("Batang Bunga",Vector3.new(.5,2,.5),Vector3.new(x,3,z),Color3.fromRGB(82,176,104),Enum.Material.Grass)
 ball("Bunga Majas",2.2,Vector3.new(x,4.8,z),Color3.fromHSV(i/22,.63,1))
end
-- Temple perimeter
for i=1,8 do
 local a=i*math.pi/4
 local x=34+math.cos(a)*12;local z=30+math.sin(a)*12
 block("Pilar Kuil",Vector3.new(2.6,11,2.6),Vector3.new(x,7.5,z),Color3.fromRGB(207,166,110),Enum.Material.Sandstone)
end
block("Meja Kuil",Vector3.new(12,2,8),Vector3.new(34,3,30),Color3.fromRGB(218,175,113),Enum.Material.Sandstone)
-- Arena markings
local arena=block("Arena Batu",Vector3.new(32,.8,32),Vector3.new(-20,2,-52),Color3.fromRGB(95,69,117),Enum.Material.Slate)
arena.Shape=Enum.PartType.Cylinder;arena.Size=Vector3.new(.8,32,32)
arena.CFrame=CFrame.new(-20,2,-52)*CFrame.Angles(0,0,math.pi/2)
for i=1,10 do
 local a=i*2*math.pi/10;local x=-20+math.cos(a)*16;local z=-52+math.sin(a)*16
 block("Obor Arena",Vector3.new(1.5,7,1.5),Vector3.new(x,6,z),Color3.fromRGB(249,132,101),Enum.Material.Neon)
end
-- Lighting consistency; no fog thick enough to hide terrain.
local Lighting=game:GetService("Lighting")
Lighting.FogStart=85;Lighting.FogEnd=230
Lighting.FogColor=Color3.fromRGB(157,204,240)
