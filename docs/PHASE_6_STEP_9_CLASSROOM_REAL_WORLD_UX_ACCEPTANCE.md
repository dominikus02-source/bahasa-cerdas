# PHASE 6 STEP 9 — BC Classroom Real-World UX Acceptance & Polish

> Status: **DONE** — audit 5-second test + polish minimal (error state list
> view, empty caption Nilai). NO COMMIT (menunggu Founder Review).

---

## 1. UX Audit
Audit berbasis kode terhadap `/guru/kelasku` (list & detail), composer,
ClassPicker, Today View, SubmissionReview, tab, empty/error states, light/
dark, mobile, a11y — sesuai spec §4–§18.

## 2. Temuan
| Area | Temuan | Aksi |
|---|---|---|
| 5-second test (list) | Kelas tampil jelas; "+ Tambahkan" primary; "Perlu perhatian" ada di dalam kelas (Today View) — lintas kelas tidak diagregasi (tanpa endpoint baru, sesuai batasan) | OK — dokumentasi |
| Primary action | `+ Tambahkan` (emerald, 48px) > Buat Kelas (secondary) | OK |
| Class card | Nama/jenjang/siswa/kode/salin/hapus — minimal, sesuai §6 | OK |
| Detail kelas | Today View pertama (Perlu perhatian → Sedang berjalan → Kirim Lagi → + Tambahkan) → Aktivitas stream | OK |
| **Error state list view** | `setError("Kelas tidak bisa dimuat...")` TIDAK dirender di list view (hanya di modal create) → guru tidak tahu fetch gagal | **FIXED** |
| **Empty caption Nilai** | Rata-rata tampil "—" tanpa penjelasan | **FIXED** (caption "Belum ada nilai") |
| Hardcoded colors | Tidak ada (token semantik; `text-white` hanya di check icon accent) | OK |
| A11y | aria-label/focus-visible/pressed ada; touch ≥44px | OK |
| Direct-send labels | Materi Ajar/Buku Ajar "Kirim ke Kelas" · Bank Soal "Kirim Latihan ke Kelas" | OK |

## 3. Perubahan yang Dilakukan (minimal, polish only)
1. **Error state list view**: kartu "Kelas belum dapat dimuat. Periksa koneksi
   lalu coba lagi." + CTA **Coba Lagi** (re-fetch) — manusiawi, tanpa raw
   error.
2. **Tab Nilai**: saat `nilaiRata` null → caption "Belum ada nilai. Nilai
   muncul setelah tugas dinilai."

## 4. Perubahan yang Sengaja TIDAK Dilakukan
- Agregasi "Perlu perhatian" lintas kelas di halaman list (butuh perubahan
  API/performance — di luar polish; tersedia di dalam kelas).
- Statistik tambahan di class card (spec §6: minimal).
- Perubahan backend/engine apa pun.

## 5. Founder Acceptance Scenarios (diverifikasi via kode & regression)
- S1 Open Classroom: list → kartu → detail (Today View) — 2 klik ✅
- S2 Send Material: + Tambahkan → Materi → pilih → kelas (auto) → Kirim ✅
- S3 Multi-class: ☑ 7A ☑ 7B ☑ 7C → "Kirim ke 3 Kelas" ✅
- S4 Direct Send: Materi Ajar → Kirim ke Kelas ✅
- S5 Belum mengerjakan: kelas → Perlu perhatian → Lihat Pengumpulan (2 langkah) ✅
- S6 Grade: Pengumpulan → murid → nilai → Simpan Penilaian ✅
- S7 Resend: Kirim Lagi (kelas terakhir auto) ✅
- S8 Student: aktivitas/tugas/latihan/materi/status/feedback ✅ (6.1–6.6)

## 6. Desktop Result (1280px)
**NOT EXECUTED — browser unavailable** (environment tanpa browser/device).

## 7. Mobile Result (375px)
**NOT EXECUTED — browser unavailable.**

## 8. Light Result
**NOT EXECUTED — browser unavailable** (token light diverifikasi statik).

## 9. Dark Result
**NOT EXECUTED — browser unavailable** (token dark diverifikasi statik).

## 10. Regression Result
| Suite | Discovered | Executed | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| 6.0–6.7 (8 suite) | 233 | 233 | 233 | 0 | 0 |
| guru-phase ✅ · student-home 61 · my-day-home 37 · mobile-navigation 48 · unified-shell 61 · arena-web 56 · gamification ✅ · premium-economy ✅ | | | | | |
| tsc 0 · lint 0 · build exit 0 · diff-check bersih | ✅ | | | | |

Harness tetap `fn()` (dieksekusi) — Discovered == Executed == Passed.

## 11. Protected Zones
**0 diff** (prisma, adaptive, learner-state, gamification, learning-loop,
award-xp, coins, diagnostic, app/api/player, engines, apk).

## 12. DB Status
READ ONLY — 0 migration, 0 seed, 0 write; **0 endpoint baru**.

## 13. Final Verdict
**YELLOW** — kode & regression GREEN (233/233 + global suite), polish minimal
terpasang, protected zones 0 diff, DB read-only. Manual browser acceptance
(desktop/mobile/light/dark) **tidak dapat dieksekusi** di environment ini →
sesuai spec §25, verdict YELLOW sampai browser QA selesai, lalu GREEN.

---

### Git status (NO COMMIT / NO PUSH)
```
M app/(dashboard)/guru/kelasku/page.tsx   (error state list view + caption Nilai)
?? docs/PHASE_6_STEP_9_CLASSROOM_REAL_WORLD_UX_ACCEPTANCE.md
```
