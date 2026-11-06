import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class WebViewScreen extends StatefulWidget {
  final String initialUrl;
  final ValueChanged<String?>? onRoleDetected;
  const WebViewScreen({super.key, required this.initialUrl, this.onRoleDetected});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  double _progress = 0.0;

  @override
  void initState() {
    super.initState();
    _setupWebView();
  }

  void _setupWebView() {
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
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
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
            if (uri != null && uri.host.contains('bahasacerdas.com')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.initialUrl));
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
