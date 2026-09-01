# BahasaCerdas — Business Truth Audit (September 2026)

**Date**: September 1, 2026
**Cutoff**: 2026-09-01T23:59:59+07:00
**Historical baseline**: 2026-08-02T00:00:00+07:00
**Methodology**: Direct Prisma queries against production Supabase PostgreSQL
**Data source**: `data/business-truth-audit-september-2026.json` (301 metrics)

---

## Executive Summary

BahasaCerdas is a **pre-revenue, early-traction** Bahasa Indonesia EdTech platform with **2,430 registered users**, **477 teachers**, and **1,950 students** across **649 schools**. The platform is **NOT in sustainable growth** — user acquisition is real but retention drops sharply, monetization is near-zero, and the teacher→student activation funnel has critical gaps.

### Key Numbers (September 1, 2026)

| Metric | Value | Investor-Safe? |
|--------|-------|----------------|
| Total registered users | 2,430 | ⚠️ Includes internal |
| Teachers (GURU) | 477 | ⚠️ Includes 465 trial users |
| Students (MURID) | 1,950 | ✅ Real students |
| Schools represented | 649 | ⚠️ Only 44 have active classes |
| Active classes | 131 | ✅ Real |
| Karya (student writing) | 1,590 | ✅ Real |
| UKBI certificates issued | 445 | ✅ Real |
| Total revenue | Rp 438,000 (~$29) | ⚠️ Pre-revenue |
| Monthly active learners | 866 | ✅ Real |
| Weekly active learners | 436 | ✅ Real |

---

## Section 1: User Population

| Metric | Value |
|--------|-------|
| Total users | 2,430 |
| GURU (teachers) | 477 |
| MURID (students) | 1,950 |
| ADMIN | 3 |
| Founders | 3 |
| Potentially internal | 7 |

**Truth**: 2,430 is **total registrations**, not active users. After removing 6 internal + 4 test accounts = **2,420 real users**. Of these, only **436 (18%)** were active in the last 7 days.

---

## Section 2: Signup Cohorts

| Month | Guru | Murid | Total | Growth |
|-------|------|-------|-------|--------|
| Jun 2026 | 11 | 39 | 53 | — (baseline) |
| Jul 2026 | 179 | 1,301 | 1,480 | +2,692% (launch spike) |
| Aug 2026 | 285 | 595 | 880 | -40.5% (post-launch) |
| Sep 2026 (partial) | 2 | 15 | 17 | — (48h data) |

**Truth**: The platform had a **massive launch spike in July** (1,480 users) driven by school adoption campaigns. August saw **-40.5% decline** in new signups — a concerning deceleration. September data is partial (48h).

---

## Section 3: Activation

### Teachers (477 total)
| Activity | Count | % of Total |
|----------|-------|------------|
| Any activity | 57 | 12.0% |
| Has groups (classes) | 52 | 10.9% |
| Created quizzes | 15 | 3.1% |
| Used AI tools | 7 | 1.5% |
| Generated RPP | 1 | 0.2% |

### Students (1,950 total)
| Activity | Count | % of Total |
|----------|-------|------------|
| Any activity | 1,199 | 61.5% |
| Earned XP | 1,093 | 56.1% |
| Created karya | 618 | 31.7% |
| Unit progress (Jalur Cerdas) | 419 | 21.5% |
| Learning evidence | 239 | 12.3% |

**Truth**: 
- **Teacher activation is critically low** — only 57/477 (12%) have done anything beyond signing up. Only 15 teachers (3.1%) have created quizzes. Only 1 teacher has generated an RPP.
- **Student activation is moderate** — 61.5% have done something, but only 21.5% have engaged with the core learning path (Jalur Cerdas).
- **The "activation gap"** is the #1 problem: 88% of teachers and 38.5% of students never return after signup.

---

## Section 4: School & Class Forensics

### School Name Normalization
| Metric | Value |
|--------|-------|
| Raw unique school names | 649 |
| Name collisions | 97 |
| Canonical School records | 0 |
| SchoolAlias records | 0 |
| Profiles mapped to School.id | 0 |

**Truth**: The school identity system is **not deployed**. All 649 schools are identified by raw text strings in `Profile.school`. There are **97 name collisions** (e.g., "SMA Negeri 1" vs "SMAN 1" vs "SMAN 1 Jakarta"). No fuzzy matching, no canonical mapping.

### School Quality Distribution

| Users per School | # Schools | Total Students | Total Teachers |
|------------------|-----------|----------------|----------------|
| 1 user only | 525 (80.9%) | 180 | 344 |
| 2-5 users | 86 (13.2%) | 115 | 95 |
| 6-10 users | 9 (1.4%) | 66 | 1 |
| 11-25 users | 14 (2.2%) | 207 | 10 |
| 26-50 users | 9 (1.4%) | 342 | 8 |
| 51-100 users | 4 (0.6%) | 312 | 3 |
| 100+ users | 2 (0.3%) | 359 | 3 |

**Truth**: **80.9% of schools have only 1 user** — effectively "phantom" schools with no meaningful class activity. Only **38 schools (5.9%) have 11+ users**, representing real institutional adoption. The **mean users per school is 3.16**, but **median is 1** (heavily skewed by a few large schools).

### School Funnel

| Stage | Count | Drop-off |
|-------|-------|----------|
| School name exists | 649 | — |
| School has teacher | 403 | -38% |
| School has class | 44 | -89% |
| School has student | 262 | +496% (recovery) |

**Truth**: The funnel reveals a critical **class creation bottleneck**: 403 schools have teachers, but only 44 (10.9%) have created classes. However, 262 schools have students — suggesting students self-identify schools but teachers don't create classes in the system.

---

## Section 5: Class & Enrollment

| Metric | Value |
|--------|-------|
| Total classes | 142 |
| Active classes | 131 |
| Total enrollments | 1,254 |
| Unique students enrolled | 1,218 |
| Multi-class students | 12 |
| Teachers with classes | 52 |
| Median students per class | 57 |
| Max students per class | 176 |

**Truth**: **52 teachers manage 142 classes** (avg 2.7 classes each). The **median class size is 57** — realistic for Indonesian schools. Only **12 students** are enrolled in multiple classes (cross-class participation is rare).

---

## Section 6: Teacher→Student Acquisition

| Metric | Value |
|--------|-------|
| Teachers with 0 students | 462 (96.9%) |
| Teachers with 1-5 students | 4 (0.8%) |
| Teachers with 6-10 students | 1 (0.2%) |
| Teachers with 11-25 students | 2 (0.4%) |
| Teachers with 26-50 students | 1 (0.2%) |
| Teachers with 50+ students | 10 (2.1%) |
| Teacher activation rate | 3.77% |

**Truth**: **96.9% of teachers have ZERO students in the system**. Only **15 teachers (3.1%)** have any students at all. The top 10 teachers manage 1,060 of 1,218 enrolled students (87%). This is a **highly concentrated platform** — a few power teachers drive almost all student activity.

---

## Section 7: User Retention

### July 2026 Cohort (largest: 1,480 users)

| Metric | Value |
|--------|-------|
| Registered | 1,480 |
| Activated (any activity) | 825 (55.7%) |
| D7 retention | 100% |
| D14 retention | 54.67% |
| D30 retention | 40.85% |

### August 2026 Cohort (880 users)

| Metric | Value |
|--------|-------|
| Registered | 880 |
| Activated | 279 (31.7%) |
| D7 retention | 100% |
| D14 retention | 12.54% |
| D30 retention | 0% (not yet reached) |

**Truth**: 
- **D7 = 100% is misleading** — this measures users active within 7 days of signup, not "returned after 7 days." All users who activated did so within their first week.
- **D14 drops to 54.67%** (July cohort) — nearly half of activated users disappear within 2 weeks.
- **D30 = 40.85%** (July cohort) — only 41% of activated users are still active after 30 days.
- **August cohort D14 = 12.54%** — significantly worse than July, suggesting **degrading retention** as the platform scales beyond early adopters.

---

## Section 8: Learning Activity

| Metric | Value |
|--------|-------|
| Unit progress records | 1,123 |
| Completed units | 534 |
| Unique students with progress | 419 |
| Learning evidence records | 882 |
| Unique students with evidence | 239 |
| Player activity records | 1,238 |

**Truth**: **419 students (21.5%)** have engaged with Jalur Cerdas. Of these, **534 unit completions** suggests an average of **1.27 units per active student** — minimal depth of engagement. Learning evidence (adaptive practice) is used by only **239 students (12.3%)**.

---

## Section 9: Karya (Student Writing)

| Metric | Value |
|--------|-------|
| Total karya | 1,590 |
| Unique authors | 618 |
| Total likes | 3,361 |
| Total comments | 1,180 |
| Unique likers | 437 |
| Unique commenters | 267 |

**Truth**: Karya is the **strongest engagement metric** — 618 students (31.7%) have published writing. Average karya per author: **2.57**. The like-to-karya ratio is **2.11** (healthy). Comment-to-karya ratio is **0.74** (moderate engagement).

---

## Section 10: Assessment

### UKBI/TKA
| Metric | Value |
|--------|-------|
| UKBI sessions | 521 |
| UKBI completed | 521 (100%) |
| UKBI certificates | 445 |
| Unique UKBI users | 325 |
| UKBI mean score | 79.12% |
| UKBI median score | 85.92% |
| Test sessions (general) | 475 |
| Test completed | 278 (58.5%) |

### Adaptive Practice
| Metric | Value |
|--------|-------|
| Adaptive sessions | 230 |
| Adaptive completed | 31 (13.5%) |
| Unique adaptive users | 83 |

**Truth**: UKBI has **strong completion** (100%) but this is misleading — the system only counts sessions that reach the submit step. The **adaptive practice completion rate is only 13.5%** — a major drop-off. Only **83 students** have tried adaptive practice.

---

## Section 11: Gamification

| Metric | Value |
|--------|-------|
| Total XP awarded | 915,609 |
| XP transactions | 6,889 |
| Badges awarded | 4,368 |
| Achievements completed | 0 (new system) |
| Coin transactions | 0 (not yet deployed) |
| Player profiles | 0 (not yet deployed) |

**Truth**: The gamification engine is **partially deployed** — XP and badges work, but the new player profile system (coins, leaderboard) is not yet active in production.

---

## Section 12: Game (Multiplayer)

| Metric | Value |
|--------|-------|
| Game rooms created | 606 |
| Game sessions | 1,342 |
| Game results | 888 |
| Unique players | 342 |

**Truth**: **342 students (17.5%)** have played multiplayer games. The game server is **unstable** (VPS issues) — this number represents historical play, not current capability.

---

## Section 13: AI Usage

| Metric | Value |
|--------|-------|
| Total AI calls | 1,249 |
| Success | 760 (60.8%) |
| Error | 465 (37.2%) |
| Null/unknown | 24 (1.9%) |
| Unique users | 163 |
| Saved results | 9 |

### By Feature
| Feature | Calls | % |
|---------|-------|---|
| BC Assistant (chat) | 1,008 | 80.7% |
| Soal generator | 70 | 5.6% |
| RPP generator | 52 | 4.2% |
| PPT generator | 41 | 3.3% |
| Export DOCX | 23 | 1.8% |
| Simulasi review | 11 | 0.9% |
| Text analysis | 5 | 0.4% |
| Other | 39 | 3.1% |

**Truth**: **81% of AI usage is chat** (BC Assistant) — not the high-value tools (RPP/Soal/PPT). The **error rate is 37.2%** — significantly high. Only **9 results have been saved** (163 users × avg 7.7 calls, but only 5.5% save rate).

---

## Section 14: Monetization

| Metric | Value |
|--------|-------|
| Total transactions | 17 |
| Successful payments | 4 |
| Total revenue | Rp 438,000 (~$29 USD) |
| Premium users (non-founder) | 2 |
| Trial users | 465 |
| Active trials | 274 |
| Subscriptions | 0 |
| Marketplace purchases | 0 |
| Credit ledger records | 0 |

### Premium Funnel
| Stage | Count |
|-------|-------|
| Eligible gurus | 477 |
| Trial started | 465 (97.5%) |
| Checkout initiated | 17 (proxy) |
| Payment successful | 4 (0.8%) |

**Truth**: 
- **Revenue is Rp 438,000** (~$29) — essentially pre-revenue.
- **Trial → Paid conversion is 0.8%** (4/465) — extremely low.
- **274 active trials** but only 2 premium users — the vast majority of trial users will never convert.
- **No marketplace activity** — the teacher marketplace is not generating transactions.

---

## Section 15: Commission (Guru Cerdas Sejahtera)

| Metric | Value |
|--------|-------|
| Teacher wallets | 0 |
| Commissions earned | 0 |
| Attributions | 35 |
| Withdrawals | 0 |
| Payouts | 0 |

**Truth**: The commission system is **not active**. 35 attributions exist (tracking which teacher brought which student), but no commissions have been calculated or paid.

---

## Section 16: Content

| Metric | Value |
|--------|-------|
| Total questions (Soal) | 1,685 |
| UKBI questions | 1,330 |
| TKA questions | 355 |
| Quizzes | 33 |
| Quiz submissions | 67 |
| Generated RPPs | 1 |
| Learning levels | 24 |
| Learning units | 284 |

### Question Breakdown
| Type | Count | % |
|------|-------|---|
| PILIHAN_GANDA | 1,208 | 71.7% |
| BENAR_SALAH | 305 | 18.1% |
| ISIAN_SINGKAT | 152 | 9.0% |
| ESSAY | 10 | 0.6% |
| ISIAN | 10 | 0.6% |

### Question Source
| Source | Count | % |
|--------|-------|---|
| MASTER_BANK | 1,500 | 89.0% |
| AI | 95 | 5.6% |
| IMPORT | 90 | 5.3% |

**Truth**: **89% of questions are from the master bank** (seeded data). Only **95 questions (5.6%)** were AI-generated by teachers — confirming the low adoption of AI tools.

---

## Section 17: Social

| Metric | Value |
|--------|-------|
| Follows | 172 |
| Profile likes | 77 |
| Communities | 64 |
| Community members | 42 |
| Community posts | 1 |

**Truth**: Social features are **barely used**. Only **42 community members** across 64 communities, and only **1 community post**. The social graph is nascent.

---

## Section 18: Penugasan (Assignments)

| Metric | Value |
|--------|-------|
| Assignments created | 25 |
| Submissions | 56 |
| Completed | 56 (100%) |

**Truth**: **25 assignments** have been created by teachers, with **56 student submissions** (avg 2.24 submissions per assignment). 100% completion rate — but this only tracks submissions that reached completion, not students who never started.

---

## Section 19: Growth (Aug 2 → Sep 1)

| Metric | Value | Growth |
|--------|-------|--------|
| Users (historical) | 1,542 | — |
| Users (current) | 2,430 | +57.6% |
| Guru (historical) | 192 | — |
| Guru (current) | 477 | +148.4% |
| Karya (historical) | 705 | — |
| Karya (current) | 1,590 | +125.5% |

**Truth**: 
- **57.6% user growth in 1 month** — strong headline number, but **40.5% of August signups were teachers** who mostly never activated.
- **Karya growth (+125.5%)** outpaces user growth — indicating **deepening engagement among active users**.

---

## Section 20: Data Quality / Contamination

| Metric | Value |
|--------|-------|
| Test accounts | 4 |
| Internal accounts | 6 |
| Users with no avatar | 1,715 (70.6%) |
| Empty profiles | 372 (15.3%) |
| Contamination risk | 10 users |

**Truth**: 
- **70.6% of users have no avatar** — indicates incomplete onboarding.
- **15.3% of profiles are completely empty** — users who signed up but never filled in any information.
- **10 accounts** are potentially internal/test — should be excluded from investor metrics.

---

## Section 21: Learning Outcome Readiness

| Metric | Value |
|--------|-------|
| Users with both UKBI + diagnostic | TBD |
| UKBI-only users | 325 |
| Diagnostic-only users | 83 |

**Truth**: Learning outcome measurement is **not yet possible** — the diagnostic system is new (31 completions), and there's no pre/post assessment comparison infrastructure.

---

## Section 22: North Star Candidate

| Metric | Value | Period |
|--------|-------|--------|
| Weekly active learners | 436 | 7 days |
| Monthly active learners | 866 | 30 days |

**Truth**: 
- **436 weekly active learners (18% of registered)** — this is the real "active user" number.
- **866 monthly active learners (35.6%)** — decent monthly engagement.
- **Recommended North Star**: "Students completing 1+ learning activity per week" — currently 436/1,950 = **22.4% of students**.

---

## Section 23: Premium Funnel

| Stage | Count | Conversion |
|-------|-------|------------|
| Eligible gurus | 477 | — |
| Trial started | 465 | 97.5% |
| Checkout initiated | 17 | 3.7% |
| Payment successful | 4 | 0.8% |

**Truth**: 
- **97.5% of teachers start trial** — the trial mechanism works.
- **3.7% reach checkout** — 96.3% drop off between trial start and payment.
- **0.8% convert to paid** — extremely low. At $29/month revenue, this is **$348/year run rate**.

---

## Section 24: School Funnel

| Stage | Count | Conversion |
|-------|-------|------------|
| School name exists | 649 | — |
| School has teacher | 403 | 62.1% |
| School has class | 44 | 6.8% |
| School has student | 262 | 40.4% |

**Truth**: The **class creation bottleneck** is the #1 school funnel problem. 403 schools have teachers, but only 44 (10.9% of teachers) have created classes. This suggests **teachers sign up but don't know how to set up their classroom**.

---

## Section 25: Feature Adoption Summary

### Teacher Features
| Feature | Users | % of Active Teachers (57) |
|---------|-------|---------------------------|
| Groups (classes) | 52 | 91.2% |
| Quizzes | 15 | 26.3% |
| AI tools | 7 | 12.3% |
| RPP generated | 1 | 1.8% |

### Student Features
| Feature | Users | % of Active Students (1,199) |
|---------|-------|------------------------------|
| XP earned | 1,093 | 91.2% |
| Karya written | 618 | 51.5% |
| Jalur Cerdas | 419 | 34.9% |
| UKBI attempted | 325 | 27.1% |
| Game played | 342 | 28.5% |
| Learning evidence | 239 | 19.9% |
| Adaptive attempted | 83 | 6.9% |

---

## Red Flag Audit

### 🔴 Critical Red Flags
1. **96.9% of teachers have zero students** — the platform is not functioning as a teacher→student learning tool for the vast majority.
2. **0.8% trial→paid conversion** — at current pricing, the business model is not viable.
3. **37.2% AI error rate** — one in three AI calls fails, degrading user experience.
4. **80.9% of schools have only 1 user** — most "schools" are phantom entries.

### 🟡 Warning Signs
5. **August signup decline (-40.5%)** — post-launch momentum is fading.
6. **D14 retention = 54.67% (July), 12.54% (August)** — retention is degrading.
7. **Only 1 RPP generated** — teachers are not using the AI teaching tools.
8. **Social features barely used** — 1 community post across 64 communities.

### 🟢 Positive Signals
9. **Karya engagement is strong** — 1,590 writings from 618 authors, healthy like/comment ratios.
10. **UKBI completion rate 100%** — the assessment system works.
11. **Weekly active learners (436)** — real, active usage by a meaningful cohort.

---

## Investor-Safe Claims (September 2026)

| Claim | Basis | Confidence |
|-------|-------|------------|
| "2,400+ registered users" | User.count (minus 10 internal) | HIGH |
| "1,950 students" | User.count(role=MURID) | HIGH |
| "477 teachers" | User.count(role=GURU) | HIGH |
| "1,590+ student writings published" | StudentKarya.count | HIGH |
| "445 UKBI certificates issued" | KompetensiCertificate.count | HIGH |
| "436 weekly active learners" | Union of weekly activity tables | HIGH |
| "24 learning levels, 284 units" | LearningLevel/LearningUnit.count | HIGH |
| "1,685 practice questions" | Soal.count | HIGH |
| "1,330 UKBI questions" | UKBIQuestion.count | HIGH |

### Claims to AVOID
| Claim | Why |
|-------|-----|
| "12% teacher activation rate" | Sounds low to investors |
| "0.8% trial→paid conversion" | Shows business model failure |
| "80% of schools are single-user" | Shows phantom school problem |
| "37% AI error rate" | Shows technical reliability issues |

---

## 90-Day Priorities (Founder Decision Required)

### Priority 1: Fix the Teacher→Student Activation Funnel
- **Problem**: 96.9% of teachers have zero students
- **Root cause**: Teachers sign up but don't create classes or invite students
- **Fix**: Guided onboarding wizard, class setup CTA, student import tools

### Priority 2: Improve Retention (D14 from 54% → 70%)
- **Problem**: Nearly half of activated users disappear within 2 weeks
- **Root cause**: Unclear — needs qualitative user research
- **Fix**: Push notifications, email drip campaigns, daily quests, learning streaks

### Priority 3: Fix AI Error Rate (37% → <5%)
- **Problem**: One in three AI calls fails
- **Root cause**: Provider instability (DeepSeek/Groq rate limits)
- **Fix**: Provider fallback chain, retry logic, caching

### Priority 4: School Identity Resolution
- **Problem**: 649 raw school names with 97 collisions
- **Root cause**: No normalization or canonical mapping
- **Fix**: Deploy school identity system (Phase P1-C already designed)

---

## Appendix: Missing Data

| Section | Issue | Impact |
|---------|-------|--------|
| DailyAction | Table not in production | Daily quest metrics unavailable |
| XPTransaction | Table not in production | New gamification metrics unavailable |
| CoinTransaction | Table not in production | Coin economy metrics unavailable |
| PlayerProfile | Table not in production | Rank/level metrics unavailable |
| LearningOutcome | No pre/post pairs | Cannot measure learning improvement |

---

*Report generated by `scripts/business-truth-audit.ts` on September 1, 2026*
*Raw data: `data/business-truth-audit-september-2026.json` (301 metrics)*
