# Load Testing — BahasaCerdas.com

## Tool

**k6** — industry-standard load testing tool (Go + JavaScript).

## Installation

```bash
brew install k6
# Or download from https://k6.io/docs/getting-started/installation/
```

Verify:
```bash
k6 version
```

# Load Testing — BahasaCerdas.com

## Tool

**k6** — industry-standard load testing tool (Go + JavaScript).

## Installation

```bash
brew install k6
# Or download from https://k6.io/docs/getting-started/installation/
```

Verify:
```bash
k6 version
```

## Auth Mechanism

All UKBI/TKA simulation endpoints require authentication. The k6 scripts handle auth in two steps:

1. **Login**: POST `{BASE_URL}/api/auth/login` with `{ email, password }`
2. **Token extraction**: The scripts extract auth from the response in two ways:
   - **Preferred**: `sb-*-auth-token` cookie from `Set-Cookie` response header (Supabase SSR)
   - **Fallback**: `Authorization: Bearer <access_token>` using the `session.access_token` from JSON body

The scripts cache the auth token per VU (virtual user), so login happens only once per VU even across multiple iterations.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_URL` | No | `https://bahasacerdas.com` | Target URL |
| `EMAIL` | **Yes** | — | Login email (no default — must be set) |
| `PASSWORD` | **Yes** | — | Login password (no default — must be set) |
| `PAKET_ID` | No | (auto-fetch) | Specific UKBI/TKA paket to test |

**Important**: Unlike previous versions, `EMAIL` and `PASSWORD` no longer have default values. Tests will fail early if these are not provided.

## Getting Auth Credentials

### Demo Accounts (Pre-seeded)

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Murid | murid@demo.com | murid123 | Active demo account |
| Guru | guru@demo.com | guru123 | Active demo account |

### Creating Test Accounts via Supabase

For larger scale tests, you need multiple accounts to avoid rate limiting:

1. Go to [Supabase Dashboard](https://supabase.com) → Authentication → Users
2. Click "Invite user" or "Add user"
3. Create accounts with email/password
4. These accounts will auto-create Prisma User records on first login via `GET /api/user/me`

Alternatively, use the Supabase Management API:

```bash
curl -X POST https://<project>.supabase.co/auth/v1/admin/users \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@test.com","password":"test123","email_confirm":true}'
```

### Credential Pooling Strategy

For 100+ VU tests, consider:
- **Single account approach**: All VUs use `murid@demo.com`. Risk: rate limiting at login phase (10 req/10min per IP on `/api/auth/login`).
- **Account pool**: Create N accounts, distribute via `__ENV.EMAIL`. Each VU logs in once and reuses the session.
- **Pre-fetched token**: Not recommended — tokens expire.

## ⚠️ WARNING

**Do NOT run load tests against production without authorization.**
- Use staging or preview deployments whenever possible.
- Running 1000 concurrent users against production may trigger:
  - Vercel rate limiting (429)
  - Supabase connection pool exhaustion
  - Database CPU/memory saturation
  - Additional billing charges

## Test Scripts

### 1. Smoke Test (1 user, 1 iteration)

Quick sanity check — verifies the full simulation flow works.

```bash
k6 run tests/load/ukbi-smoke.js \
  --env EMAIL=murid@demo.com \
  --env PASSWORD=murid123
```

Or via environment variables:
```bash
EMAIL=murid@demo.com PASSWORD=murid123 k6 run tests/load/ukbi-smoke.js
```

Expected: All checks pass, no errors.

### 2. 100-User Test (5 min)

Light load — simulates a classroom peak.

```bash
k6 run tests/load/ukbi-100.js \
  --env EMAIL=murid@demo.com \
  --env PASSWORD=murid123
```

Expected: Error rate < 1%, p95 < 5s.

### 3. 300-User Test (9 min)

Medium load — simulates school-wide usage.

```bash
k6 run tests/load/ukbi-300.js \
  --env EMAIL=murid@demo.com \
  --env PASSWORD=murid123
```

### 4. 500-User Test (10 min)

Heavy load — simulates district-wide event.

```bash
k6 run tests/load/ukbi-500.js \
  --env EMAIL=murid@demo.com \
  --env PASSWORD=murid123
```

### 5. 1000-User Test (12 min)

Maximum load — stress test for capacity planning.

```bash
k6 run tests/load/ukbi-1000.js \
  --env EMAIL=murid@demo.com \
  --env PASSWORD=murid123
```

### Using npm scripts

```bash
npm run test:load:smoke
npm run test:load:ukbi-100
```

Set env vars inline:
```bash
EMAIL=staging@test.com PASSWORD=test123 npm run test:load:smoke
```

### Combining with Existing Tests

Run the existing public browsing + authenticated dashboard tests for a mixed workload:

```bash
k6 run tests/load/public-browsing.js --vus 50 --duration 3m &
k6 run tests/load/ukbi-100.js --env EMAIL=murid@demo.com --env PASSWORD=murid123 &
```

## Dry-Run (Syntax Check)

All scripts include export options and can be syntax-checked without hitting servers:

```bash
k6 run --dry-run tests/load/ukbi-smoke.js
k6 run --dry-run tests/load/ukbi-100.js
k6 run --dry-run tests/load/ukbi-300.js
k6 run --dry-run tests/load/ukbi-500.js
k6 run --dry-run tests/load/ukbi-1000.js
```

## Expected Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Error rate | < 1% | 1–5% | > 5% |
| p95 response time | < 3s | 3–5s | > 5s |
| p99 response time | < 5s | 5–10s | > 10s |
| Failed checks | 0 | < 1% | > 1% |
| HTTP request rate | — | — | Monitor |

## Metrics Tracked

- `errors` — rate of failed checks
- `login_duration` — login request duration
- `fetch_paket_duration` — paket list fetch
- `fetch_questions_duration` — question fetch with session start
- `submit_duration` — answer submission
- `result_duration` — result view
- `full_flow_duration` — total flow time per iteration

## Output Formats

```bash
# JSON output (for CI)
k6 run --out json=results.json tests/load/ukbi-smoke.js

# Summary only
k6 run --quiet tests/load/ukbi-smoke.js

# Grafana Cloud / Prometheus
k6 run --out statsd tests/load/ukbi-smoke.js
```
