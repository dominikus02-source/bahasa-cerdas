# Android Play — integration preflight status (PR #246)

Last verified: 2026-11-07, Windows PC `DESKTOP-2NM1AUE`.
Branch: `integration/android-play-from-main-20261107`, baseline `f1017ff4`.
Review: https://github.com/dominikus02-source/bahasa-cerdas/pull/246

## Quality gates — actual local results

| Gate | Status | Evidence |
|---|---|---|
| Worktree integration | PASS | Isolated `F:\bahasa-cerdas-android-integration`; branch local `qa/android-pr246-local` tracking origin integration |
| Local signing setup | PASS (configuration only) | `android/key.properties` and `app/google-services.json` copied from secure local PC workspace, git-ignored; references clean keystore. No key values read or committed |
| `flutter pub get` | PASS | Exit code 0 |
| `flutter analyze` | FAIL | 3 errors: missing `../constants/app_constants.dart` from splash, undefined `AppConstants`, undefined `PlatformDispatcher`; 2 warnings: missing `assets/icons/`, `assets/images/` |
| `flutter test` | PASS, limited | Exit code 0, **1 placeholder test**; warnings about missing asset directories; not equivalent to feature branch's 10 tests |
| `flutter build appbundle --release` | FAIL | Flutter error: `Build failed due to use of deleted Android v1 embedding.` Worktree's Android source lacks a project `MainActivity` class; inspect Android native scaffolding before repair |
| GitHub CI (SHA f1017ff4) | IN PROGRESS at inspection | Runs 42318951481 and 42318921134; smoke job 128238421881 passed, build jobs still running. Do not claim full CI PASS until final conclusion |
| Physical Android via `adb devices -l` | HOLD | No device ID; do not install or declare E2E pass |
| `/hapus-akun` public production URL | HOLD | Existing deployed site still redirects to `/login`; adding to `publicPaths` in draft PR alone does not deploy a fix |
| AAB/APK clean-signed on feature PR #245 | PASS (prior) | Different Flutter tree, **not evidence that PR #246 builds** |

## Release and security controls

- **HOLD:** do not merge PR #246 or #245, publish Play Store, or change production until integration analyze/build/CI and physical E2E pass.
- Clean signing identity: `CN=Bahasa Cerdas, OU=IT, O=Bahasa Cerdas, L=Tangerang Selatan, ST=Banten, C=ID`; cert SHA-256 `1AA9F86EB9B284C625ABC48D3293E28C02AC471172BF8CA2D87D7C5036B4C263`.
- Clean keystore: `C:\keys\bahasacerdas-release-clean.jks` on local PC only. Maintain secure encrypted backup, password separately.
- Never commit `key.properties`, `*.jks`, `*.keystore`, `google-services.json`, AAB, APK or credentials.
- The feature PR #245 is intentionally not rebased or force-pushed. The integration PR is independent.
