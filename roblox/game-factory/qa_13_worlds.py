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
print("PASS: 13 unique catalog IDs, individual visual identities, 4 server-validated modes")
print("LIMITATION: This does not parse Luau or prove Roblox Studio playability.")
