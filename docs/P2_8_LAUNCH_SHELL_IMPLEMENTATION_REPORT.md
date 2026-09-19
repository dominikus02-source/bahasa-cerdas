# P2.8.0 — Launch Shell Implementation Report (Premium Early Access)

## 1. Repository identity

- Repo: `/Users/user/bahasa-cerdas`, remote `dominikus02-source/bahasa-cerdas`, branch `main`, baseline `2b7d51e`.
- GIMBC never entered, untouched. Production DB untouched (0 writes). No commit/push.

## 2. Existing game infrastructure discovered (all reused, none rebuilt)

| Need | Canonical implementation |
|------|--------------------------|
| Registry | `lib/arena/game-registry.ts` (`rpg` entry existed, unpublished) |
| Route shell | `app/arena/game/rpg/page.tsx` + `RpgClient.tsx` + `preview/page.tsx` |
| API gate | `lib/game/rpg/server-access.ts` (`requireRpgFounderPreviewApiAccess`) |
| Premium | `resolvePlan` in `lib/premium-economy/plans.ts` (MURID_PREMIUM/PRO/FOUNDER vs FREE) |
| Cards | `GameCard.tsx` + `GameHubClient.tsx` (unpublished filter, hero, recordPlay) + `GAME_CARD_ARTWORK` map |
| Modal | `components/ui/modal.tsx` (pattern reference; locked page uses dedicated layout instead) |
| Audio | `lib/game/sound.ts` (synthesized Web Audio, lazy gesture init, persisted mute, fail-open) |
| Analytics | `trackProductEvent` + `ALLOWED_EVENTS` closed set in `app/api/analytics/product-event/route.ts` |
| Upgrade | Canonical murid route `/murid/premium` |

## 3. Game registry integration — IMPLEMENTED

- New optional `GameDefinition.premiumOnly` (additive; unpublished mechanism intact).
- `rpg`: removed `unpublished: true`, set `premiumOnly: true`. Title/route/gradient/xp/etc unchanged. Published = VISIBLE.

## 4. Publication mechanism — IMPLEMENTED

Visibility via registry (hub filter already excludes only `unpublished`). Playability is NOT visibility: route + all APIs enforce the premium gate server-side.

## 5. Premium gate — IMPLEMENTED

- New `requireRpgPlayAccess()` in `server-access.ts`: session → founder-preview path (preserved) → published + `resolvePlan` ∈ {MURID_PREMIUM, PRO, FOUNDER} → allow; else 401 / 404 / 403 `PREMIUM_REQUIRED` (new contract code, additive). No duplicated entitlement logic.
- Migrated 11 API routes (state, pool, quest/inventory/equipment mutate, battles start/action/learning/answer/reward/settle) from founder gate to play gate. Old founder function kept for the preview page.

## 6. Non-premium experience — IMPLEMENTED

Server-rendered `RpgLocked` (no gameplay mount, no state/pool fetch): Shield emblem, Premium chip, exact message "Pendekar Suryakerta tersedia khusus untuk Murid Premium.", CTA to `/murid/premium`, back to hub, `rpg_premium_blocked` tracker. Not a generic error.

## 7. Premium launch flow — IMPLEMENTED

Card/Hero → `/arena/game/rpg` (server gate) → `RpgClient` splash → tap "Mulai Petualangan" → real `GET /api/rpg/state` check → `RPGGame`. PREMIUM_REQUIRED mid-flow redirects to hub. Server-state failure → error panel with retry (fail closed, never client-only RPG).

## 8. Splash implementation — IMPLEMENTED

Phases splash/starting/playing/error; no fake progress (spinner only during the real fetch); short branded transition; sound toggle; back button. Artwork attempted from contract path with gradient fallback.

## 9. Audio integration — IMPLEMENTED (reused, fail-open)

`startBGM()` on entry tap (autoplay-compliant), `stopBGM()` on unmount, BGM continues as world music. Null-ctx/missing/muted → silent game. No files, no second manager, no soundtrack generated.

## 10. Asset contracts — DEFINED (assets REQUIRED, not created)

`app/arena/game/rpg/rpg-launch.ts`: `RPG_POSTER_PATH` (`/images/GIM Card/RPG-card.png` — file does NOT exist yet; card falls back to gradient+Shield), `RPG_SPLASH_BG_PATH` (`/images/rpg/splash-bg.png` — missing; gradient fallback), `RPG_ICON_PATH` (optional), `RPG_AUDIO_PATH = null` (synthesized BGM; file path reserved). Founder drops files on these paths — no code change needed. Canonical Arga identity untouched; no Gen-B/Gen-C/review assets promoted. Premium Crown chip added to `GameCard` for `premiumOnly` games only.

## 11. Analytics — IMPLEMENTED (convention-following)

5 events allowlisted (`rpg_launch_clicked` in hub recordPlay for id=rpg only; `rpg_premium_blocked`, `rpg_launch_authorized`, `rpg_splash_started`, `rpg_runtime_started` in launch shell). snake_case `domain_action` per convention. `rpg_card_viewed` deliberately omitted (hub doesn't track other games' views either).

## 12. Routing/security — IMPLEMENTED

Direct URL, pool (answer-bearing), and all gameplay APIs share the same server gate. No query/localStorage/header bypass (asserted). Founder preview page unchanged and fails closed now that the game is published. RPG stays out of any public-unpublished assumption.

## 13. Error states — IMPLEMENTED

NON_AUTHENTICATED → login redirect; NON_PREMIUM → locked page; PREMIUM_LOOKUP_FAILURE → 403 path (fail closed); RPG_BOOT/SERVER_STATE_FAILURE → error panel + retry; AUDIO/ASSET_FAILURE → fail open to silent/fallback gameplay.

## 14. Tests — 21/21

`scripts/test-rpg-p2-8-launch-shell.ts` (+package script): registry, entitlement behavior (pure `resolvePlanForUser`), route/API protection (11 routes), notification path, splash honesty, single audio manager, fail-open audio, preview fail-closed, GIMBC/scope, no client-only authority, single entitlement reuse, analytics allowlist, no prod DB. Plus maintenance updates to 10 older suites whose assertions encoded the pre-launch state (unpublished→published-premium, founder-gate→play-gate, one stale P1.3/P2.6C assertion each) — all green after update.

## 15. Manual runtime result — LIMITATION DOCUMENTED

Not executable in this shell (no user credentials/session, no browser). Gate paths are covered structurally + behaviorally (pure entitlement resolver) + live-DB P2.7 chain. Founder should click-test A–E on staging with real murid/premium accounts.

## 16. Remaining Founder assets required

1. `/images/GIM Card/RPG-card.png` (hub poster), 2. `/images/rpg/splash-bg.png` (splash bg), 3. optional `/images/rpg/icon.png`. No code change needed when provided.

## 17. Production deployment prerequisites

1. Run `prisma/migrations/manual/2026-09-18_p2_7_pendekar_battle_action_kind.sql` on production FIRST (separate Founder operation — NOT executed here). 2. Deploy app. 3. Verify `/arena/game` shows the Premium-badged card; free murid sees locked page; premium murid plays.

## 18. Known limitations

- P2.7 slice test shows rare transient 41/1 flakes on local staging (uncaptured check; 42/42 on immediate re-runs) — same contention class as the known P2028 flake; production impact: none (retry-safe mutations).
- Pre-existing failures unchanged: H.1 D.3–D.5, interaction #35 wallet-regex (both stash-verified pre-existing).
- `git stash -u` + `pop` mid-phase partially failed on an unrelated concurrent file (`src/main-bersama/.../student-flows.ts`, truncated to 277 lines with TS1005). Recovered byte-exact from the stash snapshot (296 lines, verified via diff-against-stash for tracked files + content checks). Unrelated file now matches its stash-moment state; its remaining semantic tsc errors are the other team's mid-refactor WIP. Lesson: no more `git stash -u` in this repo while concurrent untracked work exists — baseline checks via `git show HEAD:<path>` instead. Stash@{0} retained as backup (harmless; P2.8 creates no commit).
- Full `npm run build` not attempted (dummy-env SSR prerender hangs per documented behavior; tsc whole-project EXIT 0 + eslint clean + 30+ suites green is the gate signal).
