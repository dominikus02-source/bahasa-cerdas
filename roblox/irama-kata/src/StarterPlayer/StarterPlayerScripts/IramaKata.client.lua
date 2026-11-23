-- Irama Kata: visual 4-lane falling-word rhythm board for Roblox mobile + PC.
-- Taps contain only lane IDs. Server checks timing, correctness and XP-independent score.
local RS=game:GetService("ReplicatedStorage")
local Tween=game:GetService("TweenService")
local Input=game:GetService("UserInputService")
local Context=game:GetService("ContextActionService")
local Players=game:GetService("Players")
local UI=require(script.Parent:WaitForChild("BCUI"))
local net=RS:WaitForChild("BCIrama")
local event=net:WaitForChild("Event")
local request=net:WaitForChild("Request")
local ui=UI.new("IRAMA KATA","Empat jalur • Ketuk kata yang tepat")
ui:backToLobby(request)
local buttons={}
local playing=false
local runningNotes={}
local endClock=0
local laneKeys={Enum.KeyCode.D,Enum.KeyCode.F,Enum.KeyCode.J,Enum.KeyCode.K}
local laneLabels={"D","F","J","K"}
local laneColors={
 Color3.fromRGB(192,117,109),Color3.fromRGB(222,176,91),
 Color3.fromRGB(83,146,109),Color3.fromRGB(94,157,183)}
local notes={}
local function clearNotes()
 for _,obj in pairs(runningNotes) do if obj then obj:Destroy() end end
 runningNotes={}
end
local function control(actionName,state,input)
 if state==Enum.UserInputState.Begin and playing then
  for i,key in ipairs(laneKeys) do
   if input.KeyCode==key then request:FireServer("tap",i);break end
  end
 end
 return Enum.ContextActionResult.Sink
end
local function enableControls()
 Context:BindActionAtPriority("BCIramaLaneKeys",control,false,3500,
  table.unpack(laneKeys))
end
local function disableControls()
 Context:UnbindAction("BCIramaLaneKeys")
end
local function goMenu()
 playing=false
 disableControls()
 clearNotes()
 ui:compact(true)
 ui:clear()
 ui:setStats("9 TINGKAT • 4 JALUR • 3 NYAWA")
 ui:label("GERAKKAN JARI SESUAI IRAMA!",22)
 ui:label("Ketuk kata yang memenuhi aturan level. Biarkan kata yang tidak sesuai lewat.",17)
 ui:button("PILIH TINGKAT",function()request:FireServer("menu")end,"Leaf")
end
local function chooseLevel(data)
 playing=false;disableControls();clearNotes()
 ui:compact(false);ui:clear()
 ui:setStats("TINGKAT RITME")
 ui:label("Pilih tantangan bahasa",21)
 for _,lv in ipairs(data.levels) do
  local b=ui:button((lv.unlocked and "" or "TERKUNCI • ")..lv.name..
   " • "..lv.bpm.." BPM • "..lv.duration.." DETIK",function()
   if lv.unlocked then request:FireServer("start",lv.id) end
  end,lv.unlocked and "Leaf" or "Dark")
  if not lv.unlocked then b.Active=false end
 end
end
local board=nil
local score=0;local combo=0;local lives=3
local function begin(data)
 ui:compact(false);ui:clear()
 ui:setStats("NYAWA 3  •  KOMBO 0  •  SKOR 0")
 ui:label(data.name.." • "..data.bpm.." BPM",18)
 ui:label("ATURAN: KETUK KATA "..data.rule,17)
 ui:label("Ketuk hanya kata yang benar ketika mencapai garis.",14)
 board=Instance.new("Frame",ui.content)
 board.Name="EmpatJalur"
 board.Size=UDim2.new(1,-6,0,288)
 board.BackgroundColor3=ui.palette.Ink
 board.BackgroundTransparency=.18
 Instance.new("UICorner",board).CornerRadius=UDim.new(0,13)
 ui:rank(board)
 buttons={}
 for lane=1,4 do
  local panel=Instance.new("Frame",board)
  panel.Name="Jalur_"..lane
  panel.Size=UDim2.new(.25,-3,1,-5)
  panel.Position=UDim2.new((lane-1)*.25,1,0,2)
  panel.BackgroundColor3=laneColors[lane]
  panel.BackgroundTransparency=.82
  Instance.new("UICorner",panel).CornerRadius=UDim.new(0,10)
  local hit=Instance.new("TextButton",panel)
  hit.Name="TombolJalur_"..lane
  hit.Size=UDim2.new(1,-6,0,63)
  hit.Position=UDim2.new(0,3,1,-67)
  hit.BackgroundColor3=laneColors[lane]
  hit.TextColor3=Color3.fromRGB(255,255,249)
  hit.Text=laneLabels[lane]
  hit.Font=Enum.Font.GothamBlack
  hit.TextSize=23
  Instance.new("UICorner",hit).CornerRadius=UDim.new(0,10)
  hit.MouseButton1Click:Connect(function()
   if playing then request:FireServer("tap",lane) end
  end)
  buttons[lane]=panel
 end
 ui:label("PC: D F J K • HP: sentuh tombol jalur",13)
 playing=true;score=0;combo=0;lives=3
 enableControls()
 endClock=os.clock()+2+data.duration+2.5
end
local function fallingNote(data)
 if not playing or not buttons[data.lane] then return end
 local parent=buttons[data.lane]
 local item=Instance.new("TextLabel",parent)
 item.Name="KataJatuh"
 item.Size=UDim2.new(1,-8,0,47)
 item.Position=UDim2.fromOffset(4,-48)
 item.Text=data.word
 item.TextWrapped=true
 item.TextSize=14
 item.Font=Enum.Font.GothamBold
 item.BackgroundColor3=Color3.fromRGB(245,240,222)
 item.TextColor3=ui.palette.Ink
 item.ZIndex=5
 item.Active=false
 Instance.new("UICorner",item).CornerRadius=UDim.new(0,8)
 runningNotes[data.id]=item
 local delayTime=math.max(.05,math.min(3.3,data.remaining or 2.4))
 Tween:Create(item,TweenInfo.new(delayTime,Enum.EasingStyle.Linear),{
  Position=UDim2.new(0,4,1,-113)
 }):Play()
 task.delay(delayTime+.8,function()
  if runningNotes[data.id]==item then runningNotes[data.id]=nil end
  if item.Parent then item:Destroy() end
 end)
end
event.OnClientEvent:Connect(function(kind,data)
 if kind=="profile" then goMenu()
 elseif kind=="menu" then chooseLevel(data)
 elseif kind=="start" then begin(data)
 elseif kind=="note" then fallingNote(data)
 elseif kind=="feedback" then
  score=data.score;combo=data.combo;lives=data.lives
  ui:setStats("NYAWA "..lives.."  •  KOMBO "..combo.."  •  SKOR "..score)
  ui:say(data.correct and (data.perfect and "PAS! +" or "BAGUS! +")..data.points
   or "Belum tepat. Hindari kata yang tidak sesuai!",data.correct)
 elseif kind=="miss" then
  lives=data.lives;combo=0
  ui:setStats("NYAWA "..lives.."  •  KOMBO 0  •  SKOR "..score)
  ui:say("MELESET • kata yang tepat terlewat")
 elseif kind=="result" then
  playing=false;disableControls();clearNotes()
  ui:compact(true);ui:clear()
  ui:setStats("TANTANGAN RITME SELESAI")
  ui:label(data.over and "COBA LAGI, SOBAT AKSARA!" or "KERJA BAGUS!",22)
  ui:label("SKOR "..data.score,25)
  ui:label(string.rep("★",data.stars)..string.rep("☆",3-data.stars),27)
  ui:label("KETEPATAN "..data.accuracy.."% • KOMBO "..data.maxCombo,17)
  ui:button("PILIH TINGKAT",function()request:FireServer("menu")end,"Leaf")
 elseif kind=="message" then ui:say(tostring(data)) end
end)
task.spawn(function()
 while ui.gui.Parent do
  task.wait(.4)
  if playing and os.clock()>endClock+3 then
   ui:say("Menunggu rekap ritme...")
  end
 end
end)
goMenu()
print("[BC Irama] Native 4-lane UI ready")
