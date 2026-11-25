#!/usr/bin/env python3
"""Teks UI harus polos: tanpa garis pada huruf, tanpa TextStroke di bawah 1."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TEXT_TYPES = {"TextLabel", "TextButton", "TextBox"}
NEW_RE = re.compile(
    r"(?:local\s+)?(\w+)\s*=\s*Instance\.new\(\s*\"(TextLabel|TextButton|TextBox|Frame|UIStroke)\"\s*\)"
)
PARENT_RE = re.compile(r"(\w+)\.Parent\s*=\s*(\w+)")
STROKE_CALL = re.compile(r"\bstroke\(\s*(\w+)")
TRANSPARENCY_RE = re.compile(r"TextStrokeTransparency\s*=\s*([0-9]*\.?[0-9]+)")


def check_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    problems = []
    if "<stroke" in text.lower():
        problems.append(f"{path}: RichText stroke")
    for match in TRANSPARENCY_RE.finditer(text):
        if float(match.group(1)) < 1:
            problems.append(f"{path}: TextStrokeTransparency {match.group(1)}")
    kinds = {}
    for match in NEW_RE.finditer(text):
        kinds[match.group(1)] = match.group(2)
    strokes = {name for name, kind in kinds.items() if kind == "UIStroke"}
    texts = {name for name, kind in kinds.items() if kind in TEXT_TYPES}
    for match in PARENT_RE.finditer(text):
        child, parent = match.group(1), match.group(2)
        if child in strokes and parent in texts:
            problems.append(f"{path}: UIStroke menempel pada {parent}")
    for match in STROKE_CALL.finditer(text):
        target = match.group(1)
        if target in texts:
            problems.append(f"{path}: stroke() pada teks {target}")
    return problems


def main() -> int:
    problems = []
    for path in ROOT.rglob("*.luau"):
        if "build" in path.parts:
            continue
        problems.extend(check_file(path))
    if problems:
        print("\n".join(problems))
        return 1
    print("teks polos: tidak ada garis pada huruf")
    return 0


if __name__ == "__main__":
    sys.exit(main())
