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
toast("Jelajahi 8 wilayah, bicara dengan NPC (E), jawab kuis, dan temukan 3 rahasia!")
