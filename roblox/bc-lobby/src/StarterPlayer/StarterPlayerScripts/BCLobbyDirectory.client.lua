-- Premium searchable game directory for the BahasaCerdas Roblox lobby.
-- Additive HUD: Stage 1 information-only prompts are intentionally preserved.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UIS=game:GetService("UserInputService")
local player=Players.LocalPlayer
local catalog=require(RS:WaitForChild("LobbyCatalog"))
local gui=Instance.new("ScreenGui")
gui.Name="BCLobbyGameDirectory";gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false
gui.DisplayOrder=8;gui.Parent=player:WaitForChild("PlayerGui")
local navy=Color3.fromRGB(23,41,75)
local gold=Color3.fromRGB(239,192,108)
local white=Color3.fromRGB(250,249,244)
local teal=Color3.fromRGB(43,174,171)
local function rounded(obj,r)
 local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,r);c.Parent=obj
end
local function text(parent,value,size,color)
 local l=Instance.new("TextLabel")
 l.Text=value;l.TextSize=size;l.Font=Enum.Font.GothamMedium;l.TextColor3=color or white
 l.TextWrapped=true;l.TextXAlignment=Enum.TextXAlignment.Left
 l.BackgroundTransparency=1;l.Parent=parent;return l
end
local launcher=Instance.new("TextButton")
launcher.Name="BukaDaftarGim";launcher.Text="13 GIM  •  JELAJAHI"
launcher.TextSize=15;launcher.Font=Enum.Font.GothamBold;launcher.TextColor3=navy
launcher.BackgroundColor3=gold;launcher.Size=UDim2.fromOffset(190,44)
launcher.AnchorPoint=Vector2.new(.5,1)
launcher.Position=UDim2.new(.5,0,1,-20)
launcher.Parent=gui;rounded(launcher,14)
local panel=Instance.new("Frame")
panel.Name="KatalogGim";panel.Visible=false;panel.AnchorPoint=Vector2.new(.5,.5)
panel.Position=UDim2.fromScale(.5,.5);panel.Size=UDim2.new(.90,0,.8,0)
panel.BackgroundColor3=navy;panel.Parent=gui;rounded(panel,22)
local max=Instance.new("UISizeConstraint",panel);max.MaxSize=Vector2.new(780,650)
local head=text(panel,"PILIH PETUALANGANMU",23,gold)
head.Size=UDim2.new(1,-90,0,35);head.Position=UDim2.fromOffset(22,16)
local subtitle=text(panel,"13 gerbang • Pilih kartu untuk melihat arah menuju arena",13,white)
subtitle.Size=UDim2.new(1,-45,0,28);subtitle.Position=UDim2.fromOffset(22,49)
local close=Instance.new("TextButton",panel)
close.Text="✕";close.TextColor3=white;close.Font=Enum.Font.GothamBold
close.TextSize=21;close.Size=UDim2.fromOffset(42,42);close.Position=UDim2.new(1,-53,0,12)
close.BackgroundColor3=Color3.fromRGB(55,76,111);rounded(close,12)
local scroll=Instance.new("ScrollingFrame",panel)
scroll.Name="Daftar";scroll.Position=UDim2.fromOffset(16,92)
scroll.Size=UDim2.new(1,-32,1,-108);scroll.BackgroundTransparency=1
scroll.BorderSizePixel=0;scroll.ScrollBarThickness=5
scroll.AutomaticCanvasSize=Enum.AutomaticSize.Y;scroll.CanvasSize=UDim2.fromScale(0,0)
local grid=Instance.new("UIGridLayout",scroll)
grid.CellSize=UDim2.fromOffset(224,112);grid.CellPadding=UDim2.fromOffset(11,11)
grid.SortOrder=Enum.SortOrder.LayoutOrder
local focus
local function closeMenu() panel.Visible=false end
close.MouseButton1Click:Connect(closeMenu)
launcher.MouseButton1Click:Connect(function() panel.Visible=not panel.Visible end)
for i,entry in ipairs(catalog) do
 local tile=Instance.new("TextButton",scroll)
 tile.Name=entry.id;tile.LayoutOrder=i;tile.Text="";tile.AutoButtonColor=true
 tile.BackgroundColor3=Color3.fromRGB(40,62,99);rounded(tile,15)
 local strip=Instance.new("Frame",tile)
 strip.Size=UDim2.new(0,5,1,-20);strip.Position=UDim2.fromOffset(9,10)
 strip.BackgroundColor3=entry.unpublished and Color3.fromRGB(140,143,153) or teal
 rounded(strip,3)
 local name=text(tile,entry.name,17,white)
 name.Font=Enum.Font.GothamBold;name.Position=UDim2.fromOffset(24,13)
 name.Size=UDim2.new(1,-33,0,42)
 local desc=text(tile,entry.category.."  •  "..(entry.unpublished and "Belum diterbitkan" or entry.level),12,gold)
 desc.Position=UDim2.fromOffset(24,59);desc.Size=UDim2.new(1,-34,0,40)
 tile.MouseButton1Click:Connect(function()
  closeMenu()
  local a=2*math.pi*(i-1)/#catalog-math.pi-math.pi/2
  local x,z=math.sin(a)*78,math.cos(a)*78
  local char=player.Character
  local root=char and char:FindFirstChild("HumanoidRootPart")
  -- No unsafe client teleport or fake TeleportService call.
  -- Orient camera toward selected gate; player walks there using existing pathways.
  local camera=workspace.CurrentCamera
  if root and camera then
   local goal=Vector3.new(x,7,z)
   local start=root.Position
   camera.CameraType=Enum.CameraType.Scriptable
   camera.CFrame=CFrame.lookAt(start+Vector3.new(0,30,32),goal)
   task.delay(2.2,function()
    if camera and camera.Parent then camera.CameraType=Enum.CameraType.Custom end
   end)
  end
  launcher.Text="MENU • "..entry.name
  task.delay(4,function() if launcher.Parent then launcher.Text="13 GIM  •  JELAJAHI" end end)
 end)
end
UIS.InputBegan:Connect(function(input,handled)
 if not handled and input.KeyCode==Enum.KeyCode.Escape then closeMenu() end
end)
local function resize()
 local camera=workspace.CurrentCamera
 if not camera then return end
 local width=camera.ViewportSize.X
 if width<670 then
  grid.CellSize=UDim2.new(1,-14,0,95)
  head.TextSize=19
  launcher.Size=UDim2.fromOffset(168,44)
 else
  grid.CellSize=UDim2.fromOffset(width<930 and 210 or 224,112)
  head.TextSize=23
  launcher.Size=UDim2.fromOffset(190,44)
 end
end
resize()
if workspace.CurrentCamera then workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(resize) end
