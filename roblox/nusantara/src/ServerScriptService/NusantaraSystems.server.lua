-- Nusantara v0.2 combat and classes; damage is validated on server.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local Debris=game:GetService("Debris")
local world=workspace:WaitForChild("NusantaraWorld",30)
if not world then return end
local event=RS:WaitForChild("NusantaraEvent")
local action=Instance.new("RemoteEvent");action.Name="NusantaraAction";action.Parent=RS
local reward=Instance.new("BindableEvent");reward.Name="NusantaraReward";reward.Parent=game:GetService("ServerScriptService")
local sync=Instance.new("BindableEvent");sync.Name="NusantaraLevelSync";sync.Parent=game:GetService("ServerScriptService")
local classes={pujangga={damage=1.15,hp=100,speed=16},pendekar={damage=1.05,hp=125,speed=18},cendekia={damage=1,hp=110,speed=16}}
local cd={kata=1.6,perisai=12,rantai=7,ejaan=5,majas=13,dash=3}
local unlock={kata=1,perisai=1,rantai=2,ejaan=3,majas=4,dash=1}
local attack={kata={range=38,damage=21,limit=1},rantai={range=40,damage=12,limit=3},ejaan={range=60,damage=35,limit=1},majas={range=20,damage=28,limit=8}}
local profiles={}
local enemies={}
local folder=Instance.new("Folder",world);folder.Name="MusuhBahasa"
local function send(pl,kind,data) event:FireClient(pl,kind,data) end
local function make(name,pos,boss)
 local model=Instance.new("Model",folder);model.Name=name
 local core=Instance.new("Part");core.Name="Inti";core.Shape=Enum.PartType.Ball;core.Anchored=true
 core.Size=boss and Vector3.new(7,8,7) or Vector3.new(4,4,4)
 core.Position=pos;core.Color=boss and Color3.fromRGB(230,70,113) or Color3.fromRGB(139,86,226)
 core.Material=Enum.Material.Neon;core.Parent=model
 local gui=Instance.new("BillboardGui",core);gui.Size=UDim2.fromOffset(220,54)
 gui.StudsOffset=Vector3.new(0,boss and 7 or 4,0);gui.AlwaysOnTop=true
 local label=Instance.new("TextLabel",gui);label.Size=UDim2.fromScale(1,1)
 label.BackgroundTransparency=.25;label.BackgroundColor3=Color3.fromRGB(36,20,65)
 label.Text=name;label.Font=Enum.Font.GothamBold;label.TextScaled=true
 label.TextColor3=Color3.new(1,1,1)
 local hp=boss and 450 or 90
 model:SetAttribute("Health",hp);model:SetAttribute("MaxHealth",hp)
 model:SetAttribute("Alive",true);model:SetAttribute("Boss",boss)
 enemies[model]={core=core,respawn=boss and 45 or 20}
end
make("Kabut Ambigu",Vector3.new(-15,7,-21),false)
make("Bayang Kata",Vector3.new(5,7,-26),false)
make("Siluman Ejaan",Vector3.new(40,7,-17),false)
make("Penjaga Makna",Vector3.new(-20,10,-53),true)
local function state(pl)
 if not profiles[pl] then profiles[pl]={class="pujangga",level=1,cd={},hitAt=0} end
 return profiles[pl]
end
local function setClass(pl,key)
 local cfg=classes[key];if not cfg then return end
 state(pl).class=key
 local char=pl.Character;local hum=char and char:FindFirstChildOfClass("Humanoid")
 if hum then hum.MaxHealth=cfg.hp;hum.Health=cfg.hp;hum.WalkSpeed=cfg.speed end
 send(pl,"class",{name=key,health=cfg.hp})
end
local function visual(pos,color,size)
 local part=Instance.new("Part");part.Name="Ledakan Bahasa"
 part.Shape=Enum.PartType.Ball;part.Anchored=true;part.CanCollide=false
 part.Position=pos;part.Size=Vector3.new(size,size,size)
 part.Material=Enum.Material.Neon;part.Transparency=.6;part.Color=color
 part.Parent=world;Debris:AddItem(part,.25)
end
local function hit(pl,model,amount)
 if not model:GetAttribute("Alive") then return end
 local hp=math.max(0,model:GetAttribute("Health")-amount)
 model:SetAttribute("Health",hp)
 if hp==0 then
  model:SetAttribute("Alive",false)
  enemies[model].core.Transparency=.82
  local xp=model:GetAttribute("Boss") and 150 or 30
  reward:Fire(pl,xp,"musuh:"..model.Name)
  send(pl,"message",model.Name.." dikalahkan! +"..xp.." XP")
  task.delay(enemies[model].respawn,function()
   if model.Parent then model:SetAttribute("Health",model:GetAttribute("MaxHealth"))
    model:SetAttribute("Alive",true);enemies[model].core.Transparency=0 end
  end)
 end
end
local function useSkill(pl,id)
 if type(id)~="string" or not cd[id] then return end
 local d=state(pl);if d.level<unlock[id] then send(pl,"message","Terbuka di level "..unlock[id]);return end
 local now=os.clock();if now<(d.cd[id] or 0) then return end
 local char=pl.Character;local root=char and char:FindFirstChild("HumanoidRootPart")
 local hum=char and char:FindFirstChildOfClass("Humanoid")
 if not root or not hum or hum.Health<=0 then return end
 d.cd[id]=now+cd[id]
 if id=="perisai" then
  hum.Health=math.min(hum.MaxHealth,hum.Health+20)
  local f=Instance.new("ForceField",char);Debris:AddItem(f,2.5)
  visual(root.Position,Color3.fromRGB(66,235,180),7)
 elseif id=="dash" then
  local direction=root.CFrame.LookVector
  local ray=workspace:Raycast(root.Position,direction*14)
  local destination=ray and ray.Position-direction*3 or root.Position+direction*14
  root.CFrame=CFrame.new(destination,destination+direction)
 else
  local atk=attack[id]
  local options={}
  for model,info in pairs(enemies) do
   if model:GetAttribute("Alive") then
    local offset=info.core.Position-root.Position
    local dist=offset.Magnitude
    if dist<atk.range and dist>0 and (id=="majas" or offset.Unit:Dot(root.CFrame.LookVector)>.25) then
     table.insert(options,{model=model,distance=dist})
    end
   end
  end
  table.sort(options,function(a,b)return a.distance<b.distance end)
  for i=1,math.min(#options,atk.limit) do
   local m=options[i].model
   hit(pl,m,math.floor(atk.damage*classes[d.class].damage))
   visual(enemies[m].core.Position,Color3.fromRGB(255,209,114),id=="majas" and 8 or 4)
  end
 end
 send(pl,"cooldown",{id=id,duration=cd[id]})
end
sync.Event:Connect(function(pl,level)
 if type(level)=="number" then state(pl).level=level
 send(pl,"skills",{level=level,class=state(pl).class}) end
end)
action.OnServerEvent:Connect(function(pl,kind,payload)
 if kind=="skill" then useSkill(pl,payload)
 elseif kind=="class" and type(payload)=="string" then
  local root=pl.Character and pl.Character:FindFirstChild("HumanoidRootPart")
  if root and (root.Position-Vector3.new(0,5,12)).Magnitude<22 then setClass(pl,payload) end
 end
end)
Players.PlayerAdded:Connect(function(pl)
 state(pl)
 pl.CharacterAdded:Connect(function()
  task.wait(.2);if pl.Parent then setClass(pl,state(pl).class) end
 end)
end)
Players.PlayerRemoving:Connect(function(pl)profiles[pl]=nil end)
task.spawn(function()
 while task.wait(1) do
  for _,pl in ipairs(Players:GetPlayers()) do
   local char=pl.Character;local root=char and char:FindFirstChild("HumanoidRootPart")
   local hum=char and char:FindFirstChildOfClass("Humanoid")
   local d=state(pl)
   if root and hum and hum.Health>0 and os.clock()-d.hitAt>3 then
    for m,info in pairs(enemies) do
     if m:GetAttribute("Alive") and (root.Position-info.core.Position).Magnitude<5 then
      hum:TakeDamage(m:GetAttribute("Boss") and 14 or 7)
      d.hitAt=os.clock();break
     end
    end
   end
  end
 end
end)
