# Kuis Tempur — World Assets

This directory contains individual 2D environment assets for Kuis Tempur.

- Assets are designed for a responsive mobile + desktop/landscape game world.
- Assets should be individual PNG sprites with transparent backgrounds.
- Do not use one giant background image.
- Terrain, trees, houses, bushes, rocks, fences, flowers, props, and decals
  are separated so the renderer can compose the world dynamically.
- Existing player/avatar (`public/avatar/`, `public/junior/karakter/`) and
  monster/bot assets remain separate and must not be moved here.
- Gameplay and character assets are outside the scope of this asset pack.

## Asset inventory (World Assets Pack V1, organized QT-ASSET-02)

- `terrain/` (8): grass_01, grass_02, dirt_01, path_01, grass_flowers,
  mixed_01, dirt_rocks, sand_01.
- `trees/` (10): tree_01–tree_05, tree_small, tree_tall, tree_wide,
  tree_palm, tree_bush_yellow.
- `houses/` (4): house_01–house_04.
- `bushes/` (8): bush_01, bush_02, bush_04–bush_08 (bush_03 missing from
  pack), bush_flower (renamed from extensionless pack file `png`).
- `rocks/` (8): rock_01–rock_04, rock_small, rock_cluster, rock_moss,
  rock_stack.
- `fences/` (6): fence_01–fence_03, fence_broken, fence_corner, fence_gate.
- `flowers_details/` (8): flower_01–flower_04, flower_red, flower_blue,
  flower_mix, grass_clump.
- `props/` (10): sign_wood, sign_direction, barrel, crate, hay_stack, well,
  lamp_post, stump, log, cart.
- `decals/` (8): grass_patch_01, grass_patch_02, dirt_patch, stone_patch,
  leaves, flowers_scatter, footprint, shadow_soft.

Pack manifest: `../Asset Kuis Tempur/st.json`. Reference-only files
(style sheets, catalog, mockup JPGs) stay in the pack folder and are NOT
part of the production world set.

## Karantina runtime DICABUT (QT-WORLD-02 §0, gate QT-ASSET-05 PASS)
`decals/shadow_soft.png` dan `decals/flowers_scatter.png` sudah diganti file
bersih terverifikasi dan aktif di pool. Mekanisme `QUARANTINED_ASSETS`
dipertahankan kosong untuk insiden aset di masa depan.

## Arsip/non-runtime (QT-WORLD-02 §0)
- `flowers_scatter (1).png` (duplikat fringe parah) — DIHAPUS.
- `terrain/arena_base_01.png` (lukisan scene utuh) — dipindah ke
  `../Asset Kuis Tempur/arena_base_01-ARCHIVED-do-not-use-as-runtime.png`.
  JANGAN wire sebagai runtime (melanggar arsitektur dunia modular).
