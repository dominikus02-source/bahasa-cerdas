-- Shared lightweight detail panel for 12 game portals.
-- Minimal UI, no teleport from client and no invented availability.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local router=RS:WaitForChild("BCGateRouter")
local player=Players.LocalPlayer
local gui=Instance.new("ScreenGui")
gui.Name="BCGateDetails";gui.ResetOnSpawn=false;gui.DisplayOrder=12
gui.Parent=player:WaitForChild("PlayerGui")
local ink=Color3.fromRGB(32,53,75)
local ivory=Color3.fromRGB(247,243,232)
local sage=Color3.fromRGB(102,143,118)
local gold=Color3.fromRGB(198,155,93)
local panel=Instance.new("Frame")
panel.AnchorPoint=Vector2.new(.5,.5);panel.Position=UDim2.fromScale(.5,.5)
panel.Size=UDim2.new(.90,0,0,270);panel.BackgroundColor3=ink
panel.Visible=false;panel.Parent=gui
Instance.new("UICorner",panel).CornerRadius=UDim.new(0,18)
local limit=Instance.new("UISizeConstraint",panel);limit.MaxSize=Vector2.new(480,300)
local function label(size,y,text,color,font)
 local t=Instance.new("TextLabel",panel)
 t.BackgroundTransparency=1;t.Position=UDim2.new(0,20,0,y)
 t.Size=UDim2.new(1,-40,0,size+25)
 t.Text=text;t.TextSize=size;t.TextWrapped=true
 t.TextXAlignment=Enum.TextXAlignment.Left
 t.TextColor3=color or ivory;t.Font=font or Enum.Font.GothamMedium
 return t
end
local title=label(22,13,"Pilih dunia",ivory,Enum.Font.GothamBold)
local desc=label(15,55,"",ivory)
desc.Size=UDim2.new(1,-40,0,76)
local status=label(13,151,"",gold,Enum.Font.GothamMedium)
local enter=Instance.new("TextButton",panel)
enter.Position=UDim2.new(0,20,1,-57);enter.Size=UDim2.new(.55,-28,0,42)
enter.BackgroundColor3=sage;enter.TextColor3=ivory
enter.TextSize=15;enter.Font=Enum.Font.GothamBold
enter.Text="Masuk Arena"
Instance.new("UICorner",enter).CornerRadius=UDim.new(0,12)
local close=Instance.new("TextButton",panel)
close.AnchorPoint=Vector2.new(1,0)
close.Position=UDim2.new(1,-20,1,-57)
close.Size=UDim2.new(.35,0,0,42)
close.BackgroundColor3=Color3.fromRGB(71,85,101)
close.TextColor3=ivory;close.TextSize=14;close.Font=Enum.Font.GothamMedium
close.Text="Tutup"
Instance.new("UICorner",close).CornerRadius=UDim.new(0,12)
local selectedId=nil
local available=false
local function dismiss()
 panel.Visible=false
 selectedId=nil
end
close.MouseButton1Click:Connect(dismiss)
enter.MouseButton1Click:Connect(function()
 if not available or not selectedId then return end
 enter.Text="Menghubungkan..."
 enter.Active=false
 router:FireServer("enter",selectedId)
end)
router.OnClientEvent:Connect(function(kind,data)
 if kind=="detail" and type(data)=="table" then
  selectedId=type(data.id)=="string" and data.id or nil
  available=data.available==true
  title.Text=tostring(data.title or "Gerbang")
  desc.Text=tostring(data.description or "").."\n"..tostring(data.level or "").." • "..tostring(data.players or "")
  status.Text=tostring(data.status or "")
  enter.Text=available and "Masuk Arena" or "Belum Tersedia"
  enter.BackgroundColor3=available and sage or Color3.fromRGB(104,110,120)
  enter.Active=available;enter.AutoButtonColor=available
  panel.Visible=true
 elseif kind=="loading" then
  enter.Text="Menghubungkan..."
 elseif kind=="error" then
  status.Text=tostring(data)
  enter.Text=available and "Coba Lagi" or "Belum Tersedia"
  enter.Active=available
 end
end)
