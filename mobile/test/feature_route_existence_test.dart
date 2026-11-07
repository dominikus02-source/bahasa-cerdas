import 'dart:io';

import 'package:bahasa_cerdas/core/constants/mobile_feature_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('every mobile launcher destination resolves to a Next.js page', () {
    final repository = Directory.current.parent;
    final app = Directory('${repository.path}/app');
    expect(app.existsSync(), isTrue,
        reason: 'Run this regression test from the mobile folder in the repository');

    final pages = app
        .listSync(recursive: true, followLinks: false)
        .whereType<File>()
        .where((file) => file.path.replaceAll('\\', '/').endsWith('/page.tsx'))
        .map((file) => file.path.replaceAll('\\', '/'))
        .toList();

    for (final audience in MobileAudience.values) {
      final features = <MobileFeature>[
        ...MobileFeatureCatalog.shared,
        ...MobileFeatureCatalog.byAudience[audience] ?? <MobileFeature>[],
      ];
      for (final feature in features) {
        final destination = MobileFeatureCatalog.destination(feature.id, audience);
        if (destination == null) continue;
        final route = destination.split('#').first.split('?').first;
        final segments = route.split('/').where((part) => part.isNotEmpty).toList();
        final suffix = '${segments.join('/')}/page.tsx';
        expect(
          pages.any((page) => page.endsWith('/$suffix')),
          isTrue,
          reason: '${audience.name}/${feature.id} points to a missing route: $destination',
        );
      }
    }
  });
}
