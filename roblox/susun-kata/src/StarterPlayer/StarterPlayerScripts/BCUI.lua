-- BahasaCerdas UI Kit: mobile-first, 3D world remains visible on desktop.
local Players=game:GetService("Players")
local Tween=game:GetService("TweenService")
local Kit={}
local C={
 Ink=Color3.fromRGB(30,45,54),
 Dark=Color3.fromRGB(40,64,72),
 Paper=Color3.fromRGB(252,249,238),
 Sand=Color3.fromRGB(236,218,187),
 Leaf=Color3.fromRGB(76,131,102),
 Purple=Color3.fromRGB(135,111,194),
 Rose=Color3.fromRGB(204,136,130),
 Gold=Color3.fromRGB(229,173,83),
}
local function round(element,r)
 Instance.new("UICorner",element).CornerRadius=UDim.new(0,r)
end
local function label(parent,text,size,heavy)
 local t=Instance.new("TextLabel")
 t.BackgroundTransparency=1;t.Size=UDim2.new(1,0,0,size+17)
 t.Text=text;t.TextSize=size;t.TextWrapped=true
 t.TextColor3=C.Paper
 t.TextXAlignment=Enum.TextXAlignment.Left
 t.Font=heavy and Enum.Font.GothamBold or Enum.Font.GothamMedium
 t.AutomaticSize=Enum.AutomaticSize.Y
 t.Parent=parent
 return t
end
function Kit.new(title,subtitle)
 local player=Players.LocalPlayer
 local gui=Instance.new("ScreenGui")
 gui.Name="BCGameInterface";gui.ResetOnSpawn=false
 gui.IgnoreGuiInset=false
 gui.ZIndexBehavior=Enum.ZIndexBehavior.Sibling
 gui.Parent=player:WaitForChild("PlayerGui")
 local card=Instance.new("Frame",gui)
 card.Name="GamePanel";card.AnchorPoint=Vector2.new(1,.5)
 card.BackgroundColor3=C.Ink
 card.Position=UDim2.fromScale(.985,.52)
 card.Size=UDim2.new(.47,0,.86,0)
 round(card,22)
 local border=Instance.new("UIStroke",card)
 border.Color=C.Sand;border.Transparency=.22;border.Thickness=2
 local limit=Instance.new("UISizeConstraint",card)
 limit.MinSize=Vector2.new(245,270)
 limit.MaxSize=Vector2.new(580,760)
 local gradient=Instance.new("UIGradient",card)
 gradient.Color=ColorSequence.new(C.Ink,C.Dark)
 gradient.Rotation=45
 local heading=Instance.new("Frame",card)
 heading.Name="Heading";heading.Size=UDim2.new(1,-32,0,89)
 heading.Position=UDim2.fromOffset(16,9)
 heading.BackgroundTransparency=1
 local titleLabel=label(heading,title,25,true)
 titleLabel.TextColor3=C.Sand
 titleLabel.Size=UDim2.new(1,0,0,39)
 local description=label(heading,subtitle,13,false)
 description.Position=UDim2.fromOffset(0,42)
 description.Size=UDim2.new(1,0,0,40)
 local divider=Instance.new("Frame",card)
 divider.Size=UDim2.new(1,-30,0,2)
 divider.Position=UDim2.fromOffset(15,104)
 divider.BorderSizePixel=0;divider.BackgroundColor3=C.Sand
 divider.BackgroundTransparency=.45
 local stats=label(card,"",15,true)
 stats.Name="Stats"
 stats.Position=UDim2.fromOffset(17,115)
 stats.Size=UDim2.new(1,-34,0,28)
 stats.TextColor3=C.Gold
 local content=Instance.new("ScrollingFrame",card)
 content.Name="Controls"
 content.BackgroundTransparency=1;content.BorderSizePixel=0
 content.Position=UDim2.fromOffset(16,149)
 content.Size=UDim2.new(1,-32,1,-225)
 content.AutomaticCanvasSize=Enum.AutomaticSize.Y
 content.CanvasSize=UDim2.new()
 content.ScrollBarThickness=4
 local layout=Instance.new("UIListLayout",content)
 layout.Padding=UDim.new(0,10)
 layout.SortOrder=Enum.SortOrder.LayoutOrder
 layout.HorizontalAlignment=Enum.HorizontalAlignment.Center
 local toast=label(card,"",13,true)
 toast.Name="Feedback";toast.TextColor3=C.Sand
 toast.Position=UDim2.new(0,16,1,-73)
 toast.Size=UDim2.new(1,-32,0,37)
 local back=Instance.new("TextButton",gui)
 back.Name="ReturnLobby"
 back.Size=UDim2.fromOffset(204,50)
 back.Position=UDim2.fromOffset(15,15)
 back.BackgroundColor3=C.Leaf;back.TextColor3=C.Paper
 back.Text="KEMBALI KE KOTA";back.TextSize=15
 back.Font=Enum.Font.GothamBold;round(back,14)
 Instance.new("UIStroke",back).Color=C.Sand
 local toastSeq=0
 local self={
  gui=gui,card=card,content=content,stats=stats,order=0,compactMode=false,
  back=back,toast=toast,palette=C,
 }
 function self:rank(control)
  self.order+=1;control.LayoutOrder=self.order
 end
 function self:clear()
  self.order=0
  for _,v in ipairs(content:GetChildren()) do
   if v:IsA("GuiObject") then v:Destroy() end
  end
 end
 function self:label(text,size)
  local el=label(content,text,size or 18,false)
  self:rank(el)
  el.Size=UDim2.new(1,-4,0,(size or 18)*2.3)
  return el
 end
 function self:button(text,callback,tone)
  local b=Instance.new("TextButton",content)
  b.Name="Aksi"
  self:rank(b)
  b.Size=UDim2.new(1,-7,0,51)
  b.BackgroundColor3=C[tone or "Purple"] or C.Purple
  b.TextColor3=C.Paper;b.TextSize=17;b.TextWrapped=true
  b.Text=text;b.Font=Enum.Font.GothamBold
  b.AutoButtonColor=false
  round(b,13)
  local scale=Instance.new("UIScale",b)
  b.MouseEnter:Connect(function()
   Tween:Create(scale,TweenInfo.new(.13),{Scale=1.018}):Play()
  end)
  b.MouseLeave:Connect(function()
   Tween:Create(scale,TweenInfo.new(.13),{Scale=1}):Play()
  end)
  b.MouseButton1Down:Connect(function()
   Tween:Create(scale,TweenInfo.new(.10),{Scale=.98}):Play()
  end)
  b.MouseButton1Up:Connect(function()
   Tween:Create(scale,TweenInfo.new(.12),{Scale=1}):Play()
  end)
  if callback then b.MouseButton1Click:Connect(callback) end
  return b
 end
 function self:setStats(value)stats.Text=value end
 function self:say(value,good)
  toastSeq+=1;local mine=toastSeq
  toast.Text=value
  toast.TextColor3=good==true and Color3.fromRGB(136,220,176) or C.Sand
  task.delay(4,function()
   if toastSeq==mine then toast.Text="" end
  end)
 end
 function self:backToLobby(remote)
  back.MouseButton1Click:Connect(function()
   if remote then remote:FireServer("returnLobby") end
   self:say("Menyiapkan perjalanan ke Kota Aksara...")
  end)
 end
 local function adapt()
  local cam=workspace.CurrentCamera
  local width=cam and cam.ViewportSize.X or 1024
  if width<800 then
   card.Size=UDim2.new(.96,0,self.compactMode and .73 or .78,0)
   card.Position=UDim2.fromScale(.98,.58)
   back.Size=UDim2.fromOffset(160,43)
   back.TextSize=13
  else
   card.Size=UDim2.new(.47,0,self.compactMode and .60 or .86,0)
   card.Position=UDim2.fromScale(.985,.52)
   back.Size=UDim2.fromOffset(204,50)
   back.TextSize=15
  end
 end
 function self:compact(value)
  self.compactMode=value==true
  adapt()
 end
 adapt()
 local camera=workspace.CurrentCamera
 if camera then
  camera:GetPropertyChangedSignal("ViewportSize"):Connect(adapt)
 end
 return self
end
return Kit


