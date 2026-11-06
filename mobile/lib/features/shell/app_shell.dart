import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../webview/webview_screen.dart';

/// The existing PWA owns navigation and UI. Flutter only supplies the
/// Android container; do not render a second header, drawer, or tab bar.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: WebViewScreen(initialUrl: AppConstants.baseUrl),
    );
  }
}
