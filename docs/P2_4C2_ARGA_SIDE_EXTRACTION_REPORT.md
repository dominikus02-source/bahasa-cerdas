# P2.4C.2 Arga SIDE Frame Extraction Report

**Date**: September 14, 2026
**Status**: COMPLETE (REFERENCE_ONLY — not production-ready)
**Gate**: P2.4C SIDE Production Gate

## Summary

Extracted 21 SIDE-facing reference frames from Pack01 and Complete Animation Package. All frames are at native resolution (26–42×66–68px for Pack01, 35–37×28px for CAP) — **far below the 224×224 production target**. Frames are classified as REFERENCE_ONLY and serve as motion reference for future AI generation or hand-drawn production art.

## Extraction Results

| State | Frames Extracted | Target | Native Size | Source | Status |
|-------|-----------------|--------|-------------|--------|--------|
| idle-side | 5 | 6 | 26–42×66–68px | Pack01 RIGHT row | REFERENCE_ONLY |
| run-side | 10 | 10 | 13–29×65–67px | Pack01 RIGHT row | REFERENCE_ONLY |
| attack-side | 6 | 6 | 35–37×28px | Complete Animation Package | REFERENCE_ONLY |
| walk-side | 0 (existing) | 8 | 224×224 | Production sheet | READY |
| **Total** | **21** | **30** | | | |

### Missing Frames

- **idle-side frame 6**: Pack01 RIGHT row has a 1px gap artifact at x=79 instead of a real frame. 5 of 6 frames extracted.

### Walk-side Note

Walk-side already has a production-ready sheet at `public/game/rpg/characters/sheet-char-arga-walk-side.png` (1792×224, 8 frames). No extraction needed.

## Source Material

### Pack01 (`pack01_subregion_1.png`, 1295×984 RGBA)

- **IDLE RIGHT row** (y=206–273): 5 frames at x=23–239 (26–42px wide × 68px tall)
- **RUN RIGHT row** (y=206–273): 10 frames at x=836–1224 (13–29px wide × 65–67px tall)
- Background: dark (#1a1a1a) with cream/beige character sprites
- Background removal: dark (R<60, G<60, B<60) → transparent, cream (R>160, G>140, B>120) → transparent

### Complete Animation Package (`ALL_DIRECTIONS_ALL_STATES_REFERENCE.png`, 1536×1024 RGBA)

- **SIDE section attack row** (y=689–716): 6 frames at x=40–758 (35–37×28px)
- Background: cream/beige semi-transparent
- Background removal: same thresholds as Pack01

## QA Results

### Alpha/Color QA (21 frames)

All 21 frames pass basic QA:
- ✅ Character pixels present (char > 50 per frame)
- ✅ Background removal clean (cream leak < 100px per frame)
- ✅ Dimensions valid (w ≥ 10, h ≥ 10)
- ⚠️ All frames below production resolution (224×224)

### Profile Verification

- ✅ IDLE-SIDE: True profile (LEFT-facing, side view)
- ✅ RUN-SIDE: True profile (LEFT-facing, side view)
- ✅ ATTACK-SIDE: True profile (attack motion from side)
- ✅ All frames match canonical master turnaround SAMPING KIRI view

### Scale Gap

| State | Native Width | Target Width | Scale Factor Needed |
|-------|-------------|-------------|-------------------|
| idle-side | 29px avg | 224px | 7.7× |
| run-side | 22px avg | 224px | 10.2× |
| attack-side | 36px avg | 224px | 6.2× |

**These frames CANNOT be used as production assets without significant upscaling or re-generation.**

## Manifest Changes

| Entry | Before | After | Frames | Source |
|-------|--------|-------|--------|--------|
| `sheet-char-arga-idle-side` | MISSING | REFERENCE_ONLY | 5 | pack01-extraction |
| `sheet-char-arga-run-side` | MISSING | REFERENCE_ONLY | 10 | pack01-extraction |
| `sheet-char-arga-attack-side` | MISSING | REFERENCE_ONLY | 6 | complete-animation-pack-extraction |

## Test Updates

- `test-rpg-asset-integration.ts`: MISSING count 9→6, added REFERENCE_ONLY check for 3 SIDE entries

## Verification

```
✅ All 21 extracted frames pass alpha/color QA
✅ Profile verification: TRUE PROFILE confirmed for all states
✅ Manifest updated: 3 entries MISSING → REFERENCE_ONLY
✅ Tests updated: MISSING 9→6, REFERENCE_ONLY check added
```

## Next Steps

1. **Production art required**: Extracted frames are reference-only. Production sprites need:
   - AI generation at 224×224 using these as motion reference
   - OR hand-drawn by artist at 224×224
   - OR upscale with AI upscaler (may lose quality at 7–10×)
2. **Idle-side frame 6**: Needs alternative source or reconstruction
3. **Master turnaround verification**: All extracted frames should be compared against `arga_turnaround_v2_region_1.png` SAMPING KIRI view for consistency

## Files

- Extracted frames: `assets-src/rpg/characters/arga/side-extraction/`
- Manifest: `src/game/rpg/rendering/rpg-asset-manifest.ts`
- Tests: `scripts/test-rpg-asset-integration.ts`
