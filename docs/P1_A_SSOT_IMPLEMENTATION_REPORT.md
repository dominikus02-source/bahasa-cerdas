# P1-A IMPLEMENTATION REPORT — Guru Data SSOT Migration

> Komplemen dari `docs/GURU_DATA_SSOT_AUDIT.md`. Status: **SELESAI**. Mode: **ADDITIVE ONLY / NO COMMIT / NO PUSH**.

## 1. Ringkasan Eksekutif

Semua target P1-A dari audit selesai: SSOT diperluas (Gap 1 & Gap 2), guard route guru
diseragamkan ke `isTeacherOrStudent()`, population kelas/murid dikonsolidasi ke helper SSOT,
SPECIAL CASE `role:"member"` dipertahankan dan terdokumentasi, dan TEST 1–8 ditambahkan ke
`scripts/test-guru-phase.ts` (semua lulus). Tipe data/response contract tetap, ownership
dibuat konsisten, tidak ada tabel/kolom baru, tidak ada route dihapus.

## 2. Scope & Prinsip

| Prinsip | Status |
|---------|--------|
| ADDITIVE ONLY (tidak delete/hapus) | ✅ |
| Ownership check tetap dipertahankan | ✅ |
| Response contract kompatibel | ✅ |
| No migration DB / no schema change | ✅ |
| Bahasa Indonesia UI | ✅ (tidak menyentuh UI) |
| No commit / no push | ✅ (working-tree hanya) |

## 3. Phase A — SSOT Extension (`lib/teacher/students.ts`)

**Gap 1 — projection murid sempit** → `getTeacherGroups` kini memakai `STUDENT_SELECT`
(menambah `xp`, `level`, `streak`, `league`, `lastActiveAt`, `profile{noAbsen,nisn}`).
Konsumen `/api/guru/siswa` tidak kehilangan data yang sebelumnya tersedia.

**Gap 2 — `take: 50` internal memotong population** → signature baru:

```ts
getTeacherGroups(teacherId: string, take?: number | null)
// undefined → { take: 50 }   (default, UI jalur-hangat)
// null       → {}            (population, tidak terpotong)
// number     → { take: N }
```

Backward-compatible — konsumen existing (game-hub, analytics, SimulationAnalyticsService)
tetap berjalan tanpa perubahan panggilan.

## 4. Phase B–G — Migration Summary

| Phase | Jumlah route | Klasifikasi |
|-------|-------------|-------------|
| **B** Guard/auth konsisten | 16 route → `isTeacherOrStudent` | migrasi guard |
| **C** Population kelas | `nilai/stats`, `buat-assessment`, `kelasku/[id]` | hilangkan take:50 → SSOT / `getTeacherGroupDetail` |
| **D** Population murid | `gradebook`, `tinjau-konstruktif`, `dokumen-siswa` | SSOT helpers |
| **E** Analytics/social/literasi | `dashboard/social`, `literasi/stats`, `hasil-karya/leaderboard` | SSOT + `role:"member"` SPECIAL CASE |
| **F** nilai guard & role member | `nilai`, `nilai/bulk`, `nilai/export`, `nilai/auto-populate`, `nilai/kuis-grade` | guard SSOT + SPECIAL CASE |
| **G** WRAPPER lain | `pengumuman`, `pengumuman/[id]`, `siswa/[id]` | guard SSOT + population via SSOT |

Rincian per-file di `docs/GURU_DATA_SSOT_AUDIT.md` §12 (rencana) dan daftar file dibawah.

## 5. SPECIAL CASE `role:"member"` — Dipertahankan

Audit Phase 7 mengkonfirmasi `GroupMember.role === "member"` adalah semantik sah yang dipakai
untuk hitungan nilai/leaderboard. Dipertahankan persis, dengan komentar `// Pertahankan
semantik role:"member" (SPECIAL CASE, audit Phase 7) —` di 6 lokasi:

| Lokasi | Bentuk |
|--------|--------|
| `nilai/stats` L31 | `groupMember.count({ where: { groupId, role: "member" } })` |
| `nilai/export` L32 | `groupMember.findMany({ where: { groupId, role: "member" } })` |
| `nilai/auto-populate` L39 | `groupMember.findMany({ where: { groupId, role: "member" } })` |
| `dashboard/social` L46 | `g.members.filter((m) => m.role === "member")` (SSOT-provided) |
| `literasi/stats` L60 | `scoped.flatMap(...role === "member")` (SSOT-provided) |
| `hasil-karya/leaderboard` L170 | `guruGroups.flatMap(...role === "member")` (SSOT-provided) |

## 6. Static Security Checks (§14) — BEFORE → AFTER

| Check | BEFORE | AFTER |
|-------|--------|-------|
| Route guru memakai SSOT guard | 18 file | **45 file** |
| `const isTeacher` guard lokal | ~5 | **0** |
| `db.groupMember.findMany` (scope guru) | 12 | 5, semua KEEP/SPECIAL CASE |
| `db.group.findMany/findFirst` (scope guru) | 27 | 7, semua ownership-validasi |
| `role: "member"` (filter guru+group) | 6 | 6, semua terdokumentasi SPECIAL CASE |
| `take: 50` population-source | 2 (`nilai/stats`, `buat-assessment`) | **0** |
| Helper duplikat (getTeacherStudentsV2 dkk.) | 0 | **0** |
| `role === "GURU"` guard non-SSOT | ~14 | 20 tersisa di route **luar scope** (materi/panduan/soal/soal-set/buat-tka/withdraw/karya-comment) |

> 20 guard `role !== "GURU"` yang tersisa berada di route yang **bukan target P1-A** (Bank Soal,
> Materi, Panduan, Withdraw, Karya-Comment) — sebagian memang membutuhkan logika GURU-spesifik
> (mis. withdraw hanya guru), sebagian KEEP per audit §9.2. Dicatat sebagai remaining risk, tidak
> diubah (ADDITIVE ONLY).

## 7. TEST 1–8 — Hasil

`npx tsx scripts/test-guru-phase.ts` → **SEMUA LULUS** (110+ assertions, termasuk 8 TEST baru):

| Test | Assertion | Hasil |
|------|-----------|-------|
| TEST 1 | Guru melihat hanya murid kelas miliknya | ✅ |
| TEST 2 | Guru A tidak dapat melihat murid Guru B (ownership) | ✅ |
| TEST 3 | ADMIN/founder tanpa false-403 (28 route) | ✅ |
| TEST 4 | Kelas inactive tidak masuk population | ✅ |
| TEST 5 | Duplicate student lintas kelas dihitung sekali | ✅ |
| TEST 6 | Population tidak terpotong take:50 | ✅ |
| TEST 7 | `role:"member"` legit tidak rusak (6 lokasi) | ✅ |
| TEST 8 | Response contract kompatibel | ✅ |

## 8. QA Gates

| Gate | Hasil |
|------|-------|
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (route + lib + test yang diubah) | ✅ 0 violations |
| `test:guru-phase` | ✅ SEMUA LULUS |
| `test:gamification-engine` | ✅ SEMUA LULUS |
| `test:simulation-workflow` | ✅ 65/65 |
| `test:phase-simulation-workflow` | ✅ 65/65 |
| `npm run build` (dummy env) | ✅ Sukses |

## 9. Remaining Risk / Out-of-Scope

1. **20 guard `role !== "GURU"` di route Bank Soal/Materi/Panduan/Withdraw/Karya-Comment**
   — bukan target P1-A; beberapa memang GURU-only by design (withdraw). Perlu keputusan terpisah.
2. **`dokumen-siswa` legacy fallback** tetap dipertahankan (P2, dokumentasi).
3. **Bypass ownership ADMIN/founder `penugasan/[id]`** — tidak diubah (P2, kebijakan lama).
4. **`group/[id]/claim` & `group/[id]`** tanpa role check — pre-existing (P2).
5. **Performa**: projection `getTeacherGroups` lebih lebar → dampak kecil pada game-hub/analytics;
   dimitigasi dengan param `take` (UI tetap 50).

## 10. Kesimpulan

P1-A selesai: satu sumber kebenaran data guru→kelas→murid (`lib/teacher/students.ts`),
guard konsisten untuk GURU|ADMIN|founder, population tidak terpotong, SPECIAL CASE
terdokumentasi, dan TEST 1–8 menahan regresi. Semua perubahan ada di working tree,
belum di-commit, belum di-push.

**NO COMMIT / NO PUSH**
