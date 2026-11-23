-- Tebak Kata: 9 original levels + original 254-word clue bank.
-- No client-supplied answers, scores, or stage unlocks.
local Players=game:GetService("Players")
local Rep=game:GetService("ReplicatedStorage")
local Teleport=game:GetService("TeleportService")
local Run=game:GetService("RunService")
local Store=game:GetService("DataStoreService")
local WordBank=require(script.Parent:WaitForChild("WordBank"))
local World=require(script.Parent:WaitForChild("WorldKit"))
World.Build("tebak-kata")
local LEVELS={
 {"Pemula",6,4,6},{"Siaga",7,5,7},{"Petarung",8,6,8},
 {"Jawara",9,6,9},{"Pahlawan",10,7,10},{"Legenda",11,7,11},
 {"Dewa",12,8,12},{"Naga",13,8,13},{"Maha Guru",15,6,99},
}
local folder=Instance.new("Folder",Rep);folder.Name="BCTebakKata"
local event=Instance.new("RemoteEvent",folder);event.Name="Event"
local request=Instance.new("RemoteEvent",folder);request.Name="Request"
local sessions,profiles,busy={},{},{}
local ds;pcall(function()ds=Store:GetDataStore("BC_TebakKata_v1") end)
local function profile()
 return {unlocked=1,best={},stars={}}
end
local function save(pl)
 local p=profiles[pl];if not p or not ds then return end
 local ok,err=pcall(function()
  ds:UpdateAsync("player_"..pl.UserId,function(old)
   old=type(old)=="table" and old or profile()
   old.unlocked=math.max(tonumber(old.unlocked) or 1,p.unlocked)
   old.best=old.best or {};old.stars=old.stars or {}
   for k,v in pairs(p.best) do old.best[k]=math.max(tonumber(old.best[k]) or 0,v) end
   for k,v in pairs(p.stars) do old.stars[k]=math.max(tonumber(old.stars[k]) or 0,v) end
   return old
  end)
 end)
 if not ok then warn("[TebakKata] Store unavailable",err) end
end
local function load(pl)
 local p=profile()
 if ds then
  local ok,result=pcall(function()return ds:GetAsync("player_"..pl.UserId) end)
  if ok and type(result)=="table" then
   p.unlocked=math.clamp(tonumber(result.unlocked) or 1,1,#LEVELS)
   p.best=type(result.best)=="table" and result.best or {}
   p.stars=type(result.stars)=="table" and result.stars or {}
  end
 end
 profiles[pl]=p
 event:FireClient(pl,"ready",{unlocked=p.unlocked})
end
local function sendMenu(pl)
 local p=profiles[pl] or profile()
 local levels={}
 for i,entry in ipairs(LEVELS) do
  levels[i]={id=i,title=entry[1],rounds=entry[2],unlocked=i<=p.unlocked,
    best=p.best[tostring(i)] or 0,stars=p.stars[tostring(i)] or 0}
 end
 event:FireClient(pl,"menu",{levels=levels})
end
local function shuffle(t)
 for i=#t,2,-1 do
  local j=math.random(1,i);t[i],t[j]=t[j],t[i]
 end
end
local function selectWords(lv)
 local pool={}
 for _,w in ipairs(WordBank) do
  local length=#w.word
  if length>=lv[3] and length<=lv[4] then
   table.insert(pool,w)
  end
 end
 if #pool<lv[2] then pool=table.clone(WordBank) end
 shuffle(pool)
 local result={}
 for i=1,math.min(#pool,lv[2]) do result[i]=pool[i] end
 return result
end
local function finish(pl,s,gameOver)
 if sessions[pl]~=s or s.done then return end
 s.done=true
 local avg=s.score/#s.words
 local stars=avg>=160 and 3 or avg>=100 and 2 or avg>=40 and 1 or 0
 local p=profiles[pl] or profile()
 if not gameOver then
  local key=tostring(s.level)
  p.best[key]=math.max(p.best[key] or 0,s.score)
  p.stars[key]=math.max(p.stars[key] or 0,stars)
  p.unlocked=math.max(p.unlocked,math.min(#LEVELS,s.level+1))
  task.spawn(save,pl)
 end
 event:FireClient(pl,"result",{level=s.level,over=gameOver,score=s.score,stars=stars,
  xp=math.min(math.floor(s.score/40),60),bestStreak=s.best})
end
local function nextRound(pl,s)
 if sessions[pl]~=s or s.done then return end
 if s.round>#s.words then finish(pl,s,false) return end
 local entry=s.words[s.round]
 s.clue=1;s.guessed=false;s.hintUsed=false;s.nonce+=1
 event:FireClient(pl,"round",{nonce=s.nonce,round=s.round,total=#s.words,
  clue=entry.clues[1],clueIndex=1,clueCount=#entry.clues,
  category=entry.category,length=#entry.word,score=s.score,
  lives=s.lives,streak=s.streak})
end
local function start(pl,id)
 local p=profiles[pl]
 if not p or type(id)~="number" or id%1~=0 or id<1
  or id>p.unlocked or id>#LEVELS then return end
 local words=selectWords(LEVELS[id])
 if #words==0 then return end
 local s={level=id,words=words,round=1,lives=3,score=0,streak=0,best=0,
  done=false,nonce=0,clue=1,hintUsed=false,guessed=false}
 sessions[pl]=s
 nextRound(pl,s)
end
local function nextHint(pl,s)
 if not s or s.done or s.guessed or s.clue>=#s.words[s.round].clues then return end
 s.clue+=1;s.hintUsed=true
 event:FireClient(pl,"clue",{clue=s.words[s.round].clues[s.clue],
  clueIndex=s.clue,clueCount=#s.words[s.round].clues})
end
local function answer(pl,body)
 local s=sessions[pl]
 if not s or s.done or s.guessed or type(body)~="table"
  or body.nonce~=s.nonce or type(body.word)~="string"
  or #body.word>64 or #body.word<1 then return end
 local text=string.upper(string.gsub(body.word,"^%s*(.-)%s*$","%1"))
 local expected=s.words[s.round].word
 s.guessed=true
 if text==expected then
  local points=100+(s.clue==1 and 50 or s.clue==2 and 25 or 0)+s.streak*10
  s.score+=points;s.streak+=1;s.best=math.max(s.best,s.streak)
  event:FireClient(pl,"feedback",{correct=true,points=points,score=s.score,
   lives=s.lives,text="Tepat! "..expected})
  local token=s.nonce
  task.delay(1.1,function()
   if sessions[pl]~=s or s.nonce~=token then return end
   s.round+=1;nextRound(pl,s)
  end)
 else
  s.lives-=1;s.streak=0
  event:FireClient(pl,"feedback",{correct=false,score=s.score,lives=s.lives,
   text=s.lives>0 and "Belum tepat, coba petunjuk berikutnya!" or "Tetap semangat! Kata: "..expected})
  local token=s.nonce
  task.delay(.95,function()
   if sessions[pl]~=s or s.nonce~=token then return end
   if s.lives<=0 then finish(pl,s,true);return end
   s.guessed=false
   if s.clue<#s.words[s.round].clues then
    s.clue+=1
   end
   event:FireClient(pl,"retry",{nonce=s.nonce,clue=s.words[s.round].clues[s.clue],
    clueIndex=s.clue,clueCount=#s.words[s.round].clues,lives=s.lives})
  end)
 end
end
request.OnServerEvent:Connect(function(pl,action,data)
 if action=="menu" then sessions[pl]=nil;sendMenu(pl)
 elseif action=="start" then start(pl,data)
 elseif action=="hint" then nextHint(pl,sessions[pl])
 elseif action=="answer" then answer(pl,data)
 elseif action=="returnLobby" then
  if busy[pl] then return end
  busy[pl]=true
  if Run:IsStudio() then
   event:FireClient(pl,"message","Perpindahan diuji setelah game diterbitkan.")
   busy[pl]=nil;return
  end
  local ok,err=pcall(function()
   Teleport:TeleportAsync(83975639468986,{pl})
  end)
  if not ok then
   warn("[TebakKata] return failed",err)
   busy[pl]=nil
   event:FireClient(pl,"message","Belum berhasil kembali. Coba lagi.")
  end
 end
end)
Teleport.TeleportInitFailed:Connect(function(pl,_,_,placeId)
 if placeId==83975639468986 and pl and pl.Parent then
  busy[pl]=nil
  event:FireClient(pl,"message","Perjalanan tertunda. Coba lagi.")
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
print("[BC TebakKata] Original bank loaded:",#WordBank,"levels:",#LEVELS)
