import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
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
  bool _onRoleDashboard = false;
  bool _isOffline = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _gameLandscape = false;
  static const _jumpaChannel = MethodChannel('com.bahasacerdas.app/jumpa');
  bool _jumpaActive = false;

  Future<void> _updateJumpaMode(String url) async {
    final uri = Uri.tryParse(url);
    final active = uri != null &&
        NavigationPolicy.isTrustedWebUrl(url) &&
        (uri.path == '/jumpa' || uri.path.startsWith('/jumpa/'));
    if (_jumpaActive == active) return;
    _jumpaActive = active;
    try {
      await _jumpaChannel.invokeMethod<void>('setJumpaActive', {'active': active});
    } on MissingPluginException {
      // Supported on Android only.
    }
  }


  // Orientation is opt-in per game, never forced by a broad route prefix.
  // Supported game URLs can request ?orientation=landscape. All other
  // screens (including JUMPA) follow the device orientation.
  Future<void> _updateOrientation(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || !NavigationPolicy.isTrustedWebUrl(url)) return;
    final path = uri.path.toLowerCase();
    final isPlayableGame = path.startsWith('/arena/game/') ||
        path.startsWith('/guru/game/') ||
        path.startsWith('/murid/game/') ||
        path.startsWith('/murid/gim/');
    final wantsLandscape = isPlayableGame &&
        uri.queryParameters['orientation'] == 'landscape';
    if (wantsLandscape == _gameLandscape) return;
    _gameLandscape = wantsLandscape;
    await SystemChrome.setPreferredOrientations(wantsLandscape
        ? [DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]
        : DeviceOrientation.values);
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    _jumpaChannel.invokeMethod<void>('setJumpaActive', {'active': false})
        .catchError((Object _) {});
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }


  @override
  void initState() {
    super.initState();
    _setupWebView();
    _listenConnectivity();
  }

  Future<void> _listenConnectivity() async {
    final result = await Connectivity().checkConnectivity();
    if (mounted) setState(() => _isOffline = result.contains(ConnectivityResult.none));
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      if (!mounted) return;
      final offline = results.contains(ConnectivityResult.none);
      final recovered = _isOffline && !offline;
      setState(() {
        _isOffline = offline;
        if (recovered) _hasError = false;
      });
      if (recovered) _controller.reload();
    });
  }

  Future<void> _openFeature(MobileFeature feature) async {
    final audience = _audience;
    if (audience == null) return;
    final path = MobileFeatureCatalog.destination(feature.id, audience);
    if (path == null) return;
    await _controller.loadRequest(Uri.parse('${AppConstants.baseUrl}$path'));
  }

  IconData _featureIcon(String id) => switch (id) {
    'jumpa' => Icons.video_call_rounded,
    'nara' || 'nara-mentor' || 'alat-nara' => Icons.auto_awesome_rounded,
    'karya' || 'aku-sastrawan' => Icons.edit_note_rounded,
    'aksara' || 'belajar' => Icons.menu_book_rounded,
    'gim' || 'gim-guru' || 'bermain-bersama' => Icons.sports_esports_rounded,
    'kelasku' => Icons.groups_rounded,
    'jalur-cerdas' => Icons.route_rounded,
    'arena' => Icons.bolt_rounded,
    'simulasi' || 'evaluasi' => Icons.fact_check_rounded,
    _ => Icons.grid_view_rounded,
  };

  Widget _featureTile(MobileFeature feature, MobileAudience audience) {
    final path = MobileFeatureCatalog.destination(feature.id, audience);
    if (path == null) return const SizedBox.shrink();
    final premium = feature.note?.toLowerCase().contains('premium') ?? false;
    final colors = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: () {
            Navigator.of(context).pop();
            _openFeature(feature);
          },
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: colors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(_featureIcon(feature.id), color: colors.primary, size: 24),
                ),
                const SizedBox(height: 16),
                Text(feature.label,
                    maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: colors.onSurface, height: 1.2)),
                if (premium)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('PREMIUM', style: TextStyle(
                        fontSize: 10, letterSpacing: 0.8,
                        fontWeight: FontWeight.w800, color: colors.primary)),
                  ),
              ],
            ),
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
    ].where((feature) =>
        MobileFeatureCatalog.destination(feature.id, audience) != null).toList();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      builder: (sheetContext) => SafeArea(
        child: FractionallySizedBox(
          heightFactor: 0.88,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ruang belajarmu',
                    style: Theme.of(sheetContext).textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                const SizedBox(height: 4),
                Text('Semua fitur dalam satu tempat.',
                    style: Theme.of(sheetContext).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(sheetContext).colorScheme.onSurfaceVariant)),
                const SizedBox(height: 20),
                Expanded(
                  child: GridView.builder(
                    itemCount: features.length,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      mainAxisExtent: 148,
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

  Future<void> _goHome() async {
    final audience = _audience;
    String path = AppConstants.baseUrl;
    if (audience == MobileAudience.murid) {
      path += AppConstants.muridHome;
    } else if (audience == MobileAudience.guru) {
      path += AppConstants.guruHome;
    } else if (audience == MobileAudience.umum) {
      path += AppConstants.umumHome;
    }
    await _controller.loadRequest(Uri.parse(path));
  }

  Future<void> _goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    } else if (mounted && Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      await SystemNavigator.pop();
    }
  }

  void _setupWebView() {
    final candidate = widget.initialUrl ?? AppConstants.baseUrl;
    final url = NavigationPolicy.isTrustedWebUrl(candidate)
        ? candidate : AppConstants.baseUrl;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF8F7FC))
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
                _progress = 0;
              });
            }
          },
          onPageFinished: (url) async {
            if (mounted) setState(() => _isLoading = false);
            _detectRoleFromUrl(url);
            await _updateOrientation(url);
            await _updateJumpaMode(url);
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
            if (uri.scheme == 'mailto' || uri.scheme == 'tel') {
              launchUrl(uri, mode: LaunchMode.externalApplication);
              return NavigationDecision.prevent;
            }
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
      androidController.setOnPlatformPermissionRequest((request) async {
        final statuses = await <Permission>[
          Permission.camera,
          Permission.microphone,
        ].request();
        if (statuses.values.every((status) => status.isGranted)) {
          await request.grant();
        } else {
          await request.deny();
        }
      });
    }
  }

  static bool _isDomain(String host, String domain) =>
      host == domain || host.endsWith('.$domain');

  void _detectRoleFromUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme != 'https' ||
        !_isDomain(uri.host.toLowerCase(), 'bahasacerdas.com')) {
      return;
    }

    final path = uri.path.toLowerCase();
    final onDashboard = path == '/murid/beranda' ||
        path == '/guru/beranda' || path == '/umum' ||
        path == '/murid' || path == '/guru';
    if (mounted && _onRoleDashboard != onDashboard) {
      setState(() => _onRoleDashboard = onDashboard);
    }
    if (path == '/' || path == '/login' || path.startsWith('/login/') ||
        path == '/logout' || path.startsWith('/logout/') ||
        path.startsWith('/auth/') || path == '/register' ||
        path.startsWith('/register/') || path == '/forgot-password') {
      if (mounted && _audience != null) setState(() => _audience = null);
      widget.onRoleDetected?.call(null);
      return;
    }
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
    } else if (mounted && _audience != null) {
      setState(() => _audience = null);
      widget.onRoleDetected?.call(null);
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
        appBar: (_audience != null && !_onRoleDashboard)
            ? AppBar(
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  tooltip: 'Kembali',
                  onPressed: _goBack,
                ),
                title: const Text('BahasaCerdas'),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.home_rounded),
                    tooltip: 'Beranda',
                    onPressed: _goHome,
                  ),
                  IconButton(
                    icon: const Icon(Icons.apps_rounded),
                    tooltip: 'Fitur',
                    onPressed: _showFeatureHub,
                  ),
                ],
              )
            : null,
        body: SafeArea(
          child: Stack(
            children: [
              if (!_hasError && !_isOffline) WebViewWidget(controller: _controller),
              if (_isLoading && !_hasError && !_isOffline)
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
              if (_hasError || _isOffline)
                _OfflineView(
                  isOffline: _isOffline,
                  onRetry: () {
                    setState(() {
                      _hasError = false;
                      _isOffline = false;
                    });
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
  final bool isOffline;
  final VoidCallback onRetry;
  const _OfflineView({required this.isOffline, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 36),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isOffline ? Icons.wifi_off_rounded : Icons.cloud_off_rounded,
                  size: 48,
                  color: const Color(0xFF7C3AED),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                isOffline ? 'Tidak ada koneksi' : 'Tidak dapat terhubung',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.4),
              ),
              const SizedBox(height: 10),
              const Text(
                'Periksa koneksi internet Anda.\nSemua data dan progress tetap aman di server.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B), height: 1.45, fontSize: 15),
              ),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
