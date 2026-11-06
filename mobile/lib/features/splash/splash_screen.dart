import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onFinish;
  const SplashScreen({super.key, required this.onFinish});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 1200), widget.onFinish);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final width = MediaQuery.sizeOf(context).width;
    final logoSize = (width * 0.27).clamp(88.0, 128.0);
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: dark
                ? const [Color(0xFF0F172A), Color(0xFF312E81)]
                : const [Color(0xFFFFFFFF), Color(0xFFF3E8FF)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(),
              Semantics(
                label: 'Logo BahasaCerdas',
                child: Image.asset(
                  'assets/icons/icon-512.png',
                  width: logoSize,
                  height: logoSize,
                ),
              ),
              const SizedBox(height: 22),
              Text(
                AppConstants.appName,
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: dark ? Colors.white : const Color(0xFF1E1B4B),
                ),
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Belajar Bahasa, Mengenal Budaya, Berpikir Cerdas',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: dark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                  ),
                ),
              ),
              const Spacer(),
              const SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
