#!/usr/bin/env python3
"""Static checks for BahasaCerdas Roblox hub. This is NOT Studio/runtime QA."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
catalog = (ROOT / "bc-lobby/src/ReplicatedStorage/LobbyCatalog.lua").read_text(encoding="utf-8")
dest = (ROOT / "bc-lobby/src/ReplicatedStorage/LobbyDestinations.lua").read_text(encoding="utf-8")
worlds = (ROOT / "game-factory/shared/UniqueWorlds.lua").read_text(encoding="utf-8")
directory = (ROOT / "bc-lobby/src/StarterPlayer/StarterPlayerScripts/BCGameDirectory.client.lua").read_text(encoding="utf-8")
server = (ROOT / "bermain-kata/src/ServerScriptService/Preview.server.lua").read_text(encoding="utf-8")
client = (ROOT / "bermain-kata/src/StarterPlayer/StarterPlayerScripts/Preview.client.lua").read_text(encoding="utf-8")
ids = re.findall(r'\{id="([^"]+)",name=', catalog)
assert len(ids) == 13 and len(set(ids)) == 13, "Catalog must contain 13 unique worlds"
for ident in ids:
    assert f'["{ident}"]' in worlds, f"Missing distinct visual identity for {ident}"
    assert f'["{ident}"]' in directory, f"Missing UI description for {ident}"
    assert f'["{ident}"]' in dest, f"Missing lobby destination definition for {ident}"
assert 'elseif id=="lari-kata" or id=="adu-cepat"' not in worlds, "Shared arena silhouette detected"
for mode in ("susun", "rumpang", "pasangan", "makna"):
    assert f'{mode}=true' in server, f"Missing {mode} mode"
    assert f'id="{mode}"' in client, f"Missing {mode} UI"
assert "s.roundToken" in server and "value.token~=s.roundToken" in server
assert "token=currentToken" in client, "Client round validation missing"
assert "Teleport:TeleportAsync(83975639468986" in server, "Return-to-lobby route missing"
forest = (ROOT / "petualangan-kata/src/ServerScriptService/Preview.server.lua").read_text(encoding="utf-8")
forest_client = (ROOT / "petualangan-kata/src/StarterPlayer/StarterPlayerScripts/Preview.client.lua").read_text(encoding="utf-8")
forest_bank = (ROOT / "petualangan-kata/src/ServerScriptService/ContentBank.lua").read_text(encoding="utf-8")
for group in ("KATA_BENDA", "KATA_KERJA", "KATA_SIFAT"):
    assert group in forest and group in forest_bank, f"Missing forest group: {group}"
assert "ProximityPrompt" in forest and "pad.prompt.Triggered" in forest
assert "s.awaiting=false;s.resolved=true" in forest
assert 'bridge:FireServer("next")' in forest_client
assert "s.awaiting or not s.resolved" in server, "Unanswered word play question could be skipped"
print("PASS: 13 unique catalog IDs, 4 word-play modes, 3 physical forest zones")
print("LIMITATION: This does not parse Luau or prove Roblox Studio playability.")

# Unified gate/return-route audit (static only; publishing is still required).
router = (ROOT / "bc-lobby/src/ServerScriptService/BCGateRouter.server.lua").read_text(encoding="utf-8")
detail = (ROOT / "bc-lobby/src/StarterPlayer/StarterPlayerScripts/BCGateDetails.client.lua").read_text(encoding="utf-8")
assert "destination.Games[entry.id]" in router
assert "validNear(player,arch)" in router
assert 'TeleportService:TeleportAsync(placeId,{player})' in router
assert 'if entry.id=="benar-salah" then continue end' in router
assert 'router:FireServer("enter",selectedId)' in detail
assert 'available=data.available==true' in detail
server_names = {
 "benar-salah":"BenarSalah", "susun-kata":"SusunKata",
 "tebak-kata":"TebakKata","menara":"Menara","irama-kata":"IramaKata"
}
missing_return = []
unpublished = []
for ident in ids:
    script_name = server_names.get(ident, "Preview")
    server_path = ROOT / ident / "src/ServerScriptService" / (script_name + ".server.lua")
    client_path = ROOT / ident / "src/StarterPlayer/StarterPlayerScripts" / (script_name + ".client.lua")
    if not server_path.exists() or not client_path.exists():
        raise AssertionError(f"Missing gameplay scripts for {ident}")
    code = server_path.read_text(encoding="utf-8")
    ui_code = client_path.read_text(encoding="utf-8")
    if "returnLobby" not in code or not ("returnLobby" in ui_code or "backToLobby(" in ui_code):
        missing_return.append(ident)
    if not __import__("re").search(r'\["' + re.escape(ident) + r'"\]=\d+', dest):
        unpublished.append(ident)
assert not missing_return, f"Return-to-lobby missing: {missing_return}"
print(f"PASS: {len(ids)} game projects have return-to-lobby code")
print(f"INFO: {len(unpublished)} destinations await official Place IDs: {', '.join(unpublished)}")
print("IMPORTANT: routing presence is not live-teleport verification.")
