/// Placeholder konfigurasi Firebase
/// Setelah download google-services.json dari Firebase Console,
/// taruh di android/app/google-services.json
class FirebaseConfig {
  static const String projectId = 'bahasa-cerdas-app';
  static const String packageName = 'com.bahasacerdas.app';

  static const bool enableFCM = true;
  static const bool enableCrashlytics = true;
  static const bool enableAuth = false; // login tetap di web
}
