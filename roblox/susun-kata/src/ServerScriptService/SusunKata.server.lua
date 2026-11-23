-- BC Susun Kata: authoritative puzzle game, rules from components/game/SusunKata.tsx.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DS=game:GetService("DataStoreService")
local TS=game:GetService("TeleportService")
local RunService=game:GetService("RunService")
local Bank=require(script.Parent:WaitForChild("WordBank"))
local LobbyPlaceId=83975639468986
local Levels={
 {"Pemula",6,0,5,30},{"Siaga",7,4,6,30},{"Petarung",8,5,7,28},
 {"Jawara",9,6,8,28},{"Pahlawan",10,6,9,26},{"Legenda",11,7,10,26},
 {"Dewa",12,7,11,24},{"Naga",13,8,12,24},{"Maha Guru",15,8,99,22},
 {"Perangkai Ulung",16,8,99,21},{"Arsitek Kata",17,9,99,20},
 {"Maestro Huruf",18,10,99,19},
}
local World=require(script.Parent:WaitForChild("WorldKit"))
World.Build("susun-kata")
local network=Instance.new("Folder",RS);network.Name="BCSusunKata"
local event=Instance.new("RemoteEvent",network);event.Name="Event"
local request=Instance.new("RemoteEvent",network);request.Name="Request"
local sessions,profiles,busy={},{},{}
local store;local ok,st=pcall(function()return DS:GetDataStore("BC_SusunKata_V1") end)
if ok then store=st end
local function fresh()return {unlocked=1,best={},stars={}} end
local function load(pl)
 local p=fresh()
 if store then
  local success,data=pcall(function()return store:GetAsync("p_"..pl.UserId) end)
  if success and type(data)=="table" then
   p.unlocked=math.clamp(tonumber(data.unlocked) or 1,1,#Levels)
   if type(data.best)=="table" then p.best=data.best end
   if type(data.stars)=="table" then p.stars=data.stars end
  end
 end
 profiles[pl]=p
 event:FireClient(pl,"profile",{unlocked=p.unlocked})
end
local function save(pl)
 local p=profiles[pl];if not store or not p then return end
 local success,err=pcall(function()
  store:UpdateAsync("p_"..pl.UserId,function(old)
   old=type(old)=="table" and old or fresh()
   old.unlocked=math.max(tonumber(old.unlocked) or 1,p.unlocked)
   old.best=old.best or {};old.stars=old.stars or {}
   for k,v in pairs(p.best) do old.best[k]=math.max(tonumber(old.best[k]) or 0,v) end
   for k,v in pairs(p.stars) do old.stars[k]=math.max(tonumber(old.stars[k]) or 0,v) end
   return old
  end)
 end)
 if not success then warn("[BC SusunKata] Failed save",err) end
end
local function menu(pl)
 local p=profiles[pl] or fresh();local items={}
 for i,l in ipairs(Levels) do
  items[i]={id=i,name=l[1],rounds=l[2],time=l[5],unlocked=i<=p.unlocked,
   best=p.best[tostring(i)] or 0,stars=p.stars[tostring(i)] or 0}
 end
 event:FireClient(pl,"menu",{levels=items})
end
local function shuffle(t)
 for i=#t,2,-1 do
  local j=math.random(i);t[i],t[j]=t[j],t[i]
 end
end
local function pickWords(cfg)
 local list={}
 for _,w in ipairs(Bank) do if #w.word>=cfg[3] and #w.word<=cfg[4] then table.insert(list,w) end end
 if #list<cfg[2] then list=table.clone(Bank) end -- original fallback
 shuffle(list)
 local selected={}
 for i=1,math.min(#list,cfg[2]) do selected[i]=list[i] end
 return selected
end
local function scramble(word)
 local letters={}
 for i=1,#word do letters[i]=word:sub(i,i) end
 for _=1,8 do
  shuffle(letters)
  if table.concat(letters)~=word then break end
 end
 if table.concat(letters)==word and #letters>1 then
  letters[1],letters[#letters]=letters[#letters],letters[1]
 end
 return letters
end
local function finish(pl,s,gameOver,reason)
 if sessions[pl]~=s or s.done then return end
 s.done=true;s.active=false
 local perRound=s.score/s.cfg[2]
 local stars=perRound>=260 and 3 or perRound>=170 and 2 or perRound>=60 and 1 or 0
 local p=profiles[pl] or fresh()
 if not gameOver and stars>=1 then
  local key=tostring(s.level)
  p.best[key]=math.max(tonumber(p.best[key]) or 0,s.score)
  p.stars[key]=math.max(tonumber(p.stars[key]) or 0,stars)
  p.unlocked=math.max(p.unlocked,math.min(#Levels,s.level+1))
  task.spawn(save,pl)
 end
 event:FireClient(pl,"result",{level=s.level,score=s.score,stars=stars,
  xp=math.min(math.floor(s.score/40),60),bestStreak=s.best,
  over=gameOver,reason=reason})
end
local function nextRound(pl,s)
 if sessions[pl]~=s or s.done then return end
 if s.round>#s.words then finish(pl,s,false,"Semua kata selesai!") return end
 local w=s.words[s.round]
 s.letters=scramble(w.word);s.nonce+=1;s.active=true
 s.deadline=os.clock()+s.cfg[5]
 event:FireClient(pl,"round",{nonce=s.nonce,round=s.round,total=#s.words,
  meaning=w.meaning,letters=s.letters,time=s.cfg[5],lives=s.lives,
  score=s.score,streak=s.streak})
end
local function start(pl,level)
 local p=profiles[pl]
 if not p or type(level)~="number" or level%1~=0 or level<1
  or level>p.unlocked or level>#Levels then return end
 local cfg=Levels[level]
 local s={level=level,cfg=cfg,words=pickWords(cfg),round=1,
  nonce=0,lives=3,score=0,streak=0,best=0,done=false,active=false}
 sessions[pl]=s
 nextRound(pl,s)
end
local function answer(pl,data)
 local s=sessions[pl]
 if not s or s.done or not s.active or type(data)~="table"
  or data.nonce~=s.nonce or type(data.indices)~="table" then return end
 local correctWord=s.words[s.round].word
 local indexList=data.indices
 if #indexList~=#correctWord then return end
 local used={};local proposed={}
 for i=1,#indexList do
  local idx=indexList[i]
  if type(idx)~="number" or idx%1~=0 or idx<1 or idx>#s.letters or used[idx] then return end
  used[idx]=true;proposed[i]=s.letters[idx]
 end
 s.active=false
 if os.clock()>=s.deadline then return end
 local correct=table.concat(proposed)==correctWord
 if correct then
  local seconds=math.max(0,math.ceil(s.deadline-os.clock()))
  local points=150+seconds*5+s.streak*15
  s.score+=points;s.streak+=1;s.best=math.max(s.best,s.streak)
  event:FireClient(pl,"feedback",{correct=true,points=points,score=s.score,lives=s.lives,
   text="Hebat! "..correctWord})
  local token=s.nonce
  task.delay(1.1,function()
   if sessions[pl]~=s or s.done or s.nonce~=token then return end
   s.round+=1;nextRound(pl,s)
  end)
 else
  s.lives-=1;s.streak=0
  event:FireClient(pl,"feedback",{correct=false,lives=s.lives,score=s.score,
   text=s.lives>0 and "Belum tepat, coba susun kembali!" or "Tetap semangat, Sobat Aksara!"})
  local token=s.nonce
  task.delay(1,function()
   if sessions[pl]~=s or s.done or s.nonce~=token then return end
   if s.lives<=0 then finish(pl,s,true,"Nyawa habis.")
   elseif os.clock()>=s.deadline then
    s.round+=1;nextRound(pl,s)
   else
    s.nonce+=1;s.active=true
    s.letters=scramble(correctWord)
    event:FireClient(pl,"retry",{nonce=s.nonce,letters=s.letters,
      remaining=math.max(0,math.ceil(s.deadline-os.clock())),lives=s.lives})
   end
  end)
 end
end
local function timedOut(pl,s)
 if sessions[pl]~=s or s.done or not s.active or os.clock()<s.deadline then return end
 s.active=false;s.lives-=1;s.streak=0
 event:FireClient(pl,"feedback",{correct=false,score=s.score,lives=s.lives,
  text="Waktu habis! Kata: "..s.words[s.round].word})
 local token=s.nonce
 task.delay(1.5,function()
  if sessions[pl]~=s or s.done or s.nonce~=token then return end
  if s.lives<=0 then finish(pl,s,true,"Nyawa habis.") else
   s.round+=1;nextRound(pl,s)
  end
 end)
end
request.OnServerEvent:Connect(function(pl,action,payload)
 if action=="menu" then sessions[pl]=nil;menu(pl)
 elseif action=="start" then start(pl,payload)
 elseif action=="answer" then answer(pl,payload)
 elseif action=="returnLobby" then
  if busy[pl] then return end
  busy[pl]=true
  if RunService:IsStudio() then
   event:FireClient(pl,"message","Teleport hanya bisa diuji setelah game diterbitkan di Roblox.")
   busy[pl]=nil;return
  end
  local success,err=pcall(function()TS:TeleportAsync(LobbyPlaceId,{pl}) end)
  if not success then
   warn("[BC SusunKata] return teleport failed",err)
   event:FireClient(pl,"message","Belum berhasil kembali. Coba lagi.")
   busy[pl]=nil
  end
 end
end)
TS.TeleportInitFailed:Connect(function(pl,_,_,placeId)
 if placeId==LobbyPlaceId and pl and pl.Parent then
  busy[pl]=nil;event:FireClient(pl,"message","Belum berhasil kembali. Coba lagi.")
 end
end)
Players.PlayerAdded:Connect(function(pl)task.spawn(load,pl) end)
for _,pl in ipairs(Players:GetPlayers()) do task.spawn(load,pl) end
Players.PlayerRemoving:Connect(function(pl)
 save(pl);sessions[pl]=nil;profiles[pl]=nil;busy[pl]=nil
end)
game:BindToClose(function()
 for _,pl in ipairs(Players:GetPlayers()) do save(pl) end
end)
task.spawn(function()
 while task.wait(.2) do
  for pl,s in pairs(sessions) do timedOut(pl,s) end
 end
end)
print("[BC SusunKata] Server ready with "..#Bank.." original words and 12 levels")
