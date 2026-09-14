# P2.4A — Arga Master Art Production Report

## Status

**FOUNDER_REVIEW_REQUIRED**

The master character reference has been created from verified Gen-A canonical sources. It must be visually reviewed by the founder before animation production begins.

---

## 1. Master File

| Property | Value |
|----------|-------|
| **Path** | `public/game/rpg/characters/ARGA_MASTER_CHARACTER_REFERENCE.png` |
| **Sidecar** | `public/game/rpg/characters/ARGA_MASTER_CHARACTER_REFERENCE.json` |
| **Dimensions** | 1774 × 1100 px |
| **Format** | RGBA PNG |
| **Size** | 876 KB |
| **Status** | FOUNDER_REVIEW_REQUIRED |

---

## 2. Contents

### Left Panel — Pack 01 Master Portrait (Concept Art)
- Source: `BahasaCerdas_RPG_Asset_Pack_01.zip` → `arga/arga_master_character.png`
- Original: 1233 × 1275 px, RGBA
- Description: Highest quality canonical reference. Shows cream tunic, orange patterned scarf (concept art detail), blue patterned trousers, keris at hip. Semi-realistic portrait style.

### Right Panel — 4-Direction Runtime Reference (Rescued Gen-A)
- Sources: Rescued walk-down/up/side sheets (Gen-A, calibration pack)
- Frame 0 extracted from each 8-frame sheet
- Upscaled from 224×224 to 512×512 for visibility
- Directions shown:
  - **DOWN**: Front-facing (character faces camera)
  - **UP**: Back-facing (character faces away)
  - **SIDE Left**: Left profile
  - **SIDE Right**: Mirrored from left

---

## 3. Directions

| Direction | Convention | Source |
|-----------|-----------|--------|
| DOWN | **Front-facing** | walk-down frame 0 |
| UP | **Back-facing** | walk-up frame 0 |
| SIDE | **Left profile** (+ mirrored right) | walk-side frame 0 |

---

## 4. Canon Compliance

| Attribute | Result | Notes |
|-----------|--------|-------|
| Camera | ✅ PASS | DOWN=front, UP=back, SIDE=profile. No 3/4 angles. |
| Outfit | ✅ PASS | Cream tunic visible in all Gen-A sources. No armor. |
| Scarf | ✅ PASS (runtime) | Red solid in walk sheets. Orange patterned in Pack01 portrait (concept art detail — not used for runtime). |
| Hair | ✅ PASS | Black/dark, visible under headband. |
| Headband | ✅ PASS | Red-ochre, visible in Pack01 portrait and walk sheets. |
| Trousers | ✅ PASS | Dark/indigo in all Gen-A sources. |
| Boots | ✅ PASS | Brown, visible at feet level. |
| Weapon | ⚠️ LOW VISIBILITY | Keris visible in Pack01 portrait; too small to clearly see at 224px chibi scale in walk sheets. |
| Proportion | ✅ PASS | Chibi ~1:2 head:body across all Gen-A sources. |
| Rendering | ✅ PASS | Soft painterly-flat, warm palette, clean silhouette. |
| Lighting | ✅ PASS | Consistent warm lighting across all Gen-A walk frames. |

---

## 5. Source References Used

| Source | Path | Use |
|--------|------|-----|
| Pack 01 master portrait | `public/game/Pendekar Suryakerta-BC/BahasaCerdas_RPG_Asset_Pack_01.zip` → `arga/arga_master_character.png` | Concept art reference, outfit details, weapon |
| ARGA_RUNTIME_CALIBRATION_SHEET | `public/game/Pendekar Suryakerta-BC/ARGA_RUNTIME_CALIBRATION_SHEET.png` | Camera convention, direction poses |
| walk-down | `public/game/rpg/characters/sheet-char-arga-walk-down.png` | Runtime style reference, DOWN direction |
| walk-up | `public/game/rpg/characters/sheet-char-arga-walk-up.png` | UP direction reference |
| walk-side | `public/game/rpg/characters/sheet-char-arga-walk-side.png` | SIDE direction reference |

---

## 6. Old Assets Excluded

| Asset | Reason |
|-------|--------|
| Gen-B blue hurt-down | INCOMPATIBLE — blue outfit, dark armor, different character |
| Gen-C P2.3D rebuilds | INCOMPATIBLE — side-view for "down", orange patterned scarf |
| Pack 07 master reference | INCOMPATIBLE — blue outfit, different design |

These were NOT used as design source. Only referenced to understand what NOT to reproduce.

---

## 7. Known Limitations

1. **This is a composite from existing assets, not new artwork.** The Pack 01 portrait is the highest quality reference available. The 4-direction views are from rescued 224px runtime sprites upscaled to 512px.
2. **Resolution limitation.** The runtime walk sprites are 224×224 per frame. Upscaling to 512px shows pixel-level detail but does not add new information.
3. **Concept art vs runtime gap.** Pack 01 portrait has more detail (orange patterned scarf, blue trousers with ikat pattern) than the chibi runtime sprites (red solid scarf, dark trousers). Runtime sprites follow the calibration sheet adaptation.
4. **No new art created.** Blender/3D tools were unavailable. This master reference assembles the best existing canonical sources.
5. **Keris visibility.** At 224px chibi scale, the keris is very small. Production sprites should maintain its presence but it will be a small detail.

---

## 8. What This Master Is

- **A composite reference document** — not a new illustration
- **The canonical source of truth** for Arga's visual identity
- **A handoff specification** for future art production
- **A founder review gate** — must be approved before animation

## 9. What This Master Is NOT

- **Not new artwork** — assembled from existing canonical sources
- **Not a runtime sprite sheet** — too large, contains labels
- **Not animation-ready** — single frame per direction only
- **Not the final production master** — may need to be redrawn at higher fidelity after founder review

---

## 10. Files Created

| File | Action |
|------|--------|
| `public/game/rpg/characters/ARGA_MASTER_CHARACTER_REFERENCE.png` | Created — 1774×1100 composite master |
| `public/game/rpg/characters/ARGA_MASTER_CHARACTER_REFERENCE.json` | Created — sidecar metadata |
| `docs/P2_4A_ARGA_MASTER_ART_PRODUCTION.md` | This document |

---

## 11. Files Modified

None — no production code or existing assets modified.

---

## 12. Tests

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors (no code changes) |
| `npx tsx scripts/test-rpg-asset-integration.ts` | ✅ 47/47 pass (new file not in manifest) |

The new master reference PNG is in `characters/` but is NOT registered in the runtime manifest (it's a reference document, not a production sprite). The orphan check only validates READY assets in the manifest.

---

## 13. Next Step

**STOP — Wait for founder visual review.**

The founder must review `ARGA_MASTER_CHARACTER_REFERENCE.png` and decide:

1. **APPROVE** — The existing Gen-A rescued assets are sufficient as canonical. Proceed to P2.4B (animation production from these sources).
2. **REJECT — NEEDS REDRAW** — The rescued assets are too low-fidelity. Commission new artwork based on this reference + the Master Art Spec.
3. **MODIFY** — Specific changes needed before approval.

No animation production begins until the founder approves the master character.
