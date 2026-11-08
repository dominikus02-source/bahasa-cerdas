import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/mobile_feature_catalog.dart';

void main() {
  test('all visible destinations use app-relative paths', () {
    for (final audience in MobileAudience.values) {
      final features = <MobileFeature>[
        ...MobileFeatureCatalog.shared,
        ...?MobileFeatureCatalog.byAudience[audience],
      ];
      for (final feature in features) {
        final destination = MobileFeatureCatalog.destination(feature.id, audience);
        if (destination == null) continue;
        expect(destination, startsWith('/'), reason: '${feature.id} for $audience');
        expect(destination, isNot(startsWith('//')));
        expect(destination, isNot(contains('://')));
      }
    }
  });

  test('role-specific shortcuts do not leak to other roles', () {
    expect(MobileFeatureCatalog.destination('karya', MobileAudience.guru), isNull);
    expect(MobileFeatureCatalog.destination('karya', MobileAudience.umum), isNull);
    expect(MobileFeatureCatalog.destination('karya', MobileAudience.murid), '/murid/karya');
    expect(MobileFeatureCatalog.destination('bermain-bersama', MobileAudience.murid), isNull);
    expect(MobileFeatureCatalog.destination('bermain-bersama', MobileAudience.guru), '/guru/game/main-bersama');
    expect(MobileFeatureCatalog.destination('nara', MobileAudience.guru), '/guru/ai-bc');
    expect(MobileFeatureCatalog.destination('gim', MobileAudience.guru), '/guru/game');
  });

  test('unknown feature never produces a navigation target', () {
    for (final audience in MobileAudience.values) {
      expect(MobileFeatureCatalog.destination('nonexistent', audience), isNull);
    }
  });
}
