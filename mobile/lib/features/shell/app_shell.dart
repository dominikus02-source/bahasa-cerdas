import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_constants.dart';
import '../webview/webview_screen.dart';

/// Native, adaptive guest experience. Web authentication remains authoritative.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  void _open(BuildContext context, String path) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => WebViewScreen(initialUrl: '${AppConstants.baseUrl}$path'),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final muted = theme.colorScheme.onSurfaceVariant;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(22, 20, 22, 40),
                  sliver: SliverList(delegate: SliverChildListDelegate([
                    Row(children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.asset('assets/icons/icon-512.png',
                          width: 44, height: 44,
                          errorBuilder: (context, error, stackTrace) => const Icon(
                            Icons.auto_stories_rounded, size: 40)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text('BahasaCerdas',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800, letterSpacing: -0.7))),
                      Tooltip(
                        message: 'Tentang BahasaCerdas',
                        child: IconButton.filledTonal(
                          onPressed: () => _open(context, ''),
                          icon: const Icon(Icons.explore_outlined),
                        ),
                      ),
                    ]),
                    const SizedBox(height: 34),
                    Container(
                      padding: const EdgeInsets.all(26),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(32),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: dark
                            ? const [Color(0xFF31215D), Color(0xFF17172E)]
                            : const [Color(0xFFECE3FF), Color(0xFFF9F6FF)]),
                        border: Border.all(color: dark
                          ? const Color(0xFF5B4784)
                          : const Color(0xFFE4D7FF)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          DecoratedBox(
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(99)),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 13, vertical: 8),
                              child: Row(mainAxisSize: MainAxisSize.min, children: [
                                Icon(Icons.auto_awesome_rounded, size: 16,
                                  color: theme.colorScheme.primary),
                                const SizedBox(width: 7),
                                Text('EKOSISTEM BELAJAR INDONESIA',
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.6,
                                    color: theme.colorScheme.primary)),
                              ]),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text('Bahasa yang\nmembuka dunia.',
                            style: theme.textTheme.headlineLarge?.copyWith(
                              fontWeight: FontWeight.w900,
                              letterSpacing: -1.5,
                              height: 1.13)),
                          const SizedBox(height: 16),
                          Text('Belajar, mengajar, dan berkarya dalam '
                            'satu pengalaman yang lebih cerdas.',
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: muted, height: 1.55)),
                          const SizedBox(height: 24),
                          Row(children: [
                            Icon(Icons.verified_rounded, size: 18,
                              color: theme.colorScheme.primary),
                            const SizedBox(width: 8),
                            Expanded(child: Text('Dibuat untuk guru dan murid Indonesia',
                              style: theme.textTheme.labelMedium?.copyWith(
                                color: muted))),
                          ]),
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),
                    Text('Temukan cara belajarmu',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                    const SizedBox(height: 6),
                    Text('Semua yang kamu butuhkan, dalam satu tempat.',
                      style: theme.textTheme.bodyMedium?.copyWith(color: muted)),
                    const SizedBox(height: 18),
                    const _FeatureCard(
                      icon: Icons.menu_book_rounded,
                      title: 'Belajar lebih terarah',
                      description: 'Materi, latihan, dan progres yang jelas.',
                      tint: Color(0xFF7C3AED)),
                    const SizedBox(height: 10),
                    const _FeatureCard(
                      icon: Icons.auto_awesome_rounded,
                      title: 'NARA, teman berpikirmu',
                      description: 'Bantuan AI saat kamu membutuhkannya.',
                      tint: Color(0xFF0D9488)),
                    const SizedBox(height: 10),
                    const _FeatureCard(
                      icon: Icons.video_camera_front_rounded,
                      title: 'JUMPA, belajar bersama',
                      description: 'Ruang diskusi dan kolaborasi langsung.',
                      tint: Color(0xFF2563EB)),
                    const SizedBox(height: 28),
                    FilledButton.icon(
                      onPressed: () => _open(context, AppConstants.registerPath),
                      icon: const Icon(Icons.arrow_forward_rounded),
                      label: const Text('Mulai Gratis'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(56),
                        textStyle: const TextStyle(fontSize: 16,
                          fontWeight: FontWeight.w700),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18))),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => _open(context, AppConstants.loginPath),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(54),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18))),
                      child: const Text('Sudah punya akun? Masuk'),
                    ),
                    const SizedBox(height: 26),
                    Center(child: Text('Belajar  •  Berlatih  •  Berkarya',
                      style: theme.textTheme.labelMedium?.copyWith(color: muted))),
                  ])),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color tint;
  const _FeatureCard({required this.icon, required this.title,
    required this.description, required this.tint});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(children: [
        Container(
          width: 52, height: 52,
          decoration: BoxDecoration(
            color: tint.withValues(alpha: 0.11),
            borderRadius: BorderRadius.circular(16)),
          child: Icon(icon, size: 26, color: tint),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800)),
            const SizedBox(height: 3),
            Text(description, style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant, height: 1.35)),
          ],
        )),
      ]),
    );
  }
}
