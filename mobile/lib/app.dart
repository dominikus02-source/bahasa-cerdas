import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/mobile_oauth_callback.dart';
import 'features/webview/webview_screen.dart';
import 'features/splash/splash_screen.dart';
import 'features/shell/app_shell.dart';
import 'core/theme/app_theme.dart';

class BahasaCerdasApp extends StatefulWidget {
  const BahasaCerdasApp({super.key});

  @override
  State<BahasaCerdasApp> createState() => _BahasaCerdasAppState();
}

class _BahasaCerdasAppState extends State<BahasaCerdasApp> {
  bool _showSplash = true;
  String? _initialOAuthUrl;
  static const _authChannel = MethodChannel('com.bahasacerdas.app/auth');

  @override
  void initState() {
    super.initState();
    _checkInitialOAuth();
  }

  Future<void> _checkInitialOAuth() async {
    try {
      final raw =
          await _authChannel.invokeMethod<String>('getInitialAuthCallback');
      final target = MobileOAuthCallback.toWebUrl(raw);
      if (mounted && target != null) setState(() => _initialOAuthUrl = target);
    } on MissingPluginException {
      // Non-Android platforms have no native callback bridge.
    }
  }

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
          : _initialOAuthUrl != null
              ? WebViewScreen(initialUrl: _initialOAuthUrl)
              : const AppShell(),
    );
  }
}
