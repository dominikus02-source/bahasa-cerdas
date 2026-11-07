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
