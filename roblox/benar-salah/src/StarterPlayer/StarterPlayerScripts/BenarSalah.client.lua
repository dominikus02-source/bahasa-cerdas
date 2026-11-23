-- Benar atau Salah — Roblox UI. Original boolean judgment, not multiple choice.
local RS=game:GetService("ReplicatedStorage")
local Input=game:GetService("UserInputService")
local UIKit=require(script.Parent:WaitForChild("BCUI"))
local net=RS:WaitForChild("BCBenarSalah")
local event=net:WaitForChild("GameEvent")
local request=net:WaitForChild("GameRequest")
local kit=UIKit.new("BENAR ATAU SALAH","Kuis kilat • cermati pernyataan")
kit:backToLobby(request)
local nonce=nil
local locked=true
local question=nil
local deadline=0
local function showMenu()
 kit:compact(true)
 nonce=nil;locked=true;kit:clear()
 kit:setStats("9 TINGKAT • 3 NYAWA • PERMAINAN CEPAT")
 kit:label("Bisakah kamu membedakan pernyataan benar dan salah?",22)
 kit:label("Baca dengan teliti. Pilih Benar atau Salah sebelum waktu habis.",17)
 kit:button("PILIH TINGKAT",function()request:FireServer("menu")end,"Leaf")
end
local function showLevels(data)
 kit:compact(false)
 kit:clear();kit:setStats("PILIH TINGKATMU")
 kit:label("Tantangan Benar atau Salah",21)
 for _,lv in ipairs(data.levels) do
  local text=(lv.unlocked and "" or "TERKUNCI • ")..lv.name..
   " • "..lv.count.." SOAL • "..lv.time.." DETIK"
  local b=kit:button(text,function()
   if lv.unlocked then request:FireServer("start",lv.id) end
  end,lv.unlocked and "Leaf" or "Dark")
  if not lv.unlocked then b.Active=false end
 end
end
local function submit(value)
 if locked or not nonce then return end
 locked=true
 request:FireServer("answer",{nonce=nonce,value=value})
end
local function showQuestion(data)
 kit:compact(false)
 question=data;nonce=data.nonce;locked=false
 deadline=os.clock()+data.timeLeft
 kit:clear()
 kit:setStats("SOAL "..data.index.."/"..data.total..
  "   NYAWA "..data.lives.."   SKOR "..data.score.."   KOMBO "..data.combo)
 kit:label("PERNYATAAN • "..data.kategori,15)
 kit:label(data.soal,21)
 kit:label("PERIKSA PERNYATAAN BERIKUT",14)
 kit:label(data.candidate,23)
 kit:button("BENAR",function()submit(true)end,"Leaf")
 kit:button("SALAH",function()submit(false)end,"Rose")
 kit:label("Tombol PC: B atau panah kiri = Benar; S atau panah kanan = Salah.",12)
end
Input.InputBegan:Connect(function(input,processed)
 if processed or not question or locked then return end
 if input.KeyCode==Enum.KeyCode.B or input.KeyCode==Enum.KeyCode.Left then submit(true)
 elseif input.KeyCode==Enum.KeyCode.S or input.KeyCode==Enum.KeyCode.Right then submit(false)
 end
end)
event.OnClientEvent:Connect(function(kind,data)
 if kind=="profile" then showMenu()
 elseif kind=="menu" then showLevels(data)
 elseif kind=="question" then showQuestion(data)
 elseif kind=="feedback" then
  locked=true
  kit:say(data.correct and "BENAR! Jawabanmu tepat."
   or "Belum tepat. "..data.explanation,data.correct)
 elseif kind=="result" then
  kit:compact(true)
  nonce=nil;locked=true;question=nil
  kit:clear()
  kit:setStats("PERMAINAN SELESAI")
  kit:label(data.gameOver and "TETAP SEMANGAT!" or "KERJA BAGUS, SOBAT AKSARA!",22)
  kit:label("SKOR "..data.score.."  •  AKURASI "..data.accuracy.."%",19)
  kit:label(string.rep("★",data.stars)..string.rep("☆",3-data.stars),27)
  kit:label("XP "..data.xpEarned.." • KOMBO TERBAIK "..data.maxCombo,16)
  kit:button("MAIN LAGI",function()request:FireServer("menu")end,"Leaf")
 elseif kind=="message" then kit:say(tostring(data)) end
end)
showMenu()
print("[BC BenarSalah] Premium Roblox judgment HUD ready")
