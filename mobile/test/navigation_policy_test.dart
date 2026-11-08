import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/navigation_policy.dart';

void main() {
  test('only secure official domains are embedded', () {
    expect(NavigationPolicy.isTrustedWebUrl('https://www.bahasacerdas.com/login'), true);
    expect(NavigationPolicy.isTrustedWebUrl('https://bahasacerdas.com/'), true);
    expect(NavigationPolicy.isTrustedWebUrl('http://bahasacerdas.com/'), false);
    expect(NavigationPolicy.isTrustedWebUrl('https://example.org/'), false);
    expect(NavigationPolicy.isTrustedWebUrl('https://bahasacerdas.com.example.org/'), false);
    expect(NavigationPolicy.isTrustedWebUrl('https://bahasacerdas.com:8080/'), false);
  });
}
