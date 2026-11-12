import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/app_routes.dart';
import 'package:bahasa_cerdas/core/constants/app_constants.dart';
import 'package:bahasa_cerdas/core/theme/app_theme.dart';

void main() {
  group('Mobile route contracts', () {
    test('guest login, registration and recovery use official web routes', () {
      expect(AppRoutes.webPathForRoute(AppRoutes.login),
          '${AppConstants.baseUrl}${AppConstants.loginPath}');
      expect(AppRoutes.webPathForRoute(AppRoutes.signup),
          '${AppConstants.baseUrl}${AppConstants.registerPath}');
      expect(AppRoutes.webPathForRoute(AppRoutes.forgot),
          '${AppConstants.baseUrl}${AppConstants.forgotPath}');
    });

    test('dashboard destination follows the signed-in role', () {
      expect(AppRoutes.webPathForRoute(AppRoutes.dashboard, role: 'MURID'),
          '${AppConstants.baseUrl}${AppConstants.muridHome}');
      expect(AppRoutes.webPathForRoute(AppRoutes.dashboard, role: 'GURU'),
          '${AppConstants.baseUrl}${AppConstants.guruHome}');
      expect(AppRoutes.webPathForRoute(AppRoutes.dashboard, role: 'ADMIN'),
          '${AppConstants.baseUrl}${AppConstants.adminHome}');
      expect(AppRoutes.webPathForRoute(AppRoutes.dashboard, role: 'UMUM'),
          '${AppConstants.baseUrl}${AppConstants.umumHome}');
      expect(AppRoutes.webPathForRoute(AppRoutes.dashboard),
          '${AppConstants.baseUrl}${AppConstants.loginPath}');
    });

    test('mobile app uses the official BC violet theme', () {
      expect(AppTheme.primary, const Color(0xFF7C3AED));
      expect(AppTheme.light.useMaterial3, isTrue);
      expect(AppTheme.dark.useMaterial3, isTrue);
    });
  });
}
