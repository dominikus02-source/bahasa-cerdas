# P2.5B Founder Canon Alignment

Date: 2026-09-14
Repository: `/Users/user/bahasa-cerdas`

## Locked canon

Arga is the young Indonesian Pendekar Suryakerta in the Nusantara Storybook
style: stylized chibi proportion, soft painterly-flat rendering, clean
silhouette, warm premium palette, cream tunic, solid red scarf, dark indigo
trousers, brown boots, red-ochre headband, black hair, and keris at the hip.

`DOWN` is front-facing, `UP` back-facing, and `SIDE` a true profile. The
approved direction contract has down/side idle, down/up/side walk, run, and
attack, and down-only skill, hurt, defeat, victory, and interact. This is 16
expected authored sheet keys; left-facing rendering is a mirror of the true
profile side art rather than separate fabricated art.

## Alignment made

Only stale test expectations were changed:

- `scripts/test-rpg-visual-foundation.ts` now verifies idle down/side,
  down/up/true-profile-side locomotion, and 16 expected sheets.
- `scripts/test-rpg-asset-integration.ts` now labels the existing three ready
  sheets as three of 16 expected sheets. Its readiness assertions remain
  unchanged and strict.

No artwork, animation frames, runtime renderer, contract, or manifest status
was changed in P2.5B.

## Manifest verification

| State | Count | Classification |
| --- | ---: | --- |
| READY | 3 | Gen-A walk down/up/side only |
| NEEDS_REVIEW | 4 | Gen-B hurt-down and Gen-C idle/run/attack rebuilds |
| REFERENCE_ONLY | 5 | Extracted side candidates and A2 motion references |
| MISSING | 6 | Required production states without valid source art |

Gen-B blue/armored hurt-down remains `NEEDS_REVIEW` and explicitly
incompatible. Gen-C/orange-patterned-scarf rebuilds remain non-production.
No missing state was fabricated or promoted.

## Proposed commit manifest (not staged)

| Class | Paths | Reason |
| --- | --- | --- |
| A — COMMIT | `src/game/rpg/rendering/{arga-contract,rpg-asset-manifest}.ts`; `scripts/test-rpg-{visual-foundation,asset-integration}.ts` | Canonical metadata and strict test alignment. |
| A — COMMIT | `public/game/rpg/characters/sheet-char-arga-walk-{down,up,side}.{png,json}` | The three validated Gen-A runtime walk sheets and metadata. |
| A — COMMIT | `docs/{P2_3C_ARGA_A2_CALIBRATION_AUDIT,P2_3D_ARGA_A2_REBUILD,P2_3E_ARGA_FOUNDER_VISUAL_GATE,P2_4C_ARGA_SIDE_PRODUCTION_GATE,P2_4C2_ARGA_SIDE_EXTRACTION_REPORT,PHASE_2_3B_ARGA_RUNTIME_RESCUE,P2_5_WORKTREE_RECONCILIATION,P2_5B_FOUNDER_CANON_ALIGNMENT}.md` | Required provenance, gates, and reconciliation record. |
| B — HOLD | `public/game/rpg/characters/review/**`; non-walk `sheet-char-arga-*`; `assets-src/rpg/characters/arga/{pack01_region_1.png,pack01_region_2.png,pack01_subregion_1.png,package/**,package-a2/**,side-extraction/**}` | Preserve as review/reference source; none is approval to ship runtime art. |
| B — HOLD | `src/game/rpg/legacy/pendekar-suryakerta.prototype.html` | Intentional historical source, but should be reviewed in a separate legacy-source commit. |
| C — EXCLUDE | `public/game/Pendekar Suryakerta-BC/*.zip` and the two non-ZIP reference boards in that folder | Large source archives/reference boards; retain locally, outside this runtime commit. |
| D — UNRELATED USER WORK | Agent, Question Factory, migration/storage, GIM Card, Docker, Prisma Agent migration, and associated docs/tests | Preserved exactly; outside RPG scope. |

The archive folder contains 14 ZIP files (approximately 4.3–13 MB each).
They were not staged, moved, deleted, or added to `.gitignore`.

## Validation

- All 19 `test:rpg-*` commands exited successfully after alignment.
- `test:rpg-asset-integration` reports the expected conservative Arga state.
- `npm run typecheck` still reports only the known unrelated Agent
  `WorkerHealthView` errors for `registry`, `staleWorkers`, and `workers`.

`test:rpg-battle-core` prints one legacy diagnostic claiming that the game engine
must not import battle modules, but exits 0 and conflicts with the deliberately
integrated battle runtime covered by `test:rpg-battle-runtime`. It predates and
is unrelated to this Arga alignment; it is not changed here.

No files were staged, committed, pushed, moved, or deleted. `gimbc` was not
accessed or changed.
