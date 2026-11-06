import 'package:flutter/material.dart';
import 'features/splash/splash_screen.dart';
import 'features/webview/webview_screen.dart';
import 'core/theme/app_theme.dart';

class BahasaCerdasApp extends StatefulWidget {
  const BahasaCerdasApp({super.key});

  @override
  State<BahasaCerdasApp> createState() => _BahasaCerdasAppState();
}

class _BahasaCerdasAppState extends State<BahasaCerdasApp> {
  bool _showSplash = true;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BahasaCerdas',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      home: _showSplash
          ? SplashScreen(onFinish: () => setState(() => _showSplash = false))
          : const WebViewScreen(),
    );
  }
}
