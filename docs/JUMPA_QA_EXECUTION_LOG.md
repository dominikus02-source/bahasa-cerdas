# JUMPA — log eksekusi QA independen
Tanggal mulai: 3 November 2026. Dokumen ini mencatat **bukti aktual**, bukan klaim lulus pengujian yang belum dijalankan.

## Pemeriksaan terverifikasi
| Area | Hasil | Bukti / batasan |
| --- | --- | --- |
| Kesiapan GitHub PR #220 | CI PASS | Head 8b5593b4eb2a31ff7dd157f57c25145115d4c20e; workflow build dan smoke sukses. PR masih draft. |
| Konektivitas staging | HEAD HTTP 200 | `curl.exe -sS -I --max-time 12 https://jumpa-staging.bahasacerdas.com` pada 2026-11-03 03:06 UTC, melalui Cloudflare/Caddy. **Bukan** pengujian WebRTC atau LiveKit health lengkap. |
| Audit rekaman | Temuan terbuka | `use-meeting-capture.ts`: callback onComplete ketika unmount mengunduh otomatis tanpa klik; browser dapat memblokir. Belum direproduksi di perangkat nyata. |
| Audio/video & indikator | Belum diuji independen | Pengujian sintetis 20 sesi yang dijelaskan PR #220 bukan pengujian perangkat fisik. |
| Kapasitas 30–150 | Belum diuji independen | Belum ada token staging terbatas, izin operator, dan telemetri SFU/TURN untuk uji beban. |
| UI/UX perangkat nyata | Belum diuji independen | Bukti fixture Chrome 360/768/1280 dari PR #220; audit lintas perangkat nyata masih diperlukan. |
| Rilis produksi | DITAHAN | Menunggu QA P0, persetujuan Mr Domi, CI head terbaru, dan prosedur deploy/rollback. |

## Urutan eksekusi yang aman
1. **Rekaman:** reproduksi kasus exit/end/unmount pada browser nyata; siapkan tes regresi dan PR perbaikan kecil di branch terpisah. Jangan mengubah PR #220 tanpa koordinasi.
2. **Mic/camera/reconnect:** uji minimal Chrome Windows, Chrome Android, Safari iOS dengan dua jaringan berbeda; simpan evidence dan versi browser.
3. **Load staging:** lakukan baseline 20/30, baru naik ke 50/75/100/150 jika operator mengizinkan dan grafik CPU/RAM/network/TURN serta failure rate tersedia. Gunakan token staging pendek dan ruang khusus QA. Jangan mengubah cap produksi.
4. **UI/UX:** verifikasi 360/390/768/1280/1440 px, keyboard, zoom 200%, dialog keluar, kontrol pemandu, teks batas efektif peserta.
5. **Release:** hanya Mr Domi/tim yang menyetujui merge dan deployment. Verifikasi rollback sebelum mengubah layanan.

## Bukti yang perlu dicatat
`UTC/WIB | commit | browser/OS/perangkat | jaringan | skenario | hasil | log/screenshot | severity | issue/PR`

## Ketergantungan sebelum load test
- Akses staging yang disetujui operator dan token LiveKit QA sementara; jangan commit token.
- Metrik CPU/RAM, ingress/egress, bitrate, packet loss, RTT, TURN usage, reconnect, serta batas penghentian pengujian.
- Jadwal tes yang tidak mengganggu peserta aktif.
- Bukti kapasitas harus memisahkan simulasi browser pada satu host dari perangkat fisik/jaringan berbeda.

## Aturan koordinasi
PR dokumentasi ini tidak mengubah aplikasi. Setiap bug P0 ditindaklanjuti sebagai perubahan terisolasi dan review Mr Domi. Jangan mengklaim produksi siap sampai seluruh gerbang P0 terbukti lulus.
