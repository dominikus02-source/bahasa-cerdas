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


## Samsung A23 — Android Back navigation after JUMPA (7 November 2026)

**PASS (user-confirmed):** Android system Back successfully returned from JUMPA to the previous page without logging the user out. This was manually confirmed on Samsung SM-A236E with Android 14; no UI automation assertion was made.

**ADB observation:** device remained connected with status `device`; the `com.bahasacerdas.app` process remained active; no application fatal exception was found in the inspected crash buffer. **Still HOLD for Play release:** upload/download, file picker, logout/session integrity, cross-role testing, multi-party media, network recovery, and remaining Play Console policy gates. No credentials, signing secrets, or binary artifacts are included in this report.


## Samsung A23 — File transfer manual check (7 November 2026)

**User-reported PASS:** User indicated the just-requested file upload/download check works on their Samsung Galaxy A23. The specific feature menu, uploaded file type, download destination, and downloaded file integrity have **not** been independently verified by ADB or an automated test. Treat this as manual functional confirmation, not a validated file-integrity E2E test.

**ADB observation:** Android device remained authorized (`device`), BahasaCerdas process was running (PID `30896`), and the checked Android crash buffer had no matching app fatal crash. Further release gates remain: other RBAC roles, logout and login persistence, two-party JUMPA media, notification delivery, network recovery, Play policy and deployment approval. No personal file contents or secret material were accessed or committed.


## P0 physical regression: logout fails on Samsung Galaxy A23 (7 November 2026)

**FAIL (user-reported):** after successful login and JUMPA tests, tapping the app's logout action did not log the user out. Device is Samsung SM-A236E, Android 14, app source SHA `855d43dcaff7181728043106c788bb9202985cab`. **Security/release gate HOLD.** Do not count login success as logout success.

**Static code evidence:** `mobile/lib/features/shell/app_shell.dart` lines 93–120, method `_logout()`, invokes `WebViewController.runJavaScriptReturningResult` with an `(async function() { const response = await fetch('/api/auth/logout', {method:'POST', credentials:'include'}); return response.ok ? 'OK' : 'FAILED'; })()` JavaScript expression, then synchronously checks whether the returned Dart value's string contains `OK`. This may return a serialized JavaScript Promise instead of its eventual result and trigger `StateError('Logout endpoint rejected the request')`; this is a **suspected root cause**, not yet proven from a trace. The catch handler shows `Gagal keluar. Periksa koneksi dan coba lagi.` without actionable diagnostics. Web endpoint `app/api/auth/logout/route.ts` handles POST; an unauthenticated GET request returned expected **405 Method Not Allowed**, not proof of working authenticated POST.

**Required Grok source fix and regression verification:** implement a reliable asynchronous Android WebView logout protocol (e.g. JavaScriptChannel callback with request ID / timeout, exact allowlisted origin and status verification) or equivalent server-side authenticated sign-out with verifiable response; ensure Supabase session and cookie state are revoked/cleared appropriately, clear stale WebView history and navigate safely to login only when successful, and prevent Android Back from reopening authenticated content. Handle non-200/network failure without falsely claiming success. Add automated tests for success, API failure, stale controller, re-login, and Back navigation. Do not fix by forcing the UI to login without invalidating session; do not use `adb pm clear` as a substitute. Then push source fix to PR #246 for ChatGPT to rebuild APK and rerun on Galaxy A23.

**ADB:** device connected and app running; queried crash buffer contained no app FATAL EXCEPTION (this does not disprove functional logout failure). No passwords, session tokens, personal screen data, secrets, or app data were accessed.


## P0 visual confirmation: login screen with stale GURU navigation (Samsung A23, 7 November 2026)

**User-provided screenshots (manual evidence):** BahasaCerdas Android showed the public **Masuk** login form while its Flutter bottom navigation still showed role **GURU** tabs (`Beranda / AI Tools / Komunitas / Akun`), with **AI Tools** highlighted. In another screenshot, the drawer continued to say **`Halo, GURU`** and exposed teacher-specific options and **Keluar** even though the underlying web page looked like a public landing page. This proves a **native WebView navigation/role-state mismatch**; it does **not**, by itself, prove that the underlying Supabase session was or was not invalidated.

**Specific source evidence:**
- `mobile/lib/features/webview/webview_screen.dart` `_detectRoleFromUrl` (around lines 111–132) infers roles when the path starts `/guru`, `/murid`, `/admin`, `/umum` or contains founder, but **never clears the role** when the WebView lands on `/login`, `/signup`, or public routes.
- `mobile/lib/features/shell/app_shell.dart` `_pages` uses cached `_role` to render privileged tabs; `_logout()` (around lines 93–120) relies on `runJavaScriptReturningResult` over an asynchronous `fetch` and can leave stale role/UI on failure. Correctly invalidate server session and reconcile Flutter state with verified auth; do not assume that path alone is authorization.
- Screenshot of `/login` shows a breadcrumb **`Beranda > Masuk`** and a separate prominent **Beranda** button/card below it, plus excessive empty space above the breadcrumb. `components/navigation/route-breadcrumbs.tsx` still inserts an element with `MutationObserver`/`createPortal` into `main`; `breadcrumb-trail.module.css` gives the injected host `padding-top:72px` (88px desktop). Audit alongside login layout to remove duplicated visual navigation/spacing without suppressing necessary semantics.

**Grok acceptance tests:** (1) Logout button completes real Supabase invalidation and clears native role/tabs; (2) landing/login/signup display public navigation only, even after prior GURU session and Android Back; (3) refresh, resume, app restart and account switching cannot show stale teacher navigation; (4) verified authentication restores appropriate role-specific navigation after re-login; (5) login breadcrumb shows once, is below fixed header with no excessive gap at 320/375/390px; (6) error, timeout and offline logout states are safe and clear. Fix in PR #246, not production; ChatGPT rebuilds and retests physical APK before GO.

**Release status: HOLD (P0 auth/navigation coherence and logout).** Never commit screenshot-derived private user information, credentials, keystore or signed binaries.
