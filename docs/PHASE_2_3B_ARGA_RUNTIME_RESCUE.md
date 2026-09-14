# PHASE 2.3B — Arga Runtime Rescue: 4/15 Sheets Rescued, 11 MISSING

> Status: **PASS WITH LIMITATIONS** (4 sheets rescued, 11 confirmed MISSING, zero fabrication)
> Date: 2026-09-12 · Branch: deploy-pk
> Scope: extraction + normalization + manifest update. No gameplay or system code changed.

---

## 1. Executive Summary

Rescued 4 Arga runtime sheets from existing source artwork:

| Sheet | Source | Frames | Scale | Status |
|---|---|---|---|---|
| walk-down | Calibration sheet (row y=58–148) | 8 | 2.22 | READY |
| walk-up | Calibration sheet (row y=374–466) | 8 | 2.17 | READY |
| walk-side | Calibration sheet (row y=269–355, right→mirror) | 8 | 2.33 | READY |
| hurt-down | Pack07 hurt reference (row y=36–112) | 4 | 2.63 | READY |

**11 sheets confirmed MISSING** — no source artwork at sufficient resolution or frame count exists in any pack. These require new art production.

---

## 2. Source Analysis

### What was analyzed
1. **Calibration sheet** (`ARGA_RUNTIME_CALIBRATION_SHEET.png`, 1536×1024): Walk source only. Bands y=58–466 contain 4 direction rows with 9 frames each. Bands y=530–980 contain labels/decorations (12–51px runs), NOT animation data.
2. **Pack01 `arga_animation_reference_sheet.png`** (1536×1024): Presentation sheet with full-screen semi-transparent background. Sprites rendered ON TOP of background — NOT usable for frame extraction.
3. **Pack01 `arga_master_character.png`** (1233×1275): Single character illustration, no animation frames.
4. **Pack07 `arga_runtime_master_reference.png`** (1536×1024): Composite overview with 4 title blocks and rows of 16 tiny preview frames (~35px each). NOT suitable for 224px extraction.
5. **Pack07 reference sheets** (9 files, ~350×370 each): Small preview grids with ~35px frames. Frame counts per state:
   - idle: 1 frame/band (need 6)
   - run: 4 frames/band (need 10)
   - attack: 4 frames/band (need 6)
   - skill: 3–4 frames mixed (need 8)
   - defeat: 4–6 frames mixed (need 8)
   - victory: 1 large band (need 8)
   - interact: 1 frame band (need 6)

### Why 11 sheets cannot be extracted
- **Frame count deficit**: Pack07 references have 1–4 frames per direction; contract requires 6–10
- **Resolution deficit**: Pack07 frames are ~35px; contract requires 224px (6.4× upscale would be too aggressive)
- **No alternative sources**: Pack01 animation reference has full-screen background; Pack01 master is single illustration
- **Zero fabrication constraint**: Cannot duplicate, interpolate, or synthesize missing frames

---

## 3. Extraction Pipeline

### Per-frame pipeline (deterministic)
1. `detect_row_cells()`: Content-run detection (alpha density >6%, min width 25px, merge gap <10px)
2. Uniform grid crop with surplus exclusion (9th frame excluded from walk rows)
3. Alpha cleanup (alpha < 8 → 0, documented contamination removal)
4. Distinctness verification (8×8 thumbnail signature comparison)
5. Uniform per-sheet scale (200px / max content height, LANCZOS)
6. Bottom-align content feet to y=220 on 224×224 transparent canvas
7. Horizontal strip assembly + sidecar JSON
8. Contact sheet for visual review

### Validation results (4 rescued sheets)
- All dims: 224×224 ✅
- All RGBA ✅
- All alpha clean (no contamination) ✅
- All feet aligned at y=220 ✅
- All frames unique per sheet ✅
- Sidecar JSON correct ✅
- Contact sheets saved to `/tmp/a1_contact/` ✅

---

## 4. Manifest Status

### READY (4 sheets)
| id | path | frames | state | dir |
|---|---|---|---|---|
| sheet-char-arga-walk-down | /game/rpg/characters/sheet-char-arga-walk-down.png | 8 | walk | down |
| sheet-char-arga-walk-up | /game/rpg/characters/sheet-char-arga-walk-up.png | 8 | walk | up |
| sheet-char-arga-walk-side | /game/rpg/characters/sheet-char-arga-walk-side.png | 8 | walk | side |
| sheet-char-arga-hurt-down | /game/rpg/characters/sheet-char-arga-hurt-down.png | 4 | hurt | down |

### MISSING (11 sheets)
| id | frames | state | dir | blocker |
|---|---|---|---|---|
| sheet-char-arga-idle-down | 6 | idle | down | 1 frame/band, need 6 |
| sheet-char-arga-run-down | 10 | run | down | 4 frames/band, need 10 |
| sheet-char-arga-run-up | 10 | run | up | 4 frames/band, need 10 |
| sheet-char-arga-run-side | 10 | run | side | 4 frames/band, need 10 |
| sheet-char-arga-attack-down | 6 | attack | down | 4 frames/band, need 6 |
| sheet-char-arga-attack-up | 6 | attack | up | 4 frames/band, need 6 |
| sheet-char-arga-attack-side | 6 | attack | side | 4 frames/band, need 6 |
| sheet-char-arga-skill-down | 8 | skill | down | 3–4 frames mixed, need 8 |
| sheet-char-arga-defeat-down | 8 | defeat | down | 4–6 frames mixed, need 8 |
| sheet-char-arga-victory-down | 8 | victory | down | 1 large band, need 8 |
| sheet-char-arga-interact-down | 6 | interact | down | 1 frame band, need 6 |

---

## 5. Updated Arga Contract Coverage

| State | Dirs | Total sheets | READY | MISSING |
|---|---|---|---|---|
| idle | down | 1 | 0 | 1 |
| walk | down/up/side | 3 | 3 | 0 |
| run | down/up/side | 3 | 0 | 3 |
| attack | down/up/side | 3 | 0 | 3 |
| skill | down | 1 | 0 | 1 |
| hurt | down | 1 | 1 | 0 |
| defeat | down | 1 | 0 | 1 |
| victory | down | 1 | 0 | 1 |
| interact | down | 1 | 0 | 1 |
| **Total** | | **15** | **4** | **11** |

Coverage: **27%** (4/15 sheets rescued)

---

## 6. Next Steps for MISSING Sheets

To complete the remaining 11 sheets, one of the following is required:

1. **New art production**: Commission high-res sprite sheets for idle, run, attack, skill, defeat, victory, interact states
2. **AI generation**: Use AI sprite generation tools to create missing frames (requires careful review for consistency)
3. **Manual illustration**: Artist draws missing frames at 224px resolution with transparent backgrounds
4. **Alternative source**: Find additional asset packs with higher-resolution Arga sprites

Each missing sheet needs:
- Minimum frame count per contract (6–10 frames)
- 224×224 px per frame minimum
- Transparent background (alpha channel)
- Consistent character design across all states
- Feet-aligned to y=220 for ground-plane consistency

---

## 7. Files Modified

| File | Change |
|---|---|
| `scripts/rescue-arga-runtime.py` | Added MISSING_SHEETS list, --missing-only mode, sidecar generation for missing sheets |
| `src/game/rpg/rendering/rpg-asset-manifest.ts` | Added ARGA_RUNTIME_ENTRIES (4 READY + 11 MISSING), argaRuntimeReady/Missing helpers, removed legacy single MISSING entry |
| `public/game/rpg/characters/sheet-char-arga-*.png` | 4 rescued sheets (walk-down/up/side, hurt-down) |
| `public/game/rpg/characters/sheet-char-arga-*.json` | 15 sidecar JSON files (4 rescued + 11 missing) |

---

## 8. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| Sidecar count | ✅ 15/15 |
| READY sheets | ✅ 4 (walk-down, walk-up, walk-side, hurt-down) |
| MISSING sheets | ✅ 11 (all other states) |
| Contact sheets | ✅ `/tmp/a1_contact/walk_contact.png`, `hurt_contact.png` |
| Manifest entries | ✅ 4 READY + 11 MISSING in ARGA_RUNTIME_ENTRIES |
| Zero fabrication | ✅ No frames duplicated, interpolated, or synthesized |
