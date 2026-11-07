# Android Play — integration preflight status (PR #246)

Last updated: 2026-11-07 (drawer navigation + forgot-password path).
Branch: `integration/android-play-from-main-20261107`
Review: https://github.com/dominikus02-source/bahasa-cerdas/pull/246

## Drawer navigation fixes pushed (awaiting physical retest)

| Item | Status | Evidence |
|---|---|---|
| Drawer menu not opening pages | **FIXED (code)** | `_openRoute` now closes end drawer via `Scaffold.closeEndDrawer()` (no throwing `Navigator.pop`), sets route, and forces `controller.loadRequest(url)`. |
| Role detection wiping selection | **FIXED (code)** | `_onRoleDetected` no longer resets `_selectedRoute` when the same role is re-detected. |
| Lupa Kata Sandi 404 | **FIXED (code)** | Path changed from `/auth/lupa-sandi` to `/reset-password`. Drawer item calls `_openForgotPassword()`. |
| Safe diagnostics | **ADDED** | `onPageStarted` / `onPageFinished` / `onWebResourceError` log path only (no tokens). |
| Regression tests | **ADDED** | `mobile/test/drawer_navigation_test.dart` — all GURU menu URLs + forgot path. |

## Quality gates — HOLD until physical retest on Galaxy A23

| Gate | Status | Note |
|---|---|---|
| `flutter analyze` / `test` / `build apk` | HOLD | Re-run on new HEAD |
| Drawer taps open correct pages | HOLD | ChatGPT must rebuild APK and retest |
| Logout server verification | HOLD | Still fire-and-forget; needs verified POST status |
| Login breadcrumb on production | HOLD | Web fix not deployed |
| /hapus-akun public | HOLD | Production still redirects |
| Merge to main | **HOLD** | Do not merge |

## Release and security controls

- Do not merge PR #246 or #245.
- Clean keystore remains only on local PC: `C:\\keys\\bahasacerdas-release-clean.jks`.
- Never commit keystore, key.properties, google-services.json, AAB, or APK.
