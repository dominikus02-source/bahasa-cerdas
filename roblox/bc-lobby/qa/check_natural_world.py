#!/usr/bin/env python3
"""Static smoke checks only. This is NOT a Roblox Studio Play test."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
proj = json.loads((root / "default.project.json").read_text(encoding="utf-8"))
assert proj["tree"]["Workspace"]["$properties"]["StreamingEnabled"] is True

rep = proj["tree"]["ReplicatedStorage"]
for name in ("NaturalTheme", "LobbyCatalog", "LobbyDestinations"):
    path = root / rep[name]["$path"]
    assert path.is_file(), f"Rojo project does not include {name}: {path}"

expected = {
    "src/ServerScriptService/BCLobby.server.lua": ["BCLobbyReady", "LobbySpawn"],
    "src/ServerScriptService/KotaAksaraDecor.server.lua": ["KotaDecorReady", "Buku Terbang"],
    "src/ServerScriptService/NaturalWorld.server.lua": [
        'WaitForChild("Gerbang_rpg"', 'WaitForChild("KotaAksaraBloom"',
        "Theme.Category", "ColorCorrectionEffect", "Atmosphere"],
    "src/ServerScriptService/AKSI.server.lua": ['WaitForChild("NaturalTheme"', "SapaAKSI"],
    "src/ServerScriptService/NusantaraPortal.server.lua": [
        'WaitForChild("NaturalTheme"', "TeleportService:TeleportAsync"],
    "src/StarterPlayer/StarterPlayerScripts/KotaAksaraUI.client.lua": [
        'GetAttribute("HematGerak")', "CameraType"],
    "src/StarterPlayer/StarterPlayerScripts/NaturalHUD.client.lua": [
        'WaitForChild("NaturalTheme")', 'SetAttribute("HematGerak"', "ViewportSize"],
}
for relative, required in expected.items():
    content = (root / relative).read_text(encoding="utf-8")
    for literal in required:
        assert literal in content, f"{relative}: missing {literal}"
    assert "\ufffd" not in content, f"{relative}: replacement character found"

theme = (root / "src/ReplicatedStorage/NaturalTheme.lua").read_text(encoding="utf-8")
for color in ("Sky", "Leaf", "Stone", "Sand", "Wood", "Ivory", "Ink", "Brand"):
    assert color + " = Color3.fromRGB" in theme, f"Missing theme color {color}"

# Deliberately no false claims of Roblox runtime test, FPS measurement, or teleport success.
print("BC Natural World: static source/config checks PASS")
print("Next gate: run Rojo build, Play Solo, mobile emulation and device FPS in Roblox Studio")
