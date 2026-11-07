# Android Play — integration preflight status (PR #246)

Last updated: 2026-11-07 (P0 logout + role clear + breadcrumb).
Branch: `integration/android-play-from-main-20261107`
Review: https://github.com/dominikus02-source/bahasa-cerdas/pull/246

## P0 fixes pushed (awaiting physical retest by ChatGPT on Galaxy A23)

| Item | Status | Evidence |
|---|---|---|
| Logout Promise bug | **FIXED (code)** | `_logout()` no longer uses `runJavaScriptReturningResult` with async fetch. Fires POST, clears cache/localStorage, forces login URL, resets `_role`/`_index` immediately. |
| Stale GURU nav on login | **FIXED (code)** | `_detectRoleFromUrl` clears role (`null`) on `/login`, `/register`, `/signup`, landing, and other public auth paths. `_onRoleDetected` accepts null. |
| Login breadcrumb + gap | **FIXED (code)** | `RouteBreadcrumbs` hides on `/`, `/login`, `/arena/login`, `/register`. Host padding reduced from 72px to 16px. |
| Regression test | **ADDED** | `mobile/test/logout_role_reset_test.dart` — clears on login/register/landing; keeps role on /guru, /murid, /admin. |

## Quality gates — HOLD until physical retest

Previous release build (SHA 855d43dc): **PASS** (clean signing). Physical tests on Galaxy A23 found logout FAIL and stale GURU navigation on login.

| Gate | Status | Note |
|---|---|---|
| `flutter analyze` / `test` / `build appbundle` | HOLD | Re-run on new HEAD |
| Physical logout + role clear on Galaxy A23 | HOLD | ChatGPT must rebuild APK and retest |
| Merge to main | **HOLD** | Do not merge |

## Release and security controls

- Do not merge PR #246 or #245.
- Clean keystore remains only on local PC: `C:\\keys\\bahasacerdas-release-clean.jks`.
- Never commit keystore, key.properties, google-services.json, AAB, or APK.

## Physical retest on Samsung A23 — SHA 520440e98bf9551c0273ee2b27213c943dc223a5, 7 November 2026

PC: DESKTOP-2NM1AUE; worktree F:\bahasa-cerdas-android-integration\mobile. Git fetch and fast-forward confirmed target HEAD exactly.

| Command / gate | Exit code | Result |
|---|---:|---|
| flutter pub get | 0 | PASS; 33 newer dependencies outside constraints (nonblocking) |
| flutter analyze | 0 | PASS; No issues found (0 warnings/errors) |
| flutter test | 0 | PASS; 14 tests, including role-reset route checks |
| flutter build apk --release | 0 | PASS; APK 46,439,302 bytes |
| apksigner verify | 0 | PASS; v2 signature verified, clean Bahasa Cerdas certificate |
| adb uninstall com.bahasacerdas.app | 0 | PASS; old app uninstalled with locally stored app data removed by explicit user request |
| adb install app-release.apk | 0 | PASS; Success, versionName 1.0.0 versionCode 1 |
| adb launch MainActivity | 0 | PASS; process alive, no matching fatal crash in inspected buffer |

APK SHA-256: 4412A1B2AC72F04403A60BE3BD6414B4D5B7E945A17DC704C6129DE54D3620D7. Signer certificate SHA-256: 1AA9F86EB9B284C625ABC48D3293E28C02AC471172BF8CA2D87D7C5036B4C263. Files remain local, no binaries or secrets committed.

**PASS — clean-start public shell on phone:** Screenshot confirms bottom tabs Beranda / Masuk / Daftar rather than stale GURU controls; public drawer contains legal/help options without Halo, GURU, privileged teacher controls, or Keluar.

**FAIL — visual breadcrumb and spacing:** Screenshot captured on phone after scroll to top confirms web /login still renders Beranda > Masuk breadcrumb, separate Beranda card, and large blank space above breadcrumb. The changed React/CSS sources in this PR are not sufficient to alter live web content until a controlled web deployment occurs. APK replacement alone cannot fix the live website.

**P0 security risk still unresolved:** New Flutter _logout() in mobile/lib/features/shell/app_shell.dart resets _role immediately and executes a fire-and-forget fetch('/api/auth/logout').catch(...), without waiting for/checking HTTP status or proof of server session invalidation. UI can appear logged out with a live Supabase session. Never mark authenticated logout PASS based on role UI alone. Fix by awaiting verified server logout result, clearing appropriate cookies/session only after successful invalidation, and prohibiting Back to protected pages.

**HOLD — authenticated GURU logout, Back-after-logout:** Not yet retested; clean uninstall removed local signed-in session and the user's own login interaction is needed. Do not claim that this scenario passed. Two-party JUMPA, role separation, and final Play gates remain outstanding. Release recommendation: HOLD.


## Samsung A23 drawer menu audit and clean reinstall — 7 November 2026

**User observation:** user confirmed login and logout now work on handset, but reported that menu actions in GURU drawer do not function; the supplied screenshot shows the teacher drawer including AI Tools, Grading, EYD, Text Analysis, Komunitas, Berlangganan, Lupa Kata Sandi, legal links, Hapus Akun, and Keluar. Screenshot time precedes the most recent clean reinstall, and does not independently demonstrate which individual taps failed.

**Repository check:** on `integration/android-play-from-main-20261107` at documentation HEAD `a6d957a108bcf673d84c726b419a24a8464a830c`, `mobile/lib/features/shell/app_shell.dart` wires teacher drawer entries to `_openRoute(...)`, and `mobile/lib/core/constants/app_routes.dart` maps these keys to `/guru/ai-tools`, `/guru/ai-tools/grading`, `/guru/ai-tools/eyd`, `/guru/ai-tools/text-analysis`, `/guru/komunitas`, and `/guru/berlangganan`. Corresponding Next.js route files are present and direct unauthenticated GET requests received HTTP 200. This confirms **existence**, not authenticated E2E functionality, navigation success or CRUD/API authorization. No newer application source had been pushed at audit time.

**Confirmed navigation defect:** drawer item `Lupa Kata Sandi` currently executes `Navigator.pop(context); setState(() => _index = 1)` rather than navigating to `AppRoutes.forgot`. On GURU this selects the AI Tools tab, not password recovery. Also `AppConstants.forgotPath = '/auth/lupa-sandi'` returned HTTP **404** in direct check, whereas the tracked auth code includes `app/(auth)/reset-password/page.tsx`. Grok must identify correct deployed forgot-password route, update mapping and add tests; do not assume reset-password is suitable for requesting a recovery link.

**Public-policy issue:** `/hapus-akun` returned HTTP 307 redirect in anonymous request, so public account-deletion guidance still requires checking; policy pages `/kebijakan-privasi` and `/syarat-ketentuan` returned HTTP 200. Avoid server deployment from mobile PR without separate controlled approval.

**User-requested clean reinstall performed:** `adb -s RRCW506HJJY uninstall com.bahasacerdas.app` -> Success (exit 0), then `adb install app-release.apk` -> Success (exit 0), then `adb shell monkey ... LAUNCHER 1` -> exit 0. Process PID 16307; no matching fatal crash in queried buffer. Package version 1.0.0+1. This is **the same signed APK** previously built from source SHA `520440e98bf9551c0273ee2b27213c943dc223a5` and artifact SHA-256 `4412A1B2AC72F04403A60BE3BD6414B4D5B7E945A17DC704C6129DE54D3620D7`; it is NOT a new menu-code fix. Uninstallation deleted local app state, not the user's cloud account.

**Next required source work (Grok):** audit each drawer action and corresponding web route including authenticated WebView session, path changes, RBAC/API calls; correct forgot-password mapping, test navigation for each item with automated widget/integration tests and real device follow-up; ensure actual verified logout, safe Back and no stale GURU drawer on public routes. Only after new source SHA is pushed should ChatGPT pull, analyze/test/build, uninstall and reinstall a changed APK. **Merge / Google Play release HOLD**; no keystore, local secrets, APK or AAB committed.


## Right drawer clicks not opening pages — user report (7 November 2026)

**FAIL / not yet reproduced by independent tap:** User reported the right-hand navigation sidebar pages could not be clicked/opened after previous repair. At time of remote audit, `origin/integration/android-play-from-main-20261107` was still at `57dbb6c91ffddefe41899df8f83aaa9e8804be2d`, with **no new source change** beyond the previously tested APK source `520440e9`. On-device screenshot at inspection time showed Samsung's home screen, not an authenticated GURU drawer; no claims about authenticated menu tap results should be made.

**Source findings:** `mobile/lib/features/shell/app_shell.dart` has drawer ListTile handlers for `guru_ai`, `guru_grading`, `guru_eyd`, `guru_text`, `guru_komunitas`, and `guru_berlangganan` wired to `_openRoute(routeKey, tabIndex)`, which calls `Navigator.pop(context)` then modifies `_index` and `_selectedRoute`; `AppRoutes.webPathForRoute` maps each to an existing Next.js route. Their route files exist and unauthenticated HTTP GET produced 200, but this does not verify signed-in Flutter tap navigation, WebView redirects, role state, frontend interactions or API access. Test route tap -> drawer closes -> actual URL loaded -> role remains authenticated -> feature works; log onNavigationRequest/pageStarted/pageFinished and main-frame WebResourceError without exposing tokens.

**Confirmed wrong route:** Lupa Kata Sandi drawer uses `setState(() => _index = 1)`, not `AppRoutes.forgot`, and configured forgot path `/auth/lupa-sandi` gives 404. Fix to existing intended request-recovery page after verifying route, add widget/navigation regression tests.

**Other blockers remain:** anonymous `/hapus-akun` redirects to login; screenshot showed duplicate login breadcrumb and excess top gap because web production differs from unmerged Next.js fix; logout currently does not await server acknowledgment. Request Grok to push source fix to PR #246, then ChatGPT rebuilds APK and runs device E2E. Do not merge main, force-push PR #245, or commit credentials.
