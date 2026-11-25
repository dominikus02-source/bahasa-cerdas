#!/usr/bin/env python3
"""Cek bank Benar atau Salah, Susun Kata, dan NUSANTARA."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PLACES = ROOT / "places"

Q_RE = re.compile(
    r'Q\(\s*"(?P<id>[a-z0-9_]+)"\s*,\s*(?P<tier>[123])\s*,\s*(?P<truth>true|false)\s*,\s*"(?P<statement>(?:\\.|[^"\\])*)"\s*,\s*"(?P<explanation>(?:\\.|[^"\\])*)"',
    re.S,
)
HURUF_RE = re.compile(
    r'\{\s*Id\s*=\s*"(?P<id>skh_[0-9]+)"\s*,\s*Tier\s*=\s*(?P<tier>[123])\s*,\s*Word\s*=\s*"(?P<word>[^"]+)"\s*,\s*Definition\s*=\s*"(?P<definition>[^"]+)"'
)
KALIMAT_RE = re.compile(
    r'\{\s*Id\s*=\s*"(?P<id>skk_[0-9]+)"\s*,\s*Tier\s*=\s*(?P<tier>[123])\s*,\s*Words\s*=\s*\{(?P<words>[^}]+)\}'
)
MCQ_RE = re.compile(
    r'\{\s*Id\s*=\s*"(?P<id>[a-z0-9_]+)"\s*,\s*Tier\s*=\s*(?P<tier>[123])\s*,\s*Prompt\s*=\s*"(?P<prompt>(?:\\.|[^"\\])*)"\s*,\s*Options\s*=\s*\{(?P<options>[^}]+)\}\s*,\s*Answer\s*=\s*"(?P<answer>(?:\\.|[^"\\])*)"'
)
LINE_RE = re.compile(
    r'\{\s*Id\s*=\s*"(?P<id>bl_[0-9]+)"\s*,\s*Tier\s*=\s*(?P<tier>[123])\s*,\s*Words\s*=\s*\{(?P<words>[^}]+)\}'
)
STRING_RE = re.compile(r'"((?:\\.|[^"\\])*)"')


def strings(block: str) -> list[str]:
    return [item.encode().decode("unicode_escape") for item in STRING_RE.findall(block)]


def fail(message: str) -> int:
    print(message)
    return 1


def section(text: str, name: str) -> str:
    marker = f"{name} = {{"
    start = text.find(marker)
    if start < 0:
        return ""
    depth = 0
    for index in range(start, len(text)):
        char = text[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start:index]
    return ""


def check_tf(label: str, text: str, minimum: int) -> int:
    rows = list(Q_RE.finditer(text))
    if len(rows) < minimum:
        return fail(f"{label}: hanya {len(rows)} pernyataan")
    ids = [row.group("id") for row in rows]
    if len(ids) != len(set(ids)):
        return fail(f"{label}: id dobel")
    truths = [row.group("truth") == "true" for row in rows]
    share = sum(truths) / len(truths)
    if share < 0.35 or share > 0.65:
        return fail(f"{label}: sebaran benar {share:.2f}")
    tiers = {row.group("tier") for row in rows}
    if tiers != {"1", "2", "3"}:
        return fail(f"{label}: tingkat tidak lengkap {tiers}")
    for row in rows:
        if len(row.group("statement")) < 12 or len(row.group("explanation")) < 8:
            return fail(f"{label}: teks pendek {row.group('id')}")
    print(f"{label}: {len(rows)} pernyataan")
    return 0


def check_huruf(text: str) -> int:
    rows = list(HURUF_RE.finditer(text))
    if len(rows) < 40:
        return fail(f"huruf: hanya {len(rows)}")
    ids = []
    for row in rows:
        word = row.group("word")
        if not re.fullmatch(r"[a-z]{4,12}", word):
            return fail(f"huruf: {row.group('id')} bukan huruf kecil 4-12 ({word})")
        if len(row.group("definition")) < 8:
            return fail(f"huruf: arti pendek {row.group('id')}")
        ids.append(row.group("id"))
    if len(ids) != len(set(ids)):
        return fail("huruf: id dobel")
    print(f"huruf: {len(rows)}")
    return 0


def check_lines(label: str, pattern: re.Pattern[str], text: str, minimum: int) -> int:
    rows = list(pattern.finditer(text))
    if len(rows) < minimum:
        return fail(f"{label}: hanya {len(rows)}")
    ids = []
    for row in rows:
        words = strings(row.group("words"))
        if not 3 <= len(words) <= 8:
            return fail(f"{label}: jumlah balok {row.group('id')} = {len(words)}")
        if len(words) != len(set(words)):
            return fail(f"{label}: balok bentrok {row.group('id')}")
        ids.append(row.group("id"))
    if len(ids) != len(set(ids)):
        return fail(f"{label}: id dobel")
    print(f"{label}: {len(rows)}")
    return 0


def check_mcq(label: str, text: str, minimum: int) -> int:
    rows = list(MCQ_RE.finditer(text))
    if len(rows) < minimum:
        return fail(f"{label}: hanya {len(rows)}")
    ids = []
    for row in rows:
        options = strings(row.group("options"))
        answer = row.group("answer").encode().decode("unicode_escape")
        if len(options) < 2 or len(options) > 4:
            return fail(f"{label}: jumlah opsi {row.group('id')}")
        if len(options) != len(set(options)):
            return fail(f"{label}: opsi dobel {row.group('id')}")
        if answer not in options:
            return fail(f"{label}: jawaban di luar opsi {row.group('id')}")
        ids.append(row.group("id"))
    if len(ids) != len(set(ids)):
        return fail(f"{label}: id dobel")
    print(f"{label}: {len(rows)}")
    return 0


def check_clients() -> int:
    for path in PLACES.rglob("*.luau"):
        if "/src/client/" not in str(path).replace("\\", "/"):
            continue
        text = path.read_text(encoding="utf-8")
        if re.search(r"https?://|bahasacerdas\.com|Truth\s*=", text):
            return fail(f"klien memuat alamat atau kunci: {path}")
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


def main() -> int:
    status = 0
    status |= check_tf("benar", (PLACES / "benar-salah/src/server/Bank.luau").read_text(encoding="utf-8"), 70)
    susun = (PLACES / "susun-kata/src/server/Bank.luau").read_text(encoding="utf-8")
    status |= check_huruf(susun)
    status |= check_lines("kalimat", KALIMAT_RE, susun, 16)
    nusa = (PLACES / "nusantara/src/server/Bank.luau").read_text(encoding="utf-8")
    status |= check_tf("jawa", section(nusa, "Jawa"), 12)
    status |= check_tf("sumatra", section(nusa, "Sumatra"), 10)
    status |= check_tf("boss cepat", section(nusa, "BossFast"), 10)
    status |= check_mcq("jurus", section(nusa, "Jurus"), 10)
    status |= check_mcq("bos tanya", section(nusa, "BossAsk"), 6)
    status |= check_lines("semboyan", LINE_RE, section(nusa, "BossLine"), 4)
    status |= check_clients()
    status |= check_plain_text()
    if status == 0:
        print("bank tiga permainan ok")
    return status


if __name__ == "__main__":
    sys.exit(main())
