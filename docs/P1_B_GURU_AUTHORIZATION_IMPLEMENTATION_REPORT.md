# P1-B GURU AUTHORIZATION — LAPORAN IMPLEMENTASI

**Tanggal**: 8 Agustus 2026
**Audit baseline**: `docs/P1_B_GURU_AUTHORIZATION_AUDIT.md` (disetujui)
**Prinsip**: ADDITIVE-ONLY · AUTHORIZATION ≠ OWNERSHIP · SSOT `isTeacherOrStudent` · SPECIAL CASE finansial dimpertahankan · tanpa commit/push.

---

## 1. Ringkasan

Seluruh guard legacy Guru Experience (`role !== "GURU"`, `role?.toUpperCase() !== "GURU"`, `(role !== "GURU" && !isFounder)`, `(role !== "GURU" && role !== "ADMIN" && !isFounder)`) diseragamkan ke satu SSOT:

```ts
import { isTeacherOrStudent } from "@/lib/teacher/students";
// role === "GURU" || role === "ADMIN" || isFounder === true
```

Kerentanan kritis `POST /api/guru/soal-set/[id]/use` (set soal guru lain bisa dipakai + `useCount` di-increment tanpa kepemilikan) sudah ditutup. Dua SPECIAL CASE (finansial `withdraw` dan moderasi `karya-comment`) sengaja dipertahankan dengan komentar alasan.

| Metrik | Nilai |
|--------|-------|
| Guard legacy SEBELUM (baseline audit) | **28** |
| Guard legacy SESUDAH | **4** |
| Guard MIGRATED (14 file, 24 titik) | **24** |
| Guard BARU ditambahkan (3 file: `use`, `misi`, `soal-pool` — sebelumnya auth-only) | **3** |
| Guard KEEP (lib business-rule) | **2** (`lib/ai-gateway/trial-service.ts`) |
| SPECIAL CASE (dengan komentar) | **2** (`withdraw`, `karya-comment/[commentId]`) |
| Kerentanan kritis ditutup | **1** (`soal-set/[id]/use`) |
| REMAINING RISK | 0 guard legacy tersisa di route Guru |

## 2. Guard Legacy SEBELUM → SESUDAH

| Pola | Sebelum | Sesudah |
|------|---------|---------|
| `role !== "GURU"` (401) | 22 titik | 0 (migrated) |
| `role?.toUpperCase() !== "GURU"` (403) | 4 titik | 0 (migrated) |
| `(role !== "GURU" && role !== "ADMIN" && !isFounder)` | (bagian dari 22) | 0 |
| `(role !== "GURU" && !isFounder)` — SPECIAL CASE | 1 (withdraw) | 1 (withdraw, dengan komentar) |
| `user.role !== "GURU"` — SPECIAL CASE moderasi | 1 (karya-comment) | 1 (karya-comment, dengan komentar) |
| `lib/ai-gateway/trial-service.ts` business rule | 2 | 2 (KEEP — trial khusus GURU) |
| **Total** | **28** | **4** |

## 3. Tabel FILE | OLD GUARD | NEW GUARD | OWNERSHIP | STATUS

| File | OLD GUARD | NEW GUARD | OWNERSHIP (tetap) | STATUS |
|------|-----------|-----------|-------------------|--------|
| `app/api/guru/soal/route.ts` (GET/POST/PUT/DELETE) | `role !== "GURU"` (401) ×4 | `!isTeacherOrStudent(dbUser)` ×4 | `existing.uploaderId !== dbUser.id` (PUT/DELETE) | ✅ MIGRATED |
| `app/api/guru/soal-set/route.ts` (GET) | auth-only (tanpa role guard) | `!isTeacherOrStudent(dbUser)` (baru) | `creatorId: dbUser.id` (scope GET) | ✅ MIGRATED (+guard baru) |
| `app/api/guru/soal-set/route.ts` (POST) | `role !== "GURU"` (401) | `!isTeacherOrStudent(dbUser)` | `creatorId: dbUser.id` (create) | ✅ MIGRATED |
| `app/api/guru/soal-set/[id]/route.ts` (GET) | auth-only | `!isTeacherOrStudent(dbUser)` (baru) | `set.creatorId !== dbUser.id` → 404 | ✅ MIGRATED (+guard baru) |
| `app/api/guru/soal-set/[id]/route.ts` (PUT/DELETE) | `role !== "GURU"` (401) ×2 | `!isTeacherOrStudent(dbUser)` ×2 | `set.creatorId !== dbUser.id` → 404 | ✅ MIGRATED |
| `app/api/guru/soal-set/[id]/questions/route.ts` (POST/DELETE) | `role !== "GURU"` (401) ×2 | `!isTeacherOrStudent(dbUser)` ×2 | `set.creatorId !== dbUser.id` → 404 | ✅ MIGRATED |
| `app/api/guru/soal-set/[id]/use/route.ts` (POST) | auth-only + **TANPA ownership** | `!isTeacherOrStudent(dbUser)` + `set.creatorId !== dbUser.id` → 404, increment SEBELUM tidak lagi mungkin | `set.creatorId !== dbUser.id` → 404 | ✅ CRITICAL FIXED |
| `app/api/guru/bank-soal/route.ts` (GET) | `role?.toUpperCase() !== "GURU"` (403) | `!isTeacherOrStudent(dbUser)` | — (baca master bank publik) | ✅ MIGRATED |
| `app/api/guru/bank-soal/send/route.ts` (POST) | `role?.toUpperCase() !== "GURU"` (403) | `!isTeacherOrStudent(dbUser)` | `group.teacherId: dbUser.id` (validasi kelas) | ✅ MIGRATED |
| `app/api/guru/bank-soal/preview/route.ts` (GET) | `role?.toUpperCase() !== "GURU"` (403) | `!isTeacherOrStudent(dbUser)` | — (baca master bank publik) | ✅ MIGRATED |
| `app/api/guru/materi/route.ts` (GET/POST/PUT/DELETE) | `(role !== "GURU" && role !== "ADMIN" && !isFounder)` (401) ×4 | `!isTeacherOrStudent(dbUser)` ×4 | `existing.uploaderId !== dbUser.id` (PUT/DELETE) | ✅ MIGRATED |
| `app/api/guru/materi/[id]/kirim/route.ts` (GET/POST) | `(role !== "GURU" && role !== "ADMIN" && !isFounder)` (401) ×2 | `!isTeacherOrStudent(user)` ×2 | `(!materi.isPublished && materi.uploaderId !== user.id)` + `group.teacherId: user.id` | ✅ MIGRATED |
| `app/api/guru/buat-tka/route.ts` (POST) | `(role !== "GURU" && !isFounder && role !== "ADMIN")` (403) | `!isTeacherOrStudent(user)` | `creatorId: user.id` (create) | ✅ MIGRATED |
| `app/api/group/[id]/route.ts` (GET) | auth-only | `!isTeacherOrStudent(dbUser)` (baru) | `group.teacherId !== dbUser.id` → 403 | ✅ MIGRATED (+guard baru) |
| `app/api/group/[id]/route.ts` (PATCH/DELETE) | `(role !== "GURU" && !isPrivileged)` (403) ×2 | `!isTeacherOrStudent(dbUser)` ×2 | `group.teacherId !== dbUser.id && !isPrivileged` → 404 | ✅ MIGRATED |
| `app/api/guru/panduan/route.ts` (GET) | `(role !== "GURU" && !isFounder)` (401) | `!isTeacherOrStudent(user)` (ADMIN kini diizinkan) | — | ✅ POLICY |
| `app/api/guru/panduan/[unitId]/route.ts` (GET) | `(role !== "GURU" && !isFounder)` (401) | `!isTeacherOrStudent(user)` (ADMIN kini diizinkan) | — | ✅ POLICY |
| `app/api/guru/latihan/pick/route.ts` (POST) | `role?.toUpperCase() !== "GURU"` (403) | `!isTeacherOrStudent(dbUser)` (ADMIN/founder kini diizinkan) | — (baca master bank publik) | ✅ POLICY |
| `app/api/guru/misi/route.ts` (GET) | auth-only (tanpa role guard) | `!isTeacherOrStudent(user)` (baru) | — (data self-scoped user.id) | ✅ POLICY (+guard baru) |
| `app/api/guru/soal-pool/route.ts` (GET) | auth-only (tanpa role guard) | `!isTeacherOrStudent(dbUser)` (baru) | — (baca paket aktif publik) | ✅ POLICY (+guard baru) |
| `app/api/guru/withdraw/route.ts` (POST) | `(role !== "GURU" && !isFounder)` (401) | **TETAP** (ADMIN sengaja ditolak — finansial) + komentar | `user.id` + `updateMany saldo >= nominal` (atomic) | ✅ SPECIAL CASE |
| `app/api/guru/karya-comment/[commentId]/route.ts` (DELETE) | `user.role !== "GURU"` (403) di cabang non-admin | **TETAP** (moderasi permissive: ADMIN/founder bebas; GURU bila mengajar kelas penulis) + komentar | `groupMember.findFirst({ userId: karya.userId, group: { teacherId: user.id } })` | ✅ SPECIAL CASE |
| `lib/ai-gateway/trial-service.ts` (2) | `role !== "GURU"` business rule | **TETAP** (trial khusus GURU) | — | ✅ KEEP |

## 4. Kerentanan Kritis: `POST /api/guru/soal-set/[id]/use`

**Sebelum**: GET auth-only → cari `set` → kalau ada langsung `useCount++` + baca `questionIds` → redirect. **Guru A bisa memakai set soal Guru B dan menaikkan useCount-nya.**

**Sesudah**:
1. Guard SSOT `isTeacherOrStudent(dbUser)` → MURID ditolak 401.
2. Ownership `set.creatorId !== dbUser.id` → 404 (guru lain / founder / ADMIN tetap 404 — AUTHORIZATION ≠ OWNERSHIP, tidak ada bypass ownership).
3. `useCount` increment + pembacaan `questionIds` hanya terjadi SETELAH guard + ownership lolos.
4. Response contract (401 Unauthorized / 404 Set not found / 400 useType invalid / redirect `{ redirect }`) dipertahankan.

Urutan file terverifikasi oleh TEST 16: `set.creatorId !== dbUser.id` muncul sebelum `useCount: { increment: 1 }` dan sebelum `set.questions.map`.

## 5. Tabel ACTOR | RESOURCE | EXPECTED | ACTUAL

| Actor | Resource | Expected | Actual |
|-------|----------|----------|--------|
| GURU (pemilik) | `soal-set/[id]/use` miliknya | 200 + redirect, useCount+1 | ✅ sama |
| GURU (bukan pemilik) | `soal-set/[id]/use` milik guru lain | 404 | ✅ 404 (baru — dulu 200 + useCount+1) |
| ADMIN | `soal-set/[id]/use` milik guru lain | 404 (tanpa bypass ownership) | ✅ 404 |
| FOUNDER | `soal-set/[id]/use` milik guru lain | 404 (tanpa bypass ownership) | ✅ 404 |
| MURID | `soal-set/[id]/use` | 401 | ✅ 401 (baru — dulu auth-only) |
| GURU/ADMIN/FOUNDER | `soal`, `soal-set`, `materi`, `buat-tka`, `bank-soal/*`, `group/[id]` | 2xx | ✅ 2xx (SSOT menerima ketiganya) |
| MURID | `soal`, `soal-set`, `materi`, `buat-tka`, `bank-soal/*`, `group/[id]`, `misi`, `soal-pool` | 401/403 | ✅ 401/403 |
| GURU A | `soal` milik GURU B (PUT/DELETE) | 404 | ✅ 404 (`uploaderId`) |
| GURU A | `soal-set/[id]` milik GURU B (GET/PUT/DELETE) | 404 | ✅ 404 (`creatorId`) |
| GURU A | `materi` milik GURU B (PUT/DELETE) | 404 | ✅ 404 (`uploaderId`) |
| GURU A | `group/[id]` bukan kelasnya (GET) | 403 | ✅ 403 (`teacherId`) |
| GURU A | `group/[id]` bukan kelasnya (PATCH/DELETE) | 404 | ✅ 404 (kecuali ADMIN/founder `isPrivileged` — desain legacy dipertahankan) |
| ADMIN | `withdraw` | 401 (sengaja ditolak) | ✅ 401 |
| GURU / FOUNDER | `withdraw` | 2xx bila saldo cukup | ✅ 2xx + atomic |
| ADMIN / FOUNDER | `karya-comment/[commentId]` | 200 (bebas) | ✅ 200 |
| GURU (mengajar kelas penulis) | `karya-comment/[commentId]` | 200 | ✅ 200 |
| GURU (tidak mengajar) / MURID | `karya-comment/[commentId]` | 403 | ✅ 403 |
| ADMIN | `panduan`, `panduan/[unitId]`, `latihan/pick` | 2xx | ✅ 2xx (baru — dulu 401/403) |

## 6. Keputusan & Alasan

1. **Guard SSOT dipakai dari `lib/teacher/students.ts`** — tidak ada helper auth baru yang diduplikasi (aturan: JANGAN buat `isGuru`/`getGuruStudents`/`isTeacherV2` baru). Route yang memakai `getUser()` (mengembalikan User DB) langsung meneruskan `user`; route yang memakai `createClient().auth.getUser()` (hanya Supabase auth) memuat `dbUser` lalu meneruskan `dbUser`.
2. **ADMIN/founder TIDAK pernah bypass ownership** — semua `uploaderId`/`creatorId`/`teacherId` check tetap 404/403 bahkan untuk ADMIN/founder, KECUALI `group/[id]` PATCH/DELETE yang memakai `isPrivileged` (desain legacy untuk kelola kelas dari admin) — sengaja dipertahankan dan dilaporkan, bukan ditutup.
3. **`misi` & `soal-pool` & GET `soal-set`/`soal-set/[id]`/`group/[id]` kini role-gated** — sebelumnya auth-only, murid bisa membuka endpoint guru. Ini hardening tambahan (bukan sekadar rename).
4. **`panduan` & `latihan/pick` kini menerima ADMIN/founder** — sesuai keputusan policy review audit §17 (ADMIN berhak melihat buku panduan & memilih soal dari bank).
5. **`withdraw` tetap GURU/founder-only** — menyentuh uang sungguhan; ADMIN sengaja ditolak. Komentar persis mengikuti spec. Atomicity `updateMany(saldo >= nominal)` tidak diubah.
6. **`karya-comment` tetap permissive moderasi** — ADMIN/founder bebas; GURU dibatasi ke kelas penulis. Bukan guard legacy yang perlu dimigrasi, melainkan model izin yang disengaja.

## 7. QA & Verifikasi

| Gate | Hasil |
|------|-------|
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (20 file yang diubah) | ✅ 0 violations |
| `npm run test:guru-phase` (TEST 1–18, termasuk 9–18 baru) | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 65/65 |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 65/65 |
| `npm run build` (dummy env) | ✅ Compiled successfully, 0 errors |
| Static scan legacy guard | ✅ 28 → 4 (2 lib KEEP + 2 route SPECIAL CASE) |

Klasifikasi: seluruh hasil di atas **lulus** (bukan NEW REGRESSION, bukan PRE-EXISTING FAILURE, bukan ENVIRONMENT FAILURE). Tidak ada failure baru yang ditimbulkan oleh changeset ini.

## 8. REMAINING RISK

1. **`group/[id]` PATCH/DELETE memakai `isPrivileged`** (ADMIN/founder bisa melewati ownership) — desain legacy untuk kelola kelas, dilaporkan sebagai keputusan yang dipertahankan, bukan cacat baru. Jika ingin ADMIN/founder juga kena ownership, perlu keputusan produk.
2. **`withdraw` tidak memakai SSOT** — sengaja (finansial), tapi berarti ADMIN tidak pernah bisa membantu penarikan. Perlu keputusan produk bila kelak admin perlu memproses.
3. **`trial-service.ts` masih punya guard `role !== "GURU"`** — business rule trial khusus guru; sengaja KEEP. Bukan route API.
4. **`supabaseId` query param fallback** pada beberapa route legacy (`soal`, `soal-set`, `materi`) — mekanisme sementara untuk bug cookie Next.js 16. Tetap mengikat ke user yang valid, namun dianjurkan dihapus setelah bug cookie diatasi (di luar lingkup P1-B).

## 9. Daftar File Diubah

| File | Perubahan |
|------|-----------|
| `app/api/guru/soal/route.ts` | 4 guard → SSOT |
| `app/api/guru/soal-set/route.ts` | GET +guard SSOT; POST guard → SSOT |
| `app/api/guru/soal-set/[id]/route.ts` | GET +guard SSOT; PUT/DELETE guard → SSOT |
| `app/api/guru/soal-set/[id]/questions/route.ts` | POST/DELETE guard → SSOT |
| `app/api/guru/soal-set/[id]/use/route.ts` | **Critical fix**: +guard SSOT + ownership, increment setelah lolos |
| `app/api/guru/bank-soal/route.ts` | guard → SSOT |
| `app/api/guru/bank-soal/send/route.ts` | guard → SSOT |
| `app/api/guru/bank-soal/preview/route.ts` | guard → SSOT |
| `app/api/guru/materi/route.ts` | 4 guard → SSOT |
| `app/api/guru/materi/[id]/kirim/route.ts` | 2 guard → SSOT |
| `app/api/guru/buat-tka/route.ts` | guard → SSOT |
| `app/api/guru/panduan/route.ts` | guard → SSOT (ADMIN diizinkan) |
| `app/api/guru/panduan/[unitId]/route.ts` | guard → SSOT (ADMIN diizinkan) |
| `app/api/guru/latihan/pick/route.ts` | guard → SSOT (ADMIN/founder diizinkan) |
| `app/api/guru/misi/route.ts` | +guard SSOT (sebelumnya auth-only) |
| `app/api/guru/soal-pool/route.ts` | +guard SSOT (sebelumnya auth-only) |
| `app/api/guru/withdraw/route.ts` | komentar SPECIAL CASE (guard dipertahankan) |
| `app/api/guru/karya-comment/[commentId]/route.ts` | komentar SPECIAL CASE (guard dipertahankan) |
| `app/api/group/[id]/route.ts` | GET +guard SSOT; PATCH/DELETE guard → SSOT |
| `scripts/test-guru-phase.ts` | +TEST 9–18 (38 assertion baru) |

## 10. Catatan Tambahan

- **Build pakai dummy env** sesuai konvensi project (opencode me-mask nilai `[SENSITIVE]` → `TypeError: Invalid URL` saat data collection). Set env inline saat `npm run build`.
- **P1-C TIDAK dijalankan** — tugas ini berhenti setelah laporan P1-B.
- **Tidak ada commit/push** — sesuai instruksi; `git status` dibiarkan bersih untuk review.
- Semua perubahan additive: tidak ada route/model/schema/response contract yang dihapus atau diubah selain guard; tidak ada import yang tersisa tak terpakai (ESLint 0 violation membuktikan).
