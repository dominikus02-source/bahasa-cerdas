-- Menara Cerdas: Roblox touch and keyboard interface to original 12-round climb.
local Rep=game:GetService("ReplicatedStorage")
local UIKit=require(script.Parent:WaitForChild("BCUI"))
local net=Rep:WaitForChild("BCMenara")
local event=net:WaitForChild("Event")
local request=net:WaitForChild("Request")
local ui=UIKit.new("MENARA CERDAS","Panjat menara dengan pengetahuanmu")
ui:backToLobby(request)
local nonce=nil;local locked=false
local function startScreen()
 ui:compact(true)
 ui:clear()
 ui:setStats("12 SOAL • 3 NYAWA • NAIK SETIAP JAWABAN BENAR")
 ui:label("SEBERAPA TINGGI KAMU BISA NAIK?",22)
 ui:label("Pilih jawaban yang tepat untuk naik satu lantai. Jawaban yang belum tepat mengurangi satu nyawa.",17)
 ui:button("MULAI MEMANJAT",function()
  request:FireServer("start")
 end,"Leaf")
end
event.OnClientEvent:Connect(function(kind,d)
 if kind=="round" then
  ui:compact(false)
  nonce=d.nonce;locked=false
  ui:clear()
  ui:setStats("LANTAI "..d.floors.."/"..d.total.."  •  NYAWA "..d.hearts..
    "  •  KOMBO "..d.combo)
  ui:label("SOAL "..d.round.."/"..d.total.." • "..d.category,14)
  ui:label(d.question,21)
  for i,opt in ipairs(d.options) do
   ui:button(string.char(64+i)..". "..opt,function()
    if locked then return end
    locked=true
    request:FireServer("answer",{nonce=nonce,choice=i})
   end,i%2==0 and "Purple" or "Leaf")
  end
 elseif kind=="feedback" then
  ui:say(d.correct and "HEBAT! Naik satu lantai." or "Belum tepat. "..d.explanation,d.correct)
 elseif kind=="result" then
  ui:compact(true)
  ui:clear()
  ui:setStats("LANTAI "..d.floors.."/"..d.total)
  ui:label(d.cleared and "PUNCAK MENARA TERCAPAI!" or "PETUALANGANMU BERAKHIR DI SINI",24)
  ui:label("Lantai: "..d.floors.."   •   Kombo terbaik: "..d.bestCombo,20)
  ui:button("COBA LAGI",function()request:FireServer("start")end,"Leaf")
 elseif kind=="message" then ui:say(tostring(d)) end
end)
startScreen()
print("[BC Menara] UI ready")
