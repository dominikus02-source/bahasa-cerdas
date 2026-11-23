-- Premium Kota Aksara visual layer: responsive transitions, motion and AKSI dialogue.
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local TweenService=game:GetService("TweenService")
local player=Players.LocalPlayer
local gui=player:WaitForChild("PlayerGui"):WaitForChild("BCLobbyHUD",30)
if not gui then warn("[KotaAksaraUI] Base HUD unavailable") return end
local violet=Color3.fromRGB(124,58,237)
local pink=Color3.fromRGB(236,72,153)
local navy=Color3.fromRGB(17,28,58)
local gold=Color3.fromRGB(251,191,36)
local cream=Color3.fromRGB(247,246,255)
local function style(frame,color)
 frame.BackgroundColor3=color
 local stroke=frame:FindFirstChildOfClass("UIStroke") or Instance.new("UIStroke",frame)
 stroke.Color=gold;stroke.Thickness=1;stroke.Transparency=.6
 local grad=frame:FindFirstChildOfClass("UIGradient") or Instance.new("UIGradient",frame)
 grad.Rotation=135
 grad.Color=ColorSequence.new(color,color:Lerp(Color3.fromRGB(45,34,100),.35))
end
for _,frameName in ipairs({"Header","PetaMini","InformasiGerbang","SelamatDatang"}) do
 local f=gui:FindFirstChild(frameName)
 if f and f:IsA("Frame") then style(f,navy) end
end
local header=gui:FindFirstChild("Header")
if header then
 local small=header:FindFirstChild("Teks")
 if small and small:IsA("TextLabel") then small.Text="KOTA AKSARA LANGIT" end
end
local function animate(button)
 if not button:IsA("TextButton") then return end
 local scale=button:FindFirstChildOfClass("UIScale") or Instance.new("UIScale",button)
 local current=nil
 local function target(s)
  if current then current:Cancel() end
  current=TweenService:Create(scale,TweenInfo.new(.17,Enum.EasingStyle.Back,Enum.EasingDirection.Out),{Scale=s})
  current:Play()
 end
 button.MouseEnter:Connect(function()target(1.055) end)
 button.MouseLeave:Connect(function()target(1) end)
 button.MouseButton1Down:Connect(function()target(.94) end)
 button.MouseButton1Up:Connect(function()target(1.02) end)
end
for _,child in ipairs(gui:GetDescendants()) do
 if child:IsA("TextButton") then animate(child) end
end
local float=Instance.new("Frame",gui)
float.Name="AKSIPesan";float.AnchorPoint=Vector2.new(.5,1)
float.Position=UDim2.new(.5,0,1,-89);float.Size=UDim2.new(.88,0,0,74)
float.BackgroundColor3=navy;float.BackgroundTransparency=.06;float.Visible=false
Instance.new("UICorner",float).CornerRadius=UDim.new(0,20)
local limit=Instance.new("UISizeConstraint",float);limit.MaxSize=Vector2.new(540,74)
local stroke=Instance.new("UIStroke",float);stroke.Color=gold;stroke.Thickness=2
local title=Instance.new("TextLabel",float)
title.Size=UDim2.new(1,-24,0,25);title.Position=UDim2.fromOffset(12,6)
title.Text="AKSI • PEMANDU KOTA";title.TextSize=15;title.TextXAlignment=Enum.TextXAlignment.Left
title.Font=Enum.Font.GothamBold;title.TextColor3=gold;title.BackgroundTransparency=1
local msg=Instance.new("TextLabel",float)
msg.Size=UDim2.new(1,-24,0,39);msg.Position=UDim2.fromOffset(12,30)
msg.TextSize=13;msg.TextWrapped=true;msg.TextXAlignment=Enum.TextXAlignment.Left
msg.Font=Enum.Font.GothamMedium;msg.TextColor3=cream;msg.BackgroundTransparency=1
local serial=0
local remote=ReplicatedStorage:WaitForChild("AKSIDialogue",30)
if remote then
 remote.OnClientEvent:Connect(function(kind,content)
  if kind~="greet" or type(content)~="string" then return end
  serial+=1;local now=serial
  msg.Text=content
  float.Visible=true
  float.Position=UDim2.new(.5,0,1,-70)
  TweenService:Create(float,TweenInfo.new(.32,Enum.EasingStyle.Back,Enum.EasingDirection.Out),{Position=UDim2.new(.5,0,1,-89)}):Play()
  task.delay(7,function()if serial==now then float.Visible=false end end)
 end)
end
-- No fabricated XP, medals or coins until backing server systems exist.
print("[KotaAksaraUI] Premium UI polish loaded")

-- Aerial welcome: showcase whole sky island before handing control to the player.
-- Restores Roblox's normal character camera on Start or if the welcome closes elsewhere.
local welcome=gui:FindFirstChild("SelamatDatang")
if welcome then
 local camera=workspace.CurrentCamera
 local character=player.Character or player.CharacterAdded:Wait()
 local hum=character:WaitForChild("Humanoid",12)
 local begin=welcome:FindFirstChildWhichIsA("TextButton",true)
 if camera and hum then
  camera.CameraType=Enum.CameraType.Scriptable
  camera.FieldOfView=68
  local c1=CFrame.lookAt(Vector3.new(65,76,104),Vector3.new(0,4,-13))
  local c2=CFrame.lookAt(Vector3.new(40,69,92),Vector3.new(0,4,-13))
  camera.CFrame=c1
  local move=TweenService:Create(camera,TweenInfo.new(7,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{CFrame=c2})
  move:Play()
  local restored=false
  local function restore()
   if restored then return end
   restored=true
   move:Cancel()
   camera.CameraSubject=hum
   camera.CameraType=Enum.CameraType.Custom
   camera.FieldOfView=70
  end
  if begin then begin.MouseButton1Click:Connect(restore) end
  welcome:GetPropertyChangedSignal("Visible"):Connect(function()
   if not welcome.Visible then restore() end
  end)
  player.CharacterAdded:Connect(restore)
 end
end
