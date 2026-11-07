import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/features/webview/android_breadcrumb_policy.dart';

void main() {
  test('suppression is scoped to BahasaCerdas HTTPS domains', () {
    expect(
      AndroidBreadcrumbPolicy.appliesTo('https://www.bahasacerdas.com/faq'),
      isTrue,
    );
    expect(
      AndroidBreadcrumbPolicy.appliesTo(
        'https://www.bahasacerdas.com/marketplace',
      ),
      isTrue,
    );
    expect(
      AndroidBreadcrumbPolicy.appliesTo('https://www.bahasacerdas.com/tentang'),
      isTrue,
    );
    expect(
      AndroidBreadcrumbPolicy.appliesTo(
        'https://www.bahasacerdas.com/guru/beranda',
      ),
      isTrue,
    );
    expect(
      AndroidBreadcrumbPolicy.appliesTo('https://bahasacerdas.com/login'),
      isTrue,
    );
    expect(
      AndroidBreadcrumbPolicy.appliesTo('https://fakebahasacerdas.com/faq'),
      isFalse,
    );
    expect(
      AndroidBreadcrumbPolicy.appliesTo(
        'https://bcbookstudio.bahasacerdas.com/',
      ),
      isFalse,
    );
    expect(
      AndroidBreadcrumbPolicy.appliesTo('http://www.bahasacerdas.com/faq'),
      isFalse,
    );
  });

  test('script targets only injected hosts and watches SPA updates', () {
    final script = AndroidBreadcrumbPolicy.suppressionScript;
    expect(script, contains('data-breadcrumb-host'));
    expect(script, contains('MutationObserver'));
    expect(script, contains('removeHosts'));
    expect(script, isNot(contains('document.querySelectorAll("nav")')));
  });
}
