-- NUSANTARA Roblox: responsive quiz interface (desktop and mobile)
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local TweenService=game:GetService("TweenService")
local player=Players.LocalPlayer
local remote=ReplicatedStorage:WaitForChild("NusantaraEvent")
local gui=Instance.new("ScreenGui")
gui.Name="NusantaraHUD";gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false;gui.Parent=player:WaitForChild("PlayerGui")
local function corner(p,r) local c=Instance.new("UICorner",p);c.CornerRadius=UDim.new(0,r or 12) end
local function text(parent,size,position,value,fontSize,color)
 local t=Instance.new("TextLabel",parent);t.Size=size;t.Position=position;t.BackgroundTransparency=1
 t.Text=value;t.TextColor3=color or Color3.fromRGB(255,246,219)
 t.Font=Enum.Font.GothamBold;t.TextSize=fontSize;t.TextWrapped=true
 return t
end
local hud=Instance.new("Frame",gui)
hud.Name="Status";hud.Size=UDim2.new(0,280,0,72);hud.Position=UDim2.new(0,12,0,12)
hud.BackgroundColor3=Color3.fromRGB(25,18,57);hud.BackgroundTransparency=.12;corner(hud,14)
local title=text(hud,UDim2.new(1,-16,0,26),UDim2.new(0,8,0,7),"NUSANTARA | KEBANGKITAN BAHASA",15)
local stats=text(hud,UDim2.new(1,-16,0,24),UDim2.new(0,8,0,36),"Level 1  |  XP 0 / 75",16,Color3.fromRGB(255,215,117))
local notice=Instance.new("TextLabel",gui)
notice.Size=UDim2.new(.75,0,0,56);notice.Position=UDim2.new(.125,0,0,90)
notice.BackgroundColor3=Color3.fromRGB(30,23,69);notice.BackgroundTransparency=.09
notice.TextColor3=Color3.fromRGB(255,235,184);notice.Font=Enum.Font.GothamBold
notice.TextScaled=true;notice.TextWrapped=true;notice.Visible=false;corner(notice,12)
local panel=Instance.new("Frame",gui)
panel.Name="Quiz";panel.AnchorPoint=Vector2.new(.5,.5);panel.Position=UDim2.fromScale(.5,.53)
panel.Size=UDim2.new(.88,0,0,410);panel.BackgroundColor3=Color3.fromRGB(27,20,64)
panel.Visible=false;corner(panel,18)
local constraint=Instance.new("UISizeConstraint",panel);constraint.MaxSize=Vector2.new(540,430)
local pad=Instance.new("UIPadding",panel);pad.PaddingLeft=UDim.new(0,18);pad.PaddingRight=UDim.new(0,18)
local heading=text(panel,UDim2.new(1,0,0,40),UDim2.new(0,0,0,16),"",22,Color3.fromRGB(255,215,117))
local question=text(panel,UDim2.new(1,0,0,83),UDim2.new(0,0,0,62),"",18)
local buttons={}
local active=nil
local locked=false
for i=1,4 do
 local b=Instance.new("TextButton",panel)
 b.Name="Pilihan"..i;b.Size=UDim2.new(1,0,0,51);b.Position=UDim2.new(0,0,0,150+(i-1)*58)
 b.BackgroundColor3=Color3.fromRGB(78,56,150)
 b.TextColor3=Color3.fromRGB(255,255,255);b.TextSize=17;b.Font=Enum.Font.GothamMedium
 b.TextWrapped=true;corner(b,10);buttons[i]=b
 b.MouseButton1Click:Connect(function()
  if not active or locked then return end
  locked=true
  remote:FireServer("answer",{id=active,index=i})
 end)
end
local close=Instance.new("TextButton",panel)
close.Text="Tutup ✕";close.TextSize=14;close.Font=Enum.Font.GothamBold
close.BackgroundColor3=Color3.fromRGB(125,50,89);close.TextColor3=Color3.new(1,1,1)
close.Size=UDim2.new(0,104,0,30);close.Position=UDim2.new(1,-104,0,8);corner(close,8)
close.MouseButton1Click:Connect(function()panel.Visible=false;active=nil;locked=false end)
local result=text(panel,UDim2.new(1,0,0,30),UDim2.new(0,0,1,-32),"",14)
local noticeSerial=0
local function toast(message)
 noticeSerial+=1;local serial=noticeSerial
 notice.Text=message;notice.Visible=true
 task.delay(4,function()if noticeSerial==serial then notice.Visible=false end end)
end
remote.OnClientEvent:Connect(function(kind,data)
 if kind=="message" then toast(tostring(data))
 elseif kind=="stats" then
  stats.Text="Level "..tostring(data.level).."  |  XP "..tostring(data.xp).." / "..tostring(75*data.level)
 elseif kind=="quiz" then
  active=data.id;locked=false
  heading.Text=data.npc;question.Text=data.q;result.Text=""
  for i,b in ipairs(buttons) do b.Text=string.char(64+i)..". "..data.options[i] end
  panel.Visible=true
 elseif kind=="result" then
  locked=false;result.Text=data.text
  result.TextColor3=data.correct and Color3.fromRGB(109,255,172) or Color3.fromRGB(255,159,158)
  if data.correct then task.delay(2,function()panel.Visible=false;active=nil end) end
 end
end)
-- Explore HUD v0.3: nearby-area guide and verified server quest progress.
local tracker=Instance.new("Frame",gui)
tracker.Name="PanduanMisi";tracker.Size=UDim2.new(0,280,0,62)
tracker.Position=UDim2.new(0,12,0,88)
tracker.BackgroundColor3=Color3.fromRGB(25,18,57);tracker.BackgroundTransparency=.16
corner(tracker,12)
local questText=text(tracker,UDim2.new(1,-18,0,26),UDim2.new(0,9,0,5),"Misi Bahasa 0/8",14,Color3.fromRGB(255,215,117))
local whereText=text(tracker,UDim2.new(1,-18,0,29),UDim2.new(0,9,0,29),"Cari Guru Senja di Plaza",13)
local areaList={
 {name="Plaza Nusantara",x=0,z=12},
 {name="Hutan Kata",x=-6,z=-18},
 {name="Jembatan Aksara",x=0,z=-34},
 {name="Perpustakaan Kuno",x=22,z=-46},
 {name="Taman Majas",x=42,z=-12},
 {name="Dermaga Bahari",x=-44,z=10},
 {name="Kuil Peribahasa",x=34,z=30},
 {name="Arena Penjaga Makna",x=-20,z=-52}
}
remote.OnClientEvent:Connect(function(kind,data)
 if kind=="questProgress" and type(data)=="table" then
  questText.Text="Misi Bahasa  "..tostring(data.completed).."/"..tostring(data.total)
 end
end)
task.spawn(function()
 while task.wait(2.5) do
  local char=player.Character
  local root=char and char:FindFirstChild("HumanoidRootPart")
  if root then
   local pos=root.Position
   local best=nil;local dist=math.huge
   for _,area in ipairs(areaList) do
    local d=(Vector2.new(pos.X,pos.Z)-Vector2.new(area.x,area.z)).Magnitude
    if d<dist then best=area;dist=d end
   end
   if best then whereText.Text=best.name.."  •  "..math.floor(dist).." stud" end
  end
 end
end)
local camera=workspace.CurrentCamera
local function fitTracker()
 if camera then
  local width=camera.ViewportSize.X
  if width<650 then
   tracker.Position=UDim2.new(0,12,0,85)
   tracker.Size=UDim2.new(0,210,0,56)
   questText.TextSize=12;whereText.TextSize=11
  else
   tracker.Position=UDim2.new(0,12,0,88)
   tracker.Size=UDim2.new(0,280,0,62)
   questText.TextSize=14;whereText.TextSize=13
  end
 end
end
fitTracker()
if camera then camera:GetPropertyChangedSignal("ViewportSize"):Connect(fitTracker) end

toast("Jelajahi 8 wilayah, bicara dengan NPC (E), jawab kuis, dan temukan 3 rahasia!")

-- v0.2: native Roblox class selection, combat dock, keyboard/mobile controls.
local CAS=game:GetService("ContextActionService")
local UIS=game:GetService("UserInputService")
local action=ReplicatedStorage:WaitForChild("NusantaraAction",30)
if action then
 local combatDock=Instance.new("Frame",gui)
 combatDock.Name="SkillDock";combatDock.AnchorPoint=Vector2.new(.5,1)
 combatDock.Position=UDim2.new(.5,0,1,-14);combatDock.Size=UDim2.new(0,360,0,67)
 combatDock.BackgroundColor3=Color3.fromRGB(24,19,58)
 combatDock.BackgroundTransparency=.12;corner(combatDock,14)
 local buttons2={}
 local keys={{"kata","KATA","1"},{"perisai","PERISAI","2"},{"rantai","RANTAI","3"},{"ejaan","EJAAN","4"},{"majas","MAJAS","5"},{"dash","DASH","⇧"}}
 local available=1
 for i,item in ipairs(keys) do
  local b=Instance.new("TextButton",combatDock)
  b.Name=item[1];b.Size=UDim2.new(0,54,0,54);b.Position=UDim2.new(0,7+(i-1)*58,0,6)
  b.BackgroundColor3=Color3.fromRGB(71,49,142)
  b.TextColor3=Color3.fromRGB(255,241,192);b.TextWrapped=true
  b.Text=item[3].."\n"..item[2];b.TextSize=11;b.Font=Enum.Font.GothamBold
  corner(b,10);buttons2[item[1]]=b
  b.MouseButton1Click:Connect(function() action:FireServer("skill",item[1]) end)
 end
 local cooldown={}
 remote.OnClientEvent:Connect(function(kind,data)
  if kind=="skills" and type(data)=="table" then
   available=data.level or 1
   for id,b in pairs(buttons2) do
    local required=({kata=1,perisai=1,rantai=2,ejaan=3,majas=4,dash=1})[id]
    b.BackgroundTransparency=available<required and .7 or 0
   end
  elseif kind=="cooldown" and type(data)=="table" then
   local b=buttons2[data.id]
   if b then
    local old=b.Text
    local serial=tostring(os.clock())
    cooldown[data.id]=serial
    b.BackgroundColor3=Color3.fromRGB(64,64,86)
    task.delay(data.duration,function()
     if cooldown[data.id]==serial then
      b.BackgroundColor3=Color3.fromRGB(71,49,142)
     end
    end)
   end
  elseif kind=="class" and type(data)=="table" then toast("Kelas aktif: "..data.name) end
 end)
 local bindings={
  {"kata",Enum.KeyCode.One},{"perisai",Enum.KeyCode.Two},
  {"rantai",Enum.KeyCode.Three},{"ejaan",Enum.KeyCode.Four},
  {"majas",Enum.KeyCode.Five},{"dash",Enum.KeyCode.LeftShift}
 }
 for _,entry in ipairs(bindings) do
  local skill=entry[1]
  CAS:BindAction("Nusantara_"..skill,function(_,inputState)
   if inputState==Enum.UserInputState.Begin and not panel.Visible then
    action:FireServer("skill",skill)
   end
   return Enum.ContextActionResult.Sink
  end,false,entry[2])
 end
 local choose=Instance.new("Frame",gui)
 choose.Name="ClassSelect";choose.Position=UDim2.new(0,12,0,100)
 choose.Size=UDim2.new(0,205,0,92);choose.BackgroundColor3=Color3.fromRGB(24,19,58)
 choose.BackgroundTransparency=.16;corner(choose,12)
 text(choose,UDim2.new(1,0,0,24),UDim2.new(0,0,0,0),"PILIH KELAS DI PLAZA",13)
 local options={{"pujangga","PUJANGGA"},{"pendekar","PENDEKAR"},{"cendekia","CENDEKIA"}}
 for i,info in ipairs(options) do
  local b=Instance.new("TextButton",choose)
  b.Text=info[2];b.TextSize=10;b.TextColor3=Color3.new(1,1,1)
  b.Font=Enum.Font.GothamBold;b.BackgroundColor3=Color3.fromRGB(83,56,156)
  b.Position=UDim2.new(0,5+(i-1)*67,0,32);b.Size=UDim2.new(0,63,0,42);corner(b,7)
  b.MouseButton1Click:Connect(function() action:FireServer("class",info[1]) end)
 end
 local scale=Instance.new("UIScale",panel)
 local function resize()
  local camera=workspace.CurrentCamera
  if camera then
   scale.Scale=math.min(1,math.max(.52,(camera.ViewportSize.Y-44)/440))
  end
 end
 resize()
 if workspace.CurrentCamera then workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(resize) end
end
