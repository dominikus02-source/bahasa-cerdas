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
