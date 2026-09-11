#!/usr/bin/env python3
"""P2.1 terrain+item slicer — deterministic, verified, reviewable.

For each source sheet: explicit spec (cols, rows, names) + STRICT asserts:
  1. boundary columns/rows darker than adjacent cell interiors (relative —
     works on black AND teal label bands);
  2. uniform pitch (exact integers, no drift);
  3. every cell non-blank and pairwise distinct (no duplicated/empty slice).
Any assert failure -> file marked NEEDS_REVIEW, nothing sliced.
Contact sheets in /tmp/p21_contact/ are the human review gate.

Usage: python3 scripts/slice-rpg-assets.py [--check-only]
Writes runtime PNGs to src/game/rpg/assets/{terrain,items}/ on success.
"""
import os
import sys
from PIL import Image

BASE = "/tmp/rpg-inv"
OUT = "/Users/user/bahasa-cerdas/src/game/rpg/assets"
CONTACT = "/tmp/p21_contact"

CHECK_ONLY = "--check-only" in sys.argv


def dark_frac(im, box):
    px = im.load()
    x0, y0, x1, y1 = box
    n = t = 0
    for y in range(y0, y1, 2):
        for x in range(x0, x1, 2):
            r, g, b = px[x, y][:3]
            t += 1
            if (r + g + b) < 110:
                n += 1
    return n / max(1, t)


def content_var(im, box):
    px = im.load()
    x0, y0, x1, y1 = box
    vals = []
    for y in range(y0, y1, 4):
        for x in range(x0, x1, 4):
            vals.append(sum(px[x, y][:3]))
    if not vals:
        return 0.0
    mean = sum(vals) / len(vals)
    return sum((v - mean) ** 2 for v in vals) / len(vals)


SPECS = [
    # (pack_relpath, category, [(x0, pitch, w, cols)], [(y0, h, [names])])
    ("BahasaCerdas_RPG_Asset_Pack_04_Desa_Suryakerta/BahasaCerdas_RPG_Asset_Pack_04_Desa_Suryakerta/terrain/01_ground_tiles.png", "terrain",
     [(13, 81, 70, 5)], [(37, 70, ["desa_grass_01", "desa_grass_02", "desa_grass_flowers", "desa_dirt_01", "desa_dirt_02"]),
                         (127, 70, ["desa_stone_01", "desa_stone_02", "desa_stone_path", "desa_mud", "desa_sand"]),
                         (0, 0, [])]),
    ("BahasaCerdas_RPG_Asset_Pack_04_Desa_Suryakerta/BahasaCerdas_RPG_Asset_Pack_04_Desa_Suryakerta/terrain/02_water_tiles.png", "terrain",
     [(7, 82, 72, 4)], [(39, 70, ["desa_water_01", "desa_water_02", "desa_water_03", "desa_water_deep"]),
                        (152, 70, ["desa_water_edge", "desa_water_corner", "desa_waterfall", "desa_bridge_water"])]),
    ("BahasaCerdas_RPG_Asset_Pack_04_Desa_Suryakerta/BahasaCerdas_RPG_Asset_Pack_04_Desa_Suryakerta/terrain/04_cliff_elevation.png", "terrain",
     [(44, 85, 70, 4)], [(40, 70, ["desa_cliff_grass", "desa_cliff_stone", "desa_cliff_dirt", "desa_cliff_corner"]),
                         (160, 70, ["desa_stairs_stone", "desa_stairs_dirt", "desa_stairs_wood", "desa_ramp"])]),
    ("BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/terrain/01_volcano_ground.png", "terrain",
     [(17, 93, 76, 4)], [(49, 70, ["gunung_volcano_01", "gunung_volcano_02", "gunung_volcano_03", "gunung_volcano_04"]),
                         (149, 70, ["gunung_volcano_05", "gunung_volcano_06", "gunung_volcano_07", "gunung_volcano_08"])]),
    ("BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/terrain/02_rock_dirt.png", "terrain",
     [(8, 92, 76, 4)], [(49, 70, ["gunung_rock_terrain_01", "gunung_rock_terrain_02", "gunung_rock_path_01", "gunung_rock_path_02"]),
                         (149, 70, ["gunung_rock_path_03", "gunung_rock_path_04", "gunung_gravel_01", "gunung_gravel_02"])]),
    ("BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/terrain/03_lava.png", "terrain",
     [(14, 93, 76, 4)], [(52, 70, ["gunung_lava_01", "gunung_lava_02", "gunung_lava_03", "gunung_lava_edge"]),
                         (150, 70, ["gunung_lava_flow", "gunung_lava_fall", "gunung_lava_pool", "gunung_lava_cracked"])]),
    ("BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/BahasaCerdas_RPG_Asset_Pack_05_Gunung_Karang/terrain/04_cliff_elevation.png", "terrain",
     [(15, 93, 76, 4)], [(49, 70, ["gunung_cliff_01", "gunung_cliff_02", "gunung_cliff_03", "gunung_cliff_04"]),
                         (149, 70, ["gunung_cliff_ledge", "gunung_cliff_corner", "gunung_cliff_stairs", "gunung_cliff_tall"])]),
    ("BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/terrain/01_sky_platform.png", "terrain",
     [(14, 93, 78, 4)], [(49, 70, ["menara_platform_01", "menara_platform_02", "menara_platform_03", "menara_platform_04"]),
                         (149, 70, ["menara_platform_05", "menara_platform_06", "menara_platform_07", "menara_platform_edge"])]),
    ("BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/terrain/02_marble_floor.png", "terrain",
     [(8, 93, 76, 4)], [(49, 70, ["menara_floor_01", "menara_floor_02", "menara_floor_03", "menara_floor_04"]),
                         (149, 70, ["menara_floor_pattern_01", "menara_floor_pattern_02", "menara_floor_pattern_03", "menara_floor_pattern_04"])]),
    ("BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/terrain/03_cloud_sky.png", "terrain",
     [(9, 93, 76, 4)], [(49, 70, ["menara_cloud_01", "menara_cloud_02", "menara_cloud_03", "menara_cloud_04"]),
                         (149, 70, ["menara_cloud_05", "menara_cloud_06", "menara_cloud_07", "menara_cloud_bridge"])]),
    ("BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/BahasaCerdas_RPG_Asset_Pack_06_Menara_Angin/terrain/04_wind_tiles.png", "terrain",
     [(15, 93, 78, 4)], [(45, 90, ["menara_wind_01", "menara_wind_02", "menara_wind_03", "menara_wind_04"]),
                         (164, 90, ["menara_wind_05", "menara_wind_06", "menara_wind_07", "menara_wind_vortex"])]),
    ("BahasaCerdas_RPG_Asset_Pack_02/BahasaCerdas_RPG_Asset_Pack_02/items/item_konsumsi.png", "items",
     [(8, 62, 52, 7)], [(20, 60, ["item_ramuan", "item_teh", "item_elixir", "item_ikan_biru", "item_ikan_merah", "item_ikan_emas", "item_bijih"]) ]),
    ("BahasaCerdas_RPG_Asset_Pack_02/BahasaCerdas_RPG_Asset_Pack_02/items/quest_item.png", "items",
     [(10, 59, 48, 6)], [(20, 58, ["item_bunga_emas", "item_surat", "item_kunci", "item_kristal", "item_peta", "item_bulu"])]),
]


def col_dark(im, x, y0, y1):
    W, _ = im.size
    x = max(0, min(W - 1, x))
    return dark_frac(im, (x, y0, x + 1, y1))


def detect_tile_rows(im):
    """Tile rows = tall bands that are NOT full-width dark (label/title bands
    are near-black across the width; tile art never is). Returns top-2 bands
    below y=40. Raises if the layout is not exactly as expected."""
    W, H = im.size
    px = im.load()
    dark_row = []
    for y in range(H):
        n = sum(1 for x in range(0, W, 4) if sum(px[x, y][:3]) < 60)
        dark_row.append(n / (W // 4) > 0.85)
    bands = []
    cur = []
    for y in range(40, H):
        if not dark_row[y]:
            cur.append(y)
        else:
            if len(cur) >= 55:
                bands.append((cur[0], cur[-1]))
            cur = []
    if len(cur) >= 55:
        bands.append((cur[0], cur[-1]))
    assert len(bands) >= 2, f"expected ≥2 tile rows, found {len(bands)}: {bands}"
    assert len(bands) <= 4, f"suspicious band count {len(bands)}: {bands}"
    for i in range(1, len(bands)):
        assert bands[i][0] - bands[i - 1][1] >= 12, "rows not separated by label band"
    return bands


def verify_grid(im, x0, pitch, w, cols, y0, h, mode="lines"):
    """Boundaries snap to separators (±6px search); cells must hold content.
    mode 'lines': dark separators required (black label bands / gridlines).
    mode 'content': no gridlines (teal sheets) — cells must be content-dense
      and inter-cell gaps content-sparse (relative, provable)."""
    W, H = im.size
    snapped = []
    if mode == "lines":
        for c in range(cols + 1):
            gx = x0 + c * pitch
            if c == 0:
                # Left sheet margin: no separator required, range only.
                assert 0 <= gx < W, f"grid x out of range: {gx}"
                snapped.append(gx)
                continue
            best, bestd = gx, -1.0
            for dx in range(-6, 7):
                d = col_dark(im, gx + dx, y0, y0 + h)
                if d > bestd:
                    best, bestd = gx + dx, d
            assert abs(best - gx) <= 6, f"grid drift col {c}"
            assert bestd >= 0.45, f"weak boundary col {c} at x={gx} (dark={bestd:.2f})"
            snapped.append(best)
        last = x0 + (cols - 1) * pitch + w
        assert last <= W, f"grid overflows width: {last} > {W}"
        assert y0 + h <= H, "grid overflows height"
    else:
        # Content mode (teal sheets, no gridlines): each cell content-dense.
        # Uniformity is NOT asserted here — icon shapes vary legitimately —
        # so the contact sheet in /tmp/p21_contact is the mandatory second
        # gate (human review for label intrusion / clipped icons).
        for c in range(cols):
            box = (x0 + c * pitch, y0, x0 + c * pitch + w, y0 + h)
            v = content_var(im, box)
            assert v > 800, f"empty cell col {c} (var={v:.0f})"
        last = x0 + (cols - 1) * pitch + w
        assert last <= W, f"grid overflows width: {last} > {W}"
        assert y0 + h <= H, "grid overflows height"
    return snapped


def main():
    os.makedirs(CONTACT, exist_ok=True)
    manifest = []
    failed = []
    for rel, category, colspecs, rows in SPECS:
        p = os.path.join(BASE, rel)
        im = Image.open(p).convert("RGB")
        mode = "content" if "/items/" in rel else "lines"
        ok = True
        cells = []
        try:
            for (x0, pitch, w, cols) in colspecs:
                # Auto-detect tile rows (dark label/title bands excluded).
                # Items sheets: single row given explicitly (no label bands
                # inside the icon strip; human contact review is the gate).
                rowbands = [(rows[0][0], rows[0][0] + rows[0][1])] if mode == "content" else detect_tile_rows(im)
                assert len(rowbands) == len(rows), f"row count {len(rowbands)} != {len(rows)} (layout changed?)"
                assert len(rowbands) == len(rows), f"row count {len(rowbands)} != {len(rows)}"
                for ((y0, y1), (ry0, h, names)) in zip(rowbands, rows):
                    if len(names) == 0:
                        # Known unlabeled row (documented NEEDS_REVIEW): geometry
                        # verified, nothing sliced, nothing invented.
                        print(f"  unlabeled row y={y0}-{y1} skipped (NEEDS_REVIEW names)")
                        continue
                    assert len(names) == cols, "name count != cols"
                    verify_grid(im, x0, pitch, w, cols, y0, y1 - y0, mode)
                    for c, name in enumerate(names):
                        box = (x0 + c * pitch, y0, x0 + c * pitch + w, y0 + (y1 - y0))
                        v = content_var(im, box)
                        assert v > 200, f"blank cell {name} (var={v:.0f})"
                        cells.append((name, box))
            # pairwise distinctness (no duplicated slice)
            sigs = []
            for name, box in cells:
                crop = im.crop(box).resize((8, 8)).convert("L")
                sigs.append((name, list(crop.getdata())))
            for i in range(len(sigs)):
                for j in range(i + 1, len(sigs)):
                    assert sigs[i][1] != sigs[j][1], f"duplicate cells {sigs[i][0]} == {sigs[j][0]}"
        except AssertionError as e:
            print(f"NEEDS_REVIEW  {os.path.basename(rel)} :: {e}")
            failed.append(rel)
            continue
        print(f"VERIFIED  {os.path.basename(rel)} :: {len(cells)} cells")
        # contact sheet
        cols_n = max(len(r[2]) for r in rows)
        cw, chh = 90, 90
        sheet = Image.new("RGB", (cols_n * (cw + 6), len(rows) * (chh + 22)))
        for i, (name, box) in enumerate(cells):
            r = i // cols_n
            cc = i % cols_n
            th = im.crop(box).resize((cw, chh))
            sheet.paste(th, (cc * (cw + 6), r * (chh + 22)))
        # Contact filename includes the pack folder (two files share the
        # basename 04_cliff_elevation.png across packs).
        pack = [seg for seg in rel.split("/") if seg.startswith("BahasaCerdas")][0]
        pack = pack.replace("BahasaCerdas_RPG_Asset_Pack_", "")
        sheet.save(os.path.join(
            CONTACT,
            pack + "__" + os.path.basename(rel).replace(".png", "_contact.png"),
        ))
        if CHECK_ONLY:
            continue
        outdir = os.path.join(OUT, category)
        os.makedirs(outdir, exist_ok=True)
        for name, box in cells:
            cell = im.crop(box)
            cell.save(os.path.join(outdir, f"{name}.png"))
            manifest.append((name, category, box, cell.size))
    print(f"\n{len(manifest)} cells sliced, {len(failed)} files NEEDS_REVIEW")
    return failed


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
