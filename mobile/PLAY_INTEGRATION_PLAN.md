# Android Play — PR #246 integration plan and physical E2E gate

Repository: https://github.com/dominikus02-source/bahasa-cerdas
Integration branch: `integration/android-play-from-main-20261107`
Feature PR #245 stays draft, no rebase/force-push.
Use isolated PC worktree `F:\bahasa-cerdas-android-integration`, not the active `F:\bahasa-cerdas` checkout.

## Exact PowerShell test commands (PC)
```powershell
cd F:\bahasa-cerdas-android-integration\mobile
flutter pub get
flutter analyze
flutter test
flutter build appbundle --release
```
The following inputs are required ONLY locally, and already provisioned in this QA worktree. Never print or commit them:
- `mobile\android\key.properties` must reference `storeFile=C:/keys/bahasacerdas-release-clean.jks`, with passwords entered only by the authorized local operator.
- `mobile\android\app\google-services.json` copied locally.
- Check: `git check-ignore mobile/android/key.properties mobile/android/app/google-services.json`.

### Current blockers — fix before repeating build
1. Repair `mobile/lib/features/splash/splash_screen.dart`: missing/incorrect constants import and `AppConstants` value.
2. Repair `mobile/lib/main.dart`: Flutter `PlatformDispatcher` missing Dart UI import, and verify Firebase init does not break widget test.
3. Restore actual `mobile/assets/icons/` and `mobile/assets/images/` or adjust pubspec and splash references appropriately.
4. **Android app embedding:** `flutter build appbundle --release` currently refuses deleted v1 embedding. Verify native `MainActivity` subclass of FlutterActivity exists at correct package and matches AndroidManifest, plus v2 embedding metadata. Compare working Android source on PR #245; do not blindly copy Gradle because PR #246 uses Groovy vs feature Kotlin DSL.
5. Run analyze, all relevant tests (not just 1 placeholder), debug and release builds in isolated worktree. Then CI build + smoke must pass on the reviewed SHA.
6. For account deletion, add public route regression tests; production still redirects `https://www.bahasacerdas.com/hapus-akun` to `/login`. Do not deploy solely to fix this before gate and authorization.

## Physical Android QA — gate before merge
1. Unlock phone, enable Developer Options (tap Build number 7x), activate USB debugging, use USB **data** cable and accept RSA debugging prompt.
2. `adb kill-server; adb start-server; adb devices -l`. If `unauthorized`, accept prompt. If no serial, check cable, Windows OEM USB drivers and Device Manager.
3. After a serial with status `device` appears, run:
```powershell
adb -s SERIAL shell getprop ro.build.version.release
adb -s SERIAL install -r F:\bahasa-cerdas-android-integration\mobile\build\app\outputs\flutter-apk\app-release.apk
adb -s SERIAL shell monkey -p com.bahasacerdas.app -c android.intent.category.LAUNCHER 1
```
Do not overwrite an installed app signed with a different key without securely backing up its data and using a test account.
4. Checklist: role-scoped login/logout (guru, siswa, admin), session persistence, WebView allowlist/blocked hosts, file picker upload/download, denied/granted camera and microphone in JUMPA, Android notification consent and FCM test, controlled Crashlytics test, portrait/rotation and viewport, navigation Back/gesture preserving session and drafts, offline/resume.
5. Record device model, Android version, PASS/FAIL and redacted evidence. E2E remains **HOLD** until actual physical device evidence exists.

## Play Console before publishing
- Data Safety inventory: login/profile, school data, FCM token, Crashlytics diagnostics, uploads, retention/deletion, transfer encryption, third-party SDKs.
- Public Privacy Policy `https://www.bahasacerdas.com/kebijakan-privasi` (content must match collection).
- Public account-deletion information/request URL `https://www.bahasacerdas.com/hapus-akun` currently blocked by login redirect, and must be fixed plus tested in-app.
- IARC/content rating, target audience/Families checks, app access tester accounts, required disclosures, screenshots/feature graphic/icon, support contacts, privacy questionnaire.
- Google Play signing/upload key strategy, target SDK requirement, closed testing eligibility for a new personal developer account.

**GO to merge and production only when CI all green, integration Flutter analyze/test/build clean, E2E real device PASS, and explicit release authorization.**
