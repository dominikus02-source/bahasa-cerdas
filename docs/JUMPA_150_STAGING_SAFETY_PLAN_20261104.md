# JUMPA 150 — audit keselamatan dan rencana staging (4 November 2026 WIB)

> **STATUS: BLOCKED / NO LOAD TEST / NO PROD CHANGE.** Dokumen persiapan untuk disetujui, bukan bukti 150 peserta. PR #222 tetap draft. Skrip sumber yang diperiksa hanya ada di workspace Windows `F:\bahasa-cerdas\ops\vps\` dan **tidak ada di head PR #222** saat audit. Workspace memiliki perubahan lain yang belum di-commit; jangan menimpa atau menjalankannya. Implementasi guard baru belum dianggap lulus.

## Bukti yang benar-benar diperiksa
- PR #222 draft, head `f478b56169c6344ccb8c22cff299d16b3c2b16af`, berubah hanya dua dokumen QA sebelum penambahan dokumen ini.
- PC Desktop Commander online; pembacaan *read-only* atas `test-jumpa-capacity.py`, `prepare-jumpa-capacity-test.py`, `diagnose-jumpa-capacity.py`, dan `docker-compose.jumpa-capacity-test.yml`. Tidak ada uji media yang dijalankan.
- Berdasarkan catatan operator (belum diukur ulang): VPS RAM 15 GiB, MemAvailable ~6.3 GiB; akun `bcagent` tanpa Docker, PC belum ada Docker; unit test tier 77/77 dan izin 105/105. Bukti itu **bukan** kapasitas media 150.

## A. Celah audit kode: harus diperbaiki dan diuji sebelum diizinkan jalan
| ID | Fakta pada sumber lokal | Risiko | Perbaikan wajib dan bukti |
| --- | --- | --- | --- |
| A01 | `LIVEKIT_URL == http://127.0.0.1:7890` diperiksa sebelum mulai | Loopback bisa diarahkan ke port-forward produksi; variabel CLI / config bisa menunjuk kredensial lain | Allowlist host **dan** proses/container ID, konfigurasi project QA, key ID khusus, IP tujuan hasil resolusi, namespace/jaringan Docker serta penolakan semua hostname/IP produksi; fail-closed termasuk redirect dan perubahan DNS; tes negative terhadap host produksi, localhost tunnel, invalid config |
| A02 | Guard awal `MemAvailable <4096 MB`; saat uji `<2048 MB`; health `127.0.0.1:3000/api/health` hanya setiap iterasi | Ambang 2 GiB terlambat; health bisa mengarah ke app salah; tidak memeriksa status DB dan body; prod outage di antara iterasi | Minimum free RAM **>= 4096 MiB selama seluruh uji**, poll <=2 detik dari watchdog terpisah; prod health HTTPS terverifikasi, JSON `status=ok,db=up`, timeout 3 detik; dua kegagalan beruntun atau satu kondisi kritis -> stop segera; health tanpa akses/identitas benar -> jangan mulai |
| A03 | Tidak ada guard CPU atau NIC; snapshots hanya jumlah peserta/RAM | Berisiko menghabiskan CPU atau uplink host bersama | Guard agregat host CPU >=85% selama 10 detik, iowait >=20% selama 10 detik, NIC TX >=70% sustained 10 detik dari kapasitas **terukur**, atau retransmit/drop meningkat: abort; jika kapasitas NIC tidak diketahui, **jangan mulai** di host bersama. CPU, NIC, RAM dicatat per 2 detik |
| A04 | Process terminate lalu `wait`; dalam finally hanya Egress stop | Room & peserta QA bisa tertinggal, terutama setelah exception; file/recording mungkin aktif | Generate prefix QA unik; `try/finally` selalu stop generator, stop semua egress room QA, delete room QA via API, assert 0 participants dan 0 egress aktif, hapus token sementara; cleanup retry bounded, kegagalan cleanup -> block next stage |
| A05 | `test.env` menyimpan API secret; `prepare` membuat token layanan permanen pada disk 0600. JWT di `diagnose` TTL 60s, tetapi test memakai API key/secret mentah | Token peserta QA tidak diterbitkan dan divalidasi durasinya, credential exposure | API key staging terpisah, grant minimal join/publish/subscribe hanya room QA; JWT TTL <= 5 menit, `nbf/exp` diverifikasi, tanpa secret di log/PR; revokasi/rotasi setelah tes. Batasi akses secret dan `umask 077` |
| A06 | `--stages` boleh arbitrary subset dan tidak ada evidence gate granular | Bisa langsung `150` tanpa uji 20/50/100 | Wajib 20 -> 50 -> 100 -> 150 pada run yang sama atau bukti run terdahulu SHA/config sama yang disetujui; setiap tahap fail/unknown menghentikan seluruh rangkaian |
| A07 | Hanya parser packet loss dari baris 'Total'; `peakParticipants` dan file MP4 >0; tidak verifikasi isi video/audio | Tidak mengukur RTT, jitter, join gagal, reconnect, audio/video decode, kestabilan maupun durasi file | Persist JSON/CSV time series dan artefak per stage; `ffprobe` decode/codec/durasi; metrik client WebRTC & SFU; missing metric = FAIL/INCONCLUSIVE, tidak boleh PASS |
| A08 | `--duration` default 120s dan deadline tetap `count/5+300`, tanpa validasi durasi | Pengujian sangat pendek atau timeout tidak sesuai | Stage minimal 15 menit stabil setelah semua peserta join, plus churn/reconnect; validasi durasi, deadline >= ramp+steady+cleanup; timeout -> FAIL |
| A09 | Compose sudah `cpus`/`mem_limit` per service, tetapi Redis+LiveKit+Egress hingga 8.5 vCPU/7.25 GiB dan `restart: unless-stopped` | Bisa menggusur produksi di VPS 15 GiB dengan ~6.3 GiB available | **Tidak layak menjalankan Compose ini di shared production VPS**; staging khusus lebih aman. Bila host bersama disetujui admin, reserve produksi >=4 GiB tersedia sepanjang waktu, tetapkan parent cgroup (`MemoryMax`/`CPUQuota`), `pids_limit`, `ulimits`, network egress limits, restart=no, watchdog dan kill switch, serta dry-run admin |

**Stop policy (usulan):** watchdog di luar proses generator dan dapat menghentikan job meski Python hang; target guard invalid, prod health gagal, MemAvailable <4096 MiB, host CPU >=85% selama 10s, NIC TX >=70% 10s, loss >2% selama 30s, atau room cleanup gagal. Pada dedicated staging, health produksi menjadi monitoring read-only dan tidak mengirim load ke produksi. `curl` health tidak membuktikan media sehat. Angka final menunggu approval.

## B. Dua opsi lingkungan terisolasi
**Opsi 1 — direkomendasikan: VM staging tersendiri.** Baseline pengadaan awal (bukan sizing terbukti): Linux 8 vCPU dedicated, 16 GiB RAM, SSD 60 GB, NIC 1 Gbps *guaranteed*, IP publik + DNS dan TLS sendiri; generator beban di 1–2 host terpisah (jangan share CPU dengan SFU). Untuk 150 peserta video aktif, perlu kalibrasi dan mungkin 16 vCPU/10 Gbps; satu room LiveKit berjalan pada satu node. Simpan Redis, room/token, TURN dan log terpisah total dari produksi. Aktifkan telemetri 2s Prometheus/sysstat/SFU/WebRTC, retensi terbatas.

**Opsi 2 — VPS existing via akun deployment resmi** hanya dengan persetujuan tertulis pemilik VPS dan isolasi terukur. Jangan masukkan `bcagent` ke group `docker` karena group Docker setara akses root host. Gunakan akun deploy resmi + sudo command-specific/CI job yang dibatasi, audit log; tanpa mount Docker socket ke container. Parent cgroup CPUQuota/MemoryMax, pids limit, disk quota, IP/port/Redis/secret terpisah, *hard stop* jika reserve produksi terancam; ingress media tidak bertabrakan. Karena compose usulan dapat mengonsumsi >6.3 GiB, **opsi 2 sekarang BLOCKED** sampai admin membuktikan kapasitas spare dan membuat batas yang tidak mengganggu produksi.

Port LiveKit self-hosted: HTTPS/WSS `443/TCP` -> backend `7880/TCP` internal; `7881/TCP` ICE fallback; pilih `7882/UDP` UDP mux **atau** range `50000–60000/UDP`; TURN `3478/UDP` dan `5349/TCP` jika dipakai, sertifikat TLS domain staging tersendiri. Cek firewall, external IP, TURN/TLS dan bandwidth *dua arah*. Sumber: https://docs.livekit.io/transport/self-hosting/ports-firewall/ dan https://docs.livekit.io/transport/self-hosting/benchmark . Angka sumber benchmark tidak membuktikan hardware kita.

### Pesan admin VPS (siap dikirim, belum dikirim)
> Mohon siapkan staging LiveKit JUMPA yang benar-benar terisolasi untuk QA 20/50/100/150 peserta. Prioritas VM terpisah (awal 8 vCPU, 16 GiB RAM, NIC 1 Gbps, disk 60 GB) beserta akses deploy terbatas, Docker/Compose, DNS/TLS, UDP media, TURN, metrik CPU/RAM/NIC, log, dan batas biaya. Alternatif di VPS existing **hanya** bila Anda dapat membuktikan reserve produksi aman dan menyediakan cgroup CPU/mem/disk/network serta stop otomatis, tanpa memberikan akses Docker root kepada bcagent. Jangan restart/deploy/mengubah firewall/konfigurasi produksi sebelum izin eksplisit pemilik. Mohon kirim spesifikasi hardware, bandwidth guaranteed, port, identitas endpoint staging, estimasi biaya dan jendela QA.

## C. Proposal gate numerik (BELUM DISETUJUI; JANGAN EKSEKUSI)
Urutan **20 -> 50 -> 100 -> 150**. Setiap tahap 2 skenario terpisah: (P) 1 host/pemandu publish audio+video 720p dan N-1 subscriber mic/cam OFF; (S) 1 host + 5 speaker aktif audio+video 720p dan sisanya pasif. Rekaman/Egress diuji terpisah jika disetujui karena menambah beban. Generator harus benar-benar membuat N identitas unik dan mencatat kapasitas peak, bukan jumlah publisher+subscriber yang dijumlah ganda. Durasi minimum 15 menit steady state setelah ramp selesai dan 3 ulangan pada N=150; reconnect 10% peserta dengan jaringan terputus 5 detik; device QA nyata ditambahkan di gate browser.

| Ukuran | Kriteria PASS per skenario/tahap (usulan) |
| --- | --- |
| Join | >=99% sukses, tanpa kegagalan sistemik, p95 join <=8s; 150: minimal 149/150 sukses, **tetapi target nominal 150 harus hadir simultan** agar kapasitas 150 terbukti |
| Reconnect | >=99% pada percobaan, p95 pulih <=10s |
| Transport | packet loss p95 <=1%, burst <=2% selama <=10s; RTT p95 <=150ms (klien dan jaringan penguji terukur); jitter p95 <=30ms |
| Media | >=99% sesi menerima audio dan video yang seharusnya diterima, tidak ada freeze >2s pada >1% observasi; audio valid dan 720p video diterima ketika aktif. Statistik sintetis tidak membuktikan kenyamanan pengguna nyata |
| Server | CPU p95 <=70%, p99 <=85%, RAM peak <=80% limit cgroup dan MemAvailable host >=4096 MiB, tidak OOM/restart; NIC TX p95 <=60% dari kapasitas link terukur, peak <=70% |
| Stability | >=15 menit steady state, 0 crash/OOM, 0 kegagalan produksi/health; semua metrik terukur dan bukti log lengkap |
| Cleanup | Semua room/participant/token QA dibersihkan, egress stopped, tidak ada leak; 0 artefak secret di log |

**Aturan FAIL:** satu threshold terlampaui atau metrik hilang/tidak dapat dipercaya -> FAIL atau INCONCLUSIVE; tidak naik stage. Tahap N lulus hanya jika P dan S keduanya lulus. Tidak boleh mengekstrapolasi keberhasilan satu host menjadi pengalaman 150 perangkat/browser riil; verifikasi mobile/desktop dan beragam ISP diperlukan sebelum perubahan produksi.

## D. Template laporan evidensi PR #222
| Stage | Timestamp WIB/UTC | Commit & konfigurasi | Skenario | Peak concurrent | CPU p95/max | RAM peak/available min | TX/RX Mbps | Loss p95 | Jitter p95 | RTT p95 | Join successful/attempted, p95 | Reconnect success,p95 | Audio/video | 15m stable | Cleanup | PASS/FAIL/INCONCLUSIVE | Temuan & tindakan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | Belum dijalankan | - | P/S | - | - | - | - | - | - | - | - | - | - | - | - | NOT RUN | staging dan pengaman belum disetujui |
| 50 | Belum dijalankan | - | P/S | - | - | - | - | - | - | - | - | - | - | - | - | NOT RUN | menunggu stage 20 |
| 100 | Belum dijalankan | - | P/S | - | - | - | - | - | - | - | - | - | - | - | - | - | NOT RUN | menunggu stage 50 |
| 150 | Belum dijalankan | - | P/S | - | - | - | - | - | - | - | - | - | - | - | - | NOT RUN | menunggu stage 100 |

**Kesimpulan 2026-11-04:** kapasitas aman **terbukti secara uji media = belum ada angka** (bukan 50/100/150); batas produksi tetap pada nilai aktual yang dikonfirmasi operator, tidak dinaikkan. Gate A belum selesai; B belum tersedia/disetujui; C tidak dijalankan. Tahap berikut: perbaiki skrip fail-closed dalam PR implementasi draft, uji negative guard tanpa network/media, review admin staging, minta approval eksplisit A+B dan kriteria C, baru lanjut tes terisolasi. **Tidak merge, restart, deploy, atau load production.**
