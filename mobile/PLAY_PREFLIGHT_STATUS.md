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


## Verifikasi PC Windows — SHA 68833ed651a06a400927dcc96f1a39db7d861503 (7 November 2026)

Worktree: `F:\bahasa-cerdas-android-integration\mobile`, mesin: `DESKTOP-2NM1AUE`.
Pull menggunakan `git merge --ff-only origin/integration/android-play-from-main-20261107` — **PASS**, HEAD tepat `68833ed651a06a400927dcc96f1a39db7d861503`.

| Perintah lokal | Exit code | Hasil sebenarnya |
|---|---:|---|
| `flutter pub get` | 0 | **PASS**; dependencies terpasang. Ada notifikasi 33 paket mempunyai versi baru di luar batas dependency, bukan kegagalan |
| `flutter analyze` | 0 | **PASS**; `No issues found! (ran in 2.1s)` (0 error, 0 warning) |
| `flutter test` | 0 | **PASS terbatas**; `+1: All tests passed!`, hanya tes `placeholder` pada `test/widget_test.dart`; E2E/coverage belum memadai |
| `flutter build appbundle --release` | 1 | **FAIL**; `Build failed due to use of deleted Android v1 embedding.` (terjadi sebelum tahapan Gradle/signing) |
| `adb devices -l` | — | **HOLD**; tidak ada serial perangkat Android |

**Investigasi penyebab AAB FAIL:** `MainActivity.kt` baru sudah benar meng-extend `io.flutter.embedding.android.FlutterActivity`, dan manifest berisi `flutterEmbedding=2`, tetapi root proyek `mobile/android` pada PR #246 hanya melacak 3 file: `app/build.gradle`, `app/src/main/AndroidManifest.xml`, `app/src/main/kotlin/com/bahasacerdas/app/MainActivity.kt`. **Tidak ada** file root `settings.gradle[.kts]`, `build.gradle[.kts]`, `gradle/wrapper/*`, `gradlew[.bat]`, atau `gradle.properties` yang dilacak. Flutter gagal di `AndroidProject.checkForDeprecation` sebelum memulai Gradle; perbaiki struktur Android proyek sepenuhnya, menjaga hanya satu DSL yang konsisten (Groovy atau Kotlin DSL), lalu rerun semua gate. Jangan menganggap ini hanya masalah `MainActivity`.

**CI:** pada pemeriksaan terakhir, workflow run [42320046332](https://github.com/dominikus02-source/bahasa-cerdas/actions/runs/42320046332) dan [42320042250](https://github.com/dominikus02-source/bahasa-cerdas/actions/runs/42320042250) untuk SHA `68833ed6` masih **in_progress**; tidak ada bukti final PASS.

**Keamanan:** `android/key.properties` dan `android/app/google-services.json` ada hanya di worktree lokal, ter-ignore, serta `key.properties` mengarah ke `C:/keys/bahasacerdas-release-clean.jks`. Tidak ada keystore/password/AAB/APK di Git. Keystore bersih wajib dibackup aman. **Release / merge: HOLD**, PR #245 tetap tidak diubah.
