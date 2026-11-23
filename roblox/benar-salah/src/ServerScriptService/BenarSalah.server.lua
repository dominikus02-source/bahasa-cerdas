-- Benar atau Salah / BahasaCerdas â€” authoritative solo game server.
-- Rules mirrored from components/game/BenarSalah.tsx, questions from lib/game/question-bank*.ts.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local TeleportService=game:GetService("TeleportService")
local DataStoreService=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Bank=require(script.Parent:WaitForChild("QuestionBank"))
local LOBBY_PLACE_ID=83975639468986
local LEVELS={
 {name="Pemula",count=8,time=60},
 {name="Siaga",count=10,time=55},
 {name="Petarung",count=12,time=55},
 {name="Jawara",count=14,time=50},
 {name="Pahlawan",count=15,time=50},
 {name="Legenda",count=18,time=45},
 {name="Dewa",count=20,time=45},
 {name="Naga",count=20,time=40}, -- web API caps original 22 requested to 20
 {name="Maha Guru",count=20,time=40}, -- web API caps original 25 requested to 20
}
local WorldKit=require(script.Parent:WaitForChild("WorldKit"))
WorldKit.Build("benar-salah")

local folder=Instance.new("Folder",RS);folder.Name="BCBenarSalah"
local remote=Instance.new("RemoteEvent",folder);remote.Name="GameEvent"
local requests=Instance.new("RemoteEvent",folder);requests.Name="GameRequest"
local sessions,profiles,lastAction={},{},{}
local store=nil
local ok,thing=pcall(function()return DataStoreService:GetDataStore("BC_BenarSalah_V1") end)
if ok then store=thing end
local function defaultProfile()return {unlocked=1,best={},stars={}} end
local function load(player)
 local value=defaultProfile()
 if store then
  local succeeded,data=pcall(function()return store:GetAsync("u_"..player.UserId) end)
  if succeeded and type(data)=="table" then
   value.unlocked=math.clamp(tonumber(data.unlocked) or 1,1,9)
   if type(data.best)=="table" then value.best=data.best end
   if type(data.stars)=="table" then value.stars=data.stars end
  end
 end
 profiles[player]=value
 remote:FireClient(player,"profile",value)
end
local function save(player)
 local value=profiles[player]
 if not store or not value then return end
 local succeeded,err=pcall(function()
  store:UpdateAsync("u_"..player.UserId,function(old)
   old=type(old)=="table" and old or defaultProfile()
   old.unlocked=math.max(tonumber(old.unlocked) or 1,value.unlocked)
   old.best=old.best or {};old.stars=old.stars or {}
   for level,points in pairs(value.best) do
    old.best[level]=math.max(tonumber(old.best[level]) or 0,points)
   end
   for level,stars in pairs(value.stars) do
    old.stars[level]=math.max(tonumber(old.stars[level]) or 0,stars)
   end
   return old
  end)
 end)
 if not succeeded then warn("[BC BenarSalah] Progress save retry later: "..tostring(err)) end
end
local function publicLevels(profile)
 local items={}
 for i,level in ipairs(LEVELS) do
  items[i]={id=i,name=level.name,count=level.count,time=level.time,unlocked=i<=profile.unlocked,
   best=profile.best[tostring(i)] or 0,stars=profile.stars[tostring(i)] or 0}
 end
 return items
end
local function sendMenu(player)
 local p=profiles[player] or defaultProfile()
 remote:FireClient(player,"menu",{levels=publicLevels(p)})
end
local function shuffledQuestions(n)
 local chosen={}
 local indexes={}
 for i=1,#Bank do indexes[i]=i end
 for i=#indexes,2,-1 do
  local j=math.random(i)
  indexes[i],indexes[j]=indexes[j],indexes[i]
 end
 for i=1,math.min(n,#indexes) do chosen[i]=Bank[indexes[i]] end
 return chosen
end
local function finish(player,s,gameOver,reason)
 if sessions[player]~=s or s.done then return end
 s.done=true
 local count=s.correct+s.wrong
 local accuracy=count>0 and math.floor(s.correct/count*100+.5) or 0
 local stars=0
 if not gameOver then
  if accuracy>=90 then stars=3 elseif accuracy>=70 then stars=2 elseif accuracy>=40 then stars=1 end
 end
 local xpEarned=math.min(math.floor(s.score/40),60) -- exact web formula, not BC account XP.
 local p=profiles[player] or defaultProfile()
 if not gameOver and stars>=1 then
  local key=tostring(s.level)
  p.best[key]=math.max(p.best[key] or 0,s.score)
  p.stars[key]=math.max(p.stars[key] or 0,stars)
  p.unlocked=math.max(p.unlocked,math.min(9,s.level+1))
  task.spawn(save,player)
 end
 remote:FireClient(player,"result",{
  score=s.score,correct=s.correct,wrong=s.wrong,accuracy=accuracy,
  stars=stars,xpEarned=xpEarned,maxCombo=s.bestCombo,gameOver=gameOver,
  reason=reason,level=s.level,levels=publicLevels(p),
 })
end
local function nextQuestion(player,s)
 if sessions[player]~=s or s.done then return end
 if s.index>#s.questions then finish(player,s,false,"Semua soal selesai!") return end
 local q=s.questions[s.index]
 -- Same as the web component: half the time present the correct option;
 -- otherwise show a randomly chosen incorrect option. The player judges it.
 local chooseCorrect=(math.random(1,2)==1)
 local candidate=q.jawaban
 if not chooseCorrect then
  local others={}
  for i=1,#q.opsi do if i~=q.jawaban then table.insert(others,i) end end
  candidate=others[math.random(1,#others)]
 end
 s.candidate=candidate
 s.canAnswer=true
 s.nonce+=1
 remote:FireClient(player,"question",{
  nonce=s.nonce,index=s.index,total=#s.questions,
  soal=q.soal,candidate=q.opsi[candidate],kategori=q.kategori,
  timeLeft=math.max(0,math.ceil(s.deadline-os.clock())),
  lives=s.lives,score=s.score,combo=s.combo,level=s.level,
 })
end
local function start(player,level)
 local p=profiles[player]
 if not p then remote:FireClient(player,"message","Progres sedang dimuat. Coba lagi.") return end
 if type(level)~="number" or level%1~=0 or level<1 or level>p.unlocked or level>9 then return end
 local now=os.clock()
 if now-(lastAction[player] or -100)<.6 then return end
 lastAction[player]=now
 local cfg=LEVELS[level]
 local s={level=level,questions=shuffledQuestions(cfg.count),index=1,score=0,correct=0,
 wrong=0,lives=3,combo=0,bestCombo=0,deadline=now+cfg.time,nonce=0,canAnswer=false,done=false}
 sessions[player]=s
 nextQuestion(player,s)
end
local function answer(player,data)
 local s=sessions[player]
 if not s or s.done or not s.canAnswer or type(data)~="table" then return end
 if type(data.nonce)~="number" or data.nonce~=s.nonce or type(data.value)~="boolean" then return end
 if os.clock()>=s.deadline then finish(player,s,false,"Waktu habis!") return end
 s.canAnswer=false -- invalidate immediately before any work or yield
 local q=s.questions[s.index]
 local correct=((s.candidate==q.jawaban)==data.value)
 if correct then
  s.score+=1;s.correct+=1;s.combo+=1
  s.bestCombo=math.max(s.combo,s.bestCombo)
 else
  s.wrong+=1;s.lives-=1;s.combo=0
 end
 local over=s.lives<=0
 local complete=s.index>=#s.questions
 remote:FireClient(player,"feedback",{
  correct=correct,explanation=q.penjelasan,
  actualAnswer=q.opsi[q.jawaban],score=s.score,combo=s.combo,lives=s.lives,
  isLast=over or complete,
 })
 s.index+=1
 local expected=s.nonce
 task.delay(correct and .6 or .95,function()
  if sessions[player]~=s or s.done or s.nonce~=expected then return end
  if over then finish(player,s,true,"Tiga nyawa habis.")
  elseif complete then finish(player,s,false,"Semua soal selesai!")
  else nextQuestion(player,s) end
 end)
end
local teleportBusy={}
local lastReturnAttempt={}
local function back(player)
 if teleportBusy[player] then return end
 if os.clock()-(lastReturnAttempt[player] or -100)<2 then return end
 lastReturnAttempt[player]=os.clock()
 if RunService:IsStudio() then
  remote:FireClient(player,"message","Kembali ke lobby perlu diuji setelah kedua place diterbitkan di Roblox.")
  return
 end
 teleportBusy[player]=true
 remote:FireClient(player,"message","Kembali ke Kota Aksara...")
 local ok,err=pcall(function()
  TeleportService:TeleportAsync(LOBBY_PLACE_ID,{player})
 end)
 if not ok then
  warn("[BC BenarSalah] Return teleport: "..tostring(err))
  remote:FireClient(player,"message","Belum berhasil kembali. Coba tombol Kembali lagi.")
  teleportBusy[player]=nil
 end
end
requests.OnServerEvent:Connect(function(player,action,payload)
 if type(action)~="string" then return end
 if action=="start" then start(player,payload)
 elseif action=="answer" then answer(player,payload)
 elseif action=="menu" then sessions[player]=nil;sendMenu(player)
 elseif action=="returnLobby" then back(player)
 end
end)
TeleportService.TeleportInitFailed:Connect(function(player,result,errorMessage,placeId)
 if placeId==LOBBY_PLACE_ID and player and player.Parent then
  teleportBusy[player]=nil
  remote:FireClient(player,"message","Perjalanan ke lobby belum berhasil. Coba lagi.")
 end
end)
Players.PlayerAdded:Connect(function(player)
 task.spawn(function()load(player) end)
end)
for _,player in Players:GetPlayers() do task.spawn(function()load(player) end) end
Players.PlayerRemoving:Connect(function(player)
 save(player)
 sessions[player]=nil;profiles[player]=nil;lastAction[player]=nil;teleportBusy[player]=nil;lastReturnAttempt[player]=nil
end)
task.spawn(function()
 while task.wait(.25) do
  local now=os.clock()
  for player,s in pairs(sessions) do
   if not s.done and now>=s.deadline then
    s.canAnswer=false
    finish(player,s,false,"Waktu habis!")
   end
  end
 end
end)
print("[BC BenarSalah] Server ready, questions="..#Bank.." lobby="..LOBBY_PLACE_ID)

