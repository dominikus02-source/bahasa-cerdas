# Investor Metric Dictionary — BahasaCerdas.com

**Date**: 2026-09-02 (WIB)
**Purpose**: Every metric defined with name, definition, formula, source table, confidence, and limitations.

---

## A — USER FUNNEL

### A1 — Total Users
- **Definition**: All rows in `User` table, regardless of role, status, or activity.
- **Formula**: `COUNT(*) FROM "User"`
- **Source**: `User` model
- **Time window**: All-time cumulative
- **Confidence**: HIGH
- **Limitations**: Includes demo accounts (guru@demo.com, murid@demo.com). Does not distinguish active vs abandoned.

### A2 — Users by Role
- **Definition**: Count of users per `role` enum value (GURU, MURID, ADMIN).
- **Formula**: `GROUP BY "role" FROM "User"`
- **Source**: `User.role`
- **Time window**: All-time cumulative
- **Confidence**: HIGH
- **Limitations**: `isFounder` is a boolean, not a role — founders appear under their operational role.

### A3 — Founders
- **Definition**: Users with `isFounder = true`.
- **Formula**: `SELECT FROM "User" WHERE "isFounder" = true`
- **Source**: `User.isFounder`
- **Confidence**: HIGH

### A4 — Active Premium Users
- **Definition**: Users where `isPremium = true` AND `premiumUntil > NOW()`.
- **Formula**: `COUNT(*) FROM "User" WHERE "isPremium" = true AND "premiumUntil" > NOW()`
- **Source**: `User.isPremium`, `User.premiumUntil`
- **Confidence**: HIGH
- **Limitations**: Does not distinguish trial vs paid premium.

### A5 — Trial Active Gurus
- **Definition**: GURU users with `trialEndsAt > NOW()`.
- **Formula**: `COUNT(*) FROM "User" WHERE "role" = 'GURU' AND "trialEndsAt" > NOW()`
- **Source**: `User.trialEndsAt`
- **Confidence**: HIGH

### A6 — Login Activity
- **Definition**: Users with `lastLoginAt` within time window.
- **Formula**: `COUNT(*) FROM "User" WHERE "lastLoginAt" >= NOW() - INTERVAL 'N days'`
- **Source**: `User.lastLoginAt`
- **Confidence**: HIGH
- **Limitations**: `lastLoginAt` may not be set for all auth methods. Some users may authenticate via Supabase directly.

---

## B — TEACHER FUNNEL

### B1 — Total GURU Users
- **Definition**: Users with `role = 'GURU'`.
- **Formula**: `COUNT(*) FROM "User" WHERE "role" = 'GURU'`
- **Confidence**: HIGH

### B2 — Groups Created
- **Definition**: Total `Group` rows (classrooms created by teachers).
- **Formula**: `COUNT(*) FROM "Group"`
- **Source**: `Group` model
- **Confidence**: HIGH
- **Limitations**: Includes inactive groups. `isActive` field exists but not filtered.

### B3 — Active Teachers (30d)
- **Definition**: GURU users who have created at least one group and were created within last 30 days.
- **Formula**: `COUNT(DISTINCT "teacherId") FROM "Group" WHERE "createdAt" >= NOW() - 30 days`
- **Confidence**: MEDIUM
- **Limitations**: Uses `Group.createdAt` as proxy for teacher activity, not teacher's last action.

### B4 — Average Groups per Teacher
- **Formula**: `COUNT("Group") / COUNT(DISTINCT "User" WHERE role='GURU')`
- **Confidence**: HIGH

### B5 — Top Group Sizes (by member count)
- **Formula**: `LEFT JOIN GroupMember ON Group.id = GroupMember.groupId, COUNT, ORDER BY DESC`
- **Confidence**: HIGH

---

## C — STUDENT FUNNEL

### C1 — Total MURID Users
- **Definition**: Users with `role = 'MURID'`.
- **Confidence**: HIGH

### C2 — Students in At Least One Group
- **Definition**: Distinct `userId` in `GroupMember` where user role = MURID.
- **Formula**: `COUNT(DISTINCT "userId") FROM "GroupMember" gm JOIN "User" u ON u.id = gm."userId" WHERE u."role" = 'MURID'`
- **Confidence**: HIGH
- **Limitations**: A student can be in multiple groups. Counts unique students, not group memberships.

### C3 — Students with Any Activity
- **Definition**: Distinct `userId` in `DailyAction` table.
- **Formula**: `COUNT(DISTINCT "userId") FROM "DailyAction"`
- **Confidence**: HIGH
- **Limitations**: `DailyAction` requires explicit `recordActivity()` call. Not all features may record.

### C4 — Students Activated 7d / 30d
- **Definition**: Distinct students with `DailyAction` in last 7/30 days.
- **Confidence**: HIGH

### C5 — Students with TestSession
- **Definition**: Distinct `userId` in `TestSession` (UKBI/TKA simulation attempts).
- **Confidence**: HIGH

### C6 — Students with UnitProgress
- **Definition**: Distinct `userId` in `UserUnitProgress` (Jalur Cerdas or Buku Panduan learning).
- **Confidence**: HIGH

### C7 — Students with Karya
- **Definition**: Distinct `authorId` in `StudentKarya` (student creative works).
- **Confidence**: HIGH

### C8 — Percent in Group
- **Formula**: `studentsInGroups / totalMurid * 100`
- **Confidence**: HIGH

---

## D — RETENTION

### D1 — Cohort Monthly
- **Definition**: Users grouped by `createdAt` month, cross-referenced with `DailyAction`.
- **Formula**: `GROUP BY TO_CHAR(createdAt, 'YYYY-MM')`, LEFT JOIN DailyAction
- **Confidence**: MEDIUM
- **Limitations**: `activeMonth0` counts any DailyAction in the same calendar month — not strictly D0 activation.

### D2 — D1 / D7 / D30 Retention
- **Definition**: Of users created in last 30/60 days, how many returned within 1/7/30 days.
- **Formula**: `INNER JOIN DailyAction WHERE da.createdAt > u.createdAt AND da.createdAt <= u.createdAt + INTERVAL`
- **Confidence**: MEDIUM
- **Limitations**: Only counts DailyAction. TestSession, UserUnitProgress, and other engagement signals not included.

### D3 — New Users per Month
- **Definition**: `COUNT(*) FROM "User" GROUP BY TO_CHAR(createdAt, 'YYYY-MM')`
- **Confidence**: HIGH
- **Limitations**: Includes all roles, all sources, demo accounts.

---

## E — SCHOOL ANALYSIS

### E1 — Total Schools
- **Definition**: Rows in `School` table.
- **Confidence**: HIGH

### E2 — Profiles with School Raw
- **Definition**: Profiles where `school` field is non-null and non-empty.
- **Confidence**: HIGH
- **Limitations**: `school` is legacy text field. May contain inconsistent names.

### E3 — Profiles with schoolId
- **Definition**: Profiles where `schoolId` (FK to School) is non-null.
- **Confidence**: HIGH

### E4 — Phantom Profiles
- **Definition**: Profiles with `school` set but `schoolId` null — legacy school name not yet linked to canonical School record.
- **Confidence**: HIGH
- **Limitations**: Intentionally unlinked records awaiting backfill.

### E5 — Unique Raw School Names
- **Formula**: `COUNT(DISTINCT LOWER(TRIM("school"))) FROM "Profile" WHERE "school" IS NOT NULL`
- **Confidence**: HIGH
- **Limitations**: Does not account for fuzzy matching (e.g., "SMA Negeri 1" vs "SMA N 1").

---

## F — LEARNING ENGAGEMENT

### F1 — DailyAction Total / 7d / 30d
- **Definition**: Count of `DailyAction` records (learning loop event log).
- **Confidence**: HIGH
- **Limitations**: Depends on `recordActivity()` being called in all features. Newer features may undercount.

### F2 — DailyAction by Type
- **Definition**: `GROUP BY "type"` from `DailyAction`.
- **Confidence**: HIGH

### F3 — TestSession Total / 30d
- **Definition**: UKBI/TKA simulation sessions started.
- **Confidence**: HIGH

### F4 — UserUnitProgress (total / completed)
- **Definition**: Jalur Cerdas / Buku Panduan unit progress records.
- **Confidence**: HIGH

### F5 — ProgresKompetensi (total / completed)
- **Definition**: UKBI/TKA simulation progress per user per package.
- **Confidence**: HIGH

### F6 — AdaptivePracticeSession (total / completed)
- **Definition**: AI-driven adaptive practice sessions.
- **Confidence**: HIGH

### F7 — Karya / StudentKarya
- **Definition**: Teacher marketplace works (`Karya`) and student creative works (`StudentKarya`).
- **Confidence**: HIGH

### F8 — TTS Sessions
- **Definition**: TTS (Text-to-Speech) sessions.
- **Confidence**: HIGH

### F9 — Quizzes Taken
- **Definition**: `QuizSession` records (class quizzes, assignments).
- **Confidence**: HIGH

---

## G — AI USAGE

### G1 — Total Records
- **Definition**: Rows in `AIUsage` table.
- **Confidence**: HIGH

### G2 — Total Tokens / Cost USD
- **Definition**: `SUM("tokens")` and `SUM("costUSD")` from `AIUsage`.
- **Confidence**: HIGH
- **Limitations**: `costUSD` is estimated. Actual provider costs may differ.

### G3 — Unique Users
- **Definition**: `COUNT(DISTINCT "userId") FROM "AIUsage"`
- **Confidence**: HIGH

### G4 — By Feature
- **Definition**: `GROUP BY "feature"` with counts and token sums.
- **Confidence**: HIGH

### G5 — By Provider
- **Definition**: `GROUP BY "provider"` (deepseek, groq, gemini, etc.)
- **Confidence**: HIGH

### G6 — By Status
- **Definition**: `GROUP BY "status"` (success, error, etc.)
- **Confidence**: HIGH

---

## H — REVENUE

### H1 — Total Transaksi
- **Definition**: All rows in `Transaksi` table.
- **Confidence**: HIGH

### H2 — Revenue (SUCCESS)
- **Definition**: `SUM("amount")` from `Transaksi` WHERE `status = 'SUCCESS'`.
- **Formula**: `SUM("amount") FROM "Transaksi" WHERE "status" = 'SUCCESS'`
- **Source**: `Transaksi.amount`, `Transaksi.status`
- **Confidence**: HIGH
- **Limitations**: Amount is in Indonesian Rupiah (IDR). Includes all transaction types.

### H3 — Revenue by Type
- **Definition**: `GROUP BY "type"` from successful `Transaksi`.
- **Types**: `PREMIUM_GURU_PRO`, `MURID_PREMIUM`, `KARYA_PURCHASE`, etc.
- **Confidence**: HIGH

### H4 — Unique Paying Users
- **Definition**: `COUNT(DISTINCT "userId") FROM "Transaksi" WHERE "status" = 'SUCCESS'`
- **Confidence**: HIGH
- **Limitations**: One user can have multiple successful transactions.

### H5 — Last 30d / 90d Payments
- **Definition**: Successful transaction count in time window.
- **Confidence**: HIGH

---

## I — COMMISSION SYSTEM

### I1 — Total Attributions
- **Definition**: `TeacherAttribution` records (student → teacher link).
- **Confidence**: HIGH

### I2 — Attributions by Source
- **Definition**: `GROUP BY "source"` (CLASS_ENROLLMENT, REFERRAL_LINK, MANUAL_ADMIN).
- **Confidence**: HIGH

### I3 — Total Commissions
- **Definition**: `TeacherCommission` records (ledger entries).
- **Confidence**: HIGH

### I4 — Commissions by Status
- **Definition**: `GROUP BY "status"` (PENDING, ELIGIBLE, AVAILABLE, REVERSED).
- **Confidence**: HIGH

### I5 — Total Wallets / Balances
- **Definition**: `TeacherWallet` aggregate sums.
- **Confidence**: HIGH

---

## J — GAMIFICATION

### J1 — XP Ledger Total
- **Definition**: `XpLedger` record count (XP transactions).
- **Confidence**: HIGH

### J2 — XP by Source
- **Definition**: `GROUP BY "source"` (JALUR_CERDAS, GAME, KARYA, UKBI, etc.)
- **Confidence**: HIGH

### J3 — Coin Transactions
- **Definition**: `CoinTransaction` record count.
- **Confidence**: HIGH

### J4 — Level Distribution
- **Definition**: `GROUP BY "level"` from MURID users.
- **Confidence**: HIGH

### J5 — Streak Distribution
- **Definition**: `GROUP BY "streak"` from MURID users where streak > 0.
- **Confidence**: HIGH

### J6 — Top Students by XP
- **Definition**: `ORDER BY "xp" DESC LIMIT 20` from MURID users.
- **Confidence**: HIGH

---

## K — PREMIUM / BILLING

### K1 — Premium Active
- **Definition**: `isPremium = true AND premiumUntil > NOW()`
- **Confidence**: HIGH

### K2 — Premium by Plan
- **Definition**: `GROUP BY "premiumPlan"` from active premium users.
- **Confidence**: HIGH
- **Plans**: GURU_PRO_MONTHLY, GURU_PRO_YEARLY, MURID_PREMIUM, etc.

### K3 — Trial Active / Trial Started
- **Definition**: GURU users with `trialEndsAt > NOW()` / `trialStartedAt IS NOT NULL`
- **Confidence**: HIGH

### K4 — Premium Usage by Feature
- **Definition**: `PremiumUsage` grouped by feature.
- **Confidence**: HIGH
- **Limitations**: Tracks daily credit usage, not cumulative.

---

## L — POWER USERS

### L1 — Top Teachers by Groups
- **Definition**: `ORDER BY COUNT(groups) DESC LIMIT 20`
- **Confidence**: HIGH

### L2 — Top Teachers by Students
- **Definition**: `ORDER BY COUNT(groupMembers where role=MURID) DESC LIMIT 20`
- **Confidence**: HIGH

### L3 — Top Students by XP
- **Definition**: `ORDER BY "xp" DESC LIMIT 100`
- **Confidence**: HIGH

### L4 — Top Students by Activity
- **Definition**: `COUNT(DailyAction) ORDER BY DESC LIMIT 50`
- **Confidence**: HIGH

---

## M — SIMULATION (UKBI / TKA)

### M1 — UKBI Questions
- **Definition**: `COUNT(*) FROM "UKBIQuestion"`
- **Confidence**: HIGH

### M2 — TKA Questions
- **Definition**: `COUNT(*) FROM "TKAQuestion"`
- **Confidence**: HIGH

### M3 — ProgresKompetensi by Status
- **Definition**: `GROUP BY "status"` (IN_PROGRESS, COMPLETED, etc.)
- **Confidence**: HIGH

### M4 — Certificates
- **Definition**: `COUNT(*) FROM "Certificate"`
- **Confidence**: HIGH

### M5 — Simulation Sessions by Month
- **Definition**: `TestSession` grouped by month with unique user count.
- **Confidence**: HIGH

---

## N — CHAT / COMMUNITY

### N1 — Chat Messages
- **Definition**: `COUNT(*) FROM "ChatMessage"`
- **Confidence**: HIGH

### N2 — Communities
- **Definition**: `COUNT(*) FROM "Community"`
- **Confidence**: HIGH

### N3 — Community Posts
- **Definition**: `COUNT(*) FROM "CommunityPost"`
- **Confidence**: HIGH

### N4 — Notifications
- **Definition**: `COUNT(*) FROM "Notifikasi"`
- **Confidence**: HIGH

---

## O — GAME SYSTEM

### O1 — Game Results
- **Definition**: `COUNT(*) FROM "GameResult"` (multiplayer battle results).
- **Confidence**: HIGH
- **Limitations**: Only records completed games. Solo games may not create GameResult.

### O2 — Game Rooms
- **Definition**: `COUNT(*) FROM "GameRoom"` (created rooms).
- **Confidence**: HIGH

### O3 — Game Sessions
- **Definition**: `COUNT(*) FROM "GameSession"`
- **Confidence**: HIGH

---

## META-METRICS

### M0 — Confidence Levels
- **HIGH**: Direct database count, no ambiguity
- **MEDIUM**: Proxy metric or includes caveats
- **LOW**: Estimated or derived from multiple assumptions

### M0 — Data Freshness
- All metrics are point-in-time snapshots from production database.
- Time windows use UTC (not WIB) for database queries.
- `createdAt` timestamps are stored in UTC by Supabase/Prisma.

### M0 — Known Gaps
1. `DailyAction` coverage depends on `recordActivity()` being called — newer features may undercount.
2. `lastLoginAt` may not be set for all auth methods.
3. `User.xp`, `User.coins`, `User.level` are denormalized aggregates — may drift from ledger totals.
4. `Profile.school` (legacy) vs `Profile.schoolId` (canonical) — phantom records exist.
5. Commission system has 0 commissions (all buyers are founder-excluded by design).
