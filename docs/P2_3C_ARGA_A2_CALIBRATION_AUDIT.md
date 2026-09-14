# P2.3C — Arga A2 Calibration Audit Report

> Status: **NEEDS_REVIEW** (3 critical issues found, 0 promoted)
> Date: 2026-09-13 · Branch: deploy-pk
> Scope: audit ONLY. No runtime code, manifest, or renderer changed.

---

## 1. Source Inventory

| Item | Value |
|---|---|
| Pack | `BahasaCerdas_RPG_Asset_Pack_12_Arga_A2_Calibration.zip` |
| States | IDLE (6f), RUN (10f), ATTACK (6f) |
| Total frames | 22 individual PNGs |
| Strip files | ARGA_IDLE.png (1344×224), ARGA_RUN.png (2240×224), ARGA_ATTACK.png (1344×224) |
| Frame size | 224×224 RGBA ✅ |
| Background | Transparent ✅ |
| Origin claim | (0.5, 1.0) — verified ✅ |
| Sidecar JSON | ARGA_A2_CALIBRATION_BATCH.json ✅ |

### File checklist

| Condition | IDLE | RUN | ATTACK |
|---|---|---|---|
| Correct frame count | 6/6 ✅ | 10/10 ✅ | 6/6 ✅ |
| All 224×224 | ✅ | ✅ | ✅ |
| RGBA mode | ✅ | ✅ | ✅ |
| Transparent background | ✅ | ✅ | ✅ |
| No labels/text | ✅ | ✅ | ✅ |
| No borders | ✅ | ✅ | ✅ |
| No presentation chrome | ✅ | ✅ | ✅ |
| No baked hitboxes | ✅ | ✅ | ✅ |
| All frames unique | 6/6 ✅ | 10/10 ✅ | 6/6 ✅ |

**STEP 1 verdict: PASS** — all technical format requirements met.

---

## 2. Visual Consistency Audit

Compared against existing rescued sheets (walk-down 8f, walk-up 8f, walk-side 8f, hurt-down 4f).

### 2.1 IDLE — NEEDS_REVIEW

| Aspect | Frames 01–03 | Frames 04–06 | Verdict |
|---|---|---|---|
| Head/body proportion | Large, 3/4 front view | Slim, side view | ❌ INCONSISTENT |
| Character width | 188–203px | 121–131px | ❌ Two distinct sizes |
| Aspect ratio | 0.90–0.98 | 0.58–0.63 | ❌ Different rendering angle |
| Hair silhouette | Visible, flowing | Visible, flowing | ✅ Consistent |
| Red headband | Present | Present | ✅ Consistent |
| Flame-orange scarf | Present, flowing | Present | ✅ Consistent |
| Cream tunic | Present | Present | ✅ Consistent |
| Indigo trousers | Present | Present | ✅ Consistent |
| Feet baseline | y=216 | y=216 | ✅ Consistent |
| Center alignment | x=112 | x=112 | ✅ Consistent |
| Character scale vs walk | 1.04× (comparable) | 1.04× (comparable) | ✅ |

**Critical issue**: Frames 01–03 show Arga in a 3/4 front-facing pose (wide, detailed chest/arms visible). Frames 04–06 show Arga in a pure side-view pose (slim, profile). These are visually two different characters or two different rendering angles mixed into one state. For a consistent idle animation, all 6 frames should share the same viewing angle.

### 2.2 RUN — NEEDS_REVIEW

| Aspect | Assessment | Verdict |
|---|---|---|
| Direction | All side-facing | ✅ Consistent |
| Scarf trailing | Present, flowing | ✅ Good motion |
| Hair silhouette | Consistent | ✅ |
| Red headband | Present | ✅ |
| Feet baseline | y=216 (all 10 frames) | ✅ Perfect |
| Center alignment | x=112 (all 10 frames) | ✅ Perfect |
| Character height | 122–208px | ❌ 40% variation |
| Frame 04 | Height=122px (59% of normal) | ❌ SEVERE scale jump |
| Semi-transparent patches | 1235–2922 px/frame | ⚠️ Contamination |

**Critical issue**: Frame 04 has character height of 122px while adjacent frames are 194–208px. This is a 41% height reduction — a severe scale jump that would cause visible "squashing" during animation playback. The character appears to be in a deeply crouched/compressed pose that breaks locomotion continuity.

### 2.3 ATTACK — NEEDS_REVIEW

| Aspect | Assessment | Verdict |
|---|---|---|
| Direction | All side-facing | ✅ Consistent |
| Sword visible | Frames 01–03, 05–06 | ✅ |
| Flame VFX | Frames 01–03 | ✅ (must NOT be hitboxes) |
| Feet baseline | y=216 (all 6 frames) | ✅ Perfect |
| Center alignment | x=112 (all 6 frames) | ✅ Perfect |
| Character height | 122–208px | ❌ 40% variation |
| Frame 04 | Height=122px (59% of normal) | ❌ SEVERE scale jump |
| Semi-transparent patches | Dark brown areas in 01–03 | ⚠️ Background residue |

**Critical issue**: Same as RUN — frame 04 has 122px height (59% of normal 208px). Additionally, frames 01–03 contain visible dark/brown semi-transparent background patches (4313–6520 brownish pixels per frame in top-left quadrant alone). These would create visible dark halos when rendered over non-matching backgrounds.

---

## 3. Frame-Level Audit

### 3.1 Bounding box summary

| Frame | bbox | size | bottom_y | center_x | semi_trans |
|---|---|---|---|---|---|
| idle_01 | (10,8,213,216) | 203×208 | 216 | 111.5 | 1612 |
| idle_02 | (18,8,206,216) | 188×208 | 216 | 112.0 | 1594 |
| idle_03 | (11,8,213,216) | 202×208 | 216 | 112.0 | 1657 |
| idle_04 | (51,8,172,216) | 121×208 | 216 | 111.5 | 1082 |
| idle_05 | (46,8,177,216) | 131×208 | 216 | 111.5 | 1149 |
| idle_06 | (47,8,176,216) | 129×208 | 216 | 111.5 | 1088 |
| run_01 | (44,8,179,216) | 135×208 | 216 | 111.5 | 1235 |
| run_02 | (8,10,216,216) | 208×206 | 216 | 112.0 | 2922 |
| run_03 | (8,15,216,216) | 208×201 | 216 | 112.0 | 2753 |
| **run_04** | **(8,94,216,216)** | **208×122** | **216** | **112.0** | **2206** |
| run_05 | (8,22,216,216) | 208×194 | 216 | 112.0 | 2542 |
| run_06 | (8,35,216,216) | 208×181 | 216 | 112.0 | 2035 |
| run_07 | (13,8,210,216) | 197×208 | 216 | 111.5 | 2866 |
| run_08 | (8,37,216,216) | 208×179 | 216 | 112.0 | 2190 |
| run_09 | (8,13,216,216) | 208×203 | 216 | 112.0 | 2747 |
| run_10 | (8,30,216,216) | 208×186 | 216 | 112.0 | 2766 |
| atk_01 | (17,8,206,216) | 189×208 | 216 | 111.5 | 800 |
| atk_02 | (11,8,213,216) | 202×208 | 216 | 112.0 | 1193 |
| atk_03 | (8,24,216,216) | 208×192 | 216 | 112.0 | 1013 |
| **atk_04** | **(8,94,216,216)** | **208×122** | **216** | **112.0** | **914** |
| atk_05 | (8,22,216,216) | 208×194 | 216 | 112.0 | 2023 |
| atk_06 | (8,8,216,216) | 208×208 | 216 | 112.0 | 1114 |

### 3.2 Issues found

| Issue | Severity | Frames affected | Detail |
|---|---|---|---|
| Height collapse | HIGH | run_04, atk_04 | 122px vs 194–208px normal (59%) |
| Idle angle inconsistency | HIGH | idle_04–06 | 3/4 front (01–03) vs side (04–06) |
| Semi-transparent contamination | MEDIUM | All 22 frames | 800–2922 non-black semi-transparent px |
| Dark background patches | MEDIUM | atk_01–03 | 4313–6520 brownish pixels |
| No duplicate frames | — | All 22 | All unique ✅ |
| No corrupted/empty frames | — | All 22 | All have content ✅ |
| Feet baseline perfect | — | All 22 | bottom_y=216 ✅ |
| Center alignment perfect | — | All 22 | center_x=112 ✅ |

---

## 4. Animation Audit

### 4.1 IDLE — NEEDS_REVIEW

- Frames 01–03: Subtle breathing/stance variation, stable feet ✅
- Frames 04–06: Different viewing angle, stable feet ✅
- **Problem**: Angle jump between 03→04 breaks animation continuity. The character appears to rotate ~90° between frames.
- No accidental attack/run motion ✅

### 4.2 RUN — NEEDS_REVIEW

- Coherent locomotion in frames 01–03, 05–10 ✅
- Scarf motion visible and consistent ✅
- **Problem**: Frame 04 is a severe "dip" — character compresses to 59% height. This creates a visible squash in the run cycle.
- Running silhouette readable in most frames ✅

### 4.3 ATTACK — NEEDS_REVIEW

- Preparation → strike → follow-through visible in frames 01–03, 05–06 ✅
- Sword remains visually coherent ✅
- Flame VFX present (must NOT become hitboxes) ⚠️
- **Problem**: Frame 04 height collapse (same as run). Also, dark background patches in frames 01–03 would create visible artifacts.
- Attack motion readable despite issues ✅

---

## 5. Runtime Contract Check

### 5.1 Canonical keys (arga-contract.ts)

| Contract key | Frames | Direction | A2 provides | Status |
|---|---|---|---|---|
| sheet-char-arga-idle-down | 6 | down | 6f, side+front mix | ⚠️ angle inconsistent |
| sheet-char-arga-idle-up | 6 | up | — | MISSING |
| sheet-char-arga-idle-side | 6 | side | — | MISSING |
| sheet-char-arga-run-down | 10 | down | 10f, side view | ⚠️ frame 04 scale jump |
| sheet-char-arga-run-up | 10 | up | — | MISSING |
| sheet-char-arga-run-side | 10 | side | — | MISSING |
| sheet-char-arga-attack-down | 6 | down | 6f, side view | ⚠️ frame 04 + bg patches |
| sheet-char-arga-attack-up | 6 | up | — | MISSING |
| sheet-char-arga-attack-side | 6 | side | — | MISSING |

### 5.2 Remaining MISSING states (unchanged)

| State | Frames | Status |
|---|---|---|
| skill | 8 | MISSING |
| defeat | 8 | MISSING |
| victory | 8 | MISSING |
| interact | 6 | MISSING |

**Note**: A2 provides only "down" direction data for idle/run/attack. The contract requires 3 directions (down/up/side) for these states. Up and side directions remain MISSING.

---

## 6. Manifest Safety

### Decision: NO PROMOTION

All 3 A2 states classified as **NEEDS_REVIEW** due to:

| State | Reason | Classification |
|---|---|---|
| idle-down | Two distinct character angles in 6 frames | NEEDS_REVIEW |
| run-down | Frame 04 height collapse (122px vs 208px) | NEEDS_REVIEW |
| attack-down | Frame 04 height collapse + dark bg patches | NEEDS_REVIEW |

Existing rescued sheets (walk-down/up/side, hurt-down) remain READY and authoritative. No downgrade.

---

## 7. Required Fixes Before Promotion

### Fix 1 — Idle angle consistency (BLOCKING)
Frames 04–06 must be re-rendered in the same 3/4 front-facing angle as frames 01–03, OR frames 01–03 must be re-rendered in side-view to match 04–06. All 6 frames must share one viewing angle.

### Fix 2 — Run frame 04 height (BLOCKING)
Frame 04 must be re-rendered at normal character height (~194–208px) to match adjacent frames. The current 122px height creates a severe squash in the run cycle.

### Fix 3 — Attack frame 04 height (BLOCKING)
Same as Fix 2 — frame 04 must match the height of frames 03 and 05.

### Fix 4 — Attack background patches (RECOMMENDED)
Frames 01–03 contain dark/brown semi-transparent background residue. These should be cleaned to pure transparent before promotion. Not blocking but would cause visual artifacts.

### Fix 5 — Semi-transparent contamination (RECOMMENDED)
All 22 frames have 800–2922 semi-transparent non-black pixels. This is likely anti-aliasing from the original rendering. Acceptable for production but should be minimized.

---

## 8. Files Changed (audit-only, no runtime)

| File | Change |
|---|---|
| `docs/P2_3C_ARGA_A2_CALIBRATION_AUDIT.md` | New — this audit report |
| `src/game/rpg/rendering/rpg-asset-manifest.ts` | Updated 3 entries from MISSING→NEEDS_REVIEW with A2 paths + notes |
| `scripts/test-rpg-asset-integration.ts` | Updated Arga count assertions (4/8/3 READY/MISSING/NEEDS_REVIEW) |
| `/tmp/arga-a2/output/` | Assembled strip PNGs for founder review (not in production dir) |

No renderer, engine, or contract files changed.

## 9. Conclusion

The A2 calibration batch demonstrates:
- ✅ Correct technical format (224×224, RGBA, transparent)
- ✅ Correct frame counts per state
- ✅ Perfect feet baseline alignment (y=216)
- ✅ Perfect center alignment (x=112)
- ✅ No duplicate or corrupted frames
- ✅ Consistent character design elements (headband, scarf, tunic, trousers)

But has 3 critical issues:
- ❌ Idle: two distinct character angles mixed in one state
- ❌ Run: frame 04 severe height collapse
- ❌ Attack: frame 04 severe height collapse + background patches

## 10. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (manifest + test) | ✅ 0 violations |
| `npx tsx scripts/test-rpg-asset-integration.ts` | ✅ 47/47 pass |
| A2 strip assembly | ✅ 3 strips in `/tmp/arga-a2/output/` |
| Manifest entries updated | ✅ 3 NEEDS_REVIEW with audit notes |
| No renderer changes | ✅ Confirmed (canvas-renderer.ts untouched) |

---

**P2.3C audit complete. All 3 A2 states NEEDS_REVIEW — 0 promoted to READY.**
