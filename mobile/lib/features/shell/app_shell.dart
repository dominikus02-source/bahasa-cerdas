import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_routes.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/legal_links.dart';
import '../webview/webview_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;
  String? _role;

  bool get _isFounder => _role?.toUpperCase() == 'FOUNDER';
  bool get _isAdmin => _role?.toUpperCase() == AppConstants.roleAdmin;

  List<_NavItem> get _pages {
    if (_role == null) {
      return const [
        _NavItem('Beranda', Icons.home_outlined, Icons.home, AppRoutes.landing),
        _NavItem('Masuk', Icons.login_outlined, Icons.login, AppRoutes.login),
        _NavItem('Daftar', Icons.person_add_outlined, Icons.person_add, AppRoutes.signup),
      ];
    }

    final r = _role!.toUpperCase();

    if (_isFounder) {
      return const [
        _NavItem('Beranda', Icons.home_outlined, Icons.home, AppRoutes.dashboard),
        _NavItem('AI Tools', Icons.auto_awesome_outlined, Icons.auto_awesome, 'guru_ai'),
        _NavItem('Admin', Icons.admin_panel_settings_outlined, Icons.admin_panel_settings, 'founder_admin'),
        _NavItem('Akun', Icons.account_circle_outlined, Icons.account_circle, AppRoutes.dashboard),
      ];
    }

    switch (r) {
      case AppConstants.roleGuru:
        return const [
          _NavItem('Beranda', Icons.home_outlined, Icons.home, AppRoutes.dashboard),
          _NavItem('AI Tools', Icons.auto_awesome_outlined, Icons.auto_awesome, 'guru_ai'),
          _NavItem('Komunitas', Icons.groups_outlined, Icons.groups, 'guru_komunitas'),
          _NavItem('Akun', Icons.account_circle_outlined, Icons.account_circle, AppRoutes.dashboard),
        ];
      case AppConstants.roleMurid:
        return const [
          _NavItem('Beranda', Icons.home_outlined, Icons.home, AppRoutes.dashboard),
          _NavItem('Belajar', Icons.menu_book_outlined, Icons.menu_book, 'murid_belajar'),
          _NavItem('Kelas', Icons.groups_outlined, Icons.groups, 'murid_kelasku'),
          _NavItem('Akun', Icons.account_circle_outlined, Icons.account_circle, 'murid_profile'),
        ];
      case AppConstants.roleAdmin:
        return const [
          _NavItem('Dashboard', Icons.dashboard_outlined, Icons.dashboard, 'admin_home'),
          _NavItem('Analytics', Icons.analytics_outlined, Icons.analytics, 'admin_analytics'),
          _NavItem('Pengguna', Icons.people_outlined, Icons.people, 'admin_users'),
          _NavItem('Akun', Icons.account_circle_outlined, Icons.account_circle, AppRoutes.dashboard),
        ];
      default:
        return const [
          _NavItem('Beranda', Icons.home_outlined, Icons.home, AppRoutes.dashboard),
          _NavItem('Akun', Icons.account_circle_outlined, Icons.account_circle, AppRoutes.dashboard),
        ];
    }
  }

  void _onRoleDetected(String? role) {
    if (role != null && role != _role) {
      setState(() {
        _role = role;
        _index = 0;
      });
    }
  }

  Future<void> _logout() async {
    setState(() {
      _role = null;
      _index = 1;
    });
  }

  Future<void> _openLegal(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openRoute(String routeKey, int tabIndex) {
    Navigator.pop(context);
    setState(() => _index = tabIndex);
  }

  @override
  Widget build(BuildContext context) {
    final pages = _pages;
    if (_index >= pages.length) _index = 0;

    final current = pages[_index];
    final url = AppRoutes.webPathForRoute(current.route, role: _role);

    return Scaffold(
      body: WebViewScreen(
        initialUrl: url,
        key: ValueKey('${url}_$_role'),
        onRoleDetected: _onRoleDetected,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: pages
            .map((p) => NavigationDestination(
                  icon: Icon(p.icon),
                  selectedIcon: Icon(p.selectedIcon),
                  label: p.label,
                ))
            .toList(),
      ),
      endDrawer: _buildDrawer(),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              _role == null ? 'BahasaCerdas' : 'Halo, $_role',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 24),

            // FOUNDER
            if (_isFounder) ...[
              const Text('Founder', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.amber)),
              ListTile(leading: const Icon(Icons.admin_panel_settings), title: const Text('Kelola Founder'), onTap: () => _openRoute('founder_admin', 2)),
              ListTile(leading: const Icon(Icons.dashboard), title: const Text('Admin Dashboard'), onTap: () => _openRoute('admin_home', 0)),
              const Divider(),
              const Text('Guru', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.grey)),
              ListTile(leading: const Icon(Icons.auto_awesome), title: const Text('AI Tools'), onTap: () => _openRoute('guru_ai', 1)),
              ListTile(leading: const Icon(Icons.groups), title: const Text('Komunitas'), onTap: () => _openRoute('guru_komunitas', 0)),
            ],

            // ADMIN
            if (_isAdmin) ...[
              const Text('Admin', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.blue)),
              ListTile(leading: const Icon(Icons.dashboard), title: const Text('Dashboard'), onTap: () => _openRoute('admin_home', 0)),
              ListTile(leading: const Icon(Icons.analytics), title: const Text('Analytics'), onTap: () => _openRoute('admin_analytics', 1)),
              ListTile(leading: const Icon(Icons.people), title: const Text('Pengguna'), onTap: () => _openRoute('admin_users', 2)),
              ListTile(leading: const Icon(Icons.payments), title: const Text('Pembayaran'), onTap: () => _openRoute('admin_payments', 0)),
              ListTile(leading: const Icon(Icons.workspace_premium), title: const Text('Premium'), onTap: () => _openRoute('admin_premium', 0)),
              ListTile(leading: const Icon(Icons.settings), title: const Text('Pengaturan'), onTap: () => _openRoute('admin_pengaturan', 0)),
            ],

            // GURU (bukan founder)
            if (_role == AppConstants.roleGuru && !_isFounder) ...[
              const Text('AI Tools', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.grey)),
              ListTile(leading: const Icon(Icons.auto_awesome), title: const Text('Semua AI Tools'), onTap: () => _openRoute('guru_ai', 1)),
              ListTile(leading: const Icon(Icons.grading), title: const Text('Grading'), onTap: () => _openRoute('guru_grading', 1)),
              ListTile(leading: const Icon(Icons.spellcheck), title: const Text('EYD'), onTap: () => _openRoute('guru_eyd', 1)),
              ListTile(leading: const Icon(Icons.text_fields), title: const Text('Text Analysis'), onTap: () => _openRoute('guru_text', 1)),
              const Divider(),
              ListTile(leading: const Icon(Icons.groups), title: const Text('Komunitas'), onTap: () => _openRoute('guru_komunitas', 2)),
              ListTile(leading: const Icon(Icons.workspace_premium), title: const Text('Berlangganan'), onTap: () => _openRoute('guru_berlangganan', 0)),
            ],

            // MURID
            if (_role == AppConstants.roleMurid) ...[
              const Text('Belajar', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.grey)),
              ListTile(leading: const Icon(Icons.menu_book), title: const Text('Belajar'), onTap: () => _openRoute('murid_belajar', 1)),
              ListTile(leading: const Icon(Icons.groups), title: const Text('Kelasku'), onTap: () => _openRoute('murid_kelasku', 2)),
              ListTile(leading: const Icon(Icons.trending_up), title: const Text('Progresku'), onTap: () => _openRoute('murid_progres', 0)),
              ListTile(leading: const Icon(Icons.edit), title: const Text('Karya'), onTap: () => _openRoute('murid_karya', 0)),
              ListTile(leading: const Icon(Icons.sports_esports), title: const Text('Game'), onTap: () => _openRoute('murid_game', 0)),
              ListTile(leading: const Icon(Icons.today), title: const Text('Kuest Harian'), onTap: () => _openRoute('murid_kuest', 0)),
              const Divider(),
              ListTile(leading: const Icon(Icons.workspace_premium), title: const Text('Premium'), onTap: () => _openRoute('murid_premium', 0)),
              ListTile(leading: const Icon(Icons.person), title: const Text('Profil'), onTap: () => _openRoute('murid_profile', 3)),
            ],

            const Divider(),
            ListTile(leading: const Icon(Icons.lock_reset), title: const Text('Lupa Kata Sandi'), onTap: () { Navigator.pop(context); setState(() => _index = 1); }),
            ListTile(leading: const Icon(Icons.privacy_tip_outlined), title: const Text('Kebijakan Privasi'), onTap: () => _openLegal(LegalLinks.privacy)),
            ListTile(leading: const Icon(Icons.description_outlined), title: const Text('Syarat & Ketentuan'), onTap: () => _openLegal(LegalLinks.terms)),
            const Divider(),
            if (_role != null)
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Keluar', style: TextStyle(color: Colors.red)),
                onTap: () { Navigator.pop(context); _logout(); },
              ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String route;
  const _NavItem(this.label, this.icon, this.selectedIcon, this.route);
}
