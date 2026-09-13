# ARGA MASTER ART SPECIFICATION

**Status**: FOUNDER_LOCKED — Canonical production handoff document
**Decision date**: September 13, 2026
**Supersedes**: All prior art direction notes, code comments referencing "Visual Bible §14/§18/§19/§25"

---

## 1. CHARACTER — Canonical Identity

**Name**: Arga (Pendekar Suryakerta protagonist)

**Identity**: Young Indonesian warrior, student-friendly, Nusantara Storybook aesthetic.

**Physical**:
- Black/dark hair, slightly messy, visible under headband
- Red-ochre headband (traditional Indonesian style)
- Youthful face, large eyes (chibi proportion)
- Light skin tone

**Forbidden**: Different facial identity, different hair design, different headband color.

---

## 2. CAMERA — Direction Conventions

| Direction | Meaning | Character Pose |
|-----------|---------|---------------|
| **DOWN** | **FRONT-facing** | Character faces the camera (gameplay-facing) |
| **UP** | **BACK-facing** | Character faces away from camera |
| **SIDE** | **LEFT profile** | Character faces left; RIGHT = horizontal mirror of LEFT |

**Critical rule**: DOWN is ALWAYS front-facing. Side-view for DOWN is FORBIDDEN.

**Mirror convention**: SIDE assets are authored facing LEFT. RIGHT direction is rendered by horizontally flipping the LEFT asset at load time. Do NOT author separate RIGHT frames.

---

## 3. OUTFIT — Canonical Clothing

| Element | Description | Color |
|---------|------------|-------|
| **Tunic** | Short-sleeved, traditional pattern, loose-fitting | Cream/white (#F5E6D3 approx) |
| **Trousers** | Loose, traditional pattern | Dark/indigo (#2C3E50 approx) |
| **Boots** | Leather wrap-style, ankle height | Brown (#8B4513 approx) |
| **Belt/sash** | At waist, simple | Dark brown |

**Forbidden**: Blue outfit, dark armor, vest, chest plate, shoulder guards, any Gen-B Pack 7 elements.

---

## 4. SCARF / SELENDANG

| Property | Value |
|----------|-------|
| **Color** | **Red solid** (#DC2626 approx) |
| **Pattern** | **None** — solid color |
| **Length** | Medium, flowing behind character during movement |
| **Fastening** | At neck/chest area |
| **Shape** | Rectangular, drapes over one shoulder |

**Forbidden**: Orange color, patterned/ikat design, gold brooch, Gen-C P2.3D scarf style.

---

## 5. PALETTE — Approximate Canonical Colors

Extracted from Gen-A sources (calibration sheet + rescued walk-down):

| Role | Color | Approx Hex | Notes |
|------|-------|-----------|-------|
| Tunic (light) | Cream | `#F5E6D3` | Dominant body color |
| Tunic (shadow) | Warm brown | `#D4B896` | Fabric shadow |
| Scarf | Red | `#DC2626` | Solid, no gradient |
| Scarf (shadow) | Dark red | `#991B1B` | Fold shadow |
| Trousers | Dark indigo | `#2C3E50` | Below tunic |
| Boots | Brown | `#8B4513` | Leather |
| Hair | Black | `#1A1A2E` | Dark, slightly messy |
| Headband | Red-ochre | `#C0392B` | Traditional style |
| Skin (light) | Light tone | `#FDBCB4` | Face, hands |
| Skin (shadow) | Warm tone | `#E8A598` | Shadow areas |
| Outline | Dark brown | `#3D2B1F` | Soft, not pure black |

**Note**: These are approximate values from visual inspection. The master artist should use these as guidance, not exact hex values. The overall warm-first palette is canonical.

---

## 6. PROPORTION — Body Dimensions

| Property | Value | Notes |
|----------|-------|-------|
| **Head:Body ratio** | ~1:2 | Chibi proportions — head is ~40% of total height |
| **Total height** | ~180px of 224px canvas | ~10% padding top and bottom |
| **Head width** | ~50-55px | Round head, large eyes |
| **Body width** | ~40-45px | Compact torso |
| **Leg length** | ~50-55px | Short, proportionate to chibi |
| **Arm length** | ~30-35px | Slightly shorter than realistic |
| **Feet position** | Bottom of canvas | Origin at (0.5, 1.0) — feet touch ground line |

**Feet origin** (non-negotiable): `(x: 0.5, y: 1.0)` — bottom-center of canvas.

---

## 7. RENDERING — Art Style

### Outline
- **Thin to medium** outlines (1-2px at 224px)
- **Dark brown** (#3D2B1F approx), NOT pure black
- **Soft edges** — not harsh pixel outlines
- Consistent outline weight across all frames

### Shading
- **Soft painterly-flat** — not photorealistic, not flat-vector
- **Single light source** — consistent across all frames (suggest upper-left)
- **2-3 tone shading** — base, shadow, highlight
- No harsh gradients — soft transitions

### Lighting
- **Warm dominant** — cream/brown/red palette
- **Consistent across directions** — light source doesn't rotate with character
- **No rim lighting** or dramatic effects — clean, readable

### Edge Softness
- **Soft edges** on fabric and hair
- **Slightly harder edges** on outline and weapon
- **No anti-aliasing artifacts** at target scale

### Texture
- **Minimal texture** — clean fills with subtle variation
- **Fabric folds** suggested by shading, not detailed pattern
- **No noise** or grain

---

## 8. WEAPON — Canonical Appearance

| Property | Value |
|----------|-------|
| **Type** | Keris / traditional sword |
| **Size** | ~40-50px length (chibi scale) |
| **Position (idle/walk)** | Sheathed at left hip, hilt visible |
| **Position (attack)** | Drawn in right hand, slash arc |
| **Hilt** | Golden/ornate, traditional design |
| **Blade** | Dark steel, slightly curved |
| **Visibility** | Small at chibi scale — suggest hilt + partial blade |

---

## 9. ANIMATION — Global Technical Rules

| Rule | Value | Source |
|------|-------|--------|
| Canvas size | **224×224 px** | `HERO_CANVAS_PX` (world-scale.ts) |
| Color mode | **RGBA** | Transparency required |
| Background | **Transparent** | No background, no ground, no sky |
| Art scale | **2×** (128 logical → 224 canvas) | `ART_SCALE` (world-scale.ts) |
| Frame timing | **80ms** (12fps) | `FRAME_MS` (world-scale.ts) |
| Feet origin | **(0.5, 1.0)** | `ARGA_ORIGIN` (arga-contract.ts) |
| Frame layout | **Horizontal strip** | Left-to-right, evenly spaced |
| Naming | `sheet-char-arga-<state>-<dir>.png` | Bible §19 |
| Sidecar | `.json` alongside `.png` | Metadata: frames, pack, scale |

### Frame Counts Per State

| State | Frames | Directions |
|-------|--------|-----------|
| idle | 6 | down |
| walk | 8 | down, up, side |
| run | 10 | down, up, side |
| attack | 6 | down, up, side |
| skill | 8 | down |
| hurt | 4 | down |
| defeat | 8 | down |
| victory | 8 | down |
| interact | 6 | down |

**Total sheets needed**: 15 (walk/run/attack × 3 dirs + idle + skill + hurt + defeat + victory + interact)

---

## 10. FORBIDDEN — Explicit Prohibitions

| Category | Forbidden |
|----------|----------|
| **Outfit** | Blue armor, dark vest, chest plate, shoulder guards (Gen-B) |
| **Scarf** | Orange color, patterned/ikat design, gold brooch (Gen-C) |
| **Camera** | Side-view for DOWN direction |
| **Proportions** | Different head:body ratio, different character height |
| **Face** | Different facial identity, different hair design, different headband |
| **Weapon** | Different weapon type, different weapon position |
| **Palette** | Arbitrary palette changes, cool-dominant palette |
| **Rendering** | Heavy black outlines, photorealistic style, flat-vector style |
| **AI artifacts** | Costume drift, inconsistent proportions between frames, extra limbs |
| **Background** | Any background in sprite sheets |
| **Labels** | Any text, numbers, or UI in sprite sheets |
| **Hitboxes** | Baked collision data in sprite sheets |

---

## 11. REFERENCE ASSETS — Production Handoff

### Master References (use for new art production)

| Reference | Path | Use For |
|-----------|------|---------|
| ARGA_RUNTIME_CALIBRATION_SHEET | `public/game/Pendekar Suryakerta-BC/ARGA_RUNTIME_CALIBRATION_SHEET.png` | Camera convention, direction poses, frame timing |
| walk-down | `public/game/rpg/characters/sheet-char-arga-walk-down.png` | Style reference, color palette, rendering quality |
| walk-up | `public/game/rpg/characters/sheet-char-arga-walk-up.png` | Back-view reference |
| walk-side | `public/game/rpg/characters/sheet-char-arga-walk-side.png` | Side-view reference |
| Pack 01 master | Inside `BahasaCerdas_RPG_Asset_Pack_01.zip` | Highest quality concept art — outfit details |

### Timing References (motion analysis only, NOT style reference)

| Reference | Path | Use For |
|-----------|------|---------|
| idle-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-idle-down-a2-rebuild.png` | Breathing timing ONLY |
| run-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-run-down-a2-rebuild.png` | Run cycle timing ONLY |
| attack-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-attack-down-a2-rebuild.png` | Attack timing + VFX ONLY |

---

## 12. DELIVERABLE FORMAT

### Per Sheet
- **File**: `sheet-char-arga-<state>-<dir>.png`
- **Dimensions**: 224×N (where N = 224 × frameCount)
- **Format**: PNG-32 (RGBA, transparent background)
- **Frames**: Horizontal strip, evenly spaced, 224×224 each
- **No** baked hitboxes, labels, backgrounds, or UI

### Sidecar JSON
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

### Naming Convention
```
sheet-char-arga-{state}-{dir}.png
sheet-char-arga-{state}-{dir}.json
```

Examples:
- `sheet-char-arga-idle-down.png` + `.json`
- `sheet-char-arga-walk-side.png` + `.json`
- `sheet-char-arga-run-up.png` + `.json`

---

## 13. PRODUCTION PIPELINE

### Phase 1: Master Character (P2.4)
1. Produce ONE canonical master Arga artwork (full body, all directions)
2. Founder visual approval
3. Lock as production reference

### Phase 2: Animation Sheets (P2.5+)
1. Idle-down (6 frames, front-facing)
2. Walk-up, walk-side (8 frames each)
3. Run-down, run-up, run-side (10 frames each)
4. Attack-down, attack-up, attack-side (6 frames each)
5. Skill-down (8 frames)
6. Hurt-down (4 frames) — REDRAW from canonical, do NOT use Gen-B
7. Defeat-down (8 frames)
8. Victory-down (8 frames)
9. Interact-down (6 frames)

### Validation
- Each sheet validated against this spec
- Frame counts match arga-contract.ts
- Canvas 224×224, RGBA, transparent
- Feet origin (0.5, 1.0)
- Style consistent with walk-down reference
- No Gen-B or Gen-C elements
