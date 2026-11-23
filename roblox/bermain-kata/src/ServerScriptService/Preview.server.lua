-- Bermain Kata: four server-authoritative modes built from the verified 78-word bank.
-- No web/API questions are fabricated. Player sessions stay server-side.
local Rep=game:GetService("ReplicatedStorage")
local Players=game:GetService("Players")
local Teleport=game:GetService("TeleportService")
local Run=game:GetService("RunService")
local GameConfig=require(Rep:WaitForChild("GameConfig"))
local World=require(script.Parent:WaitForChild("WorldKit"))
local bank=require(script.Parent:WaitForChild("ContentBank"))
World.Build(GameConfig.id)
local bridge=Instance.new("Folder")
bridge.Name="BCWordPlayBridge";bridge.Parent=Rep
local request=Instance.new("RemoteEvent")
request.Name="Request";request.Parent=bridge
local response=Instance.new("RemoteEvent")
response.Name="Response";response.Parent=bridge
local allowed={susun=true,rumpang=true,pasangan=true,makna=true}
local sessions={}
local rng=Random.new()
local function sortedWord(w)
 local chars={}
 for i=1,#w do chars[i]=w:sub(i,i) end
 for i=#chars,2,-1 do
  local j=rng:NextInteger(1,i)
  chars[i],chars[j]=chars[j],chars[i]
 end
 local output=table.concat(chars)
 if output==w and #chars>1 then chars[1],chars[2]=chars[2],chars[1];output=table.concat(chars) end
 return output
end
local function optionsFor(index,field)
 local current=bank[index]
 local pool={}
 for i,item in ipairs(bank) do
  if i~=index and item[field]~=current[field] then table.insert(pool,i) end
 end
 local opts={index}
 for k=1,3 do
  local selected=rng:NextInteger(1,#pool)
  table.insert(opts,pool[selected])
  table.remove(pool,selected)
 end
 for i=#opts,2,-1 do
  local j=rng:NextInteger(1,i)
  opts[i],opts[j]=opts[j],opts[i]
 end
 local displayed={}
 for i,idx in ipairs(opts) do displayed[i]=bank[idx][field] end
 return displayed,bank[index][field]
end
local function newRound(player,s)
 local index=rng:NextInteger(1,#bank)
 if #bank>1 and index==s.lastIndex then index=(index%#bank)+1 end
 s.lastIndex=index
 local item=bank[index]
 local payload={mode=s.mode,score=s.score,round=s.round,maxRounds=10,category=item.category}
 if s.mode=="susun" then
  payload.prompt="Rakit huruf ini menjadi kata yang tepat"
  payload.visual=sortedWord(item.word)
  payload.hint=item.hint
  s.answer=item.word
 elseif s.mode=="rumpang" then
  local word=item.word
  local places={}
  for i=1,#word do if word:sub(i,i):match("%a") then table.insert(places,i) end end
  local hideCount=math.max(1,math.floor(#places/3))
  local mask={}
  for i=1,#word do mask[i]=word:sub(i,i) end
  for _=1,hideCount do
   local j=rng:NextInteger(1,#places)
   mask[places[j]]="_"
   table.remove(places,j)
  end
  payload.prompt="Lengkapi kata rumpang berdasarkan petunjuk"
  payload.visual=table.concat(mask)
  payload.hint=item.hint
  s.answer=word
 elseif s.mode=="pasangan" then
  payload.prompt="Pilih petunjuk yang sesuai dengan kata"
  payload.visual=item.word
  payload.options,s.answer=optionsFor(index,"hint")
 else
  payload.prompt="Pilih kata yang sesuai dengan makna berikut"
  payload.visual=item.hint
  payload.options,s.answer=optionsFor(index,"word")
 end
 s.awaiting=true
 response:FireClient(player,"round",payload)
end
local function cleanAnswer(value)
 if type(value)~="string" then return nil end
 if #value>120 then return nil end
 local result=value:upper():gsub("^%s+",""):gsub("%s+$","")
 return result
end
local rate={}
request.OnServerEvent:Connect(function(player,action,value)
 if type(action)~="string" then return end
 local now=os.clock()
 if now-(rate[player] or -100)<.17 then return end
 rate[player]=now
 if action=="start" then
  if not allowed[value] then return end
  local s={mode=value,score=0,round=1,awaiting=false,lastIndex=0}
  sessions[player]=s
  newRound(player,s)
 elseif action=="answer" then
  local s=sessions[player]
  if not s or not s.awaiting then return end
  local candidate=cleanAnswer(value)
  if not candidate then return end
  s.awaiting=false
  local correct=candidate==cleanAnswer(s.answer)
  if correct then s.score+=10 end
  response:FireClient(player,"feedback",{
   correct=correct,answer=s.answer,score=s.score,
   round=s.round,done=s.round>=10
  })
 elseif action=="next" then
  local s=sessions[player]
  if not s or s.awaiting then return end
  if s.round>=10 then
   response:FireClient(player,"finished",{score=s.score,total=100,mode=s.mode})
   sessions[player]=nil
  else
   s.round+=1
   newRound(player,s)
  end
 elseif action=="returnLobby" then
  if Run:IsStudio() then
   response:FireClient(player,"message","Perpindahan lobby diuji melalui aplikasi Roblox, bukan Play Solo.")
   return
  end
  local ok,err=pcall(function()Teleport:TeleportAsync(83975639468986,{player})end)
  if not ok then
   warn("[BC Bermain Kata] Lobby teleport failed: "..tostring(err))
   response:FireClient(player,"message","Belum dapat kembali ke Kota Aksara. Coba lagi.")
  end
 end
end)
Players.PlayerRemoving:Connect(function(player)
 sessions[player]=nil;rate[player]=nil
end)
print("[BC Bermain Kata] 4 modes ready, canonical entries="..#bank)
