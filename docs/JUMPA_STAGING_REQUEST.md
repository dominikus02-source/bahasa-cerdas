# Permintaan staging khusus JUMPA — 4 November 2026

**Status:** dokumen permintaan saja. Tidak ada provisioning, perubahan VPS/produksi, atau load test yang diizinkan dokumen ini.

## Kebutuhan minimum asumsi awal (harus dikalibrasi melalui benchmark)
- VM **staging terpisah**, CPU **8 vCPU dedicated**, **RAM 16 GiB**, **SSD 60 GB**, **1 Gbps bandwidth terjamin** simetris dengan batas trafik diketahui. Bukan janji 150 peserta video aktif; bandwidth SFU bergantung pada jumlah subscriber, simulcast, pilihan kualitas, dan publikasi media.
- Linux dengan Docker Engine + Compose resmi oleh akun deployment terbatas, storage dan log terpisah, cgroups CPU/memory/pids, metrik per 2 detik, alert OOM, shutdown otomatis ketika limit dilanggar. Jangan memberi akses root-equivalent melalui group Docker untuk akun QA biasa.
- **Generator beban di host lain** agar angka CPU/RAM/NIC SFU tidak tercampur; token QA hanya room prefix `qa-capacity-`, TTL <=30 menit, secret staging berbeda, hapus room dan semua peserta setelah tahap.
- Redis, LiveKit, TURN (bila digunakan), cert, DNS, telemetri, dan kredensial khusus staging. Tidak mengarah ke database, host, API key, atau media service produksi.
- DNS/WSS `443/TCP` melalui reverse proxy -> `7880/TCP` sinyal LiveKit internal; `7881/TCP` ICE TCP fallback; **pilih** UDP mux `7882/UDP` atau UDP range `50000–60000/UDP` sesuai konfigurasi; TURN `3478/UDP`, `5349/TCP` bila digunakan; buka hanya port yang memang digunakan pada firewall khusus staging. NAT/external IP dan TURN/TLS wajib diuji.
- Ambang yang telah disetujui: tahap 20 -> 50 -> 100 -> 150; 15 menit stabil setiap tahap dan dua skenario (pemandu + peserta pasif, serta banyak pembicara aktif), join/reconnect >=99%, loss p95 <=1%, jitter p95 <=30ms, RTT p95 <=150ms, CPU p95 <=70%, RAM <=80% limit, MemAvailable host shared >=4 GiB, TX p95 <=60% link, crash/OOM 0.
- Sebelum tahap 20, wajib tersedianya bukti unit test dan negative dry-run guard, akses/monitoring staging, dan izin operator tahap A+B. **Belum boleh menjalankan uji beban.**

### Pesan untuk administrator VPS / penyedia
Mohon bantu siapkan VM staging **khusus** untuk QA LiveKit JUMPA, terpisah total dari produksi, dengan asumsi awal 8 vCPU dedicated, 16 GiB RAM, SSD 60 GB, jaringan 1 Gbps terjamin dan generator beban pada mesin berbeda. Kami memerlukan akses deploy Docker/Compose melalui akun resmi yang dibatasi, IP publik/DNS/TLS staging, dukungan WSS 443/TCP, media UDP 7882 atau range 50000–60000, ICE fallback 7881/TCP dan TURN bila diperlukan, serta pemantauan CPU/RAM/NIC, pembatasan resource dan estimasi biaya. Tolong kirim spesifikasi sebenarnya, bandwidth terjamin, daftar port tersedia, lokasi server, dan rencana isolasi; **jangan** mengubah VPS produksi, restart layanan, atau membuka port produksi tanpa persetujuan eksplisit.

Dokumentasi LiveKit: https://docs.livekit.io/transport/self-hosting/ports-firewall/ ; https://docs.livekit.io/transport/self-hosting/benchmark
