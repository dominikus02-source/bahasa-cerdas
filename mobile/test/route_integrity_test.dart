import 'package:bahasa_cerdas/core/constants/app_constants.dart';
import 'package:bahasa_cerdas/core/constants/app_routes.dart';
import 'package:bahasa_cerdas/core/constants/mobile_premium_style.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Password recovery navigates to existing login page', () {
    expect(AppConstants.forgotPath, '/login');
    expect(
      AppRoutes.webPathForRoute(AppRoutes.forgot),
      '${AppConstants.baseUrl}/login',
    );
  });

  test('Student Kelasku list does not navigate to detail route without ID', () {
    expect(AppRoutes.muridKelasku, '/murid/gabung-kelas');
    expect(
      AppRoutes.webPathForRoute('murid_kelasku'),
      '${AppConstants.baseUrl}/murid/gabung-kelas',
    );
  });

  test('Android login styling respects light and dark text contrast', () {
    const script = MobilePremiumStyle.javascript;
    expect(script, contains('#bc-android-login-brand'));
    expect(script, contains('html.dark.bc-android-login'));
    expect(script, contains('background:rgba(255,255,255,.96)'));
    expect(script, contains('background:rgba(15,23,42,.94)'));
  });
}
