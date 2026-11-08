import 'app_constants.dart';

/// Validates a native Android OAuth callback and reconstructs the existing
/// server-side callback on the same trusted WebView origin.
///
/// Only a PKCE authorization code is accepted, never access/refresh tokens.
/// The server authenticates it against the verifier stored in WebView cookies.
class MobileOAuthCallback {
  static String? toWebUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.length > 8192) return null;
    final uri = Uri.tryParse(rawUrl);
    if (uri == null ||
        uri.scheme != 'bahasacerdas' ||
        uri.host != 'oauth' ||
        uri.path != '/callback' ||
        uri.userInfo.isNotEmpty ||
        uri.hasPort ||
        uri.hasFragment) {
      return null;
    }
    if (uri.queryParametersAll['code']?.length != 1 ||
        uri.queryParametersAll['flow']?.length != 1) {
      return null;
    }
    final code = uri.queryParameters['code'];
    final flow = uri.queryParameters['flow'];
    if (code == null ||
        code.isEmpty ||
        code.length > 2048 ||
        code.runes.any((c) => c < 32 || c == 127) ||
        (flow != 'login' && flow != 'register')) {
      return null;
    }

    final next = uri.queryParameters['next'];
    final safeNext = next != null &&
        next.startsWith('/') &&
        !next.startsWith('//') &&
        !next.contains('\\') &&
        !next.contains(RegExp(r'[\x00-\x1f\x7f]'));
    final url = Uri.parse(AppConstants.baseUrl).replace(
      path: flow == 'register' ? '/auth/callback' : '/api/auth/callback',
      queryParameters: {
        'code': code,
        if (safeNext) 'next': next,
      },
    );
    return url.toString();
  }
}
