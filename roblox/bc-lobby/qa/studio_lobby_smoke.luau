-- Invoke through Roblox Studio CLI:
-- RobloxStudioBeta.exe --task RunScript --localPlaceFile <bc-lobby.rbxl>
--   --runScriptFile <studio_lobby_smoke.luau> --outputFile <report.log> --quitAfterExecution
-- Structural source import QA. Not a Play, multiplayer or real teleport test.
local RS=game:GetService("ReplicatedStorage")
local SSS=game:GetService("ServerScriptService")
local SPS=game:GetService("StarterPlayer"):WaitForChild("StarterPlayerScripts")
local catalog=require(RS:WaitForChild("LobbyCatalog",15))
local destinations=require(RS:WaitForChild("LobbyDestinations",15))
assert(#catalog==13,"Lobby must list exactly 13 games")
assert(destinations.Lobby.placeId==83975639468986,"Unexpected lobby Place ID")
for _,name in ipairs({"BCLobby","BCGateRouter","BenarSalahPortal"}) do
 assert(SSS:FindFirstChild(name),"Missing server script: "..name)
end
for _,name in ipairs({"BCLobby","BCGameDirectory","BCGateDetails"}) do
 assert(SPS:FindFirstChild(name),"Missing client script: "..name)
end
local seen={}
local active,missing=0,0
for _,gameDef in ipairs(catalog) do
 assert(not seen[gameDef.id],"Duplicate game ID: "..gameDef.id)
 seen[gameDef.id]=true
 local id=destinations.Games[gameDef.id]
 if type(id)=="number" and id>0 and not gameDef.unpublished then
  active+=1
 else
  assert(id==nil,"Invalid game target "..gameDef.id)
  missing+=1
 end
end
print(string.format("BC_STUDIO_STRUCTURAL_QA_PASS games=%d activeRoutes=%d missingRoutes=%d",#catalog,active,missing))
print("NOTE: Studio import does not validate live teleport or gameplay runtime")
