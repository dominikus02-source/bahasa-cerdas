import 'navigation_policy.dart';

/// Recognizes real JUMPA room URLs only, never scheduling/history routes.
/// The new room code format is xxx-xxxx-xxx; legacy invites use xxx-xxxx.
class JumpaRoomRoute {
  static final RegExp _roomCode =
      RegExp(r'^[a-z2-9]{3}-[a-z2-9]{4}(?:-[a-z2-9]{3})?$');

  static bool isRoomUrl(String url) {
    if (!NavigationPolicy.isTrustedWebUrl(url)) return false;
    final uri = Uri.tryParse(url);
    if (uri == null) return false;
    final segments = uri.pathSegments;
    return segments.length == 2 &&
        segments.first == 'jumpa' &&
        _roomCode.hasMatch(segments.last);
  }
}
