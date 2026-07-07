# BahasaCerdas — Konsolidasi Alat AI Guru

Tanggal: 8 Juli 2026 · Branch: `fix/ai-tools-consolidation` (basis: main produksi terbaru)

## 1. Masalah Awal

Fungsi AI guru hidup di dua implementasi berbeda:

- **`/guru/rpp-modul`** — generator RPP lama berbasis job (`POST /api/ai/rpp` → poll `/api/ai/rpp/{jobId}`), urutan provider Gemini→DeepSeek→Groq. **Stabil tapi hasilnya tidak maksimal** (prompt singkatan "Bhs Indo", tanpa quality check).
- **`/guru/ai-tools`** — workspace agent modern (`POST /api/ai/agents/run` + `/stream`, registry `src/ai/`, 9 agent, kuota kredit, export DOCX/PDF/PPTX). **Kualitas prompt terbaik tapi sering gagal**.
- Ditambah: 4 sub-halaman lama di dalam ai-tools (`eyd`, `feedback`, `grading`, `text-analysis`) yang **melewati** sistem agent dan memanggil endpoint terpisah sendiri (`/api/ai/eyd` dst.), sidebar guru menampilkan **dua menu** ("RPP & Modul" + "AI Tools"), dan 3 shortcut beranda menuju generator lama.

### Root cause instabilitas AI Tools (hasil audit)

1. **Timeout provider 30 detik** di `agent-runner.ts` dan `agent-stream-runner.ts` — generasi RPP/PPT/Soal 8000 token di DeepSeek (provider prioritas pertama) butuh lebih dari itu → request di-abort di tengah, fallback ke Groq `llama-3.1-8b` yang lebih lemah → validasi schema gagal.
2. **Tanpa `maxDuration`** di route `run`/`stream` — fungsi serverless Vercel memutus generasi panjang di tengah.
3. **Validasi Zod ketat tanpa jalur penyelamatan** — kalau JSON model meleset dua kali, user kehilangan seluruh hasil (endpoint lama justru punya fallback `{title, description: teksMentah}`).

## 2. Keputusan

Satu sumber kebenaran: **UI `/guru/ai-tools` + endpoint `POST /api/ai/agents/run` (+ `/stream`) + registry `src/ai/`**. Semua jalur lain menjadi shortcut/redirect. Tidak ada prompt RPP kedua yang hidup.

## 3. Perubahan

### Konsolidasi route & navigasi
| Lama | Sekarang |
|---|---|
| `/guru/rpp-modul` (generator 911 baris) | Redirect → `/guru/ai-tools?tool=rpp-modul` |
| `/guru/ai-tools/eyd` (form + `/api/ai/eyd`) | Redirect → `/guru/ai-tools?agent=eyd` |
| `/guru/ai-tools/feedback` | Redirect → `/guru/ai-tools?agent=feedback` |
| `/guru/ai-tools/grading` | Redirect → `/guru/ai-tools?agent=grading` |
| `/guru/ai-tools/text-analysis` | Redirect → `/guru/ai-tools?agent=text-analysis` |
| Sidebar "RPP & Modul" → `/guru/rpp-modul` | Shortcut → `/guru/ai-tools?tool=rpp-modul` (menu "AI Tools" tetap) |
| 3 tombol "Buat RPP" di beranda guru | Shortcut → `/guru/ai-tools?tool=rpp-modul` (beranda tidak pernah menjalankan AI) |

`/guru/ai-tools` kini menerima **`?tool=`** (alias: `rpp-modul`, `modul-ajar`, `buat-soal`, `buat-ppt`, `review-materi`, `feedback-siswa`, `penilaian-otomatis`, `analisis-teks`, `korektor-eyd`, `asisten`) di samping `?agent=` (id internal: `rpp`, `soal`, `ppt`, `review`, `feedback`, `grading`, `text-analysis`, `eyd`, `bc-assistant`).

### Stabilisasi agent system
- Timeout provider 30s → **120s** (runner & stream-runner).
- `export const maxDuration = 150` di `/api/ai/agents/run`, `300` di `/api/ai/agents/stream`.
- **Jalur penyelamatan**: bila validasi struktur gagal dua kali tapi model menghasilkan konten, hasil dikembalikan sebagai teks siap edit (`result.text`) dengan peringatan — bukan kegagalan total. Kredit hanya terpotong saat ada hasil (perilaku kuota tidak berubah).

### Penggabungan prompt RPP (satu agent utama: `rpp`)
Keunggulan struktur prompt legacy dimasukkan ke `src/ai/agents/rpp-agent.ts`:
- Field output baru (opsional di schema, wajib diisi via prompt untuk Kurikulum Merdeka): `capaianPembelajaran`, `profilPelajarPancasila`, `pemahamanBermakna`, `pertanyaanPemantik`.
- Instruksi lengkap Modul Ajar Merdeka (informasi umum, komponen inti, lampiran LKPD/pengayaan/bahan bacaan/glosarium/daftar pustaka di `editableText`) dan K13 (KI/KD/IPK, ABCD, 5M, penilaian sikap-pengetahuan-keterampilan).

### Endpoint yang di-deprecate (masih berfungsi, tanpa pemanggil di UI)
`/api/ai/rpp`, `/api/ai/rpp/[jobId]`, `/api/ai/eyd`, `/api/ai/feedback`, `/api/ai/grading`, `/api/ai/text-analysis` — semua diberi komentar `Deprecated: AI generation is centralized in /guru/ai-tools`. Hapus setelah dipastikan tidak ada pemanggil eksternal.

**Tetap aktif (bukan duplikat tool guru):** `/api/ai/soal` = backend fitur Bank Soal (generate-dan-simpan ke bank; tool "Buat Soal" di Alat AI memakai agent `soal` via agents/run); `/api/ai/chat` = asisten murid/publik (`/murid/ai`, `/ai-bc`, `/arena/ai`); `/api/ai/ilustrasi`, `/api/ai/quota/status`, `/api/ai/agents/{saved,export}` = pendukung workspace.

## 4. Daftar Agent Aktif (registry `src/ai/index.ts`)

`rpp`, `soal`, `ppt`, `review`, `feedback`, `grading`, `text-analysis`, `eyd`, `bc-assistant` — semua via `POST /api/ai/agents/run` `{agentId, input}` dengan auth Supabase, rate limit per agent, dan kuota kredit (founder/admin unlimited, tidak berubah).

## 5. File yang Diubah

- `components/dashboard/GuruSidebar.tsx` — menu RPP & Modul jadi shortcut
- `app/(dashboard)/guru/beranda/page.tsx` — 3 shortcut ke Alat AI
- `app/(dashboard)/guru/ai-tools/page.tsx` — alias `?tool=`, chip akses cepat ke `?agent=`
- `app/(dashboard)/guru/rpp-modul/page.tsx` — jadi redirect
- `app/(dashboard)/guru/ai-tools/{eyd,feedback,grading,text-analysis}/page.tsx` — jadi redirect
- `src/ai/agents/rpp-agent.ts` — prompt & schema diperkaya (merge prompt terbaik)
- `src/ai/core/agent-runner.ts` — timeout 120s + salvage teks mentah
- `src/ai/core/agent-stream-runner.ts` — timeout 120s
- `app/api/ai/agents/{run,stream}/route.ts` — `maxDuration`
- `app/api/ai/{rpp,rpp/[jobId],eyd,feedback,grading,text-analysis}/route.ts` — tanda deprecated
- `app/api/ai/soal/route.ts` — catatan konteks (backend Bank Soal)

## 6. Cara Test Manual

1. `/guru/ai-tools` → workspace 9 agent tampil; `?tool=rpp-modul` membuka form RPP otomatis.
2. Form RPP: Kelas VIII, Materi "Teks Deskripsi", Durasi 2 JP, Kurikulum Merdeka → Generate → hasil tampil (streaming), memuat CP, profil pelajar Pancasila, pemahaman bermakna, pertanyaan pemantik, asesmen, diferensiasi, refleksi; tombol Salin/DOCX/PDF berfungsi.
3. `/guru/rpp-modul` → redirect ke `?tool=rpp-modul`.
4. Klik "Buat RPP" di beranda dan "RPP & Modul" di sidebar → keduanya menuju tool RPP di Alat AI.
5. Buka `?agent=eyd/feedback/grading/text-analysis` (atau sub-URL lamanya → redirect) → generate masing-masing.
6. Test juga Buat Soal, Buat PPT, Review Materi, Asisten (bc-assistant).
7. Pastikan: tidak ada 404 `/api/ai/agents/run`, tidak ada loading stuck (fallback non-streaming aktif), error provider tampil jelas, kuota terpotong hanya saat ada hasil.
