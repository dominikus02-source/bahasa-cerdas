# P2.11 — RPG Visual Runtime Completion

Status: **CODE COMPLETE / ASSET FILE PENDING**

## What changed

- Registered a production visual atlas in `rpg-asset-manifest.ts`.
- Promoted NPCs, enemies, bosses, village house, tree, and well from reference-only/procedural paths to READY runtime keys.
- Renderer now supports shared-atlas source rectangles.
- NPC interactions render the corresponding production character art.
- Live enemies and bosses render production art with size-aware scaling.
- Village house/tree entities use production art when the atlas is present.
- Existing procedural fallback remains explicit for assets that are still genuinely missing.

## Required runtime asset

Place the generated atlas at:

`public/game/rpg/visual/rpg_runtime_atlas.png`

Dimensions: **640 × 640 PNG RGBA**

SHA-256:

`fedb457b45af96a29e34c100f3eabb0fa1e8793bd01ab20fced60cfc4b48880b`

The atlas contains 16 reviewed runtime crops:
NPCs (5), enemies (4), bosses (4), village props (3).

## Scope safety

- No GIMBC changes.
- No Main Bersama changes.
- RPG remains unpublished until Founder explicitly reopens it.
- No gameplay rules or quest logic were changed.
