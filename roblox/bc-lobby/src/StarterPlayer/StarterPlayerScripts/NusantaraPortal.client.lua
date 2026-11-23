-- Client UX for BC Lobby -> NUSANTARA. Decorative transitions only; server owns teleport.
local RS=game:GetService("ReplicatedStorage")
local TweenService=game:GetService("TweenService")
local gui=Instance.new("ScreenGui")
gui.Name="GerbangNusantaraUI"
gui.ResetOnSpawn=false
gui.DisplayOrder=20
gui.Parent=game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
local remote=RS:WaitForChild("NusantaraPortalEvent",30)
if not remote then return end
local frame=Instance.new("Frame",gui)
frame.Name="InfoNusantara";frame.AnchorPoint=Vector2.new(.5,.5)
frame.Position=UDim2.fromScale(.5,.54);frame.Size=UDim2.new(.90,0,0,288)
frame.BackgroundColor3=Color3.fromRGB(17,28,58)
frame.Visible=false
Instance.new("UICorner",frame).CornerRadius=UDim.new(0,22)
local sizeLimit=Instance.new("UISizeConstraint",frame)
sizeLimit.MaxSize=Vector2.new(500,288)
local border=Instance.new("UIStroke",frame)
border.Color=Color3.fromRGB(251,191,36);border.Thickness=2
local function label(name,value,y,height,sz,color)
 local text=Instance.new("TextLabel",frame)
 text.Name=name;text.Position=UDim2.new(0,20,0,y)
 text.Size=UDim2.new(1,-40,0,height)
 text.BackgroundTransparency=1;text.Text=value
 text.Font=Enum.Font.GothamBold;text.TextWrapped=true
 text.TextSize=sz;text.TextColor3=color or Color3.new(1,1,1)
 return text
end
local title=label("Judul","NUSANTARA",16,46,25,Color3.fromRGB(251,191,36))
local description=label("Ringkasan","",72,87,17)
local status=label("Status","",166,28,13,Color3.fromRGB(190,233,255))
local function button(text,x,color)
 local b=Instance.new("TextButton",frame)
 b.Size=UDim2.new(.44,0,0,49);b.Position=UDim2.new(x,0,1,-64)
 b.Text=text;b.TextSize=17;b.Font=Enum.Font.GothamBold
 b.TextColor3=Color3.new(1,1,1);b.BackgroundColor3=color
 Instance.new("UICorner",b).CornerRadius=UDim.new(0,12)
 return b
end
local enter=button("Masuk NUSANTARA",.04,Color3.fromRGB(124,58,237))
local close=button("Kembali",.52,Color3.fromRGB(57,71,110))
close.MouseButton1Click:Connect(function()frame.Visible=false end)
enter.MouseButton1Click:Connect(function()
 enter.Active=false;enter.Text="Menghubungkan..."
 status.Text="Menyiapkan perjalanan antardunia."
 remote:FireServer("enter")
end)
local function open()
 frame.Position=UDim2.fromScale(.5,.58);frame.Visible=true
 TweenService:Create(frame,TweenInfo.new(.22,Enum.EasingStyle.Back,Enum.EasingDirection.Out),{Position=UDim2.fromScale(.5,.5)}):Play()
end
remote.OnClientEvent:Connect(function(kind,data)
 if kind=="open" and type(data)=="table" then
  title.Text=data.title or "NUSANTARA"
  description.Text=data.description or ""
  status.Text="Gerbang menuju pengalaman Roblox BahasaCerdas yang sudah terbit."
  enter.Active=true;enter.Text="Masuk NUSANTARA"
  open()
 elseif kind=="loading" then
  status.Text=tostring(data)
 elseif kind=="error" then
  status.Text=tostring(data)
  enter.Active=true;enter.Text="Coba Masuk Lagi"
  open()
 end
end)
