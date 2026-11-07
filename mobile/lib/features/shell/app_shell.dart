import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/legal_links.dart';
import '../webview/webview_screen.dart';

/// Native welcome — iOS edutech, simple, luxurious, functional.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  void _openUrl(BuildContext context, String path) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => WebViewScreen(
          initialUrl:
              '${AppConstants.baseUrl}$path${path.contains('?') ? '&' : '?'}bc_app=1',
        ),
      ),
    );
  }

  Future<void> _openExternal(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
              child: ListView(
                shrinkWrap: true,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image.asset('assets/icons/icon-512.png',
                          width: 32, height: 32),
                      const SizedBox(width: 10),
                      Text(
                        'BahasaCerdas',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.4,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(28, 36, 28, 32),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: dark
                            ? const [Color(0xFF1E1B4B), Color(0xFF312E81)]
                            : const [Color(0xFFFFFFFF), Color(0xFFF3E8FF)],
                      ),
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF7C3AED)
                              .withValues(alpha: dark ? 0.15 : 0.08),
                          blurRadius: 40,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: scheme.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(22),
                          ),
                          alignment: Alignment.center,
                          child: Icon(Icons.auto_stories_rounded,
                              size: 36, color: scheme.primary),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Bahasa Indonesia,\ndengan cara yang baru.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                height: 1.15,
                                letterSpacing: -0.7,
                                color: dark
                                    ? Colors.white
                                    : const Color(0xFF1E1B4B),
                              ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Belajar, berlatih, bermain, dan berkarya — dalam satu ruang yang tenang.',
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    height: 1.5,
                                    color: dark
                                        ? const Color(0xFFCBD5E1)
                                        : const Color(0xFF64748B),
                                  ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: () =>
                          _openUrl(context, AppConstants.loginPath),
                      child: const Text('Masuk sekarang',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      onPressed: () =>
                          _openUrl(context, AppConstants.registerPath),
                      child: const Text('Daftar gratis',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () => _openExternal(LegalLinks.privacy),
                        style: TextButton.styleFrom(
                            minimumSize: const Size(0, 36)),
                        child: const Text('Privasi'),
                      ),
                      Text('·',
                          style: TextStyle(
                              color: scheme.onSurfaceVariant
                                  .withValues(alpha: 0.6))),
                      TextButton(
                        onPressed: () => _openExternal(LegalLinks.terms),
                        style: TextButton.styleFrom(
                            minimumSize: const Size(0, 36)),
                        child: const Text('Syarat'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
