# Production Capacity Audit — BahasaCerdas

**Date**: June 30, 2026
**Author**: Infrastructure Audit (Phase PRODUCTION CAPACITY AUDIT 1)
**Status**: Initial baseline

## Infrastructure Overview

| Component | Service | Plan | Detail |
|-----------|---------|------|--------|
| **Frontend** | Vercel | Pro ($20/mo) | 1000 Functions, 100GB bandwidth, 300s execution |
| **Database** | Supabase | Free | 500MB, 2 concurrent connections (pooler), 60 req/min REST |
| **Auth** | Supabase | Free (included) | 50,000 users, 100,000 monthly active |
| **Cache** | Upstash Redis | Free (configured) | `getOrSet` defined but unused |
| **Game Server** | — | Dead (VPS expired) | Not included in this audit |

## Database Connection Config

| Setting | Value | Notes |
|---------|-------|-------|
| `DATABASE_URL` | `pooler.supabase.com:6543` | PgBouncer (transaction mode) |
| `DIRECT_URL` | `pooler.supabase.com:5432` | Direct connection (migrations) |
| `connection_limit` | 25 | Prisma pool |
| `pool_timeout` | 15s | Connection wait timeout |
| `statement_cache_size` | 100 | Prepared statement cache |
| `withRetry()` | 2 retries | Exponential backoff (200ms, 400ms) |

## Index Coverage

- **71 models**, **146 indexes** (~2.1 per model)
- All frequently-queried models have at least 1 secondary index
- `UKBIQuestion`: composite `(seksi, isActive)` — covers simulation section fetching
- `TKAQuestion`: composite `(kompetensi, isActive)` — covers simulation section fetching
- `Artikel`: composite `(isPublished, createdAt)` — covers homepage/artikel list
- `Pembelian`: composite `(karyaId, buyerId, status)` — covers purchase validation

### Missing Indexes (Low Risk)

| Model | Missing Index | Reason |
|-------|--------------|--------|
| `Karya` | `[downloads]` | `KaryaPopulerSection` sorts by downloads |
| `CommunityPost` | `[createdAt]` | Feed queries sort by date |
| `Profile` | `[city, province]` | If filtering by region (not yet implemented) |

## Caching Analysis

| Layer | Status | Detail |
|-------|--------|--------|
| **Next.js ISR** | ✅ Homepage | `revalidate: 60` |
| **API routes** | ❌ None | Every request hits DB |
| **Artikel API** | ❌ None | `/api/artikel` — most accessed API |
| **Redis getOrSet** | ❌ Unused | Defined in `lib/redis.ts` but zero usages |
| **Image CDN** | ✅ Vercel | `images.remotePatterns` configured |
| **Cache-Control headers** | ❌ Not set | No stale-while-revalidate |

### Impact of No API Caching
The most critical finding. The `/api/artikel` endpoint returns data that changes rarely (new articles published infrequently) yet every visitor triggers a full DB query. With ISR caching, this could be reduced to 1 query per 60 seconds regardless of traffic.

## Rate Limiting

| Scope | Mechanism | Limit | Effective Across Instances? |
|-------|-----------|-------|----------------------------|
| AI routes | Redis (Upstash) | 30 req/min | ✅ Yes |
| Auth routes | In-memory Map | 20 req/min | ❌ No (per-Vercel-instance) |
| API routes | In-memory Map | 120 req/min | ❌ No (per-Vercel-instance) |

### Critical Finding
Auth rate limiting uses an in-memory `Map<string, { count, resetAt }>` in `lib/security.ts`. On Vercel's serverless edge, each cold start gets a fresh map. A determined attacker could bypass the 20 req/min limit by cycling through edge instances. Redis-backed rate limiting is needed for auth routes.

## N+1 Query Analysis

| Route | Calls per Request | Pattern | Status |
|-------|------------------|---------|--------|
| `/api/artikel` | 2 | `Promise.all(count + data)` | ✅ Efficient |
| `/api/marketplace/[id]` | 1 | Single findMany with include | ✅ Efficient |
| `/api/kompetensi/[paketId]` | 10+ | Sequential section queries | ❌ N+1-like |
| `/` (homepage) | 5 | Separate queries per section | ⚠️ Moderate |
| `KaryaPopulerSection` | 1 | Single findMany with include | ✅ Efficient |

### The Bottleneck: Kompetensi Route
The simulation question-fetching route makes 10+ sequential DB calls per request:
1. User lookup
2. Paket (package) lookup
3. Session lookup/upsert
4-8. Per-section `findMany` calls with fallback branching (target → GURU → general)
9. Batch question lookup for snapshot

Each section's question fetch is sequential (not parallelized with `Promise.all`). For a 5-section UKBI test with GURU fallback, this can reach 10+ queries before returning a response.

## Estimated Capacity

| User Load | Feasible? | Risk |
|-----------|-----------|------|
| **0-50 concurrent** | ✅ Safe | All pages load within 2s |
| **50-100 concurrent** | ⚠️ Marginal | Public pages OK, simulation slow |
| **100-200 concurrent** | ⚠️ Risky | API bottleneck, Supabase pooler limit |
| **200-500 concurrent** | ❌ Not safe | DB connection pool exhausted |
| **500+ concurrent** | ❌ Fails | Rate limits, connection timeouts |

### Critical Paths Under Load

| Path | Bottleneck | Est. Max Users |
|------|-----------|----------------|
| Public browsing (artikel) | No caching | ~200 |
| Homepage | ISR caches | ~300 |
| Simulation questions | 10+ sequential queries | ~50 |
| AI Tools | Rate limited (30/min) | ~20 |
| Authenticated dashboard | Auth + DB per request | ~100 |

## Supabase Free Tier Constraints

The most binding constraint is the **Supabase Free plan**:
- **2 concurrent connections** via pooler (PgBouncer transaction mode)
- Prisma pool configured for **25 connections** — but Supabase pooler only allows 2
- This means only 2 users can run DB queries simultaneously on the Free plan
- More users will queue at the pooler level

**Recommendation**: Upgrade to Pro ($25/mo) for 50+ concurrent connections.

## Recommendations

### Immediate (Phase 1 — Before Scaling)

| # | Priority | Action | Effort | Impact |
|---|----------|--------|--------|--------|
| 1 | 🔴 Critical | Cache `/api/artikel` with Redis `getOrSet` (TTL: 60s) | 1h | Reduces DB load by 90% on most-hit endpoint |
| 2 | 🔴 Critical | Parallelize section queries in kompetensi route with `Promise.all` | 1h | Cuts simulation latency by 50%+ |
| 3 | 🟡 Medium | Add `Cache-Control: public, s-maxage=60` to API routes | 30m | Reduces Vercel function invocation |
| 4 | 🟢 Low | Add `@@index([downloads])` on Karya model | 15m | Faster marketplace sorting |
| 5 | 🟢 Low | Add `@@index([createdAt])` on CommunityPost model | 15m | Faster feed queries |

### Short-term (Phase 2 — 200+ Concurrent Users)

| # | Action | Cost |
|---|--------|------|
| 1 | Upgrade Supabase to Pro ($25/mo) | $25/mo |
| 2 | Apply Redis caching to kompetensi route | Dev time |
| 3 | Add auth rate limiting via Redis | Dev time |
| 4 | Monitor with Vercel Analytics | Included |

### Medium-term (Phase 3 — 500+ Concurrent Users)

| # | Action | Cost |
|---|--------|------|
| 1 | Supabase Team plan ($599/mo) | $599/mo |
| 2 | Edge caching with CDN | Dev time |
| 3 | Read replicas for quiz/simulation queries | $50/mo |

## Load Test Plan

### Test Scenarios

| Scenario | VUs | Duration | What It Tests |
|----------|-----|----------|---------------|
| `public-browsing` | 50→100→300 | 4m | Homepage, artikel list, artikel detail |
| `simulation-read` | 30 | 3m | Simulation landing pages (unauth) |
| `simulation-submit` | 10 | 2m | Fetch + submit answers (auth) |
| `dashboard-authenticated` | 20 | 3m | Murid/guru dashboard + APIs |

### Running Load Tests

Prerequisites:
```bash
# Install k6
brew install k6

# Install xk6 for custom extensions if needed
go install go.k6.io/xk6/cmd/xk6@latest
```

Run individual tests:
```bash
# Public browsing
k6 run tests/load/public-browsing.js

# Public browsing with custom params
k6 run --vus 100 --duration 5m tests/load/public-browsing.js

# Simulation submit (with session token)
k6 run --env SESSION_TOKEN=your_token_here tests/load/simulation-submit.js
```

### Abort Criteria

Stop load test immediately if:
1. **Error rate > 2%** of total requests
2. **p95 latency > 5 seconds** for any endpoint
3. Any endpoint returns **5xx errors** consistently
4. **Rate limiting kicks in** for legitimate traffic

### Reporting

After each test run, capture:
- `http_req_duration` (avg, p50, p95, p99)
- `http_req_failed` (error rate)
- `http_req_throughput` (requests/sec)
- Per-group metrics (homepage, artikel, simulation)

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase Free connection pool exhausted | High | High | Upgrade to Pro |
| Auth rate limiting bypassed | Medium | Medium | Move to Redis-backed |
| DB queries timeout under load | Medium | High | Add Prisma query timeout |
| Redis rate limiting failure | Low | Low | Fallback to allow |
| VPS game server still dead | High | Medium | Not in scope |

## Conclusion

BahasaCerdas is **safe for 0-50 concurrent users** in its current state. For the current user base (50 registered, low active usage), the existing infrastructure is adequate.

**The single highest-impact optimization** is adding Redis `getOrSet` caching to the `/api/artikel` endpoint — this handles the most traffic and requires minimal code changes.

**The most critical infrastructure upgrade** is Supabase Pro ($25/mo) to increase the connection pool from 2 to 50+ concurrent connections.

**Load tests should be run** after implementing Phase 1 optimizations to establish a new baseline before considering Phase 2 upgrades.
