-- BahasaCerdas Susun Kata: responsive tap-to-arrange letter puzzle.
local Players=game:GetService("Players")
local Rep=game:GetService("ReplicatedStorage")
local player=Players.LocalPlayer
local folder=Rep:WaitForChild("BCSusunKata")
local event=folder:WaitForChild("Event")
local request=folder:WaitForChild("Request")
local colors={navy=Color3.fromRGB(17,28,58),violet=Color3.fromRGB(124,58,237),
 gold=Color3.fromRGB(251,191,36),blue=Color3.fromRGB(37,99,235),
 green=Color3.fromRGB(16,185,129),white=Color3.fromRGB(255,255,255)}
local gui=Instance.new("ScreenGui")
gui.Name="BCSusunKataHUD";gui.ResetOnSpawn=false;gui.Parent=player:WaitForChild("PlayerGui")
local function corner(x)Instance.new("UICorner",x).CornerRadius=UDim.new(0,14)end
local function make(class,parent,name,size,pos,color,txt)
 local x=Instance.new(class,parent);x.Name=name;x.Size=size;x.Position=pos
 x.BackgroundColor3=color or colors.navy
 if x:IsA("TextLabel") or x:IsA("TextButton") then
  x.Text=txt or "";x.TextColor3=colors.white;x.TextSize=19
  x.TextWrapped=true;x.Font=Enum.Font.GothamBold
 end
 if x:IsA("TextButton") then corner(x) end
 return x
end
local panel=make("Frame",gui,"Panel",UDim2.new(.94,0,.86,0),UDim2.fromScale(.03,.07),colors.navy)
corner(panel)
local size=Instance.new("UISizeConstraint",panel);size.MaxSize=Vector2.new(760,750)
panel.AnchorPoint=Vector2.new(.5,.5);panel.Position=UDim2.fromScale(.5,.51)
make("TextLabel",panel,"Brand",UDim2.new(1,-18,0,39),UDim2.fromOffset(9,7),colors.navy,"KOTA AKSARA • SUSUN KATA").TextColor3=colors.gold
local info=make("TextLabel",panel,"Status",UDim2.new(1,-20,0,52),UDim2.fromOffset(10,46),colors.navy,"Pilih tingkat, lalu susun huruf sesuai maknanya.")
info.TextSize=16
local menu=make("ScrollingFrame",panel,"LevelList",UDim2.new(1,-30,1,-170),UDim2.fromOffset(15,106),colors.navy)
menu.BackgroundTransparency=1;menu.ScrollBarThickness=5;menu.AutomaticCanvasSize=Enum.AutomaticSize.Y
menu.CanvasSize=UDim2.new()
local menuLayout=Instance.new("UIListLayout",menu);menuLayout.Padding=UDim.new(0,8)
local play=make("Frame",panel,"Play",UDim2.new(1,-30,1,-170),UDim2.fromOffset(15,106),colors.navy)
play.BackgroundTransparency=1;play.Visible=false
local question=make("TextLabel",play,"Makna",UDim2.new(1,0,.22,0),UDim2.new(),colors.navy,"")
question.TextSize=21
local answer=make("ScrollingFrame",play,"Susunan",UDim2.new(1,0,0,55),UDim2.new(0,0,.25,0),colors.navy)
answer.BackgroundTransparency=1;answer.AutomaticCanvasSize=Enum.AutomaticSize.X;answer.ScrollBarThickness=4
local aLayout=Instance.new("UIListLayout",answer);aLayout.FillDirection=Enum.FillDirection.Horizontal
aLayout.Padding=UDim.new(0,6)
local available=make("ScrollingFrame",play,"Huruf",UDim2.new(1,0,0,55),UDim2.new(0,0,.50,0),colors.navy)
available.BackgroundTransparency=1;available.AutomaticCanvasSize=Enum.AutomaticSize.X;available.ScrollBarThickness=4
local bLayout=Instance.new("UIListLayout",available);bLayout.FillDirection=Enum.FillDirection.Horizontal
bLayout.Padding=UDim.new(0,6)
local clear=make("TextButton",play,"Hapus",UDim2.new(.31,0,0,51),UDim2.new(0,0,1,-56),colors.blue,"HAPUS")
local submit=make("TextButton",play,"Periksa",UDim2.new(.64,0,0,51),UDim2.new(.36,0,1,-56),colors.green,"PERIKSA")
local bottom=make("TextLabel",panel,"Pesan",UDim2.new(1,-20,0,30),UDim2.new(0,10,1,-51),colors.navy,"")
bottom.TextSize=15;bottom.TextColor3=colors.gold
local back=make("TextButton",gui,"Kembali",UDim2.fromOffset(205,45),UDim2.new(1,-216,0,11),colors.blue,"⌂ KEMBALI KE LOBBY")
back.MouseButton1Click:Connect(function()request:FireServer("returnLobby")end)
local letters,chosen,nonce,currentLevel,locked,remaining={}, {},nil,1,true,30
local start
local function clearObjects(frame)
 for _,x in ipairs(frame:GetChildren()) do if x:IsA("TextButton") then x:Destroy() end end
end
local redraw
redraw=function()
 clearObjects(answer);clearObjects(available)
 local used={}
 for _,i in ipairs(chosen) do used[i]=true end
 for j,i in ipairs(chosen) do
  local b=make("TextButton",answer,"Chosen"..j,UDim2.fromOffset(44,45),UDim2.new(),colors.green,letters[i])
  b.LayoutOrder=j
  b.MouseButton1Click:Connect(function()
   if locked then return end
   table.remove(chosen,j);redraw()
  end)
 end
 for i,letter in ipairs(letters) do
  if not used[i] then
   local b=make("TextButton",available,"Letter"..i,UDim2.fromOffset(44,45),UDim2.new(),colors.violet,letter)
   b.LayoutOrder=i
   b.MouseButton1Click:Connect(function()
    if locked then return end
    table.insert(chosen,i);redraw()
   end)
  end
 end
end
clear.MouseButton1Click:Connect(function()
 if locked then return end
 chosen={};redraw()
end)
submit.MouseButton1Click:Connect(function()
 if locked or not nonce or #chosen~=#letters then return end
 locked=true
 request:FireServer("answer",{nonce=nonce,indices=table.clone(chosen)})
end)
local function displayMenu(items)
 clearObjects(menu)
 menu.Visible=true;play.Visible=false
 for i,l in ipairs(items) do
  local name=(l.unlocked and "★ " or "TERKUNCI • ")..l.name.." • "..l.rounds.." kata"
  local b=make("TextButton",menu,"Level"..i,UDim2.new(1,-10,0,54),UDim2.new(),
   l.unlocked and colors.violet or Color3.fromRGB(68,71,95),name)
  b.LayoutOrder=i
  if l.unlocked then b.MouseButton1Click:Connect(function()
   currentLevel=i;request:FireServer("start",i)
  end) end
 end
 info.Text="12 tingkat • 3 nyawa • jawaban dan skor divalidasi server"
end
local function loadRound(data)
 letters=data.letters;chosen={};nonce=data.nonce;locked=false
 remaining=data.remaining or data.time or remaining
 if data.meaning then question.Text=data.meaning end
 if data.round then
  info.Text="KATA "..data.round.."/"..data.total.." • NYAWA "..data.lives..
   " • SKOR "..data.score.." • "..data.time.." DETIK"
 end
 menu.Visible=false;play.Visible=true;redraw()
end
event.OnClientEvent:Connect(function(kind,data)
 if kind=="menu" then displayMenu(data.levels)
 elseif kind=="round" or kind=="retry" then loadRound(data)
 elseif kind=="feedback" then
  locked=true;bottom.Text=data.text or ""
  if data.correct then bottom.TextColor3=colors.green else bottom.TextColor3=colors.gold end
 elseif kind=="result" then
  menu.Visible=false;play.Visible=false
  info.Text=(data.over and "TETAP SEMANGAT!" or "KERJA BAGUS!")..
   " • SKOR "..data.score.." • BINTANG "..data.stars.." • XP "..data.xp
  bottom.Text=data.reason.." • Tekan PILIH TINGKAT untuk main lagi."
  start.Visible=true
 elseif kind=="message" then bottom.Text=tostring(data) end
end)
start=make("TextButton",panel,"PilihTingkat",UDim2.new(.60,0,0,50),
 UDim2.new(.20,0,1,-100),colors.violet,"PILIH TINGKAT")
start.MouseButton1Click:Connect(function()
 start.Visible=false;request:FireServer("menu")
end)
menu.Visible=false;play.Visible=false
print("[BC SusunKata] Client UI ready")
