-- Natural World visual pass • Kota Aksara Langit
-- Additive and reversible. Does not change gameplay, teleport IDs, or player data.
local Lighting=game:GetService("Lighting")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local Theme=require(ReplicatedStorage:WaitForChild("NaturalTheme"))
local C=Theme.Color
local world=workspace:WaitForChild("BC_Lobby",30)
if not world then warn("[NaturalWorld] BC_Lobby missing");return end
local decor=world:WaitForChild("KotaAksaraDecor",30)
if not decor then warn("[NaturalWorld] Sky decor missing");return end
if not world:WaitForChild("BCLobbyReady",30) or not world:WaitForChild("KotaDecorReady",30) then
 warn("[NaturalWorld] World construction did not finish");return
end
local previous=world:FindFirstChild("NaturalWorld")
if previous then previous:Destroy() end
local natural=Instance.new("Folder")
natural.Name="NaturalWorld";natural.Parent=world
local rng=Random.new(20261123)
local function block(name,sz,cf,color,material,parent,collide)
 local p=Instance.new("Part")
 p.Name=name;p.Size=sz;p.CFrame=cf
 p.Color=color;p.Material=material or Enum.Material.SmoothPlastic
 p.Anchored=true;p.CanCollide=collide==true
 p.CastShadow=collide==true
 p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth
 p.Parent=parent or natural
 return p
end
local function sphere(name,diam,pos,color,parent)
 local p=block(name,Vector3.new(diam,diam,diam),CFrame.new(pos),color,Enum.Material.SmoothPlastic,parent,false)
 p.Shape=Enum.PartType.Ball
 return p
end
local function cylinder(name,diam,height,pos,color,parent)
 local p=block(name,Vector3.new(height,diam,diam),CFrame.new(pos)*CFrame.Angles(0,0,math.pi/2),
  color,Enum.Material.SmoothPlastic,parent,false)
 p.Shape=Enum.PartType.Cylinder
 return p
end
local function paint(target,color,material)
 if target and target:IsA("BasePart") then
  target.Color=color
  if material then target.Material=material end
 end
end
-- 1. Harmonize the older brightly colored pieces into a coherent natural palette.
paint(world:FindFirstChild("Taman Kota"),C.Leaf,Enum.Material.Grass)
paint(world:FindFirstChild("Plaza Belajar"),C.StoneLight,Enum.Material.Concrete)
paint(world:FindFirstChild("Lantai Tengah"),C.Ivory,Enum.Material.Concrete)
paint(world:FindFirstChild("Cincin Plaza"),C.Copper)
paint(world:FindFirstChild("Panggung Buku"),C.Stone,Enum.Material.Marble)
paint(world:FindFirstChild("Punggung Buku"),C.Copper)
paint(world:FindFirstChild("Tugu BahasaCerdas"),C.Ink)
paint(world:FindFirstChild("LobbySpawn"),C.LeafLight)
for _,instance in ipairs(world:GetChildren()) do
 if instance.Name=="Rumah Baca" and instance:IsA("Model") then
  for _,p in ipairs(instance:GetDescendants()) do
   if p:IsA("BasePart") then
    if p.Name=="Ruang Baca" then paint(p,C.Ivory,Enum.Material.WoodPlanks)
    elseif p.Name=="Atap Nusantara" then paint(p,C.WoodDark,Enum.Material.WoodPlanks)
    elseif p.Name=="Pintu" then paint(p,C.Wood)
    elseif p.Name=="Jendela" then paint(p,C.Water,Enum.Material.Glass) end
   end
  end
 elseif instance.Name:sub(1,8)=="Gerbang_" and instance:IsA("Model") then
  local key=instance.Name:sub(9)
  local catalog=require(ReplicatedStorage:WaitForChild("LobbyCatalog"))
  for _,entry in ipairs(catalog) do
   if entry.id==key then
    local accent=Theme.Category[entry.category] or C.BrandSoft
    for _,piece in ipairs(instance:GetDescendants()) do
     if piece:IsA("BasePart") then
      if piece.Name=="Tiang" then
       paint(piece,C.StoneLight,Enum.Material.Slate)
      elseif piece.Name=="Papan Nama" then
       paint(piece,accent,Enum.Material.SmoothPlastic)
      elseif piece.Name=="Segel Gerbang" then
       paint(piece,C.WoodDark,Enum.Material.WoodPlanks)
      end
     end
    end
    break
   end
  end
 end
end
for _,p in ipairs(decor:GetDescendants()) do
 if p:IsA("BasePart") then
  if p.Name=="Lapisan Awan Pulau" then paint(p,C.Sand)
  elseif p.Name=="Batuan Pulau Terapung" then paint(p,C.Stone,Enum.Material.Slate)
  elseif p.Name=="Batuan Dasar Pulau" then paint(p,C.Earth,Enum.Material.Slate)
  elseif p.Name=="Gumpalan Awan" then paint(p,C.SkyWarm)
  elseif p.Name=="Atap Perpustakaan" then paint(p,C.WoodDark,Enum.Material.WoodPlanks)
  elseif p.Name=="Balai Buku" then paint(p,C.Ivory)
  elseif p.Name=="Pilar Perpustakaan" then paint(p,C.StoneLight,Enum.Material.Marble)
  elseif p.Name=="Pena Menara" then paint(p,C.Wood)
  elseif p.Name=="Aksara Menara" then paint(p,C.Copper)
  elseif p.Name=="Buku Menara" then paint(p,C.BrandSoft)
  elseif p.Name=="Bundaran Air Mancur" then paint(p,C.Water)
  elseif p.Name=="Inti Air Mancur" then paint(p,C.Water)
  elseif p.Name=="Panggung Foto BC" then paint(p,C.StoneLight)
  elseif p.Name=="Lampu Jalur" then paint(p,C.Copper)
  elseif p.Name=="Sampul" then paint(p,C.BrandSoft)
  elseif p.Name=="Halaman" then paint(p,C.Ivory)
  end
 end
end
-- 2. Garden clusters between radial travel paths; clear of all portal routes.
-- Each cluster has 1 small broad-canopy tree, boulders, a flower patch, and a bench.
local clusterCount=10
for i=1,clusterCount do
 local angle=2*math.pi*(i-.5)/clusterCount - math.pi/2
 local radius=51
 local pos=Vector3.new(math.sin(angle)*radius,0,math.cos(angle)*radius)
 local model=Instance.new("Model")
 model.Name="Taman Sudut "..i
 model.Parent=natural
 local trunkHeight=6+rng:NextNumber(0,2)
 local trunk=block("Batang Pohon",Vector3.new(2,trunkHeight,2),
  CFrame.new(pos.X,trunkHeight/2+1,pos.Z),C.Wood,Enum.Material.Wood,model,true)
 trunk.CastShadow=false
 sphere("Daun Bawah",8,Vector3.new(pos.X,trunkHeight+2,pos.Z),C.LeafDark,model)
 sphere("Daun Atas",6.7,Vector3.new(pos.X+1,trunkHeight+5,pos.Z-1),C.Leaf,model)
 sphere("Daun Samping",5.1,Vector3.new(pos.X-2,trunkHeight+3,pos.Z+2),C.LeafLight,model)
 for j=1,3 do
  local a=j*math.pi*2/3
  local x=pos.X+math.cos(a)*5
  local z=pos.Z+math.sin(a)*5
  sphere("Batu Taman",1.8,Vector3.new(x,1.2,z),C.Stone,model)
 end
 for j=1,4 do
  local a=j*math.pi/2
  local x=pos.X+math.cos(a)*7
  local z=pos.Z+math.sin(a)*7
  sphere("Kelopak Bunga",.9,Vector3.new(x,2.0,z),
   j%2==0 and C.Lilac or C.Rose,model)
 end
 -- No free chat feature. Bench is only a physical place to rest and take photos.
 local offset=Vector3.new(-5,0,-5)
 block("Bangku Duduk",Vector3.new(6,.7,2),
  CFrame.new(pos+offset+Vector3.new(0,2,0)),C.Wood,Enum.Material.WoodPlanks,model,true)
 for _,dx in ipairs({-2,2}) do
  block("Kaki Bangku",Vector3.new(.5,1.8,.5),
   CFrame.new(pos+offset+Vector3.new(dx,.95,0)),C.WoodDark,Enum.Material.Wood,model,true)
 end
end
-- 3. Gentle horizon islands provide depth and a sense of a living world.
for i=1,7 do
 local a=i*2*math.pi/7
 local radius=150+(i%3)*11
 local x,z=math.sin(a)*radius,math.cos(a)*radius
 local d=17+(i%3)*4
 cylinder("Pulau Kejauhan",d,4,Vector3.new(x,-18,z),C.LeafDark)
 sphere("Gumpal Awan Jauh",d*.66,Vector3.new(x,-23,z),C.SkyWarm)
 local treeHeight=4+(i%3)
 block("Pohon Pulau Jauh",Vector3.new(1,treeHeight,1),
  CFrame.new(x,treeHeight/2-15,z),C.Wood,Enum.Material.Wood)
 sphere("Tajuk Pulau Jauh",5,Vector3.new(x,-12+treeHeight,z),C.Leaf)
end
-- 4. Soft atmospheric treatment. Bloom is an accent, not a global glow.
Lighting.ClockTime=14.4
Lighting.Brightness=2.05
Lighting.Ambient=Color3.fromRGB(151,165,177)
Lighting.OutdoorAmbient=Color3.fromRGB(197,209,209)
Lighting.EnvironmentDiffuseScale=.68
Lighting.EnvironmentSpecularScale=.28
Lighting.FogColor=C.Sky
Lighting.FogStart=175
Lighting.FogEnd=460
local atmosphere=Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
atmosphere.Density=Theme.Effects.AtmosphereDensity
atmosphere.Haze=Theme.Effects.AtmosphereHaze
atmosphere.Glare=.05
atmosphere.Color=C.SkyWarm
atmosphere.Decay=C.Sky
atmosphere.Parent=Lighting
local correction=Lighting:FindFirstChild("KotaAksaraColor") or Instance.new("ColorCorrectionEffect")
correction.Name="KotaAksaraColor"
correction.Brightness=0
correction.Contrast=Theme.Effects.Contrast
correction.Saturation=Theme.Effects.Saturation
correction.TintColor=Color3.fromRGB(255,249,239)
correction.Parent=Lighting
local bloom=Lighting:FindFirstChild("KotaAksaraBloom") or Instance.new("BloomEffect")
bloom.Name="KotaAksaraBloom"
bloom.Intensity=Theme.Effects.BloomIntensity
bloom.Size=Theme.Effects.BloomSize
bloom.Threshold=Theme.Effects.BloomThreshold
bloom.Parent=Lighting
print("[NaturalWorld] Nature pass ready; garden clusters="..clusterCount)
