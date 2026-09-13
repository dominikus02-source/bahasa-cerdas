# P2.4A.2 — Final Master Art Handoff

## Status

**FOUNDER_REVIEW_REQUIRED**

Do NOT proceed to P2.4B until founder visually approves the master artwork.

---

## Canonical Identity

**Arga** — young Indonesian warrior, protagonist of Pendekar Suryakerta (BahasaCerdas RPG).

| Attribute | Value |
|-----------|-------|
| Name | Arga |
| Role | Young warrior protagonist |
| Origin | Nusantara-inspired fantasy world |
| Style | Nusantara Storybook |

---

## Camera Convention

| Direction | View | Description |
|-----------|------|-------------|
| DOWN | **Front-facing** | Character faces camera directly. Primary view. |
| UP | **Back-facing** | Character faces away from camera. |
| SIDE | **True profile** | Strict side view. No 3/4 angle, no dramatic perspective, no camera tilt. |

---

## Outfit

| Element | Specification |
|---------|--------------|
| Tunic | Cream/off-white, Nusantara-inspired, no armor |
| Trousers | Dark indigo |
| Boots | Brown leather |
| Headband | Red-ochre |
| Hair | Black/dark |

**Forbidden:** Blue armor, European fantasy armor, excessive ornaments, unnecessary new elements.

---

## Scarf (CRITICAL)

| Rule | Value |
|------|-------|
| Color | **SOLID RED** |
| Pattern | **NONE** |
| Variations allowed | Folds, natural shading, highlights |
| Forbidden | Decorative orange pattern, yellow pattern, multicolor fabric, gradient that reads as "patterned" |

The scarf must be visually identifiable as the same solid-red material in every direction.

---

## Hair

Black or very dark. Visible under headband. Consistent across all views.

---

## Headband

Red-ochre. Wraps around forehead. Visible in front and side views. May be partially visible from back.

---

## Trousers

Dark indigo. Consistent across all views. No patterns or decorations.

---

## Boots

Brown leather. Simple design. Visible at feet level in all views.

---

## Keris

Traditional Indonesian dagger at hip. Must appear consistently from relevant views (front, side). Not visible from back. Do not replace with sword or other weapon.

---

## Proportion

Chibi / young warrior. Approximately 1:2 head-to-body ratio. NOT realistic adult, NOT tall anime, NOT toddler. Silhouette must remain close to the approved Pack01 concept.

---

## Rendering

| Property | Value |
|----------|-------|
| Style | Nusantara Storybook |
| Technique | Soft painterly-flat |
| Outline | Controlled, clean |
| Shading | Soft, warm |
| Palette | Warm-first |
| Finish | Premium game character |
| Audience | Student-friendly |

**Forbidden:** Pixel art, photorealism, generic anime, European fantasy, excessive texture, over-rendered cinematic lighting.

---

## Lighting

Consistent warm lighting across all views. Light source direction must be the same in every view. No dramatic shadows that obscure costume details.

---

## Master Resolution

| Property | Minimum |
|----------|---------|
| Per view | 1024×1024 px |
| Recommended | 1500×1500 px or larger |
| Format | PNG |
| Background | Transparent preferred |
| Labels | None over character |
| UI | None |
| Frame numbers | None |

---

## Animation Implications

The master must provide enough detail for future animation production to inspect:

- Face features
- Hair shape and flow
- Scarf folds and draping
- Tunic structure and layering
- Hand shape
- Leg and boot structure
- Keris position and shape
- Overall silhouette at game scale

---

## Forbidden Variations

| Variation | Why |
|-----------|-----|
| Realistic adult proportions | Inconsistent with chibi style |
| Tall anime proportions | Wrong aesthetic |
| Toddler proportions | Too young for warrior role |
| Blue armor | Different character (Gen-B) |
| Orange patterned scarf | Rejected by founder |
| Yellow patterned scarf | Rejected by founder |
| European fantasy armor | Wrong cultural context |
| 3/4 perspective for "side" | Must be true profile |
| Dramatic camera angles | Reference must be neutral |
| Multiple lighting setups | Must be consistent |

---

## Source Artwork

### Primary Reference (Founder-Approved Direction)

| File | Path | Size | Notes |
|------|------|------|-------|
| Founder review master | `public/game/Pendekar Suryakerta-BC/ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png` | 1536×1024, 2.2MB | RGB, baked warm cream background. Contains 2 character regions. **REFERENCE ONLY — not production.** |

### Extracted Regions

| File | Path | Size | Notes |
|------|------|------|-------|
| Region 1 | `assets-src/rpg/characters/arga/arga_turnaround_v2_region_1.png` | 883×990, 1.2MB | Likely front/back view (symmetric). Has red (scarf), cream (tunic), dark (trousers), brown (boots). |
| Region 2 | `assets-src/rpg/characters/arga/arga_turnaround_v2_region_2.png` | 590×995, 727KB | Likely side or alternate view. Narrower. More cream visible, less red. |

### Pack01 Concept Art

| File | Path | Size | Notes |
|------|------|------|-------|
| Master portrait | `public/game/Pendekar Suryakerta-BC/BahasaCerdas_RPG_Asset_Pack_01.zip` → `arga/arga_master_character.png` | 1233×1275 | Highest quality concept art. Approved as "primary visual direction." |
| Animation reference | Same zip → `arga/arga_animation_reference_sheet.png` | 1536×1024 | Multi-view reference sheet from concept artist. |

### Runtime Sprites (Low Quality)

| File | Path | Size | Notes |
|------|------|------|-------|
| walk-down | `public/game/rpg/characters/sheet-char-arga-walk-down.png` | 224×640 (8 frames) | Gen-A, front-facing, cream tunic. Canonical but low resolution. |
| walk-up | `public/game/rpg/characters/sheet-char-arga-walk-up.png` | 224×640 (8 frames) | Gen-A, back-facing. Canonical. |
| walk-side | `public/game/rpg/characters/sheet-char-arga-walk-side.png` | 224×640 (8 frames) | Gen-A, side-view. Canonical. |

---

## Asset Classification

### CANONICAL

Gen-A rescued walk sheets — consistent with founder-locked canon:

| Asset | Path | Status |
|-------|------|--------|
| walk-down (8 frames) | `public/game/rpg/characters/sheet-char-arga-walk-down.png` | READY |
| walk-up (8 frames) | `public/game/rpg/characters/sheet-char-arga-walk-up.png` | READY |
| walk-side (8 frames) | `public/game/rpg/characters/sheet-char-arga-walk-side.png` | READY |

### INCOMPATIBLE

| Asset | Path | Reason |
|-------|------|--------|
| hurt-down | `public/game/rpg/characters/sheet-char-arga-hurt-down.png` | Gen-B: blue outfit, dark armor. Different character. |

### TEMPORARY_REFERENCE

P2.3D rebuilds — provisional placeholders only:

| Asset | Path | Notes |
|-------|------|-------|
| idle-down | `public/game/rpg/characters/review/sheet-char-arga-idle-down-a2-rebuild.png` | Frame 04 interpolated |
| run-down | `public/game/rpg/characters/review/sheet-char-arga-run-down-a2-rebuild.png` | Frames 01-03 brown bg cleaned |
| attack-down | `public/game/rpg/characters/review/sheet-char-arga-attack-down-a2-rebuild.png` | Frame 04 morphed from 03+05 |

### REFERENCE_ONLY

| Asset | Path | Notes |
|-------|------|-------|
| V1 master composite | `public/game/rpg/characters/ARGA_MASTER_CHARACTER_REFERENCE.png` | Rejected by founder |
| V2 Pack01 reference | `public/game/rpg/characters/ARGA_MASTER_TURNAROUND_V2.png` | Pack01 animation ref sheet |
| Founder review | `public/game/Pendekar Suryakerta-BC/ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png` | Founder-supplied, awaiting approval |

### MISSING

All animation states not yet produced:

| State | DOWN | UP | SIDE |
|-------|------|-----|------|
| idle | MISSING | MISSING | MISSING |
| walk | ✅ READY | ✅ READY | ✅ READY |
| run | MISSING | MISSING | MISSING |
| attack | MISSING | MISSING | MISSING |
| skill | MISSING | MISSING | MISSING |
| hurt | INCOMPATIBLE | MISSING | MISSING |
| defeat | MISSING | MISSING | MISSING |
| victory | MISSING | MISSING | MISSING |
| interact | MISSING | MISSING | MISSING |

---

## Runtime Conversion Rules

Future runtime assets (after master approval):

| Property | Value |
|----------|-------|
| Canvas | 224×224 px |
| Format | RGBA PNG |
| Background | Transparent |
| Origin | (0.5, 1.0) — feet anchor |
| Frame timing | 80ms |
| Labels | None |
| Text | None |
| UI | None |
| Presentation background | None |
| Baked hitboxes | None |

Runtime sheets are generated ONLY after master approval in P2.4B.

---

## Production Restrictions

This phase (P2.4A.2) is **documentation and preparation only**.

- NO animation frames created
- NO sprite sheets created
- NO battle modified
- NO learning modified
- NO quests modified
- NO economy modified
- NO multiplayer modified
- NO world modified
- NO renderer modified
- NO Kuis Tempur modified
- NO PWA modified
- NO publication guard modified
- NO asset promoted to READY
- NO old source artwork deleted
- NO incompatible assets recolored
- NO missing directions fabricated

---

## Files Created

| File | Description |
|------|-------------|
| `docs/P2_4A_FINAL_MASTER_ART_HANDOFF.md` | This document |
| `assets-src/rpg/characters/arga/ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png` | Founder review image (source art) |
| `assets-src/rpg/characters/arga/arga_turnaround_v2_region_1.png` | Extracted region 1 (front/back) |
| `assets-src/rpg/characters/arga/arga_turnaround_v2_region_2.png` | Extracted region 2 (side/alternate) |

## Files Modified

None — no production code or existing assets modified.

---

## Tests

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx tsx scripts/test-rpg-asset-integration.ts` | ✅ 47/47 pass |

---

## Previous Master Issues

| Issue | Resolution |
|-------|------------|
| V1 used upscaled 224px thumbnails | V2 uses Pack01 concept art |
| V1 had patterned orange scarf | Scarf rule locked: SOLID RED |
| No turnaround views in V1 | V2 has 2 character regions from concept art |
| V1 was a composite, not source art | V2 is the actual concept artwork |

---

## Next Step

**STOP — FOUNDER_REVIEW_REQUIRED**

The founder must:

1. Open `assets-src/rpg/characters/arga/ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png`
2. Verify the views present (front/back/side)
3. Verify scarf is SOLID RED
4. Verify outfit matches canon (cream tunic, dark trousers, brown boots)
5. Approve or request revision

Only after explicit founder approval may P2.4B (animation production) begin.
