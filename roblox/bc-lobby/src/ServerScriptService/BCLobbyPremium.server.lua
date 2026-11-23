-- Premium environment layer. Runs alongside the Stage 1 lobby generator.
-- Decorative geometry only; original spawn, prompts, and return-to-plaza remain intact.
local W=game:GetService("Workspace")
local L=game:GetService("Lighting")
local R=game:GetService("ReplicatedStorage")
local catalog=require(R:WaitForChild("LobbyCatalog"))
local root=W:WaitForChild("BC_Lobby")
local park=Instance.new("Folder")
park.Name="PremiumEnvironment"
park.Parent=root
local navy=Color3.fromRGB(23,45,83)
local cream=Color3.fromRGB(249,245,228)
local gold=Color3.fromRGB(237,189,102)
local teal=Color3.fromRGB(35,181,181)
local function block(name,size,cf,color,material,parent)
 local p=Instance.new("Part")
 p.Name=name;p.Size=size;p.CFrame=cf;p.Anchored=true
 p.Color=color;p.Material=material or Enum.Material.SmoothPlastic
 p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth
 p.Parent=parent or park
 return p
end
local function orb(name,size,pos,color,material)
 local p=block(name,Vector3.new(size,size,size),CFrame.new(pos),color,material)
 p.Shape=Enum.PartType.Ball;p.CanCollide=false
 return p
end
local function light(p,color,brightness,range)
 local l=Instance.new("PointLight")
 l.Color=color;l.Brightness=brightness;l.Range=range;l.Shadows=false;l.Parent=p
end
-- Discreet plaza edging and concentric stonework.
for _,radius in ipairs({34,40,48}) do
 for k=1,48 do
  local a=2*math.pi*k/48
  local x,z=math.cos(a)*radius,math.sin(a)*radius
  local tile=block("Lingkar Batu",Vector3.new(5,.22,2.2),CFrame.new(x,.11,z)*CFrame.Angles(0,-a,0),radius==40 and navy or cream,Enum.Material.Marble)
  tile.CanCollide=false
 end
end
-- Landmark: a light crown and suspended learning symbols above the existing book statue.
local crown=block("Mahkota Aksara",Vector3.new(16,.65,16),CFrame.new(0,16,-10),navy,Enum.Material.Metal)
crown.Shape=Enum.PartType.Cylinder
crown.CFrame=CFrame.new(0,16,-10)*CFrame.Angles(0,0,math.pi/2)
crown.CanCollide=false
for i=1,8 do
 local a=i*2*math.pi/8
 local x,z=math.cos(a)*7, -10+math.sin(a)*7
 local star=orb("Aksara Cahaya",1.45,Vector3.new(x,17.5,z),gold,Enum.Material.Neon)
 light(star,gold,.3,12)
end
-- Lanterns on the outer approach, low light intensity for mobile performance.
for i=1,26 do
 local a=2*math.pi*(i-.5)/26
 local x,z=math.sin(a)*57,math.cos(a)*57
 block("Tiang Lentera",Vector3.new(.8,8,.8),CFrame.new(x,4,z),navy,Enum.Material.Metal)
 local lamp=orb("Lampu Taman",1.55,Vector3.new(x,8.6,z),gold,Enum.Material.Neon)
 light(lamp,gold,.45,17)
end
-- Dress all 13 existing gates without changing their interaction wiring.
for i,entry in ipairs(catalog) do
 local gate=root:WaitForChild("Gerbang_"..entry.id,30)
 if gate then
  local arch=gate:FindFirstChild("Papan Nama")
  if arch then
   local at=arch.Position
   local t=2*math.pi*(i-1)/#catalog-math.pi/2
   local center=Vector3.new(at.X,0,at.Z)
   local forward=Vector3.new(-center.X,0,-center.Z).Unit
   local right=Vector3.new(-forward.Z,0,forward.X)
   local accent= i%3==0 and gold or (i%3==1 and teal or Color3.fromRGB(121,133,234))
   local floor=block("Podium Gerbang "..entry.name,Vector3.new(15,.24,8),CFrame.lookAt(center+Vector3.new(0,.5,0),center+forward),navy,Enum.Material.Slate)
   floor.CanCollide=false
   for _,side in ipairs({-1,1}) do
    local p=center+right*(side*5)
    local trim=block("Sorot Gerbang",Vector3.new(.34,10,.35),CFrame.new(p.X,7,p.Z),accent,Enum.Material.Neon)
    trim.CanCollide=false
    local fin=orb("Mercusuar Portal",1.8,Vector3.new(p.X,13.6,p.Z),accent,Enum.Material.Neon)
    light(fin,accent,.65,13)
   end
   local cap=block("Bingkai Emas",Vector3.new(14.5,.46,3.2),arch.CFrame*CFrame.new(0,1.75,0),gold,Enum.Material.Metal)
   cap.CanCollide=false
   -- Keep gates readable from the plaza, and never suggest an unavailable game is playable.
   local indicator=block("Indikator Gerbang",Vector3.new(3.8,.3,1),CFrame.new(at.X,10.3,at.Z),entry.unpublished and Color3.fromRGB(140,145,162) or accent,Enum.Material.Neon)
   indicator.CanCollide=false
  end
 end
end
-- Cinematic but clear daytime, no flashing lights and no third-party assets.
L.ClockTime=10.8
L.Brightness=2.7
L.EnvironmentDiffuseScale=.55
L.EnvironmentSpecularScale=.35
L.Ambient=Color3.fromRGB(133,158,191)
L.OutdoorAmbient=Color3.fromRGB(184,206,222)
local bloom=L:FindFirstChild("BCSoftBloom") or Instance.new("BloomEffect")
bloom.Name="BCSoftBloom";bloom.Intensity=.12;bloom.Size=17;bloom.Threshold=1.8;bloom.Parent=L
local grading=L:FindFirstChild("BCColorGrade") or Instance.new("ColorCorrectionEffect")
grading.Name="BCColorGrade";grading.Brightness=.025;grading.Contrast=.08;grading.Saturation=.06;grading.Parent=L
print("[BC Lobby Premium] Environment prepared for "..#catalog.." gates")
