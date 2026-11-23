-- NUSANTARA: Kebangkitan Bahasa | Roblox prototype based on GimNusantara v9.3
-- Server-owned world, quiz validation, XP and discoveries. No external assets required.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")
local DataStoreService=game:GetService("DataStoreService")
local Store=nil
local storeReady,storeResult=pcall(function() return DataStoreService:GetDataStore("NusantaraV02") end)
if storeReady then Store=storeResult else warn("Nusantara: DataStore unavailable in unpublished Studio place; using session-only progress") end
local remote = ReplicatedStorage:FindFirstChild("NusantaraEvent") or Instance.new("RemoteEvent")
remote.Name = "NusantaraEvent"
remote.Parent = ReplicatedStorage
local root = workspace:FindFirstChild("NusantaraWorld")
if root then root:Destroy() end
root = Instance.new("Folder", workspace); root.Name = "NusantaraWorld"
workspace.FallenPartsDestroyHeight = -150
Lighting.ClockTime = 14.5; Lighting.Brightness = 3
Lighting.Ambient = Color3.fromRGB(135,130,176)
Lighting.OutdoorAmbient = Color3.fromRGB(170,190,220)
local function part(name,size,pos,color,material,shape,parent)
 local p=Instance.new("Part")
 p.Name=name;p.Anchored=true;p.Size=size;p.Position=pos;p.Color=color
 p.Material=material or Enum.Material.SmoothPlastic
 if shape then p.Shape=shape end
 p.Parent=parent or root
 return p
end
local function label(parent,txt,height)
 local bg=Instance.new("BillboardGui",parent)
 bg.Name="Nameplate";bg.Size=UDim2.new(0,220,0,45);bg.StudsOffsetWorldSpace=Vector3.new(0,height,0);bg.AlwaysOnTop=true
 local t=Instance.new("TextLabel",bg);t.Size=UDim2.fromScale(1,1);t.BackgroundTransparency=.22;t.BackgroundColor3=Color3.fromRGB(23,19,54)
 t.Text=txt;t.TextColor3=Color3.fromRGB(255,241,188);t.TextScaled=true;t.Font=Enum.Font.GothamBold
 Instance.new("UICorner",t).CornerRadius=UDim.new(0,10)
end
local function prompt(parent,action,object)
 local p=Instance.new("ProximityPrompt",parent)
 p.ActionText=action;p.ObjectText=object;p.MaxActivationDistance=11;p.HoldDuration=.15
 return p
end
local sea=part("Laut Nusantara",Vector3.new(350,2,350),Vector3.new(0,-4,0),Color3.fromRGB(35,140,203),Enum.Material.Glass)
sea.Transparency=.25
local island=part("Pulau Kata",Vector3.new(5,151,151),Vector3.new(0,-1,0),Color3.fromRGB(91,179,109),Enum.Material.Grass,Enum.PartType.Cylinder)
island.CFrame=CFrame.new(0,-1,0)*CFrame.Angles(0,0,math.pi/2)
-- Cylinder is oriented horizontally after rotation; top surface is playable.
part("Plaza",Vector3.new(1,30,30),Vector3.new(0,2,12),Color3.fromRGB(232,197,136),Enum.Material.Sand,Enum.PartType.Cylinder).CFrame=CFrame.new(0,2,12)*CFrame.Angles(0,0,math.pi/2)
local zones={
 {id="plaza",name="Plaza Nusantara",x=0,z=12,r=16,color=Color3.fromRGB(255,216,117)},
 {id="hutan",name="Hutan Kata",x=-6,z=-18,r=18,color=Color3.fromRGB(94,230,255)},
 {id="kanal",name="Jembatan Aksara",x=0,z=-34,r=12,color=Color3.fromRGB(122,208,255)},
 {id="pustaka",name="Perpustakaan Kuno",x=22,z=-46,r=16,color=Color3.fromRGB(197,138,255)},
 {id="majas",name="Taman Majas",x=42,z=-12,r=16,color=Color3.fromRGB(255,143,210)},
 {id="dermaga",name="Dermaga Bahari",x=-44,z=10,r=16,color=Color3.fromRGB(94,230,255)},
 {id="kuil",name="Kuil Peribahasa",x=34,z=30,r=16,color=Color3.fromRGB(255,180,106)},
 {id="arena",name="Arena Penjaga Makna",x=-20,z=-52,r=18,color=Color3.fromRGB(255,90,122)}
}
local function pillar(z)
 local base=part(z.name.." Landasan",Vector3.new(.45,z.r*1.45,z.r*1.45),Vector3.new(z.x,2.4,z.z),z.color,Enum.Material.SmoothPlastic,Enum.PartType.Cylinder)
 base.CFrame=CFrame.new(z.x,2.4,z.z)*CFrame.Angles(0,0,math.pi/2);base.Transparency=.45
 local stone=part(z.name.." Penanda",Vector3.new(3,7,3),Vector3.new(z.x,6,z.z),z.color,Enum.Material.Neon)
 stone.CanCollide=false;label(stone,z.name,6)
end
for _,z in ipairs(zones) do pillar(z) end
-- Forest, garden, library, pier, temple, arena.
local rng=Random.new(930)
for i=1,40 do
 local x=-6+rng:NextNumber(-18,18);local z=-18+rng:NextNumber(-18,18)
 if (Vector2.new(x,z)-Vector2.new(-6,-18)).Magnitude < 17 and math.abs(x+6)>4 then
  part("Batang Pohon",Vector3.new(2,9,2),Vector3.new(x,6,z),Color3.fromRGB(100,72,57),Enum.Material.Wood)
  part("Kanopi Hutan",Vector3.new(9,9,9),Vector3.new(x,12,z),Color3.fromRGB(40,125,103),Enum.Material.Grass,Enum.PartType.Ball)
 end
end
for i=1,18 do
 local a=i*math.pi*2/18;local x=42+math.cos(a)*12;local z=-12+math.sin(a)*12
 part("Bunga Majas",Vector3.new(3,3,3),Vector3.new(x,4,z),Color3.fromHSV(i/18,.7,1),Enum.Material.Neon,Enum.PartType.Ball)
end
for i=1,7 do
 part("Rak Pustaka",Vector3.new(3,9,8),Vector3.new(13+i*2.4,7,-51),Color3.fromRGB(90,58,113),Enum.Material.Wood)
end
for i=1,7 do part("Tiang Dermaga",Vector3.new(2,6,2),Vector3.new(-50+i*2,5,15),Color3.fromRGB(116,72,38),Enum.Material.Wood) end
for i=1,7 do
 local a=i*math.pi*2/7
 part("Obor Kuil",Vector3.new(2,7,2),Vector3.new(34+math.cos(a)*9,6,30+math.sin(a)*9),Color3.fromRGB(236,149,60),Enum.Material.Neon)
end
local npcs={
 {id="guru",name="Guru Senja",role="Pemandu Nusantara",x=0,z=10,q="gate"},
 {id="wiji",name="Wiji",role="Roh Kecil Hutan",x=6,z=-16,q="fog"},
 {id="juru",name="Pak Juru",role="Perajin Jembatan",x=-4,z=-30.5,q="bridge"},
 {id="rara",name="Rara Pustaka",role="Penjaga Perpustakaan",x=22,z=-46,q="lib"},
 {id="empu",name="Empu Sastra",role="Pujangga Taman Majas",x=42,z=-12,q="majas"},
 {id="nakhoda",name="Nakhoda Bahari",role="Pelaut Dermaga",x=-44,z=10,q="imbuhan"},
 {id="bunda",name="Bunda Pantun",role="Penjaga Kuil",x=34,z=30,q="pantun"},
 {id="warga",name="Warga Nara",role="Warga Kota",x=-10,z=16,q="gate"}
}
local quiz={
 gate={q='Bentuk baku dari "apotik" menurut KBBI adalah:',options={"Apotek","Apotik","Aptek","Apotekah"},answer=1,explain='Bentuk baku adalah "apotek".'},
 fog={q='Budi duduk di bangku taman sambil membaca buku. Makna "buku" adalah:',options={"Benda berisi tulisan yang dibaca","Ruas batang bambu","Tempat di taman","Alas duduk"},answer=1,explain="Konteks membaca menentukan makna buku."},
 bridge={q='Manakah kalimat efektif?',options={"Anak itu sedang membaca buku di perpustakaan","Anak itu buku sedang di membaca perpustakaan","Perpustakaan anak membaca itu buku","Sedang anak perpustakaan itu buku membaca"},answer=1,explain="Urutan subjek, predikat, objek, keterangan jelas."},
 lib={q='Artefak berada di rak tua sisi timur lorong tengah. Di mana artefak?',options={"Rak tua sisi timur lorong tengah","Meja dekat pintu","Rak anak sisi barat","Atap menara"},answer=1,explain="Petunjuk tempat dinyatakan langsung dalam teks."},
 majas={q='Ungkapan "angin berbisik" menggunakan majas:',options={"Personifikasi","Hiperbola","Litotes","Metonimia"},answer=1,explain="Angin diberi perilaku manusia, yaitu berbisik."},
 imbuhan={q='Manakah penggunaan kata depan yang tepat?',options={"Ibu pergi ke pasar","Ibu pergi kepasar","Ibu pergi ke-pasar","Ibu pergi kePasar"},answer=1,explain='Kata depan "ke" ditulis terpisah dari tempat.'},
 pantun={q='Pola rima pantun yang lazim adalah:',options={"a-b-a-b","a-a-a-a","a-b-b-b","a-a-b-c"},answer=1,explain="Pantun umumnya terdiri dari empat baris dengan rima a-b-a-b."},
 boss={q='Lawan kata dari "tinggi" adalah:',options={"Rendah","Besar","Jauh","Luas"},answer=1,explain="Antonim tinggi adalah rendah."}
}
local secrets={
 {id="gua",name="Gua Aksara Tersembunyi",x=51,z=-31},
 {id="lingkaran",name="Lingkaran Leluhur",x=18,z=48},
 {id="telaga",name="Telaga Bening",x=-46,z=-30}
}
local state={}
local function save(player)
 local d=state[player]
 if not d or not Store then return end
 local data={xp=d.xp,level=d.level,quests=d.quests,secrets=d.secrets,zones=d.zones}
 local ok,err=pcall(function()
  Store:UpdateAsync("player_"..player.UserId,function()return data end)
 end)
 if not ok then warn("Nusantara DataStore save failed",player.UserId,err) end
end
local function profile(player)
 if not state[player] then state[player]={xp=0,level=1,quests={},secrets={},zones={}} end
 return state[player]
end
local function xp(player,n)
 local s=profile(player);s.xp+=n
 while s.xp>=75*s.level do s.xp-=75*s.level;s.level+=1 end
 remote:FireClient(player,"stats",{xp=s.xp,level=s.level})
 local sync=game:GetService("ServerScriptService"):FindFirstChild("NusantaraLevelSync")
 if sync then sync:Fire(player,s.level) end
end
for _,n in ipairs(npcs) do
 local model=Instance.new("Model",root);model.Name=n.name
 local body=part("Tubuh",Vector3.new(3,5,2),Vector3.new(n.x,5,n.z),Color3.fromRGB(119,77,204),Enum.Material.SmoothPlastic,nil,model)
 part("Kepala",Vector3.new(2.3,2.3,2.3),Vector3.new(n.x,8.7,n.z),Color3.fromRGB(255,210,160),Enum.Material.SmoothPlastic,Enum.PartType.Ball,model)
 label(body,n.name.." | "..n.role,5)
 prompt(body,"Bicara / Kuis",n.name).Triggered:Connect(function(player)
  remote:FireClient(player,"quiz",{id=n.q,npc=n.name,q=quiz[n.q].q,options=quiz[n.q].options})
 end)
end
for _,sec in ipairs(secrets) do
 local stone=part(sec.name,Vector3.new(5,7,5),Vector3.new(sec.x,5,sec.z),Color3.fromRGB(179,130,253),Enum.Material.Neon,Enum.PartType.Ball)
 label(stone,"? "..sec.name,5)
 prompt(stone,"Temukan Rahasia",sec.name).Triggered:Connect(function(player)
  local s=profile(player)
  if s.secrets[sec.id] then remote:FireClient(player,"message","Rahasia ini sudah ditemukan.") return end
  s.secrets[sec.id]=true;xp(player,95)
  remote:FireClient(player,"message","Rahasia ditemukan: "..sec.name.." (+95 XP)")
 end)
end
-- Boss is an educational trial at the arena, rather than a combat replacement.
local boss=part("Penjaga Makna",Vector3.new(8,12,8),Vector3.new(-34,9,-52),Color3.fromRGB(237,76,124),Enum.Material.Neon,Enum.PartType.Ball)
label(boss,"PRASASTI PENJAGA | Ujian Bahasa",9)
prompt(boss,"Ujian Bahasa", "Prasasti Penjaga").Triggered:Connect(function(player)
 remote:FireClient(player,"quiz",{id="boss",npc="Penjaga Makna",q=quiz.boss.q,options=quiz.boss.options})
end)
remote.OnServerEvent:Connect(function(player,kind,payload)
 if kind~="answer" or type(payload)~="table" then return end
 local id=payload.id;local index=payload.index
 if type(id)~="string" or type(index)~="number" then return end
 local q=quiz[id];if not q or index~=math.floor(index) or index<1 or index>4 then return end
 local s=profile(player)
 if index==q.answer then
  if not s.quests[id] then s.quests[id]=true;xp(player,id=="boss" and 150 or 60) end
  remote:FireClient(player,"result",{correct=true,text="Benar! "..q.explain})
 else remote:FireClient(player,"result",{correct=false,text="Coba lagi. "..q.explain}) end
end)
Players.PlayerAdded:Connect(function(player)
 local d=profile(player)
 local ok,data=false,nil
 if Store then ok,data=pcall(function()return Store:GetAsync("player_"..player.UserId) end) end
 if ok and type(data)=="table" then
  d.xp=math.clamp(tonumber(data.xp) or 0,0,100000)
  d.level=math.clamp(tonumber(data.level) or 1,1,100)
  for _,key in ipairs({"quests","secrets","zones"}) do
   if type(data[key])=="table" then
    for id,done in pairs(data[key]) do
     if type(id)=="string" and type(done)=="boolean" then d[key][id]=done end
    end
   end
  end
 end
 remote:FireClient(player,"stats",{xp=d.xp,level=d.level})
 task.delay(2,function()
  if player.Parent then
   local sync=game:GetService("ServerScriptService"):FindFirstChild("NusantaraLevelSync")
   if sync then sync:Fire(player,d.level) end
  end
 end)
 player.CharacterAdded:Connect(function(char)
  local hrp=char:WaitForChild("HumanoidRootPart",10)
  if hrp then hrp.CFrame=CFrame.new(0,9,24) end
 end)
end)
Players.PlayerRemoving:Connect(function(player) save(player);state[player]=nil end)
game:BindToClose(function()
 for _,p in ipairs(Players:GetPlayers()) do save(p) end
end)
task.spawn(function()
 while task.wait(60) do
  for _,p in ipairs(Players:GetPlayers()) do save(p) end
 end
end)
task.spawn(function()
 local rewards=game:GetService("ServerScriptService"):WaitForChild("NusantaraReward",30)
 if rewards then
  rewards.Event:Connect(function(p,amount)
   if p and p.Parent and type(amount)=="number" and amount>0 and amount<=200 then xp(p,amount) end
  end)
 end
end)
-- Zone discovery earns XP, checked server-side.
task.spawn(function()
 while task.wait(2) do
  for _,player in ipairs(Players:GetPlayers()) do
   local char=player.Character;local hrp=char and char:FindFirstChild("HumanoidRootPart")
   if hrp then
    local s=profile(player);local pos=hrp.Position
    for _,z in ipairs(zones) do
     if not s.zones[z.id] and (Vector2.new(pos.X,pos.Z)-Vector2.new(z.x,z.z)).Magnitude<z.r then
      s.zones[z.id]=true;xp(player,12)
      remote:FireClient(player,"message","Wilayah ditemukan: "..z.name.." (+12 XP)")
     end
    end
   end
  end
 end
end)
