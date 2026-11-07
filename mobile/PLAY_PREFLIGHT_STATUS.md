# Android Play — integration preflight status (PR #246)

Last updated: 2026-11-07 (Gradle scaffold + functional tests added).
Branch: `integration/android-play-from-main-20261107`
Review: https://github.com/dominikus02-source/bahasa-cerdas/pull/246

## Source fixes pushed (awaiting local re-verification by ChatGPT)

| Item | Status | Evidence |
|---|---|---|
| Flutter analyze — missing import / AppConstants | **FIXED (code)** | splash import path corrected |
| Flutter analyze — PlatformDispatcher | **FIXED (code)** | `import 'dart:ui';` in main.dart |
| Asset directory warnings | **FIXED (code)** | `.gitkeep` added |
| Android embedding v2 / MainActivity | **FIXED (code)** | MainActivity.kt + flutterEmbedding=2 |
| **Gradle scaffold (root)** | **FIXED (code)** | Added Groovy `settings.gradle`, root `build.gradle`, `gradle.properties`, `.gitignore`, `gradle/wrapper/gradle-wrapper.properties`. Consistent Groovy DSL only. No secrets. |
| Functional tests | **ADDED** | `mobile/test/app_routes_test.dart` — RBAC dashboard paths for murid/guru/admin/umum + login HTTPS |
| /hapus-akun public | **FIXED (code)** | In publicPaths |

## Quality gates — HOLD until local re-run on new SHA

Previous local run (SHA 68833ed6):
- flutter pub get / analyze / test: PASS
- flutter build appbundle --release: FAIL (v1 embedding — missing root Gradle files)

| Gate | Status | Note |
|---|---|---|
| `flutter analyze` | HOLD | Re-run on new HEAD |
| `flutter test` | HOLD | Now includes RBAC route tests; re-run |
| `flutter build appbundle --release` | HOLD | Scaffold added; ChatGPT must rebuild and confirm |
| Physical device E2E | HOLD | ADB still no device |
| Merge to main | **HOLD** | Do not merge |

## Release and security controls

- Do not merge PR #246 or #245.
- Clean keystore remains only on local PC: `C:\\keys\\bahasacerdas-release-clean.jks`.
- Never commit keystore, key.properties, google-services.json, AAB, or APK.
- Gradle DSL: **Groovy only** on this branch.


## Verifikasi PC Windows — SHA 0dd436f890d21abc2c512dfd24d8d9104a7caa0a (7 November 2026)

**Mesin:** `DESKTOP-2NM1AUE`, worktree `F:\bahasa-cerdas-android-integration\mobile`. `git fetch origin` + `git merge --ff-only origin/integration/android-play-from-main-20261107` berhasil; HEAD dipastikan persis `0dd436f890d21abc2c512dfd24d8d9104a7caa0a`.

| Gate | Exit code | Hasil dan bukti |
|---|---:|---|
| `flutter pub get` | **0** | **PASS:** `Got dependencies!`; 33 package mempunyai versi lebih baru di luar constraints (informasi, bukan error) |
| `flutter analyze` | **0** | **PASS:** `No issues found! (ran in 1.8s)` (0 error, 0 warning) |
| `flutter test` | **0** | **PASS terbatas:** 8 tes lulus: 7 `AppRoutes` RBAC/legal-route, 1 placeholder. Belum menggantikan E2E fisik |
| `flutter build appbundle --release` | **1** | **FAIL:** Gradle task `:app:processReleaseResources`, `BUILD FAILED in 59s` |

**Error release persis pada langkah resource linking (AAPT):**
- `resource mipmap/ic_launcher ... not found`
- `resource mipmap/ic_launcher_round ... not found`
- `resource style/LaunchTheme ... not found`
- `resource style/NormalTheme ... not found`

**Catatan:** kegagalan `deleted Android v1 embedding` pada SHA terdahulu **sudah tidak muncul**; build mencapai `bundleRelease` dan `processReleaseResources`. Terdapat pesan cache Kotlin `different roots` (Pub cache di `C:`, build di `F:`) dan warning ketidakcocokan versi Android SDK XML. Pada percobaan ini kegagalan final AAPT adalah blocker yang eksplisit. Grok perlu melengkapi resources Android `mobile/android/app/src/main/res/` dan merapikan AndroidManifest tanpa menghilangkan branding/aplikasi. Evaluasi `kotlin.incremental=false` sebagai workaround *hanya jika diperlukan* tanpa melakukan perubahan konfigurasi CI serampangan.

**Gate rilis: HOLD:** AAB integrasi belum terbentuk sukses; Android fisik belum terdeteksi melalui ADB; CI GitHub dan E2E harus PASS sebelum merge. Keystore `C:\keys\bahasacerdas-release-clean.jks`, `key.properties`, `google-services.json`, AAB dan APK tetap lokal dan tidak boleh di-commit.
