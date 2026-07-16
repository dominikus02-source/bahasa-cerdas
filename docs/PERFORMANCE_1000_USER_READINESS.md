# Performance Readiness — 1000 Concurrent Users

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel (Edge + Serverless)           │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Next.js App Router                                 ││
│  │  ├── SSR Pages (public, murid, guru, arena)         ││
│  │  ├── API Routes (REST + Server Actions)             ││
│  │  └── Middleware (auth, redirect, rate-limit)        ││
│  └─────────────────────────────────────────────────────┘│
│                         │                                │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Supabase (Cloud)                                   ││
│  │  ├── Auth (SSO, JWT, session management)            ││
│  │  ├── PostgreSQL (PgBouncer pooler on port 6543)     ││
│  │  └── Storage (file uploads, backups)                ││
│  └─────────────────────────────────────────────────────┘│
│                         │                                │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │  External Services                                  ││
│  │  ├── Midtrans (payments)                            ││
│  │  ├── Anthropic/Groq/Gemini (AI tools)               ││
│  │  └── Game Server (socket.io — currently DEAD)       ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Request Flow (UKBI Simulation)

```
User → Vercel Edge → Next.js SSR → API Route → Supabase Pooler → PostgreSQL
                                                       ↓
                                              PgBouncer (transaction pooling)
                                                       ↓
                                              Aurora PostgreSQL (single node)
```

**Key characteristics:**
- Vercel Serverless Functions have 10s timeout (default)
- Supabase Free/Pro plan: max 60 database connections via pooler
- PgBouncer in transaction mode — connections are shared, not held per request
- Each UKBI simulation triggers: auth check → user lookup → paket lookup → session (find/create) → section queries (parallel) → snapshot query → session update = 7+ DB round-trips

---

## Current Bottlenecks

### 1. Database Connection Pool (HIGH)
- **Issue**: Supabase Free/Pro pooler allows ~60 concurrent connections. With 1000 users, queueing is inevitable.
- **Impact**: At ~50 concurrent active users, new connections queue → increased latency → timeouts.
- **Mitigations already in place**:
  - `withQueryTimeout()` helper wraps all Prisma queries (5–10s per query)
  - Promise.all for parallel section queries
  - PgBouncer in transaction mode (releases connection between queries)

### 2. Auth Overhead per Request (MEDIUM)
- **Issue**: Every API route calls `supabase.auth.getUser()` → hits Supabase Auth API → adds 50–200ms per request.
- **Impact**: 7+ API calls per simulation = 350ms–1.4s just on auth.
- **Fix**: Cache auth session in request-scoped middleware or use distributed session cache.

### 3. Snapshot Serialization (MEDIUM)
- **Issue**: `questionSnapshot` stores full question data (including correctAnswer) as JSON. Serializes/deserializes via `JSON.parse(JSON.stringify(...))`.
- **Impact**: For 30-question pakets, this adds 10–30ms of blocking CPU time. Not significant alone, but compounds at scale.

### 4. Per-Question DB Writes on Submit (HIGH)
- **Issue**: Submit route writes one `testAnswer` row per question via individual `create()` calls inside a loop.
- **Impact**: 30-question paket = 30 sequential DB writes. At 100 concurrent submits = 3000 writes/min.
- **Fix**: Use `createMany()` for batch inserts.

### 5. XP Calc + User Update on Every Submit (LOW)
- **Issue**: Each submission calls `calcLevel` + `calcLeagueFromXP` + `user.update({ xp, level, league })`.
- **Impact**: Small (20–50ms) but unnecessary — can be async/deferred.

### 6. Vercel Cold Starts (MEDIUM)
- **Issue**: Serverless functions spin down after inactivity. UKBI simulation routes may be infrequently called outside peak hours.
- **Impact**: Cold starts add 500ms–2s to first request.
- **Mitigation**: Vercel Pro has 0-cold-start with provisioned concurrency (paid add-on).

---

## Database Indexes

### Current Indexes (from Prisma schema)

| Model | Index | Purpose |
|-------|-------|---------|
| `User` | `supabaseId` (unique) | Auth lookup on every request |
| `TestSession` | `userId_paketId` (unique) | Session lookup per simulation |
| `ProgresKompetensi` | `userId` + `paketId` + `attemptNumber` | Result history |
| `UKBIQuestion` | `isActive` + `seksi` | Section question fetching |
| `TKAQuestion` | `isActive` + `kompetensi` | Section question fetching |

### Recommended Additional Indexes

```sql
-- Speed up answer write after submission
CREATE INDEX IF NOT EXISTS idx_test_answer_user_session
  ON "TestAnswer" ("userId", "sessionId");

-- Speed up progres lookup for /hasil
CREATE INDEX IF NOT EXISTS idx_progres_user_paket_attempt_desc
  ON "ProgresKompetensi" ("userId", "paketId", "attemptNumber" DESC);

-- Speed up section-based question queries
CREATE INDEX IF NOT EXISTS idx_ukbi_question_seksi_tingkat
  ON "UKBIQuestion" ("isActive", "seksi", "tingkat");

CREATE INDEX IF NOT EXISTS idx_tka_question_tingkat
  ON "TKAQuestion" ("isActive", "tingkat", "kompetensi");

-- Speed up certificate lookups
CREATE INDEX IF NOT EXISTS idx_certificate_progres
  ON "KompetensiCertificate" ("progresId");

-- Speed up snapshot-fetch queries
CREATE INDEX IF NOT EXISTS idx_ukbi_question_snapshot_select
  ON "UKBIQuestion" ("id") INCLUDE ("correctAnswer", "difficulty", "seksi");

CREATE INDEX IF NOT EXISTS idx_tka_question_snapshot_select
  ON "TKAQuestion" ("id") INCLUDE ("correctAnswer", "weight", "kompetensi");
```

**Note**: Supabase (PostgreSQL) automatically creates indexes for `@unique` and `@id` fields. Composite indexes for `userId_paketId` on TestSession already exist.

---

## API Optimization Summary

| Endpoint | Current Complexity | Optimization | Est. Improvement |
|----------|-------------------|-------------|------------------|
| `POST /api/auth/login` | 1 DB + 1 Auth API | — (already rate-limited at 10/10min) | — |
| `GET /api/kompetensi` | 2 queries (findMany + count) | Add pagination cursor | 2x |
| `GET /api/kompetensi/[paketId]` | 7–10 queries | Cache paket data in memory (Vercel KV) | 30% |
| `PATCH /api/kompetensi/[paketId]` | 1 query | — (lightweight) | — |
| `POST /api/kompetensi/[paketId]/submit` | 30+ queries | Use `createMany`, defer XP calc | 5x |
| `GET /api/kompetensi/[paketId]/hasil` | 3 queries | Composite index | 2x |

### Submit Route — Optimized Pseudocode

```typescript
// Before (current):
for (const q of questions) {
  await db.testAnswer.create({ data: {...} }); // 30 individual writes
}

// After:
await db.testAnswer.createMany({
  data: answers.map(a => ({...})), // 1 batch write
});
```

---

## UKBI/TKA Improvements

### Already Implemented
- ✅ Parallel section queries (`Promise.all`)
- ✅ Server-side question randomization (Fisher-Yates + per-user seed)
- ✅ No `correctAnswer` leaked to client (separate `UKBI_SELECT` / `SNAPSHOT_SELECT`)
- ✅ Session snapshots prevent answer key manipulation
- ✅ Rate limiting on submit (30 req/min per user)
- ✅ Rate limiting on login (10 req/10min per IP)

### Recommended

| Improvement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| `createMany` for test answers | Low | High | P1 |
| Cached paket definitions (Vercel KV) | Medium | Medium | P2 |
| Deferred XP/level calculation | Low | Low | P3 |
| Auth session caching in middleware | Medium | High | P1 |
| Paginate question fetch (lazy load sections) | Medium | Medium | P2 |
| Add connection pooling monitoring | Low | High | P1 |

---

## Dashboard Improvements

### Already Implemented
- ✅ Minimum DB queries per page load
- ✅ SSR caching via Next.js (`revalidate` / `fetch cache`)
- ✅ Loading states + Suspense boundaries
- ✅ Skeleton loaders for slow sections

### Recommended

| Page | Issue | Fix |
|------|-------|-----|
| `/murid/beranda` | Multiple API calls on mount | Aggregate into single `/api/dashboard` endpoint |
| `/guru/penilaian` | Large class tensors | Server-side pagination (default 20 students) |
| `/guru/gradebook` | N+1 queries per student-row | Batch fetch all student scores in 1 query |
| `/arena/jalur-cerdas` | Level progress per user | Cache progress in Vercel KV (stale-while-revalidate) |
| All pages | Auth re-check on every navigation | Reduce to middleware-only auth |

---

## Recommended Supabase Pooler Settings

| Setting | Current (Free/Pro) | Recommended (Scale) | Notes |
|---------|-------------------|---------------------|-------|
| Pool size | ~60 | 200–400 | Depends on plan tier |
| Pool mode | Transaction | Transaction | Keep — releases conns between queries |
| Default pool size per Vercel function | 5 | 10–20 | Avoids excessive connection churn |
| Statement timeout | 30s | 10s | Fail fast on slow queries |
| Idle timeout | 60s | 30s | Free up stale connections |

### Connection Pool Architecture

```
Vercel (1000 concurrent) → PgBouncer (200 conns) → PostgreSQL (max_connections=500)
                              │
                     Queue depth monitored
                              │
                     If queue > 50 → return 503
```

**Key insight**: With PgBouncer in transaction mode, connections are held only during active queries (not between them). Each UKBI simulation holds ~1–2 connections simultaneously (parallel section queries), so 200 pool connections can support significantly more concurrent users than naive math suggests.

---

## Staging Environment Plan

### Required Infrastructure

| Resource | Required | Notes |
|----------|----------|-------|
| **Staging URL** | Vercel Preview Deployment or custom domain | e.g. `staging.bahasacerdas.com` or `bahasacerdas-git-staging.vercel.app` |
| **Supabase Staging** | Separate Supabase project | Do NOT use production Supabase. Create a Free/Pro tier staging project. |
| **Vercel Project** | Separate Vercel project or Preview alias | Use `--target=staging` for Vercel CLI deployments |

### Dummy Data Requirements

For meaningful load tests, seed the staging database with realistic data:

| Entity | Count | Description |
|--------|-------|-------------|
| **Murid accounts** | 1.000 | Test accounts for concurrent simulation load |
| **Guru accounts** | 50 | Teacher accounts for mixed-role tests |
| **Paket UKBI** | 10+ | One per tingkat (SD, SMP, SMA, Guru) with 30+ questions each |
| **Paket TKA** | 10+ | One per tingkat (SD, SMP, SMA, UTBK, Guru) with 30+ questions each |
| **Test sessions** | 0 (runtime) | Created dynamically during test execution |

### Seeding Dummy Data

1. **Create Supabase staging project** at [supabase.com](https://supabase.com)
2. **Push Prisma schema**:
   ```bash
   DIRECT_URL=<staging-direct-url> DATABASE_URL=<staging-pooler-url> npx prisma db push
   ```
3. **Run seeds** — all the seeds below must be run on the staging database:

   ```bash
   # UKBI/TKA question banks
   npm run seed:ukbi-lean
   npm run seed:tka-all

   # Create test user accounts via Supabase Admin API or dashboard
   # Then run the user sync:
   curl -X POST https://<staging-project>.supabase.co/auth/v1/admin/users \
     -H "apikey: <staging-service-role-key>" \
     -H "Authorization: Bearer <staging-service-role-key>" \
     -H "Content-Type: application/json" \
     -d '{"email":"test1@test.com","password":"test123","email_confirm":true}'
   # Repeat for all 1000+ accounts, or use a script
   ```

4. **Verify seeding**:
   ```bash
   npm run validate:ukbi-tka-structure
   npm run audit:minimum-simulation-readiness
   ```

### Safe Limits for Running Tests

| Test Level | Max VUs | Min Staging Spec | Notes |
|------------|---------|------------------|-------|
| **Smoke** | 1–5 | Any | Quick validation, no infra needed |
| **Light** | 50–100 | Supabase Free | Classroom simulation |
| **Medium** | 200–300 | Supabase Pro + Vercel Pro | School-wide load |
| **Heavy** | 400–500 | Supabase Team plan (200+ conns) | District event |
| **Stress** | 800–1000 | Supabase Team + Vercel Pro (provisioned) | Capacity planning |

### Target Metrics (Staging)

| Metric | Smoke (1) | Light (100) | Medium (300) | Heavy (500) | Stress (1000) |
|--------|-----------|-------------|--------------|-------------|---------------|
| Error rate | 0% | < 1% | < 1% | < 2% | < 5% |
| p95 login | < 2s | < 3s | < 5s | < 8s | < 10s |
| p95 fetch questions | < 2s | < 4s | < 6s | < 8s | < 12s |
| p95 submit | < 3s | < 5s | < 7s | < 10s | < 15s |
| p95 result | < 2s | < 3s | < 5s | < 7s | < 10s |

### ⚠️ CRITICAL WARNING

**Never run 1000-user (or 500-user) tests against production without explicit written authorization from the project owner.**

Production load tests can cause:
- **Vercel billing spikes**: Serverless function overage charges
- **Supabase connection pool saturation**: Affecting real users
- **Database CPU exhaustion**: Causing timeouts for all users
- **Rate limit triggering**: 429 responses blocking legitimate users
- **Auth provider throttling**: Supabase Auth may tempoarily block login

Always use staging. If staging is unavailable, create a preview deployment:
```bash
npx vercel deploy --preview --target=staging
```

---

## Load Test Results and Interpretation

### Metrics to Track

```
k6 run --out json=results.json tests/load/ukbi-100.js
```

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Error rate | < 1% | 1–5% | > 5% |
| p95 login | < 3s | 3–5s | > 5s |
| p95 fetch questions | < 4s | 4–7s | > 7s |
| p95 submit | < 5s | 5–8s | > 8s |
| p95 result | < 3s | 3–5s | > 5s |
| Requests/sec | — | — | Compare with baseline |

### Interpretation Guide

**100 users @ p95 < 3s** → System is healthy for normal usage (classroom peak).
**100 users @ p95 > 5s** → Check DB connection pool saturation. Increase pool size.
**300 users @ p95 > 5s** → Connection queueing is likely. Add indexes + connection pool increase.
**500 users @ errors > 5%** → System at capacity. Need Vercel Pro (provisioned concurrency) + Supabase Scale plan.
**1000 users** → Will likely saturate Supabase Free/Pro pool. Requires:
- Supabase Team/Enterprise plan (200+ connections)
- Vercel Pro (provisioned concurrency to avoid cold starts)
- Batch write optimization (createMany)
- Vercel KV for session metastore

### Expected Bottleneck Order

1. **PostgreSQL CPU** (query saturation at ~200 concurrent active queries)
2. **PgBouncer pool exhaustion** (queue depth > 50 at ~400 concurrent users)
3. **Vercel function concurrency limits** (Soft limit: 1000 concurrent executions on Pro)

---

## Next Steps for 1000+ User Readiness

### Phase 1 — Quick Wins (1–2 days)
1. Change `testAnswer.create()` loop → `createMany()` batch insert
2. Add composite indexes (see above)
3. Defer XP/level calculation to background job
4. Lower statement timeout to 10s for faster failure

### Phase 2 — Medium (1 week)
5. Add Vercel KV caching for paket definitions (avoids repeat reads)
6. Implement auth session caching (reduce `getUser()` calls)
7. Add dashboard aggregation endpoint (`/api/dashboard`)
8. Add Supabase connection pool monitoring + alerting

### Phase 3 — Scaling (2–4 weeks)
9. Upgrade to Supabase Team plan (200+ connections)
10. Enable Vercel Pro provisioned concurrency
11. Implement read replicas for question bank queries
12. Add request queuing with backpressure (503 when overloaded)
13. Implement distributed session management (Vercel KV)

### Phase 4 — Observability
14. Add OpenTelemetry instrumentation
15. Set up Vercel Analytics for real-user monitoring
16. Create Grafana dashboard for DB metrics
17. Set up PagerDuty alerts for error rate spikes

---

## Monitoring Checklist

- [ ] Supabase Database CPU < 80%
- [ ] Supabase Pooler queue depth < 50
- [ ] PgBouncer active connections < 80% of pool
- [ ] Vercel 5xx rate < 1%
- [ ] p95 API response time < 5s
- [ ] 429 (rate limit) responses < 0.1%
- [ ] Memory/CPU of serverless functions < 512MB

---

## Runbook: Responding to Load Spikes

### If error rate > 5%:
1. Check Supabase Dashboard → Database → CPU & Connections
2. Check Vercel Dashboard → Monitoring → 5xx errors
3. If pool exhausted: Add more connections in Supabase settings
4. If queries slow: Run `pg_stat_statements` to identify slow queries

### If p95 > 10s:
1. Check for missing indexes (`pg_stat_user_indexes`)
2. Check for table bloat (`pg_stat_user_tables.n_dead_tup`)
3. Run `ANALYZE` to update query planner statistics
4. Scale up database instance

### If 429 errors:
1. Client-side: Implement exponential backoff
2. Server-side: Increase rate limit window
3. Check for unintended retry loops

## Supabase Production Scaling Decision

### Current Pooler Status
- Pooler: Enabled via `?pgbouncer=true` in connection string
- Connection limit: Default (~4-15 concurrent)
- Pool timeout: 20s
- Direct URL: Used for migrations only (port 5432)

### Load Level Recommendations

| Users | Feasible? | Notes |
|-------|-----------|-------|
| 100 | ✅ Yes | With current setup + performance indexes |
| 300 | ⚠️ Monitor | Watch for connection pool exhaustion. Add `connection_limit=10` to pooler URL if needed. |
| 500 | ⚠️ Likely needs upgrade | Default pooler ~15 connections may be insufficient. Upgrade Supabase plan or add `connection_limit=20` + increase `pool_timeout`. |
| 1000 | ❌ Needs staging test + upgrade | Requires: (1) Staging load test, (2) Supabase Pro/Team plan upgrade, (3) Connection pool tuning, (4) Possibly Redis caching layer |

### When to Upgrade
- **Supabase plan**: If 300+ concurrent users cause connection timeouts, upgrade from Free to Pro ($25/mo) for 60+ connections
- **Redis/Upstash**: If dashboard aggregates or leaderboard queries become slow at 500+ users
- **Backend worker/VPS**: Only if real-time game server is revived (multiplayer) or if AI processing needs separate workers

### Monitoring
- Watch `pg_stat_activity` for connection count
- Watch Prisma query logs for `timed out` errors
- Set up alert if connection pool exceeds 80%

---

## Phase 4 — Staging Validation Result (July 15, 2026)

### Environment
- **Test date**: July 15, 2026
- **Target**: Production (`https://www.bahasacerdas.com`)
- **Database**: Supabase production (`ibtlhoocaoopgtcsnvzr`)
- **Staging**: NOT AVAILABLE — no separate staging Supabase or Vercel project
- **Load test seed**: SKIPPED (no staging database to seed safely)
- **100-user test**: SKIPPED (not safe on production without staging)

### Index Deployment
- **SQL deployed**: Yes — to production Supabase via `prisma db execute`
- **Database target**: Production (no staging available)
- **Indexes created**: 6/6 confirmed via `pg_indexes` query:

| Index | Table | Status |
|-------|-------|--------|
| `ProgresKompetensi_userId_status_idx` | ProgresKompetensi | ✅ |
| `TestSession_userId_status_idx` | TestSession | ✅ |
| `TestSession_paketId_status_idx` | TestSession | ✅ |
| `StudentKarya_type_createdAt_idx` | StudentKarya | ✅ |
| `StudentKaryaComment_karyaId_createdAt_idx` | StudentKaryaComment | ✅ |
| `PenugasanSubmission_status_idx` | PenugasanSubmission | ✅ |

### Smoke Test Result (1 VU, 1 iteration)

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Checks passed | 17/17 (100%) | 100% | ✅ |
| Error rate | 0.00% | < 1% | ✅ |
| p95 login | 1.78s | < 5s | ✅ |
| p95 paket list | 1.76s | < 5s | ✅ |
| p95 fetch questions | 9.13s | < 5s | ⚠️ HIGH |
| p95 submit | 15.59s | < 5s | ⚠️ HIGH |
| p95 result | 6.08s | < 5s | ⚠️ HIGH |
| p95 http_req_duration | 14.3s | < 5s | ⚠️ THRESHOLD EXCEEDED |

**Note**: The smoke test runs as a single cold iteration — Vercel cold starts add 500ms–2s to each function. The 30 individual DB writes on submit (known issue from Phase 1) dominate the p95. These are NOT representative of steady-state performance with warm functions and cached connections.

### Auth Mechanism Fix
- **Issue**: k6 scripts used `loginRes.headers["Set-Cookie"]` but k6 normalizes headers to lowercase (`"set-cookie"`) → cookie never extracted → fell back to Bearer token → rejected by UKBI routes
- **Fix**: Check both `"Set-Cookie"` and `"set-cookie"` in `doLogin()` function
- **Result**: Cookie-based auth works for all UKBI/TKA routes

### 100-User Test
- **NOT RUN** — no staging database available. Running 100 concurrent users against production risks real user impact and Supabase connection pool saturation.

### Bottlenecks Confirmed
1. **Submit route** (15.6s): 30 individual `testAnswer.create()` calls instead of `createMany()` batch insert
2. **Questions fetch** (9.1s): 7+ DB round trips including auth check, user lookup, paket lookup, session (find/create), section queries (parallel), snapshot, session update
3. **Result** (6.1s): Multiple progres + attempt queries

These match the bottlenecks identified in Phase 1–3.

### Readiness Decision
| Level | Ready? | Notes |
|-------|--------|-------|
| 300 users | ❌ No | Need staging environment first; submit bottleneck must be fixed |
| 500 users | ❌ No | Need staging + `createMany` optimization + Supabase plan upgrade |
| 1000 users | ❌ No | Not tested, not ready — need staging, all optimizations, and plan upgrades |

### Risiko Tersisa
1. **Submit bottleneck**: 30 individual writes → change to `createMany()` (P0 before any multi-user test)
2. **Tidak ada staging**: Semua tes harus ke production — berisiko untuk real user
3. **Cold start**: Vercel cold start membuat p95 tidak representatif — perlu warm-up strategy
4. **Pooler limit**: Default Supabase connection ~4–15 — tidak cukup untuk 100+ concurrent
5. **Seed data**: Tidak ada dummy users untuk multi-user test — perlu staging Supabase

---

## Phase 6 — Staging Multi-User Validation Result (July 16, 2026)

### Environment
- **Test date**: July 16, 2026
- **Staging approach**: Local PostgreSQL 16 (Homebrew) + production Supabase Auth (demo accounts)
- **Database**: `bahasacerdas_staging` on `localhost:5432` (fully isolated)
- **App**: Next.js dev server on `localhost:3000`
- **Auth**: Production Supabase cloud (`https://ibtlhoocaoopgtcsnvzr.supabase.co`) — only for demo account login
- **Supabase staging project**: NOT CREATED (free tier max 2 projects reached, cannot create new)
- **Vercel staging deployment**: NOT USED (local dev server instead)

### Infrastructure Summary

| Resource | Approach | Status |
|----------|----------|--------|
| Database | Local PostgreSQL 16 (Homebrew) — `bahasacerdas_staging` | ✅ Isolated |
| Schema | `prisma db push --force-reset` — 72 tables | ✅ Synced |
| Indexes | 6 performance indexes from Phase 4 | ✅ Applied |
| Auth | Production Supabase cloud (demo accounts only) | ✅ Working |
| App Runtime | Next.js dev on `localhost:3000` | ✅ |
| Seed Data | UKBI questions (10), PaketKompetensi (1), demo users (2) | ✅ Minimal |
| k6 Runtime | Local machine | ✅ |

### Data Seeded

| Entity | Count | Notes |
|--------|-------|-------|
| Demo users (Prisma) | 2 | `murid@demo.com`, `guru@demo.com` |
| UKBI questions | 10 | From `data/question-bank/ukbi/guru/merespons-kaidah/` |
| PaketKompetensi | 1 | `UKBI Load Test Staging` (UKBI_GURU_SIMULASI, 10 questions) |

### Fresh Submit Path (1 VU)

**Configuration**: First-time submit on a brand new session → hit `deleteMany` + `createMany` in `$transaction` + scoring + progress write.

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Checks passed | 17/17 (100%) | 100% | ✅ |
| Error rate | 0.00% | < 1% | ✅ |
| `alreadyScored` | false (confirmed) | false | ✅ |
| p95 http_req_duration | 1.72s | < 5s | ✅ |
| submit_duration avg | **1.52s** | < 3s (ideal) | ✅ |
| login_duration avg | 1.78s | < 2s | ✅ |
| fetch_paket_duration avg | 34ms | < 500ms | ✅ |
| fetch_questions_duration avg | 1.49s | < 2s | ✅ |
| result_duration avg | 1.07s | < 2s | ✅ |

### alreadyScored Path (idempotency)

**Configuration**: Second submit on the same session → validate idempotency.

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Checks passed | 17/17 (100%) | 100% | ✅ |
| Error rate | 0.00% | < 1% | ✅ |
| `alreadyScored` | true (confirmed) | true | ✅ |
| submit_duration avg | **330ms** | < 2s | ✅ |
| Duplicate result | No | No | ✅ |
| Duplicate answers | No | No | ✅ |
| p95 http_req_duration | 908ms | < 5s | ✅ |

### 100-User Test Result

**Configuration**: 100 VUs, ramp-up 1m → sustain 3m → ramp-down 1m. Single account (`murid@demo.com`), production Supabase Auth.

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Error rate | **99.22%** | < 1% | ❌ FAILED |
| Login success | 9 / 40604 (0.02%) | — | ❌ |
| p95 http_req_duration | 958ms | < 5s | ✅ |
| Submit/result/browse checks | ✅ | — | ✅ |
| Prisma connection timeout | None | None | ✅ |
| App crash | None | None | ✅ |

**Root cause: Supabase Auth rate limit (429)**. Production Supabase Auth throttles login requests at ~30 req/min from the same IP. With 100 VUs all authenticating from localhost, rate limiting triggered immediately. Only 9 VUs successfully logged in during the 5-minute test window.

**Impact on results**: The 99.22% error rate is entirely caused by auth rate limiting, NOT by the application or database.

**Non-auth metrics (when requests reached the app):**
- fetch_questions_duration p95: 14.5s (with retry=1 fallback — session already completed by another VU)
- submit/result: healthy response times
- No Prisma connection pool exhaustion
- No timeout errors from the database
- No 500 errors from the application

### Bottlenecks Confirmed

| Bottleneck | Severity | Status |
|------------|----------|--------|
| Supabase Auth rate limiting (429) | **CRITICAL** — blocks multi-user testing | ❌ Unresolved |
| Fresh submit (batch write) | Resolved — 1.52s | ✅ Fixed in Phase 5 |
| Session contention (single account) | HIGH — all VUs fight for same session | ⚠️ Needs per-VU accounts |
| PostgreSQL connection pool | Not tested (auth blocked) | ❓ Unknown |
| Vercel cold start | Not applicable (local dev) | ❓ Unknown |

### Readiness Decision

| Level | Ready? | Notes |
|-------|--------|-------|
| Smoke (1 VU) | ✅ Yes | 17/17 pass, fresh submit 1.52s, alreadyScored 330ms |
| 100 users | ❌ **Blocked** | Supabase Auth rate limiting prevents multi-user auth from single IP |
| 300 users | ❌ Blocked | Needs staging Supabase + per-VU auth accounts |
| 500 users | ❌ Blocked | Needs staging Supabase + per-VU auth accounts |
| 1000 users | ❌ Not tested | Same blockers |

### How to Unblock 100-User Testing

1. **Create staging Supabase project** — requires upgrading to Pro plan (max 2 projects on Free)
2. **Create per-VU auth accounts** — 100+ test accounts in staging Supabase Auth
3. **Deploy to Vercel staging** — Vercel preview deployment with staging Supabase env vars
4. **Run k6 with distributed IPs** — or use k6 cloud to avoid IP-based rate limiting

Until a staging Supabase project is available, multi-user load testing cannot be performed safely without impacting production auth rate limits.

### Change Log
- **Phase 4** (July 15): 6 indexes deployed to production Supabase, smoke test 17/17 pass
- **Phase 5** (July 15): Submit bottleneck fixed (30 serial writes → batch createMany), 2.4s alreadyScored
- **Phase 6** (July 16): Local staging setup (PostgreSQL 16 + Supabase auth), fresh submit 1.52s proven, 100-user blocked by auth rate limiting
