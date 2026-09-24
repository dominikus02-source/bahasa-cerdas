# P2.11 — RPG Visual Runtime Completion

Status: **CODE COMPLETE / ASSET FILE PENDING**

## What changed

- Registered candidate runtime IDs in `rpg-asset-manifest.ts`; the binary atlas is still pending.
- Wired NPC/enemy/boss/prop asset keys to the renderer, but kept them gated until the binary art is verified.
- Renderer now supports shared-atlas source rectangles.
- NPC interactions render the corresponding production character art.
- Live enemies and bosses render production art with size-aware scaling.
- Village house/tree entities use production art when the atlas is present.
- Existing procedural fallback remains explicit for assets that are still genuinely missing.

## Required runtime asset

Place the generated atlas at:

`public/game/rpg/visual/rpg_runtime_atlas.png`

Dimensions: **640 × 640 PNG RGBA**

SHA-256: **not yet verified**. Do not promote the manifest entries to READY until the binary is present and its hash is computed from the actual file.

The atlas is intended to contain 16 reviewed runtime crops:
NPCs (5), enemies (4), bosses (4), village props (3).

## Scope safety

- No GIMBC changes.
- No Main Bersama changes.
- RPG remains unpublished until Founder explicitly reopens it.
- No gameplay rules or quest logic were changed.


## Founder/CTO gate

Current branch state intentionally keeps the 16 P2.11 atlas entries at **NEEDS_REVIEW** because `public/game/rpg/visual/rpg_runtime_atlas.png` is not present in the repository. This prevents the renderer from treating reference-derived coordinates as production art.

Promotion to **READY** requires:
1. the actual binary atlas is added at the exact runtime path;
2. PNG is verified as 640×640 RGBA;
3. every source rectangle is inside bounds and visually checked;
4. SHA-256 is computed from that exact binary;
5. the P2.11 asset test and TypeScript/build gates pass.

No generated contact sheet, poster, or conceptual image is sufficient for this gate.
