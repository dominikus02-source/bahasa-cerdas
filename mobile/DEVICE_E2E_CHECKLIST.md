# BahasaCerdas Android — pengujian perangkat fisik (7 November 2026)

Status: **HOLD — belum ada perangkat terdeteksi** pada PC `DESKTOP-2NM1AUE`. `adb devices -l` tidak mengembalikan serial perangkat. APK release sudah ditandatangani dengan sertifikat bersih; gunakan APK terbaru dari branch `chore/android-play-preflight-20261107`, SHA-256 file `640707C4EF98ECCC3AA18077C0798328AB00E3FAB8F13F7570A2A95106B9B779`.

## Persiapan ponsel + USB
1. Gunakan kabel USB **data** dan colok langsung ke PC Windows (bukan charger-only atau USB hub bermasalah); buka kunci ponsel.
2. Settings > About phone > ketuk **Build number** 7 kali (nama menu tergantung vendor); aktifkan **Developer options > USB debugging**.
3. Set USB connection ke **File transfer / MTP** bila diminta. Jika muncul `Allow USB debugging?` di ponsel, pastikan fingerprint milik PC sendiri, pilih **Allow**.
4. Pada PowerShell PC:
```powershell
adb kill-server
adb start-server
adb devices -l
flutter devices
```
5. Bila `unauthorized`: buka kunci ponsel dan setujui prompt RSA; bila `offline`: cabut-pasang kabel dan restart ADB. Bila daftar kosong: ganti kabel/port; periksa Device Manager dan driver USB OEM. Jangan menjalankan `adb install` sebelum serial tampil dengan status `device`.
6. Identifikasi ponsel yang tepat:
```powershell
adb devices -l
adb -s SERIAL_PERANGKAT shell getprop ro.build.version.release
```
7. Pastikan APK menggunakan sertifikat bersih. Verifikasi lalu pasang pada ponsel uji:
```powershell
cd F:\bahasa-cerdas-android-build\mobile
Get-FileHash .\build\app\outputs\flutter-apk\app-release.apk -Algorithm SHA256
adb -s SERIAL_PERANGKAT install -r .\build\app\outputs\flutter-apk\app-release.apk
adb -s SERIAL_PERANGKAT shell monkey -p com.bahasacerdas.app -c android.intent.category.LAUNCHER 1
```
Jika perangkat mempunyai build yang ditandatangani dengan kunci berbeda, **jangan** menghapus app karena dapat kehilangan data. Backup data uji dahulu dan gunakan akun/perangkat khusus testing.

## Matriks E2E: isi PASS/FAIL + perangkat/Android versi + bukti tanpa data sensitif
- [ ] Login/logout: akun guru, murid, admin sesuai RBAC; invalid password; expired session; kembali ke aplikasi setelah background; logout benar-benar mengakhiri sesi.
- [ ] WebView: hanya HTTPS dan host yang diizinkan; URL `https://www.bahasacerdas.com` dan halaman subdomain yang sah; blokir/delegasikan `http://`, `javascript:`, `intent:`, domain tidak tepercaya; buka link eksternal di browser bila sesuai policy; cek login tidak bocor ke host lain.
- [ ] Form/upload/download: file picker; upload gambar/dokumen; izin yang muncul sesuai Android; download ke lokasi yang benar; penanganan file > batas, offline dan kegagalan jaringan.
- [ ] JUMPA: kamera/mikrofon **hanya** diminta saat fitur relevan, dan permintaan ditolak/diizinkan; tidak mengambil permission diam-diam.
- [ ] FCM: izin notifikasi Android 13+; token diperoleh pada perangkat uji; kirim pesan **uji** dari Firebase Console; notifikasi tampil di foreground/background dan tap membuka tujuan yang benar. Jangan merekam token mentah ke laporan publik.
- [ ] Crashlytics: pada build uji terkontrol, picu error non-sensitive / jalur diagnostic khusus nonpublik, pastikan laporan masuk ke Firebase Console, kemudian hapus trigger test sebelum rilis. Jangan sengaja crash pada aplikasi produksi.
- [ ] Rotasi: portrait/landscape sesuai kebijakan yang ditetapkan, tidak kehilangan isi form atau sesi; uji layar 320–1440 px bila perangkat/emulator tersedia.
- [ ] Back navigation: Android system Back dan swipe gesture kembali ke halaman sebelumnya, tidak auto-logout; konfirmasi saat meninggalkan form belum tersimpan; hanya logout jika tombol Logout benar-benar dipilih.
- [ ] Aplikasi: buka saat offline/online lagi; app resume; back-to-back login akun berbeda; aksesibilitas font besar; light/dark; notifikasi pada Android 13+.

## Evidence dan exit gate
- Minimal **1 ponsel fisik** dengan ADB `device`, screenshot tiap skenario tanpa informasi privat, catatan PASS/FAIL dan bug.
- Bila ada FAIL kategori login, otorisasi, kebocoran navigasi, upload/download, crash fatal, atau logout salah, status rilis tetap HOLD.
- Hanya setelah gate E2E PASS dapat dilanjutkan review integrasi branch dan CI. Jangan merge PR #245 atau upload ke Play Console sekarang.
