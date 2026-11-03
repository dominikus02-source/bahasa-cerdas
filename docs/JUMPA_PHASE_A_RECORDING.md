# Fase A — Audit dan bukti rekaman JUMPA (3 November 2026)

## Ringkasan kondisi (PR #222, #223)
- PR #222 berisi QA release gates, **draft**; PR #223 prototipe checkpoint IndexedDB, **draft**, berbasis PR #220, belum merge ke main.
- Local recording mengambil layar via getDisplayMedia, audio LiveKit via WebAudio, lalu MediaRecorder. Jalur utama menghasilkan WebM yang diunduh lewat user gesture. Jalur pemulihan membuat segmen WebM finalized di IndexedDB dan menyediakan ZIP.
- **Gap Gerbang 1:** Browser crash dapat menghilangkan segmen aktif. Belum ada bukti 3× berturut-turut untuk close tab, refresh, storage penuh, offline, crash pada UI JUMPA nyata. ZIP klip bukan video tunggal utuh. Tidak boleh mengklaim 100% rekaman lengkap.
- **Risiko:** encoder ganda (CPU/baterai), data rekaman tersimpan lokal sampai dihapus, browser private mode/quota, IndexedDB bisa dibersihkan OS, browser-specific MediaRecorder, pengumuman rekaman saat reconnect.

## Perubahan fase A pada branch PR #223
- `recording-quota.ts`: guard storage.estimate; refuse writes bila >90% quota atau ruang sisa <32 MiB; tidak auto-delete video pengguna.
- `recording-checkpoint.ts`: guard quota pada setiap write, API daftar kelompok rekaman dan penghapusan eksplisit per group.
- `premium-recording-contract.ts`: interface backend Premium LiveKit Egress, belum diaktifkan. TODO entitlement, auth, webhook, private storage, multipart, retention, object integrity.
- `scripts/e2e/jumpa-recording-quota.cjs`: tes Playwright untuk lima kasus kuota.
- Tes crash sebelumnya `scripts/e2e/jumpa-checkpoint.cjs`: 3 kali kill Chrome + restart + ffprobe; ini tes segmen sintetis, **bukan** Gerbang 1.

## Kriteria kelulusan yang tidak boleh diubah
Gerbang 1 memerlukan semua skenario wajib ×3 dengan artefak rekaman utuh dan durasi ffprobe valid. Penyimpanan browser tidak menjamin detik terakhir ketika browser di-kill; arsitektur Premium Egress dapat menyediakan jaminan lebih kuat selama layanan egress hidup. Tidak boleh merge/deploy sebelum bukti gerbang lengkap.

## Rencana uji lanjutan
1. Playwright fixture integrasi JUMPA: close tab, refresh, offline, kill browser, storage penuh; 3× masing-masing; simpan file/ffprobe/log dan pastikan penguji negatif gagal.
2. Perbaiki flow UI untuk memilih dan menghapus sesi pemulihan; tes privasi dan kuota dengan profil baru.
3. Typecheck, lint, build, CI; jika seluruh gerbang lulus, lanjut Fase B. Jika tidak, laporkan blocker dan jangan deploy.

## Eksekusi ulang dengan gerbang terbaru — 3 November 2026

Branch integrasi `release/jumpa-qa` berasal dari main `59293b6f`.
PR Fase A memakai branch `fix/jumpa-phase-a-gate`; dependensi prototipe #220/#223
ikut dalam diff karena belum masuk main. Tidak ada push ke main.

Pilihan arsitektur Free: (a), satu MediaRecorder dengan timeslice 5 detik.
Potongan disimpan berurutan dari header pertama, transaksi IndexedDB strict
memperbarui potongan dan jumlah secara atomik. Tidak memakai encoder safety kedua.
Penyimpanan gagal menghentikan perekaman segera; cadangan kuota hanya boleh dipakai
chunk akhir. Lifecycle meminta flush ketika tersembunyi dan stop saat pagehide.
Metadata durasi berasal dari decoder media browser, bukan waktu dinding. Perbaikan
metadata menolak container dengan seek table/ukuran segment yang belum didukung.

`NEXT_PUBLIC_JUMPA_CAPTURE_ENABLED=1` hanya untuk build QA. Default mati; ini flag
build-time sehingga mengganti env runtime saja tidak menyalakannya. Premium Egress
belum diimplementasikan, tidak dipanggil, dan BELUM SIAP. Interface yang ada tetap
menjadi desain awal. Tidak ada klaim upload progresif/resumable sudah tersedia.

Penguji `scripts/e2e/jumpa-recording-gate.cjs` memakai recorder produksi asli,
IndexedDB asli dan Chrome nyata dengan fake-media flags. Transport room disimulasikan:
ini bukan bukti login QA, LiveKit end-to-end atau perangkat nyata. Tujuh skenario
(close/reload/end/offline/quota/renderer crash/process kill) masing-masing tiga kali.
`end` di sini memanggil stop recorder; aksi akhiri rapat penuh masih BELUM TERUJI.
Durasi sumber 6,4 detik, timeslice 5 detik; batas hard-crash tetap <=7 detik.
Untuk sumber sintetis 15fps, penguji mengunci toleransi encoder 150ms sebelum uji,
serta mewajibkan penanda finalisasi graceful; ini tidak boleh ditafsirkan sebagai
jaminan 100% detik terakhir. ffprobe harus mengembalikan durasi finite >0.
Kesalahan decoder ffprobe juga dicatat dan menggagalkan penguji (ditambahkan saat
audit harness, bukan pengurangan kriteria). Skenario gagal tetap memblokir fase B.

Perintah QA:
```
node scripts/e2e/jumpa-recording-gate.cjs
# Mutasi wajib exit 1 dan error RECORDING_CHECKPOINT_EMPTY, bukan error infra:
JUMPA_QA_MUTATE_NO_TIMESLICE=1 JUMPA_QA_SCENARIOS=kill node scripts/e2e/jumpa-recording-gate.cjs
```
Windows PowerShell: atur variabel dengan `$env:NAMA='nilai'` sebelum perintah Node.
CI mengunggah JSON hasil dan WebM sebagai artifact. Chrome/Chromium, Playwright
1.60.0, esbuild 0.28.2, dan ffprobe diperlukan; alat browser hanya dipasang dalam
job QA, tidak menambah dependensi runtime aplikasi.
