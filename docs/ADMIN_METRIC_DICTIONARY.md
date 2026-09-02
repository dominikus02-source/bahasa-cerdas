# BahasaCerdas Founder Control Tower — Metric Dictionary

## Version
2.0

## Last Updated
September 2, 2026

## Canonical Principles

1. **Same metric = same formula** everywhere (Control Tower, Premium, Payments, future Investor Snapshot)
2. **Source is explicit** — every metric names its Prisma model and fields
3. **Time window is explicit** — no ambiguous "recent" or "current"
4. **Edge cases are defined** — what happens with 0 denominator, null fields, stale data
5. **Cash ≠ MRR** — cash collected is actual payments received; MRR is normalized recurring value
6. **Investor-safe** — metrics marked YES can appear in investor materials

---

## Metric Tables

### User Metrics

| Metric | Definition | Source | Formula | Window | Unit | Investor-safe |
|--------|------------|--------|---------|--------|------|---------------|
| Total Users | All registered accounts | `User` | `count(*)` | all-time | count | YES |
| Total Murid | Student accounts | `User` | `count(*) WHERE role='MURID'` | all-time | count | YES |
| Total Guru | Teacher accounts | `User` | `count(*) WHERE role='GURU'` | all-time | count | YES |
| New Users (7d) | Users registered in last 7 days | `User` | `count(*) WHERE createdAt >= now-7d` | 7 days | count | YES |
| New Users (30d) | Users registered in last 30 days | `User` | `count(*) WHERE createdAt >= now-30d` | 30 days | count | YES |

### Engagement Metrics

| Metric | Definition | Source | Formula | Window | Unit | Investor-safe |
|--------|------------|--------|---------|--------|------|---------------|
| DAU | Distinct users with XP activity today | `XPTransaction` | `groupBy(userId) WHERE createdAt >= todayStart` → `.length` | today (00:00 WIB) | count | YES |
| WAU | Distinct users with XP activity in trailing 7 days | `XPTransaction` | `groupBy(userId) WHERE createdAt >= now-7d` → `.length` | 7 days | count | YES |
| MAU | Distinct users with XP activity in trailing 30 days | `XPTransaction` | `groupBy(userId) WHERE createdAt >= now-30d` → `.length` | 30 days | count | YES |

**Timezone**: All date boundaries use `Asia/Jakarta` (WIB, UTC+7). `todayStart` = `new Date(now.getFullYear(), now.getMonth(), now.getDate())` in server-local time. Vercel functions run in UTC — `todayStart` is computed as midnight UTC, NOT midnight WIB. This means DAU boundary is off by 7 hours. Acceptable for current use but documented.

**Edge case**: DAU ≤ WAU ≤ MAU must always hold. If violated, query is broken.

### Learning Metrics

| Metric | Definition | Source | Formula | Window | Unit | Investor-safe |
|--------|------------|--------|---------|--------|------|---------------|
| Jalur Cerdas Completed (7d) | Learning units completed | `UserUnitProgress` | `count(*) WHERE completed=true AND completedAt >= now-7d` | 7 days | count | YES |
| UKBI Sessions (7d) | Assessment sessions started | `ProgresKompetensi` | `count(*) WHERE startedAt >= now-7d` | 7 days | count | NO |
| Karya Created (7d) | Student creative works published | `StudentKarya` | `count(*) WHERE createdAt >= now-7d` | 7 days | count | YES |
| AI Generations (7d) | AI tool requests | `AIUsage` | `count(*) WHERE createdAt >= now-7d` | 7 days | count | NO |

**Note**: All learning metrics are **row counts**, not unique users or completion rates.

### Premium Metrics

| Metric | Definition | Source | Formula | Window | Unit | Investor-safe |
|--------|------------|--------|---------|--------|------|---------------|
| Active Premium | Users with current Premium entitlement | `User` | `count(*) WHERE isPremium=true AND premiumUntil>now AND isFounder=false` | current | count | YES |
| Murid Premium | Active student Premium | `User` | `count(*) WHERE isPremium=true AND premiumUntil>now AND role='MURID'` | current | count | YES |
| Guru Premium | Active teacher Premium | `User` | `count(*) WHERE isPremium=true AND premiumUntil>now AND role='GURU'` | current | count | YES |
| Trial Active | Teachers in trial period | `User` | `count(*) WHERE role='GURU' AND trialEndsAt>now` | current | count | NO |
| Premium Conversion Rate | Guru Premium adoption rate | `User` | `activeGuruPremium / (totalGuru - founderCount) × 100` | current | percent | YES |

**Active Premium definition**: `isPremium=true` AND `premiumUntil > NOW()`. This represents current active entitlement, NOT historical purchase. Admin/manual activation, recovered Premium, and expired Premium are all handled correctly by this definition.

**Conversion Rate denominator**: `(totalGuru - founderCount)` where `founderCount` is dynamically queried (`User.count WHERE isFounder=true`). This represents **Guru-eligible population** (all teachers minus founders/admins). The metric is specifically **Guru Premium Conversion Rate**, not overall.

**Edge case**: If `totalGuru <= founderCount`, denominator is 0 → conversion rate = 0.

### Financial Metrics

| Metric | Definition | Source | Formula | Window | Unit | Investor-safe |
|--------|------------|--------|---------|--------|------|---------------|
| Cash Collected (month) | Premium payments received this calendar month | `Transaksi` | `sum(amount) WHERE status='SUCCESS' AND createdAt >= monthStart` | current calendar month | Rp | YES |
| Cash Collected (30d) | Premium payments received in trailing 30 days | `Transaksi` | `sum(amount) WHERE status='SUCCESS' AND createdAt >= now-30d` | 30 days | Rp | YES |
| Cash Collected (all-time) | All premium payments received | `Transaksi` | `sum(amount) WHERE status='SUCCESS'` | all-time | Rp | YES |
| MRR | Monthly Recurring Revenue (normalized) | `User` + plan prices | `Σ MRR_CONTRIBUTION[plan]` for each active Premium user | current | Rp/month | YES |
| Transactions Success (30d) | Count of successful premium transactions | `Transaksi` | `count(*) WHERE status='SUCCESS' AND createdAt >= now-30d` | 30 days | count | NO |
| Transactions Pending | Count of pending premium transactions | `Transaksi` | `count(*) WHERE status='PENDING'` | current | count | NO |

**Cash Collected ≠ MRR**: Cash Collected is actual cash received. MRR is the normalized monthly recurring value of active subscriptions. A yearly Rp180,000 payment contributes Rp180,000 to Cash Collected but only Rp15,000 to MRR.

### MRR — Detailed Definition

**Formula**: For each user where `isPremium=true AND premiumUntil>now AND isFounder=false`:
- Determine plan from `user.role` + `user.premiumPlan` (or transaction reference)
- Look up `MRR_CONTRIBUTION[plan]`
- Sum all contributions

**Plan → MRR mapping**:

| Plan | Price | MRR Contribution |
|------|-------|-----------------|
| MURID_PREMIUM_MONTHLY | Rp 19,000/month | Rp 19,000 |
| MURID_PREMIUM_YEARLY | Rp 180,000/year | Rp 15,000 (=180K/12) |
| GURU_PRO_MONTHLY | Rp 49,000/month | Rp 49,000 |
| GURU_PRO_YEARLY | Rp 399,000/year | Rp 33,250 (=399K/12) |

**Why not from transactions**: Transaction-based MRR sums all SUCCESS transactions in a period, which double-counts renewals and includes one-time purchases. True MRR represents the current recurring value of active subscriptions.

**Current limitation**: The system doesn't store which plan a user is on in a reliable way (premiumPlan field may be stale). The most accurate approach is to check the most recent SUCCESS transaction's `reference` field for each active Premium user.

### Retention Metrics

| Metric | Definition | Source | Formula | Window | Unit | Investor-safe |
|--------|------------|--------|---------|--------|------|---------------|
| D7 Retention (weekly cohort) | % of cohort active in registration week | `User` + `XPTransaction` | `activeInWeek / registered × 100` | cohort week | percent | YES |
| D30 Retention (weekly cohort) | % of cohort active after registration week | `User` + `XPTransaction` | `activeAfterWeek / registered × 100` | post-cohort | percent | YES |

**Cohort definition**: Users registered in week W-N (where N=1,2,3,4).

**D7 window**: The same 7-day window as the registration week. Users who perform XP activity during their registration week are counted as "retained at D7".

**D30 window**: Any time after the cohort week ends. Users who perform XP activity after their registration week are counted as "retained at D30".

**Qualifying activity**: Any `XPTransaction` record (any XP source — learning, game, quiz, etc.).

**Important**: This is **weekly return rate**, not true D7/D30 retention in the product analytics sense. The label "D7" refers to "active within the same week", not "active on day 7". This should be documented in the UI.

### Trust / Operations Metrics

| Metric | Definition | Source | Formula | Window | Unit | Investor-safe |
|--------|------------|--------|---------|--------|------|---------------|
| Payment Health | Detects SUCCESS payments without active entitlement | `Transaksi` + `User` | `filter(SUCCESS premium txs where user lacks entitlement)` | all-time | count | NO |
| Active Risk Cases | Open teacher risk cases | `TeacherRiskCase` | `count(*) WHERE status IN ('REVIEW','RESTRICTED')` | current | count | NO |
| Pending Withdrawals | Withdrawal requests awaiting processing | `Withdrawal` | `count(*) WHERE status='PENDING'` | current | count | NO |

**Payment Health mismatch**: A `SUCCESS` transaction of type `MURID_PREMIUM` or `PREMIUM_UPGRADE` where the user's `isPremium=false` OR `premiumUntil <= now`. This indicates a payment was received but entitlement was not activated.

---

## Consistency Rules

1. **Control Tower** (`lib/admin/executive.ts`) is the canonical query service. All metrics must match this service's definitions.
2. **Premium Command Center** (`/api/admin/premium/report`) uses `calculateMRR()` from `lib/admin/executive.ts` — same canonical formula.
3. **Payments** (`/api/admin/payments`) must filter by the same transaction types: `PREMIUM_UPGRADE` and `MURID_PREMIUM`.
4. **Future Investor Snapshot** must consume metrics from `lib/admin/executive.ts` without recalculation.
5. **No duplicate MRR formulas** — all modules import from `calculateMRR()` in `lib/admin/executive.ts`.

---

## Known Limitations

1. **DAU timezone**: Computed as midnight UTC, not midnight WIB. Off by 7 hours.
2. **MRR plan detection**: Uses most recent transaction `reference` field, which may not reflect current plan if user changed plans.
3. **Retention labeling**: "D7" means "active in same week", not "active on day 7". "D30" means "active after registration week". This is NOT standard cohort retention.
4. **Conversion denominator**: Founder count is now dynamically queried (no longer hardcoded).
5. **Manual Premium**: Users activated via admin (e.g., rina.melani) appear in Active Premium but NOT in MRR (no qualifying transaction) or Cash Collected.
