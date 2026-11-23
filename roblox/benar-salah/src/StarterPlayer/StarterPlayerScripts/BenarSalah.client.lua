-- BahasaCerdas Benar/Salah presentation; authoritative scores stay on the server.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local Tween=game:GetService("TweenService")
local UIS=game:GetService("UserInputService")
local player=Players.LocalPlayer
local net=RS:WaitForChild("BCBenarSalah")
local event=net:WaitForChild("GameEvent")
local request=net:WaitForChild("GameRequest")
local C={navy=Color3.fromRGB(17,28,58),purple=Color3.fromRGB(124,58,237),
blue=Color3.fromRGB(37,99,235),pink=Color3.fromRGB(236,72,153),
gold=Color3.fromRGB(251,191,36),white=Color3.fromRGB(247,249,255),
green=Color3.fromRGB(16,185,129),red=Color3.fromRGB(248,113,113),
muted=Color3.fromRGB(188,204,229)}
local gui=Instance.new("ScreenGui")
gui.Name="BCBenarSalahUI";gui.DisplayOrder=15;gui.ResetOnSpawn=false
gui.Parent=player:WaitForChild("PlayerGui")
local function corner(x,n)Instance.new("UICorner",x).CornerRadius=UDim.new(0,n)end
local function label(parent,txt,size,pos,fontSize,color)
 local x=Instance.new("TextLabel",parent)
 x.Size=size;x.Position=pos;x.Text=txt;x.TextColor3=color or C.white
 x.BackgroundTransparency=1;x.TextWrapped=true;x.Font=Enum.Font.GothamBold
 x.TextSize=fontSize;x.TextXAlignment=Enum.TextXAlignment.Center
 return x
end
local function button(parent,txt,size,pos,col)
 local x=Instance.new("TextButton",parent)
 x.Size=size;x.Position=pos;x.Text=txt;x.BackgroundColor3=col
 x.TextColor3=C.white;x.TextScaled=true;x.TextWrapped=true;x.Font=Enum.Font.GothamBold
 x.AutoButtonColor=true;corner(x,13)
 local scale=Instance.new("UIScale",x)
 x.MouseEnter:Connect(function()Tween:Create(scale,TweenInfo.new(.14),{Scale=1.045}):Play()end)
 x.MouseLeave:Connect(function()Tween:Create(scale,TweenInfo.new(.14),{Scale=1}):Play()end)
 return x
end
local panel=Instance.new("Frame",gui)
panel.Name="Panel";panel.AnchorPoint=Vector2.new(.5,.5)
panel.Position=UDim2.fromScale(.5,.51);panel.Size=UDim2.new(.9,0,.84,0)
panel.BackgroundColor3=C.navy;corner(panel,22)
local lim=Instance.new("UISizeConstraint",panel)
lim.MaxSize=Vector2.new(700,690);lim.MinSize=Vector2.new(260,240)
local stroke=Instance.new("UIStroke",panel)
stroke.Color=C.gold;stroke.Thickness=2
label(panel,"BAHASACERDAS  â˜…  BENAR ATAU SALAH",UDim2.new(1,-22,0,40),UDim2.fromOffset(11,2),17,C.gold)
local toast=label(panel,"",UDim2.new(1,-22,0,30),UDim2.new(0,11,1,-33),14,C.muted)
local pages={}
for _,key in ipairs({"intro","levels","play","result"})do
 local p=Instance.new("Frame",panel)
 p.Name=key;p.Size=UDim2.new(1,-24,1,-90);p.Position=UDim2.fromOffset(12,44)
 p.BackgroundTransparency=1;p.Visible=false;pages[key]=p
end
local function show(page)for k,v in pairs(pages)do v.Visible=k==page end end
-- Start screen
local intro=pages.intro
label(intro,"ARENA DUA PILIHAN",UDim2.new(1,0,0,55),UDim2.new(0,0,.06,0),32,C.gold)
label(intro,"Baca pertanyaan dan jawaban yang ditampilkan. Pilih BENAR atau SALAH.",
 UDim2.new(1,-20,0,110),UDim2.new(0,10,.26,0),21)
label(intro,"9 tingkat  â€¢  3 nyawa  â€¢  waktu terbatas\nAKSI: Semangat, Sobat Aksara!",
 UDim2.new(1,-20,0,100),UDim2.new(0,10,.54,0),17,C.muted)
local choose=button(intro,"PILIH TINGKAT",UDim2.new(.74,0,0,58),UDim2.new(.13,0,1,-68),C.purple)
choose.MouseButton1Click:Connect(function()request:FireServer("menu")end)
-- Levels screen, server-reported unlock status
local levelPage=pages.levels
label(levelPage,"PILIH TINGKAT",UDim2.new(1,0,0,35),UDim2.fromOffset(0,0),24,C.gold)
local sc=Instance.new("ScrollingFrame",levelPage)
sc.Size=UDim2.new(1,-8,1,-52);sc.Position=UDim2.fromOffset(4,46)
sc.BorderSizePixel=0;sc.BackgroundTransparency=1;sc.ScrollBarThickness=5
sc.AutomaticCanvasSize=Enum.AutomaticSize.Y;sc.CanvasSize=UDim2.new()
local layout=Instance.new("UIListLayout",sc)
layout.Padding=UDim.new(0,8);layout.HorizontalAlignment=Enum.HorizontalAlignment.Center
local currentLevel=1
local function levelsMenu(items)
 for _,v in ipairs(sc:GetChildren())do if v:IsA("TextButton")then v:Destroy()end end
 for i,lv in ipairs(items)do
  local title=(lv.unlocked and "â˜… " or "TERKUNCI  ")..i..". "..lv.name
   .."  â€¢  "..lv.count.." soal  â€¢  "..lv.time.." dtk"
  local b=button(sc,title,UDim2.new(1,-12,0,55),UDim2.new(),lv.unlocked and C.purple or Color3.fromRGB(65,74,95))
  b.LayoutOrder=i;b.Active=lv.unlocked;b.TextScaled=false;b.TextSize=17
  if lv.unlocked then b.MouseButton1Click:Connect(function()
   currentLevel=i;request:FireServer("start",i)
  end)end
 end
 show("levels")
end
-- Play screen, only two decisions are sent, never score or correct answer
local play=pages.play
local timer=label(play,"60 dtk",UDim2.new(.32,0,0,35),UDim2.new(0,0,0,0),21,C.gold)
local status=label(play,"SOAL 1/8",UDim2.new(.64,0,0,35),UDim2.new(.36,0,0,0),19)
local hearts=label(play,"â™¥ â™¥ â™¥",UDim2.new(.4,0,0,30),UDim2.new(0,0,0,39),23,C.red)
local score=label(play,"SKOR 0 â€¢ COMBO 0",UDim2.new(.60,0,0,30),UDim2.new(.4,0,0,39),16,C.gold)
local question=label(play,"",UDim2.new(1,-18,0,105),UDim2.new(0,9,.20,0),22)
label(play,"JAWABAN YANG MUNCUL",UDim2.new(1,-18,0,25),UDim2.new(0,9,.49,0),15,C.muted)
local candidate=label(play,"",UDim2.new(1,-20,0,67),UDim2.new(0,10,.56,0),26,C.gold)
local feedback=label(play,"Pilih BENAR jika jawaban ini tepat.",UDim2.new(1,-16,0,63),UDim2.new(0,8,1,-146),15,C.muted)
local yes=button(play,"âœ“ BENAR",UDim2.new(.47,0,0,63),UDim2.new(.01,0,1,-72),C.green)
local no=button(play,"âœ• SALAH",UDim2.new(.47,0,0,63),UDim2.new(.52,0,1,-72),C.pink)
local locked=true;local nonce=nil;local deadline=0
local function answer(value)
 if locked or not nonce then return end
 locked=true;yes.Active=false;no.Active=false
 request:FireServer("answer",{value=value,nonce=nonce})
end
yes.MouseButton1Click:Connect(function()answer(true)end)
no.MouseButton1Click:Connect(function()answer(false)end)
UIS.InputBegan:Connect(function(input,processed)
 if processed or not pages.play.Visible then return end
 if input.KeyCode==Enum.KeyCode.Left or input.KeyCode==Enum.KeyCode.A then answer(true)
 elseif input.KeyCode==Enum.KeyCode.Right or input.KeyCode==Enum.KeyCode.D then answer(false)end
end)
-- Result
local result=pages.result
local headline=label(result,"MISI SELESAI!",UDim2.new(1,0,0,58),UDim2.new(0,0,.05,0),29,C.gold)
local starLabel=label(result,"â˜…â˜…â˜…",UDim2.new(1,0,0,62),UDim2.new(0,0,.24,0),43,C.gold)
local resultText=label(result,"",UDim2.new(1,-24,0,145),UDim2.new(0,12,.42,0),18)
local again=button(result,"MAIN LAGI",UDim2.new(.47,0,0,60),UDim2.new(.01,0,1,-72),C.purple)
local levelsBtn=button(result,"TINGKAT",UDim2.new(.47,0,0,60),UDim2.new(.52,0,1,-72),C.blue)
again.MouseButton1Click:Connect(function()request:FireServer("start",currentLevel)end)
levelsBtn.MouseButton1Click:Connect(function()request:FireServer("menu")end)
-- Return to lobby stays accessible even if game interrupted
local back=button(gui,"âŒ‚ KEMBALI KE LOBBY",UDim2.fromOffset(184,48),UDim2.new(1,-196,0,11),C.blue)
back.MouseButton1Click:Connect(function()request:FireServer("returnLobby")end)
local serial=0
local function message(text)
 serial+=1;local n=serial;toast.Text=tostring(text)
 task.delay(5,function()if n==serial then toast.Text="" end end)
end
event.OnClientEvent:Connect(function(kind,data)
 if kind=="menu" then levelsMenu(data.levels)
 elseif kind=="question" then
  nonce=data.nonce;locked=false;yes.Active=true;no.Active=true
  question.Text=data.soal;candidate.Text="â€œ"..data.candidate.."â€"
  hearts.Text=string.rep("â™¥ ",data.lives)
  score.Text="SKOR "..data.score.." â€¢ COMBO "..data.combo
  status.Text="SOAL "..data.index.."/"..data.total
  feedback.Text="Nilai apakah jawaban ini tepat.";feedback.TextColor3=C.muted
  deadline=os.clock()+data.timeLeft;show("play")
 elseif kind=="feedback" then
  locked=true
  feedback.Text=(data.correct and "KERJA BAGUS! " or "COBA LAGI! ")..data.explanation
  feedback.TextColor3=data.correct and C.green or C.red
  score.Text="SKOR "..data.score.." â€¢ COMBO "..data.combo
  hearts.Text=string.rep("â™¥ ",data.lives)
  if data.correct then
   Tween:Create(candidate,TweenInfo.new(.13),{TextSize=30}):Play()
   task.delay(.15,function()Tween:Create(candidate,TweenInfo.new(.18),{TextSize=26}):Play()end)
  end
 elseif kind=="result" then
  locked=true;nonce=nil;currentLevel=data.level
  headline.Text=data.gameOver and "SEMANGAT, SOBAT AKSARA!" or "MISI SELESAI!"
  starLabel.Text=string.rep("â˜…",data.stars)..string.rep("â˜†",3-data.stars)
  resultText.Text="SKOR "..data.score.." â€¢ AKURASI "..data.accuracy.."%\n"
   .."BENAR "..data.correct.." â€¢ SALAH "..data.wrong.."\n"
   .."COMBO "..data.maxCombo.." â€¢ XP "..data.xpEarned.."\n"..data.reason
  show("result")
 elseif kind=="message" then message(data) end
end)
task.spawn(function()
 while gui.Parent do
  task.wait(.25)
  if pages.play.Visible then timer.Text=math.max(0,math.ceil(deadline-os.clock())).." dtk"end
 end
end)
show("intro")
print("[BC BenarSalah] Client ready")

