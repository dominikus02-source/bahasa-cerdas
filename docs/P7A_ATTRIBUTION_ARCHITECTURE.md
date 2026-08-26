# P7A — Audit & Attribution Architecture
## Guru Cerdas Sejahtera — BahasaCerdas

**Status**: AUDIT & DESIGN ONLY — tidak ada perubahan schema, migration, API, atau UI.
**Tanggal**: 26 Agustus 2026
**Fase berikutnya**: P7B — Commission Ledger & Teacher Wallet (menunggu review laporan ini)

---

## A. Executive Summary

1. **Belum ada sistem referral/invitation sama sekali.** Tidak ada model, kolom, URL parameter (`?ref=`), maupun capture sumber akuisisi saat signup. Satu-satunya mekanisme "guru membawa murid" yang nyata hari ini adalah **kode akses kelas** (`Group.accessCode @unique`).

2. **Kelas = `Group`**, dimiliki satu guru (`teacherId`), murid bergabung via `POST /api/group/join` dengan `accessCode`. Relasi enrollment tersimpan di `GroupMember` dengan `@@unique([groupId, userId])`.

3. **Satu murid BISA berada di banyak kelas / banyak guru.** Tidak ada batasan satu-kelas-per-murid; SSOT hitungan murid guru (`lib/teacher/students.ts`) bahkan secara eksplisit melakukan dedupe lintas kelas. Ini membuat attribution "dari kelas saat ini" ambigu → tabel attribution khusus wajib.

4. **Enrollment bersifat permanen**: `GroupMember` tidak punya `leftAt`/status; tidak ada API remove-member. Guru menghapus kelas → arsip (`isActive=false`) bila punya relasi, hard delete hanya untuk kelas kosong. Artinya bukti enrollment historis relatif stabil.

5. **Entitlement Premium: SSOT = `User.isPremium + premiumUntil`** (stacking saat renewal), di-resolve lewat `resolveUserAiPlan()`. Model `Subscription` ADA tapi **tidak dipakai** (dead schema) — flow nyata: `Transaksi` (type `MURID_PREMIUM`/`PREMIUM_UPGRADE`, status `SUCCESS`) → webhook Midtrans update User.

6. **Webhook Midtrans** (`app/api/payment/webhook/route.ts`) sudah memiliki pola keuangan yang benar: verifikasi signature, validasi amount vs local `Transaksi.amount`, dan **claim-first idempotency** (`updateMany status != SUCCESS`, count===1 menang) dalam `$transaction`. Pola ini adalah template untuk komisi.

7. **Preseden komisi + wallet sudah ada** untuk marketplace: `SellerEarning` (split 85/15) → `User.saldo` → `Withdrawal`. Program komisi guru bisa mengikuti pola yang sama (P7B), plus `AdminPaymentAuditLog` sebagai preseden audit admin.

8. **Harga Murid Premium**: Bulanan Rp 19.000/30 hari, Tahunan Rp 180.000/365 hari (`lib/billing/plans.ts`). Renewal murid = pembelian ulang manual (transaksi baru) — tidak ada auto-charge recurring aktif. Setiap `Transaksi SUCCESS` baru = satu event komisi potensial. Ini menyederhanakan desain ledger.

9. **Rekomendasi inti**: buat **tabel attribution khusus** (bukan turunan query dari GroupMember): `TeacherAttribution` (satu baris current per murid, `studentId @unique` sebagai pengunci anti-race dan anti-double-commission) + `TeacherAttributionEvent` (append-only history). Materialisasi **eager saat join kelas**, validasi ulang **saat settlement**.

10. **Aturan default**: *First Valid Attribution Wins* (kronologis `GroupMember.joinedAt` terlama), attribution **tidak berubah** saat pindah/keluar kelas, komisi hanya untuk pembayaran yang settle **pada/ setelah** `eligibleFrom` (prospective-only — murid premium lama yang baru join tidak menghasilkan komisi retroaktif). Koreksi hanya via admin, dengan alasan + audit trail, berlaku prospektif.

---

## B. Existing Architecture Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        KONDISI NYATA CODEBASE                            │
└──────────────────────────────────────────────────────────────────────────┘

  Guru (User role=GURU)
    │ owns 1..N
    ▼
  Group ("kelas") ── accessCode @unique, isActive, tahunAjaran
    │ has 0..N
    ▼
  GroupMember ── @@unique([groupId, userId]), joinedAt, role("member"|"ketua")
    │               ⚠️ murid boleh member of BANYAK group (beda groupId)
    │               ⚠️ tidak ada leftAt / remove API → permanen
    ▼
  Murid (User role=MURID)
    │
    │ beli Premium (checkout lib/billing/plans.ts)
    ▼
  Transaksi { type:"MURID_PREMIUM", status PENDING→SUCCESS, orderId,
              amount, metadata{planId,durationDays,kupon...} }
    │ settlement (Midtrans)
    ▼
  POST /api/payment/webhook
    ├─ verify signature SHA512 ✓
    ├─ amount == Transaksi.amount ✓ (P4.1)
    ├─ claim-first idempotency ($transaction, updateMany !=SUCCESS)
    ├─ User.isPremium=true, premiumUntil = stack(durationDays)
    └─ [titik masuk alami untuk evaluasi komisi — P7B]

  Entitlement SSOT:
    resolveUserAiPlan() ← isPremium && premiumUntil > now → MURID_PREMIUM

  Yang TIDAK ADA hari ini:
    ❌ referral link / kode referral / teacher code
    ❌ capture source saat signup (app/api/auth/register — kosong)
    ❌ tabel attribution / mapping murid→guru untuk komisi
    ⚪ Profile.schoolId (kanonik, P1-C) — identitas agregasi, BUKAN authorization,
       cakupannya sekolah bukan guru → tidak layak jadi dasar komisi per-guru
```

---

## C. Audit Findings

### C.1 Model Prisma Relevan

| Model | Field penting | Relasi/Constraint | Layak jadi bukti attribution? |
|---|---|---|---|
| `User` | `role` (MURID/GURU/ADMIN), `isFounder`, `isPremium`, `premiumUntil`, `premiumPlan`, `saldo`, `totalEarned` | `supabaseId @unique`, `email @unique` | Sumber identitas & entitlement, bukan bukti atribusi |
| `Group` | `teacherId`, `accessCode @unique`, `isActive`, `grade`, `tahunAjaran` | `teacher → User` | **Ya** — bukti tidak langsung (via GroupMember); owner kelas = kandidat guru penerima |
| `GroupMember` | `joinedAt`, `role` | `@@unique([groupId, userId])`; **tanpa leftAt/status** | **Ya — bukti attribution terkuat yang tersedia** (murid X masuk kelas milik guru Y pada waktu Z) |
| `Profile` | `schoolId` (kanonik), `school` (raw) | `schoolId` nullable, index; eksplisit **bukan authorization** | Tidak untuk per-guru; berguna untuk agregasi/analytics saja |
| `School` / `SchoolAlias` | `normalizedName`, alias unik | P1-C | Tidak relevan langsung untuk attribution per-guru |
| `Transaksi` | `type` (`MURID_PREMIUM`/`PREMIUM_UPGRADE`/`KARYA_PURCHASE`), `status`, `orderId`, `amount`, `metadata Json` | index userId/orderId/status | **Ya** — trigger event komisi (settlement SUCCESS) |
| `Subscription` | plan, status, period, willRenew | — | **TIDAK DIPAKAI** (dead schema; tidak direferensikan app/api/lib) |
| `Kupon` / `KuponPemakaian` | `hargaFixed` Rp 1.000 "Program Guru Cerdas", `planId` bound | `kode @unique` | Konteks: nama program sudah pernah dipakai utk kupon guru; program baru "Guru Cerdas Sejahtera" perlu dibedakan. Kupon mempengaruhi `Transaksi.amount` → basis komisi |
| `SellerEarning` | grossAmount, platformFee, netAmount (85/15), status | — | Preseden pola komisi marketplace (P7B) |
| `Withdrawal` | amount, bank*, status | — | Preseden payout (P7B) |
| `AdminPaymentAuditLog` | action, previousValue, newValue, reason, metadata | — | **Preseden audit trail admin** — pola untuk koreksi attribution |

### C.2 Flow Murid Bergabung dengan Guru (nyata)

- **Guru buat kelas**: `POST /api/group` (`app/api/group/route.ts`) → generate `accessCode` unik (`getUniqueAccessCode()`).
- **Murid join**: `POST /api/group/join` (`app/api/group/join/route.ts:19-33`) — lookup `Group` by `accessCode.toUpperCase()` + `isActive:true`, cek existing membership (409 jika sudah), `groupMember.create`.
- **Kode kelas, bukan link undangan.** Tidak ada deep-link/referral param.
- **Multi-kelas: BOLEH.** Unique constraint hanya `(groupId,userId)`; tidak ada limit jumlah grup per murid. `lib/teacher/students.ts` header comment: *"Dedupe murid lintas kelas: murid yang ikut >1 kelas hanya dihitung sekali"* → konfirmasi multi-guru adalah kondisi normal.
- **Keluar/pindah: tidak ada mekanisme.** Tidak ditemukan `groupMember.delete` di seluruh `app/api`. Hapus kelas (`DELETE /api/group/[id]`, line 150-192): kelas ber-relasi → **diarsipkan** (`isActive=false`, data utuh); hanya kelas pristine (0 member) yang hard-deleted. Regenerasi kode kelas bisa via PATCH `regenerateCode` — kode lama mati, membership tetap.

### C.3 Referral/Registration Existing

- `app/api/auth/register/route.ts` & `create-user`: **tidak ada** field school/referral/source/acquisition.
- Grep global `referral|referralCode|utm_source|acquisitionSource|inviteCode|teacherCode` terhadap `app/`, `lib/`, `prisma/`: **0 hasil relevan**.
- Kesimpulan: **belum ada infrastruktur attribution apapun.** Program ini membangun dari nol; satu-satunya evidence yang sudah terakumulasi adalah riwayat `GroupMember`.

### C.4 Flow Premium (lifecycle)

| Aspek | Kondisi nyata | Bukti |
|---|---|---|
| Kapan murid dianggap Premium | `resolveUserAiPlan()`: `isPremium && premiumUntil > now` → `MURID_PREMIUM` | `lib/ai-gateway/plan-resolver.ts:43-55` |
| Source of truth entitlement | Flag `User.isPremium/premiumUntil` (**bukan** Subscription) | webhook line 283-286 |
| Tanggal mulai/berakhir | `premiumUntil` dihitung dari settlement; **stacking** atas sisa periode aktif | webhook line 271-278 |
| Renewal | Pembelian ulang manual → `Transaksi` BARU → stacking. Tidak ada auto-recurring aktif | checkout + webhook |
| Cancellation/expiration | Tidak ada cron penurunan flag; expired ditangani oleh perbandingan `premiumUntil > now` saat resolve. `willRenew/cancelledAt` hanya di dead-schema Subscription | resolver |
| Webhook trigger komisi | `POST /api/payment/webhook` — claim-first idempotent `$transaction`; type `MURID_PREMIUM` → activate | `app/api/payment/webhook/route.ts:224-299` |

**Implikasi desain**: karena renewal = transaksi baru yang berdiri sendiri, "subscription yang memenuhi syarat" dapat didefinisikan deterministik per-transaksi: `Transaksi.type="MURID_PREMIUM" AND status="SUCCESS"` (+ aturan eligible window). Tidak perlu mengurus prorasi mid-period atau auto-renewal webhook.

---

## D. Attribution Scenario Matrix

Prasyarat istilah: **attribution materialized** = baris `TeacherAttribution` ACTIVE; **komisi mengalir** = pembayaran MURID_PREMIUM settle pada/ setelah `eligibleFrom` milik attribution ACTIVE tersebut.

| # | Skenario | Attribution ke siapa | Kapan dikunci | Bisa berubah? | Audit trail |
|---|---|---|---|---|---|
| 1 | Join kelas Guru A → beli Premium | **Guru A** (`CLASS_ENROLLMENT`) | Saat join (eager materialize) | Tidak otomatis; hanya koreksi admin | Event CREATED + Transaksi terkait |
| 2 | Sudah Premium → baru join kelas Guru A | Guru A **tercatat**, tapi `eligibleFrom` = tanggal join → periode yang SUDAH dibayar sebelum join tidak menghasilkan komisi; **renewal berikutnya** masuk syarat *(keputusan founder — §H.2)* | Saat join | Tidak | CREATED + catatan eligibleFrom |
| 3 | Member kelas Guru A **dan** Guru B | Guru dengan `GroupMember.joinedAt` **terlama**; tie-break `groupId` ASC (deterministik) | Saat join pertama (evaluasi eager saat join kedua mendapat P2002 → read winner) | Tidak | CREATED mencantumkan sourceGroupId |
| 4 | Pindah kelas/sekolah | **Tetap guru asli** (prinsip #2: attribution ≠ relasi kelas) | Sudah terkunci | Tidak otomatis | Tidak ada event baru; perubahan schoolId tidak menyentuh attribution |
| 5 | Klik link referral Guru A → belajar di kelas Guru B | Jika signup via referral **lebih dulu**: Guru A (kronologis). Jika join kelas B lebih dulu lalu (future) klik referral: Guru B tetap menang (first-valid-wins kronologis) | Saat event valid PERTAMA terekam | Tidak | CREATED dengan `source=REFERRAL_LINK/CODE` |
| 6 | Guru hapus kelas (arsip) / murid keluar | **Attribution bertahan** — arsip kelas & (nonexistent) removal tidak me-revoke. Hard-delete kelas kosong tidak mungkin mengandung member | Sudah terkunci | Tidak otomatis; admin bisa REVOKED dengan alasan | Event REVOKED (hanya via admin) |
| 7 | Berhenti Premium → langganan lagi | Tetap guru ter-atribusi; komisi resume pada transaksi baru yang settle ≥ eligibleFrom | Sudah terkunci | Tidak | Ledger P7B merujuk attribution yang sama |
| 8 | Admin koreksi attribution | Guru baru (pilihan admin) | Saat approve koreksi | Ya — satu-satunya jalur perubahan | Baris lama → `SUPERSEDED`/event; baris/event baru dengan `correctedBy`, `correctedAt`, `correctionReason`; **komisi yang sudah cair TIDAK dibatalkan retroaktif** (kebijakan prospektif) |

Catatan skenario 5: karena infrastruktur referral belum ada, saat peluncuran hanya `CLASS_ENROLLMENT` + `MANUAL_ADMIN` yang realizable; enum disiapkan untuk masa depan tanpa mengubah skema lagi.

---

## E. Recommended Attribution Rules (Final)

**R1 — Satu attribution aktif per murid.** Dienforce di level DB: `TeacherAttribution.studentId @unique` (satu baris current-state per murid). Concurrent creation: yang menang create, yang kalah menerima P2002 lalu membaca winner. Tidak ada jalur kode yang bisa menghasilkan dua baris.

**R2 — Materialisasi eager saat bukti terbentuk.** Trigger utama = sukses join kelas (`POST /api/group/join`). Bukti = `GroupMember` yang baru dibuat. Keputusan deterministik: kandidat = semua `GroupMember` murid tsb (existing + baru), pilih `joinedAt` terlama; tie-break `groupId` ASC. Exclude self-attribution (`studentId === teacherId`).

**R3 — First Valid Attribution Wins, immutable terhadap perubahan kelas.** Setelah ACTIVE: pindah kelas, keluar, kelas diarsipkan, sekolah berganti — semuanya TIDAK memindahkan attribution. Perubahan hanya via admin (R6).

**R4 — Komisi prospective-only (`eligibleFrom`).** Komisi dihitung hanya untuk `Transaksi` MURID_PREMIUM yang settle pada/ setelah `eligibleFrom` attribution (= momen attribution terbentuk; untuk backfill = tanggal eksekusi backfill). Murid premium lama tidak menghasilkan komisi retroaktif untuk guru baru. *(Parameter bisnis — konfirmasi founder, §H.2.)*

**R5 — Evidence-based source enum.** `CLASS_ENROLLMENT` (live), `MANUAL_ADMIN` (live), `REFERRAL_LINK`, `REFERRAL_CODE` (reserved). Setiap attribution menyimpan `sourceRef` (groupId / kode / admin note).

**R6 — Koreksi hanya admin, append-only history.** Koreksi = tandai baris lama `SUPERSEDED`/`REVOKED` + tulis event `CORRECTED/REVOKED` (before/after JSON, actorUserId, reason). Riwayat tidak pernah dihapus. Koreksi berlaku prospektif; komisi yang telah cair tidak ditarik mundur otomatis (klaimback manual = keputusan terpisah, P7B+).

**R7 — Settlement-time validation gate.** Saat webhook claim menang untuk `MURID_PREMIUM`: komisi hanya layak jika ada attribution `ACTIVE` milik murid tsb dan `transaksi.createdAt >= eligibleFrom`. Snapshot attribution (attributionId + teacherId + source) dibekukan ke entri ledger komisi (P7B) agar koreksi belakangan tidak merevisi sejarah komisi yang sudah terbit.

**R8 — Additive-only.** Tidak menyentuh entitlement, checkout, Midtrans signature/amount validation, atau flow SellerEarning. Integrasi webhook = blok tambahan DI DALAM `$transaction` klaim yang sudah ada (pola sama seperti aktivasi premium & SellerEarning), sehingga atomic + idempotent by construction.

---

## F. Proposed Data Model (DESIGN ONLY — belum diterapkan)

```prisma
// ═══════════════════════════════════════════════════════════════
// PROPOSAL — P7B. JANGAN di-push sebelum laporan disetujui founder.
// ═══════════════════════════════════════════════════════════════

enum AttributionSource {
  CLASS_ENROLLMENT   // murid join kelas via accessCode (live day-1)
  REFERRAL_LINK      // reserved: ?ref=<kode> saat signup (belum ada infra)
  REFERRAL_CODE      // reserved: kode referral guru manual input
  MANUAL_ADMIN       // penetapan/koreksi oleh admin
}

enum AttributionStatus {
  ACTIVE       // satu-satunya status yang layak dapat komisi
  SUPERSEDED   // digantikan koreksi admin (riwayat utuh)
  REVOKED      // dicabut admin (mis. fraud/enrollment palsu)
}

/// Current-state attribution. SATU baris per murid — studentId @unique
/// adalah enforcement anti-double-commission DAN anti-race-condition.
model TeacherAttribution {
  id               String            @id @default(cuid())
  studentId        String            @unique   // ← R1: kunci tunggal
  teacherId        String
  source           AttributionSource
  sourceGroupId    String?           // bukti CLASS_ENROLLMENT → Group.id
  sourceCode       String?           // bukti REFERRAL_* → kode/link
  status           AttributionStatus @default(ACTIVE)

  attributedAt     DateTime          @default(now()) // momen bukti terbentuk
  lockedAt         DateTime          @default(now()) // momen immutable (R3); backfill = tgl eksekusi
  eligibleFrom     DateTime          @default(now()) // R4: komisi hanya utk payment >= titik ini

  correctedBy      String?           // User.id admin terakhir
  correctedAt      DateTime?
  correctionReason String?
  metadata         Json?             // snapshot konteks (nama kelas, dsb.)

  student    User   @relation("AttributionStudent", fields: [studentId], references: [id], onDelete: Cascade)
  teacher    User   @relation("AttributionTeacher", fields: [teacherId], references: [id])
  sourceGroup Group? @relation("AttributionSourceGroup", fields: [sourceGroupId], references: [id], onDelete: SetNull)
  events     TeacherAttributionEvent[]

  @@index([teacherId, status])          // dashboard guru: daftar murid teratribusi
  @@index([sourceGroupId])
}

/// Append-only history. Tidak pernah di-update/delete (aturan R6).
model TeacherAttributionEvent {
  id            String             @id @default(cuid())
  attributionId String
  eventType     String             // CREATED | CORRECTED | REVOKED | REINSTATED
  before        Json?              // snapshot state sebelum (utk CORRECTED/REVOKED)
  after         Json?              // snapshot state sesudah
  actorUserId   String?            // admin yang melakukan (null utk system CREATED)
  reason        String?
  createdAt     DateTime           @default(now())

  attribution TeacherAttribution @relation(fields: [attributionId], references: [id], onDelete: Cascade)
  actor       User?              @relation("AttributionEvents", fields: [actorUserId], references: [id])

  @@index([attributionId])
  @@index([createdAt])
}
```

**Diff pada model lain (additive relations saja)**:

```prisma
model User {
  // ... existing ...
  attributionsAsStudent  TeacherAttribution[]       @relation("AttributionStudent")
  attributionsAsTeacher  TeacherAttribution[]       @relation("AttributionTeacher")
  attributionEvents      TeacherAttributionEvent[]  @relation("AttributionEvents")
}

model Group {
  // ... existing ...
  attributions TeacherAttribution[] @relation("AttributionSourceGroup")
}
```

**Catatan desain**:

- **Kenapa bukan derive-on-read dari GroupMember?** Multi-kelas membuat derivasi ambigu; mutation evidence (arsip kelas, regenerasi kode) membuat recompute tidak stabil; audit finansial butuh jawaban instan & deterministik "siapa guru penerima pada waktu T". Tabel eksplisit menjawab semua.
- **Kenapa current-row + event-log, bukan append-pure?** `studentId @unique` pada satu baris current memberikan jaminan integritas level DB yang mustahil dilanggar concurrent. History tetap lengkap via event table. Pola ini konsisten dengan cara codebase menangani uang (claim-first di webhook, `AdminPaymentAuditLog`).
- **`onDelete` teacher**: default Prisma (Restrict) untuk required relation — profil guru yang punya attribution tidak boleh terhapus diam-diam; financial records harus survive.
- **Backfill (P7B execution phase)**: script idempotent dry-run-default (konvensi repo) — scan semua `GroupMember`, group per student, pilih joinedAt terlama (exclude `studentId==teacherId`), create attribution dengan `eligibleFrom = lockedAt = run date`. Tanpa komisi retroaktif.
- **Snapshot di ledger (P7B preview)**: entri komisi nanti menyimpan `attributionId, teacherId, source, sourceGroupId` sebagai freeze-copy + `@@unique([transaksiId])` — koreksi attribution belakangan tidak menulis-ulang sejarah komisi.

---

## G. Edge Cases & Risks

| Risiko | Penjelasan | Mitigasi desain |
|---|---|---|
| **Multi-class ambiguity** | ±normal di produk (SSOT guru dedupe lintas kelas) | R2 deterministik: joinedAt terlama + tie-break groupId; hasil tercatat di `sourceGroupId` |
| **Race condition join ganda** | Murid buka 2 device join 2 kelas hampir bersamaan; dua proses sama-sama ingin materialize | `studentId @unique` — satu create menang; loser P2002→read-winner. Idempotent |
| **Race upgrade bersamaan** | Dua settlement murid sama hampir bersamaan | Sudah aman: webhook claim-first per-Transaksi; komisi (P7B) dievaluasi dalam claim transaction yang sama + `@@unique(transaksiId)` di ledger |
| **Existing Premium users saat launch** | Ribuan user; guru mengklaim murid retroaktif | R4 prospective-only; backfill eligibleFrom = run date. **Butuh keputusan founder** (§H.2) |
| **Enrollment historis pra-launch** | Apakah join lama = attribution sah? | Rekomendasi: YA sebagai attribution, tapi komisi mulai dari launch/backfill. **Butuh keputusan founder** (§H.3) |
| **Churn kelas / arsip kelas** | Kelas nonaktif → apakah attribution hangus? | Tidak (R3) — attribution memang dirancang terpisah dari kelas |
| **Self-enrollment** | Guru join kelas sendiri sebagai member (teknis mungkin) | Exclude `studentId === teacherId` di materializer |
| **Guru ber-role lain / ADMIN teacher** | Founder punya kelas; ADMIN mengajar | Attribution tetap valid (mereka user pengajar nyata); opsi exclude founder dari program = keputusan bisnis (§H.5) |
| **Role change murid→guru** | Murid teratribusi jadi guru | Attribution tidak auto-revoke; komisi hanya dari transaksi MURID_PREMIUM milik role MURID — guard di settlement gate |
| **Coupon Rp 1.000 / diskon** | Basis komisi 10% dari nilai berapa? | Rekomendasi: `Transaksi.amount` (nilai aktual tertagih, pasca-diskon) — konsisten dengan amount-validation webhook. Final di P7B |
| **Koreksi setelah komisi cair** | Admin salah koreksi → komisi sudah dibayar | Prospektif-only; klaimback manual out-of-scope (dicatat di P7B policy) |
| **Fraud (guru bikin murid dummy)** | Self-dealing untuk komisi | Deteksi heuristik P7B+ (pola pembayaran, device/IP); enum REVOKED + clawback manual tersedia |
| **Dead schema `Subscription`** | Orang bisa salah anggap recurring aktif | Dokumentasikan eksplisit: entitlement = flag User; renewal = transaksi baru |

---

## H. Founder Decision Required

Keputusan bisnis yang TIDAK bisa diputuskan oleh code — wajib dikunci sebelum P7B:

| # | Pertanyaan | Opsi | Rekomendasi teknis |
|---|---|---|---|
| **H.1** | Persentase & basis komisi dikonfirmasi: **10% × `Transaksi.amount`** (nilai tertagih pasca-kupon)? | a) amount tertagih; b) harga list | (a) — konsisten amount-validation webhook |
| **H.2** | Murid sudah Premium lalu join kelas guru: guru berhak komisi mulai kapan? | a) Tidak pernah; b) **renewal berikutnya** (eligibleFrom=tgl join); c) window N-hari | (b) — paling adil & sederhana; guru mendapat nilai dari murid yang dia bawa ke depan |
| **H.3** | Enrollment historis (pra-launch) dihitung sebagai attribution? | a) Ya semua; b) hanya dari tanggal X | (a) + eligibleFrom=backfill date — transparan, tanpa komisi retroaktif |
| **H.4** | Multi-guru (S3): first-joined wins — OK? Alternatif: exclude murid multi-kelas dari program | first-wins | First-wins — mengecualikan murid justru merugikan murid |
| **H.5** | Founder/ADMIN yang punya kelas ikut program? | a) ikut; b) exclude | (b) exclude founder dari penerima komisi (conflict of interest); ADMIN-guru biasa boleh |
| **H.6** | Minimum payout & metode (lanjutan P7B, tapi perlu arah): threshold Withdrawal existing dipakai? | reuse pattern `Withdrawal` | Reuse — konsisten marketplace |
| **H.7** | Nama resmi program di UI vs nama model teknis | "Guru Cerdas Sejahtera" | Model tetap `TeacherAttribution` (netral); label UI terpisah. Catatan: "Program Guru Cerdas" SUDAH dipakai kupon Rp 1.000 — hindari kembar nama |

### Jawaban Critical Design Questions

**Q1 — Trigger terbaik:** **Saat murid berhasil join kelas** (`POST /api/group/join` sukses). Bukan saat signup (belum ada evidence & infra referral), bukan saat upgrade (terlambat + ambigu multi-kelas), bukan saat klik link (bukti lemah — klik ≠ niat). Referral-link/code (masa depan) akan menjadi trigger kedua saat *signup selesai* — buktinya baru valid di situ. Settlement premium BUKAN trigger attribution; ia hanya *validation + monetization gate*.

**Q2 — Source of truth:** **Tabel `TeacherAttribution`** (current state, `studentId @unique`) + `TeacherAttributionEvent` (history). Kelas/GroupMember = *evidence*, bukan SSOT. Alasan lengkap di §F.

**Q3 — Race condition prevention:** Tiga lapis. (1) DB: `studentId @unique` membuat double-attribution mustahil; concurrent creator loser menerima P2002 → read-winner (idempotent). (2) Materializer: keputusan kandidat deterministik (joinedAt terlama, tie-break groupId ASC) sehingga dua proses paralel menghitung HASIL YANG SAMA. (3) Settlement: webhook sudah claim-first per-Transaksi; ledger komisi (P7B) akan pakai `@@unique([transaksiId])` sehingga satu pembayaran = maksimal satu komisi walau webhook retry/concurrent.

**Q4 — Dukungan audit finansial:** Rantai jelajah penuh: `Transaksi(orderId, SUCCESS)` → entri ledger komisi (menyimpan snapshot `attributionId, teacherId, source, sourceGroupId, eligibleFrom`) → `TeacherAttribution` → `TeacherAttributionEvent` (CREATED: siapa, kapan, bukti apa) → `GroupMember.joinedAt`. Pertanyaan *"mengapa komisi bulan ini ke Guru A untuk Murid X?"* dijawab: attribution X dibuat tgl T dari bukti enrollment kelas G (join tgl T₀), status ACTIVE saat payment settle tgl T₁ ≥ eligibleFrom, snapshot dibekukan di ledger. Koreksi belakangan tidak merevisi snapshot — ia membuat event baru.

**Q5 — Dampak ke sistem Premium existing:** **Nol perubahan perilaku.** Desain additive-only: 2 tabel baru + 2 enum + relation fields. Entitlement (`resolveUserAiPlan`), checkout, validasi webhook (signature/amount/claim-first), SellerEarning — tidak disentuh. Satu-satunya sentuhan kode pada sistem existing adalah blok evaluasi komisi TAMBAHAN di dalam `$transaction` klaim webhook (pola identik SellerEarning yang sudah hidup di sana) — dievaluasi penuh di P7B.

---

## I. Recommended Next Step — menuju P7B

Setelah founder mengunci §H.1–H.7:

1. **P7B-1 Schema & migration**: apply proposal §F (manual SQL idempoten via Supabase SQL Editor — konvensi repo; `prisma db push` bermasalah pada pooler) + `prisma generate`.
2. **P7B-2 Attribution engine** (`lib/attribution/`): `materializeOnJoin(userId,groupId)` (pure + race-safe), `resolveEligibleAttribution(userId, paidAt)`, admin correct/revoke helpers — dengan unit test deterministik (multi-class, tie-break, self-enrollment, P2002 path).
3. **P7B-3 Wire join endpoint**: hook best-effort/transactional di `POST /api/group/join` (additive).
4. **P7B-4 Commission ledger**: model `KomisiEntry` (proposal di P7B) — `@@unique([transaksiId])`, snapshot attribution, status PENDING/APPROVED/PAID; wire di webhook claim block (pola SellerEarning).
5. **P7B-5 Wallet & payout**: reuse pola `User.saldo`/`Withdrawal` ATAU wallet terpisah `TeacherWallet` (rekomendasi: terpisah, agar saldo marketplace guru tidak tercampur komisi referral) — decision internal P7B.
6. **P7B-6 Backfill script**: dry-run default, `--execute` gated, laporan coverage (berapa murid teratribusi, berapa ambiguous).
7. **P7B-7 QA chain**: test scripts ala repo (`test:p7-*`), leakage-safe, tanpa expose data finansial murid lain; audit anti-double-commission (invariant: ≤1 ACTIVE per murid, ≤1 ledger entry per transaksi).
8. **P7B-8 Admin tooling minimal**: endpoint koreksi + audit trail view (AdminPaymentAuditLog style).

**DoD P7A tercapai** — pertanyaan fundamental terjawab:

> *"Ketika seorang murid Premium menghasilkan komisi, BahasaCerdas menentukan guru penerima melalui baris `TeacherAttribution` ACTIVE milik murid tersebut — dibentuk sekali dari bukti enrollment kelas terlama (first-valid-wins), dikunci immutable terhadap perubahan kelas, hanya dapat diubah lewat koreksi admin ber-alasan dengan audit trail append-only, dan komisi hanya mengalir untuk pembayaran yang settle pada/setelah `eligibleFrom` dengan snapshot attribution yang dibekukan di setiap entri ledger."*

---

*Akhir laporan P7A. Implementasi (schema, engine, wiring) MENUNGGU persetujuan founder.*
