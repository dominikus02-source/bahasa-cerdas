-- BahasaCerdas: distinct scene composition for every Arena game.
-- Purely visual. Gameplay, question banks, scores and teleports are unchanged.
local M={}
local c={
 stone=Color3.fromRGB(180,164,145),sand=Color3.fromRGB(233,214,183),
 ivory=Color3.fromRGB(250,246,229),wood=Color3.fromRGB(151,108,73),
 green=Color3.fromRGB(87,143,108),forest=Color3.fromRGB(53,109,84),
 blue=Color3.fromRGB(93,159,202),teal=Color3.fromRGB(86,175,175),
 violet=Color3.fromRGB(144,112,190),rose=Color3.fromRGB(220,145,151),
 gold=Color3.fromRGB(237,189,89),ink=Color3.fromRGB(34,47,61)}
local moods={
 ["benar-salah"]={"Aula Putusan Aksara",c.sand,c.green},
 ["susun-kata"]={"Bengkel Huruf",c.wood,c.gold},
 ["tebak-kata"]={"Perpustakaan Rahasia",c.stone,c.violet},
 ["menara"]={"Menara Pengetahuan",c.ivory,c.blue},
 ["irama-kata"]={"Panggung Festival Bahasa",c.ink,c.rose},
 ["petualangan-kata"]={"Hutan Kata Nusantara",c.forest,c.green},
 ["bermain-kata"]={"Taman Permainan Aksara",c.gold,c.teal},
 ["teka-teki-silang"]={"Kuil Kisi Aksara",c.stone,c.forest},
 ["lari-kata"]={"Lintasan Bahasa Cepat",c.rose,c.blue},
 ["kuis-tempur"]={"Arena Duel Cerdas",c.violet,c.gold},
 ["tantang"]={"Plaza Tantangan",c.teal,c.sand},
 ["adu-cepat"]={"Stasiun Kilat",c.ink,c.gold},
 ["rpg"]={"Kerajaan Aksara Nusantara",c.forest,c.gold}}
local function block(parent,name,x,y,z,sx,sy,sz,color,solid,mat)
 local p=Instance.new("Part")
 p.Name=name;p.Anchored=true;p.CanCollide=solid==true
 p.CastShadow=solid==true
 p.Size=Vector3.new(sx,sy,sz);p.CFrame=CFrame.new(x,y,z)
 p.Color=color;p.Material=mat or Enum.Material.SmoothPlastic
 p.Parent=parent
 return p
end
local function orb(parent,name,x,y,z,size,color)
 local p=block(parent,name,x,y,z,size,size,size,color)
 p.Shape=Enum.PartType.Ball
 return p
end
local function sign(parent,value,x,y,z,color)
 local p=block(parent,"Nama Dunia",x,y,z,31,5,.5,c.ink)
 local gui=Instance.new("SurfaceGui",p)
 gui.Face=Enum.NormalId.Back
 gui.PixelsPerStud=32;gui.SizingMode=Enum.SurfaceGuiSizingMode.PixelsPerStud
 local text=Instance.new("TextLabel",gui)
 text.BackgroundTransparency=1;text.Size=UDim2.fromScale(1,1)
 text.Text=value;text.TextScaled=true;text.TextWrapped=true
 text.TextColor3=color;text.Font=Enum.Font.GothamBlack
end
local function pillar(root,name,x,y,z,height,color)
 block(root,name,x,y,z,2.6,height,2.6,color,true,Enum.Material.Slate)
end
local function scene(root,id)
 local mood=moods[id]
 if id=="benar-salah" then
  for _,side in ipairs({-1,1}) do
   local x=side*16;local color=side==-1 and c.green or c.rose
   block(root,"Tribun Putusan",x,4,-23,29,.8,22,color,true)
   pillar(root,"Tiang Putusan",x-10,11,-32,14,c.ivory)
   pillar(root,"Tiang Putusan",x+10,11,-32,14,c.ivory)
   block(root,"Ambang Gerbang",x,18,-32,23,3,4,color)
  end
  sign(root,"BENAR     |     SALAH",0,25,-34,c.gold)
  orb(root,"Medali Keputusan",0,18,-38,5,c.gold)
 elseif id=="susun-kata" then
  block(root,"Konveyor Huruf",0,4,-19,54,1,15,c.wood,true,Enum.Material.WoodPlanks)
  for i=1,7 do
   local x=(i-4)*7
   block(root,"Balok Huruf "..i,x,8,-20,5,5,5,i%2==0 and c.gold or c.teal)
  end
  for i=-1,1,2 do
   local gear=block(root,"Roda Mesin "..i,i*31,12,-30,2,14,14,c.stone)
   gear.Shape=Enum.PartType.Cylinder
  end
  sign(root,"BENGKEL HURUF",0,24,-36,c.gold)
 elseif id=="tebak-kata" then
  for i=1,9 do
   local a=i*math.pi*2/9
   local x=math.sin(a)*30;local z=-20+math.cos(a)*18
   block(root,"Rak Rahasia "..i,x,11,z,9,15,3,c.wood,true,Enum.Material.WoodPlanks)
   for shelf=1,3 do
    block(root,"Koleksi Buku "..i.." "..shelf,x,5+shelf*3,z-.7,8,2,2,
     shelf==1 and c.violet or shelf==2 and c.teal or c.rose)
   end
  end
  orb(root,"Kristal Petunjuk",0,16,-23,9,c.violet)
  sign(root,"PERPUSTAKAAN RAHASIA",0,28,-38,c.gold)
 elseif id=="menara" then
  for level=1,9 do
   block(root,"Lantai Menara "..level,0,6+level*5,-38,25,1.2,23,
    level%2==0 and c.ivory or c.sand,true)
   for _,side in ipairs({-1,1}) do
    pillar(root,"Pilar Menara "..level,side*10,4+level*5,-38,4,c.blue)
   end
  end
  block(root,"Puncak Menara",0,56,-38,32,3,29,c.gold)
  orb(root,"Mahkota Pengetahuan",0,65,-38,9,c.gold)
  sign(root,"MENARA PENGETAHUAN",0,23,-20,c.blue)
 elseif id=="irama-kata" then
  block(root,"Panggung Festival",0,4,-23,67,1.2,37,c.ink,true)
  for lane=1,4 do
   local x=(lane-2.5)*15
   block(root,"Jalur Ritme "..lane,x,5,-23,13,.5,31,
    ({c.rose,c.gold,c.green,c.teal})[lane])
   block(root,"Garis Ketukan "..lane,x,5.5,-9,12,.3,3,c.ivory)
  end
  for _,side in ipairs({-1,1}) do
   for n=1,3 do
    block(root,"Speaker "..side.." "..n,side*39,5+n*7,-27,8,7,7,c.ink)
    orb(root,"Membran Speaker",side*39,5+n*7,-23,4,c.stone)
   end
  end
  sign(root,"FESTIVAL BAHASA",0,29,-42,c.gold)
 elseif id=="petualangan-kata" then
  for i=1,20 do
   local a=i*2.39996;local radius=23+(i%4)*6
   local x,z=math.cos(a)*radius,-18+math.sin(a)*radius
   pillar(root,"Batang Hutan "..i,x,6,z,9,c.wood)
   orb(root,"Rimbun Kata "..i,x,13,z,7,i%3==0 and c.green or c.forest)
  end
  for j=1,3 do
   block(root,({"Benda","Kerja","Sifat"})[j],(j-2)*16,5,-29,12,1,10,
    ({c.gold,c.teal,c.rose})[j])
  end
  sign(root,"HUTAN KATA NUSANTARA",0,23,-39,c.ivory)
 elseif id=="bermain-kata" then
  for i=1,4 do
   block(root,({"Mode Susun","Mode Rumpang","Mode Pasangan","Mode Makna"})[i],
    (i-2.5)*17,5,-25,14,2,16,({c.rose,c.blue,c.teal,c.violet})[i],true)
  end
  for i=1,9 do
   local a=i*math.pi*2/9
   orb(root,"Lampion Taman "..i,math.cos(a)*31,16,-22+math.sin(a)*20,4,
    i%2==0 and c.gold or c.rose)
  end
  sign(root,"TAMAN PERMAINAN AKSARA",0,25,-40,c.sand)
 elseif id=="teka-teki-silang" then
  block(root,"Papan Kisi",0,5,-21,46,1,46,c.ink,true)
  for row=1,9 do
   for col=1,9 do
    block(root,"Kotak "..row.."."..col,(col-5)*4.8,5.7,-21+(row-5)*4.8,
     4.4,.25,4.4,(row+col)%3==0 and c.gold or c.ivory,true)
   end
  end
  pillar(root,"Pilar Kuil Kiri",-29,10,-42,19,c.stone)
  pillar(root,"Pilar Kuil Kanan",29,10,-42,19,c.stone)
  sign(root,"KUIL KISI AKSARA",0,24,-42,c.gold)
 elseif id=="lari-kata" then
  -- SOLO obstacle sprint: a single winding trail, checkpoint arches and finish.
  -- Contrasts intentionally with the enclosed multiplayer station of Adu Cepat.
  for segment=1,9 do
   local z=10-segment*7
   local x=math.sin(segment*.8)*11
   block(root,"Lintasan Berliku "..segment,x,4.2,z,16,.7,9,
    segment%2==0 and c.sand or c.green,true,Enum.Material.Slate)
   if segment%3==0 then
    for _,side in ipairs({-1,1}) do
     pillar(root,"Pintu Pos "..segment, x+side*7,9,z,11,c.wood)
    end
    block(root,"Ambang Pos "..segment,x,15,z,17,1.3,2,c.gold)
   end
  end
  for i=1,5 do
   orb(root,"Bola Kata Sprint "..i,math.sin(i)*19,10,-i*12,3,
    i%2==0 and c.rose or c.teal)
  end
  sign(root,"LINTASAN BAHASA",0,27,-53,c.ivory)
 elseif id=="adu-cepat" then
  -- Multiplayer buzzer competition: distinct radial podiums facing a clock,
  -- not a running course or four parallel tracks.
  block(root,"Panggung Stasiun Kilat",0,4.2,-23,65,1,49,c.ink,true)
  for station=1,8 do
   local a=(station-1)*math.pi/4
   local x=math.sin(a)*24
   local z=-23+math.cos(a)*16
   block(root,"Podium Peserta "..station,x,6,z,8,3.5,7,
    station%2==0 and c.teal or c.gold,true)
   orb(root,"Tombol Kilat "..station,x,8.6,z,2,
    station%2==0 and c.ivory or c.rose)
  end
  pillar(root,"Menara Jam Kilat",0,20,-45,33,c.stone)
  orb(root,"Jam Kompetisi",0,40,-45,13,c.gold)
  sign(root,"STASIUN KILAT",0,49,-47,c.ivory)
 elseif id=="kuis-tempur" then
  block(root,"Arena Dua Pihak",0,5,-25,63,1,39,c.violet,true)
  for _,side in ipairs({-1,1}) do
   block(root,"Podium Duel "..side,side*18,7,-25,16,3,15,
    side<0 and c.teal or c.rose,true)
   orb(root,"Perisai Aksara "..side,side*18,17,-33,7,c.gold)
  end
  sign(root,"ARENA DUEL CERDAS",0,27,-42,c.gold)
 elseif id=="tantang" then
  for _,side in ipairs({-1,1}) do
   block(root,"Meja Sahabat "..side,side*18,5,-23,16,2,11,c.ivory,true)
   for _,seat in ipairs({-1,1}) do
    block(root,"Bangku Sahabat",side*18+seat*8,4,-23,4,2,5,c.teal,true)
   end
  end
  sign(root,"PLAZA TANTANGAN",0,26,-38,c.gold)
 elseif id=="rpg" then
  for _,side in ipairs({-1,1}) do
   pillar(root,"Menara Kerajaan "..side,side*28,13,-42,23,c.stone)
  end
  block(root,"Pendopo Kerajaan",0,13,-42,44,15,18,c.wood,true,Enum.Material.WoodPlanks)
  block(root,"Atap Pendopo",0,23,-42,52,5,25,c.gold)
  sign(root,"KERAJAAN AKSARA NUSANTARA",0,32,-38,c.ivory)
 end
end
function M.Build(id,parent)
 local mood=assert(moods[id],"Unknown world: "..tostring(id))
 local root=Instance.new("Model")
 root.Name="DuniaUnik_"..id;root.Parent=parent
 scene(root,id)
 local value=Instance.new("StringValue",root)
 value.Name="NamaDunia";value.Value=mood[1]
 print("[BC UniqueWorld] "..id.." => "..mood[1])
 return root,mood
end
function M.Get(id)return moods[id] end
return M
