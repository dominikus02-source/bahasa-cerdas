#!/usr/bin/env python3
"""Cek bank soal Pasar Ejaan: jumlah, id unik, dan arena wajib."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "src" / "server" / "banks" / "Kapital.luau",
    ROOT / "src" / "server" / "banks" / "Tanda.luau",
    ROOT / "src" / "server" / "banks" / "Baku.luau",
]

id_re = re.compile(r'\bQ\(\s*"(ey_[a-z0-9_]+)"')
arena_re = re.compile(r'"(tutorial|a01|a02|boss)"')


def main() -> int:
    ids: list[str] = []
    arenas: dict[str, set[str]] = {}
    for path in FILES:
        text = path.read_text(encoding="utf-8")
        found = id_re.findall(text)
        if len(found) < 20:
            print(f"{path.name}: hanya {len(found)} soal")
            return 1
        for item_id in found:
            window = text.split(f'"{item_id}"', 1)[1][:500]
            arenas[item_id] = set(arena_re.findall(window))
        ids.extend(found)
    dupes = sorted({item for item in ids if ids.count(item) > 1})
    if dupes:
        print("id dobel:", ", ".join(dupes))
        return 1
    if len(ids) < 60:
        print(f"bank kurang dari 60: {len(ids)}")
        return 1
    for required in ("ey_k_01", "ey_k_02", "ey_k_03"):
        if required not in ids:
            print("tutorial hilang", required)
            return 1
        if "tutorial" not in arenas.get(required, set()):
            print(required, "tidak masuk arena tutorial")
            return 1
    a01 = sum(1 for item in ids if "a01" in arenas.get(item, set()))
    a02 = sum(1 for item in ids if "a02" in arenas.get(item, set()))
    boss = sum(1 for item in ids if "boss" in arenas.get(item, set()))
    if a01 < 20 or a02 < 20 or boss < 8:
        print(f"sebaran kurang a01={a01} a02={a02} boss={boss}")
        return 1
    print(f"bank ok: {len(ids)} soal, a01={a01}, a02={a02}, boss={boss}")
    return 0


def check_plain_text() -> int:
    import importlib.util

    path = Path(__file__).with_name("validate_text_style.py")
    spec = importlib.util.spec_from_file_location("textstyle", path)
    if spec is None or spec.loader is None:
        print("pemeriksa teks hilang")
        return 1
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.main()


if __name__ == "__main__":
    code = main()
    if code == 0:
        code = check_plain_text()
    sys.exit(code)
