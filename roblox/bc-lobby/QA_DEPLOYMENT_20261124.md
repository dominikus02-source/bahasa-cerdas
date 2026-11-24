# Roblox QA deployment — 24 November 2026

**Status:** all 13 game place uploads and updated lobby mapping published successfully in the isolated **private** QA experience. **Not a production release, gameplay parity or real teleport QA.**

- QA experience **BahasaCerdas Kota Aksara QA**
- Universe ID: `10778759021`
- Start lobby Place ID: `83804286143888`
- Entry: https://www.roblox.com/games/83804286143888/
- The public NUSANTARA experience and legacy BahasaCerdas lobby were not modified.
- Device support selected at creation: PC, tablet, phone; VR disabled; data-sharing setting off.

| Game id | QA Place ID |
|---|---:|
| benar-salah | 94365112072969 |
| susun-kata | 137487012250171 |
| tebak-kata | 96674215981112 |
| lari-kata | 98221200310733 |
| menara | 102091860193642 |
| bermain-kata | 103543899381017 |
| petualangan-kata | 111466871399066 |
| irama-kata | 110750913804696 |
| teka-teki-silang | 73208408458812 |
| tantang | 71514112346297 |
| adu-cepat | 71584943153858 |
| kuis-tempur | 138350838153230 |
| rpg | 85416090736421 |

## Verifications
- All 14 projects previously built PASS with Rojo.
- All 13 QA game places were confirmed by Roblox Studio logs `PublishToDifferentGame ... dstUniverse=10778759021`.
- QA-only lobby was rebuilt with every mapped Place ID and republished successfully to existing QA start Place ID `83804286143888`, confirmed by `PublishSuccessful` and `dstPlaceId=83804286143888`.
- Original first two QA places (Benar Salah and Susun Kata) were also republished from QA-specific builds to correct their server-side `returnLobby` target to the QA lobby: both publish success with exact place IDs above.
- 125 Lua source files in QA-specific directory parsed with Luau, 0 syntax errors.
- Source of QA-specific recompiled place files: PC directory `F:\bc-roblox-qa-release\builds`; QA-only routing map `F:\bc-roblox-qa-release\qa_destinations.json`.
- Original repo source branch does **not** contain the private-QA-specific numeric IDs or routing override. Do **not** merge QA routing into production without a deliberate release plan.

## Still unverified
- Direct Roblox Player teleport Lobby → all 13 places → Lobby.
- Multiplayer gameplay / mobile screens / frame rate on devices.
- Several worlds are **preview-only** and do not offer a complete port of the original web game: `lari-kata`, `teka-teki-silang`, `tantang`, `adu-cepat`, `kuis-tempur`, `rpg`. The `rpg` portal is explicitly QA-only marked as preview.
- Private QA experience may require signing in as its creator or granting collaborator/tester access; do not open it publicly without approval.

## Test guide
1. Sign into the Roblox account owning or authorized for **BahasaCerdas Kota Aksara QA**.
2. Open https://www.roblox.com/games/83804286143888/ and launch.
3. Visit each of 13 portals; verify each destination loads and the Return to Kota/Lobby button works.
4. For preview-only projects, evaluate visual worlds and navigation—not complete gameplay.
5. Record any Roblox error messages and the game name, device model and time for debugging.

This was a deliberate private QA deployment; production public NUSANTARA remains unchanged.
