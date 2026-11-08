/// Konstanta aplikasi BahasaCerdas Mobile
class AppConstants {
  static const String appName = 'BahasaCerdas';
  static const String baseUrl = 'https://www.bahasacerdas.com';

  // Path sesuai RBAC di website (lib/auth/roles.ts)
  static const String muridHome = '/murid/beranda';
  static const String guruHome = '/guru/beranda';
  static const String adminHome = '/admin';
  static const String umumHome = '/umum';
  static const String loginPath = '/login';
  static const String registerPath = '/register';
  // Password recovery is an action on the canonical /login page.
  // /auth/lupa-sandi has no Next.js page and previously caused a 404.
  static const String forgotPath = '/login';
  static const String logoutPath = '/auth/logout';
  static const String deniedPath = '/auth/akses-ditolak';

  // Role (sinkron dengan enum Role di Prisma)
  static const String roleMurid = 'MURID';
  static const String roleGuru = 'GURU';
  static const String roleAdmin = 'ADMIN';
  static const String roleUmum = 'UMUM';
}
