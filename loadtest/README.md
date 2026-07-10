# Load Testing — BahasaCerdas

k6 scripts to find the current capacity ceiling of the critical endpoints.

## Install k6

```bash
brew install k6          # macOS
# or: https://grafana.com/docs/k6/latest/set-up/install-k6/
```

## Golden rule

**Run against a STAGING deployment + staging database with disposable test
accounts.** `02-generate-rpp.js` burns real AI credits and `03-submit-simulasi.js`
writes attempt/progress rows. Never point the write scenarios at production.

## Seed test accounts

Create a few throwaway users on staging and pass them as a JSON pool so load
spreads across accounts (per-user rate limits otherwise cap you early):

```bash
export USERS='[{"email":"lt1@bc.test","password":"..."},{"email":"lt2@bc.test","password":"..."}]'
export BASE_URL='https://staging.bahasacerdas.site'
```

## Run

```bash
# 1. Login throughput
k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" 01-login.js

# 2. Concurrent RPP generation (heaviest; consumes AI quota)
k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" 02-generate-rpp.js

# 3. Simulation submit (DB write path)
k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" \
       -e PAKET_ID=<stagingPaketId> \
       -e ANSWERS='{"<qid1>":"A","<qid2>":"B"}' 03-submit-simulasi.js
```

## Reading results

- `http_req_duration p(95)` — tail latency; where users start feeling pain.
- `checks` rate — share of requests that succeeded (or degraded gracefully, e.g. 429).
- Custom metrics: `rpp_generation_ms`, `rpp_upstream_fail`, `simulasi_submit_ms`.

The point where p95 latency spikes or 5xx rate climbs is your current ceiling.
Watch the Supabase dashboard (active connections) and the `/admin/monitoring`
dashboard at the same time — connection-pool exhaustion (error `P2024`) usually
shows up before CPU does, which is the signal to move to the transaction pooler.

## Rate limiters to be aware of

| Endpoint            | Limit (per IP)     |
|---------------------|--------------------|
| `/api/auth/login`   | 10 / 600s          |
| `/api/ai/agents/run`| per-agent (varies) |
| `.../submit`        | 30 / 60s           |

Running from a single machine tests the rate limiter as much as the backend. Use
`k6 cloud` or several load generators to exercise real multi-IP concurrency.
