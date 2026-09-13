# P2.3G — Arga Visual Canon Report

## Status: FOUNDER_LOCKED = TRUE

**Decision date**: September 13, 2026
**Decision authority**: Founder (Dominikus)

Three distinct Arga character designs exist in the repository. Founder has reviewed P2.3F audit and locked the canonical Arga identity. This document is now the production handoff specification.

---

## 1. Source Inventory

### Production Assets (PNG on disk)

| Asset | Pack | Generation | Angle | Outfit | Scarf | Frames | Scale | Status |
|-------|------|-----------|-------|--------|-------|--------|-------|--------|
| walk-down | calibration | Gen-A (chibi) | **FRONT** | Cream/brown tunic | Red | 8 | 2.222 | READY |
| walk-up | calibration | Gen-A (chibi) | **BACK** | Cream/brown tunic | Red (from behind) | 8 | 2.174 | READY |
| walk-side | calibration | Gen-A (chibi) | **LEFT** | Cream/brown tunic | Red | 8 | 2.326 | READY |
| hurt-down | Pack07 | Gen-B (blue) | **FRONT** | **BLUE outfit, dark armor** | Red | 4 | 2.632 | READY |
| idle-down | p2.3d-rebuild | Gen-C (A2) | **SIDE** | Cream tunic | **Orange patterned** | 6 | — | NEEDS_REVIEW |
| run-down | p2.3d-rebuild | Gen-C (A2) | **SIDE** | Cream tunic | **Orange patterned** | 10 | — | NEEDS_REVIEW |
| attack-down | p2.3d-rebuild | Gen-C (A2) | **SIDE** | Cream tunic | **Orange patterned** | 6 | — | NEEDS_REVIEW |

### Reference Sheets (inside zip packs, not on disk as runtime)

| Reference | Pack | Resolution | Character Design |
|-----------|------|-----------|-----------------|
| arga_master_character.png | Pack01 | 1233×1275 | **Cream tunic, orange patterned scarf, blue patterned trousers, sword at hip** — semi-realistic portrait |
| arga_animation_reference_sheet.png | Pack01 | 1536×1024 | Animation reference (not inspected) |
| ARGA_RUNTIME_CALIBRATION_SHEET.png | Root | Full | **Chibi version of Pack01 design** — 4 directions × 4 states (idle/walk/run/attack), 4 frames each, front-facing down |
| arga_runtime_master_reference.png | Pack07 | 1536×1024 | **BLUE outfit, dark armor, red scarf** — chibi, 4 directions × 9 states, 4 frames each |
| arga_walk_4dir_reference.png | Pack07 | 360×355 | Walk reference (small, ~35px per frame) |
| arga_idle_4dir_reference.png | Pack07 | 350×355 | Idle reference (small) |
| arga_attack_4dir_reference.png | Pack07 | 360×355 | Attack reference (small) |
| arga_hurt_4dir_reference.png | Pack07 | 370×370 | Hurt reference (small) |
| 7 more state refs | Pack07 | ~360×355 | Skill/defeat/victory/interact/run references |

### A2 Calibration Source (extracted to /tmp)

| Source | Frames | Notes |
|--------|--------|-------|
| ARGA_IDLE.png | Sheet | A2 batch source strip |
| ARGA_RUN.png | Sheet | A2 batch source strip |
| ARGA_ATTACK.png | Sheet | A2 batch source strip |
| frames/idle/01-06 | 6 individual | Individual frames used for P2.3D rebuild |
| frames/run/01-10 | 10 individual | Individual frames used for P2.3D rebuild |
| frames/attack/01-06 | 6 individual | Individual frames used for P2.3D rebuild |

---

## 2. Visual Bible Cross-Check

**The Visual Bible file does not exist.** `src/game/rpg/docs/RPG_VISUAL_BIBLE.md` is referenced in code comments at:
- `src/game/rpg/rendering/world-scale.ts:4` — "Visual Bible §14, §18"
- `src/game/rpg/rendering/arga-contract.ts:6,22` — "Visual Bible §14"
- `src/game/rpg/rendering/camera.ts:25,125` — "Visual Bible range 0.8–1.25"
- `src/game/rpg/world/grid-coords.ts:13` — "Visual Bible §25"

**What the code DOES enforce (canonical constants):**
| Constant | Value | Source |
|----------|-------|--------|
| Canvas size | 224×224 px | `HERO_CANVAS_PX` in world-scale.ts |
| Art scale | 2× (128 logical → 224 canvas) | `ART_SCALE` in world-scale.ts |
| Frame duration | 80ms (12fps) | `FRAME_MS` in world-scale.ts |
| Feet origin | (0.5, 1.0) | `ARGA_ORIGIN` in arga-contract.ts |
| Zoom range | 0.8–1.25 | world-scale.ts |
| Directions | down/up/side (side mirrors for left/right) | `argaDirsFor()` in arga-contract.ts |

**What the code does NOT enforce (art direction — missing from Visual Bible):**
- Camera convention (front vs side for "down")
- Character outfit/design
- Rendering style
- Color palette
- Proportions

---

## 3. Conflict Matrix

### CAMERA CONVENTION

| Source | "Down" means | "Side" means |
|--------|-------------|-------------|
| ARGA_RUNTIME_CALIBRATION_SHEET | **FRONT-facing** (character faces camera) | LEFT/RIGHT (profile) |
| Pack 07 master | **FRONT-facing** | LEFT/RIGHT |
| Rescued walk-down | **FRONT-facing** | — |
| Rescued walk-side | — | **LEFT profile** |
| Rescued walk-up | **BACK-facing** | — |
| P2.3D rebuilds (idle/run/attack) | **LEFT profile** ❌ | N/A |

**Conflict**: P2.3D rebuilds use side-view for "down". ALL other sources use front-facing for "down". This is a fundamental mismatch.

### OUTFIT

| Source | Tunic | Trousers | Armor | Overall |
|--------|-------|----------|-------|---------|
| Pack 01 master (portrait) | Cream/white with traditional pattern | **Blue with ikat pattern** | None | Semi-realistic, detailed |
| ARGA_RUNTIME_CALIBRATION_SHEET | Cream/brown | Dark brown | None | Chibi, warm palette |
| Rescued walk (all dirs) | Cream/brown | Dark brown | None | Chibi, soft edges |
| Pack 07 master | — | — | **Blue outfit + dark vest/armor** | Chibi, cooler palette |
| Rescued hurt-down | — | — | **Blue outfit + dark armor** | Chibi, matches Pack 07 |
| P2.3D rebuilds | Cream | Dark | None | Chibi, sharper edges |

**Conflict**: THREE distinct outfit designs:
1. **Gen-A** (Pack01 + Calibration + Rescued walk): Cream tunic, no armor
2. **Gen-B** (Pack07 + Rescued hurt): Blue outfit, dark armor
3. **Gen-C** (P2.3D/A2): Cream tunic, orange scarf (similar to Gen-A but different rendering)

### SCARF / SELENDANG

| Source | Color | Pattern | Shape |
|--------|-------|---------|-------|
| Pack 01 master | **Orange** with gold geometric pattern | Traditional ikat/songket | Long, flowing, gold brooch |
| ARGA_RUNTIME_CALIBRATION_SHEET | **Red/Orange** | Solid or subtle | Shorter, simpler |
| Rescued walk (all dirs) | **Red** | Solid | Medium, flowing |
| Pack 07 master | **Red** | Solid | Visible from behind |
| Rescued hurt-down | **Red** | Solid | — |
| P2.3D rebuilds | **Orange** with geometric pattern | Similar to Pack 01 | Long, flowing |

**Conflict**: TWO scarf families:
1. **Red solid** (Calibration sheet, rescued walk, Pack 07)
2. **Orange patterned** (Pack 01 portrait, P2.3D rebuilds)

### RENDERING STYLE

| Source | Style | Outlines | Shading | Palette |
|--------|-------|----------|---------|---------|
| Pack 01 master | Semi-realistic portrait | Soft | Detailed, multi-layer | Warm, saturated |
| ARGA_RUNTIME_CALIBRATION_SHEET | 2.5D pixel/chibi | Thin | Simple cell | Warm, muted |
| Rescued walk | 2.5D pixel/chibi | Soft/none | Soft gradient | Warm, muted |
| Pack 07 | 2.5D pixel/chibi | Thicker | Flat cell | Cooler, saturated |
| P2.3D rebuilds | 2.5D pixel/chibi | Sharp, visible | More contrast | Warm, saturated |

### PROPORTIONS

| Source | Head:Body | Style |
|--------|----------|-------|
| Pack 01 master | ~1:3 (anime proportions) | Full body portrait |
| Calibration sheet | ~1:2 (chibi) | Game sprite |
| Rescued walk | ~1:2 (chibi) | Game sprite |
| Pack 07 | ~1:2 (chibi) | Game sprite |
| P2.3D rebuilds | ~1:2 (chibi) | Game sprite |

All game sprites use chibi proportions (~1:2 head:body). Pack 01 portrait uses anime proportions (~1:3). This is expected — the portrait is concept art, the sprites are runtime adaptations.

### WEAPON

| Source | Weapon | Position |
|--------|--------|----------|
| Pack 01 master | Keris/sword with ornate golden hilt | At left hip, sheathed |
| Calibration sheet | Not clearly visible (chibi scale) | — |
| Rescued walk | Not clearly visible | — |
| P2.3D attack | Sword drawn, slash VFX | In hand during attack |

---

## 4. Canonical Candidate

### Strongest Source: Pack 01 Master + ARGA_RUNTIME_CALIBRATION_SHEET

**Rationale:**
1. **Pack 01** is the earliest pack (Pack_01) — implies it was the first/primary design
2. **Pack 01 master** is the highest quality reference — full detail, 1233×1275px
3. **ARGA_RUNTIME_CALIBRATION_SHEET** is a direct chibi adaptation of the Pack 01 design (same cream tunic, orange/red scarf, same character)
4. The **rescued walk-down/up/side** match the calibration sheet style — these are the most complete rescued assets (8 frames × 3 directions)
5. The calibration sheet defines the camera convention: **front-facing for "down"**

### Why NOT Pack 07:
- Pack 07 shows a **different outfit** (blue + armor) that conflicts with Pack 01
- Pack 07 appears to be an **earlier or alternate design** iteration
- The rescued hurt-down matches Pack 07 but conflicts with the rescued walk set
- Pack 07's frame count (4 per state) is lower than the contract requires (6-10 per state)

### Why NOT P2.3D/A2:
- Uses **wrong camera angle** (side-view for "down" instead of front-facing)
- Uses **orange patterned scarf** that matches Pack 01 portrait but not the calibration sheet's simpler red
- Art style (sharper outlines, more saturated) doesn't match the calibration sheet
- Rebuilt from AI-generated frames, not original artist work

---

## 5. Incompatible Assets

| Asset | Path | Reason |
|-------|------|--------|
| hurt-down | `public/game/rpg/characters/sheet-char-arga-hurt-down.png` | **Gen-B (Pack 7) blue outfit** — visually different character from canonical Gen-A design |
| idle-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-idle-down-a2-rebuild.png` | **Side-view for "down"** — wrong camera convention |
| run-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-run-down-a2-rebuild.png` | **Side-view for "down"** — wrong camera convention |
| attack-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-attack-down-a2-rebuild.png` | **Side-view for "down"** — wrong camera convention |

**Do NOT delete these files.** They remain as reference material but must not be promoted to READY or used as production assets.

---

## 6. Temporary References

| Asset | Path | Use For |
|-------|------|---------|
| idle-down (rebuild) | `review/sheet-char-arga-idle-down-a2-rebuild.png` | Breathing animation timing reference ONLY |
| run-down (rebuild) | `review/sheet-char-arga-run-down-a2-rebuild.png` | Run cycle timing reference ONLY |
| attack-down (rebuild) | `review/sheet-char-arga-attack-down-a2-rebuild.png` | Attack pose + slash VFX timing reference ONLY |

---

## 7. Compatible Reference Assets

| Asset | Path | Notes |
|-------|------|-------|
| walk-down | `public/game/rpg/characters/sheet-char-arga-walk-down.png` | **Best runtime reference** — 8 frames, front-facing, Gen-A style |
| walk-up | `public/game/rpg/characters/sheet-char-arga-walk-up.png` | Back-view, consistent with walk-down |
| walk-side | `public/game/rpg/characters/sheet-char-arga-walk-side.png` | Side-view, consistent with walk-down |
| ARGA_RUNTIME_CALIBRATION_SHEET | `public/game/Pendekar Suryakerta-BC/ARGA_RUNTIME_CALIBRATION_SHEET.png` | **Master camera + direction reference** |
| Pack 01 master | Inside `BahasaCerdas_RPG_Asset_Pack_01.zip` | **Highest quality character portrait** |

---

## 8. Missing Production Assets (11 states)

| State | Direction | Frames Needed | Status |
|-------|-----------|--------------|--------|
| idle-down | front | 6 | MISSING (rebuild incompatible) |
| idle-up | back | 6 | MISSING |
| idle-side | left | 6 | MISSING |
| run-up | back | 10 | MISSING |
| run-side | left | 10 | MISSING |
| attack-up | back | 6 | MISSING |
| attack-side | left | 6 | MISSING |
| skill-down | front | 8 | MISSING |
| defeat-down | front | 8 | MISSING |
| victory-down | front | 8 | MISSING |
| interact-down | front | 6 | MISSING |

---

## 9. FOUNDER-LOCKED CANON

### 9.1 Camera Convention

| Direction | Convention |
|-----------|-----------|
| **DOWN** | **FRONT-facing** — character faces the camera |
| **UP** | **BACK-facing** — character faces away from camera |
| **SIDE** | **LEFT profile** — character faces left; right = horizontal mirror |

The P2.3D rebuilds used side-view for "down". This is **NOT canonical**. All production assets must use front-facing for "down".

### 9.2 Outfit

**Canonical**: Gen-A cream tunic (no armor).

| Element | Canonical |
|---------|----------|
| Tunic | Cream/white with traditional pattern, short-sleeved |
| Trousers | Dark/indigo with subtle pattern |
| Armor | **NONE** — no vest, no chest plate, no shoulder guards |
| Boots | Brown leather wrap-style |

**Forbidden**: Blue outfit, dark armor, vest (Gen-B Pack 7).

### 9.3 Scarf / Selendang

**Canonical**: **Red solid scarf / selendang**.

| Property | Canonical |
|----------|----------|
| Color | Red (solid, no pattern) |
| Pattern | None — solid color |
| Length | Medium, flowing behind character |
| Fastening | At neck/chest |

**Forbidden**: Orange patterned scarf (Gen-C P2.3D rebuilds, Pack 01 portrait).

### 9.4 Rendering Style

**Canonical direction** (Gen-A / Visual-Bible-aligned):

- **Soft painterly-flat stylization** — not photorealistic, not flat-vector
- **Clean readable silhouette** — clear character outline at small sizes
- **Premium but student-friendly** — appealing to Indonesian school-age audience
- **Warm-first palette** — dominant warm tones (cream, brown, red)
- **Controlled outlines** — thin to medium outlines, not heavy black borders
- **Consistent lighting** — single light source, no conflicting shadows
- **Nusantara Storybook identity** — Indonesian cultural visual language

### 9.5 Proportion

| Property | Value |
|----------|-------|
| Head:Body ratio | ~1:2 (chibi proportions) |
| Head | Round, ~40% of total height |
| Body | Compact, ~60% of total height |
| Legs | Short, ~30% of total height |
| Feet | Visible, at bottom of canvas |
| Overall height | Fits within 224×224 canvas with ~10% padding top/bottom |

### 9.6 Canonical Identity Summary

Freeze the following. No redesign, no new costume interpretation, no alternate scarf color, no alternate armor generation:

- Front-facing DOWN convention
- Cream tunic (no armor)
- Red solid scarf / selendang
- Black/dark hair
- Red-ochre headband
- Dark/indigo trousers
- Brown boots
- Established chibi body proportion (~1:2)
- Established weapon identity (keris/sword at hip, drawn during attack)
- Nusantara Storybook rendering style

### 9.7 Incompatible Generations

| Generation | Source | Reason | Classification |
|-----------|--------|--------|---------------|
| **Gen-B** | Pack 07 + rescued hurt-down | Blue outfit, dark armor — different character | **INCOMPATIBLE** |
| **Gen-C** | P2.3D/A2 rebuilds (idle/run/attack-down) | Side-view for "down" — wrong camera convention; orange patterned scarf — wrong color | **TEMPORARY_REFERENCE** (timing/motion analysis only) |

### 9.8 Production Rules

1. **DO NOT** promote any current P2.3D state to READY
2. **DO NOT** promote hurt-down (Gen-B) to READY
3. **DO NOT** delete old assets — keep as reference
4. **DO NOT** overwrite rescued assets
5. **DO NOT** fabricate new animation frames
6. **DO NOT** generate new animation in this phase
7. **DO NOT** recolor Gen-B into Gen-A
8. **DO NOT** use side-view for "down" direction

---

## 10. Asset Classification

### CANONICAL (production-ready, matches locked canon)

| Asset | Path | Notes |
|-------|------|-------|
| walk-down | `public/game/rpg/characters/sheet-char-arga-walk-down.png` | 8 frames, front-facing, Gen-A, cream/red |
| walk-up | `public/game/rpg/characters/sheet-char-arga-walk-up.png` | 8 frames, back-view, Gen-A, cream/red |
| walk-side | `public/game/rpg/characters/sheet-char-arga-walk-side.png` | 8 frames, left-profile, Gen-A, cream/red |
| ARGA_RUNTIME_CALIBRATION_SHEET | `public/game/Pendekar Suryakerta-BC/ARGA_RUNTIME_CALIBRATION_SHEET.png` | Master camera + direction reference |

### COMPATIBLE (reference material, not production sprites)

| Asset | Path | Notes |
|-------|------|-------|
| Pack 01 master portrait | Inside `BahasaCerdas_RPG_Asset_Pack_01.zip` | Highest quality concept art — outfit/color reference |

### TEMPORARY_REFERENCE (timing/motion analysis ONLY)

| Asset | Path | Use For |
|-------|------|---------|
| idle-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-idle-down-a2-rebuild.png` | Breathing animation timing reference ONLY |
| run-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-run-down-a2-rebuild.png` | Run cycle timing reference ONLY |
| attack-down (rebuild) | `public/game/rpg/characters/review/sheet-char-arga-attack-down-a2-rebuild.png` | Attack pose + slash VFX timing reference ONLY |

### INCOMPATIBLE (must NOT be used in production)

| Asset | Path | Reason |
|-------|------|--------|
| hurt-down | `public/game/rpg/characters/sheet-char-arga-hurt-down.png` | Gen-B blue outfit — visually different character. Must be redrawn from canonical design. |

### MISSING (require production — 11 states)

| State | Direction | Frames Needed | Priority |
|-------|-----------|--------------|----------|
| idle-down | front | 6 | HIGH |
| idle-up | back | 6 | MEDIUM |
| idle-side | left | 6 | MEDIUM |
| run-up | back | 10 | MEDIUM |
| run-side | left | 10 | MEDIUM |
| attack-up | back | 6 | LOW |
| attack-side | left | 6 | LOW |
| skill-down | front | 8 | LOW |
| defeat-down | front | 8 | LOW |
| victory-down | front | 8 | LOW |
| interact-down | front | 6 | LOW |

---

## 11. Files Changed

| File | Change |
|------|--------|
| `docs/P2_3F_ARGA_VISUAL_CANON.md` | Updated: status → FOUNDER_LOCKED, added §9 FOUNDER-LOCKED CANON, §10 Asset Classification, removed old §9-12 |
| `docs/ARGA_MASTER_ART_SPEC.md` | Created: master art handoff specification |

---

## 12. Tests

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx tsx scripts/test-rpg-asset-integration.ts` | ✅ 47/47 pass |

---

## 13. Next Phase

**P2.4 — ARGA MASTER ART PRODUCTION**

The first deliverable is ONE canonical master Arga artwork (full character sheet, all directions), followed by founder visual approval. No 15-sheet production until the master character is approved.
