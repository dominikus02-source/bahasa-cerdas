# Changelog

## [1.0.1] - 2026-11-07
### Fixed
- Corrected Kotlin package directory for MainActivity (`com.bahasacerdas.app`)
- Added deep link intent-filters for bahasacerdas.com domains in AndroidManifest
- Improved native welcome screen with Register button and legal links

### Added
- Better Play Store readiness notes

## [1.0.0] - 2026-11-06
### Added
- Flutter WebView shell untuk BahasaCerdas
- Splash screen native
- Bottom navigation (Beranda, Masuk, Daftar, Akun)
- Role detection via JS bridge
- Drawer dengan link Privacy, Terms, Forgot Password
- Logout FAB
- Offline handling
- Setup guide untuk Firebase, Signing, dan Deep Linking

### Notes
- Semua CRUD dan RBAC tetap dihandle oleh website + PostgreSQL
- Icon resmi perlu ditambahkan manual di `assets/icons/`
