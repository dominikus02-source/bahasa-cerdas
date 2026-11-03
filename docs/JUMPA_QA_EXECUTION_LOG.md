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


## Fase 0 — pemetaan kode dan keputusan gerbang (2026-11-03)

**SHA kode fitur yang diaudit:** PR #220 head `8b5593b4eb2a31ff7dd157f57c25145115d4c20e`. Belum merge; QA ini mengacu ke implementasi PR tersebut.

**Stack dan aliran data:** LiveKit WebRTC SFU untuk rapat, MediaRecorder browser untuk rekaman, `getDisplayMedia` memilih layar, WebAudio `MediaStreamAudioDestinationNode` menggabungkan track audio rapat. MediaRecorder mengeluarkan Blob per detik ke array `chunks` **di RAM browser**, lalu `new Blob(chunks)` pada `onstop`, kemudian `downloadCapture` membuat object URL dan memicu unduhan browser. Tidak ada endpoint upload rekaman, bucket rekaman, penyimpanan server, atau egress LiveKit pada implementasi ini. Tidak ada migrasi Prisma dalam daftar file berubah PR #220. Feature flag utama: `JUMPA_MAX_PARTICIPANTS` dan tier Free/Premium; dukungan rekaman ditentukan kemampuan browser dan peran HOST/COHOST.

**Titik risiko (baris pada SHA PR #220):**
- `components/jumpa/local-recording.ts:104-115`: chunks hanya di RAM; force-kill browser menghilangkan rekaman yang belum disimpan, `onstop` tidak dipanggil.
- `components/jumpa/use-meeting-capture.ts:37`: unmount menghentikan recorder, tetapi penyelesaian unduhan bersifat asinkron.
- `components/jumpa/use-meeting-capture.ts:77-80`: `beforeunload` hanya peringatan; tidak menjamin penulisan data jika tab ditutup paksa.
- `components/jumpa/use-meeting-capture.ts:97`: saat unmount, pemanggilan `downloadCapture` otomatis berisiko diblokir karena bukan user gesture.
- `components/jumpa/use-meeting-capture.ts:64`: kegagalan heartbeat/notifikasi saat offline menghentikan recorder; perlu verifikasi hasil unduhan.
- `components/jumpa/local-recording.ts:19-28`: unduhan via object URL, bukan commit durable ke storage.
- `components/jumpa/JumpaRoomView.tsx:627` dan `:828`: jalur keluar/akhiri punya perlindungan UI; perlu pengujian E2E bahwa file benar-benar tersimpan.

**Output perintah nyata:**
- PC `git -C F:\\bahasa-cerdas status --short` -> kosong; `git log -1` -> `1e49f471004ceaf1c9dc8511da932697e0c28b20`. `node --version` -> `v24.20.0`; `Test-Path node_modules` -> `False` (dependency belum terpasang pada workspace PC).
- `ffprobe -version` -> `ffprobe version 8.0-essentials_build-www.gyan.dev` (tersedia).
- `curl.exe -sS -I --max-time 12 https://jumpa-staging.bahasacerdas.com` -> `HTTP/1.1 200 OK` (03:06 UTC); hanya probe endpoint, bukan WebRTC.
- `curl.exe -sS --max-time 12 https://www.bahasacerdas.com/api/health` -> `{"status":"ok","db":"up",...,"timestamp":"2026-11-03T03:23:19.368Z"}`; hanya baseline health, bukan persetujuan deploy.

## Gerbang 1 — status saat ini: **BELUM LULUS / BLOKIR**

**Kriteria yang dikunci sebelum uji:** keempat skenario (close tab, offline, end room, force-kill/restart) × 3 ulangan; masing-masing harus menghasilkan file rekaman yang tetap tersedia setelah restart, berukuran > 0, dan `ffprobe` mengembalikan durasi yang masuk akal. 100% sukses. Kriteria ini **tidak boleh diturunkan**.

**Bukti pengujian:** belum ada 12 eksekusi Playwright pada SHA fitur saat ini, belum ada file rekaman hasil skenario dan output `ffprobe`. Oleh karena itu tidak ada klaim PASS. Risiko force-kill adalah ketidakcocokan arsitektur yang dapat dibuktikan dari kode: seluruh chunks berada di memori proses yang dimatikan. Menerapkan solusi durable (misalnya penyimpanan incremental di IndexedDB/OPFS atau streaming upload yang aman) memerlukan perubahan desain, penanganan crash, dan bukti regresi. Menyimpan hanya di akhir tidak dapat memenuhi gerbang force-kill.

**Keputusan otomatis:** Gerbang 1 tidak memiliki bukti lulus; Fase 3–8 **tidak dijalankan**, tidak ada load test staging, merge, deploy, atau rollback. Bukan kegagalan setelah 3 siklus perbaikan; statusnya *blocked, belum diuji*, bukan PASS maupun klaim 3 kali FAIL. Perlu implementasi durable dan eksekusi 12 tes untuk melanjutkan.

**Perangkat nyata:** BELUM DIUJI. **Kapasitas aman terbukti 100+/150:** BELUM TERBUKTI. **Batas produksi:** tidak diubah.


## Fase 1–2 — eksperimen pemulihan (3 November 2026, Windows Chrome)

**PR perbaikan terisolasi:** #223 (draft, basis PR #220), commit `169ccf86`. Tidak di-merge ke main atau dideploy.

**Penguji:** `scripts/e2e/jumpa-checkpoint.cjs`, Chrome Playwright persistent profile, MediaRecorder video canvas sintetis 320×180, Windows `taskkill /PID ... /T /F` untuk menghentikan proses Chrome, restart dengan profil sama, pembacaan IndexedDB, ekstraksi ZIP dan `ffprobe` tiap segmen. **Bukan** pengujian UI rapat JUMPA penuh, bukan kamera/mikrofon fisik, dan bukan tes 4 skenario lengkap. Periode rekam yang disimulasikan 3,5 detik. Kriteria penguji tambahan ditetapkan sebelum uji terakhir: durasi segmen yang berhasil dipulihkan secara total minimal 3,0 detik dari 3,5 detik; kriteria utama Gerbang 1 (100% rekaman utuh pada 4 skenario ×3) tidak berubah.

| Percobaan | Hasil nyata | Interpretasi |
|---|---|---|
| Baseline raw chunks IndexedDB, 3 kali | 0/3; `ffprobe duration=N/A`, file ended prematurely, ukuran 5182/5035/5181 byte | GAGAL: container belum finalized |
| Segmen finalized 1,5 detik, kill+restart, 3 kali | 3/3 file segmen terbaca; durasi total setelah ZIP 2,740 / 2,729 / 2,719 detik | GAGAL kriteria durasi ≥3,0 detik |
| Segmen finalized 0,75 detik, kill+restart, 3 kali | 3/3 arsip dipulihkan, 5 segmen per arsip; total durasi 3,343 / 3,437 / 3,405 detik; `ffprobe` dapat membaca segmen | PASS **hanya subtes pemulihan sebagian**, BUKAN Gerbang 1 |
| TypeScript | `npm run typecheck` -> `TYPECHECK_PASS` setelah `prisma generate` | PASS untuk commit kerja lokal |
| ESLint file tersentuh | `eslint components/jumpa/recording-checkpoint.ts ...` -> 0 error, 0 warning | PASS untuk file tersentuh |

**Risiko tersisa yang memblokir Gerbang 1:** bagian terakhir rekaman yang belum difinalisasi saat kill masih dapat hilang; tes hanya canvas sintetis, belum menguji close tab, offline, end room dan recovery melalui UI lengkap ×3; mutasi penguji belum dijalankan; rekaman backup memerlukan encoder kedua dan menyimpan video lokal di IndexedDB (kuota, privasi, retensi, dan performa perlu diperiksa); archive ZIP bukan satu file video sambung. Tidak boleh menyatakan rekaman 100% utuh.

**Keputusan gerbang:** **BELUM LULUS**. PR #223 tetap draft untuk iterasi dan review. Fase 3–8, merge, dan deploy **tidak dilakukan**; kapasitas produksi tidak diubah. Pekerjaan yang ada tidak memenuhi gerbang otomatis untuk maju.
