-- Menara Cerdas: solo 12-question climb, 3 hearts, combo.
-- Only the original curated bank is included. API-personalized classroom questions
-- require separate authenticated integration before being made available.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local Teleport=game:GetService("TeleportService")
local Run=game:GetService("RunService")
local World=require(script.Parent:WaitForChild("WorldKit"))
local Bank=require(script.Parent:WaitForChild("QuestionBank"))
World.Build("menara")
local bridge=Instance.new("Folder",RS);bridge.Name="BCMenara"
local event=Instance.new("RemoteEvent",bridge);event.Name="Event"
local request=Instance.new("RemoteEvent",bridge);request.Name="Request"
local sessions,busy={},{}

local function newDeck()
 local deck=table.clone(Bank)
 for i=#deck,2,-1 do
  local j=math.random(i);deck[i],deck[j]=deck[j],deck[i]
 end
 local selected={}
 for i=1,math.min(12,#deck) do selected[i]=deck[i] end
 return selected
end
local function finish(pl,s)
 if sessions[pl]~=s or s.done then return end
 s.done=true;s.waiting=false
 event:FireClient(pl,"result",{floors=s.floors,total=#s.deck,
  bestCombo=s.best,cleared=s.floors==#s.deck})
end
local function sendRound(pl,s)
 if sessions[pl]~=s or s.done then return end
 if s.index>#s.deck then finish(pl,s);return end
 local q=s.deck[s.index]
 s.nonce+=1;s.waiting=true
 -- Only the answer options and prompt are shown; answer key remains on server.
 event:FireClient(pl,"round",{nonce=s.nonce,
  round=s.index,total=#s.deck,floors=s.floors,
  hearts=s.hearts,combo=s.combo,question=q.soal,
  options=q.opsi,category=q.kategori})
end
local function start(pl)
 local s={deck=newDeck(),index=1,floors=0,hearts=3,combo=0,best=0,
  nonce=0,waiting=false,done=false}
 sessions[pl]=s
 sendRound(pl,s)
end
local function answer(pl,data)
 local s=sessions[pl]
 if not s or not s.waiting or s.done or type(data)~="table"
  or data.nonce~=s.nonce or type(data.choice)~="number" then return end
 local q=s.deck[s.index]
 if data.choice%1~=0 or data.choice<1 or data.choice>#q.opsi then return end
 s.waiting=false
 local correct=data.choice==q.jawaban
 if correct then
  s.floors+=1;s.combo+=1;s.best=math.max(s.best,s.combo)
 else
  s.hearts-=1;s.combo=0
 end
 event:FireClient(pl,"feedback",{correct=correct,explanation=q.penjelasan,
  floors=s.floors,hearts=s.hearts,combo=s.combo})
 local token=s.nonce
 task.delay(correct and .7 or 1.4,function()
  if sessions[pl]~=s or s.done or token~=s.nonce then return end
  if s.hearts<=0 or s.index>=#s.deck then finish(pl,s)
  else s.index+=1;sendRound(pl,s) end
 end)
end
request.OnServerEvent:Connect(function(pl,action,data)
 if action=="start" then start(pl)
 elseif action=="answer" then answer(pl,data)
 elseif action=="returnLobby" then
  if busy[pl] then return end
  busy[pl]=true
  if Run:IsStudio() then
   event:FireClient(pl,"message","Teleport hanya bisa diuji setelah diterbitkan.")
   busy[pl]=nil;return
  end
  local ok,err=pcall(function()Teleport:TeleportAsync(83975639468986,{pl}) end)
  if not ok then
   busy[pl]=nil
   warn("[BC Menara] lobby teleport failed",err)
   event:FireClient(pl,"message","Gagal kembali. Silakan coba lagi.")
  end
 end
end)
Teleport.TeleportInitFailed:Connect(function(pl,_,_,placeId)
 if placeId==83975639468986 and pl and pl.Parent then
  busy[pl]=nil
  event:FireClient(pl,"message","Belum berhasil kembali. Coba lagi.")
 end
end)
Players.PlayerRemoving:Connect(function(pl)sessions[pl]=nil;busy[pl]=nil end)
print("[BC Menara] Ready:",#Bank,"original curated questions")
