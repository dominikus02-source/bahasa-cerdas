-- Petualangan Kata: physical category collection challenge, distinct from menu-based quizzes.
-- Player runs to one of three fixed forest gates to classify a word. Source: ZelbyDash.
local RS=game:GetService("ReplicatedStorage")
local Players=game:GetService("Players")
local Run=game:GetService("RunService")
local Teleport=game:GetService("TeleportService")
local World=require(script.Parent:WaitForChild("WorldKit"))
local config=require(RS:WaitForChild("GameConfig"))
local groups=require(script.Parent:WaitForChild("ContentBank"))
local arena=World.Build(config.id)
local bridge=Instance.new("Folder")
bridge.Name="BCForestBridge";bridge.Parent=RS
local event=Instance.new("RemoteEvent")
event.Name="Event";event.Parent=bridge
local sessions={}
local cooldown={}
local rng=Random.new()
local groupNames={
 KATA_BENDA="KATA BENDA",KATA_KERJA="KATA KERJA",KATA_SIFAT="KATA SIFAT"
}
local palette={
 Color3.fromRGB(104,160,126),Color3.fromRGB(118,173,194),Color3.fromRGB(217,169,106)
}
local pads={}
local function part(name,sz,cf,color)
 local p=Instance.new("Part")
 p.Name=name;p.Size=sz;p.CFrame=cf;p.Anchored=true
 p.Color=color;p.Material=Enum.Material.SmoothPlastic
 p.Parent=arena
 return p
end
local function board(p,words)
 local gui=Instance.new("BillboardGui")
 gui.Name="LabelKategori";gui.Adornee=p;gui.Size=UDim2.fromOffset(172,58)
 gui.StudsOffsetWorldSpace=Vector3.new(0,8,0)
 gui.MaxDistance=90;gui.Parent=p
 local label=Instance.new("TextLabel",gui)
 label.Size=UDim2.fromScale(1,1)
 label.BackgroundColor3=Color3.fromRGB(31,48,57)
 label.TextColor3=Color3.fromRGB(250,245,231)
 label.Font=Enum.Font.GothamBold;label.TextSize=18
 label.TextWrapped=true;label.Text=words
 Instance.new("UICorner",label).CornerRadius=UDim.new(0,12)
end
for i,entry in ipairs(groups) do
 local x=(i-2)*19
 local base=part("Zona "..groupNames[entry.group],Vector3.new(15,.6,12),CFrame.new(x,3.1,-19),palette[i])
 base.CanCollide=true
 local post=part("Penanda "..groupNames[entry.group],Vector3.new(1,10,1),CFrame.new(x,8.5,-24),palette[i])
 board(post,groupNames[entry.group])
 local prompt=Instance.new("ProximityPrompt",post)
 prompt.Name="TangkapKata";prompt.ActionText="Pilih Kategori"
 prompt.ObjectText=groupNames[entry.group]
 prompt.MaxActivationDistance=13
 prompt.HoldDuration=.15
 prompt.RequiresLineOfSight=false
 pads[i]={post=post,prompt=prompt,group=entry.group}
end
local function nextRound(player,s)
 if s.round>12 then
  event:FireClient(player,"finished",{score=s.score,total=120})
  sessions[player]=nil
  return
 end
 local i=rng:NextInteger(1,#groups)
 local group=groups[i]
 local word=group.words[rng:NextInteger(1,#group.words)]
 s.answer=group.group;s.awaiting=true;s.resolved=false
 event:FireClient(player,"round",{
  round=s.round,total=12,word=string.upper(word),score=s.score
 })
end
for _,pad in ipairs(pads) do
 pad.prompt.Triggered:Connect(function(player)
  local s=sessions[player]
  if not s or not s.awaiting then
   event:FireClient(player,"message","Tekan Mulai Jelajah terlebih dahulu.")
   return
  end
  local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  local hrp=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  if not hrp or not humanoid or humanoid.Health<=0 or (hrp.Position-pad.post.Position).Magnitude>16 then return end
  local now=os.clock()
  if now-(cooldown[player] or -100)<.5 then return end
  cooldown[player]=now
  s.awaiting=false;s.resolved=true
  local correct=pad.group==s.answer
  if correct then s.score+=10 end
  event:FireClient(player,"feedback",{
   correct=correct,selected=groupNames[pad.group],answer=groupNames[s.answer],
   score=s.score,round=s.round
  })
 end)
end
event.OnServerEvent:Connect(function(player,action)
 if action=="start" then
  sessions[player]={score=0,round=1}
  nextRound(player,sessions[player])
 elseif action=="next" then
  local s=sessions[player]
  if not s or not s.resolved or s.awaiting then return end
  s.round+=1;s.resolved=false
  nextRound(player,s)
 elseif action=="returnLobby" then
  if Run:IsStudio() then
   event:FireClient(player,"message","Uji teleport dari aplikasi Roblox setelah place diterbitkan.")
   return
  end
  local ok,err=pcall(function()
   Teleport:TeleportAsync(83975639468986,{player})
  end)
  if not ok then
   warn("[Forest] Return lobby failed",err)
   event:FireClient(player,"message","Perjalanan gagal, silakan ulangi.")
  end
 end
end)
Players.PlayerRemoving:Connect(function(p)
 sessions[p]=nil;cooldown[p]=nil
end)
print("[BC Forest] Physical category game ready, groups="..#groups)
