-- Tebak Kata Roblox client: original clue rules, Roblox-native 3D venue and UI.
local Rep=game:GetService("ReplicatedStorage")
local UI=require(script.Parent:WaitForChild("BCUI"))
local net=Rep:WaitForChild("BCTebakKata")
local event=net:WaitForChild("Event")
local request=net:WaitForChild("Request")
local kit=UI.new("TEBAK KATA","Petualangan kosakata di Kota Aksara")
kit:backToLobby(request)
local nonce=nil
local score=0;local lives=3
local function menu()
 kit:compact(true)
 nonce=nil;kit:clear()
 kit:setStats("9 TINGKAT • 3 NYAWA • KUMPULKAN BINTANG")
 kit:label("Siap menebak kata dari petunjuk?",20)
 kit:label("Perhatikan petunjuk. Semakin cepat kamu menemukannya, semakin besar bonusnya.",15)
 kit:button("PILIH TINGKAT",function()request:FireServer("menu")end,"Leaf")
end
local function levels(data)
 kit:compact(false)
 kit:clear()
 kit:setStats("KLIK TINGKAT UNTUK BERMAIN")
 kit:label("Pilih tantanganmu",22)
 for _,info in ipairs(data.levels) do
  local title=(info.unlocked and "" or "TERKUNCI • ")..info.title..
   " • "..info.rounds.." KATA"
  local b=kit:button(title,function()
   if info.unlocked then request:FireServer("start",info.id) end
  end,info.unlocked and "Purple" or "Dark")
  if not info.unlocked then b.Active=false end
 end
end
local guess=nil
local clueText=nil
local active=false
local function render(data,isRetry)
 kit:compact(false)
 kit:clear()
 kit:setStats("KATA "..tostring(data.round or "?").."/"..tostring(data.total or "?")..
  "     NYAWA "..tostring(data.lives or lives)..
  "     SKOR "..tostring(data.score or score))
 kit:label(data.category and "KATEGORI: "..data.category or "PETUNJUK KATA",15)
 clueText=kit:label(data.clue or "",22)
 kit:label("PETUNJUK "..tostring(data.clueIndex or 1).."/"..
  tostring(data.clueCount or 3).." • PANJANG KATA: "..tostring(data.length or "?"),15)
 guess=Instance.new("TextBox")
 guess.Name="Jawaban"
 guess.Size=UDim2.new(1,-8,0,54)
 guess.BackgroundColor3=Color3.fromRGB(250,247,236)
 guess.TextColor3=Color3.fromRGB(29,45,55)
 guess.PlaceholderText="Ketik jawaban di sini…"
 guess.PlaceholderColor3=Color3.fromRGB(97,107,110)
 kit:rank(guess)
 guess.TextSize=23;guess.Text="";guess.ClearTextOnFocus=false
 guess.Font=Enum.Font.GothamBold;guess.Parent=kit.content
 Instance.new("UICorner",guess).CornerRadius=UDim.new(0,13)
 local submit
 submit=kit:button("JAWAB SEKARANG",function()
  if not active or not guess or guess.Text=="" then return end
  active=false
  submit.Active=false
  request:FireServer("answer",{nonce=nonce,word=guess.Text})
 end,"Leaf")
 kit:button("BUKA PETUNJUK BERIKUTNYA",function()
  if active then request:FireServer("hint") end
 end,"Purple")
 active=true
end
local current={}
local function showResult(data)
 kit:compact(true)
 nonce=nil;active=false
 kit:clear()
 kit:setStats("PERMAINAN SELESAI")
 kit:label(data.over and "TERUS BERLATIH, SOBAT AKSARA!" or "KERJA BAGUS, SOBAT AKSARA!",23)
 kit:label("SKOR "..data.score,26)
 kit:label(string.rep("★",data.stars)..string.rep("☆",3-data.stars),28)
 kit:label("BONUS XP "..data.xp.." • KOMBO TERBAIK "..data.bestStreak,16)
 kit:button("MAIN LAGI",function()request:FireServer("menu")end,"Leaf")
end
event.OnClientEvent:Connect(function(kind,data)
 if kind=="ready" then menu()
 elseif kind=="menu" then levels(data)
 elseif kind=="round" then
  nonce=data.nonce;current=data
  lives=data.lives;score=data.score
  render(data)
 elseif kind=="clue" then
  current.clue=data.clue
  current.clueIndex=data.clueIndex
  current.clueCount=data.clueCount
  kit:say("Petunjuk baru terbuka!")
  render(current)
 elseif kind=="retry" then
  current.clue=data.clue;current.clueIndex=data.clueIndex
  current.clueCount=data.clueCount;current.lives=data.lives
  render(current)
 elseif kind=="feedback" then
  score=data.score;lives=data.lives
  kit:say(data.text,data.correct)
 elseif kind=="result" then showResult(data)
 elseif kind=="message" then kit:say(tostring(data))
 end
end)
menu()
print("[BC TebakKata] Roblox user interface ready")

