# Staging Load Test Setup

## Problem
We have no separate staging environment (Supabase + Vercel). All smoke/load tests run against production, which is too risky for multi-user load tests (100/300/500/1000 VUs).

## Step 1: Create Staging Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → New project
2. Name: `bahasacerdas-staging`
3. Database password: generate unique, save to `.env.staging`
4. Region: same as production (Southeast Asia)
5. Pricing: Free tier (500 MB, 5 connections) is sufficient for load tests since staging has no real users

### Required Settings
- Make sure `auth.users` extension is enabled (comes by default on new projects)
- Enable PgBouncer (Supabase pooler) for `DATABASE_URL` — connection pooling is essential for multi-VU tests

## Step 2: Push Prisma Schema

```bash
# Install deps
npm install

# Set staging env vars
export DATABASE_URL="postgresql://postgres:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres:[password]@aws-0-ap-southeast-1.db.supabase.com:5432/postgres"

# Push schema
npx prisma db push --force-reset
# --force-reset needed because of conflicting migrations from production
```

Alternatively, if `prisma db push` times out on the pooler (port 6543):

```bash
# Use DIRECT_URL directly for migration
npx prisma db push --force-reset --schema=prisma/schema.prisma --accept-data-loss
```

If this also fails, generate the SQL and run via psql:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma > /tmp/migration.sql
psql "$DIRECT_URL" -f /tmp/migration.sql
```

## Step 3: Seed Test Users

```bash
# Create demo accounts + test data
npx tsx scripts/seed-load-test-data.ts

# This creates:
# - 10 demo murid accounts (murid-1@test.com through murid-10@test.com)
# - 2 demo guru accounts
# - Question data for all UKBI/TKA pakets
```

### Manual Auth Accounts (Supabase)
Seed script creates Prisma User records, but Supabase Auth records must also exist. Two options:

**Option A**: Use Supabase Management API to create auth users programmatically (script exists but needs admin key)

**Option B**: Sign up via UI for each test user:
1. Go to `http://localhost:3000/auth/register`
2. Create each test account (murid-1 through murid-10)
3. The `GET /api/user/me` auto-create logic handles Prisma User records

## Step 4: Deploy Staging App to Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → Project → bahasacerdas
2. Create Preview Domain:
   - From any PR branch → Vercel auto-creates preview deployment
   - Or: Settings → Domains → add `staging.bahasacerdas.com`
3. Set environment variables in Vercel for the preview:
   - `DATABASE_URL` → staging Supabase pooler URL (port 6543)
   - `DIRECT_URL` → staging Supabase direct URL (port 5432)
   - `NEXT_PUBLIC_SUPABASE_URL` → staging Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging Supabase anon key
   - All other env vars same as production

## Step 5: Run Load Tests

### Prerequisites
```bash
brew install k6
```

### Environment Setup
```bash
export BASE_URL=https://staging.bahasacerdas.com
export EMAIL=murid-1@test.com
export PASSWORD=test123
```

### Smoke Test (1 VU — verify everything works)
```bash
k6 run tests/load/ukbi-smoke.js
```

### Load Tests
```bash
# 100 VUs
k6 run tests/load/ukbi-100.js

# 300 VUs — creates k6-progress-300.log
k6 run --vus 300 --duration 30s --summary-trend-stats="avg,p(90),p(95),p(99),max" tests/load/ukbi-100.js

# 500 VUs — needs bigger k6 instances
k6 run --vus 500 --duration 30s --summary-trend-stats="avg,p(90),p(95),p(99),max" tests/load/ukbi-100.js

# 1000 VUs — requires k6 cloud or distributed k6
k6 cloud tests/load/ukbi-100.js
```

### Acceptance Criteria
| Metric | Threshold | Priority |
|--------|-----------|----------|
| Error rate | < 1% | Critical |
| p95 submit | < 5s | Critical |
| p99 submit | < 10s | High |
| p95 questions fetch | < 10s | High |
| 0 auth failures | Strict | High |

## Step 6: Teardown

After testing, delete staging resources to avoid ongoing costs:

```bash
# Delete Supabase project via dashboard → Settings → General → Delete project
# Remove Vercel preview deployment
# Optionally rename DB snapshot as backup reference
```

## Cookie-Based Auth (Production Canary / Staging)

Instead of logging in during the test (which hits rate limits and auth APIs), use **pre-generated Supabase SSR cookies**. This is the recommended approach for all automated load tests.

### Generate Cookies

```bash
# Generate 20 cookies (dry-run mode by default)
npx tsx scripts/seed-cloud-test-cookies.ts

# Generate and save cookies (requires env vars)
ALLOW_PRODUCTION_LOAD_TEST=true \
DATABASE_URL=<pooler-url> \
DIRECT_URL=<direct-url> \
NEXT_PUBLIC_SUPABASE_URL=<sb-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npx tsx scripts/seed-cloud-test-cookies.ts \
  --count 20 \
  --prefix loadtest \
  --output tests/load/.tokens.cloud.json
```

### Run Tests with Cookies

```bash
# Smoke test (1 VU, 2 iterations: warmup + measurement)
K6_COOKIE_FILE=tests/load/.tokens.cloud.json \
PAKET_ID=<paket-id> \
k6 run tests/load/ukbi-cloud-smoke.js

# 10 user test
K6_COOKIE_FILE=tests/load/.tokens.cloud.json \
PAKET_ID=<paket-id> \
k6 run tests/load/ukbi-cloud-10.js

# 20 user test
K6_COOKIE_FILE=tests/load/.tokens.cloud.json \
PAKET_ID=<paket-id> \
k6 run tests/load/ukbi-cloud-20.js

# 50 user test (STAGING ONLY — safety guard blocks production)
K6_COOKIE_FILE=tests/load/.tokens.staging.json \
PAKET_ID=<paket-id> \
BASE_URL=https://staging.bahasacerdas.com \
k6 run tests/load/ukbi-cloud-50.js
```

### How Cookie Auth Works

1. **Seed script** (`seed-cloud-test-cookies.ts`):
   - Creates auth users via Supabase Admin API (email_confirm: true, source: "loadtest")
   - Signs in with `signInWithPassword()` on server side
   - Extracts session cookies from the Supabase response
   - Saves as JSON: `{ "user_001": { "email": "...", "cookie": "sb-xxx-auth-token=base64..." } }`

2. **k6 reads cookies at init-time** via `open()` → `JSON.parse()`
3. **Each VU picks a unique cookie** via `allCookies[(__VU - 1) % COOKIE_COUNT]`
4. **Cookie sent as HTTP header**: `Cookie: sb-xxx-auth-token=base64...`
5. **Supabase SSR client** reads cookie, verifies JWT signature — no API call needed

### Production Canary Safety

Since staging may not always be available, production load tests are allowed with strict limits:

| Allowed | Not Allowed |
|---------|-------------|
| ✅ Smoke (1 VU) | ❌ 50+ VUs |
| ✅ 10 users | ❌ Seed massal |
| ✅ 20 users | ❌ Destructive cleanup |
| ✅ Only `loadtest_*` users | ❌ Test jam ramai (09:00–17:00 WIB) |
| ✅ Hanya paket non-critical | ❌ Login storm |
| ✅ Pre-generated cookie | ❌ 300/500/1000 VUs |
| ✅ Jam sepi (22:00–23:00 WIB) | |

### k6 Safety Guards

All cloud k6 scripts (`ukbi-cloud-*.js`) include built-in guards:

```javascript
// Production URL + VUS > 20 → blocks execution
if (IS_PRODUCTION && !ALLOW_PRODUCTION && VUS > 20) {
  console.error(`SAFETY: production canary limited to 20 VUs.`);
}

// Cookie count < VUS → stops execution
if (COOKIE_COUNT < VUS) {
  console.error(`SAFETY: Not enough auth cookies. Have ${COOKIE_COUNT}, need ${VUS}.`);
}

// Explicit opt-in for production
const ALLOW_PRODUCTION = __ENV.ALLOW_PRODUCTION_LOAD_TEST === "true";
```

### Cookie File Safety

- Cookie output files are `.gitignore`d → never committed
- Cookies expire after 1 hour → not reusable long-term
- `loadtest_*` users are non-essential, created via Admin API

## Running 50+ VU Tests

**50+, 100+, 300+ user tests MUST use staging infrastructure:**
1. Create staging Supabase project (Free tier, ~30 min)
2. Push Prisma schema via `psql` or `prisma db push`
3. Seed question banks: `npm run seed:ukbi-lean` + `npm run seed:tka-all`
4. Generate auth cookies for staging users
5. Deploy staging Vercel deployment (preview or custom domain)
6. Run `ukbi-cloud-50.js` against staging URL

Do NOT use production canary for >20 VUs.

## Known Limitations

1. **Supabase Free Tier**: 5 simultaneous connection limit. For 100 VUs, connection pooling (PgBouncer) is essential but pooler limits may apply.
2. **Self-hosting k6**: Running 1000 VUs from a laptop is unrealistic. For serious load tests, use k6 Cloud.
3. **No production traffic simulation**: Staging has no real user traffic patterns, so CDN caching behavior may differ from production.
4. **Cookie expiry**: 1 hour. Longer tests need token refresh logic or new cookie generation mid-test.
4. **Demo account completed UKBI paket**: The `murid@demo.com` account has completed the UKBI_GURU paket. The smoke test script uses `?retry=1` to re-fetch completed sessions.
