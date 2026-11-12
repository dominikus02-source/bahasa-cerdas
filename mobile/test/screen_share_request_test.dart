import 'dart:convert';

import 'package:bahasa_cerdas/core/screen_share/screen_share_request.dart';
import 'package:flutter_test/flutter_test.dart';

String _b64(Object o) =>
    base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');

String _token({
  String sub = 'screen:user_123',
  bool canSubscribe = false,
  bool canPublishData = false,
  bool roomAdmin = false,
}) =>
    '${_b64({'alg': 'HS256'})}.${_b64({
          'sub': sub,
          'video': {
            'canSubscribe': canSubscribe,
            'canPublishData': canPublishData,
            'roomAdmin': roomAdmin,
          },
        })}.sig';

const _room = 'https://www.bahasacerdas.com/jumpa/abc-defg-hjk';

String _start({String url = 'wss://jumpa.bahasacerdas.com', String? token}) =>
    jsonEncode({'v': 1, 'type': 'start', 'serverUrl': url, 'token': token ?? _token()});

void main() {
  test('menerima start dari ruang JUMPA tepercaya dengan token identitas layar', () {
    final r = ScreenShareRequest.parse(_start(), pageUrl: _room);
    expect(r, isNotNull);
    expect(r!.isStart, isTrue);
    expect(r.serverUrl, 'wss://jumpa.bahasacerdas.com');
  });

  test('stop selalu diterima dari ruang JUMPA', () {
    final r = ScreenShareRequest.parse('{"v":1,"type":"stop"}', pageUrl: _room);
    expect(r?.isStart, isFalse);
  });

  test('menolak halaman bukan ruang JUMPA atau origin asing', () {
    for (final page in [
      null,
      'https://www.bahasacerdas.com/guru/beranda',
      'https://evil.example/jumpa/abc-defg-hjk',
      'http://www.bahasacerdas.com/jumpa/abc-defg-hjk',
    ]) {
      expect(ScreenShareRequest.parse(_start(), pageUrl: page), isNull, reason: '$page');
      expect(ScreenShareRequest.parse('{"v":1,"type":"stop"}', pageUrl: page), isNull);
    }
  });

  test('menolak server LiveKit di luar wss *.bahasacerdas.com', () {
    for (final url in [
      'ws://jumpa.bahasacerdas.com',
      'wss://evil.example',
      'wss://bahasacerdas.com.evil.example',
      'wss://user@jumpa.bahasacerdas.com',
      'wss://jumpa.bahasacerdas.com:8443',
      'wss://jumpa.bahasacerdas.com?x=1',
    ]) {
      expect(ScreenShareRequest.parse(_start(url: url), pageUrl: _room), isNull, reason: url);
    }
  });

  test('menolak token peserta penuh / berizin lebih', () {
    for (final t in [
      _token(sub: 'user_123'),
      _token(canSubscribe: true),
      _token(canPublishData: true),
      _token(roomAdmin: true),
      'not-a-jwt',
      'a.b',
    ]) {
      expect(ScreenShareRequest.parse(_start(token: t), pageUrl: _room), isNull, reason: t);
    }
  });

  test('menolak pesan rusak, versi lain, atau terlalu besar', () {
    for (final raw in [
      'x',
      '[]',
      '{"v":2,"type":"stop"}',
      '{"v":1,"type":"launch"}',
      '{"v":1,"type":"start"}',
      'a' * 9000,
    ]) {
      expect(ScreenShareRequest.parse(raw, pageUrl: _room), isNull);
    }
  });
}
