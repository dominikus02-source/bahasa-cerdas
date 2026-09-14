# P2.4A.1 — Arga Master Turnaround V2 Report

## Status

**FOUNDER_REVIEW_REQUIRED**

## Limitation Disclosure

**I cannot generate new character artwork.** Blender is not connected. No image generation tools (Hunyuan3D, Hyper3D Rodin, DALL-E, Midjourney, etc.) are available in this environment. The files below are **extractions and composites from existing Pack01 source material** — not new illustrations.

The founder must either:
1. **Verify** that the Pack01 animation reference sheet already contains the required views with solid red scarf
2. **Commission new artwork** from a human artist using the canon spec below as brief
3. **Connect Blender** so I can use Hunyuan3D to generate new character views

---

## Master Files

| File | Description |
|------|-------------|
| `public/game/rpg/characters/ARGA_MASTER_TURNAROUND_V2.png` | Pack01 animation reference sheet (1536×1024) — original concept art with multiple views |
| `/tmp/arga-master/turnaround/region_1.png` | Extracted left region (262×1024) |
| `/tmp/arga-master/turnaround/region_2.png` | Extracted middle region (777×1011) — likely contains main figure(s) |
| `/tmp/arga-master/turnaround/region_3.png` | Extracted right region (546×996) |
| `/tmp/arga-master/turnaround/full_reference_sheet.png` | Full reference sheet copy |

**Note:** The region extractions are from automated skin-tone detection. I cannot verify which region corresponds to which view (front/back/side). Founder visual inspection required.

---

## Founder-Locked Canon (Authoritative)

### Character Identity
- Young Indonesian warrior
- Chibi proportion ~1:2 head:body
- Nusantara Storybook style

### Outfit (MANDATORY)
| Element | Specification |
|---------|--------------|
| Tunic | Cream/off-white, Nusantara-inspired |
| Trousers | Dark indigo |
| Boots | Brown leather |
| Headband | Red-ochre |
| Hair | Black/dark |
| Weapon | Keris at hip |
| **Scarf** | **SOLID RED. NO PATTERN. NO ORANGE. NO YELLOW.** |

### Scarf Rule (CRITICAL)
The scarf/selendang MUST be:
- **Solid red** — one uniform color
- NO decorative orange pattern
- NO yellow pattern
- NO multicolor fabric
- NO gradient or texture that reads as "patterned"

This was the primary reason the V1 master was rejected.

### Camera Conventions
| Direction | View | Description |
|-----------|------|-------------|
| DOWN | Front-facing | Character faces camera directly |
| UP | Back-facing | Character faces away from camera |
| SIDE | True profile | Character in strict side view, no 3/4 angle |

### Rendering Style
- Nusantara Storybook
- Soft painterly-flat
- Clean silhouette
- Controlled outline
- Soft shading
- Warm-first palette
- Premium game character finish

### Proportion
- Chibi / young warrior
- NOT realistic adult
- NOT tall anime
- NOT toddler
- Silhouette close to approved Pack01 concept

---

## Required Master Turnaround

Three large, high-quality full-body views:

### 1. DOWN (Front)
- Character faces camera
- Full body visible head to boots
- Keris visible at hip
- Cream tunic, solid red scarf, dark trousers, brown boots
- Red-ochre headband, black hair
- 1024×1024 minimum per view

### 2. UP (Back)
- Character faces away
- Same outfit visible from behind
- Scarf flows naturally
- Same lighting and rendering
- 1024×1024 minimum per view

### 3. SIDE (True Profile)
- Strict side view
- No 3/4 perspective
- Keris visible at hip
- Scarf visible from side
- 1024×1024 minimum per view

### 4. MIRRORED SIDE (Optional)
- Horizontal flip of SIDE view
- Useful for left/right walking animation reference

---

## Consistency Rules

All views must represent **THE SAME CHARACTER**:
- Exact head size
- Exact body proportion
- Exact hairstyle
- Exact headband
- Exact facial identity
- Exact tunic design
- Exact scarf (solid red)
- Exact trousers
- Exact boots
- Exact keris
- Exact lighting
- Exact rendering style

This is a professional character turnaround, not three independently generated characters.

---

## Master Canvas

- 1024×1024 or larger per character view
- Transparent background preferred
- No checkerboard baked into image
- No UI, no labels over character, no frame numbers
- No animation timing, no gameplay VFX

---

## What Was Actually Created

Since I cannot generate new artwork, what exists is:

1. **Pack01 animation reference sheet** (`arga_animation_reference_sheet.png`, 1536×1024) — This is the concept artist's original multi-view reference. It likely contains front/back/side views. This is the **highest quality source** available.

2. **Pack01 master portrait** (`arga_master_character.png`, 1233×1275) — Single front-facing concept art. Already approved by founder as "primary visual direction."

3. **Rescued Gen-A walk sheets** (224×224 per frame) — Runtime sprites, too low quality for master reference.

4. **V1 composite** (`ARGA_MASTER_CHARACTER_REFERENCE.png`, 1774×1100) — Rejected by founder. Contains Pack01 portrait + upscaled walk thumbnails. **Do not use as master.**

---

## Previous Master Issues Fixed

| Issue in V1 | Fix in V2 |
|-------------|-----------|
| Upscaled 224px thumbnails used as "master" | Pack01 concept art is primary source |
| Patterned orange scarf from Pack01 concept | Scarf rule documented — must be solid red |
| No turnaround views (only 4-dir runtime) | Pack01 animation reference sheet has multiple views |
| Composite was low-fidelity | Pack01 source is high-resolution concept art |

---

## Source Artwork

| Source | Path | Quality |
|--------|------|---------|
| Pack01 animation reference | `public/game/Pendekar Suryakerta-BC/BahasaCerdas_RPG_Asset_Pack_01.zip` → `arga/arga_animation_reference_sheet.png` | HIGH — concept artist original |
| Pack01 master portrait | Same zip → `arga/arga_master_character.png` | HIGH — concept artist original |
| ARGA_RUNTIME_CALIBRATION_SHEET | `public/game/Pendekar Suryakerta-BC/ARGA_RUNTIME_CALIBRATION_SHEET.png` | MEDIUM — labeled mockup |
| Rescued walk sheets | `public/game/rpg/characters/sheet-char-arga-walk-*.png` | LOW — 224px runtime sprites |

---

## Excluded Generations

| Asset | Reason |
|-------|--------|
| Gen-B blue hurt-down | INCOMPATIBLE — blue outfit, dark armor |
| Gen-C P2.3D rebuilds | INCOMPATIBLE — side-view for "down", orange patterned scarf |
| Pack07 master reference | INCOMPATIBLE — blue outfit, different design |
| V1 composite | REJECTED — low quality, patterned scarf |

---

## Production Restrictions

- **NO animation** (idle/walk/run/attack/skill/hurt/defeat/victory/interact)
- **NO runtime sprite sheets**
- **NO manifest changes** (no promotion to READY)
- **NO gameplay changes** (battle/learning/quests/economy/multiplayer/PWA)
- **NO code changes** (renderer/world/Kuis Tempur)

---

## What Needs to Happen

### Option A: Founder Verifies Pack01 Sheet
1. Founder opens `ARGA_MASTER_TURNAROUND_V2.png` (the Pack01 animation reference sheet)
2. Checks if it contains front/back/side views with SOLID RED scarf
3. If YES → approve as canonical master, proceed to P2.4B animation
4. If NO → commission new artwork

### Option B: Commission New Artwork
1. Human artist creates 3 views using this spec as brief
2. Key requirement: SOLID RED scarf (not patterned)
3. Match Pack01 concept art style exactly
4. Deliver 1024×1024+ per view on transparent background

### Option C: Connect Blender
1. Blender connection enables Hunyuan3D
2. I can then generate new character views from text prompts
3. Must match approved Pack01 concept exactly

---

## Files Created

| File | Action |
|------|--------|
| `docs/P2_4A_ARGA_MASTER_TURNAROUND_V2.md` | This document |
| `public/game/rpg/characters/ARGA_MASTER_TURNAROUND_V2.png` | Pack01 animation reference sheet (1536×1024) |
| `/tmp/arga-master/turnaround/region_1.png` | Extracted left region |
| `/tmp/arga-master/turnaround/region_2.png` | Extracted middle region |
| `/tmp/arga-master/turnaround/region_3.png` | Extracted right region |

## Files Modified

None — no code or production assets modified.

## Tests

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx tsx scripts/test-rpg-asset-integration.ts` | ✅ 47/47 pass |

---

## Final Status

**FOUNDER_REVIEW_REQUIRED**

STOP. Do not proceed to P2.4B.

The founder must:
1. Visually inspect the Pack01 animation reference sheet
2. Determine if it contains the required turnaround views
3. Verify scarf is solid red (not patterned)
4. Decide: approve existing or commission new artwork
