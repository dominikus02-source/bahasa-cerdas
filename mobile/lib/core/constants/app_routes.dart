import '../constants/app_constants.dart';

class AppRoutes {
  static const String splash = '/';
  static const String landing = '/landing';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String forgot = '/forgot';
  static const String dashboard = '/dashboard';
  static const String logout = '/logout';

  // Guru paths (match website)
  static const String guruBeranda = '/guru/beranda';
  static const String guruAiTools = '/guru/ai-tools';
  static const String guruAiGrading = '/guru/ai-tools/grading';
  static const String guruAiEyd = '/guru/ai-tools/eyd';
  static const String guruAiText = '/guru/ai-tools/text-analysis';
  static const String guruKomunitas = '/guru/komunitas';
  static const String guruBerlangganan = '/guru/berlangganan';

  static String webPathForRoute(String route, {String? role}) {
    switch (route) {
      case landing:
        return AppConstants.baseUrl;
      case login:
        return '${AppConstants.baseUrl}${AppConstants.loginPath}';
      case signup:
        return '${AppConstants.baseUrl}/auth/register';
      case forgot:
        return '${AppConstants.baseUrl}/auth/lupa-sandi';
      case logout:
        return '${AppConstants.baseUrl}/auth/logout';
      case dashboard:
        return _dashboardForRole(role);
      case 'guru_ai':
        return '${AppConstants.baseUrl}$guruAiTools';
      case 'guru_grading':
        return '${AppConstants.baseUrl}$guruAiGrading';
      case 'guru_eyd':
        return '${AppConstants.baseUrl}$guruAiEyd';
      case 'guru_text':
        return '${AppConstants.baseUrl}$guruAiText';
      case 'guru_komunitas':
        return '${AppConstants.baseUrl}$guruKomunitas';
      case 'guru_berlangganan':
        return '${AppConstants.baseUrl}$guruBerlangganan';
      default:
        return AppConstants.baseUrl;
    }
  }

  static String _dashboardForRole(String? role) {
    switch (role?.toUpperCase()) {
      case AppConstants.roleMurid:
        return '${AppConstants.baseUrl}${AppConstants.muridHome}';
      case AppConstants.roleGuru:
        return '${AppConstants.baseUrl}$guruBeranda';
      case AppConstants.roleAdmin:
        return '${AppConstants.baseUrl}${AppConstants.adminHome}';
      case AppConstants.roleUmum:
        return '${AppConstants.baseUrl}${AppConstants.umumHome}';
      default:
        return '${AppConstants.baseUrl}${AppConstants.loginPath}';
    }
  }
}
