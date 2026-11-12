import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/navigation_policy.dart';

void main() {
  test('trusted HTTPS BahasaCerdas hosts are allowed', () {
    expect(NavigationPolicy.isTrustedWebUrl('https://bahasacerdas.com/'), isTrue);
    expect(NavigationPolicy.isTrustedWebUrl('https://www.bahasacerdas.com/murid'), isTrue);
    expect(NavigationPolicy.isTrustedWebUrl('https://preview.bahasacerdas.com/guru'), isTrue);
    expect(NavigationPolicy.isTrustedWebUrl('https://bahasacerdas.com:443/umum'), isTrue);
  });

  test('untrusted and spoofed destinations are blocked', () {
    for (final url in <String>[
      'http://bahasacerdas.com',
      'https://bahasacerdas.com.evil.example/login',
      'https://fakebahasacerdas.com',
      'https://bahasacerdas.com@evil.example/',
      'https://user:password@bahasacerdas.com/',
      'https://bahasacerdas.com:8443/',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'intent://open',
      'not a url',
    ]) {
      expect(NavigationPolicy.isTrustedWebUrl(url), isFalse, reason: url);
    }
  });
}
