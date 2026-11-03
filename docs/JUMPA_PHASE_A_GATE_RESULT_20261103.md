# JUMPA Fase A — hasil gerbang 3 November 2026

**Keputusan: GAGAL setelah tiga siklus perbaikan. BERHENTI sebelum Fase B.**
PR implementasi #224 (draft), target `release/jumpa-qa`; checkpoint utama #222.
Baseline integrasi main `59293b6f017d5553b3a7775257de883a06bcd7eb`.
Tidak ada merge integrasi/main, deploy, migrasi, perubahan secret atau data produksi.

## 1. Ringkasan perubahan

Satu MediaRecorder timeslice 5 detik menggantikan encoder ganda. IndexedDB menyimpan
chunk dan jumlahnya secara atomik/strict dan menolak urutan yang tidak sesuai.
Write failure menghentikan recorder. Kuota diperiksa sebelum dan selama rekam,
dengan headroom untuk flush akhir. visibilitychange meminta data saat tersembunyi;
pagehide mencoba stop. Pemulihan otomatis dibatasi ke identity pemilik rekaman baru.
Metadata durasi WebM berasal dari timeline decoder, bukan elapsed wall clock.
Semua capture baru berada di balik `NEXT_PUBLIC_JUMPA_CAPTURE_ENABLED`, default 0.
Flag ini build-time; tidak menyalakan produksi melalui penggantian runtime env.
Premium Egress tetap interface/TODO, BELUM SIAP dan tidak dipanggil.

Tidak mengklaim upload progresif/resumable, pengelolaan rekaman lengkap melalui UI,
atau jaminan akhir rekaman browser telah selesai dibuat.

## 2. File yang diubah

- `components/jumpa/local-recording.ts`: lifecycle, satu encoder, kuota, antrean write.
- `components/jumpa/recording-checkpoint.ts`: transaksi atomik, urutan dan owner.
- `components/jumpa/use-meeting-capture.ts`, `JumpaRoomView.tsx`: recovery/flag/pesan.
- `lib/jumpa/webm-duration.ts`: metadata durasi streaming WebM tanpa dependensi baru.
- `scripts/e2e/jumpa-recording-gate.cjs`: tujuh skenario, tiga ulangan, mutasi.
- `.github/workflows/jumpa-recording-gate.yml`, `ci.yml`: browser/ffprobe/mutasi
  dalam hasil agregat CI agar deploy yang bergantung pada CI ikut tertahan.
- `.env.example`, dokumen Fase A dan `docs/qa/jumpa-phase-a-20261103/`: bukti.

Diff PR juga mencakup dependensi rekaman dari #220/#223 yang belum masuk main.
Daftar lengkap, termasuk fixture dan dokumentasi dependensi, ada pada tab Files #224.
Tidak ada diff terhadap Compose atau route materi yang gagal dalam pemeriksaan.

## 3. Gerbang dan bukti nyata

Kriteria pengguna tidak dilonggarkan: graceful utuh 100% ×3, crash maksimum satu
segmen/timeslice+2 detik (=7 detik), container ffprobe valid dan durasi wajar >0.
Browser hard-kill tidak dapat menjamin detik terakhir; karena itu batas kehilangan
crash berbeda dari graceful. Penguji mengunci sumber 15fps, 6,4 detik, toleransi
penjadwalan encoder 150ms dan final commit untuk graceful sebelum pengujian.
Toleransi sumber sintetis ini BUKAN bukti jaminan 100% media pengguna.

Lingkungan: Windows, Chrome headless nyata, Playwright 1.60.0, esbuild 0.28.2,
ffprobe 8.0. Stream layar berasal dari canvas; suara menggunakan mixer produksi
saat semua peserta mute. Room transport disimulasikan. Fake-media flags diaktifkan.
Ini pengujian komponen produksi oleh bot, bukan rapat LiveKit end-to-end, login QA,
pemilih layar OS, perangkat kamera/mikrofon fisik, maupun kapasitas server.

| Siklus | Perbaikan | Hasil |
|---|---|---|
| 1 | Satu encoder, antrean chunk, kuota, requestData lifecycle | 0/9 close/reload/end; duration=N/A |
| 2 | Metadata durasi berbasis decoder | Close/reload 0/6; end 3/3 cek durasi/tail, tetapi stderr Opus belum digagalkan oleh harness. BUKAN PASS gerbang |
| 3 | Stop pagehide, identitas owner, kuota cadangan; audit stderr harness | 18 hasil file gagal ffprobe; 3 skenario quota tidak konklusif. Gerbang 1 GAGAL |

Siklus 3 disimpan dalam dua JSON: `cycle3-initial.json` dan
`cycle3-remaining.json`. Gunakan close/reload/end/offline dari initial (12 hasil),
dan quota/crash/kill dari remaining (9 hasil): 21 hasil unik. Tiga timeout quota
lama pada initial merupakan duplikat percobaan harness, bukan ulangan tambahan.
CDP Page.crash sempat menggantung; penguji diperbaiki dengan timeout 5 detik dan
sisa skenario diulang pada kode produksi yang sama. Tidak ada siklus keempat kode
produksi. Proses dan Chrome yang dihentikan hanya milik profil bot QA terisolasi.

| Skenario akhir ×3 | Hasil |
|---|---|
| Tutup tab | Final commit dapat tersimpan, tetapi ketiga file error Opus |
| Refresh | Ketiga final commit hilang; loss 1376,7 / 1386,9 / 1385,5 ms; container premature + Opus |
| Stop/akhiri recorder | Final commit tersimpan, ketiga file error Opus; aksi END rapat penuh BELUM TERUJI |
| Offline lalu pulih | Ketiga file error Opus; ini jaringan browser, bukan reconnect LiveKit |
| Storage hampir penuh | BELUM TERUJI: CDP override 33 MiB tidak tercermin di estimate, tetap ~10 GiB; tidak boleh dianggap bukti produk gagal/lulus quota |
| Renderer crash | Loss 1423,8 / 1444,1 / 1452,9 ms (<7 detik), tetapi ketiga container premature + Opus |
| Browser process kill | Loss 1385,0 / 1382,3 / 1328,6 ms (<7 detik), tetapi ketiga container premature + Opus |

Contoh output ffprobe nyata:
```
File ended prematurely at pos. 12585 (0x3129)
Error parsing Opus packet header.
```
Durasi metadata finite saja tidak cukup: video masih gagal pemeriksaan decoder.
Penyebab Opus belum terisolasi antara mixer silent track, enkoder Chrome, dan
container. Jangan menganggap penambahan metadata memperbaiki framing media.

Mutation test tanpa timeslice: kill/restart ×3 menghasilkan
`RECORDING_CHECKPOINT_EMPTY`, exit 1 sesuai harapan. Ini membuktikan penguji
mendeteksi checkpoint yang hilang; bukan bukti seluruh skenario positif lulus.

Pemeriksaan lain:
- Typecheck sebelum build: exit 0. Lint: exit 0, 0 error/123 warning.
- `npm run build`: GAGAL, Turbopack menolak junction node_modules di luar root.
- `npm run build -- --webpack`: compiled successfully 102s, lalu GAGAL validator
  route `.next/types/app/api/guru/materi/[id]/download/route.ts`: export
  `FREE_DOWNLOAD_LIMIT` bukan export Route Handler yang didukung.
- Typecheck SETELAH build: exit 2 dengan error validator route yang sama.
  Status terakhir typecheck karena itu GAGAL, bukan PASS tanpa kualifikasi.
- Route materi, Compose dan tes permissions tidak berubah terhadap baseline main.
  Ini bukti masalah diwarisi, bukan alasan menganggapnya boleh lolos rilis.
- Quota policy fixture: 5/5 PASS; estimate di fixture dimock, bukan quota CDP nyata.
- JUMPA permissions: 104 PASS/1 FAIL (ekspektasi Compose 2 CPU/1,5 GB).
- JUMPA tier: 77/77 PASS; token, trial-media dan no-English dijalankan, bukan bukti E2E.
- CI GitHub belum dinyatakan hijau. Workflow CI terbaru wajib menyertakan recovery;
  bukti Actions pada head akhir harus diperiksa sebelum klaim hasil CI.

Bukti mentah: `docs/qa/jumpa-phase-a-20261103/*.json` dan `*.log`.
File WebM percobaan disimpan di PC pada `F:\jumpa-gate-cycle1`, `cycle2`,
`cycle3`, `cycle3b` (nama lengkap diawali `jumpa-gate-`). CI juga mengunggah artifact
WebM/JSON ketika job dijalankan. Tidak ada rekaman pengguna dalam bukti.

## 4. Risiko tersisa dan status fase lain

Gerbang 1 GAGAL. Gerbang 2/Premium BELUM SIAP/nonaktif. Gerbang 3–6 BELUM TERUJI;
Fase B–D tidak dijalankan karena prasyarat gagal setelah tiga siklus.
Kapasitas aman staging belum ditentukan. Batas peserta produksi tidak diubah dan
nilai runtime aktif belum diverifikasi ulang pada sesi ini. SHA rollback produksi
belum diambil atau diuji karena fase deployment tidak dimulai.
Perangkat nyata, penggantian jaringan/perangkat, UI tiga viewport/axe,
load-test staging, rollback, canary dan monitoring 60 menit BELUM TERUJI.

## 5. Langkah berikutnya

Tidak ada tindakan produksi yang perlu pengguna lakukan sekarang. Pertahankan
#224 sebagai draft dan flag capture/Premium mati. Jika pekerjaan dilanjutkan dalam
sesi baru, mulai dari Fase A: isolasi framing WebM/Opus, buktikan flush refresh utuh,
uji quota yang benar-benar berlaku, dan selesaikan regresi build baseline. Setelah
itu jalankan lagi gerbang sesuai kebijakan siklus yang ditetapkan pengguna.
Jangan beralih ke Fase B atau merge main berdasarkan subtes durasi saja.
