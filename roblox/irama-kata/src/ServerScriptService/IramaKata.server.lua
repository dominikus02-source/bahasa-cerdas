-- Irama Kata Roblox • 4 lanes, original 9 levels, exact timing and scoring.
-- Server judges each lane tap and missed valid note, never trusts client score.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local Run=game:GetService("RunService")
local Store=game:GetService("DataStoreService")
local Teleport=game:GetService("TeleportService")
local World=require(script.Parent:WaitForChild("WorldKit"))
local Lists=require(script.Parent:WaitForChild("ContentBank"))
World.Build("irama-kata")
local groups={}
for _,g in ipairs(Lists) do groups[g.group]=g.words end
local LEVELS={
 {"Baku Pemula","BAKU",46,30,.55},
 {"Benda di Sekitar","BENDA",50,32,.58},
 {"Aksi Cepat","KERJA",54,34,.6},
 {"Sifat Kilat","SIFAT",58,36,.62},
 {"Baku Lanjut","BAKU",62,38,.66},
 {"Benda Ngebut","BENDA",66,40,.7},
 {"Kerja Keras","KERJA",71,42,.74},
 {"Sifat Super","SIFAT",76,45,.78},
 {"Master Baku","BAKU",82,50,.82},
}
local net=Instance.new("Folder",RS);net.Name="BCIrama"
local event=Instance.new("RemoteEvent",net);event.Name="Event"
local request=Instance.new("RemoteEvent",net);request.Name="Request"
local profiles,sessions,busy={},{},{}
local store;pcall(function()store=Store:GetDataStore("BC_IramaKata_V1") end)
local function getPools(rule)
 if rule=="BAKU" then return groups.BAKU,groups.NONBAKU end
 local valid=groups[rule]
 local invalid={}
 for _,category in ipairs({"BENDA","KERJA","SIFAT"}) do
  if category~=rule then
   for _,word in ipairs(groups[category]) do table.insert(invalid,word) end
  end
 end
 return valid,invalid
end
local function init(pl)
 local profile={unlocked=1,best={}}
 if store then
  local ok,data=pcall(function()return store:GetAsync("id_"..pl.UserId) end)
  if ok and type(data)=="table" then
   profile.unlocked=math.clamp(tonumber(data.unlocked) or 1,1,#LEVELS)
   profile.best=type(data.best)=="table" and data.best or {}
  end
 end
 profiles[pl]=profile
 event:FireClient(pl,"profile",{})
end
local function save(pl)
 local p=profiles[pl]
 if not p or not store then return end
 pcall(function()
  store:UpdateAsync("id_"..pl.UserId,function(old)
   old=type(old)=="table" and old or {unlocked=1,best={}}
   old.unlocked=math.max(tonumber(old.unlocked) or 1,p.unlocked)
   old.best=old.best or {}
   for k,v in pairs(p.best) do old.best[k]=math.max(tonumber(old.best[k]) or 0,v) end
   return old
  end)
 end)
end
local function menu(pl)
 local p=profiles[pl] or {unlocked=1,best={}}
 local items={}
 for i,l in ipairs(LEVELS) do
  items[i]={id=i,name=l[1],rule=l[2],bpm=l[3],duration=l[4],
   unlocked=i<=p.unlocked,best=p.best[tostring(i)] or 0}
 end
 event:FireClient(pl,"menu",{levels=items})
end
local function finish(pl,s,over)
 if sessions[pl]~=s or s.done then return end
 s.done=true
 local total=s.stats.pas+s.stats.bagus+s.stats.meleset+s.stats.salah
 local acc=total>0 and math.floor((s.stats.pas+s.stats.bagus)/total*100+.5) or 0
 local stars=s.score>=4500 and 3 or s.score>=2500 and 2 or s.score>=900 and 1 or 0
 if not over then
  local p=profiles[pl]
  if p then
   p.unlocked=math.max(p.unlocked,math.min(#LEVELS,s.level+1))
   local key=tostring(s.level)
   p.best[key]=math.max(p.best[key] or 0,s.score)
   task.spawn(save,pl)
  end
 end
 event:FireClient(pl,"result",{score=s.score,stars=stars,over=over,
  accuracy=acc,maxCombo=s.best,stats=s.stats,level=s.level})
end
local function start(pl,level)
 local p=profiles[pl]
 if not p or type(level)~="number" or level%1~=0
  or level<1 or level>#LEVELS or level>p.unlocked then return end
 local cfg=LEVELS[level]
 local valid,invalid=getPools(cfg[2])
 if not valid or not invalid or #valid==0 or #invalid==0 then return end
 local startTime=os.clock()+2
 local beat=60/cfg[3]
 local total=math.floor(cfg[4]/beat)
 local notes={}
 local lastLane=0
 for i=0,total-1 do
  if math.random()<=cfg[5] then
   local lane
   repeat lane=math.random(1,4) until lane~=lastLane or math.random()>=.6
   lastLane=lane
   local validWord=math.random()<.55
   local pool=validWord and valid or invalid
   table.insert(notes,{time=startTime+i*beat+2,lane=lane,
    word=pool[math.random(#pool)],valid=validWord,sent=false,ended=false})
  end
 end
 local s={level=level,cfg=cfg,notes=notes,score=0,combo=0,best=0,
  lives=3,done=false,endTime=startTime+cfg[4]+2.5,
  stats={pas=0,bagus=0,meleset=0,salah=0}}
 sessions[pl]=s
 event:FireClient(pl,"start",{name=cfg[1],rule=cfg[2],
  duration=cfg[4],bpm=cfg[3],noteCount=#notes,lives=3})
end
local function tap(pl,lane)
 local s=sessions[pl]
 if not s or s.done or type(lane)~="number"
  or lane%1~=0 or lane<1 or lane>4 then return end
 local now=os.clock();local target=nil;local best=math.huge
 for _,note in ipairs(s.notes) do
  if note.lane==lane and not note.ended then
   local distance=math.abs(note.time-now)
   if distance<best then best=distance;target=note end
  end
 end
 if not target or best>=.22 then return end
 target.ended=true
 local correct=target.valid
 local perfect=best<.11
 local points=0
 if correct then
  points=(perfect and 100 or 50)+math.floor(s.combo/8)*15
  s.score+=points;s.combo+=1;s.best=math.max(s.best,s.combo)
  if perfect then s.stats.pas+=1 else s.stats.bagus+=1 end
 else
  s.combo=0;s.score=math.max(0,s.score-30);s.stats.salah+=1
 end
 event:FireClient(pl,"feedback",{lane=lane,correct=correct,
  perfect=perfect,score=s.score,combo=s.combo,lives=s.lives,
  points=points,word=target.word})
end
request.OnServerEvent:Connect(function(pl,action,data)
 if action=="menu" then sessions[pl]=nil;menu(pl)
 elseif action=="start" then start(pl,data)
 elseif action=="tap" then tap(pl,data)
 elseif action=="returnLobby" then
  if busy[pl] then return end
  busy[pl]=true
  if Run:IsStudio() then
   event:FireClient(pl,"message","Teleport diuji setelah diterbitkan di Roblox.")
   busy[pl]=nil;return
  end
  local ok,err=pcall(function()Teleport:TeleportAsync(83975639468986,{pl}) end)
  if not ok then
   warn("[BC Irama] teleport failed",err)
   busy[pl]=nil
   event:FireClient(pl,"message","Belum berhasil kembali. Coba lagi.")
  end
 end
end)
Teleport.TeleportInitFailed:Connect(function(pl,_,_,placeId)
 if placeId==83975639468986 and pl and pl.Parent then
  busy[pl]=nil;event:FireClient(pl,"message","Belum berhasil kembali. Coba lagi.")
 end
end)
Players.PlayerAdded:Connect(function(pl)task.spawn(init,pl) end)
for _,pl in ipairs(Players:GetPlayers()) do task.spawn(init,pl) end
Players.PlayerRemoving:Connect(function(pl)
 save(pl);sessions[pl]=nil;profiles[pl]=nil;busy[pl]=nil
end)
task.spawn(function()
 while task.wait(.06) do
  local now=os.clock()
  for pl,s in pairs(sessions) do
   if not s.done then
    for i,n in ipairs(s.notes) do
     if not n.sent and now>=n.time-2.4 then
      n.sent=true
      event:FireClient(pl,"note",{id=i,lane=n.lane,word=n.word,
       remaining=math.max(.05,n.time-now)})
     end
     if not n.ended and now>=n.time+.22 then
      n.ended=true
      if n.valid then
       s.lives-=1;s.combo=0;s.stats.meleset+=1
       event:FireClient(pl,"miss",{lives=s.lives,word=n.word})
      end
     end
    end
    if s.lives<=0 then finish(pl,s,true)
    elseif now>=s.endTime then finish(pl,s,false) end
   end
  end
 end
end)
print("[BC IramaKata] 9 original rhythm levels, 4 lanes, categorized words loaded")
