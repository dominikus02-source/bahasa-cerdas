# Android build recovery — 6 November 2026

## Verified evidence
- `flutter analyze`: PASS, 0 issues.
- `flutter test`: PASS, 3 contract tests.
- `flutter build apk --debug`: FAIL, `Build failed due to use of deleted Android v1 embedding.`
- Flutter 3.41.6, Dart 3.11.4, Android SDK 36.0.0, Java 17; Android licenses accepted.
- `mobile/android` contains `app/` and `local.properties`, but lacks root Gradle wrapper/settings/build files. `app/src/main` lacks `MainActivity`.
- `AndroidManifest.xml` already declares `flutterEmbedding=2`. This alone does not make the incomplete Android project buildable.

## Recovery procedure (isolated worktree only)
1. Preserve existing `mobile/android/app/build.gradle`, `AndroidManifest.xml`, Firebase configuration and signing settings; never commit local credentials.
2. Generate a fresh Flutter Android v2 scaffold in a temporary folder with the same package identity `com.bahasacerdas.app`, using the installed Flutter SDK.
3. Review and port scaffold files into the dedicated mobile worktree, reconciling Google Services, Firebase, Android permissions, deep links, signing and Gradle versions.
4. Verify that `MainActivity` extends `FlutterActivity`; keep camera/microphone runtime permission handling scoped to JUMPA, not app startup.
5. Run `flutter pub get`, `flutter analyze`, `flutter test`, `flutter build apk --debug`; inspect APK package identity and install/smoke-test on a physical Android device.
6. Do not release or deploy until actual build and login/JUMPA tests pass.

## Guardrails
- Do not change BahasaCerdas production, VPS or JUMPA branch.
- No release keystore in Git; release signing must not use the debug key.
- Existing role-aware navigation is presentation only; server-side auth/RBAC remains authoritative.
- The current test suite does not prove login, camera, microphone, OAuth, deep links or production readiness.

## Current blocker
Attempted Flutter scaffold generation through the remote command interface, but execution was blocked by safety controls. No Android scaffold was generated or APK produced in this step.
