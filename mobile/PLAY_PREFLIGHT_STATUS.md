# Android Play — integration preflight status (PR #246)

Last updated: 2026-11-07 (Grok source fixes).
Branch: `integration/android-play-from-main-20261107`
Review: https://github.com/dominikus02-source/bahasa-cerdas/pull/246

## Source fixes pushed (awaiting local verification by ChatGPT)

| Item | Status | Evidence |
|---|---|---|
| Flutter analyze — missing import / AppConstants | **FIXED (code)** | `mobile/lib/features/splash/splash_screen.dart` import path corrected to `../../core/constants/app_constants.dart` (commit 48c3f49) |
| Flutter analyze — PlatformDispatcher | **FIXED (code)** | Added `import 'dart:ui';` in `mobile/lib/main.dart` (commit 62132b2) |
| Asset directory warnings | **FIXED (code)** | Added `mobile/assets/icons/.gitkeep` and `mobile/assets/images/.gitkeep` |
| Android embedding v2 / MainActivity | **FIXED (code)** | Created `mobile/android/app/src/main/kotlin/com/bahasacerdas/app/MainActivity.kt` extending `FlutterActivity` (commit f61b01e). Manifest already has `flutterEmbedding=2`. |
| /hapus-akun public | **FIXED (code)** | Already in `publicPaths` on this branch |
| Gradle | **UNCHANGED** | Groovy `build.gradle` retained (no Kotlin DSL mix) |

## Quality gates — still HOLD until local re-run

| Gate | Status | Note |
|---|---|---|
| `flutter analyze` | HOLD | Errors fixed in source; ChatGPT must re-run and report |
| `flutter test` | HOLD | Placeholder test still; more tests can be added later |
| `flutter build appbundle --release` | HOLD | MainActivity added; ChatGPT must rebuild and confirm |
| Physical device E2E | HOLD | ADB still no device |
| GitHub CI | REVIEW | Check latest runs on PR #246 |
| Merge to main | **HOLD** | Do not merge until local analyze + release build PASS |

## Release and security controls

- Do not merge PR #246 or #245.
- Clean keystore remains only on local PC: `C:\\keys\\bahasacerdas-release-clean.jks`.
- Never commit keystore, key.properties, google-services.json, AAB, or APK.
- SHA of latest source fix commits: see PR #246 history.
