import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../webview/webview_screen.dart';

/// After splash, open the existing BahasaCerdas website login directly.
/// The website owns accounts, session and RBAC; Android never creates users.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context) {
    return const WebViewScreen(
      initialUrl: '${AppConstants.baseUrl}${AppConstants.loginPath}?bc_app=1',
    );
  }
}
