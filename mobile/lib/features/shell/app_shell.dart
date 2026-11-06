import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_routes.dart';
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

  final _pages = const [
    _NavItem('Beranda', Icons.home_outlined, Icons.home, AppRoutes.landing),
    _NavItem('Masuk', Icons.login_outlined, Icons.login, AppRoutes.login),
    _NavItem('Daftar', Icons.person_add_outlined, Icons.person_add, AppRoutes.signup),
    _NavItem('Akun', Icons.account_circle_outlined, Icons.account_circle, AppRoutes.dashboard),
  ];

  void _onRoleDetected(String? role) {
    if (role != null && role != _role) {
      setState(() => _role = role);
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

  @override
  Widget build(BuildContext context) {
    final current = _pages[_index];
    final url = AppRoutes.webPathForRoute(current.route, role: _role);

    return Scaffold(
      body: WebViewScreen(
        initialUrl: url,
        key: ValueKey(url),
        onRoleDetected: _onRoleDetected,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _pages
            .map((p) => NavigationDestination(
                  icon: Icon(p.icon),
                  selectedIcon: Icon(p.selectedIcon),
                  label: p.label,
                ))
            .toList(),
      ),
      floatingActionButton: _role != null
          ? FloatingActionButton.small(
              onPressed: _logout,
              tooltip: 'Keluar',
              child: const Icon(Icons.logout),
            )
          : null,
      endDrawer: Drawer(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('BahasaCerdas', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 24),
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
