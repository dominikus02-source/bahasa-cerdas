# Android Play — integration preflight status (PR #246)

Last updated: 2026-11-07 (Android resources added for AAPT).
Branch: `integration/android-play-from-main-20261107`
Review: https://github.com/dominikus02-source/bahasa-cerdas/pull/246

## Source fixes pushed (awaiting local re-verification by ChatGPT)

| Item | Status | Evidence |
|---|---|---|
| Flutter analyze / PlatformDispatcher / imports | **FIXED (code)** | Prior commits |
| Android embedding v2 / MainActivity | **FIXED (code)** | MainActivity.kt + flutterEmbedding=2 |
| Gradle scaffold (Groovy) | **FIXED (code)** | settings.gradle, root build.gradle, wrapper properties |
| Functional tests | **ADDED** | `mobile/test/app_routes_test.dart` (8 tests) |
| **Android resources (AAPT)** | **FIXED (code)** | Added `res/values/styles.xml` (LaunchTheme, NormalTheme), `res/values/colors.xml`, `res/drawable/launch_background.xml`, `res/drawable/ic_launcher_foreground.xml`, adaptive icons in `mipmap-anydpi-v26/`, and density fallbacks (mdpi–xxxhdpi) for `ic_launcher` and `ic_launcher_round`. Brand color `#7C3AED`. |
| /hapus-akun public | **FIXED (code)** | In publicPaths |

## Quality gates — HOLD until local re-run on new SHA

Previous local run (SHA 0dd436f8):
- flutter pub get / analyze / test: **PASS** (8 tests)
- flutter build appbundle --release: **FAIL** at `:app:processReleaseResources` (missing mipmap/style resources)
- v1 embedding error: **resolved**

| Gate | Status | Note |
|---|---|---|
| `flutter analyze` | HOLD | Re-run on new HEAD |
| `flutter test` | HOLD | Re-run |
| `flutter build appbundle --release` | HOLD | Resources added; ChatGPT must rebuild and confirm |
| Physical device E2E | HOLD | ADB still no device |
| Kotlin incremental cross-drive warning | NOTE | Pub cache on C:, build on F:. Not a hard failure. Optional local `kotlin.incremental=false` if it blocks; do not change CI without evidence. |
| Merge to main | **HOLD** | Do not merge |

## Release and security controls

- Do not merge PR #246 or #245.
- Clean keystore remains only on local PC: `C:\\keys\\bahasacerdas-release-clean.jks`.
- Never commit keystore, key.properties, google-services.json, AAB, or APK.
- Gradle DSL: **Groovy only** on this branch.
