import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/mobile_oauth_callback.dart';

void main() {
  group('Android OAuth callback', () {
    test('routes one-time login code to the WebView PKCE callback', () {
      expect(
        MobileOAuthCallback.toWebUrl(
          'bahasacerdas://oauth/callback?code=once-123&flow=login',
        ),
        'https://www.bahasacerdas.com/api/auth/callback?code=once-123',
      );
    });

    test('register route preserves safe next without changing role intent', () {
      expect(
        MobileOAuthCallback.toWebUrl(
          'bahasacerdas://oauth/callback?code=abc&flow=register&next=%2Fjumpa%2Froom-123',
        ),
        'https://www.bahasacerdas.com/auth/callback?code=abc&next=%2Fjumpa%2Froom-123',
      );
    });

    test('rejects arbitrary intent, duplicate codes and tokens', () {
      for (final candidate in [
        'https://evil.example/oauth/callback?code=123&flow=login',
        'bahasacerdas://wrong/callback?code=123&flow=login',
        'bahasacerdas://oauth/not-callback?code=123&flow=login',
        'bahasacerdas://oauth/callback?code=a&code=b&flow=login',
        'bahasacerdas://oauth/callback?access_token=secret&flow=login',
        'bahasacerdas://oauth/callback?code=abc&flow=unknown',
        'bahasacerdas://oauth/callback?code=abc&flow=login#fragment',
      ]) {
        expect(MobileOAuthCallback.toWebUrl(candidate), isNull,
            reason: candidate);
      }
    });

    test('drops unsafe external next destination', () {
      expect(
        MobileOAuthCallback.toWebUrl(
          'bahasacerdas://oauth/callback?code=abc&flow=login&next=https%3A%2F%2Fevil.example',
        ),
        'https://www.bahasacerdas.com/api/auth/callback?code=abc',
      );
    });
  });
}
