# LEARNING LOOP AUDIT — Sprint 5 (Aug 1, 2026)

Audit alur BahasaCerdas untuk menemukan **dead end**: halaman/layar yang tidak
mengarahkan user ke langkah berikutnya. Tujuan: setiap aktivitas selesai →
user selalu tahu apa yang harus dilakukan selanjutnya (belajar → berlatih →
berkarya → berinteraksi → berkompetisi → umpan balik → belajar lagi).

## Dead End Ditemukan

| # | Lokasi | Masalah | Severity |
|---|--------|---------|----------|
| 1 | `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx` (phase `complete`, baris 296–365) | Setelah unit selesai hanya ada "Kembali" dan "Ulangi". Tidak ada tombol lanjut ke unit berikutnya. | **Tinggi** |
| 2 | `app/arena/jalur-cerdas/page.tsx` (kotak `allDone`, baris 177–183) | Teks "Siap untuk UKBI!" tanpa tombol apa pun. User selesai 72 unit lalu buntu. | **Tinggi** |
| 3 | `components/kompetensi/TestResultPanel.tsx` (baris 257–263) | Tombol "Dokumen Hasil Latihan" hardcode `/murid/dokumen-latihan` — guru salah diarahkan ke halaman murid. | **Tinggi** |
| 4 | `app/(dashboard)/murid/tugasku/[assignId]/result/page.tsx` | Halaman hasil kuis tanpa CTA apa pun setelah kartu skor. | Sedang |
| 5 | `app/arena/tugas/[penugasanId]/kerjakan/page.tsx` (phase `done`) | Hanya "Kembali ke Tugas". Tidak ada ajakan lanjut belajar. | Sedang |
| 6 | `app/arena/misi/page.tsx` ("Cara Dapat Koin") | Cara mendapat koin dijelaskan tanpa tautan ke fitur terkait (tulis karya, feed, dsb.). | Rendah |
| 7 | `app/arena/league/league-tabs.tsx` | Papan peringkat tanpa ajakan beraktivitas untuk menaikkan peringkat. | Rendah |
| 8 | Game end screens (`app/arena/game/*`) | Restart/kembali saja; belum ada CTA lintas fitur (ditunda — butuh game server hidup). | Rendah |

## Root Cause Umum

1. **Tidak ada "lapisan next-action"** yang dipakai semua layar completion —
   tiap layar mengimplementasikan CTA-nya sendiri (atau tidak sama sekali).
2. **Tidak ada catatan aktivitas/skill terpusat** — sistem tidak tahu aktivitas
   terakhir user, sehingga tidak bisa merekomendasikan langkah berikutnya yang
   personal.
3. **Bug sisa refactor dashboard** — path dokumen hasil latihan salah di panel
   guru (TestResultPanel).

## Solusi (diimplementasikan)

1. **Learning Loop Engine** (additive): 6 tabel baru + 3 enum —
   `LearningSkill`, `PlayerActivity`, `LearningJourney`, `LearningRecommendation`,
   `PlayerCTA`, `LearningInsight` (lihat `prisma/migrations/manual/2026-08-01_learning_loop.sql`).
2. **PlayerCTA** = satu "Aksi Berikutnya" terbaik per user, disegarkan otomatis
   tiap `recordActivity()` → dipakai semua layar completion & beranda arena.
3. **Recommendation Engine** berbasis skill terlemah (rule-based, 7 skill).
4. **Mentor harian** (rule-based insight) di `LearningInsight`.
5. **Dinamisasi misi harian**: pilihan quest menyesuaikan aktivitas 7 hari
   terakhir (prefer menulis jika belum ada karya minggu ini, dsb.).
6. Perbaikan bug path dokumen hasil latihan untuk guru.
7. CTA langsung di tiap dead end yang ditemukan.

## Yang Tidak Dilakukan (sengaja)

- Game server mati → layar game belum dipasangi CTA lintas fitur (menunggu
  revival VPS; kerangka `PlayerCTA` sudah siap).
- Tidak ada panggilan LLM eksternal untuk mentor — berbasis aturan agar gratis
  dan tanpa quota.
