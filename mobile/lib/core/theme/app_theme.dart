import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(0xFFB91C1C); // danger / red accent from web
  static const Color accent = Color(0xFF059669);  // teal
  static const Color violet = Color(0xFF7C3AED);
  static const Color navy = Color(0xFF0B3A75);

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.light,
        ),
        fontFamily: 'Inter',
        scaffoldBackgroundColor: const Color(0xFFF4F5F7),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF16181D),
          elevation: 0,
          centerTitle: false,
        ),
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.dark,
        ),
        fontFamily: 'Inter',
        scaffoldBackgroundColor: const Color(0xFF0F1117),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF171A22),
          foregroundColor: Color(0xFFF1F2F6),
          elevation: 0,
        ),
      );
}
