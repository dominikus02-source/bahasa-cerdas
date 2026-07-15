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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_URL` | No | `https://bahasacerdas.com` | Target URL |
| `EMAIL` | Yes (auth flow) | — | Login email |
| `PASSWORD` | Yes (auth flow) | — | Login password |
| `PAKET_ID` | No | (auto-fetch) | Specific UKBI/TKA paket to test |
| `KOOKIE_NAME` | No | (auto-detect) | Supabase auth cookie name |

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

## Test User Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Murid | murid@demo.com | murid123 | Demo account, pre-seeded |
| Guru | guru@demo.com | guru123 | Demo account, pre-seeded |

For larger tests (>1 VU), create additional test accounts or use a shared account with high rate-limit tolerance.

## Output Formats

```bash
# JSON output (for CI)
k6 run --out json=results.json tests/load/ukbi-smoke.js

# Summary only
k6 run --quiet tests/load/ukbi-smoke.js

# Grafana Cloud / Prometheus
k6 run --out statsd tests/load/ukbi-smoke.js
```
