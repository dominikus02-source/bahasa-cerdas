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


## Verifikasi PC Windows — SHA 855d43dcaff7181728043106c788bb9202985cab (7 November 2026)

**Mesin:** `DESKTOP-2NM1AUE`; worktree `F:\bahasa-cerdas-android-integration\mobile`. `git fetch origin` dan `git merge --ff-only origin/integration/android-play-from-main-20261107` berhasil, HEAD diverifikasi sama persis dengan SHA target `855d43dcaff7181728043106c788bb9202985cab`.

| Perintah | Exit code | Bukti |
|---|---:|---|
| `flutter pub get` | **0 / PASS** | `Got dependencies!`; catatan non-blocking: 33 packages memiliki versi baru di luar dependency constraints |
| `flutter analyze` | **0 / PASS** | `No issues found! (ran in 2.3s)`; 0 error, 0 warning |
| `flutter test` | **0 / PASS** | `+8: All tests passed!`; 7 AppRoutes (RBAC dan legal path) + 1 placeholder; belum setara E2E fisik |
| `flutter build appbundle --release` | **0 / PASS** | `Built build\\app\\outputs\\bundle\\release\\app-release.aab (39.2MB)`; Gradle `bundleRelease` selesai sekitar 79.3 detik |

**AAB release integrasi tervalidasi:**
- File lokal: `F:\bahasa-cerdas-android-integration\mobile\build\app\outputs\bundle\release\app-release.aab`.
- Ukuran tepat: **41,126,660 byte**.
- SHA-256 **artefak**: `DC6CFF744478D8BEE9CA86BEBF7652EC16ECA132D3ADFB55F6A9CACA2D2B6B38`.
- Identitas signer: `CN=Bahasa Cerdas, OU=IT, O=Bahasa Cerdas, L=Tangerang Selatan, ST=Banten, C=ID`.
- Fingerprint SHA-256 **sertifikat**: `1AA9F86EB9B284C625ABC48D3293E28C02AC471172BF8CA2D87D7C5036B4C263` — sama dengan keystore bersih yang disetujui, **PASS**.
- Kegagalan `deleted Android v1 embedding` dan AAPT resources missing dari pemeriksaan SHA sebelumnya **sudah teratasi**.

**Masih HOLD untuk merge/rilis:** `adb devices -l` tidak mendeteksi ponsel fisik; E2E login/RBAC/WebView/FCM/Crashlytics/upload/download belum dijalankan. Dua workflow GitHub CI untuk SHA 855d43dc, run `42320925296` dan `42320920561`, masih **in_progress** ketika diperiksa — belum boleh dianggap PASS. Verifikasi kebijakan/route publik dan Play Console tetap diperlukan. PR #246 **tidak di-merge**, PR #245 **tidak di-force-push**. Keystore, password, `key.properties`, `google-services.json`, APK, dan AAB tidak pernah di-commit. Backup keystore bersih wajib disimpan aman.


## Samsung Galaxy A23 physical smoke test — 7 November 2026

**Build under test:** application source SHA `855d43dcaff7181728043106c788bb9202985cab` (documentation commit `631c9ec8`). Samsung `SM-A236E`, Android 14, API 34, USB ADB authorized. AAB and APK signed with the clean Bahasa Cerdas certificate.

- **ADB:** `adb devices -l` listed `RRCW506HJJY device` — PASS.
- **APK release install:** `adb install -r .../app-release.apk` returned `Success`, exit code 0, preserving existing app data — PASS.
- **Launch:** `adb shell monkey -p com.bahasacerdas.app -c android.intent.category.LAUNCHER 1` returned exit code 0, and `com.bahasacerdas.app/.MainActivity` was top resumed, process remained alive — PASS.
- **Login:** User directly confirmed successful login on the phone — **PASS, user-reported**, not automated identity/RBAC verification.
- **JUMPA camera:** User directly confirmed camera functions — **PASS, user-reported**. Android `cmd appops get com.bahasacerdas.app CAMERA RECORD_AUDIO` independently showed `CAMERA: allow` and a recent running camera session.
- **JUMPA microphone:** User directly confirmed microphone functions — **PASS, user-reported**. Package permission was granted previously; this log query did not independently establish live audio transmission.
- **Crash:** No matching app-related fatal crash in queried Android crash buffer; not a full E2E stability guarantee.
- **Still HOLD:** Two-party audio/video exchange, mic mute/unmute, camera toggle, rejoin/network recovery, background/foreground, Android Back navigation, upload/download, sign-out, additional RBAC users, Play release approval.

**Release recommendation: GO for continued physical E2E; HOLD for production merge and Google Play release.** No personal data, password, keystore, APK/AAB, `key.properties`, or `google-services.json` is recorded in Git.


## Samsung A23 — JUMPA media controls and end-session smoke test (7 November 2026)

Android 14 device `SM-A236E` connected through authorized USB ADB; tested Android application source remains `855d43dcaff7181728043106c788bb9202985cab`.

**User-reported PASS:** mute/unmute microphone, turn off/on camera, and end JUMPA session. Previous user-reported PASS: app login, camera, microphone. These are manual single-device confirmation, not automated multi-participant acceptance tests.

**ADB observations after user ended session:** `adb get-state` returned `device`; `pidof com.bahasacerdas.app` returned PID `30896` (app stays alive); `cmd appops get com.bahasacerdas.app CAMERA RECORD_AUDIO` reported `CAMERA: allow` with completed session duration (~10 seconds), rather than actively running; no `AndroidRuntime/FATAL EXCEPTION` match in checked crash buffer.

**Remaining HOLD:** actual two-participant audio/video reception, switching networks and rejoin, logout and session persistence, navigation/back button, file picker/upload/download, role access separation, notifications/FCM, Play policy and release signoff. This test is **GO for continued device QA, HOLD for merge and Play publication**. No secret, keystore, user credentials or binary artifacts are recorded or committed.


## Samsung A23 — JUMPA rejoin after ending session (7 November 2026)

**User-reported PASS:** User confirmed that they could join JUMPA again after previously ending a meeting on the Android 14 Samsung SM-A236E. This confirms manual single-device rejoin/re-entry, not yet a validated multi-participant reconnection, connectivity-loss recovery, or complete session-state test.

**ADB confirmation:** Device remained `device`; `com.bahasacerdas.app` process still running (PID `30896`); queried Android crash buffer contained no matching `FATAL EXCEPTION` from the app. **Release remains HOLD** for outstanding E2E (two participants, Android Back, upload/download, logout/session persistence, network recovery, Play policy). No credentials or secret data were collected.
