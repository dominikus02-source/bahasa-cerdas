-- AKSI, an original BC ink-spirit mascot. All motion is native Luau + Roblox primitives.
local Workspace=game:GetService("Workspace")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local root=Workspace:WaitForChild("BC_Lobby",30)
if not root then return end
local dialog=ReplicatedStorage:FindFirstChild("AKSIDialogue") or Instance.new("RemoteEvent")
dialog.Name="AKSIDialogue";dialog.Parent=ReplicatedStorage
local old=root:FindFirstChild("AKSI_Maskot")
if old then old:Destroy() end
local mascot=Instance.new("Model");mascot.Name="AKSI_Maskot";mascot.Parent=root
local palette=require(ReplicatedStorage:WaitForChild("NaturalTheme")).Color
local violet=palette.BrandSoft
local pink=palette.Rose
local white=palette.Ivory
local navy=palette.Ink
local gold=palette.Reward
local function shape(name,size,cf,color,kind)
 local p=Instance.new("Part");p.Name=name;p.Size=size;p.CFrame=cf
 p.Color=color;p.Material=Enum.Material.SmoothPlastic;p.Anchored=true
 p.CanCollide=false;p.CastShadow=false
 if kind then p.Shape=kind end;p.Parent=mascot;return p
end
-- Design: chunky friendly ink droplet with a signature white BC-inspired swirl.
local x,y,z=-27,8,-6
local core=shape("Tubuh Tinta",Vector3.new(6,7,5.8),CFrame.new(x,y,z),violet,Enum.PartType.Ball)
shape("Puncak Tinta",Vector3.new(3.2,4.1,3.2),CFrame.new(x,y+3,z),pink,Enum.PartType.Ball)
shape("Mata Kiri",Vector3.new(.9,1.25,.38),CFrame.new(x-1,y+.8,z-2.77),white,Enum.PartType.Ball)
shape("Mata Kanan",Vector3.new(.9,1.25,.38),CFrame.new(x+1,y+.8,z-2.77),white,Enum.PartType.Ball)
shape("Pupil Kiri",Vector3.new(.34,.58,.2),CFrame.new(x-1,y+.72,z-3.08),navy,Enum.PartType.Ball)
shape("Pupil Kanan",Vector3.new(.34,.58,.2),CFrame.new(x+1,y+.72,z-3.08),navy,Enum.PartType.Ball)
shape("Senyum",Vector3.new(1.3,.28,.25),CFrame.new(x,y-.72,z-3),gold,Enum.PartType.Ball)
shape("Pipi Kiri",Vector3.new(.8,.4,.3),CFrame.new(x-1.8,y-.45,z-2.65),pink,Enum.PartType.Ball)
shape("Pipi Kanan",Vector3.new(.8,.4,.3),CFrame.new(x+1.8,y-.45,z-2.65),pink,Enum.PartType.Ball)
local leftArm=shape("Tangan Kiri",Vector3.new(1.15,3,1.1),CFrame.new(x-3.6,y,z)*CFrame.Angles(0,0,math.rad(-25)),violet,Enum.PartType.Ball)
local rightArm=shape("Tangan Kanan",Vector3.new(1.15,3,1.1),CFrame.new(x+3.6,y,z)*CFrame.Angles(0,0,math.rad(25)),pink,Enum.PartType.Ball)
shape("Kaki Kiri",Vector3.new(1.6,1,1.8),CFrame.new(x-1.4,y-3.6,z),navy,Enum.PartType.Ball)
shape("Kaki Kanan",Vector3.new(1.6,1,1.8),CFrame.new(x+1.4,y-3.6,z),navy,Enum.PartType.Ball)
local badge=shape("Bintang Dada",Vector3.new(1.1,1.1,.35),CFrame.new(x,y-1.65,z-2.95),gold,Enum.PartType.Ball)
local gui=Instance.new("BillboardGui")
gui.Name="Nama AKSI";gui.Adornee=core;gui.Size=UDim2.fromOffset(195,58)
gui.StudsOffsetWorldSpace=Vector3.new(0,6,0)
gui.MaxDistance=55;gui.AlwaysOnTop=false;gui.Parent=core
local text=Instance.new("TextLabel",gui)
text.Size=UDim2.fromScale(1,1);text.BackgroundColor3=navy;text.BackgroundTransparency=.1
text.Text="AKSI ★\nPemandu Kota Aksara";text.TextColor3=white
text.TextScaled=true;text.Font=Enum.Font.GothamBold
Instance.new("UICorner",text).CornerRadius=UDim.new(0,13)
local prompt=Instance.new("ProximityPrompt",core)
prompt.Name="SapaAKSI";prompt.ActionText="Sapa AKSI"
prompt.ObjectText="Pemandu Kota Aksara"
prompt.MaxActivationDistance=14;prompt.HoldDuration=.1;prompt.RequiresLineOfSight=false
local cooldown={}
prompt.Triggered:Connect(function(player)
 local now=os.clock()
 if now-(cooldown[player] or -100)<1.5 then return end
 cooldown[player]=now
 dialog:FireClient(player,"greet","Halo, Sobat Aksara! Jelajahi Kota Aksara Langit dan pilih gerbang permainanmu. Aku AKSI, pemandumu!")
end)
game:GetService("Players").PlayerRemoving:Connect(function(player)cooldown[player]=nil end)
local original=mascot:GetPivot()
local rightBase=rightArm.CFrame
local leftBase=leftArm.CFrame
-- Idle float and arm-wave; rhythm is slow to avoid excessive network updates.
-- Motion is handled locally by KotaAksaraUI.client.lua (no replicated per-frame decorative updates).
print("[KotaAksara] AKSI mascot ready")
