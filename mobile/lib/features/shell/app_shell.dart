import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../webview/webview_screen.dart';

/// Native-first entry screen. Authentication stays with the existing server
/// until a documented mobile session/API contract is available.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  void _open(BuildContext context, String path) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => WebViewScreen(initialUrl: '${AppConstants.baseUrl}$path'),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
              sliver: SliverList(delegate: SliverChildListDelegate([
                Row(children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(Icons.auto_stories_rounded,
                        color: theme.colorScheme.primary, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Text('BahasaCerdas',
                      style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800)),
                ]),
                const SizedBox(height: 56),
                Text('Belajar bahasa,\ndengan cara baru.',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.w800, height: 1.12)),
                const SizedBox(height: 16),
                Text('Satu ruang untuk belajar, mengajar, berlatih, '
                    'dan berkarya. Dirancang untuk guru dan murid Indonesia.',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant, height: 1.5)),
                const SizedBox(height: 32),
                const _FeatureCard(
                  icon: Icons.menu_book_rounded,
                  title: 'Belajar lebih terarah',
                  description: 'Materi dan latihan sesuai perjalanan belajarmu.',
                ),
                const SizedBox(height: 12),
                const _FeatureCard(
                  icon: Icons.auto_awesome_rounded,
                  title: 'Didampingi NARA',
                  description: 'Asisten AI untuk membantu memahami materi.',
                ),
                const SizedBox(height: 12),
                const _FeatureCard(
                  icon: Icons.video_call_rounded,
                  title: 'Terhubung lewat JUMPA',
                  description: 'Belajar dan berdiskusi bersama.',
                ),
                const SizedBox(height: 36),
                FilledButton(
                  onPressed: () => _open(context, AppConstants.registerPath),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18)),
                  ),
                  child: const Text('Mulai Gratis'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => _open(context, AppConstants.loginPath),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18)),
                  ),
                  child: const Text('Sudah punya akun? Masuk'),
                ),
                const SizedBox(height: 24),
                Center(child: Text('Belajar • Berlatih • Berkarya',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ))),
              ])),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 28, color: theme.colorScheme.primary),
        const SizedBox(width: 16),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(description, style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant)),
          ],
        )),
      ]),
    );
  }
}
