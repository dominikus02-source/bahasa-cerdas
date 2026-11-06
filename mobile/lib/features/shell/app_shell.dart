import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../webview/webview_screen.dart';

/// Single-navigation mobile shell. The responsive web application owns its
/// header, menu, login and RBAC-controlled destinations. Duplicating those
/// controls in Flutter caused two headers, two menus and clipped content.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: WebViewScreen(initialUrl: AppConstants.baseUrl),
    );
  }
}
