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


## PC retest — SHA c6ab0f5ceb31eddd6761b2f864961bede28276e4 (7 November 2026)

Machine: DESKTOP-2NM1AUE. Isolated integration worktree: F:\bahasa-cerdas-android-integration. `git fetch origin` and `git merge --ff-only origin/integration/android-play-from-main-20261107` both succeeded; confirmed HEAD exactly `c6ab0f5ceb31eddd6761b2f864961bede28276e4`.

| Gate | Exit code | Actual evidence |
|---|---:|---|
| `flutter pub get` | 0 | PASS, Got dependencies! (33 optional newer packages outside constraints) |
| `flutter analyze` | 1 | FAIL, one `argument_type_not_assignable` error in `lib/features/webview/webview_screen.dart:67:74` |
| `flutter test` | 0 | PASS, 23 tests passed, including new `drawer_navigation_test.dart` URL mapping checks; not device tap E2E |
| `flutter build apk --release` | 1 | FAIL, `lib/features/webview/webview_screen.dart:67:80`: `String?` cannot be passed to `Uri.tryParse` requiring `String`; `:app:compileFlutterBuildRelease` failed, BUILD FAILED in 16s |

**Root cause in source:** `developer.log('resourceError code=... path=${Uri.tryParse(error.url)?.path ?? "?"}', ...)`; `WebResourceError.url` is nullable. Grok must safely guard `error.url` (for example, check for null and parse only a non-null value) without suppressing error diagnostics or logging credentials, then push new source SHA and rerun gates.

**Device:** Samsung Galaxy A23 (SM-A236E) was connected and authorized through ADB (`RRCW506HJJY device`). Since source APK build FAILED, **did not uninstall current working application** and **did not install an older APK falsely labeled as SHA c6ab0f5c**. Physical GURU login / AI Tools / Grading / EYD / Text Analysis / Komunitas / Berlangganan / forgot password / logout tests for this SHA remain HOLD and NOT EXECUTED.

**Release HOLD:** analyze and build must PASS and new APK signature must be verified before uninstall/install on phone. Never commit key.properties, google-services.json, JKS, APK/AAB, user credentials or private data; do not merge PR #246.
