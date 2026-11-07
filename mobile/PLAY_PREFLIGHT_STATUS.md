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
