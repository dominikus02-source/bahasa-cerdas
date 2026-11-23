-- Bermain Kata: four accessible, clean game modes, driven by the authoritative server.
local Rep=game:GetService("ReplicatedStorage")
local config=require(Rep:WaitForChild("GameConfig"))
local UI=require(script.Parent:WaitForChild("BCUI"))
local bridge=Rep:WaitForChild("BCWordPlayBridge")
local request=bridge:WaitForChild("Request")
local response=bridge:WaitForChild("Response")
local ui=UI.new("BERMAIN KATA","Empat cara menemukan makna")
ui:compact(false)
ui:backToLobby(request)
local modes={
 {id="susun",name="Bengkel Susun",description="Rakit huruf acak menjadi kata"},
 {id="rumpang",name="Ruang Rumpang",description="Lengkapi bagian kata yang hilang"},
 {id="pasangan",name="Jembatan Pasangan",description="Cocokkan kata dengan petunjuk"},
 {id="makna",name="Galeri Makna",description="Temukan kata dari arti"},
}
local function welcome()
 ui:clear()
 ui:setStats("EMPAT MODE • 10 SOAL PER PUTARAN")
 ui:label("Pilih tantanganmu",22)
 for _,mode in ipairs(modes) do
  ui:button(mode.name.." — "..mode.description,function()
   request:FireServer("start",mode.id)
   ui:setStats("Menyiapkan soal...")
   ui:clear()
  end,"Leaf")
 end
end
local function textbox(parent)
 local input=Instance.new("TextBox")
 input.Name="Jawaban"
 input.Size=UDim2.new(1,-8,0,52)
 input.BackgroundColor3=Color3.fromRGB(250,246,232)
 input.TextColor3=Color3.fromRGB(29,45,55)
 input.PlaceholderText="Ketik jawaban..."
 input.PlaceholderColor3=Color3.fromRGB(94,105,112)
 input.Text="";input.TextSize=19
 input.Font=Enum.Font.GothamMedium
 input.ClearTextOnFocus=false
 input.Parent=parent
 Instance.new("UICorner",input).CornerRadius=UDim.new(0,12)
 ui:rank(input)
 return input
end
local submitted=false
local currentToken=nil
local function submit(value)
 if submitted then return end
 if type(value)~="string" or #value==0 then ui:say("Isi jawaban terlebih dahulu.");return end
 submitted=true
 request:FireServer("answer",{answer=value,token=currentToken})
end
local function showRound(data)
 if type(data)~="table" then return end
 submitted=false
 currentToken=data.token
 ui:clear()
 ui:setStats(string.format("%s  •  %d / %d  •  %d POIN",string.upper(tostring(data.mode)),data.round,data.maxRounds,data.score))
 ui:label(tostring(data.prompt or ""),18)
 ui:label(tostring(data.visual or ""),25)
 if data.hint then ui:label("Petunjuk: "..data.hint,15) end
 if data.options then
  for _,answer in ipairs(data.options) do
   ui:button(answer,function()submit(answer)end,"Leaf")
  end
 else
  local input=textbox(ui.content)
  ui:button("Periksa Jawaban",function()submit(input.Text)end,"Leaf")
  input.FocusLost:Connect(function(enter)
   if enter then submit(input.Text) end
  end)
 end
end
local function feedback(data)
 ui:clear()
 ui:setStats("SKOR: "..tostring(data.score or 0))
 local ok=data.correct==true
 ui:label(ok and "Tepat! Kerja bagus." or "Ayo belajar lagi.",23)
 ui:label("Jawaban: "..tostring(data.answer or ""),18)
 ui:button(data.done and "Lihat Hasil" or "Soal Berikutnya",function()
  request:FireServer("next")
 end,"Leaf")
end
response.OnClientEvent:Connect(function(kind,payload)
 if kind=="round" then showRound(payload)
 elseif kind=="feedback" then feedback(payload)
 elseif kind=="finished" then
  ui:clear()
  ui:setStats("PUTARAN SELESAI")
  ui:label("Skor: "..tostring(payload.score or 0).."/"..tostring(payload.total or 100),24)
  ui:label("Setiap jawaban benar menambah 10 poin. Mainkan mode lain untuk tantangan baru.",15)
  ui:button("Pilih Mode Lagi",welcome,"Leaf")
 elseif kind=="message" then ui:say(tostring(payload)) end
end)
welcome()
print("[BC Bermain Kata] Four distinct modes client loaded")
