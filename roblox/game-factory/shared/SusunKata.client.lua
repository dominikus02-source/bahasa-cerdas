-- Susun Kata Roblox: same server rules/word bank, redesigned native UI.
local RS=game:GetService("ReplicatedStorage")
local Kit=require(script.Parent:WaitForChild("BCUI"))
local net=RS:WaitForChild("BCSusunKata")
local event=net:WaitForChild("Event")
local request=net:WaitForChild("Request")
local ui=Kit.new("SUSUN KATA","Rangkai huruf, temukan makna!")
ui:backToLobby(request)
local letters,chosen={},{}
local nonce=nil
local locked=true
local deadline=0
local currentLevel=1
local currentRound=1
local currentTotal=6
local stats={}
local used={}
local redraw
local function tile(parent,text,order,background,clicked)
 local b=Instance.new("TextButton",parent)
 b.Size=UDim2.fromOffset(48,48)
 b.Text=text;b.LayoutOrder=order
 b.TextSize=22;b.Font=Enum.Font.GothamBold
 b.TextColor3=Color3.fromRGB(252,249,238)
 b.BackgroundColor3=background
 Instance.new("UICorner",b).CornerRadius=UDim.new(0,10)
 b.MouseButton1Click:Connect(clicked)
 return b
end
local function strip(name)
 local frame=Instance.new("ScrollingFrame",ui.content)
 frame.Name=name;ui:rank(frame);frame.Size=UDim2.new(1,-8,0,57)
 frame.BackgroundTransparency=1;frame.BorderSizePixel=0
 frame.ScrollBarThickness=3;frame.AutomaticCanvasSize=Enum.AutomaticSize.X
 frame.CanvasSize=UDim2.new()
 local layout=Instance.new("UIListLayout",frame)
 layout.FillDirection=Enum.FillDirection.Horizontal
 layout.HorizontalAlignment=Enum.HorizontalAlignment.Left
 layout.Padding=UDim.new(0,5)
 return frame
end
local function menu()
 ui:compact(true)
 nonce=nil
 ui:clear()
 ui:setStats("12 TINGKAT • 3 NYAWA • BONUS WAKTU")
 ui:label("Rangkai huruf sesuai makna di layar!",21)
 ui:label("Temukan kata, kumpulkan kombo, lalu buka tingkat berikutnya.",17)
 ui:button("PILIH TINGKAT",function()request:FireServer("menu")end,"Leaf")
end
local function displayLevels(data)
 ui:compact(false)
 ui:clear()
 ui:setStats("TINGKAT DAN BINTANGMU")
 ui:label("Pilih tingkat",22)
 for _,lv in ipairs(data.levels) do
  local text=(lv.unlocked and "" or "TERKUNCI • ")..lv.name..
   " • "..lv.rounds.." KATA"
  local btn=ui:button(text,function()
   if lv.unlocked then
    currentLevel=lv.id
    request:FireServer("start",lv.id)
   end
  end,lv.unlocked and "Purple" or "Dark")
  if not lv.unlocked then btn.Active=false end
 end
end
local ans,available
redraw=function()
 if not ans or not available then return end
 for _,frame in ipairs({ans,available}) do
  for _,x in ipairs(frame:GetChildren()) do
   if x:IsA("TextButton") then x:Destroy() end
  end
 end
 used={}
 for _,idx in ipairs(chosen) do used[idx]=true end
 for pos,index in ipairs(chosen) do
  tile(ans,letters[index],pos,ui.palette.Leaf,function()
   if locked then return end
   table.remove(chosen,pos)
   redraw()
  end)
 end
 for i,char in ipairs(letters) do
  if not used[i] then
   tile(available,char,i,ui.palette.Purple,function()
    if locked then return end
    table.insert(chosen,i)
    redraw()
   end)
  end
 end
end
local function setStats(lives,score,streak,remaining)
 stats.lives=lives or stats.lives or 3
 stats.score=score or stats.score or 0
 stats.streak=streak or stats.streak or 0
 ui:setStats("KATA "..currentRound.."/"..currentTotal..
  "  •  NYAWA "..stats.lives..
  "  •  SKOR "..stats.score..
  "  •  "..math.max(0,math.ceil(remaining or 0)).." DETIK")
end
local function showRound(data)
 ui:compact(false)
 nonce=data.nonce
 if data.round then currentRound=data.round end
 if data.total then currentTotal=data.total end
 letters=data.letters or letters
 chosen={}
 locked=false
 ui:clear()
 local remaining=data.remaining or data.time or 30
 deadline=os.clock()+remaining
 setStats(data.lives,data.score,data.streak,remaining)
 ui:label(data.meaning or stats.meaning or "Susun kata sesuai petunjuk",21)
 if data.meaning then stats.meaning=data.meaning end
 ui:label("SUSUNAN JAWABAN",14)
 ans=strip("Jawaban")
 ui:label("PILIH HURUF DI BAWAH",14)
 available=strip("Huruf")
 ui:button("PERIKSA SUSUNAN",function()
  if locked or not nonce or #chosen~=#letters then return end
  locked=true
  request:FireServer("answer",{nonce=nonce,indices=table.clone(chosen)})
 end,"Leaf")
 ui:button("ULANGI SUSUNAN",function()
  if locked then return end
  chosen={};redraw()
 end,"Purple")
 redraw()
end
event.OnClientEvent:Connect(function(kind,data)
 if kind=="profile" then menu()
 elseif kind=="levels" then displayLevels(data)
 elseif kind=="round" then showRound(data)
 elseif kind=="retry" then showRound(data)
 elseif kind=="feedback" then
  locked=true
  stats.score=data.score or stats.score
  stats.lives=data.lives or stats.lives
  ui:say(data.text,data.correct)
 elseif kind=="result" then
  ui:compact(true)
  nonce=nil;locked=true
  ui:clear()
  ui:setStats("TINGKAT "..data.level.." SELESAI")
  ui:label(data.over and "TETAP SEMANGAT, SOBAT AKSARA!" or "MISI SUSUN KATA BERHASIL!",23)
  ui:label("SKOR "..data.score,26)
  ui:label(string.rep("★",data.stars)..string.rep("☆",3-data.stars),28)
  ui:label("XP "..data.xp.." • KOMBO TERBAIK "..data.bestStreak,16)
  ui:button("MAIN LAGI",function()request:FireServer("menu")end,"Leaf")
 elseif kind=="message" then ui:say(tostring(data)) end
end)
task.spawn(function()
 while ui.gui.Parent do
  task.wait(.3)
  if nonce and not locked then
   setStats(stats.lives,stats.score,stats.streak,deadline-os.clock())
  end
 end
end)
menu()
print("[BC SusunKata] Premium UI loaded")

