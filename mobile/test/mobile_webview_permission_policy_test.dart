import 'package:bahasa_cerdas/core/constants/mobile_webview_permission_policy.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  test('Microphone-only requests never require camera', () {
    final required = MobileWebViewPermissionPolicy.requiredPermissions({
      WebViewPermissionResourceType.microphone,
    });
    expect(required, [Permission.microphone]);
  });

  test('Camera-only requests never require microphone', () {
    final required = MobileWebViewPermissionPolicy.requiredPermissions({
      WebViewPermissionResourceType.camera,
    });
    expect(required, [Permission.camera]);
  });

  test('Calls requesting video and audio require both permissions', () {
    final required = MobileWebViewPermissionPolicy.requiredPermissions({
      WebViewPermissionResourceType.camera,
      WebViewPermissionResourceType.microphone,
    });
    expect(required, [Permission.camera, Permission.microphone]);
  });

  test('Empty and unsupported permission sets are denied', () {
    expect(MobileWebViewPermissionPolicy.requiredPermissions({}), isNull);
    expect(
      MobileWebViewPermissionPolicy.requiredPermissions({
        WebViewPermissionResourceType.camera,
        const UnrecognizedWebViewPermissionResourceType(),
      }),
      isNull,
    );
  });
}

class UnrecognizedWebViewPermissionResourceType
    extends WebViewPermissionResourceType {
  const UnrecognizedWebViewPermissionResourceType()
      : super('unsupported-resource');
}
