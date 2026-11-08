import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../core/constants/navigation_policy.dart';
import '../../core/constants/mobile_webview_permission_policy.dart';
import '../../core/constants/jumpa_room_route.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/mobile_premium_style.dart';
import '../../core/constants/mobile_oauth_callback.dart';
import '../../core/constants/mobile_feature_catalog.dart';
import '../../core/screen_share/native_screen_share.dart';
import '../../core/screen_share/screen_share_request.dart';

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
  // Keep the authenticated role while a teacher previews student pages.
  MobileAudience? _signedInAudience;
  bool _onRoleDashboard = false;
  bool _isOffline = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _gameLandscape = false;
  static const _jumpaChannel = MethodChannel('com.bahasacerdas.app/jumpa');
  static const _authChannel = MethodChannel('com.bahasacerdas.app/auth');
  bool _jumpaActive = false;
  bool _isInPip = false;
  late final NativeScreenShare _screenShare = NativeScreenShare(_notifyScreenShare);
  static bool get _nativeScreenShareSupported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Kirim status berbagi layar ke halaman JUMPA (nilai tetap, tanpa input halaman).
  void _notifyScreenShare(String state, [String? reason]) {
    if (!mounted) return;
    final detail = jsonEncode({'state': state, if (reason != null) 'reason': reason});
    unawaited(_controller
        .runJavaScript(
            "window.dispatchEvent(new CustomEvent('bc:native-screen',{detail:$detail}));")
        .catchError((Object _) {}));
  }

  Future<void> _onScreenShareMessage(String raw) async {
    final request = ScreenShareRequest.parse(raw, pageUrl: await _controller.currentUrl());
    if (request == null) return; // halaman/isi tidak tepercaya → abaikan
    if (request.isStart) {
      await _screenShare.start(request.serverUrl!, request.token!);
    } else {
      await _screenShare.stop();
    }
  }

  Future<void> _updateJumpaMode(String url) async {
    final active = JumpaRoomRoute.isRoomUrl(url);
    // Keluar dari ruang (termasuk logout/navigasi) → hentikan berbagi layar.
    if (!active && _screenShare.isActive) unawaited(_screenShare.stop());
    if (_jumpaActive == active) return;
    _jumpaActive = active;
    try {
      await _jumpaChannel
          .invokeMethod<void>('setJumpaActive', {'active': active});
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
    final wantsLandscape =
        isPlayableGame && uri.queryParameters['orientation'] == 'landscape';
    if (wantsLandscape == _gameLandscape) return;
    _gameLandscape = wantsLandscape;
    await SystemChrome.setPreferredOrientations(wantsLandscape
        ? [DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]
        : DeviceOrientation.values);
  }

  @override
  void dispose() {
    unawaited(_screenShare.stop());
    _authChannel.setMethodCallHandler(null);
    _jumpaChannel.setMethodCallHandler(null);
    _connectivitySub?.cancel();
    _jumpaChannel.invokeMethod<void>(
        'setJumpaActive', {'active': false}).catchError((Object _) {});
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _setupWebView();
    _jumpaChannel.setMethodCallHandler((call) async {
      if (call.method == 'onPipChanged' && call.arguments is bool) {
        _isInPip = call.arguments as bool;
        if (mounted) setState(() {});
        if (_jumpaActive) {
          await _controller.runJavaScript(
            "document.documentElement.classList.toggle('bc-android-pip', $_isInPip);",
          );
        }
      }
    });
    _authChannel.setMethodCallHandler((call) async {
      if (call.method == 'onAuthCallback' && call.arguments is String) {
        await _receiveAuthCallback(call.arguments as String);
        // Clear the pending Activity intent after delivering to WebView.
        try {
          await _authChannel.invokeMethod<String>('getInitialAuthCallback');
        } on MissingPluginException {
          // Non-Android platforms do not provide an OAuth bridge.
        }
      }
    });
    unawaited(_checkPendingAuth());
    _listenConnectivity();
  }

  Future<void> _checkPendingAuth() async {
    try {
      final url =
          await _authChannel.invokeMethod<String>('getInitialAuthCallback');
      if (url != null) await _receiveAuthCallback(url);
    } on MissingPluginException {
      // Only Android has the native OAuth channel.
    }
  }

  Future<void> _receiveAuthCallback(String raw) async {
    final url = MobileOAuthCallback.toWebUrl(raw);
    if (!mounted || url == null) return;
    await _controller.loadRequest(Uri.parse(url));
  }

  Future<void> _listenConnectivity() async {
    final result = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() => _isOffline = result.contains(ConnectivityResult.none));
    }
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
        'gim' ||
        'gim-guru' ||
        'bermain-bersama' =>
          Icons.sports_esports_rounded,
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
                  child: Icon(_featureIcon(feature.id),
                      color: colors.primary, size: 24),
                ),
                const SizedBox(height: 16),
                Text(feature.label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: colors.onSurface,
                        height: 1.2)),
                if (premium)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('PREMIUM',
                        style: TextStyle(
                            fontSize: 10,
                            letterSpacing: 0.8,
                            fontWeight: FontWeight.w800,
                            color: colors.primary)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Kept for the dedicated feature launcher; no duplicate native AppBar.
  // ignore: unused_element
  void _showFeatureHub() {
    final audience = _audience;
    if (audience == null) return;
    final features = <MobileFeature>[
      ...MobileFeatureCatalog.shared,
      ...?MobileFeatureCatalog.byAudience[audience],
    ]
        .where((feature) =>
            MobileFeatureCatalog.destination(feature.id, audience) != null)
        .toList();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      builder: (sheetContext) => SafeArea(
        child: FractionallySizedBox(
          heightFactor: 0.88,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ruang belajarmu',
                    style: Theme.of(sheetContext)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(
                            fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                const SizedBox(height: 4),
                Text('Semua fitur dalam satu tempat.',
                    style: Theme.of(sheetContext)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(
                            color: Theme.of(sheetContext)
                                .colorScheme
                                .onSurfaceVariant)),
                const SizedBox(height: 12),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final columns = constraints.maxWidth >= 650
                          ? 4
                          : constraints.maxWidth >= 430
                              ? 3
                              : 2;
                      return GridView.builder(
                        itemCount: features.length,
                        padding: const EdgeInsets.only(bottom: 12),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: columns,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          mainAxisExtent: 150,
                        ),
                        itemBuilder: (_, index) =>
                            _featureTile(features[index], audience),
                      );
                    },
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
    final audience = _signedInAudience ?? _audience;
    String path = '${AppConstants.baseUrl}${AppConstants.loginPath}?bc_app=1';
    if (audience == MobileAudience.murid) {
      path = AppConstants.baseUrl;

      path += AppConstants.muridHome;
    } else if (audience == MobileAudience.guru) {
      path = '${AppConstants.baseUrl}${AppConstants.guruHome}';
    } else if (audience == MobileAudience.umum) {
      path = '${AppConstants.baseUrl}${AppConstants.umumHome}';
    }
    await _controller.loadRequest(Uri.parse(path));
  }

  Future<void> _applyMobileStyle(String url) async {
    if (!mounted || !NavigationPolicy.isTrustedWebUrl(url)) return;
    await _controller.runJavaScript(MobilePremiumStyle.javascript);
    // Student dashboard is a preview for teachers: preserve a direct way back
    // even while the website release with its own return button is pending.
    if (_signedInAudience == MobileAudience.guru &&
        Uri.tryParse(url)?.path == '/murid/beranda') {
      await _controller.runJavaScript(r"""
(() => {
  if (document.documentElement.getAttribute('data-bc-native-styles') === '1') return;
  if (document.querySelector('a[aria-label="Kembali ke dasbor guru"],#bc-app-back-to-guru')) return;
  const main = document.querySelector('main');
  if (!main) return;
  const link = document.createElement('a');
  link.id = 'bc-app-back-to-guru';
  link.href = '/guru/beranda';
  link.textContent = '← Kembali ke Dasbor Guru';
  link.setAttribute('aria-label', 'Kembali ke dasbor guru');
  link.style.cssText = 'display:inline-flex;min-height:44px;align-items:center;padding:10px 14px;margin:0 0 12px;border-radius:12px;background:#e7f4ff;color:#083d86;font-weight:700;text-decoration:none';
  main.insertBefore(link, main.firstChild);
})();
""");
    }
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
        ? candidate
        : AppConstants.baseUrl;

    final controller = WebViewController();
    if (_nativeScreenShareSupported) {
      // Kapabilitas berbagi layar native: hanya Android. APK lama/platform lain
      // tidak punya channel ini, jadi halaman tidak menampilkan tombol mati.
      // Dipasang sebelum loadRequest agar tersedia sejak halaman pertama.
      unawaited(controller.addJavaScriptChannel(
        'BahasaCerdasScreenShare',
        onMessageReceived: (message) =>
            unawaited(_onScreenShareMessage(message.message)),
      ));
    }
    _controller = controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF8F7FC))
      ..enableZoom(false)
      ..addJavaScriptChannel(
        'BahasaCerdasNavigation',
        onMessageReceived: (message) {
          if (message.message == 'features') _showFeatureHub();
          if (message.message == 'home') unawaited(_goHome());
        },
      )
      ..addJavaScriptChannel(
        'BahasaCerdasPip',
        onMessageReceived: (message) async {
          if (message.message != 'enter' || !_jumpaActive) return;
          try {
            await _jumpaChannel.invokeMethod<bool>('enterPictureInPicture');
          } on MissingPluginException {
            // Only Android exposes the native PiP action.
          }
        },
      )
      ..addJavaScriptChannel(
        'BahasaCerdasMobile',
        onMessageReceived: (message) async {
          final url = Uri.tryParse(message.message);
          if (url == null ||
              url.scheme != 'https' ||
              url.userInfo.isNotEmpty ||
              url.hasPort ||
              url.hasFragment ||
              url.path != '/auth/v1/authorize' ||
              url.queryParameters['provider'] != 'google' ||
              !(url.host.endsWith('.supabase.co') ||
                  url.host == 'bahasacerdas.com' ||
                  url.host.endsWith('.bahasacerdas.com'))) {
            return;
          }
          await launchUrl(url, mode: LaunchMode.externalApplication);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          // Next.js uses pushState/replaceState for client-side navigation.
          // onPageFinished alone can leave PiP enabled or disabled on the
          // wrong route, because SPA navigation does not reload the WebView.
          onUrlChange: (change) {
            final url = change.url;
            if (url == null) return;
            if (Uri.tryParse(url)?.path == '/' &&
                NavigationPolicy.isTrustedWebUrl(url)) {
              unawaited(_goHome());
              return;
            }
            _detectRoleFromUrl(url);
            unawaited(_updateJumpaMode(url));
            unawaited(_updateOrientation(url));
            // A Next.js route change can replace the DOM without page load.
            unawaited(Future<void>.delayed(const Duration(milliseconds: 160),
                () async {
              if (mounted) await _applyMobileStyle(url);
            }));
          },
          onProgress: (progress) {
            if (mounted) setState(() => _progress = progress / 100);
          },
          onPageStarted: (url) {
            // Disable PiP immediately when leaving a room; do not wait for load.
            _updateJumpaMode(url);
            if (mounted) {
              setState(() {
                _isLoading = true;
                _hasError = false;
                _progress = 0;
              });
            }
          },
          onPageFinished: (url) async {
            _detectRoleFromUrl(url);
            if (NavigationPolicy.isTrustedWebUrl(url)) {
              try {
                await _applyMobileStyle(url);
                if (kDebugMode) {
                  final state = await _controller.runJavaScriptReturningResult(
                    "JSON.stringify({path:location.pathname,styled:document.documentElement.classList.contains('bc-android-login'),brand:!!document.getElementById('bc-android-login-brand'),style:!!document.getElementById('bc-android-premium-style-v2')})",
                  );
                  debugPrint('BC_WEBVIEW_QA $state');
                }
              } catch (error) {
                if (kDebugMode) debugPrint('BC_WEBVIEW_STYLE_ERROR $error');
              }
            }
            if (mounted) setState(() => _isLoading = false);
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
              // The Android app must never open the long public web landing.
              // Return to a role dashboard, or the official compact login.
              if (uri.path == '/' && uri.host.endsWith('bahasacerdas.com')) {
                unawaited(_goHome());
                return NavigationDecision.prevent;
              }
              unawaited(_updateJumpaMode(request.url));
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
      final androidController =
          _controller.platform as AndroidWebViewController;
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setOnPlatformPermissionRequest((request) async {
        // Never grant unknown resource types, and never request camera when
        // the meeting only needs a microphone (or vice versa).
        final required =
            MobileWebViewPermissionPolicy.requiredPermissions(request.types);
        if (required == null) {
          await request.deny();
          return;
        }
        // Do not approve device capture for external or spoofed pages.
        final currentUrl = await _controller.currentUrl();
        if (currentUrl == null ||
            !NavigationPolicy.isTrustedWebUrl(currentUrl)) {
          await request.deny();
          return;
        }
        try {
          final statuses = await required.request();
          if (statuses.values.every((status) => status.isGranted)) {
            await request.grant();
          } else {
            await request.deny();
          }
        } catch (_) {
          await request.deny();
        }
      });
    }
  }

  static bool _isDomain(String host, String domain) =>
      host == domain || host.endsWith('.$domain');

  void _detectRoleFromUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null ||
        uri.scheme != 'https' ||
        !_isDomain(uri.host.toLowerCase(), 'bahasacerdas.com')) {
      return;
    }

    final path = uri.path.toLowerCase();
    final onDashboard = path == '/murid/beranda' ||
        path == '/guru/beranda' ||
        path == '/umum' ||
        path == '/murid' ||
        path == '/guru';
    if (mounted && _onRoleDashboard != onDashboard) {
      setState(() => _onRoleDashboard = onDashboard);
    }
    if (path == '/' ||
        path == '/login' ||
        path.startsWith('/login/') ||
        path == '/logout' ||
        path.startsWith('/logout/') ||
        path.startsWith('/auth/') ||
        path == '/register' ||
        path.startsWith('/register/') ||
        path == '/forgot-password') {
      if (mounted && (_audience != null || _signedInAudience != null)) {
        setState(() {
          _audience = null;
          _signedInAudience = null;
        });
      }
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
      if (mounted &&
          (audience != _audience ||
              (_signedInAudience == null && audience != null))) {
        setState(() {
          _audience = audience;
          _signedInAudience ??= audience;
        });
      }
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
        // The web dashboard already provides its own header and back controls.
        // A second native AppBar causes the doubled toolbar seen on Android.
        appBar: null,
        body: SafeArea(
          child: Stack(
            children: [
              if (!_hasError && !_isOffline)
                WebViewWidget(controller: _controller),
              // Keep unstyled website content hidden until the Android
              // presentation patch is applied; prevents the login page
              // briefly showing large promotional cards before hydration.
              if (_isLoading && !_hasError && !_isOffline)
                Positioned.fill(
                  child: ColoredBox(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/icons/icon-512.png',
                            width: 64,
                            height: 64,
                          ),
                          const SizedBox(height: 18),
                          Text(
                            'Memuat BahasaCerdas',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 18),
                          SizedBox(
                            width: 120,
                            child: LinearProgressIndicator(
                              value: _progress > 0 ? _progress : null,
                              color: const Color(0xFF7C3AED),
                              minHeight: 3,
                            ),
                          ),
                        ],
                      ),
                    ),
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
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SingleChildScrollView(
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
                    isOffline
                        ? Icons.wifi_off_rounded
                        : Icons.cloud_off_rounded,
                    size: 48,
                    color: const Color(0xFF7C3AED),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  isOffline ? 'Tidak ada koneksi' : 'Tidak dapat terhubung',
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Periksa koneksi internet Anda.\nSemua data dan progress tetap aman di server.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: Color(0xFF64748B), height: 1.45, fontSize: 15),
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
      ),
    );
  }
}
