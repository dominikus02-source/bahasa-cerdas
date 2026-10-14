# Audit dan redesain UI AI BC — 14 Oktober 2026

## Cakupan dan bukti sebelum implementasi

Penelusuran route, import, shell, dan pemanggilan API dilakukan sebelum perubahan. Temuan di bawah berasal dari kode aktual; pengujian browser dicatat terpisah setelah implementasi.

| Peran / halaman | File / komponen aktual | Kondisi awal | Masalah terverifikasi | Perbaikan | Risiko fungsi |
| --- | --- | --- | --- | --- | --- |
| Murid `/arena/ai` | `app/arena/ai/page.tsx`, `AiBcArenaWorkspace.tsx` | Composer langsung tersedia, Zelby, SSE, enam saran + hints | Copy berbeda dari brief, saran berulang, area welcome terlalu tinggi; tinggi web hanya mengurangi header meski MuridMobileNav tampil di mobile | Tiga kategori pendek, welcome ringkas, hints melalui disclosure, ukuran viewport mengikuti nav yang terlihat | Pertahankan greeting, props, prompt request, persona server |
| Guru `/guru/ai-bc` | `app/(dashboard)/guru/ai-bc/page.tsx`, `AiBcGuruWorkspace.tsx` | Enam saran, SSE, Zelby | Margin 16px tidak cocok dengan padding shell 14px; width tidak menutup padding kanan; breakpoint lg berbeda dari nav md; minimum 420px melampaui viewport pendek | Ukuran mengikuti shell aktual dan visual viewport, tiga kategori pekerjaan guru | Guard GURU/founder dan pipeline tidak diubah |
| Percakapan kedua peran | Kedua workspace aktif | Markdown GFM, salin, ulangi, reset, loading/error | Duplikasi gaya; gradient kuat; teks kecil; flex child tanpa min-width; pre/code dan tabel belum diberi batas yang cukup; retry tampak aktif ketika streaming | Renderer Markdown dan gaya bersama, token semantik, target sentuh 44px, batas overflow, disabled state | Jangan ubah parser/endpoint/payload atau urutan percakapan |
| Saran kedua peran | Export prompt di workspace + `getBcHints` | Saran utama dan personal langsung ditampilkan | Enam saran per peran plus hints; kelas hover dark salah (`:border-*`) | Tiga saran utama, saran personal tetap dapat dipilih lewat disclosure | Hints tetap berasal dari server; bukan fitur baru |
| Publik `/ai-bc` | `app/ai-bc/page.tsx`, layout publik | Redirect sesuai peran; pengunjung anonim melihat empat fitur | Hero dan kartu memakai warna light hardcoded tanpa token; dekorasi/gradient berlebihan | Token semantik, tombol tenang, karakter resmi bersama | Redirect dan login tetap utuh |
| Murid legacy `/murid/ai` | `app/(dashboard)/murid/ai/page.tsx` | Redirect ke `/arena/ai` | Tidak ada lobby/chat tersendiri | Tidak perlu perubahan | Tidak mengubah redirect |
| Guru `/guru/ai-tools?agent=bc-assistant` / `?tool=asisten` | `alat-ai-client.tsx`, `forms/bc-assistant-form.tsx`, `history-panel.tsx`, `agent-result-panel.tsx` | Tool dengan input pesan/konteks, hasil, streaming agent, simpan/riwayat/export | Label Inggris “AI BC Assistant”; label form tidak terkait id input; gradient dan warna hardcoded pada form | Perbaikan label dan form khusus BC; pertahankan orkestrator hasil/riwayat | Ini pipeline agent, bukan SSE chat BC; tidak digabung |
| Hasil tool BC guru | `StructuredBCAssistant` dalam `agent-result-panel.tsx` | Balasan dirender sebagai satu paragraf dengan whitespace; CTA alat memakai id teknis | Markdown tidak dirender; token/CTA berbeda dari chat BC; kata panjang tidak diberi batas | Terapkan renderer Markdown bersama dan token semantik hanya dalam cabang `bc-assistant`; CTA Bahasa Indonesia dengan callback/id yang sama | Cabang agent lain, props panel, simpan/riwayat/export tetap utuh |
| Komponen legacy | `AiBcModule.tsx` → `AiBcLanding.tsx`, `AiBcChatView.tsx` | Landing empat quick actions; chat lama | Tidak ditemukan import runtime dari route aktif; masih diuji oleh suite kompatibilitas | Dipertahankan, tanpa refactor spekulatif | Jangan hapus fitur/komponen kompatibilitas |
| Entry points / navigasi | `AIFloatingButton`, `AIBCHomeCard`, nav, link Karya/Kamus | Menuju route kanonik; FAB disembunyikan di workspace | Tidak ditemukan kebutuhan perubahan untuk tugas ini | Tetap dipertahankan | Tidak mengubah shell atau nav lain |

## Batas dan hal yang masih perlu diuji

- Kedua workspace menyimpan percakapan di state selama halaman terbuka, tanpa daftar riwayat persisten. Riwayat hasil Alat AI adalah fitur terpisah dan tetap dipertahankan.
- Tidak menyimpulkan provider produksi, ketersediaan DeepSeek, kualitas jawaban live, atau status IDCloudHost dari kode UI.
- Dugaan awal overflow Markdown, overlap nav, dan viewport keyboard perlu direproduksi dengan browser. Keyboard perangkat fisik dan sesi autentikasi produksi harus dilaporkan terpisah dari fixture lokal.
- Kontrak props tetap; tidak mengubah API, auth, role guard, database, persona/system prompt, provider, parser SSE, atau integrasi produksi.

## Rencana implementasi

1. Tambahkan welcome, renderer Markdown, gaya, dan hook viewport bersama khusus AI BC.
2. Terapkan ke dua workspace tanpa menyatukan logika percakapan atau kontrak props.
3. Perbaiki UI publik dan form `bc-assistant` yang terverifikasi.
4. Jalankan suite AI BC, lint, typecheck, build, audit tema dan QA browser fixture (360/390/tablet/desktop, terang/gelap, SSE terkendali).

## Hasil pengujian

### A. Hasil audit

- Guru: `/guru/ai-bc`, `/guru/ai-tools?agent=bc-assistant`, alias `?tool=asisten`; panel hasil, riwayat, orkestrator loading/error/streaming ditelusuri.
- Murid: `/arena/ai`, redirect legacy `/murid/ai`; shell web dan nav APK ditelusuri.
- Publik: `/ai-bc`, metadata/layout dan redirect per peran ditelusuri.
- Komponen aktif bersama: karakter Zelby, parser `streamBcChat`, tipe klien. Komponen legacy Module/Landing/ChatView tidak diimpor oleh route aktif dan tetap dipertahankan. Alat RPP/Soal/Review/EYD/Feedback/Grading/Analisis memakai panel hasil dan riwayat bersama; cabang agent lain tidak diubah.
- Loading/error boundary sudah diwarisi dari `app/arena/loading.tsx`, `app/arena/error.tsx`, loading guru dan error dashboard; tidak ditambah provider/shell baru.

### B. Perubahan

| File | Perubahan |
| --- | --- |
| `components/ai-bc/AiBcArenaWorkspace.tsx` | Headline/deskripsi sesuai brief, tiga saran, label Teman Belajar, composer 16px dan placeholder singkat, token semantik, state retry, tinggi mengikuti viewport |
| `components/ai-bc/AiBcGuruWorkspace.tsx` | Tiga kategori pekerjaan guru, copy ringkas, margin/width sesuai padding shell dan breakpoint md, composer/token yang konsisten |
| `components/ai-bc/AiBcWelcome.tsx` (baru) | Welcome bersama dengan kategori berbeda per peran; hints tetap tersedia dalam disclosure; deduplikasi prompt |
| `components/ai-bc/AiBcMarkdown.tsx` (baru) | Renderer bersama, tabel dengan scroll lokal, heading/paragraf/list/code lebih terbaca |
| `components/ai-bc/ai-bc-workspace.module.css` (baru) | Tema dari token global, aksen violet, focus state, target sentuh, batas overflow dan ukuran kanvas guru |
| `components/ai-bc/useAiBcViewport.ts` (baru) | Ukuran presentasi mengikuti visual viewport dan nav yang terlihat; tidak mengambil data atau mengubah API |
| `app/ai-bc/page.tsx` | Tema semantik, dekorasi/gradient diringkas, karakter resmi dipakai bersama; redirect/login utuh |
| `app/(dashboard)/guru/ai-tools/_components/forms/bc-assistant-form.tsx` | Label/id input, karakter resmi, token, target sentuh, teks Bahasa Indonesia |
| `app/(dashboard)/guru/ai-tools/_components/alat-ai-client.tsx` | Satu perubahan metadata tampilan BC: label/deskripsi; orkestrator tetap |
| `app/(dashboard)/guru/ai-tools/_components/agent-result-panel.tsx` | Renderer/CTA pada `StructuredBCAssistant` dan label status/ulangi khusus BC; callback sama |
| `scripts/test-ai-bc-{arena-ux,guru-ux,theme,ui}.ts`, `scripts/test-theme-consistency.ts` | Assertion mengikuti tiga saran, token semantik, komponen bersama dan layout aktual; role/API checks dipertahankan |
| `scripts/test-ai-bc-browser.mjs` (baru) | QA browser dengan komponen aktual + adapter Next untuk fixture lokal; SSE berasal dari server HTTP lokal |

Koreksi UI saat QA: respons lama tidak boleh mengisi kembali percakapan yang sudah di-reset; callback state sekarang memeriksa abort, dan cleanup unmount membatalkan request. Parser/payload/protokol SSE tidak diubah. Composer dikembalikan ke tinggi awal setelah kirim/reset. Enter saat IME menyusun karakter tidak mengirim pesan.

Tangkapan layar pertama juga mengungkap placeholder mobile terpotong dan utility `w-full` mengalahkan lebar bleed guru. Placeholder dipersingkat; lebar guru kini ditetapkan oleh CSS scoped dengan specificity yang cukup. QA menambahkan assertion untuk kedua regresi itu.

### C. Pengujian

QA tambahan panel hasil telah lulus: heading Markdown, kata panjang, payload form pesan/konteks/mode, callback ke alat yang disarankan dan Tanya ulang tetap berfungsi. Status hasil BC kini “Jawaban AI BC siap”; label cabang agent lain tetap. Build standar dengan perubahan terakhir selesai, exit 0.

| Pemeriksaan | Status | Bukti / batas |
| --- | --- | --- |
| Lint seluruh repo | BERHASIL | `npm run lint`, exit 0; lint terarah juga exit 0 |
| Type-check | BERHASIL | `npm run typecheck`, exit 0 setelah Prisma Client digenerate; kegagalan pertama berasal dari client lokal yang belum sinkron, tanpa perubahan schema |
| Build produksi lokal | BERHASIL | `npm run build`, exit 0 dengan perubahan terakhir; kompilasi, TypeScript, halaman dan tracing selesai. Log: `/tmp/bc-ai-build-release.log`. Peringatan koneksi DB lokal dicatat terpisah di bawah |
| 9 suite AI BC | BERHASIL | Arsitektur 28, persona 42, konteks 19, navigasi 24, UI 54, keamanan peran 106, tema 22, UX murid 45, UX guru 84: 424 pemeriksaan |
| Browser workspace, form dan publik | BERHASIL | 42 skenario, 32 request SSE fixture; 360/390/768/1440px, light/dark, web/APK; 64 screenshot lokal |
| Fungsi chat UI | BERHASIL | Saran utama/personal, deduplikasi, kirim Enter/Shift+Enter, loading/delta SSE dengan frame terbelah, error 503/retry, salin, reset saat streaming, viewport pendek; payload tetap `{messages}` dengan role user/assistant |
| Form/hasil BC dalam Alat AI | BERHASIL | Label input terhubung, payload callback tetap `{message, context, mode: "guru"}`, renderer Markdown dan callback `suggestedAgent` diperiksa dengan fixture lokal |
| Tema global seluruh produk | GAGAL | `test:theme-consistency`: 68/75, tujuh kegagalan di luar UI AI BC; inventaris mencakup premium/tes-awal, layout guru, arena/admin |
| Audit tema hardcoded | GAGAL | Dua blocking di `components/shared/ArticleCoverLightbox.tsx`; file tidak berubah pada tugas ini |
| Harness tema dashboard guru | GAGAL | 171/173; dua assertion hex/rgba di langganan, bank soal, gim, profil; file tidak berubah pada tugas ini |
| Keyboard HP fisik | BELUM DIUJI | Yang diuji browser adalah viewport pendek; bukan keyboard Android/iOS fisik |
| Provider/auth/history produksi | BELUM DIUJI | Fixture tidak memakai auth/database/provider live; build lokal mencatat koneksi DB ditolak (`tenant/user not found`). Ini tidak membuktikan kondisi DB produksi. Riwayat persisten dan ekspor Alat AI ditelusuri di kode, belum dijalankan terhadap produksi |

Validasi tambahan `npm run build -- --webpack` berhasil compile dan menghasilkan halaman statis, tetapi dihentikan sebelum build tracing selesai setelah pemeriksaan TypeScript berlangsung lebih dari 15 menit. Validasi ini tidak diklaim sebagai build selesai. Build standar kemudian selesai dengan exit 0 untuk menghasilkan artefak akhir; tidak ada perubahan konfigurasi build atau database.

Artefak lokal: `/tmp/bc-ai-ui-qa/results.json` dan screenshot di direktori yang sama. Renderer browser memakai adapter Next Image/Link/navigation dan session anonim untuk halaman publik; bukan pengujian E2E autentikasi Next.

Cara mengulang QA (Playwright dan Chrome harus tersedia; tidak ada perubahan dependensi/lockfile proyek):

```sh
AI_BC_PLAYWRIGHT_MODULE=/tmp/bc-ai-qa-deps/node_modules/playwright \
AI_BC_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node scripts/test-ai-bc-browser.mjs
```

### D. Deployment

Status saat audit awal, sebelum instruksi pengguna untuk commit/push:

- Belum commit, push, atau deploy.
- Deployment IDCloudHost **BELUM DIVERIFIKASI**. Push/build lokal bukan bukti deployment.
- Perubahan awal milik pengguna pada auth callback, tes Google role, file audit migrasi, dan helper origin dipertahankan.
- Sisa verifikasi: provider/auth produksi, riwayat/export Alat AI dengan sesi nyata, keyboard perangkat fisik. Utang tema di luar AI BC tetap dilaporkan sesuai batas tugas.

### Verifikasi integrasi rilis setelah instruksi commit/push

- Perubahan dibasiskan pada `origin/main` (`7d3222aa`), di checkout terpisah. Pembaruan headline dan tiga kategori lobby murid di main dipertahankan dalam komponen welcome bersama. Perubahan lokal auth dan audit migrasi tidak disertakan.
- Tes arsitektur di main masih mengharapkan Groq meskipun route aktif sudah mengunci DeepSeek. Dua assertion disesuaikan dengan konfigurasi aktif; kode provider, route, system prompt dan parser tetap sama dengan main.
- Sembilan suite AI BC pada integrasi rilis: **430 pemeriksaan lulus** (suite arsitektur main berisi 34 pemeriksaan). QA browser diulang: **42 skenario, 32 request SSE lulus**.
- `npm run lint` dan `npm run build` pada integrasi rilis: **exit 0**. Build mencakup TypeScript, 454 halaman dan finalisasi. Menggunakan environment placeholder seperti CI, tanpa credential produksi. Log: `/tmp/bc-ai-release-lint.log`, `/tmp/bc-ai-release-main-build.log`.
- Deployment akhir harus dibuktikan oleh workflow untuk commit rilis dan pemeriksaan health publik; hasil push sendiri tidak dianggap bukti deployment.
