#!/usr/bin/env python3
"""Static integration guard for distinct Roblox worlds (NOT a runtime/visual test)."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
ids = [
    "benar-salah", "susun-kata", "tebak-kata", "menara", "irama-kata",
    "petualangan-kata", "bermain-kata", "teka-teki-silang", "lari-kata",
    "kuis-tempur", "tantang", "adu-cepat", "rpg",
]
shared = (root / "game-factory/shared/UniqueWorlds.lua").read_text(encoding="utf-8")
checks = [
    "Aula Putusan Aksara", "Bengkel Huruf", "Perpustakaan Rahasia",
    "Menara Pengetahuan", "Panggung Festival Bahasa",
    "Hutan Kata Nusantara", "Taman Permainan Aksara",
    "Kuil Kisi Aksara", "Lintasan Bahasa Cepat",
    "Arena Duel Cerdas", "Plaza Tantangan", "Stasiun Kilat",
    "Kerajaan Aksara Nusantara",
]
assert len(ids) == len(checks) == 13
for id_, title in zip(ids, checks):
    assert title in shared, (id_, "title not in shared scene source")
    folder = root / id_ / "src/ServerScriptService"
    module = folder / "UniqueWorlds.lua"
    world = folder / "WorldKit.lua"
    assert module.is_file(), module
    assert world.is_file(), world
    unique = module.read_text(encoding="utf-8")
    kit = world.read_text(encoding="utf-8")
    assert ("[\"" + id_ + "\"]") in unique, (id_, "missing world")
    assert "UniqueWorlds.Build(gameId,model)" in kit, (id_, "scene disconnected")
    assert 'script.Parent:WaitForChild("UniqueWorlds")' in kit
    assert unique == shared, (id_, "scene module drift")
    for f in (module, world):
        raw = f.read_bytes()
        assert not raw.startswith(b"\xef\xbb\xbf"), (id_, "BOM")
        assert b"\xef\xbf\xbd" not in raw, (id_, "replacement character")
print("PASS: all 13 original game projects load their unique low-poly environments")
print("PENDING: Rojo rebuild, Play Solo, device emulator, and FPS test")
