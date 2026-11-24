# BahasaCerdas Kota Aksara — Premium UI cleanup QA release

**Date:** 24 Nov 2026. **Scope:** public 16+ QA experience (not the production NUSANTARA experience).

## Published and confirmed
- Start lobby: `83804286143888`, Universe `10778759021`. Roblox Studio logged `PublishSuccessful` at `2026-11-24T07:20:00Z`, following publish to this exact place.
- Benar atau Salah: `94365112072969` in the same QA universe. Roblox Studio logged `PublishSuccessful` at `2026-11-24T07:22:10Z`, following publish to this exact place.
- The QA lobby still contains **12 games**, excluding Pendekar Suryakerta at user request. No new places were created for this update.

## UI changes
- Lobby header text corrected to 12 games. One primary **Pilih Gim** action; short description in the catalog; no duplicate minimap or oversized permanent welcome panel in QA source.
- Benar atau Salah: hide redundant secondary header, help button, and leaderboard; compact top-centered question card; two prominent answer buttons at bottom; small **Kembali** control at top right; mobile/desktop responsive dimensions; simpler answer prompts and round countdown.
- Kept the existing server-side question scoring, submission and return-lobby event logic unchanged.

## Local QA checks
- Official Luau parser PASS on `BCLobby.client.lua`, `BCGameDirectory.client.lua` and `BCMultiplayer.client.lua`.
- Rojo build PASS for lobby and Benar/Salah.
- Roblox Studio CLI structural smoke test PASS for the Benar/Salah UI: required answer controls and hidden secondary panels present.
- The two actual Roblox Studio publish successes above confirmed the new builds were uploaded.

## Not yet confirmed
- A human or device run-through after the update showing complete question/answer/result navigation, responsive phone layout, and a full Lobby → Benar/Salah → Lobby teleport.
- Other 11 games' user experience was not changed by this targeted UI cleanup.
- The QA-only source changes are on PC at `F:\bc-roblox-qa-release\roblox`, with build artifacts at `F:\bc-roblox-qa-release\builds`. Reconcile with the repository branch before merging. No claim that this PR is production-ready.

Link: https://www.roblox.com/games/83804286143888/
