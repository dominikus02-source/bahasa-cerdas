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

## Gerbang 1 — pengujian tambahan (3 November 2026)

**Kriteria tetap:** rekaman utuh 100%, semua skenario 3× berturut-turut. Tes fixture saat ini memakai canvas sintetis 3,5 detik dan mengukur total durasi klip ZIP via `ffprobe`. Ambang subtes lama ≥3,0 detik **lebih longgar** daripada kriteria Gerbang 1; subtes PASS tidak berarti Gerbang 1 PASS.

| Skenario fixture | Durasi pemulihan 3 percobaan (detik) | Subtes ≥3,0 detik | Gerbang 1 |
|---|---|---|---|
| Close tab | 2,656 / 2,614 / 2,655 | 0/3 | GAGAL |
| Refresh | 2,650 / 2,658 / 2,644 | 0/3 | GAGAL |
| Offline sementara lalu browser ditutup | 2,620 / 2,612 / 2,692 | 0/3 | GAGAL |
| Kill Chrome | 3,386 / 3,392 / 3,389 pada pengujian sebelumnya | 3/3 | **BELUM LULUS**: kehilangan sebagian durasi, bukan rekaman utuh |
| Storage penuh | Tes quota mock 5/5 menolak write yang tidak aman | 5/5 unit | BELUM TERUJI end-to-end |

Eksperimen tambahan interval 350 ms untuk close tab: durasi 2,621 / 2,607 / 2,531 detik (0/3). Interval 350 ms **dibatalkan** dan kembali ke 750 ms karena overhead MediaRecorder. Tes skenario tambahan sekarang tersedia lewat `JUMPA_QA_SCENARIO=close-tab|refresh|offline|crash node scripts/e2e/jumpa-checkpoint.cjs`.

**Akar masalah:** saat tab ditutup/refresh, perekam segmen aktif dapat dihentikan sebelum `onstop` menulis final WebM ke IndexedDB. Menyimpan lebih sering tidak menjamin seluruh durasi. Saat browser crash, browser lokal tidak dapat memberi jaminan 100% frame terakhir. Untuk jaminan tanpa kehilangan saat host putus, dibutuhkan Egress server-side dan pengujian integrasi. Kontrak Premium Egress sudah ada tetapi belum diaktifkan.

**Keputusan:** Gerbang 1 **GAGAL**, tidak boleh lanjut ke Fase B, C, D atau merge/deploy. Masih perlu tes UI JUMPA asli, penyimpanan penuh E2E, dan penyelesaian arsitektur agar syarat rekaman utuh dapat dibuktikan. Tidak ada perubahan produksi.


## Lanjutan: fail-safe unduhan saat storage penuh

Commit `1a81c4b451b3c6e8f85fa2939a6206107ac76b57` memperbaiki `components/jumpa/local-recording.ts`: kegagalan menulis/finalisasi checkpoint IndexedDB tidak lagi membatalkan `callbacks.onComplete(blob)` ketika blob utama masih tersedia di RAM. Kesalahan checkpoint tetap dilaporkan melalui `onError`; unduhan pengguna tetap ditawarkan. Perubahan ini tidak menyelamatkan blob jika browser sudah mati.

**Status tes: BELUM TERUJI setelah commit** karena perangkat Remote Desktop Commander `DESKTOP-2NM1AUE` offline saat eksekusi. Jangan mengutip hasil typecheck/lint/build dari commit lama sebagai validasi commit ini. Perintah validasi saat PC kembali online: `npm run typecheck`, `npx eslint components/jumpa/local-recording.ts`, `npm run build`, `node scripts/e2e/jumpa-recording-quota.cjs`, dan ulangi semua mode `JUMPA_QA_SCENARIO` 3×; tes storage penuh UI JUMPA tetap harus ditambahkan. **Gerbang 1 tetap GAGAL.**
