import '../constants/app_constants.dart';

/// Hasil saat aplikasi kembali aktif ketika login Google masih menunggu.
enum OAuthResumeAction { none, incomplete, expired, offline }

/// Siklus hidup login Google native (browser sistem) di aplikasi Android.
///
/// Tidak pernah menyimpan atau memutar ulang kode/state OAuth: hanya mencatat
/// bahwa browser dibuka (waktu + alur login/daftar). Bila pengguna kembali ke
/// aplikasi tanpa deep link callback (browser ditutup, state GoTrue
/// kedaluwarsa sehingga penanda bc_app hilang, atau jaringan putus), aplikasi
/// menampilkan formulir semula dengan kode error tetap — pengguna mengetuk
/// "Masuk dengan Google" lagi untuk memulai PKCE baru.
class OAuthPendingTracker {
  /// Jeda setelah resume: deep link callback biasanya tiba bersamaan.
  static const resumeGrace = Duration(seconds: 2);

  /// Batas wajar menunggu; lebih lama dari ini → state dianggap kedaluwarsa.
  static const maxPending = Duration(minutes: 10);

  DateTime? _startedAt;
  String _flow = 'login';

  bool get isPending => _startedAt != null;
  String get flow => _flow;

  /// Dipanggil tepat sebelum URL authorize dibuka di browser sistem.
  void start(DateTime now, Uri authorizeUrl) {
    _startedAt = now;
    _flow = flowFor(authorizeUrl);
  }

  /// Deep link callback (berhasil/batal/gagal) diterima: tidak menunggu lagi.
  void complete() => _startedAt = null;

  /// Dipanggil [resumeGrace] setelah aplikasi aktif kembali.
  OAuthResumeAction onResumeSettled({required DateTime now, required bool offline}) {
    final started = _startedAt;
    if (started == null) return OAuthResumeAction.none;
    _startedAt = null; // satu kali umpan balik; tidak ada percobaan otomatis
    if (offline) return OAuthResumeAction.offline;
    if (now.difference(started) > maxPending) return OAuthResumeAction.expired;
    return OAuthResumeAction.incomplete;
  }

  /// URL formulir dengan kode error tetap; null untuk [OAuthResumeAction.none].
  String? feedbackUrl(OAuthResumeAction action) {
    final code = switch (action) {
      OAuthResumeAction.none => null,
      OAuthResumeAction.incomplete => 'google_incomplete',
      OAuthResumeAction.expired => 'google_expired',
      OAuthResumeAction.offline => 'google_offline',
    };
    if (code == null) return null;
    return Uri.parse(AppConstants.baseUrl).replace(
      path: _flow == 'register' ? '/register' : '/login',
      queryParameters: {'error': code, 'bc_app': '1'},
    ).toString();
  }

  /// Alur dari redirect_to: /auth/callback = daftar, selain itu login.
  static String flowFor(Uri authorizeUrl) {
    final redirect = Uri.tryParse(authorizeUrl.queryParameters['redirect_to'] ?? '');
    return redirect?.path == '/auth/callback' ? 'register' : 'login';
  }
}
