# P2.5 Worktree Reconciliation

Audit date: 2026-09-14
Canonical repository: `/Users/user/bahasa-cerdas`
Branch / HEAD: `bc-agent-p4-tools` / `6e15d562f3456cf50b4724acec90eafc2314214d`

`/Users/user/GIM BC Projects/gimbc` was not inspected or changed as part of this
audit. It is a separate 3D prototype, not an input to the BahasaCerdas RPG.

## Scope and working-tree snapshot

The pre-documentation snapshot had 8 modified tracked paths, 77 untracked Git
entries, and 176 untracked files after expanding directories. No staged changes
were present. This document is the sole P2.5 edit, so the post-audit working tree
has one additional untracked file.

| Scope | Classification | Intentional | Future handling |
| --- | --- | --- | --- |
| `AGENTS.md`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `src/agent/persistence/service.ts` | F — Agent/platform work | Yes | Keep separate from an RPG commit. |
| `scripts/test-rpg-asset-integration.ts`, `src/game/rpg/rendering/arga-contract.ts`, `src/game/rpg/rendering/rpg-asset-manifest.ts` | D / A — RPG test and implementation | Yes | Candidate for a reviewed Arga reconciliation commit. |
| `.dockerignore`, `Dockerfile.worker`, `app/(dashboard)/admin/agent/**`, `app/api/admin/agent/**`, `app/api/cron/agent-resume/**`, `src/agent/control/**`, `src/agent/persistence/queries.ts`, `src/agent/worker/**`, `prisma/migrations/manual/2026-09-14_bc_agent_p7_worker_registry.sql`, `scripts/test-bc-agent-{p5-worker,p6-control,p7-worker}.ts`, `docs/BC_AGENT_P{5_WORKER,6_CONTROL_CENTER,7_ALWAYS_ON_WORKER_AUDIT,7_OPERATIONS,7}_REPORT.md` | F — unrelated Agent work | Yes | Preserve; do not include in an RPG commit. |
| `docs/QUESTION_FACTORY_*.md`, `docs/question-bank-pilot/**`, `scripts/lib/question-bank-validator/result.ts`, `public/images/GIM Card/{lari kata,tebak kata}-card.png` | F — unrelated product work | Yes | Preserve; do not include in an RPG commit. |
| `docs/MAC_*.md`, `docs/migration-manifests/**` | F — host/storage migration records | Yes | Preserve; do not include in an RPG commit. The manifest `.log` is an operations artifact, not an RPG deliverable. |

No untracked item is classified as unknown. Ignored generated folders observed in
the checkout (`.next`, `node_modules`, TypeScript build info, caches, OS metadata)
are already protected by `.gitignore`; no ignore edit is needed.

## RPG worktree matrix

The rows below cover every RPG-related untracked file via exact names or bounded
filename sets. “Conditional” means the file is intentional and should remain in
the repository, but must not be included in a runtime-art commit without the
specified review.

| Path | Type | Purpose | RPG? | Intentional? | Track? | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `src/game/rpg/rendering/arga-contract.ts` (modified) | A | Authoritative states, frames, directions, canvas/origin contract | Yes | Yes | Conditional | The implementation is real; reconcile its direction matrix with the visual-foundation test before commit. |
| `src/game/rpg/rendering/rpg-asset-manifest.ts` (modified) | A | Asset registration and readiness state | Yes | Yes | Conditional | Correctly preserves `NEEDS_REVIEW`, `REFERENCE_ONLY`, and `MISSING`; no automatic promotion is warranted. |
| `scripts/test-rpg-asset-integration.ts` (modified) | D | Asset-manifest integration checks | Yes | Yes | Yes, with the two files above | Executable and passes. |
| `src/game/rpg/legacy/pendekar-suryakerta.prototype.html` | A | Historical standalone prototype/reference | Yes | Yes | Yes, separate historical-source commit | Not imported by the modern runtime; retain without folding it into runtime code. |
| `assets-src/rpg/characters/arga/pack01_region_{1,2}.png`, `pack01_subregion_1.png` | B | Source/reference crops | Yes | Yes | Conditional | Preserve as source evidence; not runtime-ready sheets. |
| `assets-src/rpg/characters/arga/package/{ALL_DIRECTIONS_ALL_STATES_REFERENCE.png,ARGA_ASSET_MANIFEST.json,ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png,DOWN_CORE_IDLE_WALK_RUN.png,UP_CORE_IDLE_WALK_RUN.png,README.md}` | B | Master/reference and source-package metadata | Yes | Yes | Yes, source-assets commit | Explicitly reference/art-direction material, not proof of runtime readiness. |
| `assets-src/rpg/characters/arga/package-a2/{ARGA_A2_CALIBRATION_BATCH.json,ARGA_{IDLE,RUN,ATTACK}.png,README.md,arga_idle_{01..06}.png,arga_run_{01..10}.png,arga_attack_{01..06}.png}` | B | A2 calibration source (27 files) | Yes | Yes | Conditional | The package itself says it is provisional; preserve it but do not promote it to `READY`. |
| `assets-src/rpg/characters/arga/side-extraction/{idle-side-{1..5}-native.png,run-side-{1..10}-native.png,attack-side-{1..6}-native.png}` | B | Native side-view extraction source (21 files) | Yes | Yes | Conditional | True-profile source candidates; the current manifest intentionally marks the corresponding runtime side sheets `REFERENCE_ONLY`. |
| `public/game/rpg/characters/{sheet-char-arga-attack-{down,side,up}.json,sheet-char-arga-defeat-down.json,sheet-char-arga-hurt-down.{json,png},sheet-char-arga-idle-down.json,sheet-char-arga-interact-down.json,sheet-char-arga-run-{down,side,up}.json,sheet-char-arga-skill-down.json,sheet-char-arga-victory-down.json,sheet-char-arga-walk-{down,side,up}.json,sheet-char-arga-walk-{down,side,up}.png}` | B | Runtime candidates and their metadata (19 files) | Yes | Yes | Conditional | Only the manifest may establish readiness. The down walk sheets are currently usable; missing, review, and reference states must remain explicit. |
| `public/game/rpg/characters/review/{sheet-char-arga-idle-down-a2-rebuild.png,sheet-char-arga-run-down-a2-rebuild.png,sheet-char-arga-attack-down-a2-rebuild.png}` | B | A2 rebuild review outputs | Yes | Yes | Conditional | Review assets, not production promotion evidence. |
| `public/game/Pendekar Suryakerta-BC/{ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png,ARGA_RUNTIME_CALIBRATION_SHEET.png,BahasaCerdas_RPG_ARGA_COMPLETE_ANIMATION_PACK.zip,BahasaCerdas_RPG_ARGA_P2_4C2_SIDE_ART_REFERENCE.zip,BahasaCerdas_RPG_Asset_Pack_{01,02,03_Bosses,04_Desa_Suryakerta,05_Gunung_Karang,06_Menara_Angin,07_Arga_Runtime,08_NPC_Runtime,09_Monster_Runtime,10_Boss_Runtime,11_VFX_Runtime,12_Arga_A2_Calibration}.zip}` | B | Imported master/calibration and 14 source archives (16 files) | Yes | Yes | Conditional, separate source-archive decision | They are intentional references, not runtime paths. Do not include them in a runtime-art commit; founder should decide whether source archives are retained in Git or external asset storage. |
| `docs/{P2_3C_ARGA_A2_CALIBRATION_AUDIT,P2_3D_ARGA_A2_REBUILD,P2_3E_ARGA_FOUNDER_VISUAL_GATE,P2_4C_ARGA_SIDE_PRODUCTION_GATE,P2_4C2_ARGA_SIDE_EXTRACTION_REPORT,PHASE_2_3B_ARGA_RUNTIME_RESCUE}.md` | C | Arga audit, calibration, gate, extraction, and rescue records | Yes | Yes | Yes, documentation commit | Historical reports say the artwork is provisional/blocked; they must not be read as a production-ready approval. |
| `docs/P2_5_WORKTREE_RECONCILIATION.md` | C | This audit record | Yes | Yes | Yes | Requested P2.5 reconciliation documentation. |

## Structure and code state

No structural move is required. The active implementation is appropriately
located under `src/game/rpg/`, public runtime candidates under
`public/game/rpg/`, art-source material under `assets-src/rpg/`, documentation
under `docs/`, and executable checks under `scripts/`.

The modern codebase has concrete modules and runtime wiring for world/maps,
player and movement, collision, interaction/NPC/dialogue, battle, learning,
quests, inventory/economy/progression, local persistence, canvas rendering,
animation, and React UI. `app/arena/game/rpg/RpgClient.tsx` imports `RPGGame`,
while the route remains deliberately unpublished and redirects through the
server-side publication guard. `src/game/rpg/README.md` is stale where it says
there is no route/page/renderer; it should be corrected in a later documentation
change, not rewritten as part of this historical reconciliation.

Persistence is currently local-storage based. Learning pool retrieval is
authenticated, but the interim pool route includes `correctAnswer` for
client-side local evaluation; that is a P1 integrity caveat, not a reason to
change it in this audit.

## Arga state

The actual contract defines nine states: idle 6, walk 8, run 10, attack 6,
skill 8, hurt 4, defeat 8, victory 8, and interact 6 frames. It preserves the
canonical visual language: DOWN front, UP back, SIDE true profile; cream tunic,
solid red scarf, dark indigo trousers, brown boots, red-ochre headband, black
hair, and keris. The animation contract uses 224 px canvas, 80 ms cadence, and
bottom-centre feet origin.

The Arga-sheet portion of the runtime manifest has three `READY`, four
`NEEDS_REVIEW`, five `REFERENCE_ONLY`, and six `MISSING` entries. In
particular, the hurt-down candidate remains review-only because it is visually
incompatible, and the extracted idle/run/attack side sheets remain
reference-only. Neither the source packages nor the reports authorize promotion
of questionable art.

One contract/test discrepancy is recorded, not changed: the contract currently
allows `idle` in `down,side` and locomotion in `down,up,side`, whereas
`test:rpg-visual-foundation` expects idle down-only and 15 sheets. This makes
that test fail two assertions despite all other RPG test suites passing.

## Test inventory and validation

The package exposes 19 executable `test:rpg-*` scripts, each using `npx tsx`:
asset integration; battle core/runtime; economy; interaction runtime; learning
contract/gameplay/hardening/selector/UX; phase 1A/1B; pickup consumables; quest
progression; unpublished; vertical slice; visual foundation; world maps/runtime.
All corresponding scripts are tracked. The modified asset-integration test is
also executable and passes.

Validation performed without source changes:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | Exit 0. |
| `npm run typecheck` | Fail | Three unrelated Agent API errors: `WorkerHealthView` lacks `registry`, `staleWorkers`, and `workers` used by `app/api/admin/agent/health/route.ts`. |
| 19 RPG scripts | 18 pass, 1 fail | Only `test:rpg-visual-foundation` fails, on the two stale Arga direction/count assertions described above. |
| `git diff --check` | Pass | No whitespace errors in tracked modifications. |

## Commit boundaries and unresolved decisions

Safe reviewed RPG candidates are the three modified RPG files, the 57 untracked
Arga source files, 22 untracked Arga runtime/review files, six Arga historical
documents, the legacy prototype, and this record. Source archives under
`public/game/Pendekar Suryakerta-BC/` are intentional but should be a separate
founder-approved source-archive decision, never bundled into a runtime-art
commit. All Agent, Question Factory, migration, and card-image work must remain
out of that commit.

Required founder decisions:

1. Confirm whether the new Arga direction matrix (including side idle) is the
   canonical contract, then update the stale visual-foundation expectation in a
   dedicated test-alignment change.
2. Decide whether the 14 archived asset packs belong in Git history or an
   external asset store; preserve them unchanged until then.
3. Review the visual gate before promoting any `NEEDS_REVIEW` or
   `REFERENCE_ONLY` Arga entry.

No files were moved, deleted, staged, committed, or pushed. `.gitignore` was
not changed because its existing rules already protect required generated and
temporary categories.
