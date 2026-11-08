import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Only camera and microphone are supported in the embedded web experience.
/// Request precisely the hardware needed for the current WebRTC request.
class MobileWebViewPermissionPolicy {
  const MobileWebViewPermissionPolicy._();

  /// Null means an empty or unsupported resource request and must be denied.
  static List<Permission>? requiredPermissions(
      Set<WebViewPermissionResourceType> types) {
    if (types.isEmpty) return null;
    const supported = {
      WebViewPermissionResourceType.camera,
      WebViewPermissionResourceType.microphone,
    };
    if (types.any((type) => !supported.contains(type))) return null;

    return [
      if (types.contains(WebViewPermissionResourceType.camera))
        Permission.camera,
      if (types.contains(WebViewPermissionResourceType.microphone))
        Permission.microphone,
    ];
  }
}
