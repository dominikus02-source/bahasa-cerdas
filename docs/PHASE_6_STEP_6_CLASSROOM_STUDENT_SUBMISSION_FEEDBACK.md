# PHASE 6 STEP 6 — BC Classroom Student Submission & Feedback Experience

> Status: **IMPLEMENTED** — status murid konsisten (link terkirim = "Sudah
> dikumpulkan"), tempel link karya + contoh, notifikasi dengan nama guru,
> deep-link benar, evidence jujur. 0 endpoint baru. NO COMMIT (Founder Review).

---

## 1. Current Flow (sebelum 6.6)
6.1–6.5: kelas murid menampilkan stream + status; kerjakan page mendukung
upload file; feedback tampil saat DINILAI. Gap: (a) status murid saat praktikUrl
terisi tapi status teknis IN_PROGRESS tampil "Sedang dikerjakan" — TIDAK
konsisten dengan hitungan guru ("sudah mengumpulkan"); (b) tidak ada UI
"tempel link karya" (API menerima URL tapi UI hanya upload file); (c)
notifikasi tanpa nama guru.

## 2. Audit Findings
- `POST /api/murid/penugasan/[id]/praktik` menerima URL (validasi http/https
  sudah ada sejak 6.1) — UI belum memanfaatkannya.
- Status: `PenugasanSubmission.status` tetap IN_PROGRESS setelah praktik
  (draft vs submitted tidak dibedakan di backend; keputusan: praktikUrl =
  submitted, konsisten dengan hitungan guru).
- Notifikasi: penugasan/quiz assign body generik "Guru mengirim..." tanpa nama.
- Evidence: hanya quiz (BANK_SOAL contract, 6.3) — praktik tidak boleh
  mengarang evidence (dijaga).

## 3. Existing APIs Reused
`POST /api/murid/penugasan/[id]/praktik` (link) · `POST .../submit` ·
`GET /api/murid/kelasku/[id]` · notifikasi routes 6.1/6.2 · quiz evidence 6.3.

## 4. Student Flow Before
Buka kelas → lihat status (kadang salah) → kerjakan → upload file saja →
"Menunggu review".

## 5. Student Flow After
Buka kelas → status benar (Belum/Sedang/Sudah dikumpulkan/Dinilai) →
kerjakan → **upload file ATAU tempel link** (YouTube/Canva/Drive/website) →
Simpan Link → "Berkas terkirim · Menunggu review" → nilai + feedback → notif
"Tugas Dinilai".

## 6. Submission Flow
Upsert (idempoten) — resubmit aman; praktikUrl = submitted; DINILAI bila
praktikDinilai.

## 7. Status Model (server-derived)
- `praktikUrl` ada & belum dinilai → **Sudah dikumpulkan**
- `praktikDinilai` → **Sudah dinilai** (+nilai)
- status IN_PROGRESS tanpa link → **Sedang dikerjakan**
- tanpa submission → **Belum dikerjakan**

## 8. Feedback
Catatan guru tampil di: kartu kelas murid ("Feedback guru") saat DINILAI ·
halaman kerjakan ("Catatan guru") · notifikasi "Tugas Dinilai" (nilai +
catatan). Tidak ada feedback AI palsu.

## 9. Notification
- Tugas baru: `Dari {Nama Guru}: "judul"` → /arena/tugas.
- Latihan baru: `Dari {Nama Guru}: "judul"` → /murid/tugasku.
- Tugas dinilai: `"judul" sudah dinilai: N` (+catatan) → /arena/tugas/[id]/kerjakan.
- Deep-link semua benar (diperiksa).

## 10. LearningEvidence
Quiz → BANK_SOAL evidence (6.3, kontrak valid). Praktik/tugas link TIDAK
menulis evidence (kontrak penilaian skill belum tersedia — NO fake evidence).

## 11. Security
- Status/nilai/feedback: server-derived (client tidak mengirim).
- URL divalidasi server (http/https; javascript: ditolak) + hint client.
- Membership: server-side (403 non-member).

## 12. Mobile
Input link full-width + tombol Simpan Link ≥44px; CTA bawah sticky
(safe-area) — bottom nav 5.0 utuh.

## 13. Light/Dark
Token bc-student (violet) light/dark; halaman kerjakan sudah dark: variant
existing.

## 14. Tests
| Check | Hasil |
|---|---|
| `npm run test:bc-classroom-student-submission` (BARU) | ✅ 26/26 |
| 6.0 37/37 · 6.1 30/30 · 6.2 28/28 · 6.4 28/28 · 6.5 25/25 | ✅ |
| guru-phase · student-home 61/61 · my-day-home 37/37 · mobile-navigation 48/48 · arena-web 56/56 · premium-economy · gamification-engine | ✅ SEMUA LULUS |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` / `git diff --check` | ✅ 0 · ✅ 0 · ✅ exit 0 · ✅ bersih |

## 15. Protected Zones
**0 DIFF** (prisma, gamification, learning-loop, adaptive, learner-state,
diagnostic, arena, coins, apk, player).

## 16. DB Status
READ ONLY untuk fase ini — 0 migration, 0 seed. (Runtime flow existing tetap
menulis submission/evidence seperti kontrak 6.1/6.3.)

## 17. Known Limitations
1. Draft vs submitted tidak dibedakan di backend (praktikUrl langsung
   dianggap "sudah dikumpulkan") — konsisten dengan hitungan guru; pemisahan
   draft eksplisit butuh desain + approval.
2. Link disimpan sebagai URL polos (tanpa thumbnail/title fetch).
3. "Simpan Link" menyimpan langsung (belum ada tombol Kumpulkan terpisah).

## 18. Future Improvements
- Simpan (draft) vs Kumpulkan (final) dengan status eksplisit.
- Karya → "Jadikan Karya" (StudentKarya + sumber).
- Preview thumbnail tautan (opsional, tanpa hosting video).

## 19. Founder Acceptance
- S1 kerjakan tugas: Kelas → Kerjakan → selesai ✅
- S2 kirim karya: Tempel link → Simpan Link → "Berkas terkirim" ✅
- S3 status: kartu kelas langsung jelas ✅
- S4 feedback: nilai + catatan guru di kartu & halaman tugas ✅
- S5 guru: Today View → Lihat Pengumpulan ✅ (6.4)
- S6 BC memahami: quiz → evidence valid → LearnerState → personalization ✅ (6.3)

## 20. Verdict
**GREEN (menunggu Founder Review untuk commit)** — 26/26 test + 12 suite
regression hijau; 0 endpoint baru; protected zones 0 diff; DB read-only.

---

### Git status (NO COMMIT)
```
M app/api/murid/kelasku/[id]/route.ts          (status praktikUrl → dikumpulkan)
M app/api/guru/penugasan/route.ts              (notif "Dari {guru}")
M app/api/guru/quiz/[id]/assign/route.ts       (notif "Dari {guru}")
M app/arena/tugas/[assignId]/kerjakan/page.tsx (tempel link + contoh + hint)
M package.json                                 (+test:bc-classroom-student-submission)
?? scripts/test-bc-classroom-student-submission.ts
?? docs/PHASE_6_STEP_6_CLASSROOM_STUDENT_SUBMISSION_FEEDBACK.md
(+ file STEP 6.0–6.5 yang belum di-commit)
```
