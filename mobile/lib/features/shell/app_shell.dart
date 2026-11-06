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

  List<_NavItem> get _pages {
    if (_role == null) {
      return const [
        _NavItem('Beranda', Icons.home_outlined, Icons.home, AppRoutes.landing),
        _NavItem('Masuk', Icons.login_outlined, Icons.login, AppRoutes.login),
        _NavItem('Daftar', Icons.person_add_outlined, Icons.person_add, AppRoutes.signup),
      ];
    }

    switch (_role!.toUpperCase()) {
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
          _NavItem('Materi', Icons.menu_book_outlined, Icons.menu_book, AppRoutes.dashboard),
          _NavItem('Akun', Icons.account_circle_outlined, Icons.account_circle, AppRoutes.dashboard),
        ];
      case AppConstants.roleAdmin:
        return const [
          _NavItem('Dashboard', Icons.dashboard_outlined, Icons.dashboard, AppRoutes.dashboard),
          _NavItem('Pengguna', Icons.people_outlined, Icons.people, AppRoutes.dashboard),
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

  void _openGuruRoute(String routeKey, int tabIndex) {
    Navigator.pop(context);
    setState(() => _index = tabIndex);
    // Force rebuild with new route
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
            if (_role == AppConstants.roleGuru) ...[
              const Text('AI Tools', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.grey)),
              ListTile(
                leading: const Icon(Icons.auto_awesome),
                title: const Text('Semua AI Tools'),
                onTap: () => _openGuruRoute('guru_ai', 1),
              ),
              ListTile(
                leading: const Icon(Icons.grading),
                title: const Text('Grading'),
                onTap: () => _openGuruRoute('guru_grading', 1),
              ),
              ListTile(
                leading: const Icon(Icons.spellcheck),
                title: const Text('EYD'),
                onTap: () => _openGuruRoute('guru_eyd', 1),
              ),
              ListTile(
                leading: const Icon(Icons.text_fields),
                title: const Text('Text Analysis'),
                onTap: () => _openGuruRoute('guru_text', 1),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.groups),
                title: const Text('Komunitas'),
                onTap: () => _openGuruRoute('guru_komunitas', 2),
              ),
              ListTile(
                leading: const Icon(Icons.workspace_premium),
                title: const Text('Berlangganan'),
                onTap: () => _openGuruRoute('guru_berlangganan', 0),
              ),
            ],
            const Divider(),
            ListTile(
              leading: const Icon(Icons.lock_reset),
              title: const Text('Lupa Kata Sandi'),
              onTap: () {
                Navigator.pop(context);
                setState(() => _index = 1);
              },
            ),
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined),
              title: const Text('Kebijakan Privasi'),
              onTap: () => _openLegal(LegalLinks.privacy),
            ),
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: const Text('Syarat & Ketentuan'),
              onTap: () => _openLegal(LegalLinks.terms),
            ),
            const Divider(),
            if (_role != null)
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Keluar', style: TextStyle(color: Colors.red)),
                onTap: () {
                  Navigator.pop(context);
                  _logout();
                },
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
