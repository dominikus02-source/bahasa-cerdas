#!/usr/bin/env python3
"""Build sharp runtime sprites and portraits from the reviewed RPG source artwork."""
from pathlib import Path
from PIL import Image, ImageOps
import math
import shutil

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets-src/rpg/characters"
PUBLIC = ROOT / "public/game/kuis-tempur/characters"
HERO_V2 = PUBLIC / "heroes/v2"
ANIM_V2 = PUBLIC / "heroes/npc-runtime/v2"
MONSTER_V2 = PUBLIC / "monsters/v2"
FRAME = 224

NPCS = {
    "ki-jaka": "NCP1.png",
    "bu-ratmi": "NCP2.png",
    "bu-sari": "NCP3.png",
    "eyang-kartala": "NCP4.png",
    "pak-empu": "NCP5.png",
}
MONSTERS = {
    "korog": "Monster1.png",
    "korog-perang": "Monster2.png",
    "golem-batu": "BosMonster1.png",
    "korog-bayangan": "BosMonster2.png",
}


def cut_transparent(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Source artwork has no opaque pixels")
    return rgba.crop(bounds)


def fit(image: Image.Image, max_w: int, max_h: int) -> Image.Image:
    thumb = image.copy()
    thumb.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    return thumb


def save_png(image: Image.Image, destination: Path):
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG", optimize=True)
    print(f"{destination.relative_to(ROOT)} {image.size} {destination.stat().st_size // 1024} KB")


def make_strip(image: Image.Image, action: str) -> Image.Image:
    counts = {"idle": 4, "walk": 6, "talk": 4, "interact": 4}
    frame_count = counts[action]
    # Preserve every part of the original character art, including its silhouette.
    sprite = fit(image, 193, 205)
    strip = Image.new("RGBA", (FRAME * frame_count, FRAME))
    for i in range(frame_count):
        phase = i / frame_count * 2 * math.pi
        if action == "walk":
            offset_y = round(math.sin(phase) * 3)
            offset_x = round(math.cos(phase) * 2)
            angle = math.sin(phase) * 1.25
        elif action == "interact":
            offset_y = round(math.sin(phase) * 1.5)
            offset_x = 0
            angle = math.sin(phase) * 2.0
        elif action == "talk":
            offset_y = round(math.sin(phase))
            offset_x = 0
            angle = math.sin(phase) * 0.75
        else:
            offset_y = round(math.sin(phase))
            offset_x = 0
            angle = math.sin(phase) * 0.3
        frame_sprite = sprite.rotate(angle, Image.Resampling.BICUBIC, expand=True)
        x = i * FRAME + (FRAME - frame_sprite.width) // 2 + offset_x
        y = FRAME - frame_sprite.height - 8 + offset_y
        strip.alpha_composite(frame_sprite, (x, y))
    return strip


def main():
    # Reviewed Arga V2 has already been extracted into its full-body alpha portrait.
    arga_preview = ROOT / "public/game/kuis-tempur/characters/heroes/arga.png"
    save_png(fit(cut_transparent(Image.open(arga_preview)), 840, 900), HERO_V2 / "arga.png")

    for slug, filename in NPCS.items():
        raw = cut_transparent(Image.open(SOURCE / "NCP" / filename))
        save_png(fit(raw, 750, 900), HERO_V2 / f"{slug}.png")
        for action in ("idle", "walk", "talk", "interact"):
            save_png(make_strip(raw, action), ANIM_V2 / f"{slug}-{action}.png")

    for slug, filename in MONSTERS.items():
        raw = cut_transparent(Image.open(SOURCE / "Monster" / filename))
        save_png(fit(raw, 750, 800), MONSTER_V2 / f"{slug}.png")


if __name__ == "__main__":
    main()
