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
