# P2.3E — Arga Founder Visual Gate Report

## Status: NEEDS_REVIEW (3 states require redraw or artist refinement)

## Executive Verdict

P2.3D rebuilds are **technically sound** (22/22 frames valid, baseline uniform, no duplicates) but **visually inconsistent with rescued assets**. The 3 rebuilt states use a different art style and viewing angle than the rescued walk-down. The rescued hurt-down uses a completely different outfit (blue vs cream). **None of the 3 rebuilt states can serve as MASTER STYLE reference** without reconciliation with the rescued art.

## Visual Gate — Per State

### IDLE-DOWN (6 frames, rebuilt)

**Quality: B — Good (with notes)**

| Criterion | Verdict |
|-----------|---------|
| Character identity | ✅ Consistent across all 6 frames — black messy hair, red headband, flame-orange scarf, cream tunic, dark trousers, brown boots, golden bracer |
| Camera consistency | ✅ Side-view throughout, no angle jumps. Frames 01–06 all show left-facing profile |
| Animation quality | ✅ Breathing cycle reads naturally — scarf shifts, arm position changes, body rises/falls. Pose continuity smooth |
| Reconstruction artifacts | ⚠️ **Brown bg contamination** visible in all frames (931–1154 px). Not blocking but unprofessional. Some edge softness from affine warp. Hair detail slightly less crisp than rescued walk |
| Feet/anchor | ✅ Baseline y=216 uniform. Center x=111 uniform. No floating, no sinking, no jitter |
| Attack VFX | N/A |

**Observation**: This is the cleanest of the 3 rebuilds. The affine warp breathing is subtle and effective. However, the rendering style (sharper outlines, more saturated colors, different tunic pattern) differs from the rescued walk-down (softer edges, cream/brown palette, red scarf). These look like the same character drawn by **different artists**.

**Recommendation: USE AS TEMPORARY REFERENCE** — character identity is correct but style mismatch with rescued walk must be resolved before MASTER STYLE designation.

---

### RUN-DOWN (10 frames, rebuilt)

**Quality: C — Needs redraw (frame 04)**

| Criterion | Verdict |
|-----------|---------|
| Character identity | ✅ Same character elements (hair, headband, scarf, tunic) visible across frames |
| Camera consistency | ⚠️ Mostly side-view but frame 07 appears to show character from **behind** (dark mass, no face visible) — perspective jump |
| Animation quality | ⚠️ Running motion reads well overall. Scarf trails naturally. BUT: **frame 04 interpolation visible** — body proportions and texture differ from neighbors (more opaque, different edge quality). Frame 08 similarly looks "off" compared to 07/09 |
| Reconstruction artifacts | ❌ **Frame 04**: clear interpolation ghosting — the body mass and texture don't match adjacent frames. **Frame 07**: appears to be a back-view, breaking side-view convention. **Frame 08**: slightly different rendering quality. **Brown bg contamination**: 1074–3355 px/frame (worst of all states) |
| Feet/anchor | ✅ Baseline y=216 uniform. Center x=111–112 uniform |
| Attack VFX | N/A |

**Observation**: This is the weakest rebuild. Frame 04 was interpolated from 03+05 and it shows — the body proportions and edge quality don't match. Frame 07 appears to be a back-view (dark hair mass, no face) which violates the side-view convention. Brown contamination is heavy.

**Recommendation: REDRAW** — frame 04 and frame 07 need original artwork. Brown bg needs cleaning.

---

### ATTACK-DOWN (6 frames, rebuilt)

**Quality: B — Good (with notes)**

| Criterion | Verdict |
|-----------|---------|
| Character identity | ✅ Same character, weapon (sword/keris) visible in frames 01–03, 06 |
| Camera consistency | ✅ Side-view throughout, no perspective jumps |
| Animation quality | ✅ Attack motion reads well — wide stance, sword drawn, slash arc, recovery. Scarf flows with motion. Body mass consistent |
| Reconstruction artifacts | ⚠️ **Brown bg contamination**: 821–1405 px/frame (reduced from original 4313–6520, but still visible). **Frame 04 interpolation**: visible as slightly different texture quality vs frames 03/05. Slash VFX is bright yellow-orange, reads clearly |
| Feet/anchor | ✅ Baseline y=216 uniform. Center x=111–112 uniform |
| Attack VFX | ✅ Slash arc is clear, transparent bg preserved, doesn't obscure anatomy, doesn't alter origin. Looks intentional |

**Observation**: Better than run-down. The slash VFX is well-rendered. Brown patches are reduced but still noticeable. Frame 04 interpolation is less jarring here than in run because the attack pose is more dynamic (hides artifacts better).

**Recommendation: USE AS TEMPORARY REFERENCE** — attack poses and slash VFX are good reference, but bg needs cleaning and frame 04 could be improved.

---

## Comparison with Rescued Walk/Hurt

### CRITICAL FINDING: Style Mismatch

| Sheet | Art Style | Viewing Angle | Outfit |
|-------|-----------|---------------|--------|
| **walk-down (RESCUED)** | Softer edges, muted palette | **FRONT-FACING** | Cream/brown tunic, **red scarf** |
| **hurt-down (RESCUED)** | Darker, more saturated | **FRONT-FACING** | **BLUE outfit with dark armor** |
| **idle-down (REBUILT)** | Sharper outlines, saturated | **SIDE-VIEW** | Cream tunic, **orange patterned scarf** |
| **run-down (REBUILT)** | Similar to idle | **SIDE-VIEW** | Same as idle |
| **attack-down (REBUILT)** | Similar to idle | **SIDE-VIEW** | Same as idle |

**The rescued walk-down and the 3 rebuilt states are NOT from the same art batch.** They differ in:
1. **Viewing angle**: walk-down = front-facing, rebuilt = side-view
2. **Outfit details**: walk-down has red scarf, rebuilt has orange patterned scarf
3. **Rendering style**: walk-down has softer edges, rebuilt has sharper outlines
4. **Color palette**: walk-down is more muted, rebuilt is more saturated

**The rescued hurt-down is a completely different character** — blue outfit with dark armor, no scarf. This is either a different character entirely or a very early concept.

### Implications

The rebuilt states cannot be MASTER STYLE because:
1. They don't match the rescued walk (which is the most "complete" rescued state at 8 frames)
2. The rescued walk is front-facing while rebuilds are side-view — the game needs consistent viewing angles
3. The outfit inconsistency (red vs orange scarf) means the character design hasn't been finalized

### What This Means

**The A2 calibration batch and the rescued walk/hurt are from different art generations.** Neither can serve as MASTER STYLE without reconciliation. The artist must decide:
- Which viewing angle is canonical (front-facing or side-view)?
- Which outfit is final (red scarf or orange patterned)?
- Which rendering style to use?

---

## Reconstruction Artifacts Summary

| Artifact | Idle | Run | Attack | Severity |
|----------|------|-----|--------|----------|
| Brown bg contamination | 931–1154 px | 1074–3355 px | 821–1405 px | Medium |
| Interpolation ghosting | None visible | Frame 04, 08 | Frame 04 | High (run), Low (attack) |
| Perspective jump | None | Frame 07 (back-view) | None | High (run) |
| Edge softness | Slight | Moderate | Slight | Low |
| Inconsistent rendering | vs rescued walk | vs rescued walk | vs rescued walk | High (all) |

---

## Master Style Recommendation

**NO STATE RECOMMENDED AS MASTER STYLE.**

Reason: The 3 rebuilt states and the 2 rescued states represent **at least 3 different art generations** (front-facing red-scarf, front-facing blue-outfit, side-view orange-scarf). A master style requires a single, consistent art direction that all future states follow.

The closest candidate for master style reference is the **rescued walk-down** (8 frames, consistent, front-facing) — but it needs:
1. A matching side-view counterpart (currently missing)
2. Resolution of the outfit question (red vs orange scarf)
3. The hurt-down to be redrawn in the same style

---

## Production Recommendation

| State | Quality | Recommendation | Rationale |
|-------|---------|----------------|-----------|
| IDLE-DOWN | B | **USE AS TEMPORARY REFERENCE** | Clean breathing animation, consistent side-view, but style mismatch with rescued walk |
| RUN-DOWN | C | **REDRAW** | Frame 04 interpolation visible, frame 07 perspective jump, heavy brown bg |
| ATTACK-DOWN | B | **USE AS TEMPORARY REFERENCE** | Good slash VFX, consistent side-view, but bg needs cleaning and style mismatch |

**Overall: TEMPORARY REFERENCE only.** These rebuilds are useful as animation timing and pose reference, but cannot be promoted to READY or used as master style without artist reconciliation.

---

## Remaining Missing States (11 sheets)

| State | Direction | Status |
|-------|-----------|--------|
| idle-up | MISSING | Needs new art |
| idle-side | MISSING | Needs new art |
| run-up | MISSING | Needs new art |
| run-side | MISSING | Needs new art |
| attack-up | MISSING | Needs new art |
| attack-side | MISSING | Needs new art |
| skill-down | MISSING | Needs new art |
| defeat-down | MISSING | Needs new art |
| victory-down | MISSING | Needs new art |
| interact-down | NEEDS_REVIEW | A2 batch not provided |

---

## Final Next Step

1. **Founder decision**: Which viewing angle is canonical — front-facing (walk-down style) or side-view (rebuilt style)?
2. **Founder decision**: Which outfit is final — red scarf (walk-down) or orange patterned (rebuilt)?
3. **Once decided**: Artist redraws all states in the chosen style. The P2.3D rebuilds serve as animation timing reference only.
4. **Hurt-down**: Must be redrawn entirely — current rescued version uses a completely different outfit.

---

## Tests

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx tsx scripts/test-rpg-asset-integration.ts` | ✅ 47/47 pass |

No production code changes — documentation and visual analysis only.

## Files Changed

None — only `docs/P2_3E_ARGA_FOUNDER_VISUAL_GATE.md` created.

## Manifest Status

No changes. All 3 states remain `NEEDS_REVIEW`. No promotion to READY.
