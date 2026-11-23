-- A truthful ready-room for a game whose exact web mechanics have not yet been ported.
-- It is not presented as a playable quiz and never fabricates questions.
local Players=game:GetService("Players")
local Rep=game:GetService("ReplicatedStorage")
local Teleport=game:GetService("TeleportService")
local Run=game:GetService("RunService")
local GameConfig=require(Rep:WaitForChild("GameConfig"))
local World=require(script.Parent:WaitForChild("WorldKit"))
World.Build(GameConfig.id)
local folder=Instance.new("Folder",Rep)
folder.Name="BCPreviewBridge"
local message=Instance.new("RemoteEvent",folder)
message.Name="Message"
message.OnServerEvent:Connect(function(pl,action)
 if action~="returnLobby" then return end
 if Run:IsStudio() then
  message:FireClient(pl,"Perpindahan ke lobby harus diuji dari aplikasi Roblox.")
  return
 end
 local ok,err=pcall(function()
  Teleport:TeleportAsync(83975639468986,{pl})
 end)
 if not ok then
  warn("[BC Preview] Return to lobby unavailable",err)
  message:FireClient(pl,"Belum berhasil kembali. Coba lagi.")
 end
end)
print("[BC Preview] "..GameConfig.id.." art scene ready, gameplay intentionally disabled")
