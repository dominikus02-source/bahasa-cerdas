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

## Preview di-proteksi SSO Vercel? Pakai Bypass Token

Preview deployment Vercel default-nya dilindungi SSO — k6 akan dapat halaman
login, bukan API. Buat **Protection Bypass for Automation** (bukan share link):

1. Vercel → project **bahasa-cerdas** → **Settings** → **Deployment Protection**.
2. Scroll ke **Protection Bypass for Automation** → klik **Add Secret** (kalau
   sudah ada, pakai yang ada / **Regenerate**). Ini otomatis membuat secret.
   > Catatan: token muncul SEKALI. Simpan aman, jangan commit, jangan paste ke chat.
3. Jalankan k6 dengan token itu sebagai env (script mengirim header
   `x-vercel-protection-bypass` otomatis):

```bash
export VERCEL_BYPASS_TOKEN='<secret-dari-vercel>'
```

Alternatif tanpa dashboard: Vercel meng-expose secret ini sebagai env otomatis
`VERCEL_AUTOMATION_BYPASS_SECRET` di deployment — nilainya sama. Untuk k6 di
mesinmu, tetap set `VERCEL_BYPASS_TOKEN` manual dari nilai tsb.

Untuk load test yang realistis, **lebih baik lawan domain non-preview**
(staging alias / production-non-protected) supaya tak ada faktor SSO sama sekali.

## Seed test accounts

Create a few throwaway users on staging and pass them as a JSON pool so load
spreads across accounts (per-user rate limits otherwise cap you early):

```bash
export USERS='[{"email":"lt1@bc.test","password":"..."},{"email":"lt2@bc.test","password":"..."}]'
export BASE_URL='https://staging.bahasacerdas.site'
```

### Scenario 04 — UKBI 200-user cohort (200 disposable accounts + paket staging)

Staging harus **terisolasi total** dari production (project Supabase, Redis, DB,
dan deployment sendiri). **Dua gerbang keamanan berlapis** menjaga hal ini:

1. **Staging gate 12-check** (`scripts/lib/staging-gate.ts`) — dijalankan oleh
   `npm run verify:staging-environment`, `seed:staging-loadtest` dan
   `loadtest:ukbi-200`. FAIL ≥1 check → STOP (exit 1) sebelum apa pun menyentuh
   jaringan.
2. **k6 safety interlock** (`ukbi-200-gate.mjs`, di-import script 04) — throw di
   init-time: `BASE_URL` wajib & non-production, `PAKET_ID` wajib berawalan
   `lt-ukbi-200-`, `UKBI_LOADTEST_ENV=staging` + `UKBI_LOADTEST_APPROVED=true`.

```bash
# 1. Isolation gate — FAIL = STOP, jangan load test
STAGING_SUPABASE_URL='https://<ref>.supabase.co' \
STAGING_SUPABASE_SERVICE_ROLE_KEY='<staging service-role>' \
STAGING_DATABASE_URL='postgresql://postgres.<ref>:<pw>@...pooler.supabase.com:6543/postgres' \
STAGING_DIRECT_URL='postgresql://postgres.<ref>:<pw>@...pooler.supabase.com:5432/postgres' \
STAGING_REDIS_URL='https://...' STAGING_REDIS_TOKEN='<staging redis token>' \
STAGING_BASE_URL='https://staging.bahasacerdas.com' \
npm run verify:staging-environment            # harus 12/12 PASS

# 2. Seed 200 akun disposabel + paket "UKBI Load Test Staging" (idempotent)
STAGING_SUPABASE_URL='https://<ref>.supabase.co' \
STAGING_SUPABASE_SERVICE_ROLE_KEY='<staging service-role>' \
STAGING_DATABASE_URL='postgresql://postgres.<ref>:<pw>@...pooler.supabase.com:6543/postgres' \
STAGING_DIRECT_URL='postgresql://postgres.<ref>:<pw>@...pooler.supabase.com:5432/postgres' \
STAGING_TEST_PASSWORD='<wajib, tanpa default>' \
npm run seed:staging-loadtest -- --execute        # dry-run tanpa --execute
```

Seed memakai `STAGING_*` saja dan **menolak** project ref production
(`ibtlhoocaoopgtcsnvzr`). Akun: `ukbi-loadtest-001..200@loaded-test.id`
(password: `STAGING_TEST_PASSWORD`), metadata `loadtest:true`; paket:
"UKBI Load Test Staging" (10 soal, 2 seksi, tanpa MENDENGARKAN).

```bash
# 3. Load test kohort — WAJIB lewat launcher guarded (auth warm-up dulu,
#    login rate limit 10/600s per IP anonymous; stag baseUrl di-override)
USERS='[{"email":"ukbi-loadtest-001@loaded-test.id","password":"..."}]' \
STAGING_SUPABASE_URL=... STAGING_DATABASE_URL=... STAGING_REDIS_URL=... \
STAGING_BASE_URL='https://staging.bahasacerdas.com' \
PAKET_ID='lt-ukbi-200-<uuid8>' \
npm run loadtest:ukbi-200
# Setara (tidak disarankan — bypass launcher & isolation gate):
# k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" \
#        -e PAKET_ID=<lt-ukbi-200-...> \
#        -e UKBI_LOADTEST_ENV=staging -e UKBI_LOADTEST_APPROVED=true \
#        -e PATCH_PAYLOAD='{"answers":{}}' 04-ukbi-200-users.js
```

Catatan interlock: `PAKET_ID` yang TIDAK berawalan `lt-ukbi-200-`,
`UKBI_LOADTEST_ENV` selain `staging`, `UKBI_LOADTEST_APPROVED` selain `true`,
atau `BASE_URL` menunjuk production → script 04 melempar error saat init,
sebelum request pertama.

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

# 4. UKBI 200-user cohort (one school NAT IP, full journey)
k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" \
       -e PAKET_ID=<stagingUkbiPaketId> \
       -e PATCH_PAYLOAD='{"answers":{}}' 04-ukbi-200-users.js
```

## Reading results

- `http_req_duration p(95)` — tail latency; where users start feeling pain.
- `checks` rate — share of requests that succeeded (or degraded gracefully, e.g. 429).
- Custom metrics: `rpp_generation_ms`, `rpp_upstream_fail`, `simulasi_submit_ms`,
  `ukbi_submit_ok`, `ukbi_rate_limited`.
- Scenario `04` targets `ukbi_rate_limited == 0` and `submit p95 < 5s` — the
  production-readiness bar for a 200-student cohort from a single school NAT IP.

The point where p95 latency spikes or 5xx rate climbs is your current ceiling.
Watch the Supabase dashboard (active connections) and the `/admin/monitoring`
dashboard at the same time — connection-pool exhaustion (error `P2024`) usually
shows up before CPU does, which is the signal to move to the transaction pooler.

## Rate limiters to be aware of

| Endpoint            | Limit               | Scope            |
|---------------------|---------------------|------------------|
| `/api/auth/login`   | 10 / 600s           | session; anonymous = per IP |
| `/api/ai/agents/run`| per-agent (varies)  | session          |
| `.../submit`        | 30 / 60s            | session          |
| middleware scope `ai` | 30 / 60s          | session          |

Limits are **session-scoped** (`sess|<hash of auth cookie`) — 200 students behind
one school NAT IP get 200 independent buckets on authenticated endpoints.
Exception: anonymous requests (no session cookie) share an IP bucket — e.g.
200 students logging in for the first time within 10 minutes from one IP will
hit the login limit (10/600s per IP). That is intentional abuse protection;
for cohort events, have students log in before the event.

Running from a single machine tests the rate limiter as much as the backend. Use
`k6 cloud` or several load generators to exercise real multi-IP concurrency.
