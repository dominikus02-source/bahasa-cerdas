import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/app_constants.dart';
import 'package:bahasa_cerdas/core/constants/app_routes.dart';

void main() {
  group('drawer navigation URLs', () {
    test('guru AI Tools opens /guru/ai-tools', () {
      final url = AppRoutes.webPathForRoute('guru_ai', role: AppConstants.roleGuru);
      expect(url, '${AppConstants.baseUrl}/guru/ai-tools');
    });

    test('guru Grading opens /guru/ai-tools/grading', () {
      final url = AppRoutes.webPathForRoute('guru_grading', role: AppConstants.roleGuru);
      expect(url, '${AppConstants.baseUrl}/guru/ai-tools/grading');
    });

    test('guru EYD opens /guru/ai-tools/eyd', () {
      final url = AppRoutes.webPathForRoute('guru_eyd', role: AppConstants.roleGuru);
      expect(url, '${AppConstants.baseUrl}/guru/ai-tools/eyd');
    });

    test('guru Text Analysis opens /guru/ai-tools/text-analysis', () {
      final url = AppRoutes.webPathForRoute('guru_text', role: AppConstants.roleGuru);
      expect(url, '${AppConstants.baseUrl}/guru/ai-tools/text-analysis');
    });

    test('guru Komunitas opens /guru/komunitas', () {
      final url = AppRoutes.webPathForRoute('guru_komunitas', role: AppConstants.roleGuru);
      expect(url, '${AppConstants.baseUrl}/guru/komunitas');
    });

    test('guru Berlangganan opens /guru/berlangganan', () {
      final url = AppRoutes.webPathForRoute('guru_berlangganan', role: AppConstants.roleGuru);
      expect(url, '${AppConstants.baseUrl}/guru/berlangganan');
    });

    test('forgot password uses /reset-password not 404 path', () {
      final url = AppRoutes.webPathForRoute(AppRoutes.forgot);
      expect(url, '${AppConstants.baseUrl}/reset-password');
      expect(url, isNot(contains('/auth/lupa-sandi')));
    });

    test('murid Belajar opens /murid/belajar', () {
      final url = AppRoutes.webPathForRoute('murid_belajar', role: AppConstants.roleMurid);
      expect(url, '${AppConstants.baseUrl}/murid/belajar');
    });

    test('admin home opens /admin', () {
      final url = AppRoutes.webPathForRoute('admin_home', role: AppConstants.roleAdmin);
      expect(url, '${AppConstants.baseUrl}/admin');
    });
  });
}
