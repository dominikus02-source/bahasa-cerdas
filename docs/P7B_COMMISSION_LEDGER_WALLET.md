# P7B — Commission Ledger & Teacher Wallet Architecture
## Guru Cerdas Sejahtera — BahasaCerdas

**Status**: AUDIT & DESIGN ONLY — tidak ada perubahan schema, migration, API, atau UI.
**Tanggal**: 26 Agustus 2026
**Berdasarkan**: P7A (disetujui founder) + Keputusan §H.1–H.7 (disetujui)
**Fase berikutnya**: P7C — Implementation (menunggu review laporan ini)

---

## A. Executive Summary

### Apa yang Sudah Ada

| Komponen | Kondisi | Lokasi |
|---|---|---|
| `Withdrawal` model | Hidup, 4 status (`PENDING/APPROVED/REJECTED/TRANSFERRED`), minimum Rp 50.000, tanpa fee | `prisma/schema.prisma:1196-1213` |
| `User.saldo` + `totalEarned` | Hidup, increment/decrement atomic SQL | `schema.prisma:199-200` |
| Withdrawal route (modern) | Compare-and-swap dalam `$transaction`, guard pending 1-saat, profil bank di-snapshot saat submit | `app/api/guru/withdraw/route.ts` |
| Admin withdrawal | Founder-only, `$transaction`, TRANSISI_SAH, reject = increment saldo | `app/api/admin/withdrawals/[id]/route.ts` |
| `SellerEarning` | 85/15 split, PENDING→COMPLETED, no unique constraint | `schema.prisma:1180-1194` |
| Webhook | Claim-first idempotent `$transaction`, amount validation, premium stacking | `app/api/payment/webhook/route.ts` |
| `AdminPaymentAuditLog` | Hanya untuk manual premium activation (1 write site) | `schema.prisma:2339-2360` |

### Apa yang Dibangun

**Satu model komisi baru + satu wallet terpisah + satu state machine + integration point di webhook:**

1. **`TeacherCommission`** — ledger append-only per transaksi murid. 6 status lifecycle: `PENDING → ELIGIBLE → AVAILABLE → PROCESSING → PAID / REVERSED`.
2. **`TeacherWallet`** — dompet terpisah dari `User.saldo` (marketplace earnings). Per-guru: `availableBalance`, `pendingBalance`, `totalPaid`.
3. **Wire di webhook** — blok evaluasi komisi TAMBAHAN di dalam `$transaction` claim yang sudah ada (pola SellerEarning).
4. **Withdrawal** — reuse pattern `User.saldo` + `Withdrawal` tetapi beroperasi dari `TeacherWallet`, bukan `User.saldo`.

### Prinsip Desain

1. **Additive-only**: Tidak menyentuh entitlement, checkout, signature, amount validation, SellerEarning, atau flow marketplace.
2. **Claim-first idempotency**: Satu transaksi murid = maksimal satu komisi guru. `@@unique([transaksiId, teacherId])`.
3. **Snapshot beku**: Setiap entri komisi menyimpan snapshot lengkap attribution (attributionId, teacherId, source, sourceGroupId, eligibleFrom) agar koreksi belakangan tidak merevisi sejarah.
4. **Prospective-only**: Komisi hanya dari pembayaran settle ≥ eligibleFrom (keputusan §H.2).
5. **Reversal, bukan hapus**: Refund/cancellation membuat entry reversal (append-only). Audit trail tidak pernah dihapus.
6. **Wallet terpisah**: `TeacherWallet` ≠ `User.saldo` — mencegah pencampuran earnings marketplace dengan komisi referral.

---

## B. Commission State Machine

```
                    ┌────────────────────────────────────────────┐
                    │         COMMISSION LIFECYCLE               │
                    └────────────────────────────────────────────┘

  Transaksi settle (webhook)
       │
       ▼
   ┌────────┐   attribution found    ┌──────────┐   holding过了    ┌────────────┐
   │PENDING │ ──────────────────────▶│ ELIGIBLE │ ──────────────▶│ AVAILABLE  │
   │        │   + eligibleFrom ≤ now  │          │  (instant)*    │            │
   └────────┘                         └──────────┘                └──────┬─────┘
                                                                        │
                                              ┌─────────────────────────┤
                                              │                         │
                                        teacher clicks            refund/reverse
                                        "Tarik Saldo"                  │
                                              │                         │
                                              ▼                         ▼
                                     ┌──────────────┐          ┌────────────┐
                                     │  PROCESSING  │          │  REVERSED  │
                                     │ (dalam $trx) │          │ (append)   │
                                     └──────┬───────┘          └────────────┘
                                            │
                                      admin transfer
                                      sukses
                                            │
                                            ▼
                                     ┌────────────┐
                                     │    PAID    │
                                     │ (terminal) │
                                     └────────────┘

  * Instant: holding period = 0 hari pada peluncuran.
    Bisa ditambah later (mis. 7 hari) via config tanpa ubah schema.
```

### Status Definitions

| Status | Arti | Komisi cair? | Bisa berubah? |
|---|---|---|---|
| `PENDING` | Transaksi settle, tapi tidak ada attribution aktif ATAUeligibleFrom > now | Tidak | → ELIGIBLE (jika attribution ditemukan nanti — backfill) atau → REVERSED (jika expired) |
| `ELIGIBLE` | Attribution ditemukan +eligibleFrom ≤ now, menunggu holding period | Tidak | → AVAILABLE |
| `AVAILABLE` | Siap dicairkan (teacher balance bertambah) | Ya (tercatat di wallet) | → PROCESSING |
| `PROCESSING` | Guru mengajukan penarikan, komisi dalam transaksi | Ya (di-freeze) | → PAID (transfer sukses) atau → AVAILABLE (transfer gagal) |
| `PAID` | Komisi sudah ditransfer ke guru | Ya (selesai) | Terminal — tidak berubah |
| `REVERSED` | Refund, cancellation, atau admin reversal | Tidak (dana dikembalikan) | Terminal — tidak berubah |

### State Transition Rules (dienforce di code)

```typescript
const COMMISSION_TRANSITIONS: Record<string, string[]> = {
  PENDING:    ["ELIGIBLE", "REVERSED"],
  ELIGIBLE:   ["AVAILABLE", "REVERSED"],
  AVAILABLE:  ["PROCESSING", "REVERSED"],
  PROCESSING: ["PAID", "AVAILABLE"],  // AVAILABLE = rollback (transfer gagal)
  PAID:       [],                      // terminal
  REVERSED:   [],                      // terminal
};
```

---

## C. Data Model (Prisma Schema)

```prisma
// ═══════════════════════════════════════════════════════════════
// PROPOSAL — P7B. JANGAN di-push sebelum laporan disetujui founder.
// ═══════════════════════════════════════════════════════════════

enum CommissionStatus {
  PENDING     // settle tanpa attribution aktif atau belum eligible
  ELIGIBLE    // attribution ditemukan, eligibleFrom ≤ now
  AVAILABLE   // siap dicairkan (wallet balance bertambah)
  PROCESSING  // dalam transaksi penarikan
  PAID        // ditransfer — terminal
  REVERSED    // refund/reversal — terminal
}

/// Ledger komisi — append-only, satu baris per (transaksi × guru).
/// Tidak pernah di-update kecuali status lifecycle (bukan data bisnis).
model TeacherCommission {
  id               String           @id @default(cuid())
  transaksiId      String           // Transaksi.id — sumber event
  teacherId        String           // guru penerima
  studentId        String           // murid yang membayar

  // ── Snapshot attribution (beku saat komisi dibuat) ──
  attributionId    String           // TeacherAttribution.id
  attributionSource AttributionSource  // CLASS_ENROLLMENT / REFERRAL_LINK / MANUAL_ADMIN
  sourceGroupId    String?          // Group.id (bukti enrollment)
  eligibleFrom     DateTime         // kapan komisi mulai eligible

  // ── Financial ──
  grossAmount      Int              // Transaksi.amount (pasca-kupon)
  commissionRate   Float            // 0.10 (10%)
  commissionAmount Int              // floor(grossAmount × commissionRate), minimum 0

  // ── Lifecycle ──
  status           CommissionStatus @default(PENDING)
  holdingEndsAt    DateTime?        // null = instant; bisa ditambah later
  availableAt      DateTime?        // = max(holdingEndsAt, eligibleFrom) saat AVAILABLE
  settledAt        DateTime?        // = now saat AVAILABLE

  // ── Reversal (hanya terisi saat REVERSED) ──
  reversedAt       DateTime?
  reversedReason   String?          // "REFUND" / "CANCELLATION" / "ADMIN_REVERSAL"
  reversedBy       String?          // User.id admin (null = system/refund)
  reversalEntryId  String?          // id baris reversal yang membalik baris ini

  // ── Metadata ──
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  // ── Relations ──
  transaksi        Transaksi        @relation(fields: [transaksiId], references: [id])
  teacher          User             @relation("CommissionTeacher", fields: [teacherId], references: [id])
  student          User             @relation("CommissionStudent", fields: [studentId], references: [id])
  attribution      TeacherAttribution @relation(fields: [attributionId], references: [id])
  wallet           TeacherWallet?   @relation(fields: [teacherId], references: [teacherId])
  withdrawals      TeacherCommissionWithdrawal[]

  // ── Idempotency ──
  @@unique([transaksiId, teacherId])   // satu transaksi × satu guru = maksimal 1
  @@index([teacherId, status])         // dashboard guru: my commissions
  @@index([status, createdAt])         // admin batch processing
  @@index([transaksiId])               // webhook: cari komisi existing
}

enum WalletStatus {
  ACTIVE
  SUSPENDED     // admin suspend (fraud investigation)
  CLOSED        // guru tidak lagi memenuhi syarat
}

/// Dompet komisi guru — TERPISAH dari User.saldo (marketplace).
/// Satu baris per guru.
model TeacherWallet {
  teacherId        String           @unique  // User.id
  availableBalance Int              @default(0)  // sudah AVAILABLE, siap tarik
  pendingBalance   Int              @default(0)  // ELIGIBLE belum AVAILABLE (holding)
  totalPaid        Int              @default(0)  // lifetime total yang sudah ditransfer
  totalReversed    Int              @default(0)  // lifetime total reversal
  status           WalletStatus     @default(ACTIVE)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  teacher          User             @relation(fields: [teacherId], references: [id])
  commissions      TeacherCommission[]
  withdrawals      TeacherCommissionWithdrawal[]

  @@index([status])
}

enum WithdrawalStatus {
  PENDING     // guru mengajukan
  APPROVED    // admin menyetujui
  REJECTED    // admin menolak (saldo kembali)
  TRANSFERRED // sudah ditransfer — terminal
  CANCELLED   // guru membatalkan sendiri — terminal
}

/// Penarikan dari TeacherWallet (bukan User.saldo).
/// NAMA BERBEDA dari model Withdrawal marketplace untuk menghindari kebingungan.
model TeacherCommissionWithdrawal {
  id               String           @id @default(cuid())
  walletId         String
  teacherId        String
  amount           Int              // nominal yang diminta
  bankName         String           // snapshot dari Profile saat submit
  accountNumber    String           // snapshot
  accountHolder    String           // snapshot
  status           WithdrawalStatus @default(PENDING)
  notes            String?          // admin rejection reason
  processedAt      DateTime?        // admin acted
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  wallet           TeacherWallet    @relation(fields: [walletId], references: [id])
  teacher          User             @relation("CommissionWithdrawals", fields: [teacherId], references: [id])
  commissions      TeacherCommission[]

  @@index([teacherId, status])
  @@index([status])
}
```

### Revisi pada Model Existng

```prisma
model User {
  // ... existing fields ...
  teacherWallet             TeacherWallet?          @relation(fields: [id], references: [teacherId])
  commissionsAsTeacher      TeacherCommission[]     @relation("CommissionTeacher")
  commissionsAsStudent      TeacherCommission[]     @relation("CommissionStudent")
  commissionWithdrawals     TeacherCommissionWithdrawal[] @relation("CommissionWithdrawals")
  attributionsAsStudent     TeacherAttribution[]    @relation("AttributionStudent")
  attributionsAsTeacher     TeacherAttribution[]    @relation("AttributionTeacher")
  attributionEvents         TeacherAttributionEvent[] @relation("AttributionEvents")
}
```

---

## D. Transaction Boundary & Idempotency

### D.1 Commission Accrual (di dalam webhook `$transaction`)

**Lokasi**: `POST /api/payment/webhook/route.ts`, di dalam blok `db.$transaction` yang sudah ada, SETELAH claim menang (`claim.count === 1`) dan SEBELUM return.

**Flow pseudo-code**:
```
// ═══ BLOK BARU — evaluated SETELAH claim menang ═══
if (transaksi.type === "MURID_PREMIUM" && claim.count === 1) {
  // 1. Cari attribution ACTIVE milik murid
  const attribution = await tx.teacherAttribution.findFirst({
    where: { studentId: transaksi.userId, status: "ACTIVE" }
  });

  if (!attribution) {
    // Tidak ada guru ter-attribusi → tidak ada komisi
    // (bukan error — mungkin murid belum join kelas)
    console.log("[Commission] No attribution for student", { userId: transaksi.userId });
  } else {
    // 2. Cek eligibility: transaksi.createdAt >= eligibleFrom
    const eligible = transaksi.createdAt >= attribution.eligibleFrom;

    // 3. Cek idempotensi: sudah ada komisi untuk transaksi × guru ini?
    const existing = await tx.teacherCommission.findUnique({
      where: { transaksiId_teacherId: { transaksiId: transaksi.id, teacherId: attribution.teacherId } }
    });

    if (!existing) {
      // 4. Hitung komisi
      const grossAmount = transaksi.amount;
      const commissionRate = 0.10;
      const commissionAmount = Math.floor(grossAmount * commissionRate);

      // 5. Tentukan initial status
      const initialStatus: CommissionStatus = eligible ? "ELIGIBLE" : "PENDING";

      // 6. Create commission entry (snapshot lengkap)
      await tx.teacherCommission.create({
        data: {
          transaksiId: transaksi.id,
          teacherId: attribution.teacherId,
          studentId: transaksi.userId,
          attributionId: attribution.id,
          attributionSource: attribution.source,
          sourceGroupId: attribution.sourceGroupId,
          eligibleFrom: attribution.eligibleFrom,
          grossAmount,
          commissionRate,
          commissionAmount,
          status: initialStatus,
          holdingEndsAt: null, // instant pada launch
        }
      });

      // 7. Update wallet (skip jika PENDING — belum cair)
      if (initialStatus === "ELIGIBLE") {
        // Instant: AVAILABLE langsung
        const wallet = await tx.teacherWallet.upsert({
          where: { teacherId: attribution.teacherId },
          create: { teacherId: attribution.teacherId, availableBalance: commissionAmount, pendingBalance: 0 },
          update: { availableBalance: { increment: commissionAmount } }
        });
        // Update commission → AVAILABLE
        await tx.teacherCommission.update({
          where: { id: commission.id },
          data: { status: "AVAILABLE", availableAt: new Date(), settledAt: new Date() }
        });
      }
    }
    // else: idempotent — sudah ada, skip
  }
}
```

**Idempotency guarantee**:
- `@@unique([transaksiId, teacherId])` di DB: concurrent webhook → P2002 pada create → read existing → no-op.
- Code-level check (`findUnique`) di dalam `$transaction`: additional guard (belt + suspenders).
- Webhook claim-first (`updateMany status !== SUCCESS`): hanya satu webhook per transaksi masuk blok ini.

### D.2 Attribution Evaluation di Webhook

| Kondisi | Efek ke komisi | Keterangan |
|---|---|---|
| Attribution ACTIVE + eligibleFrom ≤ transaksi.createdAt | → ELIGIBLE → AVAILABLE (instant) | Kasus normal: murid join dulu, beli premium belakangan |
| Attribution ACTIVE + eligibleFrom > transaksi.createdAt | → PENDING (hold) | Murid sudah premium → join → guru dapat komisi mulai renewal berikutnya (§H.2). Transaksi LAMA tetap PENDING → dapat di-reverse nanti jika expired |
| Tidak ada attribution | Tidak buat komisi | Murid belum join kelas manapun. Jika join belakangan, retroactive TIDAK dilakukan (additive-only: new payment only) |
| Attribution SUPERSEDED | Pakai attribution STATUS `ACTIVE` | Koreksi admin sudah terjadi → pakai yang terbaru |

---

## E. Teacher Wallet — Balance Semantics

### E.1 Wallet Balance Composition

```
┌─────────────────────────────────────────────────────┐
│                   TeacherWallet                      │
│                                                      │
│  availableBalance = total komisi yang AVAILABLE       │
│                    dan BELUM di-withdraw              │
│                    (uang yang bisa ditarik sekarang)  │
│                                                      │
│  pendingBalance   = total komisi ELIGIBLE yang        │
│                    BELUM AVAILABLE (masih holding)    │
│                    (0 saat launch — instant)          │
│                                                      │
│  totalPaid        = lifetime komisi yang sudah        │
│                    ditransfer (PAID)                  │
│                                                      │
│  totalReversed    = lifetime komisi yang di-reverse   │
│                    (audit — bukan pengurang langsung) │
│                                                      │
│  ─────────────────────────────────────────────────── │
│  TOTAL ERNED = available + pending + (process+paid)  │
│  WITHDRAWN = totalPaid                                │
│  FREE BALANCE = availableBalance                      │
└─────────────────────────────────────────────────────┘
```

### E.2 Balance Mutation Rules

| Event | Wallet Field | Mutation | Di dalam `$transaction`? |
|---|---|---|---|
| Komisi → ELIGIBLE → AVAILABLE (instant) | `availableBalance` | `increment(commissionAmount)` | Ya (webhook) |
| Komisi → REVERSED (dari AVAILABLE) | `availableBalance` | `decrement(commissionAmount)` | Ya |
| Komisi → REVERSED (dari ELIGIBLE) | `pendingBalance` | `decrement(commissionAmount)` | Ya |
| Komisi → PROCESSING (withdrawal) | `availableBalance` | `decrement(amount)` | Ya (withdraw route) |
| Komisi → AVAILABLE (rollback withdrawal) | `availableBalance` | `increment(amount)` | Ya (admin reject) |
| Komisi → PAID (transfer sukses) | `totalPaid` | `increment(amount)` | Ya (admin transfer) |

### E.3 Why Separate from User.saldo?

1. **Isolasi**: `User.saldo` = marketplace earnings (85% from karya sales). `TeacherWallet` = referral commission (10% from murid premium). Mixing = audit nightmare.
2. **Rate limit isolation**: Withdrawal guard berbeda. Marketplace saldonya mungkin berbeda dari komisi saldonya.
3. **Rollback isolation**: Reversal komisi tidak mengurangi marketplace earnings (yang mungkin sudah ditarik).
4. **UI clarity**: Guru melihat dua angka terpisah: "Saldo Karya" vs "Saldo Guru Cerdas Sejahtera".

---

## F. Withdrawal Integration

### F.1 Reuse Existing Pattern (dengan penyesuaian)

| Aspek | Marketplace (existing) | Guru Cerdas Sejahtera (baru) | Perubahan |
|---|---|---|---|
| Model | `Withdrawal` | `TeacherCommissionWithdrawal` | Nama baru — avoid kebingungan |
| Source | `User.saldo` | `TeacherWallet.availableBalance` | DB berbeda |
| Minimum | Rp 50.000 (`MINIMAL_PENARIKAN`) | Rp 50.000 (reuse) | Same |
| Guard pending | 1 active (`PENDING/APPROVED`) | 1 active (`PENDING/APPROVED`) | Same |
| Locking | Compare-and-swap `updateMany saldo >= nominal` | Compare-and-swap `updateMany availableBalance >= amount` | Same |
| Bank snapshot | Dari `Profile` saat submit | Dari `Profile` saat submit | Same |
| Admin process | Founder-only, `$transaction`, TRANSISI_SAH | Founder-only, `$transaction`, TRANSISI_SAH | Same |
| Rejection | `increment(User.saldo)` | `increment(TeacherWallet.availableBalance)` | DB berbeda |
| Rate limit | 5 req / 60s | 5 req / 60s | Same |

### F.2 TRANSISI_SAH

```typescript
const TEACHER_COMMISSION_WITHDRAWAL_TRANSITIONS: Record<string, string[]> = {
  PENDING:     ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED:    ["TRANSFERRED", "REJECTED"],
  REJECTED:    [],
  TRANSFERRED: [],
  CANCELLED:   [],
};
```

**Tambahkan `CANCELLED`** — guru bisa membatalkan pengajuan sendiri selama masih `PENDING` (uang kembali ke `availableBalance`).

### F.3 Admin Audit Trail

Re-use `AdminPaymentAuditLog` untuk komisi guru:

```typescript
await tx.adminPaymentAuditLog.create({
  data: {
    adminUserId: adminUser.id,
    targetUserId: teacherId,
    action: "TEACHER_COMMISSION_WITHDRAWAL_APPROVED",
    previousValue: JSON.stringify({ status: "PENDING" }),
    newValue: JSON.stringify({ status: "APPROVED", amount }),
    reason: notes,
    metadata: JSON.stringify({
      withdrawalId,
      walletId,
      commissionIds: matchedCommissionIds,
      type: "GCS_WITHDRAWAL",
    }),
  }
});
```

---

## G. Refund & Reversal Handling

### G.1 Trigger Events

| Event | Source | Efek ke komisi |
|---|---|---|
| Murid refund premium | Midtrans webhook `cancel`/`expire`/`deny` | Reverse komisi terkait |
| Admin reverse komisi | Admin action `REVERSE` | Reverse komisi langsung |
| Attribution revoked | Admin revoke `TeacherAttribution` | Reverse semua komisi berstatus AVAILABLE milik guru tsb untuk murid tsb |
| Withdrawal rejection | Admin reject | Saldo kembali ke wallet (bukan reversal komisi) |

### G.2 Reversal Pattern (Append-Only)

**DILARANG menghapus baris komisi.** Reversal = append baris baru dengan `status: "REVERSED"`, update baris lama `reversedAt/reversedReason/reversedBy`.

```typescript
// Reversal entry (baris baru dengan nomor +)
await tx.teacherCommission.create({
  data: {
    // Kopi semua field dari baris asli
    transaksiId: original.transaksiId,
    teacherId: original.teacherId,
    studentId: original.studentId,
    attributionId: original.attributionId,
    attributionSource: original.attributionSource,
    sourceGroupId: original.sourceGroupId,
    eligibleFrom: original.eligibleFrom,
    grossAmount: original.grossAmount,
    commissionRate: original.commissionRate,
    commissionAmount: original.commissionAmount, // nominal yang di-reverse (positif)
    status: "REVERSED",
    reversedAt: new Date(),
    reversedReason: reason,
    reversedBy: adminUserId,
    reversalEntryId: original.id, // pointer ke baris asli
  }
});

// Update baris asli
await tx.teacherCommission.update({
  where: { id: original.id },
  data: {
    status: "REVERSED", // lifecycle update (bukan delete)
    reversedAt: new Date(),
    reversedReason: reason,
    reversedBy: adminUserId,
  }
});

// Update wallet
await tx.teacherWallet.update({
  where: { teacherId: original.teacherId },
  data: {
    availableBalance: { decrement: original.commissionAmount },
    totalReversed: { increment: original.commissionAmount },
  }
});
```

### G.3 Refund Detection di Webhook

```
// Di dalam blok non-SUCCESS di webhook ($transaction):
if (["cancel", "expire", "deny"].includes(transaction_status)) {
  // Cek apakah ini transaksi MURID_PREMIUM yang sudah punya komisi
  const commissions = await tx.teacherCommission.findMany({
    where: { transaksiId: transaksi.id, status: { in: ["ELIGIBLE", "AVAILABLE"] } }
  });

  for (const komisi of commissions) {
    // Auto-reverse (append entry)
    // Pola seperti §G.2 di atas
  }
}
```

**Catatan**: Refund hanya di-reverse jika komisi masih `ELIGIBLE` atau `AVAILABLE`. Jika sudah `PROCESSING`/`PAID` → **flag untuk manual review** (tidak auto-reverse karena uang sudah ditransfer).

---

## H. Monthly Commission Aggregation

### H.1 Purpose

Dashboard guru dan laporan admin butuh ringkasan komisi per bulan tanpa scan seluruh ledger.

### H.2 Design: View / Aggregation Query (bukan tabel baru)

```typescript
// Dashboard guru: komisi bulan ini
async function getMonthlyCommissionSummary(teacherId: string, month: string) {
  // month = "2026-09"
  const startOfMonth = new Date(`${month}-01T00:00:00+07:00`);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const result = await db.teacherCommission.groupBy({
    by: ["status"],
    where: {
      teacherId,
      createdAt: { gte: startOfMonth, lt: endOfMonth },
    },
    _sum: { commissionAmount: true },
    _count: true,
  });

  return {
    month,
    commissions: result.map(r => ({
      status: r.status,
      total: r._sum.commissionAmount || 0,
      count: r._count,
    })),
    // Ringkasan
    totalAvailable: result.filter(r => ["AVAILABLE", "PROCESSING"].includes(r.status)).reduce((a, r) => a + (r._sum.commissionAmount || 0), 0),
    totalReversed: result.filter(r => r.status === "REVERSED").reduce((a, r) => a + (r._sum.commissionAmount || 0), 0),
  };
}
```

### H.3 Admin Dashboard: Commission Overview

```typescript
async function getCommissionOverview(month?: string) {
  const start = month ? new Date(`${month}-01T00:00:00+07:00`) : /* start of current month */;
  const end = month ? /* end of month */ : /* now */;

  const [byStatus, topTeachers, totalPaid, pendingCount] = await Promise.all([
    db.teacherCommission.groupBy({ by: ["status"], where: { createdAt: { gte: start, lt: end } }, _sum: { commissionAmount: true }, _count: true }),
    db.teacherCommission.groupBy({ by: ["teacherId"], where: { createdAt: { gte: start, lt: end }, status: "PAID" }, _sum: { commissionAmount: true }, _count: true, orderBy: { _sum: { commissionAmount: "desc" } }, take: 10 }),
    db.teacherCommission.aggregate({ where: { status: "PAID", settledAt: { gte: start, lt: end } }, _sum: { commissionAmount: true } }),
    db.teacherCommission.count({ where: { status: { in: ["PENDING", "ELIGIBLE", "AVAILABLE", "PROCESSING"] } } }),
  ]);

  return { byStatus, topTeachers, totalPaid: totalPaid._sum.commissionAmount || 0, pendingCount };
}
```

---

## I. Edge-Case Matrix

| # | Edge Case | Aturan | Implementation |
|---|---|---|---|
| 1 | Webhook concurrent (2× settlement same transaksi) | Claim-first: `claim.count === 1` menang | Pola existing — tidak berubah |
| 2 | Komisi concurrent (2× create for same transaksi × teacher) | `@@unique([transaksiId, teacherId])` → P2002 | DB-level guard |
| 3 | Withdrawal concurrent (2× tarik same amount from wallet) | Compare-and-swap: `updateMany availableBalance >= amount` | Pola existing (`guru/withdraw:83-84`) |
| 4 | Attribution belum ada saat settle | Komisi = `PENDING` (tidak ada wallet mutation) | Webhook create PENDING tanpa wallet update |
| 5 | Attribution baru dibuat setelah settle | **Tidak ada retroactive** — P7A §H.2 approves prospective-only. Komisi PENDING lama → dapat di-reverse oleh admin jika expired |
| 6 | Backfill enrollment pra-launch | Attribution ACTIVE + `eligibleFrom = launch date`. Transaksi sebelum launch → PENDING (reverse-eligible) | Script idempotent + admin review |
| 7 | Murid bayar → guru reverse → murid bayar lagi | Komisi baru (baris baru, `@@unique` tidak tabrak karena transaksi berbeda) | Idempotency per-transaksi, bukan per-murid |
| 8 | Guru withdraw → komisi masih PENDING | Tidak bisa — withdrawal hanya dari `availableBalance` | Guard: `availableBalance >= amount` |
| 9 | Komisi REVERSED setelah AVAILABLE | `availableBalance -= amount`, `totalReversed += amount` | Wallet update atomik dalam $transaction |
| 10 | Komisi REVERSED setelah PROCESSING | **Manual review** — tidak auto-reverse | Admin flag, audit log |
| 11 | Komisi REVERSED setelah PAID | **Manual review** — klaimback needed | Admin flag + audit log; uang sudah ditransfer |
| 12 | Self-attribution (guru enroll di kelas sendiri) | Dihilangkan oleh P7A R2 materializer (studentId ≠ teacherId) | Tidak ada komisi self-dealing |
| 13 | Founding/ADMIN tidak eligible (§H.5) | Filter di settlement gate: `user.isFounder \|\| user.role === "ADMIN"` → skip | Guard server-side di webhook block |
| 14 | Wallet SUSPENDED (fraud investigation) | Withdrawal ditolak; available tetap ada tapi tidak bisa tarik | Status check di withdrawal route |
| 15 | Holding period ditambah later | `holdingEndsAt` nullable + ELIGIBLE → AVAILABLE gate: `now >= holdingEndsAt || holdingEndsAt === null` | Configurable, tanpa schema change |
| 16 | Kupon Rp 1.000 "Program Guru Cerdas" | `grossAmount` = Transaksi.amount (pasca-kupon). Komisi = 10% × Rp 18.000 (jika kupon dipakai) | Automatic: amount validation sudah ada |
| 17 | Concurrent settlement + attribution creation | Settlement → no attribution → PENDING. Attribution materialized later → tetap PENDING (no auto-retroactive) | Design correct by construction |

---

## J. Transaction Boundaries — Complete Map

```
POST /api/payment/webhook
│
├── SIGNATURE VERIFICATION (outside $transaction)
├── LOOKUP Transaksi by orderId (outside)
├── AMOUNT VALIDATION (outside)
├── DOWNGRADE GUARD (outside)
│
└── db.$transaction
    ├── CLAIM Transaksi SUCCESS (idempotent)
    ├── [IF MURID_PREMIUM]
    │   ├── LOOKUP TeacherAttribution (studentId, ACTIVE)
    │   ├── CALC commission (10% × amount)
    │   ├── CHECK @@unique (transaksiId, teacherId)
    │   ├── CREATE TeacherCommission (snapshot)
    │   └── UPSERT TeacherWallet (increment availableBalance)
    ├── [IF KARYA_PURCHASE]
    │   ├── CLAIM Pembelian PAID
    │   └── CREDIT User.saldo + SellerEarning COMPLETED
    └── RETURN result

POST /api/guru/withdraw (teacher commission)
│
├── AUTH + RATE LIMIT (outside)
├── VALIDATE minimum + pending guard (outside)
├── SNAPSHOT Profile bank (outside)
│
└── db.$transaction
    ├── COMPARE-AND-SWAP TeacherWallet (availableBalance >= amount)
    ├── CREATE TeacherCommissionWithdrawal (PENDING)
    └── RETURN withdrawal

PATCH /api/admin/withdrawals/[id] (teacher commission)
│
├── AUTH founder-only (outside)
│
└── db.$transaction
    ├── LOOKUP TeacherCommissionWithdrawal
    ├── TRANSITION GUARD (TRANSISI_SAH)
    ├── [IF REJECTED] RECREMENT TeacherWallet
    ├── [IF TRANSFERRED] UPDATE TeacherWallet.totalPaid
    ├── UPDATE withdrawal status
    ├── CREATE AdminPaymentAuditLog
    ├── CREATE Notifikasi
    └── RETURN result
```

---

## K. QA Strategy

### K.1 Unit Tests (deterministic, tanpa DB)

| Test | Assertion |
|---|---|
| Commission rate | `floor(19000 × 0.10) === 1900`, `floor(180000 × 0.10) === 18000` |
| Commission with coupon | `floor(15000 × 0.10) === 1500` |
| Minimum commission | `floor(1000 × 0.10) === 100` (Rp 1.000 kupon) |
| Eligibility logic | `transaksi.createdAt >= eligibleFrom` → ELIGIBLE; otherwise PENDING |
| State transitions | All valid → OK; invalid → reject (17 cases from matrix §I) |
| Balance composition | `available + pending + (process+paid) = total earned` invariant |
| Holding period | `holdingEndsAt = null` → instant; `holdingEndsAt > now` → ELIGIBLE only |

### K.2 Integration Tests (with mock DB)

| Test | Scenario |
|---|---|
| Webhook create commission | Settlement MURID_PREMIUM with attribution → commission ELIGIBLE → AVAILABLE |
| Webhook no attribution | Settlement without attribution → no commission created |
| Webhook idempotent | 2× settlement same transaksi → 1 commission (P2002 / count=0) |
| Webhook reversed | Cancel after settlement → commission REVERSED, wallet decremented |
| Withdrawal happy path | Request → PENDING → APPROVED → TRANSFERRED, wallet debited |
| Withdrawal insufficient balance | `availableBalance < amount` → 400 |
| Withdrawal concurrent | 2× withdrawal same wallet → compare-and-swap, 1 wins |
| Admin reject | PENDING → REJECTED, wallet re-credited |
| Attribution revoke → commission reverse | Admin revoke attribution → auto-reverse AVAILABLE commissions |

### K.3 Static Tests (no DB, code analysis)

| Test | Assertion |
|---|---|
| No `deleteMany`/`delete` on TeacherCommission | Ledger append-only |
| No `deleteMany`/`delete` on TeacherCommissionWithdrawal | Audit trail preserved |
| All commission mutations inside `$transaction` | Atomicity |
| `@@unique([transaksiId, teacherId])` exists | Anti-double-commission |
| No `User.saldo` in commission code | Wallet isolation |
| Founder/ADMIN guard in settlement gate | §H.5 compliance |
| Snapshot fields present (attributionId, source, sourceGroupId, eligibleFrom) | Audit trail completeness |

### K.4 Invariant Tests (property-based)

```typescript
// Invariant 1: ≤1 ACTIVE attribution per student
const active = await db.teacherAttribution.count({ where: { studentId, status: "ACTIVE" } });
assert(active <= 1);

// Invariant 2: ≤1 commission per (transaksi × teacher)
const count = await db.teacherCommission.count({ where: { transaksiId, teacherId } });
assert(count <= 1);

// Invariant 3: wallet balance ≥ 0
const wallet = await db.teacherWallet.findUnique({ where: { teacherId } });
assert(wallet.availableBalance >= 0);
assert(wallet.pendingBalance >= 0);

// Invariant 4: totalPaid = sum(PAID commissions)
const paid = await db.teacherCommission.aggregate({
  where: { teacherId, status: "PAID" },
  _sum: { commissionAmount: true }
});
assert(wallet.totalPaid === paid._sum.commissionAmount);

// Invariant 5: reversed commissions don't count in available
// (enforced by state machine — AVAILABLE cannot go to REVERSED directly from PROCESSING/PAID)
```

---

## L. Known Risks & Mitigations

| Risiko | Impact | Mitigasi |
|---|---|---|
| Webhook ganti blok existing | Bisa break premium/seller flow | Additive-only: blok baru dievaluasi SETELAH return existing logic; tidak menempel di blok existing |
| `TeacherWallet` upsert race (concurrent commission) | `increment` atomic SQL — safe | Prisma `increment` = SQL `SET availableBalance = availableBalance + N` |
| `User.saldo` existing punya race condition (legacy `/api/finance`) | Sudah ada (pre-existing bug, legacy route) | Modern `guru/withdraw` aman; legacy route untuk P7B tidak disentuh |
| `SellerEarning` tidak punya unique constraint | Bisa duplicate earning untuk karya sama | Pre-existing issue — tidak disentuh oleh P7B |
| `AdminPaymentAuditLog` tidak dipakai untuk withdrawal existing | Gap audit | P7B menambahkan logging ke withdrawal admin — additive improvement |
| Holding period belum diimplementasikan | Komisi langsung AVAILABLE | Design mendukung via `holdingEndsAt` nullable; tambah later tanpa schema change |
| Founder lupa reverse komisi saat refund | Komisi lebih dari seharusnya | Auto-reverse di webhook untuk ELIGIBLE/AVAILABLE; flag manual untuk PROCESSING/PAID |
| Multi-key settlement (Midtrans retry ke endpoint berbeda) | Claim-first dalam satu `$transaction` sudah aman | Tanpa perubahan |

---

## M. Implementation Boundaries (untuk P7C)

### M.1 Files to CREATE (no existing files modified for schema)

| File | Purpose |
|---|---|
| `prisma/migrations/manual/2026-08-26_teacher_commission.sql` | Idempotent SQL: CREATE TABLE + CREATE INDEX |
| `lib/commission/config.ts` | Constants: `COMMISSION_RATE = 0.10`, `MINIMAL_PENARIKAN = 50_000`, transition map |
| `lib/commission/engine.ts` | `evaluateCommission(tx, transaksi, attribution)` — core logic |
| `lib/commission/wallet.ts` | `getWalletBalance()`, `debitWallet()`, `creditWallet()` — safe wrappers |
| `app/api/guru/commission-balance/route.ts` | GET wallet balance + recent commissions |
| `app/api/guru/commission-withdraw/route.ts` | POST withdrawal request (pattern: guru/withdraw) |
| `app/api/admin/commissions/[id]/route.ts` | PATCH approve/reject/transfer |
| `app/api/admin/commissions/route.ts` | GET list all commissions (admin dashboard) |
| `scripts/test-p7b-commission.ts` | Unit + integration tests |
| `scripts/audit-p7b-commission.ts` | Static invariant tests |

### M.2 Files to MODIFY (minimal, additive blocks)

| File | Change |
|---|---|
| `app/api/payment/webhook/route.ts` | +1 block after existing logic: commission evaluation (30-40 lines) |
| `app/api/admin/withdrawals/[id]/route.ts` | +1 branch for `TeacherCommissionWithdrawal` type |

### M.3 Files NOT TOUCHED

- `prisma/schema.prisma` (use raw SQL migration — pooler timeout)
- `lib/ai-gateway/`, `lib/gamification/`, `lib/learning-loop/`, `lib/apk.ts`
- `app/api/user/`, `app/api/siswa/`, `app/api/kompetensi/`
- Any existing `Withdrawal` model or marketplace routes

---

## N. Founder Gate P7B

Sebelum P7C (implementation), founder harus menyetujui:

| # | Pertanyaan | Rekomendasi |
|---|---|---|
| **N.1** | Apa model schema §C disetujui? (TeacherCommission + TeacherWallet + TeacherCommissionWithdrawal) | Approve |
| **N.2** | Holding period: instant (0 hari) saat launch, configurable later? | Approve — paling sederhana untuk MVP |
| **N.3** | Wallet terpisah dari User.saldo — atau gabung? | Terpisah (recommended §E.3) |
| **N.4** | Reversal auto untuk ELIGIBLE/AVAILABLE saat refund; manual untuk PROCESSING/PAID? | Ya — safe default |
| **N.5** | Guru bisa batalkan pengajuan sendiri (CANCELLED)? | Ya — UX yang baik |
| **N.6** | Minimum withdrawal Rp 50.000 untuk komisi (sama dengan marketplace)? | Sama (reuse) |
| **N.7** | Admin audit log pakai `AdminPaymentAuditLog` yang sudah ada? | Ya — additive |

---

*Akhir laporan P7B. Implementasi (schema, engine, wiring) MENUNGGU persetujuan founder.*
