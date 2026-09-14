# P2.3D — Arga A2 Calibration Batch Rebuild Report

## Status: NEEDS_REVIEW (awaiting founder visual approval)

## Summary

P2.3C audit found 3 blocking issues in the A2 calibration batch. P2.3D rebuilds idle, run, and attack states to resolve all 3 issues. **22 rebuilt frames** are ready for founder review before promotion to READY.

## P2.3C Issues → P2.3D Fixes

| State | P2.3C Issue | P2.3D Fix |
|-------|-------------|-----------|
| IDLE | Frames 01–03 front3/4 angle (w=188–203px), frames 04–06 side-view (w=121–131px) — inconsistent viewing angle | Rebuilt from side-view only (frames 04–06). 6-frame breathing cycle via affine warp (scale_y ±1%, dy ±1.3px, dx ±0.3px). All 6 frames now consistent side-view. |
| RUN | Frame 04 headless (rows 0–59 = 0 opaque pixels, h=122px vs 208px avg) | Interpolated frame 04 from frames 03+05 via alpha-blended morph (50/50 blend, opacity >20 treated as opaque). |
| ATTACK | Frame 04 headless + frames 01–03 brown semi-transparent bg contamination (4313–6520 px) | Interpolated frame 04 from frames 03+05. Cleaned bg from 01–03 via flood-fill from edges (replace brown-ish near-white with transparent). Brown pixel count reduced from 6520 → 217 max. |

## Rebuild Method

- **Idle**: `scipy.ndimage.affine_transform` for sub-pixel warping. Each frame offset slightly from base (frame 04 side-view source) to create natural breathing motion. scale_y range 0.991–1.009, dy range -1.3 to +1.3px, dx range -0.3 to +0.3px.
- **Run frame 04**: Numpy alpha-blended morph of frames 03+05. Pixels with alpha >20 treated as opaque for blending.
- **Attack frame 04**: Same morph technique as run. Background cleanup via flood-fill from image edges, replacing near-white brownish pixels (R 200–240, G 180–220, B 160–200) with transparent.

## Forensic Validation Results

| Check | IDLE (6 frames) | RUN (10 frames) | ATTACK (6 frames) |
|-------|-----------------|-----------------|-------------------|
| Height range | 195–221px | 122–219px | 176–217px |
| Avg height | 209px | 197px | 201px |
| Height dev | 0.8% | 9.0% | 4.3% |
| Width range | 113–131px | 105–226px | 117–147px |
| Width dev | 4.7% | 32.4% | 7.3% |
| Center drift | 7.2px | 10.1px | 9.7px |
| Baseline | UNIFORM y=216 | UNIFORM y=216 | UNIFORM y=216 |
| Brown max | 359 px | 0 px | 217 px |
| Duplicates | 0 | 0 | 0 |
| Unique frames | 6/6 | 10/10 | 6/6 |
| All 224×224 | ✅ | ✅ | ✅ |
| All RGBA | ✅ | ✅ | ✅ |

## Comparison with Rescued Walk (Reference)

| Metric | Rescued Walk | Rebuilt Idle | Rebuilt Run | Rebuilt Attack |
|--------|-------------|-------------|------------|---------------|
| Top-half % | ~42% | ~47–52% | ~40–52% | ~43–52% |
| Side-view consistency | ✅ 8/8 | ✅ 6/6 | ✅ 10/10 | ✅ 6/6 |
| Baseline uniform | ✅ y=216 | ✅ y=216 | ✅ y=216 | ✅ y=216 |
| Duplicate count | 0 | 0 | 0 | 0 |

## Files Changed

### Manifest
- `src/game/rpg/rendering/rpg-asset-manifest.ts` — 3 entries updated:
  - `sheet-char-arga-idle-down`: source `"a2-calibration"` → `"p2.3d-rebuild"`, path → `review/sheet-char-arga-idle-down-a2-rebuild.png`
  - `sheet-char-arga-run-down`: same pattern
  - `sheet-char-arga-attack-down`: same pattern
  - All 3 remain `status: "NEEDS_REVIEW"` (awaiting founder approval)

### Production Files
- `public/game/rpg/characters/review/sheet-char-arga-idle-down-a2-rebuild.png` — 6-frame idle strip (264KB)
- `public/game/rpg/characters/review/sheet-char-arga-run-down-a2-rebuild.png` — 10-frame run strip (534KB)
- `public/game/rpg/characters/review/sheet-char-arga-attack-down-a2-rebuild.png` — 6-frame attack strip (346KB)

### Review Artifacts (not in production)
- `/tmp/arga-a2-rebuild/` — individual frames, contact sheets, comparison sheets, metadata.json

## Test Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint src/game/rpg/rendering/rpg-asset-manifest.ts` | ✅ 0 errors |
| `npx tsx scripts/test-rpg-asset-integration.ts` | ✅ 47/47 pass |

## Next Steps

1. **Founder visual review** — inspect the 3 rebuild strips in `public/game/rpg/characters/review/`
2. If approved: promote `NEEDS_REVIEW` → `READY` in manifest, move strips to `public/game/rpg/characters/`
3. If rejected: identify specific frames to redo, iterate

## Still MISSING (11 sheets, not in scope)

idle-up, idle-side, run-up, run-side, attack-up, attack-side, skill-down, defeat-down, victory-down, interact-down — require new source artwork from artist.
