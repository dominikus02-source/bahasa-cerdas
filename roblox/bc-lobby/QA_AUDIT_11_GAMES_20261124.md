# Audit mutu 11 gim Roblox Kota Aksara — 24 November 2026

**Scope:** 11 games currently represented in Kota Aksara apart from Benar atau Salah. Pendekar Suryakerta remains excluded by user decision. **Evidence:** PC QA source tree `F:\bc-roblox-qa-release\roblox`. No edits or publications to production in this audit. This is a static source-level audit, **not** a completed live gameplay/mobile/multiplayer test.

## Executive outcome
- 11/11 QA source projects scanned and all included `.lua` scripts passed Luau syntax parsing (0 syntax errors); this is **not** a functional pass.
- **No game receives a 'ready for general launch' certificate** on syntax inspection alone. For each, a full real-client gameplay pass, UX/mobile pass, teleport roundtrip, and content QA remain required.
- 5 games — **Lari Kata, Teka-Teki Silang, Tantang Teman, Adu Cepat, Kuis Tempur** — currently have byte-for-byte identical `Preview.server.lua` and `Preview.client.lua`, using `GameConfig.id` to branch their mechanics. Their GameConfig statuses are still `preview-await-api`, `preview-await-puzzle-generator`, `preview-await-matchmaking`, `preview-await-matchmaking`, and `preview-await-battle`, respectively. These are QA prototypes, not fully differentiated complete games.
- **Shared BCUI mobile layout defect:** `BCUI.lua` sets card `AnchorPoint=(0.5,0.5)` but `Position=(0.96,0.54)` on mobile with width `0.90`, and `Position=(0.98,0.54)` on desktop with width `0.40`. This computes right edges beyond screen bounds (1.41 and 1.18, respectively). It affects games using the shared BCUI, warrants a single scoped UI fix and device QA before next release.
- QA-only Lua code remains on the PC; repository branch should be reconciled before merging. No deployment triggered by this audit.

## Game-by-game static assessment

| Game | Source evidence | Current audit disposition | Mandatory next test |
|---|---|---|---|
| Susun Kata | `BCMultiplayer.server/client.lua`, `WordBank.lua`; multiplayer 6-round letters/stations, validated choices | **Conditional candidate**, not approved | Test six rounds, letter pickup, 1 vs 2+ players, scoring, touch prompts; remove misleading preview copy |
| Tebak Kata | Dedicated server/client, `WordBank.lua`, DataStore progress, levels | **Conditional candidate**, not approved | Test hint counts, wrong attempts, unlock, persistence after relaunch, mobile input |
| Menara Cerdas | Dedicated server/client, 12-question climb, curated `QuestionBank.lua` | **Conditional candidate**, not approved | Confirm score/health, physical tower progress, finish/retry and mobile scaling |
| Bermain Kata | Dedicated preview server/client, `ContentBank.lua`; four modes in QA | **Conditional candidate**, not approved | Complete all four modes, error handling, answer validation, progression and viewport |
| Petualangan Kata | Dedicated word-collection server/client; `ContentBank.lua` only 638 bytes; touch/prompt mechanics | **Content/UX hold** | Expand and quality-check level content; test physical prompts/touch, avatar respawn, 12 rounds |
| Irama Kata | Dedicated rhythm server/client, DataStore, content groups | **Conditional candidate**, not approved | Verify note timing on mobile/PC, latency, hit feedback, stage unlock/persistence |
| Lari Kata | Shared six-game prototype, 3 static category platforms; config still `preview-await-api` | **Hold as preview** | Unique course movement/checkpoints, variety, fail/retry loop, touch interaction |
| Teka-Teki Silang | Shared prototype accepts free-text answers to 7 clues; does not render an interconnected crossword grid even though ContentBank exists | **Hold as preview** | Actual crossword grid, numbered cross-clues, crossing-letter validation, mobile typing |
| Tantang Teman | Shared prototype scores answers and displays same-server ranking, not invitation/matchmaking or a dedicated friend duel | **Hold as preview** | Invites/challenge acceptance, pairing, fair turn synchronization, rejoin handling |
| Adu Cepat | Shared prototype tests reaction at a single prompt, not an actual simultaneous multiplayer buzzer contest | **Hold as preview** | Opponent pairing, synchronized start, early-press penalty, tie handling and latency |
| Kuis Tempur | Shared prototype uses quiz answers to change simulated boss HP; `ContentBank.lua` not used by shared script | **Hold as preview** | Distinct battle UI, target mechanics, balancing, content source integration, win/lose/retry, verify new build published |

## Release gates (all mandatory before publicly claiming a game is finished)
1. **Core gameplay:** new player understands first action without outside explanation; controls work from start through final result and replay.
2. **UI/UX:** at 360/390-pixel mobile widths and 16:9 PC, questions/buttons/controls do not overlap the Roblox core UI or joystick; main action always visible.
3. **Data/education:** questions accurate, correct answers and explanations verified; sufficiently varied levels; no dummy or misleading labels.
4. **Network & fairness:** server validates answers and scores; multiplayer handles sync, disconnect, duplicate submission and timeout.
5. **Navigation:** tested in real Roblox Player from Lobby → Game → Lobby; no place access errors.
6. **Performance:** repeated client runs and server console checks without script errors; test low-end Android and a 2+ player session where applicable.
7. **Publish evidence:** deploy only from verified build to exact existing QA Place ID, confirm Studio publish-success event, re-test after publishing.

## Recommended sequence
1. Shared BCUI layout fix and device smoke tests for the six conditional-candidate games.
2. Finish **Susun Kata**, **Tebak Kata**, **Menara Cerdas**, **Bermain Kata**, **Irama Kata** one game at a time; avoid batch claims.
3. Deepen Petualangan Kata content and test world interactions.
4. Build unique mechanics for five held previews **individually**, beginning with the easiest high-quality independent game (TTS), rather than giving five games the same generic script.
5. Keep Pendekar Suryakerta out. Do not enable under-16 audiences or claim all twelve games are ready before release gates pass.

**Important:** *Hold as preview* here is a quality verdict, not proof that a Roblox Place is disabled. Existing uploaded QA places may still be accessible; do not hide/delete or change access without a deliberate release change.
