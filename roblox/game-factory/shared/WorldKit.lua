-- BahasaCerdas Roblox WorldKit v1. Designed for small/mobile Roblox experiences.
-- Scenic visuals only, no gameplay score or client authority.
local Lighting=game:GetService("Lighting")
local WorldKit={}
local PALETTE={
 Ink=Color3.fromRGB(29,45,55),Paper=Color3.fromRGB(250,246,232),
 Sand=Color3.fromRGB(226,206,170),Stone=Color3.fromRGB(183,175,159),
 Leaf=Color3.fromRGB(111,158,117),DeepLeaf=Color3.fromRGB(63,112,89),
 Sky=Color3.fromRGB(163,211,228),Water=Color3.fromRGB(113,183,192),
 Purple=Color3.fromRGB(129,102,186),Gold=Color3.fromRGB(232,178,97),
 Rose=Color3.fromRGB(215,151,148),Wood=Color3.fromRGB(144,110,82),
}
local THEMES={
 ["susun-kata"]={title="SUSUN KATA",tagline="Rakit huruf, temukan makna",accent="Gold",symbol="A"},
 ["tebak-kata"]={title="TEBAK KATA",tagline="Temukan kata dari petunjuk",accent="Purple",symbol="?"},
 ["menara"]={title="MENARA CERDAS",tagline="Jawaban benar, menara bertambah tinggi",accent="Gold",symbol="M"},
 ["irama-kata"]={title="IRAMA KATA",tagline="Empat jalur, satu irama bahasa",accent="Rose",symbol="4"},
 ["petualangan-kata"]={title="PETUALANGAN KATA",tagline="Tangkap kata sesuai kelompoknya",accent="DeepLeaf",symbol="P"},
 ["bermain-kata"]={title="BERMAIN KATA",tagline="Susun, rumpangkan, dan cocokkan",accent="Water",symbol="B"},
 ["teka-teki-silang"]={title="TEKA-TEKI SILANG",tagline="Susun jawaban pada kisi aksara",accent="DeepLeaf",symbol="T"},
 ["lari-kata"]={title="LARI KATA",tagline="Pilih jawaban sambil berlari",accent="Rose",symbol="L"},
 ["kuis-tempur"]={title="KUIS TEMPUR",tagline="Tantangan strategi dan pengetahuan",accent="Purple",symbol="K"},
 ["tantang"]={title="TANTANG TEMAN",tagline="Adu kepintaran bersama teman",accent="Water",symbol="2"},
 ["adu-cepat"]={title="ADU CEPAT",tagline="Jawab cepat dan teliti",accent="Rose",symbol="!"},
 ["rpg"]={title="PENDEKAR SURYAKERTA",tagline="Petualangan Nusantara",accent="Gold",symbol="N"},
 ["benar-salah"]={title="BENAR ATAU SALAH",tagline="Kuis cepat dan tepat",accent="DeepLeaf",symbol="B"}
}
local function part(parent,name,sz,cf,col,mat,collide)
 local p=Instance.new("Part")
 p.Name=name;p.Size=sz;p.CFrame=cf;p.Anchored=true
 p.Material=mat or Enum.Material.SmoothPlastic;p.Color=col
 p.CanCollide=collide==true;p.CastShadow=collide==true
 p.TopSurface=Enum.SurfaceType.Smooth
 p.BottomSurface=Enum.SurfaceType.Smooth
 p.Parent=parent
 return p
end
local function ball(parent,name,size,pos,color)
 local b=part(parent,name,size,CFrame.new(pos),color,Enum.Material.SmoothPlastic,false)
 b.Shape=Enum.PartType.Ball
 return b
end
local function textBoard(parent,name,at,words)
 local board=part(parent,name,Vector3.new(32,10,1),CFrame.new(at),PALETTE.Ink,nil,false)
 local gui=Instance.new("SurfaceGui")
 gui.Face=Enum.NormalId.Back;gui.SizingMode=Enum.SurfaceGuiSizingMode.PixelsPerStud
 gui.PixelsPerStud=32;gui.Adornee=board;gui.Parent=board
 local layout=Instance.new("Frame",gui);layout.Size=UDim2.fromScale(1,1)
 layout.BackgroundColor3=PALETTE.Ink
 Instance.new("UICorner",layout).CornerRadius=UDim.new(0,20)
 local a=Instance.new("TextLabel",layout)
 a.BackgroundTransparency=1;a.Size=UDim2.new(1,-32,.50,0)
 a.Position=UDim2.fromOffset(16,10)
 a.Font=Enum.Font.GothamBlack;a.TextScaled=true
 a.Text=words[1];a.TextColor3=PALETTE.Paper
 local b=Instance.new("TextLabel",layout)
 b.BackgroundTransparency=1;b.Size=UDim2.new(1,-28,.26,0)
 b.Position=UDim2.new(0,14,.65,0)
 b.Font=Enum.Font.GothamMedium;b.TextScaled=true;b.TextWrapped=true
 b.Text=words[2];b.TextColor3=PALETTE.Sand
 return board
end
function WorldKit.Build(gameId)
 local cfg=assert(THEMES[gameId],"Unknown BC game: "..tostring(gameId))
 local accent=PALETTE[cfg.accent]
 local existing=workspace:FindFirstChild("BC_GameWorld")
 if existing then existing:Destroy() end
 local model=Instance.new("Model")
 model.Name="BC_GameWorld";model.Parent=workspace
 -- Floating grass island, layered land and navigable center.
 part(model,"Pulau Bumi",Vector3.new(100,7,96),CFrame.new(0,-4,0),PALETTE.Stone,Enum.Material.Slate,true)
 part(model,"Rumput Pulau",Vector3.new(103,2.3,100),CFrame.new(0,.2,0),PALETTE.Leaf,Enum.Material.Grass,true)
 part(model,"Plaza Batu",Vector3.new(70,.8,62),CFrame.new(0,1.53,5),PALETTE.Sand,Enum.Material.Slate,true)
 part(model,"Gelang Arena",Vector3.new(54,.8,50),CFrame.new(0,2,2),PALETTE.Paper,Enum.Material.SmoothPlastic,true)
 part(model,"Panggung Huruf",Vector3.new(35,2,15),CFrame.new(0,2,-20),accent,Enum.Material.SmoothPlastic,true)
 part(model,"Tangga Panggung",Vector3.new(37,1,4),CFrame.new(0,1.95,-10.5),PALETTE.Stone,Enum.Material.Slate,true)
 for index=1,12 do
  local angle=(index-1)*math.pi/6
  local xx=math.cos(angle)*41
  local zz=math.sin(angle)*40
  local trunk=part(model,"Batang "..index,Vector3.new(1.4,7,1.4),
   CFrame.new(xx,5,zz),PALETTE.Wood,Enum.Material.Wood,false)
  trunk.CastShadow=false
  ball(model,"Mahkota Pohon "..index,Vector3.new(8,6,7),
   Vector3.new(xx,10,zz),index%3==0 and PALETTE.DeepLeaf or PALETTE.Leaf)
  ball(model,"Daun Muda "..index,Vector3.new(5,4,4),
   Vector3.new(xx+1.5,11.5,zz-.8),PALETTE.Paper:Lerp(PALETTE.Leaf,.65))
 end
 for j=1,8 do
  local a=j*math.pi/4
  local xx=math.cos(a)*27;local zz=math.sin(a)*24
  part(model,"Lampu Jalur "..j,Vector3.new(.7,2,.7),
   CFrame.new(xx,3.2,zz),PALETTE.Wood)
  ball(model,"Lentera "..j,Vector3.new(1.5,1.5,1.5),
   Vector3.new(xx,4.7,zz),PALETTE.Gold)
 end
 for j=1,6 do
  local x=(j-3.5)*6
  local book=Instance.new("Model",model)
  book.Name="Buku Langit "..j
  local y=15+(j%3)*1.8
  local z=-37
  part(book,"Sampul",Vector3.new(5,.5,7),
   CFrame.new(x,y,z)*CFrame.Angles(.2,j*.17,.11),
   j%2==0 and PALETTE.Purple or PALETTE.Rose)
  part(book,"Halaman",Vector3.new(4.5,.5,6.5),
   CFrame.new(x,y+.45,z)*CFrame.Angles(.2,j*.17,.11),PALETTE.Paper)
 end
 local spawn=Instance.new("SpawnLocation",model)
 spawn.Name="BC_Spawn";spawn.Anchored=true;spawn.Neutral=true
 spawn.Size=Vector3.new(12,1,12);spawn.CFrame=CFrame.new(0,3.3,19)
 spawn.Transparency=.66;spawn.Duration=0
 spawn.Material=Enum.Material.SmoothPlastic
 spawn.Color=accent
 textBoard(model,"Papan Nama Gim",Vector3.new(-12,13,-28),{cfg.title,cfg.tagline})
 local tag=Instance.new("StringValue",model)
 tag.Name="GameId";tag.Value=gameId
 Lighting.ClockTime=14.2
 Lighting.Brightness=2
 Lighting.Ambient=Color3.fromRGB(151,164,166)
 Lighting.OutdoorAmbient=Color3.fromRGB(186,204,202)
 local atmosphere=Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere",Lighting)
 atmosphere.Density=.18;atmosphere.Haze=.52
 atmosphere.Color=PALETTE.Sky;atmosphere.Decay=PALETTE.Paper
 local effect=Lighting:FindFirstChild("BC_GameColor") or Instance.new("ColorCorrectionEffect",Lighting)
 effect.Name="BC_GameColor";effect.Saturation=-.035;effect.Contrast=.03
 effect.TintColor=Color3.fromRGB(255,250,240)
 print("[BC WorldKit] "..gameId.." created, natural low-poly arena")
 return model
end
return WorldKit

