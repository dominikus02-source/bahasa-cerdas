import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import '../../core/constants/app_constants.dart';

class WebViewScreen extends StatefulWidget {
  final String? initialUrl;
  final void Function(String? role)? onRoleDetected;

  const WebViewScreen({
    super.key,
    this.initialUrl,
    this.onRoleDetected,
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
            await _detectRoleFromJs();
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

    if (_controller.platform is AndroidWebViewController) {
      final androidController = _controller.platform as AndroidWebViewController;
      androidController.setMediaPlaybackRequiresUserGesture(false);
    }
  }

  /// Deteksi role dari URL path (lebih reliable setelah login)
  void _detectRoleFromUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return;

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

    if (detectedRole != null && widget.onRoleDetected != null) {
      widget.onRoleDetected!(detectedRole);
    }
  }

  Future<void> _detectRoleFromJs() async {
    try {
      final result = await _controller.runJavaScriptReturningResult('''
        (function() {
          try {
            // Cek dropdown atau elemen yang menunjukkan role
            const roleText = document.body.innerText;
            if (roleText.includes('Founder')) return 'FOUNDER';
            if (roleText.includes('Admin')) return 'ADMIN';
            if (roleText.includes('Guru')) return 'GURU';
            if (roleText.includes('Murid')) return 'MURID';
            
            const meta = document.querySelector('meta[name="user-role"]');
            if (meta) return meta.content;
            const stored = localStorage.getItem('userRole') || localStorage.getItem('role');
            if (stored) return stored;
            return '';
          } catch(e) { return ''; }
        })()
      ''');

      final role = result.toString().replaceAll('"', '').trim().toUpperCase();
      if (role.isNotEmpty && role != 'NULL' && widget.onRoleDetected != null) {
        widget.onRoleDetected!(role);
      }
    } catch (_) {
      // Abaikan
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
