# PHASE 2.3A — RPG Runtime Art Readiness Report

> Status: **PASS WITH NOTES** (audit complete, honest classifications, zero fabrication)
> Date: 2026-09-12 · Branch: deploy-pk · After: P2.3 (`8f1c8fd`)
> Scope: documentation + audit ONLY. No gameplay, visual, or system code changed in this phase.

---

## 1. Executive Summary

All 11 packs inventoried (132 files: 91 original + 41 new). The 103 P2.1 READY slices re-verified intact. Packs 07–11 (41 files) are **higher-fidelity presentation sheets, not engine-ready sprites**: transparent backgrounds in places, but labeled layouts, interleaved text bands (proven by band analysis), and preview-scale frames (~70px vs the 224px Arga contract). Nothing was promoted without proof. The single largest remaining item is **15 missing Arga engine sheets**, specified exactly below. No code changes were required by this audit.

---

## 2. Exact Asset Inventory

| Pack | Files | READY | REFERENCE_ONLY | NEEDS_REVIEW | MISSING |
|---|---|---|---|---|---|
| 01 Characters/NPC/Monster | 14 | 0 | 3 (2 source sheets + master) | 10 (1 arga master illustration counts as ref; animation sheet, 4 monster, 5 NPC) | 0 |
| 02 Env/Props/Items/VFX/UI | 29 | 0 new (13 items already READY in P2.1) | 8 (2 collages, 5 UI mockups, boss ref) | 21 (5 tilesets, terrain variasi, props, 8 VFX, equipment, chest-loot) | 0 |
| 03 Bosses | 6 | 0 | 1 (master) | 4 boss sheets + 1 (batch counted in 02 ref) | 0 |
| 04 Desa | 14 | 26 terrain cells (standing) | 2 (atlas, collision doc) | 8 (09_variations, row3, nature/props/structures/interactive/effects) | 0 |
| 05 Gunung | 14 | 32 terrain cells (standing) | 1 (atlas) | 7 | 0 |
| 06 Menara | 14 | 32 terrain cells (standing) | 1 (atlas) | 7 | 0 |
| 07 Arga Runtime (NEW) | 11 | 0 | 1 (master) | 9 state sheets | 0 files, **15 engine sheets missing** |
| 08 NPC Runtime (NEW) | 7 | 0 | 1 (master) | 5 NPC sheets | 0 files, **20 engine sheets missing** |
| 09 Monster Runtime (NEW) | 6 | 0 | 1 (master) | 4 monster sheets | 0 files, **20 engine sheets missing** |
| 10 Boss Runtime (NEW) | 6 | 0 | 1 (master) | 4 boss sheets | 0 files, **~16 engine sheets missing** |
| 11 VFX Runtime (NEW) | 11 | 0 | 1 (master) | 9 effect strips | 0 files, engine VFX set missing |
| **Total new** | **41** | **0** | **5** | **36** | engine sheets as listed |

Manifest total after P2.3: 190 entries (103 READY + ~20 REFERENCE_ONLY + ~66 NEEDS_REVIEW + 1 MISSING class), plus 36 new `ref:rt-*` entries from P2.3 (all NEEDS_REVIEW/REFERENCE_ONLY, zero new READY).

---

## 3. Arga Runtime Manifest

Source of truth: `rendering/arga-contract.ts` (`ARGA_FRAMES` + `argaDirsFor` + `expectedArgaSheets()`).
Verified sheet count: **15** = (walk/run/attack × 3 dirs) + (idle/skill/hurt/defeat/victory/interact × down).
Computed, not assumed. Contract is FROZEN (no modification to fit art).

| # | Runtime filename | State | Dir | Frames | Frame | Sheet (W×H px) | Origin | Mirror | Status | Source ref | Exact blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | sheet-char-arga-idle-down.png | idle | down | 6 | 224×224 | 1344×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-idle | no 224px clean frames exist; ref grid ~70px cells with labels |
| 2 | sheet-char-arga-walk-down.png | walk | down | 8 | 224×224 | 1792×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-walk | same |
| 3 | sheet-char-arga-walk-up.png | walk | up | 8 | 224×224 | 1792×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-walk | same |
| 4 | sheet-char-arga-walk-side.png | walk | side | 8 | 224×224 | 1792×224 | (0.5,1.0) | mirrors left | MISSING | ref:rt-arga-walk | same |
| 5 | sheet-char-arga-run-down.png | run | down | 10 | 224×224 | 2240×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-run | same |
| 6 | sheet-char-arga-run-up.png | run | up | 10 | 224×224 | 2240×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-run | same |
| 7 | sheet-char-arga-run-side.png | run | side | 10 | 224×224 | 2240×224 | (0.5,1.0) | mirrors left | MISSING | ref:rt-arga-run | same |
| 8 | sheet-char-arga-attack-down.png | attack | down | 6 | 224×224 | 1344×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-attack | same |
| 9 | sheet-char-arga-attack-up.png | attack | up | 6 | 224×224 | 1344×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-attack | same |
| 10 | sheet-char-arga-attack-side.png | attack | side | 6 | 224×224 | 1344×224 | (0.5,1.0) | mirrors left | MISSING | ref:rt-arga-attack | same |
| 11 | sheet-char-arga-skill-down.png | skill | down | 8 | 224×224 | 1792×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-skill | same |
| 12 | sheet-char-arga-hurt-down.png | hurt | down | 4 | 224×224 | 896×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-hurt | same |
| 13 | sheet-char-arga-defeat-down.png | defeat | down | 8 | 224×224 | 1792×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-defeat | same |
| 14 | sheet-char-arga-victory-down.png | victory | down | 8 | 224×224 | 1792×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-victory | same |
| 15 | sheet-char-arga-interact-down.png | interact | down | 6 | 224×224 | 1344×224 | (0.5,1.0) | n/a | MISSING | ref:rt-arga-interact | same |

Each sheet requires a JSON sidecar per the pipeline schema (assetKey, category `characters`, canvas/frame grid, origin, directions, animation state/loop/80ms). Timing: ~80ms/frame (12-fps feel).

---

## 4. NPC Runtime Manifest

Canonical IDs (dialogue/shop/forge/quest data untouched): Ki Jaka, Bu Ratmi, Bu Sari, Eyang Kartala, Pak Empu.
Required states per mission: idle / walk / talk / interact. Directions: 4-dir with side mirror permitted.
Frame counts below are OBSERVED on the reference sheets (pack-01 labels: IDLE 4 / WALK 6 / INTERACT 4 / TALK 4) — recorded as observed, not as contract; delivery must confirm.

| NPC | States × dirs | Observed frames | Dimensions | Current asset | Status | Blocker |
|---|---|---|---|---|---|---|
| Ki Jaka | idle/walk/talk/interact × 4-dir (mirror) | per-sheet labels (confirm at delivery) | opaque 307×809 sheet | ref:rt-npc-ki-jaka | NEEDS_REVIEW | opaque background; text bands at 5–32, 140–163, 271–324, 433–488, 597–650 (proven); no clean frames |
| Bu Ratmi | same pattern | per-sheet labels | opaque 307×809 | ref:rt-npc-bu-ratmi | NEEDS_REVIEW | same class |
| Bu Sari | same pattern | per-sheet labels | opaque 308×809 | ref:rt-npc-bu-sari | NEEDS_REVIEW | same class |
| Eyang Kartala | same pattern | per-sheet labels | opaque 307×809 | ref:rt-npc-eyang-kartala | NEEDS_REVIEW | same class |
| Pak Empu | same pattern | per-sheet labels | opaque 307×809 | ref:rt-npc-pak-empu | NEEDS_REVIEW | same class |

Required delivery per NPC: 4 transparent strips (or sheets + sidecars: idle/walk/talk/interact), feet origin, sidecar metadata. Frame counts follow the reference sheets' own labels (delivery must confirm; not transcribed here to avoid misquoting). Total: **20 engine sheets MISSING** (5 NPCs × 4 states; dirs bundled per sheet or split — either accepted if metadata declares it).

---

## 5. Monster Runtime Manifest

Canonical (data/enemies.ts, stats/AI/spawns/combat untouched): Korog (g), Korog Perang (w), Golem Batu (gl), Korog Bayangan (sh).
States: idle / walk / attack / hurt / defeat × 4-dir (side mirror). Frame counts follow each sheet's own labels (delivery must confirm; not transcribed here to avoid misquoting).

| Monster | Observed sheet | Current asset | Status | Blocker |
|---|---|---|---|---|
| Korog | 384×842, 5 labeled bands (proven) | ref:rt-mon-korog | NEEDS_REVIEW | labels interleaved between strips; semi-alpha noise throughout (measured); frames ~60px |
| Korog Perang | 384×842, same format | ref:rt-mon-korog-perang | NEEDS_REVIEW | same class |
| Golem Batu | 384×842, same format | ref:rt-mon-golem-batu | NEEDS_REVIEW | same class |
| Korog Bayangan | 384×842, same format | ref:rt-mon-korog-bayangan | NEEDS_REVIEW | same class |

Required: **20 engine sheets MISSING** (4 monsters × 5 states; transparent, labeled-free, sidecar'd). Missing is "artwork unsuitable", NOT "monster unknown" — combat data is complete.

---

## 6. Boss Runtime Manifest

Canonical (stats/flags/quests/tower logic untouched): Raja Korog (b), Golem Agung (ga), Naga Abu (na), Penguasa Menara (tw).
States: idle / walk / attack / skill / hurt / defeat (+victory observed on raja sheet). Scale: landmark 3.2-tile class per bible (visual scale only — collision formulas untouched).

| Boss | Observed sheet | Current asset | Status | Blocker |
|---|---|---|---|---|
| Raja Korog | 384×837 opaque, 14 dark bands (proven) | ref:rt-boss-raja-korog | NEEDS_REVIEW | opaque; portrait + expressions + skill icons share the sheet; strips interleaved with text |
| Golem Agung | 384×837 opaque | ref:rt-boss-golem-agung | NEEDS_REVIEW | same class |
| Naga Abu | 384×837 opaque | ref:rt-boss-naga-abu | NEEDS_REVIEW | same class |
| Penguasa Menara | 384×837 opaque | ref:rt-boss-penguasa-menara | NEEDS_REVIEW | same class |

Required: **~16 engine sheets MISSING** (4 bosses × 6 states; larger canvases per bible 384×512 class; transparent; origin bottom-center). Boss must read larger than monsters via art scale, never via hitbox changes.

---

## 7. VFX Runtime Manifest

Engine kinds today: HIT / HEAL / LEVEL_UP / QUEST_COMPLETE. Presentation needs: attack swing, crit, hurt flash, victory/defeat banners, learning correct/wrong, level-up, portal/teleport, loot sparkle.
Pack 11: 9 strips, ALL fully opaque (alpha=255 everywhere, measured) with left label columns.

| Sheet | Rows observed | Current asset | Status | Blocker for runtime |
|---|---|---|---|---|
| 01 movement/footstep/dash | rows | ref:rt-vfx-* | NEEDS_REVIEW | opaque bg; needs transparency re-export |
| 02 attack effects | Slash_Arc/Sword_Hit/Impact/Critical rows | ref:rt-vfx-* | NEEDS_REVIEW | same; label column excludable BUT bg opaque |
| 03 skill/magic, 04 elemental, 05 hit/damage, 06 status, 07 environment, 08 UI feedback, 09 interaction | rows | ref:rt-vfx-* | NEEDS_REVIEW | same class |

To make each runtime-safe: transparent re-export + uniform frame grid + per-row timing metadata + compositing-safe edges (no baked checkerboard). No VFX behavior implemented or changed in this phase.

---

## 8. Item/Equipment Audit

- READY (standing): ram, teh, elix, bijih, f3 (ikan_emas), bunga/surat/kunci/kristal/peta/bulu (13 total).
- f1/f2: **NEEDS_REVIEW** — art labels read Biru/Merah vs canonical Kecil/Besar; color≠size, mapping refused.
- Equipment strip + chest_loot strip: **NEEDS_REVIEW** — no per-icon labels; mapping icons to the six canonical equipment ids would be invention.
- No IDs invented, no prices touched, no inventory behavior touched.

---

## 9. Runtime Contract Verification (read-only, no changes)

| Contract | Location | Verdict |
|---|---|---|
| world-scale (64/128/224, zoom 0.8–1.25) | rendering/world-scale.ts | VERIFIED, unchanged |
| spriteDrawRect (feet bottom-center) | rendering/sprite-math.ts | VERIFIED, unchanged |
| animation (frameAt, 80ms, mirror) | rendering/animation.ts | VERIFIED, unchanged |
| asset registry (explicit miss) | rendering/asset-registry.ts | VERIFIED, unchanged |
| loader (cache, dedupe, error) | rendering/asset-registry.ts | VERIFIED, unchanged |
| depth/y-sort | rendering/canvas-renderer.ts | VERIFIED, unchanged |
| feet origin + shadow anchor | rendering/canvas-renderer.ts | VERIFIED, unchanged |
| culling | rendering/canvas-renderer.ts | VERIFIED, unchanged |
| manifest lookup (READY-gated) | rendering/rpg-asset-manifest.ts + canvas-renderer.ts | VERIFIED, unchanged |
| arga-contract frozen | rendering/arga-contract.ts | VERIFIED, unchanged |

No inconsistency found. Per mission: REPORT ONLY — nothing fixed, nothing touched.

---

## 10. Exact Missing/Blocked Assets

- 15 Arga engine sheets (§3 table).
- 20 NPC engine sheets (§4).
- 20 monster engine sheets (§5).
- ~16 boss engine sheets (§6).
- 9+ VFX transparent re-exports (§7).
- f1/f2 + equipment + chest-loot label resolution (§8).
- Total: **~80 engine assets blocked on art production**, all specified.

---

## 11. Production Batch Plan

- **BATCH A (first playable slice)**: 15 Arga sheets + Korog runtime (5 sheets: idle/walk/attack/hurt/defeat) + Raja Korog runtime (6 sheets) + essential VFX re-exports (attack swing, hit flash, crit, victory/defeat, learning correct/wrong, level-up, portal, loot ≈ 10 strips). Desa terrain already READY.
- **BATCH B (full Desa)**: 5 NPC sheets sets (20) + remaining monsters (Perang/Golem/Batu/Bayangan sets) + f1/f2/equipment label resolution + chest open/closed + shop/forge/portal prop art + Desa nature/props behaving grids.
- **BATCH C (Gunung)**: Golem Agung + Naga Abu sets + lava/portals/camp props + ember/smoke/heat VFX + Gunung nature/props.
- **BATCH D (Menara)**: Penguasa Menara set + wind/teleport VFX + tower props/banners/lamps + cloud/platform variants.
- **BATCH E (polish/optional)**: master illustrations as dialogue portraits, UI skin from mockups (React stays), 09_variations disambiguation, ground row-3 naming, boss victory poses, fishing art.

---

## 12. P2.3A Exit Criteria

- [x] Every required runtime asset has an explicit status (§2–§8).
- [x] Every missing asset has an exact specification (§3–§7, §10).
- [x] No asset promoted without proof (P2.3 gate stands; this phase promotes nothing).
- [x] Arga 15-sheet requirement verified from source (§3, computed from contract).
- [x] No gameplay code changed (diff audit below).
- [x] No Kuis Tempur changes (scan).
- [x] Unpublished guard unchanged (suite).
- [x] Manifest internally consistent (counts + no-dup tests).
- [x] No duplicate runtime roots (scan).
