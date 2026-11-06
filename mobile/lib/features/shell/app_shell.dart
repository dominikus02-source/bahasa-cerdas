import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../webview/webview_screen.dart';

/// A single-screen native welcome; authenticated pages retain the PWA UI.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  void _openLogin(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const WebViewScreen(
          initialUrl: '${AppConstants.baseUrl}${AppConstants.loginPath}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image.asset('assets/icons/icon-512.png',
                          width: 38, height: 38),
                      const SizedBox(width: 10),
                      Text('BahasaCerdas',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.6)),
                    ],
                  ),
                  const Spacer(flex: 2),
                  Container(
                    width: 112,
                    height: 112,
                    decoration: BoxDecoration(
                      color: scheme.primaryContainer,
                      borderRadius: BorderRadius.circular(32),
                    ),
                    alignment: Alignment.center,
                    child: Icon(Icons.auto_stories_rounded,
                        size: 54, color: scheme.primary),
                  ),
                  const SizedBox(height: 34),
                  Text(
                    'Belajar lebih mudah.\nBerkembang lebih jauh.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                          letterSpacing: -0.8,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Satu ruang belajar untuk murid, guru, dan siapa saja yang ingin terus bertumbuh.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          height: 1.55,
                          color: dark ? scheme.onSurfaceVariant : const Color(0xFF64748B),
                        ),
                  ),
                  const Spacer(flex: 3),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: () => _openLogin(context),
                      style: FilledButton.styleFrom(
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18)),
                      ),
                      child: const Text('Masuk sekarang',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Aman • Nyaman • Terhubung',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant)),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
