import 'package:flutter/material.dart';
import '../../core/constants/app_routes.dart';
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

  @override
  Widget build(BuildContext context) {
    final current = _pages[_index];
    final url = AppRoutes.webPathForRoute(current.route, role: _role);

    return Scaffold(
      body: WebViewScreen(initialUrl: url, key: ValueKey(url)),
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
