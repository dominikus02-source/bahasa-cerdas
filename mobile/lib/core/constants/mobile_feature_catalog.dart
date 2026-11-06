/// Mobile discovery catalog only. Server-side RBAC, subscriptions and
/// feature flags remain authoritative; a visible tile never grants access.
enum MobileAudience { murid, guru, umum }

class MobileFeature {
  const MobileFeature(this.id, this.label, this.path, {this.note});
  final String id;
  final String label;
  final String path;
  final String? note;
}

class MobileFeatureCatalog {
  MobileFeatureCatalog._();

  /// Shared highlights: no backend duplication and no new permissions.
  static const shared = <MobileFeature>[
    MobileFeature('jumpa', 'JUMPA', '/jumpa'),
    MobileFeature('nara', 'NARA', '/arena/ai'),
    MobileFeature('karya', 'KARYA', '/murid/karya',
        note: 'Destination differs by role; resolve via server routes'),
    MobileFeature('aksara', 'AKSARA', '/artikel'),
    MobileFeature('gim', 'GIM', '/arena',
        note: 'Select role-allowed games in the destination'),
    MobileFeature('aku-sastrawan', 'AKU SASTRAWAN', '/aku-sastrawan',
        note: 'Premium entitlement checked by server'),
    MobileFeature('bermain-bersama', 'BERMAIN BERSAMA', '/main-bersama',
        note: 'Umum route marked dev; Guru route differs'),
  ];

  static const byAudience = <MobileAudience, List<MobileFeature>>{
    MobileAudience.murid: [
      MobileFeature('belajar', 'Belajar', '/murid/belajar'),
      MobileFeature('arena', 'ARENA', '/arena'),
      MobileFeature('simulasi', 'Simulasi', '/murid/simulasi'),
      MobileFeature('profil', 'Profil', '/murid/profile'),
    ],
    MobileAudience.guru: [
      MobileFeature('kelasku', 'Kelasku', '/guru/kelasku'),
      MobileFeature('evaluasi', 'Evaluasi', '/guru/evaluasi-simulasi'),
      MobileFeature('alat-ajar', 'Alat Ajar', '/guru/perangkat-ajar'),
      MobileFeature('arena', 'ARENA', '/arena'),
    ],
    MobileAudience.umum: [
      MobileFeature('jelajahi', 'Jelajahi', '/umum#produk'),
      MobileFeature('koleksi', 'Koleksi', '/umum/koleksi'),
      MobileFeature('akun', 'Akun', '/umum/pengaturan'),
    ],
  };

  /// Explicit destinations verified against repository navigation.
  /// Avoid using these for shared tiles whose route varies by role.
  static String? destination(String id, MobileAudience audience) {
    if (id == 'karya') {
      return audience == MobileAudience.murid ? '/murid/karya' : null;
    }
    if (id == 'bermain-bersama') {
      return audience == MobileAudience.guru
          ? '/guru/game/main-bersama'
          : null;
    }
    for (final feature in shared) {
      if (feature.id == id) return feature.path;
    }
    for (final feature in byAudience[audience] ?? const <MobileFeature>[]) {
      if (feature.id == id) return feature.path;
    }
    return null;
  }
}
