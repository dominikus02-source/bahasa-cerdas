import 'dart:convert';

import '../constants/jumpa_room_route.dart';

/// Pesan dari halaman JUMPA ke native untuk berbagi layar.
///
/// Diterima HANYA bila halaman yang sedang terbuka adalah ruang JUMPA di
/// origin BahasaCerdas tepercaya. Token harus token LiveKit identitas-layar
/// (`sub` diawali `screen:`), dan server LiveKit harus wss di
/// *.bahasacerdas.com — native tidak pernah tersambung ke URL sembarang atau
/// memakai token peserta penuh.
class ScreenShareRequest {
  const ScreenShareRequest._(this.type, this.serverUrl, this.token);

  final String type; // 'start' | 'stop'
  final String? serverUrl;
  final String? token;

  bool get isStart => type == 'start';

  static final RegExp _jwt =
      RegExp(r'^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$');

  static ScreenShareRequest? parse(String raw, {required String? pageUrl}) {
    if (raw.length > 8192) return null;
    if (pageUrl == null || !JumpaRoomRoute.isRoomUrl(pageUrl)) return null;
    Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } on FormatException {
      return null;
    }
    if (decoded is! Map<String, dynamic> || decoded['v'] != 1) return null;
    final type = decoded['type'];
    if (type == 'stop') return const ScreenShareRequest._('stop', null, null);
    if (type != 'start') return null;
    final serverUrl = decoded['serverUrl'];
    final token = decoded['token'];
    if (serverUrl is! String || token is! String) return null;
    if (!isTrustedLivekitUrl(serverUrl) || !isScreenOnlyToken(token)) {
      return null;
    }
    return ScreenShareRequest._('start', serverUrl, token);
  }

  static bool isTrustedLivekitUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null ||
        uri.scheme != 'wss' ||
        uri.userInfo.isNotEmpty ||
        (uri.hasPort && uri.port != 443) ||
        uri.hasQuery ||
        uri.hasFragment) {
      return false;
    }
    final host = uri.host.toLowerCase();
    return host == 'bahasacerdas.com' || host.endsWith('.bahasacerdas.com');
  }

  /// Pemeriksaan pertahanan berlapis (bukan verifikasi tanda tangan; server
  /// LiveKit yang memverifikasi): token harus milik identitas layar dan tidak
  /// boleh punya izin subscribe/data/admin.
  static bool isScreenOnlyToken(String token) {
    if (token.length > 4096 || !_jwt.hasMatch(token)) return false;
    try {
      final payload = jsonDecode(
          utf8.decode(base64Url.decode(base64Url.normalize(token.split('.')[1]))));
      if (payload is! Map<String, dynamic>) return false;
      final sub = payload['sub'];
      final video = payload['video'];
      if (sub is! String || !sub.startsWith('screen:') || video is! Map) {
        return false;
      }
      return video['canSubscribe'] == false &&
          video['canPublishData'] == false &&
          video['roomAdmin'] != true &&
          video['roomRecord'] != true;
    } catch (_) {
      return false;
    }
  }
}
