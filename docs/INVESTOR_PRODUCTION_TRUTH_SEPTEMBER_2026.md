# Investor Production Truth — BahasaCerdas.com

**Date**: 2026-09-02 (WIB)
**Purpose**: Forensic data audit of production database for investor readiness.
**Database**: Supabase PostgreSQL (production pooler)
**Script**: `scripts/investor-production-truth-audit.ts`
**Status**: 🟡 AWAITING PRODUCTION DATA — all sections marked "NOT YET MEASURABLE" until founder runs audit script.

---

## EXECUTIVE SUMMARY

BahasaCerdas.com is a social-creative platform for Bahasa Indonesia where students write daily (puisi, cerpen, artikel, anekdot, pantun), showcase works in social-style portfolios, earn Coin Cerdas, and compete in weekly leagues — UKBI/TKA as supporting features, not core.

**This report is a placeholder.** Actual numbers will be populated when founder runs:
```bash
DATABASE_URL='postgresql://...' npx tsx scripts/investor-production-truth-audit.ts
```

---

## SECTION A — USER FUNNEL

| Metric | Value | Status |
|--------|-------|--------|
| Total Users | NOT YET MEASURABLE | ⏳ |
| GURU users | NOT YET MEASURABLE | ⏳ |
| MURID users | NOT YET MEASURABLE | ⏳ |
| ADMIN users | NOT YET MEASURABLE | ⏳ |
| Founders | NOT YET MEASURABLE | ⏳ |
| Premium Active | NOT YET MEASURABLE | ⏳ |
| Trial Active (Guru) | NOT YET MEASURABLE | ⏳ |
| Login 7d | NOT YET MEASURABLE | ⏳ |
| Login 30d | NOT YET MEASURABLE | ⏳ |
| Login 90d | NOT YET MEASURABLE | ⏳ |
| Never Logged In | NOT YET MEASURABLE | ⏳ |

**Source**: `User` table via Prisma.

---

## SECTION B — TEACHER FUNNEL

| Metric | Value | Status |
|--------|-------|--------|
| Total GURU | NOT YET MEASURABLE | ⏳ |
| Groups Created | NOT YET MEASURABLE | ⏳ |
| Active Teachers (30d) | NOT YET MEASURABLE | ⏳ |
| Active Teachers (90d) | NOT YET MEASURABLE | ⏳ |
| Avg Groups/Teacher | NOT YET MEASURABLE | ⏳ |
| Top Group Sizes | NOT YET MEASURABLE | ⏳ |

**Source**: `Group` table, `GroupMember` table.

---

## SECTION C — STUDENT FUNNEL

| Metric | Value | Status |
|--------|-------|--------|
| Total MURID | NOT YET MEASURABLE | ⏳ |
| In At Least One Group | NOT YET MEASURABLE | ⏳ |
| % In Group | NOT YET MEASURABLE | ⏳ |
| Activated (Any) | NOT YET MEASURABLE | ⏳ |
| Activated 7d | NOT YET MEASURABLE | ⏳ |
| Activated 30d | NOT YET MEASURABLE | ⏳ |
| With TestSession | NOT YET MEASURABLE | ⏳ |
| With UnitProgress | NOT YET MEASURABLE | ⏳ |
| With Karya | NOT YET MEASURABLE | ⏳ |
| With AI Usage | NOT YET MEASURABLE | ⏳ |

**Source**: `DailyAction`, `TestSession`, `UserUnitProgress`, `StudentKarya`, `AIUsage`.

---

## SECTION D — RETENTION

| Metric | Value | Status |
|--------|-------|--------|
| New Users/Month | NOT YET MEASURABLE | ⏳ |
| D1 Retention (30d cohort) | NOT YET MEASURABLE | ⏳ |
| D7 Retention (30d cohort) | NOT YET MEASURABLE | ⏳ |
| D30 Retention (60d cohort) | NOT YET MEASURABLE | ⏳ |
| Cohort Monthly | NOT YET MEASURABLE | ⏳ |

**Source**: `User.createdAt`, `DailyAction`.

**Caveats**:
- D1/D7/D30 retention uses only `DailyAction` — does not count TestSession, UserUnitProgress, or other engagement signals.
- `DailyAction` requires explicit `recordActivity()` call; newer features may undercount.

---

## SECTION E — SCHOOL ANALYSIS

| Metric | Value | Status |
|--------|-------|--------|
| Total Schools (canonical) | NOT YET MEASURABLE | ⏳ |
| Active Schools | NOT YET MEASURABLE | ⏳ |
| Profiles with School (raw) | NOT YET MEASURABLE | ⏳ |
| Profiles with schoolId | NOT YET MEASURABLE | ⏳ |
| Unique Raw Names | NOT YET MEASURABLE | ⏳ |
| Phantom Profiles | NOT YET MEASURABLE | ⏳ |
| School Aliases | NOT YET MEASURABLE | ⏳ |
| Top Raw Schools | NOT YET MEASURABLE | ⏳ |
| Canonical Schools | NOT YET MEASURABLE | ⏳ |

**Source**: `School`, `SchoolAlias`, `Profile`.

---

## SECTION F — LEARNING ENGAGEMENT

| Metric | Value | Status |
|--------|-------|--------|
| DailyAction Total | NOT YET MEASURABLE | ⏳ |
| DailyAction 7d | NOT YET MEASURABLE | ⏳ |
| DailyAction 30d | NOT YET MEASURABLE | ⏳ |
| DailyAction by Type | NOT YET MEASURABLE | ⏳ |
| TestSession Total | NOT YET MEASURABLE | ⏳ |
| TestSession 30d | NOT YET MEASURABLE | ⏳ |
| UserUnitProgress Total | NOT YET MEASURABLE | ⏳ |
| UserUnitProgress Completed | NOT YET MEASURABLE | ⏳ |
| ProgresKompetensi Total | NOT YET MEASURABLE | ⏳ |
| ProgresKompetensi Completed | NOT YET MEASURABLE | ⏳ |
| Adaptive Practice Total | NOT YET MEASURABLE | ⏳ |
| Adaptive Practice Completed | NOT YET MEASURABLE | ⏳ |
| Karya Total | NOT YET MEASURABLE | ⏳ |
| Karya 30d | NOT YET MEASURABLE | ⏳ |
| StudentKarya Total | NOT YET MEASURABLE | ⏳ |
| StudentKarya 30d | NOT YET MEASURABLE | ⏳ |
| TTS Sessions | NOT YET MEASURABLE | ⏳ |
| Quizzes Taken | NOT YET MEASURABLE | ⏳ |

**Source**: Multiple learning tables.

---

## SECTION G — AI USAGE

| Metric | Value | Status |
|--------|-------|--------|
| Total Records | NOT YET MEASURABLE | ⏳ |
| Total Tokens | NOT YET MEASURABLE | ⏳ |
| Total Cost (USD) | NOT YET MEASURABLE | ⏳ |
| Unique Users | NOT YET MEASURABLE | ⏳ |
| AI Usage 7d | NOT YET MEASURABLE | ⏳ |
| AI Usage 30d | NOT YET MEASURABLE | ⏳ |
| By Feature | NOT YET MEASURABLE | ⏳ |
| By Provider | NOT YET MEASURABLE | ⏳ |
| By Status | NOT YET MEASURABLE | ⏳ |

**Source**: `AIUsage` table.

---

## SECTION H — REVENUE

| Metric | Value | Status |
|--------|-------|--------|
| Total Transaksi | NOT YET MEASURABLE | ⏳ |
| Revenue (SUCCESS) | NOT YET MEASURABLE | ⏳ |
| Revenue by Type | NOT YET MEASURABLE | ⏳ |
| Unique Paying Users | NOT YET MEASURABLE | ⏳ |
| Last 30d Payments | NOT YET MEASURABLE | ⏳ |
| Last 90d Payments | NOT YET MEASURABLE | ⏳ |
| Successful Payments Detail | NOT YET MEASURABLE | ⏳ |

**Source**: `Transaksi` table.
**Note**: All amounts in Indonesian Rupiah (IDR).

---

## SECTION I — COMMISSION SYSTEM

| Metric | Value | Status |
|--------|-------|--------|
| Total Attributions | NOT YET MEASURABLE | ⏳ |
| Attributions by Source | NOT YET MEASURABLE | ⏳ |
| Total Commissions | NOT YET MEASURABLE | ⏳ |
| Commissions by Status | NOT YET MEASURABLE | ⏳ |
| Total Wallets | NOT YET MEASURABLE | ⏳ |
| Wallet Balances | NOT YET MEASURABLE | ⏳ |
| Total Reversals | NOT YET MEASURABLE | ⏳ |

**Source**: `TeacherAttribution`, `TeacherCommission`, `TeacherWallet`.

**Known State** (from previous audit Aug 2026):
- 35 attributions for 4 teachers
- 0 commissions globally (all 3 premium buyers are in founder's classes → excluded by design)
- Commission config: 10% rate, 7-day holding, Rp50k min withdrawal

---

## SECTION J — GAMIFICATION

| Metric | Value | Status |
|--------|-------|--------|
| XP Ledger Total | NOT YET MEASURABLE | ⏳ |
| XP by Source | NOT YET MEASURABLE | ⏳ |
| Coin Transactions | NOT YET MEASURABLE | ⏳ |
| Level Distribution | NOT YET MEASURABLE | ⏳ |
| Streak Distribution | NOT YET MEASURABLE | ⏳ |
| Top Students by XP | NOT YET MEASURABLE | ⏳ |

**Source**: `XpLedger`, `CoinTransaction`, `User.xp/level/streak`.

---

## SECTION K — PREMIUM / BILLING

| Metric | Value | Status |
|--------|-------|--------|
| Premium Active | NOT YET MEASURABLE | ⏳ |
| Premium by Plan | NOT YET MEASURABLE | ⏳ |
| Trial Active (Guru) | NOT YET MEASURABLE | ⏳ |
| Trial Started Count | NOT YET MEASURABLE | ⏳ |
| Premium Usage by Feature | NOT YET MEASURABLE | ⏳ |
| Successful Transactions by Type | NOT YET MEASURABLE | ⏳ |

**Source**: `User.isPremium/premiumPlan/premiumUntil/trialEndsAt`, `PremiumUsage`, `Transaksi`.

**Pricing** (from `lib/billing/plans.ts`):
- Guru Pro Monthly: Rp 49,000 / 30 days / 500 credits
- Guru Pro Yearly: Rp 399,000 / 365 days
- Trial: 30 days, no auto-renew

---

## SECTION L — POWER USERS

| Metric | Value | Status |
|--------|-------|--------|
| Top Teachers by Groups (20) | NOT YET MEASURABLE | ⏳ |
| Top Teachers by Students (20) | NOT YET MEASURABLE | ⏳ |
| Top Students by XP (100) | NOT YET MEASURABLE | ⏳ |
| Top Students by Activity (50) | NOT YET MEASURABLE | ⏳ |
| Premium Students Activity (20) | NOT YET MEASURABLE | ⏳ |

**Source**: `User`, `Group`, `GroupMember`, `DailyAction`.

---

## SECTION M — UKBI / TKA / SIMULATION

| Metric | Value | Status |
|--------|-------|--------|
| UKBI Questions | NOT YET MEASURABLE | ⏳ |
| TKA Questions | NOT YET MEASURABLE | ⏳ |
| ProgresKompetensi Total | NOT YET MEASURABLE | ⏳ |
| ProgresKompetensi by Status | NOT YET MEASURABLE | ⏳ |
| Certificates | NOT YET MEASURABLE | ⏳ |
| Lomba Peserta | NOT YET MEASURABLE | ⏳ |
| Simulation Sessions by Month | NOT YET MEASURABLE | ⏳ |

**Source**: `UKBIQuestion`, `TKAQuestion`, `ProgresKompetensi`, `Certificate`, `TestSession`.

**Previous State** (from AGENTS.md):
- UKBI: 810 questions (SD 250, SMP 275, SMA 245, Guru 255)
- TKA: 200 questions
- All 4 tracks have minimum 30-question simulation packages

---

## SECTION N — CHAT / COMMUNITY

| Metric | Value | Status |
|--------|-------|--------|
| Chat Messages | NOT YET MEASURABLE | ⏳ |
| Communities | NOT YET MEASURABLE | ⏳ |
| Community Posts | NOT YET MEASURABLE | ⏳ |
| Notifications | NOT YET MEASURABLE | ⏳ |

**Source**: `ChatMessage`, `Community`, `CommunityPost`, `Notifikasi`.

---

## SECTION O — GAME SYSTEM

| Metric | Value | Status |
|--------|-------|--------|
| Game Results | NOT YET MEASURABLE | ⏳ |
| Game Results 30d | NOT YET MEASURABLE | ⏳ |
| Game Rooms | NOT YET MEASURABLE | ⏳ |
| Game Sessions | NOT YET MEASURABLE | ⏳ |

**Source**: `GameResult`, `GameRoom`, `GameSession`.

**Known State**: Game server is **DEAD** (VPS Hostinger expired June 2026). All multiplayer features broken. `GameResult` only records completed multiplayer games.

---

## SECTION P — KNOWN GAPS AND CAVEATS

### P1 — Data Quality Issues
1. **`Profile.school` vs `Profile.schoolId`**: Legacy text field and canonical FK coexist. Phantom profiles (school set, schoolId null) need backfill.
2. **`User.xp/coins/level` drift**: Denormalized aggregates may not match ledger totals if any direct updates occurred.
3. **`DailyAction` coverage**: Not all features call `recordActivity()`. Newer features (AI BC chat, adaptive practice) may undercount.
4. **`lastLoginAt`**: Not set for all auth methods. Some users may authenticate via Supabase directly.

### P2 — Platform State
1. **Game server DEAD**: VPS Hostinger expired June 26, 2026. `game.bahasacerdas.com` unreachable. All multiplayer games broken.
2. **VPS DEAD**: IP 72.60.78.65 — completely unreachable. No database backup was taken before it went down.
3. **Supabase**: Cloud PostgreSQL via pooler (production). Password rotated. All data on Supabase.
4. **Deployment**: Vercel (frontend), Supabase (database + auth + storage).

### P3 — Commission System
1. **0 commissions globally**: All 3 premium buyers are in founder's classes → `isEligibleForCommission()` returns false by design.
2. **Commission triggers**: Requires non-founder GURU → student attribution → MURID_PREMIUM payment → webhook → commission creation.
3. **First commission**: Will occur when a student in a non-founder GURU's class purchases Premium Murid.

### P4 — Financial
1. **Revenue**: Only from Midtrans payments (SUCCESS status). Includes Premium Guru Pro, Premium Murid, Karya purchases.
2. **Currency**: All amounts in Indonesian Rupiah (IDR).
3. **Commission rate**: 10% of gross amount, 7-day holding, Rp50k minimum withdrawal.

---

## SECTION Q — DATA COLLECTION METHODOLOGY

### Q1 — Query Method
- All queries use Prisma ORM against production Supabase pooler.
- Raw SQL via `prisma.$queryRaw` for complex aggregations.
- No mutations — strictly read-only.

### Q2 — Time Windows
- "Last N days" = `NOW() - INTERVAL 'N days'` (UTC).
- "Monthly" = `TO_CHAR(createdAt, 'YYYY-MM')`.
- Snapshot date: 2026-09-02 (WIB).

### Q3 — Definitions
- **Activated**: Any record in `DailyAction` table.
- **In Group**: At least one `GroupMember` record with role MURID.
- **Active (teacher)**: Created at least one `Group` in time window.
- **Premium Active**: `isPremium = true AND premiumUntil > NOW()`.
- **Trial Active**: `trialEndsAt > NOW()`.
- **Phantom Profile**: `school` set but `schoolId` null.

---

## SECTION R — REPRODUCIBILITY

### R1 — How to Re-run
```bash
# With production DATABASE_URL
DATABASE_URL='postgresql://...' npx tsx scripts/investor-production-truth-audit.ts

# Output files:
# data/investor-production-truth-september-2026.json
# data/investor-power-users-september-2026.json
# data/investor-school-analysis-september-2026.json
```

### R2 — How to Verify
1. Check `meta.readOnly: true` in output JSON.
2. Cross-reference totals: sum of role counts should equal total users.
3. Check `meta.generatedAt` timestamp.
4. Verify no mutations by running `git status` after audit.

---

## SECTION S — RECOMMENDATIONS FOR INVESTORS

### S1 — What This Audit Does NOT Cover
1. **User satisfaction / NPS**: Not measured in DB.
2. **Content quality**: UKBI/TKA questions exist but quality is not quantified.
3. **Competitor analysis**: External to DB.
4. **Revenue projections**: Based on current data, not forecasts.
5. **Unit economics**: CAC, LTV, churn not derivable from DB alone.

### S2 — What This Audit DOES Cover
1. **Complete user funnel**: Registration → Group → Activity → Retention
2. **Teacher adoption**: Groups created, students enrolled, activity levels
3. **Student engagement**: Learning activities, simulations, creative works
4. **Revenue truth**: Actual payments received, not projected
5. **Platform health**: AI usage, system activity, feature adoption

---

## SECTION T — TECHNICAL INFRASTRUCTURE

| Component | Status |
|-----------|--------|
| Frontend | Vercel (live at bahasacerdas.com) |
| Database | Supabase PostgreSQL (cloud) |
| Auth | Supabase Auth |
| AI | DeepSeek, Groq, Gemini (multi-provider) |
| Payment | Midtrans (IDR) |
| Game Server | DEAD (VPS expired) |
| ORM | Prisma (schema-authoritative) |
| Language | TypeScript strict |
| Framework | Next.js (App Router) |

---

## SECTION U — WHAT WOULD TRIGGER FIRST COMMISSION

1. Student joins a non-founder GURU's class (creates attribution)
2. Student purchases "Premium Murid" (Rp19,000/month or Rp180,000/year)
3. Midtrans webhook fires with type=`MURID_PREMIUM`
4. Commission = floor(amount × 0.10), 7-day holding
5. After 7 days: AVAILABLE
6. Teacher withdraws when balance ≥ Rp50,000

---

## SECTION V — HISTORICAL CONTEXT

### V1 — Previous Audits
- **Phase 8C** (June 28, 2026): DB migrated from dead VPS to Supabase. 83 tables, 50 existing users preserved.
- **Phase 9** (June 29, 2026): Backup automation established. 67 tables backed up.
- **Phase UKBI DATA LEAN** (June 30, 2026): UKBI bank reached 810 questions.
- **Commission E2E Audit** (Sept 2, 2026): Commission system correctly wired, 0 commissions by design.

### V2 — Key Milestones
- **Dead VPS** (June 26, 2026): Hostinger subscription expired. All services down.
- **Supabase Migration** (June 28, 2026): Database moved to Supabase cloud.
- **Commission Launch** (July 30, 2026): Guru Cerdas Sejahtera commission system live.
- **Founder Role Separation** (Sept 1, 2026): isFounder boolean, not email-based.

---

## SECTION W — SIGN-OFF

| Item | Status |
|------|--------|
| Audit Script | ✅ Created (`scripts/investor-production-truth-audit.ts`) |
| Metric Dictionary | ✅ Created (`docs/INVESTOR_METRIC_DICTIONARY_SEPTEMBER_2026.md`) |
| Forensic Report | ✅ Created (this file) |
| Power Users | ⏳ Pending audit run |
| School Analysis | ⏳ Pending audit run |
| Production Data | ⏳ Awaiting founder execution |

**Next Step**: Founder must run audit script with real `DATABASE_URL` to populate all "NOT YET MEASURABLE" sections.
