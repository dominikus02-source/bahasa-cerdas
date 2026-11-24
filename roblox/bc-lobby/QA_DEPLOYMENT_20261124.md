# Roblox QA deployment — 24 November 2026

**Status updated 24 November 2026:** All 13 game places and QA lobby are published. Roblox Creator Dashboard confirmed **public access for ages 16+** after release. **Players under 16 are not yet eligible; 1,000 Robux fee option or other Roblox requirements remain**, and no fee was paid. Several games are still preview-only; live cross-place teleport QA remains outstanding.

- QA experience **BahasaCerdas Kota Aksara QA**
- Universe ID: `10778759021`
- Start lobby Place ID: `83804286143888`
- Entry: https://www.roblox.com/games/83804286143888/
- The public NUSANTARA experience and legacy BahasaCerdas lobby were not modified.
- Device support selected at creation: PC, tablet, phone; VR disabled; data-sharing setting off.
- Roblox Player on PC **successfully joined** lobby Place ID `83804286143888` in Universe `10778759021` (GameJoinLoadTime log dated 24 Nov 2026).
- QA-only lobby was republished again after a UX improvement: selecting a game card now requests **server-validated direct teleport**, instead of only highlighting the distant gateway. Studio logged PublishSuccessful to the same start Place ID; latest QA lobby Rojo build and Luau parse both PASS. The cross-place transfer itself is not yet verified through Roblox Player.
- Public NUSANTARA and older legacy lobby remain untouched.

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
- Direct Roblox Player teleport Lobby → all 13 places → Lobby (the real lobby join itself has been confirmed).
- Multiplayer gameplay / mobile screens / frame rate on devices.
- Several worlds are **preview-only** and do not offer a complete port of the original web game: `lari-kata`, `teka-teki-silang`, `tantang`, `adu-cepat`, `kuis-tempur`, `rpg`. The `rpg` portal is explicitly QA-only marked as preview.
- Audience is **public ages 16+**; accounts under 16 cannot play until Roblox's additional requirements are met. The account owner requested public release and it was performed in Creator Dashboard. No Robux purchase made.

## Test guide
1. Sign in with a Roblox account **age 16+** while Roblox's younger-audience requirements are incomplete.
2. Open https://www.roblox.com/games/83804286143888/ and launch.
3. Press **Mulai Petualangan**, then **Pilih Gim** and select a card to enter the chosen arena directly, or walk to its portal. Verify each destination loads and the Return to Kota/Lobby button works.
4. For preview-only projects, evaluate visual worlds and navigation—not complete gameplay.
5. Record any Roblox error messages and the game name, device model and time for debugging.

This is an early **public 16+ QA release**, not a production-ready all-age classroom game. Production public NUSANTARA remains unchanged.

## Product decision — 24 November 2026
- **Pendekar Suryakerta is excluded from the live QA lobby** at the user's direction because its gameplay is not ready. Its existing QA place was not deleted, but the lobby's 3D gate, catalog card, and route are removed; `rpg` destination is set to nil in the isolated QA release source.
- Lobby now advertises **12 games** and the updated QA `.rbxl` was successfully published to existing start Place ID `83804286143888` (Studio PublishSuccessful at 2026-11-24T03:29:42Z).
- This exclusion applies to QA lobby. The source branch catalog still needs sync before merge; the stored rpg place may remain individually accessible to authorized users via its original URL.
- New QA playable prototypes were built for TTS, Lari Kata, Tantang Teman, Adu Cepat, Kuis Tempur and RPG, but RPG will not be included until approved. TTS, Lari Kata, Tantang Teman and Adu Cepat confirmed republished; Kuis Tempur is not yet confirmed updated. Runtime gameplay QA still incomplete.
