# P2.4C — ARGA SIDE PRODUCTION GATE

**Status**: BLOCKED — awaiting production artwork
**Date**: September 14, 2026
**Prepared by**: BC Agent (automated)
**Directive**: P2.4C from founder

---

## 1. OBJECTIVE

Prepare the production pipeline for Arga's SIDE direction animations:

| Sheet | Frames | Direction | Camera |
|-------|--------|-----------|--------|
| idle-side | 6 | side | TRUE PROFILE (LEFT facing) |
| walk-side | 8 | side | TRUE PROFILE (already exists — READY) |
| run-side | 10 | side | TRUE PROFILE (LEFT facing) |
| attack-side | 6 | side | TRUE PROFILE (already exists as MISSING) |

**Critical rule**: SIDE must be TRUE PROFILE. Do not use 3/4 perspective. Do not mirror DOWN. Do not derive SIDE from A2 through affine transformation.

---

## 2. CANONICAL SOURCE OF TRUTH

### Master References

| Document | Path | Status |
|----------|------|--------|
| Master Art Spec | `docs/ARGA_MASTER_ART_SPEC.md` | FOUNDER_LOCKED |
| Visual Canon | `docs/P2_3F_ARGA_VISUAL_CANON.md` | FOUNDER_LOCKED |
| Master Art Handoff | `docs/P2_4A_FINAL_MASTER_ART_HANDOFF.md` | FOUNDER_LOCKED |

### Canonical Master Artwork

| Asset | Path | Status |
|-------|------|--------|
| Master Turnaround V2 | `assets-src/rpg/characters/arga/package/ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png` | CANONICAL |

### Style Reference (production-quality)

| Asset | Path | Use For |
|-------|------|---------|
| walk-down | `public/game/rpg/characters/sheet-char-arga-walk-down.png` | Style, palette, rendering quality |
| walk-up | `public/game/rpg/characters/sheet-char-arga-walk-up.png` | Back-view reference |
| walk-side | `public/game/rpg/characters/sheet-char-arga-walk-side.png` | SIDE STYLE REFERENCE (canonical) |

---

## 3. A2 CONTAINMENT DECISION

### Status

A2 calibration frames (Pack 12) are **NOT production artwork**.

| Asset | Status | Reason |
|-------|--------|--------|
| idle-down-a2 | NEEDS_REVIEW | Visual inconsistency (pixel diff 61.0 vs canonical walk) |
| run-down-a2 | NEEDS_REVIEW | Visual inconsistency |
| attack-down-a2 | NEEDS_REVIEW | Visual inconsistency |
| idle-down-a2-rebuild | NEEDS_REVIEW | Affine-warped from A2, not canonical style |
| run-down-a2-rebuild | NEEDS_REVIEW | Affine-warped, frame 04 interpolated |
| attack-down-a2-rebuild | NEEDS_REVIEW | Affine-warped, brown bg patches |

### Containment Rules

1. A2 frames remain as **MOTION REFERENCE ONLY**
2. Do NOT promote to READY
3. Do NOT recolor, warp, interpolate, or procedurally modify A2
4. Do NOT connect to production runtime
5. Document: "A2 calibration is motion reference only because its visual generation is inconsistent with canonical Arga"

---

## 4. SIDE ANIMATION SPECIFICATION

### 4.1 Camera Convention

| Direction | Meaning | Character Pose |
|-----------|---------|---------------|
| SIDE (LEFT) | Character faces LEFT | True profile — ear visible, one eye visible, keris at far hip |
| SIDE (RIGHT) | Mirror of LEFT | Horizontally flipped at load time — do NOT author separate RIGHT frames |

**Forbidden**:
- 3/4 perspective (slightly turned toward camera)
- Front-facing disguised as side
- Back-facing disguised as side
- Mirror of DOWN as side
- Any A2-derived side frames

### 4.2 Character Pose — True Profile

```
HEAD:     Profile view — one eye, ear visible, headband wraps around
TORSO:    Side view — one shoulder visible, tunic drapes to one side
LEGS:     Walking/running profile — stride visible from side
FEET:     Side-view foot placement
SCARF:    Flows behind character (direction of movement)
KERIS:    Visible at far hip (right hip for LEFT-facing)
HAIR:     Visible from side, slightly messy
```

### 4.3 Animation Cycles

#### idle-side (6 frames)

| Frame | Description |
|-------|-------------|
| 01 | Neutral standing, arms at sides |
| 02 | Slight inhale, chest rises |
| 03 | Full inhale, shoulders back slightly |
| 04 | Hold peak |
| 05 | Exhale, shoulders forward |
| 06 | Return to neutral |

- Subtle breathing motion
- Scarf drifts slightly
- No foot movement
- ~180px character height

#### walk-side (8 frames) — ALREADY EXISTS

This is the canonical reference for SIDE style. Use as the visual benchmark.

| Frame | Description |
|-------|-------------|
| 01 | Contact — right foot forward |
| 02 | Down — weight on right foot |
| 03 | Passing — feet together, right moving back |
| 04 | Up — body highest point |
| 05 | Contact — left foot forward |
| 06 | Down — weight on left foot |
| 07 | Passing — feet together, left moving back |
| 08 | Up — body highest point |

#### run-side (10 frames)

| Frame | Description |
|-------|-------------|
| 01 | Contact — right foot forward, body leaning |
| 02 | Down — weight absorbs |
| 03 | Passing — right leg pushes back |
| 04 | Up — flight phase begins |
| 05 | Apex — both feet off ground |
| 06 | Contact — left foot forward |
| 07 | Down — weight absorbs |
| 08 | Passing — left leg pushes back |
| 09 | Up — flight phase |
| 10 | Apex — transition to next stride |

- Faster stride than walk
- Body lean ~15° forward
- Scarf streams behind
- Arm pump visible
- Higher vertical oscillation

#### attack-side (6 frames)

| Frame | Description |
|-------|-------------|
| 01 | Wind-up — keris drawn, arm back |
| 02 | Swing initiation — arm starts forward |
| 03 | Contact — keris at peak forward |
| 04 | Follow-through — arm extends |
| 05 | Recovery — arm returns |
| 06 | Return to ready |

- Keris drawn from hip
- Slash arc visible from side
- Body rotates into strike
- Scarf whips with motion

---

## 5. EXPECTED FRAME COUNTS

| State | Frames | Directions | Status |
|-------|--------|-----------|--------|
| idle | 6 | down, **side** | side = MISSING |
| walk | 8 | down, up, **side** | side = READY ✅ |
| run | 10 | down, up, **side** | side = MISSING |
| attack | 6 | down, up, **side** | side = MISSING |

**Total SIDE sheets needed**: 3 (idle-side, run-side, attack-side)
**Total SIDE frames needed**: 6 + 10 + 6 = 22 frames

---

## 6. RUNTIME FILE CONTRACT

### Destination Paths

```
public/game/rpg/characters/
  sheet-char-arga-idle-side.png     (1344×224, 6 frames)
  sheet-char-arga-idle-side.json
  sheet-char-arga-run-side.png      (2240×224, 10 frames)
  sheet-char-arga-run-side.json
  sheet-char-arga-attack-side.png   (1344×224, 6 frames)
  sheet-char-arga-attack-side.json
```

### Per-Frame Requirements

| Property | Value |
|----------|-------|
| Canvas | 224×224 px |
| Format | PNG-32 (RGBA) |
| Background | Transparent (no checkerboard, no parchment) |
| Feet origin | (0.5, 1.0) — bottom-center |
| Character height | ~180px of 224px canvas |
| Art scale | 2× (128 logical → 224 canvas) |
| Naming | `sheet-char-arga-<state>-side.png` |
| Sidecar | `.json` alongside `.png` |

### Sidecar JSON Format

```json
{
  "frames": <frameCount>,
  "frameW": 224,
  "frameH": 224,
  "origin": { "x": 0.5, "y": 1.0 },
  "pack": "canonical",
  "generation": "gen-a",
  "scale": 2.0,
  "frameMs": 80
}
```

---

## 7. QA CONTRACT

When real artwork becomes available, validate:

### 7.1 Technical

- [ ] 224×224 per frame
- [ ] RGBA color mode
- [ ] Transparent background (no baked pixels)
- [ ] No checkerboard pattern artifacts
- [ ] No parchment/background contamination
- [ ] No dark rectangular patches
- [ ] No accidental clipping of character

### 7.2 Geometry

- [ ] Feet baseline consistent (~215–220px from top)
- [ ] X-center consistent (~112px from left)
- [ ] Character height ~180px
- [ ] Bounding box consistency across frames
- [ ] No frame collapse (character disappearing)
- [ ] No frame scaling drift

### 7.3 Visual — Canon Compliance

- [ ] TRUE PROFILE (not 3/4, not front, not back)
- [ ] Cream tunic (#F5E6D3 approx)
- [ ] SOLID RED scarf (#DC2626 approx) — no pattern
- [ ] Dark indigo trousers (#2C3E50 approx)
- [ ] Brown boots (#8B4513 approx)
- [ ] Red-ochre headband (#C0392B approx)
- [ ] Black hair (#1A1A2E approx)
- [ ] Keris visible at hip
- [ ] Nusantara Storybook rendering style
- [ ] Consistent with walk-side reference

### 7.4 Motion

- [ ] Readable idle breathing cycle
- [ ] Natural walk cycle (8 frames)
- [ ] Convincing run cycle (10 frames)
- [ ] No frozen duplicate frames
- [ ] No severe popping between frames
- [ ] Scarf motion reads naturally

### 7.5 Consistency with walk-side

- [ ] Same character height as walk-side
- [ ] Same color palette as walk-side
- [ ] Same rendering style as walk-side
- [ ] Same outline weight as walk-side
- [ ] Same proportion balance as walk-side

---

## 8. CURRENT AVAILABILITY

| Sheet | Status | Notes |
|-------|--------|-------|
| idle-side | **MISSING** | No source artwork exists |
| walk-side | **READY** | Canonical — rescued from calibration sheet |
| run-side | **MISSING** | No source artwork exists |
| attack-side | **MISSING** | No source artwork exists |

### Existing Production Assets (preserved)

| Asset | Status | Frames | Verified |
|-------|--------|--------|----------|
| walk-down | READY | 8 | ✅ Canonical |
| walk-up | READY | 8 | ✅ Canonical |
| walk-side | READY | 8 | ✅ Canonical |

---

## 9. BLOCKERS

1. **No SIDE artwork exists** — idle-side, run-side, attack-side require new production art
2. **Cannot generate artwork** — no image generation capability available
3. **A2 containment** — A2 frames are motion reference only, not production-compatible

---

## 10. ART GENERATION SPECIFICATION

### For the next artwork-generation step:

#### Input References

1. **Master Turnaround V2** (`assets-src/rpg/characters/arga/package/ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png`) — canonical character design from all angles
2. **walk-side** (`public/game/rpg/characters/sheet-char-arga-walk-side.png`) — canonical SIDE style reference (8 frames, TRUE PROFILE)
3. **Master Art Spec** (`docs/ARGA_MASTER_ART_SPEC.md`) — full character specification

#### Output Requirements

Generate 3 horizontal strip sheets:

| Sheet | Frames | Strip Size | Frame Size |
|-------|--------|-----------|------------|
| idle-side | 6 | 1344×224 | 224×224 |
| run-side | 10 | 2240×224 | 224×224 |
| attack-side | 6 | 1344×224 | 224×224 |

#### Style Constraints

- Match walk-side rendering exactly (same artist/generation parameters)
- TRUE profile view (ear visible, one eye, side torso)
- No 3/4 perspective
- No mirror of DOWN
- No A2-derived frames
- Solid red scarf flowing behind character
- Keris visible at far hip
- Consistent feet baseline with walk-side

#### Validation Before Delivery

Run `scripts/test-rpg-asset-integration.ts` after placing sheets at:
- `public/game/rpg/characters/sheet-char-arga-idle-side.png`
- `public/game/rpg/characters/sheet-char-arga-run-side.png`
- `public/game/rpg/characters/sheet-char-arga-attack-side.png`

---

## 11. NEXT ACTION

**Produce idle-side, run-side, and attack-side artwork** using:
1. Master Turnaround V2 as character reference
2. walk-side as style reference
3. Master Art Spec as specification

Then place at the destination paths and run validation.

---

## APPENDIX: MANIFEST STATUS SUMMARY

```
SIDE DIRECTION ASSETS:
  walk-side   READY   (canonical, rescued from calibration)
  idle-side   MISSING (no source artwork)
  run-side    MISSING (no source artwork)
  attack-side MISSING (no source artwork)

A2 CONTAINMENT:
  idle-down-a2         NEEDS_REVIEW (motion reference only)
  run-down-a2          NEEDS_REVIEW (motion reference only)
  attack-down-a2       NEEDS_REVIEW (motion reference only)
  idle-down-a2-rebuild NEEDS_REVIEW (affine warp, not canonical)
  run-down-a2-rebuild  NEEDS_REVIEW (affine warp, not canonical)
  attack-down-a2-rebuild NEEDS_REVIEW (affine warp, not canonical)

CANONICAL PRODUCTION (preserved):
  walk-down  READY (8 frames)
  walk-up    READY (8 frames)
  walk-side  READY (8 frames)
```

---

## P2.4C.1 RECONCILIATION (Aug 22, 2026)

### Original Reported Count
P2.4C report stated MISSING = 9 but displayed inventory appeared to contain 11 rows due to duplicate entries for run-side and attack-side.

### Actual Canonical Count
27 direction/state combinations (9 states × 3 directions). Each must exist exactly ONCE.

### Duplicate Detection Results

Programmatic extraction of `animationState:direction` keys from all `sheet-char-arga-*` entries revealed:

| state:direction | Entry 1 | Entry 2 | Resolution |
|----------------|---------|---------|------------|
| `idle:down` | `idle-down` (p2.3d-rebuild, NEEDS_REVIEW) | `idle-down-a2` (pack12-a2-calibration, NEEDS_REVIEW) | **idle-down-a2 REMOVED** — duplicate of canonical p2.3d-rebuild |
| `run:down` | `run-down` (p2.3d-rebuild, NEEDS_REVIEW) | `run-down-a2` (pack12-a2-calibration, NEEDS_REVIEW) | **run-down-a2 converted to REFERENCE_ONLY** — A2 calibration metadata |
| `attack:down` | `attack-down` (p2.3d-rebuild, NEEDS_REVIEW) | `attack-down-a2` (pack12-a2-calibration, NEEDS_REVIEW) | **attack-down-a2 converted to REFERENCE_ONLY** — A2 calibration metadata |

No duplicates found for `run-side` or `attack-side` (each appears exactly once).

### Actions Taken

1. **Removed** `sheet-char-arga-idle-down-a2` from `ARGA_RUNTIME_ENTRIES` (duplicate state:direction key)
2. **Converted** `sheet-char-arga-run-down-a2` from `NEEDS_REVIEW` → `REFERENCE_ONLY`
3. **Converted** `sheet-char-arga-attack-down-a2` from `NEEDS_REVIEW` → `REFERENCE_ONLY`
4. **Updated** p2.3d-rebuild notes to reflect reconciliation (idle-down-a2 removed, run/attack-a2 → REFERENCE_ONLY)

### Final Corrected Matrix

```
Total canonical combinations: 27

ARGA RUNTIME ENTRIES (18):
  READY (3):
    walk-down   walk-up   walk-side

  NEEDS_REVIEW (4):
    idle-down   run-down   attack-down   hurt-down

  MISSING (9):
    idle-side   run-side   attack-side
    run-up   attack-up
    skill-down   defeat-down   victory-down   interact-down

REFERENCE_ONLY (2 — A2 calibration, never promote):
  run-down-a2   attack-down-a2

NON-ARGA REFERENCE (not counted in 27):
  ref:arga-complete-pack-down   ref:arga-complete-pack-up
  ref:arga-complete-pack-all    ref:arga-master-turnaround-v2-founder
  ref:arga-master-character     ref:arga-turnaround-v2
```

### Status Totals (mathematical reconciliation)

```
27 canonical = 15 unique state:direction keys covered × 1 entry each
             + 12 uncovered combinations (no entry exists)

Entries:  18 total = 3 READY + 4 NEEDS_REVIEW + 9 MISSING + 2 REFERENCE_ONLY
Keys:     15 unique keys covered (walk×3 + idle×2 + run×3 + attack×3 + hurt×1 + skill×1 + defeat×1 + victory×1 + interact×1)
Dupes:    0 after reconciliation (2 duplicates resolved)
```

### Runtime Safety Verification

- **MISSING state requested**: `lookupAsset()` returns `{ ok: false, reason: "NOT_REGISTERED" }`. Renderer uses DEV placeholder (colored circle). No crash, no fake art.
- **NEEDS_REVIEW state requested**: Same as MISSING (not registered in runtime manifest). Safe.
- **REFERENCE_ONLY state requested**: Same as MISSING (not registered). Safe.
- **Duplicate state:direction**: After reconciliation, no duplicates exist. `manifestLookup()` returns first match; all state:direction keys are now unique.

### Files Changed

| File | Change |
|------|--------|
| `src/game/rpg/rendering/rpg-asset-manifest.ts` | Removed idle-down-a2, converted run-down-a2/attack-down-a2 to REFERENCE_ONLY, updated p2.3d-rebuild notes |
| `scripts/test-rpg-asset-integration.ts` | Updated NEEDS_REVIEW count 7→4 |
| `docs/P2_4C_ARGA_SIDE_PRODUCTION_GATE.md` | Added reconciliation section |
