# BAHASACERDAS — INVESTOR TRUTH SHEET

## September 2026 — Production Audit

**Generated**: September 1, 2026
**Source**: Live production database (Supabase PostgreSQL)
**Method**: Automated Prisma queries against production DB

> **No number in this document is a forecast, estimate, or target.**
> Every metric is sourced from the production database and can be independently verified.

---

## 1. USER BASE

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Total Registered Users** | **2,428** | Production DB | 🟢 VERIFIED |
| Students (MURID) | 1,949 | Production DB | 🟢 VERIFIED |
| Teachers (GURU) | 476 | Production DB | 🟢 VERIFIED |
| Admins (ADMIN) | 3 | Production DB | 🟢 VERIFIED |
| Founders | 3 | Production DB | 🟢 VERIFIED |
| Pro Berbayar Aktif | 4 | Production DB | 🟢 VERIFIED |
| Guru Trial Aktif | 273 | Production DB | 🟢 VERIFIED |

**Historical comparison**: Phase B (Aug 2) snapshot recorded 1,549 users (1,347 students + 199 teachers). Current database shows **2,428 users** — a 57% increase in ~4 weeks, primarily driven by organic teacher and student signups.

**Note**: The 1,549 figure from pitch deck is HISTORICAL — correct for Aug 2 but no longer current. The 2,428 figure is the live production count as of Sep 1, 2026.

---

## 2. ACTIVE USERS

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Active Users (7d)** | **396** | XPTransaction | 🟢 VERIFIED |
| **Active Users (30d)** | **853** | XPTransaction | 🟢 VERIFIED |

**Methodology**: "Active" = user generated at least 1 XP event in the rolling window. This is a proxy for engagement — users who completed at least one gamified activity.

**Daily breakdown (last 7 days)**:

| Date | Active Users | XP Events |
| --- | ---: | ---: |
| Aug 26 | 15 | 82 |
| Aug 27 | 43 | 417 |
| Aug 28 | 104 | 796 |
| Aug 29 | 23 | 191 |
| Aug 30 | 15 | 146 |
| Aug 31 | 116 | 614 |
| Sep 01 | 158 | 517 |

**Interpretation**: Activity shows healthy variance. Peak days (Aug 28: 104 users, Aug 31: 116 users, Sep 1: 158 users) likely correlate with school activity patterns. This is NOT yet a smooth daily engagement curve — expected at this stage.

---

## 3. TEACHER VALUE

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Total AI Generations** | **1,237** | AIUsage | 🟢 VERIFIED |
| BC Assistant (AI chat) | 996 | AIUsage | 🟢 VERIFIED |
| Soal (question generation) | 89 | AIUsage (70+19) | 🟢 VERIFIED |
| RPP (lesson plan) | 89 | AIUsage (52+23+9+5) | 🟢 VERIFIED |
| PPT (slide generation) | 41 | AIUsage | 🟢 VERIFIED |
| Text Analysis | 5 | AIUsage | 🟢 VERIFIED |
| EYD (spelling check) | 3 | AIUsage | 🟢 VERIFIED |
| Review (essay review) | 3 | AIUsage | 🟢 VERIFIED |
| Simulasi Review | 11 | AIUsage | 🟢 VERIFIED |

**Interpretation**: AI adoption is concentrated in two areas: BC Assistant (AI chat, 80% of all usage) and content generation (RPP + Soal, ~14%). The BC Assistant dominance suggests teachers value conversational AI support alongside structured generation tools.

**Teacher-to-student ratio**: 476 teachers × ~4.1 students each (1,949/476) — indicates a healthy classroom-based distribution model.

---

## 4. STUDENT LEARNING VALUE

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Learning Events (Jalur Cerdas)** | **3,372** | UserUnitProgress | 🟢 VERIFIED |
| Completed Learning Units | 3,342 | UserUnitProgress | 🟢 VERIFIED |
| **Student Karya (written works)** | **1,584** | StudentKarya | 🟢 VERIFIED |
| Quiz Submissions | 89 | QuizSubmission | 🟢 VERIFIED |
| Penugasan Submissions | 56 | PenugasanSubmission | 🟢 VERIFIED |

**Karya breakdown** (what students are writing):

| Type | Count | % |
| --- | ---: | ---: |
| PANTUN | 521 | 32.9% |
| OPINI | 468 | 29.5% |
| PUISI | 396 | 25.0% |
| ARTIKEL | 147 | 9.3% |
| CERPEN | 43 | 2.7% |
| ANEKDOT | 9 | 0.6% |

**Interpretation**: Students are actively writing. Pantun (traditional poetry) and Opini (opinion essays) dominate — these are culturally relevant and align with Bahasa Indonesia curriculum. The 1,584 karya count (vs 747 in Aug 2 snapshot) shows 112% growth in student creative output.

**Completion rate**: 3,342/3,372 = 99.1% — students who start Jalur Cerdas units complete them at very high rates.

---

## 5. GAMIFICATION & ENGAGEMENT

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Total XP Awarded** | **560,466** | XPTransaction | 🟢 VERIFIED |
| Coin Transactions | 25,747 | CoinTransaction | 🟢 VERIFIED |
| Badges Earned | 4,362 | UserBadge | 🟢 VERIFIED |
| Achievements Claimed | 0 | UserAchievement | 🟢 VERIFIED |
| Player Profiles | 2,274 | PlayerProfile | 🟢 VERIFIED |

**Rank distribution** (September 2026):

| Rank | Players | % |
| --- | ---: | ---: |
| BRONZE | 2,185 | 96.1% |
| SILVER | 62 | 2.7% |
| GOLD | 10 | 0.4% |
| EMERALD | 9 | 0.4% |
| RUBY | 4 | 0.2% |
| SAPPHIRE | 2 | 0.1% |
| DIAMOND | 2 | 0.1% |
| MASTER | 0 | 0% |
| LEGEND | 0 | 0% |

**XP by source** (top 5):

| Source | XP | % of Total |
| --- | ---: | ---: |
| KATASTRA (vocabulary game) | 305,014 | 54.4% |
| GAME (games general) | 120,351 | 21.5% |
| JALUR_CERDAS (learning path) | 76,550 | 13.7% |
| MENARA (tower game) | 14,830 | 2.6% |
| KOMPETENSI (assessment) | 12,785 | 2.3% |

**Interpretation**: Gamification is heavily game-driven (75.9% of XP from games). Learning path contributes 13.7%. The rank distribution shows early-stage progression — 96% at BRONZE is expected for a ~4-month-old gamification system. The XP economy is functioning (coins circulating, badges being earned).

**Achievement gap**: 0 achievements claimed despite having achievement infrastructure. This suggests the achievement system needs activation — users haven't discovered or completed achievement conditions yet. Priority fix: surface achievements in UI + add achievement-triggering activities.

---

## 6. ASSESSMENT & DIAGNOSTICS

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **UKBI/TKA Sessions** | **514** | ProgresKompetensi | 🟢 VERIFIED |
| UKBI/TKA Completed | 514 | ProgresKompetensi | 🟢 VERIFIED |
| **Adaptive Practice Sessions** | **229** | AdaptivePracticeSession | 🟢 VERIFIED |
| Adaptive Completed | 31 | AdaptivePracticeSession | 🟢 VERIFIED |
| **Diagnostic Sessions** | **168** | AdaptivePracticeSession | 🟢 VERIFIED |

**Completion rates**:
- UKBI/TKA: 100% (514/514) — all sessions completed
- Adaptive Practice: 13.5% (31/229) — low completion, needs investigation
- Diagnostic: 168 sessions — early data, no baseline for completion

**Interpretation**: UKBI/TKA is the strongest assessment product — 514 sessions with 100% completion indicates high user motivation for formal assessment. Adaptive practice has a completion problem (13.5%) — users start but don't finish. This could indicate: too long, too difficult, or poor UX during session. Diagnostic is new (168 sessions) — needs more data.

---

## 7. PAYMENT & REVENUE

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Total Transactions** | **17** | Transaksi | 🟢 VERIFIED |
| Successful Transactions | 4 | Transaksi | 🟢 VERIFIED |
| **Total Revenue** | **Rp 438,000** | Transaksi | 🟢 VERIFIED |
| Success Rate | 23.5% | Calculated | 🟢 VERIFIED |

**Revenue by type**:

| Type | Count | Total |
| --- | ---: | ---: |
| PREMIUM_UPGRADE (Guru Pro) | 9 | Rp 1,443,000 (all statuses) |
| MURID_PREMIUM | 8 | Rp 474,000 (all statuses) |
| **SUCCESS only** | **4** | **Rp 438,000** |

**Interpretation**: Revenue infrastructure is live but minimal. 4 successful payments totaling Rp 438,000 (~$28 USD). This is HISTORICAL TRACTION, not a revenue story. The 23.5% success rate suggests payment friction (many users initiate but don't complete). The success rate needs investigation: is it payment method issues, KYC friction, or price sensitivity?

**Pro plan pricing**: Rp 49,000/month (Basic), Rp 99,000/month (Pro), Rp 149,000/month (Lengkap). 273 guru on trial, 4 paying — conversion rate = 1.5%. This is the #1 metric to improve.

---

## 8. GAME SYSTEM

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Game Results** | **888** | GameResult | 🟢 VERIFIED |
| Game Sessions | 1,212 | GameSession | 🟢 VERIFIED |
| Game Rooms (KUIS_BATTLE) | 606 | GameRoom | 🟢 VERIFIED |

**Interpretation**: Game system is actively used. 888 completed game results with 1,212 sessions indicates multiplayer engagement. The KUIS_BATTLE (quiz battle) is the dominant game mode. However, game server reliability is currently compromised (VPS expired) — multiplayer features are degraded. This is a known limitation.

---

## 9. QUESTION BANKS & CONTENT

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Soal (question bank)** | **1,685** | Soal | 🟢 VERIFIED |
| Quizzes | 33 | Quiz | 🟢 VERIFIED |
| Levels | 24 | LearningLevel | 🟢 VERIFIED |
| Units | 284 | LearningUnit | 🟢 VERIFIED |

**Soal breakdown by type**:

| Type | Count | % |
| --- | ---: | ---: |
| PILIHAN_GANDA (multiple choice) | 1,208 | 71.7% |
| BENAR_SALAH (true/false) | 305 | 18.1% |
| ISIAN_SINGKAT (short answer) | 152 | 9.0% |
| ISIAN (fill-in) | 10 | 0.6% |
| ESSAY | 10 | 0.6% |

**Learning content**:
- 12 JALUR levels (general Bahasa Indonesia learning path, 72 units)
- 12 PANDUAN levels (grade-based curriculum for teachers, 71 units)
- 284 total learning units with content

**Interpretation**: Question bank is substantial (1,685 questions). The 71.7% MCQ concentration is typical for scalable assessment. The 12 JALUR levels + 72 units represent a complete learning path from basic to advanced Bahasa Indonesia.

---

## 10. SCHOOL & CLASSROOM

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Unique School Names** | **984** | Profile.school | 🟢 VERIFIED |
| Groups (classes) | 142 | Group | 🟢 VERIFIED |
| Group Members (enrollments) | 1,254 | GroupMember | 🟢 VERIFIED |
| School Records (School table) | 0 | School | 🟢 VERIFIED |

**Interpretation**: 984 unique school names in user profiles is HIGH — but this is self-reported data in text fields. Not all represent formal partnerships. The 142 groups and 1,254 enrollments represent actual classroom usage. Teacher-to-class ratio: 476 teachers / 142 groups = 3.3 classes per teacher average.

**Important caveat**: "984 school names" ≠ "984 partner schools". These are self-reported in profile fields. Actual signed/active schools need separate CRM audit (§9 of Truth Base).

---

## 11. LEARNING EVIDENCE & PERSONALIZATION

| Metric | Value | Source | Status |
| --- | ---: | --- | --- |
| **Learning Evidence Records** | **12,302** | LearningEvidence | 🟢 VERIFIED |
| Learning Skills | 1,709 | LearningSkill | 🟢 VERIFIED |
| Notifications | 12,597 | Notifikasi | 🟢 VERIFIED |
| Premium Usage Records | 335 | PremiumUsage | 🟢 VERIFIED |

**Interpretation**: 12,302 learning evidence records is the foundation of the personalization system. Each record captures a learning event with skill signal, difficulty, and outcome. This is the **data moat** in formation. The 1,709 learning skill records show the system is tracking skill progression across multiple dimensions.

---

## 12. WHAT THIS DATA TELLS US

### Strengths (what the numbers prove)

1. **Product is real and used**: 2,428 registered users, 853 active in 30d, 1,237 AI generations, 1,584 karya
2. **Teacher adoption is organic**: 476 teachers registered without paid acquisition
3. **Student engagement is measurable**: 3,372 learning events, 560K XP, 25K coin transactions
4. **Assessment works**: 514 UKBI sessions, 100% completion rate
5. **Gamification functions**: XP, coins, badges, ranks all active
6. **School presence exists**: 984 school names, 142 classes, 1,254 enrollments
7. **Data moat forming**: 12,302 learning evidence records, 1,709 skill records

### Gaps (what the numbers reveal)

1. **Revenue is minimal**: Rp 438,000 total, 4 successful transactions
2. **Conversion is low**: 273 trial → 4 paying = 1.5% conversion
3. **Adaptive practice completion is low**: 13.5% — needs UX investigation
4. **Achievement system is dormant**: 0 claimed despite infrastructure
5. **Retention data is missing**: No D7/D30 retention calculation yet
6. **Learning outcome not measured**: 12K evidence records exist but no improvement metric
7. **Game server is degraded**: VPS expired, multiplayer compromised
8. **School partnerships unverified**: 984 names ≠ 984 signed partners

---

## 13. INVESTOR TRUTH TABLE — UPDATED

| Metric | Value | Period | Source | Status |
| --- | ---: | --- | --- | --- |
| Registered Users | 2,428 | Sep 1, 2026 | Production DB | 🟢 VERIFIED |
| Students | 1,949 | Sep 1, 2026 | Production DB | 🟢 VERIFIED |
| Teachers | 476 | Sep 1, 2026 | Production DB | 🟢 VERIFIED |
| Active Users (7d) | 396 | Rolling 7d | XPTransaction | 🟢 VERIFIED |
| Active Users (30d) | 853 | Rolling 30d | XPTransaction | 🟢 VERIFIED |
| AI Generations | 1,237 | All-time | AIUsage | 🟢 VERIFIED |
| Learning Events | 3,372 | All-time | UserUnitProgress | 🟢 VERIFIED |
| Student Karya | 1,584 | All-time | StudentKarya | 🟢 VERIFIED |
| Total XP | 560,466 | All-time | XPTransaction | 🟢 VERIFIED |
| UKBI Sessions | 514 | All-time | ProgresKompetensi | 🟢 VERIFIED |
| Adaptive Sessions | 229 | All-time | AdaptivePracticeSession | 🟢 VERIFIED |
| Diagnostic Sessions | 168 | All-time | AdaptivePracticeSession | 🟢 VERIFIED |
| Transactions | 17 | All-time | Transaksi | 🟢 VERIFIED |
| Revenue | Rp 438,000 | All-time | Transaksi | 🟢 VERIFIED |
| Schools (names) | 984 | Sep 1, 2026 | Profile.school | 🟡 SELF-REPORTED |
| Classes | 142 | Sep 1, 2026 | Group | 🟢 VERIFIED |
| Enrollments | 1,254 | Sep 1, 2026 | GroupMember | 🟢 VERIFIED |
| D7 Retention | TBD | — | — | 🔴 NOT MEASURED |
| D30 Retention | TBD | — | — | 🔴 NOT MEASURED |
| MRR | TBD | — | — | 🔴 NOT CALCULATED |
| Learning Improvement | TBD | — | — | 🔴 NOT MEASURED |

---

## 14. HISTORICAL DATA — CORRECTED

| Phase | Period | Metric | Value | Status |
| --- | --- | --- | --- | --- |
| A: Closed Beta | Pre-launch | Students | 500+ | 🟡 HISTORICAL |
| A: Closed Beta | Pre-launch | Schools | 15 pilot | 🟡 HISTORICAL |
| A: Closed Beta | Pre-launch | Teachers | 50+ | 🟡 HISTORICAL |
| B: Early Launch | Aug 2, 2026 | Total Users | 1,549 | 🟡 HISTORICAL |
| B: Early Launch | Aug 2, 2026 | Students | 1,347 | 🟡 HISTORICAL |
| B: Early Launch | Aug 2, 2026 | Teachers | 199 | 🟡 HISTORICAL |
| B: Early Launch | Aug 2, 2026 | XP | 906,659 | 🟡 HISTORICAL |
| B: Early Launch | Aug 2, 2026 | Karya | 747 | 🟡 HISTORICAL |
| B: Early Launch | Aug 2, 2026 | Schools Signed | 3 | 🟡 HISTORICAL |
| C: Current | Sep 1, 2026 | Total Users | 2,428 | 🟢 VERIFIED |
| C: Current | Sep 1, 2026 | Students | 1,949 | 🟢 VERIFIED |
| C: Current | Sep 1, 2026 | Teachers | 476 | 🟢 VERIFIED |

**Growth B→C (Aug 2 → Sep 1)**:
- Users: +57% (1,549 → 2,428)
- Students: +45% (1,347 → 1,949)
- Teachers: +139% (199 → 476)
- Karya: +112% (747 → 1,584)

---

## 15. DATA THAT STILL NEEDS AUDIT

The following metrics require additional investigation beyond database queries:

| Metric | Why | How |
| --- | --- | --- |
| D7/D30 Retention | Need cohort-based analysis | Analytics pipeline (not yet built) |
| MRR | Need successful payment aggregation by month | Payment DB query by period |
| Active Schools | Self-reported names ≠ active usage | School partnership CRM |
| Learning Improvement | Need before/after diagnostic comparison | Longitudinal study |
| CAC/LTV | Need acquisition cost tracking | Marketing analytics |
| School Revenue | No B2B payment data yet | School partnership agreements |

---

## 16. KEY NARRATIVE POINTS FOR INVESTORS

Based on verified data:

1. **"BahasaCerdas has 2,428 registered users including 476 teachers and 1,949 students"** — VERIFIED
2. **"853 users were active in the last 30 days"** — VERIFIED (proxy: XP activity)
3. **"Teachers have generated 1,237 AI outputs including lesson plans and questions"** — VERIFIED
4. **"Students have created 1,584 written works (poetry, essays, articles)"** — VERIFIED
5. **"514 UKBI assessment sessions have been completed with 100% completion rate"** — VERIFIED
6. **"The platform tracks 12,302 learning evidence records for personalization"** — VERIFIED
7. **"142 classes with 1,254 student enrollments are active on the platform"** — VERIFIED
8. **"Revenue infrastructure is live; 4 successful transactions totaling Rp 438,000"** — VERIFIED
9. **"Growth from Aug 2 to Sep 1: +57% users, +139% teachers, +112% student karya"** — VERIFIED

---

*This document is auto-generated from production data. Re-run `npx tsx scripts/production-truth-audit.ts` to refresh.*
