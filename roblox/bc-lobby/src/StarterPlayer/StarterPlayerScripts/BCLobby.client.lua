-- BahasaCerdas Lobby client UX: PC/mobile, minimap, directions, opt-out BGM.
-- The Step 1 gates are information-only; Step 2 adds real TeleportService routes.
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local SoundService=game:GetService("SoundService")
local player=Players.LocalPlayer
local catalog=require(ReplicatedStorage:WaitForChild("LobbyCatalog"))
local action=ReplicatedStorage:WaitForChild("LobbyAction")
local info=ReplicatedStorage:WaitForChild("LobbyInfo")
local gui=Instance.new("ScreenGui")
gui.Name="BCLobbyHUD";gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false
gui.ZIndexBehavior=Enum.ZIndexBehavior.Sibling
gui.Parent=player:WaitForChild("PlayerGui")
local bg=Color3.fromRGB(27,29,70)
local gold=Color3.fromRGB(255,206,112)
local purple=Color3.fromRGB(114,88,204)
local white=Color3.fromRGB(248,249,255)
local function corner(parent,r)
 local x=Instance.new("UICorner",parent);x.CornerRadius=UDim.new(0,r)
end
local function label(parent,text,size,at,sz,color)
 local x=Instance.new("TextLabel")
 x.Name="Teks";x.Text=text;x.Font=Enum.Font.GothamBold;x.TextSize=sz
 x.TextWrapped=true;x.TextColor3=color or white;x.BackgroundTransparency=1
 x.TextXAlignment=Enum.TextXAlignment.Left;x.Size=size;x.Position=at
 x.Parent=parent;return x
end
local function button(parent,caption,size,at,color)
 local b=Instance.new("TextButton")
 b.Text=caption;b.Font=Enum.Font.GothamBold;b.TextScaled=true
 b.TextColor3=white;b.BackgroundColor3=color or purple
 b.Size=size;b.Position=at;b.AutoButtonColor=true;b.Parent=parent
 corner(b,12)
 local stroke=Instance.new("UIStroke",b);stroke.Thickness=1;stroke.Color=Color3.fromRGB(192,166,255)
 return b
end
local title=Instance.new("Frame")
title.Name="Header";title.Size=UDim2.fromOffset(305,74)
title.Position=UDim2.fromOffset(14,14)
title.BackgroundColor3=bg;title.BackgroundTransparency=.12
title.Parent=gui;corner(title,16)
label(title,"BAHASACERDAS",UDim2.new(1,-22,0,28),UDim2.fromOffset(12,8),20,gold)
label(title,"Kota Belajar • 13 Gerbang",UDim2.new(1,-22,0,25),UDim2.fromOffset(12,40),14)
local soundBox=Instance.new("Frame",gui)
soundBox.Name="PengaturanAudio";soundBox.AnchorPoint=Vector2.new(1,0)
soundBox.Position=UDim2.new(1,-14,0,14)
soundBox.Size=UDim2.fromOffset(172,49)
soundBox.BackgroundTransparency=1
local toggle=button(soundBox,"Musik: Mati",UDim2.fromScale(1,1),UDim2.fromScale(0,0))
-- Status jujur untuk soft launch: musik belum aktif karena aset audio berlisensi belum dipilih.
-- Tidak menyisipkan ID palsu, audio dari sumber tak dikenal, atau kontrol yang berpura-pura aktif.
toggle.Text="Musik belum tersedia"
toggle.Active=false
toggle.AutoButtonColor=false
toggle.BackgroundColor3=Color3.fromRGB(74,81,113)
local bottom=Instance.new("Frame",gui)
bottom.Name="AksiKembali";bottom.AnchorPoint=Vector2.new(0,1)
bottom.Position=UDim2.new(0,14,1,-18);bottom.Size=UDim2.fromOffset(210,54)
bottom.BackgroundTransparency=1
local returnButton=button(bottom,"⌂ Kembali ke Lobby",UDim2.fromScale(1,1),UDim2.fromScale(0,0))
returnButton.MouseButton1Click:Connect(function()action:FireServer("returnLobby") end)
local map=Instance.new("Frame",gui)
map.Name="PetaMini";map.AnchorPoint=Vector2.new(1,0)
map.Position=UDim2.new(1,-14,0,79);map.Size=UDim2.fromOffset(190,211)
map.BackgroundColor3=bg;map.BackgroundTransparency=.13;map.Parent=gui
corner(map,15)
label(map,"PETA KOTA BELAJAR",UDim2.new(1,-14,0,24),UDim2.fromOffset(9,7),13,gold)
local circle=Instance.new("Frame",map)
circle.Name="Ring";circle.Position=UDim2.fromOffset(27,35);circle.Size=UDim2.fromOffset(136,136)
circle.BackgroundColor3=Color3.fromRGB(46,82,97);corner(circle,68)
local ringStroke=Instance.new("UIStroke",circle);ringStroke.Color=Color3.fromRGB(174,227,188);ringStroke.Thickness=2
local pins={}
local palette={Kata=Color3.fromRGB(80,228,200),Literasi=Color3.fromRGB(82,170,255),
 Cepat=gold,Tantangan=Color3.fromRGB(171,126,251),Kompetitif=Color3.fromRGB(255,129,192)}
for i,entry in ipairs(catalog) do
 local a=2*math.pi*(i-1)/#catalog-math.pi/2
 local pin=Instance.new("Frame",circle)
 pin.Name="Gerbang_"..entry.id
 pin.Size=UDim2.fromOffset(9,9);pin.AnchorPoint=Vector2.new(.5,.5)
 pin.Position=UDim2.new(.5+math.sin(a)*.41,0,.5+math.cos(a)*.41,0)
 pin.BackgroundColor3=palette[entry.category] or gold
 pin.Parent=circle;corner(pin,5);pins[entry.id]=pin
end
local marker=Instance.new("Frame",circle)
marker.Name="Kamu";marker.Size=UDim2.fromOffset(11,11)
marker.AnchorPoint=Vector2.new(.5,.5);marker.Position=UDim2.fromScale(.5,.5)
marker.BackgroundColor3=white;marker.Parent=circle;corner(marker,6)
local meStroke=Instance.new("UIStroke",marker);meStroke.Thickness=2;meStroke.Color=Color3.fromRGB(42,57,102)
local direction=label(map,"Kamu berada di Plaza",UDim2.new(1,-14,0,27),UDim2.fromOffset(8,179),11)
direction.TextXAlignment=Enum.TextXAlignment.Center
local dialogue=Instance.new("Frame",gui)
dialogue.Name="InformasiGerbang";dialogue.AnchorPoint=Vector2.new(.5,.5)
dialogue.Position=UDim2.fromScale(.5,.5);dialogue.Size=UDim2.new(.9,0,0,245)
dialogue.BackgroundColor3=bg;dialogue.Visible=false;dialogue.Parent=gui;corner(dialogue,20)
local dialogLimit=Instance.new("UISizeConstraint",dialogue);dialogLimit.MaxSize=Vector2.new(470,245)
local dialogTitle=label(dialogue,"GERBANG",UDim2.new(1,-40,0,42),UDim2.fromOffset(20,15),23,gold)
local dialogText=label(dialogue,"",UDim2.new(1,-38,0,108),UDim2.fromOffset(20,65),17)
local soon=label(dialogue,"Belum tersedia • Akan diaktifkan pada tahap berikutnya",UDim2.new(1,-38,0,38),UDim2.fromOffset(20,168),12,gold)
local closeInfo=button(dialogue,"Tutup",UDim2.fromOffset(126,36),UDim2.new(1,-140,1,-47))
closeInfo.MouseButton1Click:Connect(function()dialogue.Visible=false end)
info.OnClientEvent:Connect(function(data)
 if type(data)~="table" then return end
 dialogTitle.Text=tostring(data.name or "Informasi")
 dialogText.Text=(tostring(data.description or "")).."\nKategori: "..tostring(data.category or "-")..
  "  •  Tingkat: "..tostring(data.level or "-").."\nPemain: "..tostring(data.players or "-")
 soon.Text="Belum tersedia • Sistem pindah game dibuat pada Langkah 2"
 dialogue.Visible=true
end)
local welcome=Instance.new("Frame",gui)
welcome.Name="SelamatDatang";welcome.AnchorPoint=Vector2.new(.5,.5)
welcome.Position=UDim2.fromScale(.5,.5);welcome.Size=UDim2.new(.9,0,0,280)
welcome.BackgroundColor3=bg;welcome.Parent=gui;corner(welcome,22)
local welcomeLimit=Instance.new("UISizeConstraint",welcome);welcomeLimit.MaxSize=Vector2.new(485,280)
label(welcome,"SELAMAT DATANG!",UDim2.new(1,-30,0,45),UDim2.fromOffset(20,20),26,gold)
label(welcome,"Ini Kota Belajar BahasaCerdas. Jelajahi plaza dan temukan 13 gerbang permainan. Setiap gerbang mempunyai papan informasi.",UDim2.new(1,-40,0,98),UDim2.fromOffset(20,75),17)
label(welcome,"PC: WASD + E • Ponsel: joystick + tombol interaksi",UDim2.new(1,-40,0,42),UDim2.fromOffset(20,176),13)
local begin=button(welcome,"Mulai Jelajah",UDim2.fromOffset(180,42),UDim2.new(.5,-90,1,-56))
begin.MouseButton1Click:Connect(function()welcome.Visible=false end)
task.spawn(function()
 while gui.Parent do
  task.wait(.2)
  local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  if root then
   local pos=root.Position
   marker.Position=UDim2.new(.5+math.clamp(pos.X/108,-.47,.47),0,.5+math.clamp(pos.Z/108,-.47,.47),0)
   local nearestName="Plaza";local best=math.huge
   for i,e in ipairs(catalog) do
    local a=2*math.pi*(i-1)/#catalog-math.pi/2
    local x=math.sin(a)*78;local z=math.cos(a)*78
    local distance=(Vector2.new(pos.X,pos.Z)-Vector2.new(x,z)).Magnitude
    if distance<best then nearestName=e.name;best=distance end
   end
   direction.Text=best>60 and "Plaza • Cari gerbang" or "Dekat: "..nearestName
  end
 end
end)
-- Scale for small phone viewports while keeping tap targets comfortable.
local uiScale=Instance.new("UIScale",title)
local mapScale=Instance.new("UIScale",map)
local audioScale=Instance.new("UIScale",soundBox)
local function adapt()
 local cam=workspace.CurrentCamera
 if not cam then return end
 local size=cam.ViewportSize
 local small=size.X<720
 uiScale.Scale=small and .72 or 1
 mapScale.Scale=small and .75 or 1
 audioScale.Scale=small and .8 or 1
 map.Position=UDim2.new(1,-14,0,small and 61 or 79)
end
adapt()
if workspace.CurrentCamera then workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(adapt) end
