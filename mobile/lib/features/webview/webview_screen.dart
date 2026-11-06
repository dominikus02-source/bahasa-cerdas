import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/navigation_policy.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/mobile_feature_catalog.dart';

class WebViewScreen extends StatefulWidget {
  final String? initialUrl;
  final void Function(String? role)? onRoleDetected;
  final void Function(WebViewController controller)? onControllerReady;

  const WebViewScreen({
    super.key,
    this.initialUrl,
    this.onRoleDetected,
    this.onControllerReady,
  });

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  double _progress = 0.0;
  MobileAudience? _audience;

  Future<void> _openFeature(MobileFeature feature) async {
    final audience = _audience;
    if (audience == null) return;
    final path = MobileFeatureCatalog.destination(feature.id, audience);
    if (path == null) return;
    await _controller.loadRequest(Uri.parse('${AppConstants.baseUrl}$path'));
  }

  IconData _featureIcon(String id) => switch (id) {
    'jumpa' => Icons.video_call_outlined,
    'nara' || 'nara-mentor' || 'alat-nara' => Icons.auto_awesome_outlined,
    'karya' || 'aku-sastrawan' => Icons.edit_note_outlined,
    'aksara' || 'belajar' => Icons.menu_book_outlined,
    'gim' || 'gim-guru' || 'bermain-bersama' => Icons.sports_esports_outlined,
    'kelasku' => Icons.groups_outlined,
    'jalur-cerdas' => Icons.route_outlined,
    'arena' => Icons.bolt_outlined,
    'simulasi' || 'evaluasi' => Icons.fact_check_outlined,
    _ => Icons.grid_view_rounded,
  };

  Widget _featureTile(MobileFeature feature, MobileAudience audience) {
    final enabled = MobileFeatureCatalog.destination(feature.id, audience) != null;
    final premium = feature.note?.toLowerCase().contains('premium') ?? false;
    final colors = Theme.of(context).colorScheme;
    return Material(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: enabled ? () {
          Navigator.of(context).pop();
          _openFeature(feature);
        } : null,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(_featureIcon(feature.id),
                  color: enabled ? colors.primary : colors.outline, size: 27),
              const SizedBox(height: 18),
              Text(feature.label,
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontWeight: FontWeight.w700,
                      color: enabled ? colors.onSurface : colors.outline)),
              if (premium)
                Text('PREMIUM', style: TextStyle(
                    fontSize: 10, letterSpacing: 1,
                    fontWeight: FontWeight.w800, color: colors.primary))
              else if (!enabled)
                Text('SEGERA HADIR', style: TextStyle(
                    fontSize: 10, color: colors.outline)),
            ],
          ),
        ),
      ),
    );
  }

  void _showFeatureHub() {
    final audience = _audience;
    if (audience == null) return;
    final features = <MobileFeature>[
      ...MobileFeatureCatalog.shared,
      ...?MobileFeatureCatalog.byAudience[audience],
    ];
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: FractionallySizedBox(
          heightFactor: 0.85,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 8, 22, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ruang belajarmu',
                    style: Theme.of(sheetContext).textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text('Semua fitur dalam satu tempat.',
                    style: Theme.of(sheetContext).textTheme.bodyMedium),
                const SizedBox(height: 24),
                Expanded(
                  child: GridView.builder(
                    itemCount: features.length,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2, mainAxisSpacing: 12,
                      crossAxisSpacing: 12, mainAxisExtent: 140,
                    ),
                    itemBuilder: (_, index) => _featureTile(features[index], audience),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    } else if (mounted && Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  void initState() {
    super.initState();
    _setupWebView();
  }

  void _setupWebView() {
    final candidate = widget.initialUrl ?? AppConstants.baseUrl;
    final url = NavigationPolicy.isTrustedWebUrl(candidate)
        ? candidate : AppConstants.baseUrl;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF4F5F7))
      ..enableZoom(false)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) setState(() => _progress = progress / 100);
          },
          onPageStarted: (_) {
            if (mounted) {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
            }
          },
          onPageFinished: (url) async {
            if (mounted) setState(() => _isLoading = false);
            _detectRoleFromUrl(url);
            // Role labels and localStorage are user-controlled; never infer privileges from them.
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true && mounted) {
              setState(() {
                _hasError = true;
                _isLoading = false;
              });
            }
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;

            if (NavigationPolicy.isTrustedWebUrl(request.url)) {
              return NavigationDecision.navigate;
            }
            // Never load third-party pages in the authenticated WebView.
            // OAuth must eventually use a verified native callback flow.
            if (uri.scheme == 'https' && uri.userInfo.isEmpty) {
              launchUrl(uri, mode: LaunchMode.externalApplication);
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(Uri.parse(url));

    widget.onControllerReady?.call(_controller);

    if (_controller.platform is AndroidWebViewController) {
      final androidController = _controller.platform as AndroidWebViewController;
      androidController.setMediaPlaybackRequiresUserGesture(false);
    }
  }

  static bool _isDomain(String host, String domain) =>
      host == domain || host.endsWith('.$domain');

  /// The server still enforces RBAC; the path only selects navigation chrome.
  void _detectRoleFromUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme != 'https' ||
        !_isDomain(uri.host.toLowerCase(), 'bahasacerdas.com')) {
      return;
    }

    final path = uri.path.toLowerCase();
    String? detectedRole;

    if (path.startsWith('/guru')) {
      detectedRole = 'GURU';
    } else if (path.startsWith('/murid')) {
      detectedRole = 'MURID';
    } else if (path.startsWith('/admin')) {
      detectedRole = 'ADMIN';
    } else if (path.startsWith('/umum')) {
      detectedRole = 'UMUM';
    }

    // Cek founder dari URL atau path khusus
    if (path.contains('/founder') || path.contains('founder')) {
      detectedRole = 'FOUNDER';
    }

    if (detectedRole != null) {
      final audience = switch (detectedRole) {
        'MURID' => MobileAudience.murid,
        'GURU' => MobileAudience.guru,
        'UMUM' => MobileAudience.umum,
        _ => null,
      };
      if (mounted && audience != _audience) setState(() => _audience = audience);
      widget.onRoleDetected?.call(detectedRole);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _goBack();
      },
      child: Scaffold(
      floatingActionButton: _audience == null ? null : FloatingActionButton.small(
        onPressed: _showFeatureHub,
        tooltip: 'Jelajahi fitur',
        child: const Icon(Icons.apps_rounded),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            if (!_hasError) WebViewWidget(controller: _controller),
            if (_isLoading && !_hasError)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: LinearProgressIndicator(
                  value: _progress > 0 ? _progress : null,
                  backgroundColor: Colors.transparent,
                  color: const Color(0xFF7C3AED),
                  minHeight: 3,
                ),
              ),
            if (_hasError)
              _OfflineView(
                onRetry: () {
                  setState(() => _hasError = false);
                  _controller.reload();
                },
              ),
          ],
        ),
      ),
      ),
    );
  }
}

class _OfflineView extends StatelessWidget {
  final VoidCallback onRetry;
  const _OfflineView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 72, color: Colors.grey),
              const SizedBox(height: 20),
              const Text(
                'Tidak dapat terhubung',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Periksa koneksi internet Anda.\nSemua data dan progress tetap aman di server.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, height: 1.4),
              ),
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
