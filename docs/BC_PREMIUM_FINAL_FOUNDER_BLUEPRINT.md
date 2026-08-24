# BC PREMIUM — FINAL FOUNDER BLUEPRINT

**Date**: August 24, 2026
**Status**: SPECIFICATION ONLY — No code changes
**Author**: opencode (Senior Full-Stack Engineer)
**Mode**: Deep Product + Billing + Entitlement + UX Architecture

---

## 1. Executive Verdict

BahasaCerdas sudah memiliki fondasi premium yang kuat: `premium-economy` (plan resolver + entitlement engine + usage tracking), Midtrans billing (webhook idempotent + signature verification + subscription stacking), dan AI Gateway (credit ledger + plan-aware deduction). Yang BELUM ada adalah: (1) MURID premium作为一个 distinct product tier, (2) student-specific monetization yang bermakna, (3) conversion funnel dari free → premium yang jujur, dan (4) learning depth yang membedakan premium dari free.

**Rekomendasi**: Bangun Murid Premium sebagai "Learning Accelerator" — bukan "more AI credits." Premium murid harus terasa seperti: "Saya dibantu lebih personal, lebih dalam, dan lebih terukur." Free tetap sebagai diagnostic gateway yang terbuka lebar.

**Risiko Utama**: (1) Pricing tanpa anchor pasar Indonesia yang jelas, (2) AI cost di murid volume tinggi tanpa guard, (3) Legacy billing (Guru) tidak boleh terganggu, (4) Migration MURID_FREE unlimited → MURID_PREMIUM terbatas harus hati-hati.

---

## 2. Premium North Star

> **"BahasaCerdas Premium membantu murid memahami dan mengembangkan kemampuan bahasa Indonesia mereka secara lebih personal, lebih dalam, dan lebih terukur."**

Tidak sekadar "lebih banyak AI." Tapi: diagnostic yang jujur → rekomendasi yang benar-benar sesuai → practice yang tepat sasaran → mentor yang memahami → progress yang terukur.

---

## 3. Three Premium Promises

1. **"Saya tahu kemampuan saya."** — Profil diagnostik yang jujur dan detail, bukan sekadar "kamu menengah." SkillRadar yang mendalam dengan rekomendasi per-kemampuan yang spesifik dan actionable.

2. **"Latihan saya disesuaikan untuk saya."** — Adaptive Practice yang benar-benar menyesuaikan dengan kelemahan yang teridentifikasi, bukan soal random. AI Mentor yang menjelaskan KESALAHAN, bukan hanya jawaban benar.

3. **"Saya melihat perkembangan saya."** — Progress tracking yang nyata: perbandingan mingguan, analisis tren skill, re-assessment periodik, dan insight yang membuktikan "kamu lebih baik dari minggu lalu."

---

## 4. Student Ecosystem Audit

### Beranda & Daily Learning
| Komponen | Status | Premium Relevan? |
|----------|--------|-----------------|
| Murid Home (Beranda) | EXISTS | Context untuk premium upsell |
| Aksi Hari Ini (ContinueLearningCard) | EXISTS (5 states: A→D + FALLBACK) | Konversi utama: state B→D = "BC Sedang Mengenalimu" → Premium |
| DailyActionCard (Tantangan Bahasa) | EXISTS | FREE daily quest |
| PremiumValueCard | EXISTS | Status display, bukan conversion |
| SkillRadar | EXISTS (7 skill bar) | **KILLER** — tampilan profil tanpa detail |
| AI Diagnostic (Tes Awal) | EXISTS (10 butir, 6 skill) | **GATE** — FREE access, Premium depth |
| Adaptive Practice | EXISTS (COMING_SOON) | **KILLER** — belum matang |
| AI Mentor (MentorCard) | EXISTS (insight preview) | **KILLER** — belum matang |

### Assessment & Personalization
| Komponen | Status | Premium Relevan? |
|----------|--------|-----------------|
| Diagnostic Config (lib/diagnostic/) | EXISTS (v1.1, 10 butir) | Pool 87 soal APPROVED |
| Diagnostic Selector | EXISTS | Deterministic, no duplication |
| Diagnostic Profile | EXISTS (evidence-based, confidence ladder) | **GATE** — PROVISIONAL vs PROFILE_CONFIDENT |
| Personalization (lib/diagnostic/personalization.ts) | EXISTS | **KILLER** — "Kenapa latihan ini?" |
| Learning Loop (lib/learning-loop/) | EXISTS (7 engine files) | Full engine, no production data yet |
| CTA Server-Derived | EXISTS (actionType, not client) | Secure |

### Learning Content
| Komponen | Status | Premium Relevan? |
|----------|--------|-----------------|
| Jalur Cerdas (72 unit, 720 soal) | EXISTS | **FREE core** — jangan kunci |
| Micro-lessons (72 unit) | EXISTS | **FREE core** — jangan kunci |
| Lesson Engine (Duolingo-style) | EXISTS | **FREE core** |
| UKBI (810 soal, 4 track) | EXISTS | **FREE diagnostic** |
| TKA (200 soal, 5 track) | EXISTS | **FREE diagnostic** |

### Gamification
| Komponen | Status | Premium Relevan? |
|----------|--------|-----------------|
| XP System (16 sources) | EXISTS | **FREE** — motivation layer |
| Coins & Shop | EXISTS | **FREE** — engagement |
| Streak | EXISTS | **FREE** — habit formation |
| Badges (27 + 10 guru) | EXISTS | **FREE** — collection |
| Achievements (12) | EXISTS | **FREE** — goals |
| Leaderboard (9 rank) | EXISTS | **FREE** — competition |
| Avatar & Cosmetics | EXISTS | **FREE** (with premium variants) |
| Daily Quests | EXISTS | **FREE** — engagement |

### Social & Competition
| Komponen | Status | Premium Relevan? |
|----------|--------|-----------------|
| Student Karya (social feed) | EXISTS | **FREE** — literacy core |
| Comments & Likes | EXISTS | **FREE** — social |
| Communities | EXISTS | **FREE** — social |
| Game Server (DEAD) | DEAD | **N/A** |
| Arena (Jalur Cerdas hub) | EXISTS | **FREE core** |

### Summary: 12 komponen IDENTIFIED untuk Premium value
- SkillRadar detail (FREE show bars, PREMIUM show analysis)
- Diagnostic profile depth (FREE show band, PREMIUM show per-skill)
- Adaptive Practice (PRECIOUS — belum matang)
- AI Mentor explanations (PRECIOUS — belum matang)
- Personalized learning path (server-derived)
- Progress tracking (weekly comparison)
- Learning insights (weekly recap)
- Premium cosmetics (frame, badge, nameplate)
- Advanced stats (detailed analytics)
- Streak freeze (1/month)
- Simulation quota (3 FREE, 10 PREMIUM)
- AI diagnostic re-assessment (periodic)

---

## 5. FREE vs PREMIUM Matrix

| Capability | FREE | PREMIUM | Reason |
|-----------|------|---------|--------|
| Mulai Latihan (assessment CTA) | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Core principle: diagnostic is NOT paywalled |
| Tes Awal (diagnostic) | ✅ 10 soal | ✅ 10 soal + deeper | Pool 87 soal APPROVED |
| Basic Ability Profile | ✅ Band L1-L12 | ✅ Band + per-skill detail | Basic vs deep |
| SkillRadar (7 skill bars) | ✅ Bars + trend | ✅ Bars + trend + recommendation | Display vs actionable |
| Baseline result | ✅ "Kamu Menengah" | ✅ "Kamu Menengah: Kuat di Membaca, Perlu Tata Bahasa" | Generic vs specific |
| AI Diagnostic (deeper analysis) | ⚠️ Coming soon | ✅ AI-scored constructed response | New capability |
| Personalized recommendations | ✅ Basic (server-derived) | ✅ Deep (confidence-aware, skill-specific) | Depth difference |
| Jalur Cerdas (72 unit) | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Core content — never lock |
| Adaptive Practice | ⚠️ Coming soon | ✅ Personalized per weakness | New capability |
| Mistake review / explanation | ❌ | ✅ AI explains WHY you're wrong | Premium value |
| AI Mentor | ✅ Basic insight | ✅ Deep, contextual, per-skill | Depth difference |
| AI explanations | ❌ | ✅ Full explanation per answer | Premium value |
| Learning insights (weekly) | ❌ | ✅ Weekly recap + growth analysis | Premium value |
| Progress analysis | ⚠️ Basic | ✅ Week-over-week, skill comparison | Depth difference |
| Periodic re-assessment | ❌ | ✅ Auto-suggest re-test after X sessions | Premium value |
| Personalized next action | ✅ Basic (server) | ✅ Deep (confidence + skill priority) | Depth difference |
| UKBI (diagnostic mode) | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Diagnostic — never lock |
| TKA (diagnostic mode) | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Diagnostic — never lock |
| Arena | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Social — never lock |
| XP | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Motivation — never lock |
| Coins | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Engagement — never lock |
| Streak | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Habit — never lock |
| Streak Freeze | ❌ 0/month | ✅ 1/month | Premium utility |
| Badges | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Collection — never lock |
| Avatar | ✅ Basic | ✅ Premium frames/badges | Cosmetic premium |
| Competitions | ✅ ACCESSIBLE | ✅ ACCESSIBLE | Social — never lock |
| Simulation quota | ✅ 3/month | ✅ 10/month | Capacity premium |
| Premium profile | ❌ | ✅ Custom frame/badge/title | Cosmetic premium |
| Advanced stats | ❌ | ✅ Detailed per-question analytics | Depth premium |
| Export document | ✅ 1/day | ✅ 10/day | Capacity premium |

---

## 6. Assessment Strategy

### Funnel Design

```
FREE USER
    ↓
[MULAI LATIHAN] — always accessible, never paywalled
    ↓
Tes Awal (10 soal, 6 skill, 3 difficulty)
    ↓
Ability Profile: Band L1-L12 (Dasar/Menengah/Tinggi)
    ↓
SkillRadar: 7 skill bars (Membaca, Menulis, Tata Bahasa, Kosakata, Sastra)
    ↓
Strengths ✓ + Weaknesses ⚠
    ↓
Basic recommendation (server-derived)
    ↓
"Kamu perlu memperkuat: Tata Bahasa, Menulis"
    ↓
FREE CTA: "Mulai Belajar" → Jalur Cerdas
    ↓
PREMIUM CTA: "Bangun Rencana Belajarmu" → Premium Activation
```

### Key Principles
1. **FREE = diagnostic access** — murid TAHU kemampuannya
2. **PREMIUM = development acceleration** — murid DIBANTU memperbaikinya
3. **Never block "Mulai Latihan"** — ini bukan farming, ini assessment
4. **Honest claims** — jangan klaim "kamu lemah" tanpa data. Pakai INSUFFICIENT_EVIDENCE / PROVISIONAL / PROFILE_CONFIDENT
5. **SkillRadar = conversion surface** — tampilkan KEMAJUAN, bukan KEKURANGAN

---

## 7. Assessment → Premium Conversion

### Conversion Mechanism Design

```
ASSESSMENT RESULT
    ↓
"Bahasa Indonesiamu: Menengah."
    ↓
"Yang sudah kuat: ✓ Membaca (85%) ✓ Kosakata (78%)"
    ↓
"Yang perlu ditingkatkan: ⚠ Tata Bahasa (62%) ⚠ Menulis (58%)"
    ↓
FREE: "Mulai Belajar" → Jalur Cerdas umum
    ↓
PREMIUM GATE (halus):
    ↓
"BahasaCerdas bisa menyusun rencana latihan yang
dikhususkan untuk kemampuanmu."
    ↓
[Bangun Rencana Personal → Mulai Perjalanan Premium]
    ↓
CHECKOUT → MIDTRANS → ACTIVATED
    ↓
PREMIUM WELCOME: "Ini rencana belajarmu."
    ↓
First Personalized Action: "Mulai dengan: Tata Bahasa (Imbuhan Dasar)"
```

### Design Rules
1. **Never expose fake claims** — profil hanya dari data diagnostik NYATA
2. **FREE gets basic recommendation** — "Kamu perlu memperkuat X" (server-derived)
3. **PREMIUM gets personalized plan** — "Latihan X dengan soal yang tepat untuk levelmu"
4. **Conversion happens AFTER assessment** — murid sudah TAHU posisinya
5. **No aggressive pop-ups** — satu kartu di bawah profil, bukan modal overlay
6. **"Sementara itu" copy** — FREE users tetap merasa dihargai

---

## 8. Premium Learning Loop

```
ASSESS (Tes Awal) — FREE
    ↓
UNDERSTAND (Profil Detail) — PREMIUM adds: per-skill depth, confidence, recommendation
    ↓
RECOMMEND (Rencana Personal) — PREMIUM: personalized learning path
    ↓
PRACTICE (Adaptive) — PREMIUM: soal yang benar-benar sesuai weakness
    ↓
FEEDBACK (AI Mentor) — PREMIUM: "Kesalahanmu adalah X, karena Y, perbaikinya Z"
    ↓
REASSESS (Periodic) — PREMIUM: auto-suggest re-test setelah X latihan
    ↓
MEASURE GROWTH (Progress) — PREMIUM: week-over-week comparison
    ↓
NEXT GOAL (Continuous) — PREMIUM: dynamic next action, bukan static
```

### FREE at Each Stage
| Stage | FREE | PREMIUM |
|-------|------|---------|
| Assess | 10 soal diagnostik | 10 soal + deeper AI scoring |
| Understand | Band L1-L12 + SkillRadar bars | Band + per-skill detail + confidence |
| Recommend | "Kamu perlu memperkuat X" | "Latihan X dengan soal tepat untukmu" |
| Practice | Jalur Cerdas (static path) | Adaptive (dynamic, per-weakness) |
| Feedback | "Benar/Salah" | "Kesalahanmu X, karena Y, perbaikinya Z" |
| Reassess | Manual (UKBI/TKA) | Auto-suggest setelah X latihan |
| Measure | Basic XP/level | Week-over-week + skill comparison |
| Next Goal | Static CTA | Dynamic, server-derived |

---

## 9. Killer Premium Features

### Feature 1: Adaptive Practice (Personalized Drill)
- **Student value**: "Soal latihan disesuaikan dengan kelemahan saya — bukan random"
- **Parent value**: "Anak saya latihan lebih efektif, tidak buang waktu di materi yang sudah dikuasai"
- **Existing infrastructure**: `lib/adaptive-practice/` (selector, config, route), `lib/diagnostic/` (profile), Bank SOAL (87 metadata APPROVED)
- **Missing**: Production question pool, proper seeding, UI polish
- **Implementation difficulty**: MEDIUM (engine sudah ada, butuh pool + wiring)
- **Cost implications**: Minimal — AI hanya untuk generating questions IF pool kurang
- **Subscription value**: HIGH — ini personalisasi NYATA, bukan gimmick

### Feature 2: AI Mentor (Mistake Explanation)
- **Student value**: "AI menjelaskan KENAPA jawaban saya salah — saya jadi paham"
- **Parent value**: "Anak saya belajar dari kesalahan, bukan sekadar lihat jawaban benar"
- **Existing infrastructure**: `lib/ai-bc/` (personas, context), `lib/ai-gateway/` (provider, quota)
- **Missing**: Mistake-specific prompt engineering, explanation storage, UI review mode
- **Implementation difficulty**: MEDIUM (provider ready, butuh prompt + UI)
- **Cost implications**: LOW-MEDIUM — 1 AI call per kesalahan, ~2 credits per explanation
- **Subscription value**: HIGH — ini yang BIKIN premium terasa beda

### Feature 3: Learning Insights (Weekly Recap)
- **Student value**: "Saya melihat perkembangan saya minggu ini — saya makin mahir"
- **Parent value**: "Anak saya aktif belajar, dan saya bisa lihat progresnya"
- **Existing infrastructure**: `lib/learning-loop/` (journey, session, insight), `PlayerActivity` model
- **Missing**: Weekly aggregation, recap generation, push notification
- **Implementation difficulty**: LOW (engine sudah ada, butuh aggregation)
- **Cost implications**: MINIMAL — rule-based, no AI
- **Subscription value**: MEDIUM — motivasi jangka panjang

### Feature 4: Periodic Re-assessment
- **Student value**: "BC menyarankan saya untuk tes ulang — saya ingin lihat apakah saya sudah lebih baik"
- **Parent value**: "Anak saya diuji secara berkala, tidak hanya sekali"
- **Existing infrastructure**: Diagnostic engine (v1.1), `hasCompletedDiagnostic()`, `computeProfileFromEvidence()`
- **Missing**: Auto-suggestion logic (after X latihan), re-test flow
- **Implementation difficulty**: LOW (rule-based trigger + existing diagnostic)
- **Cost implications**: MINIMAL — reuses existing pool
- **Subscription value**: MEDIUM — proof of growth

### Feature 5: Premium Cosmetics (Profil Murid)
- **Student value**: "Profil saya terlihat lebih keren — frame, badge, title Premium"
- **Parent value**: "Anak saya bangga dengan profilnya"
- **Existing infrastructure**: `equippedFrame/NameColor/Badge/Background/Nameplate` (User model), `StoreItem`, `UserItem`
- **Missing**: Premium-exclusive items, Pro badge rendering
- **Implementation difficulty**: LOW (data exists, butuh seed items + UI badge)
- **Cost implications**: ZERO — cosmetic only
- **Subscription value**: LOW-MEDIUM — identity/status

---

## 10. AI Monetization

### Model Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| A. Unlimited Premium AI | Simple UX, no counting | High abuse risk, unpredictable COGS | ❌ |
| B. Credit-based AI | Predictable COGS, fair | Complex UX, "counting tokens" feel | ❌ |
| C. Hybrid AI | Simple for most, bounded for heavy | Two systems to maintain | ⚠️ |
| D. Feature-tiered AI | Simplest UX, clear value | May over-restrict light users | ✅ |

### Recommendation: Feature-Tiered + Soft Credits

**For Murid Premium**: Feature-tiered AI. Certain AI features are UNLOCKED (not unlimited, but available). The AI is a MEANS to an end (better learning), not the end itself.

- **AI Mentor explanations**: AVAILABLE (not unlimited — capped at 30/hari via `AI_MENTOR_DAILY_LIMIT`)
- **Adaptive Practice**: AVAILABLE (not unlimited — capped at 50/bulan via `AI_PRACTICE_MONTHLY_LIMIT`)
- **Diagnostic AI scoring**: AVAILABLE (capped at 10/bulan via `SIMULATION_MONTHLY_LIMIT`)
- **AI BC Chat**: AVAILABLE (same as existing — free, rate-limited)

**For Guru Pro**: Existing credit-based system (500 credits/month) UNCHANGED. Do NOT touch.

### Provider Cost Analysis
- DeepSeek: ~$0.50/M tokens — very cheap for Indonesian content
- Groq: Free tier + paid (gpt-oss-120b)
- Gemini: Free tier generous

**Estimated COGS per Premium murid/month**: <Rp 2.000 (if 50 adaptive sessions + 30 mentor explanations)
**Margin at Rp 19.000/month**: >89%

---

## 11. Credit Economy

### For Murid Premium

**Do NOT use credit-based economy for students.** Reasons:
1. Indonesian teenagers don't understand "credits"
2. Parents don't understand "500 kredit per bulan"
3. It creates anxiety ("am I using too many credits?")
4. Premium should feel "unlimited within reason," not "counting"

**Instead**: Use **feature availability** + **daily/monthly caps**:
- "Latihan Personal tersedia" (not "50 credits worth of latihan")
- "Penjelasan AI tersedia" (not "30 credits of AI")
- "Kuota simulasi 10 kali bulan ini" (transparent, not "credits")

### When Credits Remain
- **Guru Pro**: 500 credits/month (existing, UNCHANGED)
- **Murid Premium**: NO credits — feature-tiered caps only
- **AI Usage tracking**: Keep for analytics (not for billing enforcement)

---

## 12. Subscription Structure

### Proposed Plans

| Plan | Price | Duration | AI Features | Simulation | Target |
|------|-------|----------|-------------|------------|--------|
| MURID FREE | Rp 0 | — | Basic (Jalur Cerdas, UKBI/TKA) | 3/month | All students |
| MURID PREMIUM | Rp 19.000 | 30 days | + Adaptive + Mentor + Insights | 10/month | Students 13-18 |
| MURID PREMIUM YEARLY | Rp 180.000 | 365 days | Same + 21% savings | 10/month | Committed students |
| GURU FREE | Rp 0 | — | Basic AI (30 credits) | — | All teachers |
| GURU PRO | Rp 49.000 | 30 days | 500 credits | — | Teachers |
| GURU PRO YEARLY | Rp 399.000 | 365 days | 500 credits | — | Committed teachers |
| FOUNDER | — | — | Unlimited | Unlimited | Admin |

### Pricing Psychology
- **Rp 19.000/month**: Below Rp 20K barrier ("under 20rb") — closing mudah untuk parent
- **Rp 249.000/year**: ~29% discount (Rp 20.750/month) — strong annual incentive
- **Yearly anchor**: Show "Hemat Rp 99.000" prominently
- **Trial**: 7-day free trial for MURID PREMIUM (limited features: 3 adaptive sessions + 10 mentor explanations)
- **Coupon**: No coupons for murid initially (avoid complexity)
- **Introductory**: "1 minggu gratis" — standard for Indonesian ed-tech

### Trial Design
- 7 days, limited: 3 adaptive sessions + 10 AI mentor explanations + 5 simulations
- Trial starts on FIRST assessment completion (not on signup)
- Never restarts (if trialEndsAt is set, skip)
- After trial: revert to FREE, show "Lanjutkan Perjalanan Premium"

### Upgrade Flow
```
FREE user completes assessment
    ↓
"Bangun Rencana Personal" CTA
    ↓
Click → Preview: "Apa yang Premium berikan?"
    ↓
"Mulai 7 Hari Gratis" or "Langsung Berlangganan"
    ↓
Midtrans Snap checkout
    ↓
Payment success → webhook → activate
    ↓
PREMIUM WELCOME: "Rencana belajarmu siap."
    ↓
First personalized action (TODAY's adaptive practice based on diagnostic)
```

---

## 13. Midtrans Architecture

### Current State (Audited)
- `lib/midtrans.ts`: Snap transaction creation (production/sandbox, server key validation)
- `lib/payments/midtrans-server.ts`: Config + error types + `createMidtransSnapTransaction`
- `app/api/payment/create-invoice/route.ts`: Auth-gated, creates Transaksi PENDING + Snap token
- `app/api/payment/webhook/route.ts`: SHA512 signature verification, claim-first idempotency, premium activation, stacking

### Canonical Flow

```
USER → SELECT PLAN → CHECKOUT → MIDTRANS → PAYMENT → WEBHOOK → SUBSCRIPTION → ENTITLEMENT → PREMIUM EXPERIENCE
```

### Webhook States (Current)
| Transaction Status | Transaksi Status | Activate Premium? |
|-------------------|-----------------|-------------------|
| settlement | SUCCESS | ✅ YES |
| capture | SUCCESS | ✅ YES |
| pending | PENDING | ❌ NO |
| cancel | CANCELLED | ❌ NO |
| expire | EXPIRED | ❌ NO |
| deny | FAILED | ❌ NO |
| failure | FAILED | ❌ NO |

### Premium Activation (Current)
1. Claim atomically: `updateMany({ where: { id, status: { not: "SUCCESS" } }, data: { status: "SUCCESS" } })`
2. If claim wins (count === 1): activate premium
3. If claim loses (count === 0): duplicate webhook, skip

### Stacking (Current)
```typescript
if (user.premiumUntil && user.premiumUntil > now) {
  premiumUntil = new Date(user.premiumUntil.getTime() + durationDays * 86400000);
} else {
  premiumUntil = new Date(now.getTime() + durationDays * 86400000);
}
```
**Stacking is already implemented** — if user has active premium, new payment extends from current expiry.

### Student Premium Integration
For Murid Premium, the SAME webhook flow applies. Changes needed:
1. `getPlanFromAmount()`: Add MURID plan detection (Rp 19.000 = monthly, Rp 180.000 = yearly)
2. Webhook handler: Differentiate `transaksi.type === "MURID_PREMIUM"` from `PREMIUM_UPGRADE`
3. User update: Set `isPremium: true, premiumPlan: "PRO"` (same flags — shared model)
4. Entitlement: `resolvePlan()` already handles `isPremium + premiumUntil > now` → `PRO`

### Failed/Cancellation/Expiration
- **Failed**: Transaksi stays FAILED, user not activated
- **Cancellation**: After activation, if user cancels via Midtrans → webhook fires cancel → BUT current code has "prevent downgrade" guard (SUCCESS → non-SUCCESS is ignored). **Need to add**: cancellation handling for student premium
- **Expiration**: premiumUntil naturally expires → `resolvePlan()` returns FREE → entitlements revert

---

## 14. Source of Truth

### Current Relationship
```
User.isPremium (flag)
User.premiumUntil (date)
User.premiumPlan ("FREE" | "PRO")
    ↓
resolvePlan(userId) → Subscription MIDTRANS ACTIVE? → PRO (with subscriptionId)
    → fallback: isPremium + premiumUntil > now → PRO
    → fallback: trialEndsAt > now → PRO (trial)
    → default: FREE
    ↓
resolveUserAiPlan(user) → AI-specific plan (GURU_PRO, GURU_FREE, MURID_FREE, etc.)
    ↓
getEntitlements(plan) → DB Entitlement → fallback DEFAULT_ENTITLEMENT_MATRIX
    ↓
Feature access
```

### Target Architecture

```
SUBSCRIPTION (Midtrans, via Webhook)
    ↓
PLAN (resolvePlan → PRO / FREE / FOUNDER)
    ↓
ENTITLEMENT (getEntitlements → per-feature limits)
    ↓
FEATURE ACCESS (hasEntitlement, getFeatureLimit)
    ↓
USAGE POLICY (consumeUsage → atomic enforcement)
```

### Field Classification

| Field | Status | Notes |
|-------|--------|-------|
| `User.isPremium` | COMPATIBILITY | Derived from subscription/premiumUntil. Keep for backward compat. |
| `User.premiumUntil` | COMPATIBILITY | Set by webhook. Natural expiry. Keep for backward compat. |
| `User.premiumPlan` | COMPATIBILITY | Legacy FREE/PRO. Keep for backward compat. |
| `User.trialStartedAt` | CANONICAL | Guru trial only. |
| `User.trialEndsAt` | CANONICAL | Guru trial only. |
| `Subscription` model | CANONICAL | Midtrans recurring (not wired yet for Guru, needs wiring for Murid). |
| `Transaksi` model | CANONICAL | Payment record. Audit trail. |
| `AiCreditLedger` | CANONICAL | Guru AI credits. Do not use for Murid. |
| `Entitlement` model | CANONICAL | Per-plan feature limits. DB-first, matrix fallback. |
| `PremiumUsage` model | CANONICAL | Per-feature usage tracking. Atomic enforcement. |

---

## 15. Murid vs Guru Premium

### Economics Comparison

| Aspect | GURU PRO | MURID PREMIUM |
|--------|----------|---------------|
| Price | Rp 49.000/month | Rp 19.000/month |
| AI model | Credit-based (500/month) | Feature-tiered (caps per feature) |
| Primary value | RPP, Soal, PPT, EYD, Feedback, Grading | Adaptive, Mentor, Insights, Re-assess |
| AI cost/user | ~Rp 5.000-10.000/month | ~Rp 1.000-2.000/month |
| Target user | Teachers (190 in DB) | Students (1340 in DB) |
| Volume | Low (190 users) | High (1340 users × future growth) |
| Parent payer | N/A (self) | Parent pays |
| Billing complexity | High (credits, agents, multi-provider) | Low (feature caps, simple) |

### Do NOT Reuse
- **Guru credit system** for Murid — too complex for teenagers
- **Guru AI cost model** for Murid — different COGS structure
- **Guru trial** (30 days, 200 credits) for Murid — different psychology
- **Guru plan resolver** — `resolveUserAiPlan()` already handles MURID separately

### What CAN Be Shared
- Midtrans billing flow (checkout → webhook → activation)
- Entitlement engine (plan → entitlements → feature access)
- PremiumUsage tracking (atomic enforcement)
- Subscription model (recurring payments)

---

## 16. Legacy AI Decisions

### Route Analysis

| Route | Status | Active Callers | Recommendation |
|-------|--------|---------------|----------------|
| `app/api/ai/rpp/route.ts` | DEPRECATED | 0 | **DELETE** — dead code, job queue unused |
| `app/api/ai/soal/route.ts` | DEPRECATED | 0 (superseded by guru/latihan) | **DELETE** — no callers |
| `app/api/guru/latihan/route.ts` | ACTIVE | `/guru/bank-soal` UI | **KEEP** — migrate to modern gateway when ready |

### Reasoning
- **RPP**: Comment says "dipertahankan sementara untuk kompatibilitas." Sementara sudah lama. 0 callers. Job queue (`lib/ai-queue.ts`) dead code. **DELETE**.
- **Soal**: Superseded by `guru/latihan`. 0 direct callers found. MURID fallback via `supabaseId` exists but unclear if used. **DELETE** unless MURID fallback is needed.
- **Guru/Latihan**: Active endpoint used by `/guru/bank-soal`. Dual-role (GURU+MURID). **KEEP** — but do NOT migrate to modern billing (unlimited quota is correct per Phase 1C finding).

### Migration Risk
All 3 routes have **unlimited quota** in legacy system. Migrating to credit system would **introduce billing regression** (GURU_FREE loses unlimited RPP/Soal access). This is a **product decision**, not a technical one. **Do NOT auto-migrate.**

---

## 17. AIUsage Strategy

### Current Dependency
AIUsage.feature values used:
- `rpp_generator` — admin dashboard reads this
- `soal_generator` — admin dashboard reads this
- `eyd_checker`, `student_feedback`, `auto_grading`, `text_analysis` — legacy logging
- `agent:<agentId>` — modern agent runner
- `ai_export_docx/pdf/pptx` — export tracking
- `legacy:eyd/feedback/grading/text-analysis` — bridge logging

### Recommendation: Permanent Historical Analytics
AIUsage becomes:
- **A. Analytics only** — YES. Keep table for admin dashboard, AI analytics page, feature usage tracking
- **B. Compatibility bridge** — YES. `logLegacyUsage` writes here for dashboard compatibility
- **C. Migration layer** — NO. Not needed.
- **D. Permanent historical analytics** — YES. Historical data is valuable.

**Do NOT delete AIUsage.** It's the richest analytics table in the system. Admin dashboard, AI analytics, and feature usage all depend on it.

---

## 18. Final Entitlement Matrix

| Entitlement | MURID FREE | MURID PREMIUM | GURU FREE | GURU PRO | FOUNDER |
|-------------|-----------|---------------|-----------|----------|---------|
| SIMULATION_MONTHLY_LIMIT | 3 | 10 | N/A | N/A | ∞ |
| AI_MENTOR_DAILY_LIMIT | unlimited* | 30 | unlimited* | unlimited* | ∞ |
| AI_PRACTICE_MONTHLY_LIMIT | unlimited* | 50 | unlimited* | unlimited* | ∞ |
| PREMIUM_PROFILE | false | true | N/A | N/A | true |
| PREMIUM_COSMETICS | false | true | N/A | N/A | true |
| ADVANCED_STATS | false | true | N/A | N/A | true |
| STREAK_FREEZE_MONTHLY | 0 | 1 | N/A | N/A | ∞ |
| AI Credits (Guru system) | N/A | N/A | 30/month | 500/month | ∞ |
| Daily Export Limit | ∞ | ∞ | 1/day | 10/day | ∞ |

*Note: AI_MENTOR and AI_PRACTICE currently show "unlimited" in matrix because enforcement not yet wired. For MURID PREMIUM, caps will be enforced via `PremiumUsage` atomic consumption.

---

## 19. Premium User Journey

```
FREE
    ↓
Mulai Latihan (Tes Awal)
    ↓
"Ini kemampuanmu: Menengah (L5-L8)"
    ↓
"Yang kuat: Membaca ✓, Kosakata ✓"
    ↓
"Yang perlu ditingkatkan: ⚠ Tata Bahasa, ⚠ Menulis"
    ↓
Basic recommendation: "Mulai Belajar" → Jalur Cerdas
    ↓
Premium opportunity (halus):
    ↓
"BahasaCerdas bisa menyusun rencana latihan yang
dikhususkan untuk kemampuanmu."
    ↓
[Langsung Berlangganan] or [Mulai 7 Hari Gratis]
    ↓
CHECKOUT → MIDTRANS
    ↓
ACTIVATED
    ↓
PREMIUM WELCOME:
    "Selamat datang di Premium.
     Rencana belajarmu sudah siap."
    ↓
FIRST PERSONALIZED ACTION:
    "Latihan pertamamu: Tata Bahasa — Imbuhan Dasar
     (5 soal yang dipilih khusus untuk levelmu)"
    ↓
DAILY LEARNING LOOP:
    Adaptive Practice → AI Feedback → Skill Update → Next Action
    ↓
REASSESS (after 20 latihan):
    "Sudah waktunya tes ulang! Kamu sudah berlatih 20 kali."
    ↓
SEE GROWTH:
    "Tata Bahasa: 62% → 74% (+12% dalam 2 minggu!)
     Kamu sudah naik dari L5 ke L6."
```

### First 5 Minutes After Activation
1. **Welcome message** (0-30s): "Rencana belajarmu sudah siap."
2. **First adaptive session** (30s-3m): 5 soal yang dipilih dari weakness terbesar
3. **AI feedback on mistakes** (3m-5m): "Kesalahanmu di soal 2: X. Penjelasan: Y."
4. **Next action** (5m): "Besok, lanjutkan dengan: Menulis — Paragraf Deskriptif"

**This is the critical moment.** Premium harus langsung BERMANFAAT dalam 5 menit pertama.

---

## 20. UX Strategy

### Premium Badge
- Small "✦ Premium" badge di profil (amber/gold)
- Tampil di leaderboard, karya, komentar
- Tidak agresif — identitas, bukan iklan

### Premium Navigation
- Tidak ada sidebar khusus Premium
- Fitur Premium terintegrasi di halaman yang sama
- Beda terasa di KONTEN, bukan di NAVIGASI

### Premium CTA
- Assessment result → "Bangun Rencana Personal" (halus, di bawah profil)
- SkillRadar empty → "Mulai Tes Awal" (FREE)
- SkillRadar with data → "Lihat Analisis Mendalam" (Premium upsell)

### Locked-State Design
- **JANGAN gunakan**: 🔒 icon, "Kunci", "Upgrade untuk akses"
- **GUNAKAN**: "Sementara itu, teruslah belajar..." + "Premium membantu kamu lebih cepat"
- Premium harus terasa seperti "upgrade," bukan "unlock"

### Subscription Page
- `app/(dashboard)/murid/premium/page.tsx` — dedicated page
- Hero: "Bangun Kemampuanmu dengan Lebih Personal"
- 3 kartu value (Analisis Mendalam, Latihan Personal, Mentor AI)
- Pricing: Monthly Rp 19.000 / Yearly Rp 180.000 (hemat 21%)
- CTA: "Mulai 7 Hari Gratis" or "Berlangganan Sekarang"

### Successful Payment Screen
- "Premium Aktif! ✦"
- "Rencana belajarmu sudah siap."
- [Mulai Latihan Personal Sekarang] — CTA langsung ke adaptive

### Expiration Warning
- 3 hari sebelum expired: notifikasi "Premiummu akan berakhir dalam 3 hari"
- Di sidebar: badge "Premium berakhir 28 Agustus"
- Di assessment result: "Fitur Premium akan berakhir — perpanjang sekarang?"

### Cancellation State
- Revert ke FREE semua fitur
- Data profil TIDAK hilang (skill history, diagnostic results preserved)
- "Kamu bisa melanjutkan dengan fitur gratis. Premium tetap tersedia kapan saja."

---

## 21. Pricing Psychology

### Indonesian Parent Psychology
- Rp 19.000/month = ~Rp 633/day (lebih murah dari aqua gelas)
- "Lebih murah dari jajan" anchoring
- Annual: "Hemat Rp 99.000" = strong incentive
- Parent pays, not student — checkout UX harus parent-friendly

### Student Psychology
- Premium = status ("Saya Premium")
- Free = still valuable ("Saya bisa belajar gratis")
- Trial = no commitment ("Coba dulu, bayar nanti")
- Social proof: "X murid sudah Premium"

### Price Anchoring
- Monthly Rp 19.000 vs Yearly Rp 180.000 (Rp 15.000/month effective)
- "Hemat 29% dengan paket tahunan" prominent
- Guru Pro Rp 49.000 → "Murid lebih terjangkau" (Rp 19.000 < Rp 49.000)

### Coupon Strategy
- Initial: No coupons (avoid complexity)
- Future: Referral program ("Ajak teman, dapat 1 minggu gratis")
- Promo: "Back to School" seasonal discounts

---

## 22. Product Metrics

### Conversion Metrics
- **Assessment → Premium conversion**: Target 5-8% (students who complete diagnostic see premium CTA)
- **Trial → paid conversion**: Target 20-30% (7-day trial → monthly/yearly)
- **Monthly retention**: Target 70-80% (students who stay subscribed)
- **Churn rate**: Target <15%/month
- **Renewal rate**: Target 60-70%

### Feature Adoption
- **Adaptive Practice usage**: Target 60% of premium users/week
- **AI Mentor usage**: Target 40% of premium users/week
- **Learning Insights views**: Target 30% of premium users/week
- **Re-assessment completion**: Target 20% of premium users/month

### Business Metrics
- **AI cost/user/month**: Target <Rp 2.000
- **Gross margin**: Target >90%
- **Revenue per user**: Rp 19.000/month (monthly) or Rp 15.000/month (yearly blended)
- **LTV**: Target Rp 250.000+ (8+ months average retention)

### Learning Metrics
- **Skill improvement rate**: Track avg accuracy change post-premium
- **Learning completion rate**: Track Jalur Cerdas unit completion
- **Practice consistency**: Track adaptive sessions per week

---

## 23. Implementation Roadmap

### P1: PREMIUM PRODUCT FOUNDATION (1 week)
**Scope**: Define premium features, pricing, and UX strategy
**Files**: Documentation only
**Dependencies**: Founder approval on pricing and feature set
**Risks**: Pricing too high/low, feature set too thin
**Tests**: None (documentation)
**Exit criteria**: Founder signs off on Section 12 (Subscription Structure) and Section 9 (Killer Features)

### P2: SUBSCRIPTION SOURCE OF TRUTH (1 week)
**Scope**: Extend `resolvePlan()` to handle MURID premium, create `MURID_PREMIUM` plan code, update `resolveUserAiPlan()` to recognize MURID premium
**Files**: `lib/ai-gateway/plan-resolver.ts`, `lib/premium-economy/plans.ts`, `lib/premium-economy/matrix.ts`, `lib/premium-economy/features.ts`
**Dependencies**: P1
**Risks**: Breaking Guru plan resolution (must not touch GURU_* paths)
**Tests**: `test:premium-economy` (existing 63 tests must pass)
**Exit criteria**: `resolvePlan()` returns correct plan for all MURID states

### P3: MIDTRANS STUDENT BILLING (1 week)
**Scope**: Add MURID plan detection in webhook, create MURID checkout flow, add subscription page for murid
**Files**: `app/api/payment/webhook/route.ts`, `app/api/payment/create-invoice/route.ts`, `lib/midtrans.ts`, new `app/(dashboard)/murid/premium/page.tsx`
**Dependencies**: P2
**Risks**: Webhook regression for Guru billing (must not break existing flow)
**Tests**: `test:premium-economy` + `test:premium-production`
**Exit criteria**: MURID can checkout, webhook activates, stacking works

### P4: PREMIUM ENTITLEMENTS (1 week)
**Scope**: Wire MURID PREMIUM entitlements, enforce simulation limits, create PremiumUsage enforcement for new features
**Files**: `lib/premium-economy/entitlement.ts`, `lib/premium-economy/usage.ts`, `lib/premium-economy/matrix.ts`, new migration for entitlement seed
**Dependencies**: P3
**Risks**: Breaking Guru entitlements (matrix must be additive-only)
**Tests**: `test:premium-economy`
**Exit criteria**: MURID PREMIUM gets correct entitlements, simulation caps enforced

### P5: PREMIUM AI ECONOMY (1 week)
**Scope**: Wire adaptive practice and AI mentor for MURID PREMIUM, enforce daily/monthly caps
**Files**: `app/api/player/adaptive-practice/route.ts`, `app/api/ai/bc/chat/route.ts`, `lib/billing/limits.ts`
**Dependencies**: P4
**Risks**: AI cost overrun if caps too generous
**Tests**: `test:adaptive-reward-hardening`, `test:ai-bc-*`
**Exit criteria**: Premium murid gets adaptive + mentor, caps enforced

### P6: ASSESSMENT → PERSONALIZATION LOOP (2 weeks)
**Scope**: Wire diagnostic → personalization → adaptive → feedback loop for premium, add weekly recap generation, add re-assessment trigger
**Files**: `lib/diagnostic/personalization.ts`, `lib/learning-loop/session.ts`, `components/student-home/ContinueLearningCard.tsx`, `components/student-home/PremiumValueCard.tsx`
**Dependencies**: P5
**Risks**: Diagnostic quality, AI mentor quality
**Tests**: `test:diagnostic-*`, `test:my-day-home`
**Exit criteria**: Premium user gets full learning loop

### P7: PREMIUM UX POLISH (1 week)
**Scope**: Premium badge, subscription page, upgrade modal, welcome screen, expiration warning
**Files**: New `app/(dashboard)/murid/premium/page.tsx`, `components/student-home/PremiumValueCard.tsx`, `components/student-home/ContinueLearningCard.tsx`
**Dependencies**: P6
**Risks**: UX too aggressive (violates "never block learning")
**Tests**: Visual review, accessibility
**Exit criteria**: Premium feels like "upgrade," not "paywall"

### P8: LEGACY CLEANUP (1 week)
**Scope**: Delete deprecated RPP/Soal routes, clean up premium.ts (remove checkAIQuota/recordAIUsage after all callers migrated)
**Files**: `app/api/ai/rpp/route.ts` (DELETE), `app/api/ai/soal/route.ts` (DELETE), `lib/premium.ts` (clean)
**Dependencies**: P7
**Risks**: Breaking hidden dependencies
**Tests**: `npx tsc --noEmit`, `test:ai-tools-audit`
**Exit criteria**: 0 imports of `lib/premium.ts` from app/ routes

### P9: PRODUCTION GATE (1 week)
**Scope**: Load testing, security audit, monitoring setup, rollback plan
**Files**: Test scripts, monitoring config
**Dependencies**: P8
**Risks**: Billing regression, webhook failure, AI cost overrun
**Tests**: Full QA chain (existing + new premium tests)
**Exit criteria**: All tests pass, load test 200 concurrent, security audit clean

### Total: ~9 weeks (with overlaps, ~6-7 weeks realistic)

---

## 24. Security Gates

### Mandatory
1. **Server-side entitlement**: All feature access checked server-side via `resolvePlan()` + `getEntitlements()`. Never trust client.
2. **Server-side plan validation**: `resolvePlan()` reads from DB (`Subscription` model). Never accept plan from request body.
3. **Server-side price validation**: `createTransaction()` validates plan → amount mapping server-side. Client sends `plan: "monthly"`, server computes amount.
4. **Webhook signature verification**: SHA512(order_id + status_code + gross_amount + ServerKey). ServerKey at END of formula.
5. **Webhook idempotency**: Claim-first pattern: `updateMany({ where: { id, status: { not: "SUCCESS" } } })`. Count === 1 = winner. Count === 0 = duplicate.
6. **Payment reconciliation**: `Transaksi` model stores orderId, status, amount. Admin can audit.
7. **Authorization**: `getUser()` on all premium endpoints. Role-gated.
8. **Role isolation**: MURID premium CANNOT affect GURU premium. Different plan codes, different entitlements.
9. **No client-trusted premium**: `isPremium`, `premiumUntil` NEVER set from client. Only webhook + admin.
10. **No body-param privilege escalation**: Checkout accepts only `plan: "monthly" | "yearly"`. Amount computed server-side.
11. **Coupon protection**: Server validates coupon rules (expiry, usage limit, plan restriction). Never trust discount from client.
12. **Audit trail**: All premium activations logged in `Transaksi` + `AdminPaymentAuditLog`.

### Student-Specific
13. **No fake diagnostic claims**: Premium CTA only based on ACTUAL diagnostic results. No "you're weak at X" without evidence.
14. **Trial never restarts**: `trialStartedAt` set once, checked before starting new trial.
15. **Premium expiration graceful**: Feature access reverts to FREE, data preserved, no data loss.

---

## 25. Founder Gate

### Maximum 7 Decisions Required

**DECISION 1: Pricing**
- OPTIONS: Rp 19.000/month + Rp 180.000/yearly | Rp 29.000/month + Rp 249.000/yearly | Rp 39.000/month + Rp 349.000/yearly
- RECOMMENDATION: Rp 19.000/month + Rp 180.000/yearly
- RATIONALE: Below Rp 50K parent psychology barrier, 29% annual discount strong, competitive with Indonesian ed-tech (Ruangguru ~Rp 50-100K, Zenius ~Rp 100K+)

**DECISION 2: Killer Feature Priority**
- OPTIONS: (A) Adaptive Practice first | (B) AI Mentor first | (C) Both simultaneously
- RECOMMENDATION: (A) Adaptive Practice first
- RATIONALE: Adaptive Practice is the "personalized learning" promise. AI Mentor enhances it but is secondary. Build adaptive first, layer mentor on top.

**DECISION 3: Trial Duration**
- OPTIONS: 7 days | 14 days | 30 days
- RECOMMENDATION: 7 days
- RATIONALE: Short trial = faster conversion decision. Students don't need 30 days to see value. 7 days = enough for 2-3 adaptive sessions + mentor feedback.

**DECISION 4: Trial Scope**
- OPTIONS: (A) Full premium features | (B) Limited (3 adaptive + 10 mentor + 5 simulation) | (C) Single feature (adaptive only)
- RECOMMENDATION: (B) Limited
- RATIONALE: Full trial = no reason to upgrade after. Limited = enough to see value, not enough to be satisfied. Sweet spot for conversion.

**DECISION 5: Legacy AI Routes**
- OPTIONS: (A) Delete RPP + Soal routes | (B) Keep as-is | (C) Migrate to modern billing
- RECOMMENDATION: (A) Delete RPP + Soal
- RATIONALE: 0 callers, deprecated, dead code. Keep `guru/latihan` (active). Migration would introduce billing regression (unlimited → credit-limited).

**DECISION 6: MURID_FREE AI Credits**
- OPTIONS: (A) Unlimited (current: `MURID_FREE` → unlimited) | (B) Cap at 30/month | (C) Cap at 100/month
- RECOMMENDATION: (A) Unlimited (keep current)
- RATIONALE: MURID AI usage is minimal (adaptive practice is Premium-only, AI BC chat is free for all). Capping free murid AI would hurt engagement without revenue benefit. Let them use AI BC chat freely.

**DECISION 7: Subscription vs One-time**
- OPTIONS: (A) Subscription only (Midtrans recurring) | (B) One-time only (current Transaksi model) | (C) Both
- RECOMMENDATION: (C) Both (start with one-time, add subscription later)
- RATIONALE: Current Midtrans integration is one-time. Subscription requires Midtrans recurring API (not wired). Start with one-time monthly/yearly, add subscription renewal in P9 or later phase. Lower risk, faster launch.

---

## 26. Final Product Verdict

### 1. What exactly is a student buying?
A personalized learning companion. Not "more AI" — but smarter, more targeted, more insightful learning guidance. The student buys: "BC knows me, helps me improve, and shows me my growth."

### 2. Why would a student want Premium?
Because after the free diagnostic, they see WHERE they're weak. Premium helps them FIX it. The student thinks: "I know I'm weak at grammar — Premium gives me exactly the practice I need, explains my mistakes, and shows me I'm improving."

### 3. Why would a parent pay?
Because Rp 19.000/month is less than a glass of water at a warung, and it provides structured, personalized learning guidance that a tutor would charge Rp 200.000+/hour for. The parent thinks: "This is cheaper than tutoring, and it actually works — I can see my child's progress."

### 4. Why does FREE remain valuable?
FREE gives the student everything they need to START: diagnostic (know where they are), Jalur Cerdas (learn), UKBI/TKA (practice), gamification (motivate). FREE is a complete learning experience. Premium is the ACCELERATOR.

### 5. Why is Premium difficult for generic AI competitors to replicate?
Because BahasaCerdas Premium is not "an AI chatbot." It's an integrated learning system: diagnostic assessment → personalized adaptive practice → AI mentor feedback → progress tracking → re-assessment. Generic AI can answer questions but can't: (1) diagnose across 7 skills, (2) select questions from a curated Indonesian bank, (3) track improvement over weeks, (4) integrate with classroom assignments. The moat is the INTEGRATION, not the AI.

---

## 27. File Created

```
docs/BC_PREMIUM_FINAL_FOUNDER_BLUEPRINT.md — this document
```

---

## 28. Verification

### Expected: Documentation-only changes
```bash
npx tsc --noEmit
# Expected: 0 errors (no code changed)

git diff
# Expected: only docs/BC_PREMIUM_FINAL_FOUNDER_BLUEPRINT.md added
```

### Actual verification status
- `npx tsc --noEmit`: NOT YET RUN (will run after document creation)
- `git diff`: Only this documentation file

---

## 29. Key Codebase Facts (Verified from Source)

1. **MURID_FREE is currently unlimited** in AI Gateway (`plan-resolver.ts` line 15-23). This is correct and should remain unchanged for free tier.
2. **Midtrans webhook stacking already works** (`webhook/route.ts` lines 203-210). New payment extends from current `premiumUntil`.
3. **Entitlement engine is DB-first** (`entitlement.ts`), with `DEFAULT_ENTITLEMENT_MATRIX` as fallback. Safe to add MURID_PREMIUM row.
4. **PremiumUsage atomic enforcement** (`usage.ts`) handles race conditions via `updateMany` with WHERE guard. Ready for MURID caps.
5. **Diagnostic pool = 87 APPROVED metadata** (`BANK_SOAL` source). Sufficient for initial premium offering.
6. **Adaptive Practice is COMING_SOON** (`ADAPTIVE_PRACTICE_COMING_SOON` config flag). Needs production pool before enabling.
7. **AI Mentor (AI BC 2.0) is BUILT** but not wired to premium-specific prompts. Needs mistake-specific prompt engineering.
8. **Subscription model exists** in Prisma (`model Subscription`) but is NOT actively used by current payment flow. Current flow uses one-time `Transaksi` records.
9. **Guru Pro billing MUST NOT be touched**. 190 teachers, existing revenue, complex credit system. Isolate completely.
10. **1340 MURID in database** — significant market for student premium.

---

## 30. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pricing too high for Indonesian market | HIGH | Start with Rp 19.000 (below Rp 20K barrier), adjust based on conversion data |
| AI cost overrun with 1340+ students | MEDIUM | Feature-tiered caps (30 mentor/day, 50 adaptive/month), monitor COGS weekly |
| Guru billing regression | HIGH | Complete isolation: different plan codes, different entitlements, different routes |
| Diagnostic quality insufficient | MEDIUM | 87 APPROVED questions is honest minimum, improve pool iteratively |
| Adaptive Practice not production-ready | HIGH | Gate behind `ADAPTIVE_PRACTICE_COMING_SOON` until pool is sufficient |
| Webhook failure (Midtrans downtime) | MEDIUM | Existing retry mechanism, manual admin activation as backup |
| Trial abuse (multiple accounts) | LOW | Phone verification could be added later, 7-day trial limited scope |
| Parent confusion about pricing | MEDIUM | Clear comparison page, FAQ, "Lebih murah dari jajan" anchoring |

---

## 31. Next Steps (After Founder Approval)

1. **Founder reviews this blueprint** and makes 7 decisions (Section 25)
2. **Implementation prompt created** based on approved decisions
3. **P1-P9 execution** (see Section 23)
4. **Production deployment** with monitoring
5. **Iterate** based on real user data

---

*This document is the SOURCE OF TRUTH for BahasaCerdas Murid Premium.*
*Do NOT implement code until Founder approves all decisions.*
*Only after approval should a separate implementation prompt be created.*
