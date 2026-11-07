import 'dart:developer' as developer;
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import '../../core/constants/app_constants.dart';
import 'android_breadcrumb_policy.dart';

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

  static const String _userAgent =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

  @override
  void initState() {
    super.initState();
    _setupWebView();
  }

  void _setupWebView() {
    final url = widget.initialUrl ?? AppConstants.baseUrl;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF4F5F7))
      ..enableZoom(false)
      ..setUserAgent(_userAgent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) setState(() => _progress = progress / 100);
          },
          onPageStarted: (url) {
            developer.log(
              'pageStarted path=${Uri.tryParse(url)?.path ?? "?"}',
              name: 'bc.webview',
            );
            if (mounted) {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
            }
          },
          onPageFinished: (url) async {
            developer.log(
              'pageFinished path=${Uri.tryParse(url)?.path ?? "?"}',
              name: 'bc.webview',
            );
            if (mounted) setState(() => _isLoading = false);
            _detectRoleFromUrl(url);
            if (AndroidBreadcrumbPolicy.appliesTo(url)) {
              try {
                await _controller.runJavaScript(
                  AndroidBreadcrumbPolicy.suppressionScript,
                );
              } catch (_) {
                // Navigation can replace the page before injection finishes.
              }
            }
          },
          onWebResourceError: (error) {
            final rawUrl = error.url;
            final path = (rawUrl != null && rawUrl.isNotEmpty)
                ? (Uri.tryParse(rawUrl)?.path ?? '?')
                : '?';
            developer.log(
              'resourceError code=${error.errorCode} path=$path',
              name: 'bc.webview',
            );
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

            final host = uri.host.toLowerCase();
            if (host.contains('google.com') ||
                host.contains('googleapis.com') ||
                host.contains('gstatic.com') ||
                host.contains('bahasacerdas.com') ||
                host.contains('accounts.google.com')) {
              return NavigationDecision.navigate;
            }

            if (uri.scheme != 'http' && uri.scheme != 'https') {
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(url));

    widget.onControllerReady?.call(_controller);

    if (_controller.platform is AndroidWebViewController) {
      final androidController =
          _controller.platform as AndroidWebViewController;
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setOnPlatformPermissionRequest((request) {
        request.grant();
      });
    }
  }

  void _detectRoleFromUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return;

    final path = uri.path.toLowerCase();

    const publicAuthPaths = {
      '/login',
      '/arena/login',
      '/register',
      '/signup',
      '/auth/callback',
      '/onboarding',
      '/verify-email',
      '/reset-password',
    };
    if (path == '/' ||
        publicAuthPaths.contains(path) ||
        path.startsWith('/login')) {
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
    if (path.contains('/founder')) {
      detectedRole = 'FOUNDER';
    }

    if (detectedRole != null) {
      widget.onRoleDetected?.call(detectedRole);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                  color: const Color(0xFFB91C1C),
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
