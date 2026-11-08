# Migrasi injeksi CSS/DOM WebView Android → source web

Status: source web memuat gaya aplikasi (`app/android-app.css`) dan menandai
`<html data-bc-native-styles="1">` lewat skrip boot di `app/layout.tsx` hanya
bila jembatan native `BahasaCerdasMobile` ada. Aplikasi melewati injeksi lama
bila penanda ada; injeksi lama tetap sebagai **fallback transisional** untuk
situs live yang belum dirilis. Hapus `mobile_premium_style.dart` setelah rilis
web terverifikasi di perangkat.

Tidak berubah (jembatan kapabilitas, bukan gaya): kanal `BahasaCerdasMobile`
(OAuth), `BahasaCerdasNavigation`, `BahasaCerdasPip`, `BahasaCerdasScreenShare`,
toggle kelas `bc-android-pip` dari native, event `bc:native-screen`.

| # | Aturan lama (Dart) | Pengganti di source | Bukti |
|---|---|---|---|
| 1 | `html.bc-android-app` via JS | Skrip boot `ANDROID_APP_BOOT` (deteksi jembatan, nonce CSP) | test-android-webview-gate.mjs |
| 2 | Sembunyikan banner "Pasang aplikasi" | android-app.css | — |
| 3 | Sembunyikan breadcrumb (beberapa selector) | Sudah dihapus global di main (#251); tidak perlu | main 937921cc |
| 4 | Umpan balik sentuh/fokus tombol | android-app.css (`var(--clr-focus)`) | — |
| 5 | Kelas `bc-android-student-subpage` + sembunyikan `a[href='/guru/beranda']` | `TeacherHomeShortcut` hanya di `/murid/beranda` | test-founder-nav-jumpa-screen |
| 6 | Sisipkan tombol "Kembali ke Dasbor Guru" (Dart, guru di /murid/beranda) | `TeacherHomeShortcut` di `MuridShellFrame` (GURU/founder) | idem; dilewati bila penanda ada |
| 7 | Ganti label pemilih peran via MutationObserver | Label tetap UMUM/GURU/MURID/FOUNDER di `FounderDashboardSwitcher` (#258) | test:founder-role-labels, QA visual |
| 8 | Ukuran pemilih peran ≤640px | Komponen compact + header founder ringkas (`GuruHeader`, `MuridShellFrame`) | QA visual 320–430 tanpa overflow/overlap |
| 9 | Login: merek disisipkan via DOM | `data-bc-login="brand"` di halaman login, tampil hanya di app | QA visual login |
| 10 | Login: sembunyikan hero/kembali/kartu nilai, kartu ringkas | `data-bc-login=hero/back/extras/panel/grid` + android-app.css | QA visual login (hero tersembunyi) |
| 11 | Sembunyikan aturan JUMPA di beranda JUMPA | android-app.css | — |
| 12 | Drawer guru dipersempit, footer disembunyikan | `GuruNav`: lebar `82%/300px`, footer dev "Guru Navigation V2" dihapus, tombol tutup 44px + aria-label | QA visual |
| 13 | Drawer: grup ditutup via klik DOM | `NavLinks` drawer: grup awal tertutup kecuali berisi halaman aktif; `aria-expanded` | source |
| 14 | PiP: sembunyikan header/dock/strip | android-app.css (kelas `bc-android-pip` tetap dari native) | — |
| 15 | Landscape JUMPA (pointer coarse) | Sudah di `components/jumpa/jumpa.css` (#258) | test-jumpa-mobile-screen-stage |
| 16 | prefers-reduced-motion | android-app.css | — |
