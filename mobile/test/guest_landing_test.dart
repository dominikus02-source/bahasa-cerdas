import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/constants/app_constants.dart';
import 'package:bahasa_cerdas/features/shell/app_shell.dart';
import 'package:bahasa_cerdas/features/webview/webview_screen.dart';

void main() {
  testWidgets('PWA is the only navigation authority in Flutter shell',
      (tester) async {
    // Inspect the shell widget tree without mounting the platform WebView.
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    const shell = AppShell();
    final scaffold = shell.build(tester.element(find.byType(Overlay)));
    expect(scaffold, isA<Scaffold>());
    final body = (scaffold as Scaffold).body;
    expect(body, isA<WebViewScreen>());
    expect((body! as WebViewScreen).initialUrl, AppConstants.baseUrl);
    expect(scaffold.appBar, isNull);
    expect(scaffold.drawer, isNull);
    expect(scaffold.bottomNavigationBar, isNull);
  });
}
