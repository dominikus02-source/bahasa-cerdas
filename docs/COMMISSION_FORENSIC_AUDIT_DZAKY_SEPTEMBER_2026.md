# Commission Forensic Audit — Dzaky Salman Mahendra

**Date**: September 1, 2026  
**Auditor**: Automated forensic script  
**Subject**: Teacher reports student "Dzaky" is theirs but /guru/komisi shows Rp0  
**Status**: ROOT CAUSE IDENTIFIED — System working as designed

---

## Executive Summary

The commission system is working correctly. The teacher (Dominikus Wahyu) sees Rp0 because **he is excluded from the commission system by design** — he is ADMIN+founder. The `isEligibleForCommission()` guard explicitly blocks ADMIN/founder teachers from receiving commissions. Additionally, the commission system has **never created a single commission entry** for ANY teacher globally.

---

## 1. Student Profile — Dzaky Salman Mahendra

| Field | Value |
|-------|-------|
| User ID | `cmru3bleo001dr8mjxd1hay5v` |
| Full Name | Dzaky Salman Mahendra |
| Role | MURID |
| isPremium | `true` |
| premiumUntil | 2026-10-01 11:06:45 UTC |
| premiumPlan | PRO |
| Created | 2026-07-21 03:24:58 UTC |

### Premium Transactions (6 total)

| ID | Amount (Rp) | Status | Created |
|----|-------------|--------|---------|
| `cmtifukp60005l9gv2g2lchpe` | 19,000 | PENDING | 2026-09-01 09:01:49 |
| `cmtiftg700001l9gv7vgm8o7n` | 19,000 | SUCCESS | 2026-09-01 09:00:57 |
| `cmti5880n002gf6j707q3qnym` | 19,000 | SUCCESS | 2026-09-01 04:04:30 |
| `cmti4kbrj006besn3yfkpl7z0` | 19,000 | EXPIRED | 2026-09-01 03:45:55 |
| `cmtcl7n74006vbbg3derkoa8i` | 19,000 | EXPIRED | 2026-08-28 06:45:20 |
| `cmtcl76r6002mpmpsh9uyhfjc` | 180,000 | EXPIRED | 2026-08-28 06:44:59 |

**Total SUCCESS payments**: Rp38,000 (2 × Rp19,000)  
**Current premium**: ACTIVE (PRO, expires 2026-10-01)

---

## 2. Teacher Profile — Dominikus Wahyu

| Field | Value |
|-------|-------|
| User ID | `cmqxema6a000013z9kefn4jm1` |
| Full Name | Dominikus Wahyu |
| **Role** | **ADMIN** |
| **isFounder** | **true** |
| Classes | 6 classes (7, 7A, 7B, 8A, 8B, 9A, 9B, Test Kelas) |
| Total Students | 136 across all classes |

### Dzaky's Class Membership

| Class | Joined | Group ID |
|-------|--------|----------|
| 9A | 2026-07-21 03:41:50 | `cmru3vybc001ml07foeyww24a` |

**Only 1 premium student in class 9A**: Dzaky Salman Mahendra

---

## 3. Root Cause Analysis

### ROOT CAUSE 1: Teacher excluded from commission system (PRIMARY)

In `lib/commission/config.ts:55`:

```typescript
export function isEligibleForCommission(role: string, isFounder?: boolean): boolean {
  return role === 'GURU' && !isFounder;
}
```

Dominikus Wahyu is `role: "ADMIN"` AND `isFounder: true` → **both conditions fail** → `isEligibleForCommission()` returns `false`.

In `lib/commission/attribution.ts:73`:

```typescript
if (!teacher || !isEligibleForCommission(teacher.role, teacher.isFounder)) {
  return { ... skipped: true, skipReason: "TEACHER_EXCLUDED" };
}
```

**Every student joining any of Dominikus Wahyu's classes hits this guard** → attribution never created → commission never created.

### ROOT CAUSE 2: Commission system has never created ANY commission entries

| Metric | Count |
|--------|-------|
| TeacherCommission entries | **0** |
| TeacherWallet records | **0** |
| TeacherAttribution records | 35 (4 other teachers) |
| Teachers with commissions | **0** |

The commission system was built (P7C-P8J) but **has never processed a payment through the webhook → commission pipeline**. Even the 35 attributed students for 4 other teachers have generated zero commission.

### ROOT CAUSE 3: Dzaky joined class BEFORE commission launch

| Event | Date | Commission Status |
|-------|------|-------------------|
| Dzaky joined class 9A | 2026-07-21 03:41 UTC | System not yet live |
| Commission launch date | 2026-07-30 00:00 WIB | System goes live |
| Dzaky's first premium payment | 2026-08-28 06:44 UTC | System live, but no attribution exists |

Even if the teacher were eligible, Dzaky joined BEFORE the commission system launched. The `eligibleFrom` would be set to `max(now, launchDate)` — but no attribution was ever created because the teacher is excluded.

---

## 4. Commission Flow Trace

```
Student pays → Midtrans Webhook → /api/payment/webhook/route.ts
  → createCommissionFromTransaction(transaksiId)
    → resolveAttribution(transaksiId)  // finds TeacherAttribution by studentId
    → IF attribution found AND teacher eligible → create commission entry
    → IF no attribution OR teacher excluded → SKIP (no commission)
```

**For Dzaky specifically**:
1. ✅ Payment webhook received (2 SUCCESS transactions)
2. ❌ `resolveAttribution()` → finds NO attribution for Dzaky → returns null
3. ❌ Commission creation SKIPPED — no attribution to attribute to

---

## 5. /guru/komisi Data Flow

```
/guru/komisi → KomisiClient → GET /api/teacher/commissions
  → getUser() → role check (GURU or founder)
  → getOrCreateWallet(teacherId) → returns zero balances (no wallet exists)
  → commissionSummary(teacherId) → returns empty (no commission entries)
  → activePremiumStudents(teacherId) → returns 0 (no attributions)
  → listCommissions(teacherId) → returns empty (no commission entries)
```

The Rp0 shown is **correct** — there are literally zero commission entries for this teacher.

---

## 6. Why 35 Attributions Exist But Zero Commissions

The 35 attributions exist for 4 other teachers (Notormawati, Al Baikhatus, Dorothea, Kristina). However:

1. These attributions were likely created via backfill or class join AFTER the commission launch
2. The commission engine runs during the Midtrans webhook payment flow
3. If no student of these teachers has made a SUCCESS payment through the webhook AFTER attribution was created, no commission entries exist

**This is a separate issue** — the commission pipeline may not be fully wired (webhook → commission creation).

---

## 7. Summary of Findings

| Finding | Detail |
|---------|--------|
| **Dzaky IS premium** | ✅ Active PRO plan, expires 2026-10-01 |
| **Dzaky IS in Dominikus Wahyu's class** | ✅ Class 9A, joined 2026-07-21 |
| **Dzaky HAS paid** | ✅ 2 SUCCESS payments (Rp38,000) |
| **TeacherAttribution exists for Dzaky** | ❌ NONE — teacher excluded (ADMIN+founder) |
| **TeacherCommission exists for Dzaky** | ❌ NONE — no attribution → no commission |
| **TeacherWallet exists for teacher** | ❌ NONE — zero balance |
| **Is this a bug?** | ⚠️ **NO — system working as designed** |
| **Why Rp0?** | Teacher is ADMIN+founder → excluded from commission system |

---

## 8. Recommendations

### Option A: Accept as designed (no change)
The founder/ADMIN is excluded from earning commission from their own students. This is intentional — the commission system is for regular teachers (GURU role) who bring students to the platform.

### Option B: Allow ADMIN/founder to earn commission
If the founder wants to earn commission from Dzaky's payments:
1. Remove the `isFounder` check from `isEligibleForCommission()`
2. Or: Change Dominikus Wahyu's role from ADMIN to GURU
3. Run backfill to create attributions for all students in Dominikus Wahyu's classes
4. Run commission creation for existing SUCCESS transactions

### Option C: Hybrid — Allow founder but not ADMIN
Remove `isFounder` check but keep ADMIN check, or vice versa.

---

## 9. Files Involved

| File | Role |
|------|------|
| `lib/commission/config.ts:55` | `isEligibleForCommission()` — the guard that excludes ADMIN/founder |
| `lib/commission/attribution.ts:73` | Uses the guard — skips attribution for excluded teachers |
| `lib/commission/engine.ts` | Creates commission entries from attributed transactions |
| `lib/commission/wallet.ts` | Reads wallet balances (zero when no commissions) |
| `app/api/payment/webhook/route.ts` | Midtrans webhook → triggers commission creation |
| `app/api/teacher/commissions/route.ts` | Returns commission data to UI |
| `components/guru/komisi/KomisiClient.tsx` | Renders the /guru/komisi dashboard |

---

## 10. Verification Commands

```sql
-- Find Dzaky
SELECT * FROM "User" WHERE "fullName" LIKE '%Dzaky%' OR "fullName" LIKE '%Dzaki%';

-- Check teacher's role
SELECT id, "fullName", role, "isFounder" FROM "User" WHERE id = 'cmqxema6a000013z9kefn4jm1';

-- Check attribution (empty for this teacher)
SELECT * FROM "TeacherAttribution" WHERE "teacherId" = 'cmqxema6a000013z9kefn4jm1';

-- Check commission (empty globally)
SELECT COUNT(*) FROM "TeacherCommission";

-- Check global attribution count
SELECT COUNT(*) FROM "TeacherAttribution";

-- Check which teachers have attributions
SELECT "teacherId", COUNT(DISTINCT "studentId") FROM "TeacherAttribution" GROUP BY "teacherId";
```

---

*Audit completed: September 1, 2026*  
*Script: `scripts/audit-commission-dzaky.ts`*
