import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/features/splash/splash_screen.dart';

void main() {
  testWidgets('splash displays official BahasaCerdas identity and slogan',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: SplashScreen(onFinish: () {}),
    ));
    expect(find.text('BahasaCerdas'), findsOneWidget);
    expect(
        find.text('Ekosistem pembelajaran Bahasa Indonesia'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
