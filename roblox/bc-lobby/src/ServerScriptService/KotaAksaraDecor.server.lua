-- Kota Aksara Langit: visual expansion for BC Lobby Stage 1.
-- No unlicensed assets. Deterministic low-poly geometry; no teleport or score modification.
local Workspace=game:GetService("Workspace")
local Lighting=game:GetService("Lighting")
local TweenService=game:GetService("TweenService")
local Debris=game:GetService("Debris")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local root=Workspace:WaitForChild("BC_Lobby",30)
if not root then warn("[KotaAksara] BC_Lobby unavailable") return end
local existing=root:FindFirstChild("KotaAksaraDecor")
if existing then existing:Destroy() end
local deco=Instance.new("Folder");deco.Name="KotaAksaraDecor";deco.Parent=root
local P={
 violet=Color3.fromRGB(124,58,237), blue=Color3.fromRGB(37,99,235),
 pink=Color3.fromRGB(236,72,153), navy=Color3.fromRGB(17,28,58),
 cream=Color3.fromRGB(251,245,231), gold=Color3.fromRGB(251,191,36),
 cloud=Color3.fromRGB(235,246,255), mint=Color3.fromRGB(70,211,180),
 green=Color3.fromRGB(76,187,134), stone=Color3.fromRGB(132,98,183),
}
local rng=Random.new(20261123)
local function part(name,size,cf,color,material,transparency,parent)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.CanCollide=false
 x.CastShadow=false;x.Size=size;x.CFrame=cf;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 x.Transparency=transparency or 0;x.TopSurface=Enum.SurfaceType.Smooth;x.BottomSurface=Enum.SurfaceType.Smooth
 x.Parent=parent or deco;return x
end
local function ball(name,r,at,color,transparency)
 local x=part(name,Vector3.new(r*2,r*2,r*2),CFrame.new(at),color,Enum.Material.SmoothPlastic,transparency)
 x.Shape=Enum.PartType.Ball;return x
end
local function cyl(name,diam,depth,at,color,material)
 local x=part(name,Vector3.new(depth,diam,diam),CFrame.new(at)*CFrame.Angles(0,0,math.pi/2),color,material)
 x.Shape=Enum.PartType.Cylinder;return x
end
local function text3d(parent,message,offset,width,height,background)
 local gui=Instance.new("BillboardGui");gui.Name="FloatingTitle"
 gui.Size=UDim2.fromOffset(width or 200,height or 48)
 gui.StudsOffsetWorldSpace=offset;gui.AlwaysOnTop=false;gui.MaxDistance=90
 gui.Parent=parent
 local frame=Instance.new("Frame");frame.Size=UDim2.fromScale(1,1)
 frame.BackgroundColor3=background or P.navy;frame.BackgroundTransparency=.05;frame.Parent=gui
 Instance.new("UICorner",frame).CornerRadius=UDim.new(0,15)
 local stroke=Instance.new("UIStroke",frame);stroke.Thickness=2;stroke.Color=P.gold
 local label=Instance.new("TextLabel",frame)
 label.Size=UDim2.new(1,-16,1,-8);label.Position=UDim2.fromOffset(8,4)
 label.BackgroundTransparency=1;label.Text=message;label.TextScaled=true
 label.TextWrapped=true;label.TextColor3=P.cream;label.Font=Enum.Font.GothamBold
end
-- Converting the flat square into an elevated circular sky island keeps every gate accessible.
local ground=root:FindFirstChild("Taman Kota")
if ground and ground:IsA("Part") then
 ground.Shape=Enum.PartType.Cylinder
 ground.Size=Vector3.new(8,225,225)
 ground.CFrame=CFrame.new(0,-4,0)*CFrame.Angles(0,0,math.pi/2)
 ground.Material=Enum.Material.Grass
 ground.Color=P.green
 ground.CanCollide=true
 ground.CastShadow=true
end
cyl("Lapisan Awan Pulau",222,5,Vector3.new(0,-9,0),P.cream)
cyl("Batuan Pulau Terapung",195,17,Vector3.new(0,-20,0),P.stone,Enum.Material.Slate)
cyl("Batuan Dasar Pulau",148,10,Vector3.new(0,-33,0),Color3.fromRGB(102,78,159),Enum.Material.Slate)
-- Ambient clouds: noninteractive, restrained quantities, no physics.
for i=1,29 do
 local a=2*math.pi*i/29
 local radius=rng:NextNumber(116,155)
 local pos=Vector3.new(math.sin(a)*radius,rng:NextNumber(-21,-3),math.cos(a)*radius)
 ball("Gumpalan Awan",rng:NextNumber(7,15),pos,P.cloud,.13)
end
-- Decorative archways and light-lined path edges.
for i=1,13 do
 local a=2*math.pi*(i-1)/13-math.pi/2
 local dx,dz=math.sin(a),math.cos(a)
 local color=({P.violet,P.blue,P.pink,P.mint,P.gold})[(i-1)%5+1]
 for n=1,5 do
  local rad=31+n*8
  local x,z=dx*rad,dz*rad
  ball("Lampu Jalur",.6,Vector3.new(x,2.1,z),color,.03)
 end
end
local function slimTower(x,z,h,c,name)
 local stem=part(name.." Menara",Vector3.new(7,h,7),CFrame.new(x,h/2,z),c,Enum.Material.SmoothPlastic)
 stem.CanCollide=true
 local dome=ball("Kubah "..name,5.1,Vector3.new(x,h+2,z),P.gold)
 ball("Puncak "..name,1.7,Vector3.new(x,h+7,z),P.pink)
 return stem
end
-- Pen-tower skyline behind the big welcome board.
slimTower(0,-43,33,P.blue,"Pena")
part("Ujung Pena",Vector3.new(3,9,3),CFrame.new(0,40,-43),P.gold,Enum.Material.Metal)
slimTower(-31,-54,20,P.pink,"Aksara")
slimTower(34,-54,24,P.violet,"Buku")
-- Magical library landmark on the east side, close to outer circular walking edge.
local library=Instance.new("Model");library.Name="Perpustakaan Ajaib";library.Parent=deco
local base=part("Balai Buku",Vector3.new(25,15,18),CFrame.new(71,8,-6),P.cream,Enum.Material.SmoothPlastic,0,library)
base.CanCollide=true
local roof=part("Atap Perpustakaan",Vector3.new(28,3,21),CFrame.new(71,17,-6),P.violet,Enum.Material.SmoothPlastic,0,library)
roof.CanCollide=true
for _,z in ipairs({-13,1}) do
 part("Pilar Perpustakaan",Vector3.new(3,17,3),CFrame.new(58,9,z),P.blue,Enum.Material.SmoothPlastic,0,library)
end
local librarySign=part("Papan Perpustakaan",Vector3.new(13,5,1),CFrame.new(58,13,-6),P.navy,Enum.Material.SmoothPlastic,0,library)
text3d(librarySign,"PERPUSTAKAAN AJAIB",Vector3.new(0,5,0),210,51,P.violet)
-- Floating books use small smooth models and deterministic low-amplitude floating tweens.
local floatItems={}
for i=1,13 do
 local a=i*math.pi*2/13
 local rr=(i%3==0) and 46 or 57
 local x,z=math.sin(a)*rr,math.cos(a)*rr
 local y=19+(i%5)*3
 local c=({P.violet,P.blue,P.pink,P.gold,P.mint})[(i-1)%5+1]
 local book=Instance.new("Model");book.Name="Buku Terbang";book.Parent=deco
 local cover=part("Sampul",Vector3.new(5,1.2,6.7),CFrame.new(x,y,z)*CFrame.Angles(0,a,math.rad(12)),c,Enum.Material.SmoothPlastic,0,book)
 part("Halaman",Vector3.new(4.5,.6,5.8),cover.CFrame*CFrame.new(0,.83,0),P.cream,Enum.Material.SmoothPlastic,0,book)
 local initial=book:GetPivot()
 table.insert(floatItems,{model=book,base=initial,phase=i*.45})
end
-- Letter-shaped silhouettes: derived from box shapes; no copyrighted typography assets.
for i=1,7 do
 local a=i*2*math.pi/7
 local x,z=math.sin(a)*65,math.cos(a)*65
 local c=({P.blue,P.violet,P.pink,P.mint})[(i-1)%4+1]
 local letter=Instance.new("Model");letter.Name="Huruf Melayang";letter.Parent=deco
 local main=part("Batang Huruf",Vector3.new(1.8,9,1.8),CFrame.new(x,24,z),c,Enum.Material.SmoothPlastic,0,letter)
 part("Palang Huruf",Vector3.new(5.5,1.7,2),CFrame.new(x+1.8,28,z),c,Enum.Material.SmoothPlastic,0,letter)
 local pivot=letter:GetPivot()
 table.insert(floatItems,{model=letter,base=pivot,phase=i*.67})
end
-- Fountain: calm cyan orb and water circles, not water mesh or intensive shaders.
cyl("Bundaran Air Mancur",16,1,Vector3.new(-22,1.8,1),P.blue,Enum.Material.SmoothPlastic)
ball("Inti Air Mancur",3,Vector3.new(-22,7,1),P.mint,.12)
for n=1,5 do
 local a=n*2*math.pi/5
 ball("Tetes Air",.9,Vector3.new(-22+math.cos(a)*5,4+math.sin(a*2),1+math.sin(a)*5),P.cloud,.15)
end
-- A safe photo spot, with minimal floating signs.
local spot=cyl("Panggung Foto BC",11,.7,Vector3.new(29,1.8,12),P.pink)
text3d(spot,"SPOT FOTO KOTA AKSARA",Vector3.new(0,5,0),240,48,P.navy)
for i=1,5 do
 local a=i*math.pi*2/5
 ball("Bintang Foto",1.1,Vector3.new(29+math.sin(a)*7,8,12+math.cos(a)*7),P.gold)
end
-- Lighting tuned for low-cost bright stylized mobile rendering.
Lighting.ClockTime=14.15;Lighting.Brightness=2.6
Lighting.EnvironmentDiffuseScale=.6
Lighting.EnvironmentSpecularScale=.45
Lighting.OutdoorAmbient=Color3.fromRGB(195,202,245)
Lighting.FogStart=180;Lighting.FogEnd=450
Lighting.FogColor=Color3.fromRGB(178,221,255)
local cc=Lighting:FindFirstChild("KotaAksaraColor") or Instance.new("ColorCorrectionEffect")
cc.Name="KotaAksaraColor";cc.Brightness=.025;cc.Contrast=.07;cc.Saturation=.13
cc.TintColor=Color3.fromRGB(255,247,242);cc.Parent=Lighting
local bloom=Lighting:FindFirstChild("KotaAksaraBloom") or Instance.new("BloomEffect")
bloom.Name="KotaAksaraBloom";bloom.Intensity=.15;bloom.Size=15;bloom.Threshold=1.6;bloom.Parent=Lighting
-- Avoid permanent loops of costly TweenServices; low-frequency PivotTo updates.
task.spawn(function()
 local t=0
 while root.Parent do
  task.wait(.13);t+=.13
  for _,item in ipairs(floatItems) do
   if item.model.Parent then
    local sway=math.sin(t*1.05+item.phase)*.72
    item.model:PivotTo(item.base*CFrame.new(0,sway,0)*CFrame.Angles(0,math.sin(t*.25+item.phase)*.065,0))
   end
  end
 end
end)
print("[KotaAksara] Floating island decor ready, books=13, letters=7")
