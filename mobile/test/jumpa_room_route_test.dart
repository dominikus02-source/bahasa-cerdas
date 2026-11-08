import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/jumpa_room_route.dart';

void main() {
  test('only real JUMPA room pages enable PiP', () {
    expect(
        JumpaRoomRoute.isRoomUrl(
            'https://www.bahasacerdas.com/jumpa/num-kr24-5dd'),
        isTrue);
    expect(
        JumpaRoomRoute.isRoomUrl(
            'https://www.bahasacerdas.com/jumpa/s2c-mznf?u=invite'),
        isTrue);
    for (final path in [
      'jumpa',
      'jumpa/jadwal',
      'jumpa/riwayat',
      'jumpa/pantau',
      'jumpa/login',
      'jumpa/num-kr24-5dd/setting'
    ]) {
      expect(JumpaRoomRoute.isRoomUrl('https://www.bahasacerdas.com/$path'),
          isFalse,
          reason: path);
    }
    expect(
        JumpaRoomRoute.isRoomUrl(
            'https://www.bahasacerdas.com.evil.com/jumpa/num-kr24-5dd'),
        isFalse);
  });
}
