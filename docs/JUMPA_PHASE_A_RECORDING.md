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
