import 'package:flutter_test/flutter_test.dart';
import 'package:bahasa_cerdas/core/auth/oauth_pending_tracker.dart';

void main() {
  final t0 = DateTime(2026, 11, 8, 12);
  final loginUrl = Uri.parse(
      'https://www.bahasacerdas.com/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fwww.bahasacerdas.com%2Fapi%2Fauth%2Fcallback%3Fbc_app%3D1');
  final registerUrl = Uri.parse(
      'https://www.bahasacerdas.com/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fwww.bahasacerdas.com%2Fauth%2Fcallback%3Fbc_app%3D1');

  test('tanpa login tertunda → tidak ada aksi', () {
    final t = OAuthPendingTracker();
    expect(t.onResumeSettled(now: t0, offline: false), OAuthResumeAction.none);
    expect(t.feedbackUrl(OAuthResumeAction.none), isNull);
  });

  test('callback tiba sebelum jeda resume → tidak ada umpan balik', () {
    final t = OAuthPendingTracker()..start(t0, loginUrl);
    t.complete();
    expect(t.onResumeSettled(now: t0.add(const Duration(seconds: 3)), offline: false), OAuthResumeAction.none);
  });

  test('browser ditutup tanpa callback → incomplete, sekali saja', () {
    final t = OAuthPendingTracker()..start(t0, loginUrl);
    expect(t.onResumeSettled(now: t0.add(const Duration(seconds: 30)), offline: false), OAuthResumeAction.incomplete);
    expect(t.isPending, isFalse);
    expect(t.onResumeSettled(now: t0.add(const Duration(seconds: 40)), offline: false), OAuthResumeAction.none);
  });

  test('menunggu lebih dari batas → expired', () {
    final t = OAuthPendingTracker()..start(t0, loginUrl);
    expect(t.onResumeSettled(now: t0.add(const Duration(minutes: 11)), offline: false), OAuthResumeAction.expired);
  });

  test('jaringan putus → offline (didahulukan)', () {
    final t = OAuthPendingTracker()..start(t0, loginUrl);
    expect(t.onResumeSettled(now: t0.add(const Duration(minutes: 11)), offline: true), OAuthResumeAction.offline);
  });

  test('URL umpan balik: kode tetap, alur benar, tanpa kode/state OAuth', () {
    final t = OAuthPendingTracker()..start(t0, registerUrl);
    expect(t.flow, 'register');
    final url = Uri.parse(t.feedbackUrl(OAuthResumeAction.incomplete)!);
    expect(url.host, 'www.bahasacerdas.com');
    expect(url.path, '/register');
    expect(url.queryParameters, {'error': 'google_incomplete', 'bc_app': '1'});
    final login = OAuthPendingTracker()..start(t0, loginUrl);
    expect(Uri.parse(login.feedbackUrl(OAuthResumeAction.expired)!).path, '/login');
    expect(Uri.parse(login.feedbackUrl(OAuthResumeAction.offline)!).queryParameters['error'], 'google_offline');
  });
}
