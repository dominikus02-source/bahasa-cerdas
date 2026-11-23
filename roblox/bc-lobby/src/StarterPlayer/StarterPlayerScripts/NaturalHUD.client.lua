-- Natural Edition HUD: consistent colors, touch-sized controls, low-motion mode.
-- Only presentation changes; no gameplay scores, teleports, or purchases.
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local Lighting=game:GetService("Lighting")
local player=Players.LocalPlayer
local theme=require(ReplicatedStorage:WaitForChild("NaturalTheme"))
local C=theme.Color
local gui=player:WaitForChild("PlayerGui"):WaitForChild("BCLobbyHUD",30)
if not gui then warn("[NaturalHUD] HUD not ready");return end
local function setColors(frame,withGradient)
 if not frame or not frame:IsA("Frame") then return end
 frame.BackgroundColor3=C.Ink
 frame.BackgroundTransparency=.08
 local line=frame:FindFirstChildOfClass("UIStroke") or Instance.new("UIStroke",frame)
 line.Color=C.Copper;line.Thickness=1;line.Transparency=.52
 local gradient=frame:FindFirstChildOfClass("UIGradient")
 if withGradient then
  if not gradient then gradient=Instance.new("UIGradient",frame) end
  gradient.Rotation=25
  gradient.Color=ColorSequence.new(C.Ink,C.Ink:Lerp(C.LeafDark,.28))
 elseif gradient then
  gradient:Destroy()
 end
end
-- Other client components create their HUD first, so apply palette after their setup.
task.wait(.6)
for _,name in ipairs({"Header","PetaMini","SelamatDatang","InformasiGerbang"}) do
 setColors(gui:FindFirstChild(name),true)
end
local header=gui:FindFirstChild("Header")
if header then
 local labels={}
 for _,child in ipairs(header:GetChildren()) do
  if child:IsA("TextLabel") then table.insert(labels,child) end
 end
 table.sort(labels,function(a,b) return a.Position.Y.Offset<b.Position.Y.Offset end)
 if labels[1] then labels[1].Text="KOTA AKSARA";labels[1].TextColor3=C.Sand end
 if labels[2] then labels[2].Text="Langit yang penuh cerita";labels[2].TextColor3=C.Ivory end
end
local map=gui:FindFirstChild("PetaMini")
if map then
 local ring=map:FindFirstChild("Ring")
 if ring then
  ring.BackgroundColor3=C.LeafDark
  local edge=ring:FindFirstChildOfClass("UIStroke")
  if edge then edge.Color=C.StoneLight end
 end
end
local welcome=gui:FindFirstChild("SelamatDatang")
if welcome then
 for _,child in ipairs(welcome:GetChildren()) do
  if child:IsA("TextLabel") then
   if child.Text=="SELAMAT DATANG!" then child.Text="SELAMAT DATANG, SOBAT AKSARA!" end
   child.TextColor3=child.TextSize>23 and C.Sand or C.Ivory
  elseif child:IsA("TextButton") then
   child.BackgroundColor3=C.BrandSoft
   child.Text="Mulai Petualangan"
   child.TextScaled=false;child.TextSize=17
   child.Size=UDim2.fromOffset(220,48)
   child.Position=UDim2.new(.5,-110,1,-61)
  end
 end
end
local dialogue=gui:FindFirstChild("InformasiGerbang")
if dialogue then
 for _,child in ipairs(dialogue:GetChildren()) do
  if child:IsA("TextLabel") then
   child.TextColor3=child.TextSize>20 and C.Sand or C.Ivory
  end
 end
end
local bottom=gui:FindFirstChild("AksiKembali")
if bottom then
 local b=bottom:FindFirstChildOfClass("TextButton")
 if b then b.BackgroundColor3=C.LeafDark;b.Text="Kembali ke Plaza" end
end
-- Client-side low effects mode: meaningful accessibility/performance control.
local options=Instance.new("Frame")
options.Name="PilihanTampilan";options.Size=UDim2.fromOffset(158,48)
options.AnchorPoint=Vector2.new(1,1)
options.Position=UDim2.new(1,-14,1,-18)
options.BackgroundTransparency=1;options.Parent=gui
local effect=Instance.new("TextButton",options)
effect.Name="EfekHemat";effect.Size=UDim2.fromScale(1,1)
effect.BackgroundColor3=C.LeafDark
effect.Text="Efek: Normal";effect.TextSize=15
effect.TextColor3=C.Ivory;effect.Font=Enum.Font.GothamBold
Instance.new("UICorner",effect).CornerRadius=UDim.new(0,12)
local stroke=Instance.new("UIStroke",effect)
stroke.Color=C.Copper;stroke.Transparency=.3
local low=false
local function apply()
 effect.Text=low and "Efek: Hemat" or "Efek: Normal"
 gui:SetAttribute("HematGerak",low)
 for _,name in ipairs({"KotaAksaraBloom","KotaAksaraColor"}) do
  local f=Lighting:FindFirstChild(name)
  if f and f:IsA("PostEffect") then
   f.Enabled=not low
  end
 end
end
effect.MouseButton1Click:Connect(function()low=not low;apply()end)
local function resize()
 local camera=workspace.CurrentCamera
 if not camera then return end
 local width=camera.ViewportSize.X
 local height=camera.ViewportSize.Y
 local narrow=width<760
 if narrow then
  options.Size=UDim2.fromOffset(125,45)
  effect.TextSize=13
  options.Position=UDim2.new(1,-9,1,-11)
  if bottom then
   bottom.Size=UDim2.fromOffset(176,45)
   bottom.Position=UDim2.new(0,9,1,-11)
   local b=bottom:FindFirstChildOfClass("TextButton")
   if b then b.TextSize=13;b.TextScaled=false end
  end
 else
  options.Size=UDim2.fromOffset(158,48)
  effect.TextSize=15
  options.Position=UDim2.new(1,-14,1,-18)
  if bottom then bottom.Size=UDim2.fromOffset(210,54);bottom.Position=UDim2.new(0,14,1,-18) end
 end
 if height<440 then
  local scale=welcome and welcome:FindFirstChildOfClass("UIScale")
  if welcome and not scale then scale=Instance.new("UIScale",welcome) end
  if scale then scale.Scale=.85 end
 end
end
resize()
local camera=workspace.CurrentCamera
if camera then camera:GetPropertyChangedSignal("ViewportSize"):Connect(resize) end
print("[NaturalHUD] Theme ready; reduced-effects toggle available")
