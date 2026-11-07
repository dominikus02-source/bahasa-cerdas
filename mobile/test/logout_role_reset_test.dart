import 'package:flutter_test/flutter_test.dart';

/// Mirrors the public-path clear logic used in WebViewScreen._detectRoleFromUrl.
/// Role must be cleared when the WebView lands on login/signup/landing.
bool shouldClearRole(String path) {
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
  final p = path.toLowerCase();
  return p == '/' || publicAuthPaths.contains(p) || p.startsWith('/login');
}

void main() {
  group('logout / role reset regression', () {
    test('clears role on /login', () {
      expect(shouldClearRole('/login'), isTrue);
    });

    test('clears role on /register', () {
      expect(shouldClearRole('/register'), isTrue);
    });

    test('clears role on landing', () {
      expect(shouldClearRole('/'), isTrue);
    });

    test('does not clear role on /guru/beranda', () {
      expect(shouldClearRole('/guru/beranda'), isFalse);
    });

    test('does not clear role on /murid/beranda', () {
      expect(shouldClearRole('/murid/beranda'), isFalse);
    });

    test('does not clear role on /admin', () {
      expect(shouldClearRole('/admin'), isFalse);
    });
  });
}
