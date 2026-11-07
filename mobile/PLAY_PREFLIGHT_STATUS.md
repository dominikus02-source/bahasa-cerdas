# Android Play — integration preflight status (PR #246)

Last updated: 2026-11-07 (nullable error.url compile fix).
Branch: `integration/android-play-from-main-20261107`
Review: https://github.com/dominikus02-source/bahasa-cerdas/pull/246

## Compile fix pushed

| Item | Status | Evidence |
|---|---|---|
| `Uri.tryParse(error.url)` String? error | **FIXED (code)** | `onWebResourceError` now checks `error.url` for null/empty before parsing. Logs path only. |
| Drawer navigation | **FIXED (code)** | Prior commit — closeEndDrawer + loadRequest |
| Forgot password path | **FIXED (code)** | `/reset-password` |

## Quality gates — HOLD until re-run on new SHA

Previous run on c6ab0f5c: analyze and build FAIL due to nullable URL. Fix pushed; ChatGPT must re-run all gates and reinstall on Galaxy A23.

| Gate | Status |
|---|---|
| flutter analyze / test / build apk | HOLD |
| Physical GURU drawer retest | HOLD |
| Merge to main | **HOLD** |

## Security

- Do not merge PR #246.
- Never commit keystore, key.properties, google-services.json, AAB, or APK.


## Physical QA — 7 Nov 2026 — source SHA f8e7562b6bce49f2276282f0eb4b17b49fb5c172

Worktree F:\bahasa-cerdas-android-integration; PC DESKTOP-2NM1AUE; Samsung SM-A236E Android 14. Git fetch and fast-forward confirmed exact HEAD f8e7562b6bce49f2276282f0eb4b17b49fb5c172.

| Gate | Exit code | Evidence |
|---|---:|---|
| flutter pub get | 0 | PASS; Got dependencies (33 new optional versions outside constraints) |
| flutter analyze | 0 | PASS; No issues found |
| flutter test | 0 | PASS; 23 tests passed, including drawer route mapping |
| flutter build apk --release | 0 | PASS; APK 46,439,302 bytes |
| apksigner verify | 0 | PASS; v2 signature and expected certificate |
| adb uninstall com.bahasacerdas.app | 0 | PASS; Success |
| adb install app-release.apk | 0 | PASS; Success |
| adb launcher start | 0 | PASS; PID 22018, no fatal crash in checked crash buffer |

APK SHA256 0A45E151AB4858C226DB492DDF0DCB0995A6A3C2B4D3C592F4DF0133030DD542; signer certificate SHA256 1AA9F86EB9B284C625ABC48D3293E28C02AC471172BF8CA2D87D7C5036B4C263. No private keys or binary artifacts committed.

Static inspection: _openRoute closes end drawer, updates selected route and explicitly calls WebView loadRequest; _openForgotPassword uses /reset-password. These changes are covered by URL mapping tests but NOT authenticated UI tap E2E.

HOLD on GURU menu acceptance: Fresh uninstall erased login state. User must login GURU locally on Samsung to verify AI Tools, Grading, EYD, Text Analysis, Komunitas, Berlangganan, Lupa Kata Sandi, Keluar. No account credentials accessed by operator. Play release and merge HOLD pending authenticated checks, verified server logout and previous breadcrumb/layout blockers.
