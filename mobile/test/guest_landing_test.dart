import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/features/shell/app_shell.dart';

void main() {
  testWidgets('welcome is a single screen with direct login',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AppShell()));
    expect(find.text('BahasaCerdas'), findsOneWidget);
    expect(find.text('Masuk sekarang'), findsOneWidget);
    expect(find.byType(FilledButton), findsOneWidget);
    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(Drawer), findsNothing);
  });
}
