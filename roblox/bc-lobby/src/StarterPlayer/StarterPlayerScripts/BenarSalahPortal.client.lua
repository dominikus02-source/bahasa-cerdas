-- Benar/Salah portal UX. No trusting client destination or permissions.
local RS=game:GetService("ReplicatedStorage")
local remote=RS:WaitForChild("BCBenarSalahPortal")
local gui=Instance.new("ScreenGui")
gui.Name="BCArenaPortalPanel";gui.DisplayOrder=25;gui.ResetOnSpawn=false
gui.Parent=game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
local frame=Instance.new("Frame",gui)
frame.AnchorPoint=Vector2.new(.5,.5);frame.Position=UDim2.fromScale(.5,.5)
frame.Size=UDim2.new(.88,0,0,265)
frame.BackgroundColor3=Color3.fromRGB(17,28,58);frame.Visible=false
Instance.new("UICorner",frame).CornerRadius=UDim.new(0,20)
local lim=Instance.new("UISizeConstraint",frame)
lim.MaxSize=Vector2.new(480,265)
local border=Instance.new("UIStroke",frame)
border.Color=Color3.fromRGB(251,191,36);border.Thickness=2
local function text(t,y,h,size,col)
 local x=Instance.new("TextLabel",frame)
 x.Position=UDim2.new(0,16,0,y);x.Size=UDim2.new(1,-32,0,h)
 x.Text=t;x.TextWrapped=true;x.TextSize=size;x.Font=Enum.Font.GothamBold
 x.BackgroundTransparency=1;x.TextColor3=col or Color3.new(1,1,1)
 return x
end
text("BENAR ATAU SALAH",12,43,27,Color3.fromRGB(251,191,36))
local description=text("",65,84,17)
local status=text("Pilih Masuk untuk mulai.",151,25,14,Color3.fromRGB(182,219,255))
local function button(t,x,col)
 local b=Instance.new("TextButton",frame);b.Size=UDim2.new(.44,0,0,50)
 b.Position=UDim2.new(x,0,1,-61);b.Text=t;b.TextScaled=true
 b.TextColor3=Color3.new(1,1,1);b.BackgroundColor3=col
 b.Font=Enum.Font.GothamBold;Instance.new("UICorner",b).CornerRadius=UDim.new(0,12)
 return b
end
local enter=button("MASUK",.04,Color3.fromRGB(124,58,237))
local close=button("TUTUP",.52,Color3.fromRGB(62,81,117))
close.MouseButton1Click:Connect(function()frame.Visible=false end)
enter.MouseButton1Click:Connect(function()
 if not enter.Active then return end
 enter.Active=false;enter.Text="MENGHUBUNGKAN..."
 remote:FireServer("enter")
end)
remote.OnClientEvent:Connect(function(kind,data)
 if kind=="open" then
  description.Text=tostring(data);status.Text="Petualangan satu pemain • 9 tingkat"
  enter.Active=true;enter.Text="MASUK";frame.Visible=true
 elseif kind=="loading" then
  status.Text=tostring(data)
 elseif kind=="error" then
  status.Text=tostring(data);enter.Active=true;enter.Text="COBA LAGI";frame.Visible=true
 end
end)
