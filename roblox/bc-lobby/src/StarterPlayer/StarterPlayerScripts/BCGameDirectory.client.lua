-- BahasaCerdas: one restrained, mobile-friendly directory for the thirteen distinct worlds.
-- Non-invasive: all existing server-authoritative portals and gameplay remain unchanged.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local player=Players.LocalPlayer
local catalog=require(RS:WaitForChild("LobbyCatalog"))
local destinations=require(RS:WaitForChild("LobbyDestinations"))
local C=require(RS:WaitForChild("NaturalTheme")).Color
local gui=Instance.new("ScreenGui")
gui.Name="BCGameDirectory";gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false
gui.DisplayOrder=7;gui.Parent=player:WaitForChild("PlayerGui")
local function corner(parent,r)
 local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,r);c.Parent=parent
end
local function text(parent,words,size,color,bold)
 local label=Instance.new("TextLabel")
 label.BackgroundTransparency=1;label.Text=words;label.TextWrapped=true
 label.TextColor3=color or C.Ivory;label.TextSize=size
 label.Font=bold and Enum.Font.GothamBold or Enum.Font.GothamMedium
 label.TextXAlignment=Enum.TextXAlignment.Left;label.Parent=parent
 return label
end
-- Only one persistent action: preserve the centre of the viewport for the 3D world.
local launcher=Instance.new("TextButton")
launcher.Name="BukaPilihanGim";launcher.AnchorPoint=Vector2.new(.5,1)
launcher.Position=UDim2.new(.5,0,1,-16);launcher.Size=UDim2.fromOffset(178,46)
launcher.BackgroundColor3=C.Sand;launcher.TextColor3=C.Ink
launcher.Text="Pilih Gim";launcher.Font=Enum.Font.GothamBold;launcher.TextSize=16
launcher.Parent=gui;corner(launcher,14)
local panel=Instance.new("Frame")
panel.Name="Katalog";panel.Visible=false;panel.AnchorPoint=Vector2.new(.5,.5)
panel.Position=UDim2.fromScale(.5,.5);panel.Size=UDim2.new(.92,0,.78,0)
panel.BackgroundColor3=C.Ink;panel.Parent=gui;corner(panel,18)
local max=Instance.new("UISizeConstraint",panel)
max.MaxSize=Vector2.new(760,620)
local title=text(panel,"Pilih Dunia",23,C.Ivory,true)
title.Position=UDim2.fromOffset(18,13);title.Size=UDim2.new(1,-92,0,36)
local intro=text(panel,"13 pengalaman belajar, masing-masing berbeda.",13,C.Sand)
intro.Position=UDim2.fromOffset(18,50);intro.Size=UDim2.new(1,-38,0,28)
local close=Instance.new("TextButton",panel)
close.Size=UDim2.fromOffset(44,44);close.Position=UDim2.new(1,-55,0,11)
close.BackgroundColor3=C.LeafDark;close.TextColor3=C.Ivory
close.Text="Tutup";close.Font=Enum.Font.GothamMedium;close.TextSize=12
corner(close,11)
local scroll=Instance.new("ScrollingFrame",panel)
scroll.Position=UDim2.fromOffset(15,91);scroll.Size=UDim2.new(1,-30,1,-105)
scroll.BackgroundTransparency=1;scroll.BorderSizePixel=0
scroll.ScrollBarThickness=5;scroll.AutomaticCanvasSize=Enum.AutomaticSize.Y
scroll.CanvasSize=UDim2.fromScale(0,0)
local grid=Instance.new("UIGridLayout",scroll)
grid.SortOrder=Enum.SortOrder.LayoutOrder
grid.CellPadding=UDim2.fromOffset(10,10)
grid.CellSize=UDim2.fromOffset(225,104)
local identities={
 ["benar-salah"]={"Aula Putusan","Ambil keputusan: benar atau salah"},
 ["susun-kata"]={"Bengkel Huruf","Rakit huruf menjadi kata"},
 ["tebak-kata"]={"Perpustakaan Rahasia","Pecahkan misteri dari petunjuk"},
 ["lari-kata"]={"Lintasan Bahasa","Berpacu dengan waktu"},
 ["menara"]={"Menara Pengetahuan","Mendaki melalui jawaban tepat"},
 ["bermain-kata"]={"Taman Empat Mode","Susun, rumpang, pasangan, makna"},
 ["petualangan-kata"]={"Hutan Kata","Cari dan kelompokkan kata"},
 ["irama-kata"]={"Festival Bahasa","Ikuti irama empat jalur"},
 ["teka-teki-silang"]={"Kuil Kisi Aksara","Pecahkan petunjuk dalam kisi"},
 ["tantang"]={"Plaza Sahabat","Duel bergantian dengan teman"},
 ["adu-cepat"]={"Stasiun Kilat","Rebut waktu dalam lomba bersama"},
 ["kuis-tempur"]={"Arena Strategi","Kuasai tantangan kuis tempur"},
 ["rpg"]={"Kerajaan Aksara","Jelajah kisah Nusantara"},
}
local function dismiss() panel.Visible=false end
launcher.MouseButton1Click:Connect(function()panel.Visible=not panel.Visible end)
close.MouseButton1Click:Connect(dismiss)
UserInputService.InputBegan:Connect(function(input,handled)
 if not handled and input.KeyCode==Enum.KeyCode.Escape then dismiss() end
end)
for i,entry in ipairs(catalog) do
 local identity=identities[entry.id] or {entry.name,entry.description}
 local tile=Instance.new("TextButton",scroll)
 tile.Name=entry.id;tile.LayoutOrder=i;tile.Text=""
 tile.BackgroundColor3=Color3.fromRGB(52,69,81);tile.Parent=scroll
 corner(tile,13)
 local edge=Instance.new("Frame",tile)
 edge.BackgroundColor3=C.LeafLight;edge.Size=UDim2.fromOffset(4,79)
 edge.Position=UDim2.fromOffset(9,12);corner(edge,3)
 local name=text(tile,entry.name,16,C.Ivory,true)
 name.Position=UDim2.fromOffset(23,9);name.Size=UDim2.new(1,-32,0,33)
 local description=text(tile,identity[2],12,C.Sand)
 description.Position=UDim2.fromOffset(23,43);description.Size=UDim2.new(1,-32,0,30)
 local status=type(destinations.Games[entry.id])=="number" and not entry.unpublished
 local hint=text(tile,status and "Dekati gerbang untuk masuk" or "Pratinjau • Belum tersedia",11,status and C.LeafLight or C.StoneLight,true)
 hint.Position=UDim2.fromOffset(23,79);hint.Size=UDim2.new(1,-32,0,19)
 tile.MouseButton1Click:Connect(function()
  dismiss()
  local world=workspace:FindFirstChild("BC_Lobby")
  local gate=world and world:FindFirstChild("Gerbang_"..entry.id)
  if gate then
   -- A temporary understated wayfinding highlight, no camera lock or teleport.
   local previous=world:FindFirstChild("BCPilihanGerbang")
   if previous then previous:Destroy() end
   local outline=Instance.new("Highlight")
   outline.Name="BCPilihanGerbang"
   outline.Adornee=gate
   outline.FillTransparency=1
   outline.OutlineTransparency=.05
   outline.OutlineColor=C.Sand
   outline.DepthMode=Enum.HighlightDepthMode.Occluded
   outline.Parent=world
   local toast=Instance.new("TextLabel")
   toast.Name="PetunjukGerbang"
   toast.AnchorPoint=Vector2.new(.5,1)
   toast.Position=UDim2.new(.5,0,1,-72)
   toast.Size=UDim2.new(.76,0,0,48)
   toast.BackgroundColor3=C.Ink;toast.BackgroundTransparency=.06
   toast.TextColor3=C.Ivory;toast.TextSize=14;toast.Font=Enum.Font.GothamMedium
   toast.TextWrapped=true
   toast.Text=entry.name.." • Ikuti gerbang yang disorot"
   toast.Parent=gui;corner(toast,12)
   local maxToast=Instance.new("UISizeConstraint",toast)
   maxToast.MaxSize=Vector2.new(350,48)
   task.delay(7,function()
    if outline.Parent then outline:Destroy() end
    if toast.Parent then toast:Destroy() end
   end)
  end
 end)
end
local function adapt()
 local cam=workspace.CurrentCamera
 if not cam then return end
 local w=cam.ViewportSize.X
 grid.CellSize=w<690 and UDim2.new(1,-12,0,100) or UDim2.fromOffset(225,104)
 launcher.Size=w<690 and UDim2.fromOffset(150,44) or UDim2.fromOffset(178,46)
 title.TextSize=w<690 and 21 or 23
end
adapt()
if workspace.CurrentCamera then
 workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(adapt)
end
