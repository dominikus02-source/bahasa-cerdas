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
