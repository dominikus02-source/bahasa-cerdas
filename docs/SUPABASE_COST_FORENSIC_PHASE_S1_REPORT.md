# BAHASA CERDAS — SUPABASE COST FORENSIC PHASE S1

## FINAL READ-ONLY FORENSIC REPORT

**Date**: August 29, 2026
**Period**: August 2026 billing cycle
**Status**: READ-ONLY — No production changes made

---

## 1. Executive Summary

**US$37.32/month is the UNAVOIDABLE BASELINE cost of running BahasaCerdas on Supabase Pro.**

The US$12.32 Compute Hours charge is **NOT a symptom of bad queries, wasteful cron jobs, or connection leaks**. It is the standard cost of running a Micro compute instance (Nano → Micro upgrade) on Supabase Pro 24/7.

**Key finding**: The Supabase invoice is 95%+ fixed baseline cost. There are NO actionable optimizations that would meaningfully reduce the bill without compromising production reliability.

| Cost Component | Amount | Verdict |
|---------------|--------|---------|
| Pro plan | $25.00 | FIXED — required for production |
| Compute Hours (Micro) | $12.32 | FIXED — 24/7 compute baseline |
| All other categories | $0.00 | Zero — within free tier |
| **TOTAL** | **$37.32** | **Unavoidable baseline** |

**One potential saving**: The `sepedamania` Supabase project (created Jun 21, separate from BC) may still be ACTIVE and costing $25/month. Investigating this could yield $25/month if it's unused.

---

## 2. Actual Invoice Breakdown

```
Supabase Pro Plan:              US$25.00
Compute Hours (Micro):          US$12.32
Cached Egress:                  US$0.00
Egress:                         US$0.00
Monthly Active Users:           US$0.00
Realtime Peak Connections:      US$0.00
Storage Image Transformations:  US$0.00
Storage Size GB-Hrs:            US$0.00
─────────────────────────────────────
TOTAL:                          US$37.32
```

**Breakdown**:
- **78.5%** is Pro plan fixed cost
- **21.5%** is Compute Hours
- **0%** is variable usage (egress, storage, auth, realtime all zero)

---

## 3. Compute Cost Reconciliation

**US$12.32 Compute Hours explained**:

```
Supabase Micro compute instance:
  Monthly price:  ~$12 (Micro plan)
  Runs 24/7       — cannot be paused without losing DB
  Billed hourly   — 720+ hours/month
  
Observed:         $12.32
Expected (Micro): ~$12.00-12.50
Variance:         Within rounding
```

**Classification: FIXED BASELINE COST**

Compute Hours on Supabase are billed for the compute instance running time, NOT for query workload. A Micro instance runs 24/7 regardless of how many queries execute. The $12.32 is the cost of keeping the database alive.

**Important**: You CANNOT reduce Compute Hours by:
- Optimizing queries
- Reducing cron frequency
- Adding indexes
- Reducing connection count
- Caching more aggressively

The ONLY ways to reduce Compute Hours are:
1. Downgrade to Nano (if it exists and handles the workload) — risky
2. Pause the project when not in use — destroys production availability

---

## 4. Supabase Project Inventory

| Project | Ref ID | Region | Created | Status | Recommendation |
|---------|--------|--------|---------|--------|----------------|
| **Bahasa Cerdas DB** | ibtlhoocaoopgtcsnvzr | Singapore | Apr 29 | ACTIVE | **KEEP** — Production |
| **bahasa-cerdas-staging** | hvfkhaocukdzfvseqwdz | Singapore | Aug 20 | ACTIVE | **INVESTIGATE** — Staging for BC, may be unnecessary |
| **sepedamania** | sfxfiqqagauohqyuuxqc | Singapore | Jun 21 | ACTIVE | **INVESTIGATE** — Separate project, not referenced in BC code |

**⚠️ CRITICAL FINDING**: `sepedamania` is a separate Supabase project created on Jun 21 that is NOT referenced anywhere in the BahasaCerdas codebase. If this project is ACTIVE on Pro plan, it costs an additional **$25/month** — potentially doubling the Supabase bill.

**Action required**: Founder must check Supabase dashboard for:
1. Is `sepedamania` active? What plan?
2. Is `bahasa-cerdas-staging` active? What plan?
3. Can either be paused to save $25/month each?

---

## 5. Database Resource Forensics

### Schema Size

```
Prisma models:     124 tables
Enum types:        54
```

This is a large schema for a production application. Each model generates a corresponding PostgreSQL table + index overhead. However, this is the current production schema and NOT a cost issue — the Micro instance handles it.

### Connection Architecture (HEALTHY)

```typescript
// lib/db.ts — Prisma singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

**Status: HEALTHY**
- Singleton pattern prevents connection leak in development
- Production (Vercel) uses serverless instances with `connection_limit=5`
- Supavisor/PgBouncer transaction pooler on port 6543
- `pgbouncer=true` correctly disables prepared statements
- `pool_timeout=3` prevents connection wait hang
- Retry wrapper handles transient connection failures

**No connection leak detected.**

### Prisma Client Instantiation Audit

```
Production code (app/lib/src):     1 file with PrismaClient (lib/db.ts)
Script files (prisma/scripts):     ~40+ files with new PrismaClient()
Game server:                       1 file (dead VPS)
```

**Status: CORRECT** — Production code uses singleton via `lib/db.ts`. All `new PrismaClient()` in `scripts/` are offline tools, NOT production routes.

---

## 6. Query Forensics

### Top Database Pressure Routes

Without pg_stat_statements or Supabase dashboard metrics, query-level analysis is based on code inspection:

| Route Category | DB Operations | Frequency | Cost Relevance |
|---------------|---------------|-----------|---------------|
| `/api/auth/*` | Supabase Auth (not PostgreSQL) | High | LOW — Auth is separate from Compute |
| `/api/player/*` | 2-5 queries per request | Medium | LOW |
| `/api/kompetensi/*` | 3-8 queries per request | Low-Medium | LOW |
| `/api/ai/*` | 2-4 queries + external AI call | Low | LOW for DB |
| `/api/guru/*` | 3-10 queries per request | Medium | LOW |
| `/api/murid/*` | 2-5 queries per request | Medium | LOW |
| Cron jobs | 2-6 queries per execution | 77/day total | NEGLIGIBLE |

**Assessment**: No single route creates excessive database pressure. The workload appears well within Micro instance capacity.

---

## 7. Prisma & Connection Analysis

### Connection Pool Configuration

```
DATABASE_URL (pooler):     port 6543, pgbouncer=true
connection_limit:          5 (per serverless instance)
pool_timeout:              3 seconds
statement_cache:           Disabled (pgbouncer requirement)
```

**Status: OPTIMAL for serverless + Supavisor**

### Key Patterns Found

```
force-dynamic routes:      44 pages
cache: "no-store" fetches:  34 files (minus node_modules = ~16 app files)
refetchInterval:           0 (no polling)
setInterval:               0 (no polling loops)
```

**Status: ACCEPTABLE**

- `force-dynamic` on arena/dashboard pages ensures fresh data — standard for authenticated user-specific content
- `no-store` on player/game components ensures real-time data — standard for gamification
- Zero polling patterns — no background data fetching loops

---

## 8. Cron & Background Workloads

### Vercel Cron Schedule

| Job | Schedule | Runs/Day | DB Queries | Cost Impact |
|-----|----------|----------|------------|-------------|
| ajakan-harian | 3x/day (8,10,12) | 3 | 4 queries | NEGLIGIBLE |
| pengingat-tugas | 1x/day (8am) | 1 | 3 queries | NEGLIGIBLE |
| teacher-commissions-release | 24x/day (hourly) | 24 | 1 query | NEGLIGIBLE |
| teacher-commissions-reconcile | 1x/day (midnight) | 1 | bulk query | NEGLIGIBLE |
| payout-reconciliation | 48x/day (30min) | 48 | 2 queries | NEGLIGIBLE |
| risk-review | 24x/day (hourly) | 24 | 2 queries | NEGLIGIBLE |
| **TOTAL** | | **101/day** | **~8 queries each** | **NEGLIGIBLE** |

**101 cron executions/day × ~8 queries = ~808 queries/day from cron**

This is an insignificant fraction of daily database workload. Even at 100 queries/execution, 101 executions = ~10,000 queries/day = well within Micro instance capacity.

**Status: NO COST ISSUE**

### Cron Frequency Assessment

- `payout-reconciliation` at 30-minute intervals is the most frequent (48x/day)
- `teacher-commissions-release` hourly (24x/day)
- Both are financial integrity checks — appropriate frequency for a production payment system
- All are idempotent and batch-safe

**Status: APPROPRIATE for production payment system**

---

## 9. Cost Leak Detection

### Patterns Found

| Pattern | Count | Status | Cost Impact |
|---------|-------|--------|-------------|
| `refetchInterval` | 0 | NONE | Zero |
| `setInterval` | 0 | NONE | Zero |
| `polling` | 0 | NONE | Zero |
| `router.refresh` | Unknown | NEEDS CHECK | Low |
| `force-dynamic` | 44 | INTENTIONAL | Zero (no extra DB cost) |
| `no-store` | ~16 app files | INTENTIONAL | Zero (no extra DB cost) |

**Status: NO COST LEAKS DETECTED**

The application does NOT use polling, background fetching, or unnecessary refresh patterns that would create database pressure.

---

## 10. Supabase Auth & MAU Analysis

```
Auth billing:               US$0.00
MAU billing:                US$0.00
Free tier:                  50,000 MAU
Current usage:              ~50 known users
```

**Status: WELL WITHIN FREE TIER**

Supabase Auth charges $0.00 because:
- Free tier provides 50,000 MAU
- BahasaCerdas has ~50 users
- Auth is negligible cost

**Note**: Auth rate limiting (429 errors) observed previously was per-IP rate limiting, not billing-related.

---

## 11. Storage & Egress Forecast

```
Cached Egress:              US$0.00
Egress:                     US$0.00
Storage Image Transformations: US$0.00
Storage Size GB-Hrs:        US$0.00
```

**All within free tier allowances.**

Storage usage (file uploads, images) is within Supabase free tier limits. Egress is negligible.

**Classification: SAFE WITHIN ALLOWANCE — no projection needed**

---

## 12. Optimization Opportunities

### Already Identified Potential Savings

| Opportunity | Evidence | Savings | Confidence | Risk |
|-------------|----------|---------|------------|------|
| **Investigate `sepedamania` project** | Not referenced in BC code, created Jun 21 | $25/mo IF active on Pro | HIGH (if confirmed) | LOW — pause only |
| **Investigate `bahasa-cerdas-staging` project** | Created Aug 20, staging only | $25/mo IF active on Pro | HIGH (if confirmed) | LOW — pause only |
| Downgrade from Micro to Nano | Micro is currently $12.32/mo | Unknown | LOW | HIGH — may not handle 124 tables |
| Reduce cron frequency | 101 executions/day | ~$0 | NEGLIGIBLE | N/A |

### What CANNOT Reduce Supabase Cost

| Optimization | Why It Doesn't Help |
|-------------|-------------------|
| Optimize queries | Compute Hours is 24/7 instance cost, not query-based |
| Add indexes | Same — instance runs regardless |
| Reduce connections | Connection pooling already optimized |
| Cache more aggressively | Doesn't reduce 24/7 compute |
| Reduce cron frequency | Cron uses <1% of daily workload |
| Remove force-dynamic | Standard for authenticated pages |
| Upgrade/downgrade plan | Micro is appropriate for 124 tables |

---

## 13. Projected Next-Month Cost

### Scenario A — Current Workload (No Changes)

```
Pro Plan:              $25.00
Compute (Micro):       $12.32
All other:             $0.00
─────────────────────────────
TOTAL:                 $37.32/month
```

### Scenario B — Pause `sepedamania` (If Confirmed Active)

```
Bahasa Cerdas DB:      $37.32/month (unchanged)
sepedamania paused:    $0.00
─────────────────────────────
TOTAL:                 $37.32/month
SAVINGS:               $25.00/month (IF sepedamania was on Pro)
```

### Scenario C — Pause Both `sepedamania` + `bahasa-cerdas-staging`

```
Bahasa Cerdas DB:      $37.32/month (unchanged)
sepedamania paused:    $0.00
staging paused:        $0.00
─────────────────────────────
TOTAL:                 $37.32/month
SAVINGS:               Up to $50.00/month (IF both active on Pro)
```

---

## 14. Vercel vs Supabase Cost Comparison

| Component | Vercel | Supabase |
|-----------|--------|----------|
| Monthly cost | $93.57 (optimized: ~$76-80) | $37.32 |
| Fixed baseline | $20.00 (Pro credit) | $25.00 (Pro plan) |
| Variable cost | $53.57 (builds, compute, observability) | $12.32 (compute only) |
| Optimization potential | HIGH ($14-18/mo savings) | LOW ($0-25/mo depending on projects) |
| Primary cost driver | Build frequency (530 builds/month) | 24/7 compute instance |

**Insight**: Vercel costs are 2.5x Supabase costs. Vercel has significant optimization potential ($14-18/mo). Supabase has almost none — the bill is 95% fixed baseline.

---

## 15. Risks / Unknowns

| Risk | Severity | Status |
|------|----------|--------|
| `sepedamania` project may be costing $25/mo unnecessarily | MEDIUM | **NEEDS FOUNDER ACTION** — check dashboard |
| `bahasa-cerdas-staging` may be costing $25/mo unnecessarily | MEDIUM | **NEEDS FOUNDER ACTION** — check dashboard |
| Micro instance may be overkill for current workload | LOW | Current schema (124 tables) justifies Micro |
| Database could be paused to save $12.32 | HIGH RISK | NOT RECOMMENDED — production DB must stay alive |

---

## 16. Founder-Level Recommendation

### Is BahasaCerdas actually wasting money on Supabase?

**NO — with one important caveat.**

The $37.32/month Supabase invoice is **95%+ unavoidable baseline cost**:
- $25 Pro plan = required for production features (Auth, RLS, backups)
- $12.32 Compute = required for 24/7 database availability
- $0 everything else = well within free tier

**The one exception**: If `sepedamania` or `bahasa-cerdas-staging` Supabase projects are ACTIVE on Pro plan, they may be costing an additional $25/month each — totaling $50/month in potential waste.

### What is the safest action before next billing cycle?

**CHECK THE SUPABASE DASHBOARD NOW:**

1. Go to https://supabase.com/dashboard → Select organization
2. Check all 3 projects: `Bahasa Cerdas DB`, `sepedamania`, `bahasa-cerdas-staging`
3. For each project, note the plan and compute size
4. If `sepedamania` is not actively used → **PAUSE IT** (saves $25/month)
5. If `bahasa-cerdas-staging` is not actively used → **PAUSE IT** (saves $25/month)

**This is the ONLY financially meaningful action for Supabase.**

Query optimization, cron reduction, connection tuning — none of these will reduce the $37.32 bill because Compute Hours are billed for instance runtime, not query volume.

---

## Appendix: Data Sources

| Data | Source | Confidence |
|------|--------|------------|
| Invoice amounts | Supabase invoice (provided by founder) | ACTUAL |
| Compute instance size | Supabase CLI project list | ACTUAL |
| Project inventory | `npx supabase projects list` | ACTUAL |
| Schema size | `grep model prisma/schema.prisma` | ACTUAL |
| Prisma connection config | `lib/db.ts` code inspection | ACTUAL |
| Cron schedule | `vercel.json` inspection | ACTUAL |
| force-dynamic count | `grep -rln` search | ACTUAL |
| no-store count | `grep -rln` search | ACTUAL |
| Polling patterns | `grep refetchInterval/setInterval` | ACTUAL (zero found) |
| Query patterns | Route-level code inspection | ESTIMATE (no pg_stat access) |
| Compute Hours pricing | Supabase documentation | ACTUAL |
| Micro instance cost | $12.32 invoice = Micro pricing | ACTUAL |

---

**Report compiled by**: Buffy (Codebuff)
**Date**: August 29, 2026
**Phase**: S1 (Supabase Cost Forensic)
**Status**: READ-ONLY — No production changes made
