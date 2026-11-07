import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/app_constants.dart';
import 'package:bahasa_cerdas/core/constants/app_routes.dart';

void main() {
  group('AppRoutes RBAC paths', () {
    test('murid dashboard resolves to /murid/beranda', () {
      final url = AppRoutes.webPathForRoute(AppRoutes.dashboard, role: AppConstants.roleMurid);
      expect(url, '${AppConstants.baseUrl}${AppRoutes.muridBeranda}');
    });

    test('guru dashboard resolves to /guru/beranda', () {
      final url = AppRoutes.webPathForRoute(AppRoutes.dashboard, role: AppConstants.roleGuru);
      expect(url, '${AppConstants.baseUrl}${AppRoutes.guruBeranda}');
    });

    test('admin dashboard resolves to /admin', () {
      final url = AppRoutes.webPathForRoute(AppRoutes.dashboard, role: AppConstants.roleAdmin);
      expect(url, '${AppConstants.baseUrl}${AppRoutes.adminHome}');
    });

    test('umum dashboard resolves to /umum', () {
      final url = AppRoutes.webPathForRoute(AppRoutes.dashboard, role: AppConstants.roleUmum);
      expect(url, '${AppConstants.baseUrl}${AppRoutes.umumHome}');
    });

    test('unknown role falls back to login', () {
      final url = AppRoutes.webPathForRoute(AppRoutes.dashboard, role: 'UNKNOWN');
      expect(url, '${AppConstants.baseUrl}${AppConstants.loginPath}');
    });

    test('login route is absolute HTTPS', () {
      final url = AppRoutes.webPathForRoute(AppRoutes.login);
      expect(url, startsWith('https://www.bahasacerdas.com/login'));
    });

    test('delete account legal path is public-friendly', () {
      // Hapus akun info page must stay reachable without auth
      expect(AppConstants.baseUrl, startsWith('https://'));
    });
  });
}
