# JUMPA — runbook staging-only capacity test (draft; 4 November 2026)

**JANGAN MENJALANKAN UJI MEDIA SAAT INI.** Dokumen ini berlaku setelah staging dedicated tersedia, admin menyetujui A+B, dan pengaman telah diuji terhadap staging sesungguhnya. Tidak ada perintah di bawah yang boleh dijalankan terhadap VPS/produksi.

## 0. Topologi wajib
- **SFU host:** VM staging dedicated 8 vCPU/16 GiB/60 GB SSD/1 Gbps guaranteed sebagai baseline pengadaan, disk/Redis/LiveKit/API key/turn/DNS/TLS sepenuhnya berbeda dari produksi; bukan sizing 150 yang terbukti.
- **Generator host:** Linux/PC terpisah yang mampu melakukan 150 koneksi RTC, jangan berbagi CPU/NIC dengan SFU. Python 3.11+; pasang dependensi dalam venv QA terisolasi: `python -m pip install -r ops/vps/jumpa_capacity/requirements-staging.txt` (LiveKit RTC 1.2.0, API 1.2.2, psutil). Catat versi dependency dan checksum.
- **Metrics agent:** hanya di host SFU staging, akses melalui TLS reverse proxy khusus staging menuju agent loopback `127.0.0.1:9817/metrics`. Lindungi dengan firewall IP allowlist generator+ bearer panjang acak; jangan expose endpoint publik tanpa auth.
- Konfigurasi SFU cgroup v2: direktori `STAGING_SFU_CGROUP` yang memiliki `memory.current`, `memory.max` finite, `memory.events`, serta `qa_crashes.counter` yang diperbarui oleh watchdog container/restart eksternal. Tanpa penghitung crash **jangan mulai**. NIC harus benar-benar interface SFU dan `STAGING_NIC_LINK_MBPS` merupakan kapasitas link terjamin, bukan speed klaim VPS.
- Port terpisah: TLS/WSS 443/TCP ke 7880 internal, fallback ICE 7881/TCP, 7882/UDP mux atau range 50000–60000/UDP, TURN 3478/UDP/5349/TCP bila dipakai. Jangan ubah firewall produksi.

## 1. ENV generator — set hanya di terminal QA privat
```bash
export QA_STAGING_DEDICATED=true
export STAGING_ALLOWED_HOSTS='jumpa-qa.example.net'
export PRODUCTION_IPS='<set lengkap IP A/AAAA produksi dari admin>'  # wajib, tidak boleh kosong
export LIVEKIT_API_KEY='qa_<key staging baru>'
export LIVEKIT_API_SECRET='<secret staging; jangan commit>'
export PRODUCTION_HEALTH_URL='https://www.bahasacerdas.com/api/health'
export PRODUCTION_HEALTH_HOSTS='www.bahasacerdas.com'
export STAGING_METRICS_URL='https://metrics-qa.example.net/metrics'
export STAGING_METRICS_ALLOWED_HOSTS='metrics-qa.example.net'
export STAGING_METRICS_BEARER='<random >=32 chars>'
export STAGING_NIC='ens5'
export STAGING_NIC_LINK_MBPS='1000'
export QA_TOKEN_TTL_SECONDS='300' # maksimum 1800, refresh token saat reconnect
```
Contoh hostname `example.net` **placeholder**; ganti dengan hostname staging terisolasi yang disetujui. IP produksi denylist harus lengkap dan diverifikasi admin. Secret jangan diketik ke argumen CLI, commit, screenshot, atau log.

## 2. Aktifkan probe di SFU staging (operator staging saja)
```bash
export QA_STAGING_DEDICATED=true
export STAGING_METRICS_BEARER='<bearer sama dengan generator>'
export STAGING_NIC='ens5'
export STAGING_NIC_LINK_MBPS='1000'
export STAGING_SFU_CGROUP='/sys/fs/cgroup/<scope livekit staging>'
python -m ops.vps.jumpa_capacity.staging_probe
```
Jika agent merespons 503, telemetry belum warm-up atau counter crash/cgroup tidak tersedia. **Jangan mematikan guard**; perbaiki instrumen staging terlebih dahulu. Health produksi diakses satu GET setiap interval, read-only; gagal sekali berarti stop. Jangan melakukan GET produksi selama fase development/mock ini.

## 3. Dry-run (diizinkan sebelum staging, tanpa koneksi media/produksi)
```bash
python ops/vps/run_capacity.py --target jumpa-qa.example.net --dry-run
python -m unittest ops.vps.jumpa_capacity.test_mock_e2e -v
```
Dry-run hanya memvalidasi deklarasi env dan DNS target. **Tidak membuktikan** load, staging API readiness, kualitas media, health, atau kapasitas.

## 4. Uji nyata HANYA setelah izin terpisah + staging tersedia
```bash
python ops/vps/run_capacity.py --target jumpa-qa.example.net --output qa-results/capacity.json
```
Satu perintah menargetkan room QA acak prefix `qa-capacity-`; setiap tahap **20→50→100→150**, dua skenario **passive/speakers**. Setiap skenario harus mempunyai 900 detik steady state, join/reconnect >=99%, peak simultaneous stage penuh, packet loss p95<=1%, jitter p95<=30ms, RTT p95<=150ms, CPU p95<=70%, RAM <=80% limit, MemAvailable>=4096 MiB, TX p95<=60% link, crash/OOM=0. Metrik kosong atau kegagalan cleanup menghentikan semua tahapan. Hasil ada di `qa-results/capacity.json` dan `qa-results/capacity.md`. Angka kapasitas terbukti = tahap tertinggi yang kedua skenarionya PASS; 0 berarti tidak ada bukti.

**Penting:** generator media sintetis hanya menguji beban RTC/LiveKit; nilai hasil belum membuktikan pengalaman browser/perangkat nyata, serta belum mengesahkan 150 video aktif atau rekaman.

## 5. Stop darurat dan cleanup
- Tekan `Ctrl+C` satu kali pada proses orkestrator; SIGINT/SIGTERM mengatur stop lalu akhirnya memanggil cleanup. Tunggu pesan laporan, jangan force-kill bila belum perlu.
- Pada kegagalan health/metrik, sistem harus menghentikan uji dan *finally* meninggalkan peserta dan menghapus room QA menggunakan RoomService `RemoveParticipant` kemudian `DeleteRoom`.
- Jika proses mati paksa dan cleanup tertunda, **hanya admin staging** menjalankan pembersihan manual melalui `lk room list`, memilih **hanya room yang namanya cocok `^qa-capacity-(20|50|100|150)-[a-f0-9]{12}$`** dan yang ownership-nya cocok dengan run; gunakan `lk room delete <nama-room-qa>` terhadap endpoint staging setelah memastikan tidak ada pengguna nyata. Jangan jalankan perintah ini dengan kredensial/URL produksi.
- Simpan evidence JSON/Markdown, log staging tanpa token, sertakan SHA, jam UTC/WIB, metrik mentah, konfigurasi nonsecret, alasan FAIL dan hasil cleanup. Simulasi mock tidak boleh diklaim sebagai kapasitas terbukti.

## 6. Syarat rilis pengaman
Sebelum uji pertama, operator harus mengesahkan koneksi LiveKit staging nyata, pembacaan RTT/inbound RTP SDK (schema aktual), health GET dan fail-fast, endpoint metrik host dan restart counter, cleanup room ID QA sesungguhnya, sinyal saat jaringan macet, bandwidth generator dan server, serta verifikasi bahwa tidak satu pun route mengarah ke produksi. Jika satu syarat tidak terpenuhi, tetap **BLOCKED**.
