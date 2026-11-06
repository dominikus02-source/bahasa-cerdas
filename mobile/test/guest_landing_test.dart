import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/theme/app_theme.dart';
import 'package:bahasa_cerdas/features/shell/app_shell.dart';

void main() {
  testWidgets('native guest landing has one navigation shell', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.light,
      home: const AppShell(),
    ));
    expect(find.text('BahasaCerdas'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Mulai Gratis'), 300);
    expect(find.text('Mulai Gratis'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Sudah punya akun? Masuk'), 180);
    expect(find.text('Sudah punya akun? Masuk'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(AppBar), findsNothing);
  });
}
