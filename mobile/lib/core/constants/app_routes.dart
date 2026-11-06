import '../constants/app_constants.dart';

class AppRoutes {
  static const String splash = '/';
  static const String landing = '/landing';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String forgot = '/forgot';
  static const String dashboard = '/dashboard';
  static const String logout = '/logout';

  // Guru
  static const String guruBeranda = '/guru/beranda';
  static const String guruAiTools = '/guru/ai-tools';
  static const String guruAiGrading = '/guru/ai-tools/grading';
  static const String guruAiEyd = '/guru/ai-tools/eyd';
  static const String guruAiText = '/guru/ai-tools/text-analysis';
  static const String guruKomunitas = '/guru/komunitas';
  static const String guruBerlangganan = '/guru/berlangganan';

  // Murid
  static const String muridBeranda = '/murid/beranda';
  static const String muridBelajar = '/murid/belajar';
  static const String muridKelasku = '/murid/kelasku';
  static const String muridProgres = '/murid/progresku';
  static const String muridKarya = '/murid/karya';
  static const String muridGame = '/murid/game';
  static const String muridKuest = '/murid/kuest-harian';
  static const String muridPremium = '/murid/premium';
  static const String muridProfile = '/murid/profile';

  // Admin / Founder
  static const String adminHome = '/admin';
  static const String adminFounder = '/admin/founder';
  static const String adminAnalytics = '/admin/analytics';
  static const String adminUsers = '/admin/users';
  static const String adminPayments = '/admin/payments';
  static const String adminPremium = '/admin/premium';
  static const String adminPengaturan = '/admin/pengaturan';

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

      // Guru
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

      // Murid
      case 'murid_belajar':
        return '${AppConstants.baseUrl}$muridBelajar';
      case 'murid_kelasku':
        return '${AppConstants.baseUrl}$muridKelasku';
      case 'murid_progres':
        return '${AppConstants.baseUrl}$muridProgres';
      case 'murid_karya':
        return '${AppConstants.baseUrl}$muridKarya';
      case 'murid_game':
        return '${AppConstants.baseUrl}$muridGame';
      case 'murid_kuest':
        return '${AppConstants.baseUrl}$muridKuest';
      case 'murid_premium':
        return '${AppConstants.baseUrl}$muridPremium';
      case 'murid_profile':
        return '${AppConstants.baseUrl}$muridProfile';

      // Admin / Founder
      case 'admin_home':
        return '${AppConstants.baseUrl}$adminHome';
      case 'founder_admin':
        return '${AppConstants.baseUrl}$adminFounder';
      case 'admin_analytics':
        return '${AppConstants.baseUrl}$adminAnalytics';
      case 'admin_users':
        return '${AppConstants.baseUrl}$adminUsers';
      case 'admin_payments':
        return '${AppConstants.baseUrl}$adminPayments';
      case 'admin_premium':
        return '${AppConstants.baseUrl}$adminPremium';
      case 'admin_pengaturan':
        return '${AppConstants.baseUrl}$adminPengaturan';

      default:
        return AppConstants.baseUrl;
    }
  }

  static String _dashboardForRole(String? role) {
    final r = role?.toUpperCase() ?? '';
    if (r == 'FOUNDER' || r == 'GURU') return '${AppConstants.baseUrl}$guruBeranda';
    switch (r) {
      case AppConstants.roleMurid:
        return '${AppConstants.baseUrl}$muridBeranda';
      case AppConstants.roleAdmin:
        return '${AppConstants.baseUrl}$adminHome';
      case AppConstants.roleUmum:
        return '${AppConstants.baseUrl}${AppConstants.umumHome}';
      default:
        return '${AppConstants.baseUrl}${AppConstants.loginPath}';
    }
  }
}
