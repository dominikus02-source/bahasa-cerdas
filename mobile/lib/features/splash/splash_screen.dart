import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_constants.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onFinish;
  const SplashScreen({super.key, required this.onFinish});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    Future.delayed(const Duration(milliseconds: 2000), widget.onFinish);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/icons/icon-512.png',
              width: MediaQuery.of(context).size.width * 0.28,
              height: MediaQuery.of(context).size.width * 0.28,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 28),
            Text(
              AppConstants.appName,
              style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.6,
                color: Color(0xFF16181D),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Belajar Bahasa, Mengenal Budaya, Berpikir Cerdas',
              style: TextStyle(color: Color(0xFF5B6270), fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
